/*
 * Semantic scene geometry for Bullshit Factory.
 *
 * Coordinates in this module are renderer coordinates, not authoring inputs.
 * Goblin supplies a scene, a walk band, and optionally a named anchor. The
 * resolver owns the floor, scale, depth, and sprite placement math.
 */

export const LOCATION_CANVAS = Object.freeze({ width: 384, height: 216 });
export const ORANGE_IDIOT_STANDALONE_SCENE_ID = 'orange-idiot-house';

const geometry = (sourceWidth, sourceHeight, alphaBounds, interactionY) => {
  const centerX = (alphaBounds.left + alphaBounds.right) / 2;
  return Object.freeze({
    sourceSize: { width: sourceWidth, height: sourceHeight },
    alphaBounds,
    feetAnchor: { x: centerX, y: alphaBounds.bottom },
    groundAnchor: { x: centerX, y: alphaBounds.bottom },
    spritePivot: { x: centerX, y: alphaBounds.bottom },
    characterWidth: alphaBounds.right - alphaBounds.left + 1,
    characterHeight: alphaBounds.bottom - alphaBounds.top + 1,
    locomotionOrigin: { x: centerX, y: alphaBounds.bottom },
    interactionAnchor: { x: centerX, y: interactionY },
    propAttachmentAnchors: {
      handLeft: { x: centerX - Math.max(5, (alphaBounds.right - alphaBounds.left) * 0.28), y: interactionY + 5 },
      handRight: { x: centerX + Math.max(5, (alphaBounds.right - alphaBounds.left) * 0.28), y: interactionY + 5 },
      head: { x: centerX, y: alphaBounds.top + Math.max(5, (alphaBounds.bottom - alphaBounds.top) * 0.18) },
    },
    contactShadowAnchor: { x: centerX, y: alphaBounds.bottom },
  });
};

// These values are measured from the current locked south-facing exports.
// Animation frames are normalized to these same visual feet anchors at render
// time, so transparent PixelLab padding cannot make a character float.
export const CHARACTER_ANCHORS = Object.freeze({
  rookboss: geometry(64, 64, { left: 8, top: 1, right: 58, bottom: 63 }, 30),
  magsrust: geometry(64, 64, { left: 5, top: 2, right: 58, bottom: 61 }, 30),
  kernelkline: geometry(64, 64, { left: 4, top: 1, right: 62, bottom: 62 }, 29),
  sudsmcgee: geometry(64, 64, { left: 14, top: 1, right: 48, bottom: 62 }, 30),
  dooby: geometry(64, 64, { left: 16, top: 1, right: 46, bottom: 62 }, 29),
  spaulding: geometry(64, 64, { left: 9, top: 0, right: 53, bottom: 62 }, 29),
  string: geometry(64, 64, { left: 15, top: 1, right: 57, bottom: 62 }, 29),
  karen: geometry(64, 64, { left: 15, top: 1, right: 45, bottom: 62 }, 29),
  nico: geometry(64, 64, { left: 11, top: 1, right: 55, bottom: 62 }, 29),
  bork: geometry(92, 92, { left: 14, top: 17, right: 58, bottom: 66 }, 46),
});

const band = (id, baselineY, xMin, xMax, scale, depth) => ({
  id,
  baselineY,
  xMin,
  xMax,
  scale,
  depth,
  navigation: { blocked: [], allowed: true },
  entrances: ['left_entrance', 'right_entrance'],
  exits: ['left_entrance', 'right_entrance'],
});

const standardBands = ({ baselineY = 184, xMin = 18, xMax = 366 } = {}) => [
  band('rear', baselineY - 17, xMin + 18, xMax - 18, 0.94, 'rear'),
  band('middle', baselineY, xMin + 4, xMax - 4, 1.05, 'middle'),
  band('front', baselineY + 12, xMin, xMax, 1.14, 'front'),
];

const standardAnchors = {
  left_entrance: { walkBand: 'front', x: 0.03 },
  right_entrance: { walkBand: 'front', x: 0.97 },
  center: { walkBand: 'middle', x: 0.5 },
};

const sceneSpec = (id, label, background, floor, anchors = {}, options = {}) => ({
  id,
  label,
  background,
  floor,
  standingBaselineY: Number.isFinite(options.standingBaselineY) ? options.standingBaselineY : floor.baselineY,
  walkBands: options.walkBands || standardBands(floor),
  anchors: { ...standardAnchors, ...anchors },
  screenAnchors: options.screenAnchors || {},
  broadcastAnchors: options.broadcastAnchors || {},
  characterStations: options.characterStations || {},
  occlusion: options.occlusion || { foreground: [], background: [] },
  navigation: options.navigation || { blocked: [], preferred: 'middle' },
});

