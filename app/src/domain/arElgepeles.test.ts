import { describe, expect, it } from 'vitest';
import {
  ABSZOLUT_SZORZO,
  RELATIV_SZORZO,
  abszolutGyanus,
  arGyanu,
  arSlotok,
  legdragabbMasikAktiv,
  relativGyanus,
} from './arElgepeles';
import type { Tetel } from './types';

function tetel(overrides: Partial<Tetel> & { id: string }): Tetel {
  return {
    kategoriaId: 'k1',
    sorrend: 1,
    aktiv: true,
    gyakori: false,
    nev: { hu: overrides.id, de: null },
    ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: { tipus: 'FIX', ertek: 3000 } },
    ...overrides,
  };
}

describe('relativGyanus', () => {
  it('hiányzó vagy 0 baseline mellett néma', () => {
    expect(relativGyanus(1000000, undefined)).toBe(false);
    expect(relativGyanus(1000000, 0)).toBe(false);
  });

  it('pontosan a szorzónál (5x) már jelez', () => {
    expect(relativGyanus(45000 * RELATIV_SZORZO, 45000)).toBe(true);
    expect(relativGyanus(45000 * RELATIV_SZORZO - 1, 45000)).toBe(false);
  });

  it('pontosan az 1/5-nél (lefelé) már jelez', () => {
    expect(relativGyanus(45000 / RELATIV_SZORZO, 45000)).toBe(true);
    expect(relativGyanus(45000 / RELATIV_SZORZO + 1, 45000)).toBe(false);
  });

  it('a küszöbön belüli, legitim mértékű változás néma', () => {
    expect(relativGyanus(45000 * 2, 45000)).toBe(false);
  });
});

describe('legdragabbMasikAktiv', () => {
  it('kizárja a szerkesztett tételt és az inaktív tételeket', () => {
    const tetelek = [
      tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 5000000 } } }),
      tetel({ id: 'b', ar: { HUF: { tipus: 'FIX', ertek: 200000 } } }),
      tetel({ id: 'c', aktiv: false, ar: { HUF: { tipus: 'FIX', ertek: 9000000 } } }),
    ];
    expect(legdragabbMasikAktiv(tetelek, 'a', 'HUF')).toBe(200000);
  });

  it('SAVOS tételnél a max-ot nézi (fordított sáv esetén is a csúcsértéket)', () => {
    const tetelek = [
      tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 100 } } }),
      tetel({ id: 'b', ar: { HUF: { tipus: 'SAVOS', min: 500000, max: 300000 } } }),
    ];
    expect(legdragabbMasikAktiv(tetelek, 'a', 'HUF')).toBe(500000);
  });

  it('nincs másik aktív, árral rendelkező tétel → null', () => {
    const tetelek = [tetel({ id: 'a', ar: { HUF: { tipus: 'FIX', ertek: 5000000 } } })];
    expect(legdragabbMasikAktiv(tetelek, 'a', 'HUF')).toBeNull();
    expect(legdragabbMasikAktiv(tetelek, 'a', 'EUR')).toBeNull();
  });

  it('a pénznemek egymástól függetlenül értelmeződnek', () => {
    const tetelek = [
      tetel({
        id: 'a',
        ar: { HUF: { tipus: 'FIX', ertek: 1 }, EUR: { tipus: 'FIX', ertek: 1 } },
      }),
      tetel({
        id: 'b',
        ar: { HUF: { tipus: 'FIX', ertek: 100000 }, EUR: null },
      }),
    ];
    expect(legdragabbMasikAktiv(tetelek, 'a', 'HUF')).toBe(100000);
    expect(legdragabbMasikAktiv(tetelek, 'a', 'EUR')).toBeNull();
  });
});

describe('abszolutGyanus', () => {
  it('null referencia mellett néma', () => {
    expect(abszolutGyanus(999999999, null)).toBe(false);
  });

  it('pontosan a szorzónál (3x) már jelez', () => {
    expect(abszolutGyanus(200000 * ABSZOLUT_SZORZO, 200000)).toBe(true);
    expect(abszolutGyanus(200000 * ABSZOLUT_SZORZO - 1, 200000)).toBe(false);
  });
});

describe('arSlotok', () => {
  it('FIX típusnál csak a saját slotot tölti ki', () => {
    expect(
      arSlotok({ HUF: { tipus: 'FIX', ertek: 45000 }, EUR: { tipus: 'FIX', ertek: 12000 } }),
    ).toEqual({ HUF_FIX: 45000, EUR_FIX: 12000 });
  });

  it('SAVOS típusnál a min/max slotot tölti ki, hiányzó EUR ár kimarad', () => {
    expect(arSlotok({ HUF: { tipus: 'SAVOS', min: 10000, max: 20000 }, EUR: null })).toEqual({
      HUF_MIN: 10000,
      HUF_MAX: 20000,
    });
  });
});

describe('arGyanu', () => {
  it('relatív precedenciával, ha mindkét detektor jelezne', () => {
    expect(arGyanu(1000000, 100000, 50000)).toBe('relativ');
  });

  it('csak az abszolút jelez, ha nincs baseline', () => {
    expect(arGyanu(1000000, undefined, 100000)).toBe('abszolut');
  });

  it('néma, ha egyik detektor sem jelez', () => {
    expect(arGyanu(120000, 100000, 500000)).toBeNull();
  });
});
