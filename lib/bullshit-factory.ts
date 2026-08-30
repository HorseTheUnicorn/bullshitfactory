import rawCatalog from '../public/bullshit-factory/characters/v1/CHARACTER-CATALOG.json';
import {
  assembleSession,
  evaluateSessionQuality,
  FACTORY_SCENES,
  MUSIC_RIGHTS,
  SEGMENT_TEMPLATES,
  SESSION_DURATION_OPTIONS,
  normalizeSessionMinutes,
  formatDuration,
} from './bullshit-factory-scheduler.mjs';
import type {
  FactoryScene,
  SegmentTemplate,
  SessionPlan,
  QualityCheck,
} from './bullshit-factory-scheduler.mjs';

export type PixelFrame = {
  file: string;
  width: number;
  height: number;
};

export type PixelClip = {
  id: string;
  direction: string;
  frameCount: number;
  frames: PixelFrame[];
};

export type FactoryCharacter = {
  id: string;
  folder: string;
  displayName: string;
  role: string;
  department: string;
  tone: string;
  quote: string;
  status: string;
  isDog: boolean;
  assetRoot: string;
  preview: string;
  rotations: Record<string, PixelFrame>;
  clips: PixelClip[];
  primaryAnimation: string;
  playback: {
    fps: number;
    loop: boolean;
    scaling: string;
    maxColors: number;
  };
  voice: VoiceProfile;
};

export type FactoryCatalog = {
  catalogVersion: string;
  showId: string;
  status: string;
  format: string;
  castLimit: number;
  activeCastCount: number;
  style: {
    era: string;
    maxColors: number;
    nativeScaling: string;
    transparency: string;
  };
  animationDefaults: {
    fps: number;
    loop: boolean;
    sourceFramesPerClip: number;
    directions: string[];
  };
  characters: Array<Omit<FactoryCharacter, 'voice'>>;
};

export type VoiceProfile = {
  id: string;
  characterId: string;
  label: string;
  foundation: string;
  influence: string;
  texture: string;
  rhythm: string;
  energy: string;
  habits: string;
  catchphrase: string;
  mode: 'dialogue' | 'bark-only';
};

export type MusicRightsRecord = {
  id: string;
  title: string;
  source: string;
  rightsHolder: string;
  licenseProof: string | null;
  status: string;
  permittedUse: string[];
  attribution: string;
  replacement: string;
};

export type FactoryProp = {
  id: string;
  label: string;
  description: string;
  file: string;
};

export const factoryBrandAssets = {
  titleScreen: '/bullshit-factory/title/title-screen.png',
  titleFont: '/bullshit-factory/fonts/title/bullshit-factory-title.ttf',
  terminalFont: '/bullshit-factory/fonts/terminal/bullshit-factory-terminal.ttf',
};

export const factoryProps: FactoryProp[] = [
  { id: 'beer-mug', label: 'BEER MUG', description: 'hydration, allegedly', file: '/bullshit-factory/props/beer-mug.png' },
  { id: 'ashtray-joint', label: 'ASH + JOINT', description: 'wellness department', file: '/bullshit-factory/props/ashtray-joint.png' },
  { id: 'crt-keyboard', label: 'CRT KEYBOARD', description: 'legacy input device', file: '/bullshit-factory/props/crt-keyboard.png' },
  { id: 'rope-coil', label: 'ROPE COIL', description: 'nautical infrastructure', file: '/bullshit-factory/props/rope-coil.png' },
  { id: 'rock-speaker', label: 'ROCK SPEAKER', description: 'argument amplifier', file: '/bullshit-factory/props/rock-speaker.png' },
  { id: 'old-cane', label: 'OLD CANE', description: 'committee equipment', file: '/bullshit-factory/props/old-cane.png' },
];

export const factoryCatalog = rawCatalog as unknown as FactoryCatalog;

