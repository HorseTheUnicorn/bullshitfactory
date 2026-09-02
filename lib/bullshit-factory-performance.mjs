const TRAVEL_ACTIONS = new Set(['enter', 'walk', 'exit']);
const NON_PERFORMING_ACTIONS = new Set(['idle', 'listen', 'talk', 'stop']);
const OVERLAY_ACTIONS = new Set([
  'turn', 'point', 'present', 'lift', 'inspect', 'type', 'drink', 'hand_off',
  'carry', 'push', 'repair', 'look_left', 'look_right', 'shrug', 'jump',
  'recoil', 'interact', 'wag_tail', 'sniff',
]);
const SHOT_TYPES = new Set([
  'wide_scene', 'wide_factory', 'two_shot', 'group_shot', 'medium_actor',
  'close_actor', 'reaction', 'prop_insert', 'dog_reaction', 'final_button',
]);
const ACTION_ALIASES = Object.freeze({
  'point-and-present': 'point',
  'lift-and-present': 'lift',
  'interact-with-prop': 'inspect',
  play_guitar: 'interact',
  guitar_solo: 'interact',
  air_guitar: 'interact',
  strum: 'interact',
  'turn-to-listener': 'turn',
  'shrug-and-talk': 'shrug',
  spawn: 'enter',
  move: 'walk',
  cross: 'walk',
});
const HUMAN_PERFORMANCE_ACTIONS = Object.freeze([
  'idle', 'listen', 'talk', 'react', 'turn', 'point', 'present', 'lift',
  'inspect', 'type', 'drink', 'hand_off', 'carry', 'push', 'repair',
  'look_left', 'look_right', 'enter', 'walk', 'stop', 'exit', 'shrug',
  'jump', 'recoil', 'interact',
]);
const BORK_PERFORMANCE_ACTIONS = Object.freeze([
  'idle', 'listen', 'react', 'bark', 'wag_tail', 'sniff', 'recoil',
  'enter', 'walk', 'exit',
]);
const action = (baseState, loop, purpose, compatibleOverlay = false) => Object.freeze({ baseState, loop, purpose, compatibleOverlay });
export const PERFORMANCE_ACTION_REGISTRY = Object.freeze({
  idle: action('idle', true, 'grounded idle with authored breathing and weight shift'),
  listen: action('listening', true, 'track the speaker while staying planted'),
  talk: action('speaking', true, 'deliver the locked line with a restrained gesture'),
  react: action('reacting', false, 'land the consequence after its cause'),
  turn: action('reacting', false, 'turn toward the motivated listener', true),
  point: action('speaking', false, 'point at the line-relevant object or person', true),
  present: action('speaking', false, 'present the line-relevant prop or claim', true),
  lift: action('speaking', false, 'lift the line-relevant prop', true),
  inspect: action('speaking', false, 'inspect the line-relevant prop or machine', true),
  type: action('speaking', false, 'operate the line-relevant terminal', true),
  drink: action('speaking', false, 'use the line-relevant drink prop', true),
  hand_off: action('speaking', false, 'hand the line-relevant prop to a motivated actor', true),
  carry: action('speaking', false, 'carry the line-relevant prop', true),
  push: action('speaking', false, 'push the line-relevant object', true),
  repair: action('speaking', false, 'repair the line-relevant machine', true),
  look_left: action('reacting', false, 'look toward the left-side cause', true),
  look_right: action('reacting', false, 'look toward the right-side cause', true),
  enter: action('traveling', false, 'enter through a named scene entrance'),
  walk: action('traveling', true, 'travel only between named scene anchors'),
  stop: action('idle', false, 'settle into a grounded still pose'),
  exit: action('traveling', false, 'exit through a named scene exit'),
  bark: action('speaking', true, 'dog-only bark punctuation'),
  wag_tail: action('reacting', true, 'dog-only tail and ear reaction', true),
  sniff: action('reacting', false, 'dog-only sniff investigation', true),
  shrug: action('speaking', false, 'sell the absurdity with a restrained shrug', true),
  jump: action('reacting', false, 'land a motivated dog or human surprise', true),
  recoil: action('reacting', false, 'recoil from the motivated impact', true),
  interact: action('speaking', false, 'perform a line-relevant prop interaction', true),
});
export const HUMAN_PERFORMANCE_ACTION_SET = new Set(HUMAN_PERFORMANCE_ACTIONS);
export const BORK_PERFORMANCE_ACTION_SET = new Set(BORK_PERFORMANCE_ACTIONS);
export const PERFORMANCE_TIMING_SOURCES = Object.freeze(['draft-estimate', 'measured-kokoro-audio']);
const DEFAULT_PROFILE = Object.freeze({
  id: 'normal',
  leadMs: 90,
  settleMs: 180,
  reactionDelayMs: 160,
  reactionHoldMs: 420,
  reactionCooldownMs: 240,
  punchlineHoldMs: 360,
  minShotMs: 850,
  cameraLeadMs: 60,
  travelMs: 900,
  source: 'default',
});
export const PERFORMANCE_SCHEMA_VERSION = '1.0';
export const PERFORMANCE_PACING_PROFILES = Object.freeze({
  normal: Object.freeze({ ...DEFAULT_PROFILE }),
  rapid: Object.freeze({
    ...DEFAULT_PROFILE,
    id: 'rapid',
    leadMs: 50,
    settleMs: 120,
    reactionDelayMs: 80,
    reactionHoldMs: 260,
    reactionCooldownMs: 120,
    punchlineHoldMs: 220,
    minShotMs: 600,
    cameraLeadMs: 40,
    travelMs: 700,
  }),
  deadpan: Object.freeze({
    ...DEFAULT_PROFILE,
    id: 'deadpan',
    leadMs: 110,
    settleMs: 260,
    reactionDelayMs: 260,
    reactionHoldMs: 650,
    reactionCooldownMs: 360,
    punchlineHoldMs: 700,
    minShotMs: 1100,
    cameraLeadMs: 90,
    travelMs: 1100,
  }),
  awkward: Object.freeze({
    ...DEFAULT_PROFILE,
    id: 'awkward',
    leadMs: 80,
    settleMs: 220,
    reactionDelayMs: 420,
    reactionHoldMs: 720,
    reactionCooldownMs: 480,
    punchlineHoldMs: 850,
    minShotMs: 1000,
    cameraLeadMs: 80,
    travelMs: 1000,
  }),
  chaotic: Object.freeze({
    ...DEFAULT_PROFILE,
    id: 'chaotic',
    leadMs: 35,
    settleMs: 100,
    reactionDelayMs: 65,
    reactionHoldMs: 220,
    reactionCooldownMs: 100,
    punchlineHoldMs: 180,
    minShotMs: 500,
    cameraLeadMs: 25,
    travelMs: 600,
  }),
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function clean(value, fallback = '') {
  const result = String(value ?? '').replace(/\s+/gu, ' ').trim();
  return result || fallback;
}

function normalizeAction(value, fallback = 'idle') {
  const raw = clean(value).toLowerCase().replace(/[- ]+/gu, '_');
  const alias = ACTION_ALIASES[raw] || raw;
  const variantBase = alias.match(/^(idle|listen|talk|react|walk|bark|wag_tail|sniff|enter|exit)_(?:neutral|angry|annoyed|excited|confused|shocked|laugh|happy|startled|deadpan|nervous)$/u)?.[1];
  if (variantBase) return variantBase;
  if (alias === 'happy_bark') return 'bark';
  if (['startled', 'annoyed', 'growl', 'whine', 'huff'].includes(alias)) return 'react';
  if (alias.includes('point') || alias.includes('present')) return alias.includes('point') ? 'point' : 'present';
  if (alias.includes('lift')) return 'lift';
  if (alias.includes('carry')) return 'carry';
  if (alias.includes('hand') && alias.includes('off')) return 'hand_off';
  if (alias.includes('prop') || alias.includes('inspect')) return 'inspect';
  if (alias.includes('type')) return 'type';
  if (alias.includes('drink') || alias.includes('toast')) return 'drink';
  if (alias.includes('repair') || alias.includes('fix')) return 'repair';
  if (alias.includes('turn')) return 'turn';
  if (alias.includes('look_left')) return 'look_left';
  if (alias.includes('look_right')) return 'look_right';
  if (alias === 'shrug') return 'shrug';
  if (alias === 'jump') return 'jump';
  if (alias === 'recoil') return 'recoil';
  if (alias.includes('react') || alias.includes('nod') || alias.includes('wave')) return 'react';
  if (alias.includes('bark') || alias.includes('woof') || alias.includes('yip')) return 'bark';
  if (alias.includes('wag')) return 'wag_tail';
  if (alias.includes('sniff')) return 'sniff';
  if (alias.includes('enter')) return 'enter';
  if (alias.includes('exit')) return 'exit';
  if (alias.includes('walk') || alias.includes('cross') || alias.includes('move')) return 'walk';
  if (['idle', 'listen', 'talk', 'stop', 'interact', 'point', 'present', 'lift', 'inspect', 'type', 'drink', 'hand_off', 'carry', 'push', 'repair', 'turn', 'look_left', 'look_right', 'enter', 'walk', 'exit', 'bark', 'wag_tail', 'sniff', 'shrug', 'jump', 'recoil', 'react'].includes(alias)) return alias;
  return fallback;
}

export function resolveSemanticAction(value, { characterId = '', isDog = false, fallback = 'idle' } = {}) {
  const requestedAction = clean(value).toLowerCase().replace(/[- ]+/gu, '_');
  const dog = isDog || String(characterId).toLowerCase() === 'bork';
  const allowed = dog ? BORK_PERFORMANCE_ACTION_SET : HUMAN_PERFORMANCE_ACTION_SET;
  const normalizedFallback = normalizeAction(fallback, dog ? 'react' : 'idle');
  const safeFallback = allowed.has(normalizedFallback) ? normalizedFallback : dog ? 'react' : 'idle';
  const normalized = normalizeAction(requestedAction, safeFallback);
  const resolvedAction = allowed.has(normalized) ? normalized : dog ? 'react' : safeFallback;
  const corrected = Boolean(requestedAction) && requestedAction !== resolvedAction;
  return {
    requestedAction: requestedAction || safeFallback,
    action: resolvedAction,
    clipAction: resolvedAction,
    corrected,
    fallback: corrected ? resolvedAction : null,
    reason: corrected
      ? (dog ? 'unsupported human motion was mapped to dog-only body language' : 'unsupported semantic motion was mapped to a safe human fallback')
      : 'approved semantic action',
    ...PERFORMANCE_ACTION_REGISTRY[resolvedAction],
  };
}

export function normalizePerformanceTimingSource(value) {
  return PERFORMANCE_TIMING_SOURCES.includes(value) ? value : 'draft-estimate';
}

function stableHash(value) {
  let hash = 2166136261;
  for (const character of String(value || '')) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function bounded(startMs, endMs, durationMs, tailMs = 30) {
  const deadlineMs = Math.max(180, Math.round(durationMs) - tailMs);
  const latestStartMs = Math.max(0, deadlineMs - 80);
  const start = clamp(Math.round(finite(startMs, 0)), 0, latestStartMs);
  const end = clamp(Math.max(start + 80, Math.round(finite(endMs, start + 180))), start + 80, deadlineMs);
  return { startMs: start, endMs: end };
}

function inferPacingProfile(dialogue) {
  const text = (Array.isArray(dialogue) ? dialogue : []).map((line) => line?.text || '').join(' ');
  if (/awkward|silence|nobody says|long pause/iu.test(text)) return 'awkward';
  if ((text.match(/[!?]/gu) || []).length >= 4) return 'chaotic';
  if ((text.match(/,/gu) || []).length >= 8) return 'deadpan';
  return 'normal';
}

export function normalizePacingProfile(input = null, dialogue = []) {
  const objectInput = input && typeof input === 'object' ? input : {};
  const requested = clean(typeof input === 'string' ? input : objectInput.id || objectInput.name || objectInput.profile).toLowerCase().replace(/[- ]+/gu, '_');
  const id = Object.hasOwn(PERFORMANCE_PACING_PROFILES, requested) ? requested : inferPacingProfile(dialogue);
  const base = PERFORMANCE_PACING_PROFILES[id] || PERFORMANCE_PACING_PROFILES.normal;
  const overrides = {};
  for (const key of ['leadMs', 'settleMs', 'reactionDelayMs', 'reactionHoldMs', 'reactionCooldownMs', 'punchlineHoldMs', 'minShotMs', 'cameraLeadMs', 'travelMs']) {
    if (Number.isFinite(Number(objectInput[key]))) overrides[key] = clamp(Math.round(Number(objectInput[key])), 0, 5000);
  }
  return {
    ...base,
    ...overrides,
    id,
    source: requested && requested === id ? 'director-or-operator' : base.source,
  };
}

function listenerFor(actorIds, dialogue, index) {
  const line = dialogue[index];
  const humans = (Array.isArray(actorIds) ? actorIds : []).filter((actorId) => actorId !== 'bork');
  return [
    dialogue[index + 1]?.speakerId,
    dialogue[index - 1]?.speakerId,
    ...humans,
  ].find((actorId) => actorId && actorId !== line?.speakerId && humans.includes(actorId)) || null;
}

function beatIdFor(index, count) {
  if (index <= 0) return 'hook';
  if (index >= count - 1) return 'button';
  const progress = index / Math.max(1, count - 1);
  if (progress <= 0.34) return 'want';
  if (progress <= 0.55) return 'obstacle';
  if (progress <= 0.78) return 'escalation';
  return 'reversal';
}

function directionLine(direction, dialogue, claimed) {
  const requested = clean(direction?.line_id || direction?.lineId);
  if (requested) {
    const exact = dialogue.find((line) => line.id === requested);
    if (exact) return exact;
  }
  const character = clean(direction?.character || direction?.characterId).toLowerCase();
  const action = normalizeAction(direction?.action || direction?.clip_action, 'idle');
  if (NON_PERFORMING_ACTIONS.has(action) || TRAVEL_ACTIONS.has(action)) return null;
  return dialogue.find((line) => line.speakerId === character && !claimed.has(line.id)) || null;
}

function eventBase(event, baseState, phase = 'primary') {
  return {
    ...event,
    baseState,
    phase,
    actorId: clean(event.actorId),
    action: normalizeAction(event.action, 'idle'),
    clipAction: normalizeAction(event.clipAction || event.action, 'idle'),
    priority: Math.round(finite(event.priority, 10)),
  };
}

function addAudioCue(audioCues, event, semantic) {
  if (!semantic) return;
  const duplicate = audioCues.some((cue) => cue.assetId === semantic.assetId && Math.abs(cue.startMs - event.startMs) < 1800);
  if (duplicate) return;
  audioCues.push({
    id: 'performance-audio-' + event.id,
    assetId: semantic.assetId,
    kind: semantic.kind || 'sfx',
    tags: semantic.tags || [],
    startMs: event.startMs,
    endMs: Math.min(event.endMs, event.startMs + (semantic.durationMs || 800)),
    sourceLineId: event.lineId || null,
    purpose: semantic.purpose || 'semantic action accent',
    gainDb: semantic.gainDb ?? -10,
  });
}

function audioForAction(action, event = {}) {
  const actorId = clean(event.actorId).toLowerCase();
  const guitarContext = [event.requestedAction, event.purpose, event.propId, event.intent, event.reaction]
    .map((value) => clean(value).toLowerCase())
    .join(' ');
  if (actorId === 'string' && (event.propId === 'rock-speaker' || /\b(guitar|guitars|solo|riff|strum|strumming|amp|amplifier|drummer|set[- ]list)\b/iu.test(guitarContext))) {
    return { assetId: 'bf-string-guitar', kind: 'music', tags: ['string', 'guitar', 'instrumental', 'rock'], purpose: 'String guitar performance cue', durationMs: 5200, gainDb: -16 };
  }
  const map = {
    type: { assetId: 'bf-typing', tags: ['technology', 'computer'], purpose: 'authored typing or console interaction', durationMs: 900, gainDb: -9 },
    inspect: { assetId: 'bf-repair-spark', tags: ['repair', 'factory'], purpose: 'authored inspection or repair interaction', durationMs: 700, gainDb: -10 },
    repair: { assetId: 'bf-repair-spark', tags: ['repair', 'factory'], purpose: 'authored repair interaction', durationMs: 850, gainDb: -9 },
    drink: { assetId: 'bf-drink-clink', tags: ['alcohol', 'bar'], purpose: 'authored drink or bottle punctuation', durationMs: 650, gainDb: -10 },
    enter: { assetId: 'bf-door', tags: ['door', 'movement'], purpose: 'authored entrance transition', durationMs: 700, gainDb: -10 },
    exit: { assetId: 'bf-door', tags: ['door', 'movement'], purpose: 'authored exit transition', durationMs: 700, gainDb: -10 },
    push: { assetId: 'bf-impact', tags: ['impact', 'reaction'], purpose: 'authored push or impact accent', durationMs: 600, gainDb: -10 },
    recoil: { assetId: 'bf-impact', tags: ['impact', 'reaction'], purpose: 'authored recoil accent', durationMs: 600, gainDb: -10 },
  };
  return map[action] || null;
}

function nextLineStartForActor(actorId, line, dialogue) {
  return (Array.isArray(dialogue) ? dialogue : [])
    .filter((candidate) => candidate.speakerId === actorId && finite(candidate.startMs, 0) > finite(line?.endMs, 0))
    .sort((left, right) => finite(left.startMs) - finite(right.startMs))[0]?.startMs ?? Infinity;
}

function travelEventForDirection(direction, line, dialogue, durationMs, profile, correctionState) {
  const character = clean(direction?.character || direction?.characterId).toLowerCase();
  const action = normalizeAction(direction?.action || direction?.clip_action, 'idle');
  if (!character || !TRAVEL_ACTIONS.has(action)) return null;
  const firstLine = (dialogue || []).filter((candidate) => candidate.speakerId === character).sort((left, right) => finite(left.startMs) - finite(right.startMs))[0];
  const lastLine = (dialogue || []).filter((candidate) => candidate.speakerId === character).sort((left, right) => finite(right.endMs) - finite(left.endMs))[0];
  const explicitStart = Number.isFinite(Number(direction?.start_ms ?? direction?.startMs));
  const explicitEnd = Number.isFinite(Number(direction?.end_ms ?? direction?.endMs));
  let start = explicitStart ? finite(direction.start_ms ?? direction.startMs) : 0;
  let end = explicitEnd ? finite(direction.end_ms ?? direction.endMs) : start + profile.travelMs;
  if (action === 'enter') {
    end = line ? Math.min(finite(line.startMs, end) - 80, end) : Math.min(finite(firstLine?.startMs, end) - 80, end);
    start = Math.min(start, end - profile.travelMs);
  } else if (action === 'exit') {
    start = line ? Math.max(finite(line.endMs, start) + 80, start) : Math.max(finite(lastLine?.endMs, start) + 80, start);
    end = Math.max(end, start + profile.travelMs);
  }
  const intervals = (dialogue || [])
    .filter((candidate) => candidate.speakerId === character)
    .map((candidate) => [finite(candidate.startMs), finite(candidate.endMs)]);
  const overlapsSpeech = intervals.some(([speechStart, speechEnd]) => start < speechEnd && end > speechStart);
  if (overlapsSpeech || end - start < 180) {
    correctionState.count += 1;
    return null;
  }
  const bounds = bounded(start, end, durationMs);
  if (bounds.endMs - bounds.startMs < 180) {
    correctionState.count += 1;
    return null;
  }
  return eventBase({
    id: 'travel-' + character + '-' + clean(direction?.line_id || direction?.lineId, 'scene'),
    actorId: character,
    kind: 'semantic-action',
    action,
    clipAction: action,
    ...bounds,
    purpose: clean(direction?.purpose, action === 'enter' ? 'entrance transition' : action === 'exit' ? 'exit transition' : 'scene transition'),
    lineId: line?.id || null,
    listenerId: clean(direction?.listener_id || direction?.listenerId) || null,
    facing: clean(direction?.facing, 'south'),
    near: clean(direction?.near) || null,
    propId: clean(direction?.prop_id || direction?.propId) || null,
    requestedAction: direction?.actionResolution?.requestedAction || action,
    actionResolution: direction?.actionResolution || null,
    priority: Math.max(120, finite(direction?.priority, 120)),
  }, 'traveling');
}

function reactionEvent(actorId, line, profile, durationMs, dialogue, source = 'line', priorReactions = []) {
  const priorEnd = priorReactions.reduce((latest, event) => Math.max(latest, finite(event?.endMs, 0)), 0);
  const requestedStart = Math.max(
    finite(line?.endMs, 0) + profile.reactionDelayMs,
    priorEnd ? priorEnd + profile.reactionCooldownMs : 0,
  );
  const nextStart = nextLineStartForActor(actorId, line, dialogue);
  const latestStart = Number.isFinite(nextStart) ? nextStart - 40 : requestedStart;
  const start = Math.min(requestedStart, latestStart);
  if (start < finite(line?.endMs, 0) + 20) return null;
  const end = Math.min(start + profile.reactionHoldMs, nextStart - 20);
  const bounds = bounded(start, end, durationMs);
  if (bounds.endMs - bounds.startMs < 120) return null;
  return eventBase({
    id: 'react-' + source + '-' + clean(line?.id, 'line'),
    actorId,
    kind: 'listen-and-react',
    ...bounds,
    action: 'react',
    clipAction: 'react',
    lineId: line?.id || null,
    listenerId: line?.speakerId || null,
    intent: 'land the authored reaction after the line',
    reaction: clean(line?.reaction, 'hold the consequence'),
    postLineReaction: clean(line?.reaction, 'hold the consequence'),
    purpose: 'reaction:' + clean(line?.id, source),
    facing: 'south',
    causeEndMs: finite(line?.endMs, 0),
    cooldownMs: profile.reactionCooldownMs,
    priority: 80,
  }, 'reacting');
}

function buildCamera(actorIds, dialogue, barkEvents, props, directions, durationMs, profile) {
  const deadlineMs = Math.max(180, Math.round(durationMs) - 30);
  const lines = Array.isArray(dialogue) ? dialogue : [];
  const directionByLine = new Map(directions.filter((direction) => direction.lineId).map((direction) => [direction.lineId, direction]));
  const firstStart = finite(lines[0]?.startMs, 900);
  const shots = [{
    id: 'shot-wide-establish',
    type: 'wide_scene',
    startMs: 0,
    endMs: clamp(Math.max(profile.minShotMs, firstStart - profile.cameraLeadMs), 180, deadlineMs),
    participants: [...actorIds],
    focusActorId: null,
    listenerId: null,
    beatId: 'hook',
    priority: 10,
    purpose: 'establish the separated factory floor before the first exchange',
  }];
  for (const [index, line] of lines.entries()) {
    const direction = directionByLine.get(line.id);
    const listenerId = clean(direction?.listenerId || direction?.listener_id) || listenerFor(actorIds, lines, index);
    const beatId = beatIdFor(index, lines.length);
    const requested = clean(direction?.shotType || direction?.shot_type).toLowerCase();
    const fallback = beatId === 'hook' ? 'wide_scene' : beatId === 'want' || beatId === 'obstacle' ? 'two_shot' : beatId === 'escalation' ? 'group_shot' : beatId === 'reversal' ? 'reaction' : 'close_actor';
    const type = SHOT_TYPES.has(requested) ? requested : fallback;
    const start = Math.max(0, finite(line.startMs) - profile.cameraLeadMs);
    const end = Math.min(deadlineMs, Math.max(start + profile.minShotMs, finite(line.endMs) + profile.settleMs + profile.punchlineHoldMs));
    const participants = type === 'wide_scene' || type === 'wide_factory'
      ? [...actorIds]
      : [...new Set([line.speakerId, listenerId].filter(Boolean))];
    shots.push({
      id: 'shot-' + line.id,
      type,
      startMs: start,
      endMs: end,
      participants,
      focusActorId: type === 'reaction' && listenerId ? listenerId : line.speakerId,
      listenerId,
      beatId,
      lineId: line.id,
      priority: type === 'reaction' ? 60 : type === 'close_actor' ? 50 : 40,
      purpose: type + ' holds the visual focus for ' + line.id,
    });
    const prop = (props || []).find((candidate) => candidate.lineId === line.id);
    if (prop) {
      shots.push({
        id: 'shot-prop-' + line.id,
        type: 'prop_insert',
        startMs: clamp(finite(line.startMs) + 100, 0, deadlineMs - 80),
        endMs: clamp(Math.max(finite(line.startMs) + 260, Math.min(finite(line.endMs), finite(line.startMs) + 760)), 180, deadlineMs),
        participants: [line.speakerId],
        focusActorId: line.speakerId,
        listenerId,
        beatId,
        lineId: line.id,
        propId: prop.propId,
        priority: 75,
        purpose: 'prop insert shows the dialogue-relevant ' + prop.propId + ' during ' + line.id,
      });
    }
  }
  for (const bark of Array.isArray(barkEvents) ? barkEvents : []) {
    shots.push({
      id: 'shot-' + clean(bark.id, 'bark'),
      type: 'dog_reaction',
      ...bounded(finite(bark.startMs) - 100, finite(bark.endMs) + profile.punchlineHoldMs, durationMs),
      participants: ['bork'],
      focusActorId: 'bork',
      listenerId: null,
      beatId: 'reaction',
      priority: 80,
      purpose: 'dog reaction shot gives Bork a readable bark button',
    });
  }
  const finalLine = lines.at(-1);
  const finalFocus = finalLine?.speakerId || actorIds[0] || null;
  shots.push({
    id: 'shot-final-button',
    type: 'final_button',
    ...bounded(Math.max(0, deadlineMs - Math.max(700, profile.punchlineHoldMs)), durationMs, durationMs),
    participants: [...new Set([finalFocus, listenerFor(actorIds, lines, Math.max(0, lines.length - 1)), actorIds.includes('bork') ? 'bork' : null].filter(Boolean))],
    focusActorId: finalFocus,
    listenerId: finalLine ? listenerFor(actorIds, lines, lines.length - 1) : null,
    beatId: 'button',
    priority: 100,
    purpose: 'hold the final consequence through the measured end-button tail',
  });
  return shots
    .filter((shot) => shot.endMs > shot.startMs)
    .sort((left, right) => left.startMs - right.startMs || right.priority - left.priority || left.id.localeCompare(right.id));
}

function buildBeats(storyBeats, dialogue, actorIds, durationMs, profile) {
  const source = Array.isArray(storyBeats) && storyBeats.length
    ? storyBeats
    : ['hook', 'want', 'obstacle', 'escalation', 'reversal', 'button'].map((id) => ({ id, text: id }));
  const count = source.length;
  return source.map((beat, index) => {
    const start = Math.round((durationMs * index) / count);
    const end = Math.round((durationMs * (index + 1)) / count);
    const lines = (dialogue || []).filter((line, lineIndex) => {
      const lineStart = finite(line.startMs, 0);
      return lineStart >= start && lineStart < end || (lineIndex === dialogue.length - 1 && index === count - 1);
    });
    return {
      id: clean(beat?.id, 'beat-' + String(index + 1)),
      text: clean(beat?.text || beat?.description || beat?.action, 'locked story beat'),
      startMs: clamp(start, 0, Math.max(0, durationMs - 80)),
      endMs: clamp(Math.max(start + 80, end), 80, durationMs),
      lineIds: lines.map((line) => line.id),
      actors: [...new Set(lines.map((line) => line.speakerId).concat(actorIds.slice(0, 1)).filter(Boolean))],
      visualFocus: lines[0]?.speakerId || actorIds[0] || null,
      holdMs: profile.punchlineHoldMs,
    };
  });
}

function activePrimaryAt(events, actorId, timeMs) {
  const priority = { traveling: 5, speaking: 4, reacting: 3, listening: 2, idle: 1 };
  const active = events.filter((event) => event.actorId === actorId && timeMs >= event.startMs && timeMs <= event.endMs);
  if (!active.length) return { state: 'idle', event: null };
  const selected = active.slice().sort((left, right) => {
    const leftScore = priority[left.baseState] || 0;
    const rightScore = priority[right.baseState] || 0;
    return rightScore - leftScore || right.priority - left.priority || left.startMs - right.startMs || left.id.localeCompare(right.id);
  })[0];
  return { state: selected.baseState || 'idle', event: selected };
}

function metrics(events, shots, actorIds, durationMs, corrections, actionFallbacks, profile) {
  const movement = events.filter((event) => !['idle', 'listen', 'talk'].includes(event.action));
  const travel = events.filter((event) => event.baseState === 'traveling');
  const reactions = events.filter((event) => event.baseState === 'reacting');
  const overlays = events.filter((event) => event.phase === 'overlay');
  const points = [...new Set([0, durationMs, ...events.flatMap((event) => [event.startMs, event.endMs])].map((value) => clamp(Math.round(value), 0, durationMs)))].sort((left, right) => left - right);
  let simultaneous = 0;
  let idleOrListen = 0;
  let samples = 0;
  for (const point of points) {
    for (const actorId of actorIds) {
      const result = activePrimaryAt(events, actorId, point);
      if (result.state === 'idle' || result.state === 'listening') idleOrListen += 1;
      samples += 1;
    }
    const activeActors = actorIds.filter((actorId) => activePrimaryAt(events, actorId, point).event).length;
    simultaneous = Math.max(simultaneous, activeActors);
  }
  const averageShotLengthMs = shots.length ? Math.round(shots.reduce((sum, shot) => sum + (shot.endMs - shot.startMs), 0) / shots.length) : 0;
  const score = clamp(Math.round(
    (movement.length * 4)
    + (reactions.length * 5)
    + (overlays.length * 6)
    + (travel.length * 8)
    + (shots.length * 2)
    - (corrections * 3),
  ), 0, 100);
  return {
    movementEvents: movement.length,
    walkEvents: travel.length,
    gestureEvents: overlays.length,
    reactionEvents: reactions.length,
    cameraCuts: Math.max(0, shots.length - 1),
    averageShotLengthMs,
    simultaneousActivePerformances: simultaneous,
    idleListenPercentage: samples ? Number((idleOrListen / samples * 100).toFixed(1)) : 100,
    fallbacks: corrections,
    actionFallbacks,
    illegalTransitionsCorrected: corrections,
    reactionCooldownMs: profile.reactionCooldownMs,
    performanceDensityScore: score,
    stillnessBudget: {
      policy: 'idle/listen is the default; movement requires an authored semantic event',
      idleOrListenPercentage: samples ? Number((idleOrListen / samples * 100).toFixed(1)) : 100,
    },
  };
}

function buildStates(events, actorIds, durationMs) {
  return actorIds.flatMap((actorId) => {
    const actorEvents = events
      .filter((event) => event.actorId === actorId)
      .sort((left, right) => left.startMs - right.startMs || right.priority - left.priority || left.id.localeCompare(right.id));
    const defaultState = {
      id: 'state-' + actorId + '-default',
      actorId,
      startMs: 0,
      endMs: durationMs,
      action: 'idle',
      clipAction: 'idle',
      baseState: 'idle',
      stateType: 'base',
      purpose: 'grounded default idle when no authored performance is active',
      priority: 0,
      default: true,
    };
    return [
      defaultState,
      ...actorEvents.map((event, index) => ({
        id: 'state-' + event.id,
        actorId,
        startMs: event.startMs,
        endMs: event.endMs,
        action: event.action,
        clipAction: event.clipAction,
        baseState: event.baseState,
        stateType: event.phase === 'overlay' ? 'overlay' : 'base',
        anchor: event.near || null,
        facing: event.facing || 'south',
        prop: event.propId || null,
        purpose: clean(event.purpose, 'authored performance event'),
        priority: event.priority,
        lineId: event.lineId || null,
        listenerId: event.listenerId || null,
        intent: event.intent || null,
        reaction: event.reaction || null,
        postLineReaction: event.postLineReaction || null,
        sourceCueId: event.id,
        previous: index ? 'state-' + actorEvents[index - 1].id : defaultState.id,
        next: index + 1 < actorEvents.length ? 'state-' + actorEvents[index + 1].id : null,
      })),
    ];
  });
}

export function choreographPerformance({
  actorIds = [],
  dialogue = [],
  barkEvents = [],
  semanticDirections = [],
  props = [],
  storyBeats = [],
  durationMs = 30_000,
  seed = 1,
  pacingProfile = null,
  tailMs = 30,
  timingSource = 'draft-estimate',
} = {}) {
  const normalizedActors = [...new Set((Array.isArray(actorIds) ? actorIds : []).map((id) => clean(id).toLowerCase()).filter(Boolean))].slice(0, 10);
  const lines = (Array.isArray(dialogue) ? dialogue : [])
    .filter((line) => line && clean(line.speakerId) && clean(line.text))
    .map((line, index) => ({
      ...line,
      id: clean(line.id, 'line-' + String(index + 1).padStart(2, '0')),
      speakerId: clean(line.speakerId).toLowerCase(),
      startMs: Math.max(0, Math.round(finite(line.startMs, 0))),
      endMs: Math.max(Math.round(finite(line.startMs, 0)) + 80, Math.round(finite(line.endMs, finite(line.startMs, 0) + 180))),
    }))
    .sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
  const profile = normalizePacingProfile(pacingProfile, lines);
  const totalMs = Math.max(180, Math.round(finite(durationMs, 30_000)));
  const events = [];
  const audioCues = [];
  const correctionState = { count: 0, actionFallbacks: 0 };
  const reactionKeys = new Set();
  const reactionIntervals = new Map();
  const claimedDirectionLines = new Set();
  const normalizedDirections = (Array.isArray(semanticDirections) ? semanticDirections : [])
    .map((direction) => {
      const character = clean(direction?.character || direction?.characterId).toLowerCase();
      const actionResolution = resolveSemanticAction(direction?.action || direction?.clip_action, { characterId: character, fallback: character === 'bork' ? 'react' : 'idle' });
      const clipResolution = resolveSemanticAction(direction?.clip_action || actionResolution.action, { characterId: character, fallback: actionResolution.action });
      if (actionResolution.corrected || clipResolution.corrected) {
        correctionState.count += 1;
        correctionState.actionFallbacks += 1;
      }
      return {
        ...direction,
        character,
        action: actionResolution.action,
        clipAction: clipResolution.clipAction,
        actionResolution,
        clipActionResolution: clipResolution,
        lineId: clean(direction?.line_id || direction?.lineId) || null,
        listenerId: clean(direction?.listener_id || direction?.listenerId).toLowerCase() || null,
        shotType: clean(direction?.shot_type || direction?.shotType).toLowerCase() || null,
      };
    })
    .filter((direction) => normalizedActors.includes(direction.character));
  const addReaction = (actorId, line, source) => {
    const reactionKey = actorId + ':' + (line?.id || 'scene');
    if (!line || reactionKeys.has(reactionKey)) return;
    const intervals = reactionIntervals.get(actorId) || [];
    const reaction = reactionEvent(actorId, line, profile, totalMs, lines, source, intervals);
    if (!reaction) return;
    events.push(reaction);
    reactionKeys.add(reactionKey);
    intervals.push(reaction);
    reactionIntervals.set(actorId, intervals);
  };
  const directionForLine = new Map();
  for (const direction of normalizedDirections) {
    const line = directionLine(direction, lines, claimedDirectionLines);
    if (line) {
      claimedDirectionLines.add(line.id);
      if (!directionForLine.has(line.id)) directionForLine.set(line.id, direction);
    }
    if (TRAVEL_ACTIONS.has(direction.action)) {
      const travel = travelEventForDirection(direction, line, lines, totalMs, profile, correctionState);
      if (travel) {
        events.push(travel);
        addAudioCue(audioCues, travel, audioForAction(travel.action, travel));
      }
    }
  }
  for (const [index, line] of lines.entries()) {
    const listenerId = listenerFor(normalizedActors, lines, index);
    const talk = eventBase({
      id: 'talk-' + line.id,
      actorId: line.speakerId,
      kind: 'talk-and-gesture',
      ...bounded(line.startMs - profile.leadMs, line.endMs + profile.settleMs, totalMs, tailMs),
      action: 'talk',
      clipAction: 'talk',
      lineId: line.id,
      listenerId,
      intent: clean(line.intent, 'advance the shared incident'),
      delivery: clean(line.delivery),
      reaction: clean(line.reaction),
      postLineReaction: clean(line.reaction),
      facing: clean(line.facing, listenerId ? 'south-east' : 'south'),
      propId: props.find((prop) => prop.lineId === line.id)?.propId || null,
      shotType: directionForLine.get(line.id)?.shotType || null,
      purpose: 'voice:' + line.id,
      priority: 100,
      visualFocus: line.speakerId,
    }, 'speaking');
    events.push(talk);
    const listener = listenerId ? eventBase({
      id: 'listen-' + line.id,
      actorId: listenerId,
      kind: 'listen-and-react',
      ...bounded(line.startMs - Math.min(40, profile.leadMs), line.endMs + profile.settleMs, totalMs, tailMs),
      action: 'listen',
      clipAction: 'listen',
      lineId: line.id,
      listenerId: line.speakerId,
      intent: 'track and evaluate the speaker',
      reaction: clean(line.reaction),
      facing: 'south',
      purpose: 'listen:' + line.id,
      priority: 40,
      visualFocus: line.speakerId,
    }, 'listening') : null;
    if (listener) events.push(listener);
    if (listener && line.reaction) {
      addReaction(listenerId, line, 'line');
    }
  }
  for (const bark of Array.isArray(barkEvents) ? barkEvents : []) {
    const barkEvent = eventBase({
      id: clean(bark.id, 'bark'),
      actorId: 'bork',
      kind: 'bark-and-react',
      ...bounded(bark.startMs, bark.endMs, totalMs, tailMs),
      action: 'bark',
      clipAction: 'bark',
      lineId: clean(bark.id) || null,
      listenerId: normalizedActors.find((actorId) => actorId !== 'bork') || null,
      intent: 'punctuate the shared incident without human speech',
      reaction: clean(bark.caption, '[barks]'),
      purpose: 'sound:' + clean(bark.id, 'bark'),
      priority: 115,
      facing: 'south',
      visualFocus: 'bork',
    }, 'speaking');
    events.push(barkEvent);
    addAudioCue(audioCues, barkEvent, { assetId: 'bf-dog-cue', kind: 'sfx', tags: ['dog', 'bark'], purpose: 'optional dog punctuation', durationMs: 400, gainDb: -18 });
  }
  const overlayKeys = new Set();
  const overlayIntervals = new Map();
  for (const direction of normalizedDirections) {
    const action = direction.action;
    if (NON_PERFORMING_ACTIONS.has(action) || TRAVEL_ACTIONS.has(action) || action === 'bark') continue;
    const line = direction.lineId ? lines.find((candidate) => candidate.id === direction.lineId) : lines.find((candidate) => candidate.speakerId === direction.character && !overlayKeys.has(direction.character + ':' + candidate.id));
    if (action === 'react') {
      addReaction(direction.character, line, 'director');
      continue;
    }
    if (!OVERLAY_ACTIONS.has(action)) continue;
    const lineId = line?.id || direction.lineId || null;
    const key = direction.character + ':' + (lineId || 'scene');
    if (overlayKeys.has(key)) {
      correctionState.count += 1;
      continue;
    }
    const requestedStart = Number.isFinite(Number(direction.start_ms ?? direction.startMs)) ? finite(direction.start_ms ?? direction.startMs) : finite(line?.startMs, 0) + 90;
    const requestedEnd = Number.isFinite(Number(direction.end_ms ?? direction.endMs)) ? finite(direction.end_ms ?? direction.endMs) : finite(line?.endMs, requestedStart + 500);
    const lineStart = line ? finite(line.startMs) : requestedStart;
    const lineEnd = line ? finite(line.endMs) : requestedEnd;
    const duration = Math.max(180, lineEnd - lineStart);
    const offsetLimit = Math.max(0, duration - 260);
    const offset = offsetLimit ? stableHash(String(seed) + ':' + key) % (offsetLimit + 1) : 0;
    const start = line ? lineStart + Math.min(120, Math.floor(duration / 4)) + offset : requestedStart;
    const end = line ? Math.min(lineEnd, start + Math.min(760, Math.max(180, Math.floor(duration * 0.52)))) : requestedEnd;
    const bounds = bounded(start, end, totalMs, tailMs);
    const actorOverlayIntervals = overlayIntervals.get(direction.character) || [];
    if (actorOverlayIntervals.some(([overlayStart, overlayEnd]) => bounds.startMs < overlayEnd && bounds.endMs > overlayStart)) {
      correctionState.count += 1;
      continue;
    }
    const overlay = eventBase({
      id: 'overlay-' + direction.character + '-' + clean(lineId, 'scene'),
      actorId: direction.character,
      kind: 'performance-overlay',
      ...bounds,
      action,
      clipAction: direction.clipAction || action,
      lineId,
      listenerId: direction.listenerId || null,
      intent: clean(direction.intent, 'serve the locked visual beat'),
      reaction: clean(direction.reaction),
      postLineReaction: clean(direction.postLineReaction || direction.post_line_reaction),
      facing: clean(direction.facing, 'south'),
      near: clean(direction.near) || null,
      propId: clean(direction.propId || direction.prop_id) || null,
      requestedAction: direction.actionResolution?.requestedAction || action,
      actionResolution: direction.actionResolution || null,
      clipActionResolution: direction.clipActionResolution || null,
      shotType: direction.shotType || null,
      purpose: clean(direction.purpose, lineId ? 'voice:' + lineId : 'scene:' + action),
      priority: Math.max(85, finite(direction.priority, 105)),
      visualFocus: direction.character,
      overlayOf: line && direction.character === line.speakerId ? 'talk-' + line.id : null,
    }, line && direction.character === line.speakerId ? 'speaking' : 'reacting', 'overlay');
    events.push(overlay);
    overlayKeys.add(key);
    actorOverlayIntervals.push([overlay.startMs, overlay.endMs]);
    overlayIntervals.set(direction.character, actorOverlayIntervals);
    addAudioCue(audioCues, overlay, audioForAction(action, overlay));
  }
  const deduped = events
    .filter((event) => normalizedActors.includes(event.actorId))
    .sort((left, right) => left.startMs - right.startMs || right.priority - left.priority || left.id.localeCompare(right.id));
  const beats = buildBeats(storyBeats, lines, normalizedActors, totalMs, profile);
  const camera = buildCamera(normalizedActors, lines, barkEvents, props, normalizedDirections, totalMs, profile);
  const actorPerformances = normalizedActors.map((actorId) => {
    const actorEvents = deduped.filter((event) => event.actorId === actorId);
    const overlayCount = actorEvents.filter((event) => event.phase === 'overlay').length;
    return {
      actorId,
      baseState: { action: 'idle', state: 'idle', priorityOrder: ['traveling', 'speaking', 'reacting', 'listening', 'idle'] },
      maxOverlays: 1,
      overlaysScheduled: overlayCount,
      events: actorEvents.map((event) => event.id),
      actionRegistry: 'semantic-v1',
      resolver: 'deterministic-priority-with-one-compatible-overlay',
    };
  });
  const performanceMetrics = metrics(deduped, camera, normalizedActors, totalMs, correctionState.count, correctionState.actionFallbacks, profile);
  const states = buildStates(deduped, normalizedActors, totalMs);
  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    durationMs: totalMs,
    timingSource: normalizePerformanceTimingSource(timingSource),
    deterministicSeed: finite(seed, 1),
    pacingProfile: profile,
    priorityOrder: ['traveling', 'speaking', 'reacting', 'listening', 'idle'],
    baseStatePolicy: 'exactly-one-base-state-plus-at-most-one-compatible-overlay',
    actionRegistryVersion: 'semantic-v1',
    events: deduped,
    beats,
    camera,
    audioCues: audioCues.sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id)),
    performances: actorPerformances,
    metrics: performanceMetrics,
    states,
  };
}
