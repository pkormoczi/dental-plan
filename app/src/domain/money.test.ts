import { describe, expect, it } from 'vitest';
import { basePrice, formatMoney, formatPrice } from './money';

describe('formatMoney', () => {
  it('formats HUF as thousands-separated integer with Ft suffix', () => {
    expect(formatMoney(1234567, 'HUF')).toBe('1 234 567 Ft');
  });

  it('formats EUR from cents with two decimals and comma', () => {
    // docs/04-nyomtatvany-spec.md: "1.234,56 €"
    expect(formatMoney(123456, 'EUR')).toBe('1.234,56 €');
  });

  it('renders an em dash for null/undefined (not "0")', () => {
    expect(formatMoney(null, 'HUF')).toBe('—');
    expect(formatMoney(undefined, 'EUR')).toBe('—');
  });

  it('rounds HUF to a whole number', () => {
    expect(formatMoney(45000.4, 'HUF')).toBe('45 000 Ft');
  });
});

describe('formatPrice', () => {
  it('formats a FIX price like formatMoney', () => {
    expect(formatPrice({ tipus: 'FIX', ertek: 45000 }, 'HUF')).toBe('45 000 Ft');
  });

  it('formats a SAVOS price as a min-max range', () => {
    expect(formatPrice({ tipus: 'SAVOS', min: 35000, max: 55000 }, 'HUF')).toBe(
      '35 000 Ft–55 000 Ft',
    );
  });

  it('returns null for a missing price (not offered in this currency)', () => {
    expect(formatPrice(null, 'EUR')).toBeNull();
    expect(formatPrice(undefined, 'EUR')).toBeNull();
  });
});

describe('basePrice', () => {
  it('returns ertek for FIX', () => {
    expect(basePrice({ tipus: 'FIX', ertek: 25000 })).toBe(25000);
  });

  it('returns min for SAVOS (D15: min is the editable default)', () => {
    expect(basePrice({ tipus: 'SAVOS', min: 38000, max: 65000 })).toBe(38000);
  });

  it('returns 0 for a missing price', () => {
    expect(basePrice(null)).toBe(0);
  });
});
