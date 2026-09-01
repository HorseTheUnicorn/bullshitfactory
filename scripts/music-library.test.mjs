import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalogPath = path.join(root, 'public', 'bullshit-factory', 'audio', 'catalog.json');
const libraryPath = path.join(root, 'public', 'bullshit-factory', 'music', 'library.json');

test('the approved opening theme is the local Stable Audio 3 master', () => {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const library = JSON.parse(readFileSync(libraryPath, 'utf8'));
  const catalogTheme = catalog.assets.find((asset) => asset.id === 'bf-theme-main');
  const libraryTheme = library.tracks.find((track) => track.id === 'bf-theme-main');

  assert.equal(catalogTheme.provider, 'stable-audio-3-small-music');
  assert.equal(libraryTheme.provider, 'stable-audio-3-small-music');
  assert.ok(catalogTheme.file.endsWith('.mp3'));
  assert.ok(libraryTheme.file.endsWith('.mp3'));
  assert.match(catalogTheme.generationPrompt, /no timer tones/i);
  assert.ok(existsSync(path.join(root, 'public', catalogTheme.file.replace('/', ''))));
});
