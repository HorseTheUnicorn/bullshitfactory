import assert from 'node:assert/strict';
import test from 'node:test';
import { auditMotion } from './animation-audit.mjs';

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
