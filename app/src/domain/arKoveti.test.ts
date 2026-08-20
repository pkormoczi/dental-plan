import { describe, expect, it } from 'vitest';
import { arElteroSorok, arFrissites, arFrissitesPatch, arKoveti, frissArlistaval } from './arKoveti';
import type { Plan, PriceList, Sor, Tetel } from './types';

function sor(partial: Partial<Sor> = {}): Sor {
  return {
    tetelId: 't1',
    nevSnapshot: 'Fogeltávolítás',
    savos: false,
    fogak: '',
    mennyiseg: 1,
    listaEgysegar: 10000,
    tenylegesEgysegar: 10000,
    leirasSnapshot: 'Egyszerű extrakció',
    ...partial,
  };
}

function makePlan(fazisok: Sor[][], overrides: Partial<Plan> = {}): Plan {
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
    ...overrides,
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
      nev: { hu: 'Fogeltávolítás', de: 'Zahnextraktion' },
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
      leiras: { hu: 'Egyszerű extrakció', de: 'Einfache Extraktion' },
    },
    {
      id: 't-savos',
      kategoriaId: 'k1',
      sorrend: 2,
      aktiv: true,
      gyakori: false,
      nev: { hu: 'Gyökérkezelés', de: null },
      ar: { HUF: { tipus: 'SAVOS', min: 15000, max: 25000 }, EUR: null },
    },
  ],
};

const tetel1 = priceList.tetelek[0];
const tetelSavos = priceList.tetelek[1];
const tetelById = new Map<string, Tetel>(priceList.tetelek.map((x) => [x.id, x]));

describe('arKoveti', () => {
  it('igaz, ha a sor listaEgysegar-ja pontosan a mai FIX árlistai ár', () => {
    expect(arKoveti(sor({ listaEgysegar: 10000 }), tetel1, 'HUF')).toBe(true);
  });

  it('hamis, ha a sor listaEgysegar-ja eltér a mai FIX árlistai ártól', () => {
    expect(arKoveti(sor({ listaEgysegar: 9000 }), tetel1, 'HUF')).toBe(false);
  });

  it('SAVOS tételnél a `min`-hez hasonlít', () => {
    expect(arKoveti(sor({ tetelId: 't-savos', listaEgysegar: 15000 }), tetelSavos, 'HUF')).toBe(true);
    expect(arKoveti(sor({ tetelId: 't-savos', listaEgysegar: 20000 }), tetelSavos, 'HUF')).toBe(false);
  });

  it('hamis, ha a tételnek nincs ára az adott pénznemben', () => {
    expect(arKoveti(sor({ listaEgysegar: 10000 }), tetel1, 'EUR')).toBe(false);
  });
});

describe('arFrissites', () => {
  it('null, ha a sor egyedi (üres tetelId)', () => {
    expect(arFrissites(sor({ tetelId: '' }), 'HUF', tetelById)).toBeNull();
  });

  it('null, ha a tetelId ismeretlen (törölt tétel)', () => {
    expect(arFrissites(sor({ tetelId: 'torolve' }), 'HUF', tetelById)).toBeNull();
  });

  it('null, ha a tételnek nincs ára az adott pénznemben', () => {
    expect(arFrissites(sor({ listaEgysegar: 9000 }), 'EUR', tetelById)).toBeNull();
  });

  it('null, ha a sor már követi a mai árlistát', () => {
    expect(arFrissites(sor({ listaEgysegar: 10000 }), 'HUF', tetelById)).toBeNull();
  });

  it('konkrét javaslatot ad, ha a sor eltér a mai árlistától', () => {
    expect(arFrissites(sor({ listaEgysegar: 9000 }), 'HUF', tetelById)).toEqual({
      regi: 9000,
      uj: 10000,
      savos: false,
    });
  });

  it('a `savos` jelölést is a mai árlistából adja', () => {
    expect(arFrissites(sor({ tetelId: 't-savos', listaEgysegar: 20000 }), 'HUF', tetelById)).toEqual({
      regi: 20000,
      uj: 15000,
      savos: true,
    });
  });
});

