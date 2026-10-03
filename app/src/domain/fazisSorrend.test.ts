import { describe, expect, it } from 'vitest';
import {
  fazisCsukvaMozgatasUtan,
  fazisCsukvaTorlesUtan,
  fazisokFelcserelve,
  sorAthelyezve,
} from './fazisSorrend';
import type { Fazis, Sor } from './types';

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
      { ...fazis(1, '1. fázis'), megjegyzes: 'A' },
      { ...fazis(2, '2. fázis'), megjegyzes: 'B' },
      { ...fazis(3, '3. fázis'), megjegyzes: 'C' },
    ];
    const next = fazisokFelcserelve(fazisok, 0, 1);
    expect(next.map((f) => f.megnevezes)).toEqual(['1. fázis', '2. fázis', '3. fázis']);
    expect(next.map((f) => f.megjegyzes)).toEqual(['B', 'A', 'C']);
    expect(next.map((f) => f.sorszam)).toEqual([1, 2, 3]);
  });

  it('kézzel átírt fázisnevet nem bánt, csak a generáltakat frissíti', () => {
    const fazisok = [fazis(1, 'Fogpótlás'), fazis(2, '2. fázis')];
    const next = fazisokFelcserelve(fazisok, 0, 1);
    // A kézzel átírt "Fogpótlás" változatlan marad, csak pozíciót vált; a
    // generált "2. fázis" az új (1.) pozíciójára igazodik.
    expect(next.map((f) => f.megnevezes)).toEqual(['1. fázis', 'Fogpótlás']);
  });

  it('nem mutálja az eredeti tömböt', () => {
    const fazisok = [fazis(1, '1. fázis'), fazis(2, '2. fázis')];
    fazisokFelcserelve(fazisok, 0, 1);
    expect(fazisok.map((f) => f.megnevezes)).toEqual(['1. fázis', '2. fázis']);
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

describe('sorAthelyezve', () => {
  function sor(nev: string): Sor {
    return {
      tetelId: nev,
      nevSnapshot: nev,
      savos: false,
      fogak: '',
      mennyiseg: 1,
      listaEgysegar: 1000,
      tenylegesEgysegar: 1000,
    };
  }
  function terv(): Fazis[] {
    return [
      { ...fazis(1, 'Előkészítés'), sorok: [sor('A'), sor('B'), sor('C')] },
      { ...fazis(2, '2. fázis'), sorok: [sor('D'), sor('E')] },
    ];
  }
  const nevek = (f: Fazis[]) => f.map((x) => x.sorok.map((s) => s.nevSnapshot));

  it('fázison belül hátrébb viszi a sort a megadott végső indexre', () => {
    expect(nevek(sorAthelyezve(terv(), { pi: 0, li: 0 }, { pi: 0, li: 2 }))).toEqual([
      ['B', 'C', 'A'],
      ['D', 'E'],
    ]);
  });

  it('fázison belül előrébb viszi a sort', () => {
    expect(nevek(sorAthelyezve(terv(), { pi: 0, li: 2 }, { pi: 0, li: 0 }))).toEqual([
      ['C', 'A', 'B'],
      ['D', 'E'],
    ]);
  });

  it('másik fázis adott pozíciójára teszi a sort, a forrásfázisból kiveszi', () => {
    expect(nevek(sorAthelyezve(terv(), { pi: 0, li: 1 }, { pi: 1, li: 1 }))).toEqual([
      ['A', 'C'],
      ['D', 'B', 'E'],
    ]);
  });

  it('a célfázis hosszán túli index a fázis végére tesz', () => {
    expect(nevek(sorAthelyezve(terv(), { pi: 1, li: 0 }, { pi: 0, li: 99 }))).toEqual([
      ['A', 'B', 'C', 'D'],
      ['E'],
    ]);
  });

  it('üres fázisba is áthelyez', () => {
    const f = [...terv(), fazis(3, '3. fázis')];
    expect(nevek(sorAthelyezve(f, { pi: 0, li: 0 }, { pi: 2, li: 0 }))[2]).toEqual(['A']);
  });

  it('nem mutálja az eredeti tömböket, a fázisnév és a sorszam változatlan', () => {
    const eredeti = terv();
    const next = sorAthelyezve(eredeti, { pi: 0, li: 0 }, { pi: 1, li: 0 });
    expect(nevek(eredeti)).toEqual([
      ['A', 'B', 'C'],
      ['D', 'E'],
    ]);
    expect(next.map((x) => [x.sorszam, x.megnevezes])).toEqual([
      [1, 'Előkészítés'],
      [2, '2. fázis'],
    ]);
  });
});
