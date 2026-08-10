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
   * fizetendő előleg százaléka. `null` (vagy hiányzó mező egy régi
   * `terv.json`-ben) = a doki nem jelölte be, nincs előleg-sor a
   * nyomtatványon. A százalék az igazság, nem a belőle számolt összeg: az
   * mindig élőben számol a `fazisok`-ból (lásd `elolegOsszegek`), ahogy a
   * `Fizetendő` sor is. `schemaVersion` nem emelkedett, a mező opcionális.
   */
  elolegSzazalek?: number | null;
  /**
   * Terv-szintű kedvezmény: a sorok összegéből LEVONT fix összeg, amivel a
   * doki kerek végösszegre zárja az alkut. `null` (vagy hiányzó mező egy
   * régi `terv.json`-ben) = nincs terv-szintű kedvezmény. FIX ÖSSZEG
   * tárolódik, nem a begépelt cél-végösszeg (D25) -- különben egy utólagos
   * sormódosítás némán átírná a kedvezményt. Ne keverd a
   * `plan.osszesitok.kedvezmeny`-nyel: az a KIMENET (sor- és terv-szintű
   * eltérés a listaártól együtt), ez a BEMENET. `schemaVersion` nem
   * emelkedett, a mező opcionális.
   */
  kedvezmenyOsszeg?: number | null;
  /**
   * Nyomtatásra kerüljenek-e a sorok leírásai (docs/02-domain-modell.md § Tétel-leírás).
   * Additív mező, `schemaVersion` nem emelkedett -- hiányzó mező = `true` (a
   * mező bevezetése előtti terv.json).
   */
  leirasokMutatasa?: boolean;
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
  logoFajl: string;
  ervenyessegNap: number;
  alapertelmezettNyelv: Nyelv;
  nemetEngedelyezve: boolean;
}

/** Egy páciensmappa a paciensek/ fában (lásd storage/paths.ts). */
export interface PatientFolder {
  dirName: string;
  vezeteknev: string;
  keresztnev: string;
  patientId: string;
}

/** Egy verziómappa egy páciensen belül. */
export interface PlanVersion {
  dirName: string;
  isoDate: string;
  verzio: number;
}

export interface PlanRef {
  patientDir: string;
  versionDir: string;
}
