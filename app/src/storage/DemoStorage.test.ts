import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoStorage } from './DemoStorage';
import type { DemoNode } from './demoFileTree';
import { VersionConflictError } from './paths';
import { seedPatients } from './seed/plans';
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

  // D31: a `savePriceList`/`saveSettings` a `savePlan`-nal KÖZÖS
  // `savingChain`-en fut (`enqueue`) -- ma a `localStorage.setItem` szinkron,
  // tehát ez a lánc önmagában no-op, de a `savePlan` BELSŐ útja (`listPatients`/
  // `listPlans`/`listVersions`) több valódi `await`-en megy át, mielőtt a
  // tényleges `setItem`-ekhez érne. Ha a `savePriceList` NEM ugyanabba a
  // láncba futna, a saját (awaitok nélküli) írása jóval előbb landolna, mint
  // a vele egy tickben induló `savePlan` írásai -- ez a teszt pont ezt zárja ki.
  it('a savePriceList egy vele egy tickben induló savePlan MÖGÉ sorosodik, nem előzi meg (D31)', async () => {
    const order: string[] = [];
    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key.endsWith('/terv.json')) order.push('terv.json');
      if (key === 'dp:arlista.json') order.push('arlista.json');
      originalSetItem(key, value);
    });

    const plan = makeBlankPlan();
    const pl = await storage.loadPriceList();

    await Promise.all([
      storage.savePlan(plan, new Uint8Array([1])),
      storage.savePriceList({ ...pl, arlistaVerzio: 'utana' }),
    ]);

    expect(order).toEqual(['terv.json', 'arlista.json']);
    vi.restoreAllMocks();
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

  // D33 (backlog-28): a paciens-adatok.json -- élő, terv-mentéstől független
  // törzsadat, ellentétben a puszta index-fájlokkal (paciens.json,
  // terv-cimke.json).
  describe('paciens-adatok.json (D33)', () => {
    it('loadPatientData null-t ad, ha még nincs törzsadat -- ez a fallbackre lépés jele, nem hiba', async () => {
      const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
      expect(await storage.loadPatientData(ref.patientDir)).toBeNull();
    });

    it('createPatient mindkét gyökér-fájlt megírja, terv nélkül', async () => {
      const folder = await storage.createPatient('Vadonatúj Páciens');
      expect(folder.nev).toBe('Vadonatúj Páciens');
      expect(folder.paciensId).toHaveLength(6);

      const patients = await storage.listPatients();
      expect(patients.some((p) => p.dirName === folder.dirName)).toBe(true);

      const adatok = await storage.loadPatientData(folder.dirName);
      expect(adatok).toEqual({
        schemaVersion: 1,
        paciensId: folder.paciensId,
        nev: 'Vadonatúj Páciens',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '',
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });

      // Terv nélküli páciens -- a listPlans üres, és a paciens-adatok.json
      // NEM jelenik meg hamis terv-mappaként (a PATIENT_ROOT_FILES szűrő).
      expect(await storage.listPlans(folder.dirName)).toEqual([]);
    });

    // backlog-36, D15: a quick-create dialógus születési dátumot/telefont is
    // felvehet -- egy logikailag atomi lépésben kerül a paciens-adatok.json-ba,
    // nem egy utólagos savePatientData-val (az hamis 'torzsadat-mentve'
    // aktivitást írna egy frissen létrehozott páciensre).
    it('createPatient a kezdoAdatok-ot (születési dátum, telefon) a paciens-adatok.json-ba írja', async () => {
      const folder = await storage.createPatient('Kezdőadatos Páciens', {
        szuletesiIdo: '1990-05-12',
        telefon: '+36 20 111 2222',
      });

      const adatok = await storage.loadPatientData(folder.dirName);
      expect(adatok).toEqual({
        schemaVersion: 1,
        paciensId: folder.paciensId,
        nev: 'Kezdőadatos Páciens',
        szuletesiIdo: '1990-05-12',
        lakcim: '',
        telefon: '+36 20 111 2222',
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });
    });

    it('savePatientData a paciens.json index nev-jét is frissíti', async () => {
      const folder = await storage.createPatient('Régi Név');
      await storage.savePatientData(folder.dirName, {
        schemaVersion: 1,
        paciensId: folder.paciensId,
        nev: 'Új Név',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '',
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });

      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.nev).toBe('Új Név');
    });

    // A törzsadat az igazság a névre is, ha van -- egy terv mentése a
    // benne begépelt (esetleg eltérő) névvel NEM írhatja felül némán a
    // paciens.json indexet, ha már van lezárt paciens-adatok.json.
    it('savePlan a törzsadat nevét írja a paciens.json indexbe, ha van lezárt törzsadat -- nem a terv paciens.nev-jét', async () => {
      const folder = await storage.createPatient('Törzsadat Neve');
      const plan = makeBlankPlan({ paciensId: folder.paciensId, paciens: { ...makeBlankPlan().paciens, nev: 'Terv Alatt Beírt Név' } });

      await storage.savePlan(plan, new Uint8Array([1]));

      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.nev).toBe('Törzsadat Neve');
      // A paciens-adatok.json maga is érintetlen -- a terv-mentés soha nem
      // írja (3. döntés, backlog-28).
      expect((await storage.loadPatientData(folder.dirName))?.nev).toBe('Törzsadat Neve');
    });

    it('savePlan a terv paciens.nev-jét írja az indexbe, ha nincs törzsadat (a meglévő D29 viselkedés változatlan)', async () => {
      const plan = makeBlankPlan();
      const ref = await storage.savePlan(plan, new Uint8Array([1]));
      const patients = await storage.listPatients();
      expect(patients.find((p) => p.dirName === ref.patientDir)?.nev).toBe('Teszt Elek');
    });

    it('rejects loading a paciens-adatok.json with a newer-than-known schemaVersion (D18)', async () => {
      const folder = await storage.createPatient('Séma Teszt');
      const key = `dp:paciensek/${folder.dirName}/paciens-adatok.json`;
      const raw = JSON.parse(localStorage.getItem(key)!);
      raw.schemaVersion = 2;
      localStorage.setItem(key, JSON.stringify(raw));
      await expect(storage.loadPatientData(folder.dirName)).rejects.toThrow(/újabb verziójával/);
    });

    it('rejects a structurally invalid paciens-adatok.json (P1-6 mintája) -- ez valódi system of record, nem eshet néma fallbackre', async () => {
      const folder = await storage.createPatient('Sérült Teszt');
      const key = `dp:paciensek/${folder.dirName}/paciens-adatok.json`;
      localStorage.setItem(key, 'not valid json {{{');
      await expect(storage.loadPatientData(folder.dirName)).rejects.toThrow(/nem érvényes JSON/);
    });
  });

  describe('deletePatient (backlog-41, D50)', () => {
    it('törli a páciens minden kulcsát -- paciens.json, paciens-adatok.json, terv-cimke.json, terv.json, pdf', async () => {
      const folder = await storage.createPatient('Törlendő Páciens');
      const plan = makeBlankPlan({ paciensId: folder.paciensId });
      const ref = await storage.savePlan(plan, new Uint8Array([1]));
      await storage.savePlanLabel(ref.patientDir, ref.planDir, 'Egyedi címke');

      await storage.deletePatient(folder.dirName);

      const patients = await storage.listPatients();
      expect(patients.some((p) => p.dirName === folder.dirName)).toBe(false);
      expect(await storage.loadPatientData(folder.dirName)).toBeNull();
      await expect(storage.loadPlan(ref)).rejects.toThrow();

      // Nem elég, hogy a listPatients ne találja -- ténylegesen egyetlen
      // dp:paciensek/<dir>/ kulcs se maradhat, különben egy jövőbeli
      // listFileTree/readRawFile még mindig mutatná.
      const remaining: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.startsWith(`dp:paciensek/${folder.dirName}/`)) remaining.push(key);
      }
      expect(remaining).toEqual([]);
    });

    // A záró `/` a prefixben nem díszítés: enélkül a lenti "Kis-Bela_abc123"
    // törlése "Kis-Bela_abc123-Junior"-t is elvinné, mert a puszta
    // string-előtag illeszkedne.
    it('egy MÁSIK páciens nem sérül, akinek a mappaneve a töröltnek karakter-előtagja', async () => {
      const rovid = await storage.createPatient('Kis Béla');
      const hosszabbDir = `${rovid.dirName}-Junior`;
      localStorage.setItem(
        `dp:paciensek/${hosszabbDir}/paciens.json`,
        JSON.stringify({ schemaVersion: 1, paciensId: 'zzzzzz', nev: 'Kis Béla Junior' }),
      );

      await storage.deletePatient(rovid.dirName);

      const patients = await storage.listPatients();
      expect(patients.some((p) => p.dirName === rovid.dirName)).toBe(false);
      expect(patients.some((p) => p.dirName === hosszabbDir)).toBe(true);
    });

    it('ismeretlen patientDir-re dob -- egy néma no-op elfedne egy hívói hibát egy visszafordíthatatlan műveletnél', async () => {
      await expect(storage.deletePatient('Nincs-Ilyen_zzzzzz')).rejects.toThrow();
    });
  });

  describe('utolsoAktivitas (D39)', () => {
    it('createPatient "letrehozva" aktivitást ír', async () => {
      const folder = await storage.createPatient('Aktivitás Teszt');
      expect(folder.utolsoAktivitas?.tipus).toBe('letrehozva');
      expect(Number.isFinite(Date.parse(folder.utolsoAktivitas!.idopont))).toBe(true);

      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.utolsoAktivitas?.tipus).toBe('letrehozva');
    });

    it('savePatientData "torzsadat-mentve" aktivitásra írja felül', async () => {
      const folder = await storage.createPatient('Törzsadat Aktivitás');
      await storage.savePatientData(folder.dirName, {
        schemaVersion: 1,
        paciensId: folder.paciensId,
        nev: 'Törzsadat Aktivitás',
        szuletesiIdo: '',
        lakcim: '',
        telefon: '',
        email: '',
        taj: '',
        kiskoru: false,
        torvenyesKepviselo: null,
      });
      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.utolsoAktivitas?.tipus).toBe('torzsadat-mentve');
    });

    it('savePlan "terv-veglegesitve" aktivitásra írja felül', async () => {
      const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === ref.patientDir);
      expect(record?.utolsoAktivitas?.tipus).toBe('terv-veglegesitve');
    });

    it('listPatients elvisel egy szemetes utolsoAktivitas mezőt -- a páciens megmarad, csak a mező marad el (D29)', async () => {
      const folder = await storage.createPatient('Szemetes Aktivitás');
      const key = `dp:paciensek/${folder.dirName}/paciens.json`;
      const raw = JSON.parse(localStorage.getItem(key)!);
      raw.utolsoAktivitas = 'nem-objektum';
      localStorage.setItem(key, JSON.stringify(raw));

      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.nev).toBe('Szemetes Aktivitás');
      expect(record?.utolsoAktivitas).toBeUndefined();
    });

    // D39/D40: a demó-készlet egy páciense (Császár Tibor) SZÁNDÉKOSAN nem
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

    // D33: a paciens-adatok.json mappa-gyökéri fájl -- se hamis terv-
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
      // A migráció nem szintetizál utolsoAktivitas-t -- az egyetlen elérhető
      // időbélyeg a `keltezes` (üzleti dátum, D22), abból nem szabad.
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
});
