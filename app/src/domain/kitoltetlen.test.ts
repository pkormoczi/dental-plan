import { describe, expect, it } from 'vitest';
import {
  araztalanSorok,
  hianyzoCsomagLeirasok,
  inaktivTetelreHivatkozoSorok,
  kitoltetlenSorok,
  nullaOsszeguSorok,
  uresFazisok,
} from './kitoltetlen';
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

describe('uresFazisok', () => {
  it('üres terven üres listát ad', () => {
    expect(uresFazisok(makePlan([]))).toEqual([]);
  });

  it('minden fázisnak van sora -- üres lista', () => {
    const plan = makePlan([[sor({ tetelId: 't1' })], [sor({ tetelId: 't2' })]]);
    expect(uresFazisok(plan)).toEqual([]);
  });

  it('egy 0 soros fázist jelez a nevével', () => {
    const plan = makePlan([[sor({ tetelId: 't1' })], []]);
    expect(uresFazisok(plan)).toEqual([{ fazisIndex: 1, fazisNev: '2. kezelés' }]);
  });

  it('sor felvétele után a fázis eltűnik a listából', () => {
    const uresPlan = makePlan([[]]);
    expect(uresFazisok(uresPlan)).toEqual([{ fazisIndex: 0, fazisNev: '1. kezelés' }]);
    const feltoltottPlan = makePlan([[sor({ tetelId: 't1' })]]);
    expect(uresFazisok(feltoltottPlan)).toEqual([]);
  });
});

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

describe('nullaOsszeguSorok', () => {
  it('névvel ellátott, 0 Ft-os sort jelez', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Egyedi anyagköltség', listaEgysegar: 0, tenylegesEgysegar: 0 })],
    ]);
    expect(nullaOsszeguSorok(plan)).toEqual(['Egyedi anyagköltség']);
  });

  it('névtelen 0 Ft-os sort NEM jelez -- azt a kitoltetlenSorok fedi', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: '', listaEgysegar: 0, tenylegesEgysegar: 0 })],
    ]);
    expect(nullaOsszeguSorok(plan)).toEqual([]);
  });

  it('nem-0 összegű sort nem jelez', () => {
    const plan = makePlan([[sor({ nevSnapshot: 'Fogeltávolítás' })]]);
    expect(nullaOsszeguSorok(plan)).toEqual([]);
  });

  it('a sorOsszeg-et (mennyiseg * egységár) nézi, nem csak az egységárat', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Nulla darab', mennyiseg: 0, tenylegesEgysegar: 5000, listaEgysegar: 5000 })],
    ]);
    expect(nullaOsszeguSorok(plan)).toEqual(['Nulla darab']);
  });

  it('több fázison át a terv-sorrendet követi', () => {
    const plan = makePlan([
      [sor({ nevSnapshot: 'Első' }), sor({ nevSnapshot: 'Nulla A', tenylegesEgysegar: 0 })],
      [sor({ nevSnapshot: 'Nulla B', tenylegesEgysegar: 0 }), sor({ nevSnapshot: 'Utolsó' })],
    ]);
    expect(nullaOsszeguSorok(plan)).toEqual(['Nulla A', 'Nulla B']);
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
    {
      id: 't-inaktiv',
      kategoriaId: 'k1',
      sorrend: 3,
      aktiv: false,
      gyakori: false,
      nev: { hu: 'Kivont tétel', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
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

describe('araztalanSorok', () => {
  it('a terv pénznemében beárazatlan, 0 Ft-os, névvel ellátott sort jelez', () => {
    const plan = { ...makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: 'All-on-4 csomag', listaEgysegar: 0, tenylegesEgysegar: 0 })]]), penznem: 'EUR' as const };
    expect(araztalanSorok(plan, priceList)).toEqual(['All-on-4 csomag']);
  });

  it('kézi ajánlati árat kapott, beárazatlan sort NEM jelez -- a doki már döntött', () => {
    const plan = { ...makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: 'All-on-4 csomag', listaEgysegar: 0, tenylegesEgysegar: 250000 })]]), penznem: 'EUR' as const };
    expect(araztalanSorok(plan, priceList)).toEqual([]);
  });

  it('egyedi (tetelId nélküli) sort nem jelez -- nem "hiányzó ár", hanem a sor jellege', () => {
    const plan = { ...makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi sor', listaEgysegar: 0, tenylegesEgysegar: 0 })]]), penznem: 'EUR' as const };
    expect(araztalanSorok(plan, priceList)).toEqual([]);
  });

  it('beárazott tételnél nem jelez, akkor sem, ha a jelenlegi ajánlati ár 0', () => {
    const plan = { ...makePlan([[sor({ tetelId: 't-nem-csomag', nevSnapshot: 'Fognyaki tömés', listaEgysegar: 25000, tenylegesEgysegar: 0 })]]), penznem: 'HUF' as const };
    expect(araztalanSorok(plan, priceList)).toEqual([]);
  });

  it('meg nem nevezett sort nem jelez -- azt a kitoltetlenSorok kemény blokkja fedi', () => {
    const plan = { ...makePlan([[sor({ tetelId: 't-csomag', nevSnapshot: '', listaEgysegar: 0, tenylegesEgysegar: 0 })]]), penznem: 'EUR' as const };
    expect(araztalanSorok(plan, priceList)).toEqual([]);
  });
});

describe('inaktivTetelreHivatkozoSorok', () => {
  it('inaktív tételre mutató, névvel ellátott sort jelez', () => {
    const plan = makePlan([[sor({ tetelId: 't-inaktiv', nevSnapshot: 'Kivont tétel' })]]);
    expect(inaktivTetelreHivatkozoSorok(plan, priceList)).toEqual(['Kivont tétel']);
  });

  it('aktív tételre mutató sort nem jelez', () => {
    const plan = makePlan([[sor({ tetelId: 't-nem-csomag', nevSnapshot: 'Fognyaki tömés' })]]);
    expect(inaktivTetelreHivatkozoSorok(plan, priceList)).toEqual([]);
  });

  it('egyedi (tetelId nélküli) sort nem jelez -- nincs mihez viszonyítani', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi sor' })]]);
    expect(inaktivTetelreHivatkozoSorok(plan, priceList)).toEqual([]);
  });

  it('meg nem nevezett sort nem jelez, akkor sem, ha a tétele inaktív', () => {
    const plan = makePlan([[sor({ tetelId: 't-inaktiv', nevSnapshot: '' })]]);
    expect(inaktivTetelreHivatkozoSorok(plan, priceList)).toEqual([]);
  });
});
