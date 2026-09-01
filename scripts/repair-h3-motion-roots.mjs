#!/usr/bin/env node

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { contactSheet, stabilizeNormalizedFrames } from './h3-author-motion.mjs';

const siteRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public');
const registryPath = path.join(publicRoot, 'bullshit-factory', 'production', 'motion-registry.json');
const activeReviewStatuses = new Set(['accepted', 'approved']);
const legacyMotionPath = ['/motion/', 'v1/'].join('');
const currentMotionPath = ['/motion/', 'v2/'].join('');

function publicAssetPath(publicFile) {
  return path.resolve(publicRoot, '.' + String(publicFile || ''));
}

function authoringPath(storedPath) {
  const relative = String(storedPath || '').replace(/^runtime[\\/]/u, '');
  return path.join(siteRoot, 'runtime', relative);
}

async function atomicWrite(filePath, value) {
  const temporaryPath = filePath + '.' + process.pid + '.' + randomUUID().slice(0, 8) + '.tmp';
  await writeFile(temporaryPath, JSON.stringify(value, null, 2) + '\n', 'utf8');
  await rename(temporaryPath, filePath);
}

async function repairClip(clip) {
  const files = (clip.frames || []).map((frame) => publicAssetPath(frame.file));
  const buffers = await Promise.all(files.map((filePath) => readFile(filePath)));
  const aligned = await stabilizeNormalizedFrames(buffers, { strict: false });
  const temporaryDirectory = files[0] ? path.join(path.dirname(files[0]), '.root-repair-' + process.pid) : '';
  await mkdir(temporaryDirectory, { recursive: true });
  try {
    const temporaryFiles = [];
    for (let index = 0; index < aligned.length; index += 1) {
      const temporaryFile = path.join(temporaryDirectory, path.basename(files[index]) + '.tmp');
      await writeFile(temporaryFile, aligned[index]);
      temporaryFiles.push(temporaryFile);
    }
    for (let index = 0; index < temporaryFiles.length; index += 1) {
      await rename(temporaryFiles[index], files[index]);
    }
  } finally {
    for (const filePath of await readdir(temporaryDirectory).catch(() => [])) await rm(path.join(temporaryDirectory, filePath), { force: true }).catch(() => {});
    await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => {});
  }
  const preview = authoringPath(clip.preview);
  await mkdir(path.dirname(preview), { recursive: true });
  await contactSheet(aligned, preview);
  clip.validation = {
    ...(clip.validation || {}),
    rootAligned: true,
    rootAlignment: 'fixed-feet-anchor-v3',
    normalization: 'shared-union-bounds-and-root-anchor-v3',
  };
  const metadataPath = path.join(path.dirname(preview), 'metadata.json');
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    metadata.validation = { ...(metadata.validation || {}), ...clip.validation };
    // The registry is authoritative for runtime asset paths. Refresh copied
    // authoring sidecars too, so stale v1 paths cannot mislead audits or
    // future operators after the repaired V2 frames are selected.
    metadata.frames = clip.frames.map((frame) => ({ ...frame }));
    metadata.authoringWorkDirectory = path.dirname(metadataPath);
    const localSourceVideo = path.join(path.dirname(metadataPath), 'attempt-1.mp4');
    metadata.outputVideo = localSourceVideo;
    if (clip.normalizedAt) metadata.normalizedAt = clip.normalizedAt;
    await atomicWrite(metadataPath, metadata);
  } catch {
    // Registry assets remain authoritative when an older authoring directory
    // does not contain a metadata sidecar.
  }
  return files.length;
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const clips = (registry.clips || []).filter((clip) => clip.status === 'accepted' && activeReviewStatuses.has(clip.reviewStatus));
let frameCount = 0;
for (const clip of clips) frameCount += await repairClip(clip);
const authoringRoot = path.join(siteRoot, 'runtime', 'h3-authoring');
for (const entry of await readdir(authoringRoot, { withFileTypes: true }).catch(() => [])) {
  if (!entry.isDirectory()) continue;
  const metadataPath = path.join(authoringRoot, entry.name, 'metadata.json');
  try {
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const frames = Array.isArray(metadata.frames)
      ? metadata.frames.map((frame) => ({
        ...frame,
        file: String(frame.file || '').replace(legacyMotionPath, currentMotionPath),
      }))
      : metadata.frames;
    const authoringDirectory = path.dirname(metadataPath);
    await atomicWrite(metadataPath, {
      ...metadata,
      frames,
      authoringWorkDirectory: authoringDirectory,
      outputVideo: path.join(authoringDirectory, 'attempt-1.mp4'),
    });
  } catch {
    // A missing or malformed optional sidecar must not hide the authoritative
    // registry result from the repair report.
  }
}
registry.lastUpdatedAt = new Date().toISOString();
await atomicWrite(registryPath, registry);
console.log(JSON.stringify({ status: 'repaired', clips: clips.length, frames: frameCount, registryPath }, null, 2));
