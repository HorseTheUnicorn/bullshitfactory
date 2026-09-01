import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHARACTER_ANCHORS, LOCATION_SPECS } from '../lib/bullshit-factory-location.mjs';

const siteRoot = fileURLToPath(new URL('..', import.meta.url));
const publicRoot = path.join(siteRoot, 'public');
const factoryRoot = path.join(publicRoot, 'bullshit-factory');
const productionRoot = path.join(factoryRoot, 'production');
const catalogPath = path.join(factoryRoot, 'characters', 'v1', 'CHARACTER-CATALOG.json');
const biblesPath = path.join(productionRoot, 'character-bibles.json');
const rightsPath = path.join(factoryRoot, 'music', 'rights.json');
const writingTrainingPath = path.join(productionRoot, 'goblin-writing-training.json');
const animationTrainingPath = path.join(productionRoot, 'animation-assembly-training.json');
const orangeIdiotPath = path.join(factoryRoot, 'tv', 'orange-idiot', 'orange-idiot.json');
const motionRegistryPath = path.join(productionRoot, 'motion-registry.json');
const inventoryPath = path.join(productionRoot, 'INVENTORY.json');
const anchorsPath = path.join(productionRoot, 'character-anchors.json');
const H3_LIBRARY_ID = 'H3_LIBRARY_V2';
const H3_LIBRARY_VERSION = 2;

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, 'utf8'));
const exists = async (filePath) => fs.access(filePath).then(() => true).catch(() => false);
const localPublicPath = (value) => path.resolve(publicRoot, `.${String(value || '')}`);

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

async function alphaBounds(filePath) {
  const { data, info } = await sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width;
  let top = info.height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + info.channels - 1] > 8) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { width: info.width, height: info.height, alphaBounds: { left, top, right, bottom } };
}

function sameBounds(left, right) {
  return ['left', 'top', 'right', 'bottom'].every((key) => Number(left?.[key]) === Number(right?.[key]));
}

const catalog = await readJson(catalogPath);
const bibles = await readJson(biblesPath);
const rights = await readJson(rightsPath);
const writingTraining = await readJson(writingTrainingPath);
const animationTraining = await readJson(animationTrainingPath);
const orangeIdiot = await readJson(orangeIdiotPath);
const motionRegistry = await readJson(motionRegistryPath, { status: 'missing', runtimePolicy: 'hybrid-pilot', clips: [] });
const errors = [];
const characters = Array.isArray(catalog.characters) ? catalog.characters : [];
const bibleCharacters = Array.isArray(bibles.characters) ? bibles.characters : [];

assert(catalog.showId === 'bullshit-factory', 'character catalog showId must be bullshit-factory', errors);
assert(characters.length === 10, `expected 10 locked characters, found ${characters.length}`, errors);
assert(characters.filter((character) => character.isDog).length === 1, 'exactly one bark-only dog is required', errors);
assert(bibleCharacters.length === characters.length, 'character bible must cover the locked cast', errors);
assert(writingTraining.schemaVersion, 'Goblin writing training must declare a schema version', errors);
assert(Array.isArray(writingTraining.sources) && writingTraining.sources.length >= 2, 'Goblin writing training must retain its two technique sources', errors);
assert(Array.isArray(writingTraining.beatSheet) && writingTraining.beatSheet.length >= 6, 'Goblin writing training must define a complete sitcom beat sheet', errors);
assert(Array.isArray(writingTraining.rules) && writingTraining.rules.length >= 8, 'Goblin writing training must define enough operating rules', errors);
assert(animationTraining.showId === 'bullshit-factory', 'Animation assembly training must target Bullshit Factory', errors);
assert(animationTraining.schemaVersion, 'Animation assembly training must declare a schema version', errors);
assert(Array.isArray(animationTraining.parserSchema?.requiredFields) && animationTraining.parserSchema.requiredFields.includes('walk_band'), 'Animation assembly training must define semantic walk-band input', errors);
assert(Array.isArray(animationTraining.anchorContract?.requiredAnchors) && animationTraining.anchorContract.requiredAnchors.includes('feet_anchor'), 'Animation assembly training must require feet anchors', errors);
assert(Array.isArray(animationTraining.validationCriteria) && animationTraining.validationCriteria.length >= 6, 'Animation assembly training must define frame validation criteria', errors);
assert(orangeIdiot.id === 'orange-idiot', 'Orange Idiot TV metadata must use the orange-idiot id', errors);
assert(orangeIdiot.mainCast === false, 'Orange Idiot must remain outside the locked main cast', errors);
assert(orangeIdiot.view === 'south', 'Orange Idiot must be south-facing only', errors);
assert(orangeIdiot.sceneId === 'orange-idiot-house', 'Orange Idiot must use the new standalone house scene', errors);
const orangeStandaloneScene = LOCATION_SPECS[orangeIdiot.standaloneSceneId];
const orangeTalkingFrames = Array.isArray(orangeIdiot.talkingFrames) ? orangeIdiot.talkingFrames : [];
const orangeReviewedMotionClips = (Array.isArray(motionRegistry.clips) ? motionRegistry.clips : [])
  .filter((clip) => clip?.characterId === orangeIdiot.id
    && clip?.status === 'accepted'
    && ['accepted', 'approved'].includes(clip?.reviewStatus)
    && clip?.direction === 'south'
    && Array.isArray(clip?.frames)
    && clip.frames.length);
