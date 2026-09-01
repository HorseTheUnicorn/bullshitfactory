export const runtime = 'nodejs';

const PRODUCTION_ENDPOINT = (process.env.BF_PRODUCTION_ENDPOINT || 'http://127.0.0.1:8793').replace(/\/+$/u, '');
const PRODUCTION_TOKEN = process.env.BF_PRODUCTION_TOKEN || '';

type PublicPlaylistItem = {
  index: number | null;
  segmentId: string | null;
  media: { video: string; poster: string; captions: string } | null;
  title: string;
  source: string;
  category: string;
  sceneId: string;
  durationSeconds: number;
};

function publicNumber(value: unknown, fallback: number | null = null) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function publicEpisodeMedia(id: string | null) {
  if (!id || !/^episode-[a-z0-9-]{1,120}$/iu.test(id)) return null;
  return {
    video: '/api/bullshit-factory/public/media?kind=video&id=' + encodeURIComponent(id),
    poster: '/api/bullshit-factory/public/media?kind=poster&id=' + encodeURIComponent(id),
    captions: '/api/bullshit-factory/public/media?kind=captions&id=' + encodeURIComponent(id),
  };
}

function publicPlaylistItem(value: unknown): PublicPlaylistItem | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  return {
    index: publicNumber(item.index),
    segmentId: typeof item.segmentId === "string" ? item.segmentId : null,
    media: publicEpisodeMedia(typeof item.segmentId === "string" ? item.segmentId : null),
    title: typeof item.title === "string" ? item.title.slice(0, 180) : "Untitled factory cut",
    source: typeof item.source === "string" ? item.source.slice(0, 40) : "unknown",
    category: typeof item.category === "string" ? item.category.slice(0, 80) : "unknown",
    sceneId: typeof item.sceneId === "string" ? item.sceneId.slice(0, 80) : "factory-floor",
    durationSeconds: publicNumber(item.durationSeconds, 0) || 0,
  };
}

function publicPlaylist(value: unknown) {
  if (!value || typeof value !== "object") return { mode: "none", status: "idle", running: false, healthy: false, hasPlaylist: false, itemCount: 0, currentIndex: null, remainingSeconds: 0, current: null, next: null, items: [] };
  const playlist = value as Record<string, unknown>;
  const rawItems = Array.isArray(playlist.items) ? playlist.items : [];
  return {
    mode: typeof playlist.mode === "string" ? playlist.mode : "none",
    status: typeof playlist.status === "string" ? playlist.status : "idle",
    running: playlist.running === true,
    healthy: playlist.healthy === true,
    hasPlaylist: playlist.hasPlaylist === true,
    itemCount: publicNumber(playlist.itemCount, rawItems.length) || rawItems.length,
    currentIndex: publicNumber(playlist.currentIndex),
    elapsedSeconds: publicNumber(playlist.elapsedSeconds, 0) || 0,
    remainingSeconds: publicNumber(playlist.remainingSeconds, 0) || 0,
    current: publicPlaylistItem(playlist.current),
    next: publicPlaylistItem(playlist.next),
    updatedAt: typeof playlist.updatedAt === "string" ? playlist.updatedAt : null,
    items: rawItems.map(publicPlaylistItem).filter(Boolean).slice(0, 40),
  };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'x-content-type-options': 'nosniff',
    },
  });
}

function youtubeVideoId(value: string | undefined) {
  const raw = String(value || '').trim();
  const match = raw.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|live\/|embed\/)|youtu\.be\/)?([A-Za-z0-9_-]{11})/u);
  return match?.[1] || '';
}

function youtubeConfig() {
  const videoId = youtubeVideoId(process.env.BF_YOUTUBE_LIVE_VIDEO_ID || process.env.YOUTUBE_LIVE_VIDEO_ID);
  const enabled = String(process.env.BF_YOUTUBE_ENABLED || 'true').trim().toLowerCase() !== 'false' && Boolean(videoId);
  return {
    enabled,
    configured: Boolean(videoId),
    videoId: enabled ? videoId : null,
    watchUrl: enabled ? `https://www.youtube.com/watch?v=${videoId}` : null,
    chatUrl: enabled ? `https://www.youtube.com/live_chat?v=${videoId}` : null,
  };
}


function publicLiveConfig(payload: { live?: { mode?: string; youtube?: Record<string, unknown>; tiktok?: Record<string, unknown> } }) {
  const source = payload.live;
  const fallbackYoutube = youtubeConfig();
  const youtube = source?.youtube ? {
    enabled: source.youtube.enabled === true,
    configured: source.youtube.configured === true,
    broadcastId: typeof source.youtube.broadcastId === "string" ? source.youtube.broadcastId : null,
    watchUrl: typeof source.youtube.watchUrl === "string" ? source.youtube.watchUrl : null,
    chatUrl: typeof source.youtube.chatUrl === "string" ? source.youtube.chatUrl : null,
  } : fallbackYoutube;
  const tiktok = source?.tiktok ? {
    enabled: source.tiktok.enabled === true,
    configured: source.tiktok.configured === true,
    profileUrl: typeof source.tiktok.profileUrl === "string" ? source.tiktok.profileUrl : null,
    roomId: typeof source.tiktok.roomId === "string" ? source.tiktok.roomId : null,
  } : { enabled: false, configured: false, profileUrl: null, roomId: null };
  return { mode: source?.mode || "offline", youtube, tiktok };
}

