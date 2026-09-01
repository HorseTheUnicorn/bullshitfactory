#!/usr/bin/env python3
"""Small loopback-only Kokoro speech service for Bullshit Factory."""

from __future__ import annotations

import hmac
import io
import json
import logging
import os
import threading
from pathlib import Path
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

import numpy as np
import soundfile as sound_file
from kokoro_onnx import Kokoro


HOST = os.environ.get("BF_TTS_HOST", "127.0.0.1")
PORT = int(os.environ.get("BF_TTS_PORT", "8798"))
TOKEN = os.environ.get("BF_TTS_TOKEN", "")
DEFAULT_MODELS_ROOT = Path(os.environ.get("BF_MODELS_ROOT", str(Path(__file__).resolve().parents[1] / "models")))
MODEL_PATH = os.environ.get("BF_TTS_MODEL_PATH", str(DEFAULT_MODELS_ROOT / "kokoro" / "kokoro-v1.0.onnx"))
VOICES_PATH = os.environ.get("BF_TTS_VOICES_PATH", str(DEFAULT_MODELS_ROOT / "kokoro" / "voices-v1.0.bin"))
CUSTOM_VOICES_PATH = os.environ.get("BF_TTS_CUSTOM_VOICES_PATH", "").strip()
MAX_TEXT_CHARACTERS = 5000
MAX_REQUEST_BYTES = 64 * 1024
try:
    DEFAULT_TTS_SPEED = min(1.30, max(0.65, float(os.environ.get("BF_TTS_SPEED", "1.05"))))
except (TypeError, ValueError):
    DEFAULT_TTS_SPEED = 1.05
ALLOWED_VOICES = frozenset(
    value.strip()
    for value in os.environ.get(
        "BF_TTS_VOICES",
        "af_alloy,af_aoede,af_bella,af_heart,af_jadzia,af_jessica,af_kore,af_nicole,"
        "af_nova,af_river,af_sarah,af_sky,am_adam,am_echo,am_eric,am_fenrir,"
        "am_liam,am_michael,am_onyx,am_puck,am_santa,bf_alice,bf_emma,"
        "bf_isabella,bf_lily,bm_daniel,bm_fable,bm_george,bm_lewis",
    ).split(",")
    if value.strip()
)
CUSTOM_VOICE_FALLBACKS: dict[str, str] = {}
CUSTOM_VOICE_RAW_FALLBACKS = os.environ.get("BF_TTS_VOICE_FALLBACKS", "")
if CUSTOM_VOICE_RAW_FALLBACKS:
    try:
        parsed_fallbacks = json.loads(CUSTOM_VOICE_RAW_FALLBACKS)
        if isinstance(parsed_fallbacks, dict):
            CUSTOM_VOICE_FALLBACKS = {
                str(key).strip(): str(value).strip()
                for key, value in parsed_fallbacks.items()
                if str(key).strip() and str(value).strip()
            }
    except json.JSONDecodeError:
        for item in CUSTOM_VOICE_RAW_FALLBACKS.split(","):
            key, separator, value = item.partition(":")
            if separator and key.strip() and value.strip():
                CUSTOM_VOICE_FALLBACKS[key.strip()] = value.strip()

ORANGE_IDIOT_MIX_VOICE = os.environ.get("BF_TTS_ORANGE_IDIOT_MIX_VOICE", "orangeidiot-child-mix").strip() or "orangeidiot-child-mix"
_requested_orange_sources = tuple(
    value.strip()
    for value in os.environ.get("BF_TTS_ORANGE_IDIOT_MIX_SOURCES", "bm_daniel,af_nicole").split(",")
    if value.strip()
)
ORANGE_IDIOT_MIX_SOURCES = _requested_orange_sources[:2] if len(_requested_orange_sources) >= 2 else ("bm_daniel", "af_nicole")
ORANGE_IDIOT_MIX_WEIGHTS = (0.55, 0.45)

