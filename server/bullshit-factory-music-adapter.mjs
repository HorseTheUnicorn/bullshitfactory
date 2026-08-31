import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const MUSIC_PROVIDER = 'stable-audio-3-small-music';
const DEFAULT_MODELS_ROOT = path.resolve(process.env.BF_MODELS_ROOT || path.join(process.cwd(), 'models'));
const DEFAULT_STABLE_AUDIO_ROOT = path.join(DEFAULT_MODELS_ROOT, 'stable-audio-3', 'optimized', 'tflite');
const DEFAULT_ADAPTER_HOST = '127.0.0.1';
const DEFAULT_ADAPTER_PORT = 8797;
const DEFAULT_CACHE_DIRECTORY = path.resolve(process.cwd(), 'audio');
const DEFAULT_MAX_QUEUE = 8;
const DEFAULT_GENERATION_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_FFMPEG_TIMEOUT_MS = 120 * 1000;
const MIN_GENERATION_SECONDS = 20;
const MAX_GENERATION_SECONDS = 120;
const MAX_BODY_BYTES = 24 * 1024;
const MAX_AUDIO_BYTES = 64 * 1024 * 1024;
const AUDIO_FILE_PATTERN = /^[a-f0-9]{64}\.mp3$/u;
const AUDIO_KEY_PATTERN = /^[a-f0-9]{64}$/u;
const SUPPORTED_PRECISIONS = ['fp32', 'w16a32', 'w8a32', 'w8a8-dyn'];

const envNumber = (name, fallback, minimum, maximum) => {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.floor(value)));
};

const cleanText = (value, maximum) => String(value || '')
  .replace(/[\u0000-\u001f\u007f]/gu, ' ')
  .replace(/\s+/gu, ' ')
  .trim()
  .slice(0, maximum);

const configuredStableAudioRoot = String(process.env.BULLSHIT_FACTORY_STABLE_AUDIO_ROOT || DEFAULT_STABLE_AUDIO_ROOT).trim();
const STABLE_AUDIO_ROOT = path.resolve(configuredStableAudioRoot || DEFAULT_STABLE_AUDIO_ROOT);
const STABLE_AUDIO_CLI = String(process.env.BULLSHIT_FACTORY_STABLE_AUDIO_CLI || path.join(STABLE_AUDIO_ROOT, 'sa3')).trim();
const configuredPrecision = String(process.env.BULLSHIT_FACTORY_STABLE_AUDIO_PRECISION || '').trim();
const STABLE_AUDIO_PRECISION = SUPPORTED_PRECISIONS.includes(configuredPrecision) ? configuredPrecision : 'fp32';
const STABLE_AUDIO_STEPS = envNumber('BULLSHIT_FACTORY_STABLE_AUDIO_STEPS', 8, 1, 16);
const STABLE_AUDIO_THREADS = envNumber('BULLSHIT_FACTORY_STABLE_AUDIO_THREADS', 8, 1, 32);
const configuredAdapterHost = String(process.env.BULLSHIT_FACTORY_MUSIC_ADAPTER_HOST || DEFAULT_ADAPTER_HOST).trim();
const ADAPTER_HOST = ['127.0.0.1', '::1', 'localhost'].includes(configuredAdapterHost) ? configuredAdapterHost : DEFAULT_ADAPTER_HOST;
const ADAPTER_PORT = envNumber('BULLSHIT_FACTORY_MUSIC_ADAPTER_PORT', DEFAULT_ADAPTER_PORT, 1, 65535);
const CACHE_DIRECTORY = path.resolve(process.env.BULLSHIT_FACTORY_MUSIC_CACHE_DIR || DEFAULT_CACHE_DIRECTORY);
const MAX_QUEUE = envNumber('BULLSHIT_FACTORY_MUSIC_MAX_QUEUE', DEFAULT_MAX_QUEUE, 1, 128);
const GENERATION_TIMEOUT_MS = envNumber('BULLSHIT_FACTORY_MUSIC_GENERATION_TIMEOUT_MS', DEFAULT_GENERATION_TIMEOUT_MS, 30_000, 60 * 60 * 1000);
const FFMPEG_PATH = String(process.env.BULLSHIT_FACTORY_FFMPEG_PATH || 'ffmpeg').trim() || 'ffmpeg';
const ADAPTER_TOKEN = String(process.env.BULLSHIT_FACTORY_MUSIC_TOKEN || '').trim();

