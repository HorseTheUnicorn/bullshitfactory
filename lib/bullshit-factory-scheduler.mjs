export const CAST_IDS = [
  'rookboss',
  'magsrust',
  'kernelkline',
  'sudsmcgee',
  'dooby',
  'spaulding',
  'string',
  'karen',
  'nico',
  'bork',
];

export const SESSION_BLOCK_MINUTES = 5;

const minuteOptions = Array.from({ length: 12 }, (_, index) => (index + 1) * 5);
const hourOptions = Array.from({ length: 24 }, (_, index) => (index + 1) * 60);

export const SESSION_DURATION_OPTIONS = [...new Set([...minuteOptions, ...hourOptions])].map((value) => ({
  value,
  label: value < 60 ? `${value} minutes` : value === 60 ? '60 minutes / 1 hour' : `${value / 60} hours`,
}));

export const FACTORY_SCENES = [
  {
    id: 'factory-floor',
    label: 'Factory floor',
    location: 'Main production floor',
    cue: 'A conveyor belt is making an avoidable decision.',
    description: 'A grimy assembly line, warning lamps, stacked crates, and a control panel nobody admits owning.',
    background: '/bullshit-factory/scenes/factory-floor.png',
    accent: '#c75a43',
    castIds: ['rookboss', 'magsrust', 'nico', 'bork'],
    movement: 'Conveyor loops, warning-light blinks, clipboard snaps, and a dog interruption every few beats.',
  },
  {
    id: 'break-room',
    label: 'Break room',
    location: 'Break room / unofficial bar',
    cue: 'The coffee machine has entered a hostile negotiation.',
    description: 'A tired break room with a vending machine, dented stools, a corkboard, and one suspiciously proud bottle shelf.',
    background: '/bullshit-factory/scenes/break-room.png',
    accent: '#d28a44',
    castIds: ['sudsmcgee', 'dooby', 'karen', 'bork'],
    movement: 'Bottle flourish, smoke-shaped thought bubbles, paperwork slaps, mug raises, and bark punctuation.',
  },
  {
    id: 'server-room',
    label: 'Server room',
    location: 'Systems room',
    cue: 'The uptime chart is lying with unusual confidence.',
    description: 'Racks, CRT glow, cable spaghetti, blinking status LEDs, and a rolling chair that should be retired.',
    background: '/bullshit-factory/scenes/server-room.png',
    accent: '#6d9d91',
    castIds: ['kernelkline', 'string', 'rookboss', 'bork'],
    movement: 'Typing loops, cable pulls, head turns, monitor flicker, guitar-body bounce, and tail wagging.',
  },
  {
    id: 'boat-bay',
    label: 'Boat bay',
    location: 'Loading dock / boat bay',
    cue: 'A sailboat has been classified as a software dependency.',
    description: 'A warehouse bay open to gray water, with rope coils, a little sailboat, faded safety paint, and a leaking roof.',
    background: '/bullshit-factory/scenes/boat-bay.png',
    accent: '#668a92',
    castIds: ['spaulding', 'magsrust', 'nico', 'bork'],
    movement: 'Rope tugging, boat rocking, compass checking, old-person pointing, package wobble, and dog pacing.',
  },
  {
    id: 'loading-dock',
    label: 'Loading dock',
    location: 'Night loading dock',
    cue: 'The shipping manifest has achieved sentience.',
    description: 'A sodium-lit dock with pallets, a busted forklift, a radio speaker, and a sky that looks permanently overcast.',
    background: '/bullshit-factory/scenes/loading-dock.png',
    accent: '#c0a04f',
    castIds: ['nico', 'string', 'sudsmcgee', 'bork'],
    movement: 'Forklift beeps, foot taps, crate slides, radio stingers, swagger, and a bark that sounds almost linguistic.',
  },
  {
    id: 'roof-antenna',
    label: 'Roof antenna',
    location: 'Factory rooftop',
    cue: 'The radio signal is being held together by a zip tie.',
    description: 'A flat factory rooftop at dusk with a crooked radio antenna, vent pipes, coiled cables, warning lights, and a distant harbor skyline.',
    background: '/bullshit-factory/scenes/roof-antenna.png',
    accent: '#9c6b55',
    castIds: ['rookboss', 'kernelkline', 'string', 'bork'],
    movement: 'Antenna blink, cable tug, wind-blown jacket, rock-star lean, and a dog barking at the skyline.',
  },
  {
    id: 'employee-bar',
    label: 'Employee bar',
    location: 'After-shift bar corner',
    cue: 'The unofficial bar has an official closing time nobody respects.',
    description: 'A cramped hidden factory bar with a dented counter, mismatched stools, old beer taps, a cloudy window, a shelf of bottles, and a tired neon sign with no readable text.',
    background: '/bullshit-factory/scenes/employee-bar.png',
    accent: '#b46b43',
    castIds: ['sudsmcgee', 'dooby', 'magsrust', 'bork'],
    movement: 'Bottle glints, stool rocking, smoke curl, bartender shrug, and bark punctuation over the jukebox.',
  },
  {
    id: 'marina-slip',
    label: 'Marina slip',
    location: 'Industrial marina',
    cue: 'The sailboat is still technically inside the loading manifest.',
    description: 'A rusty industrial marina slip beside the factory with a small sailboat, dock cleats, rope coils, oil-dark water, gull silhouettes, and a broken floodlight.',
    background: '/bullshit-factory/scenes/marina-slip.png',
    accent: '#5f8991',
    castIds: ['spaulding', 'nico', 'magsrust', 'bork'],
    movement: 'Water shimmer, rope sway, sailboat bob, package wobble, compass check, and dog pacing.',
  },
  {
    id: 'arcade-closet',
    label: 'Arcade closet',
    location: 'Legacy systems closet',
    cue: 'The last working CRT is running a spreadsheet like it is a game.',
    description: 'A narrow retro computer repair closet with stacked CRT monitors, beige keyboards, tangled cables, a tiny arcade cabinet, spare circuit boards, and a buzzing fluorescent tube.',
    background: '/bullshit-factory/scenes/arcade-closet.png',
    accent: '#6b8f89',
    castIds: ['kernelkline', 'karen', 'string', 'bork'],
    movement: 'CRT flicker, cursor glow, cable twitch, clipboard snap, foot tap, and a bark at the error screen.',
  },
  {
    id: 'senior-lounge',
    label: 'Senior lounge',
    location: 'Retirement home annex',
    cue: 'The old people have formed a committee to audit the factory.',
    description: 'A dim retirement-home lounge with folding chairs, a humming CRT television, a card table, a potted plant, a vending machine, and faded carpet in a muted early-2000s 16-bit palette.',
    background: '/bullshit-factory/scenes/senior-lounge.png',
    accent: '#a78b67',
    castIds: ['magsrust', 'karen', 'spaulding', 'bork'],
    movement: 'Television flicker, cane tap, paper shuffle, compass glint, slow chair rock, and a very judgmental bark.',
  },
];

