// Domain típusok — a docs/02-domain-modell.md JSON sémái szerint szó szerint.
// A mezőnevek magyarul vannak, ezek a lemezre (és itt: localStorage-ba) írt
// séma kulcsai — ne fordítsd le őket. Lásd CLAUDE.md "Domain szókincs".

export type Nyelv = 'hu' | 'de';
export type Penznem = 'HUF' | 'EUR';
export type ArTipus = 'FIX' | 'SAVOS';
export type TervStatusz = 'PISZKOZAT' | 'VEGLEGES';

export interface LokalizaltSzoveg {
  hu: string;
  de: string | null;
}

/** FIX: `ertek` az egységár. SAVOS: `min` az alapérték, a nyomtatványon `*` jelölést kap. */
export type Ar =
  | { tipus: 'FIX'; ertek: number }
  | { tipus: 'SAVOS'; min: number; max: number };

/** `null` egy pénznemben ≠ 0 — azt jelenti, a tétel abban a pénznemben nem ajánlható. */
export type ArByPenznem = Partial<Record<Penznem, Ar | null>>;

export interface Kategoria {
  id: string;
  nev: LokalizaltSzoveg;
  sorrend: number;
  /**
   * Fogtérkép-szín, hex (pl. `#4dabf7`). Additív mező — nincs
   * `schemaVersion`-emelés (D18), tehát egy régebbi, localStorage-ban élő
   * árlistán hiányozhat. Ilyenkor a
   * `design/treatmentVisuals.ts` `kategoriaVizual()`-ja semleges szürkére
   * esik vissza, nem hiba — ez az EGYETLEN hely, ahol ez a visszaesés eldől.
   */
  szin?: string;
}

export interface Tetel {
  id: string;
  kategoriaId: string;
  sorrend: number;
  aktiv: boolean;
  /** true esetén a szerkesztő gyorsgombjai közé kerül. */
  gyakori: boolean;
  nev: LokalizaltSzoveg;
  ar: ArByPenznem;
  /** Csak az importból; a doksi szerint az első admin-mentés után elhagyható. */
  forrasSor?: number;
  /**
   * Kétnyelvű "mi van benne" leírás (docs/02-domain-modell.md § Tétel-leírás). Additív
   * mező, nincs `schemaVersion`-emelés -- hiányzó mező = a doki még nem adott
   * meg leírást ehhez a tételhez.
   */
  leiras?: LokalizaltSzoveg;
  /**
   * true esetén a véglegesítés-őr figyelmeztet, ha az erre hivatkozó soron
   * nincs leírás (D27, docs/01-attekintes-es-dontesek.md). Additív mező,
   * hiányzó mező = nem csomag jellegű.
   */
  csomag?: boolean;
}

export interface PriceList {
  schemaVersion: 1;
  arlistaVerzio: string;
  modositva: string;
  kategoriak: Kategoria[];
  tetelek: Tetel[];
}

export interface Paciens {
  nev: string;
  szuletesiIdo: string;
  lakcim: string;
  telefon: string;
  email: string;
  taj: string;
  kiskoru: boolean;
  torvenyesKepviselo: string | null;
}

/** Egy sor a tervben — pillanatkép (D7): a nevet és az árat a felvétel pillanatában rögzíti. */
export interface Sor {
  tetelId: string;
  nevSnapshot: string;
  savos: boolean;
  fogak: string;
  mennyiseg: number;
  listaEgysegar: number;
  tenylegesEgysegar: number;
  /**
   * A `Tetel.leiras` pillanatképe, a `nevSnapshot` mintáján -- lásd
   * `leirasKoveti()` (domain/nev.ts). Additív mező, hiányzó mező = a mező
   * bevezetése előtt mentett sor, vagy nincs leírás.
   */
  leirasSnapshot?: string;
  /**
   * `false` = a darabszám automatikusan követi a `fogak` mezőt; `true` = a
   * doki kézzel felülbírálta, a sor levált -- lásd `sorPatchKovetessel()`
   * (domain/mennyiseg.ts). Additív mező, hiányzó mező = a mező bevezetése
   * előtt mentett sor, ami KÉZINEK számít -- egy régi terven a fogak-alapú
   * felülírás némán átírná a doki szándékos darabszámát (D24 mintája).
   */
  mennyisegKezi?: boolean;
}

export interface Fazis {
  sorszam: number;
  megnevezes: string;
  megjegyzes: string;
  sorok: Sor[];
}

export interface Osszesitok {
  kezelesekOsszesen: number;
  kedvezmeny: number;
  fizetendo: number;
}