export const LOCATION_SPECS = Object.freeze({
  'factory-floor': sceneSpec(
    'factory-floor',
    'Factory floor',
    '/bullshit-factory/scenes/factory-floor.png',
    { id: 'factory-floor-surface', baselineY: 184, xMin: 16, xMax: 368, tolerance: 2 },
    {
      // The supplied background has three physically different surfaces. Keep
      // the director's cast spread tied to named stations so a three-person
      // scene cannot collapse into the generic center/right defaults.
      main_floor: { walkBand: 'middle', x: 0.79 },
      conveyor_left: { walkBand: 'middle', x: 0.14 },
      workbench_left: { walkBand: 'rear', x: 0.40 },
      control_panel: { walkBand: 'middle', x: 0.70 },
      shipping_station: { walkBand: 'middle', x: 0.30 },
      left_entrance: { walkBand: 'middle', x: 0.03 },
      right_entrance: { walkBand: 'middle', x: 0.97 },
      server_rack: { walkBand: 'rear', x: 0.18 },
      conveyor: { walkBand: 'middle', x: 0.52 },
      boss_office_door: { walkBand: 'rear', x: 0.87 },
      breakroom_door: { walkBand: 'rear', x: 0.08 },
      workbench: { walkBand: 'middle', x: 0.54 },
      loading_dock: { walkBand: 'middle', x: 0.88 },
      desk: { walkBand: 'middle', x: 0.72 },
      crate_stack: { walkBand: 'middle', x: 0.29 },
      computer_terminal: { walkBand: 'middle', x: 0.56 },
      machinery: { walkBand: 'middle', x: 0.38 },
    },
    {
      standingBaselineY: 184,
      characterStations: {
        rookboss: { near: 'main_floor' },
        // Keep Mags away from Nico's box silhouette. Nico owns the shipping
        // station; Mags belongs by maintenance/server equipment.
        magsrust: { near: 'server_rack' },
        kernelkline: { near: 'control_panel' },
        sudsmcgee: { near: 'main_floor', x: 0.62 },
        dooby: { near: 'conveyor_left' },
        spaulding: { near: 'loading_dock' },
        string: { near: 'main_floor', x: 0.38 },
        karen: { near: 'control_panel', x: 0.86 },
        nico: { near: 'shipping_station' },
        bork: { near: 'conveyor_left', x: 0.14 },
      },
      occlusion: {
        // The background already contains the catwalk edge; this declaration
        // tells the renderer which depth should be allowed to pass in front.
        foreground: [{ id: 'catwalk-edge', topY: 190, bottomY: 202, coverLowerBody: true }],
        background: [],
      },
    },
  ),
  'break-room': sceneSpec('break-room', 'Break room', '/bullshit-factory/scenes/break-room.png', { id: 'tile-floor', baselineY: 190, xMin: 18, xMax: 366 }, {
    vending_machine: { walkBand: 'rear', x: 0.08 },
    bar: { walkBand: 'middle', x: 0.67 },
    table: { walkBand: 'middle', x: 0.49 },
    stools: { walkBand: 'front', x: 0.6 },
  }),
  'server-room': sceneSpec('server-room', 'Server room', '/bullshit-factory/scenes/server-room.png', { id: 'server-floor', baselineY: 193, xMin: 15, xMax: 369 }, {
    left_rack: { walkBand: 'rear', x: 0.2 },
    server_rack: { walkBand: 'middle', x: 0.5 },
    right_rack: { walkBand: 'rear', x: 0.8 },
    terminal: { walkBand: 'front', x: 0.5 },
  }),
  'boat-bay': sceneSpec('boat-bay', 'Boat bay', '/bullshit-factory/scenes/boat-bay.png', { id: 'dock-surface', baselineY: 158, xMin: 14, xMax: 370 }, {
    dock_left: { walkBand: 'middle', x: 0.2 },
    boat: { walkBand: 'middle', x: 0.52 },
    rope_rack: { walkBand: 'rear', x: 0.76 },
    dock_edge: { walkBand: 'front', x: 0.92 },
  }),
  'loading-dock': sceneSpec('loading-dock', 'Loading dock', '/bullshit-factory/scenes/loading-dock.png', { id: 'loading-lane', baselineY: 190, xMin: 14, xMax: 370 }, {
    forklift: { walkBand: 'middle', x: 0.5 },
    left_pallets: { walkBand: 'rear', x: 0.16 },
    right_pallets: { walkBand: 'rear', x: 0.84 },
    dock_center: { walkBand: 'front', x: 0.5 },
  }),
  'roof-antenna': sceneSpec('roof-antenna', 'Roof antenna', '/bullshit-factory/scenes/roof-antenna.png', { id: 'roof-deck', baselineY: 177, xMin: 20, xMax: 364 }, {
    antenna: { walkBand: 'rear', x: 0.2 },
    vent: { walkBand: 'middle', x: 0.56 },
    railing: { walkBand: 'front', x: 0.8 },
  }),
  'employee-bar': sceneSpec('employee-bar', 'Employee bar', '/bullshit-factory/scenes/employee-bar.png', { id: 'bar-floor', baselineY: 191, xMin: 14, xMax: 370 }, {
    taps: { walkBand: 'rear', x: 0.55 },
    stools: { walkBand: 'middle', x: 0.52 },
    jukebox: { walkBand: 'rear', x: 0.84 },
    bar_center: { walkBand: 'front', x: 0.5 },
  }),
  'marina-slip': sceneSpec('marina-slip', 'Marina slip', '/bullshit-factory/scenes/marina-slip.png', { id: 'marina-dock', baselineY: 178, xMin: 16, xMax: 368 }, {
    dock_left: { walkBand: 'middle', x: 0.18 },
    sailboat: { walkBand: 'rear', x: 0.48 },
    pier: { walkBand: 'front', x: 0.82 },
  }),
  'arcade-closet': sceneSpec('arcade-closet', 'Legacy systems closet', '/bullshit-factory/scenes/arcade-closet.png', { id: 'closet-floor', baselineY: 191, xMin: 16, xMax: 368 }, {
    left_terminal: { walkBand: 'rear', x: 0.18 },
    center_terminal: { walkBand: 'middle', x: 0.5 },
    right_terminal: { walkBand: 'rear', x: 0.82 },
    chair: { walkBand: 'front', x: 0.63 },
  }),
  'senior-lounge': sceneSpec('senior-lounge', 'Senior lounge', '/bullshit-factory/scenes/senior-lounge.png', { id: 'lounge-floor', baselineY: 190, xMin: 16, xMax: 368 }, {
    television: { walkBand: 'rear', x: 0.5 },
    sofa: { walkBand: 'middle', x: 0.5 },
    left_chair: { walkBand: 'front', x: 0.2 },
    right_chair: { walkBand: 'front', x: 0.8 },
  }, {
    // Measured display area in the locked 384x216 background. TV-only
    // characters use this rectangle and never enter a walk band.
    screenAnchors: {
      television: { left: 181, top: 63, width: 27, height: 19 },
    },
  }),
  [ORANGE_IDIOT_STANDALONE_SCENE_ID]: sceneSpec(
    ORANGE_IDIOT_STANDALONE_SCENE_ID,
    'Orange Idiot house',
    '/bullshit-factory/scenes/orange-idiot-house.png',
    { id: 'house-yard', baselineY: 190, xMin: 24, xMax: 360, tolerance: 2 },
    {
      center_stage: { walkBand: 'middle', x: 0.5 },
      house_path: { walkBand: 'middle', x: 0.5 },
    },
    {
      standingBaselineY: 190,
      broadcastAnchors: {
        orangeIdiot: {
          centerX: 192,
          spriteWidth: 64,
          spriteHeight: 64,
          spriteBottomY: 190,
        },
      },
    },
  ),
});

