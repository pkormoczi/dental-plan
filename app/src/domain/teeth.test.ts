import { describe, expect, it } from 'vitest';
import { formatTeethForPrint, parseTeeth, toggleFog } from './teeth';

describe('parseTeeth', () => {
  it('parses valid FDI tokens separated by comma+space', () => {
    expect(parseTeeth('16, 17, 26')).toEqual({ valid: true, teeth: ['16', '17', '26'] });
  });

  it('accepts semicolon and plain space separators too', () => {
    expect(parseTeeth('16;17 26')).toEqual({ valid: true, teeth: ['16', '17', '26'] });
  });

  it('accepts deciduous (tejfog) range 51-85', () => {
    expect(parseTeeth('55, 65, 85')).toEqual({ valid: true, teeth: ['55', '65', '85'] });
  });

  it('rejects an out-of-range quadrant/tooth combination', () => {
    // '19' -- quadrant 1, tooth 9 does not exist (max 8 for maradó)
    expect(parseTeeth('19')).toEqual({ valid: false, teeth: [] });
  });

  it('treats free text as invalid (no warning path), not a crash', () => {
    expect(parseTeeth('jobb felső')).toEqual({ valid: false, teeth: [] });
  });

  it('returns invalid for empty input', () => {
    expect(parseTeeth('')).toEqual({ valid: false, teeth: [] });
    expect(parseTeeth(null)).toEqual({ valid: false, teeth: [] });
  });
});

describe('toggleFog', () => {
  it('üres mezőre kapcsolva az egyetlen tokent adja', () => {
    expect(toggleFog('', '16')).toBe('16');
  });

  it('bekapcsoláskor a meglévő sorrend végére fűz', () => {
    expect(toggleFog('16, 17', '26')).toBe('16, 17, 26');
  });

  it('kikapcsoláskor eltávolítja a tokent, a többi sorrendje megmarad', () => {
    expect(toggleFog('16, 17, 26', '17')).toBe('16, 26');
  });

  it('kikapcsoláskor MINDEN előfordulást eltávolít (nincs dedup a mezőn)', () => {
    expect(toggleFog('16, 17, 16', '16')).toBe('17');
  });

  it('a kimenet elválasztója mindig ", " a bemeneti formátumtól függetlenül', () => {
    expect(toggleFog('16;17', '26')).toBe('16, 17, 26');
  });

  it('tejfog tokent (51-85) érintetlenül hagy, ha másik fogat kapcsolunk', () => {
    expect(toggleFog('55', '16')).toBe('55, 16');
  });
});

describe('formatTeethForPrint', () => {
  it('inserts a space after a comma when missing -- numeral,numeral is otherwise an unbreakable "1,000"-like token', () => {
    expect(formatTeethForPrint('11,12,13,14,15,16,17,18')).toBe('11, 12, 13, 14, 15, 16, 17, 18');
  });

  it('leaves already-spaced lists untouched', () => {
    expect(formatTeethForPrint('16, 17, 26')).toBe('16, 17, 26');
  });

  it('normalizes semicolon separators the same way', () => {
    expect(formatTeethForPrint('16;17;26')).toBe('16; 17; 26');
  });

  it('leaves empty input untouched', () => {
    expect(formatTeethForPrint('')).toBe('');
  });
});