MODEL: Kokoro | None = None
MODEL_VOICES: frozenset[str] = frozenset()
MODEL_LOCK = threading.Lock()
CUSTOM_VOICES: dict[str, np.ndarray] = {}
CUSTOM_VOICES_LOADED = False
CUSTOM_VOICE_ERROR: str | None = None
VOICE_BLEND_CACHE: dict[str, np.ndarray] = {}


def json_bytes(payload: dict[str, Any]) -> bytes:
    return json.dumps(payload, separators=(",", ":")).encode("utf-8")


def load_custom_voices() -> None:
    """Load KokovoiceLab's exported NPZ voice vectors without importing torch."""
    global CUSTOM_VOICES_LOADED, CUSTOM_VOICE_ERROR
    if CUSTOM_VOICES_LOADED:
        return
    CUSTOM_VOICES_LOADED = True
    if not CUSTOM_VOICES_PATH:
        return
    try:
        with np.load(CUSTOM_VOICES_PATH, allow_pickle=False) as archive:
            for name in archive.files:
                vector = np.asarray(archive[name], dtype=np.float32)
                if vector.size <= 0 or not np.isfinite(vector).all():
                    raise ValueError(f"voice vector {name!r} is empty or non-finite")
                CUSTOM_VOICES[str(name)] = vector
        logging.info("Loaded %s KokovoiceLab custom voice vectors", len(CUSTOM_VOICES))
    except Exception as error:  # keep stock Kokoro available if an optional file is bad
        CUSTOM_VOICES.clear()
        CUSTOM_VOICE_ERROR = str(error)
        logging.exception("KokovoiceLab voice bundle could not be loaded")


def voice_is_available(name: str) -> bool:
    return name in ALLOWED_VOICES or name in MODEL_VOICES or name in CUSTOM_VOICES or name in CUSTOM_VOICE_FALLBACKS


def available_voice_names() -> list[str]:
    load_custom_voices()
    names = set(MODEL_VOICES) | ALLOWED_VOICES | set(CUSTOM_VOICES) | set(CUSTOM_VOICE_FALLBACKS)
    if all(voice_is_available(source) for source in ORANGE_IDIOT_MIX_SOURCES):
        names.add(ORANGE_IDIOT_MIX_VOICE)
    return sorted(names)


def load_model() -> Kokoro:
    global MODEL, MODEL_VOICES
    load_custom_voices()
    if MODEL is None:
        MODEL = Kokoro(MODEL_PATH, VOICES_PATH)
        voices = getattr(MODEL, "voices", {})
        if isinstance(voices, dict):
            MODEL_VOICES = frozenset(str(value) for value in voices)
    return MODEL


def voice_argument_for(name: str, fallback: str | None = None) -> str | np.ndarray:
    requested_name = str(name).strip()
    argument: str | np.ndarray = CUSTOM_VOICES.get(requested_name, requested_name)
    if isinstance(argument, str) and MODEL_VOICES and argument not in MODEL_VOICES:
        fallback_name = str(fallback or CUSTOM_VOICE_FALLBACKS.get(requested_name, "")).strip()
        fallback_argument: str | np.ndarray = CUSTOM_VOICES.get(fallback_name, fallback_name)
        if isinstance(fallback_argument, np.ndarray):
            logging.warning("Voice %s is unavailable; using custom fallback vector %s", requested_name, fallback_name)
            argument = fallback_argument
        elif fallback_name and fallback_argument in MODEL_VOICES:
            logging.warning("Voice %s is unavailable; using stock Kokoro fallback %s", requested_name, fallback_name)
            argument = fallback_argument
        else:
            raise ValueError(f"Voice {requested_name!r} is not present in the installed model.")
    return argument


