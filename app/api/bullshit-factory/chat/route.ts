export const runtime = 'nodejs';

const PRODUCTION_ENDPOINT = (process.env.BF_PRODUCTION_ENDPOINT || 'http://127.0.0.1:8793').replace(/\/+$/u, '');
const PRODUCTION_TOKEN = process.env.BF_PRODUCTION_TOKEN || '';

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

async function productionFetch(pathname: string, init: RequestInit = {}, timeoutMs = 8_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    if (PRODUCTION_TOKEN) headers.set('x-bullshit-factory-production-token', PRODUCTION_TOKEN);
    return await fetch(PRODUCTION_ENDPOINT + pathname, { ...init, headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function productionPayload(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) as Record<string, unknown> : {};
  } catch {
    return { error: 'Production service returned invalid JSON.' };
  }
}

export async function GET(request: Request) {
  const limit = new URL(request.url).searchParams.get('limit') || '60';
  try {
    const response = await productionFetch('/api/production/audience/chat?limit=' + encodeURIComponent(limit));
    const payload = await productionPayload(response);
    return json(payload, response.status);
  } catch {
    return json({
      chat: {
        messages: [],
        queueDepth: 0,
        autonomousDiscordPosting: false,
        policy: 'Live chat is temporarily unavailable.',
      },
      error: 'Live chat is temporarily unavailable.',
    }, 503);
  }
}

export async function POST(request: Request) {
  try {
    const raw: unknown = await request.json();
    const body = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 240) : '';
    const author = typeof body.author === 'string' ? body.author.trim().slice(0, 32) : '';
    const clientId = typeof body.clientId === 'string' ? body.clientId.trim().slice(0, 80) : '';
    if (!text) return json({ error: 'Chat message is required.' }, 400);
    const response = await productionFetch('/api/production/audience/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ source: 'website', text, author, clientId }),
    });
    const payload = await productionPayload(response);
    return json(payload, response.status);
  } catch {
    return json({ error: 'Live chat is temporarily unavailable.' }, 503);
  }
}