const jobs = new Map();
const pendingJobs = [];
const inFlightByCacheKey = new Map();
let activeJobId = null;
let drainPromise = null;

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
    body: JSON.stringify(payload),
  };
}

function instrumentalPrompt(value, mood) {
  const fallback = 'Original instrumental ' + mood + ' music bed for a sarcastic retro 16-bit animated sitcom.';
  const base = cleanText(value || fallback, 760) || fallback;
  return cleanText(base + ' Instrumental only; no vocals, no speech, no spoken words.', 800);
}

function canonicalJob(input = {}) {
  const kind = ['bed', 'stinger', 'episode'].includes(input.kind) ? input.kind : 'bed';
  const defaultDurations = { bed: 30, stinger: 20, episode: 60 };
  const requestedDuration = Number(input.durationSeconds ?? defaultDurations[kind]);
  if (!Number.isFinite(requestedDuration)) throw new Error('durationSeconds must be a number.');
  const durationSeconds = Math.min(MAX_GENERATION_SECONDS, Math.max(MIN_GENERATION_SECONDS, Math.round(requestedDuration)));
  const mood = cleanText(input.mood || 'dusty 16-bit garage rock', 160) || 'dusty 16-bit garage rock';
  const prompt = instrumentalPrompt(input.prompt, mood);
  const suppliedSeed = Number(input.seed);
  const seed = Number.isInteger(suppliedSeed) && suppliedSeed >= 0 ? suppliedSeed : 20260828;
  return {
    provider: MUSIC_PROVIDER,
    model: 'sm-music',
    decoder: 'same-s',
    precision: STABLE_AUDIO_PRECISION,
    steps: STABLE_AUDIO_STEPS,
    threads: STABLE_AUDIO_THREADS,
    kind,
    mood,
    prompt,
    lyrics: '[Instrumental]',
    durationSeconds,
    seed,
    audioFormat: 'mp3',
    generationMode: 'pre-generation-only',
    serialized: true,
  };
}

function cacheKeyForJob(job) {
  return createHash('sha256').update(JSON.stringify(job)).digest('hex');
}

function audioPathForKey(cacheKey) {
  return path.join(CACHE_DIRECTORY, cacheKey + '.mp3');
}

function metadataPathForKey(cacheKey) {
  return path.join(CACHE_DIRECTORY, cacheKey + '.json');
}

function publicAudioUrl(cacheKey) {
  return '/api/bullshit-factory/music?audioKey=' + cacheKey;
}

function queuePositionFor(job) {
  if (job.status !== 'queued') return 0;
  const index = pendingJobs.findIndex((candidate) => candidate.id === job.id);
  return index < 0 ? 0 : index + 1;
}

function jobPayload(job) {
  return {
    jobId: job.id,
    cacheKey: job.cacheKey,
    provider: MUSIC_PROVIDER,
    model: job.request.model,
    kind: job.request.kind,
    mood: job.request.mood,
    durationSeconds: job.request.durationSeconds,
    status: job.status,
    queuePosition: queuePositionFor(job),
    serialized: true,
    generationMode: 'pre-generation-only',
    audioUrl: job.status === 'completed' ? publicAudioUrl(job.cacheKey) : null,
    createdAt: job.createdAt,
    startedAt: job.startedAt || null,
    completedAt: job.completedAt || null,
    error: job.error || null,
  };
}

function stableAudioArguments(request, outputPath) {
  return [
    '--prompt', request.prompt,
    '--dit', 'sm-music',
    '--decoder', 'same-s',
    '--precision', request.precision,
    '--seconds', String(request.durationSeconds),
    '--steps', String(request.steps),
    '--seed', String(request.seed),
    '--threads', String(request.threads),
    '--out', outputPath,
  ];
}

