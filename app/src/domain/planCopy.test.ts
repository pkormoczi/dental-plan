import { describe, expect, it } from 'vitest';
import { createBlankPlan } from './blankPlan';
import { planMasolatKent, planUjPaciensselTervhez } from './planCopy';
import type { Plan, PriceList, Settings } from './types';

const settings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Teszt Rendelő',
    cim: '',
    telefon: '',
    email: '',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Teszt Elek'],
  logoFajl: '',
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
  nemetEngedelyezve: false,
};

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [],
};

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 'p1',
    verzio: 2,
    statusz: 'VEGLEGES',
    nyelv: 'de',
    penznem: 'EUR',
    keltezes: '2026-06-10',
    ervenyesIg: '2026-07-10',
    arlistaVerzio: '2026-05-01',
    sablonVerzio: 'nyilatkozat-de-v1',
    orvos: 'Dr. Teszt Elek',
    paciens: {
      nev: 'Nagy Éva',
      szuletesiIdo: '1980-01-01',
      lakcim: 'Budapest',
      telefon: '+36 30 000 0000',
      email: 'eva@example.hu',
      taj: '123 456 789',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. kezelés',
        megjegyzes: '',
        sorok: [
          {
            tetelId: 't001',
            nevSnapshot: 'Fogeltávolítás',
            savos: false,
            fogak: '16',
            mennyiseg: 1,
            listaEgysegar: 100,
            tenylegesEgysegar: 90,
          },
        ],
      },
    ],
    // Szándékosan HAMIS a valós sorösszeghez (90) képest -- igazolja, hogy
    // planMasolatKent() nem ezt a mezőt másolja, hanem újraszámolja.
    osszesitok: { kezelesekOsszesen: 9999, kedvezmeny: 9999, fizetendo: 9999 },
    elolegSzazalek: 50,
    kedvezmenyOsszeg: 5,
    ...overrides,
  };
}

describe('planUjPaciensselTervhez', () => {
  it('csak a paciens blokkot viszi át, minden más a friss createBlankPlan() alapértéke', () => {
    const plan = makePlan();
    const uj = planUjPaciensselTervhez(plan, settings, priceList);
    const blank = createBlankPlan(settings, priceList);

    expect(uj.paciens).toEqual(plan.paciens);
    expect(uj).toEqual({ ...blank, paciens: plan.paciens });
  });

  it('nem a forrás nyelvét/pénznemét/soraiat viszi -- a mai alapérték áll be', () => {
    const plan = makePlan();
    const uj = planUjPaciensselTervhez(plan, settings, priceList);

    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('HUF');
    expect(uj.fazisok.every((f) => f.sorok.length === 0)).toBe(true);
    expect(uj.elolegSzazalek).toBeNull();
    expect(uj.kedvezmenyOsszeg).toBeNull();
    expect(uj.tervId).toBe('');
  });

  it('nem mutálja a forrás tervet', () => {
    const plan = makePlan();
    const eredetiPaciens = plan.paciens;
    planUjPaciensselTervhez(plan, settings, priceList);
    expect(plan.paciens).toBe(eredetiPaciens);
  });
});

describe('planMasolatKent', () => {
  it('az azonosító/állapot/dátum kivételével mindent átvisz a forrásból', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    expect(masolat.paciens).toEqual(plan.paciens);
    expect(masolat.nyelv).toBe(plan.nyelv);
    expect(masolat.penznem).toBe(plan.penznem);
    expect(masolat.orvos).toBe(plan.orvos);
    expect(masolat.fazisok).toEqual(plan.fazisok);
    expect(masolat.arlistaVerzio).toBe(plan.arlistaVerzio);
    expect(masolat.elolegSzazalek).toBe(plan.elolegSzazalek);
    expect(masolat.kedvezmenyOsszeg).toBe(plan.kedvezmenyOsszeg);
    // docs/08-backlog.md 10. tétel, 12. döntés: ugyanúgy pillanatkép-jellegű,
    // mint nyelv/penznem -- öröklődik, nem nullázódik.
    expect(masolat.leirasokMutatasa).toBe(plan.leirasokMutatasa);
  });

  it('tervId/verzio/statusz nullázódik, a keltezés/ervenyesIg friss', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    expect(masolat.tervId).toBe('');
    expect(masolat.verzio).toBe(0);
    expect(masolat.statusz).toBe('PISZKOZAT');
    expect(masolat.keltezes).toBe('2026-08-10');
    expect(masolat.ervenyesIg).toBe('2026-11-08'); // 2026-08-10 + 90 nap
  });

  it('az osszesitok a saját sorokból ÚJRASZÁMOLVA jön, nem a forrás (hamis) osszesitok-ja', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    // A forrás sorösszege 90 (1 x 90), a kedvezmenyOsszeg 5.
    expect(masolat.osszesitok).toEqual({
      kezelesekOsszesen: 100,
      kedvezmeny: 15,
      fizetendo: 85,
    });
    expect(masolat.osszesitok).not.toEqual(plan.osszesitok);
  });

  it('nem mutálja a forrás tervet', () => {
    const plan = makePlan();
    const eredetiKeltezes = plan.keltezes;
    const eredetiOsszesitok = plan.osszesitok;
    planMasolatKent(plan, settings, '2026-08-10');
    expect(plan.keltezes).toBe(eredetiKeltezes);
    expect(plan.osszesitok).toBe(eredetiOsszesitok);
  });
});
