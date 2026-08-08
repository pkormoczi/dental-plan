// A fogtérkép kezelés-kategória szín- és felirat-konfigurációja -- EZ AZ
// EGYETLEN hely, ahol egy kezeléskategória színt kap. A jelmagyarázat, a
// webes fogtérkép (design/toothChartSvg.ts) és a nyomtatvány
// (pdf/ToothChartPdf.tsx) mind innen olvas -- ne duplikáld a színeket máshol.
//
// A domain objektumok (Sor, Tetel) SZÁNDÉKOSAN nem kapnak színmezőt --
// CLAUDE.md "Domain szókincs": a séma kulcsai a lemezre írt igazság, egy UI-
// prezentációs érték (szín) nem való közéjük. Ez a réteg köti össze az
// árlista `kategoriaId`-ját a megjelenítéssel, lásd domain/toothVisual.ts
// `vizualKategoriaFor`.

import type { LokalizaltSzoveg } from '../domain/types';

/**
 * A tényleges kezeléstípusok (implantáció, gyökérkezelés stb.) helyett a
 * projekt ma csak `kategoriaId`-t ismer az árlistán (lásd
 * domain/toothVisual.ts fejlécét) -- ez a nyolc érték a 12 árlista-kategória
 * vizuális összevonása. Bővíthető/átnevezhető, amint az árlista-kategorizálás
 * finomabb lesz (docs/08-backlog.md 8. tétel).
 */
export type KezelesVizual =
  | 'SEBESZET'
  | 'IMPLANTATUM'
  | 'FOGSOR'
  | 'KORONA'
  | 'GYOKERKEZELES'
  | 'PARODONTOLOGIA'
  | 'TOMES'
  | 'EGYEB';

export const KEZELES_VIZUALOK: Record<KezelesVizual, { szin: string; cimke: LokalizaltSzoveg }> = {
  SEBESZET: { szin: '#ff6b6b', cimke: { hu: 'Szájsebészet', de: 'Mundchirurgie' } },
  IMPLANTATUM: { szin: '#9775fa', cimke: { hu: 'Implantátum / All-on-X', de: 'Implantat / All-on-X' } },
  FOGSOR: { szin: '#e8590c', cimke: { hu: 'Fogpótlás (kivehető)', de: 'Herausnehmbarer Zahnersatz' } },
  KORONA: { szin: '#4dabf7', cimke: { hu: 'Korona és híd', de: 'Krone und Brücke' } },
  GYOKERKEZELES: { szin: '#fcc419', cimke: { hu: 'Gyökérkezelés', de: 'Wurzelbehandlung' } },
  PARODONTOLOGIA: { szin: '#20c997', cimke: { hu: 'Parodontológia', de: 'Parodontologie' } },
  TOMES: { szin: '#51cf66', cimke: { hu: 'Tömés', de: 'Füllung' } },
  EGYEB: { szin: '#adb5bd', cimke: { hu: 'Egyéb kezelés', de: 'Sonstige Behandlung' } },
};

/**
 * Egy fogon több kezelés is lehet -- ilyenkor ez a tábla dönti el, melyik
 * színt kapja a fog (lásd domain/toothVisual.ts `resolveToothVisual`). Az
 * elején állók nyernek. EGYETLEN hely a precedenciának -- ne szórd szét
 * if/else-ekkel a UI-ban.
 */
export const KEZELES_VIZUAL_PRIORITAS: readonly KezelesVizual[] = [
  'SEBESZET',
  'IMPLANTATUM',
  'FOGSOR',
  'KORONA',
  'GYOKERKEZELES',
  'PARODONTOLOGIA',
  'TOMES',
  'EGYEB',
];

/**
 * Árlista `kategoriaId` -> vizuális kategória. A `k08 Szájsebészet` ma
 * foghúzást és implantációt is tartalmaz (nincs finomabb kategorizálás az
 * árlistában) -- mindkettő `SEBESZET` színt kap, amíg a kategória nem bomlik
 * szét (docs/08-backlog.md 8. tétel). `k12 Egyéb kezelések` hasonlóan
 * vegyes -- lásd docs/06-arlista-import.md.
 */
export const KATEGORIA_VIZUAL: Record<string, KezelesVizual> = {
  k01: 'EGYEB', // Besorolatlan
  k02: 'TOMES', // Tömések
  k03: 'GYOKERKEZELES', // Gyökérkezelés
  k04: 'EGYEB', // Fogkőeltávolítás
  k05: 'EGYEB', // Fogfehérítés
  k06: 'EGYEB', // Gyermekfogászat
  k07: 'IMPLANTATUM', // All-on-X csomagok
  k08: 'SEBESZET', // Szájsebészet
  k09: 'PARODONTOLOGIA', // Parodontológia
  k10: 'KORONA', // Korona és hídpótlások
  k11: 'FOGSOR', // Kivehető fogsorok
  k12: 'EGYEB', // Egyéb kezelések
};

/** Ismeretlen/hiányzó kategória -- semleges `EGYEB`, sosem dob hibát. */
export function vizualKategoriaFor(kategoriaId: string | null | undefined): KezelesVizual {
  if (!kategoriaId) return 'EGYEB';
  return KATEGORIA_VIZUAL[kategoriaId] ?? 'EGYEB';
}