function runProcess(command, args, {
  cwd = STABLE_AUDIO_ROOT,
  timeoutMs = GENERATION_TIMEOUT_MS,
  label = command,
  env = {},
} = {}) {
  return new Promise((resolve, reject) => {
    let output = '';
    let timedOut = false;
    let settled = false;
    let timeoutTimer;
    let killTimer;
    const appendOutput = (chunk) => {
      output = (output + String(chunk)).slice(-6000);
    };
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', appendOutput);
    child.stderr.on('data', appendOutput);
    const cleanup = () => {
      clearTimeout(timeoutTimer);
      if (killTimer) clearTimeout(killTimer);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    child.once('error', (error) => {
      fail(new Error(label + ' could not start: ' + error.message));
    });
    child.once('close', (code, signal) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (timedOut) {
        reject(new Error(label + ' exceeded ' + Math.round(timeoutMs / 60_000) + ' minutes.'));
        return;
      }
      if (code !== 0) {
        const detail = output.replace(/\s+/gu, ' ').trim().slice(-900);
        reject(new Error(label + ' failed' + (signal ? ' (' + signal + ')' : ' with exit code ' + code) + (detail ? ': ' + detail : '.')));
        return;
      }
      resolve({ output });
    });
    timeoutTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
    }, timeoutMs);
  });
}

function modelFiles() {
  const precision = STABLE_AUDIO_PRECISION;
  return [
    path.join(STABLE_AUDIO_ROOT, 'models', 'tokenizer.model'),
    path.join(STABLE_AUDIO_ROOT, 'models', 'tflite', 't5gemma', 'encoder_fp16.tflite'),
    path.join(STABLE_AUDIO_ROOT, 'models', 'tflite', 'sa3-sm-music', 'dit_' + precision + '.tflite'),
    path.join(STABLE_AUDIO_ROOT, 'models', 'tflite', 'same-s', 'dec_' + precision + '.tflite'),
  ];
}

async function fileDetails(filePath) {
  try {
    const details = await stat(filePath);
    return details.isFile() && details.size > 0 ? details : null;
  } catch {
    return null;
  }
}

async function modelStatus() {
  const paths = modelFiles();
  const results = await Promise.all(paths.map((filePath) => fileDetails(filePath)));
  return {
    present: results.filter(Boolean).length,
    total: paths.length,
    missing: paths.filter((_, index) => !results[index]).map((filePath) => path.basename(filePath)),
  };
}

async function generateJob(job) {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const audioPath = audioPathForKey(job.cacheKey);
  const wavPath = path.join(CACHE_DIRECTORY, job.cacheKey + '.' + job.id + '.wav');
  const mp3TemporaryPath = audioPath + '.' + job.id + '.tmp';
  try {
    await runProcess(STABLE_AUDIO_CLI, stableAudioArguments(job.request, wavPath), {
      cwd: STABLE_AUDIO_ROOT,
      timeoutMs: GENERATION_TIMEOUT_MS,
      label: 'Stable Audio 3 generation',
      env: {
        HF_HOME: String(process.env.BULLSHIT_FACTORY_STABLE_AUDIO_HF_HOME || path.join(STABLE_AUDIO_ROOT, '.hf-cache')),
        PYTHONUNBUFFERED: '1',
        OMP_NUM_THREADS: String(job.request.threads),
        MKL_NUM_THREADS: String(job.request.threads),
      },
    });
    const wavDetails = await fileDetails(wavPath);
    if (!wavDetails) throw new Error('Stable Audio 3 completed without a WAV output.');
    await runProcess(FFMPEG_PATH, [
      '-hide_banner',
      '-loglevel', 'error',
      '-nostdin',
      '-y',
      '-i', wavPath,
      '-vn',
      '-ac', '2',
      '-ar', '44100',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      '-f', 'mp3',
      mp3TemporaryPath,
    ], {
      cwd: CACHE_DIRECTORY,
      timeoutMs: DEFAULT_FFMPEG_TIMEOUT_MS,
      label: 'Stable Audio 3 MP3 conversion',
    });
    const mp3Details = await fileDetails(mp3TemporaryPath);
    if (!mp3Details) throw new Error('Stable Audio 3 conversion produced no MP3 output.');
    if (mp3Details.size > MAX_AUDIO_BYTES) throw new Error('Generated music file is too large.');
    await rename(mp3TemporaryPath, audioPath);
    await writeFile(metadataPathForKey(job.cacheKey), JSON.stringify({
      ...job.request,
      cacheKey: job.cacheKey,
      generatedAt: new Date().toISOString(),
      audioFile: path.basename(audioPath),
    }, null, 2) + '\n', 'utf8');
  } finally {
    await unlink(wavPath).catch(() => undefined);
    await unlink(mp3TemporaryPath).catch(() => undefined);
  }
}

