import { describe, expect, it } from 'vitest';
import {
  nincsListaar,
  penznemvaltasHatasa,
  sorPenznemValtassal,
  tervOsszegekPenznemValtassal,
} from './penznemValtas';
import type { Plan, PriceList, Sor } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
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

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [
    {
      id: 't1',
      kategoriaId: 'k1',
      sorrend: 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Mindkét pénznemben', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 45000 }, EUR: { tipus: 'FIX', ertek: 15000 } },
    },
    {
      id: 't2',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Csak HUF-ban', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 20000 }, EUR: null },
    },
    {
      id: 't3',
      kategoriaId: 'k1',
      sorrend: 3,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Sávos mindkét pénznemben', de: null },
      ar: {
        HUF: { tipus: 'SAVOS', min: 30000, max: 50000 },
        EUR: { tipus: 'SAVOS', min: 10000, max: 16000 },
      },
    },
  ],
};

const tetel1 = priceList.tetelek[0]; // beárazott mindkét pénznemben
const tetel2 = priceList.tetelek[1]; // csak HUF-ban beárazott
const tetel3 = priceList.tetelek[2]; // SAVOS mindkét pénznemben

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
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

describe('sorPenznemValtassal', () => {
  it('stash hiányában az árlistából szedi újra az árat (FIX)', () => {
    const s = sor({ tetelId: 't1', listaEgysegar: 45000, tenylegesEgysegar: 45000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel1);
    expect(next.listaEgysegar).toBe(15000);
    expect(next.tenylegesEgysegar).toBe(15000);
    expect(next.masikPenznemAr).toEqual({ listaEgysegar: 45000, tenylegesEgysegar: 45000 });
  });

  it('stash hiányában SAVOS tételnél a min kerül a sorra', () => {
    const s = sor({ tetelId: 't3', listaEgysegar: 30000, tenylegesEgysegar: 30000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel3);
    expect(next.listaEgysegar).toBe(10000);
    expect(next.tenylegesEgysegar).toBe(10000);
  });

  it('a kilépő pénznem árpárja mindig stashelődik, akkor is, ha kézzel átírt', () => {
    const s = sor({ tetelId: 't1', listaEgysegar: 45000, tenylegesEgysegar: 38000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel1);
    expect(next.masikPenznemAr).toEqual({ listaEgysegar: 45000, tenylegesEgysegar: 38000 });
  });

  it('a stash elsőbbséget élvez az árlistával szemben -- kézzel írt érték nem vész el egy oda-vissza váltásban', () => {
    const s = sor({
      tetelId: 't1',
      listaEgysegar: 15000,
      tenylegesEgysegar: 15000,
      masikPenznemAr: { listaEgysegar: 45000, tenylegesEgysegar: 39000 },
    });
    const next = sorPenznemValtassal(s, 'HUF', tetel1);
    expect(next.listaEgysegar).toBe(45000);
    expect(next.tenylegesEgysegar).toBe(39000);
    // A kilépő (EUR) állapot most a masikPenznemAr-be kerül.
    expect(next.masikPenznemAr).toEqual({ listaEgysegar: 15000, tenylegesEgysegar: 15000 });
  });

  it('beárazatlan tétel (nincs ar[ujPenznem]) esetén 0/0 -- "hiányzó ár" állapot, a sor megmarad', () => {
    const s = sor({ tetelId: 't2', listaEgysegar: 20000, tenylegesEgysegar: 20000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel2);
    expect(next.listaEgysegar).toBe(0);
    expect(next.tenylegesEgysegar).toBe(0);
    expect(next.nevSnapshot).toBe(s.nevSnapshot);
  });

  it('egyedi sor (nincs tetel) esetén 0/0', () => {
    const s = sor({ tetelId: '', listaEgysegar: 5000, tenylegesEgysegar: 5000 });
    const next = sorPenznemValtassal(s, 'EUR', undefined);
    expect(next.listaEgysegar).toBe(0);
    expect(next.tenylegesEgysegar).toBe(0);
  });

  it('a savos mező érintetlen marad -- nem pénznemből derivált', () => {
    const s = sor({ tetelId: 't1', savos: true, listaEgysegar: 45000, tenylegesEgysegar: 45000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel1);
    expect(next.savos).toBe(true);
  });

  it('nincs automatikus FX -- a HUF érték sosem lesz belőle számolt EUR érték', () => {
    const s = sor({ tetelId: 't1', listaEgysegar: 45000, tenylegesEgysegar: 45000 });
    const next = sorPenznemValtassal(s, 'EUR', tetel1);
    // Az árlistai EUR ár (15000 cent), NEM a HUF érték átszámítása.
    expect(next.tenylegesEgysegar).toBe(15000);
    expect(next.tenylegesEgysegar).not.toBe(s.tenylegesEgysegar);
  });
});

describe('penznemvaltasHatasa', () => {
  it('stash-elt sor a "visszaall" számlálóba kerül', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [
            sor({
              tetelId: 't1',
              masikPenznemAr: { listaEgysegar: 15000, tenylegesEgysegar: 15000 },
            }),
          ],
        },
      ],
    });
    expect(penznemvaltasHatasa(plan, priceList, 'EUR')).toEqual({
      visszaall: 1,
      arlistabol: 0,
      arNelkul: 0,
      tervSzintu: [],
    });
  });

  it('árlistából beárazható sor az "arlistabol" számlálóba kerül', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [sor({ tetelId: 't1' })],
        },
      ],
    });
    expect(penznemvaltasHatasa(plan, priceList, 'EUR')).toEqual({
      visszaall: 0,
      arlistabol: 1,
      arNelkul: 0,
      tervSzintu: [],
    });
  });

  it('beárazatlan/egyedi sor az "arNelkul" számlálóba kerül', () => {
    const plan = makePlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. kezelés',
          megjegyzes: '',
          sorok: [sor({ tetelId: 't2' }), sor({ tetelId: '', nevSnapshot: 'Egyedi' })],
        },
      ],
    });
    expect(penznemvaltasHatasa(plan, priceList, 'EUR')).toEqual({
      visszaall: 0,
      arlistabol: 0,
      arNelkul: 2,
      tervSzintu: [],
    });
  });

  it('a terv-szintű kedvezmény/előleg "kikapcsol"-ba kerül, ha nincs stashelt pár', () => {
    const plan = makePlan({ kedvezmenyOsszeg: 5000, elolegOsszeg: 20000 });
    expect(penznemvaltasHatasa(plan, priceList, 'EUR').tervSzintu).toEqual([
      { mezo: 'vegosszeg', hatas: 'kikapcsol' },
      { mezo: 'eloleg', hatas: 'kikapcsol' },
    ]);
  });

  it('a terv-szintű kedvezmény/előleg "visszaall"-ba kerül, ha van stashelt pár', () => {
    const plan = makePlan({
      kedvezmenyOsszeg: 5000,
      elolegOsszeg: 20000,
      masikPenznemOsszegek: { kedvezmenyOsszeg: 20, elolegOsszeg: null },
    });
    expect(penznemvaltasHatasa(plan, priceList, 'EUR').tervSzintu).toEqual([
      { mezo: 'vegosszeg', hatas: 'visszaall' },
      { mezo: 'eloleg', hatas: 'kikapcsol' },
    ]);
  });

  it('üres terv-szintű `tervSzintu` tömböt ad, ha egyik mező sincs beállítva', () => {
    expect(penznemvaltasHatasa(makePlan(), priceList, 'EUR').tervSzintu).toEqual([]);
  });
});

