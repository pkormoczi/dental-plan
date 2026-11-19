// A `PlanStorage` szerződéstesztjei: ugyanez a készlet fut a demó (localStorage), a közös mag
// (memória) és a telepített app tárolóján, hogy mindhárom ugyanazt a szemantikát igazolja.
// A tesztek a tárolót csak a szerződésen és a `SzerzodesKornyezet` nyers hozzáférésén át
// érik el; az útvonalak a gyökérhez képest relatívak.

import { beforeEach, describe, expect, it } from 'vitest';
import type { Plan } from '../domain/types';
import type { PlanStorage } from './PlanStorage';
import { VersionConflictError } from './paths';
import { sha256Hex } from './sha256';

export interface SzerzodesKornyezet {
  storage: PlanStorage;
  /** Egy fájl nyers tartalma; `null`, ha nincs. */
  nyersOlvas(ut: string): Promise<string | null>;
  nyersIr(ut: string, tartalom: string): Promise<void>;
  /** Minden tárolt fájl útvonala. */
  osszesFajl(): Promise<string[]>;
  /**
   * A tároló minden írása előtt meghívja `fn`-t az útvonallal; ha `fn` dob, az írás elmarad
   * és hibával tér vissza. A visszaadott függvény leveszi a figyelőt.
   */
  irasFigyelo(fn: (ut: string) => void): () => void;
}

