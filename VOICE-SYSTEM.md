# Bullshit Factory voice system

Bullshit Factory keeps Kokoro as its local production speech engine. The voice
authoring layer creates three fixed, reproducible recipes from each fictional
character bible. Each recipe can blend Kokoro vectors and applies bounded
cadence, pitch, formant-aware tone shaping, EQ, compression, and subtle texture
processing. Candidate generation never changes the live cast.

## Operator workflow

1. Open the authenticated `/admin` page and scroll to **Voice Management / Kokoro**.
2. Choose **Generate 3 New Candidates** for a character. The shared audition
   passage targets roughly 15–25 seconds; modest character cadence differences
   are allowed within the 12–30 second validation envelope. Optional directions are
   plain language, for example `older`, `rougher`, `more nervous`, or `less nasal`.
3. Play A, B, and C using the shared audition passage.
4. Click **Select** on the preferred passing candidate. This is the only action
   that changes the permanent character mapping.
5. Use **Generate Cast Reel** after approving several voices to hear the cast
   together and review any reported recipe collisions.

Bork remains bark-only and is intentionally absent from Kokoro candidate
generation. Orange Idiot continues through its dedicated local Kokoro vector
blend with a low-to-mid pitch, slightly nasal, raspy/breathy, mildly congested
fictional New York/Queens-inspired delivery, short bursts, pauses, repetitions,
stretched vowels, abrupt emphasis, and a stock fallback. It is not a real-person
voice imitation.

If an operator asks for a voice reminiscent of a real performer or fictional
film character, the designer records only original performance traits—such as
drawl, resonance, pace, rasp, or deadpan timing. It does not clone or imitate
the identifiable voice of a real person.

## Persistent assets

The production service stores voice data below `BF_VOICE_ROOT`, which defaults
to `runtime/voices`:

```text
runtime/voices/<characterId>/
  profile.json              # selected, versioned recipe
  candidates.json          # latest A/B/C set and validation results
  audition-a.wav           # latest candidate preview
  audition-b.wav
  audition-c.wav
  selected-v1.wav          # immutable preview copied at selection time
  history/v1.json          # previous approved profile when replaced
runtime/voices/cast-reel.wav
runtime/voices/cast-reel.json
```

`profile.json` contains the character id, stable voice id, version, source and
blend metadata, fallback stock voice, cadence, pitch, formant ratio, EQ,
compression, effects, selection timestamps, and the selected audition path.
Future episodes resolve this file first and use the same recipe until an
operator explicitly selects a replacement. Atomic JSON writes make selection
survive TTS and production-service restarts.

## Service contract

The existing loopback `POST /tts` contract remains valid. Voice profiles add
the optional `voice_blend` and `fallback_voice` fields; older callers can keep
sending only `text`, `voice`, `speed`, and `lang`. The Python service loads the
existing KokovoiceLab NumPy bundle when configured, caches vector blends, and
falls back to the requested stock Kokoro voice if a custom vector or blend is
unavailable.

The Node production service applies the saved DSP recipe after Kokoro returns a
take, then runs the existing audio probe/mix path. Candidate validation checks
generation, duration, clipping, audible signal, silence, finite output, and
volume safety before the admin action can select it.

On `.76`, restart the two existing services after deployment and confirm the
admin voice page still shows the selected versions:

```bash
sudo systemctl restart bullshit-factory-tts.service
sudo systemctl restart bullshit-factory-production.service
curl -H "x-bullshit-factory-production-token: $BF_PRODUCTION_TOKEN" \
  http://127.0.0.1:8793/api/production/voices
```

No paid cloud TTS service is required for normal character speech.

## Episode audio policy

The existing local audio mixer remains the production path. The runtime policy
is `opening-theme-and-string-guitar-only`: the opening title card uses the
approved theme, normal content segments use dialogue plus purposeful SFX, and
String's `bf-string-guitar` cue is added only when a locked String performance
mentions a guitar, solo, riff, strum, amp, or related stage action. The former
procedural ambience bed and automatic music/stinger selection are not eligible
for content playback. Missing optional cues fall back to silence and never to a
different music track. All audio is normalized through the existing loudness
and true-peak limits. After Kokoro produces the real takes, normal cast speech
is distributed through the requested segment duration, with a short final
reaction/button tail. A sparse script that would still leave an extended
unvoiced tail is rejected rather than publishing a silent half-episode.

The H3 renderer uses one stable union geometry envelope per character across
approved idle, listen, talk, react, and walk clips. This keeps changing alpha
padding from moving a character at a state transition. If an individual frame
cannot be decoded, the renderer holds another valid frame from the same
approved clip; it does not make the actor blink out for one frame.