def normalize_voice_blend(raw_blend: Any) -> list[tuple[str, float]]:
    if raw_blend is None:
        return []
    if not isinstance(raw_blend, list) or not raw_blend:
        raise ValueError("voice_blend must be a non-empty list")
    if len(raw_blend) > 4:
        raise ValueError("voice_blend may contain at most four sources")
    normalized: list[tuple[str, float]] = []
    for item in raw_blend:
        if isinstance(item, dict):
            source = item.get("voice", item.get("name", item.get("id")))
            raw_weight = item.get("weight", 1.0)
        elif isinstance(item, (tuple, list)) and len(item) == 2:
            # The HTTP boundary receives objects, but the first validation pass
            # normalizes them to tuples. Accepting that normalized form makes
            # the vector builder idempotent and prevents a valid blend from
            # falling back merely because it was validated twice.
            source, raw_weight = item
        else:
            raise ValueError("each voice_blend source must be an object or pair")
        if not isinstance(source, str) or not source.strip() or len(source.strip()) > 80:
            raise ValueError("each voice_blend source needs a valid voice name")
        try:
            weight = float(raw_weight)
        except (TypeError, ValueError):
            raise ValueError("each voice_blend weight must be numeric") from None
        if not np.isfinite(weight) or weight <= 0:
            raise ValueError("each voice_blend weight must be positive and finite")
        normalized.append((source.strip(), weight))
    total = sum(weight for _, weight in normalized)
    if not np.isfinite(total) or total <= 0:
        raise ValueError("voice_blend weights must have a finite positive total")
    return [(source, weight / total) for source, weight in normalized]


def voice_vector_for(model: Kokoro, name: str, fallback: str | None = None) -> np.ndarray:
    """Resolve a stock or custom voice to the vector Kokoro can synthesize from."""
    argument = voice_argument_for(name, fallback)
    if isinstance(argument, np.ndarray):
        vector = argument
    else:
        voices = getattr(model, "voices", {})
        try:
            vector = voices[argument]
        except (KeyError, TypeError):
            raise ValueError(f"Voice {name!r} does not expose a usable Kokoro vector.") from None
    values = np.asarray(vector, dtype=np.float32)
    if values.size <= 0 or not np.isfinite(values).all():
        raise ValueError(f"Voice {name!r} has an empty or invalid Kokoro vector.")
    return values


def blended_voice_vector(model: Kokoro, raw_blend: Any, fallback: str | None = None) -> np.ndarray:
    """Build and cache a reusable Kokoro vector blend for a candidate recipe."""
    blend = normalize_voice_blend(raw_blend)
    if not blend:
        raise ValueError("voice_blend must contain at least one source")
    cache_key = json.dumps(blend, separators=(",", ":"))
    cached = VOICE_BLEND_CACHE.get(cache_key)
    if cached is not None:
        return cached
    vectors = [voice_vector_for(model, source, fallback) for source, _ in blend]
    if len({vector.shape for vector in vectors}) != 1:
        raise ValueError("Kokoro voice vectors in the blend have incompatible shapes")
    mixed_voice = sum(
        (weight * vector for (source, weight), vector in zip(blend, vectors)),
        np.zeros_like(vectors[0], dtype=np.float32),
    )
    values = np.asarray(mixed_voice, dtype=np.float32)
    if values.size <= 0 or not np.isfinite(values).all():
        raise ValueError("Kokoro voice blend is empty or invalid")
    VOICE_BLEND_CACHE[cache_key] = values
    return values