export const SEGMENT_TEMPLATES = [
  {
    id: 'shift-start',
    category: 'factory',
    title: 'The Shift Starts Without Permission',
    synopsis: 'Rook announces a productivity initiative while the floor immediately produces evidence against it.',
    castIds: ['rookboss', 'magsrust', 'bork'],
    sceneId: 'factory-floor',
    movementCue: 'Foreman points, veteran leans into a knee crack, conveyor cycles, dog barks over the punchline.',
    musicMood: 'garage-stomp',
  },
  {
    id: 'break-policy',
    category: 'alcohol',
    title: 'Break Policy: Hydration Is a Spectrum',
    synopsis: 'Suds presents an extremely informal beverage policy and Karen discovers three new violations in the same sentence.',
    castIds: ['sudsmcgee', 'karen', 'bork'],
    sceneId: 'break-room',
    movementCue: 'Bottle flourish, paper slap, glasses push, synchronized disbelief, then a bark sting.',
    musicMood: 'bar-band-jangle',
  },
  {
    id: 'wellness-memo',
    category: 'marijuana',
    title: 'The Wellness Memo Is Mostly Vibes',
    synopsis: 'Dooby tries to explain a calm workplace while Rook keeps mistaking a philosophical pause for a missed deadline.',
    castIds: ['dooby', 'rookboss', 'nico', 'bork'],
    sceneId: 'break-room',
    movementCue: 'Slow sway, loose hand gestures, impatient cap tilt, nervous package shift, dog head tilt.',
    musicMood: 'dusty-psych-rock',
  },
  {
    id: 'server-emergency',
    category: 'computer-nerd',
    title: 'The Server Has Boundaries',
    synopsis: 'Kernel Kline diagnoses an outage as emotional burnout while String proposes solving it with a guitar solo.',
    castIds: ['kernelkline', 'string', 'rookboss', 'bork'],
    sceneId: 'server-room',
    movementCue: 'Typing bursts, cable tug, monitor flash, guitar-body bounce, boss finger point, dog bark interruption.',
    musicMood: 'bit-crushed-rock',
  },
  {
    id: 'boat-problem',
    category: 'sailboats',
    title: 'Every Problem Is a Rigging Problem',
    synopsis: 'Spaulding blames a factory outage on an imaginary mainsail while Mags fixes the actual machine with a wrench.',
    castIds: ['spaulding', 'magsrust', 'nico', 'bork'],
    sceneId: 'boat-bay',
    movementCue: 'Compass check, rope pull, wrench lift, old sailor sway, crate wobble, dog pacing.',
    musicMood: 'dockside-shanty-rock',
  },
  {
    id: 'old-timer-override',
    category: 'old-people',
    title: 'Mags Overrides the New System',
    synopsis: 'The oldest worker in the building bypasses a dashboard, a committee, and a cloud service with one screwdriver.',
    castIds: ['magsrust', 'kernelkline', 'karen', 'bork'],
    sceneId: 'server-room',
    movementCue: 'Slow deliberate steps, screwdriver flourish, frantic keyboarding, clipboard recoil, dog approval bark.',
    musicMood: 'rust-belt-blues',
  },
  {
    id: 'guitar-solo-arbitration',
    category: 'rock-and-roll',
    title: 'String Calls a Guitar Solo as a Witness',
    synopsis: 'A workplace dispute is submitted to a rock riff, and the riff refuses to remain on topic.',
    castIds: ['string', 'sudsmcgee', 'karen', 'bork'],
    sceneId: 'loading-dock',
    movementCue: 'Foot tapping, shoulder hit, bottle raise, compliance recoil, spotlight flicker, bark on the downbeat.',
    musicMood: 'garage-stomp',
  },
  {
    id: 'shipping-mystery',
    category: 'shipping',
    title: 'The Box Is Not on the Manifest',
    synopsis: 'Nico delivers a package with no sender, no destination, and an unsettling amount of authority.',
    castIds: ['nico', 'rookboss', 'karen', 'bork'],
    sceneId: 'loading-dock',
    movementCue: 'Package lift, double-take, boss point, pen scribble, dock-light pulse, dog investigative sniff.',
    musicMood: 'warehouse-pulse',
  },
  {
    id: 'dog-quality-check',
    category: 'dog',
    title: 'Bork Audits the Entire Factory',
    synopsis: 'Bork performs a bark-only inspection and somehow finds the only honest report in the building.',
    castIds: ['bork', 'rookboss', 'dooby', 'string'],
    sceneId: 'factory-floor',
    movementCue: 'Head tilts, ear flicks, tail wag, suspicious sniff, human reactions, and bark-like almost-words.',
    musicMood: 'cartoon-drum-break',
  },
  {
    id: 'after-hours-rant',
    category: 'adult-variety',
    title: 'After Hours: Nobody Is Clocked In',
    synopsis: 'The crew trades bad theories about drinks, weed, computers, boats, and aging while the lights refuse to shut off.',
    castIds: ['rookboss', 'sudsmcgee', 'dooby', 'spaulding', 'magsrust', 'bork'],
    sceneId: 'break-room',
    movementCue: 'Overlapping gestures, drink lift, drifting sway, sailor point, veteran shrug, and dog bark button.',
    musicMood: 'late-night-rock',
  },
];

