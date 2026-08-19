import { describe, expect, it } from 'vitest';
import { createBlankPlan } from './blankPlan';
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

describe('createBlankPlan', () => {
  it('öröklés nélkül a mai alapértékeket adja: nyelv a beállításokból (ha a német engedélyezve), pénznem mindig HUF', () => {
    const plan = createBlankPlan({ ...settings, nemetEngedelyezve: true, alapertelmezettNyelv: 'de' }, priceList);
    expect(plan.nyelv).toBe('de');
    expect(plan.penznem).toBe('HUF');
    expect(plan.sablonVerzio).toBe('nyilatkozat-de-v1');
  });

  it('öröklés nélkül, kikapcsolt német mellett mindig magyar', () => {
    const plan = createBlankPlan(settings, priceList);
    expect(plan.nyelv).toBe('hu');
  });

  // D534 (47. tétel): egy meglévő páciens legutóbb véglegesített tervéből
  // örökölt nyelv/pénznem felülírja a globális alapértéket.
  it('örökölt nyelv/pénznem érvényesül a globális alapérték helyett', () => {
    const plan = createBlankPlan(settings, priceList, { nyelv: 'de', penznem: 'EUR' });
    expect(plan.nyelv).toBe('de');
    expect(plan.penznem).toBe('EUR');
    expect(plan.sablonVerzio).toBe('nyilatkozat-de-v1');
  });

  // User-döntés: az öröklés a kikapcsolt `nemetEngedelyezve` kapcsolót is
  // felülírja -- lásd a döntés indoklását `blankPlan.ts`-ben.
  it('örökölt "de" akkor is érvényesül, ha a német nyelv ki van kapcsolva', () => {
    const plan = createBlankPlan(settings, priceList, { nyelv: 'de', penznem: 'HUF' });
    expect(plan.nyelv).toBe('de');
  });

  it('null oroklott ugyanaz, mint a paraméter elhagyása', () => {
    const plan = createBlankPlan(settings, priceList, null);
    expect(plan.nyelv).toBe('hu');
    expect(plan.penznem).toBe('HUF');
  });
});
