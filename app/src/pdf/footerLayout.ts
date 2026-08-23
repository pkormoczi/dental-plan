// A lábléc jobb blokkjának (páciensnév + tervId, alatta árlista-dátum +
// oldalszám) magassága a névhossztól függ, de a dokumentum MINDEN oldalán
// azonosnak kell lennie -- innen a "dokumentum-szinten egyszer számolt"
// elv, lásd docs/04-nyomtatvany-spec.md "Lábléc -- minden oldalon".
//
// A @react-pdf/renderer nem ad szövegmérést (nincs "mekkora ez a string
// ebben a fontban" API), ezért karakterszám-heurisztika: átlagos glifa-
// előretolás ~0,5 em, ami FOOTER_FONTSIZE = 7.5 mellett 3,75 pt/karakter.
// Egy rossz becslés tartalom-ütközést okozhat -- böngészős vizuális
// ellenőrzés kötelező (lásd .claude/skills/browser-validation/).

const FOOTER_FONTSIZE = 7.5;
const ATLAGOS_GLIF_SZELESSEG_EM = 0.5;
const KARAKTER_SZELESSEG = FOOTER_FONTSIZE * ATLAGOS_GLIF_SZELESSEG_EM;

/** A lábléc jobb blokkjának szélessége pontban. */
export const FOOTER_JOBB_SZELESSEG = 200;

/** A lábléc jobb blokkjának sormagassága (`s.footerTextRight`, 1.5-es sorköz). */
export const FOOTER_SORMAGASSAG = FOOTER_FONTSIZE * 1.5;

const KARAKTER_PER_SOR = Math.floor(FOOTER_JOBB_SZELESSEG / KARAKTER_SZELESSEG);

/**
 * Hány sorra becsüli a lábléc a "<nev> · <tervId>" szöveget -- 1 vagy 2,
 * a "max két sor, ellipszis nélkül" szabály szerint plafonozva (a szöveg
 * maga nem csonkul, ez csak a magasság-becslésre vonatkozó feltételezés).
 */
export function footerNevSorok(nev: string, tervId: string): number {
  const szoveg = `${nev} · ${tervId}`;
  return Math.min(2, Math.max(1, Math.ceil(szoveg.length / KARAKTER_PER_SOR)));
}

/** A lábléc-terület a névhossz miatt igényelt extra magassága pontban. */
export function footerExtraMagassag(nev: string, tervId: string): number {
  return (footerNevSorok(nev, tervId) - 1) * FOOTER_SORMAGASSAG;
}
