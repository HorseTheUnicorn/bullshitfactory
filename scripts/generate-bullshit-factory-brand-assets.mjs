#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public', 'bullshit-factory');
const fontRoot = path.join(publicRoot, 'fonts');
const manifestPath = path.join(siteRoot, 'animation-production', 'bullshit-factory', 'pixellab-brand-generation-manifest.json');
const pixelLabEndpoint = 'https://api.pixellab.ai/v2';

const fontSpecs = [
  {
    id: 'title',
    filename: 'bullshit-factory-title',
    description: 'bold 16-bit arcade marquee lettering for a grimy adult cartoon factory, muted rust orange and warm cream highlights, chunky squared glyphs, hard pixel corners, restrained dark shadow, early-2000s console palette, readable at large title size, no glow, no bevel, no gradients',
    weight: 'Bold',
    glyphPx: 16,
    fontName: 'Bullshit Factory Title',
  },
  {
    id: 'terminal',
    filename: 'bullshit-factory-terminal',
    description: 'compact 16-bit monospace terminal lettering for factory labels and captions, muted sea-green and cream palette, squared pixel glyphs, tight spacing, readable at small UI size, early-2000s computer interface, no glow, no gradients',
    weight: 'Regular',
    glyphPx: 8,
    fontName: 'Bullshit Factory Terminal',
  },
];

