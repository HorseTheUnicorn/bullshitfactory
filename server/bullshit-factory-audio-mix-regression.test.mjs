import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpeechMixFilter } from '../server/bullshit-factory-production.mjs';

const line = { startMs: 1250, endMs: 2250, duration: 1 };

test('speech mix without a music bed has no unconnected sidechain output', () => {
  const filter = buildSpeechMixFilter(line, 0, false, 20);
  assert.match(filter, /\[line0\]$/u);
  assert.doesNotMatch(filter, /asplit|side0/u);
});

test('speech mix with a music bed keeps the sidechain branch', () => {
  const filter = buildSpeechMixFilter(line, 2, true, 20);
  assert.match(filter, /asplit=2\[line2\]\[side2\]$/u);
});
