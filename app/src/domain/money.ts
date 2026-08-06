// Pénzformázás — portolva ui/tokens.js:45-67-ből.
//
// A pénz egész számként tárolódik a pénznem alapegységében:
// HUF -> forint, EUR -> cent. Így nincs lebegőpontos hiba az összegzésben.
// Ez szerződéses dokumentum: ne improvizálj toLocaleString()-gel, ez a
// docs/04-nyomtatvany-spec.md kötelező formátuma.

import type { Ar, Penznem } from './types';

export function formatMoney(value: number | null | undefined, currency: Penznem): string {
  if (value == null || !Number.isFinite(value)) return '—';
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

/**
 * Az EUR ár admin-mezőit euróban (nem centben) jelenítjük meg -- a
 * P0-5 találat pont az volt, hogy a doki centet gépel euró helyett.
 * `parseEuroInput`/`formatCentForInput` a `NumberField` `unit="EUR"`
 * módjának a fordítópárja: a tárolás VÁLTOZATLANUL cent marad
 * (docs/02-domain-modell.md), csak a beviteli mező mértékegysége más.
 */
export function parseEuroInput(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (normalized === '') return null;
  const euro = Number(normalized);
  if (!Number.isFinite(euro)) return null;
  return Math.round(euro * 100);
}

export function formatCentForInput(cent: number): string {
  return (cent / 100).toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
