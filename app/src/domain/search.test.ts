import { describe, expect, it } from 'vitest';
import { nevEgyezik, norm } from './search';

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

describe('nevEgyezik', () => {
  const nev = { hu: 'Zirkonkerámia korona', de: 'Zirkonkeramikkrone' };

  it('a magyar néven egyezik', () => {
    expect(nevEgyezik(nev, norm('zirkonkeramia'))).toBe(true);
  });

  // A doki magyarul gépel akkor is, ha német ajánlatot állít össze -- de egy
  // csak németül elnevezett/elgépelt tételt is meg kell találnia.
  it('a német néven is egyezik, a terv nyelvétől függetlenül', () => {
    expect(nevEgyezik(nev, norm('keramikkrone'))).toBe(true);
  });

  it('nem egyezik, ha egyik névben sincs benne', () => {
    expect(nevEgyezik(nev, norm('implantatum'))).toBe(false);
  });

  it('hiányzó német névnél nem hasal el, a magyar ág változatlanul működik', () => {
    const csakHu = { hu: 'Fogeltávolítás', de: null };
    expect(nevEgyezik(csakHu, norm('fogeltavolitas'))).toBe(true);
    expect(nevEgyezik(csakHu, norm('krone'))).toBe(false);
  });
});
