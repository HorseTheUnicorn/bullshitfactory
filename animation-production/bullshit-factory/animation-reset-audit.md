# Bullshit Factory animation reset audit

Audit date: 2026-09-01
Host: Proxmox guest .76 (Ubuntu)

## Current runtime

- The deterministic compositor renders 384x216 at 12 fps and already owns scene placement, feet grounding, collision checks, captions, and depth sorting.
- Gemini is already used as a semantic performance director when configured; it does not render frames.
- The production service uses the public character catalog and the per-character action registry.
- Runtime generation does not call PixelLab or H3. H3 is intentionally authoring-only.

## Legacy motion inventory

- 10 active characters: 9 human characters and Bork.
- The retired `Idle/animations` trees contained 4,423 legacy PNG frames; those files and empty animation directories have now been removed.
- The generated catalog now exposes 53 reviewed H3 replacement clips for the ten-character cast. Canonical character art, rotations, spritesheets, and the separate H3 motion registry remain intact.
- No legacy PixelLab or character-authored animation directory is eligible or present in the active runtime tree.
- Existing art, rotations, scenes, voices, scripts, captions, playlist, and production state are out of scope for this reset and must be preserved.

## Required replacement

The replacement is a separate accepted local motion registry. Each accepted entry must carry the character/action identity, source-art hash, H3 request ID, prompt hash, seed, source resolution, frame metadata, feet anchor, sprite pivot, loop policy, and validation state.

The replacement library must cover human idle/listen/talk/react/walk performances, purposeful gestures and reactions, and Bork idle/listen/bark/wag/sniff/walk performances. Only accepted entries may be added to the runtime catalog.

Orange Idiot is a TV-only authoring subject and remains outside the ten-character cast catalog. His replacement proof set is `talk` plus `walk`: both must preserve the supplied south-facing identity, keep his head and eyes aimed at the camera, and remain readable as bounded left-to-right pacing during speech. The compositor owns scene-scale travel; reviewed local H3 clips supply the reusable character performance. His voice profile is an original low-to-mid, slightly nasal, raspy/breathy, mildly congested New York/Queens-inspired delivery with short bursts, pauses, repetitions, stretched vowels, and abrupt emphasis changes.

## Authoring/production key boundary

The H3 authoring key is provisioned only in the untracked `/home/goblin/cave/bullshit-factory/.h3-authoring.env` on .76. It is not copied into source control, the normal `.env`, or the production service environment. Production therefore remains fail-closed for FAL/H3 calls; the authoring command is the only path allowed to use that key.

## Audio boundary

Stable Audio 3 is already a separate local serialized service. It is allowed to own music/SFX/ambience/stingers and must never consume the H3 visual-motion budget. The motion reset will add semantic audio metadata without putting Stable Audio or H3 calls in the normal render path.

## Transition status

The replacement registry is active with 55 reviewed local clips, the selector is switched to replacement mode, and legacy runtime motion is no longer eligible or present on disk. The canonical H3 motion tree is now the sole runtime animation source.
