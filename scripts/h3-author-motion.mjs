#!/usr/bin/env node

import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public');
const dataRoot = path.resolve(process.env.BF_DATA_ROOT || path.join(siteRoot, 'runtime'));
const registryPath = path.join(publicRoot, 'bullshit-factory', 'production', 'motion-registry.json');
const ledgerPath = path.resolve(process.env.BF_H3_LEDGER_PATH || path.join(dataRoot, 'h3-authoring-ledger.json'));
const model = 'minimax/h3-max/image-to-video';
const H3_LIBRARY_ID = 'H3_LIBRARY_V2';
const H3_LIBRARY_VERSION = 2;
const H3_ASSET_ROOT = '/bullshit-factory/motion/v1';
const falEndpoint = 'https://queue.fal.run/' + model;
const fps = 12;
const defaultDurationSeconds = 5;
const hardBudgetUsd = 30;
const internalStopUsd = 29;
const ratesUsdPerSecond = Object.freeze({ '480P': 0.05, '768P': 0.08 });
const maxAttempts = 2;
const maxVideoBytes = 512 * 1024 * 1024;
const humanActions = Object.freeze([
  'idle', 'listen', 'talk', 'react', 'turn', 'point', 'present', 'lift',
  'inspect', 'type', 'drink', 'hand_off', 'carry', 'push', 'repair',
  'look_left', 'look_right', 'enter', 'walk', 'stop', 'exit', 'shrug',
  'jump', 'recoil', 'interact',
]);
const borkActions = Object.freeze([
  'idle', 'listen', 'bark', 'happy_bark', 'startled', 'annoyed', 'growl',
  'whine', 'huff', 'sniff', 'wag_tail', 'recoil', 'walk', 'enter', 'exit',
]);
const loopActions = new Set(['idle', 'listen', 'talk', 'walk', 'bark', 'wag_tail', 'sniff']);
const oneShotActions = new Set(['react', 'turn', 'point', 'present', 'lift', 'inspect', 'type', 'drink', 'hand_off', 'carry', 'push', 'repair', 'look_left', 'look_right', 'enter', 'stop', 'exit', 'shrug', 'jump', 'recoil', 'interact', 'happy_bark', 'startled', 'annoyed', 'growl', 'whine', 'huff']);
const requiredCoverage = Object.freeze({
  human: ['idle', 'listen', 'talk', 'react', 'walk'],
  bork: ['idle', 'listen', 'bark', 'wag_tail', 'sniff', 'walk'],
  orange: ['talk', 'walk'],
});
const ORANGE_IDIOT_AUTHORING_SUBJECT = Object.freeze({
  id: 'orange-idiot',
  folder: 'tv/orange-idiot',
  displayName: 'Orange Idiot',
  isDog: false,
  authoringOnly: true,
  preview: '/bullshit-factory/tv/orange-idiot/assets/orange-idiot-h3-source.png',
});
const performanceNotes = Object.freeze({
  rookboss: 'Rook Boss stays planted like a tired foreman, shifts weight once, turns his head toward the listener, and uses one firm hand gesture. No camera movement or body redesign.',
  magsrust: 'Mags Rust performs a heavy maintenance-worker idle with a slow knee settle, a small wrench-side gesture, and a deliberate unimpressed head turn. No walking unless the action is walk.',
  kernelkline: 'Kernel Kline performs a compact sleep-deprived systems-worker motion with precise hands, a brief screen glance, and a contained alarmed reaction. Keep the torso readable.',
  sudsmcgee: 'Suds McGee performs a loose barroom storyteller motion with a controlled shoulder sway, one bottle-hand flourish, and a confident pause. Keep feet planted.',
  dooby: 'Dooby performs a slow dreamy wellness-worker sway with a delayed head turn and relaxed hands. The movement is subtle but clearly animated and never becomes a walk.',
  spaulding: 'Spaulding performs a weathered sailor motion with a short balance correction, rope-aware hand gesture, and suspicious look toward the listener. Keep his stance grounded.',
  string: 'String performs a restrained rock employee motion with a shoulder hit, foot tap, and brief air-guitar attitude without requiring a guitar prop. Keep the silhouette stable.',
  karen: 'Karen Fineprint performs a rigid compliance-officer motion with a paper-check gesture, glasses adjustment, and sharp head turn. Her feet remain planted.',
  nico: 'Nico Box performs a cautious new-hire motion with a small nervous step-in-place, box-aware arms, and a double-take. Do not add or change the box design.',
  bork: 'Bork is a dog and never speaks. Use only dog body language: head tilt, ear flick, tail wag, paw shift, sniff, bark, recoil, or short purposeful walk.',
  'orange-idiot': 'Orange Idiot must remain a south-facing full-body character with his head, eyes, and face aimed directly at the camera for the entire performance. For talk, use short burst-and-pause beats, repetitions, stretched emphasis, and abrupt emphasis changes as visible acting beats. For walk, keep his chest and gaze toward camera while he paces laterally left to right and returns; never turn him into profile or redesign his supplied identity.',
});
const actionDescriptions = Object.freeze({
  idle: 'a readable looping idle with breathing, a small weight shift, and a restrained secondary head or hand motion',
  listen: 'a readable listening loop with eyes and head tracking the speaker while the feet remain planted',
  talk: 'a readable talking loop with small mouth and head movement plus one restrained hand or shoulder gesture',
  react: 'a short reaction with a clear anticipation, change, and settle',
  walk: 'a short purposeful walk cycle in place with stable identity, feet, and silhouette',
  bark: 'a dog-only bark loop with muzzle movement, head lift, ear flick, and tail response',
  wag_tail: 'a dog-only tail wag loop with a small head or ear response',
  sniff: 'a dog-only sniff cycle with nose dip, head return, and a small paw adjustment',
});
const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

