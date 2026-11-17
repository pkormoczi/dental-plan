import { beforeEach, describe, expect, it } from 'vitest';
import type { FajlPrimitivek } from './fajlPrimitivek';
import { localStoragePrimitivek } from './localStoragePrimitivek';
import { MemoriaPrimitivek } from './memoriaPrimitivek';

const megvalositasok: Array<[string, () => FajlPrimitivek]> = [
  ['memória', () => new MemoriaPrimitivek()],
  [
    'localStorage',
    () => {
      localStorage.clear();
      return localStoragePrimitivek;
    },
  ],
];

describe.each(megvalositasok)('fájlprimitívek (%s)', (_nev, keszit) => {
  let prim: FajlPrimitivek;
  beforeEach(() => {
    prim = keszit();
  });

  it('a szöveg és a bájtok visszaolvashatók, nem létező fájlra null', async () => {
    await prim.irSzoveg('a/b.json', '{"x":1}');
    await prim.irBajt('a/c.pdf', new Uint8Array([0, 255, 7]));
    expect(await prim.olvasSzoveg('a/b.json')).toBe('{"x":1}');
    expect(await prim.olvasBajt('a/c.pdf')).toEqual(new Uint8Array([0, 255, 7]));
    expect(await prim.olvasSzoveg('a/nincs.json')).toBeNull();
  });

  it('a listázás a közvetlen gyerekeket adja, a gyökérét is', async () => {
    await prim.irSzoveg('gyoker.json', '1');
    await prim.irSzoveg('mappa/al/x.json', '2');
    await prim.irSzoveg('mappa/y.json', '3');
    expect((await prim.listaz('')).sort()).toEqual(['gyoker.json', 'mappa']);
    expect((await prim.listaz('mappa')).sort()).toEqual(['al', 'y.json']);
    expect(await prim.listaz('nincs')).toEqual([]);
  });

  it('a mappa törlése nem érinti azt a testvért, aminek a neve a törölt előtagja', async () => {
    await prim.irSzoveg('p/Kis-Bela/a.json', '1');
    await prim.irSzoveg('p/Kis-Bela-Junior/a.json', '2');
    await prim.torolMappa('p/Kis-Bela');
    expect(await prim.letezik('p/Kis-Bela')).toBe(false);
    expect(await prim.olvasSzoveg('p/Kis-Bela-Junior/a.json')).toBe('2');
  });

  it('az átnevezés a mappa teljes tartalmát viszi, létező célra hibát ad', async () => {
    await prim.irSzoveg('t/tmp/terv.json', 'T');
    await prim.irBajt('t/tmp/pdf', new Uint8Array([1]));
    await prim.atnevez('t/tmp', 't/v1');
    expect(await prim.letezik('t/tmp')).toBe(false);
    expect(await prim.olvasSzoveg('t/v1/terv.json')).toBe('T');
    expect(await prim.olvasBajt('t/v1/pdf')).toEqual(new Uint8Array([1]));

    await prim.irSzoveg('t/tmp2/terv.json', 'U');
    await expect(prim.atnevez('t/tmp2', 't/v1')).rejects.toThrow(/már létezik/);
    expect(await prim.olvasSzoveg('t/v1/terv.json')).toBe('T');
  });

  it('a létrehozott mappa nem ír felül tartalmat, és a törölt fájl eltűnik', async () => {
    await prim.irSzoveg('m/f.json', '1');
    await prim.mappaLetrehoz('m');
    expect(await prim.olvasSzoveg('m/f.json')).toBe('1');
    await prim.torol('m/f.json');
    expect(await prim.olvasSzoveg('m/f.json')).toBeNull();
    await prim.torol('m/f.json');
  });
});
