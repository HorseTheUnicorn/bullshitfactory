#!/usr/bin/env node

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public');
const registryPath = path.join(publicRoot, 'bullshit-factory', 'production', 'motion-registry.json');
const H3_LIBRARY_ID = 'H3_LIBRARY_V2';
const H3_LIBRARY_VERSION = 2;
const H3_ASSET_ROOT = '/bullshit-factory/motion/v2';
const requiredCoverage = Object.freeze({
  rookboss: ['idle', 'listen', 'talk', 'react', 'walk'],
  magsrust: ['idle', 'listen', 'talk', 'react', 'walk'],
  kernelkline: ['idle', 'listen', 'talk', 'react', 'walk'],
  sudsmcgee: ['idle', 'listen', 'talk', 'react', 'walk'],
  dooby: ['idle', 'listen', 'talk', 'react', 'walk'],
  spaulding: ['idle', 'listen', 'talk', 'react', 'walk'],
  string: ['idle', 'listen', 'talk', 'react', 'walk'],
  karen: ['idle', 'listen', 'talk', 'react', 'walk'],
  nico: ['idle', 'listen', 'talk', 'react', 'walk'],
  bork: ['idle', 'listen', 'bark', 'wag_tail', 'sniff', 'walk'],
  'orange-idiot': ['talk', 'walk'],
});

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
};

const activeClip = (clip) => clip?.status === 'accepted'
  && ['accepted', 'approved'].includes(clip?.reviewStatus);

const h3Source = (clip) => clip?.source?.kind === 'h3-max-local'
  || (clip?.source?.provider === 'fal' && clip?.source?.model === 'minimax/h3-max/image-to-video');

const localPublicPath = (assetPath) => path.resolve(publicRoot, `.${String(assetPath || '')}`);

function auditMotion(registry, ledger = {}, options = {}) {
  const errors = [];
  const warnings = [];
  const clips = Array.isArray(registry?.clips) ? registry.clips : [];
  const active = clips.filter(activeClip);
  const checkFiles = options.checkFiles !== false;
  const requireCoverage = options.requireCoverage !== false;
  const seenFrames = new Map();

  if (registry?.libraryId !== H3_LIBRARY_ID) errors.push(`libraryId must be ${H3_LIBRARY_ID}`);
  if (Number(registry?.libraryVersion) !== H3_LIBRARY_VERSION) errors.push(`libraryVersion must be ${H3_LIBRARY_VERSION}`);
  if (registry?.assetRoot !== H3_ASSET_ROOT) errors.push(`assetRoot must be ${H3_ASSET_ROOT}`);
  if (registry?.status !== 'active') errors.push('motion registry must be active');
  if (registry?.runtimePolicy !== 'replacement') errors.push('motion registry must use replacement policy');
  if (registry?.legacyRuntimeEligible === true) errors.push('legacy motion must not be runtime eligible');
  if (!active.length) errors.push('motion registry has no reviewed accepted clips');

  for (const clip of active) {
    if (!h3Source(clip)) errors.push(`${clip.id || '(unnamed)'} is not an H3 local clip`);
    if (clip.direction !== 'south') errors.push(`${clip.id || '(unnamed)'} is not normalized to south direction`);
    if (!Array.isArray(clip.frames) || clip.frames.length < 6) errors.push(`${clip.id || '(unnamed)'} has fewer than six frames`);
    for (const frame of Array.isArray(clip.frames) ? clip.frames : []) {
      const file = String(frame?.file || '');
      if (!file.startsWith(`${H3_ASSET_ROOT}/`)) errors.push(`${clip.id || '(unnamed)'} points outside ${H3_ASSET_ROOT}: ${file || '(missing)'}`);
      if (file.includes('/characters/v1/') || file.includes('/Idle/animations/')) errors.push(`${clip.id || '(unnamed)'} still points at legacy motion: ${file}`);
      if (file && seenFrames.has(file)) warnings.push(`frame reused by ${seenFrames.get(file)} and ${clip.id || '(unnamed)'}`);
      if (file) seenFrames.set(file, clip.id || '(unnamed)');
      if (checkFiles && file) {
        if (!existsSync(localPublicPath(file))) errors.push(`${clip.id || '(unnamed)'} frame is missing locally: ${file}`);
      }
    }
  }

  const byCharacter = {};
  for (const characterId of Object.keys(requiredCoverage)) {
    const characterClips = active.filter((clip) => clip.characterId === characterId);
    const actions = [...new Set(characterClips.map((clip) => clip.action))].sort();
    byCharacter[characterId] = { clipCount: characterClips.length, actions };
    if (requireCoverage) {
      for (const action of requiredCoverage[characterId]) {
        if (!characterClips.some((clip) => clip.action === action && clip.direction === 'south')) {
          errors.push(`${characterId} is missing reviewed H3 ${action} coverage`);
        }
      }
    }
  }

  const requests = Array.isArray(ledger?.requests) ? ledger.requests : [];
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    library: { id: registry?.libraryId || null, version: Number(registry?.libraryVersion) || null, assetRoot: registry?.assetRoot || null, status: registry?.status || null, runtimePolicy: registry?.runtimePolicy || null },
    clips: { total: clips.length, activeReviewed: active.length, superseded: clips.filter((clip) => clip?.status === 'superseded').length },
    byCharacter,
    ledger: {
      available: Boolean(ledger),
      requests: requests.length,
      accepted: Number(ledger?.totals?.accepted || 0),
      rejected: Number(ledger?.totals?.rejected || 0),
      retries: Number(ledger?.totals?.retries || 0),
      estimatedSpendUsd: Number(ledger?.totals?.estimatedSpendUsd || 0),
      hardBudgetUsd: Number(ledger?.policy?.hardBudgetUsd || 30),
      internalStopUsd: Number(ledger?.policy?.internalStopUsd || 29),
    },
    previews: Object.fromEntries(active.map((clip) => [clip.id, clip.preview || null])),
  };
}

function usage() {
  return [
    'Usage:',
    '  npm run animation:audit',
    '  npm run animation:preview',
    '  npm run animation:budget',
    '',
    'Read-only checks for the accepted local H3 motion registry.',
  ].join('\n');
}

async function main() {
  const argv = new Set(process.argv.slice(2));
  if (argv.has('--help') || argv.has('-h')) {
    console.log(usage());
    return;
  }
  const registry = await readJson(registryPath, {});
  const ledgerPath = path.resolve(process.env.BF_H3_LEDGER_PATH || path.join(siteRoot, 'runtime', 'h3-authoring-ledger.json'));
  const ledger = await readJson(ledgerPath, null);
  const report = auditMotion(registry, ledger);
  if (argv.has('--budget')) report.budget = report.ledger;
  if (!argv.has('--preview')) delete report.previews;
  report.registryPath = path.relative(siteRoot, registryPath).split(path.sep).join('/');
  report.ledgerPath = path.relative(siteRoot, ledgerPath).split(path.sep).join('/');
  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

export { H3_ASSET_ROOT, H3_LIBRARY_ID, H3_LIBRARY_VERSION, auditMotion, requiredCoverage };