async function drainQueue() {
  if (drainPromise) return drainPromise;
  drainPromise = (async () => {
    while (pendingJobs.length) {
      const job = pendingJobs.shift();
      if (!job) continue;
      activeJobId = job.id;
      job.status = 'running';
      job.startedAt = new Date().toISOString();
      try {
        await generateJob(job);
        job.status = 'completed';
        job.completedAt = new Date().toISOString();
      } catch (error) {
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Music generation failed.';
        console.error('[bullshit-factory-music] ' + job.id + ': ' + job.error);
      } finally {
        inFlightByCacheKey.delete(job.cacheKey);
        activeJobId = null;
      }
    }
  })().finally(() => {
    drainPromise = null;
    if (pendingJobs.length) void drainQueue();
  });
  return drainPromise;
}

async function cachedJob(request, cacheKey) {
  const details = await fileDetails(audioPathForKey(cacheKey));
  if (!details) return null;
  const id = 'cache-' + cacheKey.slice(0, 16);
  return {
    id,
    cacheKey,
    request,
    status: 'completed',
    createdAt: new Date(details.birthtimeMs || details.ctimeMs || Date.now()).toISOString(),
    completedAt: new Date(details.mtimeMs || Date.now()).toISOString(),
  };
}

async function enqueueJob(input) {
  const request = canonicalJob(input);
  const cacheKey = cacheKeyForJob(request);
  const cached = await cachedJob(request, cacheKey);
  if (cached) {
    jobs.set(cached.id, cached);
    return { job: cached, cacheHit: true };
  }
  const existing = inFlightByCacheKey.get(cacheKey);
  if (existing) return { job: existing, cacheHit: false };
  if (pendingJobs.length >= MAX_QUEUE) throw new Error('Music queue is full (' + MAX_QUEUE + ' jobs).');
  const job = {
    id: randomUUID(),
    cacheKey,
    request,
    status: 'queued',
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    error: null,
  };
  jobs.set(job.id, job);
  inFlightByCacheKey.set(cacheKey, job);
  pendingJobs.push(job);
  void drainQueue();
  return { job, cacheHit: false };
}

async function adapterHealth() {
  const cli = await fileDetails(STABLE_AUDIO_CLI);
  const models = await modelStatus();
  let cacheFiles = 0;
  try {
    cacheFiles = (await readdir(CACHE_DIRECTORY)).filter((name) => AUDIO_FILE_PATTERN.test(name)).length;
  } catch {
    cacheFiles = 0;
  }
  const ready = Boolean(cli) && models.present === models.total;
  return {
    status: ready ? 'ready' : 'degraded',
    provider: MUSIC_PROVIDER,
    model: 'sm-music',
    decoder: 'same-s',
    precision: STABLE_AUDIO_PRECISION,
    backend: 'tflite-cpu',
    endpoint: 'loopback-only',
    serialized: true,
    generationMode: 'pre-generation-only',
    minDurationSeconds: MIN_GENERATION_SECONDS,
    maxDurationSeconds: MAX_GENERATION_SECONDS,
    queueDepth: pendingJobs.length,
    activeJobId,
    cacheFiles,
    cli: { configured: Boolean(STABLE_AUDIO_CLI), available: Boolean(cli) },
    modelFiles: models,
    error: ready ? null : 'Stable Audio 3 Small-Music runtime or model files are not ready.',
  };
}

function suppliedToken(request) {
  const direct = request.headers['x-bullshit-factory-music-token'];
  const authorization = request.headers.authorization;
  if (typeof direct === 'string') return direct.trim();
  if (typeof authorization === 'string' && authorization.toLowerCase().startsWith('bearer ')) return authorization.slice(7).trim();
  return '';
}

function authorized(request) {
  return !ADAPTER_TOKEN || suppliedToken(request) === ADAPTER_TOKEN;
}

