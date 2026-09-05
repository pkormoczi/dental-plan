// Pénzformázás — portolva ui/tokens.js:45-67-ből.
//
// A pénz egész számként tárolódik a pénznem alapegységében:
// HUF -> forint, EUR -> cent. Így nincs lebegőpontos hiba az összegzésben.
// Ez szerződéses dokumentum: ne improvizálj toLocaleString()-gel, ez a
// nyomtatvány kötelező formátuma -- lásd PRODUCT.md § A nyomtatvány
// szerződéses dokumentum.

import type { Ar, Nyelv, Penznem } from './types';

// Az ezres/tizedes ELVÁLASZTÓ a dokumentum NYELVÉTŐL függ
// (hu-HU szóköz, de-DE pont), a tizedesjegyek száma és a pénznemjel a
// PÉNZNEMTŐL -- innen a Record<Nyelv, string> locale-map, a domain/date.ts
// LONG_DATE_LOCALE mintáján. A `nyelv` paraméter szándékosan kötelező, nem
// defaultos -- egy alapérték elrejtene egy kihagyott hívási helyet (lásd
// formatLongDate ugyanezen indoklását).
const PENZ_LOCALE: Record<Nyelv, string> = { hu: 'hu-HU', de: 'de-DE' };

// A HUF-nál a toLocaleString('hu-HU') mar U+00A0-t (nem torheto szokoz)
// hasznal ezres elvalasztokent, a ' Ft' es ' €' elotti szokoz is szandekosan
// U+00A0 -- CLAUDE.md: a penzosszeg soha nem tordelheto sortoresnel.
export function formatMoney(
  value: number | null | undefined,
  currency: Penznem,
  nyelv: Nyelv,
): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const locale = PENZ_LOCALE[nyelv];
  if (currency === 'EUR') {
    return (
      (value / 100).toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' €'
    );
  }
  return Math.round(value).toLocaleString(locale) + ' Ft';
}

export function formatPrice(
  ar: Ar | null | undefined,
  currency: Penznem,
  nyelv: Nyelv,
): string | null {
  if (!ar) return null;
  if (ar.tipus === 'SAVOS') {
    return formatMoney(ar.min, currency, nyelv) + '–' + formatMoney(ar.max, currency, nyelv);
  }
  return formatMoney(ar.ertek, currency, nyelv);
}

/** SAVOS típusnál a `min` az egységár alapértéke. */
export function basePrice(ar: Ar | null | undefined): number {
  if (!ar) return 0;
  return ar.tipus === 'SAVOS' ? ar.min : ar.ertek;
}

/**
 * Fordított SAVOS sáv (`min` nagyobb, mint `max`) -- puha jelzés, nem
 * betöltési hiba (a `validate.ts` guard csak azt nézi, véges szám-e mindkét
 * mező). Fordított sávnál a `formatPrice` "nagy–kicsi" tartományt írna ki, a
 * `basePrice` pedig a NAGYOBB számot (a `min`-t) vinné be a tervbe
 * egységárként -- ez a predikátum ad rá figyelmeztetést az Árlista adminban.
 */
export function savosHatarForditott(ar: Ar | null | undefined): boolean {
  return !!ar && ar.tipus === 'SAVOS' && ar.min > ar.max;
}

/**
 * Az EUR ár admin-mezőit euróban (nem centben) jelenítjük meg -- a
 * P0-5 találat pont az volt, hogy a doki centet gépel euró helyett.
 * `parseEuroInput`/`formatCentForInput` a `NumberField` `unit="EUR"`
 * módjának a fordítópárja: a tárolás VÁLTOZATLANUL cent marad
 * (lásd app/src/domain/CLAUDE.md), csak a beviteli mező mértékegysége más.
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
