import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_ID, USER_DATA_MAPPA } from './protocol.js';

const APP_KONYVTAR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const olvasJson = (fajl: string) => JSON.parse(readFileSync(path.join(APP_KONYVTAR, fajl), 'utf-8'));

describe('tartós nevek', () => {
  it('a userData-mappa egyezik a package.json name-jével, amit az NSIS-eltávolító töröl', () => {
    expect(USER_DATA_MAPPA).toBe(olvasJson('package.json').name);
  });

  it('a productName ASCII, mert nem-ASCII bundle-névvel a macOS-es app indításkor összeomlik', () => {
    expect(olvasJson('package.json').productName).toMatch(/^[ -~]+$/);
  });

  it('a main appId-ja egyezik az electron-builder.json appId-jával', () => {
    expect(APP_ID).toBe(olvasJson('electron-builder.json').appId);
  });
});
