import { describe, expect, it } from 'vitest';
import {
  basePrice,
  formatCentForInput,
  formatMoney,
  formatPrice,
  parseEuroInput,
  savosHatarForditott,
} from './money';

describe('formatMoney', () => {
  it('formats HUF as thousands-separated integer with Ft suffix', () => {
    expect(formatMoney(1234567, 'HUF', 'hu')).toBe('1 234 567 Ft');
  });

  it('formats EUR from cents with two decimals and comma', () => {
    expect(formatMoney(123456, 'EUR', 'de')).toBe('1.234,56 €');
  });

  it('renders an em dash for null/undefined (not "0")', () => {
    expect(formatMoney(null, 'HUF', 'hu')).toBe('—');
    expect(formatMoney(undefined, 'EUR', 'de')).toBe('—');
  });

  it('renders 0,00 € for an actual zero (0 is a real price, not "not offered")', () => {
    expect(formatMoney(0, 'EUR', 'de')).toBe('0,00 €');
  });

  it('rounds HUF to a whole number', () => {
    expect(formatMoney(45000.4, 'HUF', 'hu')).toBe('45 000 Ft');
  });

  it('négyjegyű HUF összeget is ezres-tagolva ad, nem törhető szóközzel', () => {
    expect(formatMoney(5000, 'HUF', 'hu')).toBe('5 000 Ft');
    expect(formatMoney(9999, 'HUF', 'hu')).toBe('9 999 Ft');
    expect(formatMoney(10000, 'HUF', 'hu')).toBe('10 000 Ft');
  });

  it('három vagy kevesebb jegyű összeget nem tagol', () => {
    expect(formatMoney(900, 'HUF', 'hu')).toBe('900 Ft');
    expect(formatMoney(0, 'HUF', 'hu')).toBe('0 Ft');
  });

  // 52. tétel / C4: az ezres elválasztó a NYELVTŐL függ (hu-HU szóköz,
  // de-DE pont), a tizedesjegyek száma és a pénznemjel a PÉNZNEMTŐL -- ez a
  // négy kötelező kombináció.
  describe('nyelv szerinti elválasztó (C4)', () => {
    it('HU + HUF: szóköz elválasztó, nincs tizedesjegy', () => {
      expect(formatMoney(1234567, 'HUF', 'hu')).toBe('1 234 567 Ft');
    });

    it('HU + EUR: szóköz elválasztó, két tizedesjegy, vessző', () => {
      expect(formatMoney(1234567, 'EUR', 'hu')).toBe('12 345,67 €');
    });

    it('DE + HUF: pont elválasztó, nincs tizedesjegy', () => {
      expect(formatMoney(1234567, 'HUF', 'de')).toBe('1.234.567 Ft');
    });

    it('DE + EUR: pont elválasztó, két tizedesjegy, vessző', () => {
      expect(formatMoney(1234567, 'EUR', 'de')).toBe('12.345,67 €');
    });

    it('HU + EUR 4-jegyű egész euró: tagolva, két tizedesjeggyel', () => {
      expect(formatMoney(123456, 'EUR', 'hu')).toBe('1 234,56 €');
    });

    it('DE + HUF 4-jegyű összeget a de-DE pontjával tagol', () => {
      expect(formatMoney(5000, 'HUF', 'de')).toBe('5.000 Ft');
    });
  });
});

describe('formatCentForInput / parseEuroInput', () => {
  it('1000 € fölött sincs ezres elválasztó', () => {
    expect(formatCentForInput(900000)).toBe('9000,00');
  });

  it('a beviteli formátum visszaolvasható a saját parserével', () => {
    for (const cent of [82500, 30000, 900000, 1234567]) {
      expect(parseEuroInput(formatCentForInput(cent))).toBe(cent);
    }
  });
});

describe('formatPrice', () => {
  it('formats a FIX price like formatMoney', () => {
    expect(formatPrice({ tipus: 'FIX', ertek: 45000 }, 'HUF', 'hu')).toBe('45 000 Ft');
  });

  it('formats a SAVOS price as a min-max range', () => {
    expect(formatPrice({ tipus: 'SAVOS', min: 35000, max: 55000 }, 'HUF', 'hu')).toBe(
      '35 000 Ft–55 000 Ft',
    );
  });

  it('formats a SAVOS price as a min-max range in EUR (cents)', () => {
    expect(formatPrice({ tipus: 'SAVOS', min: 35000, max: 55000 }, 'EUR', 'de')).toBe(
      '350,00 €–550,00 €',
    );
  });

  it('returns null for a missing price (not offered in this currency)', () => {
    expect(formatPrice(null, 'EUR', 'de')).toBeNull();
    expect(formatPrice(undefined, 'EUR', 'de')).toBeNull();
  });
});

describe('basePrice', () => {
  it('returns ertek for FIX', () => {
    expect(basePrice({ tipus: 'FIX', ertek: 25000 })).toBe(25000);
  });

  it('returns min for SAVOS (min is the editable default)', () => {
    expect(basePrice({ tipus: 'SAVOS', min: 38000, max: 65000 })).toBe(38000);
  });

  it('returns 0 for a missing price', () => {
    expect(basePrice(null)).toBe(0);
  });
});

describe('savosHatarForditott', () => {
  it('false, ha a SAVOS sáv helyes irányú (min <= max)', () => {
    expect(savosHatarForditott({ tipus: 'SAVOS', min: 35000, max: 55000 })).toBe(false);
  });

  it('true, ha a min nagyobb, mint a max', () => {
    expect(savosHatarForditott({ tipus: 'SAVOS', min: 65000, max: 38000 })).toBe(true);
  });

  it('false egyenlő min/max esetén (nem fordított, csak fix sávnyi)', () => {
    expect(savosHatarForditott({ tipus: 'SAVOS', min: 40000, max: 40000 })).toBe(false);
  });

  it('false FIX ártípusra és hiányzó árra', () => {
    expect(savosHatarForditott({ tipus: 'FIX', ertek: 25000 })).toBe(false);
    expect(savosHatarForditott(null)).toBe(false);
    expect(savosHatarForditott(undefined)).toBe(false);
  });
});
