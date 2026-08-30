'use client';

/* eslint-disable @next/next/no-img-element -- direct public pixel assets preserve native nearest-neighbor rendering. */

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  assembleSession,
  evaluateSessionQuality,
  factoryCatalog,
  factoryCast,
  factoryCastById,
  factoryProps,
  factoryScenes,
  formatDuration,
  pickCharacterClip,
  sessionDurationOptions,
  type FactoryCharacter,
  type SessionPlan,
} from '../lib/bullshit-factory';
import { buildSceneLayout, getCharacterGeometry, resolveScenePlacement } from '../lib/bullshit-factory-location.mjs';

type QualityResult = ReturnType<typeof evaluateSessionQuality>;

type MusicBackendStatus = {
  status?: string;
  provider?: string;
  endpoint?: string;
  serialized?: boolean;
  generationMode?: string;
  queueDepth?: number;
  cacheFiles?: number;
  backend?: string;
  model?: string;
  error?: string;
};

type MusicJobStatus = {
  jobId?: string;
  status?: string;
  queuePosition?: number;
  audioUrl?: string | null;
  error?: string | null;
};

type ProductionControl = {
  status?: string;
  paused?: boolean;
  mode?: string;
  requestedMinutes?: number | null;
  targetSeconds?: number;
  elapsedSeconds?: number;
  currentIndex?: number;
};

type ProductionPlaylistItem = {
  index?: number | null;
  segmentId?: string | null;
  title?: string;
  source?: string;
  category?: string;
  sceneId?: string;
  castIds?: string[];
  startSeconds?: number;
  endSeconds?: number;
  durationSeconds?: number;
};

type ProductionPlaylist = {
  mode?: string;
  status?: string;
  running?: boolean;
  healthy?: boolean;
  hasPlaylist?: boolean;
  itemCount?: number;
  currentIndex?: number | null;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  current?: ProductionPlaylistItem | null;
  next?: ProductionPlaylistItem | null;
  updatedAt?: string | null;
  items?: ProductionPlaylistItem[];
};

type ProductionJob = {
  jobId?: string;
  label?: string;
  status?: string;
  segmentId?: string | null;
  error?: string | null;
  result?: { id?: string; state?: string } | null;
};

type GenerationWho = 'cast' | 'orange' | 'random';
type GenerationWhen = 'now' | 'random';
type GenerationDurationPreset = 'short' | 'medium' | 'long';
type EpisodeMusicMode = 'auto' | 'none' | 'bed';

type OrangeResearchItem = {
  title?: string;
  excerpt?: string;
  publishedAt?: string;
  sourceUrl?: string;
  sourceHost?: string;
  topic?: string;
  used?: boolean;
};

type ResearchPoolView = {
  cycle?: number;
  sourceUrl?: string | null;
  usedCount?: number;
  remainingCount?: number;
  results?: OrangeResearchItem[];
  remainingResults?: OrangeResearchItem[];
};

type OrangeResearch = {
  fetchedAt?: string | null;
  speeches?: OrangeResearchItem[];
  headlines?: OrangeResearchItem[];
  selectedHeadlines?: OrangeResearchItem[];
  errors?: string[];
  customTopics?: string[];
  topicPools?: Record<string, ResearchPoolView>;
  refreshedTopics?: Array<{ topic?: string; cycle?: number; resultCount?: number }>;
};

type ResearchPoolsSnapshot = {
  resultsPerTopic?: number;
  whiteHouse?: { sourceUrls?: string[]; references?: OrangeResearchItem[] };
  orange?: OrangeResearch | null;
  cast?: {
    fetchedAt?: string | null;
    topicPools?: Record<string, ResearchPoolView>;
    customTopics?: string[];
    errors?: string[];
  };
};

type OrangeIdiotStatus = {
  enabled?: boolean;
  researchMode?: 'headlines-and-speeches' | 'off';
  lastResearchAt?: string | null;
  research?: OrangeResearch | null;
  modes?: string[];
  positions?: string[];
  sourcePolicy?: string;
  scheduling?: { enabled?: boolean; mode?: string };
  customResearchTopics?: string[];
  researchPolicy?: { resultsPerTopic?: number; refreshWhenPoolExhausted?: boolean; sharedWithCast?: boolean; remarksSource?: string[] };
};

type LivePlatformStatus = {
  enabled?: boolean;
  configured?: boolean;
  ingestConfigured?: boolean;
  streamKeyConfigured?: boolean;
  process?: string;
  broadcastId?: string | null;
  chatId?: string | null;
  watchUrl?: string | null;
  chatUrl?: string | null;
  bridgeEnabled?: boolean;
  profileUrl?: string | null;
  roomId?: string | null;
  ingestUrl?: string | null;
};

type LiveStreamStatus = {
  mode?: string;
  canGoLive?: boolean;
  message?: string;
  youtube?: LivePlatformStatus;
  tiktok?: LivePlatformStatus;
  playlist?: { count?: number; updatedAt?: string | null; source?: string };
  startedAt?: string | null;
  lastError?: string | null;
};

type ProductionLog = {
  at?: string;
  event?: string;
  detail?: string;
  episodeId?: string;
  title?: string;
  reason?: string;
  deleted?: boolean;
  jobId?: string;
};

type ProductionSnapshot = {
  live?: LiveStreamStatus;
  continuousGeneration?: {
    status?: 'idle' | 'running' | 'stopping' | 'error' | string;
    activeJobId?: string | null;
    startedAt?: string | null;
    stoppedAt?: string | null;
    completedCount?: number;
    lastEpisodeId?: string | null;
    lastGenerationWho?: 'cast' | 'orange' | null;
    lastError?: string | null;
  };

  status?: string;
  error?: string;
  control?: ProductionControl;
  session?: { id?: string; mode?: string; queue?: Array<{ title?: string; segmentId?: string; source?: string; durationSeconds?: number }> } | null;
  playlist?: ProductionPlaylist | null;
  inventory?: { total?: number; approved?: number; quarantined?: number; pendingJobs?: number };
  director?: { enabled?: boolean; model?: string; fallback?: string };
  writer?: { role?: string; provider?: string; model?: string; configured?: boolean; structuredOutput?: boolean | string; lineBudget?: string; billingPolicy?: string };
  animation?: { role?: string; provider?: string; model?: string; configured?: boolean; runtimeRenderer?: string; runtimeModel?: string; maxConcurrentJobs?: number };
  voice?: { provider?: string; castVoices?: number; barkOnly?: boolean };
  tvOnly?: { id?: string; displayName?: string; mainCast?: boolean; sceneId?: string; view?: string; preview?: string | null; trigger?: string; voice?: { configured?: boolean; accent?: string; requiresCustomVoiceExport?: boolean } };
  orangeIdiot?: OrangeIdiotStatus;
  researchPools?: ResearchPoolsSnapshot;
  renderer?: { provider?: string; canvas?: string; fps?: number; scaling?: string };
  music?: { approved?: number; total?: number; serialized?: boolean };
  episodes?: { total?: number; review?: number; published?: number };
  logs?: ProductionLog[];
};

type ProductionEpisode = {
  id: string;
  title?: string;
  state?: string;
  requestedMinutes?: number;
  durationSeconds?: number;
  sceneId?: string;
  castIds?: string[];
  videoFile?: string;
  posterFile?: string;
  captionsFile?: string;
  transcriptFile?: string;
  createdAt?: string;
  publishedAt?: string | null;
  files?: { video?: string; poster?: string; captions?: string; transcript?: string };
};

type BrowserPlacement = ReturnType<typeof resolveScenePlacement>;

function researchTopicLabel(topic: string) {
  return topic
    .replace(/^custom-/u, '')
    .replace(/-/gu, ' ')
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function ResearchPoolPanel({ label, pools }: { label: string; pools?: Record<string, ResearchPoolView> }) {
  const entries = Object.entries(pools || {});
  return (
    <section className="bf-research-pool-section" aria-label={label}>
      <div className="bf-research-pool-heading">
        <span>{label}</span>
        <small>{entries.length} POOLS / 10 RESULTS EACH</small>
      </div>
      {entries.length ? <div className="bf-research-pool-list">
        {entries.map(([topic, pool]) => <details className="bf-research-pool" key={topic}>
          <summary>
            <strong>{researchTopicLabel(topic).toUpperCase()}</strong>
            <span>CYCLE {pool.cycle || 0} / {pool.remainingCount ?? 0} REMAINING</span>
          </summary>
          <div className="bf-research-pool-results">
            {(pool.results || []).length ? (pool.results || []).map((item, index) => <a className={item.used ? 'is-used' : ''} href={item.sourceUrl || pool.sourceUrl || '#'} key={(item.sourceUrl || item.title || topic) + '-' + index} rel="noreferrer" target="_blank">
              <span>{item.used ? 'USED' : 'READY'}</span>{item.title || 'Untitled result'}
            </a>) : <small>No results are currently cached for this topic.</small>}
          </div>
        </details>)}
      </div> : <p className="bf-research-pool-empty">No refreshed pools yet. Press REFRESH ALL RESEARCH or add a custom topic.</p>}
    </section>
  );
}

function isPlayableEpisode(episode: ProductionEpisode) {
  return episode.state === 'ready-for-review' || episode.state === 'published';
}

const EPISODE_DURATION_PRESETS: Array<{ value: GenerationDurationPreset; label: string }> = [
  { value: 'short', label: 'SHORT / 1 MINUTE' },
  { value: 'medium', label: 'MEDIUM / 5 MINUTES' },
  { value: 'long', label: 'LONG / 15 MINUTES' },
];
const GENERATION_WHO_OPTIONS: Array<{ value: GenerationWho; label: string }> = [
  { value: 'cast', label: 'THE FULL CAST' },
  { value: 'orange', label: 'ORANGE IDIOT ONLY' },
  { value: 'random', label: 'RANDOM / CAST OR ORANGE' },
];
const EPISODE_MUSIC_OPTIONS: Array<{ value: EpisodeMusicMode; label: string }> = [
  { value: 'auto', label: 'AUTO / MUSIC ON SOME EPISODES' },
  { value: 'none', label: 'OPENING THEME ONLY' },
  { value: 'bed', label: 'OPENING + MUSIC BED' },
];

const GENERATION_WHEN_OPTIONS: Array<{ value: GenerationWhen; label: string }> = [
  { value: 'now', label: 'NOW' },
  { value: 'random', label: 'RANDOMIZED SEED' },
];
const ORANGE_SPEECH_DURATION_OPTIONS = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300];