class PipelineReject extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PipelineReject';
    this.code = code;
  }
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

function cleanSlug(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').replace(/^-+|-+$/gu, '').slice(0, 72) || 'motion';
}

function parseArgs(argv) {
  const args = {
    character: '',
    action: '',
    emotion: 'neutral',
    resolution: '480P',
    duration: defaultDurationSeconds,
    seed: null,
    source: '',
    prompt: '',
    attempts: maxAttempts,
    replace: false,
    dryRun: false,
    activate: false,
    accept: '',
    reviewNote: '',
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const next = argv[index + 1];
    if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--character') args.character = String(next || '').trim().toLowerCase();
    else if (value === '--action') args.action = String(next || '').trim().toLowerCase().replace(/[- ]+/gu, '_');
    else if (value === '--emotion') args.emotion = String(next || 'neutral').trim().toLowerCase();
    else if (value === '--resolution') args.resolution = String(next || '').trim().toUpperCase();
    else if (value === '--duration') args.duration = Number(next);
    else if (value === '--seed') args.seed = Number(next);
    else if (value === '--source') args.source = String(next || '').trim();
    else if (value === '--prompt') args.prompt = String(next || '').trim();
    else if (value === '--attempts') args.attempts = Number(next);
    else if (value === '--replace') args.replace = true;
    else if (value === '--dry-run') args.dryRun = true;
    else if (value === '--activate') args.activate = true;
    else if (value === '--accept') args.accept = String(next || '').trim();
    else if (value === '--review-note') args.reviewNote = String(next || '').trim();
    else if (value.startsWith('--')) throw new Error('Unknown option: ' + value);
    else throw new Error('Unexpected argument: ' + value);
    if (value.startsWith('--') && !['--help', '--replace', '--dry-run', '--activate'].includes(value)) index += 1;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/h3-author-motion.mjs --character rookboss --action talk [options]',
    '',
    'Options:',
    '  --character ID       Character catalog id, or the offline Orange Idiot authoring subject.',
    '  --action ACTION      Action from the human or Bork vocabulary.',
    '  --emotion LABEL      Optional performance variant label.',
    '  --resolution 480P|768P  H3 native resolution; defaults to 480P.',
    '  --duration SECONDS   H3 duration; defaults to 5.',
    '  --seed INTEGER       Reproducible H3 seed.',
    '  --source PATH        Optional source PNG; defaults to the catalog south preview.',
    '  --prompt TEXT        Optional extra direction appended to the controlled prompt.',
    '  --attempts 1|2       Automatic attempts; defaults to 2.',
    '  --replace            Supersede an existing same-slot entry explicitly.',
    '  --dry-run            Validate and price the request without calling H3.',
    '  --activate           Activate replacement mode only when reviewed required coverage is complete.',
    '  --accept ENTRY_ID    Mark one processed contact sheet as explicitly human-reviewed and accepted; no H3 call is made.',
    '  --review-note TEXT   Optional note recorded with --accept.',
    '  --help               Show this help.',
  ].join('\n');
}

function normalizeArgs(args) {
  const resolution = ['480P', '768P'].includes(args.resolution) ? args.resolution : '';
  const duration = Number.isInteger(args.duration) ? args.duration : Math.round(args.duration);
  const attempts = Number.isInteger(args.attempts) ? args.attempts : Math.round(args.attempts);
  if (args.activate) return { ...args, resolution: resolution || '480P', duration, attempts };
  if (args.accept) {
    if (!/^[a-z0-9_-]{3,160}$/iu.test(args.accept)) throw new Error('--accept requires a registry entry id.');
    return { ...args, resolution: resolution || '480P', duration, attempts };
  }
  if (!args.character) throw new Error('--character is required.');
  if (!args.action) throw new Error('--action is required.');
  if (!resolution) throw new Error('--resolution must be 480P or 768P.');
  if (!Number.isInteger(duration) || duration !== 5) throw new Error('H3 authoring is locked to the five-second motion contract.');
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > maxAttempts) throw new Error('Automatic H3 attempts must be 1 or 2.');
  return { ...args, resolution, duration, attempts };
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