describe('arFrissitesPatch', () => {
  it('a listaEgysegar-t és a tenylegesEgysegar-t is az új értékre állítja -- a kézi felülírás törlődik', () => {
    expect(arFrissitesPatch({ regi: 9000, uj: 10000, savos: false })).toEqual({
      listaEgysegar: 10000,
      tenylegesEgysegar: 10000,
      savos: false,
    });
  });
});

describe('arElteroSorok', () => {
  it('két külön listába gyűjti az elavult és a kézzel felülírt sorokat', () => {
    const plan = makePlan([
      [
        sor({ nevSnapshot: 'Elavult', listaEgysegar: 9000, tenylegesEgysegar: 9000 }),
        sor({ nevSnapshot: 'Kézi ár', listaEgysegar: 10000, tenylegesEgysegar: 8000 }),
        sor({ nevSnapshot: 'Rendben' }),
      ],
    ]);
    expect(arElteroSorok(plan, priceList)).toEqual({ elavult: ['Elavult'], keziAr: ['Kézi ár'] });
  });

  it('egyedi sor sosem kerül a keziAr listába (listaEgysegar === tenylegesEgysegar mindig)', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi', listaEgysegar: 5000, tenylegesEgysegar: 5000 })]]);
    expect(arElteroSorok(plan, priceList)).toEqual({ elavult: [], keziAr: [] });
  });
});

describe('frissArlistaval', () => {
  it('a mindhárom dimenzióban (ár, név, leírás) követő sort a mai árlistára frissíti', () => {
    const plan = makePlan([[sor()]], { arlistaVerzio: '2026-01-01' });
    const friss = frissArlistaval(plan, {
      ...priceList,
      tetelek: [{ ...tetel1, ar: { HUF: { tipus: 'FIX', ertek: 12000 }, EUR: null } }, tetelSavos],
    });
    expect(friss.fazisok[0].sorok[0]).toMatchObject({
      listaEgysegar: 12000,
      tenylegesEgysegar: 12000,
      nevSnapshot: 'Fogeltávolítás',
      leirasSnapshot: 'Egyszerű extrakció',
    });
    expect(friss.arlistaVerzio).toBe(priceList.arlistaVerzio);
  });

  it('egy kézzel felülírt ajánlati árú sort NEM frissít, még ha a listaár egyébként driftelt', () => {
    const plan = makePlan([[sor({ listaEgysegar: 9000, tenylegesEgysegar: 8000 })]]);
    const friss = frissArlistaval(plan, priceList);
    expect(friss.fazisok[0].sorok[0]).toEqual(plan.fazisok[0].sorok[0]);
  });

  it('egy kézzel átírt nevű sort NEM frissít, még ha az ára követi is az árlistát', () => {
    const plan = makePlan([[sor({ nevSnapshot: 'Kézzel átírt név' })]]);
    const friss = frissArlistaval(plan, priceList);
    expect(friss.fazisok[0].sorok[0].nevSnapshot).toBe('Kézzel átírt név');
    expect(friss.fazisok[0].sorok[0].listaEgysegar).toBe(10000);
  });

  it('törölt (ismeretlen) tetelId-jű sort érintetlenül hagy', () => {
    const plan = makePlan([[sor({ tetelId: 'torolve', listaEgysegar: 9000 })]]);
    const friss = frissArlistaval(plan, priceList);
    expect(friss.fazisok[0].sorok[0]).toEqual(plan.fazisok[0].sorok[0]);
  });

  it('egyedi sort érintetlenül hagy', () => {
    const plan = makePlan([[sor({ tetelId: '', nevSnapshot: 'Egyedi', listaEgysegar: 5000, tenylegesEgysegar: 5000 })]]);
    const friss = frissArlistaval(plan, priceList);
    expect(friss.fazisok[0].sorok[0]).toEqual(plan.fazisok[0].sorok[0]);
  });

  it('a plan.arlistaVerzio-t mindig a priceList.arlistaVerzio-ra állítja', () => {
    const plan = makePlan([[]], { arlistaVerzio: '2020-01-01' });
    expect(frissArlistaval(plan, priceList).arlistaVerzio).toBe('2026-07-01');
  });
});
