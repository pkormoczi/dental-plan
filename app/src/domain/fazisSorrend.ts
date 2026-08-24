import { fazisNevGeneralt, generaltFazisNev } from './blankPlan';
import type { Fazis } from './types';

/**
 * Egy fázis felcserélése a `cel` pozícióval -- a `PriceListAdminPage.tsx`
 * `moveCategory()` mintáján, index-alapúra igazítva (a `Fazis`-nak nincs
 * `Kategoria`-szerű `id`-je). A hívó felelőssége a `cel` tartomány-
 * ellenőrzése (`PlanEditorPage.tsx` `movePhase()`) -- ez a függvény
 * feltételezi, hogy `cel` érvényes index. Csak a GENERÁLT (pl. "2.
 * kezelés") nevet frissíti pozíció szerint, a kézzel átírt fázisnevet a
 * mozgatás nem bántja. Új tömböt ad vissza, az eredeti `fazisok`-at nem
 * mutálja.
 */
export function fazisokFelcserelve(fazisok: Fazis[], pi: number, cel: number): Fazis[] {
  const f = fazisok.map((x) => ({ ...x }));
  if (fazisNevGeneralt(f[pi].megnevezes, pi + 1)) f[pi].megnevezes = generaltFazisNev(cel + 1);
  if (fazisNevGeneralt(f[cel].megnevezes, cel + 1)) f[cel].megnevezes = generaltFazisNev(pi + 1);
  [f[pi], f[cel]] = [f[cel], f[pi]];
  f.forEach((x, i) => {
    x.sorszam = i + 1;
  });
  return f;
}

/**
 * Az összecsukott fázis-indexek halmazának újraindexelése egy fázis
 * törlése után -- a törölt `pi` alatti indexek változatlanok, a fölötte
 * lévők eggyel lejjebb tolódnak, maga a törölt index (ha szerepelt) elesik.
 */
export function fazisCsukvaTorlesUtan(csukva: Set<number>, pi: number): Set<number> {
  const next = new Set<number>();
  csukva.forEach((idx) => {
    if (idx < pi) next.add(idx);
    else if (idx > pi) next.add(idx - 1);
  });
  return next;
}

/**
 * Az összecsukott fázis-indexek halmazának frissítése egy mozgatás után --
 * a két érintett index (`pi`/`cel`) tagsága felcserélődik, hogy az
 * összecsukott/nyitott állapot a fázist kövesse, ne a pozíciót.
 */
export function fazisCsukvaMozgatasUtan(csukva: Set<number>, pi: number, cel: number): Set<number> {
  const piCsukva = csukva.has(pi);
  const celCsukva = csukva.has(cel);
  const next = new Set(csukva);
  if (celCsukva) next.add(pi);
  else next.delete(pi);
  if (piCsukva) next.add(cel);
  else next.delete(cel);
  return next;
}
