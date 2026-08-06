import { describe, expect, it } from 'vitest';
import { formatTeethForPrint, parseTeeth } from './teeth';

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
