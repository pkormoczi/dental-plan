import { describe, expect, it } from 'vitest';
import { frissDatummal } from './ujVerzioDatum';
import type { Plan, Settings } from './types';

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
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 'p1',
    verzio: 2,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    // 30 napos érvényességi ablak a régi tervben -- a 3. döntés szerint ez
    // az ablakhossz NEM számít, az új verzió az aktuális settings.ervenyessegNap-ot kapja.
    keltezes: '2026-06-10',
    ervenyesIg: '2026-07-10',
    arlistaVerzio: '2026-05-01',
    orvos: 'Dr. Teszt Elek',
    paciens: {
      nev: 'Nagy Éva',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
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
            listaEgysegar: 10000,
            tenylegesEgysegar: 9000,
          },
        ],
      },
    ],
    osszesitok: { kezelesekOsszesen: 9000, kedvezmeny: 1000, fizetendo: 9000 },
    ...overrides,
  };
}

describe('frissDatummal', () => {
  it('a keltezes a megadott "ma" lesz', () => {
    const plan = makePlan();
    expect(frissDatummal(plan, settings, '2026-08-09').keltezes).toBe('2026-08-09');
  });

  it('az ervenyesIg = ma + settings.ervenyessegNap, NEM a régi ablakhossz', () => {
    // A régi terven 30 nap volt az ablak (06-10 -> 07-10); ha az implementáció
    // tévesen az ablakhosszt őrizné meg, 2026-09-08-at adna. Az elvárt a friss
    // 90 napos (ervenyessegNap) ablak a "ma"-tól számolva.
    const plan = makePlan();
    const friss = frissDatummal(plan, settings, '2026-08-09');
    expect(friss.ervenyesIg).toBe('2026-11-07');
  });

  it('más ervenyessegNap esetén az új értéket használja', () => {
    const plan = makePlan();
    const friss = frissDatummal(plan, { ...settings, ervenyessegNap: 30 }, '2026-08-09');
    expect(friss.ervenyesIg).toBe('2026-09-08');
  });

  it('a sorok ára, nevSnapshot-ja és tetelId-je változatlan marad (D7)', () => {
    const plan = makePlan();
    const friss = frissDatummal(plan, settings, '2026-08-09');
    expect(friss.fazisok).toEqual(plan.fazisok);
  });

  it('az arlistaVerzio, osszesitok, tervId, verzio, statusz változatlan marad', () => {
    const plan = makePlan();
    const friss = frissDatummal(plan, settings, '2026-08-09');
    expect(friss.arlistaVerzio).toBe(plan.arlistaVerzio);
    expect(friss.osszesitok).toEqual(plan.osszesitok);
    expect(friss.tervId).toBe(plan.tervId);
    expect(friss.verzio).toBe(plan.verzio);
    expect(friss.statusz).toBe(plan.statusz);
  });

  it('új objektumot ad vissza, a bemenetet nem mutálja', () => {
    const plan = makePlan();
    const eredetiKeltezes = plan.keltezes;
    const friss = frissDatummal(plan, settings, '2026-08-09');
    expect(friss).not.toBe(plan);
    expect(plan.keltezes).toBe(eredetiKeltezes);
  });

  // D75: "Új verzió" nyitásakor a "Csak ajánlat" állapot öröklődik --
  // ellentétben a másolással (planCopy.test.ts).
  it('a csakAjanlat változatlanul öröklődik', () => {
    const plan = makePlan({ csakAjanlat: true });
    const friss = frissDatummal(plan, settings, '2026-08-09');
    expect(friss.csakAjanlat).toBe(true);
  });
});
