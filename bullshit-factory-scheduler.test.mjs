import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assembleSession,
  evaluateSessionQuality,
  normalizeSessionMinutes,
  SESSION_DURATION_OPTIONS,
} from './lib/bullshit-factory-scheduler.mjs';

test('exposes the complete 5-minute through 24-hour duration ladder', () => {
  assert.equal(SESSION_DURATION_OPTIONS[0].value, 5);
  assert.equal(SESSION_DURATION_OPTIONS.at(-1).value, 1440);
  assert.equal(SESSION_DURATION_OPTIONS.length, 35);
  assert.equal(new Set(SESSION_DURATION_OPTIONS.map((option) => option.value)).size, 35);
});

test('normalizes only to selectable durations', () => {
  assert.equal(normalizeSessionMinutes(7), 5);
  assert.equal(normalizeSessionMinutes(58), 60);
  assert.equal(normalizeSessionMinutes(61), 60);
  assert.equal(normalizeSessionMinutes(90), 60);
  assert.equal(normalizeSessionMinutes(91), 120);
  assert.equal(normalizeSessionMinutes(2000), 1440);
});

test('assembles an exact-duration schedule with recurring Bork coverage', () => {
  const plan = assembleSession(60, 42);
  assert.equal(plan.requestedMinutes, 60);
  assert.equal(plan.exactDurationMinutes, 60);
  assert.equal(plan.blockCount, 12);
  assert.equal(plan.blocks.length, 12);
  assert.equal(plan.dogIncluded, true);
  assert.ok(plan.blocks.some((block) => block.castIds.includes('bork')));
  assert.ok(plan.castCoverage.includes('rookboss'));
  for (let index = 1; index < plan.blocks.length; index += 1) {
    assert.notEqual(plan.blocks[index].category, plan.blocks[index - 1].category);
    assert.notEqual(plan.blocks[index].sceneId, plan.blocks[index - 1].sceneId);
  }
});

test('quality evaluator accepts owned first-party music while keeping final audio review', () => {
  const plan = assembleSession(5, 7);
  const result = evaluateSessionQuality(plan, {
    catalog: {
      activeCastCount: 10,
      characters: Array.from({ length: 10 }, (_, index) => ({
        id: index === 9 ? 'bork' : `character-${index}`,
        isDog: index === 9,
        rotations: { south: {}, east: {}, north: {}, west: {}, 'south-east': {}, 'south-west': {}, 'north-east': {}, 'north-west': {} },
        clips: [{ frameCount: 7 }],
      })),
    },
  });
  assert.equal(result.status, 'review-required');
  assert.equal(result.checks.find((check) => check.id === 'music-rights')?.status, 'ready');
  assert.equal(result.checks.find((check) => check.id === 'audio-lipsync')?.status, 'review-required');
});