const orangeRequiredMotionClips = ['talk', 'walk'].map((action) => orangeReviewedMotionClips
  .filter((clip) => clip.action === action)
  .sort((left, right) => String(right.acceptedAt || right.generatedAt || '').localeCompare(String(left.acceptedAt || left.generatedAt || '')) || String(right.id || '').localeCompare(String(left.id || '')))[0] || null);
assert(Boolean(orangeStandaloneScene), 'Orange Idiot standalone scene must be registered in LOCATION_SPECS', errors);
assert(orangeIdiot.standaloneBackground === orangeStandaloneScene?.background, 'Orange Idiot standalone background must match its registered scene', errors);
assert(typeof orangeIdiot.standaloneBackground === 'string' && await exists(localPublicPath(orangeIdiot.standaloneBackground)), 'Orange Idiot standalone background is missing', errors);
assert(motionRegistry.status === 'active' && motionRegistry.runtimePolicy === 'replacement', 'Orange Idiot H3 motion registry must be active with replacement policy', errors);
assert(motionRegistry.libraryId === H3_LIBRARY_ID && Number(motionRegistry.libraryVersion) === H3_LIBRARY_VERSION, `H3 motion registry must be ${H3_LIBRARY_ID} version ${H3_LIBRARY_VERSION}`, errors);
assert(orangeRequiredMotionClips.every(Boolean), 'Orange Idiot must provide reviewed south-facing H3 talk and walk clips', errors);
for (const clip of orangeRequiredMotionClips.filter(Boolean)) {
  for (const frame of clip.frames) assert(typeof frame?.file === 'string' && await exists(localPublicPath(frame.file)), `Orange Idiot H3 ${clip.action} frame is missing: ${frame?.file || '(unnamed)'}`, errors);
}
for (const frame of orangeTalkingFrames) assert(await exists(localPublicPath(frame)), 'Orange Idiot talking frame is missing: ' + frame, errors);
assert(typeof orangeIdiot.preview === 'string' && await exists(localPublicPath(orangeIdiot.preview)), 'Orange Idiot south preview is missing', errors);

const characterReports = [];
for (const character of characters) {
  const report = { id: character.id, folder: character.folder, rotations: 0, clips: 0, frames: 0, grounded: false, errors: [] };
  const previewPath = localPublicPath(character.preview);
  assert(await exists(previewPath), `${character.id}: preview is missing`, report.errors);
  const measured = await alphaBounds(previewPath).catch(() => null);
  const canonical = CHARACTER_ANCHORS[character.id];
  assert(Boolean(canonical), `${character.id}: no canonical feet geometry`, report.errors);
  if (measured && canonical) {
    report.grounded = sameBounds(measured.alphaBounds, canonical.alphaBounds);
    assert(report.grounded, `${character.id}: canonical alpha/feet bounds no longer match the locked export`, report.errors);
  }
  const rotations = character.rotations && typeof character.rotations === 'object' ? Object.values(character.rotations) : [];
  report.rotations = rotations.length;
  assert(rotations.length === 8, `${character.id}: exactly 8 direction exports are required`, report.errors);
  for (const rotation of rotations) assert(await exists(localPublicPath(rotation.file)), `${character.id}: missing rotation ${rotation.file}`, report.errors);
  const clips = Array.isArray(character.clips) ? character.clips : [];
  report.clips = clips.length;
  assert(clips.length >= 2, `${character.id}: at least idle/talk or idle/walk clips are required`, report.errors);
  for (const clip of clips) {
    const frames = Array.isArray(clip.frames) ? clip.frames : [];
    report.frames += frames.length;
    const clipId = String(clip.id || '');
    const isGeneratedPixelLab = /pixellab-/iu.test(clipId);
    const isAnimateWithTextV3 = /(?:^|[-_])v3(?:$|[-_])/iu.test(clipId);
    const minimumFrames = isGeneratedPixelLab ? 6 : 7;
    assert(frames.length >= minimumFrames, `${character.id}/${clip.id}: clip must have at least ${minimumFrames} frames`, report.errors);
    if (isAnimateWithTextV3) assert(frames.length === 6 && Number(clip.frameCount) === 6, `${character.id}/${clip.id}: animate-with-text-v3 clips must have exactly 6 frames`, report.errors);
    for (const frame of frames) assert(await exists(localPublicPath(frame.file)), `${character.id}/${clip.id}: missing ${frame.file}`, report.errors);
  }
  if (report.errors.length) errors.push(...report.errors);
  characterReports.push(report);
}