export function makeBlankPlan(overrides: Partial<Plan> = {}): Plan {
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

/** A `keszit` minden teszt előtt friss, alapkészlettel (árlista, beállítások, sablonok) feltöltött tárolót ad. */
export function taroloSzerzodesTesztek(keszit: () => Promise<SzerzodesKornyezet>): void {
  let storage: PlanStorage;
  let k: SzerzodesKornyezet;

  beforeEach(async () => {
    k = await keszit();
    storage = k.storage;
  });

  /**
   * Egy mentett verziófájl cseréje úgy, ahogy egy másik gép teljes verzióként hozná létre:
   * manifestes tárolón a manifest is az új tartalomra áll, különben a verzió hiányosnak látszana,
   * és a teszt a teljesség-őrt mérné a vizsgált betöltési hiba helyett.
   */
  async function verzioFajlotCserel(ut: string, tartalom: string): Promise<void> {
    await k.nyersIr(ut, tartalom);
    const manifestUt = ut.replace(/[^/]+$/, 'manifest.json');
    const raw = await k.nyersOlvas(manifestUt);
    if (raw == null) return;
    const manifest = JSON.parse(raw);
    manifest.fajlok[ut.slice(ut.lastIndexOf('/') + 1)] = {
      sha256: await sha256Hex(tartalom),
      meret: new TextEncoder().encode(tartalom).length,
    };
    await k.nyersIr(manifestUt, JSON.stringify(manifest));
  }

  it('savePlan creates a new patient folder with v1 for a fresh plan', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1, 2, 3]));
    expect(ref.versionDir).toBe('2026-08-05_v1');

    const loaded = await storage.loadPlan(ref);
    expect(loaded.verzio).toBe(1);
    expect(loaded.tervId).toHaveLength(6);
  });

  it('savePlan on an existing tervId appends v2 without touching v1', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    // `verzio: 0` = a hívó nem foglalt előre azonosítót, a kiosztás a
    // storage-é; egy nem nulla, a lánc következő számától eltérő érték
    // szándékosan dob (lásd a foglalás-ellenőrzés tesztjét lent).
    const ref2 = await storage.savePlan(
      { ...v1, verzio: 0, keltezes: '2026-08-19' },
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

  // A paciensId egy már létező páciens-mappához köti az új tervet, de
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

  it('savePlan for a NEW chain with an egyéni tervCim uses it for the planDir, not the domináns kategória', async () => {
    const priceList = await storage.loadPriceList();
    const tetel = priceList.tetelek.find((t) => t.aktiv)!;
    const kategoria = priceList.kategoriak.find((k) => k.id === tetel.kategoriaId)!;
    const planWithKategoria = makeBlankPlan({
      fazisok: [
        {
          sorszam: 1,
          megnevezes: '1. fázis',
          megjegyzes: '',
          sorok: [
            {
              tetelId: tetel.id,
              nevSnapshot: tetel.nev.hu,
              savos: false,
              fogak: '',
              mennyiseg: 1,
              listaEgysegar: 10000,
              tenylegesEgysegar: 10000,
            },
          ],
        },
      ],
    });

    const autoJavaslat = await storage.savePlan(planWithKategoria, new Uint8Array([1]));
    expect(autoJavaslat.planDir.startsWith(kategoria.nev.hu)).toBe(true);

    const egyeniCimmel = await storage.savePlan(
      planWithKategoria,
      new Uint8Array([2]),
      'Fogpótlás konzultáció',
    );
    expect(egyeniCimmel.planDir.startsWith('Fogpótlás konzultáció')).toBe(true);
    expect(egyeniCimmel.planDir).not.toContain(kategoria.nev.hu);
  });

  it('savePlan egy MÁR LÉTEZŐ lánc újabb verziójánál a planDir-t nem érinti az ujLancCim', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    const ref2 = await storage.savePlan(
      { ...v1, verzio: 0, keltezes: '2026-08-19' },
      new Uint8Array([2]),
      'Ez a cím nem hathat egy meglévő láncra',
    );

    expect(ref2.planDir).toBe(ref1.planDir);
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

  it('savePlanErvenytelenites jelöli a verziót a listVersions-ben, a terv.json érintetlenül hagyva', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1]));
    const elotte = await storage.loadPlan(ref);

    await storage.savePlanErvenytelenites(ref.patientDir, ref.planDir, ref.versionDir, 'rossz árlista');

    const versions = await storage.listVersions(ref.patientDir, ref.planDir);
    expect(versions).toHaveLength(1);
    expect(versions[0].ervenytelenites).toBe('rossz árlista');
    expect(await storage.loadPlan(ref)).toEqual(elotte);
    expect(await storage.loadPlanPdf(ref)).toEqual(new Uint8Array([1]));
  });

  it('savePlanErvenytelenites üres indokkal visszavonja a jelölést, és nem hagy sidecart a fában', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1]));
    await storage.savePlanErvenytelenites(ref.patientDir, ref.planDir, ref.versionDir, 'téves');
    const sidecarUt = `paciensek/${ref.patientDir}/${ref.planDir}/terv-ervenytelenitesek.json`;
    expect(await k.nyersOlvas(sidecarUt)).not.toBeNull();

    await storage.savePlanErvenytelenites(ref.patientDir, ref.planDir, ref.versionDir, '   ');

    const versions = await storage.listVersions(ref.patientDir, ref.planDir);
    expect(versions[0].ervenytelenites).toBeUndefined();
    expect(await k.nyersOlvas(sidecarUt)).toBeNull();
  });

  it('a lánc egy MÁSIK verziójának jelölése az elsőt nem érinti, és a sidecar nem számít verziómappának', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);
    const ref2 = await storage.savePlan({ ...v1, verzio: 0 }, new Uint8Array([2]));

    await storage.savePlanErvenytelenites(ref1.patientDir, ref1.planDir, ref1.versionDir, 'v1 téves');

    const versions = await storage.listVersions(ref1.patientDir, ref1.planDir);
    // A sidecar-fájl nem jelenik meg álverzióként a lista végén.
    expect(versions.map((v) => v.dirName)).toEqual([ref1.versionDir, ref2.versionDir]);
    expect(versions[0].ervenytelenites).toBe('v1 téves');
    expect(versions[1].ervenytelenites).toBeUndefined();
  });

  it('sérült terv-ervenytelenitesek.json esetén a verziók jelölés nélkül, de hiánytalanul listázódnak', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array([1]));
    await k.nyersIr(
      `paciensek/${ref.patientDir}/${ref.planDir}/terv-ervenytelenitesek.json`,
      'not valid json {{{',
    );

    const versions = await storage.listVersions(ref.patientDir, ref.planDir);
    expect(versions.map((v) => v.dirName)).toEqual([ref.versionDir]);
    expect(versions[0].ervenytelenites).toBeUndefined();
  });

  it('a mentett verzió a listVersions-ben teljes állapotú, hiányzó-lista nélkül', async () => {
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));

    const [v] = await storage.listVersions(ref.patientDir, ref.planDir);

    expect(v.allapot).toBe('teljes');
    expect(v.hianyzik).toBeUndefined();
  });

  it('a paciens.json index írásának hibája nem teszi sikertelenné a mentést: figyelmeztetés, a verzió teljes és betölthető', async () => {
    const figyeloLe = k.irasFigyelo((ut) => {
      if (ut.endsWith('/paciens.json')) throw new Error('EACCES');
    });

    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1, 2, 3]));

    figyeloLe();
    expect(ref.figyelmeztetes).toBe('INDEX_IRAS_HIBA');
    const [v] = await storage.listVersions(ref.patientDir, ref.planDir);
    expect(v.allapot).toBe('teljes');
    expect((await storage.loadPlan(ref)).verzio).toBe(1);
    expect(await storage.loadPlanPdf(ref)).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('sikeres mentés nem ad figyelmeztetést', async () => {
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    expect(ref.figyelmeztetes).toBeUndefined();
  });

  it('listPatients és listPlans csak a saját <név>_<id6> mappákat adja: ütközéses, temp és idegen név kimarad', async () => {
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    await k.nyersIr(`paciensek/${ref.patientDir} (1)/paciens.json`, JSON.stringify({ schemaVersion: 1, paciensId: 'x', nev: 'x' }));
    await k.nyersIr('paciensek/Idegen mappa/jegyzet.txt', 'x');
    await k.nyersIr(`paciensek/${ref.patientDir}/paciens-adatok (1).json`, '{}');
    await k.nyersIr(`paciensek/${ref.patientDir}/Regi tervek/jegyzet.txt`, 'x');

    const paciensek = (await storage.listPatients()).map((p) => p.dirName);
    expect(paciensek).toContain(ref.patientDir);
    expect(paciensek.filter((d) => d.endsWith(' (1)') || d === 'Idegen mappa')).toEqual([]);
    expect((await storage.listPlans(ref.patientDir)).map((p) => p.dirName)).toEqual([ref.planDir]);
  });

  it('roundtrips the pdf bytes saved alongside a plan', async () => {
    const plan = makeBlankPlan();
    const bytes = new Uint8Array([10, 20, 30, 255]);
    const ref = await storage.savePlan(plan, bytes);
    const loadedBytes = await storage.loadPlanPdf(ref);
    expect(loadedBytes).toEqual(bytes);
  });

  it('listTemplates returns every stored template file name in order, without duplicates after a save', async () => {
    const seeded = await storage.listTemplates();
    expect(seeded).toEqual([
      'fizetesi-feltetelek-de-v1.md',
      'fizetesi-feltetelek-hu-v1.md',
      'garancia-de-v1.md',
      'garancia-hu-v1.md',
      'nyilatkozat-de-v1.md',
      'nyilatkozat-hu-v1.md',
    ]);

    // A mentés előtti betöltés a valódi hívó sorrendje (Nyomtatványok fül); ütközésőrös tárolón
    // egy betöltetlen, létező fájlra mentés ütközés lenne.
    await storage.loadLatestTemplateByBase('nyilatkozat-hu');
    await storage.saveTemplate('nyilatkozat-hu', 'átírt szöveg');
    await k.nyersIr('sablonok/garancia-hu-v2.md', 'v2 szöveg');

    expect(await storage.listTemplates()).toEqual([
      'fizetesi-feltetelek-de-v1.md',
      'fizetesi-feltetelek-hu-v1.md',
      'garancia-de-v1.md',
      'garancia-hu-v1.md',
      'garancia-hu-v2.md',
      'nyilatkozat-de-v1.md',
      'nyilatkozat-hu-v1.md',
    ]);
  });

  it('saveTemplate overwrites the current latest file, never creates a new version', async () => {
    await storage.loadLatestTemplateByBase('nyilatkozat-hu');
    const v1Name = await storage.saveTemplate('nyilatkozat-hu', 'v1 szöveg');
    expect(v1Name).toBe('nyilatkozat-hu-v1.md'); // a seed már ír egy v1-et resetDemoData-ban

    const v1Content = await storage.loadTemplate('nyilatkozat-hu-v1.md');
    expect(v1Content).toBe('v1 szöveg');
    expect(await storage.loadTemplate('nyilatkozat-hu-v1.md')).not.toContain(
      'Megrendelő megrendeli a KEZELÉSI TERV szerinti',
    );
  });

  it('saveTemplate overwrites the highest existing version, leaving lower ones untouched', async () => {
    // A seedben ma minden base -v1 -- egy magasabb verziót itt kézzel
    // szimulálunk, hogy a `latestTemplateFile` kiválasztása külön a seed
    // tartalmától tesztelhető legyen.
    await k.nyersIr('sablonok/teszt-alap-v1.md', 'v1 szöveg');
    await k.nyersIr('sablonok/teszt-alap-v2.md', 'v2 szöveg');

    const first = await storage.loadLatestTemplateByBase('teszt-alap');
    expect(first.name).toBe('teszt-alap-v2.md');

    const savedName = await storage.saveTemplate('teszt-alap', 'új v2 szöveg');
    expect(savedName).toBe('teszt-alap-v2.md');

    const second = await storage.loadLatestTemplateByBase('teszt-alap');
    expect(second.name).toBe('teszt-alap-v2.md');
    expect(second.body).toBe('új v2 szöveg');

    const v1 = await storage.loadTemplate('teszt-alap-v1.md');
    expect(v1).not.toBe('új v2 szöveg');
  });

  it('rejects loading a plan with a newer-than-known schemaVersion', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    const key = `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    const raw = JSON.parse((await k.nyersOlvas(key))!);
    raw.schemaVersion = 2;
    await verzioFajlotCserel(key, JSON.stringify(raw));
    await expect(storage.loadPlan(ref)).rejects.toThrow(/újabb verziójával/);
  });

  // sem félkész verziómappa, sem az eredeti hibaüzenet nem juthat el
  // formázatlanul a felhasználóig egy sikertelen (pl. kvótahibás) íráskor.
  it('savePlan leaves NEITHER key behind when the second write fails, and surfaces a clear message', async () => {
    const plan = makeBlankPlan();
    let callCount = 0;
    const figyeloLe = k.irasFigyelo(() => {
      callCount++;
      // Az ELSŐ írás (terv.json) sikeres, a MÁSODIK (a pdf) elhasal --
      // pont ez a részleges-írás forgatókönyv: verziómappa sosem maradhat csonkán.
      if (callCount === 2) throw new Error('QuotaExceededError');
    });

    await expect(storage.savePlan(plan, new Uint8Array([1, 2, 3]))).rejects.toThrow(
      /nem sikerült elmenteni/,
    );

    figyeloLe();
    const patients = await storage.listPatients();
    // Csak a korábban is meglévő páciensek maradtak -- az új terv mappája
    // NEM jött létre félkészen.
    expect(patients.every((p) => p.dirName !== undefined)).toBe(true);
    const keys = await k.osszesFajl();
    expect(keys.some((k) => k.includes('Teszt-Elek'))).toBe(false);
  });

  it('two back-to-back savePlan calls for the SAME already-saved plan never collide on the same version number', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const saved = await storage.loadPlan(ref1); // most már van tervId-je

    // Ugyanaz a (már mentett) terv, kétszer -- ez a "Véglegesítés és mentés"
    // dupla-kattintás forgatókönyve: mindkét hívás ugyanahhoz a
    // patientDir-hez tartozik, tehát a `nextVersionNumber()` versenyhelyzete
    // pont itt ütne be `await` nélkül a kettő között.
    const [refA, refB] = await Promise.all([
      storage.savePlan({ ...saved, verzio: 0 }, new Uint8Array([2])),
      storage.savePlan({ ...saved, verzio: 0 }, new Uint8Array([3])),
    ]);

    expect(refA.patientDir).toBe(ref1.patientDir);
    expect(refB.patientDir).toBe(ref1.patientDir);
    expect(refA.versionDir).not.toBe(refB.versionDir);

    const versions = await storage.listVersions(ref1.patientDir, ref1.planDir);
    expect(versions.map((v) => v.verzio).sort()).toEqual([1, 2, 3]);
  });

  it('savePlan a már foglalt sorszámra VersionConflictError-t dob a foglaló verzió adataival, és semmit nem ír ki', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    // A hívó (az előnézet) v1-et foglalt, de a lánc következő szabad száma
    // már v2 -- ez az a szétcsúszás, amikor a papíron más verzió áll, mint
    // ami mentődne. Néma felülírás helyett dob.
    const hiba = await storage
      .savePlan({ ...v1, verzio: 1, keltezes: '2026-08-19' }, new Uint8Array([2]))
      .catch((e: unknown) => e);

    expect(hiba).toBeInstanceOf(VersionConflictError);
    expect(hiba).toMatchObject({
      dirName: ref1.versionDir,
      letezo: { datum: v1.keltezes, orvos: v1.orvos, vegosszeg: v1.osszesitok.fizetendo, penznem: v1.penznem },
    });

    const versions = await storage.listVersions(ref1.patientDir, ref1.planDir);
    expect(versions.map((v) => v.verzio)).toEqual([1]);
  });

  it('savePlan tört pénzértéket tartalmazó tervnél hibát dob, és nem hoz létre verziómappát', async () => {
    const before = await storage.listPatients();

    await expect(
      storage.savePlan(
        makeBlankPlan({ osszesitok: { kezelesekOsszesen: 10.5, kedvezmeny: 0, fizetendo: 10.5 } }),
        new Uint8Array([1]),
      ),
    ).rejects.toThrow(/osszesitok\.kezelesekOsszesen nem egész pénzérték/);

    expect(await storage.listPatients()).toEqual(before);
  });

  it('savePlan az előre lefoglalt, EGYEZŐ verzio-t elfogadja', async () => {
    const plan = makeBlankPlan();
    const ref1 = await storage.savePlan(plan, new Uint8Array([1]));
    const v1 = await storage.loadPlan(ref1);

    const ref2 = await storage.savePlan(
      { ...v1, verzio: 2, keltezes: '2026-08-19' },
      new Uint8Array([2]),
    );

    expect(ref2.versionDir).toBe('2026-08-19_v2');
    expect((await storage.loadPlan(ref2)).verzio).toBe(2);
  });

  // A `savePriceList`/`saveSettings` a `savePlan`-nal KÖZÖS
  // `savingChain`-en fut (`enqueue`) -- a localStorage-on az írás szinkron,
  // tehát ott a lánc önmagában no-op, de a `savePlan` BELSŐ útja (`listPatients`/
  // `listPlans`/`listVersions`) több valódi `await`-en megy át, mielőtt a
  // tényleges írásokhoz érne. Ha a `savePriceList` NEM ugyanabba a
  // láncba futna, a saját (awaitok nélküli) írása jóval előbb landolna, mint
  // a vele egy tickben induló `savePlan` írásai -- ez a teszt pont ezt zárja ki.
  it('a savePriceList egy vele egy tickben induló savePlan MÖGÉ sorosodik, nem előzi meg', async () => {
    const order: string[] = [];
    const figyeloLe = k.irasFigyelo((ut) => {
      if (ut.endsWith('/terv.json')) order.push('terv.json');
      if (ut === 'arlista.json') order.push('arlista.json');
    });

    const plan = makeBlankPlan();
    const pl = await storage.loadPriceList();

    await Promise.all([
      storage.savePlan(plan, new Uint8Array([1])),
      storage.savePriceList({ ...pl, arlistaVerzio: 'utana' }),
    ]);

    expect(order).toEqual(['terv.json', 'arlista.json']);
    figyeloLe();
  });

  it('a csak cim-et tartalmazó beallitasok.json két cím-mezővel töltődik be, a következő mentés nem ír cim kulcsot', async () => {
    const regi = JSON.parse((await k.nyersOlvas('beallitasok.json'))!);
    delete regi.rendelo.iranyitoszamVaros;
    delete regi.rendelo.utcaHazszam;
    regi.rendelo.cim = '1117 Budapest, Móricz Zsigmond körtér 15. 3/8';
    await k.nyersIr('beallitasok.json', JSON.stringify(regi));

    const betoltott = await storage.loadSettings();
    expect(betoltott.rendelo.iranyitoszamVaros).toBe('1117 Budapest');
    expect(betoltott.rendelo.utcaHazszam).toBe('Móricz Zsigmond körtér 15. 3/8');

    await storage.saveSettings(betoltott);
    const mentett = JSON.parse((await k.nyersOlvas('beallitasok.json'))!);
    expect(mentett.rendelo).not.toHaveProperty('cim');
    expect(mentett.rendelo.utcaHazszam).toBe('Móricz Zsigmond körtér 15. 3/8');
  });

  it('surfaces a Hungarian, non-crashing error for corrupted (non-JSON) terv.json', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    await verzioFajlotCserel(
      `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`,
      '{ "schemaVersion": 1, not valid json',
    );
    await expect(storage.loadPlan(ref)).rejects.toThrow(/nem érvényes JSON/);
  });

  it('rejects a structurally invalid (but syntactically valid) terv.json', async () => {
    const plan = makeBlankPlan();
    const ref = await storage.savePlan(plan, new Uint8Array());
    const key = `paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    const raw = JSON.parse((await k.nyersOlvas(key))!);
    // `mennyiseg` egy string -- a régi kódban ez csendben 0-ra esett volna
    // egy szorzásban, sehol nem futott le rajta típusellenőrzés.
    raw.fazisok = [{ sorszam: 1, megnevezes: 'x', megjegyzes: '', sorok: [{ mennyiseg: 'sok' }] }];
    await verzioFajlotCserel(key, JSON.stringify(raw));
    await expect(storage.loadPlan(ref)).rejects.toThrow(/szerkezete nem érvényes/);
  });

  // a paciens-adatok.json -- élő, terv-mentéstől független
  // törzsadat, ellentétben a puszta index-fájlokkal (paciens.json,
  // terv-cimke.json).
  describe('paciens-adatok.json', () => {
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

    // a quick-create dialógus születési dátumot/telefont is
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
      // írja.
      expect((await storage.loadPatientData(folder.dirName))?.nev).toBe('Törzsadat Neve');
    });

    it('savePlan a terv paciens.nev-jét írja az indexbe, ha nincs törzsadat (a meglévő index-viselkedés változatlan)', async () => {
      const plan = makeBlankPlan();
      const ref = await storage.savePlan(plan, new Uint8Array([1]));
      const patients = await storage.listPatients();
      expect(patients.find((p) => p.dirName === ref.patientDir)?.nev).toBe('Teszt Elek');
    });

    it('rejects loading a paciens-adatok.json with a newer-than-known schemaVersion', async () => {
      const folder = await storage.createPatient('Séma Teszt');
      const key = `paciensek/${folder.dirName}/paciens-adatok.json`;
      const raw = JSON.parse((await k.nyersOlvas(key))!);
      raw.schemaVersion = 2;
      await k.nyersIr(key, JSON.stringify(raw));
      await expect(storage.loadPatientData(folder.dirName)).rejects.toThrow(/újabb verziójával/);
    });

    it('rejects a structurally invalid paciens-adatok.json -- ez valódi system of record, nem eshet néma fallbackre', async () => {
      const folder = await storage.createPatient('Sérült Teszt');
      const key = `paciensek/${folder.dirName}/paciens-adatok.json`;
      await k.nyersIr(key, 'not valid json {{{');
      await expect(storage.loadPatientData(folder.dirName)).rejects.toThrow(/nem érvényes JSON/);
    });
  });

  describe('deletePatient', () => {
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
      // paciensek/<dir>/ alatti fájl se maradhat.
      const remaining = (await k.osszesFajl()).filter((ut) =>
        ut.startsWith(`paciensek/${folder.dirName}/`),
      );
      expect(remaining).toEqual([]);
    });

    // A záró `/` a prefixben nem díszítés: enélkül a lenti "Kis-Bela_abc123"
    // törlése "Kis-Bela_abc123-Junior"-t is elvinné, mert a puszta
    // string-előtag illeszkedne.
    it('egy MÁSIK páciens nem sérül, akinek a mappaneve a töröltnek karakter-előtagja', async () => {
      const rovid = await storage.createPatient('Kis Béla');
      // Érvényes, `_<id6>` végű név, aminek a törölt mappa neve karakter-előtagja.
      const hosszabbDir = `${rovid.dirName}-Junior_zzzzzz`;
      await k.nyersIr(
        `paciensek/${hosszabbDir}/paciens.json`,
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

  describe('utolsoAktivitas', () => {
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

    it('listPatients elvisel egy szemetes utolsoAktivitas mezőt -- a páciens megmarad, csak a mező marad el', async () => {
      const folder = await storage.createPatient('Szemetes Aktivitás');
      const key = `paciensek/${folder.dirName}/paciens.json`;
      const raw = JSON.parse((await k.nyersOlvas(key))!);
      raw.utolsoAktivitas = 'nem-objektum';
      await k.nyersIr(key, JSON.stringify(raw));

      const patients = await storage.listPatients();
      const record = patients.find((p) => p.dirName === folder.dirName);
      expect(record?.nev).toBe('Szemetes Aktivitás');
      expect(record?.utolsoAktivitas).toBeUndefined();
    });
  });
}
