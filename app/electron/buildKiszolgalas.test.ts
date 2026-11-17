import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildFajlUtvonal, mimeTipus } from './buildKiszolgalas.js';
import { APP_ORIGIN } from './protocol.js';

const GYOKER = path.join(os.tmpdir(), 'renderer-build');

const mappanBelul = (fajl: string) => {
  const viszony = path.relative(GYOKER, fajl);
  return viszony !== '' && !viszony.startsWith('..') && !path.isAbsolute(viszony);
};

describe('buildFajlUtvonal', () => {
  it('a build-mappán belüli asset a saját fájljára oldódik fel', () => {
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/assets/NotoSans-Regular.ttf`)).toBe(
      path.join(GYOKER, 'assets', 'NotoSans-Regular.ttf'),
    );
  });

  it('a gyökér kérése az index.html-t szolgálja ki', () => {
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/`)).toBe(path.join(GYOKER, 'index.html'));
  });

  it('a kódolt ékezetes fájlnév dekódolva oldódik fel', () => {
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/assets/m%C3%A1ndoki.png`)).toBe(
      path.join(GYOKER, 'assets', 'mándoki.png'),
    );
  });

  it('kódolt perjellel és kódolt ..-tal sem lép ki a build-mappából', () => {
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/..%2F..%2Fsecret.json`)).toBeNull();
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/%2e%2e%2fsecret.json`)).toBeNull();
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/assets/%2E%2E%2F%2E%2E%2Fsecret.json`)).toBeNull();
  });

  it('a mappán kívülre mutató kérés (.., visszaperjel, abszolút út) sosem old fel a build-mappán kívüli fájlra', () => {
    const kerések = [
      `${APP_ORIGIN}/../secret.json`,
      `${APP_ORIGIN}/assets/../../secret.json`,
      `${APP_ORIGIN}/..%5C..%5Csecret.json`,
      `${APP_ORIGIN}/C:/Windows/win.ini`,
      `${APP_ORIGIN}/%2Fetc%2Fpasswd`,
      `${APP_ORIGIN}//etc/passwd`,
    ];
    for (const keres of kerések) {
      const fajl = buildFajlUtvonal(GYOKER, keres);
      expect(fajl === null || mappanBelul(fajl), keres).toBe(true);
    }
  });

  it('idegen hoszt, null bájt és hibás kódolás elutasítva', () => {
    expect(buildFajlUtvonal(GYOKER, 'app://mas-hoszt/index.html')).toBeNull();
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/index.html%00.png`)).toBeNull();
    expect(buildFajlUtvonal(GYOKER, `${APP_ORIGIN}/%E0%A4%A`)).toBeNull();
  });
});

describe('mimeTipus', () => {
  it('a font, a wasm és az ismeretlen kiterjesztés típusa', () => {
    expect(mimeTipus('a/NotoSans.TTF')).toBe('font/ttf');
    expect(mimeTipus('a/yoga.wasm')).toBe('application/wasm');
    expect(mimeTipus('a/ismeretlen.xyz')).toBe('application/octet-stream');
  });
});