const sceneReports = [];
for (const scene of Object.values(LOCATION_SPECS)) {
  const backgroundPath = localPublicPath(scene.background);
  const report = { id: scene.id, background: scene.background, walkBands: scene.walkBands.length, floorY: scene.floor.baselineY, valid: await exists(backgroundPath) };
  assert(report.valid, `${scene.id}: background is missing`, errors);
  assert(report.walkBands === 3, `${scene.id}: three semantic walk bands are required`, errors);
  sceneReports.push(report);
}

const rightsReports = [];
for (const track of Array.isArray(rights.tracks) ? rights.tracks : []) {
  const fileValid = Boolean(track.file) && await exists(localPublicPath(track.file));
  const approved = track.status === 'approved' && track.livestream === true && track.vod === true && track.commercial === true;
  rightsReports.push({ id: track.id, status: track.status, approved, fileValid });
  if (track.status === 'approved') {
    assert(fileValid, `approved music ${track.id} is missing its audio file`, errors);
    assert(approved, `approved music ${track.id} is missing livestream/VOD/commercial rights`, errors);
  }
}

if (errors.length) {
  console.error(JSON.stringify({ ok: false, errors }, null, 2));
  process.exitCode = 1;
} else {
  await fs.mkdir(productionRoot, { recursive: true });
  await fs.writeFile(anchorsPath, `${JSON.stringify({ schemaVersion: '1.0', showId: 'bullshit-factory', generatedAt: new Date().toISOString(), anchors: CHARACTER_ANCHORS }, null, 2)}\n`, 'utf8');
  await fs.writeFile(inventoryPath, `${JSON.stringify({
    schemaVersion: '1.0',
    showId: 'bullshit-factory',
    generatedAt: new Date().toISOString(),
    canvas: { width: 384, height: 216, fps: 12, maxColors: 64, scaling: 'nearest-neighbor' },
    counts: { characters: characterReports.length, scenes: sceneReports.length, approvedMusic: rightsReports.filter((track) => track.approved && track.fileValid).length },
    characters: characterReports,
    scenes: sceneReports,
    music: rightsReports,
    writingTraining: { schemaVersion: writingTraining.schemaVersion, sourceIds: writingTraining.sources.map((source) => source.id), beatCount: writingTraining.beatSheet.length, minimumScore: writingTraining.evaluation?.minimumScore || null },
    animationTraining: { schemaVersion: animationTraining.schemaVersion, requiredAnchors: animationTraining.anchorContract.requiredAnchors, parserFields: animationTraining.parserSchema.requiredFields, validationIds: animationTraining.validationCriteria.map((criterion) => criterion.id) },
    tvOnly: { id: orangeIdiot.id, displayName: orangeIdiot.displayName, sceneId: orangeIdiot.sceneId, standaloneSceneId: orangeIdiot.standaloneSceneId, standaloneBackground: orangeIdiot.standaloneBackground, view: orangeIdiot.view, preview: orangeIdiot.preview, talkingFrames: orangeTalkingFrames, motionRegistry: orangeIdiot.animationContract?.motionRegistry || '/bullshit-factory/production/motion-registry.json', motionLibrary: { id: H3_LIBRARY_ID, version: H3_LIBRARY_VERSION, assetRoot: motionRegistry.assetRoot || '/bullshit-factory/motion/v1' }, motionPolicy: motionRegistry.runtimePolicy, acceptedMotionClipIds: orangeRequiredMotionClips.filter(Boolean).map((clip) => clip.id), mainCast: false },
    resolver: { module: 'lib/bullshit-factory-location.mjs', positionRule: 'feet-touch-ground', depthRule: 'feet-y', noArbitraryWorldCoordinates: true },
  }, null, 2)}\n`, 'utf8');
  console.log(`WROTE Bullshit Factory runtime inventory: ${characterReports.length} characters, ${sceneReports.length} scenes, ${rightsReports.filter((track) => track.approved && track.fileValid).length} approved music files.`);
}
