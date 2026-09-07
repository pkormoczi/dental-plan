// Ekezetfuggetlen keresesehez -- portolva ui/tokens.js:70-75-bol.
// "gyoker" -> megtalalja: "Gyokerkezeles"
//
// NFD-normalizalas szetszedi az ekezetes betuket alapbetu + kombinalo
// ekezetjel (U+0300-U+036F) parra, amit utana levagunk.

import type { Kategoria, LokalizaltSzoveg, Tetel } from './types';

const COMBINING_MARKS = /[̀-ͯ]/g;

export function norm(s: string | null | undefined): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '');
}

/**
 * Egyezik-e egy tétel/kategória neve a keresőszöveggel -- MINDKÉT nyelven,
 * függetlenül a terv nyelvétől (CLAUDE.md "A UX kritikus pontja": a doki
 * magyarul gépel akkor is, ha német ajánlatot állít össze).
 *
 * A MÁR normalizált keresőszöveget várja (`norm(q)`), nem a nyerset -- a
 * hívó a ciklus ELŐTT egyszer normalizál, nem tételenként újra. A `norm()`
 * null-biztos, ezért hiányzó `nev.de` esetén nincs szükség külön kezelésre.
 *
 * Ez az EGYETLEN hely, ahol a kétnyelvű keresés szabálya él: a tervszerkesztő
 * tétel-keresője (ItemPicker) és az Árlista admin szűrője is ezt hívja.
 */
export function nevEgyezik(nev: LokalizaltSzoveg, nq: string): boolean {
  return norm(nev.hu).includes(nq) || norm(nev.de).includes(nq);
}

/** Egy nyelvi változat rangja, vagy `null`, ha ez a változat nem egyezik. */
function nyelviRang(nev: string | null | undefined, nq: string): number | null {
  const n = norm(nev);
  if (!n.includes(nq)) return null;
  if (n.startsWith(nq)) return 0;
  if (n.split(/\s+/).some((szo) => szo.startsWith(nq))) return 1;
  return 2;
}

/**
 * Egy tételnév szöveg-relevanciája: szó eleje (0) > szóhatár (1) > belső
 * egyezés (2) -- a `paciensKereses.ts` `paciensTalalatok()` rangsorával azonos
 * skála. A két nyelv közül a JOBBIK rang számít: a doki magyarul gépel egy
 * német terven is, egy erős magyar egyezést nem nyomhat le a gyenge német.
 */
export function tetelNevRang(nev: LokalizaltSzoveg, nq: string): number {
  const rangok = [nyelviRang(nev.hu, nq), nyelviRang(nev.de, nq)].filter(
    (r): r is number => r !== null,
  );
  return rangok.length ? Math.min(...rangok) : 2;
}

/**
 * A MÁR szűrt névtalálatok rangsorolása, a láthatósági limit ELŐTT -- így a
 * limit a rangsorolt sorrendből vág, nem az árlista sorrendjéből.
 *
 * Precedencia: szöveg-relevancia > `gyakori` (előrébb) > `csomag` (hátrébb) >
 * a kapott (árlista-)sorrend. A `gyakori`/`csomag` finomítás, nem felülírás:
 * a bejelentett hiba oka a relevancia hiánya volt, egy gyakori tétel nem
 * kerülhet egy nála relevánsabb találat elé.
 */
export function rangsoroltTetelTalalatok(talalatok: Tetel[], nq: string): Tetel[] {
  return talalatok
    .map((tetel, index) => ({ tetel, index, rang: tetelNevRang(tetel.nev, nq) }))
    .sort(
      (a, b) =>
        a.rang - b.rang ||
        Number(b.tetel.gyakori) - Number(a.tetel.gyakori) ||
        Number(a.tetel.csomag ?? false) - Number(b.tetel.csomag ?? false) ||
        a.index - b.index,
    )
    .map((x) => x.tetel);
}

/**
 * Azon kategória-`id`-k halmaza, amiknek a neve illeszkedik a keresőszövegre
 * -- ugyanazzal a `nevEgyezik()` szabállyal, tehát mindkét nyelven, a terv
 * nyelvétől függetlenül. Egyszer, a tétel-ciklus ELŐTT hívandó (a MÁR
 * normalizált `nq`-val), nem tételenként újra.
 */
export function egyezoKategoriaIdk(kategoriak: Kategoria[], nq: string): Set<string> {
  const idk = new Set<string>();
  for (const k of kategoriak) {
    if (nevEgyezik(k.nev, nq)) idk.add(k.id);
  }
  return idk;
}
