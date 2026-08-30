import { createAdminSession, getAdminAuthConfig, requestUsesSecureTransport, sessionCookie, verifyAdminPassword, verifyAdminUsername } from '../../../../lib/bullshit-factory-admin-auth.mjs';

export const runtime = 'nodejs';

function json(payload: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'cache-control': 'no-store', 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config.configured) return json({ error: 'Admin authentication is not configured. Set BF_ADMIN_USERNAME, BF_ADMIN_PASSWORD_HASH, and BF_ADMIN_SESSION_SECRET on the server.' }, 503);
  let body: { username?: unknown; password?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }
  const username = typeof body.username === 'string' ? body.username : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!verifyAdminUsername(username, config.username) || password.length < 1 || password.length > 256 || !(await verifyAdminPassword(password, config.passwordHash))) {
    return json({ error: 'Invalid admin username or password.' }, 401, { 'www-authenticate': 'Bearer' });
  }
  const token = createAdminSession(config.sessionSecret);
  return json({ authenticated: true }, 200, { 'set-cookie': sessionCookie(token, { secure: requestUsesSecureTransport(request) }) });
}
