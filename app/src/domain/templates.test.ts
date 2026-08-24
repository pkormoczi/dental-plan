import { describe, expect, it } from 'vitest';
import { isPlaceholderTemplate, sablonNyomtathato } from './templates';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
} from '../storage/seed/templates';

describe('isPlaceholderTemplate', () => {
  it('true a "[PLACEHOLDER" jelölőre', () => {
    expect(isPlaceholderTemplate('szöveg [PLACEHOLDER -- még nincs kész]')).toBe(true);
  });

  it('true a "[PLATZHALTER" jelölőre', () => {
    expect(isPlaceholderTemplate('Text [PLATZHALTER / HELYKITÖLTŐ]')).toBe(true);
  });

  it('false, ha a szó szerepel, de nincs nyitó zárójel előtte', () => {
    expect(isPlaceholderTemplate('Ez egy PLACEHOLDER szó zárójel nélkül.')).toBe(false);
  });

  it('false valódi szövegen', () => {
    expect(isPlaceholderTemplate('Megrendelő megrendeli a KEZELÉSI TERV szerinti kezeléseket.')).toBe(
      false,
    );
  });

  it('a magyar seed sablonok nem placeholderek', () => {
    expect(isPlaceholderTemplate(NYILATKOZAT_HU_V1)).toBe(false);
    expect(isPlaceholderTemplate(FIZETESI_FELTETELEK_HU_V1)).toBe(false);
  });

  it('a német seed sablonok AI-fordítás után már nem placeholderek (2026-08-10, jogi lektorálás nélkül)', () => {
    expect(isPlaceholderTemplate(NYILATKOZAT_DE_V1)).toBe(false);
    expect(isPlaceholderTemplate(FIZETESI_FELTETELEK_DE_V1)).toBe(false);
  });

  it('true üres törzsre', () => {
    expect(isPlaceholderTemplate('')).toBe(true);
  });

  it('true csak whitespace törzsre', () => {
    expect(isPlaceholderTemplate('   \n  ')).toBe(true);
  });

  it('true, ha a törzs a mentett fájl mintájának megfelelően csak a markdown-címsort tartalmazza', () => {
    // NyomtatvanyokTab.handleSaveTemplates() `# Cím\n\n<szöveg>\n` alakban ír --
    // egy kiürített szöveg törzse így sosem lenne csupasz '', csak a
    // címsor levágása UTÁN.
    expect(isPlaceholderTemplate('# Nyilatkozat\n\n\n')).toBe(true);
  });
});

describe('sablonNyomtathato', () => {
  it('false üres szövegre', () => {
    expect(sablonNyomtathato('')).toBe(false);
  });

  it('false csak whitespace-re', () => {
    expect(sablonNyomtathato('   \n  ')).toBe(false);
  });

  it('false placeholder-jelölésű szövegre', () => {
    expect(sablonNyomtathato('[PLACEHOLDER -- még nincs kész]')).toBe(false);
    expect(sablonNyomtathato('[PLATZHALTER / HELYKITÖLTŐ]')).toBe(false);
  });

  it('false csak markdown-címsort tartalmazó törzsre', () => {
    expect(sablonNyomtathato('# Garancia\n\n\n')).toBe(false);
  });

  it('true valódi szövegre', () => {
    expect(sablonNyomtathato(FIZETESI_FELTETELEK_HU_V1)).toBe(true);
  });
});
