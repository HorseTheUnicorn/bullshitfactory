export const runtime = 'nodejs';

import { isAdminAuthenticated } from '../../../../lib/bullshit-factory-admin-auth.mjs';

const PRODUCTION_ENDPOINT = (process.env.BF_PRODUCTION_ENDPOINT || 'http://127.0.0.1:8793').replace(/\/+$/u, '');
const PRODUCTION_TOKEN = process.env.BF_PRODUCTION_TOKEN || '';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

function knownGetPath(view: string | null, id: string | null, characterId: string | null) {
  if (view === 'status' || !view) return '/api/production/status';
  if (view === 'playlist') return '/api/production/playlist';
  if (view === 'segments') return '/api/production/segments';
  if (view === 'episodes') return '/api/production/episodes';
  if (view === 'voices') return '/api/production/voices';
  if (view === 'jobs') return '/api/production/jobs';
  if (view === 'logs') return '/api/production/logs';
  if (view === 'live-status') return '/api/production/live/status';
  if (view === 'job' && id && /^job-[a-f0-9-]{8,120}$/iu.test(id)) return `/api/production/jobs/${encodeURIComponent(id)}`;
  if (view === 'segment' && id && /^[a-z0-9][a-z0-9_-]{0,95}$/iu.test(id)) return `/api/production/segments/${encodeURIComponent(id)}`;
  if ((view === 'episode' || view === 'episode-video' || view === 'episode-poster' || view === 'episode-captions' || view === 'episode-transcript') && id && /^episode-[a-z0-9-]{1,120}$/iu.test(id)) {
    if (view === 'episode') return `/api/production/episodes/${encodeURIComponent(id)}`;
    const kind = view.replace('episode-', '');
    return `/api/production/media/episode/${kind}/${encodeURIComponent(id)}`;
  }
  if (view === 'voice-current' && characterId && /^[a-z0-9][a-z0-9_-]{0,95}$/iu.test(characterId)) return `/api/production/media/voice/current/${encodeURIComponent(characterId)}`;
  if (view === 'voice-audition' && characterId && id && /^[a-z0-9][a-z0-9_-]{0,95}$/iu.test(characterId) && /^[abc]$/iu.test(id)) return `/api/production/media/voice/${encodeURIComponent(characterId)}/${encodeURIComponent(id.toLowerCase())}`;
  if (view === 'voice-reel') return '/api/production/media/voice/cast-reel';
  return null;
}

function knownPostPath(action: string) {
  if (action === 'start' || action === 'start-continuous') return '/api/production/sessions';
  if (action === 'generate-episode') return '/api/production/episodes/generate';
  if (action === 'generate-orange-episode') return '/api/production/episodes/generate';
  if (action === 'generate-continuous') return '/api/production/episodes/generate';
  if (action === 'save-live-setup') return '/api/production/live/setup';
  if (action === 'start-live') return '/api/production/live/start';
  if (action === 'stop-live') return '/api/production/live/stop';
  if (action === 'generate-voice-candidates') return '/api/production/voices/candidates';
  if (action === 'select-voice-candidate') return '/api/production/voices/select';
  if (action === 'generate-cast-reel') return '/api/production/voices/cast-reel';
  if (action === 'save-orange-schedule') return '/api/production/orange-idiot/schedule';
  if (action === 'refresh-orange-sources') return '/api/production/orange-idiot/research';
  if (action === 'add-research-topic' || action === 'remove-research-topic') return '/api/production/research/topic';
  if (action === 'publish-episode') return '/api/production/episodes/publish';
  if (action === 'queue-episode') return '/api/production/episodes/queue';
  if (action === 'delete-episode') return '/api/production/episodes/delete';
  if (action === 'remove-playlist-item') return '/api/production/playlist/remove';
  if (action === 'pause' || action === 'resume' || action === 'stop' || action === 'stop-playback' || action === 'stop-continuous-generation' || action === 'stop-continuous' || action === 'restart' || action === 'handoff') return '/api/production/control';
  if (action === 'generate') return '/api/production/segments/generate';
  if (action === 'rebuild') return '/api/production/inventory/rebuild';
  if (action === 'approve-music' || action === 'revoke-music') return '/api/production/music';
  if (action === 'quarantine' || action === 're-enable') return null;
  return null;
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

async function proxyJson(pathname: string, init: RequestInit = {}, timeoutMs = 8_000) {
  try {
    const response = await productionFetch(pathname, init, timeoutMs);
    const text = await response.text();
    let payload: unknown;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: 'Production service returned invalid JSON.' }; }
    return json(payload, response.status);
  } catch (error) {
    return json({
      status: 'unavailable',
      service: 'bullshit-factory-production',
      showId: 'bullshit-factory',
      error: error instanceof Error ? error.message : 'Production service is unavailable.',
    }, 503);
  }
}

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  const url = new URL(request.url);
  const pathname = knownGetPath(url.searchParams.get('view'), url.searchParams.get('id'), url.searchParams.get('characterId'));
  if (!pathname) return json({ error: 'Unknown production view.' }, 400);
  if (pathname.includes('/media/episode/') || pathname.includes('/media/voice/')) {
    try {
      const range = request.headers.get('range');
      const response = await productionFetch(pathname, range ? { headers: { range } } : {}, 30_000);
      if (!response.ok) return json({ error: 'Requested voice or episode media is unavailable.' }, response.status);
      const headers = new Headers();
      for (const name of ['accept-ranges', 'cache-control', 'content-range', 'content-type', 'content-length', 'content-disposition', 'x-content-type-options']) {
        const value = response.headers.get(name);
        if (value) headers.set(name, value);
      }
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Episode media is unavailable.' }, 503);
    }
  }
  return proxyJson(pathname);
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }
  const action = String(body.action || '').trim().toLowerCase();
  let pathname = knownPostPath(action);
  if (action === 'quarantine' || action === 're-enable') {
    const id = String(body.segmentId || '');
    if (!/^[a-z0-9][a-z0-9_-]{0,95}$/iu.test(id)) return json({ error: 'segmentId is required.' }, 400);
    pathname = `/api/production/segments/${encodeURIComponent(id)}/${action}`;
  }
  if (!pathname) return json({ error: 'Unknown production action.' }, 400);
  const forwarded = { ...body };
  delete forwarded.action;
  if (action === 'start-continuous') forwarded.mode = 'continuous';
  if (action === 'generate-orange-episode') {
    forwarded.orangeIdiotMode = 'standalone';
    forwarded.orangeIdiotOnly = true;
  }
  if (action === 'generate-continuous') {
    forwarded.autoPublish = true;
    forwarded.publishToPublic = true;
    forwarded.queueForContinuous = true;
  }
  if (action === 'add-research-topic') forwarded.operation = 'add';
  if (action === 'remove-research-topic') forwarded.operation = 'remove';
  if (action === 'approve-music') forwarded.action = 'approve';
  if (action === 'revoke-music') forwarded.action = 'revoke';
  if (action === 'pause' || action === 'resume' || action === 'stop' || action === 'stop-playback' || action === 'stop-continuous-generation' || action === 'stop-continuous' || action === 'restart' || action === 'handoff') forwarded.action = action;
  return proxyJson(pathname, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(forwarded),
  }, action === 'generate' || action === 'rebuild' ? 12_000 : action === 'refresh-orange-sources' || action === 'add-research-topic' || action === 'remove-research-topic' || action === 'save-orange-schedule' || action === 'save-live-setup' || action === 'start-live' || action === 'stop-live' ? 20_000 : 8_000);
}