const DEFAULT_SEED = 20260828;

function SpriteLoop({
  character,
  preference = 'idle',
  className = '',
}: {
  character: FactoryCharacter;
  preference?: 'idle' | 'movement' | 'walk' | 'reaction';
  className?: string;
}) {
  const clip = pickCharacterClip(character, preference);
  const [frameIndex, setFrameIndex] = useState(0);
  const frames = preference === 'idle' ? (clip?.frames?.length ? [clip.frames[0]] : []) : (clip?.frames || []);

  useEffect(() => {
    if (frames.length <= 1) return undefined;
    const fps = Math.max(1, character.playback.fps || 12);
    const timer = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % frames.length);
    }, 1000 / fps);
    return () => window.clearInterval(timer);
  }, [character.id, character.playback.fps, clip?.id, frames.length]);

  const frame = frames[frameIndex % (frames.length || 1)] || character.rotations.south;
  if (!frame) return <div className={`bf-sprite bf-sprite-empty ${className}`}>SPRITE MISSING</div>;

  return (
    <div className={`bf-sprite ${className}`} style={{ '--bf-tone': character.tone } as CSSProperties}>
      <img src={frame.file} alt={`${character.displayName} animated 16-bit sprite`} />
      <span className="bf-sprite-frame" aria-hidden="true">
        {String(frameIndex + 1).padStart(2, '0')}/{String(frames.length || 1).padStart(2, '0')}
      </span>
    </div>
  );
}

function drawCanvasBackground(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  ctx.fillStyle = '#0b1715';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#10221e';
  ctx.fillRect(0, 38, width, height - 38);
  ctx.strokeStyle = '#315148';
  ctx.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 38);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 54; y <= height; y += 22) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.fillStyle = accent;
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, 37, width, 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#17312a';
  ctx.fillRect(16, 76, 78, 54);
  ctx.fillRect(282, 70, 80, 60);
  ctx.fillStyle = '#315148';
  ctx.fillRect(0, 177, width, 3);
  ctx.fillStyle = '#07110f';
  ctx.fillRect(0, 193, width, 23);
  ctx.fillStyle = '#8da495';
  ctx.font = 'bold 8px monospace';
  ctx.fillText('BULLSHIT FACTORY / LIVE COMPOSITOR', 10, 16);
}

function browserFrameGeometry(characterId: string, frame: { width?: number; height?: number; }) {
  const canonical = getCharacterGeometry(characterId);
  const width = Number(frame.width || canonical.sourceSize.width);
  const height = Number(frame.height || canonical.sourceSize.height);
  const offsetX = Math.round((width - canonical.sourceSize.width) / 2);
  const offsetY = Math.round((height - canonical.sourceSize.height) / 2);
  return {
    width,
    height,
    alphaBounds: {
      left: canonical.alphaBounds.left + offsetX,
      top: canonical.alphaBounds.top + offsetY,
      right: canonical.alphaBounds.right + offsetX,
      bottom: canonical.alphaBounds.bottom + offsetY,
    },
  };
}

function shiftBrowserPlacement(placement: BrowserPlacement, feet: { x: number; y: number; }) {
  const deltaX = feet.x - placement.feet.x;
  const deltaY = feet.y - placement.feet.y;
  return {
    ...placement,
    feet,
    depth: feet.y,
    sprite: { ...placement.sprite, left: Math.round(placement.sprite.left + deltaX), top: Math.round(placement.sprite.top + deltaY) },
    contactShadow: { ...placement.contactShadow, x: Math.round(placement.contactShadow.x + deltaX), y: Math.round(placement.contactShadow.y + deltaY) },
  };
}

function PixelCompositor({
  sceneId,
  activeCharacterId,
}: {
  sceneId: string;
  activeCharacterId: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scene = factoryScenes.find((candidate) => candidate.id === sceneId) || factoryScenes[0];
  const actorIds = useMemo(
    () => [...new Set([...scene.castIds, activeCharacterId])].slice(0, 5),
    [activeCharacterId, scene.castIds],
  );
  const actorKey = actorIds.join('|');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext('2d');
    if (!context) return undefined;
    context.imageSmoothingEnabled = false;

    const background = new Image();
    background.decoding = 'async';
    background.src = scene.background;
    const actors = actorIds
      .map((id) => factoryCastById.get(id))
      .filter((character): character is FactoryCharacter => Boolean(character))
      .map((character) => {
        const clip = pickCharacterClip(character, 'idle');
        const images = (clip?.frames || []).map((frame) => {
          const image = new Image();
          image.decoding = 'async';
          image.src = frame.file;
          return image;
        });
        return { character, clip, images };
      });
    const layout = buildSceneLayout(scene.id, actorIds);
    let animationFrame = 0;

    const render = () => {
      if (background.complete && background.naturalWidth > 0) {
        context.drawImage(background, 0, 0, canvas.width, canvas.height);
      } else {
        drawCanvasBackground(context, canvas.width, canvas.height, scene.accent);
      }

      context.fillStyle = 'rgb(7 17 15 / 68%)';
      context.fillRect(0, 0, canvas.width, 38);
      context.fillStyle = '#dbe4c2';
      context.font = 'bold 8px monospace';
      context.fillText(scene.label.toUpperCase(), 10, 16);
      context.fillStyle = '#6fc1a2';
      context.fillText('● ON AIR', 306, 16);

      const renderedActors = actors.map(({ character, clip, images }, index) => {
        const layoutPlacement = layout.placements.find((candidate) => candidate.characterId === character.id) || layout.placements[index % layout.placements.length];
        const sourceFrame = clip?.frames?.[0] || character.rotations.south;
        const sourceGeometry = browserFrameGeometry(character.id, sourceFrame || {});
        const placementBase = resolveScenePlacement({
          sceneId: scene.id,
          characterId: character.id,
          walkBand: layoutPlacement?.walkBand || 'middle',
          x: layoutPlacement?.intent?.x ?? ((index + 1) / (actors.length + 1)),
          frameGeometry: sourceGeometry,
        });
        const placement = shiftBrowserPlacement(placementBase, placementBase.feet);
        // The factory-floor fallback is a monitoring still, not a live walk cycle.
        // Finished episodes own motion; this view only shows one grounded idle pose
        // per actor so the dashboard never suggests that the cast is walking in place.
        const frame = images[0];
        return { character, clip, frame, placement, index };
      }).sort((a, b) => a.placement.depth - b.placement.depth);

      renderedActors.forEach(({ character, frame, placement }) => {
        const width = placement.sprite.width;
        const height = placement.sprite.height;
        const x = placement.sprite.left;
        const y = placement.sprite.top;
        context.fillStyle = 'rgb(0 0 0 / 46%)';
        context.fillRect(Math.round(placement.contactShadow.x - placement.contactShadow.width / 2), Math.round(placement.contactShadow.y - 1), placement.contactShadow.width, 2);
        if (frame?.complete && frame.naturalWidth > 0) {
          context.drawImage(frame, x, y, width, height);
        } else {
          context.fillStyle = character.tone;
          context.fillRect(x + 14, y + 16, width - 28, height - 18);
          context.fillStyle = '#07110f';
          context.fillRect(x + 18, y + 8, width - 36, 10);
        }

        context.fillStyle = '#dbe4c2';
        context.font = 'bold 7px monospace';
        const label = character.isDog ? 'BORK' : character.displayName.toUpperCase();
        context.fillText(label.slice(0, 12), Math.max(3, x), Math.max(42, Math.min(190, placement.sprite.top - 4)));
        if (frame && frame.naturalWidth > 0) {
          context.fillStyle = '#6fc1a2';
          context.fillRect(Math.max(3, x), Math.max(43, Math.min(193, placement.feet.y + 2)), Math.min(width, 46), 2);
        }
      });

      context.fillStyle = '#8da495';
      context.font = '7px monospace';
      context.fillText(scene.cue.toUpperCase().slice(0, 62), 10, 208);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      background.src = '';
      actors.forEach(({ images }) => images.forEach((image) => { image.src = ''; }));
    };
  }, [activeCharacterId, actorIds, actorKey, scene.accent, scene.background, scene.cue, scene.id, scene.label]);

  return (
    <canvas
      ref={canvasRef}
      className="bf-compositor-canvas"
      width={384}
      height={216}
      role="img"
      aria-label={`${scene.label} idle 16-bit factory preview`}
    />
  );
}

