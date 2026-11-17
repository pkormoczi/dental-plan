// Mockup-tárolóréteg: localStorage. A szerződés-logika a közös magban él (`fajlTarolo.ts`),
// ez a fájl a localStorage-primitíveket és a demó-only részt adja hozzá. A kulcsok szándékosan
// ugyanazt az útvonalstruktúrát követik, mint amit a végleges FileSystemStorage a lemezre ír
// (lásd app/src/storage/CLAUDE.md).
//
// FONTOS: ez csak demó -- nincs benne séma-migráció (a mockup csak az 1-es
// schemaVersion-t ismeri), és a terv.json PDF-be ágyazása (pdf-lib) is a
// 2. fázisra marad (lásd PRODUCT.md § Szándékos hiányok és nyitott kérdések).

import { PREFIX } from './localKeys';
import { javasoltTervCim } from '../domain/tervCim';
import { assertKnownSchemaVersion } from '../domain/schema';
import { isPlaceholderTemplate } from '../domain/templates';
import { assertPlanShape } from '../domain/validate';
import { buildDemoFileTree, type DemoNode } from './demoFileTree';
import type { Plan, PlanRef, PatientRecord, PriceList } from '../domain/types';
import { DEFAULT_TEMPLATES, FajlTarolo } from './fajlTarolo';
import { parseJson } from './json';
import { localStoragePrimitivek } from './localStoragePrimitivek';
import { buildPlanDirName, generateId, parsePatientDirName, parseVersionDirName } from './paths';
import { seedPriceList } from './seed/priceList';
import { seedSettings } from './seed/settings';
import { seedPatientData, seedPatients, seedPlans, seedVerzio } from './seed/plans';

/**
 * Exportált, mert a DemoDraftStorage (lásd app/src/storage/CLAUDE.md) is
 * ezt a prefixet használja a `dp:piszkozat` kulcsához -- ez adja
 * a garanciát, hogy a lenti `clearAll()` prefix-seprése (és vele a "Minden
 * adat törlése"/"Demó adat visszaállítása" gomb) a piszkozatot is eltünteti,
 * külön kód nélkül. Egy literál duplikálása itt driftelhetne.
 */
const PRICE_LIST_KEY = `${PREFIX}arlista.json`;
const SETTINGS_KEY = `${PREFIX}beallitasok.json`;
const PATIENTS_PREFIX = `${PREFIX}paciensek/`;
const TEMPLATES_PREFIX = `${PREFIX}sablonok/`;

/** A demó a PDF-et kiterjesztés nélküli `pdf` kulcson tárolja -- a böngészőben élő adat miatt marad. */
const DEMO_PDF_FAJL = 'pdf';

function patientRecordKey(patientDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/paciens.json`;
}

function patientDataKey(patientDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/paciens-adatok.json`;
}

