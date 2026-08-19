import { describe, expect, it } from 'vitest';
import {
  addDaysIso,
  formatLongDate,
  formatPiszkozatIdo,
  formatRelativIdo,
  formatShortDate,
  todayIso,
} from './date';

describe('todayIso', () => {
  it('returns an ISO (YYYY-MM-DD) date', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

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

describe('formatPiszkozatIdo', () => {
  it('formats an ISO instant as "YYYY.MM.DD. HH:MM" in Hungarian, browser-local time', () => {
    expect(formatPiszkozatIdo('2026-08-09T10:15:00.000Z')).toMatch(
      /^\d{4}\. \d{2}\. \d{2}\. \d{2}:\d{2}$/,
    );
  });
});

describe('formatRelativIdo', () => {
  const most = new Date(2026, 7, 9, 12, 0, 0);
  const isoBefore = (ms: number) => new Date(most.getTime() - ms).toISOString();

  it('shows "az imént" under a minute', () => {
    expect(formatRelativIdo(isoBefore(0), most)).toBe('az imént');
    expect(formatRelativIdo(isoBefore(30_000), most)).toBe('az imént');
  });

  it('shows "az imént" for a future timestamp (clock skew)', () => {
    expect(formatRelativIdo(new Date(most.getTime() + 5_000).toISOString(), most)).toBe('az imént');
  });

  it('shows minutes under an hour', () => {
    expect(formatRelativIdo(isoBefore(5 * 60_000), most)).toBe('5 perce');
    expect(formatRelativIdo(isoBefore(59 * 60_000), most)).toBe('59 perce');
  });

  it('shows hours under a day', () => {
    expect(formatRelativIdo(isoBefore(60 * 60_000), most)).toBe('1 órája');
    expect(formatRelativIdo(isoBefore(23 * 60 * 60_000), most)).toBe('23 órája');
  });

  it('stays elapsed-time based across a local midnight under 24h', () => {
    const este = new Date(2026, 7, 8, 23, 0, 0); // előző nap 23:00
    const hajnal = new Date(2026, 7, 9, 0, 30, 0); // 1.5 órával később, már másnap
    expect(formatRelativIdo(este.toISOString(), hajnal)).toBe('1 órája');
  });

  it('shows "tegnap" for a calendar-yesterday timestamp past 24h elapsed', () => {
    const tegnapHajnal = new Date(2026, 7, 8, 0, 30, 0);
    const maEste = new Date(2026, 7, 9, 23, 0, 0);
    expect(formatRelativIdo(tegnapHajnal.toISOString(), maEste)).toBe('tegnap');
  });

  it('shows days for 2-6 days', () => {
    expect(formatRelativIdo(isoBefore(3 * 86_400_000), most)).toBe('3 napja');
    expect(formatRelativIdo(isoBefore(6 * 86_400_000), most)).toBe('6 napja');
  });

  it('falls back to the absolute short date from 7 days', () => {
    expect(formatRelativIdo(isoBefore(8 * 86_400_000), most)).toBe('2026.08.01.');
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
