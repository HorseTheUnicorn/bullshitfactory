import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';

import {
  actionDescriptions,
  buildPrompt,
  estimatedCost,
  frameAlphaGeometry,
  h3AssetDirectory,
  normalizeArgs,
  normalizeLedger,
  parseArgs,
  requiredCoverage,
  requiredMissing,
  stabilizeNormalizedFrames,
  updateRegistry,
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

test('writes newly authored clips into the active H3_LIBRARY_V2 asset root', () => {
  const output = h3AssetDirectory('rookboss', 'talk', 'neutral');
  assert.match(output, /motion[\\/]v2[\\/]rookboss[\\/]talk-neutral$/u);
  assert.doesNotMatch(output, /motion[\\/]v1[\\/]/u);
});

test('roots normalized H3 frames to one stable feet anchor', async () => {
  const makeFrame = async (left, top, right, bottom) => {
    const raw = Buffer.alloc(92 * 92 * 4);
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) raw[(y * 92 + x) * 4 + 3] = 255;
    }
    return sharp(raw, { raw: { width: 92, height: 92, channels: 4 } }).png().toBuffer();
  };
  const aligned = await stabilizeNormalizedFrames([
    await makeFrame(25, 38, 47, 78),
    await makeFrame(29, 32, 51, 87),
  ]);
  const geometries = await Promise.all(aligned.map((frame) => frameAlphaGeometry(frame)));
  assert.ok(geometries.every((geometry) => geometry.alphaBounds.bottom === 87));
  assert.ok(geometries.every((geometry) => Math.abs(geometry.rootAnchor.x - 46) <= 1));
});

test('keeps an approved slot live while a replacement candidate awaits review', () => {
  const live = { id: 'live-talk', characterId: 'rookboss', action: 'talk', emotion: 'neutral', direction: 'south', status: 'accepted', reviewStatus: 'accepted' };
  const candidate = { id: 'candidate-talk', characterId: 'rookboss', action: 'talk', emotion: 'neutral', direction: 'south', status: 'accepted', reviewStatus: 'human-review-required' };
  const registry = { status: 'active', runtimePolicy: 'replacement', clips: [live] };

  assert.deepEqual(updateRegistry(registry, candidate, true), []);
  assert.equal(registry.status, 'active');
  assert.equal(registry.clips.find((clip) => clip.id === live.id).status, 'accepted');
  assert.equal(registry.clips.find((clip) => clip.id === candidate.id).reviewStatus, 'human-review-required');
});

test('reconciles persisted H3 duration totals from request records', () => {
  const ledger = normalizeLedger({
    totals: { submittedRequestSeconds: 20, acceptedSeconds: 20 },
    requests: [
      { status: 'accepted', durationSeconds: 5 },
      { status: 'duplicate-slot', durationSeconds: 5 },
      { status: 'accepted', durationSeconds: 5 },
    ],
  });

  assert.equal(ledger.totals.submittedRequestSeconds, 10);
  assert.equal(ledger.totals.acceptedSeconds, 10);
});

test('reconciles H3 spend and request counts without charging duplicate slots', () => {
  const ledger = normalizeLedger({
    totals: { estimatedSpendUsd: 99, submittedRequests: 99, accepted: 99 },
    requests: [
      { status: 'accepted', durationSeconds: 5, estimatedCostUsd: 0.25 },
      { status: 'duplicate-slot', durationSeconds: 5, estimatedCostUsd: 0.4 },
      { status: 'failed', durationSeconds: 5, estimatedCostUsd: 0.25 },
    ],
  });

  assert.equal(ledger.totals.estimatedSpendUsd, 0.5);
  assert.equal(ledger.totals.submittedRequests, 2);
  assert.equal(ledger.totals.accepted, 1);
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
