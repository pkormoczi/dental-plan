// A `PlanEditorPage.tsx`-en szerkeszthető fázis-/sormezők DOM `id`-jei --
// egy közös hely, mert eddig négy helyen (JSX, fókusz-effekt, teszt,
// CLAUDE.md) íródtak le egymástól függetlenül, ugyanazzal a template-
// literál mintával. A `useFokuszEffekt` hook, a `PhaseSection`, a
// `FazisMegjegyzes` és a `LineRow` mind ezekből építi a saját id-jeit.

/**
 * A `fokuszCel` állapot alakja -- kiemelve, hogy a `PhaseSection`/`LineRow`/
 * `FazisMegjegyzes` is hivatkozhassa (65. tétel, guided review
 * kényszerített-nyitás propjai). Lásd a `PlanEditorPage.tsx` `fokuszCel`
 * state kommentjét.
 */
export type FokuszCel =
  | { mit: 'fogak'; pi: number; li: number }
  | { mit: 'kereso'; pi: number; li: number }
  | { mit: 'nev'; pi: number; li: number }
  | { mit: 'leiras'; pi: number; li: number }
  | { mit: 'fazisKereso'; pi: number }
  | { mit: 'fazisNev'; pi: number }
  | { mit: 'fazisMegjegyzes'; pi: number }
  | null;

export function fazisPanelId(pi: number): string {
  return `fazis-panel-${pi}`;
}

export function fazisNevId(pi: number): string {
  return `fazis-nev-${pi}`;
}

export function fazisMegjegyzesId(pi: number): string {
  return `fazis-megjegyzes-${pi}`;
}

export function fazisKeresoId(pi: number): string {
  return `kereso-fazis-${pi}`;
}

export function keresoId(pi: number, li: number): string {
  return `kereso-${pi}-${li}`;
}

export function nevId(pi: number, li: number): string {
  return `nev-${pi}-${li}`;
}

export function fogId(pi: number, li: number): string {
  return `fog-${pi}-${li}`;
}

export function leirasId(pi: number, li: number): string {
  return `leiras-${pi}-${li}`;
}
