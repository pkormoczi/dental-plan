// Tömeges árváltoztatás az árlista adminban (backlog-92). Tiszta,
// React/localStorage nélkül tesztelhető mag, a `domain/arKoveti.ts` /
// `domain/mennyiseg.ts` mintájában -- ez az EGYETLEN hely, ahol a
// kerekítési létra és a soronkénti állapot-osztályozás eldől, a dialógusba
// nem kerül másolat.

import type { Ar, Penznem, Tetel } from './types';

/**
 * A kerekítési létra a pénznem ALAPEGYSÉGÉBEN (HUF: forint, EUR: cent) --
 * ezért HUF-ban 1000/500/100/10/1 Ft, EUR-ban 10/5/1/0,10/0,01 €, egyetlen
 * számsor, nincs két külön szabály.
 */
export const KEREKITES_LETRA: readonly number[] = [1000, 500, 100, 10, 1];

/** A létra felső három foka -- ezek közül választ a doki felső korlátot. */
export const VALASZTHATO_KEREKITES: readonly number[] = [100, 500, 1000];

/** A legfinomabb választható korlát -- a dialógus alapértéke. */
export const ALAP_KEREKITES = 100;

export const SZAZALEK_MAX_EMELES = 100;
export const SZAZALEK_MAX_CSOKKENTES = 90;

export type Irany = 'emeles' | 'csokkentes';

export interface TomegesArParams {
  penznem: Penznem;
  irany: Irany;
  szazalek: number;
  /** A doki választása -- FELSŐ korlát, nem fix lépés (lásd `lepes`). */
  kerekitesKorlat: number;
}

/** Hibaszöveg a százalék-mezőhöz, vagy `null` -- nem dob, a `paciensValidacio.ts` mintája. */
export function szazalekHiba(irany: Irany, szazalek: number): string | null {
  if (!(szazalek > 0)) return 'A százaléknak nullánál nagyobbnak kell lennie.';
  const max = irany === 'emeles' ? SZAZALEK_MAX_EMELES : SZAZALEK_MAX_CSOKKENTES;
  if (szazalek > max) return `A megengedett tartomány 0–${max}%.`;
  return null;
}

/**
 * A ténylegesen használt kerekítési lépés egy adott nyers változáshoz -- a
 * létra legnagyobb olyan foka, ami nem nagyobb sem a doki választotta felső
 * korlátnál, sem a nyers változás abszolút értékénél. Ha egyik fok sem fér
 * bele (a változás 1 alapegység alatt van), az `1` a lépés -- a pénz egész
 * szám, ennél finomabb nincs.
 *
 * Ebből az egyetlen szabályból következik a tervdokumentum kimondott
 * invariánsa: a kerekítés a nyers eredményt legfeljebb a kért változás
 * FELÉVEL térítheti el (lépés ≤ |változás|, a legközelebbi többszörös
 * legfeljebb lépés/2-vel tér el a nyers értéktől).
 */
export function tenylegesLepes(korlat: number, nyersValtozas: number): number {
  const abs = Math.abs(nyersValtozas);
  for (const fok of KEREKITES_LETRA) {
    if (fok <= korlat && fok <= abs) return fok;
  }
  return 1;
}

function kerekitve(ertek: number, lepes: number): number {
  return Math.round(ertek / lepes) * lepes;
}

interface HatarEredmeny {
  regi: number;
  uj: number;
  lepes: number;
}

function szamolHatar(regi: number, irany: Irany, szazalek: number, korlat: number): HatarEredmeny {
  const szorzo = irany === 'emeles' ? 1 + szazalek / 100 : 1 - szazalek / 100;
  const nyers = regi * szorzo;
  const nyersValtozas = nyers - regi;
  const lepes = tenylegesLepes(korlat, nyersValtozas);
  const uj = Math.max(0, kerekitve(nyers, lepes));
  return { regi, uj, lepes };
}

export interface UjArEredmeny {
  ar: Ar;
  /** A ténylegesen használt lépés(ek) -- SAVOS-nál `min` és `max` külön, ebben a sorrendben. */
  lepesek: number[];
}

/** Egy `Ar` (FIX vagy SAVOS) új értéke -- SAVOS-nál mindkét határ ugyanazzal a százalékkal, de külön lépés-számítással. */
export function ujAr(ar: Ar, irany: Irany, szazalek: number, korlat: number): UjArEredmeny {
  if (ar.tipus === 'FIX') {
    const { uj, lepes } = szamolHatar(ar.ertek, irany, szazalek, korlat);
    return { ar: { tipus: 'FIX', ertek: uj }, lepesek: [lepes] };
  }
  const min = szamolHatar(ar.min, irany, szazalek, korlat);
  const max = szamolHatar(ar.max, irany, szazalek, korlat);
  return { ar: { tipus: 'SAVOS', min: min.uj, max: max.uj }, lepesek: [min.lepes, max.lepes] };
}

