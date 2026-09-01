#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const siteRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const publicRoot = path.join(siteRoot, 'public');
const characterRoot = path.join(publicRoot, 'bullshit-factory', 'characters', 'v1');
const productionRoot = path.join(siteRoot, 'animation-production', 'bullshit-factory', 'production');
const publicCatalogPath = path.join(characterRoot, 'CHARACTER-CATALOG.json');
const productionCatalogPath = path.join(productionRoot, 'character-catalog.json');
const motionRegistryPath = path.join(publicRoot, 'bullshit-factory', 'production', 'motion-registry.json');
const H3_LIBRARY_ID = 'H3_LIBRARY_V2';
const H3_LIBRARY_VERSION = 2;
const H3_ASSET_ROOT = '/bullshit-factory/motion/v2';

const characterSpecs = [
  {
    id: 'rookboss',
    folder: 'RookBoss',
    displayName: 'Rook Boss',
    role: 'Factory boss / foreman',
    department: 'management',
    tone: '#c86f3f',
    quote: 'The breakdown is now official company policy.',
  },
  {
    id: 'magsrust',
    folder: 'MagsRust',
    displayName: 'Mags Rust',
    role: 'Old factory veteran',
    department: 'maintenance',
    tone: '#b58d65',
    quote: 'I remember when this machine only caught fire once a week.',
  },
  {
    id: 'kernelkline',
    folder: 'KernelKline',
    displayName: 'Kernel Kline',
    role: 'Computer systems administrator',
    department: 'systems',
    tone: '#6d9d91',
    quote: 'The server is emotionally unavailable.',
  },
  {
    id: 'sudsmcgee',
    folder: 'SudsMcGee',
    displayName: 'Suds McGee',
    role: 'Alcohol specialist',
    department: 'break-room',
    tone: '#d28a44',
    quote: 'This problem needs a meeting and a drink.',
  },
  {
    id: 'dooby',
    folder: 'Dooby',
    displayName: 'Dooby',
    role: 'Marijuana philosopher',
    department: 'wellness',
    tone: '#82956e',
    quote: 'What if the forklift is just a very slow thought?',
  },
  {
    id: 'spaulding',
    folder: 'Spaulding',
    displayName: 'Spaulding',
    role: 'Sailboat obsessive',
    department: 'maritime',
    tone: '#668a92',
    quote: 'Every crisis is a rigging problem.',
  },
  {
    id: 'string',
    folder: 'String',
    displayName: 'String',
    role: 'Rock-and-roll employee',
    department: 'entertainment',
    tone: '#a65b5c',
    quote: 'This argument needs a guitar solo.',
  },
  {
    id: 'karen',
    folder: 'Karen',
    displayName: 'Karen Fineprint',
    role: 'Compliance officer',
    department: 'compliance',
    tone: '#986b86',
    quote: 'I need that violation in triplicate.',
  },
  {
    id: 'nico',
    folder: 'Nico',
    displayName: 'Nico Box',
    role: 'New hire / delivery worker',
    department: 'shipping',
    tone: '#c0a04f',
    quote: 'Is this where I sign, or where I quit?',
  },
  {
    id: 'bork',
    folder: 'Bork',
    displayName: 'Bork',
    role: 'Factory dog',
    department: 'animal',
    tone: '#7e9eb0',
    quote: 'Bark bark bark.',
    isDog: true,
  },
];

const directionOrder = ['south', 'south-east', 'east', 'north-east', 'north', 'north-west', 'west', 'south-west'];

const ACTION_REGISTRY = Object.freeze([
  'idle',
  'listen',
  'talk',
  'react',
  'turn',
  'point',
  'present',
  'lift',
  'inspect',
  'type',
  'drink',
  'hand_off',
  'carry',
  'push',
  'repair',
  'look_left',
  'look_right',
  'enter',
  'walk',
  'stop',
  'exit',
  'bark',
  'wag_tail',
  'sniff',
  'shrug',
  'jump',
  'recoil',
  'interact',
]);

const ACTION_FALLBACKS = Object.freeze({
  idle: 'idle',
  listen: 'idle',
  talk: 'react',
  react: 'idle',
  turn: 'react',
  point: 'talk',
  present: 'talk',
  lift: 'carry',
  inspect: 'interact',
  type: 'interact',
  drink: 'interact',
  hand_off: 'carry',
  carry: 'interact',
  push: 'repair',
  repair: 'interact',
  look_left: 'react',
  look_right: 'react',
  enter: 'walk',
  walk: 'walk',
  stop: 'idle',
  exit: 'walk',
  bark: 'bark',
  wag_tail: 'react',
  sniff: 'react',
  shrug: 'react',
  jump: 'react',
  recoil: 'react',
  interact: 'react',
});