export function getLocationSpec(sceneId) {
  return LOCATION_SPECS[sceneId] || LOCATION_SPECS['factory-floor'];
}

export function getCharacterGeometry(characterId) {
  return CHARACTER_ANCHORS[characterId] || CHARACTER_ANCHORS.rookboss;
}

function cleanBandId(value) {
  const normalized = String(value || '').trim().toLowerCase().replace(/[- ]/gu, '_');
  return normalized.endsWith('_walk_band') ? normalized.slice(0, -10) : normalized;
}

function cleanUnit(value, fallback = 0.5) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function bandFor(scene, requestedBand, namedAnchor) {
  const candidate = cleanBandId(namedAnchor?.walkBand || requestedBand || scene.navigation.preferred || 'middle');
  return scene.walkBands.find((item) => item.id === candidate) || scene.walkBands.find((item) => item.id === 'middle') || scene.walkBands[0];
}

function frameGeometryFor(characterId, frameGeometry) {
  const canonical = getCharacterGeometry(characterId);
  if (!frameGeometry || !Number.isFinite(Number(frameGeometry.width)) || !Number.isFinite(Number(frameGeometry.height)) || !frameGeometry.alphaBounds) return canonical;
  const bounds = frameGeometry.alphaBounds;
  const centerX = (bounds.left + bounds.right) / 2;
  return {
    ...canonical,
    sourceSize: { width: Number(frameGeometry.width), height: Number(frameGeometry.height) },
    alphaBounds: bounds,
    feetAnchor: { x: centerX, y: bounds.bottom },
    groundAnchor: { x: centerX, y: bounds.bottom },
    spritePivot: { x: centerX, y: bounds.bottom },
    characterWidth: bounds.right - bounds.left + 1,
    characterHeight: bounds.bottom - bounds.top + 1,
    locomotionOrigin: { x: centerX, y: bounds.bottom },
    contactShadowAnchor: { x: centerX, y: bounds.bottom },
  };
}