export interface Plan {
  schemaVersion: 1;
  tervId: string;
  verzio: number;
  statusz: TervStatusz;
  nyelv: Nyelv;
  penznem: Penznem;
  keltezes: string;
  ervenyesIg: string;
  arlistaVerzio: string;
  sablonVerzio: string;
  orvos: string;
  paciens: Paciens;
  fazisok: Fazis[];
  osszesitok: Osszesitok;
  /**
   * Fogtechnikai munkát tartalmazó kezelésnél a munka megkezdésekor
   * fizetendő előleg ABSZOLÚT ÖSSZEGE, a pénznem alapegységében (HUF:
   * forint, EUR: cent) -- D66. `null` (vagy hiányzó mező egy régi
   * `terv.json`-ben) = a doki nem jelölte be, nincs előleg-sor a
   * nyomtatványon. A korábbi, százalék-alapú `elolegSzazalek` mezőt (a
   * végösszegből élőben számolt, drift-mentes érték) a doki tudatosan
   * elvetette egy fix összeg javára -- egy utólagos sormódosítás emiatt
   * ELCSÚSZTATHATJA az arányt; a `előleg > fizetendő` esetet a
   * véglegesítés-őr (`veglegesitesOr.ts`) kemény blokkja fogja meg, nem
   * automatikus levágás. Régi `terv.json`-ból betöltve az `elolegSzazalek`
   * mező figyelmen kívül marad, nincs migráció. `schemaVersion` nem
   * emelkedett, a mező opcionális.
   */
  elolegOsszeg?: number | null;
  /**
   * Terv-szintű egyedi végösszeg: a sorok összegéből LEVONT, ELŐJELES fix
   * eltérés, amivel a doki egyedi végösszegre zárja az alkut -- pozitív =
   * kedvezmény, negatív = felár (D69). `null` (vagy hiányzó mező egy régi
   * `terv.json`-ben) = nincs terv-szintű eltérés. FIX ÖSSZEG tárolódik, nem
   * a begépelt cél-végösszeg (D25) -- különben egy utólagos sormódosítás
   * némán átírná az eltérést. Ne keverd a `plan.osszesitok.kedvezmeny`-nyel:
   * az a KIMENET (sor- és terv-szintű eltérés a listaártól együtt), ez a
   * BEMENET. `schemaVersion` nem emelkedett, a mező opcionális, a
   * séma-kulcs neve a D69 névváltás után is `kedvezmenyOsszeg` maradt.
   */
  kedvezmenyOsszeg?: number | null;
  /**
   * Nyomtatásra kerüljenek-e a sorok leírásai (docs/02-domain-modell.md § Tétel-leírás).
   * Additív mező, `schemaVersion` nem emelkedett -- hiányzó mező = `true` (a
   * mező bevezetése előtti terv.json).
   */
  leirasokMutatasa?: boolean;
  /**
   * A páciens-mappa azonosítója (docs/02-domain-modell.md § Páciens- és
   * terv-mappa, D29). Hiányzó/üres = a terv még nincs elmentve, a storage
   * savePlan()-kor tölti ki. NE keverd a `tervId`-vel: egy páciens-mappa
   * (egy `paciensId`) több terv-láncot (több `tervId`-t) is tartalmazhat.
   * Additív mező, `schemaVersion` nem emelkedett.
   */
  paciensId?: string;
}

/**
 * A "jelentős aktivitás" típusa és időbélyege egy páciensen (D39,
 * docs/03-funkcionalis-spec.md § 1. Indítás). Csak a LEGUTÓBBI esemény
 * marad meg -- nem napló --, és kizárólag tényleges tartalmi íráskor
 * frissül (`domain/paciensAktivitas.ts` `ujAktivitas`); egy páciens/terv
 * puszta megnyitása/megtekintése sosem ír bele.
 */
export type AktivitasTipus = 'letrehozva' | 'torzsadat-mentve' | 'terv-veglegesitve';

export interface PatientActivity {
  tipus: AktivitasTipus;
  /** ISO wall-clock (`new Date().toISOString()`) -- NEM naptári/üzleti dátum, ellentétben a `Plan.keltezes`-szel. */
  idopont: string;
}

/**
 * paciens.json -- egy páciens-mappa azonosító-/kereső-indexe (D29). SOHA
 * nem system of record: a `nev` kizárólag kereséshez és előtöltéshez való
 * gyorsítótár, a `terv.json` `paciens` blokkja marad a pillanatkép (D7,
 * docs/02-domain-modell.md § Páciens- és terv-mappa).
 *
 * `utolsoAktivitas` additív mező, `schemaVersion` nem emelkedett -- hiánya
 * azt jelenti, a páciensen még nem történt jelentős aktivitás (vagy egy
 * funkció előtti/legacy rekordról van szó), nem hibaállapot. Puszta index
 * mezőként egy sérült/ismeretlen alakú értéke sosem dobhat (D29) --
 * `domain/paciensAktivitas.ts` `ervenyesAktivitas()` némán `undefined`-re
 * esik vissza, ellentétben a `PatientMasterData` szigorú validációjával.
 */