async function atomicWrite(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  const temporaryPath = filePath + '.' + process.pid + '.' + randomUUID().slice(0, 8) + '.tmp';
  await writeFile(temporaryPath, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(temporaryPath, filePath);
}

function defaultLedger() {
  return {
    schemaVersion: '1.0',
    showId: 'bullshit-factory',
    policy: {
      hardBudgetUsd,
      internalStopUsd,
      ratesUsdPerSecond,
      maxAttemptsPerAsset: maxAttempts,
      model,
    },
    totals: {
      estimatedSpendUsd: 0,
      submittedRequests: 0,
      accepted: 0,
      reviewedAccepted: 0,
      rejected: 0,
      retries: 0,
      submittedRequestSeconds: 0,
      acceptedSeconds: 0,
    },
    requests: [],
    rejections: [],
    updatedAt: nowIso(),
  };
}

function normalizeLedger(raw) {
  const base = defaultLedger();
  const ledger = raw && typeof raw === 'object' ? raw : base;
  ledger.schemaVersion = '1.0';
  ledger.showId = 'bullshit-factory';
  ledger.policy = { ...base.policy, ...(ledger.policy || {}), ratesUsdPerSecond: ratesUsdPerSecond };
  ledger.totals = { ...base.totals, ...(ledger.totals || {}) };
  ledger.requests = Array.isArray(ledger.requests) ? ledger.requests : [];
  ledger.rejections = Array.isArray(ledger.rejections) ? ledger.rejections : [];
  const billableRequests = ledger.requests.filter((request) => !['duplicate-slot', 'budget-rejected', 'rejected_missing_key'].includes(request.status));
  ledger.totals.estimatedSpendUsd = billableRequests
    .reduce((total, request) => total + (Number(request.estimatedCostUsd) || 0), 0);
  ledger.totals.submittedRequests = billableRequests.length;
  ledger.totals.accepted = ledger.requests.filter((request) => request.status === 'accepted').length;
  // These fields are derived from the request ledger. Reconcile them on
  // every load so an interrupted/older authoring process cannot leave a
  // stale duration total in the budget report.
  ledger.totals.submittedRequestSeconds = billableRequests
    .reduce((total, request) => total + (Number(request.durationSeconds) || 0), 0);
  ledger.totals.acceptedSeconds = ledger.requests
    .filter((request) => request.status === 'accepted')
    .reduce((total, request) => total + (Number(request.durationSeconds) || 0), 0);
  return ledger;
}

async function loadLedger() {
  return normalizeLedger(await readJson(ledgerPath, null));
}

async function saveLedger(ledger) {
  ledger.updatedAt = nowIso();
  ledger.totals.estimatedSpendUsd = Number(Number(ledger.totals.estimatedSpendUsd || 0).toFixed(4));
  ledger.totals.submittedRequestSeconds = Number(Number(ledger.totals.submittedRequestSeconds || 0).toFixed(3));
  ledger.totals.acceptedSeconds = Number(Number(ledger.totals.acceptedSeconds || 0).toFixed(3));
  await atomicWrite(ledgerPath, ledger);
}

async function loadRegistry() {
  const registry = await readJson(registryPath, null);
  if (!registry || registry.showId !== 'bullshit-factory') throw new Error('Motion registry is missing or belongs to another show.');
  registry.libraryId = H3_LIBRARY_ID;
  registry.libraryVersion = H3_LIBRARY_VERSION;
  registry.assetRoot = H3_ASSET_ROOT;
  registry.clips = Array.isArray(registry.clips) ? registry.clips : [];
  return registry;
}

function estimatedCost(args) {
  return Number((args.duration * ratesUsdPerSecond[args.resolution]).toFixed(4));
}

function projectedSpend(ledger, estimate) {
  return Number((Number(ledger.totals.estimatedSpendUsd || 0) + estimate).toFixed(4));
}

async function recordBudgetRejection(ledger, args, reason) {
  const rejection = {
    id: randomUUID(),
    status: 'budget-rejected',
    reason,
    characterId: args.character || null,
    action: args.action || null,
    resolution: args.resolution || null,
    durationSeconds: args.duration || null,
    estimatedCostUsd: estimatedCost(args),
    createdAt: nowIso(),
  };
  ledger.rejections.push(rejection);
  ledger.rejections = ledger.rejections.slice(-200);
  ledger.totals.rejected += 1;
  await saveLedger(ledger);
  return rejection;
}

async function preflight(ledger, args) {
  const estimate = estimatedCost(args);
  const projected = projectedSpend(ledger, estimate);
  if (projected > hardBudgetUsd || projected > internalStopUsd) {
    await recordBudgetRejection(ledger, args, 'request would cross the internal H3 authoring stop at $' + internalStopUsd.toFixed(2) + ' or the hard cap at $' + hardBudgetUsd.toFixed(2) + '; no H3 request was submitted');
    throw new PipelineReject('budget-rejected', 'H3 budget preflight rejected this request. Estimated spend would be $' + projected.toFixed(2) + '.');
  }
  return { estimate, projected };
}

function catalogCharacter(catalog, characterId) {
  if (characterId === ORANGE_IDIOT_AUTHORING_SUBJECT.id) return ORANGE_IDIOT_AUTHORING_SUBJECT;
  const character = (catalog.characters || []).find((item) => item.id === characterId);
  if (!character) throw new Error('Unknown catalog or authoring character id: ' + characterId);
  return character;
}

function validateAction(character, action) {
  const allowed = character.isDog ? borkActions : humanActions;
  if (!allowed.includes(action)) throw new Error('Action ' + action + ' is not allowed for ' + (character.isDog ? 'Bork' : 'human') + ' characters.');
  if (character.isDog && ['talk', 'point', 'present', 'lift', 'inspect', 'type', 'drink', 'hand_off', 'carry', 'push', 'repair'].includes(action)) {
    throw new Error('Bork is bark-only; human speech actions are not allowed.');
  }
}

function publicAssetFile(assetPath) {
  const value = String(assetPath || '');
  if (!value.startsWith('/bullshit-factory/') || value.includes('..') || value.includes('\\')) throw new Error('Source asset must stay under /bullshit-factory/.');
  const filePath = path.resolve(publicRoot, '.' + value);
  const root = path.resolve(publicRoot);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) throw new Error('Source asset escaped public root.');
  return filePath;
}

async function sourceArt(character, requestedSource) {
  const sourceFile = requestedSource
    ? (requestedSource.startsWith('/') ? publicAssetFile(requestedSource) : path.resolve(siteRoot, requestedSource))
    : publicAssetFile(character.preview);
  const root = path.resolve(publicRoot);
  if (!requestedSource && (sourceFile === root || !sourceFile.startsWith(root + path.sep))) throw new Error('Catalog preview escaped public root.');
  const bytes = await readFile(sourceFile);
  const input = await sharp(bytes).ensureAlpha().resize(512, 512, { kernel: sharp.kernel.nearest }).png().toBuffer();
  const metadata = await sharp(input).metadata();
  return { path: sourceFile, bytes: input, hash: sha256(input), width: metadata.width, height: metadata.height };
}

