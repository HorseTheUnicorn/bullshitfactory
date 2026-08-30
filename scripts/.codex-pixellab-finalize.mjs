#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from '/home/goblin/cave/bullshit-factory/node_modules/sharp/dist/index.mjs';

const runnerPid = Number(process.env.PIXELLAB_RUNNER_PID || '136986');
const project = '/home/goblin/cave/bullshit-factory';
const live = `${project}/dist/client/bullshit-factory`;
const publicRoot = `${project}/public/bullshit-factory`;
const stable = '/home/goblin/cave/.pixellab-preserve-20260828/dist/client/bullshit-factory';
const sources = [
  stable,
  '/home/goblin/cave/.bullshit-factory-pre-ace-tuned-20260828/dist/client/bullshit-factory',
  '/home/goblin/cave/.bullshit-factory-pre-writing-auth-20260828/dist/client/bullshit-factory',
];
const folders = ['Bork', 'Dooby', 'Karen', 'KernelKline', 'MagsRust', 'Nico', 'RookBoss', 'Spaulding', 'String', 'SudsMcGee'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function runnerAlive() {
  try {
    const cmd = fs.readFileSync(`/proc/${runnerPid}/cmdline`, 'utf8');
    return cmd.includes('codex-pixellab-exhaust-runner.mjs') || cmd.includes('codex-pixellab-resume-runner.mjs');
  } catch {
    return false;
  }
}

function syncMissing(source, destination) {
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(destination, { recursive: true });
  execFileSync('rsync', ['-a', '--ignore-existing', `${source}/`, `${destination}/`], { stdio: 'ignore' });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function animationMap(metadata) {
  return metadata?.states?.[0]?.frames?.animations || {};
}

function mergeMetadata(base, candidate) {
  if (!candidate) return base;
  if (!base) return structuredClone(candidate);
  const baseAnimations = animationMap(base);
  const candidateAnimations = animationMap(candidate);
  for (const [id, animation] of Object.entries(candidateAnimations)) {
    if (!baseAnimations[id]) {
      baseAnimations[id] = animation;
      continue;
    }
    for (const direction of ['south', 'north', 'east', 'west']) {
      if (!Array.isArray(baseAnimations[id]?.[direction]) && Array.isArray(animation?.[direction])) {
        baseAnimations[id][direction] = animation[direction];
      }
    }
  }
  return base;
}

async function writeJsonAtomic(filePath, value) {
  const tempPath = `${filePath}.codex-finalize-tmp`;
  await fsp.writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fsp.rename(tempPath, filePath);
}

function copyNewestManifest(name) {
  const candidates = [live, stable, ...sources.slice(1)]
    .map((root) => path.join(root, 'characters', 'v1', name))
    .filter((filePath) => fs.existsSync(filePath));
  if (!candidates.length) return null;
  candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const source = candidates[0];
  for (const destination of [path.join(live, 'characters', 'v1', name), path.join(publicRoot, 'characters', 'v1', name)]) {
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    if (source !== destination) fs.copyFileSync(source, destination);
  }
  return source;
}

async function rebuildCatalog() {
  const catalogCandidates = [
    path.join(live, 'characters', 'v1', 'CHARACTER-CATALOG.json'),
    path.join(stable, 'characters', 'v1', 'CHARACTER-CATALOG.json'),
    ...sources.slice(1).map((root) => path.join(root, 'characters', 'v1', 'CHARACTER-CATALOG.json')),
  ];
  const catalog = catalogCandidates.map(readJson).find(Boolean) || { characters: [] };
  catalog.characters = Array.isArray(catalog.characters) ? catalog.characters : [];

  for (const folder of folders) {
    const metadataCandidates = [
      path.join(live, 'characters', 'v1', folder, 'metadata.json'),
      ...sources.map((root) => path.join(root, 'characters', 'v1', folder, 'metadata.json')),
    ];
    let metadata = null;
    for (const candidate of metadataCandidates) metadata = mergeMetadata(metadata, readJson(candidate));
    if (!metadata) continue;

    // Recover animation metadata from any complete generated directories. This protects clips
    // whose JSON was lost during a deployment refresh while their six PNG frames survived.
    const animationRoot = path.join(live, 'characters', 'v1', folder, 'Idle', 'animations');
    const animations = animationMap(metadata);
    if (fs.existsSync(animationRoot)) {
      for (const animationName of fs.readdirSync(animationRoot)) {
        if (!animationName.startsWith('pixellab-')) continue;
        const southRoot = path.join(animationRoot, animationName, 'south');
        if (!fs.existsSync(southRoot) || !fs.statSync(southRoot).isDirectory()) continue;
        const frames = fs.readdirSync(southRoot)
          .filter((name) => /^frame_\d+\.png$/.test(name))
          .sort()
          .map((name) => `Idle/animations/${animationName}/south/${name}`);
        if (frames.length && !animations[animationName]) animations[animationName] = { south: frames };
      }
    }

    const liveMetadataPath = path.join(live, 'characters', 'v1', folder, 'metadata.json');
    const publicMetadataPath = path.join(publicRoot, 'characters', 'v1', folder, 'metadata.json');
    fs.mkdirSync(path.dirname(liveMetadataPath), { recursive: true });
    fs.mkdirSync(path.dirname(publicMetadataPath), { recursive: true });
    await writeJsonAtomic(liveMetadataPath, metadata);
    await writeJsonAtomic(publicMetadataPath, metadata);

    const catalogCharacter = catalog.characters.find((entry) => entry.folder === folder)
      || catalog.characters.find((entry) => String(entry.id || '').toLowerCase() === folder.toLowerCase())
      || { id: folder.toLowerCase(), folder };
    if (!catalog.characters.includes(catalogCharacter)) catalog.characters.push(catalogCharacter);
    catalogCharacter.folder = catalogCharacter.folder || folder;
    catalogCharacter.clips = Array.isArray(catalogCharacter.clips) ? catalogCharacter.clips : [];
    const known = new Set(catalogCharacter.clips.map((clip) => clip.id));
    for (const [id, animation] of Object.entries(animationMap(metadata))) {
      if (known.has(id) || !Array.isArray(animation?.south) || !animation.south.length) continue;
      const frames = [];
      let valid = true;
      for (const relative of animation.south) {
        const characterRoot = path.join(live, 'characters', 'v1', folder);
        const filePath = path.resolve(characterRoot, relative);
        if (filePath !== characterRoot && !filePath.startsWith(`${characterRoot}${path.sep}`)) { valid = false; break; }
        if (!fs.existsSync(filePath)) { valid = false; break; }
        const info = await sharp(filePath).metadata();
        frames.push({ file: `/bullshit-factory/characters/v1/${folder}/${relative}`, width: info.width || 0, height: info.height || 0 });
      }
      if (!valid || !frames.length) continue;
      catalogCharacter.clips.push({ id, direction: 'south', frameCount: frames.length, frames });
      known.add(id);
    }
  }

  const liveCatalog = path.join(live, 'characters', 'v1', 'CHARACTER-CATALOG.json');
  const publicCatalog = path.join(publicRoot, 'characters', 'v1', 'CHARACTER-CATALOG.json');
  await writeJsonAtomic(liveCatalog, catalog);
  await writeJsonAtomic(publicCatalog, catalog);
  return { characters: catalog.characters.length, clips: catalog.characters.reduce((sum, character) => sum + (character.clips?.length || 0), 0) };
}

function count(root, pattern) {
  let total = 0;
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(filePath);
      else if (pattern(filePath)) total += 1;
    }
  }
  walk(root);
  return total;
}

