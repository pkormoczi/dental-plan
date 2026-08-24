// Dátumszámítás. Az "Az ajánlat X napjáig érvényes" szöveg számított dátum,
// nem "N napig érvényes" szöveg -- lásd docs/04-nyomtatvany-spec.md.
//
// D21: a hosszú/rövid formátum nyelvfüggő (a nyelv vezérli a nyomtatvány
// szövegét, lásd domain/types.ts "Nyelv"). A `nyelv` paraméter szándékosan
// kötelező, nem defaultos -- egy alapérték elrejtene egy kihagyott hívási
// helyet.

import type { Nyelv } from './types';

/** A mai nap ISO (YYYY-MM-DD) dátuma. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

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

/**
 * A piszkozat-autosave "Piszkozat mentve"/"Utolsó módosítás" időbélyege
 * (Home.tsx, pages/planEditor/PlanEditorHeader.tsx) -- NEM a nyomtatvány
 * (docs/04-nyomtatvany-spec.md) formátuma, ezért nem `formatLongDate`/
 * `formatShortDate`: azok tisztán naptári dátumot (nap felbontás, UTC-re
 * rögzítve) formáznak, ide viszont egy tényleges időpillanat (dátum +
 * óra:perc, a böngésző időzónájában) kell. Mindig magyar (`hu-HU`) --
 * belső, doki felé szóló szöveg, nem a terv nyelvét követi.
 */
export function formatPiszkozatIdo(iso: string): string {
  const d = new Date(iso);
  const datum = d.toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const ido = d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
  return `${datum} ${ido}`;
}

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const nap = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${nap}`;
}

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * A Kezdőlap recent-páciens sorának "2 órája"/"tegnap"/"3 napja" jelzése
 * (docs/03-funkcionalis-spec.md § 1. Indítás, D39). Szándékosan NEM
 * `Intl.RelativeTimeFormat`: `hu`/`numeric:'auto'` "2 órával ezelőtt"-et ad
 * (nem "2 órája"-t), és a hét/hónap egységnél naptári periódusra hivatkozik,
 * nem eltelt időre (`-1 week` -> "előző hét", ami egy 6 napos elemre
 * félrevezető) -- ugyanaz az ok, ami `formatShortDate`-et is kézi
 * összerakásra vitte. A `most` szándékosan kötelező, lásd a fájl fejlécét.
 * A perc/óra sáv eltelt-idő alapú, a nap-sáv helyi naptári nap alapú --
 * enélkül egy tegnap éjfél körüli időbélyeg hol "23 órája", hol "tegnap"
 * lenne attól függően, melyik oldalára esik a határnak.
 */
export function formatRelativIdo(iso: string, most: Date): string {
  const akkor = new Date(iso);
  const eltelt = most.getTime() - akkor.getTime();
  if (eltelt < 60_000) return 'az imént';
  if (eltelt < 3_600_000) return `${Math.floor(eltelt / 60_000)} perce`;
  if (eltelt < 86_400_000) return `${Math.floor(eltelt / 3_600_000)} órája`;
  const napkulonbseg = Math.round((localMidnight(most) - localMidnight(akkor)) / 86_400_000);
  if (napkulonbseg === 1) return 'tegnap';
  if (napkulonbseg <= 6) return `${napkulonbseg} napja`;
  return formatShortDate(localIsoDate(akkor), 'hu');
}
