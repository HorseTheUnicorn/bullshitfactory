#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { acceptRegistryEntry } from './h3-author-motion.mjs';

function parseArgs(argv) {
  const args = { entry: '', note: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--help' || value === '-h') args.help = true;
    else if (value === '--entry') args.entry = String(argv[++index] || '').trim();
    else if (value === '--note') args.note = String(argv[++index] || '').trim();
    else throw new Error(`Unknown option: ${value}`);
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  npm run animation:accept -- --entry ENTRY_ID [--note "operator note"]',
    '',
    'Marks an already-processed H3 motion entry as operator-reviewed.',
    'This command never submits an H3 request.',
  ].join('\n');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage());
    return;
  }
  if (!args.entry) throw new Error('Missing --entry ENTRY_ID.\n\n' + usage());
  await acceptRegistryEntry(args.entry, args.note);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch((error) => {
  console.error(JSON.stringify({ status: 'error', message: error.message }, null, 2));
  process.exitCode = 1;
});
