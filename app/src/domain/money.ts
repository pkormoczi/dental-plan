// Pénzformázás — portolva ui/tokens.js:45-67-ből.
//
// A pénz egész számként tárolódik a pénznem alapegységében:
// HUF -> forint, EUR -> cent. Így nincs lebegőpontos hiba az összegzésben.
// Ez szerződéses dokumentum: ne improvizálj toLocaleString()-gel, ez a
// docs/04-nyomtatvany-spec.md kötelező formátuma.

import type { Ar, Penznem } from './types';

export function formatMoney(value: number | null | undefined, currency: Penznem): string {
  if (value == null) return '—';
  if (currency === 'EUR') {
    return (
      (value / 100).toLocaleString('de-DE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' €'
    );
  }
  return Math.round(value).toLocaleString('hu-HU').replace(/ /g, ' ') + ' Ft';
}

export function formatPrice(ar: Ar | null | undefined, currency: Penznem): string | null {
  if (!ar) return null;
  if (ar.tipus === 'SAVOS') {
    return formatMoney(ar.min, currency) + '–' + formatMoney(ar.max, currency);
  }
  return formatMoney(ar.ertek, currency);
}

/** SAVOS típusnál a `min` az egységár alapértéke. */
export function basePrice(ar: Ar | null | undefined): number {
  if (!ar) return 0;
  return ar.tipus === 'SAVOS' ? ar.min : ar.ertek;
}