describe('tervOsszegekPenznemValtassal', () => {
  it('stash hiányában mindkét mező null-ra vált, a kilépő pár stashelődik', () => {
    const plan = makePlan({ kedvezmenyOsszeg: 5000, elolegOsszeg: 20000 });
    expect(tervOsszegekPenznemValtassal(plan)).toEqual({
      kedvezmenyOsszeg: null,
      elolegOsszeg: null,
      masikPenznemOsszegek: { kedvezmenyOsszeg: 5000, elolegOsszeg: 20000 },
    });
  });

  it('stashelt pár előlép, a kilépő (mostani) pár veszi át a helyét', () => {
    const plan = makePlan({
      kedvezmenyOsszeg: 5000,
      elolegOsszeg: 20000,
      masikPenznemOsszegek: { kedvezmenyOsszeg: 50, elolegOsszeg: 200 },
    });
    expect(tervOsszegekPenznemValtassal(plan)).toEqual({
      kedvezmenyOsszeg: 50,
      elolegOsszeg: 200,
      masikPenznemOsszegek: { kedvezmenyOsszeg: 5000, elolegOsszeg: 20000 },
    });
  });

  it('oda-vissza váltás visszaadja az eredeti értékeket, nincs FX', () => {
    const huf = makePlan({ kedvezmenyOsszeg: 50000, elolegOsszeg: 100000 });
    const eur = { ...huf, ...tervOsszegekPenznemValtassal(huf) };
    expect(eur.kedvezmenyOsszeg).toBeNull();
    expect(eur.elolegOsszeg).toBeNull();

    const vissza = { ...eur, ...tervOsszegekPenznemValtassal(eur) };
    expect(vissza.kedvezmenyOsszeg).toBe(50000);
    expect(vissza.elolegOsszeg).toBe(100000);
    // Nincs automatikus HUF<->EUR átváltás -- a szám sosem lesz `500`.
    expect(vissza.kedvezmenyOsszeg).not.toBe(500);
  });

  it('csupa-null kilépő pár esetén a stash null, nem { null, null } objektum', () => {
    const plan = makePlan();
    expect(tervOsszegekPenznemValtassal(plan)).toEqual({
      kedvezmenyOsszeg: null,
      elolegOsszeg: null,
      masikPenznemOsszegek: null,
    });
  });

  it('csak az egyik mező beállítva -- a másik null-ként kerül a stashbe', () => {
    const plan = makePlan({ kedvezmenyOsszeg: 5000 });
    expect(tervOsszegekPenznemValtassal(plan)).toEqual({
      kedvezmenyOsszeg: null,
      elolegOsszeg: null,
      masikPenznemOsszegek: { kedvezmenyOsszeg: 5000, elolegOsszeg: null },
    });
  });
});

describe('nincsListaar', () => {
  it('igaz, ha a tétel megvan, de nincs ára az adott pénznemben', () => {
    expect(nincsListaar(sor({ tetelId: 't2' }), tetel2, 'EUR')).toBe(true);
  });

  it('hamis, ha a tételnek van ára az adott pénznemben', () => {
    expect(nincsListaar(sor({ tetelId: 't1' }), tetel1, 'EUR')).toBe(false);
  });

  it('hamis egyedi sornál (üres tetelId) -- nem hiány, hanem a sor jellege', () => {
    expect(nincsListaar(sor({ tetelId: '' }), undefined, 'EUR')).toBe(false);
  });

  it('hamis ismeretlen tetelId-nél (a pillanatkép-ár továbbra is érvényes)', () => {
    expect(nincsListaar(sor({ tetelId: 'regi-torolt' }), undefined, 'EUR')).toBe(false);
  });
});
