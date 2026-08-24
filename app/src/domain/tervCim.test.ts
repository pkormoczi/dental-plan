import { describe, expect, it } from 'vitest';
import { ALAPERTELMEZETT_TERV_CIM, javasoltTervCim, megjelenitettTervCim } from './tervCim';
import type { Kategoria, Plan, PriceList, Sor, Tetel } from './types';

function kategoria(id: string, sorrend: number, nevHu: string): Kategoria {
  return { id, nev: { hu: nevHu, de: null }, sorrend };
}

function tetel(id: string, kategoriaId: string): Tetel {
  return {
    id,
    kategoriaId,
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: id, de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 1000 }, EUR: null },
  };
}

function makePriceList(tetelek: Tetel[], kategoriak: Kategoria[]): PriceList {
  return {
    schemaVersion: 1,
    arlistaVerzio: '2026-01-01',
    modositva: '2026-01-01',
    kategoriak,
    tetelek,
  };
}

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

function makePlan(sorok: Sor[]): Plan {
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
    fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok }],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

const KAT_KONZULTACIO = kategoria('k01', 1, 'Diagnosztika és konzultáció');
const KAT_IMPLANT = kategoria('k05', 5, 'Implantológia');
const KAT_TOMES = kategoria('k02', 2, 'Tömés');

describe('javasoltTervCim', () => {
  it('a legnagyobb összegű kategóriát javasolja, nem a legkisebb sorrendűt', () => {
    const priceList = makePriceList(
      [tetel('t01', 'k01'), tetel('t05', 'k05')],
      [KAT_KONZULTACIO, KAT_IMPLANT],
    );
    const plan = makePlan([
      sor({ tetelId: 't01', mennyiseg: 1, tenylegesEgysegar: 15000 }),
      sor({ tetelId: 't05', mennyiseg: 4, tenylegesEgysegar: 300000 }),
    ]);
    expect(javasoltTervCim(plan, priceList)).toBe('Implantológia');
  });

  it('holtversenynél a kisebb sorrendű kategória nyer', () => {
    const priceList = makePriceList(
      [tetel('t01', 'k01'), tetel('t02', 'k02')],
      [KAT_KONZULTACIO, KAT_TOMES],
    );
    const plan = makePlan([
      sor({ tetelId: 't01', mennyiseg: 1, tenylegesEgysegar: 10000 }),
      sor({ tetelId: 't02', mennyiseg: 1, tenylegesEgysegar: 10000 }),
    ]);
    expect(javasoltTervCim(plan, priceList)).toBe('Diagnosztika és konzultáció');
  });

  it('egyedi (tetelId nélküli) sort kihagyja az összegzésből', () => {
    const priceList = makePriceList([tetel('t01', 'k01')], [KAT_KONZULTACIO]);
    const plan = makePlan([
      sor({ tetelId: '', nevSnapshot: 'Egyedi tétel', mennyiseg: 1, tenylegesEgysegar: 5000000 }),
      sor({ tetelId: 't01', mennyiseg: 1, tenylegesEgysegar: 1000 }),
    ]);
    expect(javasoltTervCim(plan, priceList)).toBe('Diagnosztika és konzultáció');
  });

  it('üres tervnél az alapértelmezett címre esik vissza', () => {
    const priceList = makePriceList([], []);
    expect(javasoltTervCim(makePlan([]), priceList)).toBe(ALAPERTELMEZETT_TERV_CIM);
  });

  it('csak azóta törölt tételre/kategóriára mutató sorok esetén az alapértelmezettre esik vissza', () => {
    const priceList = makePriceList([], []);
    const plan = makePlan([sor({ tetelId: 't99', mennyiseg: 1, tenylegesEgysegar: 100000 })]);
    expect(javasoltTervCim(plan, priceList)).toBe(ALAPERTELMEZETT_TERV_CIM);
  });
});

describe('megjelenitettTervCim', () => {
  it('kézzel átírt címkét ad vissza, ha van', () => {
    const priceList = makePriceList([], []);
    expect(megjelenitettTervCim('Fogpótlás', makePlan([]), priceList)).toBe('Fogpótlás');
  });

  it('null címkénél a javaslatra esik vissza', () => {
    const priceList = makePriceList([tetel('t01', 'k01')], [KAT_KONZULTACIO]);
    const plan = makePlan([sor({ tetelId: 't01', mennyiseg: 1, tenylegesEgysegar: 1000 })]);
    expect(megjelenitettTervCim(null, plan, priceList)).toBe('Diagnosztika és konzultáció');
  });
});
