# Bullshit Factory

Bullshit Factory is a 16-bit animated sitcom and continuous nonsense network. It turns fresh topic suggestions, character rules, and audience seeds into short original cartoon episodes for review and publication.

This repository is environment-neutral. It can run on a self-managed Linux host or another compatible deployment target; hostnames, filesystem paths, credentials, model locations, and runtime state belong in local configuration and are never part of the public source tree.

## What it does

- Generates on-demand cast episodes or standalone Orange Idiot broadcasts.
- Supports Short (1 minute), Standard (3 minutes), and Extended (5 minutes) episode presets; Standard is the default.
- Uses a 3-second original title card, a locked 384x216 presentation, and 12 frames per second.
- Places characters, props, reactions, captions, and purposeful motion from a validated timeline.
- Keeps Bork bark-only; Bork does not receive spoken dialogue.
- Publishes approved episodes to the public website player and its continuous playlist.
- Provides a single admin dashboard for generation, review, publishing, playlist editing, audience inputs, research refreshes, and live setup.
- Keeps normal audience chat display-only. Only explicit suggestion commands become creative seeds, and Discord is not posted to autonomously.

## Production pipeline

1. Goblin builds a premise and sitcom beat sheet around one concrete incident.
2. Research results and audience suggestions are untrusted topic seeds, not copy.
3. The writer creates original dialogue, reactions, and stage intent while checking prior script, speech, and title memory.
4. Gemini supplies animation direction when configured; the local compositor remains the runtime renderer.
5. Kokoro produces serialized character audio; the dog uses bark audio only.
6. Sharp and FFmpeg assemble frames, captions, audio, and the final MP4.
7. Geometry, grounding, timing, audio, caption, novelty, and media checks run before publication.
8. Failed or quarantined output stays out of the public playlist.

Every new episode title is numbered and its title body is checked independently, so changing the episode number cannot create a duplicate title.

## AI and media roles

- Groq Qwen 3.8 27B is the primary free-tier script writer when configured.
- Gemini Flash is the writer fallback.
- Goblin local generation and the deterministic writer are emergency fallbacks.
- Gemini Flash Lite is the semantic animation director.
- Authored clips, the deterministic compositor, Sharp, and FFmpeg produce the media.
- PixelLab is optional asset authoring and does not consume credits during production.
- Kokoro FastAPI is the loopback voice backend; Orange Idiot has separate pitch/effect controls.
- Production music is local and original. The opening theme is the only continuous music; content segments do not receive ambient beds or musical stingers. String's guitar-performance cue may play when a locked performance calls for it, and third-party songs are not pulled automatically.

## Quick start

### Requirements

- Node.js 22.13 or newer and npm.
- FFmpeg on the executable path.
- Python 3.10+ for the optional Kokoro service and its documented dependencies.
- The authored assets and generated catalog in this repository.
- Optional local Kokoro/KokovoiceLab files, Stable Audio model files, and a Goblin-compatible endpoint.
- Optional free-tier Groq and Gemini API credentials.

### Install and configure

__BT____BT____BT__bash
git clone https://github.com/HorseTheUnicorn/bullshitfactory.git
cd bullshitfactory
npm ci
cp .env.example .env
chmod 600 .env
__BT____BT____BT__

Edit .env locally. Keep all API keys, tokens, password hashes, live-stream credentials, and model paths there. Use relative paths for a portable checkout or absolute paths appropriate to the host. .dev.vars.example is a separate edge/dashboard proxy reference; copy it to .dev.vars only for that workflow.

Create the single admin account in a local interactive terminal:

__BT____BT____BT__bash
npm run admin:setup
__BT____BT____BT__

The command asks for one username and password, stores only a password hash and generated session secret, and enforces the one-admin design. See ADMIN-SETUP.md for rotation details.

Run checks before starting:

__BT____BT____BT__bash
npm test
npm run lint
npm run build
npm run assets:verify
npm run start
__BT____BT____BT__

The application defaults to loopback-only host and port settings from .env.

## Public site and dashboard

The public page contains the episode list, video player, captions, audience chat, and continuous-playback state. The application does not mute the player, although browser autoplay policy may require a viewer to press Play before audible playback starts.

The protected dashboard can generate cast or Orange Idiot episodes, choose short/standard/extended duration, start and stop generation, inspect validation and quarantine logs, refresh topic pools, edit the playlist, and configure optional YouTube/TikTok output. Public viewers do not receive generation, publishing, credential, or host control.

## Continuous programming

Continuous generation is operator-started and runs until Stop is pressed. Validated cuts are published and queued for the website. The public page refreshes playlist state without a full-page reload.

When WHO is RANDOM, the first cut uses a hashed random choice and later cuts alternate cast and Orange Idiot so both modes are represented. The dashboard reports the last resolved choice.

## Repository layout

- app/: routes, public page, admin page, and API proxy routes.
- components/: landing page, dashboard, and reusable UI.
- lib/: catalog, location, motion, caption, and validation logic.
- server/: production controller, music adapter, TTS bridge, and live bridge.
- public/bullshit-factory/: authored characters, scenes, props, fonts, music metadata, and training data.
- runtime/: ignored local state, generated segments, media, audio, and playlist state.
- animation-production/: animation assets, import records, and training material.
- scripts/: catalog builders, runtime builders, music tools, and admin helpers.
- .openai/hosting.json: optional Sites project and logical storage bindings.

## Optional systemd deployment

The deploy/ directory contains generic unit templates using /opt/bullshit-factory for the checkout, /var/lib/bullshit-factory for writable runtime data, and /etc/bullshit-factory/bullshit-factory.env for secrets. Adjust paths and the service user before installing them.

__BT____BT____BT__bash
sudo useradd --system --home-dir /var/lib/bullshit-factory --create-home --shell /usr/sbin/nologin bullshit-factory
sudo install -d -o bullshit-factory -g bullshit-factory /etc/bullshit-factory
sudo install -m 600 .env /etc/bullshit-factory/bullshit-factory.env
sudo cp deploy/bullshit-factory.service /etc/systemd/system/
sudo cp deploy/bullshit-factory-production.service /etc/systemd/system/
sudo cp deploy/bullshit-factory-tts.service /etc/systemd/system/
sudo cp deploy/bullshit-factory-music.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now bullshit-factory-production.service bullshit-factory.service
__BT____BT____BT__

Enable TTS, music, YouTube, and tunnel units only after their optional dependencies and model paths are configured. Keep loopback services behind an authenticated reverse proxy if they must be reachable remotely.

## Security and public sharing

- .env, .dev.vars, tunnel configuration, runtime state, generated media, credentials, private keys, and common secret-file names are ignored by Git.
- Tracked example files contain blank secret values and portable paths. Never fill examples with real credentials.
- API keys and live-platform credentials stay server-side; never put them in React code, public JSON, browser bundles, or query strings.
- Keep the admin password as a hash and use a long random session secret.
- Audience and Discord inputs are suggestions only. The Discord helper must not post or publish autonomously.
- If a credential was ever committed in another branch or fork, revoke and rotate it before sharing that history.
- Review third-party model and asset licenses before redistribution.

## Validation and operations

Generation is serialized at the controller. The controller records provider choices, animation direction, timing, audio normalization, validation, quarantine, publication, and playlist events. Do not expose service logs or diagnostics publicly.

See SECURITY.md and public/bullshit-factory/production/NOTICE-stable-audio-3.txt for additional security and licensing notes.
