import { describe, expect, it } from 'vitest';
import { createBlankPlan } from './blankPlan';
import { piszkozatTartalmas } from './piszkozat';
import type { PriceList, Settings } from './types';

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

describe('piszkozatTartalmas', () => {
  it('is false for a freshly created blank plan', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas(plan)).toBe(false);
  });

  it('stays false for a blank plan built from DIFFERENT settings/priceList (dátum-/beállításfüggetlen)', () => {
    // Ha a piszkozatTartalmas() mély-egyenlőséget hasonlítana createBlankPlan()
    // egy friss hívásához, ez a teszt megbukna: egy másik `orvos`/`nyelv`/
    // `sablonVerzio`/`arlistaVerzio` kombinációból épült blank plan nem
    // egyezne mezőnként a másikkal, mégis mindkettő "üres".
    const masSettings: Settings = {
      ...settings,
      orvosok: ['Dr. Más Valaki'],
      nemetEngedelyezve: true,
      alapertelmezettNyelv: 'de',
      ervenyessegNap: 30,
    };
    const masPriceList: PriceList = { ...priceList, arlistaVerzio: '2099-01-01' };
    const masikBlank = createBlankPlan(masSettings, masPriceList);
    expect(piszkozatTartalmas(masikBlank)).toBe(false);
  });

  it('is true once tervId is set (a reopened VEGLEGES plan is protected too, 1. döntés)', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas({ ...plan, tervId: 'a1b2c3', statusz: 'VEGLEGES' })).toBe(true);
  });

  it('is true once the patient name is filled in', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas({ ...plan, paciens: { ...plan.paciens, nev: 'Kovács János' } })).toBe(
      true,
    );
  });

  it('is true once kiskoru is toggled, even with no other patient fields set', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas({ ...plan, paciens: { ...plan.paciens, kiskoru: true } })).toBe(true);
  });

  it('is true once any phase has a sor', () => {
    const plan = createBlankPlan(settings, priceList);
    const withSor = {
      ...plan,
      fazisok: [
        {
          ...plan.fazisok[0],
          sorok: [
            {
              tetelId: 't001',
              nevSnapshot: 'Fogeltávolítás',
              savos: false,
              fogak: '',
              mennyiseg: 1,
              listaEgysegar: 10000,
              tenylegesEgysegar: 10000,
            },
          ],
        },
      ],
    };
    expect(piszkozatTartalmas(withSor)).toBe(true);
  });

  it('is true once an extra phase is added', () => {
    const plan = createBlankPlan(settings, priceList);
    const withExtraPhase = {
      ...plan,
      fazisok: [...plan.fazisok, { sorszam: 2, megnevezes: '2. kezelés', megjegyzes: '', sorok: [] }],
    };
    expect(piszkozatTartalmas(withExtraPhase)).toBe(true);
  });

  it('is true once the single default phase is renamed', () => {
    const plan = createBlankPlan(settings, priceList);
    const renamed = {
      ...plan,
      fazisok: [{ ...plan.fazisok[0], megnevezes: 'Átnevezve' }],
    };
    expect(piszkozatTartalmas(renamed)).toBe(true);
  });

  it('is true once the default phase gets a megjegyzes', () => {
    const plan = createBlankPlan(settings, priceList);
    const withNote = {
      ...plan,
      fazisok: [{ ...plan.fazisok[0], megjegyzes: 'implantáció után 3 hónappal' }],
    };
    expect(piszkozatTartalmas(withNote)).toBe(true);
  });

  // backlog-9: a kapcsoló bekapcsolása tudatos döntés, nem gépi alapérték.
  it('is true once the előleg switch is turned on, even with nothing else filled in', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas({ ...plan, elolegSzazalek: 50 })).toBe(true);
  });

  it('is NOT affected by nyelv/penznem toggles alone (két kattintás, nem gépelt munka)', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(piszkozatTartalmas({ ...plan, nyelv: 'de', penznem: 'EUR' })).toBe(false);
  });
});
