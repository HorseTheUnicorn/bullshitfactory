import { expiredSessionCookie, requestUsesSecureTransport } from '../../../../lib/bullshit-factory-admin-auth.mjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return new Response(JSON.stringify({ authenticated: false }), {
    status: 200,
    headers: {
      'cache-control': 'no-store',
      'content-type': 'application/json; charset=utf-8',
      'set-cookie': expiredSessionCookie({ secure: requestUsesSecureTransport(request) }),
    },
  });
}
