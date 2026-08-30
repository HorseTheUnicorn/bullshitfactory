#!/usr/bin/env node

import { randomBytes } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { hashAdminPassword, verifyAdminUsername } from '../lib/bullshit-factory-admin-auth.mjs';

const envPath = path.resolve(process.env.BF_ADMIN_ENV_FILE || path.join(process.cwd(), '.env'));
const replaceExisting = process.argv.includes('--replace');

function updateEnv(contents, values) {
  const lines = contents.split(/\r?\n/u);
  const replaced = new Set();
  const updated = lines.map((line) => {
    const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=.*$/u);
    if (!match || !(match[1] in values)) return line;
    replaced.add(match[1]);
    return `${match[1]}=${values[match[1]]}`;
  });
  for (const [key, value] of Object.entries(values)) {
    if (!replaced.has(key)) updated.push(`${key}=${value}`);
  }
  return updated.filter((line, index, all) => index < all.length - 1 || line !== '').join('\n') + '\n';
}

function hasValue(contents, key) {
  return new RegExp(`^\\s*${key}=.+$`, 'mu').test(contents);
}

function hiddenQuestion(rl, prompt) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    return Promise.reject(new Error('Admin setup must run in an interactive TTY so the password is never echoed.'));
  }
  return new Promise((resolve, reject) => {
    let value = '';
    let settled = false;
    const finish = (error = null) => {
      if (settled) return;
      settled = true;
      input.setRawMode(false);
      input.off('data', onData);
      output.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          finish(new Error('Admin setup cancelled.'));
        } else if (character === '\r' || character === '\n') {
          finish();
        } else if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
        } else {
          value += character;
        }
        if (settled) break;
      }
    };
    output.write(prompt);
    rl.pause();
    input.setRawMode(true);
    input.resume();
    input.on('data', onData);
  });
}

const rl = createInterface({ input, output });
try {
  let existing = '';
  try { existing = await readFile(envPath, 'utf8'); } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  if (!replaceExisting && ['BF_ADMIN_USERNAME', 'BF_ADMIN_PASSWORD_HASH', 'BF_ADMIN_SESSION_SECRET'].every((key) => hasValue(existing, key))) {
    throw new Error(`An admin account is already configured in ${envPath}. Use --replace only when intentionally rotating it.`);
  }
  const username = (await rl.question('Bullshit Factory admin username: ')).trim();
  if (!verifyAdminUsername(username, username)) throw new Error('Username must be 3-64 characters using letters, numbers, dots, underscores, or hyphens.');
  const password = await hiddenQuestion(rl, 'Bullshit Factory admin password (12+ characters): ');
  const confirmation = await hiddenQuestion(rl, 'Repeat admin password: ');
  if (password !== confirmation) throw new Error('Passwords did not match.');
  const passwordHash = await hashAdminPassword(password);
  const sessionSecret = randomBytes(32).toString('hex');
  await writeFile(envPath, updateEnv(existing, { BF_ADMIN_USERNAME: username, BF_ADMIN_PASSWORD_HASH: passwordHash, BF_ADMIN_SESSION_SECRET: sessionSecret }), { encoding: 'utf8', mode: 0o600 });
  await chmod(envPath, 0o600);
  console.log(`Configured the single Bullshit Factory admin account for ${username}. Restart the dashboard service to activate it.`);
} finally {
  rl.close();
}
