import { CAST_IDS, FACTORY_SCENES, MUSIC_RIGHTS, SEGMENT_TEMPLATES } from './bullshit-factory-scheduler.mjs';
import { buildSceneLayout, ORANGE_IDIOT_STANDALONE_SCENE_ID as ORANGE_IDIOT_YARD_SCENE_ID, validateSceneLayout } from './bullshit-factory-location.mjs';

export const PRODUCTION_VERSION = '1.0';
// Leave a tiny post-speech pad so the last word never clips at the media boundary.
// This is intentionally 30 ms; it is not a multi-second dialogue stopper.
export const SCRIPT_END_BUFFER_MS = 30;
export const SHARED_TTS_SPEED = 1.05;
export const SPEECH_CALIBRATED_WPM = 82;
export const SPEECH_START_RESERVE_MS = 900;
export const SPEAKER_HANDOFF_GAP_MS = 5;
export const SPEECH_BUDGET_UTILIZATION = 0.92;
export const ORANGE_IDIOT_MAX_SPEECH_CHARACTERS = 5000;
export const ORANGE_IDIOT_SPEECH_MIN_SECONDS = 1;
// Kokoro bm_daniel at shared playback speed 1.05 is the reference pace.
export const ORANGE_IDIOT_CALIBRATED_WPM = 129;
export const PRODUCTION_STATES = Object.freeze([
  'draft',
  'generating',
  'rendering',
  'pending-review',
  'approved',
  'quarantined',
  'failed',
]);

const HUMAN_CAST_IDS = new Set(CAST_IDS.filter((id) => id !== 'bork'));

// Orange Idiot is deliberately outside CAST_IDS. It is a broadcast insert,
// not a floor actor, dashboard-cast member, or selectable cast slot.
export const ORANGE_IDIOT_ID = 'orange-idiot';
export const ORANGE_IDIOT_SCENE_ID = 'senior-lounge';
export const ORANGE_IDIOT_STANDALONE_SCENE_ID = ORANGE_IDIOT_YARD_SCENE_ID;

export function normalizeOrangeIdiotSpeechDurationSeconds(value, durationSeconds = 30) {
  const normalizedDuration = Math.max(10, Math.round(Number(durationSeconds) || 30));
  const maximum = Math.max(ORANGE_IDIOT_SPEECH_MIN_SECONDS, Math.floor(normalizedDuration - SCRIPT_END_BUFFER_MS / 1000));
  const requested = Number(value);
  if (!Number.isFinite(requested) || requested <= 0) return 0;
  return Math.min(maximum, Math.max(ORANGE_IDIOT_SPEECH_MIN_SECONDS, Math.round(requested)));
}

export function orangeIdiotSpeechTargetSeconds(value, durationSeconds = 30, standalone = false) {
  const requested = normalizeOrangeIdiotSpeechDurationSeconds(value, durationSeconds);
  if (requested > 0) return requested;
  if (!standalone) return 0;
  return normalizeOrangeIdiotSpeechDurationSeconds(Math.floor(Number(durationSeconds) || 30) - SCRIPT_END_BUFFER_MS / 1000, durationSeconds);
}

export function speechWordBudget(speechSeconds = 30, reserveSeconds = 0) {
  const seconds = Math.max(5, Math.round(Number(speechSeconds) || 30));
  const reserve = Number.isFinite(Number(reserveSeconds)) ? Math.max(0, Number(reserveSeconds)) : 0;
  const availableSeconds = Math.max(5, seconds - reserve);
  const target = Math.round(availableSeconds * SPEECH_CALIBRATED_WPM / 60 * SPEECH_BUDGET_UTILIZATION);
  return Math.min(4600, Math.max(10, target));
}

export function dialogueWordBudget(durationSeconds = 30) {
  const seconds = Math.max(10, Math.min(3600, Number(durationSeconds) || 30));
  return speechWordBudget(seconds, (SCRIPT_END_BUFFER_MS + SPEECH_START_RESERVE_MS) / 1000);
}

export function speechWordRange(speechSeconds = 30) {
  const target = speechWordBudget(speechSeconds);
  return {
    minimum: Math.max(10, Math.floor(target * 0.85)),
    target,
    maximum: Math.min(4600, Math.ceil(target * 1.10)),
  };
}

export function orangeIdiotSpeechWordRange(speechSeconds = 30) {
  const seconds = Math.max(5, Math.round(Number(speechSeconds) || 30));
  const target = Math.min(4600, Math.max(10, Math.round(seconds * ORANGE_IDIOT_CALIBRATED_WPM / 60 * 0.98)));
  return {
    minimum: Math.max(10, Math.floor(target * 0.95)),
    target,
    maximum: Math.min(4600, Math.ceil(target * 1.04)),
  };
}

// Standalone Orange broadcasts use their own authored stage. Keep this scene
// out of the ordinary factory scene rotation so it cannot become a random
// floor location for the main cast.
export const ORANGE_IDIOT_STANDALONE_SCENE = Object.freeze({
  id: ORANGE_IDIOT_STANDALONE_SCENE_ID,
  label: 'Orange Idiot house',
  location: 'Rundown house yard',
  cue: 'Orange Idiot delivers a chaotic broadcast from the path in front of a house that looks like it lost an argument with time.',
  description: 'A rundown pixel-art house and yard, rendered in the Bullshit Factory muted 16-bit palette.',
  background: '/bullshit-factory/scenes/orange-idiot-house.png',
  accent: '#a78b67',
  castIds: [],
  movement: 'House-yard broadcast, south-facing talking cycle, head turns, childlike bluster, and deliberate reaction pauses.',
  standaloneOnly: true,
});

const DIALOGUE_BANK = Object.freeze({
  'shift-start': [
    ['rookboss', 'Effective immediately, the conveyor is promoted to senior management.'],
    ['magsrust', 'It has been smoking since Tuesday. You promoted a fire.'],
    ['rookboss', 'That is now official company policy.'],
  ],
  'break-policy': [
    ['sudsmcgee', 'This calls for a meeting and a drink. The meeting can be the drink.'],
    ['karen', 'Violation one: beverage. Violation two: calling it a procedure.'],
    ['sudsmcgee', 'Hydration is a spectrum and I am standing on the interesting end.'],
  ],
  'wellness-memo': [
    ['dooby', 'What if the forklift is a thought that forgot where it parked?'],
    ['rookboss', 'What if the forklift meets the deadline instead of philosophizing?'],
    ['nico', 'I have a form for this, but the form is asking me to resign.'],
  ],
  'server-emergency': [
    ['kernelkline', 'The server has boundaries, and somebody crossed them with a deprecated cable.'],
    ['string', 'This argument needs a solo and possibly a backup server.'],
    ['rookboss', 'Can we blame DNS before lunch?'],
  ],
  'boat-problem': [
    ['spaulding', 'Every crisis is a rigging problem. Even this conveyor has a mainsail in its heart.'],
    ['magsrust', 'The machine has a loose bolt, not a maritime destiny.'],
    ['nico', 'Why is the boat on the shipping manifest?'],
  ],
  'old-timer-override': [
    ['magsrust', 'I have seen this idiot before, and he was running the old dashboard.'],
    ['kernelkline', 'Please do not put a screwdriver into the uptime strategy.'],
    ['karen', 'I need that unauthorized repair in triplicate.'],
  ],
  'guitar-solo-arbitration': [
    ['string', 'This argument needs a solo, a spotlight, and a legally dubious bridge.'],
    ['sudsmcgee', 'I vote for the chorus. The chorus votes for another round.'],
    ['karen', 'The guitar is not a witness and the amplifier is not a workplace.'],
  ],
  'shipping-mystery': [
    ['nico', 'I have a box with no sender, no destination, and too much confidence.'],
    ['rookboss', 'Put it on the strategic pallet and call the mystery a distribution win.'],
    ['karen', 'That sentence created four incidents and one new department.'],
  ],
  'dog-quality-check': [
    ['rookboss', 'Bork, please stop auditing the official equipment.'],
    ['dooby', 'He is not auditing it. He is listening to what it already knows.'],
    ['string', 'The dog has better timing than my drummer.'],
  ],
  'after-hours-rant': [
    ['rookboss', 'Nobody is clocked in, so this is either a party or a compliance emergency.'],
    ['sudsmcgee', 'It can be both if we document the snacks.'],
    ['dooby', 'The boat, the server, and the old guy all want the same thing: a quieter factory.'],
    ['spaulding', 'That is not a metaphor. That is a distress call.'],
    ['magsrust', 'Finally, somebody noticed.'],
  ],
});

