// Ekezetfuggetlen keresesehez -- portolva ui/tokens.js:70-75-bol.
// "gyoker" -> megtalalja: "Gyokerkezeles"
//
// NFD-normalizalas szetszedi az ekezetes betuket alapbetu + kombinalo
// ekezetjel (U+0300-U+036F) parra, amit utana levagunk.

import type { LokalizaltSzoveg } from './types';

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
