import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAdminSession,
  getAdminAuthConfig,
  hashAdminPassword,
  verifyAdminUsername,
  isAdminAuthenticated,
  sessionCookie,
  verifyAdminPassword,
  verifyAdminSession,
} from './lib/bullshit-factory-admin-auth.mjs';

test('admin password hashes and signed sessions verify without exposing plaintext', async () => {
  const password = 'test-password-for-auth';
  const hash = await hashAdminPassword(password);
  assert.match(hash, /^scrypt\$16384\$8\$1\$/u);
  assert.equal(await verifyAdminPassword(password, hash), true);
  assert.equal(await verifyAdminPassword('wrong-password', hash), false);

  const issuedAt = Date.now();
  const secret = 'test-session-secret';
  const token = createAdminSession(secret, issuedAt);
  assert.equal(verifyAdminSession(token, secret, issuedAt + 60_000), true);
  assert.equal(verifyAdminSession(token, 'wrong-session-secret', issuedAt + 60_000), false);
  assert.equal(verifyAdminSession(token, secret, issuedAt + 12 * 60 * 60 * 1000 + 1_000), false);

  const request = new Request('http://localhost/admin', { headers: { cookie: sessionCookie(token) } });
  assert.equal(isAdminAuthenticated(request, { BF_ADMIN_USERNAME: 'owner', BF_ADMIN_PASSWORD_HASH: hash, BF_ADMIN_SESSION_SECRET: secret }), true);
  assert.equal(verifyAdminUsername('owner', 'owner'), true);
  assert.equal(verifyAdminUsername('other', 'owner'), false);
  assert.deepEqual(getAdminAuthConfig({ BF_ADMIN_USERNAME: '', BF_ADMIN_PASSWORD_HASH: '', BF_ADMIN_SESSION_SECRET: '' }), { username: '', passwordHash: '', sessionSecret: '', userLimit: 1, configured: false });
});
