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
};

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [],
};

describe('createBlankPlan', () => {
  it('öröklés nélkül a mai alapértékeket adja: nyelv a beállításokból, pénznem mindig HUF', () => {
    const plan = createBlankPlan({ ...settings, alapertelmezettNyelv: 'de' }, priceList);
    expect(plan.nyelv).toBe('de');
    expect(plan.penznem).toBe('HUF');
    expect(plan.sablonVerzio).toBe('nyilatkozat-de-v1');
  });

  it('öröklés nélkül a beállítások alapértelmezett nyelvét adja', () => {
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

  it('null oroklott ugyanaz, mint a paraméter elhagyása', () => {
    const plan = createBlankPlan(settings, priceList, null);
    expect(plan.nyelv).toBe('hu');
    expect(plan.penznem).toBe('HUF');
  });

  // D63: az orvos mindig a globális alapértelmezett orvos, a fenti
  // nyelv/pénznem-örökléstől függetlenül -- lásd domain/orvosok.test.ts a
  // feloldás részletes eseteire.
  it('az orvos az explicit alapertelmezettOrvos', () => {
    const s = { ...settings, orvosok: ['Dr. Régi', 'Dr. Új'], alapertelmezettOrvos: 'Dr. Új' };
    expect(createBlankPlan(s, priceList).orvos).toBe('Dr. Új');
  });

  it('inaktív alapertelmezettOrvos esetén az első aktív orvosra esik', () => {
    const s = {
      ...settings,
      orvosok: ['Dr. Régi', 'Dr. Új'],
      alapertelmezettOrvos: 'Dr. Régi',
      inaktivOrvosok: ['Dr. Régi'],
    };
    expect(createBlankPlan(s, priceList).orvos).toBe('Dr. Új');
  });

  it('aktív orvos híján üres orvossal indul', () => {
    const s = { ...settings, inaktivOrvosok: settings.orvosok };
    expect(createBlankPlan(s, priceList).orvos).toBe('');
  });

  // D75: friss terv mindig "Csak ajánlat" nélkül indul.
  it('a csakAjanlat alapból false', () => {
    expect(createBlankPlan(settings, priceList).csakAjanlat).toBe(false);
  });
});
