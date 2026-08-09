import { describe, expect, it } from 'vitest';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_HU_V1,
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

  it.each([
    ['nyilatkozat-hu', NYILATKOZAT_HU_V1],
    ['fizetesi-feltetelek-hu', FIZETESI_FELTETELEK_HU_V1],
    ['nyilatkozat-de', NYILATKOZAT_DE_V1],
    ['fizetesi-feltetelek-de', FIZETESI_FELTETELEK_DE_V1],
  ])('%s starts with a "# " heading that matches TEMPLATE_HEADINGS', (base, seed) => {
    const heading = TEMPLATE_HEADINGS[base as keyof typeof TEMPLATE_HEADINGS];
    expect(heading).toBeDefined();
    expect(seed.startsWith(`# ${heading}\n`)).toBe(true);
  });
});
