import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_HASH_ALGORITHM = 'scrypt';
const PASSWORD_COST = 16_384;
const PASSWORD_BLOCK_SIZE = 8;
const PASSWORD_PARALLELIZATION = 1;
const PASSWORD_KEY_BYTES = 32;
const SESSION_TTL_SECONDS = 12 * 60 * 60;
const ADMIN_USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{2,63}$/u;
export const ADMIN_USER_LIMIT = 1;

export const ADMIN_COOKIE_NAME = 'bf_admin_session';

function safeBuffer(value, encoding = 'hex') {
  try {
    const buffer = Buffer.from(String(value || ''), encoding);
    return buffer.length ? buffer : null;
  } catch {
    return null;
  }
}

function constantTimeStringEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''));
  const rightBuffer = Buffer.from(String(right || ''));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function getAdminAuthConfig(environment = process.env) {
  const username = String(environment.BF_ADMIN_USERNAME || '').trim();
  const passwordHash = String(environment.BF_ADMIN_PASSWORD_HASH || '').trim();
  const sessionSecret = String(environment.BF_ADMIN_SESSION_SECRET || '').trim();
  return { username, passwordHash, sessionSecret, userLimit: ADMIN_USER_LIMIT, configured: Boolean(ADMIN_USERNAME_PATTERN.test(username) && passwordHash && sessionSecret) };
}

export function verifyAdminUsername(username, expectedUsername) {
  const candidate = String(username || '').trim();
  const expected = String(expectedUsername || '').trim();
  if (!ADMIN_USERNAME_PATTERN.test(candidate) || !ADMIN_USERNAME_PATTERN.test(expected)) return false;
  return constantTimeStringEqual(candidate, expected);
}

export async function hashAdminPassword(password) {
  const plainText = String(password || '');
  if (plainText.length < 12 || plainText.length > 256) throw new Error('Admin password must be between 12 and 256 characters.');
  const salt = randomBytes(16);
  const derived = await scrypt(plainText, salt, PASSWORD_KEY_BYTES, { N: PASSWORD_COST, r: PASSWORD_BLOCK_SIZE, p: PASSWORD_PARALLELIZATION, maxmem: 64 * 1024 * 1024 });
  return [PASSWORD_HASH_ALGORITHM, PASSWORD_COST, PASSWORD_BLOCK_SIZE, PASSWORD_PARALLELIZATION, salt.toString('hex'), Buffer.from(derived).toString('hex')].join('$');
}

export async function verifyAdminPassword(password, encodedHash) {
  const parts = String(encodedHash || '').split('$');
  if (parts.length !== 6 || parts[0] !== PASSWORD_HASH_ALGORITHM) return false;
  const cost = Number(parts[1]);
  const blockSize = Number(parts[2]);
  const parallelization = Number(parts[3]);
  const salt = safeBuffer(parts[4]);
  const expected = safeBuffer(parts[5]);
  if (!salt || !expected || expected.length !== PASSWORD_KEY_BYTES || !Number.isInteger(cost) || cost < 16_384 || cost > 131_072 || !Number.isInteger(blockSize) || blockSize < 8 || blockSize > 32 || !Number.isInteger(parallelization) || parallelization < 1 || parallelization > 4) return false;
  try {
    const derived = Buffer.from(await scrypt(String(password || ''), salt, expected.length, { N: cost, r: blockSize, p: parallelization, maxmem: 128 * 1024 * 1024 }));
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function sessionSignature(payload, secret) {
  return createHmac('sha256', String(secret)).update(payload).digest('hex');
}

export function createAdminSession(secret, now = Date.now()) {
  const issuedAt = Math.floor(Number(now) / 1000);
  const payload = `${issuedAt}.${randomBytes(18).toString('hex')}`;
  return `${payload}.${sessionSignature(payload, secret)}`;
}

export function verifyAdminSession(token, secret, now = Date.now()) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3 || !secret) return false;
  const issuedAt = Number(parts[0]);
  if (!Number.isInteger(issuedAt)) return false;
  const age = Math.floor(Number(now) / 1000) - issuedAt;
  if (age < -60 || age > SESSION_TTL_SECONDS) return false;
  return constantTimeStringEqual(parts[2], sessionSignature(`${parts[0]}.${parts[1]}`, secret));
}

export function readCookie(request, name) {
  const header = request.headers.get('cookie') || '';
  for (const piece of header.split(';')) {
    const separator = piece.indexOf('=');
    if (separator < 0) continue;
    const key = piece.slice(0, separator).trim();
    if (key !== name) continue;
    try { return decodeURIComponent(piece.slice(separator + 1).trim()); } catch { return ''; }
  }
  return '';
}

export function isAdminAuthenticated(request, environment = process.env) {
  const config = getAdminAuthConfig(environment);
  return config.configured && verifyAdminSession(readCookie(request, ADMIN_COOKIE_NAME), config.sessionSecret);
}

export function sessionCookie(token, { secure = false, maxAge = SESSION_TTL_SECONDS } = {}) {
  const flags = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(Number(maxAge) || 0))}`,
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}

export function expiredSessionCookie({ secure = false } = {}) {
  return sessionCookie('', { secure, maxAge: 0 });
}

export function requestUsesSecureTransport(request) {
  return new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';
}
