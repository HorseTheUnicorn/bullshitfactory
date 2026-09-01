import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIO_MUSIC_POLICY,
  AUDIO_POLICY,
  audioCatalogSummary,
  buildAudioCuePlan,
  normalizeAudioCatalog,
  resolveAudioCuePlan,
} from '../lib/bullshit-factory-audio.mjs';

const catalog = {
  schemaVersion: '1.0',
  showId: 'bullshit-factory',
  assets: [
    { id: 'bf-factory-ambience', kind: 'ambience', file: '/bullshit-factory/music/bf-ambient-bed.wav', loopable: true },
    { id: 'bf-string-guitar', kind: 'music', file: '/bullshit-factory/music/characters/bf-string-guitar.mp3' },
    { id: 'bf-typing', kind: 'sfx', tags: ['technology'], file: '/sfx/typing.wav' },
    { id: 'bf-cartoon-sting', kind: 'stinger', tags: ['story'], file: '/sfx/impact.wav' },
  ],
};

test('normalizes catalog and keeps the loudness policy explicit', () => {
  const normalized = normalizeAudioCatalog(catalog);
  assert.equal(normalized.assets.length, 4);
  assert.equal(normalized.assets[0].status, 'approved');
  assert.equal(AUDIO_POLICY.runtimeNetworkCalls, false);
  assert.equal(normalized.targetLUFS, -18);
});

test('does not inject ambience or musical stingers into normal content audio', () => {
  const plan = buildAudioCuePlan({
    sceneId: 'factory-floor',
    durationSeconds: 20,
    dialogue: [{ id: 'line-1', speakerId: 'nico-box', text: 'The server is typing through the technology memo.', startMs: 1000, endMs: 3000 }],
    storyBeats: [{ id: 'button', text: 'The alarm is a disaster and nobody is ready.' }],
  });
  assert.equal(plan.musicPolicy, AUDIO_MUSIC_POLICY);
  assert.ok(!plan.cues.some((cue) => ['bf-factory-ambience', 'bf-cartoon-sting'].includes(cue.assetId)));
  assert.ok(plan.cues.some((cue) => cue.assetId === 'bf-typing'));
});

test('rejects legacy music asset ids even when an explicit cue omits its kind', () => {
  const plan = buildAudioCuePlan({
    durationSeconds: 20,
    audioCues: [
      { id: 'legacy-theme', assetId: 'bf-theme-main', startMs: 1000, endMs: 3000 },
      { id: 'legacy-bed', assetId: 'bf-garage-stomp', kind: 'music', startMs: 4000, endMs: 6000 },
      { id: 'string-guitar', assetId: 'bf-string-guitar', kind: 'music', startMs: 7000, endMs: 9000 },
    ],
  });
  assert.deepEqual(plan.cues.map((cue) => cue.assetId), ['bf-string-guitar']);
});

test('adds the String guitar cue only for a String guitar performance', () => {
  const stringPlan = buildAudioCuePlan({
    durationSeconds: 20,
    dialogue: [{ id: 'line-1', speakerId: 'string', text: 'This argument needs a guitar solo.', startMs: 1000, endMs: 3000 }],
  });
  const otherPlan = buildAudioCuePlan({
    durationSeconds: 20,
    dialogue: [{ id: 'line-1', speakerId: 'rookboss', text: 'This argument needs a guitar solo.', startMs: 1000, endMs: 3000 }],
  });
  assert.ok(stringPlan.cues.some((cue) => cue.assetId === 'bf-string-guitar' && cue.kind === 'music'));
  assert.ok(!otherPlan.cues.some((cue) => cue.assetId === 'bf-string-guitar'));
});

test('resolves available assets and keeps missing optional cues non-fatal', () => {
  const plan = buildAudioCuePlan({ durationSeconds: 20, dialogue: [{ id: 'line-1', speakerId: 'nico-box', text: 'The server is typing.', startMs: 1000, endMs: 3000 }] });
  const resolved = resolveAudioCuePlan(plan, catalog);
  assert.equal(resolved.status, 'ready');
  assert.ok(resolved.cues.every((cue) => cue.asset?.file));
});

test('a missing String cue never falls back to an unrelated music bed', () => {
  const plan = buildAudioCuePlan({
    durationSeconds: 20,
    audioCues: [{ id: 'string-guitar', assetId: 'bf-string-guitar', kind: 'music', startMs: 1000, endMs: 3000, tags: ['string', 'guitar'] }],
  });
  const resolved = resolveAudioCuePlan(plan, {
    assets: [
      { id: 'bf-garage-stomp', kind: 'music', tags: ['rock', 'guitar'], file: '/music/bed.wav', status: 'approved' },
    ],
  });
  assert.equal(resolved.cues.length, 0);
  assert.equal(resolved.missing[0]?.assetId, 'bf-string-guitar');
});

test('reports catalog counts for the dashboard', () => {
  const summary = audioCatalogSummary(catalog);
  assert.equal(summary.totalAssets, 4);
  assert.equal(summary.byKind.ambience, 1);
  assert.equal(summary.runtimeNetworkCalls, false);
});
