import { describe, expect, it } from 'vitest';
import {
  assertVersionDirAvailable,
  buildPatientDirName,
  buildPlanDirName,
  buildVersionDirName,
  nextVersionNumber,
  parsePatientDirName,
  parsePlanDirName,
  parseVersionDirName,
  sanitizeNamePart,
  splitHungarianName,
  VersionConflictError,
} from './paths';

describe('sanitizeNamePart', () => {
  it('keeps accented characters -- no transliteration', () => {
    expect(sanitizeNamePart('Mándoki')).toBe('Mándoki');
    expect(sanitizeNamePart('Kővári')).toBe('Kővári');
  });

  it('replaces forbidden Windows filename characters', () => {
    expect(sanitizeNamePart('A/B\\C:D*E?F"G<H>I|J')).toBe('A-B-C-D-E-F-G-H-I-J');
  });

  it('trims a trailing dot or space (illegal on Windows)', () => {
    expect(sanitizeNamePart('Kovács. ')).toBe('Kovács');
  });

  it('falls back to a placeholder for an empty result', () => {
    expect(sanitizeNamePart('   ')).toBe('Nevtelen');
  });
});

describe('splitHungarianName', () => {
  it('splits on the first space, family name first', () => {
    expect(splitHungarianName('Kovács János')).toEqual({
      vezeteknev: 'Kovács',
      keresztnev: 'János',
    });
  });

  it('keeps a multi-word given name together', () => {
    expect(splitHungarianName('Kovács János Pál')).toEqual({
      vezeteknev: 'Kovács',
      keresztnev: 'János Pál',
    });
  });

  it('handles a single-word name', () => {
    expect(splitHungarianName('Madonna')).toEqual({ vezeteknev: 'Madonna', keresztnev: '' });
  });
});

describe('buildPatientDirName / parsePatientDirName', () => {
  it('builds Vezeteknev-Keresztnev_id6', () => {
    expect(buildPatientDirName('Kovács János', 'a3f9c1')).toBe('Kovács-János_a3f9c1');
  });

  it('round-trips through parsePatientDirName for a simple name', () => {
    const dir = buildPatientDirName('Kovács János', 'a3f9c1');
    expect(parsePatientDirName(dir)).toEqual({
      vezeteknev: 'Kovács',
      keresztnev: 'János',
      patientId: 'a3f9c1',
    });
  });

  it('returns null for a name with no id suffix', () => {
    expect(parsePatientDirName('Kovács-János')).toBeNull();
  });
});

describe('buildPlanDirName / parsePlanDirName (D29)', () => {
  it('builds <szlugosított cím>_id6', () => {
    expect(buildPlanDirName('Fogpótlás', 'a3f9c1')).toBe('Fogpótlás_a3f9c1');
  });

  it('round-trips through parsePlanDirName', () => {
    const dir = buildPlanDirName('Fogpótlás', 'a3f9c1');
    expect(parsePlanDirName(dir)).toEqual({ tervCim: 'Fogpótlás', planId: 'a3f9c1' });
  });

  it('falls back to "Terv" for an empty/whitespace címke -- not "Nevtelen"', () => {
    expect(buildPlanDirName('', 'a3f9c1')).toBe('Terv_a3f9c1');
    expect(buildPlanDirName('   ', 'a3f9c1')).toBe('Terv_a3f9c1');
  });

  it('sanitizes forbidden characters in the címke', () => {
    expect(buildPlanDirName('Korona/Híd', 'a3f9c1')).toBe('Korona-Híd_a3f9c1');
  });

  it('returns null for a name with no id suffix', () => {
    expect(parsePlanDirName('Fogpótlás')).toBeNull();
  });
});

describe('buildVersionDirName / parseVersionDirName', () => {
  it('builds <ISO>_v<n>', () => {
    expect(buildVersionDirName('2026-08-05', 1)).toBe('2026-08-05_v1');
  });

  it('round-trips', () => {
    expect(parseVersionDirName('2026-08-19_v2')).toEqual({ isoDate: '2026-08-19', verzio: 2 });
  });

  it('rejects a malformed name', () => {
    expect(parseVersionDirName('not-a-version')).toBeNull();
  });
});

describe('nextVersionNumber', () => {
  it('returns 1 when there are no existing versions', () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it('returns max+1 (not count+1) when versions are non-contiguous', () => {
    expect(nextVersionNumber(['2026-08-05_v1', '2026-08-19_v3'])).toBe(4);
  });

  it('ignores unrelated keys mixed in', () => {
    expect(nextVersionNumber(['2026-08-05_v1', 'garbage'])).toBe(2);
  });
});

describe('assertVersionDirAvailable (D4 append-only)', () => {
  it('does not throw for a free directory name', () => {
    expect(() => assertVersionDirAvailable(['2026-08-05_v1'], '2026-08-19_v2')).not.toThrow();
  });

  it('throws VersionConflictError for an existing directory name', () => {
    expect(() => assertVersionDirAvailable(['2026-08-05_v1'], '2026-08-05_v1')).toThrow(
      VersionConflictError,
    );
  });
});
