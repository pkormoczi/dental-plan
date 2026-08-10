import { describe, expect, it } from 'vitest';
import { hianyzoCsomagLeirasok, kitoltetlenSorok } from './kitoltetlen';
import type { Plan, PriceList, Sor } from './types';

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

  it('minden sor megnevezett -- üres lista', () => {
    const plan = makePlan([[sor({ tetelId: 't1' }), sor({ tetelId: 't2' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([]);
  });

  it('egy meg nem nevezett sort jelez a fázis nevével és a fogszámmal', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: '', fogak: '16' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([
      { fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 0, fogak: '16' },
    ]);
  });

  it('csak whitespace-t tartalmazó nevSnapshot is kitöltetlennek számít', () => {
    const plan = makePlan([[sor({ nevSnapshot: '   ' })]]);
    expect(kitoltetlenSorok(plan)).toHaveLength(1);
  });

  it('backlog-3: névvel ellátott, tetelId nélküli (egyedi) sor NEM kitöltetlen', () => {
    const plan = makePlan([
      [sor({ tetelId: '', nevSnapshot: 'Egyedi anyagköltség', listaEgysegar: 0, tenylegesEgysegar: 0 })],
    ]);
    expect(kitoltetlenSorok(plan)).toEqual([]);
  });

  it('backlog-3: meg nem nevezett sor kitöltetlen akkor is, ha van rajta ár', () => {
    const plan = makePlan([
      [sor({ tetelId: '', nevSnapshot: '', listaEgysegar: 5000, tenylegesEgysegar: 5000 })],
    ]);
    expect(kitoltetlenSorok(plan)).toHaveLength(1);
  });

  it('több fázison és soron át a terv-sorrendet követi', () => {
    const plan = makePlan([
      [sor({ tetelId: 't1' }), sor({ tetelId: '', nevSnapshot: '', fogak: '16' })],
      [sor({ tetelId: '', nevSnapshot: '', fogak: '26' }), sor({ tetelId: 't2' })],
    ]);
    expect(kitoltetlenSorok(plan)).toEqual([
      { fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 1, fogak: '16' },
      { fazisIndex: 1, fazisNev: '2. kezelés', sorIndex: 0, fogak: '26' },
    ]);
  });

  it('MÁS, mint a hianyzoTetel -- nem néz árlistát, csak a nevet nézi', () => {
    // Egy nem-létező (törölt) tetelId-jű, de KITÖLTÖTT (megnevezett) sor nem kitöltetlen.
    const plan = makePlan([[sor({ tetelId: 't-torolve' })]]);
    expect(kitoltetlenSorok(plan)).toEqual([]);
  });
});

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    {
      id: 't-csomag',
      kategoriaId: 'k1',
      sorrend: 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'All-on-4 csomag', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 1950000 }, EUR: null },
      csomag: true,
    },
    {
      id: 't-nem-csomag',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Fognyaki tömés', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 25000 }, EUR: null },
      csomag: false,
    },
  ],
};

describe('hianyzoCsomagLeirasok', () => {
  it('csomag tételre hivatkozó, üres leírású sort jelez', () => {
    const plan = makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: 'All-on-4 csomag' })]]);
    expect(hianyzoCsomagLeirasok(plan, priceList)).toEqual([
      { fazisIndex: 0, fazisNev: '1. kezelés', sorIndex: 0, nev: 'All-on-4 csomag' },
    ]);
  });

  it('csomag tételre hivatkozó, kitöltött leírású sort nem jelez', () => {
    const plan = makePlan([
      [
        sor({
          tetelId: 't-csomag',
          nevSnapshot: 'All-on-4 csomag',
          leirasSnapshot: 'Implantátum\nFelépítmény',
        }),
      ],
    ]);
    expect(hianyzoCsomagLeirasok(plan, priceList)).toEqual([]);
  });

  it('nem csomag tételre hivatkozó, üres leírású sort nem jelez', () => {
    const plan = makePlan([[sor({ tetelId: 't-nem-csomag', nevSnapshot: 'Fognyaki tömés' })]]);
    expect(hianyzoCsomagLeirasok(plan, priceList)).toEqual([]);
  });

  it('egyedi (tetelId nélküli) sort nem jelez -- nincs mihez viszonyítani', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi sor' })]]);
    expect(hianyzoCsomagLeirasok(plan, priceList)).toEqual([]);
  });
});