function buildActionRegistry(clips, isDog) {
  const usable = clips.filter((clip) => clip.status === 'approved'
    && clip.source?.kind === 'h3-max-local'
    && Array.isArray(clip.frames)
    && clip.frames.length);
  return Object.fromEntries(ACTION_REGISTRY.map((action) => {
    const fallbackAction = isDog
      ? ({ talk: 'bark', bark: 'bark', wag_tail: 'wag_tail', sniff: 'sniff', walk: 'walk', enter: 'walk', exit: 'walk', interact: 'react' }[action] || 'idle')
      : (ACTION_FALLBACKS[action] || 'idle');
    const newest = (left, right) => String(right?.acceptedAt || right?.generatedAt || right?.id || '')
      .localeCompare(String(left?.acceptedAt || left?.generatedAt || left?.id || ''));
    const fallbackChain = [];
    let nextFallback = fallbackAction;
    while (nextFallback && !fallbackChain.includes(nextFallback) && fallbackChain.length < ACTION_REGISTRY.length) {
      fallbackChain.push(nextFallback);
      nextFallback = isDog
        ? ({ talk: 'bark', bark: 'bark', wag_tail: 'wag_tail', sniff: 'sniff', walk: 'walk', enter: 'walk', exit: 'walk', interact: 'react' }[nextFallback] || 'idle')
        : (ACTION_FALLBACKS[nextFallback] || 'idle');
    }
    if (!fallbackChain.includes('idle')) fallbackChain.push('idle');
    const local = (predicate) => usable.filter((clip) => predicate(clip) && clip.source?.kind === 'h3-max-local').sort(newest)[0] || null;
    const exactLocal = local((clip) => clip.action === action);
    const fallbackLocal = fallbackChain
      .map((fallbackName) => local((clip) => clip.action === fallbackName))
      .find(Boolean)
      || null;
    const selected = exactLocal || fallbackLocal;
    const exactSelected = Boolean(selected && selected.action === action);
    return [action, {
      clipId: selected?.id || null,
      resolvedAction: selected?.action || null,
      status: exactSelected ? 'approved' : selected ? 'fallback' : 'missing',
      fallbackAction: exactSelected ? null : fallbackAction,
      fallbackChain: exactSelected ? [] : fallbackChain,
      purpose: selected?.purpose || selected?.performance || null,
      anchors: selected?.anchors || null,
      mirroringSafe: selected?.mirroringSafe === true,
      reason: exactSelected ? 'verified clip classified for requested action' : selected ? 'no local exact action clip; accepted replacement fallback selected' : 'no verified clip available',
    }];
  }));
}


function publicPath(filePath) {
  return '/' + path.relative(publicRoot, filePath).split(path.sep).join('/');
}

function isInside(rootPath, filePath) {
  const root = path.resolve(rootPath);
  const target = path.resolve(filePath);
  return target === root || target.startsWith(root + path.sep);
}

function fileIn(rootPath, relativePath) {
  const filePath = path.resolve(rootPath, relativePath.replaceAll('/', path.sep));
  if (!isInside(rootPath, filePath)) throw new Error('Path escapes character root: ' + relativePath);
  return filePath;
}

function publicFile(assetPath) {
  const value = String(assetPath || '');
  if (!value.startsWith('/bullshit-factory/motion/') || value.includes('..') || value.includes('\\')) {
    throw new Error('Motion registry path must stay under /bullshit-factory/motion/: ' + value);
  }
  const filePath = path.resolve(publicRoot, '.' + value);
  if (!isInside(publicRoot, filePath)) throw new Error('Motion registry path escapes public root: ' + value);
  return filePath;
}

