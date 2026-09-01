import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  DEFAULT_AUDITION_SCRIPT,
  VOICE_CANDIDATE_LABELS,
  VOICE_FORMANT_BOUNDS,
  VOICE_PITCH_BOUNDS,
  VOICE_SPEED_BOUNDS,
  createVoiceCandidates,
  findVoiceCollisions,
  normalizeVoiceRecipe,
  resolveCharacterVoice,
  stockVoiceNames,
  voiceFilterForProfile,
  voiceRecipeDistance,
} from './lib/bullshit-factory-voice.mjs';
import { VoiceProfileStore } from './lib/bullshit-factory-voice-store.mjs';

const ROOK_BIBLE = {
  id: 'rookboss',
  name: 'Rook Boss',
  role: 'Factory boss / foreman',
  personality: 'Reckless, confident, and allergic to admitting that a plan failed.',
  voiceProfile: { mode: 'dialogue' },
};

test('voice candidates are three differentiated, bible-directed Kokoro recipes', () => {
  const candidates = createVoiceCandidates(ROOK_BIBLE, { generationId: 'generation-test', now: '2026-08-31T12:00:00.000Z' });
  assert.deepEqual(candidates.map((candidate) => candidate.label), VOICE_CANDIDATE_LABELS);
  assert.equal(new Set(candidates.map((candidate) => JSON.stringify(candidate.recipe))).size, 3);
  assert.ok(candidates.every((candidate) => candidate.recipe.blend.length === 2));
  assert.equal(candidates[0].embedding.id, 'rookboss-candidate-a');
  assert.match(candidates[0].embedding.source, /blended at inference/u);
  assert.ok(candidates.every((candidate) => candidate.direction.includes('Rook Boss')));
  assert.ok(voiceRecipeDistance(candidates[0], candidates[1]) > 0.1);
  assert.ok(DEFAULT_AUDITION_SCRIPT.split(/\s+/u).length >= 35);
  assert.ok(DEFAULT_AUDITION_SCRIPT.includes('hell') && DEFAULT_AUDITION_SCRIPT.includes('?'));

  const directed = createVoiceCandidates(ROOK_BIBLE, { feedback: 'older, rougher, less nasal' });
  assert.ok(directed[0].recipe.pitchSemitones < candidates[0].recipe.pitchSemitones);
  assert.ok(directed[0].recipe.effects.rasp > candidates[0].recipe.effects.rasp);
  assert.ok(directed[0].recipe.effects.nasality < candidates[0].recipe.effects.nasality);
  assert.deepEqual(createVoiceCandidates({ id: 'bork', isDog: true }), []);
});

test('recipe bounds and DSP profile stay inside production-safe limits', () => {
  const recipe = normalizeVoiceRecipe({
    ttsVoice: 'am_michael',
    blend: [{ voice: 'am_michael', weight: 4 }, { voice: 'bm_george', weight: 1 }],
    speed: 99,
    pitchSemitones: -99,
    formantRatio: 99,
    effects: { rasp: 0.25, saturation: 0.1, chorus: 0.2, nasality: 0.2 },
    eq: { presenceDb: 2 },
  });
  assert.equal(recipe.speed, VOICE_SPEED_BOUNDS.max);
  assert.equal(recipe.pitchSemitones, VOICE_PITCH_BOUNDS.min);
  assert.equal(recipe.formantRatio, VOICE_FORMANT_BOUNDS.max);
  assert.equal(recipe.blend.reduce((sum, entry) => sum + entry.weight, 0), 1);
  const filter = voiceFilterForProfile({ recipe }, { normalize: true });
  assert.match(filter, /asetrate=/u);
  assert.match(filter, /equalizer=/u);
  assert.match(filter, /acrusher=/u);
  assert.match(filter, /chorus=/u);
  assert.match(filter, /acompressor=/u);
  assert.match(filter, /loudnorm=/u);
});

