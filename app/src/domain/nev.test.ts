import { describe, expect, it } from 'vitest';
import { fallbackSorok, resolveNev } from './nev';
import type { Plan, PriceList } from './types';

describe('resolveNev', () => {
  it('returns the hu name for hu', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: 'Zahnextraktion' }, 'hu')).toEqual({
      szoveg: 'Fogeltávolítás',
      fallback: false,
    });
  });

  it('returns the de name for de when present', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: 'Zahnextraktion' }, 'de')).toEqual({
      szoveg: 'Zahnextraktion',
      fallback: false,
    });
  });

  it('falls back to hu for de when no de name exists, and flags it', () => {
    expect(resolveNev({ hu: 'Fogeltávolítás', de: null }, 'de')).toEqual({
      szoveg: 'Fogeltávolítás',
      fallback: true,
    });
  });
});

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    { id: 't1', kategoriaId: 'k1', sorrend: 1, aktiv: true, gyakori: false, nev: { hu: 'Van DE', de: 'Hat DE' }, ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null } },
    { id: 't2', kategoriaId: 'k1', sorrend: 2, aktiv: true, gyakori: false, nev: { hu: 'Nincs DE', de: null }, ar: { HUF: { tipus: 'FIX', ertek: 2000 }, EUR: null } },
  ],
};

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'de',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-de-v1',
    orvos: 'Dr. Teszt',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

describe('fallbackSorok', () => {
  it('returns an empty list for a hu plan (never falls back)', () => {
    const plan = makePlan({
      nyelv: 'hu',
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't2', nevSnapshot: 'Nincs DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 2000, tenylegesEgysegar: 2000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual([]);
  });

  it('lists snapshot names whose item has no de name', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 't1', nevSnapshot: 'Hat DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
            { tetelId: 't2', nevSnapshot: 'Nincs DE', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 2000, tenylegesEgysegar: 2000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual(['Nincs DE']);
  });

  it('does not warn for a tetelId no longer in the price list', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            { tetelId: 'ismeretlen', nevSnapshot: 'Régi tétel', savos: false, fogak: '', mennyiseg: 1, listaEgysegar: 1000, tenylegesEgysegar: 1000 },
          ],
        },
      ],
    });
    expect(fallbackSorok(plan, priceList)).toEqual([]);
  });
});
