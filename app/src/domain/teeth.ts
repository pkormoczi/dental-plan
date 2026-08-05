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
