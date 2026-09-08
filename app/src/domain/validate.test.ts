import { describe, expect, it } from 'vitest';
import { assertPlanShape, assertPriceListShape, ValidationError } from './validate';

function planWith(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    schemaVersion: 1,
    tervId: 't1',
    fazisok: [
      {
        sorok: [{ mennyiseg: 1, listaEgysegar: 50000, tenylegesEgysegar: 45000 }],
      },
    ],
    osszesitok: { kezelesekOsszesen: 50000, kedvezmeny: 5000, fizetendo: 45000 },
    ...overrides,
  };
}

function sorWith(overrides: Record<string, unknown>): Record<string, unknown> {
  return planWith({
    fazisok: [
      { sorok: [{ mennyiseg: 1, listaEgysegar: 50000, tenylegesEgysegar: 45000, ...overrides }] },
    ],
  });
}

function priceListWith(ar: Record<string, unknown>): Record<string, unknown> {
  return {
    kategoriak: [],
    tetelek: [{ id: 'x1', ar: { HUF: ar, EUR: null } }],
  };
}

describe('assertPlanShape — tört pénzérték', () => {
  it('a sor listaEgysegar tört értékén érthető hibaüzenettel bukik', () => {
    expect(() => assertPlanShape(sorWith({ listaEgysegar: 10.5 }))).toThrow(ValidationError);
    expect(() => assertPlanShape(sorWith({ listaEgysegar: 10.5 }))).toThrow(
      /fazisok\[0\]\.sorok\[0\]\.listaEgysegar nem egész pénzérték/,
    );
  });

  it('a sor tenylegesEgysegar tört értékén bukik', () => {
    expect(() => assertPlanShape(sorWith({ tenylegesEgysegar: 44999.5 }))).toThrow(
      /tenylegesEgysegar nem egész pénzérték/,
    );
  });

  it('az osszesitok bármely mezőjének tört értékén bukik', () => {
    for (const key of ['kezelesekOsszesen', 'kedvezmeny', 'fizetendo']) {
      const plan = planWith({
        osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0, [key]: 0.5 },
      });
      expect(() => assertPlanShape(plan)).toThrow(
        new RegExp(`osszesitok\\.${key} nem egész pénzérték`),
      );
    }
  });

  it('az elolegOsszeg és a kedvezmenyOsszeg tört értékén bukik', () => {
    expect(() => assertPlanShape(planWith({ elolegOsszeg: 1000.5 }))).toThrow(
      /elolegOsszeg nem egész pénzérték/,
    );
    expect(() => assertPlanShape(planWith({ kedvezmenyOsszeg: -250.25 }))).toThrow(
      /kedvezmenyOsszeg nem egész pénzérték/,
    );
  });

  it('a hiányzó és a null elolegOsszeg/kedvezmenyOsszeg, valamint a nulla érték érvényes marad', () => {
    expect(() => assertPlanShape(planWith())).not.toThrow();
    expect(() => assertPlanShape(planWith({ elolegOsszeg: null, kedvezmenyOsszeg: null }))).not.toThrow();
    expect(() => assertPlanShape(planWith({ elolegOsszeg: 0, kedvezmenyOsszeg: 0 }))).not.toThrow();
    expect(() => assertPlanShape(sorWith({ listaEgysegar: 0, tenylegesEgysegar: 0 }))).not.toThrow();
  });

  it('a tört mennyiseg változatlanul átmegy — a mennyiség nem pénz', () => {
    expect(() => assertPlanShape(sorWith({ mennyiseg: 1.5 }))).not.toThrow();
  });
});

describe('assertPriceListShape — tört pénzérték', () => {
  it('a FIX ár tört értékén bukik', () => {
    expect(() => assertPriceListShape(priceListWith({ tipus: 'FIX', ertek: 10.5 }))).toThrow(
      /tetelek\[0\]\.ar\.HUF\.ertek nem egész pénzérték/,
    );
  });

  it('a SAVOS ár tört min/max értékén bukik', () => {
    expect(() =>
      assertPriceListShape(priceListWith({ tipus: 'SAVOS', min: 10.5, max: 20000 })),
    ).toThrow(/ar\.HUF\.min nem egész pénzérték/);
    expect(() =>
      assertPriceListShape(priceListWith({ tipus: 'SAVOS', min: 10000, max: 20000.75 })),
    ).toThrow(/ar\.HUF\.max nem egész pénzérték/);
  });

  it('egész értékek és a null ár (ezen a pénznemen nem ajánlható) átmennek', () => {
    expect(() => assertPriceListShape(priceListWith({ tipus: 'FIX', ertek: 0 }))).not.toThrow();
    expect(() =>
      assertPriceListShape(priceListWith({ tipus: 'SAVOS', min: 10000, max: 20000 })),
    ).not.toThrow();
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: [{ id: 'x1', ar: {} }] })).not.toThrow();
  });
});
