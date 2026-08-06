import { beforeEach, describe, expect, it } from 'vitest';
import { DemoStorage } from './DemoStorage';
import { VersionConflictError } from './paths';
import type { Plan } from '../domain/types';

function makeBlankPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    sablonVerzio: 'nyilatkozat-hu-v1',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
      szuletesiIdo: '1980-01-01',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
    ...overrides,
  };
}

describe('DemoStorage', () => {
  let storage: DemoStorage;

  beforeEach(async () => {
    localStorage.clear();
    storage = new DemoStorage();
    await storage.init();
  });

  it('seeds the price list, settings and demo plans on first init', async () => {
    const pl = await storage.loadPriceList();
    expect(pl.tetelek).toHaveLength(118);

    const settings = await storage.loadSettings();
    expect(settings.rendelo.nev).toBe('Dr. Mándoki István Fogászati és Szájsebészeti Rendelő');

    const patients = await storage.listPatients();
    expect(patients.length).toBeGreaterThanOrEqual(3);
  });

  it('does not reset already-seeded data on a second init', async () => {
    const pl = await storage.loadPriceList();
    pl.arlistaVerzio = 'modositva-teszt';
    await storage.savePriceList(pl);

    await storage.init(); // második init -- ne írja felül

    const reloaded = await storage.loadPriceList();
    expect(reloaded.arlistaVerzio).toBe('modositva-teszt');
  });

  it('resetDemoData wipes edits back to the seed', async () => {
    const pl = await storage.loadPriceList();
    pl.arlistaVerzio = 'modositva-teszt';
    await storage.savePriceList(pl);

    storage.resetDemoData();

    const reloaded = await storage.loadPriceList();
    expect(reloaded.arlistaVerzio).toBe('2026-07-01');
  });

  it('savePlan creates a new patient folder with v1 for a fresh plan', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1, 2, 3]));
    expect(ref.versionDir).toBe('2026-08-05_v1');

    const loaded = await storage.loadPlan(ref);
    expect(loaded.verzio).toBe(1);
    expect(loaded.tervId).toHaveLength(6);
  });

  it('savePlan on an existing tervId appends v2 without touching v1 (D4)', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    const ref2 = await storage.savePlan(
      { ...v1, keltezes: '2026-08-19' },
      new Uint8Array([2]),
    );

    expect(ref2.patientDir).toBe(ref1.patientDir);
    expect(ref2.versionDir).toBe('2026-08-19_v2');

    // v1 changatlan marad
    const stillV1 = await storage.loadPlan(ref1);
    expect(stillV1.verzio).toBe(1);

    const versions = await storage.listVersions(ref1.patientDir);
    expect(versions.map((v) => v.verzio)).toEqual([1, 2]);
  });

  it('roundtrips the pdf bytes saved alongside a plan', async () => {
    const plan = makeBlankPlan();
    const bytes = new Uint8Array([10, 20, 30, 255]);
    const ref = await storage.savePlan(plan, bytes);
    const loadedBytes = await storage.loadPlanPdf(ref);
    expect(loadedBytes).toEqual(bytes);
  });

  it('saveTemplate always creates a new versioned file, never overwrites', async () => {
    const v1Name = await storage.saveTemplate('nyilatkozat-hu', 'v1 szöveg');
    expect(v1Name).toBe('nyilatkozat-hu-v2.md'); // a seed már ír egy v1-et resetDemoData-ban

    const v1Content = await storage.loadTemplate('nyilatkozat-hu-v1.md');
    expect(v1Content).toContain('PLACEHOLDER');

    const v2Content = await storage.loadTemplate(v1Name);
    expect(v2Content).toBe('v1 szöveg');
  });

  it('rejects loading a plan with a newer-than-known schemaVersion (D18)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    const raw = JSON.parse(localStorage.getItem(`dp:paciensek/${ref.patientDir}/${ref.versionDir}/terv.json`)!);
    raw.schemaVersion = 2;
    localStorage.setItem(
      `dp:paciensek/${ref.patientDir}/${ref.versionDir}/terv.json`,
      JSON.stringify(raw),
    );
    await expect(storage.loadPlan(ref)).rejects.toThrow(/újabb verziójával/);
  });
});

describe('paths re-export sanity', () => {
  it('VersionConflictError is the class thrown internally on a collision', () => {
    expect(VersionConflictError.name).toBe('VersionConflictError');
  });
});