const MOVEMENT_BY_CHARACTER = Object.freeze({
  rookboss: { body: 'forward-lean', head: 'sharp-checks', eyes: 'blink-on-pause', limbs: 'point-and-present', secondary: 'cap-twitch' },
  magsrust: { body: 'weighted-stillness', head: 'slow-side-eye', eyes: 'deliberate-blink', limbs: 'tool-burst', secondary: 'knee-creak' },
  kernelkline: { body: 'hunched-shift', head: 'rapid-swivel', eyes: 'monitor-track', limbs: 'typing-and-cable-pull', secondary: 'hoodie-twitch' },
  sudsmcgee: { body: 'loose-sway', head: 'barroom-turn', eyes: 'lazy-blink', limbs: 'bottle-flourish', secondary: 'vest-swing' },
  dooby: { body: 'slow-drift', head: 'long-tilt', eyes: 'soft-focus', limbs: 'floating-hands', secondary: 'hoodie-sway' },
  spaulding: { body: 'deck-balance', head: 'horizon-check', eyes: 'windward-squint', limbs: 'rope-and-compass', secondary: 'cap-lift' },
  string: { body: 'stage-lean', head: 'beat-snap', eyes: 'spotlight-track', limbs: 'air-strum-and-point', secondary: 'vest-hit' },
  karen: { body: 'rigid-stack', head: 'paper-check', eyes: 'glasses-push', limbs: 'pen-and-folder', secondary: 'paper-flutter' },
  nico: { body: 'cautious-shift', head: 'double-take', eyes: 'exit-scan', limbs: 'box-rebalance', secondary: 'cap-bob' },
  bork: { body: 'four-leg-ready', head: 'independent-tilt', eyes: 'object-track', limbs: 'sniff-paw-trot', secondary: 'ear-flick-and-tail-wag' },
});

const DEFAULT_STORY_BEATS = Object.freeze([
  { id: 'hook', text: 'A routine factory task is already going wrong.' },
  { id: 'want', text: 'The lead character wants the problem fixed before anyone notices.' },
  { id: 'obstacle', text: 'A person, policy, or prop blocks the obvious fix.' },
  { id: 'escalation', text: 'Management formalizes a worse solution.' },
  { id: 'reversal', text: 'The supposed fix reveals the real problem.' },
  { id: 'button', text: 'A final reaction creates the next excuse.' },
]);

function numericSeed(seed) {
  const value = Number(seed);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
}

function hashSeed(seed, salt = 0) {
  let value = (numericSeed(seed) + salt) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822519) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489917) >>> 0;
  return (value ^ (value >>> 16)) >>> 0;
}

function findTemplate(templateId) {
  return SEGMENT_TEMPLATES.find((template) => template.id === templateId) || SEGMENT_TEMPLATES[0];
}

function findScene(sceneId) {
  if (sceneId === ORANGE_IDIOT_STANDALONE_SCENE_ID) return ORANGE_IDIOT_STANDALONE_SCENE;
  return FACTORY_SCENES.find((scene) => scene.id === sceneId) || FACTORY_SCENES[0];
}

export function estimateLineDurationMs(text) {
  const words = String(text || '').trim().split(/\s+/u).filter(Boolean).length;
  return Math.max(1200, Math.min(300_000, Math.round(words * 60_000 / SPEECH_CALIBRATED_WPM)));
}

/**
 * Put every vocal event on one serialized track after the real audio files
 * have been measured. Writer estimates are useful for drafting, but they are
 * not reliable enough to keep TTS takes from colliding in the final mix.
 */
export function serializeVoiceTimeline(events, durationSeconds = 30, gapMs = SPEAKER_HANDOFF_GAP_MS, tailMs = SCRIPT_END_BUFFER_MS) {
  const gap = Math.max(0, Math.min(1000, Math.round(Number(gapMs) || SPEAKER_HANDOFF_GAP_MS)));
  const normalized = (Array.isArray(events) ? events : [])
    .map((event, index) => {
      const requestedStartMs = Math.max(0, Math.round(Number(event?.startMs) || 0));
      const durationMs = Math.max(180, Math.round(Number(event?.durationMs) || estimateLineDurationMs(event?.text || event?.caption)));
      return { event: event || {}, index, requestedStartMs, durationMs };
    })
    .sort((left, right) => left.requestedStartMs - right.requestedStartMs || left.index - right.index);
  const timeline = [];
  let cursor = 0;
  for (const item of normalized) {
    // Requested timestamps order the events, but measured takes are never dropped
    // just because they outlast the original estimate; assembly trims to the last take.
    const startMs = timeline.length ? cursor + gap : item.requestedStartMs;
    const durationMs = item.durationMs;
    if (durationMs < 180) continue;
    const endMs = startMs + durationMs;
    timeline.push({ ...item.event, startMs, endMs, durationMs, wasTrimmed: false });
    cursor = endMs;
  }
  return timeline;
}

// Keep the amount of speech proportional to the requested runtime. The old
// six-line ceiling made a one-minute episode sound like a storyboard with
// silence around it. This is a budget, not a promise that every line must be
// spoken without a pause; the timing layer still rejects anything that cannot
// fit cleanly inside the segment.
export function dialogueLineBudget(durationSeconds = 30) {
  const targetWords = dialogueWordBudget(durationSeconds);
  return Math.max(2, Math.min(64, Math.ceil(targetWords / 10)));
}

export function minimumDialogueLines(durationSeconds = 30) {
  const seconds = Math.max(10, Math.min(3600, Number(durationSeconds) || 30));
    // A ten-second bumper cannot carry three full lines plus natural pauses
    // without forcing the final button off-screen. Keep two compact exchanges
    // playable while longer segments retain the denser sitcom target.
  if (seconds <= 12) return 2;
  // Keep the lower bound close to the requested line budget. This prevents a
  // writer from passing a one-minute segment with only a handful of long
  // sentences while still leaving room for intentional reaction pauses.
  return Math.max(3, Math.min(48, Math.ceil(dialogueLineBudget(seconds) * 0.75)));
}

function safeDialogueLine(speakerId, text, index, cursor) {
  const durationMs = estimateLineDurationMs(text);
  const startMs = cursor + (index ? SPEAKER_HANDOFF_GAP_MS : 0);
  return {
    id: `line-${String(index + 1).padStart(2, '0')}`,
    speakerId,
    text: String(text).trim(),
    startMs,
    endMs: startMs + durationMs,
    mode: 'dialogue',
  };
}

export function buildDialogue(templateId, seed = 1, allowedCastIds = CAST_IDS, durationSeconds = 30) {
  const template = findTemplate(templateId);
  const normalizedDuration = Math.max(10, Math.min(3600, Math.round(Number(durationSeconds) || 30)));
  const allowed = new Set(allowedCastIds);
  const bank = DIALOGUE_BANK[template.id] || DIALOGUE_BANK['shift-start'];
  const selected = bank.filter(([speakerId]) => allowed.has(speakerId) && HUMAN_CAST_IDS.has(speakerId));
  const fallback = template.castIds
    .filter((speakerId) => allowed.has(speakerId) && HUMAN_CAST_IDS.has(speakerId))
    .map((speakerId) => [speakerId, `${speakerId} has entered the wrong meeting with confidence.`]);
  const filler = [
    ['rookboss', 'Nobody panic. I have converted the problem into a policy.'],
    ['magsrust', 'I have seen this idiot before, and the idiot was wearing a tie.'],
    ['kernelkline', 'That is not an outage; it is a documented failure of imagination.'],
    ['sudsmcgee', 'We can solve this with a beverage and a wildly premature toast.'],
    ['dooby', 'The machine is fine. It is the meeting that appears emotionally damaged.'],
    ['spaulding', 'That plan has no ballast, no heading, and an alarming amount of confidence.'],
    ['string', 'This argument has a chorus, but nobody has earned the bridge yet.'],
    ['karen', 'I am filing that sentence under preventable and aggressively unnecessary.'],
    ['nico', 'I followed the instructions and the instructions followed me into a wall.'],
  ].filter(([speakerId]) => allowed.has(speakerId) && HUMAN_CAST_IDS.has(speakerId));
  const source = selected.length >= 2 ? [...selected, ...filler] : [...fallback, ...filler];
  const pool = source.length ? source : [['rookboss', 'The factory remains confidently operational.']];
  const targetLines = dialogueLineBudget(durationSeconds);
  const offset = hashSeed(seed, template.id.length) % Math.max(1, source.length);
  const rotated = [...pool.slice(offset), ...pool.slice(0, offset)];
  let cursor = 900;
  const lines = Array.from({ length: targetLines }, (_, index) => {
    const [speakerId, text] = rotated[index % rotated.length];
    const playableText = normalizedDuration <= 12 ? text.split(/\s+/u).slice(0, 4).join(' ') : text;
    const line = safeDialogueLine(speakerId, playableText, index, cursor);
    cursor = line.endMs;
    return line;
  }).filter((line) => line.endMs <= normalizedDuration * 1000 - SCRIPT_END_BUFFER_MS);
  return lines.length ? lines : [safeDialogueLine('rookboss', 'The factory remains confidently operational.', 0, 900)];
}

