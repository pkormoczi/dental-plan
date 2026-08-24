import { describe, expect, it } from 'vitest';
import { fazisCsukvaMozgatasUtan, fazisCsukvaTorlesUtan, fazisokFelcserelve } from './fazisSorrend';
import type { Fazis } from './types';

function fazis(sorszam: number, megnevezes: string): Fazis {
  return { sorszam, megnevezes, megjegyzes: '', sorok: [] };
}

describe('fazisokFelcserelve', () => {
  it('felcseréli a két fázis TARTALMÁT, a generált neveket a pozícióhoz igazítja', () => {
    // Mindkét fázis neve generált -- a mozgatás a pozíció szerint
    // renaming-eli mindkettőt ÚJRA a saját (immár másik) helyére, ezért a
    // névsor önmagában változatlan marad, holott a tartalom (itt: a
    // megjegyzés mint egyedi jelölő) ténylegesen felcserélődik.
    const fazisok = [
      { ...fazis(1, '1. kezelés'), megjegyzes: 'A' },
      { ...fazis(2, '2. kezelés'), megjegyzes: 'B' },
      { ...fazis(3, '3. kezelés'), megjegyzes: 'C' },
    ];
    const next = fazisokFelcserelve(fazisok, 0, 1);
    expect(next.map((f) => f.megnevezes)).toEqual(['1. kezelés', '2. kezelés', '3. kezelés']);
    expect(next.map((f) => f.megjegyzes)).toEqual(['B', 'A', 'C']);
    expect(next.map((f) => f.sorszam)).toEqual([1, 2, 3]);
  });

  it('kézzel átírt fázisnevet nem bánt, csak a generáltakat frissíti', () => {
    const fazisok = [fazis(1, 'Fogpótlás'), fazis(2, '2. kezelés')];
    const next = fazisokFelcserelve(fazisok, 0, 1);
    // A kézzel átírt "Fogpótlás" változatlan marad, csak pozíciót vált; a
    // generált "2. kezelés" az új (1.) pozíciójára igazodik.
    expect(next.map((f) => f.megnevezes)).toEqual(['1. kezelés', 'Fogpótlás']);
  });

  it('nem mutálja az eredeti tömböt', () => {
    const fazisok = [fazis(1, '1. kezelés'), fazis(2, '2. kezelés')];
    fazisokFelcserelve(fazisok, 0, 1);
    expect(fazisok.map((f) => f.megnevezes)).toEqual(['1. kezelés', '2. kezelés']);
  });
});

describe('fazisCsukvaTorlesUtan', () => {
  it('a törölt index alatti tagok változatlanok, a fölötte lévők eggyel lejjebb tolódnak', () => {
    const csukva = new Set([0, 2, 3]);
    const next = fazisCsukvaTorlesUtan(csukva, 2);
    expect(next).toEqual(new Set([0, 2]));
  });

  it('üres halmazra üres halmazt ad', () => {
    expect(fazisCsukvaTorlesUtan(new Set(), 0)).toEqual(new Set());
  });
});

describe('fazisCsukvaMozgatasUtan', () => {
  it('felcseréli a két index tagságát', () => {
    const csukva = new Set([1]);
    const next = fazisCsukvaMozgatasUtan(csukva, 0, 1);
    expect(next).toEqual(new Set([0]));
  });

  it('ha egyik index sem csukott, üres marad', () => {
    expect(fazisCsukvaMozgatasUtan(new Set(), 0, 1)).toEqual(new Set());
  });

  it('ha mindkét index csukott, mindkettő csukott marad', () => {
    const csukva = new Set([0, 1]);
    expect(fazisCsukvaMozgatasUtan(csukva, 0, 1)).toEqual(new Set([0, 1]));
  });
});
