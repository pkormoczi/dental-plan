import { describe, expect, it } from 'vitest';
import {
  assertPatientMasterDataShape,
  assertPlanShape,
  assertPriceListShape,
  assertSettingsShape,
  ValidationError,
} from './validate';

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

describe('assertPriceListShape — szerkezeti hibák', () => {
  it('nem objektum adaton bukik', () => {
    expect(() => assertPriceListShape(null)).toThrow(/nem objektum/);
    expect(() => assertPriceListShape('x')).toThrow(/nem objektum/);
  });

  it('hiányzó vagy nem tömb "kategoriak" mezőn bukik', () => {
    expect(() => assertPriceListShape({ tetelek: [] })).toThrow(/"kategoriak" mező/);
    expect(() => assertPriceListShape({ kategoriak: {}, tetelek: [] })).toThrow(/"kategoriak" mező/);
  });

  it('hiányzó vagy nem tömb "tetelek" mezőn bukik', () => {
    expect(() => assertPriceListShape({ kategoriak: [] })).toThrow(/"tetelek" mező/);
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: {} })).toThrow(/"tetelek" mező/);
  });

  it('nem objektum tétel elemen bukik', () => {
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: [null] })).toThrow(
      /tetelek\[0\] nem objektum/,
    );
  });

  it('hiányzó tétel-id-n bukik', () => {
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: [{ ar: {} }] })).toThrow(
      /tetelek\[0\]\.id hiányzik/,
    );
  });

  it('hiányzó tétel-ar-on bukik', () => {
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: [{ id: 'x1' }] })).toThrow(
      /tetelek\[0\]\.ar hiányzik/,
    );
  });

  it('ismeretlen ar.tipus-on bukik', () => {
    expect(() => assertPriceListShape(priceListWith({ tipus: 'PERCENT' }))).toThrow(
      /ar\.HUF\.tipus ismeretlen \("PERCENT"\)/,
    );
  });

  it('az érvényes minimál-alakot elfogadja', () => {
    expect(() => assertPriceListShape({ kategoriak: [], tetelek: [] })).not.toThrow();
  });
});

describe('assertPlanShape — szerkezeti hibák', () => {
  it('nem objektum adaton bukik', () => {
    expect(() => assertPlanShape(null)).toThrow(/nem objektum/);
  });

  it('hiányzó "tervId" mezőn bukik', () => {
    expect(() => assertPlanShape(planWith({ tervId: undefined }))).toThrow(/"tervId" mező/);
  });

  it('hiányzó vagy nem tömb "fazisok" mezőn bukik', () => {
    expect(() => assertPlanShape(planWith({ fazisok: undefined }))).toThrow(/"fazisok" mező/);
    expect(() => assertPlanShape(planWith({ fazisok: {} }))).toThrow(/"fazisok" mező/);
  });

  it('nem objektum fázis-elemen bukik', () => {
    expect(() => assertPlanShape(planWith({ fazisok: [null] }))).toThrow(/fazisok\[0\] nem objektum/);
  });

  it('hiányzó vagy nem tömb "sorok" mezőn bukik', () => {
    expect(() => assertPlanShape(planWith({ fazisok: [{}] }))).toThrow(
      /fazisok\[0\]\.sorok hiányzik vagy nem tömb/,
    );
    expect(() => assertPlanShape(planWith({ fazisok: [{ sorok: {} }] }))).toThrow(
      /fazisok\[0\]\.sorok hiányzik vagy nem tömb/,
    );
  });

  it('nem objektum sor-elemen bukik', () => {
    expect(() => assertPlanShape(planWith({ fazisok: [{ sorok: [null] }] }))).toThrow(
      /fazisok\[0\]\.sorok\[0\] nem objektum/,
    );
  });

  it('nem véges "mennyiseg"-en bukik', () => {
    expect(() => assertPlanShape(sorWith({ mennyiseg: undefined }))).toThrow(
      /sorok\[0\]\.mennyiseg nem véges szám/,
    );
    expect(() => assertPlanShape(sorWith({ mennyiseg: 'egy' }))).toThrow(
      /sorok\[0\]\.mennyiseg nem véges szám/,
    );
  });

  it('hiányzó "osszesitok" mezőn bukik', () => {
    expect(() => assertPlanShape(planWith({ osszesitok: undefined }))).toThrow(/"osszesitok" mező/);
  });

  it('az érvényes minimál-alakot elfogadja', () => {
    expect(() => assertPlanShape(planWith())).not.toThrow();
  });
});

describe('assertSettingsShape', () => {
  function settingsWith(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { rendelo: {}, orvosok: [], ervenyessegNap: 30, ...overrides };
  }

  it('nem objektum adaton bukik', () => {
    expect(() => assertSettingsShape(null)).toThrow(/nem objektum/);
  });

  it('hiányzó "rendelo" mezőn bukik', () => {
    expect(() => assertSettingsShape(settingsWith({ rendelo: undefined }))).toThrow(/"rendelo" mező/);
  });

  it('hiányzó vagy nem tömb "orvosok" mezőn bukik', () => {
    expect(() => assertSettingsShape(settingsWith({ orvosok: undefined }))).toThrow(/"orvosok" mező/);
    expect(() => assertSettingsShape(settingsWith({ orvosok: {} }))).toThrow(/"orvosok" mező/);
  });

  it('nem tömb "inaktivOrvosok" mezőn bukik, ha jelen van', () => {
    expect(() => assertSettingsShape(settingsWith({ inaktivOrvosok: {} }))).toThrow(
      /"inaktivOrvosok" nem tömb/,
    );
  });

  it('nem véges "ervenyessegNap"-on bukik', () => {
    expect(() => assertSettingsShape(settingsWith({ ervenyessegNap: undefined }))).toThrow(
      /"ervenyessegNap" nem véges szám/,
    );
  });

  it('az érvényes minimál-alakot elfogadja, "inaktivOrvosok" nélkül is', () => {
    expect(() => assertSettingsShape(settingsWith())).not.toThrow();
    expect(() => assertSettingsShape(settingsWith({ inaktivOrvosok: ['o1'] }))).not.toThrow();
  });
});

describe('assertPatientMasterDataShape', () => {
  function masterDataWith(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return { paciensId: 'p1', nev: 'Teszt Elek', kiskoru: false, ...overrides };
  }

  it('nem objektum adaton bukik', () => {
    expect(() => assertPatientMasterDataShape(null)).toThrow(/nem objektum/);
  });

  it('hiányzó "paciensId" mezőn bukik', () => {
    expect(() => assertPatientMasterDataShape(masterDataWith({ paciensId: '' }))).toThrow(
      /"paciensId" mező/,
    );
    expect(() => assertPatientMasterDataShape(masterDataWith({ paciensId: undefined }))).toThrow(
      /"paciensId" mező/,
    );
  });

  it('hiányzó "nev" mezőn bukik', () => {
    expect(() => assertPatientMasterDataShape(masterDataWith({ nev: undefined }))).toThrow(
      /"nev" mező/,
    );
  });

  it('nem logikai "kiskoru"-n bukik', () => {
    expect(() => assertPatientMasterDataShape(masterDataWith({ kiskoru: undefined }))).toThrow(
      /"kiskoru" nem logikai érték/,
    );
  });

  it('az érvényes minimál-alakot elfogadja', () => {
    expect(() => assertPatientMasterDataShape(masterDataWith())).not.toThrow();
  });
});
