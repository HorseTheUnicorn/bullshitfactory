import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC_PROVIDER, canonicalJob, cacheKeyForJob, publicAudioUrl, stableAudioArguments } from './bullshit-factory-music-adapter.mjs';

test('canonical music jobs are bounded and serialized-friendly', () => {
  const job = canonicalJob({ kind: 'stinger', mood: 'cartoon punk', durationSeconds: 2, seed: 7 });
  assert.equal(job.kind, 'stinger');
  assert.equal(job.durationSeconds, 20);
  assert.equal(job.provider, MUSIC_PROVIDER);
  assert.equal(job.model, 'sm-music');
  assert.equal(job.serialized, true);
  assert.equal(job.generationMode, 'pre-generation-only');
  assert.match(cacheKeyForJob(job), /^[a-f0-9]{64}$/u);
});

test('canonical music jobs use a safe instrumental default', () => {
  const job = canonicalJob({ kind: 'bed', prompt: '', lyrics: '' });
  assert.equal(job.lyrics, '[Instrumental]');
  assert.equal(job.audioFormat, 'mp3');
  assert.match(job.prompt, /instrumental/iu);
  assert.match(job.prompt, /no vocals/iu);
  assert.equal(job.durationSeconds, 30);
});

test('Stable Audio 3 invocation uses the official serialized CLI contract', () => {
  const job = canonicalJob({ prompt: 'muted garage rock', durationSeconds: 30, seed: 7 });
  const args = stableAudioArguments(job, '/tmp/output.wav');
  assert.deepEqual(args, [
    '--prompt', job.prompt,
    '--dit', 'sm-music',
    '--decoder', 'same-s',
    '--precision', 'fp32',
    '--seconds', '30',
    '--steps', '8',
    '--seed', '7',
    '--threads', '8',
    '--out', '/tmp/output.wav',
  ]);
});

test('completed jobs expose a bare cache key for the guarded audio proxy', () => {
  const cacheKey = 'a'.repeat(64);
  assert.equal(publicAudioUrl(cacheKey), '/api/bullshit-factory/music?audioKey=' + cacheKey);
});
