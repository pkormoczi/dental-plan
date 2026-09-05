// A "prefers-reduced-motion tiszteletben tartva" NEM opcionális szabály
// (lásd app/src/CLAUDE.md § Akadálymentesség). Eredetileg
// PlanEditorPage.tsx privát függvénye volt (egyetlen hívóval); a 2. hívóhely
// (PatientPlanChains.tsx "Ugrás a legfrissebb verzióra") miatt költözött ide.

/** `matchMedia` jsdom alatt nincs implementálva (vitest) -- óvatos lekérdezés. */
export function csokkentettMozgas(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}