export type TomegesArAllapot = 'valtozik' | 'nincs-ar' | 'nem-valtozik' | 'nulla-ra-csokkenne';

export interface TomegesArSor {
  tetelId: string;
  allapot: TomegesArAllapot;
  regi: Ar | null;
  uj: Ar | null;
  /** A választott korlátnál finomabb, ténylegesen használt lépés -- csak akkor, ha eltér a korláttól. */
  finomabbLepes: number | null;
}

function nullaraCsokken(regiErtekek: number[], ujErtekek: number[]): boolean {
  return regiErtekek.some((regi, i) => regi > 0 && ujErtekek[i] === 0);
}

function hatarErtekek(ar: Ar): number[] {
  return ar.tipus === 'SAVOS' ? [ar.min, ar.max] : [ar.ertek];
}

/** Egy tétel besorolása + új ára a megadott paraméterek szerint -- a `tomegesArSorok` egyszerre több tételre futtatja. */
export function tomegesArSor(tetel: Tetel, params: TomegesArParams): TomegesArSor {
  const regi = tetel.ar[params.penznem] ?? null;
  if (regi == null) {
    return { tetelId: tetel.id, allapot: 'nincs-ar', regi: null, uj: null, finomabbLepes: null };
  }

  const { ar: uj, lepesek } = ujAr(regi, params.irany, params.szazalek, params.kerekitesKorlat);
  const regiErtekek = hatarErtekek(regi);
  const ujErtekek = hatarErtekek(uj);

  if (nullaraCsokken(regiErtekek, ujErtekek)) {
    return { tetelId: tetel.id, allapot: 'nulla-ra-csokkenne', regi, uj: null, finomabbLepes: null };
  }

  const valtozott = regiErtekek.some((regiErtek, i) => regiErtek !== ujErtekek[i]);
  if (!valtozott) {
    return { tetelId: tetel.id, allapot: 'nem-valtozik', regi, uj: null, finomabbLepes: null };
  }

  const legfinomabb = Math.min(...lepesek);
  const finomabbLepes = legfinomabb < params.kerekitesKorlat ? legfinomabb : null;
  return { tetelId: tetel.id, allapot: 'valtozik', regi, uj, finomabbLepes };
}

export function tomegesArSorok(tetelek: readonly Tetel[], params: TomegesArParams): TomegesArSor[] {
  return tetelek.map((tetel) => tomegesArSor(tetel, params));
}

export interface TomegesArOsszegzes {
  valtozik: number;
  nincsAr: number;
  nemValtozik: number;
  nullara: number;
  /** A `valtozik` sorok közül hánynak kellett a választottnál finomabb lépés. */
  finomabb: number;
}

/**
 * A dialógus lábléc-darabszámai -- csak a ténylegesen kipipált (`kivett`-ben
 * NEM szereplő) `valtozik` sorok számítanak "változik"-nak, a többi
 * kategória a körből fakad, a kijelöléstől független.
 */
export function tomegesArOsszegzes(
  sorok: readonly TomegesArSor[],
  kivett: ReadonlySet<string>,
): TomegesArOsszegzes {
  const eredmeny: TomegesArOsszegzes = { valtozik: 0, nincsAr: 0, nemValtozik: 0, nullara: 0, finomabb: 0 };
  for (const sor of sorok) {
    if (sor.allapot === 'valtozik') {
      if (kivett.has(sor.tetelId)) continue;
      eredmeny.valtozik += 1;
      if (sor.finomabbLepes != null) eredmeny.finomabb += 1;
    } else if (sor.allapot === 'nincs-ar') {
      eredmeny.nincsAr += 1;
    } else if (sor.allapot === 'nem-valtozik') {
      eredmeny.nemValtozik += 1;
    } else {
      eredmeny.nullara += 1;
    }
  }
  return eredmeny;
}

/**
 * A tömeges módosítás írása -- a friss `tetelek`-en (a `commit()` MENTÉS
 * pillanatában kapott `prev.tetelek`-jén) számol újra, nem az előnézet
 * befagyasztott értékeit írja vissza, a `PriceListAdminPage.tsx`
 * `addCategory`/`mentUjTetel`-jének elvén. Csak az `idk`-ban szereplő, a
 * friss adaton is `valtozik` állapotú tételeket cseréli le -- egy
 * időközben megváltozott tétel emiatt vagy a megváltozott alapról frissül
 * tovább, vagy (ha időközben már nem "valtozik") érintetlen marad.
 */
export function alkalmazTomegesArat(
  tetelek: readonly Tetel[],
  idk: ReadonlySet<string>,
  params: TomegesArParams,
): Tetel[] {
  return tetelek.map((tetel) => {
    if (!idk.has(tetel.id)) return tetel;
    const sor = tomegesArSor(tetel, params);
    if (sor.allapot !== 'valtozik' || sor.uj == null) return tetel;
    return { ...tetel, ar: { ...tetel.ar, [params.penznem]: sor.uj } };
  });
}
