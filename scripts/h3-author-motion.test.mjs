import test from 'node:test';
import assert from 'node:assert/strict';

import {
  actionDescriptions,
  buildPrompt,
  estimatedCost,
  normalizeArgs,
  parseArgs,
  requiredCoverage,
  requiredMissing,
} from './h3-author-motion.mjs';

test('parses and normalizes the five-second H3 authoring contract', () => {
  const parsed = parseArgs([
    '--character', 'RookBoss',
    '--action', 'look-left',
    '--emotion', 'neutral',
    '--resolution', '768p',
    '--duration', '5',
    '--attempts', '2',
  ]);
  const normalized = normalizeArgs(parsed);

  assert.equal(normalized.character, 'rookboss');
  assert.equal(normalized.action, 'look_left');
  assert.equal(normalized.emotion, 'neutral');
  assert.equal(normalized.resolution, '768P');
  assert.equal(normalized.duration, 5);
  assert.equal(normalized.attempts, 2);
});

test('does not skip boolean flags when they are followed by another option', () => {
  const parsed = parseArgs([
    '--character', 'orange-idiot',
    '--action', 'talk',
    '--replace',
    '--dry-run',
    '--attempts', '1',
  ]);
  assert.equal(parsed.replace, true);
  assert.equal(parsed.dryRun, true);
  assert.equal(parsed.attempts, 1);
});

test('rejects non-contract duration and retry counts before a request', () => {
  assert.throws(
    () => normalizeArgs({ ...parseArgs(['--character', 'rookboss', '--action', 'idle']), duration: 4 }),
    /locked to the five-second motion contract/,
  );
  assert.throws(
    () => normalizeArgs({ ...parseArgs(['--character', 'rookboss', '--action', 'idle']), attempts: 3 }),
    /must be 1 or 2/,
  );
});

test('prices H3 requests from the published resolution rates', () => {
  assert.equal(estimatedCost({ duration: 5, resolution: '480P' }), 0.25);
  assert.equal(estimatedCost({ duration: 5, resolution: '768P' }), 0.4);
});

test('builds a controlled prompt that preserves identity and forbids extra content', () => {
  const prompt = buildPrompt({ id: 'rookboss' }, 'talk', 'neutral', 'Keep the megaphone hand readable.', 2);

  assert.match(prompt, /exact identity reference/);
  assert.match(prompt, /One character only/);
  assert.match(prompt, /solid magenta chroma background #ff00ff/);
  assert.match(prompt, /Requested action: talk/);
  assert.match(prompt, /material second take/);
  assert.match(prompt, /Keep the megaphone hand readable/);
  assert.match(prompt, /Do not add dialogue, music, sound effects, or captions/);
});

test('builds Orange Idiot H3 prompts with a direct camera gaze and lateral pacing contract', () => {
  const prompt = buildPrompt({ id: 'orange-idiot' }, 'talk', 'neutral', '', 1);

  assert.match(prompt, /Orange Idiot H3 contract/);
  assert.match(prompt, /head, eyes, and face looking directly at the camera/);
  assert.match(prompt, /left-to-right lateral pace/);
  assert.match(prompt, /short burst-and-pause beats/);
  assert.match(prompt, /do not turn him into profile/);
});

test('exposes the constrained action vocabulary and required coverage', () => {
  assert.equal(typeof actionDescriptions.idle, 'string');
  assert.equal(typeof actionDescriptions.talk, 'string');
  assert.equal(typeof actionDescriptions.bark, 'string');
  assert.deepEqual(requiredCoverage.human, ['idle', 'listen', 'talk', 'react', 'walk']);
  assert.deepEqual(requiredCoverage.bork, ['idle', 'listen', 'bark', 'wag_tail', 'sniff', 'walk']);
  assert.deepEqual(requiredCoverage.orange, ['talk', 'walk']);
});
