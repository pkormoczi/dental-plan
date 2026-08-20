import { describe, expect, it } from 'vitest';
import { igazolatlanNemetKategoriak, igazolatlanNemetNevek, nemetNeveIgazolt } from './nemetNev';
import type { Kategoria, Plan, PriceList, Sor, Tetel } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 10000,
    tenylegesEgysegar: 10000,
    ...partial,
  };
}

function makePlan(fazisok: Sor[][], overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz: 'PISZKOZAT',
    nyelv: 'de',
    penznem: 'HUF',
    keltezes: '2026-01-01',
    ervenyesIg: '2026-02-01',
    arlistaVerzio: '2026-01-01',
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
    fazisok: fazisok.map((sorok, i) => ({
      sorszam: i + 1,
      megnevezes: `${i + 1}. kezelés`,
      megjegyzes: '',
      sorok,
    })),
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

const kategoriak: Kategoria[] = [{ id: 'k1', nev: { hu: 'Sebészet', de: null }, sorrend: 1, szin: '#ff6b6b' }];

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak,
  tetelek: [
    {
      id: 't1',
      kategoriaId: 'k1',
      sorrend: 1,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Fogeltávolítás', de: null },
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
    },
    {
      id: 't-forditott',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Fogkő eltávolítás', de: 'Zahnsteinentfernung' },
      ar: { HUF: { tipus: 'FIX', ertek: 5000 }, EUR: null },
    },
  ],
};

const tetelById = new Map<string, Tetel>(priceList.tetelek.map((x) => [x.id, x]));
const tetel1 = tetelById.get('t1'); // nincs de neve
const tetelForditott = tetelById.get('t-forditott'); // van de neve

