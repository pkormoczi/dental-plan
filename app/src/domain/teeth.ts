// FDI fogszam-kezeles -- portolva ui/tokens.js:77-85-bol.
// Maradó: 11-18, 21-28, 31-38, 41-48. Tejfog: 51-55, 61-65, 71-75, 81-85.
// Lasd docs/02-domain-modell.md "Fogszam kezeles".

export interface ParsedTeeth {
  valid: boolean;
  teeth: string[];
}

const FDI = /^(?:[1-4][1-8]|[5-8][1-5])$/;

export function parseTeeth(input: string | null | undefined): ParsedTeeth {
  const tokens = (input || '').split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) return { valid: false, teeth: [] };
  const ok = tokens.every((x) => FDI.test(x));
  return { valid: ok, teeth: ok ? tokens : [] };
}

/**
 * A szerkesztő inline hibaüzenetéhez: melyik token NÉZ KI számnak, de nem
 * érvényes FDI kód -- ez tényleges elgépelés (pl. "99", a kvadráns max 4/8).
 * Egy tisztán betűs token (pl. "jobb", "felső") szándékos szabadszöveges
 * jegyzet, nem hibás fogszám-kísérlet -- docs/02-domain-modell.md ":198"
 * szerint ez érvényes tartalom, `parseTeeth` mindent-vagy-semmit logikája
 * (fenti) emiatt nem használható közvetlenül erre a megkülönböztetésre,
 * mert a teljes mezőt érvénytelennek jelölné egyetlen "jobb felső"-től is.
 */
export function invalidFdiTokens(input: string | null | undefined): string[] {
  const tokens = (input || '').split(/[\s,;]+/).filter(Boolean);
  return tokens.filter((x) => /^\d+$/.test(x) && !FDI.test(x));
}

/**
 * Be/ki kapcsol egy FDI kódot a `fogak` felsorolásban -- a fogtérkép
 * soronkénti választójának (ToothPickerPopover) az egyetlen írási útja,
 * hogy ne legyen tokenkezelés a hívóban. Csak érvényes (`parseTeeth(...).valid`)
 * mezőn hívható, a hívó felelőssége ezt ellenőrizni -- szabadszöveges mezőt
 * (pl. "jobb felső") ez a függvény nem tud biztonságosan szerkeszteni.
 *
 * Bekapcsoláskor a végére fűz, kikapcsoláskor MINDEN előfordulást töröl (a
 * `parseTeeth` nem dedupol -- docs/08-backlog.md "parseTeeth nem dedupol"),
 * a megmaradó tokenek sorrendjét megtartja. A kimeneti elválasztó mindig
 * ", " -- ez a `placeholder`/seed adatban is használt alak (lásd
 * PlanEditorPage.tsx "16, 17, 26" placeholder).
 */
export function toggleFog(fogak: string, fdi: string): string {
  const tokens = (fogak || '').split(/[\s,;]+/).filter(Boolean);
  const van = tokens.includes(fdi);
  const next = van ? tokens.filter((x) => x !== fdi) : [...tokens, fdi];
  return next.join(', ');
}

/**
 * Nyomtatáshoz: vessző/pontosvessző után szóközt szúr, ha még nincs ott.
 * A react-pdf szövegtördelője az Unicode sortörés-szabályok szerint két
 * szám közötti vesszőnél nem tör sort (mintha egy nagy szám lenne, mint
 * "1,000"), ezért a szóköz nélkül gépelt fogszám-lista ("11,12,13,...")
 * kifolyik a fix szélességű oszlopból a szomszédosba, ahelyett hogy több
 * sorba törne.
 */
export function formatTeethForPrint(fogak: string): string {
  return fogak.replace(/([,;])(?=\S)/g, '$1 ');
}
