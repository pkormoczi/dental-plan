import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoStorage } from './DemoStorage';
import type { DemoNode } from './demoFileTree';
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
    expect(ref2.planDir).toBe(ref1.planDir);
    expect(ref2.versionDir).toBe('2026-08-19_v2');

    // v1 changatlan marad
    const stillV1 = await storage.loadPlan(ref1);
    expect(stillV1.verzio).toBe(1);

    const versions = await storage.listVersions(ref1.patientDir, ref1.planDir);
    expect(versions.map((v) => v.verzio)).toEqual([1, 2]);
  });

  // D29: a paciensId egy már létező páciens-mappához köti az új tervet, de
  // egy ÚJ (üres) tervId egy MÁSIK terv-mappát nyit ugyanabban a
  // páciens-mappában -- ez a "második terv-lánc ugyanahhoz a pácienshez" eset.
  it('savePlan for a new tervId under an existing paciensId opens a second plan folder in the SAME patient folder', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const saved1 = await storage.loadPlan(ref1);

    const secondPlan = makeBlankPlan({
      paciensId: saved1.paciensId,
      keltezes: '2026-09-01',
    });
    const ref2 = await storage.savePlan(secondPlan, new Uint8Array([2]));

    expect(ref2.patientDir).toBe(ref1.patientDir);
    expect(ref2.planDir).not.toBe(ref1.planDir);

    const plans = await storage.listPlans(ref1.patientDir);
    expect(plans).toHaveLength(2);
  });

  it('savePlan creates a plan folder with no manual címke (tervCim: null -- élő auto-javaslat)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1]));
    const plans = await storage.listPlans(ref.patientDir);
    expect(plans).toHaveLength(1);
    expect(plans[0].dirName).toBe(ref.planDir);
    expect(plans[0].tervCim).toBeNull();
  });

  it('savePlanLabel sets and -- üres értékkel -- törli a terv-cimke.json-t (vissza az auto-javaslatra)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1]));

    await storage.savePlanLabel(ref.patientDir, ref.planDir, 'Fogpótlás');
    let plans = await storage.listPlans(ref.patientDir);
    expect(plans[0].tervCim).toBe('Fogpótlás');

    await storage.savePlanLabel(ref.patientDir, ref.planDir, '   ');
    plans = await storage.listPlans(ref.patientDir);
    expect(plans[0].tervCim).toBeNull();
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
    expect(v1Content).toContain('Megrendelő megrendeli a KEZELÉSI TERV szerinti');

    const v2Content = await storage.loadTemplate(v1Name);
    expect(v2Content).toBe('v1 szöveg');
  });

  it('loadLatestTemplateByBase returns the highest version and its filename', async () => {
    const first = await storage.loadLatestTemplateByBase('nyilatkozat-hu');
    expect(first.name).toBe('nyilatkozat-hu-v1.md');

    await storage.saveTemplate('nyilatkozat-hu', 'v2 szöveg');
    const second = await storage.loadLatestTemplateByBase('nyilatkozat-hu');
    expect(second.name).toBe('nyilatkozat-hu-v2.md');
    expect(second.body).toBe('v2 szöveg');
  });

  it('ensureSeedTemplates (a second init) upgrades a still-placeholder -v1 to the real seed text', async () => {
    // Egy a placeholder bevezetése előtti demó-állapotot szimulálunk: a
    // -v1 fájl törzse még a régi jelölőt tartalmazza.
    localStorage.setItem('dp:sablonok/nyilatkozat-de-v1.md', '# Erklärung\n\n[PLATZHALTER -- régi]\n');

    await storage.init(); // idempotens -- csak a hiányzó/placeholder sablonokat pótolja

    const upgraded = await storage.loadTemplate('nyilatkozat-de-v1.md');
    expect(upgraded).not.toContain('[PLATZHALTER -- régi]');
  });

  it('ensureSeedTemplates never touches a -v1 that the doctor already edited (no longer a placeholder)', async () => {
    localStorage.setItem('dp:sablonok/nyilatkozat-hu-v1.md', '# Nyilatkozat\n\nA doki saját szövege.\n');

    await storage.init();

    const untouched = await storage.loadTemplate('nyilatkozat-hu-v1.md');
    expect(untouched).toBe('# Nyilatkozat\n\nA doki saját szövege.\n');
  });

  it('rejects loading a plan with a newer-than-known schemaVersion (D18)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    const key = `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    const raw = JSON.parse(localStorage.getItem(key)!);
    raw.schemaVersion = 2;
    localStorage.setItem(key, JSON.stringify(raw));
    await expect(storage.loadPlan(ref)).rejects.toThrow(/újabb verziójával/);
  });

  // P0-1: sem félkész verziómappa, sem az eredeti hibaüzenet nem juthat el
  // formázatlanul a felhasználóig egy sikertelen (pl. kvótahibás) íráskor.
  it('savePlan leaves NEITHER key behind when the second write fails, and surfaces a clear message', async () => {
    const plan = makeBlankPlan();
    const originalSetItem = localStorage.setItem.bind(localStorage);
    let callCount = 0;
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      callCount++;
      // Az ELSŐ hívás (terv.json) sikeres, a MÁSODIK (a pdf) elhasal --
      // pont ez a részleges-írás forgatókönyv, amit a D4 tilt.
      if (callCount === 2) throw new DOMException('QuotaExceededError');
      originalSetItem(key, value);
    });

    await expect(storage.savePlan(plan, new Uint8Array([1, 2, 3]))).rejects.toThrow(
      /nem sikerült elmenteni/,
    );

    vi.restoreAllMocks();
    const patients = await storage.listPatients();
    // Csak a resetDemoData() seed-páciensei maradtak -- az új terv mappája
    // NEM jött létre félkészen.
    expect(patients.every((p) => p.dirName !== undefined)).toBe(true);
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)!);
    expect(keys.some((k) => k.includes('Teszt-Elek'))).toBe(false);
  });

  it('two back-to-back savePlan calls for the SAME already-saved plan never collide on the same version number (P1-5)', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const saved = await storage.loadPlan(ref1); // most már van tervId-je

    // Ugyanaz a (már mentett) terv, kétszer -- ez a "Véglegesítés és mentés"
    // dupla-kattintás forgatókönyve: mindkét hívás ugyanahhoz a
    // patientDir-hez tartozik, tehát a `nextVersionNumber()` versenyhelyzete
    // pont itt ütne be `await` nélkül a kettő között.
    const [refA, refB] = await Promise.all([
      storage.savePlan(saved, new Uint8Array([2])),
      storage.savePlan(saved, new Uint8Array([3])),
    ]);

    expect(refA.patientDir).toBe(ref1.patientDir);
    expect(refB.patientDir).toBe(ref1.patientDir);
    expect(refA.versionDir).not.toBe(refB.versionDir);

    const versions = await storage.listVersions(ref1.patientDir, ref1.planDir);
    expect(versions.map((v) => v.verzio).sort()).toEqual([1, 2, 3]);
  });

  it('surfaces a Hungarian, non-crashing error for corrupted (non-JSON) terv.json (P1-6)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    localStorage.setItem(
      `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`,
      '{ "schemaVersion": 1, not valid json',
    );
    await expect(storage.loadPlan(ref)).rejects.toThrow(/nem érvényes JSON/);
  });

  it('rejects a structurally invalid (but syntactically valid) terv.json (P1-6)', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    const key = `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    const raw = JSON.parse(localStorage.getItem(key)!);
    // `mennyiseg` egy string -- a régi kódban ez csendben 0-ra esett volna
    // egy szorzásban, sehol nem futott le rajta típusellenőrzés.
    raw.fazisok = [{ sorszam: 1, megnevezes: 'x', megjegyzes: '', sorok: [{ mennyiseg: 'sok' }] }];
    localStorage.setItem(key, JSON.stringify(raw));
    await expect(storage.loadPlan(ref)).rejects.toThrow(/szerkezete nem érvényes/);
  });

  describe('listFileTree / readRawFile', () => {
    it('a friss seed gyökere csak a két JSON-t, a sablonok/-at és a paciensek/-et tartalmazza, PDF nélkül', async () => {
      const tree = storage.listFileTree();
      expect(tree.map((n) => n.name)).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);

      const sablonok = tree.find((n) => n.name === 'sablonok');
      expect(sablonok?.type).toBe('dir');
      if (sablonok?.type !== 'dir') throw new Error('unreachable');
      expect(sablonok.children).toHaveLength(6);

      const paciensek = tree.find((n) => n.name === 'paciensek');
      if (paciensek?.type !== 'dir') throw new Error('unreachable');
      expect(paciensek.children.length).toBeGreaterThanOrEqual(3);

      function flatten(nodes: DemoNode[]): DemoNode[] {
        return nodes.flatMap((n) => (n.type === 'dir' ? [n, ...flatten(n.children)] : [n]));
      }
      expect(flatten(tree).some((n) => n.name === 'kezelesi-terv.pdf')).toBe(false);
    });

    it('savePlan után a mentett verziómappa terv.json-t ÉS kezelesi-terv.pdf-et is tartalmaz', async () => {
      const plan = makeBlankPlan();
      const ref = await storage.savePlan(plan, new Uint8Array([1, 2, 3]));

      const tree = storage.listFileTree();
      const paciensek = tree.find((n) => n.name === 'paciensek');
      if (paciensek?.type !== 'dir') throw new Error('unreachable');
      const patient = paciensek.children.find((n) => n.name === ref.patientDir);
      if (patient?.type !== 'dir') throw new Error('unreachable');
      const planNode = patient.children.find((n) => n.name === ref.planDir);
      if (planNode?.type !== 'dir') throw new Error('unreachable');
      const versionNode = planNode.children.find((n) => n.name === ref.versionDir);
      if (versionNode?.type !== 'dir') throw new Error('unreachable');

      expect(versionNode.children.map((n) => n.name).sort()).toEqual(['kezelesi-terv.pdf', 'terv.json']);
    });

    it('a dp:piszkozat közvetlen írása nem változtatja meg a fát', async () => {
      const before = storage.listFileTree();
      localStorage.setItem(
        'dp:piszkozat',
        JSON.stringify({ schemaVersion: 1, mentve: '2026-08-11T10:00:00.000Z', plan: makeBlankPlan() }),
      );
      expect(storage.listFileTree()).toEqual(before);
    });

    it('savePlanLabel után terv-cimke.json megjelenik a fában', async () => {
      const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
      await storage.savePlanLabel(ref.patientDir, ref.planDir, 'Fogpótlás');

      const tree = storage.listFileTree();
      const paciensek = tree.find((n) => n.name === 'paciensek');
      if (paciensek?.type !== 'dir') throw new Error('unreachable');
      const patient = paciensek.children.find((n) => n.name === ref.patientDir);
      if (patient?.type !== 'dir') throw new Error('unreachable');
      const planNode = patient.children.find((n) => n.name === ref.planDir);
      if (planNode?.type !== 'dir') throw new Error('unreachable');

      expect(planNode.children.some((n) => n.name === 'terv-cimke.json')).toBe(true);
    });

    it('saveTemplate után a régi ÉS az új verziójú sablonfájl is látszik a fában (D4)', async () => {
      await storage.saveTemplate('garancia-hu', 'új szöveg');

      const tree = storage.listFileTree();
      const sablonok = tree.find((n) => n.name === 'sablonok');
      if (sablonok?.type !== 'dir') throw new Error('unreachable');
      const names = sablonok.children.map((n) => n.name);
      expect(names).toContain('garancia-hu-v1.md');
      expect(names).toContain('garancia-hu-v2.md');
    });

    it('readRawFile a pontos tárolt stringet adja vissza, ismeretlen/prefix nélküli kulcsra null-t', async () => {
      const raw = storage.readRawFile('dp:arlista.json');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).schemaVersion).toBe(1);

      expect(storage.readRawFile('dp:nincs-ilyen')).toBeNull();
      expect(storage.readRawFile('nincs-prefix')).toBeNull();
    });
  });

  // D29 -- egyszeri migráció a régi (páciens → verzió) 2 szintű
  // localStorage-szerkezetről az újra (páciens → terv → verzió).
  describe('legacy layout migration', () => {
    const legacyPatientDir = 'Legacy-Pati_zzzzzz';

    function legacyPlan(overrides: Partial<Plan> = {}): Plan {
      return makeBlankPlan({
        tervId: 'oldv1',
        paciens: { ...makeBlankPlan().paciens, nev: 'Legacy Pati' },
        ...overrides,
      });
    }

    it('migrates every version of a legacy patient dir into ONE new plan folder', async () => {
      const v1 = legacyPlan({ verzio: 1, keltezes: '2026-01-01' });
      const v2 = legacyPlan({ verzio: 2, keltezes: '2026-02-01' });
      localStorage.setItem(`dp:paciensek/${legacyPatientDir}/2026-01-01_v1/terv.json`, JSON.stringify(v1));
      localStorage.setItem(`dp:paciensek/${legacyPatientDir}/2026-01-01_v1/pdf`, 'QUFB');
      localStorage.setItem(`dp:paciensek/${legacyPatientDir}/2026-02-01_v2/terv.json`, JSON.stringify(v2));

      await storage.init(); // második init -- ez futtatja a migrációt

      const patients = await storage.listPatients();
      const migrated = patients.find((p) => p.dirName === legacyPatientDir);
      expect(migrated).toBeDefined();
      expect(migrated!.nev).toBe('Legacy Pati');
      expect(migrated!.paciensId).toBe('zzzzzz');

      const plans = await storage.listPlans(legacyPatientDir);
      expect(plans).toHaveLength(1); // mindkét régi verzió UGYANABBA az egy láncba kerül

      const versions = await storage.listVersions(legacyPatientDir, plans[0].dirName);
      expect(versions.map((v) => v.verzio).sort()).toEqual([1, 2]);

      const loadedV1 = await storage.loadPlan({
        patientDir: legacyPatientDir,
        planDir: plans[0].dirName,
        versionDir: '2026-01-01_v1',
      });
      expect(loadedV1.tervId).toBe('oldv1');
      expect(loadedV1.paciensId).toBe('zzzzzz');
      const migratedPdf = await storage.loadPlanPdf({
        patientDir: legacyPatientDir,
        planDir: plans[0].dirName,
        versionDir: '2026-01-01_v1',
      });
      expect(migratedPdf).not.toBeNull();

      // A régi lapos kulcsok eltűntek.
      expect(
        localStorage.getItem(`dp:paciensek/${legacyPatientDir}/2026-01-01_v1/terv.json`),
      ).toBeNull();
      expect(localStorage.getItem(`dp:paciensek/${legacyPatientDir}/2026-01-01_v1/pdf`)).toBeNull();
    });

    it('is idempotent -- a second init() after migration does not duplicate the plan folder', async () => {
      localStorage.setItem(
        `dp:paciensek/${legacyPatientDir}/2026-01-01_v1/terv.json`,
        JSON.stringify(legacyPlan({ verzio: 1, keltezes: '2026-01-01' })),
      );

      await storage.init();
      await storage.init(); // a mostmár 3 szintű mappa NEM legacy -- a felismerés nem üt be újra

      const plans = await storage.listPlans(legacyPatientDir);
      expect(plans).toHaveLength(1);
    });

    it('falls back to resetDemoData() when a legacy version fails to migrate (corrupt terv.json)', async () => {
      localStorage.setItem(
        `dp:paciensek/${legacyPatientDir}/2026-01-01_v1/terv.json`,
        'not valid json {{{',
      );

      await storage.init();

      // A teljes demó-adat visszaáll a friss seedre -- a törött legacy
      // páciens nem maradhat félmigrálva.
      const patients = await storage.listPatients();
      expect(patients.some((p) => p.dirName === legacyPatientDir)).toBe(false);
      expect(patients.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('paths re-export sanity', () => {
  it('VersionConflictError is the class thrown internally on a collision', () => {
    expect(VersionConflictError.name).toBe('VersionConflictError');
  });
});
