#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public');
const characterRoot = path.join(publicRoot, 'bullshit-factory', 'characters', 'v1');
const sceneRoot = path.join(publicRoot, 'bullshit-factory', 'scenes');
const manifestPath = path.join(siteRoot, 'animation-production', 'bullshit-factory', 'pixellab-generation-manifest.json');
const animationTrainingPath = path.join(publicRoot, 'bullshit-factory', 'production', 'animation-assembly-training.json');
const pixelLabEndpoint = 'https://api.pixellab.ai/v2';

const characterSpecs = [
  { id: 'rookboss', folder: 'RookBoss', actions: [{ id: 'walk', action: 'walk in place with a confident foreman stride, alternating feet and swinging the free arm' }, { id: 'react', action: 'throw both hands up, point sharply, then settle into an annoyed stance' }] },
  { id: 'magsrust', folder: 'MagsRust', actions: [{ id: 'walk', action: 'walk in place with a sturdy older-worker step and a small shoulder sway' }, { id: 'react', action: 'raise a wrench, squint, shrug, and deliver a dry unimpressed reaction' }] },
  { id: 'kernelkline', folder: 'KernelKline', actions: [{ id: 'walk', action: 'walk in place while clutching a cable, with nervous quick steps and hunched shoulders' }, { id: 'react', action: 'type frantically, recoil from the monitor, push glasses up, and point at an error' }] },
  { id: 'sudsmcgee', folder: 'SudsMcGee', actions: [{ id: 'walk', action: 'swagger in place with a loose barroom step, bottle arm counterbalancing the body' }, { id: 'react', action: 'raise the bottle, laugh, shrug broadly, and point as if proposing another drink' }] },
  { id: 'dooby', folder: 'Dooby', actions: [{ id: 'walk', action: 'drift in place with relaxed alternating steps, gentle torso sway, and loose hands' }, { id: 'react', action: 'slowly lift both hands, gaze upward, sway as if a strange idea just arrived' }] },
  { id: 'spaulding', folder: 'Spaulding', actions: [{ id: 'walk', action: 'walk in place like a weathered sailor on a rocking deck, with a wide steady stance' }, { id: 'react', action: 'check a compass, pull a rope, point toward the horizon, and brace against a wave' }] },
  { id: 'string', folder: 'String', actions: [{ id: 'walk', action: 'walk in place with a loose rock-and-roll strut, alternating feet and bouncing shoulders' }, { id: 'react', action: 'play an invisible guitar riff, stomp one foot, lean into the beat, and throw a rock-star pose' }] },
  { id: 'karen', folder: 'Karen', actions: [{ id: 'walk', action: 'walk in place with brisk office steps while protecting a clipboard and keeping posture rigid' }, { id: 'react', action: 'write rapidly, stop, push glasses up, raise one finger, and point at a paperwork violation' }] },
  { id: 'nico', folder: 'Nico', actions: [{ id: 'walk', action: 'walk in place carrying the box, with cautious alternating steps and small nervous glances' }, { id: 'react', action: 'shift the box, double-take, point at an unseen problem, and nervously step back' }] },
  { id: 'bork', folder: 'Bork', actions: [{ id: 'walk', action: 'trot in place with independent legs, a wagging tail, a curious head tilt, and ear flicks' }, { id: 'bark', action: 'bark as if trying to talk, open and close the muzzle, tilt the head, flick the ears, and wag the tail' }] },
];

