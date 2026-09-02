import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PERFORMANCE_PACING_PROFILES,
  choreographPerformance,
  normalizePacingProfile,
  resolveSemanticAction,
} from './bullshit-factory-performance.mjs';

const baseDialogue = [
  {
    id: 'line-1',
    speakerId: 'rookboss',
    text: 'The machine has failed and the memo is on fire.',
    startMs: 1000,
    endMs: 3000,
    reaction: 'Mags realizes the problem is worse than advertised.',
  },
  {
    id: 'line-2',
    speakerId: 'magsrust',
    text: 'That is the most honest machine I have ever met.',
    startMs: 3400,
    endMs: 5200,
    reaction: 'Rook holds the uncomfortable truth.',
  },
];

test('normalizes a named pacing profile and bounded operator overrides', () => {
  const profile = normalizePacingProfile({ id: 'deadpan', reactionHoldMs: 7777 }, baseDialogue);
  assert.equal(profile.id, 'deadpan');
  assert.equal(profile.reactionHoldMs, 5000);
  assert.equal(profile.source, 'director-or-operator');
  assert.equal(PERFORMANCE_PACING_PROFILES.deadpan.punchlineHoldMs, 700);
});

test('compiles deterministic speech, listener, reaction, camera, and state timelines', () => {
  const input = {
    actorIds: ['rookboss', 'magsrust', 'bork'],
    dialogue: baseDialogue,
    barkEvents: [],
    semanticDirections: [],
    storyBeats: [{ id: 'hook', text: 'the machine fails' }, { id: 'button', text: 'the truth lands' }],
    durationMs: 7000,
    seed: 44,
    pacingProfile: 'normal',
  };
  const first = choreographPerformance(input);
  const second = choreographPerformance(input);
  assert.deepEqual(first, second);
  assert.equal(first.timingSource, 'draft-estimate');
  assert.equal(first.baseStatePolicy, 'exactly-one-base-state-plus-at-most-one-compatible-overlay');
  assert.ok(first.events.some((event) => event.id === 'talk-line-1' && event.baseState === 'speaking'));
  assert.ok(first.events.some((event) => event.id === 'listen-line-1' && event.baseState === 'listening'));
  assert.ok(first.events.some((event) => event.id === 'react-line-line-1' && event.baseState === 'reacting'));
  assert.ok(first.camera.some((shot) => shot.type === 'wide_scene' && shot.beatId === 'hook'));
  assert.ok(first.camera.some((shot) => shot.type === 'final_button' && shot.beatId === 'button'));
  assert.ok(first.states.some((state) => state.actorId === 'bork' && state.default));
  for (const event of first.events) {
    assert.ok(event.startMs >= 0);
    assert.ok(event.endMs <= input.durationMs);
    assert.ok(event.endMs > event.startMs);
  }
});

test('resolves the semantic registry without giving Bork human speech actions', () => {
  const human = resolveSemanticAction('talk_angry', { characterId: 'rookboss' });
  assert.equal(human.action, 'talk');
  assert.equal(human.clipAction, 'talk');
  assert.equal(human.corrected, true);
  const bork = resolveSemanticAction('talk', { characterId: 'bork' });
  assert.equal(bork.action, 'react');
  assert.equal(bork.clipAction, 'react');
  assert.equal(bork.corrected, true);
});

test('measured Kokoro timing is preserved and reactions land after the cause', () => {
  const result = choreographPerformance({
    actorIds: ['rookboss', 'magsrust'],
    dialogue: baseDialogue,
    durationMs: 7000,
    seed: 12,
    timingSource: 'measured-kokoro-audio',
  });
  assert.equal(result.timingSource, 'measured-kokoro-audio');
  const cause = result.events.find((event) => event.id === 'talk-line-1');
  const reaction = result.events.find((event) => event.id === 'react-line-line-1');
  assert.ok(cause);
  assert.ok(reaction);
  assert.ok(reaction.startMs >= baseDialogue[0].endMs + 20);
  assert.equal(result.metrics.reactionCooldownMs, PERFORMANCE_PACING_PROFILES.normal.reactionCooldownMs);
});