function planKey(patientDir: string, planDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${planDir}/${versionDir}/terv.json`;
}

function pdfKey(patientDir: string, planDir: string, versionDir: string): string {
  return `${PATIENTS_PREFIX}${patientDir}/${planDir}/${versionDir}/${DEMO_PDF_FAJL}`;
}

function templateKey(fileName: string): string {
  return `${TEMPLATES_PREFIX}${fileName}`;
}

export class DemoStorage extends FajlTarolo {
  constructor() {
    super(localStoragePrimitivek, {
      pdfFajlnev: DEMO_PDF_FAJL,
      mentesHibaUzenet:
        'A tervet nem sikerült elmenteni — valószínűleg megtelt a böngésző tárhelye. ' +
        'Semmi nem íródott félkészen, próbáld törölni pár korábbi tervet.',
    });
  }

  override async init(): Promise<void> {
    if (localStorage.getItem(PRICE_LIST_KEY) == null) {
      this.resetDemoData();
      return;
    }
    // Aki a páciens-entitás bevezetése előtt már használta a demót,
    // annak a régi (páciens → verzió) 2 szintű mappaszerkezete megvan a
    // localStorage-ban -- ezt egyszeri migrációval alakítjuk át a mostani
    // (páciens → terv → verzió) 3 szintűre, hogy a korábban felvitt saját
    // teszttervei ne vesszenek el.
    this.migrateLegacyLayout();
    // Aki a német sablonok bevezetése előtt már használta a demót,
    // annak az árlistája megvan, tehát resetDemoData() itt nem futna le
    // újra -- enélkül a nyilatkozat-de-v1.md sosem jönne létre neki, és a
    // PreviewPage üres/hibás sablonnal futna németre váltva. Idempotens:
    // csak a HIÁNYZÓ sablonkulcsokat pótolja, meglévőt nem ír felül.
    this.ensureSeedTemplates();
  }

  /**
   * "Demó adat visszaállítása" -- törli az összes dp: kulcsot és újratölti
   * a seedet. Ez NEM az interface része (a valódi FileSystemStorage-nak
   * nincs ilyen fogalma), csak a mockup kényelmi funkciója.
   */
  resetDemoData(): void {
    this.clearAll();
    localStorage.setItem(PRICE_LIST_KEY, JSON.stringify(seedPriceList));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(seedSettings));
    this.ensureSeedTemplates();
    for (const { patientDir, record } of seedPatients) {
      localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
    }
    // Csak EGY seed pácienshez -- a demónak mindkét állapotot mutatnia
    // kell (lezárt törzsadat vs. élő fallback a legutóbbi tervből), lásd
    // seed/plans.ts.
    for (const { patientDir, data } of seedPatientData) {
      localStorage.setItem(patientDataKey(patientDir), JSON.stringify(data));
    }
    for (const { patientDir, planDir, versionDir, plan } of seedPlans) {
      localStorage.setItem(planKey(patientDir, planDir, versionDir), JSON.stringify(plan));
    }
  }

  private currentPriceListOrSeed(): PriceList {
    const raw = localStorage.getItem(PRICE_LIST_KEY);
    if (raw == null) return seedPriceList;
    try {
      return parseJson<PriceList>(raw, 'arlista.json');
    } catch {
      return seedPriceList;
    }
  }

  /**
   * A páciens-entitás bevezetésének egyszeri migrációja: a régi
   * `<patientDir>/<ISO>_v<n>/…` alakú
   * kulcsokat páciensenként egy új terv-mappa alá tereli (minden régi
   * verzió UGYANABBA az egy terv-láncba kerül -- a régi szerkezet ezt úgyis
   * feltételezte), és felveszi a hiányzó `paciens.json` indexet. A
   * legacy-jelenlétet onnan ismerjük fel, hogy a páciensmappa alatti
   * második útvonalszegmens verzió-mintázatú (`<ISO>_v<n>`) -- az új
   * szerkezetben ez a szegmens mindig egy terv-mappa neve, sosem az.
   * Eldobható mockup-kód: a FileSystemStorage-váltás (2. fázis) ezt nem
   * örökli.
   */
  private migrateLegacyLayout(): void {
    const legacyPatientDirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(PATIENTS_PREFIX)) return;
      const segments = key.slice(PATIENTS_PREFIX.length).split('/');
      if (segments.length >= 2 && parseVersionDirName(segments[1])) {
        legacyPatientDirs.add(segments[0]);
      }
    });
    if (legacyPatientDirs.size === 0) return;

    try {
      const priceList = this.currentPriceListOrSeed();
      for (const patientDir of legacyPatientDirs) {
        this.migratePatientLegacyLayout(patientDir, priceList);
      }
    } catch {
      // Félmigrált állapotot nem hagyunk a localStorage-ban -- inkább a
      // teljes demó-adat áll vissza a friss seedre.
      this.resetDemoData();
    }
  }

  private migratePatientLegacyLayout(patientDir: string, priceList: PriceList): void {
    const prefix = `${PATIENTS_PREFIX}${patientDir}/`;
    const legacyVersionDirs = new Set<string>();
    this.eachKey((key) => {
      if (!key.startsWith(prefix)) return;
      const versionDir = key.slice(prefix.length).split('/')[0];
      if (parseVersionDirName(versionDir)) legacyVersionDirs.add(versionDir);
    });
    const sorted = [...legacyVersionDirs].sort(
      (a, b) => parseVersionDirName(a)!.verzio - parseVersionDirName(b)!.verzio,
    );
    if (sorted.length === 0) return;

    const versions = sorted.map((versionDir) => {
      const raw = localStorage.getItem(`${prefix}${versionDir}/terv.json`);
      if (raw == null) throw new Error(`Migráció: hiányzó terv.json (${patientDir}/${versionDir})`);
      const plan = parseJson<Plan>(raw, 'terv.json');
      assertKnownSchemaVersion(plan, 'terv.json');
      assertPlanShape(plan, 'terv.json');
      return { versionDir, plan };
    });

    const paciensId = parsePatientDirName(patientDir)?.patientId || generateId();
    // A terv-mappa neve a lánc LEGKORÁBBI verziójának tartalmából számolt
    // javaslatból képződik -- ugyanaz az elv, mint a `doSavePlan`-ban.
    const planDir = buildPlanDirName(javasoltTervCim(versions[0].plan, priceList), generateId());

    for (const { versionDir, plan } of versions) {
      const migratedPlan: Plan = { ...plan, paciensId };
      localStorage.setItem(planKey(patientDir, planDir, versionDir), JSON.stringify(migratedPlan));
      const rawPdf = localStorage.getItem(`${prefix}${versionDir}/pdf`);
      if (rawPdf != null) {
        localStorage.setItem(pdfKey(patientDir, planDir, versionDir), rawPdf);
      }
      localStorage.removeItem(`${prefix}${versionDir}/terv.json`);
      localStorage.removeItem(`${prefix}${versionDir}/pdf`);
    }

    // Nincs utolsoAktivitas: az egyetlen elérhető időbélyeg itt a `keltezes`
    // (üzleti, doki által szabadon szerkeszthető dátum) -- abból
    // szintetizálni fals, akár JÖVŐBELI wall-clock időt adna, ami a pácienst
    // örökre a recent lista tetejére ragasztaná. A hiányzó mező a következő
    // valódi íráskor magától gyógyul.
    const record: PatientRecord = {
      schemaVersion: 1,
      paciensId,
      nev: versions[versions.length - 1].plan.paciens.nev,
    };
    localStorage.setItem(patientRecordKey(patientDir), JSON.stringify(record));
  }

  /**
   * A hiányzó alapértelmezett sablonfájlokat pótolja. Kivétel: ha egy
   * meglévő -v1 sablon törzse még a "[PLACEHOLDER"/"[PLATZHALTER" jelölőt
   * tartalmazza, felülírjuk a friss seed-szöveggel -- ez a frissítési út
   * azoknak, akik egy régebbi demó-állapotot hoznak magukkal. A nyilatkozat/
   * fizetési feltételek HU szövege ma már valódi (az eredeti Excelből átvett,
   * nem placeholder), ezért ott ez a felülírás egyszeri migráció, utána nem
   * fut le újra.
   *
   * A `body` is placeholder-e -- nem csak az `existing` -- azért kell, mert
   * `saveTemplate()` a doki szövegét ugyanabba a fájlba (`garancia-hu-v1.md`)
   * írja felül: ha a doki a `[PLACEHOLDER` jelölőt bent hagyta a saját
   * szövegében, egy erre rákövetkező `init()` a régi feltétellel némán
   * visszaírná a seedet, elveszítve a doki munkáját. A garancia HU/DE
   * SZÁNDÉKOSAN placeholder marad a seedben (nincs forrása az Excelben) --
   * rá ez az ág továbbra is minden `init()`-en lefut, amíg a doki valódi
   * szöveget nem ment. Ugyanez vonatkozik egy tudatosan kiürített sablonra
   * is (`isPlaceholderTemplate()` az üres törzset is placeholdernek
   * tekinti): a következő `init()` ezt is visszaállítja a seedre.
   */
  private ensureSeedTemplates(): void {
    for (const [name, body] of DEFAULT_TEMPLATES) {
      const key = templateKey(name);
      const existing = localStorage.getItem(key);
      if (existing == null || (isPlaceholderTemplate(existing) && !isPlaceholderTemplate(body))) {
        localStorage.setItem(key, body);
      }
    }
  }

  clearAll(): void {
    this.eachKey((key) => localStorage.removeItem(key));
  }

  private eachKey(fn: (key: string) => void): void {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) keys.push(k);
    }
    keys.forEach(fn);
  }

  /**
   * Filerendszer nézet: a `dp:` kulcsokat fává alakítja (`demoFileTree.ts`).
   * NEM a `PlanStorage` interfész része -- demó-only vizualizáció, a
   * `resetDemoData`/`clearAll` mintájára (lásd StorageContext.tsx fejléce).
   * Szinkron, mert egy `localStorage`-bejárás, nem I/O.
   */
  listFileTree(): DemoNode[] {
    const keys: string[] = [];
    this.eachKey((key) => keys.push(key));
    return buildDemoFileTree(keys, PREFIX);
  }

  /**
   * Egy fa-csomópont `storageKey`-éhez tartozó nyers tartalom (JSON string,
   * markdown, vagy a PDF base64-kódolt bájtjai -- a hívó dönti el a
   * `format` mező alapján, mit kezd vele). A `PREFIX`-őr megakadályozza,
   * hogy ez általános localStorage-olvasóvá váljon.
   */
  readRawFile(storageKey: string): string | null {
    if (!storageKey.startsWith(PREFIX)) return null;
    return localStorage.getItem(storageKey);
  }

  /**
   * NEM a `PlanStorage` interfész része -- demó-only, a `listFileTree`/
   * `readRawFile` mintáján: igaz, ha a hármas a beépített demó-készletből
   * származik (`seed/plans.ts` `seedVerzio()`), aminek a `resetDemoData()`
   * sosem ír PDF-bájtot.
   */
  isSeedVersion(ref: PlanRef): boolean {
    return seedVerzio(ref);
  }
}