function firstPartyMusic(id, title, mood = 'dusty-16-bit-rock') {
  return {
    id,
    title,
    mood,
    source: 'original Bullshit Factory master',
    rightsHolder: 'Bullshit Factory',
    licenseProof: 'Self-authored/generated asset; no third-party recording.',
    status: 'approved',
    permittedUse: ['livestream', 'VOD', 'commercial'],
    attribution: 'none',
  };
}

export const MUSIC_RIGHTS = [
  firstPartyMusic('bf-garage-stomp', 'Garage Stomp'),
  firstPartyMusic('bf-bar-band-jangle', 'Bar Band Jangle'),
  firstPartyMusic('bf-dusty-psych-rock', 'Dusty Psych Rock'),
  firstPartyMusic('bf-bit-crushed-rock', 'Bit-Crushed Rock'),
  firstPartyMusic('bf-dockside-shanty-rock', 'Dockside Shanty Rock'),
  firstPartyMusic('bf-rust-belt-blues', 'Rust Belt Blues'),
  firstPartyMusic('bf-late-night-rock', 'Late Night Rock'),
  firstPartyMusic('bf-warehouse-pulse', 'Warehouse Pulse'),
  firstPartyMusic('bf-cartoon-drum-break', 'Cartoon Drum Break'),
];

