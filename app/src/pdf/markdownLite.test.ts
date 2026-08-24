import { describe, expect, it } from 'vitest';
import { fillPlaceholders, parseBlocks, parseInline, stripMarkdownHeading } from './markdownLite';
import {
  FIZETESI_FELTETELEK_DE_V1,
  FIZETESI_FELTETELEK_DE_V2,
  FIZETESI_FELTETELEK_HU_V1,
  FIZETESI_FELTETELEK_HU_V2,
  GARANCIA_DE_V1,
  GARANCIA_HU_V1,
  NYILATKOZAT_DE_V1,
  NYILATKOZAT_HU_V1,
} from '../storage/seed/templates';

describe('stripMarkdownHeading', () => {
  it('removes the leading "# ..." line and surrounding blank lines', () => {
    expect(stripMarkdownHeading('# Cím\n\nSzöveg itt.\n')).toBe('Szöveg itt.');
  });

  it('leaves content untouched when there is no heading', () => {
    expect(stripMarkdownHeading('Csak szöveg.')).toBe('Csak szöveg.');
  });

  it('strips the real nyilatkozat seed heading down to the body', () => {
    const body = stripMarkdownHeading(NYILATKOZAT_HU_V1);
    expect(body.startsWith('#')).toBe(false);
    expect(body).toContain('Megrendelő megrendeli a KEZELÉSI TERV szerinti');
  });
});

describe('parseBlocks', () => {
  it('splits paragraphs on blank lines and joins wrapped lines with a space', () => {
    const md = '# Cím\n\nEz az első\nbekezdés.\n\nEz a második.';
    expect(parseBlocks(md)).toEqual([
      { kind: 'p', text: 'Ez az első bekezdés.' },
      { kind: 'p', text: 'Ez a második.' },
    ]);
  });

  it('treats a block as a list only when every line starts with "- "', () => {
    const md = '# Cím\n\n- Első\n- Második\n\nNem lista sor\n- Harmadik';
    expect(parseBlocks(md)).toEqual([
      { kind: 'ul', items: ['Első', 'Második'] },
      { kind: 'p', text: 'Nem lista sor - Harmadik' },
    ]);
  });

  it('parses the real fizetési feltételek seed into an intro paragraph and a 4-item list', () => {
    const blocks = parseBlocks(FIZETESI_FELTETELEK_HU_V1);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ kind: 'p' });
    expect((blocks[0] as { kind: 'p'; text: string }).text).toContain('Megrendelő a kezelési tervben');
    expect(blocks[1].kind).toBe('ul');
    const items = (blocks[1] as { kind: 'ul'; items: string[] }).items;
    expect(items).toHaveLength(4);
    expect(items[0]).toMatch(/azonnal fizetendő/);
    expect(items[3]).toMatch(/bankkártyás/);
  });

  it('parses the real nyilatkozat seed into multiple paragraphs', () => {
    const blocks = parseBlocks(NYILATKOZAT_HU_V1);
    expect(blocks.every((b) => b.kind === 'p')).toBe(true);
    expect(blocks.length).toBeGreaterThan(3);
  });

  it('treats a block as an ordered list only when every line starts with "N. "', () => {
    const md = '# Cím\n\n1. Első\n2. Második\n\nNem lista sor\n3. Harmadik';
    expect(parseBlocks(md)).toEqual([
      {
        kind: 'ol',
        items: [
          { marker: '1', text: 'Első' },
          { marker: '2', text: 'Második' },
        ],
      },
      { kind: 'p', text: 'Nem lista sor 3. Harmadik' },
    ]);
  });

  it('keeps the source marker across a blank-line split, instead of renumbering from 1', () => {
    const md = '# Cím\n\n1. Első\n2. Második\n\n3. Harmadik (üres sor után)';
    expect(parseBlocks(md)).toEqual([
      {
        kind: 'ol',
        items: [
          { marker: '1', text: 'Első' },
          { marker: '2', text: 'Második' },
        ],
      },
      { kind: 'ol', items: [{ marker: '3', text: 'Harmadik (üres sor után)' }] },
    ]);
  });

  it('the six seed templates parse with no "ol" block and no bold span (today\'s rendering is unchanged)', () => {
    const seeds = [
      NYILATKOZAT_HU_V1,
      NYILATKOZAT_DE_V1,
      FIZETESI_FELTETELEK_HU_V1,
      FIZETESI_FELTETELEK_HU_V2,
      FIZETESI_FELTETELEK_DE_V1,
      FIZETESI_FELTETELEK_DE_V2,
      GARANCIA_HU_V1,
      GARANCIA_DE_V1,
    ];
    for (const seed of seeds) {
      const blocks = parseBlocks(seed);
      expect(blocks.some((b) => b.kind === 'ol')).toBe(false);
      expect(seed).not.toContain('**');
    }
  });
});

describe('parseInline', () => {
  it('leaves plain text as a single non-bold span', () => {
    expect(parseInline('Sima szöveg.')).toEqual([{ text: 'Sima szöveg.', bold: false }]);
  });

  it('splits a **bold** section into plain and bold spans', () => {
    expect(parseInline('Ez **fontos** rész.')).toEqual([
      { text: 'Ez ', bold: false },
      { text: 'fontos', bold: true },
      { text: ' rész.', bold: false },
    ]);
  });

  it('handles multiple bold sections in one text', () => {
    expect(parseInline('**Egy** és **kettő**.')).toEqual([
      { text: 'Egy', bold: true },
      { text: ' és ', bold: false },
      { text: 'kettő', bold: true },
      { text: '.', bold: false },
    ]);
  });

  it('leaves an unpaired "**" literal instead of silently dropping it', () => {
    expect(parseInline('Fél pár: ** nem zár.')).toEqual([{ text: 'Fél pár: ** nem zár.', bold: false }]);
  });
});

describe('fillPlaceholders', () => {
  it('replaces a known {{key}} placeholder', () => {
    expect(fillPlaceholders('megbízom {{orvos}} fogszakorvost.', { orvos: 'Dr. Mándoki István' })).toBe(
      'megbízom Dr. Mándoki István fogszakorvost.',
    );
  });

  it('leaves an unknown placeholder untouched instead of silently dropping it', () => {
    expect(fillPlaceholders('Kedves {{ismeretlen}}!', { orvos: 'Dr. Mándoki István' })).toBe(
      'Kedves {{ismeretlen}}!',
    );
  });

  it('fills the real nyilatkozat seed placeholder', () => {
    const filled = fillPlaceholders(NYILATKOZAT_HU_V1, { orvos: 'Dr. Mándoki István' });
    expect(filled).toContain('megbízom Dr. Mándoki István fogszakorvost.');
    expect(filled).not.toContain('{{orvos}}');
  });
});