def create_child_voice_mix(model: Kokoro, text: str, speed: float, lang: str) -> tuple[np.ndarray, int]:
    """Blend voice vectors, then render one performance instead of overlaying two takes."""
    if not all(voice_is_available(source) for source in ORANGE_IDIOT_MIX_SOURCES):
        raise ValueError("Orange Idiot child voice mix sources are unavailable.")

    try:
        vectors = [voice_vector_for(model, source) for source in ORANGE_IDIOT_MIX_SOURCES]
        if len({vector.shape for vector in vectors}) != 1:
            raise ValueError("Orange Idiot child voice vectors have incompatible shapes.")
        mixed_voice = sum(
            (float(weight) * vector for weight, vector in zip(ORANGE_IDIOT_MIX_WEIGHTS, vectors)),
            np.zeros_like(vectors[0], dtype=np.float32),
        )
        if mixed_voice.size <= 0 or not np.isfinite(mixed_voice).all():
            raise ValueError("Orange Idiot child voice vector blend is empty or invalid.")
        samples, sample_rate = model.create(
            text.strip(),
            voice=mixed_voice,
            speed=speed,
            lang=lang,
        )
    except (KeyError, TypeError, ValueError, RuntimeError) as error:
        # A broken or incompatible voice archive must never bring back the old
        # double-performance sound. Use Daniel alone until the archive is fixed.
        logging.warning("Orange Idiot vector blend unavailable (%s); using one Daniel performance", error)
        samples, sample_rate = model.create(
            text.strip(),
            voice=voice_argument_for(ORANGE_IDIOT_MIX_SOURCES[0]),
            speed=speed,
            lang=lang,
        )
    values = np.asarray(samples, dtype=np.float32).reshape(-1)
    if values.size <= 0:
        raise ValueError("Orange Idiot child voice mix returned empty speech.")
    return values, int(sample_rate)


def speech_is_usable(samples: Any, sample_rate: int) -> bool:
    """Reject empty/silent/non-finite output before it reaches a scene mix."""
    if sample_rate <= 0 or samples is None or getattr(samples, "size", 0) <= 0:
        return False
    try:
        peak = float(abs(samples).max())
        finite = bool(samples.__class__.__module__) and bool((samples == samples).all())
    except Exception:
        return False
    return finite and peak >= 0.002


