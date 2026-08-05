// Dátumszámítás. Az "Az ajánlat X-ig érvényes" szöveg számított dátum,
// nem "N napig érvényes" szöveg -- lásd docs/04-nyomtatvany-spec.md.

/** ISO (YYYY-MM-DD) dátum + N nap, szintén ISO formátumban. */
export function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2026. augusztus 5." formátum a nyomtatvány érvényességi mondatához és az aláírás-blokkhoz. */
export function formatHuDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('hu-HU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** "2026.08.05." rövid formátum a fejléc/lábléc metaadatához (docs/04-nyomtatvany-spec.md). */
export function formatHuDateShort(isoDate: string): string {
  return `${isoDate.replace(/-/g, '.')}.`;
}
