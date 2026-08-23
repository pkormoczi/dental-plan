import { describe, expect, it } from 'vitest';
import { FOOTER_SORMAGASSAG, footerExtraMagassag, footerNevSorok } from './footerLayout';

describe('footerLayout', () => {
  it('rövid névnél egy sor, nincs extra magasság', () => {
    expect(footerNevSorok('Kovács János', 'a3f9c1')).toBe(1);
    expect(footerExtraMagassag('Kovács János', 'a3f9c1')).toBe(0);
  });

  it('a becsült karakterhatár körüli hosszúságnál átbillen két sorra', () => {
    const rovid = 'Kovács János Középhosszú Vezetéknévvel';
    const hosszu = `${rovid} Toldalék Toldalék`;
    expect(footerNevSorok(rovid, 'a3f9c1')).toBe(1);
    expect(footerNevSorok(hosszu, 'a3f9c1')).toBe(2);
    expect(footerExtraMagassag(hosszu, 'a3f9c1')).toBe(FOOTER_SORMAGASSAG);
  });

  it('nagyon hosszú névnél is legfeljebb két sorra plafonozva marad', () => {
    const abszurdHosszu =
      'Dr. Nagyon-Nagyon-Hosszú Kötőjeles-Kettős Vezetéknév-Utónév Harmadik Negyedik Ötödik';
    expect(footerNevSorok(abszurdHosszu, 'a3f9c1')).toBe(2);
    expect(footerExtraMagassag(abszurdHosszu, 'a3f9c1')).toBe(FOOTER_SORMAGASSAG);
  });
});