async function productionFetch(pathname: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (PRODUCTION_TOKEN) headers.set('x-bullshit-factory-production-token', PRODUCTION_TOKEN);
    return await fetch(`${PRODUCTION_ENDPOINT}${pathname}`, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function productionJson(pathname: string) {
  const response = await productionFetch(pathname);
  const text = await response.text();
  let payload: unknown;
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: 'Production service returned invalid JSON.' }; }
  if (!response.ok) throw new Error((payload as { error?: string })?.error || 'Production service is unavailable.');
  return payload as { episodes?: Array<Record<string, unknown>>; control?: Record<string, unknown>; inventory?: Record<string, unknown>; audience?: Record<string, unknown>; playlist?: Record<string, unknown>; continuousGeneration?: Record<string, unknown>; live?: { mode?: string; youtube?: Record<string, unknown>; tiktok?: Record<string, unknown> } };
}

function publicEpisode(record: Record<string, unknown>) {
  if (record.state !== 'published' || typeof record.id !== 'string') return null;
  const id = record.id;
  if (!/^episode-[a-z0-9-]{1,120}$/iu.test(id)) return null;
  const files = (record.files && typeof record.files === 'object' ? record.files : {}) as Record<string, unknown>;
  const video = typeof files.video === 'string' || typeof record.videoFile === 'string';
  if (!video) return null;
  const generation = (record.generation && typeof record.generation === 'object' ? record.generation : {}) as Record<string, unknown>;
  const firstSegment = Array.isArray(record.segments) && record.segments[0] && typeof record.segments[0] === 'object'
    ? record.segments[0] as Record<string, unknown>
    : {};
  const sceneId = [record.sceneId, firstSegment.sceneId, generation.where]
    .find((value) => typeof value === 'string' && value.trim() && value.trim().toLowerCase() !== 'auto');
  return {
    id,
    title: typeof record.title === 'string' ? record.title.slice(0, 180) : id,
    durationSeconds: Number.isFinite(Number(record.durationSeconds)) ? Number(record.durationSeconds) : null,
    requestedMinutes: Number.isFinite(Number(record.requestedMinutes)) ? Number(record.requestedMinutes) : null,
    createdAt: typeof record.createdAt === 'string' ? record.createdAt : null,
    publishedAt: typeof record.publishedAt === 'string' ? record.publishedAt : null,
    sceneId: typeof sceneId === 'string' ? sceneId.slice(0, 80) : null,
    media: {
      video: `/api/bullshit-factory/public/media?kind=video&id=${encodeURIComponent(id)}`,
      poster: `/api/bullshit-factory/public/media?kind=poster&id=${encodeURIComponent(id)}`,
      captions: `/api/bullshit-factory/public/media?kind=captions&id=${encodeURIComponent(id)}`,
    },
  };
}

export async function GET(request: Request) {
  const view = new URL(request.url).searchParams.get('view') || 'episodes';
  if (!['episodes', 'status', 'playlist'].includes(view)) return json({ error: 'Unknown public view.' }, 400);
  try {
    const payload = await productionJson('/api/production/status');
    const live = publicLiveConfig(payload);
    if (view === 'status') {
      return json({
        showId: 'bullshit-factory',
        status: payload.control?.status || 'ready',
        control: { status: payload.control?.status || 'idle', mode: payload.control?.mode || 'none', paused: payload.control?.paused === true },
        episodes: payload.episodes || { total: 0, published: 0 },
        playlist: publicPlaylist(payload.playlist),
        continuousGeneration: payload.continuousGeneration || { status: 'idle' },
        audience: payload.audience || { queueDepth: 0, autonomousDiscordPosting: false },
        youtube: live.youtube,
        tiktok: live.tiktok,
        live: { mode: live.mode, youtube: live.youtube, tiktok: live.tiktok },
      });
    }
    if (view === 'playlist') return json({ showId: 'bullshit-factory', service: 'ready', playlist: publicPlaylist(payload.playlist), continuousGeneration: payload.continuousGeneration || { status: 'idle' }, policy: { publishedOnly: true, autonomousDiscordPosting: false } });
    const episodePayload = await productionJson('/api/production/episodes');
    const publicEpisodes = (episodePayload.episodes || []).map(publicEpisode).filter(Boolean);
    return json({
      showId: 'bullshit-factory',
      service: 'ready',
      episodes: publicEpisodes,
      playlist: publicPlaylist(payload.playlist),
      continuousGeneration: payload.continuousGeneration || { status: 'idle' },
      youtube: live.youtube,
      tiktok: live.tiktok,
      live: { mode: live.mode, youtube: live.youtube, tiktok: live.tiktok },
      policy: { publishedOnly: true, autonomousDiscordPosting: false, audienceSuggestions: 'explicitly-invoked-only' },
    });
  } catch (error) {
    return json({
      showId: 'bullshit-factory',
      service: 'unavailable',
      episodes: [],
      playlist: publicPlaylist(null),
      youtube: youtubeConfig(),
      tiktok: { enabled: false, configured: false, profileUrl: null, roomId: null },
      live: { mode: 'offline', youtube: youtubeConfig(), tiktok: { enabled: false, configured: false, profileUrl: null, roomId: null } },
      error: error instanceof Error ? error.message : 'Production service is unavailable.',
    }, 503);
  }
}