export function resolveScenePlacement({ sceneId = 'factory-floor', characterId = 'rookboss', walkBand = 'middle', x = 0.5, near = null, frameGeometry = null } = {}) {
  const scene = getLocationSpec(sceneId);
  const namedAnchor = near && scene.anchors[near] ? scene.anchors[near] : null;
  const resolvedBand = bandFor(scene, walkBand, namedAnchor);
  const character = frameGeometryFor(characterId, frameGeometry);
  const unitX = cleanUnit(namedAnchor?.x ?? x);
  const scale = resolvedBand.scale;
  const halfWidth = Math.max(3, (character.characterWidth * scale) / 2);
  const feetX = Math.round(Math.max(resolvedBand.xMin + halfWidth, Math.min(resolvedBand.xMax - halfWidth, resolvedBand.xMin + (resolvedBand.xMax - resolvedBand.xMin) * unitX)));
  const feetY = Math.min(scene.standingBaselineY, Math.round(resolvedBand.baselineY + Number(namedAnchor?.offsetY || 0)));
  const spriteLeft = Math.round(feetX - character.feetAnchor.x * scale);
  const spriteTop = Math.round(feetY - character.feetAnchor.y * scale);
  const spriteWidth = Math.max(1, Math.round(character.sourceSize.width * scale));
  const spriteHeight = Math.max(1, Math.round(character.sourceSize.height * scale));
  const visibleBounds = {
    left: Math.round(spriteLeft + character.alphaBounds.left * scale),
    top: Math.round(spriteTop + character.alphaBounds.top * scale),
    right: Math.round(spriteLeft + (character.alphaBounds.right + 1) * scale) - 1,
    bottom: Math.round(spriteTop + (character.alphaBounds.bottom + 1) * scale) - 1,
  };
  const shadowWidth = Math.max(8, Math.round(character.characterWidth * scale * (characterId === 'bork' ? 0.78 : 0.72)));
  return {
    characterId,
    sceneId: scene.id,
    location: scene.id,
    intent: { location: scene.id, walkBand: resolvedBand.id, near: near || null, x: unitX },
    walkBand: resolvedBand.id,
    feet: { x: feetX, y: feetY },
    feetAnchor: { ...character.feetAnchor },
    groundAnchor: { x: feetX, y: feetY },
    spritePivot: { x: spriteLeft + character.spritePivot.x * scale, y: spriteTop + character.spritePivot.y * scale },
    characterWidth: character.characterWidth,
    characterHeight: character.characterHeight,
    locomotionOrigin: { x: feetX, y: feetY },
    interactionAnchor: { x: Math.round(spriteLeft + character.interactionAnchor.x * scale), y: Math.round(spriteTop + character.interactionAnchor.y * scale) },
    propAttachmentAnchors: Object.fromEntries(Object.entries(character.propAttachmentAnchors).map(([key, value]) => [key, { x: Math.round(spriteLeft + value.x * scale), y: Math.round(spriteTop + value.y * scale) }])),
    contactShadowAnchor: { x: feetX, y: feetY },
    depth: feetY,
    scale,
    sprite: { left: spriteLeft, top: spriteTop, width: spriteWidth, height: spriteHeight },
    visibleBounds,
    contactShadow: { x: feetX, y: feetY + 1, width: shadowWidth, height: Math.max(2, Math.round(shadowWidth * 0.16)) },
    floor: { id: scene.floor.id, baselineY: scene.floor.baselineY, tolerance: scene.floor.tolerance },
    standingBaselineY: scene.standingBaselineY,
    navigation: { valid: true, blocked: resolvedBand.navigation.blocked, allowed: resolvedBand.navigation.allowed },
  };
}

export function resolveWalkPath(sceneId, { characterId = 'rookboss', walkBand = 'middle', from = 'left_entrance', to = 'right_entrance', frameGeometry = null } = {}) {
  const start = resolveScenePlacement({ sceneId, characterId, walkBand, near: from, frameGeometry });
  const end = resolveScenePlacement({ sceneId, characterId, walkBand, near: to, frameGeometry });
  const midpoint = resolveScenePlacement({ sceneId, characterId, walkBand, x: 0.5, frameGeometry });
  return {
    valid: start.navigation.valid && end.navigation.valid,
    sceneId: getLocationSpec(sceneId).id,
    characterId,
    walkBand: start.walkBand,
    from: start,
    waypoints: [start, midpoint, end],
    to: end,
    distancePx: Math.abs(end.feet.x - start.feet.x),
    feetLocked: true,
  };
}

const DEFAULT_NEARS = {
  'factory-floor': ['left_entrance', 'server_rack', 'workbench', 'right_entrance'],
  'break-room': ['vending_machine', 'table', 'bar', 'right_entrance'],
  'server-room': ['left_rack', 'server_rack', 'terminal', 'right_rack'],
  'boat-bay': ['dock_left', 'boat', 'rope_rack', 'dock_edge'],
  'loading-dock': ['left_pallets', 'forklift', 'dock_center', 'right_pallets'],
  'roof-antenna': ['antenna', 'vent', 'railing', 'right_entrance'],
  'employee-bar': ['jukebox', 'stools', 'bar_center', 'right_entrance'],
  'marina-slip': ['dock_left', 'sailboat', 'pier', 'right_entrance'],
  'arcade-closet': ['left_terminal', 'center_terminal', 'chair', 'right_terminal'],
  'senior-lounge': ['left_chair', 'sofa', 'right_chair', 'right_entrance'],
};

const DEFAULT_BANDS = ['rear', 'middle', 'middle', 'front', 'front', 'rear'];

const MIN_ACTOR_GAP_PX = 6;
const MIN_VISIBLE_ACTOR_GAP_PX = 9;

function bandById(scene, bandId) {
  return scene.walkBands.find((band) => band.id === bandId) || scene.walkBands.find((band) => band.id === 'middle') || scene.walkBands[0];
}

function placementLeftExtent(placement) {
  const left = placement?.visibleBounds?.left ?? placement?.sprite?.left ?? 0;
  return Math.max(3, Number(placement?.feet?.x || 0) - Number(left));
}

function placementRightExtent(placement) {
  const right = placement?.visibleBounds?.right ?? ((placement?.sprite?.left || 0) + (placement?.sprite?.width || 0));
  return Math.max(3, Number(right) - Number(placement?.feet?.x || 0));
}

function bandCapacity(scene, bandId) {
  const band = bandById(scene, bandId);
  return Math.max(1, band.xMax - band.xMin);
}