describe('nemetNeveIgazolt', () => {
  it('igaz, ha a sor az árlistai német nevet követi', () => {
    expect(nemetNeveIgazolt(sor({ tetelId: 't-forditott', nevSnapshot: 'Zahnsteinentfernung' }), tetelForditott)).toBe(true);
  });

  it('hamis fordítatlan tétel érintetlen (magyar visszaesésű) sorára', () => {
    expect(nemetNeveIgazolt(sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás' }), tetel1)).toBe(false);
  });

  it('igaz, ha a fordítatlan tételhez kézzel németre igazolt szöveget írtak', () => {
    const igazolt = sor({
      tetelId: 't1',
      nevSnapshot: 'Zahnextraktion',
      nevNyelv: { authoredInLanguage: 'de' },
    });
    expect(nemetNeveIgazolt(igazolt, tetel1)).toBe(true);
  });

  it('hamis, ha a kézzel írt szöveg nem igazoltan németül van (nincs nevNyelv)', () => {
    expect(nemetNeveIgazolt(sor({ tetelId: 't1', nevSnapshot: 'Zahnextraktion' }), tetel1)).toBe(false);
  });

  it('hamis, ha a nevNyelv más nyelvre igazolt (mismatch)', () => {
    const mismatch = sor({
      tetelId: 't1',
      nevSnapshot: 'Kézzel átírt',
      nevNyelv: { authoredInLanguage: 'hu' },
    });
    expect(nemetNeveIgazolt(mismatch, tetel1)).toBe(false);
  });

  it('igaz, ha a nevNyelv HU-n íródott, de review-olva lett DE-re', () => {
    const reviewolt = sor({
      tetelId: 't1',
      nevSnapshot: 'Fordítva',
      nevNyelv: { authoredInLanguage: 'hu', reviewedForLanguage: 'de' },
    });
    expect(nemetNeveIgazolt(reviewolt, tetel1)).toBe(true);
  });

  it('igaz üres nevSnapshot-nál -- a kitoltetlenSorok kemény blokkja fedi', () => {
    expect(nemetNeveIgazolt(sor({ tetelId: '', nevSnapshot: '' }), undefined)).toBe(true);
  });

  it('igaz egyedi (árlistán kívüli), igazoltan németül írt sornál', () => {
    const egyedi = sor({
      tetelId: '',
      nevSnapshot: 'Egyedi anyagköltség',
      nevNyelv: { authoredInLanguage: 'de' },
    });
    expect(nemetNeveIgazolt(egyedi, undefined)).toBe(true);
  });

  it('igaz törölt (a mai árlistában nem található) tetelId-re mutató sornál', () => {
    expect(nemetNeveIgazolt(sor({ tetelId: 'torolve', nevSnapshot: 'Régi tétel' }), undefined)).toBe(true);
  });
});

describe('igazolatlanNemetNevek', () => {
  it('magyar terven üres eredményt ad', () => {
    const plan = makePlan([[sor({ tetelId: 't1' })]], { nyelv: 'hu' });
    expect(igazolatlanNemetNevek(plan, priceList)).toEqual({ nincsArlistaiNev: [], ellenorizetlenKeziNev: [] });
  });

  it('fordítatlan tétel érintetlen sora a "nincsArlistaiNev" csoportba kerül', () => {
    const plan = makePlan([[sor({ tetelId: 't1', nevSnapshot: 'Fogeltávolítás' })]]);
    expect(igazolatlanNemetNevek(plan, priceList)).toEqual({
      nincsArlistaiNev: ['Fogeltávolítás'],
      ellenorizetlenKeziNev: [],
    });
  });

  it('DE terven felvett egyedi sor NEM kerül egyik csoportba sem', () => {
    const plan = makePlan([
      [sor({ tetelId: '', nevSnapshot: 'Egyedi', nevNyelv: { authoredInLanguage: 'de' } })],
    ]);
    expect(igazolatlanNemetNevek(plan, priceList)).toEqual({ nincsArlistaiNev: [], ellenorizetlenKeziNev: [] });
  });

  it('van árlistai fordítás, de kézzel eltérített, nem igazolt sor az "ellenorizetlenKeziNev" csoportba kerül', () => {
    const plan = makePlan([
      [
        sor({
          tetelId: 't-forditott',
          nevSnapshot: 'Kézzel átírt szöveg',
          nevNyelv: { authoredInLanguage: 'hu' },
        }),
      ],
    ]);
    expect(igazolatlanNemetNevek(plan, priceList)).toEqual({
      nincsArlistaiNev: [],
      ellenorizetlenKeziNev: ['Kézzel átírt szöveg'],
    });
  });
});

describe('igazolatlanNemetKategoriak (D404)', () => {
  it('magyar terven üres eredményt ad', () => {
    const plan = makePlan([[sor({ tetelId: 't1', fogak: '16' })]], { nyelv: 'hu' });
    expect(igazolatlanNemetKategoriak(plan, priceList)).toEqual([]);
  });

  it('a fogtérképen ténylegesen látszó, DE név nélküli kategóriát jelzi', () => {
    const plan = makePlan([[sor({ tetelId: 't1', fogak: '16' })]]);
    expect(igazolatlanNemetKategoriak(plan, priceList)).toEqual(['Sebészet']);
  });

  it('a tervben NEM használt (fogszám nélküli) sor kategóriáját nem jelzi', () => {
    const plan = makePlan([[sor({ tetelId: 't1', fogak: '' })]]);
    expect(igazolatlanNemetKategoriak(plan, priceList)).toEqual([]);
  });

  it('DE névvel rendelkező kategóriát nem jelez', () => {
    const kategoriakNemetNevvel: Kategoria[] = [{ id: 'k1', nev: { hu: 'Sebészet', de: 'Chirurgie' }, sorrend: 1, szin: '#ff6b6b' }];
    const priceListNemet: PriceList = { ...priceList, kategoriak: kategoriakNemetNevvel };
    const plan = makePlan([[sor({ tetelId: 't1', fogak: '16' })]]);
    expect(igazolatlanNemetKategoriak(plan, priceListNemet)).toEqual([]);
  });
});