test('character resolution is legacy-compatible until an approved profile exists', () => {
  const legacy = resolveCharacterVoice('rookboss', null, { legacyVoice: 'rookboss', fallbackVoice: 'am_michael' });
  assert.equal(legacy.selected, false);
  assert.equal(legacy.ttsVoice, 'rookboss');
  assert.equal(legacy.fallbackVoice, 'am_michael');

  const candidate = createVoiceCandidates(ROOK_BIBLE)[1];
  const selected = resolveCharacterVoice('rookboss', { ...candidate, version: 1, voiceId: 'rookboss-voice-v1', status: 'selected' }, { fallbackVoice: 'am_michael' });
  assert.equal(selected.selected, true);
  assert.equal(selected.version, 1);
  assert.equal(selected.voiceId, 'rookboss-voice-v1');
  assert.equal(selected.profile.embedding.id, 'rookboss-candidate-b');
  assert.equal(selected.blend.length, 2);
});

test('approved recipe collision reporting flags only close approved recipes', () => {
  const first = createVoiceCandidates({ ...ROOK_BIBLE, id: 'first' })[0];
  const second = { ...first, characterId: 'second' };
  const distinct = createVoiceCandidates({ ...ROOK_BIBLE, id: 'third' })[2];
  assert.equal(findVoiceCollisions([{ ...first, characterId: 'first' }, second]).length, 1);
  assert.equal(findVoiceCollisions([{ ...first, characterId: 'first' }, { ...distinct, characterId: 'third' }]).length, 0);
});

test('the locked Bullshit Factory cast receives complete candidate coverage without assigning Bork Kokoro speech', async () => {
  const bible = JSON.parse(await readFile(path.join('public', 'bullshit-factory', 'production', 'character-bibles.json'), 'utf8'));
  const stock = new Set(stockVoiceNames());
  const characters = Array.isArray(bible.characters) ? bible.characters : [];
  assert.equal(characters.length, 10);
  for (const character of characters) {
    const candidatesForCharacter = createVoiceCandidates(character);
    if (character.id === 'bork') {
      assert.deepEqual(candidatesForCharacter, []);
      continue;
    }
    assert.equal(candidatesForCharacter.length, 3);
    assert.equal(new Set(candidatesForCharacter.map((candidate) => JSON.stringify(candidate.recipe))).size, 3);
    assert.ok(candidatesForCharacter.every((candidate) => candidate.recipe.blend.every((entry) => stock.has(entry.voice))));
  }
});

test('voice profile store persists selection, versions history, and recovers from corruption', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'bf-voice-store-'));
  try {
    let tick = 0;
    const now = () => `2026-08-31T12:00:0${tick++}.000Z`;
    const store = new VoiceProfileStore(root, { now });
    const candidates = createVoiceCandidates(ROOK_BIBLE).map((candidate) => ({
      ...candidate,
      audioFile: `voices/rookboss/audition-${candidate.candidateId}.wav`,
      validation: { status: 'pass', checks: [{ id: 'audio-generated', pass: true }] },
    }));
    await store.writeCandidates('rookboss', { generationId: 'generation-test', candidates });
    await writeFile(store.auditionPath('rookboss', 'a'), Buffer.from('candidate-a-audio'));
    await writeFile(store.auditionPath('rookboss', 'c'), Buffer.from('candidate-c-audio'));
    assert.deepEqual((await store.readProfile('rookboss')).profile, null);
    assert.equal((await store.readProfile('rookboss')).error, null);

    await writeFile(store.profilePath('rookboss'), '{ not valid json', 'utf8');
    const corrupt = await store.readProfile('rookboss');
    assert.equal(corrupt.profile, null);
    assert.match(corrupt.error, /stock fallback remains active/u);

    const first = await store.selectCandidate('rookboss', 'a');
    assert.equal(first.version, 1);
    assert.equal(first.candidateId, 'a');
    assert.equal(first.auditionFile, 'voices/rookboss/selected-v1.wav');
    assert.equal((await readFile(path.join(root, 'rookboss', 'selected-v1.wav'), 'utf8')), 'candidate-a-audio');
    const restartedStore = new VoiceProfileStore(root, { now });
    assert.equal((await restartedStore.readProfile('rookboss')).profile.version, 1);

    await restartedStore.writeCandidates('rookboss', { generationId: 'generation-test-2', candidates });
    const second = await restartedStore.selectCandidate('rookboss', 'c');
    assert.equal(second.version, 2);
    assert.equal(second.auditionFile, 'voices/rookboss/selected-v2.wav');
    assert.equal(JSON.parse(await readFile(path.join(root, 'rookboss', 'history', 'v1.json'), 'utf8')).candidateId, 'a');
    assert.equal((await restartedStore.readProfile('rookboss')).profile.candidateId, 'c');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