function requiredBandWidth(placements) {
  return placements.reduce((total, placement) => total + placementLeftExtent(placement) + placementRightExtent(placement), 0)
    + Math.max(0, placements.length - 1) * MIN_VISIBLE_ACTOR_GAP_PX;
}

function repositionPlacementX(placement, feetX, scene) {
  const band = bandById(scene, placement.walkBand);
  const nextX = Math.round(feetX);
  const deltaX = nextX - placement.feet.x;
  const shift = (point) => point ? { x: Math.round(point.x + deltaX), y: Math.round(point.y) } : point;
  const unitX = (nextX - band.xMin) / Math.max(1, band.xMax - band.xMin);
  return {
    ...placement,
    intent: { ...placement.intent, walkBand: placement.walkBand, x: cleanUnit(unitX) },
    feet: { x: nextX, y: placement.feet.y },
    groundAnchor: { x: nextX, y: placement.feet.y },
    spritePivot: shift(placement.spritePivot),
    locomotionOrigin: { x: nextX, y: placement.feet.y },
    interactionAnchor: shift(placement.interactionAnchor),
    propAttachmentAnchors: Object.fromEntries(Object.entries(placement.propAttachmentAnchors || {}).map(([key, value]) => [key, shift(value)])),
    contactShadowAnchor: { x: nextX, y: placement.feet.y },
    depth: placement.feet.y,
    sprite: { ...placement.sprite, left: Math.round(placement.sprite.left + deltaX) },
    visibleBounds: placement.visibleBounds ? { ...placement.visibleBounds, left: Math.round(placement.visibleBounds.left + deltaX), right: Math.round(placement.visibleBounds.right + deltaX) } : placement.visibleBounds,
    contactShadow: { ...placement.contactShadow, x: nextX },
  };
}

function separateMagsAndNico(placements, scene) {
  const mags = placements.find((placement) => placement.characterId === 'magsrust');
  const nico = placements.find((placement) => placement.characterId === 'nico');
  if (!mags || !nico) return placements;
  const requiredGap = Math.max(96, placementRightExtent(mags) + placementLeftExtent(nico) + MIN_ACTOR_GAP_PX);
  if (Math.abs(mags.feet.x - nico.feet.x) >= requiredGap) return placements;

  const repositionWithinBand = (placement, unitX) => {
    const band = bandById(scene, placement.walkBand);
    const minimum = band.xMin + placementLeftExtent(placement);
    const maximum = band.xMax - placementRightExtent(placement);
    return repositionPlacementX(placement, minimum + (maximum - minimum) * unitX, scene);
  };
  return placements.map((placement) => {
    if (placement.characterId === 'magsrust') return repositionWithinBand(placement, 0.22);
    if (placement.characterId === 'nico') return repositionWithinBand(placement, 0.78);
    return placement;
  });
}

function reResolvePlacementBand(placement, sceneId, bandId) {
  const base = resolveScenePlacement({
    sceneId,
    characterId: placement.characterId,
    walkBand: bandId,
    x: placement.intent?.x ?? 0.5,
  });
  return {
    ...base,
    intent: {
      ...base.intent,
      near: placement.intent?.near || null,
      requestedWalkBand: placement.intent?.requestedWalkBand || placement.walkBand,
      placementReason: 'crowd-avoidance',
    },
  };
}

function rebalanceCrowdedBands(placements, scene) {
  const groups = new Map(scene.walkBands.map((band) => [band.id, []]));
  for (const placement of placements) {
    const group = groups.get(placement.walkBand) || groups.get('middle');
    group.push(placement);
  }

  // Keep the requested semantic station whenever the band can hold it. If a
  // scene is asked to show the entire cast, move only the excess actors to a
  // different legal band before horizontal spacing. Rook stays in his
  // requested band unless he is the only actor available to move.
  for (const sourceBand of scene.walkBands) {
    const source = groups.get(sourceBand.id) || [];
    while (source.length > 1 && requiredBandWidth(source) > bandCapacity(scene, sourceBand.id)) {
      const movableIndex = source.findIndex((placement) => placement.characterId !== 'rookboss');
      const index = movableIndex >= 0 ? movableIndex : source.length - 1;
      const [moved] = source.splice(index, 1);
      const targets = scene.walkBands
        .filter((band) => band.id !== sourceBand.id)
        .map((band) => {
          const items = groups.get(band.id) || [];
          return {
            band,
            items,
            load: requiredBandWidth(items) / bandCapacity(scene, band.id),
          };
        })
        .sort((a, b) => a.load - b.load);
      const target = targets[0];
      if (!target) {
        source.push(moved);
        break;
      }
      const reassigned = reResolvePlacementBand(moved, scene.id, target.band.id);
      target.items.push(reassigned);
    }
  }
  return [...groups.values()].flat();
}

