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

/** `null` egy pénznemben ≠ 0 — azt jelenti, a tétel azon a nyelven nem ajánlható. */
export type ArByPenznem = Partial<Record<Penznem, Ar | null>>;

export interface Kategoria {
  id: string;
  nev: LokalizaltSzoveg;
  sorrend: number;
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
