"""Focused tests for Kokoro vector loading/blending without a model install."""

from __future__ import annotations

import importlib.util
import sys
import tempfile
import types
import unittest
from pathlib import Path

try:
    import numpy as np
except ModuleNotFoundError:  # The production host supplies numpy with Kokoro.
    np = None


class FakeKokoro:
    voices = {}

    def __init__(self, *_args, **_kwargs):
        self.voices = self.__class__.voices


def load_service():
    kokoro_module = types.ModuleType("kokoro_onnx")
    kokoro_module.Kokoro = FakeKokoro
    soundfile_module = types.ModuleType("soundfile")
    soundfile_module.write = lambda *_args, **_kwargs: None
    previous_kokoro = sys.modules.get("kokoro_onnx")
    previous_soundfile = sys.modules.get("soundfile")
    sys.modules["kokoro_onnx"] = kokoro_module
    sys.modules["soundfile"] = soundfile_module
    try:
        module_path = Path(__file__).with_name("bullshit-factory-tts.py")
        spec = importlib.util.spec_from_file_location("bullshit_factory_tts_test_module", module_path)
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        if previous_kokoro is None:
            sys.modules.pop("kokoro_onnx", None)
        else:
            sys.modules["kokoro_onnx"] = previous_kokoro
        if previous_soundfile is None:
            sys.modules.pop("soundfile", None)
        else:
            sys.modules["soundfile"] = previous_soundfile


@unittest.skipIf(np is None, "numpy is not installed in this development environment")
class TtsVoiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.service = load_service()

    def setUp(self):
        self.service.MODEL_VOICES = frozenset({"am_michael", "bm_george", "am_eric"})
        self.service.CUSTOM_VOICES.clear()
        self.service.CUSTOM_VOICE_FALLBACKS.clear()
        self.service.VOICE_BLEND_CACHE.clear()

    def test_custom_bundle_loads_and_blends_with_stock_vectors(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "voices.bin"
            np.savez(bundle, rookboss=np.array([2, 2, 2, 2], dtype=np.float32))
            self.service.CUSTOM_VOICES_PATH = str(bundle) + ".npz"
            self.service.CUSTOM_VOICES_LOADED = False
            self.service.load_custom_voices()
            self.assertIn("rookboss", self.service.CUSTOM_VOICES)

            model = FakeKokoro()
            model.voices = {
                "am_michael": np.array([1, 1, 1, 1], dtype=np.float32),
                "bm_george": np.array([3, 3, 3, 3], dtype=np.float32),
            }
            vector = self.service.blended_voice_vector(
                model,
                [{"voice": "am_michael", "weight": 0.75}, {"voice": "bm_george", "weight": 0.25}],
            )
            np.testing.assert_allclose(vector, np.array([1.5, 1.5, 1.5, 1.5], dtype=np.float32))
            self.assertEqual(len(self.service.VOICE_BLEND_CACHE), 1)

            normalized = self.service.normalize_voice_blend(
                [{"voice": "am_michael", "weight": 0.75}, {"voice": "bm_george", "weight": 0.25}]
            )
            np.testing.assert_allclose(
                self.service.blended_voice_vector(model, normalized),
                np.array([1.5, 1.5, 1.5, 1.5], dtype=np.float32),
            )
            self.assertEqual(len(self.service.VOICE_BLEND_CACHE), 1)

    def test_orange_idiot_uses_the_original_local_kokoro_mix_profile(self):
        self.assertEqual(self.service.ORANGE_IDIOT_MIX_VOICE, "orangeidiot-child-mix")
        self.assertEqual(self.service.ORANGE_IDIOT_MIX_SOURCES, ("am_echo", "am_michael"))
        self.assertEqual(self.service.ORANGE_IDIOT_MIX_WEIGHTS, (0.55, 0.45))
        self.assertIn("New York/Queens", self.service.ORANGE_IDIOT_MIX_STYLE)
        self.assertIn("short bursts", self.service.ORANGE_IDIOT_MIX_PROSODY)

    def test_missing_custom_voice_uses_stock_fallback(self):
        self.service.CUSTOM_VOICE_FALLBACKS["rookboss"] = "am_michael"
        self.assertEqual(self.service.voice_argument_for("rookboss"), "am_michael")

    def test_model_inventory_reads_kokoro_npz_voice_archive(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "voices.bin"
            np.savez(
                bundle,
                am_michael=np.array([1, 1, 1, 1], dtype=np.float32),
                bm_george=np.array([2, 2, 2, 2], dtype=np.float32),
            )
            archive = np.load(str(bundle) + ".npz", allow_pickle=False)
            original_model = self.service.MODEL
            try:
                self.service.MODEL = None
                self.service.MODEL_VOICES = frozenset()
                FakeKokoro.voices = archive
                self.service.load_model()
                self.assertEqual(self.service.MODEL_VOICES, frozenset({"am_michael", "bm_george"}))
            finally:
                archive.close()
                FakeKokoro.voices = {}
                self.service.MODEL = original_model

    def test_stock_fallback_still_resolves_when_model_inventory_is_unavailable(self):
        self.service.MODEL_VOICES = frozenset()
        self.service.CUSTOM_VOICE_FALLBACKS["rookboss"] = "am_michael"
        self.assertEqual(self.service.voice_argument_for("rookboss"), "am_michael")

    def test_invalid_bundle_is_non_fatal(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = Path(directory) / "voices.bin"
            bundle.write_text("not an npz", encoding="utf-8")
            self.service.CUSTOM_VOICES_PATH = str(bundle)
            self.service.CUSTOM_VOICES_LOADED = False
            self.service.load_custom_voices()
            self.assertEqual(self.service.CUSTOM_VOICES, {})
            self.assertIsNotNone(self.service.CUSTOM_VOICE_ERROR)


if __name__ == "__main__":
    unittest.main()
