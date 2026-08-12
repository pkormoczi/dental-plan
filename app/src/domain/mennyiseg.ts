// Fogak -> darabszám követés (D14 részleges újranyitása, backlog-27). A
// `teeth.ts`-től szándékosan külön modul: az ott lévő függvények tiszta
// FDI-string parserek, nem ismerik a `Sor` típust; a `Sor`-tudatos
// szinkronizálás helye a `nev.ts` precedense (nevKoveti/leirasKoveti).

import { parseTeeth } from './teeth';
import type { Sor } from './types';

/**
 * A `fogak` mezőből következő darabszám, vagy `null`, ha a mező nem tiszta
 * FDI-felsorolás (üres vagy szabadszöveges, pl. "jobb felső") -- ilyenkor
 * nincs mit követni, a korábbi darabszám érintetlen marad.
 */
export function kovetettMennyiseg(fogak: string): number | null {
  const parsed = parseTeeth(fogak);
  return parsed.valid ? parsed.teeth.length : null;
}

/**
 * Egy `Sor`-patch kiegészítése a fogak->darabszám követés hatásával -- ez az
 * EGYETLEN hely, ahol eldől, hogy egy adott szerkesztés leválasztja-e a
 * sort a követéstől, vagy szinkronizálja a darabszámot. A `PlanEditorPage.tsx`
 * `patchLine`-ja hívja minden `LineRow`-patchre, a hívónak nem kell ismernie
 * a szabályokat.
 */
export function sorPatchKovetessel(sor: Sor, patch: Partial<Sor>): Partial<Sor> {
  // 1. Explicit visszakapcsolás (a Db cella melletti ⟳ gomb) -- azonnal
  // szinkronizál, a sor újra követő lesz. Ha a fogak mező (a patchbeli vagy a
  // meglévő) nem FDI-lista, a darabszám érintetlen marad.
  if (patch.mennyisegKezi === false) {
    const kovetett = kovetettMennyiseg(patch.fogak ?? sor.fogak);
    return kovetett == null ? patch : { ...patch, mennyiseg: kovetett };
  }
  // 2. A doki kézzel írt a Db mezőbe -- a sor leválik. A `'mennyiseg' in patch`
  // (nem érték-összehasonlítás) azért kell, mert egy friss sor `mennyiseg`
  // alapértéke mindig 1, függetlenül a fogak számától (lásd a tervdokumentum
  // 3. döntése) -- csak az ÍRÁS-esemény különbözteti meg a kettőt.
  if ('mennyiseg' in patch) {
    return { ...patch, mennyisegKezi: true };
  }
  // 3. Követő soron a fogak mező módosul -- szinkronizál, ha érvényes
  // FDI-lista, egyébként a darabszám marad az utolsó ismert értéken (a sor
  // követő állapotban marad).
  if ('fogak' in patch && sor.mennyisegKezi === false) {
    const kovetett = kovetettMennyiseg(patch.fogak ?? '');
    return kovetett == null ? patch : { ...patch, mennyiseg: kovetett };
  }
  return patch;
}
