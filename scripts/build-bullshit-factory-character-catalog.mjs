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

const characterSpecs = [
  {
    id: 'rookboss',
    folder: 'RookBoss',
    displayName: 'Rook Boss',
    role: 'Factory boss / foreman',
    department: 'management',
    tone: '#c86f3f',
    quote: 'The breakdown is now official company policy.',
    preferredAnimation: 'looking_forward_talking_and_pointing_at_the_screen',
  },
  {
    id: 'magsrust',
    folder: 'MagsRust',
    displayName: 'Mags Rust',
    role: 'Old factory veteran',
    department: 'maintenance',
    tone: '#b58d65',
    quote: 'I remember when this machine only caught fire once a week.',
    preferredAnimation: 'Stiff_but_powerful_idle_loop_with_knee_creaks_shou',
  },
  {
    id: 'kernelkline',
    folder: 'KernelKline',
    displayName: 'Kernel Kline',
    role: 'Computer systems administrator',
    department: 'systems',
    tone: '#6d9d91',
    quote: 'The server is emotionally unavailable.',
    preferredAnimation: 'Hunched_typing_loop_with_finger_twitching_rapid_he',
  },
  {
    id: 'sudsmcgee',
    folder: 'SudsMcGee',
    displayName: 'Suds McGee',
    role: 'Alcohol specialist',
    department: 'break-room',
    tone: '#d28a44',
    quote: 'This problem needs a meeting and a drink.',
    preferredAnimation: 'Loose_swaggering_idle_with_bottle-flask_flourish_w',
  },
  {
    id: 'dooby',
    folder: 'Dooby',
    displayName: 'Dooby',
    role: 'Marijuana philosopher',
    department: 'wellness',
    tone: '#82956e',
    quote: 'What if the forklift is just a very slow thought?',
    preferredAnimation: 'Slow_drifting_idle_with_gentle_swaying_long_though',
  },
  {
    id: 'spaulding',
    folder: 'Spaulding',
    displayName: 'Spaulding',
    role: 'Sailboat obsessive',
    department: 'maritime',
    tone: '#668a92',
    quote: 'Every crisis is a rigging problem.',
    preferredAnimation: 'Rocking-on-a-deck_idle_with_compass_checking_rope',
  },
  {
    id: 'string',
    folder: 'String',
    displayName: 'String',
    role: 'Rock-and-roll employee',
    department: 'entertainment',
    tone: '#a65b5c',
    quote: 'This argument needs a guitar solo.',
    preferredAnimation: 'Energetic_performance_loop_with_foot_tapping_shoul',
  },
  {
    id: 'karen',
    folder: 'Karen',
    displayName: 'Karen Fineprint',
    role: 'Compliance officer',
    department: 'compliance',
    tone: '#986b86',
    quote: 'I need that violation in triplicate.',
    preferredAnimation: 'Rigid_idle_loop_with_rapid_writing_glasses_pushing',
  },
  {
    id: 'nico',
    folder: 'Nico',
    displayName: 'Nico Box',
    role: 'New hire / delivery worker',
    department: 'shipping',
    tone: '#c0a04f',
    quote: 'Is this where I sign, or where I quit?',
    preferredAnimation: 'Cautious_loop_with_nervous_steps_double-takes_box',
  },
  {
    id: 'bork',
    folder: 'Bork',
    displayName: 'Bork',
    role: 'Factory dog',
    department: 'animal',
    tone: '#7e9eb0',
    quote: 'Bark bark bark.',
    preferredAnimation: 'bark_loop_with_independent_head_tilts_ear_flicks_f',
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
  const usable = clips.filter((clip) => clip.status === 'approved' && Array.isArray(clip.frames) && clip.frames.length);
  return Object.fromEntries(ACTION_REGISTRY.map((action) => {
    const fallbackAction = isDog
      ? ({ talk: 'bark', bark: 'bark', wag_tail: 'wag_tail', sniff: 'sniff', walk: 'walk', enter: 'walk', exit: 'walk', interact: 'react' }[action] || 'idle')
      : (ACTION_FALLBACKS[action] || 'idle');
    const exact = usable.find((clip) => clip.action === action);
    const fallback = usable.find((clip) => clip.action === fallbackAction) || usable.find((clip) => clip.action === 'idle') || usable[0] || null;
    const selected = exact || fallback;
    return [action, {
      clipId: selected?.id || null,
      resolvedAction: selected?.action || null,
      status: exact ? 'approved' : selected ? 'fallback' : 'missing',
      fallbackAction: exact ? null : fallbackAction,
      reason: exact ? 'verified clip classified for requested action' : selected ? 'no exact action clip; verified fallback selected' : 'no verified clip available',
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

function choosePrimaryAnimation(animationNames, preferredAnimation) {
  if (preferredAnimation && animationNames.includes(preferredAnimation)) return preferredAnimation;
  return animationNames[0] || null;
}


function classifyAnimationAction(animationId, isDog = false) {
  const id = String(animationId || '').toLowerCase().replace(/[_-]+/gu, ' ');
  if (isDog) {
    if (/\bbark\b|\byip\b|\bwoof\b|\bbark talk\b/u.test(id)) return 'bark';
    if (/\bwag tail\b|\btail\b|\bear flick\b/u.test(id)) return 'wag_tail';
    if (/\bsniff\b|\bscent\b/u.test(id)) return 'sniff';
    if (/\bwalk\b|\btrot\b|\brun\b|\bchase\b/u.test(id)) return 'walk';
    if (/\bfetch\b|\bcatch\b|\btug\b|\bcarry\b|\bchew\b|\btoy\b/u.test(id)) return 'interact';
    if (/\bjump\b|\bleap\b|\broll\b|\bshake\b|\bscratch\b|\bstretch\b|\byawn\b|\blie down\b|\bsleep\b|\bwake\b/u.test(id)) return 'react';
    return 'idle';
  }
  if (/\bwalk\b|\brun\b|\bstep\b|\bstand up\b/u.test(id)) return 'walk';
  if (/\btalk\b|\bspeak\b|\bspeech\b|\bpoint\b|\bpresent\b|\bgesture\b/u.test(id)) return 'talk';
  if (/\btype\b|\bcomputer\b|\bcable\b|\bconsole\b|\bkeyboard\b/u.test(id)) return 'type';
  if (/\brepair\b|\bfix\b|\bpull rope\b|\bclean\b|\bcook\b/u.test(id)) return 'repair';
  if (/\bcarry\b|\blift\b|\bpick up\b|\bput down\b|\bcrate\b|\bcart\b/u.test(id)) return 'carry';
  if (/\bdrink\b|\btoast\b|\bsmoke\b|\bphone\b|\bread\b|\bwrite\b|\binspect\b|\bcheck\b|\buse\b/u.test(id)) return 'interact';
  if (/\bturn\b|\blook\b|\bglance\b|\bshake no\b|\bnod yes\b|\bbeckon\b|\bwave\b|\bshrug\b/u.test(id)) return 'react';
  if (/\blaugh\b|\bcough\b|\bsneeze\b|\byawn\b|\bblink\b|\bstretch\b|\bscratch\b|\bsit\b|\bsleep\b|\blean\b|\brock\b|\bargue\b/u.test(id)) return 'react';
  if (/\bidle\b|\bloop\b|\bhunched\b|\bstiff\b|\bcautious\b|\bloose\b|\brigid\b|\benergetic\b|\bslow\b|\brocking\b/u.test(id)) return 'idle';
  return 'react';
}

function animationSourceKind(animationId) {
  const id = String(animationId || '');
  if (/(?:^|[-_])v3(?:$|[-_])/iu.test(id)) return 'pixellab-animate-with-text-v3';
  if (/(?:^|[-_])v2(?:$|[-_])/iu.test(id)) return 'pixellab-v2';
  return /pixellab/iu.test(id) ? 'pixellab-authored' : 'character-authored';
}

async function inspectAnimationClip(spec, root, animationId, isDog) {
  const animationRoot = path.join(root, 'Idle', 'animations', animationId);
  const southRoot = path.join(animationRoot, 'south');
  const entries = (await fs.readdir(southRoot, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && /^frame_\d+\.png$/u.test(entry.name))
    .sort((left, right) => {
      const a = Number(left.name.match(/\d+/u)?.[0] || 0);
      const b = Number(right.name.match(/\d+/u)?.[0] || 0);
      return a - b;
    });
  const frames = [];
  const errors = [];
  let dimensions = null;
  for (const entry of entries) {
    const imagePath = path.join(southRoot, entry.name);
    try {
      const info = await inspectPng(imagePath, spec.folder + ' animation frame');
      const current = { width: info.width, height: info.height, hasAlpha: info.hasAlpha };
      if (dimensions && (current.width !== dimensions.width || current.height !== dimensions.height)) {
        errors.push('frame dimensions do not match');
      }
      dimensions ||= current;
      frames.push({ file: publicPath(imagePath), width: current.width, height: current.height });
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'unreadable frame');
    }
  }
  const isPixelLab = /pixellab/iu.test(animationId);
  const isV3 = /(?:^|[-_])v3(?:$|[-_])/iu.test(animationId);
  const minimumFrames = isPixelLab ? 6 : 7;
  if (frames.length < minimumFrames) errors.push('too few frames');
  if (isV3 && frames.length !== 6) errors.push('animate-with-text-v3 must have exactly 6 frames');
  return {
    id: animationId,
    action: classifyAnimationAction(animationId, isDog),
    direction: 'south',
    frameCount: frames.length,
    fps: 12,
    loop: true,
    status: errors.length ? 'review' : 'approved',
    quality: errors.length ? 'review' : 'verified',
    qualityErrors: errors,
    source: { kind: animationSourceKind(animationId), directory: publicPath(animationRoot) + '/' },
    frames,
  };
}

async function inspectCharacter(spec) {
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

  const clips = [];
  const animationRoot = path.join(root, 'Idle', 'animations');
  const animationEntries = (await fs.readdir(animationRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of animationEntries) {
    clips.push(await inspectAnimationClip(spec, root, entry.name, Boolean(spec.isDog)));
  }
  const animationNames = clips.map((clip) => clip.id);
  const primaryAnimation = choosePrimaryAnimation(animationNames, spec.preferredAnimation);
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
  for (const spec of characterSpecs) characters.push(await inspectCharacter(spec));

  const catalog = {
    catalogVersion: '2.0',
    showId: 'bullshit-factory',
    status: 'active-review',
    format: 'pixellab-16bit-sprite',
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
      registryPolicy: 'all south-facing animation directories with verified frames are runtime candidates',
      actionRegistryVersion: '1.0',
      actions: ACTION_REGISTRY,
      directions: directionOrder,
    },
    retiredReplacements: [
      {
        retiredFolder: 'rook_boss',
        replacementFolder: 'RookBoss',
        replacementId: 'rookboss',
        reason: 'The new PixelLab RookBoss export is now canonical.',
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