const sceneSpecs = [
  { id: 'factory-floor', description: 'wide 16-bit pixel-art background for a grimy factory production floor, muted early-2000s console palette, conveyor belt, warning lamps, control panel, stacked crates, industrial windows, no characters, no text, no logos, straight-on side view, crisp hard pixel clusters, maximum 64 colors, subdued aged colors' },
  { id: 'break-room', description: 'wide 16-bit pixel-art background for a tired factory break room, muted early-2000s console palette, dented stools, vending machine, corkboard, coffee machine, small bottle shelf, fluorescent light, no characters, no text, no logos, crisp hard pixel clusters, maximum 64 colors, subdued aged colors' },
  { id: 'server-room', description: 'wide 16-bit pixel-art background for an old factory server room, muted early-2000s console palette, CRT monitors, server racks, cable spaghetti, blinking status lights, rolling chair, no characters, no text, no logos, crisp hard pixel clusters, maximum 64 colors, subdued aged colors' },
  { id: 'boat-bay', description: 'wide 16-bit pixel-art background for a factory loading dock boat bay, muted early-2000s console palette, small sailboat, rope coils, faded safety paint, gray water, leaking warehouse roof, no characters, no text, no logos, crisp hard pixel clusters, maximum 64 colors, subdued aged colors' },
  { id: 'loading-dock', description: 'wide 16-bit pixel-art background for a night factory loading dock, muted early-2000s console palette, sodium lamp, pallets, busted forklift, radio speaker, overcast sky, no characters, no text, no logos, crisp hard pixel clusters, maximum 64 colors, subdued aged colors' },
];

const direction = 'south';
const frameCount = 8;
const args = process.argv.slice(2);
const replace = args.includes('--replace');
const skipScenes = args.includes('--skip-scenes');
const onlyCharacters = optionValue('--characters');
const onlyMotions = optionValue('--motions');
const onlyScenes = optionValue('--scenes');
const waitMs = Math.max(1500, Number(optionValue('--poll-ms') || 4000));
const timeoutMs = Math.max(60000, Number(optionValue('--timeout-ms') || 480000));

