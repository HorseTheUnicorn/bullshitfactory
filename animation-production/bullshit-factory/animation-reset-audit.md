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
- The authoritative `.76` checkout contained 4,423 legacy `Idle/animations` PNG frames before this cutover. Those superseded motion trees have now been removed from the isolated runtime branch; canonical character source art, rotations, and spritesheets remain under `characters/v1/`.
- The generated catalog exposes 51 reviewed H3 replacement clips for the ten-character cast. The registry contains 53 reviewed accepted clips total: 51 main-cast clips plus Orange Idiot's reviewed `talk` and `walk` proof set.
- Canonical character art, rotations, spritesheets, scenes, voices, scripts, captions, playlist, and production state are preserved. The H3 runtime change is limited to motion selection and the accepted local motion assets. Orange Idiot's superseded five-frame talking animation was removed as well; his standalone south-facing preview and accepted H3 `talk`/`walk` proof remain.

## Required replacement

The replacement is a separate accepted local motion registry. Each accepted entry must carry the character/action identity, source-art hash, H3 request ID, prompt hash, seed, source resolution, frame metadata, feet anchor, sprite pivot, loop policy, and validation state.

The replacement library is identified as `H3_LIBRARY_V2` (library version `2`) and must cover human idle/listen/talk/react/walk performances, purposeful gestures and reactions, and Bork idle/listen/bark/wag/sniff/walk performances. Its accepted frames remain under the existing `/bullshit-factory/motion/v2/` public asset root so the logical library can be versioned without duplicating the runtime tree. Only accepted entries may be added to the runtime catalog.

Orange Idiot is a TV-only authoring subject and remains outside the ten-character cast catalog. His replacement proof set is `talk` plus `walk`: both must preserve the supplied south-facing identity, keep his head and eyes aimed at the camera, and remain readable as bounded left-to-right pacing during speech. The compositor owns scene-scale travel; reviewed local H3 clips supply the reusable character performance. His voice profile is an original low-to-mid, slightly nasal, raspy/breathy, mildly congested New York/Queens-inspired delivery with short bursts, pauses, repetitions, stretched vowels, and abrupt emphasis changes.

## 480P versus 768P comparison

- The paired Mags Rust idle pilots used the same source artwork, the same five-second H3 action, and the same final processing path at 480P and 768P.
- After chroma cleanup, 12 FPS resampling, 92x92 normalization, and nearest-neighbor inspection at the final sprite scale, the 768P result showed no material identity, silhouette, anchor, or action-readability improvement.
- 480P is therefore the runtime default. The 768P Rook and Mags resolution pilots remain in the registry as superseded audit artifacts and are excluded from runtime lookup.

## Authoring/production key boundary

The H3 authoring key is provisioned only in the untracked `/home/goblin/cave/bullshit-factory/.h3-authoring.env` on .76. It is not copied into source control, the normal `.env`, or the production service environment. Production therefore remains fail-closed for FAL/H3 calls; the authoring command is the only path allowed to use that key.

## Audio boundary

Stable Audio 3 is already a separate local serialized service and remains
pre-generation-only. Runtime content audio follows the opening-theme-and-
String-guitar-only policy: purposeful SFX remain available, while ambient beds
and musical stingers are not selected for normal content. Stable Audio must
never consume the H3 visual-motion budget or run from the normal render path.

## Transition status

The replacement registry is active with 53 reviewed runtime clips plus 4 superseded historical entries, the selector is switched to replacement mode, and legacy runtime motion is no longer eligible. The canonical accepted H3 motion tree is the sole runtime animation source; the renderer fails closed if an approved H3 clip is unavailable instead of consulting a legacy animation path.

The generated catalog now uses H3 clip IDs for primary actions, exposes only `h3-max-local` clips, and marks `legacyRuntimeEligible` false. The old motion-generation command and batch manifest are removed. The remaining PixelLab brand manifest is unrelated artwork authoring and is intentionally retained.

## H3 authoring evidence

- The .76 authoring ledger records 59 H3 request records against `minimax/h3-max/image-to-video`, with a conservative estimated spend of $15.35 under the $30 hard limit and $29 internal stop.
- Request statuses are 57 accepted outputs and 2 duplicate-slot records; the accepted source set used 55 480P and 2 768P generations. The duplicate-slot records did not submit new H3 work.
- The authoritative authoring directory contains the real source videos, extracted raw frames, processed contact sheets, and metadata. The isolated branch contains the processed local runtime frames and registry; raw authoring output remains outside the runtime tree.
- After the final resolution comparison, the runtime registry contains 53 accepted clips and 4 superseded historical entries. Runtime H3 requests remain disabled and the compositor uses only the accepted local registry.