async function inspectRegistryClip(spec, entry) {
  if (!entry || entry.status !== 'accepted' || !['accepted', 'approved'].includes(entry.reviewStatus)) return null;
  if (entry.characterId !== spec.id || entry.direction !== 'south') return null;
  const frames = [];
  const errors = [];
  let dimensions = null;
  for (const frame of Array.isArray(entry.frames) ? entry.frames : []) {
    const imagePath = publicFile(frame.file);
    try {
      const info = await inspectPng(imagePath, spec.folder + ' local motion frame');
      if (dimensions && (info.width !== dimensions.width || info.height !== dimensions.height)) {
        errors.push('frame dimensions do not match');
      }
      dimensions ||= { width: info.width, height: info.height };
      frames.push({ file: publicPath(imagePath), width: info.width, height: info.height });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'unreadable local motion frame');
    }
  }
  if (!frames.length || errors.length) {
    throw new Error(spec.folder + ' accepted motion ' + String(entry.id || 'unnamed') + ' failed catalog validation: ' + (errors.join(' ') || 'no frames'));
  }
  return {
    id: String(entry.id),
    action: ACTION_REGISTRY.includes(entry.action) ? entry.action : 'react',
    direction: 'south',
    frameCount: frames.length,
    fps: Number(entry.fps) || 12,
    loop: entry.loop !== false,
    status: 'approved',
    quality: 'h3-local-accepted',
    qualityErrors: [],
    purpose: entry.purpose || entry.performance || String(entry.action || 'motion') + ' is a reusable local performance selected by the semantic director',
    mirroringSafe: entry.mirroringSafe === true,
    source: {
      kind: 'h3-max-local',
      model: entry.source?.model || 'minimax/h3-max/image-to-video',
      requestId: entry.source?.requestId || null,
      sourceCharacterHash: entry.sourceCharacterHash || entry.source?.sourceCharacterHash || null,
      promptHash: entry.promptHash || entry.source?.promptHash || null,
      resolution: entry.source?.resolution || null,
      generatedAt: entry.generatedAt || null,
    },
    performance: entry.performance || entry.purpose || null,
    emotion: entry.emotion || null,
    validation: entry.validation || {},
    anchors: entry.anchors || {
      feetAnchor: entry.feetAnchor || null,
      spritePivot: entry.spritePivot || null,
    },
    frames,
  };
}

