const VOICE_NAME_PATTERN = /^[a-z0-9_]+$/u;

export const VOICE_PROFILE_SCHEMA_VERSION = 1;
export const VOICE_CANDIDATE_LABELS = Object.freeze(['A', 'B', 'C']);
export const VOICE_SPEED_BOUNDS = Object.freeze({ min: 0.70, max: 1.30 });
export const VOICE_PITCH_BOUNDS = Object.freeze({ min: -4, max: 4 });
export const VOICE_FORMANT_BOUNDS = Object.freeze({ min: 0.96, max: 1.04 });
export const DEFAULT_AUDITION_SCRIPT = 'All right, this is a normal shift. The machine is humming, the paperwork is lying, and nobody is technically on fire. Wait—what the hell is that? Stop touching the damn lever! You fixed it? Fantastic! I am thrilled. We will document this miracle. One more problem, and I quit.';

// These are the names already used by the production bundle. Keeping the
// legacy map means a deployment can adopt the profile store incrementally;
// no character loses its existing voice while candidates are being auditioned.
export const LEGACY_VOICE_BY_CHARACTER = Object.freeze({
  rookboss: 'rookboss',
  magsrust: 'magsrust',
  kernelkline: 'kernelkline',
  sudsmcgee: 'sudsmcgee',
  dooby: 'dooby',
  spaulding: 'spaulding',
  string: 'string',
  karen: 'karen',
  nico: 'nico',
});

export const LEGACY_FALLBACK_BY_CHARACTER = Object.freeze({
  rookboss: 'am_michael',
  magsrust: 'af_sarah',
  kernelkline: 'am_eric',
  sudsmcgee: 'am_adam',
  dooby: 'am_echo',
  spaulding: 'am_onyx',
  string: 'am_fenrir',
  karen: 'af_nicole',
  nico: 'am_liam',
});

const STOCK_VOICE_NAMES = new Set([
  'af_alloy', 'af_aoede', 'af_bella', 'af_heart', 'af_jadzia', 'af_jessica', 'af_kore', 'af_nicole', 'af_nova', 'af_river', 'af_sarah', 'af_sky',
  'am_adam', 'am_echo', 'am_eric', 'am_fenrir', 'am_liam', 'am_michael', 'am_onyx', 'am_puck', 'am_santa',
  'bf_alice', 'bf_emma', 'bf_isabella', 'bf_lily', 'bm_daniel', 'bm_fable', 'bm_george', 'bm_lewis',
]);

const DEFAULT_EQ = Object.freeze({
  lowShelfDb: 0,
  lowMidDb: 0,
  presenceDb: 0,
  highShelfDb: 0,
});

const DEFAULT_COMPRESSION = Object.freeze({
  thresholdDb: -20,
  ratio: 2.2,
  attackMs: 8,
  releaseMs: 100,
  makeupDb: 0,
});

const DEFAULT_EFFECTS = Object.freeze({
  brightness: 0,
  resonance: 0,
  nasality: 0,
  rasp: 0,
  saturation: 0,
  chorus: 0,
  telephone: false,
  radio: false,
});

function finiteNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function safeVoiceName(value, fallback = '') {
  const name = String(value || '').trim().toLowerCase();
  return VOICE_NAME_PATTERN.test(name) ? name : fallback;
}

function normalizeBlend(rawBlend, fallbackVoice) {
  const source = Array.isArray(rawBlend) ? rawBlend : [];
  const entries = source
    .map((entry) => ({ voice: safeVoiceName(entry?.voice || entry?.name), weight: finiteNumber(entry?.weight, 0) }))
    .filter((entry) => entry.voice && entry.weight > 0)
    .slice(0, 4);
  if (!entries.length && fallbackVoice) entries.push({ voice: fallbackVoice, weight: 1 });
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  return entries.map((entry) => ({ voice: entry.voice, weight: round(entry.weight / total, 4) }));
}

function normalizeEq(value = {}) {
  return {
    lowShelfDb: round(clamp(finiteNumber(value.lowShelfDb, DEFAULT_EQ.lowShelfDb), -4, 4), 2),
    lowMidDb: round(clamp(finiteNumber(value.lowMidDb, DEFAULT_EQ.lowMidDb), -4, 4), 2),
    presenceDb: round(clamp(finiteNumber(value.presenceDb, DEFAULT_EQ.presenceDb), -4, 4), 2),
    highShelfDb: round(clamp(finiteNumber(value.highShelfDb, DEFAULT_EQ.highShelfDb), -4, 4), 2),
  };
}

function normalizeCompression(value = {}) {
  return {
    thresholdDb: round(clamp(finiteNumber(value.thresholdDb, DEFAULT_COMPRESSION.thresholdDb), -36, -8), 2),
    ratio: round(clamp(finiteNumber(value.ratio, DEFAULT_COMPRESSION.ratio), 1, 6), 2),
    attackMs: round(clamp(finiteNumber(value.attackMs, DEFAULT_COMPRESSION.attackMs), 1, 40), 1),
    releaseMs: round(clamp(finiteNumber(value.releaseMs, DEFAULT_COMPRESSION.releaseMs), 20, 400), 1),
    makeupDb: round(clamp(finiteNumber(value.makeupDb, DEFAULT_COMPRESSION.makeupDb), -3, 6), 2),
  };
}

