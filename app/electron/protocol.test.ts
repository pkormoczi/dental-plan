import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { APP_ID, USER_DATA_MAPPA } from './protocol.js';

const APP_KONYVTAR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const olvasJson = (fajl: string) => JSON.parse(readFileSync(path.join(APP_KONYVTAR, fajl), 'utf-8'));

// Az electron-builder kulcsai, amelyekből a telepítő vagy a csomag megjelenített nevet ad
// (parancsikon, eltávolítási bejegyzés, dmg-kötet, appx/snap cím).
const MEGJELENITETT_NEV_KULCSOK = new Set(['productName', 'shortcutName', 'uninstallDisplayName', 'displayName', 'title']);

function megjelenitettNevek(ertek: unknown, ut = ''): [string, unknown][] {
  if (!ertek || typeof ertek !== 'object') return [];
  return Object.entries(ertek).flatMap(([kulcs, v]) => [
    ...(MEGJELENITETT_NEV_KULCSOK.has(kulcs) ? [[`${ut}${kulcs}`, v] as [string, unknown]] : []),
    ...megjelenitettNevek(v, `${ut}${kulcs}.`),
  ]);
}

describe('tartós nevek', () => {
  it('a userData-mappa egyezik a package.json name-jével, amit az NSIS-eltávolító töröl', () => {
    expect(USER_DATA_MAPPA).toBe(olvasJson('package.json').name);
  });

  it('a productName ASCII, mert nem-ASCII bundle-névvel a macOS-es app indításkor összeomlik', () => {
    expect(olvasJson('package.json').productName).toMatch(/^[ -~]+$/);
  });

  it('az electron-builder.json egyetlen platformon sem ad a productName-től eltérő megjelenített nevet', () => {
    const productName: string = olvasJson('package.json').productName;
    const elteroek = megjelenitettNevek(olvasJson('electron-builder.json')).filter(
      ([, v]) => v !== productName && !(typeof v === 'string' && v.includes('${productName}')),
    );
    expect(elteroek).toEqual([]);
  });

  it('a main appId-ja egyezik az electron-builder.json appId-jával', () => {
    expect(APP_ID).toBe(olvasJson('electron-builder.json').appId);
  });
});

describe('helyi kicsomagolt build', () => {
  // Az electron-builder `--dir` kapcsolója cél-architektúra nélkül a gép architektúrájára
  // csomagol, a builder-config Mac-targetjét figyelmen kívül hagyva: macOS-en így nem lenne
  // `mac-universal`, amit az e2e indító keres.
  it('macOS-en ugyanarra az architektúrára készül, mint a kiadott dmg, nem a --dir kapcsolóval', () => {
    const script: string = olvasJson('package.json').scripts['electron:package:dir'];
    const kiadott = (olvasJson('electron-builder.json').mac.target as { arch: string[] }[]).flatMap((t) => t.arch);
    const helyi = [...script.matchAll(/-c\.mac\.target\.arch=(\S+)/g)].map((m) => m[1]);
    expect(script).not.toMatch(/(^|\s)--dir(\s|$)/);
    expect(script).toMatch(/-c\.mac\.target\.target=dir(\s|$)/);
    expect(helyi).toEqual(kiadott);
  });
});
