import { describe, expect, it } from 'vitest';
import { fillPlaceholders, parseBlocks, stripMarkdownHeading } from './markdownLite';
import { FIZETESI_FELTETELEK_HU_V1, NYILATKOZAT_HU_V1 } from '../storage/seed/templates';

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