async function readRequestBody(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new Error('Request body must be JSON.');
  }
}

async function handleRequest(request, response) {
  const url = new URL(request.url || '/', 'http://' + ADAPTER_HOST + ':' + ADAPTER_PORT);
  if (!authorized(request)) {
    const payload = jsonResponse({ error: 'Music adapter authorization required.' }, 401, { 'www-authenticate': 'Bearer' });
    response.writeHead(payload.status, payload.headers);
    response.end(payload.body);
    return;
  }

  if (request.method === 'GET' && url.pathname === '/health') {
    const payload = jsonResponse(await adapterHealth());
    response.writeHead(payload.status, payload.headers);
    response.end(payload.body);
    return;
  }

  const jobMatch = url.pathname.match(/^\/v1\/music\/jobs\/([^/]+)$/u);
  if (request.method === 'GET' && jobMatch) {
    const job = jobs.get(decodeURIComponent(jobMatch[1]));
    const payload = job
      ? jsonResponse(jobPayload(job))
      : jsonResponse({ error: 'Music job not found in this adapter process.' }, 404);
    response.writeHead(payload.status, payload.headers);
    response.end(payload.body);
    return;
  }

  const audioMatch = url.pathname.match(/^\/v1\/music\/audio\/([^/]+)$/u);
  if (request.method === 'GET' && audioMatch) {
    const cacheKey = decodeURIComponent(audioMatch[1]);
    if (!AUDIO_KEY_PATTERN.test(cacheKey)) {
      const payload = jsonResponse({ error: 'Invalid cached audio key.' }, 400);
      response.writeHead(payload.status, payload.headers);
      response.end(payload.body);
      return;
    }
    const filePath = audioPathForKey(cacheKey);
    const details = await fileDetails(filePath);
    if (!details) {
      const payload = jsonResponse({ error: 'Cached audio is not available.' }, 404);
      response.writeHead(payload.status, payload.headers);
      response.end(payload.body);
      return;
    }
    response.writeHead(200, {
      'cache-control': 'public, max-age=31536000, immutable',
      'content-length': details.size,
      'content-type': 'audio/mpeg',
      'x-content-type-options': 'nosniff',
    });
    createReadStream(filePath).pipe(response);
    return;
  }

  if (request.method === 'POST' && url.pathname === '/v1/music/jobs') {
    try {
      const body = await readRequestBody(request);
      const result = await enqueueJob(body);
      const payload = jsonResponse({ ...jobPayload(result.job), cacheHit: result.cacheHit }, result.cacheHit ? 200 : 202);
      response.writeHead(payload.status, payload.headers);
      response.end(payload.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Music job could not be queued.';
      const status = /queue is full/iu.test(message) ? 429 : /must be|too large|number/iu.test(message) ? 400 : 502;
      const payload = jsonResponse({ error: message }, status);
      response.writeHead(payload.status, payload.headers);
      response.end(payload.body);
    }
    return;
  }

  const payload = jsonResponse({ error: 'Not found.' }, 404);
  response.writeHead(payload.status, payload.headers);
  response.end(payload.body);
}

export { MUSIC_PROVIDER, canonicalJob, cacheKeyForJob, publicAudioUrl, stableAudioArguments };

export async function startMusicAdapter() {
  await mkdir(CACHE_DIRECTORY, { recursive: true });
  const server = createServer((request, response) => {
    void handleRequest(request, response).catch((error) => {
      console.error('[bullshit-factory-music] request failure:', error);
      if (!response.headersSent) {
        const payload = jsonResponse({ error: 'Music adapter request failed.' }, 500);
        response.writeHead(payload.status, payload.headers);
        response.end(payload.body);
      } else {
        response.end();
      }
    });
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(ADAPTER_PORT, ADAPTER_HOST, resolve);
  });
  console.log('[bullshit-factory-music] listening on http://' + ADAPTER_HOST + ':' + ADAPTER_PORT + '; Stable Audio 3 Small-Music uses serialized CPU inference');
  if (!ADAPTER_TOKEN) console.warn('[bullshit-factory-music] no adapter token configured; loopback binding is the only guard');
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await startMusicAdapter();
}
