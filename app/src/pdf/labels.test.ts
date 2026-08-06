import { describe, expect, it } from 'vitest';
import { PDF_LABELS, pdfLabels } from './labels';

const HU_ONLY = /[őűŐŰáéíóúÁÉÍÓÚ]/; // ö ü ä ß is also German, deliberately excluded

describe('PDF_LABELS', () => {
  it('has the same key set on both languages', () => {
    expect(Object.keys(PDF_LABELS.de).sort()).toEqual(Object.keys(PDF_LABELS.hu).sort());
  });

  it('has no Hungarian-specific letters in the German labels (catches a pasted-in HU string)', () => {
    for (const [key, value] of Object.entries(PDF_LABELS.de)) {
      if (typeof value === 'string') {
        expect(value, `PDF_LABELS.de.${key}`).not.toMatch(HU_ONLY);
      }
    }
  });

  it('pins the validity-sentence wording on both languages (contract text)', () => {
    expect(PDF_LABELS.hu.ervenyessegMondat('2026. november 5.')).toBe(
      'Az ajánlat 2026. november 5. napjáig érvényes.',
    );
    expect(PDF_LABELS.de.ervenyessegMondat('5. November 2026')).toBe(
      'Das Angebot ist gültig bis zum 5. November 2026.',
    );
  });

  it('pins the signature-line wording on both languages', () => {
    expect(PDF_LABELS.hu.alairasSor('Budapest', '2026. augusztus 5.')).toBe(
      'Budapest, 2026. augusztus 5.',
    );
    expect(PDF_LABELS.de.alairasSor('Budapest', '5. August 2026')).toBe(
      'Budapest, den 5. August 2026',
    );
  });
});

describe('pdfLabels', () => {
  it('resolves each known language to its own table', () => {
    expect(pdfLabels('hu')).toBe(PDF_LABELS.hu);
    expect(pdfLabels('de')).toBe(PDF_LABELS.de);
  });
});