function spreadBandPlacements(placements, scene) {
  const byBand = new Map(scene.walkBands.map((band) => [band.id, []]));
  for (const placement of placements) (byBand.get(placement.walkBand) || byBand.get('middle')).push(placement);
  const result = [];
  for (const band of scene.walkBands) {
    const items = (byBand.get(band.id) || []).slice().sort((a, b) => a.feet.x - b.feet.x || a.characterId.localeCompare(b.characterId));
    if (items.length < 2) {
      result.push(...items);
      continue;
    }
    const leftExtents = items.map(placementLeftExtent);
    const rightExtents = items.map(placementRightExtent);
    const minimums = leftExtents.map((extent) => band.xMin + extent);
    const maximums = rightExtents.map((extent) => band.xMax - extent);
    const positions = items.map((item, index) => Math.max(minimums[index], Math.min(maximums[index], item.feet.x)));
    for (let index = 1; index < positions.length; index += 1) {
      positions[index] = Math.max(positions[index], positions[index - 1] + rightExtents[index - 1] + leftExtents[index] + MIN_VISIBLE_ACTOR_GAP_PX);
    }
    if (positions.at(-1) > maximums.at(-1)) {
      positions[positions.length - 1] = maximums.at(-1);
      for (let index = positions.length - 2; index >= 0; index -= 1) {
        positions[index] = Math.min(positions[index], positions[index + 1] - leftExtents[index + 1] - rightExtents[index] - MIN_VISIBLE_ACTOR_GAP_PX);
      }
    }
    if (positions[0] < minimums[0]) {
      positions[0] = minimums[0];
      for (let index = 1; index < positions.length; index += 1) {
        positions[index] = positions[index - 1] + rightExtents[index - 1] + leftExtents[index] + MIN_VISIBLE_ACTOR_GAP_PX;
      }
    }
    result.push(...items.map((placement, index) => repositionPlacementX(placement, positions[index], scene)));
  }
  return result;
}

function sameBandCollisionPair(placements) {
  const byBand = new Map();
  for (const placement of placements) {
    const group = byBand.get(placement.walkBand) || [];
    group.push(placement);
    byBand.set(placement.walkBand, group);
  }
  for (const group of byBand.values()) {
    const ordered = group.slice().sort((left, right) => (left.visibleBounds?.left ?? left.sprite.left) - (right.visibleBounds?.left ?? right.sprite.left));
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = ordered[index - 1];
      const current = ordered[index];
      const previousRight = Number(previous.visibleBounds?.right ?? (previous.sprite.left + previous.sprite.width - 1));
      const currentLeft = Number(current.visibleBounds?.left ?? current.sprite.left);
      if (currentLeft < previousRight + MIN_VISIBLE_ACTOR_GAP_PX) return { previous, current };
    }
  }
  return null;
}

function resolveSameBandCollisions(placements, scene) {
  let current = placements.slice();
  const limit = Math.max(1, placements.length * scene.walkBands.length * 3);
  for (let pass = 0; pass < limit; pass += 1) {
    current = spreadBandPlacements(current, scene);
    const collision = sameBandCollisionPair(current);
    if (!collision) return current;
    const sourceBand = collision.current.walkBand;
    const mover = collision.current.characterId === 'rookboss' && collision.previous.characterId !== 'rookboss'
      ? collision.previous
      : collision.current;
    const targets = scene.walkBands
      .filter((band) => band.id !== sourceBand)
      .map((band) => {
        const items = current.filter((placement) => placement.walkBand === band.id);
        return { band, load: requiredBandWidth(items) / bandCapacity(scene, band.id), count: items.length };
      })
      .sort((left, right) => left.load - right.load || left.count - right.count);
    if (!targets.length) return current;
    const reassigned = reResolvePlacementBand(mover, scene.id, targets[0].band.id);
    current = current.filter((placement) => placement.characterId !== mover.characterId).concat(reassigned);
  }
  return spreadBandPlacements(current, scene);
}

function verticalPlacementOverlap(left, right, gap = MIN_VISIBLE_ACTOR_GAP_PX) {
  const leftBounds = left?.visibleBounds || { top: left?.sprite?.top || 0, bottom: (left?.sprite?.top || 0) + (left?.sprite?.height || 0) - 1 };
  const rightBounds = right?.visibleBounds || { top: right?.sprite?.top || 0, bottom: (right?.sprite?.top || 0) + (right?.sprite?.height || 0) - 1 };
  const topEdge = Number(leftBounds.top || 0);
  const bottomEdge = Number(leftBounds.bottom || 0);
  const otherTopEdge = Number(rightBounds.top || 0);
  const otherBottomEdge = Number(rightBounds.bottom || 0);
  return topEdge < otherBottomEdge + gap && otherTopEdge < bottomEdge + gap;
}

