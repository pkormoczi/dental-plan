// A közös storage-mag (`fajlTarolo.ts`) ezen a felületen éri el a tárolót: a demó
// localStorage-kulcsokon, a telepített app a gyökérmappán, a tesztek memóriában. Az útvonalak
// a gyökérhez képest relatívak, `/` elválasztóval; a gyökér maga a `''`.
//
// DOM-mentes modul: a main process is importálja (migrációs terv §9.1).

export interface FajlPrimitivek {
  /** `null`, ha a fájl nem létezik. */
  olvasSzoveg(ut: string): Promise<string | null>;
  /** `null`, ha a fájl nem létezik. */
  olvasBajt(ut: string): Promise<Uint8Array | null>;
  /** A fájl mérete bájtban, beolvasás nélkül; `null`, ha nem létezik. */
  meret(ut: string): Promise<number | null>;
  /** Atomi felülírás: hibánál a fájl korábbi tartalma érintetlen. A szülőmappát létrehozza. */
  irSzoveg(ut: string, tartalom: string): Promise<void>;
  /** Mint az `irSzoveg`, bájtokra. */
  irBajt(ut: string, tartalom: Uint8Array): Promise<void>;
  /** Egy fájl törlése; nem létező fájlra no-op. */
  torol(ut: string): Promise<void>;
  /** A mappa közvetlen gyerekeinek neve (fájl és mappa); nem létező mappára üres lista. */
  listaz(ut: string): Promise<string[]>;
  /** Fájl vagy mappa létezik-e az útvonalon. */
  letezik(ut: string): Promise<boolean>;
  /** `kizarolagos`: létező útvonalra `MarLetezikError` -- így két író nem kaphatja meg ugyanazt a mappát. */
  mappaLetrehoz(ut: string, opciok?: { kizarolagos?: boolean }): Promise<void>;
  /** A mappa és teljes tartalma törlése; nem létező mappára no-op. */
  torolMappa(ut: string): Promise<void>;
  /** Egy mappa átnevezése; a cél nem létezhet. */
  atnevez(regi: string, uj: string): Promise<void>;
}

export const utvonal = (...reszek: string[]): string => reszek.filter(Boolean).join('/');

export class MarLetezikError extends Error {
  readonly utvonal: string;

  constructor(utvonal: string) {
    super(`A cél már létezik: ${utvonal}`);
    this.name = 'MarLetezikError';
    this.utvonal = utvonal;
  }
}