function normalizeEffects(value = {}) {
  return {
    brightness: round(clamp(finiteNumber(value.brightness, DEFAULT_EFFECTS.brightness), -1, 1), 3),
    resonance: round(clamp(finiteNumber(value.resonance, DEFAULT_EFFECTS.resonance), -1, 1), 3),
    nasality: round(clamp(finiteNumber(value.nasality, DEFAULT_EFFECTS.nasality), -1, 1), 3),
    rasp: round(clamp(finiteNumber(value.rasp, DEFAULT_EFFECTS.rasp), 0, 1), 3),
    saturation: round(clamp(finiteNumber(value.saturation, DEFAULT_EFFECTS.saturation), 0, 1), 3),
    chorus: round(clamp(finiteNumber(value.chorus, DEFAULT_EFFECTS.chorus), 0, 1), 3),
    telephone: value.telephone === true,
    radio: value.radio === true,
  };
}

function normalizeEmbedding(value = {}) {
  return value && typeof value === 'object'
    ? {
      kind: String(value.kind || 'kokoro-vector-recipe').slice(0, 80),
      id: String(value.id || '').slice(0, 120) || null,
      source: String(value.source || 'Kokoro stock voice vectors').slice(0, 240),
      reusable: value.reusable !== false,
    }
    : { kind: 'kokoro-vector-recipe', id: null, source: 'Kokoro stock voice vectors', reusable: true };
}

export function normalizeVoiceRecipe(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const requestedVoice = safeVoiceName(raw.ttsVoice || raw.voice || raw.baseVoice);
  const fallbackVoice = safeVoiceName(raw.fallbackVoice, 'am_michael') || 'am_michael';
  const blend = normalizeBlend(raw.blend || raw.sources, requestedVoice || fallbackVoice);
  const ttsVoice = requestedVoice || blend[0]?.voice || fallbackVoice;
  return {
    ttsVoice,
    blend,
    fallbackVoice,
    speed: round(clamp(finiteNumber(raw.speed, 0.96), VOICE_SPEED_BOUNDS.min, VOICE_SPEED_BOUNDS.max), 3),
    lang: raw.lang === 'en-gb' ? 'en-gb' : 'en-us',
    pitchSemitones: round(clamp(finiteNumber(raw.pitchSemitones, 0), VOICE_PITCH_BOUNDS.min, VOICE_PITCH_BOUNDS.max), 3),
    formantRatio: round(clamp(finiteNumber(raw.formantRatio, 1), VOICE_FORMANT_BOUNDS.min, VOICE_FORMANT_BOUNDS.max), 4),
    eq: normalizeEq(raw.eq),
    compression: normalizeCompression(raw.compression),
    effects: normalizeEffects(raw.effects),
    embedding: normalizeEmbedding(raw.embedding),
  };
}

function voicePlan(blend, options = {}) {
  return normalizeVoiceRecipe({
    ...options,
    ttsVoice: blend[0]?.voice,
    blend,
  });
}

