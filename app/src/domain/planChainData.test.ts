import { describe, expect, it } from 'vitest';
import { legfrissebbVeglegesVerzio, rendezettLancok, versionDataKey } from './planChainData';
import type { Plan, PlanFolder, PlanVersion, TervStatusz } from './types';

function planFolder(dirName: string): PlanFolder {
  return { dirName, tervId: dirName, tervCim: null };
}

function version(dirName: string, isoDate: string, verzio: number): PlanVersion {
  return { dirName, isoDate, verzio };
}

function minimalPlan(statusz: TervStatusz): Plan {
  return {
    schemaVersion: 1,
    tervId: 't',
    verzio: 1,
    statusz,
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-01',
    ervenyesIg: '2026-11-01',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Teszt Elek',
    paciens: {
      nev: 'Teszt',
      szuletesiIdo: '',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

describe('legfrissebbVeglegesVerzio', () => {
  it('returns null for an empty chain', () => {
    expect(legfrissebbVeglegesVerzio('a', [], {})).toBeNull();
  });

  it('picks the latest VEGLEGES version, ignoring a later PISZKOZAT version', () => {
    const versions = [version('v1', '2026-06-10', 1), version('v2', '2026-08-01', 2)];
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('a', 'v1')]: minimalPlan('VEGLEGES'),
      [versionDataKey('a', 'v2')]: minimalPlan('PISZKOZAT'),
    };
    expect(legfrissebbVeglegesVerzio('a', versions, plansByVersion)).toEqual(version('v1', '2026-06-10', 1));
  });

  it('breaks ties on isoDate by the larger verzio', () => {
    const versions = [version('v1', '2026-08-01', 1), version('v2', '2026-08-01', 2)];
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('a', 'v1')]: minimalPlan('VEGLEGES'),
      [versionDataKey('a', 'v2')]: minimalPlan('VEGLEGES'),
    };
    expect(legfrissebbVeglegesVerzio('a', versions, plansByVersion)).toEqual(version('v2', '2026-08-01', 2));
  });

  // P1-2 mintája: egy sérült/olvashatatlan verzió (nincs a plansByVersion-ben)
  // best-effort VEGLEGES-nek számít, nem dobja csendben ki a láncot.
  it('treats an unreadable version (missing from plansByVersion) as best-effort VEGLEGES', () => {
    const versions = [version('v1', '2026-08-01', 1)];
    expect(legfrissebbVeglegesVerzio('a', versions, {})).toEqual(version('v1', '2026-08-01', 1));
  });

  it('returns null when every readable version is PISZKOZAT', () => {
    const versions = [version('v1', '2026-08-01', 1)];
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('a', 'v1')]: minimalPlan('PISZKOZAT'),
    };
    expect(legfrissebbVeglegesVerzio('a', versions, plansByVersion)).toBeNull();
  });
});

describe('rendezettLancok', () => {
  it('sorts chains by their latest VEGLEGES version date, descending', () => {
    const plans = [planFolder('regi'), planFolder('friss')];
    const versionsByPlan = {
      regi: [version('v1', '2026-06-10', 1)],
      friss: [version('v1', '2026-08-01', 1)],
    };
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('regi', 'v1')]: minimalPlan('VEGLEGES'),
      [versionDataKey('friss', 'v1')]: minimalPlan('VEGLEGES'),
    };
    const result = rendezettLancok(plans, versionsByPlan, plansByVersion);
    expect(result.map((p) => p.dirName)).toEqual(['friss', 'regi']);
  });

  it('does NOT sort by the chain start date -- a chain with an older start but newer latest version wins', () => {
    // A "b7d2e4"-jellegű lánc: v1 2026-06-10, v2 2026-07-22.
    const plans = [planFolder('korabban-indult'), planFolder('kesobb-indult')];
    const versionsByPlan = {
      'korabban-indult': [version('v1', '2026-06-10', 1), version('v2', '2026-07-22', 2)],
      'kesobb-indult': [version('v1', '2026-08-01', 1)],
    };
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('korabban-indult', 'v1')]: minimalPlan('VEGLEGES'),
      [versionDataKey('korabban-indult', 'v2')]: minimalPlan('VEGLEGES'),
      [versionDataKey('kesobb-indult', 'v1')]: minimalPlan('VEGLEGES'),
    };
    const result = rendezettLancok(plans, versionsByPlan, plansByVersion);
    // A "kesobb-indult" lánc egyetlen verziója (2026-08-01) frissebb, mint a
    // "korabban-indult" lánc legfrissebb verziója (2026-07-22) -- ez kerül elöl,
    // annak ellenére, hogy a másik lánc korábban indult.
    expect(result.map((p) => p.dirName)).toEqual(['kesobb-indult', 'korabban-indult']);
  });

  it('puts a chain with no VEGLEGES version at the end', () => {
    const plans = [planFolder('csak-piszkozat'), planFolder('rendes')];
    const versionsByPlan = {
      'csak-piszkozat': [version('v1', '2026-09-01', 1)],
      rendes: [version('v1', '2026-01-01', 1)],
    };
    const plansByVersion: Record<string, Plan> = {
      [versionDataKey('csak-piszkozat', 'v1')]: minimalPlan('PISZKOZAT'),
      [versionDataKey('rendes', 'v1')]: minimalPlan('VEGLEGES'),
    };
    const result = rendezettLancok(plans, versionsByPlan, plansByVersion);
    expect(result.map((p) => p.dirName)).toEqual(['rendes', 'csak-piszkozat']);
  });

  it('does not mutate the input array', () => {
    const plans = [planFolder('a'), planFolder('b')];
    const original = [...plans];
    rendezettLancok(plans, {}, {});
    expect(plans).toEqual(original);
  });
});