while (runnerAlive()) await sleep(15000);
await sleep(30000);
for (const source of sources) syncMissing(source, live);
syncMissing(path.join(live, 'props'), path.join(publicRoot, 'props'));
syncMissing(path.join(live, 'effects'), path.join(publicRoot, 'effects'));
for (const folder of folders) {
  syncMissing(path.join(live, 'characters', 'v1', folder, 'Idle', 'animations'), path.join(publicRoot, 'characters', 'v1', folder, 'Idle', 'animations'));
}
const catalog = await rebuildCatalog();
const exhaustManifest = copyNewestManifest('PIXELLAB-EXHAUST-20260828.json');
const batchManifest = copyNewestManifest('PIXELLAB-BATCH-20260828.json');

const runnerScripts = [
  path.join(project, '.codex-pixellab-exhaust-runner.mjs'),
  '/home/goblin/cave/.bullshit-factory-pre-ace-tuned-20260828/.codex-pixellab-exhaust-runner.mjs',
  '/home/goblin/cave/.bullshit-factory-pre-writing-auth-20260828/.codex-pixellab-exhaust-runner.mjs',
];
for (const filePath of runnerScripts) try { fs.unlinkSync(filePath); } catch { /* disposable file may not exist */ }

const summary = {
  finalizedAt: new Date().toISOString(),
  props: count(path.join(live, 'props'), (filePath) => filePath.endsWith('.png')),
  effects: count(path.join(live, 'effects'), (filePath) => filePath.endsWith('.png')),
  v2Frames: count(path.join(live, 'characters', 'v1'), (filePath) => filePath.includes('/Idle/animations/pixellab-') && filePath.includes('-v2/') && filePath.endsWith('.png')),
  v3Frames: count(path.join(live, 'characters', 'v1'), (filePath) => filePath.includes('/Idle/animations/pixellab-') && filePath.includes('-v3/') && filePath.endsWith('.png')),
  catalog,
  exhaustManifest,
  batchManifest,
};
await fsp.writeFile('/tmp/codex-pixellab-finalized.json', `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary, null, 2));