function controlledPrompt(character, action, emotion, extra, attempt) {
  const actionDescription = actionDescriptions[action] || ('a controlled ' + action + ' performance');
  const characterNote = performanceNotes[character.id] || 'Preserve the exact supplied character identity and silhouette.';
  const framing = character.id === ORANGE_IDIOT_AUTHORING_SUBJECT.id
    ? 'One character only, full body, south-facing to the viewer, with enough locked frame width for a bounded lateral pace, fixed camera, fixed framing, no zoom, no pan, no cuts, no text, no subtitles, no extra characters, no new props.'
    : 'One character only, full body, centered, straight south-facing view, fixed camera, fixed framing, no zoom, no pan, no cuts, no text, no subtitles, no extra characters, no props that are not already in the supplied image.';
  const orangeContract = character.id === ORANGE_IDIOT_AUTHORING_SUBJECT.id
    ? 'Orange Idiot H3 contract: keep his head, eyes, and face looking directly at the camera throughout. Keep the torso south-facing while he performs a readable left-to-right lateral pace and return. The camera must remain fixed; do not turn him into profile. The compositor owns scene-scale travel, so keep the path bounded and the feet readable inside the frame.'
    : '';
  const variation = attempt > 1
    ? 'This is a material second take: emphasize a different timing arc and secondary gesture while keeping the identity, framing, and action unchanged.'
    : 'Use a single readable timing arc with a clear anticipation, action, and settle.';
  return [
    'Create a five-second image-to-video motion reference for one locked early-2000s 16-bit pixel-art character.',
    'Use the supplied image as the exact identity reference. Preserve face, clothing, colors, proportions, outline, accessories, and silhouette.',
    framing,
    'Use a flat solid magenta chroma background #ff00ff so the character can be isolated. No scenery, no shadows outside the character, no lighting change, no camera movement.',
    characterNote,
    orangeContract,
    'Requested action: ' + action + '. Performance: ' + actionDescription + '. Emotion variant: ' + emotion + '.',
    variation,
    extra ? 'Additional operator direction: ' + extra : '',
    'This is an offline authoring reference only. Do not add dialogue, music, sound effects, or captions.',
  ].filter(Boolean).join(' ');
}

function falHeaders(key) {
  return {
    authorization: 'Key ' + key,
    'content-type': 'application/json',
    'x-fal-no-retry': '1',
    'x-fal-queue-priority': 'low',
  };
}

async function fetchJson(endpoint, options = {}, timeoutMs = 30000) {
  const response = await fetch(endpoint, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text.slice(0, 800) };
  }
  if (!response.ok) {
    const detail = payload.error || payload.message || 'request failed';
    throw new Error('H3 HTTP ' + response.status + ': ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 800));
  }
  return payload;
}

async function submitH3(input, key) {
  return fetchJson(falEndpoint, {
    method: 'POST',
    headers: falHeaders(key),
    body: JSON.stringify(input),
  }, 60000);
}

function statusUrlFor(submitted) {
  return submitted.status_url || falEndpoint + '/requests/' + encodeURIComponent(submitted.request_id) + '/status';
}

function resultUrlFor(submitted) {
  return submitted.response_url || falEndpoint + '/requests/' + encodeURIComponent(submitted.request_id);
}

async function waitForH3(submitted, key) {
  const requestId = String(submitted.request_id || '').trim();
  if (!requestId) throw new Error('H3 did not return a request_id.');
  const statusUrl = statusUrlFor(submitted);
  const resultUrl = resultUrlFor(submitted);
  const deadline = Date.now() + 20 * 60 * 1000;
  while (Date.now() < deadline) {
    const status = await fetchJson(statusUrl + (statusUrl.includes('?') ? '&' : '?') + 'logs=1', { headers: falHeaders(key) }, 30000);
    if (status.status === 'COMPLETED') {
      return fetchJson(resultUrl, { headers: falHeaders(key) }, 60000);
    }
    if (status.status === 'FAILED' || status.status === 'ERROR') {
      throw new Error('H3 request ' + requestId + ' failed: ' + String(status.error || 'unknown queue failure').slice(0, 800));
    }
    await sleep(2000);
  }
  throw new Error('H3 request ' + requestId + ' exceeded the 20-minute authoring timeout.');
}

function outputVideoUrl(result) {
  const video = result?.data?.video || result?.video;
  const url = String(video?.url || '').trim();
  if (!url.startsWith('https://')) throw new Error('H3 result did not include a valid HTTPS video URL.');
  return url;
}

async function downloadVideo(url, filePath) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!response.ok) throw new Error('H3 video download returned HTTP ' + response.status + '.');
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > maxVideoBytes) throw new Error('H3 video is too large.');
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!bytes.length || bytes.length > maxVideoBytes) throw new Error('H3 video download was empty or too large.');
  await writeFile(filePath, bytes);
  return bytes.length;
}

function pixelDistance(data, offset, color) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const dr = red - color[0];
  const dg = green - color[1];
  const db = blue - color[2];
  return dr * dr + dg * dg + db * db;
}

function magentaLike(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return red >= 120 && blue >= 60 && green <= 80 && blue >= red * 0.3 && red >= green * 1.8 && blue >= green * 1.4;
}

function groundMagentaLike(data, offset) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  return red >= 50 && blue >= 35 && green <= 70 && blue >= red * 0.3 && red >= green * 1.8 && blue >= green * 1.4;
}

function backgroundColor(data, width, height, channels) {
  const points = [
    0,
    (width - 1) * channels,
    (height - 1) * width * channels,
    ((height - 1) * width + width - 1) * channels,
  ];
  const sums = [0, 0, 0];
  for (const point of points) {
    sums[0] += data[point];
    sums[1] += data[point + 1];
    sums[2] += data[point + 2];
  }
  return sums.map((value) => Math.round(value / points.length));
}