// Resolve all actors that occupy overlapping screen rows as one horizontal
// packing problem. The previous same-band-only pass could leave a rear actor
// visually crossing a middle/front actor even though both individual bands
// were valid. Packing from the right reserves the requested Rook position and
// pushes the other actors left only when their visible bounds need room.
function separateVisiblePlacements(placements, scene) {
  // For normal shot sizes, solve screen-space visible bounds across bands.
  // A full cast grid uses the band solver above so each band stays packed and
  // the shot planner can choose a readable subset without moving actors into
  // one another's silhouettes.
  if (placements.length > 5) return placements;
  const ordered = placements.slice().sort((left, right) => left.feet.x - right.feet.x || left.characterId.localeCompare(right.characterId));
  const resolved = new Map();
  for (let index = ordered.length - 1; index >= 0; index -= 1) {
    const placement = ordered[index];
    const band = bandById(scene, placement.walkBand);
    const leftExtent = placementLeftExtent(placement);
    const rightExtent = placementRightExtent(placement);
    const minimum = band.xMin + leftExtent;
    const maximum = band.xMax - rightExtent;
    let feetX = Math.max(minimum, Math.min(maximum, placement.feet.x));
    for (let nextIndex = index + 1; nextIndex < ordered.length; nextIndex += 1) {
      const rightPlacement = resolved.get(ordered[nextIndex].characterId);
      if (!rightPlacement || !verticalPlacementOverlap(placement, rightPlacement)) continue;
      feetX = Math.min(feetX, rightPlacement.feet.x - placementLeftExtent(rightPlacement) - rightExtent - MIN_VISIBLE_ACTOR_GAP_PX);
    }
    if (feetX < minimum) feetX = minimum;
    resolved.set(placement.characterId, repositionPlacementX(placement, feetX, scene));
  }
  return placements.map((placement) => resolved.get(placement.characterId) || placement);
}


function rectanglesOverlap(left, right, gap = 0) {
  const leftBounds = left?.visibleBounds || { left: left?.sprite?.left || 0, top: left?.sprite?.top || 0, right: (left?.sprite?.left || 0) + (left?.sprite?.width || 0) - 1, bottom: (left?.sprite?.top || 0) + (left?.sprite?.height || 0) - 1 };
  const rightBounds = right?.visibleBounds || { left: right?.sprite?.left || 0, top: right?.sprite?.top || 0, right: (right?.sprite?.left || 0) + (right?.sprite?.width || 0) - 1, bottom: (right?.sprite?.top || 0) + (right?.sprite?.height || 0) - 1 };
  return leftBounds.left < rightBounds.right + 1 + gap
    && rightBounds.left < leftBounds.right + 1 + gap
    && leftBounds.top < rightBounds.bottom + 1 + gap
    && rightBounds.top < leftBounds.bottom + 1 + gap;
}

function placementFitsVisibleBounds(candidate, others) {
  return others.every((other) => !rectanglesOverlap(candidate, other, MIN_VISIBLE_ACTOR_GAP_PX));
}

function legalFeetRange(placement, scene) {
  const band = bandById(scene, placement.walkBand);
  return {
    minimum: band.xMin + placementLeftExtent(placement),
    maximum: band.xMax - placementRightExtent(placement),
  };
}

function resolveCrossBandCollisions(placements, scene) {
  let current = placements.slice();
  const limit = Math.max(1, placements.length * placements.length * 3);
  for (let pass = 0; pass < limit; pass += 1) {
    let collision = null;
    for (let leftIndex = 0; leftIndex < current.length && !collision; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < current.length; rightIndex += 1) {
        if (rectanglesOverlap(current[leftIndex], current[rightIndex], MIN_VISIBLE_ACTOR_GAP_PX)) {
          collision = { left: current[leftIndex], right: current[rightIndex] };
          break;
        }
      }
    }
    if (!collision) return current;
    const movable = collision.left.characterId === 'rookboss'
      ? [collision.right]
      : collision.right.characterId === 'rookboss'
        ? [collision.left]
        : [collision.left, collision.right].sort((left, right) => right.feet.x - left.feet.x);
    let repaired = false;
    for (const mover of movable) {
      const range = legalFeetRange(mover, scene);
      const others = current.filter((item) => item.characterId !== mover.characterId);
      const candidateXs = [
        mover.feet.x,
        (range.minimum + range.maximum) / 2,
        ...others.flatMap((other) => {
          const otherLeft = other.visibleBounds?.left ?? other.sprite.left;
          const otherRight = other.visibleBounds?.right ?? (other.sprite.left + other.sprite.width - 1);
          return [
            otherRight + MIN_VISIBLE_ACTOR_GAP_PX + 1 + placementLeftExtent(mover),
            otherLeft - MIN_VISIBLE_ACTOR_GAP_PX - 1 - placementRightExtent(mover),
          ];
        }),
      ];
      const uniqueCandidates = [...new Set(candidateXs.map((candidateX) => Math.round(Math.max(range.minimum, Math.min(range.maximum, candidateX)))))];
      uniqueCandidates.sort((left, right) => Math.abs(left - mover.feet.x) - Math.abs(right - mover.feet.x));
      for (const feetX of uniqueCandidates) {
        const candidate = repositionPlacementX(mover, feetX, scene);
        if (placementFitsVisibleBounds(candidate, others)) {
          current = others.concat(candidate);
          repaired = true;
          break;
        }
      }
      if (repaired) break;
    }
    if (repaired) continue;
    const mover = movable[0];
    const targets = scene.walkBands
      .filter((band) => band.id !== mover.walkBand)
      .map((band) => {
        const reassigned = reResolvePlacementBand(mover, scene.id, band.id);
        const others = current.filter((item) => item.characterId !== mover.characterId);
        return { reassigned, valid: placementFitsVisibleBounds(reassigned, others), load: requiredBandWidth(others.filter((item) => item.walkBand === band.id)) / bandCapacity(scene, band.id) };
      })
      .filter((item) => item.valid)
      .sort((left, right) => left.load - right.load);
    if (!targets.length) return current;
    current = current.filter((item) => item.characterId !== mover.characterId).concat(targets[0].reassigned);
  }
  return current;
}


