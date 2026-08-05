import { describe, expect, it } from 'vitest';
import { norm } from './search';

describe('norm', () => {
  it('strips accents so "gyoker" matches "Gyökérkezelés"', () => {
    expect(norm('Gyökérkezelés').includes(norm('gyoker'))).toBe(true);
  });

  it('strips accents so "eszetikus" pattern matches "Esztétikus"', () => {
    expect(norm('Esztétikus tömés').includes(norm('esztetikus'))).toBe(true);
  });

  it('lowercases', () => {
    expect(norm('KORONA')).toBe('korona');
  });

  it('handles null/undefined without throwing', () => {
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});
