import { describe, expect, it } from 'vitest';
import { extractBulletLines, stripMarkdownHeading } from './markdownLite';
import { FIZETESI_FELTETELEK_HU_V1, NYILATKOZAT_HU_V1 } from '../storage/seed/templates';

describe('stripMarkdownHeading', () => {
  it('removes the leading "# ..." line and surrounding blank lines', () => {
    expect(stripMarkdownHeading('# Cím\n\nSzöveg itt.\n')).toBe('Szöveg itt.');
  });

  it('leaves content untouched when there is no heading', () => {
    expect(stripMarkdownHeading('Csak szöveg.')).toBe('Csak szöveg.');
  });

  it('strips the real nyilatkozat seed heading down to the placeholder body', () => {
    const body = stripMarkdownHeading(NYILATKOZAT_HU_V1);
    expect(body.startsWith('#')).toBe(false);
    expect(body).toContain('PLACEHOLDER');
  });
});

describe('extractBulletLines', () => {
  it('extracts only "- " lines, trimmed and without the marker', () => {
    const md = '# Cím\n\n- Első\n- Második\n\nNem lista sor\n- Harmadik';
    expect(extractBulletLines(md)).toEqual(['Első', 'Második', 'Harmadik']);
  });

  it('extracts all four real fizetési feltételek bullet points from the seed', () => {
    const lines = extractBulletLines(FIZETESI_FELTETELEK_HU_V1);
    expect(lines).toHaveLength(4);
    expect(lines[0]).toMatch(/azonnal fizetendő/);
    expect(lines[3]).toMatch(/bankkártya/);
  });
});