const MUSIC_MOOD_TO_TRACK = Object.freeze({
  'garage-stomp': 'bf-garage-stomp',
  'bar-band-jangle': 'bf-bar-band-jangle',
  'dusty-psych-rock': 'bf-dusty-psych-rock',
  'bit-crushed-rock': 'bf-bit-crushed-rock',
  'dockside-shanty-rock': 'bf-dockside-shanty-rock',
  'rust-belt-blues': 'bf-rust-belt-blues',
  'late-night-rock': 'bf-late-night-rock',
  'warehouse-pulse': 'bf-warehouse-pulse',
  'cartoon-drum-break': 'bf-cartoon-drum-break',
});

function numericSeed(seed) {
  const parsed = Number(seed);
  if (!Number.isFinite(parsed)) return 1;
  return Math.abs(Math.floor(parsed)) || 1;
}

function nearestOption(value) {
  let best = SESSION_DURATION_OPTIONS[0].value;
  let bestDistance = Math.abs(value - best);
  for (const option of SESSION_DURATION_OPTIONS) {
    const distance = Math.abs(value - option.value);
    if (distance < bestDistance || (distance === bestDistance && option.value < best)) {
      best = option.value;
      bestDistance = distance;
    }
  }
  return best;
}

export function normalizeSessionMinutes(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  const bounded = Math.min(1440, Math.max(5, Math.round(parsed)));
  return nearestOption(bounded);
}

export function formatDuration(minutes) {
  const normalized = normalizeSessionMinutes(minutes);
  if (normalized < 60) return `${normalized} min`;
  if (normalized === 60) return '1 hr';
  return `${normalized / 60} hrs`;
}

