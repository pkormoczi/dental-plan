import { describe, expect, it } from 'vitest';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_HU_V1,
  GARANCIA_DE_V1,
  GARANCIA_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
  TEMPLATE_HEADINGS,
} from './templates';

describe('seed templates', () => {
  it('the HU seeds are real text, not a legal-work placeholder', () => {
    expect(NYILATKOZAT_HU_V1).not.toContain('[PLACEHOLDER');
    expect(FIZETESI_FELTETELEK_HU_V1).not.toContain('[PLACEHOLDER');
  });

  it('the DE seeds are AI-translated real text, not a legal-work placeholder (doctor opted out of the review gate on 2026-08-10)', () => {
    expect(NYILATKOZAT_DE_V1).not.toContain('[PLATZHALTER');
    expect(FIZETESI_FELTETELEK_DE_V1).not.toContain('[PLATZHALTER');
  });

  it('the nyilatkozat seed contains the {{orvos}} placeholder for the signing physician', () => {
    expect(NYILATKOZAT_HU_V1).toContain('{{orvos}}');
  });

  // docs/08-backlog.md korábbi 13. tétel (Garancia szakasz a nyomtatványon):
  // ellentétben a fenti négy sablonnal, itt SZÁNDÉKOSAN a MAGYAR is
  // placeholder -- az eredeti Excelben nincs garancia-szöveg, a doki adja
  // meg. A német ebből következően is placeholder (nincs mit AI-fordítani).
  // Ne "javítsd" ezt a negatív asserteket másoló mintára.
  it('the garancia seeds are STILL a legal-work placeholder, both HU and DE (no doctor input yet)', () => {
    expect(GARANCIA_HU_V1).toContain('[PLACEHOLDER');
    expect(GARANCIA_DE_V1).toContain('[PLATZHALTER');
  });

  it.each([
    ['nyilatkozat-hu', NYILATKOZAT_HU_V1],
    ['fizetesi-feltetelek-hu', FIZETESI_FELTETELEK_HU_V1],
    ['garancia-hu', GARANCIA_HU_V1],
    ['nyilatkozat-de', NYILATKOZAT_DE_V1],
    ['fizetesi-feltetelek-de', FIZETESI_FELTETELEK_DE_V1],
    ['garancia-de', GARANCIA_DE_V1],
  ])('%s starts with a "# " heading that matches TEMPLATE_HEADINGS', (base, seed) => {
    const heading = TEMPLATE_HEADINGS[base as keyof typeof TEMPLATE_HEADINGS];
    expect(heading).toBeDefined();
    expect(seed.startsWith(`# ${heading}\n`)).toBe(true);
  });
});