export function buildBarkEvents(seed = 1, durationSeconds = 30) {
  const durationMs = Math.max(5000, Math.floor(Number(durationSeconds) * 1000));
  // Keep the first bark near the opening exchange so short slots still have
  // an audible dog beat after measured human takes are serialized.
  const first = Math.min(durationMs - 1800, 2400 + (hashSeed(seed, 17) % 1600));
  const second = Math.min(durationMs - 700, first + 6500 + (hashSeed(seed, 23) % 3200));
  return [
    { id: 'bark-01', actorId: 'bork', kind: 'bark', startMs: first, endMs: first + 760, caption: '[barks]' },
    ...(second > first + 1000 ? [{ id: 'bark-02', actorId: 'bork', kind: 'bark', startMs: second, endMs: second + 920, caption: '[excited yipping]' }] : []),
  ];
}

function dialogueActionForLine(line) {
  const performance = `${String(line?.delivery || '')} ${String(line?.reaction || '')} ${String(line?.text || '')}`.toLowerCase();
  if (/\b(point|points|pointing|show|shows|showing|present|presents|presenting)\b/u.test(performance)) return 'point-and-present';
  if (/\b(raise|raises|raising|lift|lifts|lifting|toast|toasts|toasting|drink|drinks|drinking)\b/u.test(performance)) return 'lift-and-present';
  if (/\b(type|types|typing|cable|plug|plugs|console|server|button|press|presses|repair|repairs|inspect|inspects|check|checks)\b/u.test(performance)) return 'interact-with-prop';
  if (/\b(turn|turns|turning|look|looks|looking|glance|glances|side-eye|eye line)\b/u.test(performance)) return 'turn-to-listener';
  if (/\b(shrug|shrugs|shrugging)\b/u.test(performance)) return 'shrug-and-talk';
  return 'talk';
}

