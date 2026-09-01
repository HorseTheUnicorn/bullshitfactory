import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHARACTER_ANCHORS,
  LOCATION_SPECS,
  buildSceneLayout,
  resolveScenePlacement,
  resolveWalkPath,
  validateSceneLayout,
} from './lib/bullshit-factory-location.mjs';

test('all locked characters expose canonical feet and attachment geometry', () => {
  assert.equal(Object.keys(CHARACTER_ANCHORS).length, 10);
  for (const [id, anchor] of Object.entries(CHARACTER_ANCHORS)) {
    assert.equal(anchor.feetAnchor.y, anchor.groundAnchor.y, `${id} feet/ground y mismatch`);
    assert.equal(anchor.feetAnchor.y, anchor.contactShadowAnchor.y, `${id} shadow y mismatch`);
    assert.ok(anchor.characterWidth > 0 && anchor.characterHeight > 0, `${id} has no measured bounds`);
    assert.ok(anchor.propAttachmentAnchors.handLeft && anchor.propAttachmentAnchors.handRight, `${id} has no hand anchors`);
  }
});

test('factory-floor resolves semantic locations to valid foot-grounded placements', () => {
  const rack = resolveScenePlacement({ sceneId: 'factory-floor', characterId: 'rookboss', near: 'server_rack' });
  const conveyor = resolveScenePlacement({ sceneId: 'factory-floor', characterId: 'bork', near: 'conveyor' });
  assert.equal(rack.walkBand, 'rear');
  assert.equal(conveyor.walkBand, 'middle');
  for (const placement of [rack, conveyor]) {
    assert.equal(placement.groundAnchor.x, placement.feet.x);
    assert.equal(placement.groundAnchor.y, placement.feet.y);
    assert.equal(placement.contactShadowAnchor.y, placement.feet.y);
    assert.equal(placement.depth, placement.feet.y);
    assert.ok(placement.feet.x >= 0 && placement.feet.x <= 384);
    assert.ok(placement.feet.y >= 0 && placement.feet.y <= 216);
  }
});

test('Bork renders smaller than human cast while staying feet grounded', () => {
  const human = resolveScenePlacement({ sceneId: 'factory-floor', characterId: 'rookboss', walkBand: 'middle', x: 0.5 });
  const bork = resolveScenePlacement({ sceneId: 'factory-floor', characterId: 'bork', walkBand: 'middle', x: 0.5 });
  const visibleHeight = (placement) => placement.visibleBounds.bottom - placement.visibleBounds.top + 1;
  assert.equal(bork.characterScale, 0.72);
  assert.ok(visibleHeight(bork) < visibleHeight(human) * 0.85, 'Bork should read materially smaller than a human cast member');
  assert.equal(bork.feet.y, human.feet.y);
  assert.equal(bork.groundAnchor.y, bork.feet.y);
});

test('factory-floor layout supplies entry, stand, exit, and feet-locked navigation', () => {
  const layout = buildSceneLayout('factory-floor', ['rookboss', 'magsrust', 'kernelkline', 'bork']);
  const result = validateSceneLayout(layout, { requireActors: ['rookboss', 'magsrust', 'kernelkline', 'bork'] });
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(layout.depthRule, 'feet-y');
  assert.equal(layout.positionRule, 'feet-touch-ground');
  assert.equal(layout.placements.length, 4);
  for (const placement of layout.placements) {
    assert.ok(placement.entry && placement.exit && placement.walkPath.feetLocked);
  }
});

test('factory-floor cast uses distinct named stations instead of a clustered default', () => {
  const layout = buildSceneLayout('factory-floor', ['rookboss', 'magsrust', 'nico', 'bork']);
  const byId = new Map(layout.placements.map((placement) => [placement.characterId, placement]));
  const rook = byId.get('rookboss');
  const mags = byId.get('magsrust');
  const nico = byId.get('nico');
  const bork = byId.get('bork');
  assert.equal(rook?.intent.near, 'main_floor');
  assert.equal(rook?.walkBand, 'middle');
  assert.equal(mags?.intent.near, 'server_rack');
  assert.equal(mags?.walkBand, 'rear');
  assert.equal(nico?.intent.near, 'shipping_station');
  assert.equal(bork?.intent.near, 'conveyor_left');
  assert.equal(bork?.walkBand, 'middle');
  assert.equal(new Set([rook?.feet.x, mags?.feet.x, nico?.feet.x, bork?.feet.x]).size, 4);
  assert.ok((rook?.feet.y || 0) >= (bork?.feet.y || 0));
  assert.ok((bork?.feet.y || 0) > (mags?.feet.y || 0));
  for (const placement of [rook, mags, nico, bork]) assert.ok((placement?.feet.y || 0) <= 184);
  assert.ok((nico?.sprite.left || 0) >= (bork?.sprite.left || 0) + (bork?.sprite.width || 0) + 6, 'Bork and Nico must have a clear same-band gap');
});