function removeBackground(data, info) {
  const { width, height, channels } = info;
  const color = backgroundColor(data, width, height, channels);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const index = y * width + x;
    if (visited[index]) return;
    const offset = index * channels;
    if (data[offset + channels - 1] < 8 || (pixelDistance(data, offset, color) > 78 * 78 && !magentaLike(data, offset))) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }
  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }
  for (let index = 0; index < width * height; index += 1) {
    if (visited[index] || magentaLike(data, index * channels)) data[index * channels + channels - 1] = 0;
  }
  return { removed: tail, total: width * height };
}

async function prepareFrame(filePath) {
  const source = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const data = Buffer.from(source.data);
  const { width, height, channels } = source.info;
  const removed = removeBackground(data, { width, height, channels });
  for (let y = Math.floor(height * 0.72); y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * channels;
      if (data[offset + channels - 1] > 8 && groundMagentaLike(data, offset)) data[offset + channels - 1] = 0;
    }
  }
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let visible = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * channels + channels - 1];
      if (alpha > 8) {
        visible += 1;
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (visible < 50) throw new PipelineReject('rejected_background', 'the generated frame has no usable character pixels');
  if (visible > width * height * 0.82 || removed.removed < width * height * 0.05) {
    throw new PipelineReject('rejected_background', 'the generated frame retained too much background; chroma isolation is unsafe');
  }
  return {
    data,
    width,
    height,
    channels,
    visible,
    bounds: { left, top, right, bottom },
  };
}

function paddedBounds(bounds, width, height) {
  const contentWidth = Math.max(1, bounds.right - bounds.left + 1);
  const contentHeight = Math.max(1, bounds.bottom - bounds.top + 1);
  const padding = Math.max(2, Math.round(Math.max(contentWidth, contentHeight) * 0.03));
  return {
    left: Math.max(0, bounds.left - padding),
    top: Math.max(0, bounds.top - padding),
    right: Math.min(width - 1, bounds.right + padding),
    bottom: Math.min(height - 1, bounds.bottom + padding),
  };
}

function unionFrameBounds(preparedFrames) {
  const first = preparedFrames[0];
  if (!first) throw new PipelineReject('rejected_motion', 'H3 returned no frames to normalize');
  const union = preparedFrames.reduce((bounds, frame) => ({
    left: Math.min(bounds.left, frame.bounds.left),
    top: Math.min(bounds.top, frame.bounds.top),
    right: Math.max(bounds.right, frame.bounds.right),
    bottom: Math.max(bounds.bottom, frame.bounds.bottom),
  }), { ...first.bounds });
  return paddedBounds(union, first.width, first.height);
}

async function normalizePreparedFrame(prepared, cropBounds) {
  const cropped = await sharp(prepared.data, { raw: { width: prepared.width, height: prepared.height, channels: prepared.channels } })
    .extract({
      left: cropBounds.left,
      top: cropBounds.top,
      width: cropBounds.right - cropBounds.left + 1,
      height: cropBounds.bottom - cropBounds.top + 1,
    })
    .resize(86, 86, { fit: 'contain', kernel: sharp.kernel.nearest, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: 3, bottom: 3, left: 3, right: 3, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, colours: 64, dither: 0 })
    .toBuffer();
  return cropped;
}

async function normalizeFrame(filePath) {
  const prepared = await prepareFrame(filePath);
  return normalizePreparedFrame(prepared, paddedBounds(prepared.bounds, prepared.width, prepared.height));
}

async function extractFrames(videoPath, workDirectory) {
  const frameDirectory = path.join(workDirectory, 'raw-frames');
  await mkdir(frameDirectory, { recursive: true });
  await execFileAsync('ffmpeg', [
    '-hide_banner', '-loglevel', 'error', '-nostdin', '-y',
    '-i', videoPath,
    '-vf', 'fps=' + fps,
    '-vsync', '0',
    '-frames:v', '60',
    path.join(frameDirectory, 'frame_%04d.png'),
  ], { timeout: 240000, maxBuffer: 16 * 1024 });
  const names = (await readdir(frameDirectory))
    .filter((name) => /^frame_\d+\.png$/u.test(name))
    .sort((left, right) => Number(left.match(/\d+/u)?.[0] || 0) - Number(right.match(/\d+/u)?.[0] || 0));
  if (names.length < 6) throw new PipelineReject('rejected_motion', 'H3 returned fewer than six usable frames');
  return names.map((name) => path.join(frameDirectory, name));
}

async function normalizedFrames(rawFrames, loop) {
  const selectedCount = loop ? 12 : Math.min(24, rawFrames.length);
  const selectedPaths = [];
  for (let index = 0; index < selectedCount; index += 1) {
    const sourceIndex = Math.round(index * (rawFrames.length - 1) / Math.max(1, selectedCount - 1));
    selectedPaths.push(rawFrames[sourceIndex]);
  }
  const prepared = await Promise.all(selectedPaths.map((filePath) => prepareFrame(filePath)));
  // Use one union crop for the entire clip. Per-frame crops re-scaled a moving
  // silhouette on every frame, which reads as unwanted size pulsing.
  const cropBounds = unionFrameBounds(prepared);
  const selected = await Promise.all(prepared.map((frame) => normalizePreparedFrame(frame, cropBounds)));
  const hashes = new Set(selected.map((frame) => sha256(frame)));
  if (hashes.size < 2) throw new PipelineReject('rejected_motion', 'all normalized frames are identical');
  if (!loop) return selected;
  return [...selected, ...selected.slice(1, -1).reverse()];
}