function dialogueIntentForLine(line) {
  const text = String(line?.text || '').toLowerCase();
  const performance = String(line?.delivery || '').toLowerCase();
  if (/\?/u.test(text)) return 'challenge-or-question';
  if (/\b(i need|i want|we need|must|order|deadline|sign|approve)\b/u.test(text)) return 'demand-a-concrete-result';
  if (/\b(let us|let's|we should|i propose|plan)\b/u.test(text)) return 'propose-a-fix';
  if (/\b(i admit|i confess|my fault|i broke)\b/u.test(text)) return 'admit-the-complication';
  if (/\b(warn|warning|danger|emergency|outage|failure)\b/u.test(text + ' ' + performance)) return 'warn-the-room';
  if (/\b(you|your)\b/u.test(text)) return 'accuse-or-correct-the-listener';
  return 'advance-the-shared-incident';
}

function dialogueListenerForLine(actorIds, dialogue, index) {
  const line = dialogue[index];
  const humans = actorIds.filter((actorId) => actorId !== 'bork');
  const candidates = [
    dialogue[index + 1]?.speakerId,
    dialogue[index - 1]?.speakerId,
    ...humans,
  ];
  return candidates.find((actorId) => actorId && actorId !== line?.speakerId && humans.includes(actorId)) || null;
}

function dialogueFacing(actorIds, speakerId, listenerId) {
  if (!listenerId) return 'south';
  const speakerIndex = actorIds.indexOf(speakerId);
  const listenerIndex = actorIds.indexOf(listenerId);
  if (speakerIndex < 0 || listenerIndex < 0) return 'south';
  return listenerIndex > speakerIndex ? 'south-east' : 'south-west';
}

function dialogueBeatId(index, lineCount) {
  if (index <= 0) return 'hook';
  if (index >= lineCount - 1) return 'button';
  const progress = index / Math.max(1, lineCount - 1);
  if (progress <= 0.34) return 'want';
  if (progress <= 0.55) return 'obstacle';
  if (progress <= 0.78) return 'escalation';
  return 'reversal';
}

// Props are a small authored vocabulary, not arbitrary image search. A line
// can summon a prop only when it names a concrete subject that the factory
// already owns. Preferred character IDs describe who may hold that prop; if a
// different character mentions it, the prop is staged at a named scene anchor
// instead of mysteriously appearing in the speaker's hands.
export const FACTORY_PROPS = Object.freeze([
  {
    id: 'beer-mug',
    label: 'BEER MUG',
    file: '/bullshit-factory/props/beer-mug.png',
    keywords: ['drink', 'beverage', 'beer', 'mug', 'toast', 'hydration', 'bar', 'bottle', 'snacks'],
    preferredCharacterIds: ['sudsmcgee', 'dooby'],
    anchors: { 'break-room': 'table', 'employee-bar': 'bar_center', 'factory-floor': 'workbench', 'loading-dock': 'dock_center' },
  },
  {
    id: 'ashtray-joint',
    label: 'ASH + JOINT',
    file: '/bullshit-factory/props/ashtray-joint.png',
    keywords: ['marijuana', 'weed', 'joint', 'smoke', 'ashtray', 'wellness', 'vibes', 'pot'],
    preferredCharacterIds: ['dooby', 'sudsmcgee'],
    anchors: { 'break-room': 'table', 'employee-bar': 'bar_center', 'factory-floor': 'workbench', 'senior-lounge': 'table' },
  },
  {
    id: 'crt-keyboard',
    label: 'CRT KEYBOARD',
    file: '/bullshit-factory/props/crt-keyboard.png',
    keywords: ['computer', 'server', 'keyboard', 'cable', 'dns', 'configuration', 'typing', 'terminal', 'uptime', 'outage', 'button', 'console', 'monitor'],
    preferredCharacterIds: ['kernelkline'],
    anchors: { 'server-room': 'terminal', 'arcade-closet': 'center_terminal', 'factory-floor': 'control_panel', 'break-room': 'table' },
  },
  {
    id: 'rope-coil',
    label: 'ROPE COIL',
    file: '/bullshit-factory/props/rope-coil.png',
    keywords: ['boat', 'sail', 'sailing', 'rigging', 'rope', 'mainsail', 'nautical', 'bilge', 'deck', 'maritime', 'tide', 'keel', 'ballast', 'harbor'],
    preferredCharacterIds: ['spaulding'],
    anchors: { 'boat-bay': 'boat', 'marina-slip': 'sailboat', 'loading-dock': 'dock_center', 'factory-floor': 'loading_dock' },
  },
  {
    id: 'rock-speaker',
    label: 'ROCK SPEAKER',
    file: '/bullshit-factory/props/rock-speaker.png',
    keywords: ['guitar', 'solo', 'chorus', 'amp', 'amplifier', 'rock', 'music', 'band', 'riff', 'drummer', 'volume', 'speaker'],
    preferredCharacterIds: ['string'],
    anchors: { 'loading-dock': 'dock_center', 'employee-bar': 'bar_center', 'factory-floor': 'main_floor', 'break-room': 'table' },
  },
  {
    id: 'old-cane',
    label: 'OLD CANE',
    file: '/bullshit-factory/props/old-cane.png',
    keywords: ['old people', 'elderly', 'senior', 'cane', 'committee', 'retired', 'screwdriver', 'veteran'],
    preferredCharacterIds: ['magsrust', 'spaulding'],
    anchors: { 'senior-lounge': 'left_chair', 'factory-floor': 'server_rack', 'server-room': 'left_rack', 'break-room': 'table' },
  },
]);

function propTextForLine(line) {
  return String(line?.text || '').toLowerCase().replace(/\s+/gu, ' ').trim();
}

function propKeywordMatches(text, keyword) {
  const normalized = String(keyword || '').toLowerCase().trim();
  if (!normalized) return false;
  if (normalized.includes(' ')) return text.includes(normalized);
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'u').test(text);
}

export function buildPropPlan(dialogue, sceneId) {
  return (Array.isArray(dialogue) ? dialogue : []).flatMap((line) => {
    const text = propTextForLine(line);
    return FACTORY_PROPS
      .map((prop) => ({
        prop,
        matchedKeywords: prop.keywords.filter((keyword) => propKeywordMatches(text, keyword)),
      }))
      .filter((match) => match.matchedKeywords.length)
      .sort((left, right) => {
        const leftPreferred = left.prop.preferredCharacterIds.includes(line.speakerId) ? 1 : 0;
        const rightPreferred = right.prop.preferredCharacterIds.includes(line.speakerId) ? 1 : 0;
        return right.matchedKeywords.length - left.matchedKeywords.length
          || rightPreferred - leftPreferred
          || left.prop.id.localeCompare(right.prop.id);
      })
      .slice(0, 1)
      .map(({ prop, matchedKeywords }) => {
        const attachedToSpeaker = prop.preferredCharacterIds.includes(line.speakerId);
        return {
          id: `prop-${line.id}-${prop.id}`,
          propId: prop.id,
          label: prop.label,
          sceneId,
          lineId: line.id,
          speakerId: line.speakerId,
          matchedKeywords,
          relevance: 'explicit-dialogue-keyword',
          purpose: 'line:' + line.id + ' visibly supports ' + matchedKeywords.join(', '),
          attachment: attachedToSpeaker ? 'speaker' : 'scene',
          anchor: prop.anchors[sceneId] || 'center',
          action: dialogueActionForLine(line),
          startMs: line.startMs,
          endMs: line.endMs,
        };
      });
  });
}

export const ANIMATION_ACTIONS = Object.freeze([
  'idle',
  'listen',
  'talk',
  'react',
  'turn',
  'point',
  'present',
  'lift',
  'inspect',
  'type',
  'drink',
  'hand_off',
  'carry',
  'push',
  'repair',
  'look_left',
  'look_right',
  'enter',
  'walk',
  'stop',
  'exit',
  'bark',
  'wag_tail',
  'sniff',
  'shrug',
  'jump',
  'recoil',
  'interact',
]);

function canonicalMotionAction(value, fallback = 'idle') {
  const raw = String(value || '').trim().toLowerCase().replace(/[- ]+/gu, '_');
  if (raw.includes('point') || raw.includes('present') || raw.includes('gesture')) return raw.includes('point') ? 'point' : 'present';
  if (raw.includes('lift')) return 'lift';
  if (raw.includes('carry')) return 'carry';
  if (raw.includes('hand') && raw.includes('off')) return 'hand_off';
  if (raw === 'interact') return 'interact';
  if (raw.includes('prop') || raw.includes('inspect')) return 'inspect';
  if (raw.includes('type')) return 'type';
  if (raw.includes('drink') || raw.includes('toast')) return 'drink';
  if (raw.includes('repair') || raw.includes('fix')) return 'repair';
  if (raw.includes('turn')) return 'turn';
  if (raw.includes('look_left')) return 'look_left';
  if (raw.includes('look_right')) return 'look_right';
  if (raw === 'shrug') return 'shrug';
  if (raw === 'jump') return 'jump';
  if (raw === 'recoil') return 'recoil';
  if (raw.includes('react') || raw.includes('nod') || raw.includes('wave')) return 'react';
  if (raw.includes('bark') || raw.includes('woof') || raw.includes('yip')) return 'bark';
  if (raw.includes('wag')) return 'wag_tail';
  if (raw.includes('sniff')) return 'sniff';
  if (raw.includes('enter') || raw.includes('spawn')) return 'enter';
  if (raw.includes('exit')) return 'exit';
  if (raw.includes('walk') || raw.includes('cross') || raw.includes('move')) return 'walk';
  if (raw === 'stop') return 'stop';
  if (ANIMATION_ACTIONS.includes(raw)) return raw;
  return fallback;
}

function motionPriority(kind, action) {
  if (kind === 'talk-and-gesture') return 100;
  if (kind === 'bark-and-react') return 100;
  if (action === 'react') return 80;
  if (kind === 'semantic-action') return 70;
  if (kind === 'listen-and-react') return 40;
  return 10;
}

function boundedMotionInterval(startMs, endMs, durationMs) {
  const deadlineMs = Math.max(180, durationMs - SCRIPT_END_BUFFER_MS);
  const latestStartMs = Math.max(0, deadlineMs - 180);
  const start = Math.max(0, Math.min(latestStartMs, Math.round(Number(startMs) || 0)));
  const end = Math.min(deadlineMs, Math.max(start + 180, Math.round(Number(endMs) || start + 900)));
  return { startMs: start, endMs: end };
}

function motionStateFromCue(cue, index) {
  const action = canonicalMotionAction(cue.action, cue.kind === 'bark-and-react' ? 'bark' : cue.kind === 'listen-and-react' ? 'listen' : 'idle');
  return {
    id: 'state-' + (cue.id || String(index + 1).padStart(2, '0')),
    actorId: cue.actorId,
    startMs: cue.startMs,
    endMs: cue.endMs,
    action,
    clipAction: cue.clipAction || action,
    anchor: cue.near || null,
    facing: cue.facing || 'south',
    prop: cue.propId || null,
    purpose: cue.purpose || (action + ' serves the locked scene beat'),
    priority: Number(cue.priority) || motionPriority(cue.kind, action),
    lineId: cue.lineId || null,
    listenerId: cue.listenerId || null,
    intent: cue.intent || null,
    reaction: cue.reaction || null,
    postLineReaction: cue.postLineReaction || null,
    shotType: cue.shotType || null,
    sourceCueId: cue.id || null,
  };
}

function buildMotionShots(castIds, dialogue, barkEvents, durationMs, props = []) {
  const deadlineMs = Math.max(0, durationMs - SCRIPT_END_BUFFER_MS);
  const lines = Array.isArray(dialogue) ? dialogue : [];
  const propByLineId = new Map((Array.isArray(props) ? props : []).map((prop) => [prop.lineId, prop]));
  const firstLineStartMs = Number(lines[0]?.startMs);
  const establishingEndMs = Number.isFinite(firstLineStartMs)
    ? Math.max(600, Math.min(1400, firstLineStartMs + 180))
    : Math.min(deadlineMs, 1200);
  const shots = [{
    id: 'shot-wide-establish',
    type: 'wide_scene',
    startMs: 0,
    endMs: Math.min(deadlineMs, establishingEndMs),
    participants: [...castIds],
    focusActorId: null,
    listenerId: null,
    beatId: 'hook',
    priority: 10,
    purpose: 'establish the readable floor and separated cast',
  }];
  for (const [index, line] of lines.entries()) {
    const listenerId = dialogueListenerForLine(castIds, lines, index);
    const beatId = dialogueBeatId(index, lines.length);
    const type = beatId === 'hook'
      ? 'wide_scene'
      : beatId === 'want' || beatId === 'obstacle'
        ? 'two_shot'
        : beatId === 'escalation'
          ? 'group_shot'
          : beatId === 'reversal'
            ? 'reaction'
            : 'final_button';
    const bounds = boundedMotionInterval(Number(line.startMs) - 220, Number(line.endMs) + 180, durationMs);
    shots.push({
      id: 'shot-' + line.id,
      type,
      ...bounds,
      participants: type === 'group_shot'
        ? [...castIds]
        : [...new Set([line.speakerId, listenerId].filter(Boolean))],
      focusActorId: beatId === 'reversal' && listenerId ? listenerId : line.speakerId,
      listenerId,
      beatId,
      lineId: line.id,
      priority: beatId === 'reversal' ? 60 : beatId === 'button' ? 70 : 40,
      purpose: type + ' serves the ' + beatId + ' beat for ' + line.id,
    });
    const prop = propByLineId.get(line.id);
    if (prop) {
      const propBounds = boundedMotionInterval(Number(line.startMs) + 120, Math.min(Number(line.endMs), Number(line.startMs) + 760), durationMs);
      shots.push({
        id: 'shot-prop-' + line.id,
        type: 'prop_insert',
        ...propBounds,
        participants: [line.speakerId],
        focusActorId: line.speakerId,
        listenerId,
        beatId,
        lineId: line.id,
        propId: prop.propId,
        priority: 75,
        purpose: 'show the dialogue-relevant ' + prop.propId + ' while ' + line.id + ' names it',
      });
    }
  }
  for (const bark of Array.isArray(barkEvents) ? barkEvents : []) {
    const bounds = boundedMotionInterval(Number(bark.startMs) - 120, Number(bark.endMs) + 260, durationMs);
    shots.push({
      id: 'shot-' + bark.id,
      type: 'dog_reaction',
      ...bounds,
      participants: ['bork'],
      focusActorId: 'bork',
      listenerId: null,
      beatId: 'reaction',
      priority: 80,
      purpose: 'show Bork barking with a purposeful head and tail reaction',
    });
  }
  const finalLine = lines.at(-1);
  const finalListener = lines.length ? dialogueListenerForLine(castIds, lines, lines.length - 1) : null;
  const finalFocus = castIds.includes('bork') && (Array.isArray(barkEvents) ? barkEvents : []).some((event) => Number(event.endMs) >= deadlineMs - 1400)
    ? 'bork'
    : finalLine?.speakerId || castIds[0] || null;
  const finalStart = Math.max(0, deadlineMs - 900);
  shots.push({
    id: 'shot-final-button',
    type: 'final_button',
    startMs: finalStart,
    endMs: durationMs,
    participants: [...new Set([finalFocus, finalListener, castIds.includes('bork') ? 'bork' : null].filter(Boolean))],
    focusActorId: finalFocus,
    listenerId: finalListener,
    beatId: 'button',
    priority: 100,
    purpose: 'hold the final consequence through the measured 30 ms end-button tail',
  });
  return shots.sort((left, right) => left.startMs - right.startMs || left.id.localeCompare(right.id));
}

export function buildMotionPlan(castIds, dialogue, barkEvents, seed = 1, fps = 12, stageDirections = [], durationSeconds = 30, options = {}) {
  const actorIds = [...new Set(Array.isArray(castIds) ? castIds : [])].slice(0, 10);
  const dialogueLines = Array.isArray(dialogue) ? dialogue : [];
  const props = Array.isArray(options?.props) ? options.props : [];
  const propByLineId = new Map(props.map((prop) => [prop.lineId, prop]));
  const actors = actorIds.map((actorId, index) => ({
    actorId,
    zIndex: index,
    phase: (hashSeed(seed, index + 4) % 1000) / 1000,
    profile: MOVEMENT_BY_CHARACTER[actorId] || MOVEMENT_BY_CHARACTER.rookboss,
    idle: { loop: true, fps, framePolicy: 'authored-clip' },
    head: { independent: true, amplitude: actorId === 'bork' ? 4 : 2, cycleMs: 1700 + index * 113 },
    eyes: { independent: true, blink: true, cycleMs: 2600 + index * 97, trackSpeaker: true },
    mouth: { independent: actorId !== 'bork', states: actorId === 'bork' ? [] : ['rest', 'a', 'e', 'i', 'o', 'u', 'mbp'], timing: 'word-window' },
    limbs: { independent: true, gestures: true, weightShift: true },
    secondaryMotion: true,
  }));
  const semanticDirections = Array.isArray(stageDirections)
    ? stageDirections.filter((direction) => direction?.character && direction?.action && actorIds.includes(direction.character)).slice(0, 32)
    : [];
  const durationMs = Math.max(180, Math.round(Number(durationSeconds || 30) * 1000));
  const deadlineMs = Math.max(0, durationMs - SCRIPT_END_BUFFER_MS);
  const stageSlotMs = Math.max(1200, Math.floor(Math.max(1200, deadlineMs - SPEECH_START_RESERVE_MS) / Math.max(1, semanticDirections.length)));
  const dialogueByActor = new Map();
  for (const line of dialogueLines) {
    const lines = dialogueByActor.get(line.speakerId) || [];
    lines.push(line);
    dialogueByActor.set(line.speakerId, lines);
  }
  const claimedActionLines = new Set();
  const blockingCues = semanticDirections.map((direction, index) => {
    const rawAction = String(direction.action || '').toLowerCase();
    const action = canonicalMotionAction(rawAction, 'idle');
    const actorLines = dialogueByActor.get(direction.character) || [];
    const otherLines = dialogueLines.filter((line) => line.speakerId !== direction.character);
    const requestedLineId = String(direction.line_id || direction.lineId || '').trim();
    const requestedLine = requestedLineId ? dialogueLines.find((line) => line.id === requestedLineId) : null;
    const anchorLine = requestedLine || (
      ['talk', 'interact', 'react', 'turn', 'point', 'present', 'lift', 'inspect', 'type', 'drink', 'repair'].includes(action)
        ? [...actorLines, ...otherLines].find((line) => !claimedActionLines.has(line.id))
        : null);
    if (anchorLine) claimedActionLines.add(anchorLine.id);
    const fallbackStartMs = anchorLine
      ? anchorLine.startMs
      : Math.min(deadlineMs - 180, SPEECH_START_RESERVE_MS + index * stageSlotMs);
    const hasDirectedStart = direction.start_ms !== null && direction.start_ms !== undefined && Number.isFinite(Number(direction.start_ms));
    const hasDirectedEnd = direction.end_ms !== null && direction.end_ms !== undefined && Number.isFinite(Number(direction.end_ms));
    // Once a direction is bound to a locked dialogue line, measured voice
    // timing wins over stale pre-TTS estimates from the animation director.
    const directedStartMs = anchorLine
      ? Number(anchorLine.startMs)
      : hasDirectedStart ? Number(direction.start_ms) : fallbackStartMs;
    const directedEndMs = anchorLine
      ? Number(anchorLine.endMs)
      : hasDirectedEnd
        ? Number(direction.end_ms)
        : directedStartMs + Math.max(900, Math.floor(stageSlotMs * 0.78));
    const interval = boundedMotionInterval(directedStartMs, directedEndMs, durationMs);
    return {
      id: 'blocking-' + String(index + 1).padStart(2, '0'),
      actorId: direction.character,
      kind: 'semantic-action',
      action: rawAction || action,
      clipAction: direction.clip_action || action,
      location: direction.location,
      walkBand: direction.walk_band,
      near: direction.near,
      ...interval,
      gesture: rawAction || action,
      facing: direction.facing || 'south',
      propId: direction.prop_id || null,
      purpose: direction.purpose || (anchorLine ? 'voice:' + anchorLine.id : 'scene-blocking'),
      priority: Number(direction.priority) || motionPriority('semantic-action', action),
      lineId: anchorLine?.id || requestedLineId || null,
      listenerId: direction.listener_id || direction.listenerId || null,
      intent: direction.intent || null,
      reaction: direction.reaction || null,
      postLineReaction: direction.post_line_reaction || direction.postLineReaction || null,
      shotType: direction.shot_type || direction.shotType || null,
    };
  });
  const dialogueCues = dialogueLines.map((line, index) => {
    const action = dialogueActionForLine(line);
    const listenerId = dialogueListenerForLine(actorIds, dialogueLines, index);
    const prop = propByLineId.get(line.id);
    return {
      id: 'talk-' + line.id,
      actorId: line.speakerId,
      kind: 'talk-and-gesture',
      startMs: line.startMs,
      endMs: line.endMs,
      action,
      clipAction: canonicalMotionAction(action, 'talk'),
      gesture: MOVEMENT_BY_CHARACTER[line.speakerId]?.limbs || 'gesture',
      delivery: String(line.delivery || '').slice(0, 160),
      reaction: String(line.reaction || '').slice(0, 160),
      postLineReaction: String(line.reaction || '').slice(0, 160),
      lineId: line.id,
      listenerId,
      intent: dialogueIntentForLine(line),
      facing: dialogueFacing(actorIds, line.speakerId, listenerId),
      propId: prop?.propId || null,
      shotType: dialogueBeatId(index, dialogueLines.length),
      purpose: 'voice:' + line.id,
      priority: motionPriority('talk-and-gesture', action),
    };
  });
  const barkCues = (Array.isArray(barkEvents) ? barkEvents : []).map((event) => ({
    id: event.id,
    actorId: event.actorId,
    kind: 'bark-and-react',
    startMs: event.startMs,
    endMs: event.endMs,
    action: 'bark',
    clipAction: 'bark',
    gesture: 'head-ears-tail',
    listenerId: actorIds.find((actorId) => actorId !== 'bork') || null,
    intent: 'punctuate-the-shared-incident',
    reaction: event.caption,
    purpose: 'sound:' + event.id,
    priority: motionPriority('bark-and-react', 'bark'),
  }));
  const listenerCues = [];
  for (const [index, line] of dialogueLines.entries()) {
    const listener = dialogueListenerForLine(actorIds, dialogueLines, index);
    if (!listener) continue;
    listenerCues.push({
      id: 'listen-' + line.id,
      actorId: listener,
      kind: 'listen-and-react',
      startMs: line.startMs,
      endMs: line.endMs,
      action: 'listen',
      clipAction: 'listen',
      lineId: line.id,
      listenerId: line.speakerId,
      intent: 'track-and-evaluate-the-speaker',
      reaction: String(line.reaction || '').slice(0, 160),
      facing: dialogueFacing(actorIds, listener, line.speakerId),
      purpose: 'listen:' + line.id,
      priority: motionPriority('listen-and-react', 'listen'),
    });
    if (line.reaction) {
      const reactionBounds = boundedMotionInterval(line.endMs, Number(line.endMs) + 720, durationMs);
      listenerCues.push({
        id: 'react-' + line.id,
        actorId: listener,
        kind: 'listen-and-react',
        ...reactionBounds,
        action: 'react',
        clipAction: 'react',
        lineId: line.id,
        listenerId: line.speakerId,
        intent: 'land-the-authored-post-line-reaction',
        reaction: String(line.reaction || '').slice(0, 160),
        facing: dialogueFacing(actorIds, listener, line.speakerId),
        purpose: 'reaction:' + line.id,
        priority: motionPriority('listen-and-react', 'react'),
      });
    }
  }
  const cues = [...dialogueCues, ...barkCues, ...blockingCues, ...listenerCues];
  const states = [];
  for (const actor of actors) {
    const actorCues = cues
      .filter((cue) => cue.actorId === actor.actorId)
      .sort((left, right) => left.startMs - right.startMs || (right.priority || 0) - (left.priority || 0) || left.id.localeCompare(right.id));
    const defaultState = {
      id: 'state-' + actor.actorId + '-default',
      actorId: actor.actorId,
      startMs: 0,
      endMs: durationMs,
      action: 'idle',
      clipAction: 'idle',
      anchor: null,
      facing: 'south',
      prop: null,
      purpose: 'hold a grounded idle/listen-ready pose when no timed cue is active',
      priority: 0,
      previous: null,
      next: actorCues.length ? 'state-' + actorCues[0].id : null,
      default: true,
    };
    states.push(defaultState);
    const timedStates = actorCues.map((cue, index) => ({
      ...motionStateFromCue(cue, index),
      previous: index ? 'state-' + actorCues[index - 1].id : defaultState.id,
      next: index + 1 < actorCues.length ? 'state-' + actorCues[index + 1].id : null,
    }));
    states.push(...timedStates);
  }
  return {
    fps,
    rootPinned: true,
    scriptLocked: true,
    noStaticStoryboard: true,
    semanticVersion: '2.0',
    actionRegistryVersion: '1.1',
    actors,
    cues,
    states,
    shots: buildMotionShots(actorIds, dialogueLines, barkEvents, durationMs, props),
    semanticDirections,
    collisionPolicy: {
      coordinateSpace: 'visible-alpha-bounds',
      minimumGapPx: 8,
      check: 'every-rendered-frame',
      movingActors: 'reroute-or-quarantine',
    },
  };
}

export function buildOrangeIdiotTvPlan(text, sceneId, durationSeconds = 30, source = 'operator-supplied-speech-excerpt', position = 'ending', speechDurationSeconds = 0) {
  const normalizedText = String(text || '').replace(/\s+/gu, ' ').trim().slice(0, ORANGE_IDIOT_MAX_SPEECH_CHARACTERS);
  const standalone = sceneId === ORANGE_IDIOT_STANDALONE_SCENE_ID;
  if (!normalizedText || (![ORANGE_IDIOT_SCENE_ID, ORANGE_IDIOT_STANDALONE_SCENE_ID].includes(sceneId))) return [];
  const totalMs = Math.max(10_000, Math.round((Number(durationSeconds) || 30) * 1000));
  const deadlineMs = Math.max(0, totalMs - SCRIPT_END_BUFFER_MS);
  const speechTargetSeconds = orangeIdiotSpeechTargetSeconds(speechDurationSeconds, totalMs / 1000, standalone);
  const durationMs = speechTargetSeconds > 0
    ? Math.min(deadlineMs, speechTargetSeconds * 1000)
    : estimateLineDurationMs(normalizedText);
  // A standalone Orange episode is its own broadcast scene. Its appearance
  // position is intentionally ignored so selecting middle/ending cannot push
  // the only character out of the visible shot or create an empty episode.
  const normalizedPosition = standalone
    ? 'full-broadcast'
    : ['opening', 'middle', 'ending'].includes(String(position || '').toLowerCase()) ? String(position).toLowerCase() : 'ending';
  const availableMs = Math.max(0, deadlineMs - durationMs);
  const startMs = standalone
    ? 0
    : normalizedPosition === 'opening'
      ? Math.min(availableMs, 900)
      : normalizedPosition === 'middle'
        ? Math.min(availableMs, Math.max(0, Math.floor(availableMs / 2)))
        : Math.min(availableMs, Math.max(0, availableMs - 800));
  const endMs = standalone ? Math.min(deadlineMs, durationMs) : startMs + durationMs;
  if (endMs - startMs < 180) return [];
  return [{
    id: 'tv-orange-idiot-01',
    characterId: ORANGE_IDIOT_ID,
    speakerId: ORANGE_IDIOT_ID,
    text: normalizedText,
    startMs,
    endMs,
    mode: standalone ? 'house-broadcast' : 'tv-interruption',
    sceneId,
    view: 'south',
    source,
    position: normalizedPosition,
    speechDurationSeconds: speechTargetSeconds || null,
  }];
}

export function buildCaptions(dialogue, barkEvents, tvInterruptions = []) {
  return [
    ...dialogue.map((line) => ({
      id: `caption-${line.id}`,
      speakerId: line.speakerId,
      text: line.text,
      startMs: line.startMs,
      endMs: line.endMs,
    })),
    ...barkEvents.map((event) => ({
      id: `caption-${event.id}`,
      speakerId: 'bork',
      text: event.caption,
      startMs: event.startMs,
      endMs: event.endMs,
      soundOnly: true,
    })),
    ...tvInterruptions.map((event) => ({
      id: `caption-${event.id}`,
      speakerId: ORANGE_IDIOT_ID,
      text: event.text,
      startMs: event.startMs,
      endMs: event.endMs,
      tvOnly: true,
    })),
  ].sort((a, b) => a.startMs - b.startMs);
}

export function buildSegmentDraft({ templateId, seed = 1, durationSeconds = 30, castIds = CAST_IDS, sceneId = null, orangeIdiotSpeechText = '', orangeIdiotRequested = false, orangeIdiotOnly = false, orangeIdiotPosition = 'ending', orangeIdiotSpeechDurationSeconds = 0, orangeIdiotResearch = null, director = 'deterministic-goblin-fallback' } = {}) {
  const template = findTemplate(templateId);
  const scene = orangeIdiotOnly ? findScene(ORANGE_IDIOT_STANDALONE_SCENE_ID) : findScene(sceneId || template.sceneId);
  const normalizedOrangeSpeechText = String(orangeIdiotSpeechText || '').replace(/\s+/gu, ' ').trim().slice(0, ORANGE_IDIOT_MAX_SPEECH_CHARACTERS);
  const effectiveOrangePosition = orangeIdiotOnly
    ? 'full-broadcast'
    : ['opening', 'middle', 'ending'].includes(String(orangeIdiotPosition || '').toLowerCase()) ? String(orangeIdiotPosition).toLowerCase() : 'ending';
  const requestedCast = [...new Set((Array.isArray(castIds) ? castIds : []).filter((id) => CAST_IDS.includes(id)))].slice(0, 10);
  const requestedHumans = requestedCast.filter((id) => id !== 'bork');
  const fallbackHumans = template.castIds.filter((id) => id !== 'bork' && CAST_IDS.includes(id));
  const humanPool = requestedHumans.length ? requestedHumans : (fallbackHumans.length ? fallbackHumans : ['rookboss']);
  const normalizedDuration = Math.max(10, Math.min(300, Math.round(Number(durationSeconds) || 30)));
  // Keep enough dialogue slots for every selected human to get a turn and keep
  // the measured full-size sprites inside a collision-free 384px scene. Longer
  // episodes rotate focused groups instead of piling the entire cast into one shot.
  const maxHumanCast = Math.max(2, Math.min(4, dialogueLineBudget(normalizedDuration)));
  const humans = orangeIdiotOnly ? [] : humanPool.slice(0, maxHumanCast);
  const finalCast = orangeIdiotOnly ? [] : [...new Set([...humans.slice(0, 9), 'bork'])];
  const normalizedOrangeSpeechDuration = normalizeOrangeIdiotSpeechDurationSeconds(orangeIdiotSpeechDurationSeconds, normalizedDuration);
  const dialogue = orangeIdiotOnly ? [] : buildDialogue(template.id, seed, finalCast, normalizedDuration);
  const barkEvents = orangeIdiotOnly ? [] : buildBarkEvents(seed, durationSeconds);
  const tvInterruptions = buildOrangeIdiotTvPlan(normalizedOrangeSpeechText, scene.id, normalizedDuration, 'operator-supplied-speech-excerpt', effectiveOrangePosition, normalizedOrangeSpeechDuration);
  const layout = buildSceneLayout(scene.id, finalCast);
  const captions = buildCaptions(dialogue, barkEvents, tvInterruptions);
  const props = buildPropPlan(dialogue, scene.id);
  const motion = buildMotionPlan(finalCast, dialogue, barkEvents, seed, 12, [], normalizedDuration, { props, storyBeats: DEFAULT_STORY_BEATS });
  const id = `segment-${template.id}-${numericSeed(seed)}`;
  return {
    schemaVersion: PRODUCTION_VERSION,
    id,
    showId: 'bullshit-factory',
    state: 'draft',
    templateId: template.id,
    category: template.category,
    title: template.title,
    synopsis: template.synopsis,
    sceneId: scene.id,
    sceneLabel: scene.label,
    location: { id: scene.id, semantic: true, resolver: 'bullshit-factory-location', positionRule: 'feet-touch-ground', depthRule: 'feet-y' },
    durationSeconds: normalizedDuration,
    castIds: finalCast,
    orangeIdiotOnly: Boolean(orangeIdiotOnly),
    orangeIdiotRequested: Boolean(orangeIdiotRequested || orangeIdiotOnly || normalizedOrangeSpeechText),
    orangeIdiotSpeechText: normalizedOrangeSpeechText,
    orangeIdiotSpeechLocked: Boolean(normalizedOrangeSpeechText),
    orangeIdiotSpeechDurationSeconds: normalizedOrangeSpeechDuration,
    orangeIdiotPosition: effectiveOrangePosition,
    orangeIdiotResearch: orangeIdiotResearch || null,
    director: { agent: 'Goblin', mode: director, seed: numericSeed(seed) },
    story: { premise: template.synopsis, alteredStateMode: 'none', beats: DEFAULT_STORY_BEATS.map((beat) => ({ ...beat })) },
    writing: { trainingVersion: '1.0', sourceMode: 'deterministic-template', qualityScore: null },
    dialogue,
    barkEvents,
    tvInterruptions,
    captions,
    props,
    motion,
    layout,
    audio: { status: 'pending', lineFiles: [], mixFile: null, sampleRate: 44100, channels: 2 },
    music: { mode: 'none', trackId: 'bf-garage-stomp', required: false, status: 'approved', file: '/bullshit-factory/music/beds/bf-garage-stomp.wav', provider: 'internal' },
    render: { status: 'pending', videoFile: null, posterFile: null, fps: 12, width: 384, height: 216 },
    continuity: { reads: ['department-state', 'recent-jokes'], writes: [`incident:${template.id}`], runningJokeHooks: ['bork-is-right', template.category] },
    validation: { status: 'pending', errors: [], warnings: [] },
    createdAt: new Date().toISOString(),
  };
}

export function validateSegmentContract(segment, { requireMedia = false, musicTracks = MUSIC_RIGHTS, knownCastIds = CAST_IDS } = {}) {
  const errors = [];
  const warnings = [];
  if (!segment || segment.showId !== 'bullshit-factory') errors.push('segment showId must be bullshit-factory');
  if (!segment?.id || !/^segment-[a-z0-9_-]+-\d+$/iu.test(segment.id)) errors.push('segment id is missing or unsafe');
  if (!Number.isFinite(Number(segment?.durationSeconds)) || Number(segment.durationSeconds) < 0.18 || Number(segment.durationSeconds) > 300) errors.push('durationSeconds must be between 0.18 and 300 after measured post-speech trimming');
  const orangeIdiotOnly = segment?.orangeIdiotOnly === true;
  const castIds = Array.isArray(segment?.castIds) ? [...new Set(segment.castIds)] : [];
  if ((!castIds.length && !orangeIdiotOnly) || castIds.length > 10) errors.push('castIds must contain 1 to 10 unique characters');
  if (!orangeIdiotOnly && !castIds.includes('bork')) errors.push('every production segment must include Bork for bark-only coverage');
  if (castIds.some((id) => !knownCastIds.includes(id))) errors.push('segment references an unknown cast member');
  const dialogue = Array.isArray(segment?.dialogue) ? segment.dialogue : [];
  if (!dialogue.length && !orangeIdiotOnly) errors.push('segment has no human dialogue');
  if (orangeIdiotOnly && dialogue.length) errors.push('Orange Idiot-only segments cannot include floor dialogue');
  if (dialogue.some((line) => line.speakerId === 'bork')) errors.push('Bork cannot receive human dialogue');
  if (dialogue.some((line) => !HUMAN_CAST_IDS.has(line.speakerId) || !String(line.text || '').trim())) errors.push('dialogue contains an invalid human line');
  const captions = Array.isArray(segment?.captions) ? segment.captions : [];
  const captionIds = new Set(captions.filter((caption) => !caption.soundOnly).map((caption) => caption.speakerId + ':' + caption.text));
  if (dialogue.some((line) => !captionIds.has(line.speakerId + ':' + line.text))) errors.push('every dialogue line must have a matching caption');
  const dialogueDeadlineMs = Math.max(0, Number(segment?.durationSeconds || 0) * 1000 - SCRIPT_END_BUFFER_MS);
  if (dialogue.some((line) => Number(line?.endMs) > dialogueDeadlineMs)) errors.push('dialogue must end at least ' + (SCRIPT_END_BUFFER_MS / 1000) + ' seconds before the segment ends');
  const tvInterruptions = Array.isArray(segment?.tvInterruptions) ? segment.tvInterruptions : [];
  if (tvInterruptions.some((event) => event?.characterId !== ORANGE_IDIOT_ID || event?.speakerId !== ORANGE_IDIOT_ID || event?.view !== 'south' || !String(event?.text || '').trim())) errors.push('Orange Idiot TV interruptions must be south-only and carry speech text');
  if (orangeIdiotOnly && tvInterruptions.length !== 1) errors.push('Orange Idiot-only segments must contain exactly one TV interruption');
  const isOrangeStandaloneScene = segment.sceneId === ORANGE_IDIOT_STANDALONE_SCENE_ID;
  if (orangeIdiotOnly && !isOrangeStandaloneScene) errors.push('Orange Idiot-only segments must use the standalone Orange Idiot house');
  if (tvInterruptions.length && ![ORANGE_IDIOT_SCENE_ID, ORANGE_IDIOT_STANDALONE_SCENE_ID].includes(segment.sceneId)) errors.push('Orange Idiot may only appear in the senior-lounge television or standalone Orange Idiot house');
  if (isOrangeStandaloneScene && tvInterruptions.some((event) => event?.mode !== 'house-broadcast')) errors.push('standalone Orange Idiot segments must use the house broadcast mode');
  if (segment.sceneId === ORANGE_IDIOT_SCENE_ID && tvInterruptions.some((event) => event?.mode === 'house-broadcast')) errors.push('senior-lounge Orange Idiot inserts must use the television broadcast mode');
  if (tvInterruptions.some((event) => Number(event?.endMs) > dialogueDeadlineMs)) errors.push('Orange Idiot speech must end at least ' + (SCRIPT_END_BUFFER_MS / 1000) + ' seconds before the segment ends');
  if (tvInterruptions.some((event) => !captionIds.has(ORANGE_IDIOT_ID + ':' + event.text))) errors.push('every Orange Idiot interruption must have a matching caption');
  const humanCastIds = castIds.filter((id) => id !== 'bork');
  const distinctHumanSpeakers = new Set(dialogue.map((line) => line.speakerId)).size;
  const storyBeats = Array.isArray(segment?.story?.beats) ? segment.story.beats : [];
  const storyBeatIds = new Set(storyBeats.map((beat) => beat?.id));
  const missingStoryBeats = ['hook', 'want', 'obstacle', 'escalation', 'reversal', 'button'].filter((id) => !storyBeatIds.has(id));
  if (missingStoryBeats.length) warnings.push(`writing beat sheet is missing: ${missingStoryBeats.join(', ')}`);
  if (distinctHumanSpeakers < 2 && humanCastIds.length > 1) warnings.push('dialogue uses one human voice; add character contrast when the scene allows it');
  if (dialogue.length < minimumDialogueLines(segment?.durationSeconds)) warnings.push(`dialogue density is low: ${dialogue.length}/${minimumDialogueLines(segment?.durationSeconds)} minimum timed lines`);
  if (segment?.motion?.noStaticStoryboard !== true) errors.push('motion contract must reject static-storyboard scenes');
  if (!segment?.motion?.rootPinned) warnings.push('root pinning was not declared');
  const semanticMotionV2 = segment?.motion?.semanticVersion === '2.0';
  if (!orangeIdiotOnly && semanticMotionV2 && segment?.motion?.scriptLocked !== true) errors.push('animation direction must declare the approved script locked');
  const motionCues = Array.isArray(segment?.motion?.cues) ? segment.motion.cues : [];
  const motionStates = Array.isArray(segment?.motion?.states) ? segment.motion.states : [];
  const motionShots = Array.isArray(segment?.motion?.shots) ? segment.motion.shots : [];
  if (!orangeIdiotOnly && semanticMotionV2) {
    const humanSet = new Set(humanCastIds);
    for (const line of dialogue) {
      const talkCue = motionCues.find((cue) => cue.kind === 'talk-and-gesture' && cue.actorId === line.speakerId && cue.lineId === line.id && cue.purpose === 'voice:' + line.id);
      if (!talkCue) errors.push('every locked dialogue line needs one matching timed talk cue');
      if (humanCastIds.length > 1 && (!talkCue?.listenerId || !humanSet.has(talkCue.listenerId) || talkCue.listenerId === line.speakerId)) {
        errors.push('every locked dialogue line needs a different human listener');
      }
      const listenerCue = motionCues.find((cue) => cue.kind === 'listen-and-react' && cue.actorId === talkCue?.listenerId && cue.lineId === line.id);
      if (humanCastIds.length > 1 && !listenerCue) errors.push('every locked dialogue line needs a listener state tied to that line');
      const readableShot = motionShots.find((shot) => shot.lineId === line.id && shot.participants?.includes(line.speakerId));
      if (!readableShot) errors.push('every locked dialogue line needs a story-motivated shot');
    }
    if (!motionShots.some((shot) => ['wide_scene', 'wide_factory'].includes(shot.type) && shot.beatId === 'hook')) errors.push('motion plan needs an establishing hook shot');
    if (humanCastIds.length > 1 && dialogue.length > 2 && !motionShots.some((shot) => shot.type === 'two_shot')) errors.push('motion plan needs a two-shot for character conflict');
    if (!motionShots.some((shot) => shot.type === 'final_button' && shot.beatId === 'button')) errors.push('motion plan needs a final button shot');
    if (motionStates.some((state) => !state.default && state.action !== 'idle' && !String(state.purpose || '').trim())) errors.push('every non-idle motion state needs a story purpose');
    if (motionCues.some((cue) => Number(cue.startMs) < 0 || Number(cue.endMs) <= Number(cue.startMs) || Number(cue.endMs) > Number(segment.durationSeconds) * 1000)) errors.push('every motion cue must stay inside the segment timeline');
    const travelActions = new Set(['enter', 'walk', 'exit']);
    if (motionCues.some((cue) => travelActions.has(String(cue.action || '').toLowerCase()) && !/line:|voice:|reaction:|prop:|transition|entrance|exit/iu.test(String(cue.purpose || '')))) {
      errors.push('walking, entering, and exiting require an explicit story transition or prop purpose');
    }
    const dialogueById = new Map(dialogue.map((line) => [line.id, line]));
    const knownPropIds = new Set(FACTORY_PROPS.map((prop) => prop.id));
    for (const prop of Array.isArray(segment?.props) ? segment.props : []) {
      const line = dialogueById.get(prop.lineId);
      if (!line || !knownPropIds.has(prop.propId)) errors.push('every prop must reference a known asset and locked dialogue line');
      if (!Array.isArray(prop.matchedKeywords) || !prop.matchedKeywords.length || prop.relevance !== 'explicit-dialogue-keyword') errors.push('every prop must record its dialogue relevance');
      if (line && !prop.matchedKeywords.every((keyword) => propKeywordMatches(propTextForLine(line), keyword))) errors.push('prop relevance keywords must occur in the locked dialogue');
    }
  } else if (!orangeIdiotOnly) {
    warnings.push('motion plan predates semantic animation contract 2.0');
  }
  const actorIds = new Set((segment?.motion?.actors || []).map((actor) => actor.actorId));
  if (castIds.some((id) => !actorIds.has(id))) errors.push('every cast member needs an animation actor plan');
  const layoutResult = validateSceneLayout(segment?.layout, { requireActors: castIds });
  if (!layoutResult.ok) errors.push(...layoutResult.errors);
  if (!orangeIdiotOnly && humanCastIds.length < 2) errors.push('normal production segments require at least two human cast members plus Bork');
  if (!orangeIdiotOnly && humanCastIds.length >= 2 && distinctHumanSpeakers < 2) errors.push('normal production dialogue must use at least two human speakers');
  const audioLines = Array.isArray(segment?.audio?.lineFiles) ? [...segment.audio.lineFiles].sort((left, right) => Number(left.startMs || 0) - Number(right.startMs || 0)) : [];
  for (let index = 0; index < audioLines.length; index += 1) {
    const line = audioLines[index];
    const startMs = Number(line.startMs);
    const endMs = Number(line.endMs);
    const duration = Number(line.duration);
    const sourceDuration = Number(line.sourceDuration);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs || endMs > Number(segment?.durationSeconds || 0) * 1000 - SCRIPT_END_BUFFER_MS) {
      errors.push('every audio take must stay inside the segment and protected end-button tail');
    }
    if (Number.isFinite(sourceDuration) && Number.isFinite(duration) && duration + 0.075 < sourceDuration) {
      errors.push('audio contains a truncated speech take');
    }
    if (index > 0 && Number(audioLines[index - 1].endMs || 0) > startMs) errors.push('audio speech takes overlap');
  }
  if (audioLines.length && segment?.audio?.serialized !== true) errors.push('audio timeline must be explicitly serialized');
  if (Number.isFinite(Number(segment?.audio?.durationSeconds)) && Math.abs(Number(segment.audio.durationSeconds) - Number(segment.durationSeconds)) > 0.25) errors.push('mixed audio duration does not match the requested segment duration');
  if (Number.isFinite(Number(segment?.render?.durationSeconds)) && Math.abs(Number(segment.render.durationSeconds) - Number(segment.durationSeconds)) > 0.25) errors.push('rendered video duration does not match the requested segment duration');
  const music = musicTracks.find((track) => track.id === segment?.music?.trackId);
  if (!music || music.status !== 'approved') errors.push('music track is not approved');
  if (requireMedia) {
    if (segment?.audio?.status !== 'ready' || !segment.audio.mixFile) errors.push('complete mixed audio is required');
    if (segment?.render?.status !== 'ready' || !segment.render.videoFile) errors.push('rendered video is required');
  } else if (segment?.audio?.status !== 'ready' || segment?.render?.status !== 'ready') {
    warnings.push('media is pending; segment cannot enter approved inventory yet');
  }
  const status = errors.length ? 'quarantined' : requireMedia || (segment?.audio?.status === 'ready' && segment?.render?.status === 'ready') ? 'approved' : 'pending-review';
  return { ok: errors.length === 0, status, errors, warnings };
}

export function productionCatalogSummary({ castCount = 10, sceneCount = FACTORY_SCENES.length } = {}) {
  return {
    showId: 'bullshit-factory',
    productionVersion: PRODUCTION_VERSION,
    castCount,
    castLimit: 10,
    dogId: 'bork',
    sceneCount,
    propCount: FACTORY_PROPS.length,
    canvas: { width: 384, height: 216, fps: 12, maxColors: 64, scaling: 'nearest-neighbor' },
    generation: { concurrentWorkers: 1, preRenderedSegments: true, fallbackEnabled: true },
    pipeline: ['groq-script', 'gemini-animation', 'voice', 'motion', 'render', 'validate', 'inventory', 'schedule', 'playout'],
    tvOnlyCharacters: [{ id: ORANGE_IDIOT_ID, displayName: 'Orange Idiot', sceneId: ORANGE_IDIOT_SCENE_ID, standaloneSceneId: ORANGE_IDIOT_STANDALONE_SCENE_ID, view: 'south', placement: 'television-screen-or-standalone-house-yard', mainCast: false }],
  };
}

export { CAST_IDS, FACTORY_SCENES, MUSIC_RIGHTS, SEGMENT_TEMPLATES };