test('limits an actor to one overlapping compatible overlay and deduplicates reactions', () => {
  const result = choreographPerformance({
    actorIds: ['rookboss', 'magsrust'],
    dialogue: baseDialogue,
    semanticDirections: [
      { character: 'rookboss', action: 'point', line_id: 'line-1', purpose: 'point at the burning memo' },
      { character: 'rookboss', action: 'shrug', line_id: 'line-1', purpose: 'sell the absurdity' },
      { character: 'magsrust', action: 'react', line_id: 'line-1', purpose: 'react after the accusation' },
    ],
    durationMs: 7000,
    seed: 91,
  });
  const overlays = result.events.filter((event) => event.phase === 'overlay' && event.actorId === 'rookboss');
  for (let index = 0; index < overlays.length; index += 1) {
    for (let other = index + 1; other < overlays.length; other += 1) {
      assert.ok(overlays[index].endMs <= overlays[other].startMs || overlays[other].endMs <= overlays[index].startMs);
    }
  }
  const reactionIds = result.events
    .filter((event) => event.actorId === 'magsrust' && event.baseState === 'reacting' && event.lineId === 'line-1')
    .map((event) => event.id);
  assert.equal(new Set(reactionIds).size, reactionIds.length);
  assert.equal(reactionIds.length, 1);
});

test('rejects or corrects travel that would overlap the actor speech window', () => {
  const result = choreographPerformance({
    actorIds: ['rookboss', 'magsrust'],
    dialogue: baseDialogue,
    semanticDirections: [
      { character: 'rookboss', action: 'walk', start_ms: 1500, end_ms: 2600, purpose: 'walk to the machine' },
      { character: 'magsrust', action: 'walk', start_ms: 5600, end_ms: 6600, purpose: 'walk to the machine' },
    ],
    durationMs: 7000,
    seed: 19,
  });
  const rookTravel = result.events.filter((event) => event.actorId === 'rookboss' && event.baseState === 'traveling');
  assert.equal(rookTravel.length, 0);
  const magsTravel = result.events.find((event) => event.actorId === 'magsrust' && event.baseState === 'traveling');
  assert.ok(magsTravel);
  assert.ok(magsTravel.startMs >= baseDialogue[1].endMs);
  assert.ok(result.metrics.illegalTransitionsCorrected >= 1);
});

test('gives Bork a bark event and semantic dog cue without human speech', () => {
  const result = choreographPerformance({
    actorIds: ['rookboss', 'bork'],
    dialogue: [baseDialogue[0]],
    barkEvents: [{ id: 'bork-1', startMs: 3200, endMs: 3600, caption: '[excited yipping]' }],
    durationMs: 5000,
    seed: 7,
  });
  const bark = result.events.find((event) => event.id === 'bork-1');
  assert.equal(bark?.actorId, 'bork');
  assert.equal(bark?.action, 'bark');
  assert.ok(result.audioCues.some((cue) => cue.assetId === 'bf-dog-cue' && cue.tags.includes('dog')));
  assert.equal(result.events.filter((event) => event.actorId === 'bork' && event.action === 'talk').length, 0);
});

test('maps String guitar direction to the dedicated local music cue', () => {
  const resolution = resolveSemanticAction('play guitar', { characterId: 'string' });
  assert.equal(resolution.action, 'interact');
  const result = choreographPerformance({
    actorIds: ['string', 'rookboss'],
    dialogue: [{ id: 'line-guitar', speakerId: 'string', text: 'I am playing guitar for this terrible plan.', startMs: 1000, endMs: 3000 }],
    semanticDirections: [{ character: 'string', action: 'play guitar', line_id: 'line-guitar', prop_id: 'rock-speaker', purpose: 'String plays guitar before the final button' }],
    durationMs: 6000,
    seed: 11,
  });
  assert.ok(result.audioCues.some((cue) => cue.assetId === 'bf-string-guitar' && cue.kind === 'music'));
});