async function contactSheet(frames, outputPath) {
  const tileWidth = 92;
  const tileHeight = 92;
  const columns = 6;
  const rows = Math.ceil(frames.length / columns);
  const rgbaFrames = await Promise.all(frames.map((frame) => sharp(frame).ensureAlpha().flatten({ background: { r: 7, g: 17, b: 15 } }).png().toBuffer()));
  const canvas = sharp({
    create: {
      width: columns * tileWidth,
      height: rows * tileHeight,
      channels: 4,
      background: { r: 7, g: 17, b: 15, alpha: 1 },
    },
  });
  await canvas.composite(rgbaFrames.map((input, index) => ({
    input,
    left: (index % columns) * tileWidth,
    top: Math.floor(index / columns) * tileHeight,
  }))).png().toFile(outputPath);
}

async function processVideo(videoPath, workDirectory, args, character, sourceHash, requestId, promptHash) {
  const rawFrames = await extractFrames(videoPath, workDirectory);
  const loop = loopActions.has(args.action) && !oneShotActions.has(args.action);
  const frames = await normalizedFrames(rawFrames, loop);
  const outputDirectory = path.join(publicRoot, 'bullshit-factory', 'motion', 'v1', character.id, cleanSlug(args.action + '-' + args.emotion));
  const outputPublicRoot = H3_ASSET_ROOT + '/' + character.id + '/' + cleanSlug(args.action + '-' + args.emotion);
  const existing = await stat(outputDirectory).catch(() => null);
  if (existing && !args.replace) throw new PipelineReject('duplicate-slot', 'an accepted output directory already exists; pass --replace to supersede it');
  await mkdir(outputDirectory, { recursive: true });
  const frameRecords = [];
  for (let index = 0; index < frames.length; index += 1) {
    const fileName = 'frame_' + String(index).padStart(3, '0') + '.png';
    const filePath = path.join(outputDirectory, fileName);
    await writeFile(filePath, frames[index]);
    frameRecords.push({ file: outputPublicRoot + '/south/' + fileName, width: 92, height: 92 });
    await mkdir(path.join(outputDirectory, 'south'), { recursive: true });
    await rename(filePath, path.join(outputDirectory, 'south', fileName));
  }
  const previewPath = path.join(workDirectory, 'contact-sheet.png');
  await contactSheet(frames, previewPath);
  const finalFrameHashes = new Set(frames.map((frame) => sha256(frame)));
  if (finalFrameHashes.size < 2) throw new PipelineReject('rejected_motion', 'pixel conversion collapsed the motion to one frame');
  const entryId = 'h3-' + cleanSlug(character.id + '-' + args.action + '-' + args.emotion) + '-' + promptHash.slice(0, 12);
  return {
    entry: {
      id: entryId,
      libraryId: H3_LIBRARY_ID,
      libraryVersion: H3_LIBRARY_VERSION,
      characterId: character.id,
      action: args.action,
      emotion: args.emotion,
      direction: 'south',
      frameCount: frameRecords.length,
      fps,
      loop,
      durationMs: Math.round(frameRecords.length * 1000 / fps),
      feetAnchor: { x: 46, y: 91 },
      spritePivot: { x: 46, y: 91 },
      mirroringSafe: false,
      authoringSubject: character.authoringOnly ? 'orange-idiot-standalone' : 'catalog-character',
      h3PerformanceContract: character.id === ORANGE_IDIOT_AUTHORING_SUBJECT.id
        ? {
          headTarget: 'camera',
          facing: 'south',
          pacing: 'bounded left-to-right lateral pace while speaking, then return',
          compositorTravelPolicy: 'scene-scale travel remains deterministic and separate from this reusable clip',
        }
        : null,
      performance: character.id === ORANGE_IDIOT_AUTHORING_SUBJECT.id
        ? (args.action === 'talk' ? 'direct-to-camera short-burst talk with lateral pacing beats' : 'direct-to-camera lateral pacing walk')
        : actionDescriptions[args.action] || args.action,
      purpose: character.id === ORANGE_IDIOT_AUTHORING_SUBJECT.id
        ? 'Orange Idiot remains camera-facing while the deterministic compositor paces him left to right during measured speech.'
        : actionDescriptions[args.action] || args.action + ' is a reusable local performance selected by the semantic director',
      sourceCharacterHash: sourceHash,
      promptHash,
      seed: args.seed,
      generatedAt: nowIso(),
      acceptedAt: nowIso(),
      status: 'accepted',
      reviewStatus: 'human-review-required',
      validation: {
        decodedVideo: true,
        chromaIsolated: true,
        fixed92x92Frames: true,
        sharedBoundsNormalization: true,
        normalization: 'shared-union-bounds-v2',
        maxColors: 64,
        motionDistinct: finalFrameHashes.size,
        noAudioRuntime: true,
      },
      source: {
        provider: 'fal',
        model,
        requestId,
        resolution: args.resolution,
        durationSeconds: args.duration,
        sourceArtHash: sourceHash,
        promptHash,
      },
      frames: frameRecords,
      preview: 'runtime/' + path.relative(dataRoot, previewPath).split(path.sep).join('/'),
    },
    previewPath,
    frameCount: frameRecords.length,
    loop,
  };
}

function updateRegistry(registry, entry, replace) {
  const sameSlot = (clip) => clip.characterId === entry.characterId
    && clip.action === entry.action
    && clip.emotion === entry.emotion
    && clip.direction === entry.direction;
  const prior = registry.clips.filter(sameSlot);
  if (prior.length && !replace) throw new PipelineReject('duplicate-slot', 'a motion entry already exists for this character/action/emotion slot; pass --replace explicitly');
  const supersededAt = nowIso();
  registry.clips = registry.clips.map((clip) => sameSlot(clip) ? { ...clip, status: 'superseded', supersededAt } : clip);
  registry.clips.push(entry);
  registry.status = 'pilot';
  registry.runtimePolicy = registry.runtimePolicy === 'replacement' ? 'replacement' : 'hybrid-pilot';
  registry.lastUpdatedAt = nowIso();
  return prior.map((clip) => clip.id);
}

