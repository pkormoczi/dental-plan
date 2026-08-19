import { describe, expect, it } from 'vitest';
import { latestVersionAcrossPlans, legfrissebbVerzio } from './planFolders';
import type { PlanFolder, PlanVersion } from './types';

function plan(dirName: string, tervId = dirName): PlanFolder {
  return { dirName, tervId, tervCim: null };
}

function version(dirName: string, isoDate: string, verzio: number): PlanVersion {
  return { dirName, isoDate, verzio };
}

describe('latestVersionAcrossPlans', () => {
  it('returns null for zero plans', () => {
    expect(latestVersionAcrossPlans([], () => [])).toBeNull();
  });

  it('returns null when every plan has zero readable versions', () => {
    const plans = [plan('a'), plan('b')];
    expect(latestVersionAcrossPlans(plans, () => [])).toBeNull();
  });

  it('picks the most recent isoDate across different plan chains', () => {
    const plans = [plan('a'), plan('b')];
    const versionsFor = (planDir: string) =>
      planDir === 'a' ? [version('v1', '2026-06-10', 1)] : [version('v1', '2026-08-01', 1)];
    const result = latestVersionAcrossPlans(plans, versionsFor);
    expect(result).toEqual({ planDir: 'b', version: version('v1', '2026-08-01', 1) });
  });

  it('breaks ties on isoDate by the larger verzio', () => {
    const plans = [plan('a')];
    const versionsFor = () => [version('v1', '2026-08-01', 1), version('v2', '2026-08-01', 2)];
    const result = latestVersionAcrossPlans(plans, versionsFor);
    expect(result?.version).toEqual(version('v2', '2026-08-01', 2));
  });
});

describe('legfrissebbVerzio', () => {
  it('returns null for an empty chain', () => {
    expect(legfrissebbVerzio([])).toBeNull();
  });

  // Ez a 46. tétel bugjavítása: a `versions` tömb a `verzio` szerint
  // növekvőn érkezhet -- a LEGRÉGEBBI (index 0) sosem lehet a válasz.
  it('picks the most recent isoDate, not the array position', () => {
    const versions = [version('2026-06-10_v1', '2026-06-10', 1), version('2026-07-22_v2', '2026-07-22', 2)];
    expect(legfrissebbVerzio(versions)).toEqual(version('2026-07-22_v2', '2026-07-22', 2));
  });

  it('breaks ties on isoDate by the larger verzio', () => {
    const versions = [version('v1', '2026-08-01', 1), version('v2', '2026-08-01', 2)];
    expect(legfrissebbVerzio(versions)).toEqual(version('v2', '2026-08-01', 2));
  });
});