// The blueprints deliberately vary source families, vector blends, cadence,
// resonance, and dynamics. A/B/C are alternate performances, not pitch-only
// copies of the legacy voice.
const VOICE_BLUEPRINTS = Object.freeze({
  rookboss: [
    { name: 'COMMAND', direction: 'dry, clipped foreman authority', recipe: voicePlan([{ voice: 'am_michael', weight: 0.72 }, { voice: 'bm_george', weight: 0.28 }], { speed: 1.01, pitchSemitones: -0.8, formantRatio: 0.987, eq: { lowShelfDb: 0.8, presenceDb: 0.7, highShelfDb: -0.4 }, compression: { ratio: 2.6 }, effects: { rasp: 0.12, saturation: 0.04, resonance: 0.1 } }) },
    { name: 'BROADCAST', direction: 'broad, darker and deliberately overconfident', recipe: voicePlan([{ voice: 'bm_lewis', weight: 0.6 }, { voice: 'am_onyx', weight: 0.4 }], { speed: 0.95, pitchSemitones: -2, formantRatio: 0.972, eq: { lowShelfDb: 1.8, lowMidDb: 0.7, presenceDb: -0.4, highShelfDb: -1 }, compression: { ratio: 2.8 }, effects: { rasp: 0.18, saturation: 0.07, resonance: 0.18 } }) },
    { name: 'CLIPPED', direction: 'bright, wired and sharply articulated', recipe: voicePlan([{ voice: 'am_eric', weight: 0.58 }, { voice: 'bm_fable', weight: 0.42 }], { speed: 1.06, pitchSemitones: 0.2, formantRatio: 1.018, eq: { lowShelfDb: -0.8, presenceDb: 1.4, highShelfDb: 1.1 }, compression: { ratio: 2.2 }, effects: { brightness: 0.25, nasality: 0.12, rasp: 0.07, saturation: 0.02 } }) },
  ],
  magsrust: [
    { name: 'WRENCH', direction: 'smoky, grounded and patient until the spark', recipe: voicePlan([{ voice: 'af_sarah', weight: 0.7 }, { voice: 'bf_emma', weight: 0.3 }], { speed: 0.93, pitchSemitones: -1.1, formantRatio: 0.982, eq: { lowShelfDb: 1.2, lowMidDb: 0.5, presenceDb: -0.3, highShelfDb: -0.5 }, compression: { ratio: 2.1 }, effects: { resonance: 0.15, rasp: 0.15, saturation: 0.04 } }) },
    { name: 'STEEL', direction: 'firm, dry and unexpectedly forceful', recipe: voicePlan([{ voice: 'af_nicole', weight: 0.55 }, { voice: 'bf_isabella', weight: 0.45 }], { speed: 0.99, pitchSemitones: -0.2, formantRatio: 1.008, eq: { lowShelfDb: 0.2, presenceDb: 1, highShelfDb: 0.6 }, compression: { ratio: 2.7 }, effects: { brightness: 0.15, nasality: 0.06, rasp: 0.08 } }) },
    { name: 'CHUCKLE', direction: 'low, warm and deadpan with a dry laugh underneath', recipe: voicePlan([{ voice: 'bf_emma', weight: 0.58 }, { voice: 'af_bella', weight: 0.42 }], { speed: 0.9, pitchSemitones: -2.2, formantRatio: 0.968, eq: { lowShelfDb: 1.5, lowMidDb: 0.9, presenceDb: -0.7, highShelfDb: -1.2 }, compression: { ratio: 2.4 }, effects: { resonance: 0.22, rasp: 0.1, saturation: 0.05 } }) },
  ],
  kernelkline: [
    { name: 'TERMINAL', direction: 'thin, precise and sleep-deprived', recipe: voicePlan([{ voice: 'am_eric', weight: 0.58 }, { voice: 'bm_fable', weight: 0.42 }], { speed: 1.08, pitchSemitones: 0.4, formantRatio: 1.025, eq: { lowShelfDb: -1.4, presenceDb: 1.5, highShelfDb: 0.9 }, compression: { ratio: 3.2, attackMs: 5 }, effects: { brightness: 0.28, nasality: 0.2, rasp: 0.03 } }) },
    { name: 'PACKET', direction: 'small, anxious and over-articulated', recipe: voicePlan([{ voice: 'am_puck', weight: 0.64 }, { voice: 'af_kore', weight: 0.36 }], { speed: 1.13, pitchSemitones: 1.4, formantRatio: 1.034, eq: { lowShelfDb: -1.8, presenceDb: 1.2, highShelfDb: 1.4 }, compression: { ratio: 3.4 }, effects: { brightness: 0.38, nasality: 0.25, saturation: 0.01 } }) },
    { name: 'INCIDENT', direction: 'flat, controlled and suddenly alarmed', recipe: voicePlan([{ voice: 'am_echo', weight: 0.66 }, { voice: 'am_liam', weight: 0.34 }], { speed: 1.02, pitchSemitones: -0.6, formantRatio: 0.991, eq: { lowShelfDb: -0.3, presenceDb: 0.5, highShelfDb: -0.2 }, compression: { ratio: 2.9 }, effects: { resonance: 0.08, nasality: 0.09, rasp: 0.06 } }) },
  ],
  sudsmcgee: [
    { name: 'BARROOM', direction: 'wide, warm and rolling like a story already in progress', recipe: voicePlan([{ voice: 'am_adam', weight: 0.68 }, { voice: 'bm_lewis', weight: 0.32 }], { speed: 0.98, pitchSemitones: -1.1, formantRatio: 0.98, eq: { lowShelfDb: 1.7, lowMidDb: 0.5, presenceDb: 0.2, highShelfDb: -0.6 }, compression: { ratio: 2.5 }, effects: { resonance: 0.18, rasp: 0.16, saturation: 0.06 } }) },
    { name: 'TOAST', direction: 'cleaner, theatrical and bright at the end of a boast', recipe: voicePlan([{ voice: 'am_onyx', weight: 0.55 }, { voice: 'am_santa', weight: 0.45 }], { speed: 1.03, pitchSemitones: -0.2, formantRatio: 1.012, eq: { lowShelfDb: 0.3, presenceDb: 1.1, highShelfDb: 0.8 }, compression: { ratio: 2.2 }, effects: { brightness: 0.2, rasp: 0.09, saturation: 0.03 } }) },
    { name: 'LAST_CALL', direction: 'low, slow and gravelly with a friendly threat', recipe: voicePlan([{ voice: 'am_michael', weight: 0.5 }, { voice: 'bm_george', weight: 0.5 }], { speed: 0.91, pitchSemitones: -2.6, formantRatio: 0.964, eq: { lowShelfDb: 2.1, lowMidDb: 0.9, presenceDb: -0.8, highShelfDb: -1.1 }, compression: { ratio: 2.7 }, effects: { resonance: 0.25, rasp: 0.22, saturation: 0.08 } }) },
  ],
  dooby: [
    { name: 'FLOAT', direction: 'soft, spacious and lazily exact', recipe: voicePlan([{ voice: 'am_echo', weight: 0.62 }, { voice: 'am_liam', weight: 0.38 }], { speed: 0.91, pitchSemitones: -1.2, formantRatio: 0.979, eq: { lowShelfDb: 0.6, presenceDb: -0.5, highShelfDb: 0.3 }, compression: { ratio: 1.8, thresholdDb: -18 }, effects: { brightness: 0.05, resonance: 0.12, chorus: 0.03 } }) },
    { name: 'QUESTION', direction: 'light, airy and oddly alert on the final word', recipe: voicePlan([{ voice: 'am_puck', weight: 0.52 }, { voice: 'af_aoede', weight: 0.48 }], { speed: 0.98, pitchSemitones: 0.8, formantRatio: 1.028, eq: { lowShelfDb: -0.9, presenceDb: 0.8, highShelfDb: 1.2 }, compression: { ratio: 2 }, effects: { brightness: 0.28, nasality: 0.08, chorus: 0.02 } }) },
    { name: 'MELLOW', direction: 'round, low and completely unhurried', recipe: voicePlan([{ voice: 'am_michael', weight: 0.56 }, { voice: 'af_nova', weight: 0.44 }], { speed: 0.86, pitchSemitones: -2.1, formantRatio: 0.969, eq: { lowShelfDb: 1.3, lowMidDb: 0.6, presenceDb: -0.9, highShelfDb: -0.6 }, compression: { ratio: 2.1 }, effects: { resonance: 0.2, saturation: 0.03, chorus: 0.02 } }) },
  ],
  spaulding: [
    { name: 'DECKHAND', direction: 'weathered, chesty and measured like a deck report', recipe: voicePlan([{ voice: 'am_onyx', weight: 0.62 }, { voice: 'bm_george', weight: 0.38 }], { speed: 0.94, pitchSemitones: -1.8, formantRatio: 0.974, eq: { lowShelfDb: 1.6, lowMidDb: 0.7, presenceDb: -0.2, highShelfDb: -0.7 }, compression: { ratio: 2.6 }, effects: { resonance: 0.2, rasp: 0.2, saturation: 0.06 } }) },
    { name: 'HORIZON', direction: 'brighter, musical and excited by every knot', recipe: voicePlan([{ voice: 'bm_lewis', weight: 0.58 }, { voice: 'am_adam', weight: 0.42 }], { speed: 1.02, pitchSemitones: -0.6, formantRatio: 1.01, eq: { lowShelfDb: 0.5, presenceDb: 0.9, highShelfDb: 0.7 }, compression: { ratio: 2.3 }, effects: { brightness: 0.18, rasp: 0.13, saturation: 0.03 } }) },
    { name: 'STORM', direction: 'rough, low and fast once the details arrive', recipe: voicePlan([{ voice: 'am_fenrir', weight: 0.54 }, { voice: 'bm_fable', weight: 0.46 }], { speed: 1.07, pitchSemitones: -0.1, formantRatio: 0.991, eq: { lowShelfDb: 0.8, presenceDb: 1, highShelfDb: -0.2 }, compression: { ratio: 3 }, effects: { rasp: 0.24, saturation: 0.08, resonance: 0.13 } }) },
  ],
  string: [
    { name: 'AMP', direction: 'bright, nasal and stage-ready', recipe: voicePlan([{ voice: 'am_fenrir', weight: 0.6 }, { voice: 'bm_fable', weight: 0.4 }], { speed: 1.04, pitchSemitones: 0.9, formantRatio: 1.024, eq: { lowShelfDb: -0.7, presenceDb: 1.3, highShelfDb: 1.1 }, compression: { ratio: 3.4, attackMs: 4 }, effects: { brightness: 0.3, nasality: 0.26, rasp: 0.16, saturation: 0.05 } }) },
    { name: 'RIFF', direction: 'tight, percussive and less polished on purpose', recipe: voicePlan([{ voice: 'am_puck', weight: 0.55 }, { voice: 'af_kore', weight: 0.45 }], { speed: 1.11, pitchSemitones: 1.8, formantRatio: 1.036, eq: { lowShelfDb: -1.2, presenceDb: 1.6, highShelfDb: 1.4 }, compression: { ratio: 3.8 }, effects: { brightness: 0.4, nasality: 0.3, rasp: 0.1, saturation: 0.04 } }) },
    { name: 'ROADIE', direction: 'darker, gravelly and theatrically restrained', recipe: voicePlan([{ voice: 'am_eric', weight: 0.56 }, { voice: 'bm_george', weight: 0.44 }], { speed: 0.97, pitchSemitones: -1, formantRatio: 0.978, eq: { lowShelfDb: 1.1, presenceDb: 0.3, highShelfDb: -0.6 }, compression: { ratio: 2.9 }, effects: { resonance: 0.16, rasp: 0.23, saturation: 0.07 } }) },
  ],
  karen: [
    { name: 'FINEPRINT', direction: 'clean, controlled and surgical', recipe: voicePlan([{ voice: 'af_nicole', weight: 0.55 }, { voice: 'bf_isabella', weight: 0.45 }], { speed: 0.99, pitchSemitones: -0.3, formantRatio: 1.008, eq: { lowShelfDb: -0.3, presenceDb: 1.1, highShelfDb: 0.6 }, compression: { ratio: 2.8, attackMs: 5 }, effects: { brightness: 0.16, nasality: 0.05 } }) },
    { name: 'STAMP', direction: 'lower, dry and utterly unimpressed', recipe: voicePlan([{ voice: 'af_kore', weight: 0.62 }, { voice: 'af_bella', weight: 0.38 }], { speed: 0.93, pitchSemitones: -1.6, formantRatio: 0.98, eq: { lowShelfDb: 1, lowMidDb: 0.5, presenceDb: -0.4, highShelfDb: -0.7 }, compression: { ratio: 2.6 }, effects: { resonance: 0.14, rasp: 0.08, saturation: 0.02 } }) },
    { name: 'APPEAL', direction: 'brighter, quicker and quietly delighted by procedure', recipe: voicePlan([{ voice: 'bf_emma', weight: 0.5 }, { voice: 'af_jadzia', weight: 0.5 }], { speed: 1.05, pitchSemitones: 0.8, formantRatio: 1.026, eq: { lowShelfDb: -0.8, presenceDb: 1.3, highShelfDb: 1 }, compression: { ratio: 2.4 }, effects: { brightness: 0.28, nasality: 0.1 } }) },
  ],
  nico: [
    { name: 'DELIVERY', direction: 'young, breathy and careful around every noun', recipe: voicePlan([{ voice: 'am_liam', weight: 0.65 }, { voice: 'am_echo', weight: 0.35 }], { speed: 1.04, pitchSemitones: 0.8, formantRatio: 1.022, eq: { lowShelfDb: -1, presenceDb: 0.8, highShelfDb: 0.7 }, compression: { ratio: 2.4 }, effects: { brightness: 0.2, nasality: 0.08 } }) },
    { name: 'PANIC', direction: 'thin, quick and self-correcting', recipe: voicePlan([{ voice: 'am_puck', weight: 0.6 }, { voice: 'af_sarah', weight: 0.4 }], { speed: 1.15, pitchSemitones: 1.7, formantRatio: 1.037, eq: { lowShelfDb: -1.5, presenceDb: 1.2, highShelfDb: 1.4 }, compression: { ratio: 3.1 }, effects: { brightness: 0.32, nasality: 0.16, chorus: 0.01 } }) },
    { name: 'EXIT', direction: 'warmer, slower and newly confident', recipe: voicePlan([{ voice: 'am_eric', weight: 0.52 }, { voice: 'af_nova', weight: 0.48 }], { speed: 0.96, pitchSemitones: -0.4, formantRatio: 0.994, eq: { lowShelfDb: 0.4, presenceDb: 0.5, highShelfDb: 0.1 }, compression: { ratio: 2.2 }, effects: { resonance: 0.09, rasp: 0.04 } }) },
  ],
});