function requiredMissing(registry) {
  const missing = [];
  for (const [group, actions] of Object.entries(requiredCoverage)) {
    const ids = group === 'bork'
      ? ['bork']
      : group === 'orange'
        ? ['orange-idiot']
        : ['rookboss', 'magsrust', 'kernelkline', 'sudsmcgee', 'dooby', 'spaulding', 'string', 'karen', 'nico'];
    for (const characterId of ids) {
      for (const action of actions) {
        const found = registry.clips.some((clip) => clip.status === 'accepted'
          && ['accepted', 'approved'].includes(clip.reviewStatus)
          && clip.characterId === characterId
          && clip.action === action
          && clip.direction === 'south');
        if (!found) missing.push(characterId + ':' + action);
      }
    }
  }
  return missing;
}

async function acceptRegistryEntry(entryId, reviewNote = '') {
  const registry = await loadRegistry();
  const entry = registry.clips.find((clip) => clip.id === entryId && clip.status === 'accepted');
  if (!entry) throw new Error('Accepted motion entry was not found: ' + entryId);
  if (['accepted', 'approved'].includes(entry.reviewStatus)) {
    console.log(JSON.stringify({ status: 'already-reviewed', entryId, registryPath }, null, 2));
    return entry;
  }
  entry.reviewStatus = 'accepted';
  entry.reviewedAt = nowIso();
  entry.reviewer = 'operator';
  entry.reviewNote = reviewNote || 'Contact sheet reviewed; identity, silhouette, grounding, and readable action accepted.';
  registry.lastUpdatedAt = nowIso();
  await atomicWrite(registryPath, registry);
  const ledger = await loadLedger();
  ledger.totals.reviewedAccepted = Number(ledger.totals.reviewedAccepted || 0) + 1;
  await saveLedger(ledger);
  console.log(JSON.stringify({ status: 'reviewed-accepted', entryId, characterId: entry.characterId, action: entry.action, registryPath }, null, 2));
  return entry;
}

async function activateRegistry() {
  const registry = await loadRegistry();
  const missing = requiredMissing(registry);
  if (missing.length) throw new Error('Replacement motion coverage is incomplete: ' + missing.slice(0, 24).join(', ') + (missing.length > 24 ? ' ...' : ''));
  registry.runtimePolicy = 'replacement';
  registry.status = 'active';
  registry.activatedAt = nowIso();
  await atomicWrite(registryPath, registry);
  console.log(JSON.stringify({ status: 'active', runtimePolicy: registry.runtimePolicy, acceptedClipCount: registry.clips.filter((clip) => clip.status === 'accepted' && ['accepted', 'approved'].includes(clip.reviewStatus)).length }, null, 2));
}