const imageSpecs = [
  {
    kind: 'title',
    id: 'title-screen',
    relativeFile: 'title/title-screen.png',
    size: { width: 384, height: 216 },
    description: 'wide 16-bit pixel-art title screen background for BULLSHIT FACTORY, a grimy after-hours factory at night with a crooked smokestack, old warehouse windows, a small red warning lamp, cable silhouettes, distant harbor lights, empty center area for overlaid title lettering, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'scene',
    id: 'roof-antenna',
    relativeFile: 'scenes/roof-antenna.png',
    size: { width: 256, height: 144 },
    description: 'wide 16-bit pixel-art background for a flat factory rooftop at dusk with a crooked radio antenna, vent pipes, coiled cables, warning lights, tar patches, and a distant harbor skyline, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'scene',
    id: 'employee-bar',
    relativeFile: 'scenes/employee-bar.png',
    size: { width: 256, height: 144 },
    description: 'wide 16-bit pixel-art background for a cramped hidden employee bar behind a factory, dented counter, mismatched stools, old beer taps, cloudy window, bottle shelf, tired orange lamp, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'scene',
    id: 'marina-slip',
    relativeFile: 'scenes/marina-slip.png',
    size: { width: 256, height: 144 },
    description: 'wide 16-bit pixel-art background for a rusty industrial marina slip beside a factory, small sailboat, dock cleats, rope coils, oil-dark water, gull silhouettes, broken floodlight, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'scene',
    id: 'arcade-closet',
    relativeFile: 'scenes/arcade-closet.png',
    size: { width: 256, height: 144 },
    description: 'wide 16-bit pixel-art background for a narrow retro computer repair closet, stacked CRT monitors, beige keyboards, tangled cables, tiny arcade cabinet, spare circuit boards, buzzing fluorescent tube, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'scene',
    id: 'senior-lounge',
    relativeFile: 'scenes/senior-lounge.png',
    size: { width: 256, height: 144 },
    description: 'wide 16-bit pixel-art background for a dim retirement-home lounge, folding chairs, humming CRT television, card table, potted plant, vending machine, faded carpet, muted early-2000s console palette, maximum 64 colors, crisp hard pixel clusters, no characters, no readable text, no logos',
    noBackground: false,
  },
  {
    kind: 'prop',
    id: 'beer-mug',
    relativeFile: 'props/beer-mug.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art dented beer mug with amber liquid and a chipped handle, muted rust-and-cream factory palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
  {
    kind: 'prop',
    id: 'ashtray-joint',
    relativeFile: 'props/ashtray-joint.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art chipped ashtray holding one small rolled joint, muted olive and brown factory palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
  {
    kind: 'prop',
    id: 'crt-keyboard',
    relativeFile: 'props/crt-keyboard.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art beige CRT keyboard with a short tangled cable, worn keys and a blinking red LED, muted early-2000s computer palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
  {
    kind: 'prop',
    id: 'rope-coil',
    relativeFile: 'props/rope-coil.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art weathered nautical rope coil with a loose end and tiny brass hook, muted tan and blue-gray factory palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
  {
    kind: 'prop',
    id: 'rock-speaker',
    relativeFile: 'props/rock-speaker.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art battered portable rock-and-roll speaker with one cone, scuffed red trim and a short cable, muted early-2000s palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
  {
    kind: 'prop',
    id: 'old-cane',
    relativeFile: 'props/old-cane.png',
    size: { width: 64, height: 64 },
    description: 'single isolated 16-bit pixel-art worn wooden walking cane with a crooked handle and brass tip, muted brown and cream factory palette, thick dark outline, readable silhouette, transparent background, no text, no logo, maximum 64 colors',
    noBackground: true,
  },
];

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const skipFonts = args.includes('--skip-fonts');
const skipImages = args.includes('--skip-images');
const waitMs = Math.max(1500, Number(optionValue('--poll-ms') || 5000));
const timeoutMs = Math.max(60000, Number(optionValue('--timeout-ms') || 480000));
const concurrency = Math.min(8, Math.max(1, Number(optionValue('--concurrency') || 4)));

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
}

async function loadApiKey() {
  const values = { ...process.env };
  try {
    Object.assign(values, parseDotenv(await fs.readFile(path.join(siteRoot, '.dev.vars'), 'utf8')));
  } catch {
    // The calling environment remains a supported fallback.
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

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  if (response.status === 423) return { __locked: true, retryAfter: Number(response.headers.get('retry-after') || 0), status: 'processing' };
  if ((response.status === 429 || response.status === 529) && attempt < 12) {
    await wait(Math.min(15000, waitMs * (attempt + 1)));
    return pixelLabRequest(apiKey, endpoint, body, method, attempt + 1);
  }
  if (!response.ok) throw new Error(`PixelLab ${endpoint} returned HTTP ${response.status}: ${errorDetail(payload)}`);
  return payload;
}

function responseBody(payload) {
  return payload?.last_response || payload?.result || payload;
}

function imageValue(payload) {
  const body = responseBody(payload);
  if (body?.image) return body.image;
  if (Array.isArray(body?.images) && body.images.length) return body.images[0];
  return null;
}

function imageBase64(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value.base64 || value.data || value.image?.base64 || null;
}

function imageBuffer(value) {
  const encoded = imageBase64(value);
  if (!encoded) throw new Error('PixelLab returned an image without base64 data.');
  const data = encoded.includes(',') ? encoded.slice(encoded.indexOf(',') + 1) : encoded;
  return Buffer.from(data, 'base64');
}

async function pollBackgroundJob(apiKey, jobId) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await pixelLabRequest(apiKey, `/background-jobs/${encodeURIComponent(jobId)}`, null, 'GET');
    const status = String(latest?.status || '').toLowerCase();
    if (status === 'completed' || status === 'complete' || imageValue(latest)) return latest;
    if (status === 'failed' || status === 'error' || status === 'cancelled') throw new Error(`PixelLab job ${jobId} failed: ${errorDetail(latest)}`);
    await wait(waitMs);
  }
  throw new Error(`PixelLab job ${jobId} exceeded the ${Math.round(timeoutMs / 1000)} second polling timeout.`);
}

async function resolveImageResponse(apiKey, response) {
  if (response?.background_job_id) return pollBackgroundJob(apiKey, response.background_job_id);
  return response;
}

async function downloadBinary(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`PixelLab download returned HTTP ${response.status}.`);
  return Buffer.from(await response.arrayBuffer());
}

async function normalizePng(buffer) {
  const quantized = await sharp(buffer).png({ palette: true, colours: 64, dither: 0 }).toBuffer();
  const { data, info } = await sharp(quantized).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const counts = new Map();
  for (let index = 0; index < data.length; index += 4) {
    if (data[index + 3] === 0) continue;
    const key = `${data[index]},${data[index + 1]},${data[index + 2]}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  const palette = [...counts.entries()].sort((left, right) => right[1] - left[1]).map(([key]) => key.split(',').map(Number));
  if (palette.length <= 64) return quantized;
  const keep = palette.slice(0, 64);
  const dropped = new Set(palette.slice(64).map((color) => color.join(',')));
  const nearest = (color) => keep.reduce((best, candidate) => {
    const distance = (color[0] - candidate[0]) ** 2 + (color[1] - candidate[1]) ** 2 + (color[2] - candidate[2]) ** 2;
    return distance < best.distance ? { distance, candidate } : best;
  }, { distance: Infinity, candidate: keep[0] }).candidate;
  for (let index = 0; index < data.length; index += 4) {
    const key = `${data[index]},${data[index + 1]},${data[index + 2]}`;
    if (!dropped.has(key)) continue;
    const color = nearest([data[index], data[index + 1], data[index + 2]]);
    data[index] = color[0];
    data[index + 1] = color[1];
    data[index + 2] = color[2];
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeImageAsset(spec, apiKey, manifest) {
  const filePath = path.join(publicRoot, spec.relativeFile);
  if (await exists(filePath) && !replace) {
    manifest.skipped.push({ kind: spec.kind, id: spec.id, reason: 'already-exists' });
    return;
  }
  const response = await resolveImageResponse(apiKey, await pixelLabRequest(apiKey, '/create-image-pixflux', {
    description: spec.description,
    image_size: spec.size,
    no_background: spec.noBackground,
    outline: 'single color black outline',
    seed: 28000 + imageSpecs.findIndex((candidate) => candidate.id === spec.id),
  }));
  let image = imageValue(response);
  if (!image && response?.image_url) image = { base64: await downloadBinary(response.image_url) };
  if (!image) throw new Error(`PixelLab returned no image for ${spec.kind}/${spec.id}.`);
  const normalized = await normalizePng(imageBuffer(image));
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, normalized);
  const info = await sharp(normalized).metadata();
  manifest.completed.push({ kind: spec.kind, id: spec.id, width: info.width || null, height: info.height || null, file: `/bullshit-factory/${spec.relativeFile.replaceAll('\\', '/')}` });
}

async function pollFontJob(apiKey, jobId) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await pixelLabRequest(apiKey, `/generate-font-pro/${encodeURIComponent(jobId)}`, null, 'GET');
    if (latest?.__locked) {
      await wait(Math.max(waitMs, (latest.retryAfter || 0) * 1000));
      continue;
    }
    const status = String(latest?.status || '').toLowerCase();
    if (status === 'completed' && latest.download_ttf_url && latest.download_atlas_url) return latest;
    if (status === 'failed' || status === 'error') throw new Error(`PixelLab font job ${jobId} failed: ${errorDetail(latest)}`);
    await wait(waitMs);
  }
  throw new Error(`PixelLab font job ${jobId} exceeded the ${Math.round(timeoutMs / 1000)} second polling timeout.`);
}

async function writeFontAsset(spec, apiKey, manifest) {
  const directory = path.join(fontRoot, spec.id);
  const ttfPath = path.join(directory, `${spec.filename}.ttf`);
  const atlasPath = path.join(directory, `${spec.filename}-atlas.png`);
  if ((await exists(ttfPath) || await exists(atlasPath)) && !replace) {
    manifest.skipped.push({ kind: 'font', id: spec.id, reason: 'already-exists-or-partial' });
    return;
  }
  const accepted = await pixelLabRequest(apiKey, '/generate-font-pro', {
    description: spec.description,
    weight: spec.weight,
    glyph_px: spec.glyphPx,
    font_name: spec.fontName,
    seed: 29000 + fontSpecs.findIndex((candidate) => candidate.id === spec.id),
  });
  const jobId = accepted?.background_job_id || accepted?.job_id;
  if (!jobId) throw new Error(`PixelLab did not return a background job for font ${spec.id}.`);
  const completed = await pollFontJob(apiKey, jobId);
  const [ttf, atlas] = await Promise.all([
    downloadBinary(completed.download_ttf_url),
    downloadBinary(completed.download_atlas_url),
  ]);
  const normalizedAtlas = await normalizePng(atlas);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(ttfPath, ttf);
  await fs.writeFile(atlasPath, normalizedAtlas);
  const info = await sharp(normalizedAtlas).metadata();
  manifest.completed.push({ kind: 'font', id: spec.id, glyphPx: spec.glyphPx, atlasWidth: info.width || null, atlasHeight: info.height || null, ttf: `/bullshit-factory/fonts/${spec.id}/${spec.filename}.ttf`, atlas: `/bullshit-factory/fonts/${spec.id}/${spec.filename}-atlas.png` });
}

async function runWithConcurrency(tasks, worker) {
  let next = 0;
  async function consume() {
    while (next < tasks.length) {
      const index = next;
      next += 1;
      await worker(tasks[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, () => consume()));
}

async function main() {
  const apiKey = await loadApiKey();
  const tasks = [
    ...(skipFonts ? [] : fontSpecs.map((spec) => ({ kind: 'font', spec }))),
    ...(skipImages ? [] : imageSpecs.map((spec) => ({ kind: spec.kind, spec }))),
  ];
  if (!tasks.length) throw new Error('Nothing selected. Remove --skip-fonts or --skip-images.');
  const manifest = {
    generatedAt: new Date().toISOString(),
    endpoint: pixelLabEndpoint,
    sourceStyle: 'Bullshit Factory muted early-2000s 16-bit art direction; title, scene, prop, and font assets are separate reviewable inputs.',
    replace,
    requestedConcurrency: concurrency,
    completed: [],
    skipped: [],
    errors: [],
  };
  await runWithConcurrency(tasks, async ({ kind, spec }) => {
    try {
      process.stdout.write(`Generating ${kind}/${spec.id}…\n`);
      if (kind === 'font') await writeFontAsset(spec, apiKey, manifest);
      else await writeImageAsset(spec, apiKey, manifest);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      manifest.errors.push({ kind, id: spec.id, message });
      process.stdout.write(`FAILED ${kind}/${spec.id}: ${message}\n`);
    }
  });
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ manifestPath, completed: manifest.completed.length, skipped: manifest.skipped.length, errors: manifest.errors.length }, null, 2));
  if (manifest.errors.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
