import { describe, expect, it } from 'vitest';
import { LEIRAS_FIGYELMEZTETES_KARAKTER, leirasTulHosszu } from './leirasHossz';

describe('leirasTulHosszu', () => {
  it('rövid, kevés soros szöveg nem lóg túl a határon', () => {
    expect(leirasTulHosszu('Implantátum\nFelépítmény\nKorona')).toBe(false);
  });

  it('a karakterhatár alatt hamis, fölötte igaz', () => {
    expect(leirasTulHosszu('a'.repeat(LEIRAS_FIGYELMEZTETES_KARAKTER))).toBe(false);
    expect(leirasTulHosszu('a'.repeat(LEIRAS_FIGYELMEZTETES_KARAKTER + 1))).toBe(true);
  });

  it('a sorhatár fölötti sorszám igaz, akkor is, ha a karakterszám kicsi', () => {
    const hatSoros = ['a', 'b', 'c', 'd', 'e', 'f'].join('\n');
    expect(leirasTulHosszu(hatSoros)).toBe(true);
  });
});
