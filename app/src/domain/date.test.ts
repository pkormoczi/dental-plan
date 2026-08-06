import { describe, expect, it } from 'vitest';
import { addDaysIso, formatLongDate, formatShortDate } from './date';

describe('formatLongDate', () => {
  it('formats hu as "2026. november 5."', () => {
    expect(formatLongDate('2026-11-05', 'hu')).toBe('2026. november 5.');
  });

  it('formats de as "5. November 2026"', () => {
    expect(formatLongDate('2026-11-05', 'de')).toBe('5. November 2026');
  });
});

describe('formatShortDate', () => {
  it('formats hu as "2026.08.05."', () => {
    expect(formatShortDate('2026-08-05', 'hu')).toBe('2026.08.05.');
  });

  it('formats de as "05.08.2026" -- leading zero, not Intl (which would drop it)', () => {
    expect(formatShortDate('2026-08-05', 'de')).toBe('05.08.2026');
  });
});

describe('addDaysIso', () => {
  it('crosses a month boundary', () => {
    expect(addDaysIso('2026-08-05', 90)).toBe('2026-11-03');
  });

  it('crosses a year boundary', () => {
    expect(addDaysIso('2026-12-20', 90)).toBe('2027-03-20');
  });
});