const GENERIC_BLUEPRINT = [
  { name: 'FOUNDATION', direction: 'balanced, clear and character-led', recipe: voicePlan([{ voice: 'am_michael', weight: 0.65 }, { voice: 'af_sarah', weight: 0.35 }], { speed: 0.98, pitchSemitones: -0.3, formantRatio: 0.996 }) },
  { name: 'CONTRAST', direction: 'brighter, faster and more alert', recipe: voicePlan([{ voice: 'am_puck', weight: 0.55 }, { voice: 'af_kore', weight: 0.45 }], { speed: 1.08, pitchSemitones: 1.2, formantRatio: 1.028, effects: { brightness: 0.25, nasality: 0.12 } }) },
  { name: 'WEIGHT', direction: 'darker, slower and more grounded', recipe: voicePlan([{ voice: 'bm_lewis', weight: 0.55 }, { voice: 'am_onyx', weight: 0.45 }], { speed: 0.91, pitchSemitones: -2, formantRatio: 0.97, effects: { resonance: 0.18, rasp: 0.14 } }) },
];

function feedbackAdjustments(feedback = '') {
  const text = String(feedback || '').trim().toLowerCase();
  const adjustment = { pitchSemitones: 0, formantRatio: 1, speed: 0, eq: {}, effects: {}, compression: {} };
  if (/(?:\bolder\b|aged|mature)/u.test(text)) { adjustment.pitchSemitones -= 0.7; adjustment.formantRatio -= 0.009; adjustment.speed -= 0.025; adjustment.effects.resonance = 0.08; }
  if (/(?:rougher|gravelly|gravel)/u.test(text)) { adjustment.effects.rasp = 0.16; adjustment.effects.saturation = 0.04; adjustment.eq.lowMidDb = 0.45; }
  if (/(?:\bdeeper\b|lower|darker)/u.test(text)) { adjustment.pitchSemitones -= 0.8; adjustment.formantRatio -= 0.01; adjustment.eq.lowShelfDb = 0.65; adjustment.eq.highShelfDb = -0.45; }
  if (/(?:nervous|anxious|panicked|faster)/u.test(text)) { adjustment.speed += 0.055; adjustment.pitchSemitones += 0.2; adjustment.effects.brightness = 0.1; adjustment.effects.nasality = 0.08; }
  if (/(?:less robotic|human|natural)/u.test(text)) { adjustment.compression.ratio = -0.35; adjustment.effects.saturation = -0.03; adjustment.effects.chorus = -0.02; }
  if (/(?:less nasal|de-nasal|denasal)/u.test(text)) { adjustment.effects.nasality = -0.16; adjustment.eq.presenceDb = -0.4; }
  if (/(?:more energetic|energy|livelier)/u.test(text)) { adjustment.speed += 0.045; adjustment.eq.highShelfDb = 0.45; adjustment.compression.ratio = 0.25; }
  if (/(?:deadpan|drier|flatter)/u.test(text)) { adjustment.speed -= 0.035; adjustment.eq.highShelfDb = -0.25; adjustment.compression.ratio = 0.2; }
  if (/(?:less extreme|subtle|dial it back|milder)/u.test(text)) adjustment.lessExtreme = true;
  return adjustment;
}