function optionValue(name) {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const inline = args.find((argument) => argument.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : null;
}

function parseDotenv(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
}

async function loadApiKey() {
  const values = { ...process.env };
  try {
    Object.assign(values, parseDotenv(await fs.readFile(path.join(siteRoot, '.dev.vars'), 'utf8')));
  } catch {
    // Environment variables remain a supported non-local fallback.
  }
  const apiKey = values.PIXELLAB_API_KEY?.trim();
  if (!apiKey) throw new Error('PIXELLAB_API_KEY is not configured in site/.dev.vars or the calling environment.');
  return apiKey;
}

function errorDetail(payload) {
  if (!payload) return 'no response body';
  if (typeof payload === 'string') return payload.slice(0, 280);
  return String(payload.detail || payload.message || payload.error || JSON.stringify(payload)).slice(0, 280);
}

async function pixelLabRequest(apiKey, endpoint, body, method = 'POST', attempt = 0) {
  const response = await fetch(`${pixelLabEndpoint}${endpoint}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: method === 'GET' ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  if (response.status === 429 && attempt < 12) {
    await wait(Math.min(15000, waitMs * (attempt + 1)));
    return pixelLabRequest(apiKey, endpoint, body, method, attempt + 1);
  }
  if (!response.ok) throw new Error(`PixelLab ${endpoint} returned HTTP ${response.status}: ${errorDetail(payload)}`);
  return payload;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollBackgroundJob(apiKey, jobId) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await pixelLabRequest(apiKey, `/background-jobs/${encodeURIComponent(jobId)}`, null, 'GET');
    const status = String(latest?.status || '').toLowerCase();
    const images = extractImages(latest);
    if (status === 'completed' || status === 'complete' || images.length > 0) return latest;
    if (status === 'failed' || status === 'error' || status === 'cancelled') {
      throw new Error(`PixelLab job ${jobId} failed: ${errorDetail(latest)}`);
    }
    await wait(waitMs);
  }
  throw new Error(`PixelLab job ${jobId} exceeded the ${Math.round(timeoutMs / 1000)} second polling timeout.`);
}

async function resolveResponse(apiKey, response) {
  if (response?.background_job_id) return pollBackgroundJob(apiKey, response.background_job_id);
  return response;
}

function imageBase64(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.base64 || value.data || value.image?.base64 || null;
}

function extractImages(payload) {
  const response = payload?.last_response || payload?.result || payload;
  if (Array.isArray(response?.images)) return response.images;
  if (Array.isArray(response?.frames)) return response.frames;
  if (response?.image) return [response.image];
  return [];
}

function imageBuffer(value) {
  const encoded = imageBase64(value);
  if (!encoded) throw new Error('PixelLab returned an image without base64 data.');
  const data = encoded.includes(',') ? encoded.slice(encoded.indexOf(',') + 1) : encoded;
  return Buffer.from(data, 'base64');
}

function safeRelative(root, relativePath) {
  const target = path.resolve(root, relativePath.replaceAll('/', path.sep));
  if (target !== path.resolve(root) && !target.startsWith(path.resolve(root) + path.sep)) {
    throw new Error(`Refusing a path outside ${root}: ${relativePath}`);
  }
  return target;
}

async function sourceFrameFor(spec) {
  const root = path.join(characterRoot, spec.folder);
  const metadataPath = path.join(root, 'metadata.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const animations = metadata.states?.[0]?.frames?.animations || {};
  const entry = Object.entries(animations).find(([id, animation]) => !id.startsWith('pixellab-') && Array.isArray(animation?.south) && animation.south.length);
  if (!entry) throw new Error(`No source south frame found for ${spec.folder}.`);
  const relativePath = entry[1].south[0];
  const filePath = safeRelative(root, relativePath);
  const buffer = await fs.readFile(filePath);
  const info = await sharp(buffer).metadata();
  return { root, metadataPath, metadata, buffer, width: info.width || 64, height: info.height || 64 };
}

function dataUrl(buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function selected(values, all) {
  if (!values) return all;
  const requested = new Set(values.split(',').map((value) => value.trim()).filter(Boolean));
  return all.filter((value) => requested.has(value.id));
}

async function animationAlreadyExists(source, animationId) {
  return Boolean(source.metadata.states?.[0]?.frames?.animations?.[animationId]);
}

async function writeAnimation(spec, actionSpec, apiKey, seed, manifest, animationTraining) {
  const source = await sourceFrameFor(spec);
  const animationId = `pixellab-${actionSpec.id}-v1`;
  if (await animationAlreadyExists(source, animationId) && !replace) {
    manifest.skipped.push({ kind: 'animation', characterId: spec.id, animationId, reason: 'already-exists' });
    return;
  }

  const description = [
    'Preserve the exact character identity, outfit, silhouette, proportions, face, palette, and hard outline from the supplied first frame.',
    actionSpec.action + '.',
    'Create a clean readable 16-bit game animation with connected anatomy and visible weight shifts.',
    'Keep all frames transparent, avoid redesigning the character, avoid extra props, avoid text, avoid duplicate limbs, avoid camera movement, and keep the feet grounded when appropriate.',
    `Assembly contract: use ${animationTraining.anchorContract.requiredAnchors.join(', ')}; keep placement on the integer-pixel grid; preserve the ${animationTraining.scope.canvas.fps} fps, ${animationTraining.scope.canvas.maxColors}-color project limits; reject redesigns and detached shadows.`,
  ].join(' ');
  const response = await resolveResponse(apiKey, await pixelLabRequest(apiKey, '/animate-with-text-v3', {
    action: description,
    first_frame: { base64: dataUrl(source.buffer) },
    frame_count: frameCount,
    no_background: true,
    seed,
  }));
  const images = extractImages(response);
  if (images.length < 2) throw new Error(`PixelLab returned fewer than two frames for ${spec.id}/${animationId}.`);

  const frameDir = path.join(source.root, 'Idle', 'animations', animationId, direction);
  await fs.mkdir(frameDir, { recursive: true });
  const framePaths = [];
  for (const [index, image] of images.slice(0, frameCount).entries()) {
    const filePath = path.join(frameDir, `frame_${String(index).padStart(3, '0')}.png`);
    const normalized = await sharp(imageBuffer(image)).png().toBuffer();
    const info = await sharp(normalized).metadata();
    if (!info.width || !info.height) throw new Error(`PixelLab returned an invalid frame for ${spec.id}/${animationId}.`);
    await fs.writeFile(filePath, normalized);
    framePaths.push(`Idle/animations/${animationId}/${direction}/frame_${String(index).padStart(3, '0')}.png`);
  }
  source.metadata.states[0].frames.animations[animationId] = { [direction]: framePaths };
  await fs.writeFile(source.metadataPath, `${JSON.stringify(source.metadata, null, 2)}\n`, 'utf8');
  manifest.completed.push({ kind: 'animation', characterId: spec.id, animationId, action: actionSpec.action, frameCount: framePaths.length, files: framePaths.map((file) => `/bullshit-factory/characters/v1/${spec.folder}/${file}`) });
}

async function writeScene(scene, apiKey, seed, manifest) {
  const filePath = path.join(sceneRoot, `${scene.id}.png`);
  if (!replace) {
    try {
      await fs.access(filePath);
      manifest.skipped.push({ kind: 'scene', sceneId: scene.id, reason: 'already-exists' });
      return;
    } catch {
      // Generate the missing scene.
    }
  }
  const response = await resolveResponse(apiKey, await pixelLabRequest(apiKey, '/create-image-pixflux', {
    description: scene.description,
    image_size: { width: 256, height: 144 },
    no_background: false,
    outline: 'single color black outline',
    seed,
  }));
  const images = extractImages(response);
  if (!images.length) throw new Error(`PixelLab returned no image for scene ${scene.id}.`);
  const normalized = await sharp(imageBuffer(images[0])).png().toBuffer();
  await fs.mkdir(sceneRoot, { recursive: true });
  await fs.writeFile(filePath, normalized);
  const info = await sharp(normalized).metadata();
  manifest.completed.push({ kind: 'scene', sceneId: scene.id, width: info.width || null, height: info.height || null, file: `/bullshit-factory/scenes/${scene.id}.png` });
}

async function main() {
  const apiKey = await loadApiKey();
  const animationTraining = JSON.parse(await fs.readFile(animationTrainingPath, 'utf8'));
  const manifest = {
    generatedAt: new Date().toISOString(),
    endpoint: pixelLabEndpoint,
    sourceStyle: 'supplied 16-bit PixelLab character exports; identity-preserving reference-frame generation',
    frameCountRequested: frameCount,
    direction,
    animationTraining: { schemaVersion: animationTraining.schemaVersion, file: '/bullshit-factory/production/animation-assembly-training.json' },
    replace,
    completed: [],
    skipped: [],
    errors: [],
  };
  const characters = selected(onlyCharacters, characterSpecs);
  const scenes = selected(onlyScenes, sceneSpecs);
  const motionFilter = onlyMotions ? new Set(onlyMotions.split(',').map((value) => value.trim())) : null;
  if (!characters.length && !scenes.length) throw new Error('No matching characters or scenes were selected.');

  for (const [characterIndex, character] of characters.entries()) {
    const actions = character.actions.filter((action) => !motionFilter || motionFilter.has(action.id));
    for (const [actionIndex, action] of actions.entries()) {
      try {
        process.stdout.write(`Generating ${character.id}/${action.id}…\n`);
        await writeAnimation(character, action, apiKey, 26000 + characterIndex * 100 + actionIndex, manifest, animationTraining);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        manifest.errors.push({ kind: 'animation', characterId: character.id, actionId: action.id, message });
        process.stdout.write(`FAILED ${character.id}/${action.id}: ${message}\n`);
      }
    }
  }

  if (!skipScenes) {
    for (const [sceneIndex, scene] of scenes.entries()) {
      try {
        process.stdout.write(`Generating scene/${scene.id}…\n`);
        await writeScene(scene, apiKey, 27000 + sceneIndex, manifest);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        manifest.errors.push({ kind: 'scene', sceneId: scene.id, message });
        process.stdout.write(`FAILED scene/${scene.id}: ${message}\n`);
      }
    }
  }

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    manifestPath,
    completed: manifest.completed.length,
    skipped: manifest.skipped.length,
    errors: manifest.errors.length,
  }, null, 2));
  if (manifest.errors.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
