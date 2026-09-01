#!/usr/bin/env node

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const siteRoot = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
const authoringRoot = path.resolve(process.env.BF_H3_SOURCE_ROOT || path.join(siteRoot, 'runtime', 'h3-authoring'));
const registryPath = path.join(siteRoot, 'public', 'bullshit-factory', 'production', 'motion-registry.json');
const reportPath = path.resolve(process.env.BF_H3_RESOLUTION_REPORT || path.join(authoringRoot, 'h3-resolution-comparison.json'));

async function exists(filePath) {
  return access(filePath).then(() => true).catch(() => false);
}

async function probe(videoPath) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'stream=width,height,nb_frames,r_frame_rate:format=duration',
    '-of', 'json',
    videoPath,
  ]);
  const result = JSON.parse(stdout);
  const stream = result.streams?.[0] || {};
  return {
    width: Number(stream.width) || null,
    height: Number(stream.height) || null,
    frames: Number(stream.nb_frames) || null,
    fps: String(stream.r_frame_rate || ''),
    durationSeconds: Number(result.format?.duration) || null,
  };
}

const entries = [];
for (const directory of await readdir(authoringRoot, { withFileTypes: true })) {
  if (!directory.isDirectory()) continue;
  const directoryPath = path.join(authoringRoot, directory.name);
  const videoPath = path.join(directoryPath, 'attempt-1.mp4');
  if (!await exists(videoPath)) continue;
  let metadata = {};
  try {
    metadata = JSON.parse(await readFile(path.join(directoryPath, 'metadata.json'), 'utf8'));
  } catch {
    // Some raw source pilots intentionally have no sidecar; their dimensions
    // still belong in the comparison rather than being silently omitted.
  }
  entries.push({
    directory: directory.name,
    characterId: metadata.characterId || null,
    action: metadata.action || null,
    emotion: metadata.emotion || null,
    sourceResolution: metadata.source?.resolution || null,
    sourceProvider: metadata.source?.provider || null,
    sourceRequestId: metadata.source?.requestId || null,
    videoPath,
    probe: await probe(videoPath),
  });
}

const registry = JSON.parse(await readFile(registryPath, 'utf8'));
const active = (registry.clips || []).filter((clip) => clip?.status === 'accepted' && ['accepted', 'approved'].includes(clip?.reviewStatus));
const activeBySource = new Map(active.map((clip) => [clip.source?.requestId, clip]));
const grouped = {};
for (const entry of entries) {
  const key = entry.sourceResolution || (entry.probe.width === 768 ? '768P' : entry.probe.width === 480 ? '480P' : 'unknown');
  grouped[key] ||= { sourceCount: 0, dimensions: {}, durationSeconds: new Set(), outputFrameCounts: new Set() };
  grouped[key].sourceCount += 1;
  const dimension = `${entry.probe.width}x${entry.probe.height}`;
  grouped[key].dimensions[dimension] = (grouped[key].dimensions[dimension] || 0) + 1;
  grouped[key].durationSeconds.add(entry.probe.durationSeconds);
  const clip = activeBySource.get(entry.sourceRequestId);
  if (clip) grouped[key].outputFrameCounts.add(clip.frames?.length || 0);
}
for (const value of Object.values(grouped)) {
  value.durationSeconds = [...value.durationSeconds].sort((a, b) => a - b);
  value.outputFrameCounts = [...value.outputFrameCounts].sort((a, b) => a - b);
}

const stripVideoPath = (entry) => {
  const copy = { ...entry };
  delete copy.videoPath;
  return copy;
};
const magsPilots = entries
  .filter((entry) => entry.characterId === 'magsrust' && entry.action === 'idle' && entry.sourceResolution)
  .map(stripVideoPath)
  .sort((left, right) => String(left.sourceResolution).localeCompare(String(right.sourceResolution)) || left.directory.localeCompare(right.directory));
const report = {
  status: 'compared',
  generatedAt: new Date().toISOString(),
  sourceRoot: authoringRoot,
  registry: { libraryId: registry.libraryId, libraryVersion: Number(registry.libraryVersion), assetRoot: registry.assetRoot, activeReviewedClips: active.length },
  sourceFiles: entries.length,
  byResolution: grouped,
  resolutionPilot: {
    subject: 'magsrust/idle',
    candidates: magsPilots,
    conclusion: 'Both real source resolutions are five-second square H3 inputs; the selected runtime normalization produces the same fixed 92x92 frame contract, so 768P is retained as a quality reference rather than a separate runtime path.',
  },
};
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify(report, null, 2));