function mergeVoiceAdjustments(recipe, adjustment) {
  const next = { ...recipe, eq: { ...recipe.eq }, compression: { ...recipe.compression }, effects: { ...recipe.effects } };
  next.speed += adjustment.speed || 0;
  next.pitchSemitones += adjustment.pitchSemitones || 0;
  next.formantRatio *= adjustment.formantRatio || 1;
  for (const key of Object.keys(adjustment.eq || {})) next.eq[key] = (next.eq[key] || 0) + adjustment.eq[key];
  for (const key of Object.keys(adjustment.effects || {})) next.effects[key] = (next.effects[key] || 0) + adjustment.effects[key];
  for (const key of Object.keys(adjustment.compression || {})) next.compression[key] = (next.compression[key] || 0) + adjustment.compression[key];
  if (adjustment.lessExtreme) {
    next.pitchSemitones *= 0.55;
    next.formantRatio = 1 + ((next.formantRatio - 1) * 0.55);
    next.effects.rasp *= 0.6;
    next.effects.saturation *= 0.6;
    next.effects.nasality *= 0.65;
    next.effects.chorus *= 0.5;
  }
  return normalizeVoiceRecipe(next);
}

function directionForBible(bible = {}, blueprint = {}) {
  const clean = (value, limit = 120) => String(value || '').replace(/\s+/gu, ' ').trim().slice(0, limit);
  const habits = Array.isArray(bible.verbalHabits) ? bible.verbalHabits.map((habit) => clean(habit, 60)).filter(Boolean).slice(0, 3).join(', ') : '';
  const cues = [
    bible.ageRange && `age impression ${clean(bible.ageRange, 40)}`,
    bible.role && `role ${clean(bible.role, 80)}`,
    bible.defaultEnergy && `energy ${clean(bible.defaultEnergy, 40)}`,
    bible.personality && `temperament ${clean(bible.personality)}`,
    habits && `speaking habits ${habits}`,
    bible.comedyFunction && `comedy function ${clean(bible.comedyFunction)}`,
  ].filter(Boolean).join('; ');
  return `${blueprint.direction}; performance built for ${clean(bible.name || bible.id || 'the character', 80)}${cues ? ` (${cues}).` : '.'}`;
}

