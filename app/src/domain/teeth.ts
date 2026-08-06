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