async function acceptedMotionClips(spec, motionRegistry) {
  const entries = Array.isArray(motionRegistry?.clips) ? motionRegistry.clips : [];
  const clips = [];
  for (const entry of entries) {
    const clip = await inspectRegistryClip(spec, entry);
    if (clip) clips.push(clip);
  }
  return clips;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function inspectPng(filePath, label) {
  const info = await sharp(filePath).metadata();
  if (info.format !== 'png' || !info.width || !info.height) {
    throw new Error(label + ' is not a readable PNG: ' + filePath);
  }
  return {
    width: info.width,
    height: info.height,
    channels: info.channels || null,
    hasAlpha: info.hasAlpha !== false,
  };
}

function choosePrimaryAnimation(clips) {
  return clips.find((clip) => clip.action === 'idle')?.id
    || clips.find((clip) => clip.action === 'talk')?.id
    || clips.find((clip) => clip.action === 'walk')?.id
    || clips[0]?.id
    || null;
}


async function inspectCharacter(spec, motionRegistry) {
  const root = path.join(characterRoot, spec.folder);
  const sheetRoot = path.join(characterRoot, spec.folder + '-spritesheet');
  const metadataPath = path.join(root, 'metadata.json');
  const metadata = await readJson(metadataPath);
  const state = metadata.states?.[0];
  if (!state?.character || !state.frames) {
    throw new Error(spec.folder + ' metadata has no usable character state.');
  }

  const sheetEntries = (await fs.readdir(sheetRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'));
  if (sheetEntries.length !== 1) {
    throw new Error(spec.folder + '-spritesheet must contain exactly one PNG; found ' + sheetEntries.length);
  }
  const sheetPath = path.join(sheetRoot, sheetEntries[0].name);
  const sheetInfo = await inspectPng(sheetPath, spec.folder + ' spritesheet');

  const rotations = {};
  const rotationRecords = state.frames.rotations || {};
  for (const direction of directionOrder) {
    const relativePath = rotationRecords[direction];
    if (!relativePath) throw new Error(spec.folder + ' is missing rotation ' + direction);
    const imagePath = fileIn(root, relativePath);
    const imageInfo = await inspectPng(imagePath, spec.folder + ' ' + direction);
    rotations[direction] = {
      file: publicPath(imagePath),
      width: imageInfo.width,
      height: imageInfo.height,
    };
  }

  const clips = await acceptedMotionClips(spec, motionRegistry);
  const primaryAnimation = choosePrimaryAnimation(clips);
  if (!primaryAnimation) throw new Error(spec.folder + ' has no animation clips.');
  const actionRegistry = buildActionRegistry(clips, Boolean(spec.isDog));

  return {
    id: spec.id,
    folder: spec.folder,
    displayName: spec.displayName,
    role: spec.role,
    department: spec.department,
    tone: spec.tone,
    quote: spec.quote,
    status: 'active',
    isDog: Boolean(spec.isDog),
    source: {
      metadata: publicPath(metadataPath),
      spritesheet: publicPath(sheetPath),
      spritesheetInfo: sheetInfo,
      exportVersion: metadata.export_version || null,
      characterId: state.character.id || null,
      declaredName: state.character.name || null,
      declaredSize: state.character.size || null,
      declaredDirections: state.character.directions || null,
      view: state.character.view || null,
    },
    assetRoot: publicPath(root) + '/',
    preview: rotations.south.file,
    rotations,
    clips,
    primaryAnimation,
    actionRegistry,
    playback: {
      fps: 12,
      loop: true,
      scaling: 'nearest-neighbor',
      maxColors: 64,
    },
  };
}

async function main() {
  const activeEntries = await fs.readdir(characterRoot, { withFileTypes: true });
  if (activeEntries.some((entry) => entry.isDirectory() && entry.name === 'rook_boss')) {
    throw new Error('The retired lowercase rook_boss folder is still present in the active public root.');
  }

  const characters = [];
  const motionRegistry = await readJson(motionRegistryPath, {
    schemaVersion: '1.0',
    status: 'missing',
    runtimePolicy: 'hybrid-pilot',
    clips: [],
  });
  const acceptedEntries = Array.isArray(motionRegistry.clips)
    ? motionRegistry.clips.filter((clip) => clip?.status === 'accepted' && ['accepted', 'approved'].includes(clip?.reviewStatus))
    : [];
  const replacementActive = motionRegistry.status === 'active'
    && motionRegistry.runtimePolicy === 'replacement'
    && motionRegistry.libraryId === H3_LIBRARY_ID
    && Number(motionRegistry.libraryVersion) === H3_LIBRARY_VERSION
    && acceptedEntries.length > 0;
  const acceptedMotionCount = Array.isArray(motionRegistry.clips) ? motionRegistry.clips.filter((clip) => clip?.status === 'accepted' && ['accepted', 'approved'].includes(clip?.reviewStatus)).length : 0;
  const reviewPendingMotionCount = Array.isArray(motionRegistry.clips) ? motionRegistry.clips.filter((clip) => clip?.status === 'accepted' && !['accepted', 'approved'].includes(clip?.reviewStatus)).length : 0;
  for (const spec of characterSpecs) characters.push(await inspectCharacter(spec, motionRegistry));

  const catalog = {
    catalogVersion: '2.0',
    showId: 'bullshit-factory',
    status: 'active-review',
    format: '16-bit-pixel-art',
    root: '/bullshit-factory/characters/v1/',
    castLimit: 10,
    activeCastCount: characters.length,
    style: {
      era: 'early-2000s console and PC 16-bit',
      maxColors: 64,
      nativeScaling: 'nearest-neighbor',
      transparency: 'straight-alpha PNG',
    },
    animationDefaults: {
      fps: 12,
      loop: true,
      sourceFramesPerClip: 6,
      sourceFrameVariants: [6, 7, 8],
      registryPolicy: 'accepted H3_LIBRARY_V2 local motion registry only; legacy motion assets are not runtime eligible',
      actionRegistryVersion: '2.0',
      actions: ACTION_REGISTRY,
      fallbackActions: ACTION_FALLBACKS,
      directions: directionOrder,
    },
    motionLibrary: {
      id: motionRegistry.libraryId || H3_LIBRARY_ID,
      version: Number(motionRegistry.libraryVersion) || H3_LIBRARY_VERSION,
      assetRoot: motionRegistry.assetRoot || H3_ASSET_ROOT,
      registry: '/bullshit-factory/production/motion-registry.json',
      runtimePolicy: motionRegistry.runtimePolicy || 'hybrid-pilot',
      status: motionRegistry.status || 'missing',
      model: motionRegistry.model || 'minimax/h3-max/image-to-video',
      acceptedClipCount: acceptedMotionCount,
      reviewPendingClipCount: reviewPendingMotionCount,
      replacementActive,
      legacyRuntimeEligible: false,
    },
    retiredReplacements: [
      {
        retiredFolder: 'rook_boss',
        replacementFolder: 'RookBoss',
        replacementId: 'rookboss',
        reason: 'The canonical RookBoss export is now active.',
      },
    ],
    characters,
  };

  await fs.mkdir(productionRoot, { recursive: true });
  const contents = JSON.stringify(catalog, null, 2) + '\n';
  await fs.writeFile(publicCatalogPath, contents, 'utf8');
  await fs.writeFile(productionCatalogPath, contents, 'utf8');
  console.log(JSON.stringify({
    publicCatalogPath,
    productionCatalogPath,
    activeCastCount: characters.length,
    characters: characters.map((character) => ({
      id: character.id,
      folder: character.folder,
      displayName: character.displayName,
      primaryAnimation: character.primaryAnimation,
      directionCount: Object.keys(character.rotations).length,
      frameCount: character.clips.find((clip) => clip.id === character.primaryAnimation)?.frameCount || 0,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