export function createVoiceCandidates(bible = {}, { generationId = 'generation-1', feedback = '', now = new Date().toISOString() } = {}) {
  const characterId = safeVoiceName(bible.id);
  if (!characterId || bible.isDog === true || characterId === 'bork' || bible.voiceProfile?.mode === 'bark-only') return [];
  const blueprints = VOICE_BLUEPRINTS[characterId] || GENERIC_BLUEPRINT;
  const adjustment = feedbackAdjustments(feedback);
  return blueprints.slice(0, VOICE_CANDIDATE_LABELS.length).map((blueprint, index) => {
    const label = VOICE_CANDIDATE_LABELS[index];
    const recipe = mergeVoiceAdjustments(blueprint.recipe, adjustment);
    return {
      schemaVersion: VOICE_PROFILE_SCHEMA_VERSION,
      candidateId: label.toLowerCase(),
      label,
      characterId,
      voiceId: `${characterId}-candidate-${label.toLowerCase()}`,
      status: 'candidate',
      version: 0,
      generationId: String(generationId).slice(0, 100),
      createdAt: now,
      direction: directionForBible(bible, blueprint),
      source: {
        type: 'kokoro-stock-blend',
        voices: recipe.blend.map((entry) => ({ ...entry })),
        fallbackVoice: recipe.fallbackVoice,
      },
      embedding: {
        kind: 'kokoro-vector-recipe',
        id: `${characterId}-candidate-${label.toLowerCase()}`,
        source: 'Kokoro stock vectors blended at inference; compatible custom vector may be substituted when exported.',
        reusable: true,
      },
      recipe,
      validation: { status: 'pending', checks: [] },
      audioFile: null,
      notes: feedback ? `Operator direction: ${String(feedback).trim().slice(0, 180)}` : 'Automatically proposed from the fictional character bible.',
    };
  });
}