export const VOICE_PROFILES: VoiceProfile[] = [
  {
    id: 'rookboss-voice',
    characterId: 'rookboss',
    label: 'Rook Boss',
    foundation: 'dry American factory foreman',
    influence: 'light northern English clipped vowels',
    texture: 'raspy mid-low bark with a tired grin',
    rhythm: 'short commands, sudden pauses, hard final consonants',
    energy: 'impatient and confidently wrong',
    habits: 'turns every accident into policy',
    catchphrase: 'That is now official company policy.',
    mode: 'dialogue',
  },
  {
    id: 'magsrust-voice',
    characterId: 'magsrust',
    label: 'Mags Rust',
    foundation: 'weathered American Midwestern elder',
    influence: 'soft Irish lilt on long vowels',
    texture: 'smoky alto with a dry chuckle',
    rhythm: 'slow setup, precise punchline, no wasted syllables',
    energy: 'calm until something sparks',
    habits: 'remembers a worse version of every problem',
    catchphrase: 'I have seen this idiot before.',
    mode: 'dialogue',
  },
  {
    id: 'kernelkline-voice',
    characterId: 'kernelkline',
    label: 'Kernel Kline',
    foundation: 'nasal American systems engineer',
    influence: 'precise Germanic cadence without imitation of a real person',
    texture: 'thin, compressed, sleep-deprived tenor',
    rhythm: 'fast technical bursts with dead-air resets',
    energy: 'alarmed but trying to sound documented',
    habits: 'describes feelings as error states',
    catchphrase: 'The server has boundaries.',
    mode: 'dialogue',
  },
  {
    id: 'sudsmcgee-voice',
    characterId: 'sudsmcgee',
    label: 'Suds McGee',
    foundation: 'big American barroom storyteller',
    influence: 'loose Australian-like rise at the end of a boast',
    texture: 'warm gravelly baritone',
    rhythm: 'rolling phrases, quick asides, theatrical landing',
    energy: 'friendly chaos with a glass in hand',
    habits: 'turns every beverage into a management solution',
    catchphrase: 'This calls for a meeting and a drink.',
    mode: 'dialogue',
  },
  {
    id: 'dooby-voice',
    characterId: 'dooby',
    label: 'Dooby',
    foundation: 'soft American counterculture drawl',
    influence: 'gentle Caribbean lilt used as a fictional cadence',
    texture: 'breathy low tenor with a lazy smile',
    rhythm: 'slow, floating, unexpectedly exact',
    energy: 'unbothered until the forklift becomes philosophical',
    habits: 'asks questions that derail the room',
    catchphrase: 'What if the forklift is a thought?',
    mode: 'dialogue',
  },
  {
    id: 'spaulding-voice',
    characterId: 'spaulding',
    label: 'Spaulding',
    foundation: 'gravelly American sailor',
    influence: 'bright Welsh-like musical lift in nautical terms',
    texture: 'wind-burned chest voice',
    rhythm: 'measured deck cadence, then a storm of detail',
    energy: 'thrilled by knots and suspicious of land',
    habits: 'answers workplace questions with rigging metaphors',
    catchphrase: 'Every crisis is a rigging problem.',
    mode: 'dialogue',
  },
  {
    id: 'string-voice',
    characterId: 'string',
    label: 'String',
    foundation: 'raspy American rock frontman',
    influence: 'angular Swedish-like timing on emphatic words',
    texture: 'bright nasal snarl with stage projection',
    rhythm: 'syncopated, punchy, built for call-and-response',
    energy: 'permanently one chorus away from a breakdown',
    habits: 'answers arguments with musical arrangement notes',
    catchphrase: 'This argument needs a solo.',
    mode: 'dialogue',
  },
  {
    id: 'karen-voice',
    characterId: 'karen',
    label: 'Karen Fineprint',
    foundation: 'firm American office administrator',
    influence: 'crisp French-like liaison in formal phrases',
    texture: 'dry, controlled mezzo with a paper-cut edge',
    rhythm: 'even tempo, surgical emphasis, zero patience',
    energy: 'quietly delighted by procedural collapse',
    habits: 'numbers every violation aloud',
    catchphrase: 'I need that in triplicate.',
    mode: 'dialogue',
  },
  {
    id: 'nico-voice',
    characterId: 'nico',
    label: 'Nico Box',
    foundation: 'young American delivery worker',
    influence: 'light Spanish-like vowel clarity in questions',
    texture: 'thin anxious tenor',
    rhythm: 'quick questions, self-corrections, breathy exits',
    energy: 'trying hard not to become part of the incident',
    habits: 'asks where to sign while already carrying the problem',
    catchphrase: 'Is this where I sign, or quit?',
    mode: 'dialogue',
  },
  {
    id: 'bork-voice',
    characterId: 'bork',
    label: 'Bork',
    foundation: 'dog vocal performance only',
    influence: 'none; no human accent or spoken language',
    texture: 'rough bark, whine, huff, and almost-word cadence',
    rhythm: 'bark clusters with head tilts and tail punctuation',
    energy: 'suspicious, loyal, and theatrically certain',
    habits: 'responds to every lie with a different bark pattern',
    catchphrase: 'Bark—bark—rruff.',
    mode: 'bark-only',
  },
];

export const voiceProfileByCharacterId = new Map(VOICE_PROFILES.map((profile) => [profile.characterId, profile]));

export const factoryCast: FactoryCharacter[] = factoryCatalog.characters.map((character) => ({
  ...character,
  voice: voiceProfileByCharacterId.get(character.id) || VOICE_PROFILES[0],
}));

export const factoryCastById = new Map(factoryCast.map((character) => [character.id, character]));
export const factoryScenes = FACTORY_SCENES as FactoryScene[];
export const segmentTemplates = SEGMENT_TEMPLATES as SegmentTemplate[];
export const musicRights = MUSIC_RIGHTS as unknown as MusicRightsRecord[];
export const sessionDurationOptions = SESSION_DURATION_OPTIONS;

function clipPriority(clip: PixelClip) {
  const id = String(clip.id || '');
  const frameCount = Array.isArray(clip.frames) ? clip.frames.length : Number(clip.frameCount || 0);
  return (/v3/i.test(id) ? 1000 : 0) + (frameCount === 6 ? 100 : 0) + (/pixellab/i.test(id) ? 10 : 0);
}

function bestClip(clips: PixelClip[], matches: (clip: PixelClip) => boolean) {
  return [...clips].filter(matches).sort((left, right) => clipPriority(right) - clipPriority(left))[0];
}

export function pickCharacterClip(character: FactoryCharacter, preference = 'movement') {
  const clips = character.clips || [];
  const preferred = preference === 'walk'
    ? bestClip(clips, (clip) => /walk|run|step/i.test(clip.id))
    : preference === 'idle'
      ? bestClip(clips, (clip) => /idle|loop|stiff|hunched|loose|slow|rocking|rigid|energetic|cautious/i.test(clip.id) && !/walk|run|step|react|talk|point|gesture/i.test(clip.id))
    : preference === 'reaction'
      ? bestClip(clips, (clip) => /react|laugh|cheer|bark|talk|point|gesture/i.test(clip.id))
    : bestClip(clips, (clip) => /walk|run|step|pixellab-/i.test(clip.id)) || clips.find((clip) => clip.id === character.primaryAnimation);
  return preferred || clips[0] || null;
}

export type { FactoryScene, SegmentTemplate, SessionPlan, QualityCheck };
export {
  assembleSession,
  evaluateSessionQuality,
  normalizeSessionMinutes,
  formatDuration,
};
