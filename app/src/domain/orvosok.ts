// Kezelőorvos-választás és öröklési szabályok. Az EGYETLEN hely, ahol a
// `Settings.inaktivOrvosok`/
// `alapertelmezettOrvos` szemantikája eldől -- ne dekódold újra máshol.

import type { Settings } from './types';

/** Pontos, trim-tolerő névegyezés -- a `plan.orvos` NÉV-pillanatkép,
 * nem keresés, ezért nem `norm()` (az a `domain/search.ts` ékezetfüggetlen
 * kétnyelvű tételnév-keresésének eszköze). */
function azonosNev(a: string, b: string): boolean {
  return a.trim() === b.trim();
}

/** A jelenleg aktív orvosnevek, `settings.orvosok` sorrendjében. Hiányzó
 * `inaktivOrvosok` = minden orvos aktív (egy a mező bevezetése előtti
 * `beallitasok.json`-nál). */
export function aktivOrvosok(settings: Settings): string[] {
  const inaktiv = settings.inaktivOrvosok ?? [];
  return settings.orvosok.filter((nev) => !inaktiv.some((i) => azonosNev(i, nev)));
}

/** A ténylegesen érvényes alapértelmezett orvos neve: `alapertelmezettOrvos`,
 * ha az AKTÍV; egyébként az első aktív név `orvosok`-ban; aktív orvos híján
 * `''` (a `Plan.orvos` típusa `string`, nem `string | null`). */
export function alapertelmezettOrvosNeve(settings: Settings): string {
  const aktivak = aktivOrvosok(settings);
  const explicit = settings.alapertelmezettOrvos;
  if (explicit && aktivak.some((nev) => azonosNev(nev, explicit))) return explicit;
  return aktivak[0] ?? '';
}

/** A `ujVerzioOrvosa` fallback-jelzése -- `null`, ha nem történt visszaesés. */
export type OrvosFallback = { regi: string; uj: string } | null;

/** Egy „Új verzió” nyitásakor a forrás terv orvosának öröklése/fallback-je:
 * aktív forrás -- változatlan, `fallback: null`; inaktív/törölt (árva)
 * forrás -- a globális default, `fallback`-ben a régi/új név; üres forrás --
 * a globális default, `fallback: null` (nincs korábbi név, amiről az
 * info-sáv szólhatna). */
export function ujVerzioOrvosa(
  forrasOrvos: string,
  settings: Settings,
): { orvos: string; fallback: OrvosFallback } {
  if (!forrasOrvos.trim()) return { orvos: alapertelmezettOrvosNeve(settings), fallback: null };
  const aktivak = aktivOrvosok(settings);
  if (aktivak.some((nev) => azonosNev(nev, forrasOrvos))) {
    return { orvos: forrasOrvos, fallback: null };
  }
  const uj = alapertelmezettOrvosNeve(settings);
  return { orvos: uj, fallback: { regi: forrasOrvos, uj } };
}

export type OrvosProblema = 'hianyzik' | 'nem-aktiv';

/** A véglegesítés-őr kemény blokkjához (lásd app/src/domain/CLAUDE.md) --
 * MÁR FELOLDOTT aktív névlistát kap, nem
 * `Settings`-et (a `veglegesitesOr.ts` szerződése szerint minden bemenete
 * előre feloldott, a `leirasokMutatasa`/`master` paraméterek mintájára). */
export function orvosProblema(orvos: string, aktivNevek: string[]): OrvosProblema | null {
  if (!orvos.trim()) return 'hianyzik';
  if (!aktivNevek.some((nev) => azonosNev(nev, orvos))) return 'nem-aktiv';
  return null;
}