function makeRandom(seed) {
  let state = numericSeed(seed) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function uniqueIds(values) {
  return [...new Set(values.filter(Boolean))];
}

function findById(values, id) {
  return values.find((value) => value.id === id) || null;
}

function buildTemplateSequence(templates, blockCount, random) {
  const sequence = [];
  let pool = [];
  let previousCategory = null;
  let previousSceneId = null;

  while (sequence.length < blockCount) {
    if (!pool.length) pool = shuffle(templates, random);

    const preferredIndex = pool.findIndex((template) => (
      template.category !== previousCategory && template.sceneId !== previousSceneId
    ));
    const alternateIndex = pool.findIndex((template) => template.category !== previousCategory);
    const fallbackIndex = pool.findIndex((template) => template.sceneId !== previousSceneId);
    const selectedIndex = preferredIndex >= 0
      ? preferredIndex
      : alternateIndex >= 0
        ? alternateIndex
        : fallbackIndex >= 0
          ? fallbackIndex
          : 0;
    const [template] = pool.splice(selectedIndex, 1);
    sequence.push(template);
    previousCategory = template.category;
    previousSceneId = template.sceneId;
  }

  return sequence;
}

export function assembleSession(minutes, seed = 1, options = {}) {
  const requestedMinutes = normalizeSessionMinutes(minutes);
  const random = makeRandom(seed);
  const scenes = options.scenes?.length ? options.scenes : FACTORY_SCENES;
  const templates = options.templates?.length ? options.templates : SEGMENT_TEMPLATES;
  const castIds = options.castIds?.length ? options.castIds : CAST_IDS;
  const selectedSceneId = options.sceneId && scenes.some((scene) => scene.id === options.sceneId) ? options.sceneId : null;
  const selectedCharacterId = options.characterId && castIds.includes(options.characterId) ? options.characterId : null;
  const blocks = [];
  const templateSequence = buildTemplateSequence(templates, requestedMinutes / SESSION_BLOCK_MINUTES, random);

  for (let index = 0; index < requestedMinutes / SESSION_BLOCK_MINUTES; index += 1) {
    const template = templateSequence[index];
    const scene = selectedSceneId
      ? findById(scenes, selectedSceneId) || scenes[index % scenes.length]
      : findById(scenes, template.sceneId) || scenes[index % scenes.length];
    const rotatingPrimary = castIds[(index + numericSeed(seed)) % castIds.length];
    const templateCast = template.castIds.filter((id) => castIds.includes(id));
    const selectedFirst = index === 0 && selectedCharacterId ? [selectedCharacterId] : [];
    const dogRequired = index === 0 || index % 6 === 0 || template.category === 'dog';
    const dogId = castIds.includes('bork') ? ['bork'] : [];
    const castForBlock = uniqueIds([
      ...selectedFirst,
      ...templateCast,
      rotatingPrimary,
      ...(dogRequired ? dogId : []),
    ]).slice(0, 6);
    const music = findById(MUSIC_RIGHTS, MUSIC_MOOD_TO_TRACK[template.musicMood] || template.musicMood);

    blocks.push({
      id: `block-${String(index + 1).padStart(3, '0')}`,
      index,
      startMinute: index * SESSION_BLOCK_MINUTES,
      endMinute: (index + 1) * SESSION_BLOCK_MINUTES,
      durationMinutes: SESSION_BLOCK_MINUTES,
      templateId: template.id,
      title: template.title,
      category: template.category,
      synopsis: template.synopsis,
      sceneId: scene.id,
      sceneLabel: scene.label,
      castIds: castForBlock,
      dogIncluded: castForBlock.includes('bork'),
      movementCue: template.movementCue,
      voiceIds: castForBlock,
      musicTrackId: music?.id || null,
      musicRightsStatus: music?.status || 'no-music',
    });
  }

  const categories = [...new Set(blocks.map((block) => block.category))];
  const castCoverage = [...new Set(blocks.flatMap((block) => block.castIds))];
  const dogBlocks = blocks.filter((block) => block.dogIncluded).length;
  const musicStatuses = [...new Set(blocks.map((block) => block.musicRightsStatus))];

  return {
    id: `bf-${requestedMinutes}-${numericSeed(seed)}`,
    showId: 'bullshit-factory',
    seed: numericSeed(seed),
    requestedMinutes,
    formattedDuration: formatDuration(requestedMinutes),
    blockMinutes: SESSION_BLOCK_MINUTES,
    blockCount: blocks.length,
    exactDurationMinutes: blocks.reduce((total, block) => total + block.durationMinutes, 0),
    categories,
    castCoverage,
    dogIncluded: dogBlocks > 0,
    dogBlockCount: dogBlocks,
    musicStatuses,
    blocks,
  };
}

export function evaluateSessionQuality(session, options = {}) {
  const catalog = options.catalog || null;
  const characters = Array.isArray(catalog?.characters) ? catalog.characters : [];
  const activeCastCount = Number(catalog?.activeCastCount || characters.length || CAST_IDS.length);
  const allDirectionsReady = characters.length > 0 && characters.every((character) => Object.keys(character.rotations || {}).length === 8);
  const movementReady = characters.length > 0 && characters.every((character) => (character.clips || []).some((clip) => clip.frameCount >= 7));
  const barkOnly = characters.filter((character) => character.isDog).every((character) => character.id === 'bork');
  const musicReady = session.musicStatuses.every((status) => status === 'approved' || status === 'no-music');
  const checks = [
    {
      id: 'duration',
      label: 'Exact selected duration',
      status: session.exactDurationMinutes === session.requestedMinutes ? 'ready' : 'blocked',
      detail: `${session.exactDurationMinutes} minutes assembled from ${session.blockCount} x ${session.blockMinutes}-minute blocks.`,
    },
    {
      id: 'cast',
      label: '10-character cast catalog',
      status: activeCastCount === 10 ? 'ready' : 'blocked',
      detail: `${activeCastCount}/10 active character slots are cataloged.`,
    },
    {
      id: 'directions',
      label: 'Eight-direction sprites',
      status: allDirectionsReady ? 'ready' : 'review-required',
      detail: allDirectionsReady ? 'Every active character has eight validated rotations.' : 'Some direction exports still need a visual review.',
    },
    {
      id: 'movement',
      label: 'Movement coverage',
      status: movementReady ? 'ready' : 'review-required',
      detail: movementReady ? 'Every character has a seven-frame or longer motion clip.' : 'Use the PixelLab expansion pass before calling the cast animation-complete.',
    },
    {
      id: 'dog-voice',
      label: 'Bork bark-only invariant',
      status: session.dogIncluded && barkOnly ? 'ready' : 'blocked',
      detail: session.dogIncluded ? `${session.dogBlockCount} blocks include Bork; the dog never receives human dialogue.` : 'The session has no bark-only dog block.',
    },
    {
      id: 'music-rights',
      label: 'Music rights gate',
      status: musicReady ? 'ready' : 'blocked',
      detail: musicReady ? 'Every selected track has an approved use record.' : 'Music placeholders remain silent until a license proof, territory, VOD, and commercial-use record is attached.',
    },
    {
      id: 'audio-lipsync',
      label: 'Voice and lip-sync render',
      status: 'review-required',
      detail: 'Voice recipes and caption timing are specified; final TTS takes must pass the audio review before broadcast.',
    },
  ];
  const status = checks.some((check) => check.status === 'blocked')
    ? 'blocked'
    : checks.some((check) => check.status === 'review-required')
      ? 'review-required'
      : 'ready';
  return { status, checks };
}
