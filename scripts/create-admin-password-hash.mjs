#!/usr/bin/env node

import { hashAdminPassword } from '../lib/bullshit-factory-admin-auth.mjs';

const password = String(process.env.BF_ADMIN_PASSWORD || '').trim();
if (!password) {
  console.error('Set BF_ADMIN_PASSWORD for this one-shot command, then store only the printed hash in BF_ADMIN_PASSWORD_HASH.');
  process.exitCode = 1;
} else {
  console.log(await hashAdminPassword(password));
}
