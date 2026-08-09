import { describe, expect, it } from 'vitest';
import { kitoltetlenSorok } from './kitoltetlen';
import type { Plan, Sor } from './types';

function sor(partial: Partial<Sor>): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Teszt tétel',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 1000,
    tenylegesEgysegar: 1000,
    ...partial,
  };
}

function makePlan(fazisok: Sor[][]): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-01-01',
    ervenyesIg: '2026-02-01',
    arlistaVerzio: '2026-01-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
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
    fazisok: fazisok.map((sorok, i) => ({
      sorszam: i + 1,
      megnevezes: `${i + 1}. kezelés`,
      megjegyzes: '',
      sorok,
    })),
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

describe('kitoltetlenSorok', () => {
  it('üres terven üres listát ad', () => {
    expect(kitoltetlenSorok(makePlan([]))).toEqual([]);
  });

  it('minden sor kitöltött -- üres lista', () => {
    const plan = makePlan([[sor({ tetelId: 't1' }), sor({ tetelId: 't2' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([]);
  });

  it('egy tetelId nélküli sort jelez a fázis nevével és a fogszámmal', () => {
    const plan = makePlan([[sor({ tetelId: '', fogak: '16' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([
      { fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 0, fogak: '16' },
    ]);
  });

  it('csak whitespace-t tartalmazó tetelId is kitöltetlennek számít', () => {
    const plan = makePlan([[sor({ tetelId: '   ' })]]);
    expect(kitoltetlenSorok(plan)).toHaveLength(1);
  });

  it('több fázison és soron át a terv-sorrendet követi', () => {
    const plan = makePlan([
      [sor({ tetelId: 't1' }), sor({ tetelId: '', fogak: '16' })],
      [sor({ tetelId: '', fogak: '26' }), sor({ tetelId: 't2' })],
    ]);
    expect(kitoltetlenSorok(plan)).toEqual([
      { fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 1, fogak: '16' },
      { fazisIndex: 1, fazisNev: '2. kezelés', sorIndex: 0, fogak: '26' },
    ]);
  });

  it('MÁS, mint a hianyzoTetel -- nem néz árlistát, csak az üres tetelId-t nézi', () => {
    // Egy nem-létező (törölt) tetelId-jű, de KITÖLTÖTT sor nem kitöltetlen.
    const plan = makePlan([[sor({ tetelId: 't-torolve' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([]);
  });
});
