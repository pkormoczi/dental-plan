// Dátumszámítás. Az "Az ajánlat X napjáig érvényes" szöveg számított dátum,
// nem "N napig érvényes" szöveg -- lásd docs/04-nyomtatvany-spec.md.
//
// D21: a hosszú/rövid formátum nyelvfüggő (a nyelv vezérli a nyomtatvány
// szövegét, lásd domain/types.ts "Nyelv"). A `nyelv` paraméter szándékosan
// kötelező, nem defaultos -- egy alapérték elrejtene egy kihagyott hívási
// helyet.

import type { Nyelv } from './types';

/** ISO (YYYY-MM-DD) dátum + N nap, szintén ISO formátumban. */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const LONG_DATE_LOCALE: Record<Nyelv, string> = { hu: 'hu-HU', de: 'de-DE' };

/**
 * hu: "2026. november 5."  de: "5. November 2026"
 * A nyomtatvány érvényességi mondatához és az aláírás-blokkhoz.
 */
export function formatLongDate(isoDate: string, nyelv: Nyelv): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(LONG_DATE_LOCALE[nyelv], {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * hu: "2026.08.05."  de: "05.08.2026"
 * A fejléc/lábléc metaadatához (docs/04-nyomtatvany-spec.md). Kézzel
 * összerakva, nem Intl-lel -- a de-DE Intl vezető nulla nélküli napot adna
 * (pl. "5.11.2026"), ez viszont a lábléc jogi metaadata.
 */
export function formatShortDate(isoDate: string, nyelv: Nyelv): string {
  const [y, m, d] = isoDate.split('-');
  return nyelv === 'de' ? `${d}.${m}.${y}` : `${y}.${m}.${d}.`;
}