function GateStatus({ status }: { status: string }) {
  const label = status === 'ready' ? 'READY' : status === 'blocked' ? 'BLOCKED' : 'REVIEW';
  return <span className={`bf-gate-status bf-gate-status-${status}`}>{label}</span>;
}

export default function BullshitFactoryDashboard() {
  const [sceneId, setSceneId] = useState('factory-floor');
  const [characterId, setCharacterId] = useState('rookboss');
  const [duration, setDuration] = useState(30);
  const [session, setSession] = useState<SessionPlan>(() => assembleSession(30, DEFAULT_SEED, {
    sceneId: 'factory-floor',
    characterId: 'rookboss',
    castIds: factoryCast.map((character) => character.id),
  }));
  const [gates, setGates] = useState<QualityResult>(() => evaluateSessionQuality(session, { catalog: factoryCatalog }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('On-demand production ready. Choose a cut, or publish one directly to the website playlist.');
  const [musicStatus, setMusicStatus] = useState<MusicBackendStatus | null>(null);
  const [musicJobId, setMusicJobId] = useState<string | null>(null);
  const [musicJob, setMusicJob] = useState<MusicJobStatus | null>(null);
  const [musicBusy, setMusicBusy] = useState(false);
  const [generationPreset, setGenerationPreset] = useState<GenerationDurationPreset>('medium');
  const [generationWho, setGenerationWho] = useState<GenerationWho>('cast');
  const [generationWhen, setGenerationWhen] = useState<GenerationWhen>('now');
  const [generationWhere, setGenerationWhere] = useState('auto');
  const [episodeMusicMode, setEpisodeMusicMode] = useState<EpisodeMusicMode>('auto');
  const [orangeIdiotSpeech, setOrangeIdiotSpeech] = useState('');
  const [orangeTitle, setOrangeTitle] = useState('');
  const [orangeSpeechDuration, setOrangeSpeechDuration] = useState(0);
  const [customResearchTopic, setCustomResearchTopic] = useState('');
  const [liveYoutubeEnabled, setLiveYoutubeEnabled] = useState(false);
  const [liveYoutubeIngest, setLiveYoutubeIngest] = useState('rtmp://a.rtmp.youtube.com/live2');
  const [liveYoutubeKey, setLiveYoutubeKey] = useState('');
  const [liveYoutubeBroadcastId, setLiveYoutubeBroadcastId] = useState('');
  const [liveYoutubeChatId, setLiveYoutubeChatId] = useState('');
  const [liveTiktokEnabled, setLiveTiktokEnabled] = useState(false);
  const [liveTiktokIngest, setLiveTiktokIngest] = useState('rtmp://push-rtmp.tiktokv.com/live/');
  const [liveTiktokKey, setLiveTiktokKey] = useState('');
  const [liveTiktokProfileUrl, setLiveTiktokProfileUrl] = useState('');
  const [liveTiktokRoomId, setLiveTiktokRoomId] = useState('');
  const [productionStatus, setProductionStatus] = useState<ProductionSnapshot | null>(null);
  const [productionJob, setProductionJob] = useState<ProductionJob | null>(null);
  const [episodes, setEpisodes] = useState<ProductionEpisode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const [productionBusy, setProductionBusy] = useState(false);
  const liveSetupHydratedRef = useRef(false);

  const scene = factoryScenes.find((candidate) => candidate.id === sceneId) || factoryScenes[0];
  const character = factoryCastById.get(characterId) || factoryCast[0];
  const activeBlockIndex = 0;
  const activeBlock = session.blocks[activeBlockIndex] || session.blocks[0];
  const liveScene = factoryScenes.find((candidate) => candidate.id === activeBlock?.sceneId) || scene;
  const liveCharacterId = activeBlock?.castIds.includes(character.id)
    ? character.id
    : activeBlock?.castIds[0] || character.id;
  const orangeResearch = productionStatus?.orangeIdiot?.research;
  const researchPools = productionStatus?.researchPools;
  const orangeTopicPools = researchPools?.orange?.topicPools || orangeResearch?.topicPools || {};
  const castTopicPools = researchPools?.cast?.topicPools || {};
  const whiteHouseReferences = researchPools?.whiteHouse?.references || orangeResearch?.speeches || [];
  const customResearchTopics = orangeResearch?.customTopics || productionStatus?.orangeIdiot?.customResearchTopics || [];

  useEffect(() => {
    let cancelled = false;
    const loadMusicStatus = async () => {
      try {
        const response = await fetch('/api/bullshit-factory/music', { cache: 'no-store' });
        const payload = await response.json() as MusicBackendStatus;
        if (!cancelled) setMusicStatus(payload);
      } catch {
        if (!cancelled) setMusicStatus({ status: 'unavailable', provider: 'stable-audio-3-small-music', endpoint: 'loopback-only' });
      }
    };
    void loadMusicStatus();
    const timer = window.setInterval(() => void loadMusicStatus(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!musicJobId) return undefined;
    let cancelled = false;
    let timer: number | undefined;
    const pollJob = async () => {
      try {
        const response = await fetch(`/api/bullshit-factory/music?jobId=${encodeURIComponent(musicJobId)}`, { cache: 'no-store' });
        const payload = await response.json() as MusicJobStatus;
        if (cancelled) return;
        setMusicJob(payload);
        if (payload.status === 'completed' || payload.status === 'failed') {
          setMusicBusy(false);
          return;
        }
      } catch {
        if (!cancelled) setMusicJob((current) => current ? { ...current, error: 'Waiting for the music adapter…' } : current);
      }
      if (!cancelled) timer = window.setTimeout(() => void pollJob(), 2500);
    };
    void pollJob();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [musicJobId]);

  useEffect(() => {
    let cancelled = false;
    const loadProduction = async () => {
      try {
        const [statusResponse, jobsResponse, episodesResponse] = await Promise.all([
          fetch('/api/bullshit-factory/production?view=status', { cache: 'no-store' }),
          fetch('/api/bullshit-factory/production?view=jobs', { cache: 'no-store' }),
          fetch('/api/bullshit-factory/production?view=episodes', { cache: 'no-store' }),
        ]);
        const statusPayload = await statusResponse.json() as ProductionSnapshot;
        const jobsPayload = await jobsResponse.json() as { jobs?: ProductionJob[] };
        const episodesPayload = await episodesResponse.json() as { episodes?: ProductionEpisode[] };
        if (cancelled) return;
        setProductionStatus(statusResponse.ok ? statusPayload : { status: 'unavailable', error: statusPayload.error || 'Production service unavailable.' });
        if (statusResponse.ok && statusPayload.live && !liveSetupHydratedRef.current) {
          liveSetupHydratedRef.current = true;
          const live = statusPayload.live;
          setLiveYoutubeEnabled(live.youtube?.enabled === true);
          setLiveYoutubeIngest(live.youtube?.ingestUrl || 'rtmp://a.rtmp.youtube.com/live2');
          setLiveYoutubeBroadcastId(live.youtube?.broadcastId || '');
          setLiveYoutubeChatId(live.youtube?.chatId || '');
          setLiveTiktokEnabled(live.tiktok?.enabled === true);
          setLiveTiktokIngest(live.tiktok?.ingestUrl || 'rtmp://push-rtmp.tiktokv.com/live/');
          setLiveTiktokProfileUrl(live.tiktok?.profileUrl || '');
          setLiveTiktokRoomId(live.tiktok?.roomId || '');
        }
        const jobs = Array.isArray(jobsPayload.jobs) ? jobsPayload.jobs : [];
        setProductionJob(jobs.find((job) => job.status === 'running' || job.status === 'queued') || jobs[0] || null);
        const nextEpisodes = Array.isArray(episodesPayload.episodes) ? episodesPayload.episodes : [];
        setEpisodes(nextEpisodes);
        setSelectedEpisodeId((current) => current && nextEpisodes.some((episode) => episode.id === current && isPlayableEpisode(episode))
          ? current
          : nextEpisodes.find(isPlayableEpisode)?.id || null);
      } catch (error) {
        if (!cancelled) setProductionStatus({ status: 'unavailable', error: error instanceof Error ? error.message : 'Production service unavailable.' });
      }
    };
    void loadProduction();
    const timer = window.setInterval(() => void loadProduction(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  async function assemble() {
    setBusy(true);
    setMessage('Assembling validated short blocks…');
    try {
      const response = await fetch('/api/bullshit-factory/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          duration,
          seed: DEFAULT_SEED + duration,
          sceneId,
          characterId,
        }),
      });
      if (!response.ok) throw new Error('The session API did not respond with a valid plan.');
      const payload = await response.json() as { plan?: SessionPlan; gates?: QualityResult };
      if (!payload.plan || !payload.gates) throw new Error('The session API returned an incomplete plan.');
      setSession(payload.plan);
      setGates(payload.gates);
      setMessage(`${payload.plan.formattedDuration} locked: ${payload.plan.blockCount} short blocks, exact duration, no mystery filler.`);
    } catch (error) {
      const fallback = assembleSession(duration, DEFAULT_SEED + duration, {
        sceneId,
        characterId,
        castIds: factoryCast.map((candidate) => candidate.id),
      });
      setSession(fallback);
      setGates(evaluateSessionQuality(fallback, { catalog: factoryCatalog }));
      setMessage(`${error instanceof Error ? error.message : 'API unavailable.'} Local deterministic plan loaded instead.`);
    } finally {
      setBusy(false);
    }
  }

  function episodeGenerationPayload() {
    const manualSpeech = orangeIdiotSpeech.trim();
    return {
      durationPreset: generationPreset,
      generationWho,
      generationWhen,
      generationWhere,
      musicMode: episodeMusicMode,
      ...(generationWho === 'orange' && manualSpeech ? { orangeIdiotSpeechText: manualSpeech } : {}),
      ...(generationWho === 'orange' && orangeTitle.trim() ? { title: orangeTitle.trim() } : {}),
      ...(generationWho === 'orange' && orangeSpeechDuration > 0 ? { orangeIdiotSpeechDurationSeconds: orangeSpeechDuration } : {}),
    };
  }

  async function productionAction(action: string, payload: Record<string, unknown> = {}): Promise<boolean> {
    setProductionBusy(true);
    try {
      const response = await fetch('/api/bullshit-factory/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const result = await response.json() as ProductionSnapshot & LiveStreamStatus & { job?: ProductionJob; jobs?: ProductionJob[] };
      if (!response.ok) throw new Error(result.error || 'The production controller rejected the request.');
      if (result.control || result.status || result.continuousGeneration || result.playlist || result.orangeIdiot) setProductionStatus((current) => ({ ...current, ...result }));
      const liveResult = result.live || (result.youtube ? {
        mode: result.mode,
        canGoLive: result.canGoLive,
        message: result.message,
        youtube: result.youtube,
        tiktok: result.tiktok,
        playlist: result.playlist,
        startedAt: result.startedAt,
        lastError: result.lastError,
      } : null);
      if (liveResult) {
        setProductionStatus((current) => ({ ...current, live: liveResult }));
        if (action === 'save-live-setup') {
          liveSetupHydratedRef.current = true;
          setLiveYoutubeEnabled(liveResult.youtube?.enabled === true);
          setLiveYoutubeIngest(liveResult.youtube?.ingestUrl || liveYoutubeIngest);
          setLiveYoutubeBroadcastId(liveResult.youtube?.broadcastId || '');
          setLiveYoutubeChatId(liveResult.youtube?.chatId || '');
          setLiveTiktokEnabled(liveResult.tiktok?.enabled === true);
          setLiveTiktokIngest(liveResult.tiktok?.ingestUrl || liveTiktokIngest);
          setLiveTiktokProfileUrl(liveResult.tiktok?.profileUrl || '');
          setLiveTiktokRoomId(liveResult.tiktok?.roomId || '');
        }
      }
      if (result.job) setProductionJob(result.job);
      if (Array.isArray(result.jobs) && result.jobs.length) setProductionJob(result.jobs[0]);
      setMessage(action === 'generate-episode' || action === 'generate-orange-episode'
        ? 'Episode generation queued for review. Publish it separately when the cut is approved.'
        : action === 'generate-continuous'
          ? 'Continuous generation started. It starts/resumes the website playlist, publishes validated episodes, and runs until you press STOP CONTINUOUS. It does not start a social stream.'
          : action === 'remove-playlist-item'
          ? 'Upcoming playlist item removed. The preserved queue is still available for review.'
          : action === 'stop-continuous-generation'
            ? 'Continuous generation stopped. Existing playlist and published episodes were preserved.'
            : action === 'stop-playback'
              ? 'Website playback stopped. The continuous playlist was preserved and can be resumed.'
              : action === 'stop-continuous'
                ? 'Generation and playback stopped. The playlist and published episodes were preserved.'
                : action === 'save-live-setup'
            ? 'YouTube/TikTok setup saved on the production host. Stream keys remain masked.'
            : action === 'start-live'
              ? 'Go Live started. The encoder is sending the published website playlist.'
              : action === 'stop-live'
                ? 'Live encoder stopped. Published episodes remain available on the main website.'
                : action === 'refresh-orange-sources'
                  ? 'Orange, cast, and custom research pools refreshed; White House remarks source unchanged.'
                  : action === 'add-research-topic'
                    ? 'Custom search topic added and loaded for Orange and the cast.'
                    : action === 'remove-research-topic'
                      ? 'Custom search topic removed from Orange and cast research.'
                      : 'Production action accepted.');
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Production controller unavailable.');
      return false;
    } finally {
      setProductionBusy(false);
    }
  }

  async function addResearchTopic() {
    const topic = customResearchTopic.trim();
    if (!topic) {
      setMessage('Enter a search topic first.');
      return false;
    }
    const saved = await productionAction('add-research-topic', { topic });
    if (saved) setCustomResearchTopic('');
    return saved;
  }

  async function removeResearchTopic(topic: string) {
    await productionAction('remove-research-topic', { topic });
  }

  async function saveLiveSetup() {
    await productionAction('save-live-setup', {
      youtube: {
        enabled: liveYoutubeEnabled,
        ingestUrl: liveYoutubeIngest.trim(),
        streamKey: liveYoutubeKey.trim(),
        broadcastId: liveYoutubeBroadcastId.trim(),
        chatId: liveYoutubeChatId.trim(),
      },
      tiktok: {
        enabled: liveTiktokEnabled,
        ingestUrl: liveTiktokIngest.trim(),
        streamKey: liveTiktokKey.trim(),
        profileUrl: liveTiktokProfileUrl.trim(),
        roomId: liveTiktokRoomId.trim(),
      },
    });
    setLiveYoutubeKey('');
    setLiveTiktokKey('');
  }

  async function episodeAction(action: 'publish-episode' | 'queue-episode' | 'delete-episode', episodeId: string) {
    setProductionBusy(true);
    try {
      const response = await fetch('/api/bullshit-factory/production', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, episodeId }),
      });
      const result = await response.json() as { episode?: ProductionEpisode; error?: string };
      if (!response.ok) throw new Error(result.error || 'Episode action was rejected.');
      if (action === 'delete-episode') {
        setEpisodes((current) => current.filter((episode) => episode.id !== episodeId));
        setSelectedEpisodeId((current) => current === episodeId ? null : current);
      } else if (result.episode) {
        setEpisodes((current) => current.map((episode) => episode.id === result.episode?.id ? { ...episode, ...result.episode } : episode));
      }
      setMessage(action === 'publish-episode'
        ? 'Episode published to the approved library. Continuous mode may use it at the next queue refill.'
        : action === 'queue-episode'
          ? 'Published episode added to the continuous queue.'
          : 'Episode package deleted from the review library.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Episode action failed.');
    } finally {
      setProductionBusy(false);
    }
  }

  async function removePlaylistItem(index: number) {
    await productionAction('remove-playlist-item', { index });
  }

  async function queueMusicBed() {
    setMusicBusy(true);
    setMusicJob(null);
    setMusicJobId(null);
    try {
      const response = await fetch('/api/bullshit-factory/music', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind: 'bed',
          mood: activeBlock?.musicTrackId || 'dusty 16-bit garage rock',
          prompt: `Original instrumental music bed for ${activeBlock?.title || 'a Bullshit Factory segment'} in the ${liveScene.label}; muted early-2000s 16-bit rock cartoon energy, no vocals.`,
          durationSeconds: 30,
          seed: DEFAULT_SEED + (activeBlock?.index || 0),
        }),
      });
      const payload = await response.json() as MusicJobStatus;
      if (!response.ok || !payload.jobId) throw new Error(payload.error || 'The music adapter rejected the job.');
      setMusicJob(payload);
      setMusicJobId(payload.jobId);
    } catch (error) {
      setMusicBusy(false);
      setMusicJob({ status: 'failed', error: error instanceof Error ? error.message : 'Music adapter unavailable.' });
    }
  }

  const visibleBlockCount = Math.min(8, session.blocks.length);
  const visibleBlockStart = session.blocks.length <= visibleBlockCount
    ? 0
    : Math.min(Math.max(0, activeBlockIndex - 2), session.blocks.length - visibleBlockCount);
  const visibleBlocks = session.blocks.slice(visibleBlockStart, visibleBlockStart + visibleBlockCount);
  const hiddenBeforeCount = visibleBlockStart;
  const hiddenAfterCount = Math.max(0, session.blocks.length - visibleBlockStart - visibleBlocks.length);
  const productionPlaylist = productionStatus?.playlist || null;
  const productionQueue = productionPlaylist?.items || productionStatus?.session?.queue || [];
  const productionIndex = Number.isFinite(Number(productionPlaylist?.currentIndex)) ? Number(productionPlaylist?.currentIndex) : (productionStatus?.control?.currentIndex || 0);
  const productionCurrent = productionPlaylist?.current || productionQueue[productionIndex];
  const productionNext = productionPlaylist?.next || productionQueue[productionIndex + 1];
  const productionControlState = productionStatus?.control?.status || productionStatus?.status || 'offline';
  const productionHasSession = Boolean(productionStatus?.session || productionPlaylist?.hasPlaylist);
  const continuousGenerationStatus = productionStatus?.continuousGeneration?.status || 'idle';
  const continuousGenerationActive = continuousGenerationStatus === 'running' || continuousGenerationStatus === 'stopping';
  const productionHasContinuousWork = productionPlaylist?.hasPlaylist === true
    || productionStatus?.session?.mode === 'continuous'
    || continuousGenerationActive
    || Boolean(productionJob && (productionJob.label === 'continuous-episode' || productionJob.label === 'continuous-refill')
      && (productionJob.status === 'queued' || productionJob.status === 'running'));
  const productionFeedPaused = productionControlState === 'paused';
  const productionLatestLog = productionStatus?.logs?.at(-1);
  const productionLogs = [...(productionStatus?.logs || [])].reverse();
  const playableEpisodes = episodes.filter(isPlayableEpisode);
  const selectedEpisode = playableEpisodes.find((episode) => episode.id === selectedEpisodeId) || playableEpisodes[0] || null;
  const episodeVideoUrl = selectedEpisode ? `/api/bullshit-factory/production?view=episode-video&id=${encodeURIComponent(selectedEpisode.id)}` : '';
  const episodePosterUrl = selectedEpisode ? `/api/bullshit-factory/production?view=episode-poster&id=${encodeURIComponent(selectedEpisode.id)}` : '';

  return (
    <main className="bf-dashboard">
      <div className="bf-shell">
        <header className="bf-header">
          <div>
            <p className="bf-kicker">16-BIT CONTINUOUS NONSENSE NETWORK</p>
            <h1>BULLSHIT FACTORY</h1>
            <p className="bf-subtitle">A low-resolution workplace comedy with no responsible department.</p>
          </div>
          <div className="bf-header-status" aria-label="Factory status">
            <span className="bf-live-dot" />
            <strong>LIVE PREVIEW</strong>
            <small>10 CAST / 64 COLORS / 12 FPS</small>
          </div>
        </header>

        <section className="bf-hero-copy">
          <div>
            <p className="bf-eyebrow">FINAL BUILD / VISUAL CONTROL ROOM</p>
            <h2>Every shift is a <em>bad idea</em> with a soundtrack.</h2>
          </div>
          <p>Pick the room, put someone on camera, and assemble a continuous run from five-minute blocks. The compositor keeps the motion readable and cheap enough to run all day.</p>
        </section>

        <section className="bf-control-panel" aria-label="Factory controls">
          <label className="bf-field">
            <span>SCENE</span>
            <select value={sceneId} onChange={(event) => setSceneId(event.target.value)}>
              {factoryScenes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
            </select>
          </label>
          <label className="bf-field">
            <span>ON-CAMERA ACTOR</span>
            <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
              {factoryCast.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.displayName}{candidate.isDog ? ' / BARK ONLY' : ''}</option>)}
            </select>
          </label>
          <label className="bf-field">
            <span>SESSION LENGTH</span>
            <select value={duration} onChange={(event) => setDuration(Number(event.target.value))}>
              {sessionDurationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button className="bf-button bf-button-primary" disabled={busy} onClick={() => void assemble()} type="button">
            {busy ? 'ASSEMBLING…' : 'ASSEMBLE SESSION'}
          </button>
        </section>
        <p className="bf-control-message" role="status">{message}</p>

        <section className="bf-production-panel" aria-label="Bullshit Factory production controls">
          <div className="bf-production-heading">
            <div>
              <span className="bf-eyebrow">PRODUCTION CONTROLLER / GOBLIN DIRECTOR</span>
              <h2>Make one episode or leave the factory open.</h2>
              <p>Generation is serialized and expensive workers wake only when the ready queue needs them. Playback stays on validated media or the approved fallback loop.</p>
            </div>
            <div className={`bf-production-state bf-production-state-${productionControlState}`}>
              <span className="bf-live-dot" />
              <strong>{productionControlState.replaceAll('-', ' ').toUpperCase()}</strong>
               <small>{productionStatus?.writer?.model || productionStatus?.director?.model || 'local fallback'} → {productionStatus?.animation?.model || productionStatus?.animation?.runtimeRenderer || 'deterministic compositor'}</small>
            </div>
          </div>
          <div className="bf-generation-panel">
            <div className="bf-generation-heading">
              <div>
                <span className="bf-eyebrow">ON-DEMAND GENERATOR / GOBLIN WRITER + DIRECTOR</span>
                <h3>Make a review cut or send one straight to the website playlist.</h3>
                <p>Choose who, when, where, and a simple length. Every option is optional; cast scripts use fresh topic research, while Orange Idiot remains a standalone south-facing broadcast.</p>
              </div>
              <span className="bf-generation-status">ON-DEMAND ONLY / NO SCHEDULER</span>
            </div>
            <div className="bf-generation-grid">
              <label className="bf-field">
                <span>WHO</span>
                <select value={generationWho} onChange={(event) => setGenerationWho(event.target.value as GenerationWho)}>
                  {GENERATION_WHO_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="bf-field">
                <span>WHEN</span>
                <select value={generationWhen} onChange={(event) => setGenerationWhen(event.target.value as GenerationWhen)}>
                  {GENERATION_WHEN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="bf-field">
                <span>WHERE</span>
                <select value={generationWhere} onChange={(event) => setGenerationWhere(event.target.value)}>
                  <option value="auto">AUTO / WRITER CHOOSES</option>
                  {factoryScenes.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}
                </select>
              </label>
              <label className="bf-field">
                <span>LENGTH</span>
                <select value={generationPreset} onChange={(event) => setGenerationPreset(event.target.value as GenerationDurationPreset)}>
                  {EPISODE_DURATION_PRESETS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="bf-field">
                <span>MUSIC</span>
                <select value={episodeMusicMode} onChange={(event) => setEpisodeMusicMode(event.target.value as EpisodeMusicMode)}>
                  {EPISODE_MUSIC_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="bf-field">
                <span>ORANGE TITLE / OPTIONAL</span>
                <input value={orangeTitle} onChange={(event) => setOrangeTitle(event.target.value)} placeholder="The Orange Bulletin" type="text" />
              </label>
              <label className="bf-field">
                <span>ORANGE SPEECH LENGTH</span>
                <select value={orangeSpeechDuration} onChange={(event) => setOrangeSpeechDuration(Number(event.target.value))}>
                  {ORANGE_SPEECH_DURATION_OPTIONS.map((seconds) => <option key={seconds} value={seconds}>{seconds === 0 ? 'AUTO / FILL AVAILABLE' : String(seconds) + ' SEC'}</option>)}
                </select>
              </label>
              <label className="bf-field bf-generation-wide">
                <span>MANUAL WORDS / OPTIONAL ORANGE SPEECH</span>
                <textarea
                  value={orangeIdiotSpeech}
                  onChange={(event) => setOrangeIdiotSpeech(event.target.value)}
                  placeholder={generationWho === 'orange' ? 'Type exact words, or leave blank for three fresh headline topics.' : 'Leave blank for a fresh cast script built from current topic notes.'}
                  rows={3}
                />
                <small>{generationWho === 'orange' ? 'Orange Idiot uses the south sprite and standalone house scene. Manual text is preserved.' : 'The writer selects varied real-world topics and turns them into original sitcom dialogue.'} The opening is 3 seconds and the ending is measured from the final vocal event.</small>
              </label>
            </div>
            <div className="bf-generation-actions">
              <button className="bf-button bf-button-primary" disabled={productionBusy} onClick={() => void productionAction('generate-episode', episodeGenerationPayload())} type="button">
                {productionBusy ? 'QUEUING...' : 'GENERATE EPISODE / REVIEW'}
              </button>
              <button className="bf-button bf-button-primary" disabled={productionBusy || continuousGenerationActive} onClick={() => void productionAction('generate-continuous', episodeGenerationPayload())} type="button">
                {continuousGenerationActive ? 'CONTINUOUS GENERATION RUNNING...' : productionBusy ? 'QUEUING...' : 'START CONTINUOUS GENERATE / WEBSITE PLAYLIST'}
              </button>
              <button className="bf-button" disabled={productionBusy} onClick={() => void productionAction('refresh-orange-sources')} type="button">REFRESH ALL RESEARCH</button>
              <span className="bf-generation-note">The website button publishes the finished, validated episode to the public playlist/player. It does not start a social stream.</span>
            </div>
            <div className="bf-orange-research">
              <div>
                <span className="bf-eyebrow">WRITER RESEARCH CACHE</span>
                <strong>{orangeResearch?.fetchedAt ? 'UPDATED ' + new Date(orangeResearch.fetchedAt).toLocaleString() : 'NO CACHE'}</strong>
              </div>
              <div className="bf-orange-research-topic-editor">
                <label className="bf-field">
                  <span>CUSTOM SEARCH TOPIC / ALL WRITERS</span>
                  <input
                    aria-label="Custom search topic for all writers"
                    value={customResearchTopic}
                    onChange={(event) => setCustomResearchTopic(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void addResearchTopic();
                      }
                    }}
                    placeholder="e.g. broken elevators in space"
                    type="text"
                  />
                </label>
                <button className="bf-button" disabled={productionBusy || !customResearchTopic.trim()} onClick={() => void addResearchTopic()} type="button">ADD TOPIC</button>
              </div>
              <small className="bf-research-topic-meta">
                {Object.keys(orangeResearch?.topicPools || {}).length} TOPIC POOLS / 10 RESULTS EACH. Pools are consumed once, then refreshed before reuse.
              </small>
              {!!customResearchTopics.length && <div className="bf-research-topic-list">
                <span className="bf-research-topic-list-label">ACTIVE CUSTOM TOPICS</span>
                {customResearchTopics.map((topic) => <span className="bf-research-topic-chip" key={topic}>
                  {topic}
                  <button aria-label={'Remove ' + topic} className="bf-research-topic-remove" disabled={productionBusy} onClick={() => void removeResearchTopic(topic)} type="button">�</button>
                </span>)}
              </div>}
              <section className="bf-research-whitehouse" aria-label="White House remarks topics">
                <div className="bf-research-pool-heading">
                  <span>WHITE HOUSE REMARKS / REFERENCE TOPICS</span>
                  <small>{whiteHouseReferences.length} REFERENCES / PRESERVED SOURCE</small>
                </div>
                {whiteHouseReferences.length ? <div className="bf-research-whitehouse-list">
                  {whiteHouseReferences.slice(0, 12).map((item, index) => <a href={item.sourceUrl || '#'} key={(item.sourceUrl || item.title || 'white-house-reference') + '-' + index} rel="noreferrer" target="_blank">
                    <strong>{item.topic ? '[' + item.topic.toUpperCase() + '] ' : ''}{item.title || 'Untitled reference'}</strong>
                    {!!item.excerpt && <small>{item.excerpt}</small>}
                  </a>)}
                </div> : <p className="bf-research-pool-empty">No White House reference results are cached yet. The remarks page remains the speech-reference source.</p>}
              </section>
              <ResearchPoolPanel label="ORANGE + CUSTOM SEARCH POOLS" pools={orangeTopicPools} />
              <ResearchPoolPanel label="CAST TOPIC POOLS / SHARED WITH ALL CHARACTERS" pools={castTopicPools} />
              {!!orangeResearch?.errors?.length && <small>{orangeResearch.errors.join(' / ')}</small>}
            </div>
          </div>
          <div className="bf-production-actions">
            <button className="bf-button" disabled={productionBusy || productionControlState === 'running'} onClick={() => void productionAction('start-continuous', { duration: duration || 30 })} type="button">{productionHasSession ? 'RESUME PLAYBACK CONTINUOUS' : 'START PLAYBACK CONTINUOUS'}</button>
            <button className="bf-button" disabled={productionBusy || !productionHasSession || productionControlState === 'restarting'} onClick={() => void productionAction(productionFeedPaused ? 'resume' : 'pause')} type="button">{productionFeedPaused ? 'PLAY / RESUME FEED' : 'PAUSE FEED'}</button>
            <button className="bf-button" disabled={productionBusy || !productionHasSession || productionControlState === 'restarting'} onClick={() => void productionAction('restart')} type="button">RESTART PLAYBACK</button>
            <button className="bf-button bf-button-danger" disabled={productionBusy || !productionHasSession} onClick={() => void productionAction('stop-playback')} type="button">STOP PLAYBACK / KEEP QUEUE</button>
            <button className="bf-button bf-button-danger" disabled={productionBusy || !continuousGenerationActive && !Boolean(productionStatus?.continuousGeneration?.activeJobId)} onClick={() => void productionAction('stop-continuous-generation')} type="button">STOP GENERATION / KEEP PLAYBACK</button>
            <button className="bf-button bf-button-danger" disabled={productionBusy || !productionHasContinuousWork} onClick={() => void productionAction('stop-continuous')} type="button">
              {continuousGenerationStatus === 'stopping' ? 'STOPPING BOTH...' : 'STOP GENERATION + PLAYBACK'}
            </button>
            <span className="bf-generation-note">GENERATOR: {continuousGenerationStatus.toUpperCase()} / {productionStatus?.continuousGeneration?.completedCount || 0} EPISODES PUBLISHED. LAST WHO: {(productionStatus?.continuousGeneration?.lastGenerationWho || 'NONE').toUpperCase()}. PLAYLIST: {productionPlaylist?.healthy ? 'HEALTHY' : productionPlaylist?.hasPlaylist ? 'QUEUED / STOPPED' : 'EMPTY'}. Published episodes remain intact.</span>
          </div>
          <section className="bf-playlist-console" aria-label="Continuous website playlist">
            <div className="bf-playlist-console-heading">
              <div>
                <span className="bf-eyebrow">CONTINUOUS WEBSITE PLAYLIST / VERIFY + EDIT</span>
                <h3>{productionPlaylist?.hasPlaylist ? productionPlaylist.itemCount + " queued items" : "No continuous playlist loaded"}</h3>
                <p>{productionPlaylist?.running ? "Playback is advancing through the queue." : productionPlaylist?.hasPlaylist ? "The queue is preserved and can be resumed or edited." : "Start playback continuous or start continuous generation to create the queue."}</p>
              </div>
              <div className={"bf-playlist-health bf-playlist-health-" + (productionPlaylist?.healthy ? "healthy" : productionPlaylist?.hasPlaylist ? "queued" : "empty")}>
                <strong>{productionPlaylist?.healthy ? "HEALTHY" : productionPlaylist?.hasPlaylist ? "QUEUED / STOPPED" : "EMPTY"}</strong>
                <small>{productionPlaylist?.running ? "PLAYING" : "NOT PLAYING"} / {productionPlaylist?.itemCount || 0} ITEMS</small>
              </div>
            </div>
            <div className="bf-playlist-now-next">
              <div><span>NOW</span><strong>{productionPlaylist?.current?.title || "Nothing is playing"}</strong><small>{productionPlaylist?.current?.source || " "}</small></div>
              <div><span>NEXT</span><strong>{productionPlaylist?.next?.title || "No next item"}</strong><small>{productionPlaylist?.next?.source || " "}</small></div>
            </div>
            <div className="bf-playlist-items">
              {(productionPlaylist?.items || []).length ? (productionPlaylist?.items || []).map((item, index) => {
                const itemIndex = Number.isFinite(Number(item.index)) ? Number(item.index) : index;
                const isCurrent = itemIndex === productionPlaylist?.currentIndex;
                const isPast = productionPlaylist?.currentIndex !== null && productionPlaylist?.currentIndex !== undefined && itemIndex < Number(productionPlaylist.currentIndex);
                return <div className={"bf-playlist-item " + (isCurrent ? "is-current" : "")} key={String(item.segmentId || "item") + "-" + itemIndex}>
                  <span className="bf-playlist-item-index">{String(itemIndex + 1).padStart(2, "0")}</span>
                  <div><strong>{item.title || item.segmentId || "Untitled cut"}</strong><small>{item.source || "unknown"} / {item.durationSeconds || 0}s / {item.sceneId || "factory floor"}</small></div>
                  <button className="bf-button bf-button-danger" disabled={productionBusy || isCurrent || isPast} onClick={() => void removePlaylistItem(itemIndex)} type="button">{isPast ? "PLAYED" : isCurrent ? "PLAYING" : "REMOVE"}</button>
                </div>;
              }) : <p className="bf-playlist-empty">No queued items. The public site will still show published episodes, but continuous playback has nothing to advance.</p>}
            </div>
          </section>
          <section className="bf-live-console" aria-label="YouTube and TikTok live setup">
            <div className="bf-live-console-heading">
              <div>
                <span className="bf-eyebrow">LIVE DESTINATIONS / EXPLICIT CONTROL</span>
                <h3>Send the published website playlist to YouTube or TikTok.</h3>
                <p>Save RTMP credentials on .76, then press GO LIVE. Nothing starts automatically, and the Discord helper remains suggestion-only.</p>
              </div>
              <div className={'bf-live-status bf-live-status-' + (productionStatus?.live?.mode || 'offline')}>
                <strong>{(productionStatus?.live?.mode || 'offline').replaceAll('-', ' ').toUpperCase()}</strong>
                <small>{productionStatus?.live?.message || 'Configure a destination, then save the setup.'}</small>
              </div>
            </div>
            <div className="bf-live-platform-grid">
              <fieldset className="bf-live-platform">
                <legend><label className="bf-check-field"><input checked={liveYoutubeEnabled} onChange={(event) => setLiveYoutubeEnabled(event.target.checked)} type="checkbox" /> YOUTUBE</label></legend>
                <label className="bf-field"><span>RTMP INGEST URL</span><input value={liveYoutubeIngest} onChange={(event) => setLiveYoutubeIngest(event.target.value)} type="url" placeholder="rtmp://a.rtmp.youtube.com/live2" /></label>
                <label className="bf-field"><span>STREAM KEY / STORED MASKED</span><input value={liveYoutubeKey} onChange={(event) => setLiveYoutubeKey(event.target.value)} type="password" autoComplete="new-password" placeholder="Leave blank to keep the saved key" /></label>
                <label className="bf-field"><span>BROADCAST ID / URL</span><input value={liveYoutubeBroadcastId} onChange={(event) => setLiveYoutubeBroadcastId(event.target.value)} type="text" placeholder="YouTube live video ID or URL" /></label>
                <label className="bf-field"><span>CHAT ID / OPTIONAL</span><input value={liveYoutubeChatId} onChange={(event) => setLiveYoutubeChatId(event.target.value)} type="text" placeholder="Optional live chat ID" /></label>
                <small>{productionStatus?.live?.youtube?.process?.toUpperCase() || 'OFFLINE'} / {productionStatus?.live?.youtube?.configured ? 'READY' : 'NOT CONFIGURED'} / bridge {productionStatus?.live?.youtube?.bridgeEnabled ? 'ENABLED' : 'OFF'}</small>
              </fieldset>
              <fieldset className="bf-live-platform">
                <legend><label className="bf-check-field"><input checked={liveTiktokEnabled} onChange={(event) => setLiveTiktokEnabled(event.target.checked)} type="checkbox" /> TIKTOK</label></legend>
                <label className="bf-field"><span>RTMP INGEST URL</span><input value={liveTiktokIngest} onChange={(event) => setLiveTiktokIngest(event.target.value)} type="url" placeholder="TikTok-provided RTMP URL" /></label>
                <label className="bf-field"><span>STREAM KEY / STORED MASKED</span><input value={liveTiktokKey} onChange={(event) => setLiveTiktokKey(event.target.value)} type="password" autoComplete="new-password" placeholder="Leave blank to keep the saved key" /></label>
                <label className="bf-field"><span>PROFILE URL / OPTIONAL</span><input value={liveTiktokProfileUrl} onChange={(event) => setLiveTiktokProfileUrl(event.target.value)} type="url" placeholder="https://www.tiktok.com/@your-account" /></label>
                <label className="bf-field"><span>ROOM ID / OPTIONAL</span><input value={liveTiktokRoomId} onChange={(event) => setLiveTiktokRoomId(event.target.value)} type="text" placeholder="Optional TikTok room ID" /></label>
                <small>{productionStatus?.live?.tiktok?.process?.toUpperCase() || 'OFFLINE'} / {productionStatus?.live?.tiktok?.configured ? 'READY' : 'NOT CONFIGURED'} / TikTok RTMP access required</small>
              </fieldset>
            </div>
            <div className="bf-live-actions">
              <button className="bf-button" disabled={productionBusy} onClick={() => void saveLiveSetup()} type="button">SAVE LIVE SETUP</button>
              <button className="bf-button bf-button-primary" disabled={productionBusy || productionStatus?.live?.canGoLive !== true} onClick={() => void productionAction('start-live')} type="button">GO LIVE</button>
              <button className="bf-button bf-button-danger" disabled={productionBusy || productionStatus?.live?.mode !== 'live' && productionStatus?.live?.mode !== 'degraded'} onClick={() => void productionAction('stop-live')} type="button">STOP LIVE</button>
              <span className="bf-live-note">The live encoder loops published episodes, or the safe fallback while the public playlist is empty.</span>
            </div>
          </section>
          <div className="bf-production-metrics">
            <div><span>NOW PLAYING</span><strong>{productionCurrent?.title || 'Fallback / waiting for approved media'}</strong><small>{productionCurrent?.source || 'fallback'} / {productionCurrent?.segmentId || 'factory-fallback'}</small></div>
            <div><span>NEXT</span><strong>{productionNext?.title || 'Ready queue will refill here'}</strong><small>{productionNext?.source || 'queue refill'}</small></div>
            <div><span>QUEUE</span><strong>{productionQueue.length}</strong><small>{productionStatus?.inventory?.approved || 0} approved / {productionStatus?.inventory?.quarantined || 0} quarantined</small></div>
             <div><span>SYSTEM</span><strong>{productionStatus?.writer?.provider || 'writer'} / {productionStatus?.animation?.provider || 'animation'}</strong><small>{productionStatus?.writer?.model || 'local fallback'} / {productionStatus?.animation?.runtimeRenderer || productionStatus?.renderer?.provider || 'renderer'} / music {productionStatus?.music?.approved || 0} approved</small></div>
          </div>
          {productionJob && <p className="bf-production-job" role="status">JOB {productionJob.jobId?.slice(-12) || '—'} / {productionJob.status?.toUpperCase() || 'UNKNOWN'}{productionJob.result?.id ? ` / ${productionJob.result.id}` : ''}{productionJob.error ? ` / ${productionJob.error}` : ''}</p>}
          {productionLatestLog && <p className="bf-production-log">{productionLatestLog.event || 'event'}: {productionLatestLog.detail || 'controller active'}</p>}
          <section className="bf-production-activity" aria-label="Production activity log">
            <div className="bf-production-activity-heading">
              <span className="bf-eyebrow">ACTIVITY LOG / PRODUCTION</span>
              <small>{productionLogs.length} RECENT EVENTS</small>
            </div>
            {productionLogs.length ? (
              <ol className="bf-production-activity-list">
                {productionLogs.slice(0, 24).map((entry, index) => {
                  const event = String(entry.event || 'event');
                  const isQuarantine = event.includes('quarantined');
                  return (
                    <li className={isQuarantine ? 'is-quarantine' : ''} key={(entry.at || event) + '-' + (entry.episodeId || entry.jobId || String(index))}>
                      <div className="bf-production-activity-meta">
                        <time>{formatProductionLogTime(entry.at)}</time>
                        <strong>{event.replaceAll('-', ' ').toUpperCase()}</strong>
                        {entry.deleted ? <b>DELETED</b> : null}
                      </div>
                      {entry.title ? <p>{entry.title}</p> : null}
                      <small>{entry.detail || entry.reason || 'controller active'}{entry.episodeId ? ' / ' + entry.episodeId : ''}</small>
                    </li>
                  );
                })}
              </ol>
            ) : <p className="bf-production-log">No production activity yet.</p>}
          </section>
        </section>

        <section className="bf-episode-library" aria-label="Finished episode review library">
          <div className="bf-section-heading">
            <div><span className="bf-eyebrow">FINISHED EPISODE LIBRARY</span><h2>Review the cut before it goes on air.</h2></div>
            <p>Generated packages load into the video player above. Manual cuts remain reviewable; continuous mode publishes only validated cuts into its website queue.</p>
          </div>
          {episodes.length ? (
            <div className="bf-episode-grid">
              {episodes.map((episode) => (
                <article className={`bf-episode-card ${episode.id === selectedEpisode?.id ? 'is-selected' : ''}`} key={episode.id}>
                  <button className="bf-episode-select" disabled={!isPlayableEpisode(episode)} onClick={() => setSelectedEpisodeId(episode.id)} type="button">
                    <img src={`/api/bullshit-factory/production?view=episode-poster&id=${encodeURIComponent(episode.id)}`} alt="" />
                    <span><strong>{episode.title || episode.id}</strong><small>{Math.round(Number(episode.durationSeconds || 0) / 60 * 10) / 10} min / {episode.state?.replaceAll('-', ' ') || 'review'}</small></span>
                  </button>
                  <div className="bf-episode-card-actions">
                    <button className="bf-button" disabled={productionBusy || !isPlayableEpisode(episode) || episode.id === selectedEpisode?.id} onClick={() => setSelectedEpisodeId(episode.id)} type="button">REVIEW</button>
                    <button className="bf-button bf-button-primary" disabled={productionBusy || episode.state !== 'ready-for-review'} onClick={() => void episodeAction('publish-episode', episode.id)} type="button">{episode.state === 'published' ? 'PUBLISHED' : 'PUBLISH'}</button>
                    {episode.state === 'published' && <button className="bf-button" disabled={productionBusy || !productionHasSession || productionStatus?.control?.mode !== 'continuous'} onClick={() => void episodeAction('queue-episode', episode.id)} type="button">ADD TO CONTINUOUS</button>}
                    <a className="bf-button" href={`/api/bullshit-factory/production?view=episode-transcript&id=${encodeURIComponent(episode.id)}`} target="_blank" rel="noreferrer">TRANSCRIPT</a>
                    <button className="bf-button bf-button-danger" disabled={productionBusy} onClick={() => void episodeAction('delete-episode', episode.id)} type="button">DELETE</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="bf-episode-empty">NO FINISHED EPISODES YET / USE GENERATE EPISODE TO MAKE THE FIRST REVIEW CUT.</div>
          )}
        </section>

        <section className="bf-music-panel" aria-label="Stable Audio 3 music backend">
          <div className="bf-music-copy">
            <span className="bf-eyebrow">MUSIC BACKEND</span>
            <h2>Stable Audio 3 original music queue</h2>
            <p>One CPU-safe job at a time. Stable Audio 3 Small-Music generates short instrumental beds locally; the factory loops approved beds for longer episodes and keeps internal masters as the fallback.</p>
          </div>
          <div className="bf-music-status">
            <strong className={`bf-music-state bf-music-state-${musicStatus?.status || 'checking'}`}>
              {(musicStatus?.status || 'CHECKING').toUpperCase()}
            </strong>
            <small>{musicStatus?.serialized ? 'SERIALIZED' : 'LOOPBACK PROXY'} / {musicStatus?.provider || 'LOCAL MUSIC'} / {musicStatus?.queueDepth || 0} QUEUED / {musicStatus?.cacheFiles || 0} CACHED</small>
          </div>
          <div className="bf-music-actions">
            <button className="bf-button" disabled={musicBusy || musicStatus?.status !== 'ready'} onClick={() => void queueMusicBed()} type="button">
              {musicBusy ? 'QUEUING…' : 'QUEUE CURRENT BED'}
            </button>
            {musicJob && <span className="bf-music-job" role="status">{musicJob.status?.toUpperCase() || 'QUEUED'}{musicJob.queuePosition ? ` / #${musicJob.queuePosition}` : ''}{musicJob.audioUrl ? ' / CACHED' : ''}</span>}
          </div>
        </section>

        <section className="bf-live-layout">
          <div className="bf-stage-panel">
            <div className="bf-panel-heading">
              <div><span className="bf-eyebrow">{selectedEpisode ? 'FINISHED EPISODE PLAYER' : 'IDLE PREVIEW'}</span><h2>{selectedEpisode?.title || scene.label}</h2></div>
              <span className="bf-panel-chip">{selectedEpisode ? 'REVIEW CUT' : scene.location}</span>
            </div>
            <div className="bf-stage-frame">
              {selectedEpisode ? (
                <div className="bf-episode-player">
                  <video
                    className="bf-episode-video"
                    controls
                    preload="metadata"
                    poster={episodePosterUrl}
                    src={episodeVideoUrl}
                    aria-label={`${selectedEpisode.title || 'Finished Bullshit Factory episode'} review player`}
                  >
                    Your browser does not support the finished episode video player.
                  </video>
                  <span className={`bf-episode-review-state bf-episode-review-state-${selectedEpisode.state || 'ready-for-review'}`}>
                    {(selectedEpisode.state || 'ready-for-review').replaceAll('-', ' ').toUpperCase()}
                  </span>
                </div>
              ) : (
                <PixelCompositor sceneId={liveScene.id} activeCharacterId={liveCharacterId} />
              )}
            </div>
            <div className="bf-stage-footer">
              <span>● {selectedEpisode ? selectedEpisode.title || 'FINISHED EPISODE REVIEW' : liveScene.cue}</span>
              <span>{selectedEpisode ? 'REVIEW BEFORE PUBLISHING' : 'IDLE CHARACTER PREVIEW / NO EPISODE LOADED'}</span>
            </div>
            <div className="bf-stage-controls" aria-label="Production feed controls">
              <div className="bf-stage-buttons">
                <button className="bf-button" disabled={productionBusy || !productionHasSession || productionControlState === 'restarting'} onClick={() => void productionAction(productionFeedPaused ? 'resume' : 'pause')} type="button">
                  {productionFeedPaused ? 'PLAY / RESUME FEED' : 'PAUSE FEED'}
                </button>
                <button className="bf-button" disabled={productionBusy || !productionHasSession || productionControlState === 'restarting'} onClick={() => void productionAction('restart')} type="button">
                  RESTART FEED
                </button>
              </div>
              <div className="bf-stage-now">
                <span>{productionControlState.replaceAll('-', ' ').toUpperCase()} / {selectedEpisode ? 'REVIEW CUT' : 'NO CUT LOADED'}</span>
                <strong>{productionCurrent?.title || 'No active playout queue'}</strong>
                <small>{productionCurrent?.source || 'fallback'} / {productionCurrent?.segmentId || 'factory-fallback'} / native video controls review the selected cut</small>
              </div>
            </div>
          </div>

          <aside className="bf-actor-panel">
            <div className="bf-panel-heading">
              <div><span className="bf-eyebrow">SELECTED PERFORMER</span><h2>{character.displayName}</h2></div>
              <span className="bf-panel-chip">{character.isDog ? 'BARK ONLY' : 'VOICE RECIPE'}</span>
            </div>
            <SpriteLoop character={character} className="bf-hero-sprite" preference="idle" />
            <p className="bf-actor-role">{character.role} / {character.department}</p>
            <p className="bf-quote">“{character.quote}”</p>
            <dl className="bf-actor-facts">
              <div><dt>VOICE</dt><dd>{character.voice.foundation}</dd></div>
              <div><dt>INFLUENCE</dt><dd>{character.voice.influence}</dd></div>
              <div><dt>MOTION</dt><dd>{pickCharacterClip(character, 'idle')?.id.replaceAll('_', ' ') || 'idle pose'}</dd></div>
            </dl>
          </aside>
        </section>

        <section className="bf-section">
          <div className="bf-section-heading">
            <div><span className="bf-eyebrow">CAST SELECT</span><h2>The ten people who should not run a factory</h2></div>
            <p>Locked authored exports stay at native resolution. The local compositor scales them with nearest-neighbor filtering and cycles the authored frames at 12 FPS; no PixelLab credits are spent during production.</p>
          </div>
          <div className="bf-cast-grid">
            {factoryCast.map((candidate) => (
              <button
                className={`bf-cast-card ${candidate.id === character.id ? 'is-selected' : ''}`}
                key={candidate.id}
                onClick={() => setCharacterId(candidate.id)}
                style={{ '--bf-tone': candidate.tone } as CSSProperties}
                type="button"
              >
                <SpriteLoop character={candidate} className="bf-cast-sprite" />
                <span className="bf-cast-copy"><strong>{candidate.displayName}</strong><small>{candidate.role}</small><em>{candidate.isDog ? 'BARK ONLY' : candidate.department.toUpperCase()}</em></span>
              </button>
            ))}
          </div>
        </section>

        <section className="bf-section bf-props-section">
          <div className="bf-section-heading">
            <div><span className="bf-eyebrow">PROP CLOSET</span><h2>Objects with a questionable job description</h2></div>
            <p>Small transparent assets are ready for overlays, reaction beats, title cards, and the next excuse the writer invents.</p>
          </div>
          <div className="bf-prop-grid">
            {factoryProps.map((prop) => (
              <article className="bf-prop-card" key={prop.id}>
                <div className="bf-prop-art"><img src={prop.file} alt={`${prop.label} pixel-art prop`} /></div>
                <strong>{prop.label}</strong>
                <small>{prop.description}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="bf-section bf-assembly-section">
          <div className="bf-section-heading">
            <div><span className="bf-eyebrow">SESSION ASSEMBLER</span><h2>{session.formattedDuration} of scheduled nonsense</h2></div>
            <p>Long runs remain a list of short, replaceable blocks. A failed scene or music track cannot poison the entire stream.</p>
          </div>
          <div className="bf-assembly-summary">
            <div><span>EXACT RUNTIME</span><strong>{formatDuration(session.exactDurationMinutes)}</strong><small>{session.blockCount} blocks / {session.blockMinutes} min each</small></div>
            <div><span>TOPICS IN ROTATION</span><strong>{session.categories.length}</strong><small>{session.categories.join(' · ')}</small></div>
            <div><span>CAST COVERAGE</span><strong>{session.castCoverage.length}/10</strong><small>{session.dogIncluded ? `Bork appears in ${session.dogBlockCount} blocks` : 'Dog block missing'}</small></div>
            <div><span>MUSIC POLICY</span><strong>{session.musicStatuses.includes('blocked') || session.musicStatuses.includes('review-required') ? 'HOLD' : 'CLEAR'}</strong><small>Only rights-cleared masters may leave the queue.</small></div>
          </div>
          <div className="bf-queue" aria-label="Session block queue">
            {hiddenBeforeCount > 0 && <p className="bf-queue-more">↑ {hiddenBeforeCount} earlier blocks / live window follows the current block.</p>}
            {visibleBlocks.map((block) => (
              <article className={`bf-queue-row ${block.id === activeBlock?.id ? 'is-now' : ''}`} key={block.id} aria-current={block.id === activeBlock?.id ? 'true' : undefined}>
                <span className="bf-queue-time">{String(block.startMinute).padStart(2, '0')}–{String(block.endMinute).padStart(2, '0')}m</span>
                <div><strong>{block.title}</strong><small>{block.sceneLabel} / {block.castIds.map((id) => factoryCastById.get(id)?.displayName || id).join(', ')}</small></div>
                <span className="bf-queue-category">{block.category}</span>
              </article>
            ))}
            {hiddenAfterCount > 0 && <p className="bf-queue-more">↓ {hiddenAfterCount} later blocks remain in the exact {session.formattedDuration} schedule.</p>}
          </div>
        </section>

        <section className="bf-section">
          <div className="bf-section-heading">
            <div><span className="bf-eyebrow">PRODUCTION GATES</span><h2>What can go on air</h2></div>
            <p>Green means the contract is satisfied. Review and blocked gates are visible on purpose; the factory does not quietly turn missing assets or music rights into claims.</p>
          </div>
          <div className="bf-gate-grid">
            {gates.checks.map((check) => (
              <article className={`bf-gate-card bf-gate-card-${check.status}`} key={check.id}>
                <div><span className="bf-gate-index">{check.id}</span><GateStatus status={check.status} /></div>
                <h3>{check.label}</h3>
                <p>{check.detail}</p>
              </article>
            ))}
          </div>
          <div className="bf-gate-summary"><strong>OVERALL: {gates.status === 'ready' ? 'READY' : gates.status === 'blocked' ? 'BLOCKED UNTIL GATES PASS' : 'REVIEW REQUIRED'}</strong><span>Generated art, voice takes, caption timing, and music rights remain separate reviewable inputs.</span></div>
        </section>

        <footer className="bf-footer">
          <span>BULLSHIT FACTORY / BUILD 01 / RETRO 16-BIT</span>
          <span>SHORT BLOCKS · DETERMINISTIC QUEUE · BORK BARKS ONLY</span>
        </footer>
      </div>
    </main>
  );
}

function formatProductionLogTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString();
}