export function normalizeVoiceCandidate(value = {}, expectedCharacterId = '') {
  const raw = value && typeof value === 'object' ? value : {};
  const characterId = safeVoiceName(raw.characterId || expectedCharacterId);
  const candidateId = String(raw.candidateId || raw.id || '').trim().toLowerCase();
  if (!characterId || !VOICE_CANDIDATE_LABELS.map((label) => label.toLowerCase()).includes(candidateId)) throw new Error('Voice candidate has an invalid identity.');
  const recipe = normalizeVoiceRecipe(raw.recipe || raw);
  return {
    ...raw,
    schemaVersion: VOICE_PROFILE_SCHEMA_VERSION,
    candidateId,
    label: VOICE_CANDIDATE_LABELS[candidateId.charCodeAt(0) - 97] || candidateId.toUpperCase(),
    characterId,
    voiceId: String(raw.voiceId || `${characterId}-candidate-${candidateId}`).slice(0, 120),
    status: 'candidate',
    version: 0,
    generationId: String(raw.generationId || '').slice(0, 100) || null,
    createdAt: String(raw.createdAt || '').slice(0, 40) || null,
    direction: String(raw.direction || '').slice(0, 500),
    source: raw.source && typeof raw.source === 'object' ? raw.source : { type: 'kokoro-stock-blend', voices: recipe.blend, fallbackVoice: recipe.fallbackVoice },
    embedding: normalizeEmbedding(raw.embedding || recipe.embedding),
    recipe,
    validation: raw.validation && typeof raw.validation === 'object' ? raw.validation : { status: 'pending', checks: [] },
    audioFile: typeof raw.audioFile === 'string' ? raw.audioFile : null,
    notes: String(raw.notes || '').slice(0, 240),
  };
}

export function normalizeSelectedVoiceProfile(value = {}, expectedCharacterId = '') {
  const raw = value && typeof value === 'object' ? value : {};
  const characterId = safeVoiceName(raw.characterId || expectedCharacterId);
  if (!characterId || (expectedCharacterId && characterId !== safeVoiceName(expectedCharacterId))) throw new Error('Voice profile character identity is invalid.');
  const version = Number(raw.version);
  if (!Number.isInteger(version) || version < 1) throw new Error('Voice profile version is invalid.');
  const recipe = normalizeVoiceRecipe(raw.recipe || raw);
  return {
    ...raw,
    schemaVersion: VOICE_PROFILE_SCHEMA_VERSION,
    characterId,
    voiceId: String(raw.voiceId || `${characterId}-voice-v${version}`).slice(0, 120),
    label: String(raw.label || 'Selected voice').slice(0, 120),
    status: 'selected',
    candidateId: String(raw.candidateId || '').trim().toLowerCase() || null,
    version,
    createdAt: String(raw.createdAt || '').slice(0, 40) || null,
    selectedAt: String(raw.selectedAt || '').slice(0, 40) || null,
    source: raw.source && typeof raw.source === 'object' ? raw.source : { type: 'kokoro-stock-blend', voices: recipe.blend, fallbackVoice: recipe.fallbackVoice },
    embedding: normalizeEmbedding(raw.embedding || recipe.embedding),
    recipe,
    auditionFile: typeof raw.auditionFile === 'string' ? raw.auditionFile : null,
    previousVersion: Number.isInteger(Number(raw.previousVersion)) && Number(raw.previousVersion) > 0 ? Number(raw.previousVersion) : null,
  };
}

export function resolveCharacterVoice(characterId, selectedProfile = null, { legacyVoice = '', fallbackVoice = '' } = {}) {
  const id = safeVoiceName(characterId);
  const selected = selectedProfile ? normalizeSelectedVoiceProfile(selectedProfile, id) : null;
  const legacy = safeVoiceName(legacyVoice || LEGACY_VOICE_BY_CHARACTER[id], LEGACY_VOICE_BY_CHARACTER[id] || 'am_michael');
  const fallback = safeVoiceName(fallbackVoice || selected?.recipe?.fallbackVoice || LEGACY_FALLBACK_BY_CHARACTER[id], 'am_michael') || 'am_michael';
  if (!selected) return { characterId: id, selected: false, voiceId: legacy, ttsVoice: legacy, blend: null, fallbackVoice: fallback, version: 0, recipe: null };
  return {
    characterId: id,
    selected: true,
    voiceId: selected.voiceId,
    candidateId: selected.candidateId,
    ttsVoice: selected.recipe.ttsVoice,
    blend: selected.recipe.blend,
    fallbackVoice: selected.recipe.fallbackVoice || fallback,
    version: selected.version,
    recipe: selected.recipe,
    profile: selected,
  };
}

function filterNumber(value, fallback = 0) {
  return String(round(finiteNumber(value, fallback), 4));
}

function dbFilter(name, frequency, gain, width = 0.8) {
  const safeGain = clamp(finiteNumber(gain, 0), -6, 6);
  return Math.abs(safeGain) < 0.01 ? '' : `equalizer=f=${filterNumber(frequency)}:t=q:w=${filterNumber(width)}:g=${filterNumber(safeGain, 0)}`;
}

