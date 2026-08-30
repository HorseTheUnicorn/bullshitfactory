export const runtime = 'nodejs';

const PRODUCTION_ENDPOINT = (process.env.BF_PRODUCTION_ENDPOINT || 'http://127.0.0.1:8793').replace(/\/+$/u, '');
const PRODUCTION_TOKEN = process.env.BF_PRODUCTION_TOKEN || '';
const KINDS = new Set(['video', 'poster', 'captions']);

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' },
  });
}

function validEpisodeId(value: string) {
  return /^episode-[a-z0-9-]{1,120}$/iu.test(value);
}

async function productionFetch(pathname: string, init: RequestInit = {}, timeoutMs = 30_000) {
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

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get('kind') || '';
  const id = params.get('id') || '';
  if (!KINDS.has(kind) || !validEpisodeId(id)) return json({ error: 'Invalid published episode media request.' }, 400);
  try {
    const detail = await productionFetch(`/api/production/episodes/${encodeURIComponent(id)}`);
    if (!detail.ok) return json({ error: 'Published episode was not found.' }, 404);
    const payload = await detail.json() as { episode?: { state?: string } };
    if (payload.episode?.state !== 'published') return json({ error: 'Episode media is not public.' }, 404);
    const range = request.headers.get('range');
    const response = await productionFetch(`/api/production/media/episode/${kind}/${encodeURIComponent(id)}`, range ? { headers: { range } } : {});
    if (!response.ok) return json({ error: 'Published episode media is unavailable.' }, response.status);
    const headers = new Headers();
    for (const name of ['accept-ranges', 'cache-control', 'content-range', 'content-type', 'content-length', 'content-disposition', 'x-content-type-options']) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    headers.set('cache-control', kind === 'video' ? 'public, max-age=60' : 'public, max-age=300');
    return new Response(response.body, { status: response.status, headers });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Published episode media is unavailable.' }, 503);
  }
}
