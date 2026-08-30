# Bullshit Factory

Bullshit Factory is a 16-bit animated sitcom and continuous nonsense network. It turns fresh topic suggestions, character rules, and audience seeds into short original cartoon episodes for review and publication.

The project is designed to run on the production host at `.76` and to keep the Windows machine out of the rendering and generation path.

## What it does

- Generates on-demand cast episodes or standalone Orange Idiot broadcasts.
- Supports short, medium, and long episode presets.
- Uses a 3-second original opening title card before the episode content.
- Renders a locked 384x216 pixel presentation at 12 frames per second.
- Places characters, props, reactions, captions, and purposeful motion from a validated timeline.
- Keeps Bork bark-only; Bork does not receive spoken dialogue.
- Publishes approved episodes to the public website player and its continuous playlist.
- Provides a single admin dashboard for generation, review, publishing, playlist editing, audience inputs, research refreshes, and live setup.
- Keeps normal audience chat display-only. Only explicit suggestion commands become creative seeds, and Discord is not posted to autonomously.

The production catalog contains the floor cast plus the separate Orange Idiot broadcast character. Orange Idiot can be generated alone or selected as one side of continuous random programming.

## Production pipeline

1. Goblin builds a premise and sitcom beat sheet around one concrete incident.
2. Research results and audience suggestions are treated as untrusted topic seeds, not copy.
3. The writer creates original dialogue, reactions, and stage intent while checking prior script, speech, and title memory.
4. Gemini supplies animation direction when configured. The local compositor remains the runtime renderer.
5. Kokoro produces serialized character audio. The dog uses bark audio only.
6. Sharp and FFmpeg assemble the title card, scene frames, captions, audio, and final MP4.
7. Geometry, grounding, timing, audio, caption, novelty, and media checks run before publication.
8. Failed segments and quarantined episodes are kept out of the public playlist.

Every new episode title is numbered and its title body is checked independently, so changing the episode number cannot create a duplicate title.

## AI and media roles

- Groq Qwen 3.8 27B is the primary free-tier script writer when its API key and model are configured.
- Gemini Flash is the writer fallback when configured.
- Goblin local generation and the deterministic writer are emergency fallbacks.
- Gemini Flash Lite is the primary animation director when configured.
- The local authored clips, Sharp compositor, and FFmpeg pipeline produce the actual frames and media.
- PixelLab is an optional asset-authoring tool. It is not an automatic production credit consumer.
- Kokoro FastAPI is the voice backend on loopback. Character voices share the configured production speed, while Orange Idiot has its own pitch/effect controls.
- Production music is local and original: the approved opening theme is used for the title card, and original generated music beds are optional per episode. No third-party song is pulled automatically.

## Public site and dashboard

The public landing page is the viewer-facing Bullshit Factory channel. It contains the episode list, video player, captions, audience chat, and continuous-playback state. The player is intentionally not muted by the application. Browser autoplay policy may still require a viewer to press Play before a browser will start audible playback.

The admin dashboard is protected by the single-user admin gate. It can:

- Generate a review episode or publish directly to the website playlist.
- Choose cast, Orange Idiot, or random cast/Orange programming.
- Choose where and when generation should be staged, plus a short/medium/long duration.
- Start and stop continuous generation independently from playback.
- Verify playlist health, inspect the last resolved random mode, and remove queued items.
- Review writer, animation, audio, quarantine, and publishing logs.
- Refresh topic pools and add custom topic seeds.
- Configure YouTube and TikTok live output without granting the Discord bot autonomous posting rights.

## Continuous programming

Continuous generation is operator-started and runs until the Stop control is pressed. Each generated cut is validated, published, and queued for the website playlist. The public page refreshes playlist state without a full-page reload and advances through published media.

When the continuous WHO choice is RANDOM, the first cut starts from a hashed random choice and subsequent cuts alternate cast and Orange Idiot so both modes are represented instead of getting stuck on one mode. The dashboard reports the last resolved choice. A separate playback-only continuous session can also refill its rolling queue with the same selection rules when a generation request is present.

## Repository layout

- `app/`: application routes, public page, admin page, and API proxy routes.
- `components/`: public landing page, dashboard, and reusable UI.
- `lib/`: shared catalog, scheduling, location, motion, caption, and validation logic.
- `server/`: local production controller, music adapter, TTS bridge, and live bridge.
- `public/bullshit-factory/`: authored characters, scenes, props, fonts, music metadata, and training data.
- `runtime/`: local production state, generated segments, episode media, audio, and playlist state. Runtime media is not source code.
- `animation-production/`: animation assets, import records, and production training material.
- `scripts/`: catalog builders, runtime builders, music tools, and admin setup helpers.
- `.openai/hosting.json`: Sites project and logical storage bindings.

## Development and validation

The project uses Node.js 22 or newer.

```bash
npm install
npm test
npm run build
npm run assets:verify
npm run lint
npm run start
```

The production service uses the same repository with environment-specific values supplied by `.env`. Keep secrets out of Git. Use `.dev.vars.example` as a reference for local or dashboard proxy configuration.

Useful production endpoints are loopback-only:

- Dashboard application: port 8792.
- Serialized production controller: port 8793.
- Kokoro/TTS integration: configured loopback endpoint.
- Music adapter: configured loopback endpoint.

## Deployment

The production checkout is on `.76` at `/home/goblin/cave/bullshit-factory`. Systemd keeps the dashboard, production controller, TTS, and original-music adapter available on that host.

The source repository is [HorseTheUnicorn/bullshitfactory](https://github.com/HorseTheUnicorn/bullshitfactory). The hosted Site uses the project metadata in `.openai/hosting.json`; publish only a validated build and never commit runtime secrets.

## Content policy

Research and headline feeds provide suggestions for original nonsense. The writer should not copy source wording, present fictional lines as real quotations, or turn the show into a news explainer. Adult language and topics are part of the show's fictional comedy setting, but production validation still controls what reaches the public playlist.
