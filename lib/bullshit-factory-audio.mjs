const AUDIO_KINDS = new Set(['music', 'sfx', 'ambience', 'stinger']);
const AUDIO_STATUS = new Set(['approved', 'pending', 'rejected', 'deprecated']);

export const AUDIO_SCHEMA_VERSION = '1.0';
export const AUDIO_MUSIC_POLICY = 'opening-theme-and-string-guitar-only';

const ALLOWED_MUSIC_CUE_IDS = new Set(['bf-string-guitar']);

export const AUDIO_POLICY = Object.freeze({
  targetLUFS: -18,
  programTargetLUFS: -16,
  truePeakDb: -1.5,
  optionalMissingAssets: true,
  queueMissingAssets: true,
  runtimeNetworkCalls: false,
  stableAudioPreGenerationOnly: true,
  musicPolicy: AUDIO_MUSIC_POLICY,
  maxCuesPerSegment: 24,
});

function text(value, fallback = '') {
  const result = String(value ?? '').trim();
  return result || fallback;
}

function finiteNumber(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function uniqueStrings(values) {
  return [...new Set((Array.isArray(values) ? values : [values])
    .flatMap((value) => String(value ?? '').split(/[,_/|]+/u))
    .map((value) => value.trim().toLowerCase().replace(/[^a-z0-9-]+/gu, '-'))
    .filter(Boolean))];
}

function normalizeAsset(asset, index) {
  if (!asset || typeof asset !== 'object') return null;
  const id = text(asset.id, 'audio-' + (index + 1)).toLowerCase().replace(/[^a-z0-9._-]+/gu, '-');
  const kindCandidate = text(asset.kind || asset.type || (asset.category === 'stingers' ? 'stinger' : 'music')).toLowerCase();
  const kind = AUDIO_KINDS.has(kindCandidate) ? kindCandidate : 'music';
  const statusCandidate = text(asset.status, asset.approved === false ? 'rejected' : 'approved').toLowerCase();
  const status = AUDIO_STATUS.has(statusCandidate) ? statusCandidate : 'pending';
  const tags = uniqueStrings([
    ...(Array.isArray(asset.tags) ? asset.tags : []),
    asset.category,
    asset.mood,
    asset.role,
    kind,
  ]);
  const semanticTags = uniqueStrings([...(Array.isArray(asset.semanticTags) ? asset.semanticTags : []), ...tags]);
  const loudness = asset.loudness && typeof asset.loudness === 'object'
    ? {
      integratedLUFS: Number.isFinite(Number(asset.loudness.integratedLUFS ?? asset.loudness.integratedLufs)) ? Number(asset.loudness.integratedLUFS ?? asset.loudness.integratedLufs) : null,
      truePeakDb: Number.isFinite(Number(asset.loudness.truePeakDb)) ? Number(asset.loudness.truePeakDb) : null,
      measuredAt: text(asset.loudness.measuredAt) || null,
    }
    : null;
  const defaultDurationSeconds = { music: 30, sfx: 1, ambience: 45, stinger: 2 }[kind] || 1;
  const durationSeconds = clamp(
    finiteNumber(asset.durationSeconds ?? asset.duration, defaultDurationSeconds),
    0.08,
    3600,
  );
  return {
    id,
    title: text(asset.title, id),
    kind,
    role: text(asset.role, kind),
    tags,
    semanticTags,
    description: text(asset.description) || null,
    generationPrompt: text(asset.generationPrompt) || null,
    generatedAt: text(asset.generatedAt) || null,
    usageCount: Math.max(0, Math.round(finiteNumber(asset.usageCount, 0))),
    loudness,
    truePeakDb: Number.isFinite(Number(asset.truePeakDb)) ? Number(asset.truePeakDb) : loudness?.truePeakDb ?? null,
    approved: asset.approved === undefined ? status === 'approved' : asset.approved === true,
    file: text(asset.file),
    durationSeconds,
    loopable: asset.loopable === true || kind === 'ambience',
    status,
    source: text(asset.source, 'Bullshit Factory local audio catalog'),
    provider: text(asset.provider, 'internal'),
    ownership: text(asset.ownership, 'Bullshit Factory'),
    gainDb: clamp(finiteNumber(asset.gainDb, 0), -48, 6),
  };
}

export function normalizeAudioCatalog(input = {}) {
  const source = Array.isArray(input?.assets)
    ? input.assets
    : Array.isArray(input?.tracks)
      ? input.tracks
      : [];
  const assets = source
    .map((asset, index) => normalizeAsset(asset, index))
    .filter(Boolean)
    .filter((asset, index, list) => list.findIndex((candidate) => candidate.id === asset.id) === index);
  return {
    schemaVersion: text(input?.schemaVersion, AUDIO_SCHEMA_VERSION),
    showId: text(input?.showId, 'bullshit-factory'),
    status: text(input?.status, 'ready'),
    runtimePolicy: text(input?.runtimePolicy, 'local-pre-generated-assets-only'),
    policy: text(input?.policy, 'Original or locally generated audio only; missing optional cues fall back to silence.'),
    musicPolicy: text(input?.musicPolicy, AUDIO_MUSIC_POLICY),
    targetLUFS: finiteNumber(input?.targetLUFS, AUDIO_POLICY.targetLUFS),
    programTargetLUFS: finiteNumber(input?.programTargetLUFS, AUDIO_POLICY.programTargetLUFS),
    truePeakDb: finiteNumber(input?.truePeakDb, AUDIO_POLICY.truePeakDb),
    assets,
  };
}

function normalizedEvent(event, index, durationMs) {
  if (!event || typeof event !== 'object') return null;
  const startMs = clamp(Math.round(finiteNumber(event.startMs, 0)), 0, Math.max(0, durationMs - 1));
  const requestedEnd = finiteNumber(event.endMs, startMs + 500);
  const endMs = clamp(Math.max(startMs + 80, Math.round(requestedEnd)), startMs + 80, Math.max(startMs + 80, durationMs));
  return {
    id: text(event.id, 'event-' + (index + 1)),
    speakerId: text(event.speakerId),
    text: text(event.text || event.caption),
    startMs,
    endMs,
  };
}

const SEMANTIC_CUES = Object.freeze([
  { assetId: 'bf-string-guitar', kind: 'music', speakerIds: ['string'], terms: /\b(guitar|guitars|solo|riff|strum|strumming|amp|amplifier|drummer|set-list)\b/iu, purpose: 'String guitar performance cue', tags: ['string', 'guitar', 'instrumental', 'rock'], durationMs: 5200, gainDb: -16 },
  { assetId: 'bf-typing', kind: 'sfx', terms: /\b(type|typing|typed|keyboard|server|computer|technology|code|coded|password|login|software|database|internet)\b/iu, purpose: 'computer or technology activity', tags: ['technology', 'computer'], durationMs: 900, gainDb: -8 },
  { assetId: 'bf-paper', kind: 'sfx', terms: /\b(paper|memo|form|document|signature|file|clipboard|paperwork|report|contract|bureaucracy)\b/iu, purpose: 'paperwork or office activity', tags: ['paperwork', 'office'], durationMs: 750, gainDb: -10 },
  { assetId: 'bf-repair-spark', kind: 'sfx', terms: /\b(fix|fixed|repair|wrench|broken|leak|machine|valve|factory|maintenance|jammed|smoke)\b/iu, purpose: 'repair or factory machinery activity', tags: ['repair', 'factory'], durationMs: 850, gainDb: -9 },
  { assetId: 'bf-drink-clink', kind: 'sfx', terms: /\b(drink|beer|whiskey|alcohol|bar|bottle|booze|cocktail|liquor|drunk|shot)\b/iu, purpose: 'alcohol or bar activity', tags: ['alcohol', 'bar'], durationMs: 650, gainDb: -10 },
  { assetId: 'bf-sailing-bell', kind: 'sfx', terms: /\b(sail|sailing|boat|helm|rigging|anchor|ballast|dock|nautical|sea|captain)\b/iu, purpose: 'sailing or dock activity', tags: ['sailing', 'dock'], durationMs: 900, gainDb: -11 },
  { assetId: 'bf-impact', kind: 'sfx', terms: /\b(crash|slam|fall|explode|exploded|impact|thud|smash|collision)\b/iu, purpose: 'physical impact or punchline accent', tags: ['impact', 'reaction'], durationMs: 600, gainDb: -8 },
  { assetId: 'bf-door', kind: 'sfx', terms: /\b(door|enter|entered|exit|exited|leave|left|knock)\b/iu, purpose: 'entrance or exit activity', tags: ['door', 'movement'], durationMs: 700, gainDb: -10 },
]);

function runtimeCueAllowed(cue) {
  const kind = text(cue?.kind).toLowerCase();
  if (!['music', 'ambience', 'stinger'].includes(kind)) return true;
  return ALLOWED_MUSIC_CUE_IDS.has(text(cue?.assetId));
}

function addCue(cues, cue, durationMs) {
  if (cues.length >= AUDIO_POLICY.maxCuesPerSegment) return;
  if (!runtimeCueAllowed(cue)) return;
  const startMs = clamp(Math.round(finiteNumber(cue.startMs, 0)), 0, Math.max(0, durationMs - 1));
  const endMs = clamp(Math.max(startMs + 80, Math.round(finiteNumber(cue.endMs, startMs + 500))), startMs + 80, Math.max(startMs + 80, durationMs));
  const candidate = {
    id: text(cue.id, 'cue-' + (cues.length + 1)),
    assetId: text(cue.assetId),
    kind: AUDIO_KINDS.has(text(cue.kind).toLowerCase()) ? text(cue.kind).toLowerCase() : 'sfx',
    startMs,
    endMs,
    sourceLineId: text(cue.sourceLineId) || null,
    purpose: text(cue.purpose, 'semantic scene accent'),
    tags: uniqueStrings(cue.tags),
    gainDb: clamp(finiteNumber(cue.gainDb, 0), -48, 6),
  };
  if (!candidate.assetId) return;
  const duplicate = cues.some((existing) => existing.assetId === candidate.assetId && Math.abs(existing.startMs - candidate.startMs) < 2500);
  if (!duplicate) cues.push(candidate);
}

export function buildAudioCuePlan(input = {}) {
  const durationSeconds = clamp(finiteNumber(input.durationSeconds, 300), 0.18, 3600);
  const durationMs = Math.round(durationSeconds * 1000);
  const cues = [];
  const explicitCues = [
    ...(Array.isArray(input.audioCues) ? input.audioCues : []),
    ...(Array.isArray(input.performanceTimeline?.audioCues) ? input.performanceTimeline.audioCues : []),
  ];
  for (const [index, cue] of explicitCues.entries()) {
    addCue(cues, {
      ...cue,
      id: cue?.id || 'explicit-audio-' + String(index + 1),
      assetId: cue?.assetId || cue?.semanticId,
      sourceLineId: cue?.sourceLineId || cue?.lineId || null,
      purpose: cue?.purpose || 'explicit semantic timeline cue',
    }, durationMs);
  }
  const events = [
    ...(Array.isArray(input.dialogue) ? input.dialogue : []),
    ...(Array.isArray(input.tvInterruptions) ? input.tvInterruptions : []),
  ]
    .map((event, index) => normalizedEvent(event, index, durationMs))
    .filter(Boolean)
    .sort((left, right) => left.startMs - right.startMs);

  const lastCueAt = new Map();
  for (const event of events) {
    const eventText = event.text;
    if (!eventText || event.speakerId.toLowerCase() === 'bork') continue;
    for (const semantic of SEMANTIC_CUES) {
      if (Array.isArray(semantic.speakerIds) && !semantic.speakerIds.includes(event.speakerId.toLowerCase())) continue;
      if (!semantic.terms.test(eventText)) continue;
      if ((event.startMs - (lastCueAt.get(semantic.assetId) ?? -Infinity)) < 2500) continue;
      addCue(cues, {
        id: 'semantic-' + semantic.assetId + '-' + event.id,
        assetId: semantic.assetId,
        kind: semantic.kind,
        startMs: Math.max(0, event.startMs + 60),
        endMs: Math.min(durationMs, event.startMs + semantic.durationMs),
        sourceLineId: event.id,
        purpose: semantic.purpose,
        tags: semantic.tags,
        gainDb: semantic.gainDb,
      }, durationMs);
      lastCueAt.set(semantic.assetId, event.startMs);
    }
  }

  for (const [index, bark] of (Array.isArray(input.barkEvents) ? input.barkEvents : []).entries()) {
    const event = normalizedEvent(bark, index, durationMs);
    if (!event) continue;
    addCue(cues, {
      id: 'bork-accent-' + event.id,
      assetId: 'bf-dog-cue',
      kind: 'sfx',
      startMs: event.startMs,
      endMs: Math.min(durationMs, event.startMs + 400),
      sourceLineId: event.id,
      purpose: 'optional dog punctuation under Bork bark',
      tags: ['dog', 'bark'],
      gainDb: -18,
    }, durationMs);
  }

  if (Array.isArray(input.storyBeats)) {
    for (const [index, beat] of input.storyBeats.entries()) {
      const beatText = text(beat?.text || beat?.action || beat?.description);
      const beatActors = [beat?.characterId, beat?.actorId, beat?.visualFocus, ...(Array.isArray(beat?.actors) ? beat.actors : [])]
        .map((value) => text(value).toLowerCase())
        .filter(Boolean);
      if (!beatActors.includes('string') || !/\b(guitar|guitars|solo|riff|strum|strumming|amp|amplifier|drummer|set-list)\b/iu.test(beatText)) continue;
      const explicitStart = beat?.startMs ?? beat?.atMs;
      const startMs = Number.isFinite(Number(explicitStart))
        ? Number(explicitStart)
        : durationMs * index / Math.max(1, input.storyBeats.length - 1);
      addCue(cues, {
        id: 'story-string-guitar-' + (index + 1),
        assetId: 'bf-string-guitar',
        kind: 'music',
        startMs,
        endMs: startMs + 5200,
        purpose: 'String guitar performance beat',
        tags: ['string', 'guitar', 'instrumental', 'rock'],
        gainDb: -16,
      }, durationMs);
    }
  }

  return {
    schemaVersion: AUDIO_SCHEMA_VERSION,
    status: 'planned',
    optional: AUDIO_POLICY.optionalMissingAssets,
    musicPolicy: AUDIO_MUSIC_POLICY,
    sceneId: text(input.sceneId, 'factory-floor'),
    durationSeconds,
    cues: cues.sort((left, right) => left.startMs - right.startMs).slice(0, AUDIO_POLICY.maxCuesPerSegment),
  };
}

function findAssetForCue(cue, assets) {
  const direct = assets.find((asset) => asset.id === cue.assetId && asset.status === 'approved' && asset.file);
  if (direct) return direct;
  return assets.find((asset) => asset.status === 'approved' && asset.file && asset.kind === cue.kind && cue.tags.some((tag) => asset.semanticTags.includes(tag) || asset.tags.includes(tag)));
}

export function resolveAudioCuePlan(plan = {}, catalog = {}) {
  const normalizedCatalog = normalizeAudioCatalog(catalog);
  const cues = [];
  const missing = [];
  for (const cue of Array.isArray(plan.cues) ? plan.cues : []) {
    const startMs = Math.max(0, Math.round(finiteNumber(cue.startMs, 0)));
    const normalizedCue = {
      ...cue,
      startMs,
      endMs: Math.max(Math.round(finiteNumber(cue.endMs, 0)), startMs + 80),
      tags: uniqueStrings(cue.tags),
      gainDb: clamp(finiteNumber(cue.gainDb, 0), -48, 6),
    };
    const asset = findAssetForCue(normalizedCue, normalizedCatalog.assets);
    if (!asset) {
      missing.push({ ...normalizedCue, status: 'missing', reason: 'no approved local asset matched the semantic cue' });
      continue;
    }
    cues.push({ ...normalizedCue, status: 'ready', asset });
  }
  return {
    ...plan,
    status: missing.length ? 'partial' : 'ready',
    optional: plan.optional !== false,
    cues,
    missing,
    catalogSchemaVersion: normalizedCatalog.schemaVersion,
  };
}

export function validateAudioCatalog(catalog = {}) {
  const normalized = normalizeAudioCatalog(catalog);
  const errors = [];
  const warnings = [];
  for (const asset of normalized.assets) {
    if (!asset.id || !asset.kind || !asset.file) errors.push(asset.id || 'unnamed-audio-asset');
    if (!asset.semanticTags.length) warnings.push(asset.id + ': missing semanticTags');
    if (!asset.description) warnings.push(asset.id + ': missing description');
    if (asset.status === 'approved' && !asset.generatedAt && asset.provider !== 'internal') warnings.push(asset.id + ': approved generated asset has no generatedAt');
    if (asset.status === 'approved' && !asset.loudness && asset.provider !== 'internal') warnings.push(asset.id + ': approved generated asset has no loudness measurement');
  }
  return { ok: errors.length === 0, errors, warnings, assetCount: normalized.assets.length };
}

export function audioCatalogSummary(catalog = {}) {
  const normalized = normalizeAudioCatalog(catalog);
  const byKind = Object.fromEntries([...AUDIO_KINDS].map((kind) => [kind, normalized.assets.filter((asset) => asset.kind === kind).length]));
  return {
    schemaVersion: normalized.schemaVersion,
    showId: normalized.showId,
    status: normalized.status,
    runtimePolicy: normalized.runtimePolicy,
    musicPolicy: normalized.musicPolicy,
    totalAssets: normalized.assets.length,
    approvedAssets: normalized.assets.filter((asset) => asset.status === 'approved').length,
    metadataCompleteAssets: normalized.assets.filter((asset) => asset.semanticTags.length && asset.description && asset.generationPrompt).length,
    measuredLoudnessAssets: normalized.assets.filter((asset) => asset.loudness || asset.truePeakDb !== null).length,
    byKind,
    targetLUFS: normalized.targetLUFS,
    programTargetLUFS: normalized.programTargetLUFS,
    truePeakDb: normalized.truePeakDb,
    runtimeNetworkCalls: AUDIO_POLICY.runtimeNetworkCalls,
    stableAudioPreGenerationOnly: AUDIO_POLICY.stableAudioPreGenerationOnly,
    optionalMissingAssets: AUDIO_POLICY.optionalMissingAssets,
  };
}