export function voiceFilterForProfile(profile = {}, { useRubberband = false, normalize = true } = {}) {
  const recipe = normalizeVoiceRecipe(profile?.recipe || profile);
  const effects = recipe.effects;
  const filters = ['aresample=44100'];
  const pitchRatio = 2 ** (recipe.pitchSemitones / 12);
  if (useRubberband && (Math.abs(recipe.pitchSemitones) > 0.01 || Math.abs(recipe.formantRatio - 1) > 0.001)) {
    // Rubber Band preserves duration while giving the optional true formant
    // path a chance to shape timbre. The normal path below remains compatible
    // with stock ffmpeg builds that do not ship the external filter.
    filters.push(`rubberband=pitch=${filterNumber(pitchRatio)}:formant=shifted`);
  } else if (Math.abs(recipe.pitchSemitones) > 0.01) {
    filters.push(`asetrate=44100*${filterNumber(pitchRatio)},aresample=44100,atempo=${filterNumber(1 / pitchRatio)}`);
  }
  if (effects.telephone) {
    filters.push('highpass=f=320', 'lowpass=f=3400');
  } else if (effects.radio) {
    filters.push('highpass=f=180', 'lowpass=f=5200');
  }
  const eq = recipe.eq;
  // FFmpeg's optional Rubber Band filter handles the pitch-linked formant
  // movement when present. The bounded EQ-center shift keeps the stored
  // formant recipe audible on stock builds too, without pretending to be a
  // full voice-conversion model.
  const formantRatio = recipe.formantRatio;
  const lowShelf = dbFilter('low', 180, eq.lowShelfDb + effects.resonance * 1.8, 0.7);
  const lowMid = dbFilter('low-mid', 420 * formantRatio, eq.lowMidDb + effects.resonance * 1.2, 0.9);
  const presence = dbFilter('presence', 1850 * formantRatio, eq.presenceDb + effects.nasality * 2.2, 0.8);
  const highShelf = dbFilter('high', 4300 * formantRatio, eq.highShelfDb + effects.brightness * 2.4 - effects.rasp * 0.35, 0.7);
  filters.push(...[lowShelf, lowMid, presence, highShelf].filter(Boolean));
  if (effects.saturation > 0.015 || effects.rasp > 0.02) {
    // The mix is intentionally tiny. This adds edge without turning human
    // characters into a bit-crushed effect.
    filters.push(`acrusher=bits=16:mix=${filterNumber(clamp(effects.saturation * 0.24 + effects.rasp * 0.1, 0.01, 0.12))}`);
  }
  if (effects.chorus > 0.01) {
    const mix = clamp(effects.chorus * 0.12, 0.01, 0.08);
    filters.push(`chorus=0.92:0.98:45:0.12:0.35:2`);
    filters.push(`volume=${filterNumber(1 - mix / 3)}`);
  }
  const compression = recipe.compression;
  filters.push(`acompressor=threshold=${filterNumber(compression.thresholdDb)}dB:ratio=${filterNumber(compression.ratio)}:attack=${filterNumber(compression.attackMs)}:release=${filterNumber(compression.releaseMs)}:makeup=${filterNumber(compression.makeupDb)}`);
  if (normalize) filters.push('loudnorm=I=-18:LRA=7:TP=-2:linear=true', 'alimiter=limit=0.95');
  return filters.join(',');
}

function recipeVector(recipe) {
  const normalized = normalizeVoiceRecipe(recipe);
  const effects = normalized.effects;
  return [
    normalized.pitchSemitones / VOICE_PITCH_BOUNDS.max,
    (normalized.formantRatio - 1) / (VOICE_FORMANT_BOUNDS.max - 1),
    (normalized.speed - 1) / 0.3,
    effects.brightness,
    effects.resonance,
    effects.nasality,
    effects.rasp,
    effects.saturation,
    effects.chorus,
  ];
}

export function voiceRecipeDistance(left, right) {
  const a = recipeVector(left?.recipe || left);
  const b = recipeVector(right?.recipe || right);
  const distance = Math.sqrt(a.reduce((sum, value, index) => sum + ((value - b[index]) ** 2), 0) / a.length);
  const leftBlend = new Map(normalizeVoiceRecipe(left?.recipe || left).blend.map((item) => [item.voice, item.weight]));
  const rightBlend = new Map(normalizeVoiceRecipe(right?.recipe || right).blend.map((item) => [item.voice, item.weight]));
  const blendDistance = [...new Set([...leftBlend.keys(), ...rightBlend.keys()])]
    .reduce((sum, voice) => sum + Math.abs((leftBlend.get(voice) || 0) - (rightBlend.get(voice) || 0)), 0) / 2;
  return round(distance * 0.72 + blendDistance * 0.28, 4);
}

export function findVoiceCollisions(profiles = [], threshold = 0.24) {
  const collisions = [];
  const entries = Array.isArray(profiles) ? profiles.filter(Boolean) : [];
  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      const distance = voiceRecipeDistance(left, right);
      if (distance < threshold) collisions.push({ left: left.characterId, right: right.characterId, distance, warning: `${left.characterId} and ${right.characterId} may sound overly similar.` });
    }
  }
  return collisions;
}

export function stockVoiceNames() {
  return [...STOCK_VOICE_NAMES].sort();
}