class Handler(BaseHTTPRequestHandler):
    server_version = "BullshitFactory-Kokoro/1.0"

    def log_message(self, format: str, *args: object) -> None:
        logging.info("tts %s", format % args)

    def send_json(self, status: int, payload: dict[str, Any]) -> None:
        body = json_bytes(payload)
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def authorized(self) -> bool:
        if not TOKEN:
            return self.client_address[0] in {"127.0.0.1", "::1"}
        expected = TOKEN.encode("utf-8")
        provided_header = self.headers.get("Authorization", "")
        provided = provided_header.removeprefix("Bearer ").strip().encode("utf-8")
        return hmac.compare_digest(expected, provided)

    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path == "/healthz":
            load_custom_voices()
            self.send_json(200, {"ok": True, "service": "bullshit-factory-kokoro", "modelLoaded": MODEL is not None, "serialized": True, "voiceAuthoring": "kokovoicelab", "customVoiceCount": len(CUSTOM_VOICES), "customVoiceError": CUSTOM_VOICE_ERROR, "blendCacheCount": len(VOICE_BLEND_CACHE), "voiceMix": {"id": ORANGE_IDIOT_MIX_VOICE, "sources": list(ORANGE_IDIOT_MIX_SOURCES), "enabled": all(voice_is_available(source) for source in ORANGE_IDIOT_MIX_SOURCES), "strategy": "voice-vector-single-performance", "style": "single-performance voice-vector blend"}})
            return
        if self.path == "/voices":
            self.send_json(200, {"voices": available_voice_names()})
            return
        self.send_json(404, {"error": "Not found."})

    def do_POST(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        if self.path != "/tts":
            self.send_json(404, {"error": "Not found."})
            return
        if not self.authorized():
            self.send_json(401, {"error": "Unauthorized."})
            return
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0
        if content_length <= 0 or content_length > MAX_REQUEST_BYTES:
            self.send_json(413, {"error": "The speech request is too large."})
            return
        try:
            request = json.loads(self.rfile.read(content_length))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self.send_json(400, {"error": "Speech request must be valid JSON."})
            return
        if not isinstance(request, dict):
            self.send_json(400, {"error": "Speech request must be an object."})
            return

        text = request.get("text")
        voice = request.get("voice")
        raw_voice_blend = request.get("voice_blend", request.get("voiceBlend"))
        fallback_voice = request.get("fallback_voice", request.get("fallbackVoice"))
        if not isinstance(text, str) or not text.strip():
            self.send_json(400, {"error": "Speech text is required."})
            return
        if len(text) > MAX_TEXT_CHARACTERS:
            self.send_json(413, {"error": "Speech text is too long."})
            return
        load_custom_voices()
        if not isinstance(voice, str) or (voice != ORANGE_IDIOT_MIX_VOICE and voice not in ALLOWED_VOICES and voice not in CUSTOM_VOICES and voice not in CUSTOM_VOICE_FALLBACKS):
            self.send_json(400, {"error": "That Kokoro voice is not enabled."})
            return
        if fallback_voice is not None and (not isinstance(fallback_voice, str) or not fallback_voice.strip() or not voice_is_available(fallback_voice.strip())):
            self.send_json(400, {"error": "The requested stock Kokoro fallback is not enabled."})
            return
        try:
            voice_blend = normalize_voice_blend(raw_voice_blend)
        except ValueError as error:
            self.send_json(400, {"error": str(error)})
            return
        if voice_blend and any(not voice_is_available(source) for source, _ in voice_blend):
            self.send_json(400, {"error": "Every voice blend source must be an enabled Kokoro voice."})
            return
        try:
            speed = float(request.get("speed", str(DEFAULT_TTS_SPEED)))
        except (TypeError, ValueError):
            speed = DEFAULT_TTS_SPEED
        if not 0.65 <= speed <= 1.30:
            self.send_json(400, {"error": "Speech speed must be between 0.65 and 1.30."})
            return
        lang = request.get("lang", "en-us")
        if not isinstance(lang, str) or lang not in {"en-gb", "en-us"}:
            lang = "en-us"

        try:
            # Keep the model serialized so a burst of episode lines cannot
            # overcommit the shared CPU/GPU memory on the configured host.
            with MODEL_LOCK:
                model = load_model()
                if voice == ORANGE_IDIOT_MIX_VOICE:
                    samples, sample_rate = create_child_voice_mix(model, text, speed, lang)
                elif voice_blend:
                    try:
                        samples, sample_rate = model.create(
                            text.strip(),
                            voice=blended_voice_vector(model, voice_blend, fallback_voice.strip() if isinstance(fallback_voice, str) else None),
                            speed=speed,
                            lang=lang,
                        )
                    except (KeyError, TypeError, ValueError, RuntimeError) as error:
                        fallback_name = (fallback_voice.strip() if isinstance(fallback_voice, str) else "") or CUSTOM_VOICE_FALLBACKS.get(voice, "")
                        if not fallback_name:
                            raise
                        logging.warning("Voice blend for %s unavailable (%s); using fallback %s", voice, error, fallback_name)
                        samples, sample_rate = model.create(
                            text.strip(),
                            voice=voice_argument_for(fallback_name, fallback_name),
                            speed=speed,
                            lang=lang,
                        )
                else:
                    samples, sample_rate = model.create(
                        text.strip(),
                        voice=voice_argument_for(voice, fallback_voice.strip() if isinstance(fallback_voice, str) else None),
                        speed=speed,
                        lang=lang,
                    )
            if not speech_is_usable(samples, sample_rate):
                self.send_json(502, {"error": "Kokoro returned silent or invalid speech."})
                return
            output = io.BytesIO()
            sound_file.write(output, samples, sample_rate, format="WAV", subtype="PCM_16")
            body = output.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "audio/wav")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception:
            logging.exception("tts generation failed")
            self.send_json(502, {"error": "Kokoro could not generate speech."})


class Server(ThreadingHTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    if not TOKEN and HOST not in {"127.0.0.1", "localhost", "::1"}:
        raise RuntimeError("BF_TTS_TOKEN is required when TTS is not loopback-only")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    server = Server((HOST, PORT), Handler)
    logging.info("Bullshit Factory Kokoro service listening on %s:%s", HOST, PORT)
    try:
        server.serve_forever(poll_interval=0.5)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
