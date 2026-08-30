import { getAdminAuthConfig, isAdminAuthenticated } from '../../../../lib/bullshit-factory-admin-auth.mjs';

export const runtime = 'nodejs';

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(request: Request) {
  const config = getAdminAuthConfig();
  return json({ authenticated: isAdminAuthenticated(request), configured: config.configured });
}
