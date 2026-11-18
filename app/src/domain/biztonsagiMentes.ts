// A biztonsági mentés esedékessége (migrációs terv §6.5): a Drive nem mentés, a havi külső
// másolat a rendelő teendője (PRODUCT.md § Adat- és deployment-korlátok). DOM-mentes: a main
// process is importálja a fájlnévhez.

import { localIsoDate, naptariNapKulonbseg } from './date';

/** Ennyi napnál régebbi mentés után emlékeztet a Kezdőlap. */
export const MENTES_EMLEKEZTETO_NAP = 30;

/** Hány naptári napja készült az utolsó mentés; `null`, ha még nem volt, vagy az időpont olvashatatlan. */
export function mentesKoraNap(utolso: string | null, most: Date): number | null {
  if (!utolso) return null;
  const akkor = new Date(utolso);
  return Number.isNaN(akkor.getTime()) ? null : naptariNapKulonbseg(akkor, most);
}

/** Esedékes, ha még nem volt mentés, vagy 30 napnál régebbi. */
export function mentesEsedekes(utolso: string | null, most: Date): boolean {
  const kor = mentesKoraNap(utolso, most);
  return kor == null || kor > MENTES_EMLEKEZTETO_NAP;
}

export function mentesFajlnev(most: Date): string {
  return `mandoki-dental-mentes-${localIsoDate(most)}.zip`;
}