async function author(args) {
  const catalog = await readJson(path.join(publicRoot, 'bullshit-factory/characters/v1/CHARACTER-CATALOG.json'), { characters: [] });
  const character = catalogCharacter(catalog, args.character);
  validateAction(character, args.action);
  const existingRegistry = await loadRegistry();
  const ledger = await loadLedger();
  const duplicateSlot = existingRegistry.clips.some((clip) => clip.status === 'accepted'
    && clip.characterId === character.id
    && clip.action === args.action
    && clip.emotion === args.emotion
    && clip.direction === 'south');
  if (duplicateSlot && !args.replace) {
    const rejection = {
      id: randomUUID(),
      status: 'duplicate-slot',
      reason: 'an accepted output already exists for this character/action/emotion slot; pass --replace explicitly',
      characterId: character.id,
      action: args.action,
      resolution: args.resolution,
      durationSeconds: args.duration,
      estimatedCostUsd: 0,
      createdAt: nowIso(),
    };
    ledger.rejections.push(rejection);
    ledger.rejections = ledger.rejections.slice(-200);
    ledger.totals.rejected += 1;
    await saveLedger(ledger);
    throw new PipelineReject('duplicate-slot', rejection.reason);
  }
  const pricing = await preflight(ledger, args);
  const source = await sourceArt(character, args.source);
  const prompt = controlledPrompt(character, args.action, args.emotion, args.prompt, 1);
  const promptHash = sha256(prompt);
  const sourceHash = source.hash;
  if (args.dryRun) {
    await saveLedger(ledger);
    console.log(JSON.stringify({
      status: 'dry-run',
      characterId: character.id,
      action: args.action,
      resolution: args.resolution,
      durationSeconds: args.duration,
      estimatedCostUsd: pricing.estimate,
      projectedSpendUsd: pricing.projected,
      sourceArtHash: sourceHash,
      promptHash,
      ledgerPath,
      h3RequestSubmitted: false,
    }, null, 2));
    return;
  }
  const key = String(process.env.FAL_KEY || process.env.FAL_API_KEY || '').trim();
  if (!key) {
    const rejection = {
      id: randomUUID(),
      status: 'rejected_missing_key',
      characterId: args.character,
      action: args.action,
      resolution: args.resolution,
      durationSeconds: args.duration,
      estimatedCostUsd: pricing.estimate,
      createdAt: nowIso(),
    };
    ledger.rejections.push(rejection);
    ledger.rejections = ledger.rejections.slice(-200);
    ledger.totals.rejected += 1;
    await saveLedger(ledger);
    throw new PipelineReject('missing-fal-key', 'No FAL_KEY or FAL_API_KEY is configured in the .76 authoring environment; no H3 request was submitted.');
  }
  const workDirectory = path.join(dataRoot, 'h3-authoring', cleanSlug(character.id + '-' + args.action + '-' + args.emotion) + '-' + Date.now());
  await mkdir(workDirectory, { recursive: true });
  let lastError = null;
  for (let attempt = 1; attempt <= args.attempts; attempt += 1) {
    const attemptPrompt = controlledPrompt(character, args.action, args.emotion, args.prompt, attempt);
    const attemptPromptHash = sha256(attemptPrompt);
    const seed = Number.isInteger(args.seed) ? args.seed + attempt - 1 : Math.abs(parseInt(sourceHash.slice(0, 8), 16)) + attempt - 1;
    const event = {
      id: randomUUID(),
      characterId: character.id,
      action: args.action,
      emotion: args.emotion,
      resolution: args.resolution,
      durationSeconds: args.duration,
      attempt,
      maxAttempts: args.attempts,
      model,
      seed,
      sourceCharacterHash: sourceHash,
      promptHash: attemptPromptHash,
      estimatedCostUsd: pricing.estimate,
      status: 'submitted',
      requestId: null,
      createdAt: nowIso(),
    };
    ledger.requests.push(event);
    ledger.requests = ledger.requests.slice(-1000);
    ledger.totals.submittedRequests += 1;
    ledger.totals.submittedRequestSeconds += args.duration;
    ledger.totals.estimatedSpendUsd += pricing.estimate;
    if (attempt > 1) ledger.totals.retries += 1;
    await saveLedger(ledger);
    try {
      const input = {
        prompt: attemptPrompt,
        duration: args.duration,
        resolution: args.resolution,
        seed,
        enable_safety_checker: true,
        prompt_expansion_mode: 'balanced',
        image_url: 'data:image/png;base64,' + source.bytes.toString('base64'),
      };
      const submitted = await submitH3(input, key);
      event.requestId = submitted.request_id || null;
      await saveLedger(ledger);
      const result = await waitForH3(submitted, key);
      const videoPath = path.join(workDirectory, 'attempt-' + attempt + '.mp4');
      await downloadVideo(outputVideoUrl(result), videoPath);
      const processed = await processVideo(videoPath, workDirectory, { ...args, seed }, character, sourceHash, event.requestId, attemptPromptHash);
      event.status = 'accepted';
      event.acceptedAt = nowIso();
      event.output = processed.entry.id;
      event.frameCount = processed.frameCount;
      event.loop = processed.loop;
      event.preview = processed.previewPath;
      ledger.totals.accepted += 1;
      ledger.totals.acceptedSeconds += args.duration;
      const registry = await loadRegistry();
      const superseded = updateRegistry(registry, processed.entry, args.replace);
      processed.entry.supersededIds = superseded;
      await atomicWrite(registryPath, registry);
      await atomicWrite(path.join(workDirectory, 'metadata.json'), {
        ...processed.entry,
        authoringWorkDirectory: workDirectory,
        h3Prompt: attemptPrompt,
        outputVideo: videoPath,
      });
      await saveLedger(ledger);
      console.log(JSON.stringify({
        status: 'pending-review',
        reviewStatus: 'human-review-required',
        characterId: character.id,
        action: args.action,
        emotion: args.emotion,
        requestId: event.requestId,
        entryId: processed.entry.id,
        frameCount: processed.frameCount,
        loop: processed.loop,
        resolution: args.resolution,
        estimatedCostUsd: pricing.estimate,
        ledgerPath,
        registryPath,
        previewPath: processed.previewPath,
        runtimePolicy: registry.runtimePolicy,
      }, null, 2));
      return;
    } catch (error) {
      lastError = error;
      event.status = error instanceof PipelineReject ? error.code : 'failed';
      event.error = error instanceof Error ? error.message : String(error);
      event.failedAt = nowIso();
      ledger.rejections.push({
        ...event,
        status: event.status,
        reason: event.error,
      });
      ledger.rejections = ledger.rejections.slice(-200);
      ledger.totals.rejected += 1;
      await saveLedger(ledger);
      if (attempt >= args.attempts) break;
    }
  }
  throw new PipelineReject(lastError?.code || 'failed', lastError?.message || 'H3 authoring failed.');
}

async function loadAuthoringKey() {
  if (process.env.FAL_KEY || process.env.FAL_API_KEY) return;
  for (const fileName of ['.h3-authoring.env', '.env']) {
    try {
      const contents = await readFile(path.join(siteRoot, fileName), 'utf8');
      const line = contents.split(/\r?\n/u).find((candidate) => /^\s*(?:export\s+)?FAL(?:_API)?_KEY\s*=/u.test(candidate));
      if (!line) continue;
      const value = line.replace(/^\s*(?:export\s+)?FAL(?:_API)?_KEY\s*=\s*/u, '').trim().replace(/^['"]|['"]$/gu, '');
      if (value) {
        process.env.FAL_API_KEY = value;
        return;
      }
    } catch {
      // An authoring key is optional for help and dry-run commands.
    }
  }
}

async function main() {
  await loadAuthoringKey();
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.help) {
    console.log(usage());
    return;
  }
  const args = normalizeArgs(parsed);
  if (args.accept) {
    await acceptRegistryEntry(args.accept, args.reviewNote);
    return;
  }
  if (args.activate) {
    await activateRegistry();
    return;
  }
  const catalog = await readJson(path.join(publicRoot, 'bullshit-factory/characters/v1/CHARACTER-CATALOG.json'), { characters: [] });
  const character = catalogCharacter(catalog, args.character);
  validateAction(character, args.action);
  await author(args);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    console.error(JSON.stringify({ status: 'error', code: error.code || 'failed', message: error.message }, null, 2));
    process.exitCode = 1;
  });
}

export {
  actionDescriptions,
  contactSheet,
  controlledPrompt as buildPrompt,
  estimatedCost,
  normalizeArgs,
  normalizeLedger,
  normalizeFrame,
  normalizedFrames,
  parseArgs,
  requiredCoverage,
  requiredMissing,
  acceptRegistryEntry,
};