export function buildSceneLayout(sceneId, characterIds = [], requests = {}) {
  const scene = getLocationSpec(sceneId);
  const ids = [...new Set(characterIds)].slice(0, 10);
  const nears = DEFAULT_NEARS[scene.id] || DEFAULT_NEARS['factory-floor'];
  const defaultBands = scene.id === 'factory-floor' ? ['middle', 'rear', 'middle', 'middle', 'middle', 'rear'] : DEFAULT_BANDS;
  const initialPlacements = ids.map((characterId, index) => {
    const request = { ...(scene.characterStations?.[characterId] || {}), ...(requests[characterId] || {}) };
    const near = request.near || nears[index % nears.length];
    const walkBand = request.walkBand || defaultBands[index % defaultBands.length];
    const stand = resolveScenePlacement({ sceneId: scene.id, characterId, walkBand, x: request.x ?? ((index + 1) / (ids.length + 1)), near, frameGeometry: request.frameGeometry });
    stand.intent = { ...stand.intent, requestedWalkBand: walkBand };
    return stand;
  });
  const separatedPlacements = separateMagsAndNico(initialPlacements, scene);
  const separatedBands = resolveSameBandCollisions(rebalanceCrowdedBands(separatedPlacements, scene), scene);
  const visibleSeparated = ids.length <= 5 ? resolveCrossBandCollisions(separateVisiblePlacements(separatedBands, scene), scene) : separateVisiblePlacements(separatedBands, scene);
  const placements = visibleSeparated.map((stand, index) => {
    const entrySide = index % 2 ? 'right_entrance' : 'left_entrance';
    const exitSide = entrySide === 'left_entrance' ? 'right_entrance' : 'left_entrance';
    const entry = resolveScenePlacement({ sceneId: scene.id, characterId: stand.characterId, walkBand: stand.walkBand, x: entrySide === 'left_entrance' ? 0 : 1 });
    const exit = resolveScenePlacement({ sceneId: scene.id, characterId: stand.characterId, walkBand: stand.walkBand, x: exitSide === 'left_entrance' ? 0 : 1 });
    return {
      ...stand,
      entry,
      exit,
      walkPath: { entry: entry.feet, stand: stand.feet, exit: exit.feet, feetLocked: true },
      movement: { enters: true, walksToStand: true, leaves: true, locomotion: 'authored-walk-cycle' },
    };
  }).sort((a, b) => a.depth - b.depth || a.feet.x - b.feet.x);
  return {
    sceneId: scene.id,
    semantic: true,
    floor: scene.floor,
    standingBaselineY: scene.standingBaselineY,
    walkBands: scene.walkBands,
    placements,
    occlusion: scene.occlusion,
    depthRule: 'feet-y',
    positionRule: 'feet-touch-ground',
    spacingRule: `visible sprite bounds separated by at least ${MIN_VISIBLE_ACTOR_GAP_PX} pixels in every walk band`,
    noArbitraryWorldCoordinates: true,
  };
}

export function validateSceneLayout(layout, { requireActors = [] } = {}) {
  const errors = [];
  if (!layout?.semantic || layout.positionRule !== 'feet-touch-ground') errors.push('layout must resolve semantic feet-grounded positions');
  if (layout?.depthRule !== 'feet-y') errors.push('layout depth must derive from feet y');
  const placements = Array.isArray(layout?.placements) ? layout.placements : [];
  const byId = new Map(placements.map((placement) => [placement.characterId, placement]));
  for (const actorId of requireActors) {
    const placement = byId.get(actorId);
    if (!placement) errors.push(`missing layout placement for ${actorId}`);
    else {
      if (!placement.feet || placement.groundAnchor?.x !== placement.feet.x || placement.groundAnchor?.y !== placement.feet.y) errors.push(`${actorId} ground anchor does not equal feet position`);
      if (!placement.contactShadowAnchor || placement.contactShadowAnchor.y !== placement.feet.y) errors.push(`${actorId} contact shadow is not foot anchored`);
      if (!placement.walkPath?.feetLocked) errors.push(`${actorId} locomotion path is not feet locked`);
      if (Number.isFinite(Number(layout.standingBaselineY)) && placement.feet.y > Number(layout.standingBaselineY)) errors.push(`${actorId} is below the scene standing baseline`);
    }
  }
  for (const band of [...new Set(placements.map((placement) => placement.walkBand))]) {
    const sameBand = placements.filter((placement) => placement.walkBand === band).sort((a, b) => (a.visibleBounds?.left ?? a.sprite.left) - (b.visibleBounds?.left ?? b.sprite.left));
    for (let index = 1; index < sameBand.length; index += 1) {
      const previous = sameBand[index - 1];
      const current = sameBand[index];
      const previousBounds = previous.visibleBounds || { left: previous.sprite.left, right: previous.sprite.left + previous.sprite.width - 1 };
      const currentBounds = current.visibleBounds || { left: current.sprite.left, right: current.sprite.left + current.sprite.width - 1 };
      if (currentBounds.left < previousBounds.right + MIN_VISIBLE_ACTOR_GAP_PX) {
        errors.push(`${previous.characterId} and ${current.characterId} overlap in the ${band} walk band`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