test('loading-dock five-actor shot finds open gaps across the full cast', () => {
  const cast = ['rookboss', 'magsrust', 'kernelkline', 'sudsmcgee', 'bork'];
  const layout = buildSceneLayout('loading-dock', cast);
  const result = validateSceneLayout(layout, { requireActors: cast });
  assert.equal(result.ok, true, result.errors.join('; '));
  assert.equal(layout.placements.length, cast.length);
  assert.equal(new Set(layout.placements.map((placement) => placement.feet.x)).size, cast.length);
});

test('server-room layout packs the real H3 envelope without cross-band collisions', () => {
  const cast = ['kernelkline', 'string', 'karen', 'bork'];
  const envelope = (alphaBounds) => ({ width: 92, height: 92, alphaBounds });
  const layout = buildSceneLayout('server-room', cast, {
    kernelkline: { walkBand: 'rear', near: 'left_rack', x: 0.2, frameGeometry: envelope({ left: 0, top: 4, right: 81, bottom: 87 }) },
    string: { walkBand: 'middle', near: 'server_rack', x: 0.5, frameGeometry: envelope({ left: 22, top: 3, right: 89, bottom: 87 }) },
    karen: { walkBand: 'front', near: 'terminal', x: 0.64, frameGeometry: envelope({ left: 11, top: 4, right: 68, bottom: 87 }) },
    bork: { walkBand: 'rear', near: 'right_rack', x: 0.8, frameGeometry: envelope({ left: 0, top: 8, right: 90, bottom: 87 }) },
  });
  const placements = layout.placements;
  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const left = placements[leftIndex].visibleBounds;
      const right = placements[rightIndex].visibleBounds;
      const overlap = left.left < right.right + 10 && right.left < left.right + 10
        && left.top < right.bottom + 10 && right.top < left.bottom + 10;
      assert.equal(overlap, false, `${placements[leftIndex].characterId} and ${placements[rightIndex].characterId} overlap`);
    }
  }
});

test('crowd rebalancing preserves the measured H3 envelope', () => {
  const cast = ['rookboss', 'magsrust', 'kernelkline', 'sudsmcgee', 'dooby', 'spaulding', 'string', 'karen', 'nico', 'bork'];
  const envelope = { width: 92, height: 92, alphaBounds: { left: 0, top: 3, right: 90, bottom: 87 } };
  const layout = buildSceneLayout('break-room', cast, Object.fromEntries(cast.map((characterId) => [characterId, { frameGeometry: envelope }])));
  const rebalanced = layout.placements.filter((placement) => placement.intent?.placementReason === 'crowd-avoidance');
  assert.ok(rebalanced.length > 0, 'the crowded test cast should exercise band rebalancing');
  for (const placement of rebalanced) assert.deepEqual(placement.layoutGeometry, envelope, `${placement.characterId} lost its H3 envelope during rebalance`);
});

test('full-cast layouts rebalance crowded bands without overlapping sprites', () => {
  const cast = ['rookboss', 'magsrust', 'kernelkline', 'sudsmcgee', 'dooby', 'spaulding', 'string', 'karen', 'nico', 'bork'];
  for (const sceneId of Object.keys(LOCATION_SPECS)) {
    const layout = buildSceneLayout(sceneId, cast);
    const result = validateSceneLayout(layout, { requireActors: cast });
    assert.equal(result.ok, true, `${sceneId}: ${result.errors.join('; ')}`);
  }
});

test('every production location defines a floor and three walk bands', () => {
  assert.equal(Object.keys(LOCATION_SPECS).length, 10);
  for (const scene of Object.values(LOCATION_SPECS)) {
    assert.ok(scene.floor.id && Number.isFinite(scene.floor.baselineY));
    assert.deepEqual(scene.walkBands.map((item) => item.id), ['rear', 'middle', 'front']);
  }
});

test('walk path stays semantic and foot locked', () => {
  const path = resolveWalkPath('factory-floor', { characterId: 'bork', walkBand: 'front' });
  assert.equal(path.valid, true);
  assert.equal(path.feetLocked, true);
  assert.equal(path.waypoints.length, 3);
  assert.notEqual(path.from.feet.x, path.to.feet.x);
});
