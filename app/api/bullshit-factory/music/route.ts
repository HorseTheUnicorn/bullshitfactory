export const runtime = 'nodejs';

import { isAdminAuthenticated } from '../../../../lib/bullshit-factory-admin-auth.mjs';

const ADAPTER_ENDPOINT = (process.env.BULLSHIT_FACTORY_MUSIC_ADAPTER_ENDPOINT || 'http://127.0.0.1:8797').replace(/\/+$/u, '');
const ADAPTER_TOKEN = process.env.BULLSHIT_FACTORY_MUSIC_ADAPTER_TOKEN || process.env.BULLSHIT_FACTORY_MUSIC_TOKEN || '';

function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      ...headers,
    },
  });
}

async function adapterFetch(pathname: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (ADAPTER_TOKEN) headers.set('x-bullshit-factory-music-token', ADAPTER_TOKEN);
    return await fetch(`${ADAPTER_ENDPOINT}${pathname}`, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function proxyJson(pathname: string, init: RequestInit = {}, timeoutMs = 8_000) {
  try {
    const response = await adapterFetch(pathname, init, timeoutMs);
    const text = await response.text();
    let payload: unknown;
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = { error: 'Music adapter returned invalid JSON.' }; }
    return json(payload, response.status);
  } catch (error) {
    return json({
      status: 'unavailable',
      provider: 'stable-audio-3-small-music',
      endpoint: 'loopback-only',
      serialized: true,
      generationMode: 'pre-generation-only',
      error: error instanceof Error ? error.message : 'Music adapter is unavailable.',
    }, 503);
  }
}

export async function GET(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  const url = new URL(request.url);
  const audioKey = url.searchParams.get('audioKey');
  if (audioKey) {
    try {
      const response = await adapterFetch(`/v1/music/audio/${encodeURIComponent(audioKey)}`, {}, 30_000);
      if (!response.ok) return json({ error: 'Cached audio is not available.' }, response.status);
      const headers = new Headers({
        'cache-control': response.headers.get('cache-control') || 'public, max-age=31536000, immutable',
        'content-type': response.headers.get('content-type') || 'audio/mpeg',
        'x-content-type-options': 'nosniff',
      });
      const contentLength = response.headers.get('content-length');
      if (contentLength) headers.set('content-length', contentLength);
      return new Response(response.body, {
        status: 200,
        headers,
      });
    } catch {
      return json({ error: 'Music adapter is unavailable.' }, 503);
    }
  }
  const jobId = url.searchParams.get('jobId');
  return proxyJson(jobId ? `/v1/music/jobs/${encodeURIComponent(jobId)}` : '/health');
}

export async function POST(request: Request) {
  if (!isAdminAuthenticated(request)) return json({ error: 'Admin login required.' }, 401);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }
  return proxyJson('/v1/music/jobs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }, 12_000);
}
