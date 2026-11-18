import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoStorage } from './DemoStorage';
import { PREFIX } from './localKeys';
import type { DemoNode } from './demoFileTree';
import { VersionConflictError } from './paths';
import { seedPatients } from './seed/plans';
import { makeBlankPlan, taroloSzerzodesTesztek, type SzerzodesKornyezet } from './szerzodesTesztek';
import type { Plan } from '../domain/types';

/** A szerződéstesztek nyers hozzáférése a demó `dp:` kulcsterén át. */
function demoKornyezet(storage: DemoStorage): SzerzodesKornyezet {
  return {
    storage,
    nyersOlvas: async (ut) => localStorage.getItem(`${PREFIX}${ut}`),
    nyersIr: async (ut, tartalom) => localStorage.setItem(`${PREFIX}${ut}`, tartalom),
    osszesFajl: async () => {
      const utak: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const kulcs = localStorage.key(i)!;
        if (kulcs.startsWith(PREFIX)) utak.push(kulcs.slice(PREFIX.length));
      }
      return utak;
    },
    irasFigyelo: (fn) => {
      const eredeti = localStorage.setItem.bind(localStorage);
      const kem = vi.spyOn(localStorage, 'setItem').mockImplementation((kulcs, ertek) => {
        if (kulcs.startsWith(PREFIX)) fn(kulcs.slice(PREFIX.length));
        eredeti(kulcs, ertek);
      });
      return () => kem.mockRestore();
    },
  };
}

describe('DemoStorage szerződés', () => {
  taroloSzerzodesTesztek(async () => {
    localStorage.clear();
    const storage = new DemoStorage();
    await storage.init();
    return demoKornyezet(storage);
  });
});

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

  it('ensureSeedTemplates does not overwrite a doctor-edited body that still contains a leftover placeholder marker', async () => {
    localStorage.setItem(
      'dp:sablonok/garancia-hu-v1.md',
      '# Garancia\n\nA doki valódi szövege, de bent hagyta: [PLACEHOLDER -- ellenőrizendő].\n',
    );

    await storage.init(); // idempotens -- a seed maga is placeholder, ezért nem írja felül

    const untouched = await storage.loadTemplate('garancia-hu-v1.md');
    expect(untouched).toContain('A doki valódi szövege');
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

  // A demó-készlet egy páciense (Császár Tibor) SZÁNDÉKOSAN nem
  // kap utolsoAktivitas-t -- egy legacy-migrációt szimuláló edge case
  // (lásd storage/seed/plans.ts), ezért a várt darabszámot a seed
  // forrásából számoljuk, nem "mindenki"-t állítunk.
  it('resetDemoData után a seed pácienseknek pontosan a szándékolt köre kap utolsoAktivitas-t', async () => {
    storage.resetDemoData();
    const patients = await storage.listPatients();
    const vartAktivDbSzama = seedPatients.filter(({ record }) => record.utolsoAktivitas != null).length;
    expect(patients.filter((p) => p.utolsoAktivitas != null)).toHaveLength(vartAktivDbSzama);
    expect(patients.some((p) => p.utolsoAktivitas == null)).toBe(true);
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

    // A paciens-adatok.json mappa-gyökéri fájl -- se hamis terv-
    // mappaként (listPlans), se láthatatlanul (demoFileTree allowlist) nem
    // szabad megjelennie.
    it('createPatient után a paciens-adatok.json megjelenik a páciens-mappa gyökerén, terv-mappa nélkül', async () => {
      const folder = await storage.createPatient('Fa Teszt');

      const tree = storage.listFileTree();
      const paciensek = tree.find((n) => n.name === 'paciensek');
      if (paciensek?.type !== 'dir') throw new Error('unreachable');
      const patient = paciensek.children.find((n) => n.name === folder.dirName);
      if (patient?.type !== 'dir') throw new Error('unreachable');

      expect(patient.children.map((n) => n.name).sort()).toEqual(['paciens-adatok.json', 'paciens.json']);
    });

    it('saveTemplate után is pontosan egy fájl látszik a base-hez a fában, nem keletkezik új verzió', async () => {
      await storage.saveTemplate('garancia-hu', 'új szöveg');

      const tree = storage.listFileTree();
      const sablonok = tree.find((n) => n.name === 'sablonok');
      if (sablonok?.type !== 'dir') throw new Error('unreachable');
      const names = sablonok.children.map((n) => n.name);
      expect(names).toContain('garancia-hu-v1.md');
      expect(names).not.toContain('garancia-hu-v2.md');
    });

    it('readRawFile a pontos tárolt stringet adja vissza, ismeretlen/prefix nélküli kulcsra null-t', async () => {
      const raw = storage.readRawFile('dp:arlista.json');
      expect(raw).not.toBeNull();
      expect(JSON.parse(raw!).schemaVersion).toBe(1);

      expect(storage.readRawFile('dp:nincs-ilyen')).toBeNull();
      expect(storage.readRawFile('nincs-prefix')).toBeNull();
    });
  });

  // Egyszeri migráció a régi (páciens → verzió) 2 szintű
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
      // A migráció nem szintetizál utolsoAktivitas-t -- az egyetlen elérhető
      // időbélyeg a `keltezes` (üzleti dátum), abból nem szabad.
      expect(migrated!.utolsoAktivitas).toBeUndefined();

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

  it('a demóban nincs ütközésőr: a betöltés óta kívülről átírt árlistára a mentés gond nélkül felülír', async () => {
    localStorage.clear();
    const storage = new DemoStorage();
    await storage.init();
    const pl = await storage.loadPriceList();
    localStorage.setItem(`${PREFIX}arlista.json`, JSON.stringify({ ...pl, arlistaVerzio: 'masik' }));

    await storage.savePriceList({ ...pl, arlistaVerzio: 'sajat' });

    expect((await storage.loadPriceList()).arlistaVerzio).toBe('sajat');
  });

  it('a demóban nincs ütközés-vizsgálat: egy ütközéses nevű kulcs mellett is üres a lista', async () => {
    localStorage.clear();
    const storage = new DemoStorage();
    await storage.init();
    localStorage.setItem(`${PREFIX}arlista (1).json`, '{}');

    expect(await storage.listUtkozesek()).toEqual([]);
  });
});
