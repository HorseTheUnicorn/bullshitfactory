import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { auditMotion } from './animation-audit.mjs';

const catalog = JSON.parse(fs.readFileSync(fileURLToPath(new URL('../public/bullshit-factory/characters/v1/CHARACTER-CATALOG.json', import.meta.url)), 'utf8'));

const baseRegistry = {
  libraryId: 'H3_LIBRARY_V2',
  libraryVersion: 2,
  assetRoot: '/bullshit-factory/motion/v2',
  status: 'active',
  runtimePolicy: 'replacement',
  legacyRuntimeEligible: false,
};

function clip(overrides = {}) {
  return {
    id: 'h3-test-idle',
    characterId: 'rookboss',
    action: 'idle',
    direction: 'south',
    status: 'accepted',
    reviewStatus: 'accepted',
    source: { kind: 'h3-max-local' },
    frames: Array.from({ length: 6 }, (_, index) => ({ file: `/bullshit-factory/motion/v2/rookboss/idle/south/frame_00${index}.png` })),
    ...overrides,
  };
}

test('accepts a reviewed local H3 clip without requiring runtime network access', () => {
  const report = auditMotion({ ...baseRegistry, clips: [clip()] }, {}, { checkFiles: false, requireCoverage: false });
  assert.equal(report.ok, true);
});

test('rejects legacy motion even when the entry is marked reviewed', () => {
  const report = auditMotion({ ...baseRegistry, clips: [clip({ source: { kind: 'legacy-pixellab' }, frames: [{ file: '/bullshit-factory/characters/v1/RookBoss/Idle/animations/old/south/frame_000.png' }] })] }, {}, { checkFiles: false, requireCoverage: false });
  assert.equal(report.ok, false);
  assert.match(report.errors.join('\n'), /h3-max-local|legacy motion|fewer than six/);
});

test('keeps Bork limited to the dog-only motion vocabulary', () => {
  const bork = catalog.characters.find((character) => character.id === 'bork');
  assert.ok(bork, 'Bork must remain in the locked cast');
  assert.deepEqual(Object.keys(bork.actionRegistry), ['idle', 'listen', 'react', 'bark', 'wag_tail', 'sniff', 'recoil', 'enter', 'walk', 'exit']);
  assert.equal(Object.hasOwn(bork.actionRegistry, 'talk'), false);
  assert.equal(Object.hasOwn(bork.actionRegistry, 'interact'), false);
});