export interface PatientRecord {
  schemaVersion: 1;
  paciensId: string;
  nev: string;
  utolsoAktivitas?: PatientActivity;
}

/**
 * terv-cimke.json -- a terv-mappa gyökerén, a verziómappákon KÍVÜL, ezért a
 * D4 (verziómappát soha nem írunk felül) rá nem vonatkozik: bármikor
 * szabadon átírható, akár egy már véglegesített terven is, új verzió
 * nyitása nélkül (D29, docs/02-domain-modell.md § Páciens- és terv-mappa).
 */
export interface PlanLabel {
  schemaVersion: 1;
  tervCim: string;
}

/**
 * paciens-adatok.json -- egy páciens-mappa ÉLŐ, terv-mentéstől független
 * törzsadata (D33, docs/02-domain-modell.md § Páciens- és terv-mappa).
 * Ellentétben a `PatientRecord`-dal és a `PlanLabel`-lel, ez VALÓDI system
 * of record a saját mezőire: a doki itt tartja a páciens jelenleg érvényes
 * elérhetőségét/adatait, akár terv nélkül is. A `terv.json` `paciens`
 * blokkja ettől függetlenül marad pillanatkép (D7) -- nincs automatikus
 * szinkron egyik irányban sem, lásd `domain/paciensAdatok.ts`. A
 * verziómappákon KÍVÜL, a páciens-mappa gyökerén él, ezért D4 rá nem
 * vonatkozik, de -- a `terv-cimke.json`-tól eltérően -- nincs "üres =
 * törlés vissza az élő fallbackre" szemantikája: a fájl létrejötte után a
 * törzsadat lezárt.
 */
export interface PatientMasterData extends Paciens {
  schemaVersion: 1;
  paciensId: string;
}

export interface Rendelo {
  nev: string;
  cim: string;
  telefon: string;
  email: string;
  adoszam: string;
  cegjegyzekszam: string;
}

export interface Settings {
  schemaVersion: 1;
  rendelo: Rendelo;
  orvosok: string[];
  /**
   * A jelenleg deaktivált orvosnevek. Egy név HIÁNYA ebből a listából =
   * aktív -- egy, a mező bevezetése előtti `beallitasok.json`-ben minden
   * orvos implicit aktív. `schemaVersion` nem emelkedett, a mező opcionális.
   */
  inaktivOrvosok?: string[];
  /**
   * A globális alapértelmezett orvos neve. Hiányzó, már nem létező vagy
   * inaktív érték esetén az első AKTÍV név `orvosok`-ban a tényleges default
   * (`domain/orvosok.ts` `alapertelmezettOrvosNeve()` az EGYETLEN feloldó).
   * `schemaVersion` nem emelkedett, a mező opcionális.
   */
  alapertelmezettOrvos?: string;
  ervenyessegNap: number;
  alapertelmezettNyelv: Nyelv;
}

/**
 * Egy páciensmappa a paciensek/ fában (lásd storage/paths.ts). A `nev` a
 * `paciens.json`-ből jön -- nem a mappanév visszafejtése és nem egy
 * betöltött `terv.json`-é (D29). Az `utolsoAktivitas` a `paciens.json`
 * ugyanezen mezőjének tükre -- ez teszi lehetővé, hogy a Kezdőlap recent
 * listája (`domain/paciensAktivitas.ts` `legutobbAktivPaciensek`) a
 * `listPatients()` eredményéből dolgozzon, `paciens.json` újraolvasása
 * nélkül.
 */
export interface PatientFolder {
  dirName: string;
  paciensId: string;
  nev: string;
  utolsoAktivitas?: PatientActivity;
}

/**
 * Egy terv-mappa (terv-lánc) egy páciensen belül (D29). `tervCim: null` =
 * nincs kézzel átírt `terv-cimke.json` -- a UI ilyenkor élő auto-javaslatot
 * mutat (`domain/tervCim.ts` `megjelenitettTervCim`), nem `null`-t.
 */
export interface PlanFolder {
  dirName: string;
  tervId: string;
  tervCim: string | null;
}

/** Egy verziómappa egy terven belül. */
export interface PlanVersion {
  dirName: string;
  isoDate: string;
  verzio: number;
}

export interface PlanRef {
  patientDir: string;
  planDir: string;
  versionDir: string;
}
