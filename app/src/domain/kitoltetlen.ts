// Kitöltetlen (tétel nélküli) sorok kiszűrése -- a fogtérkép-kattintással
// felvett, még be nem azonosított sor a szerkesztőben szándékosan
// megjelenhet (a doki még nem választott hozzá beavatkozást), de
// véglegesítéskor ezt a PreviewPage KEMÉNY blokknak veszi -- névtelen,
// 0 Ft-os sor nem kerülhet az aláírandó PDF-re (lásd pdf/TervDocument.tsx
// sorrenderelése, ami a `nevSnapshot`-ot és az árat feltétel nélkül kiírja).
//
// Szándékosan MÁS, mint `toothVisual.ts` `hianyzoTetel`-je -- az egy MA MÁR
// az árlistából törölt/átnevezett `tetelId`-re mutató sort jelez (a
// `nevSnapshot`/ár pillanatkép D7 szerint továbbra is érvényes, csak a
// mai árlistával nem egyeztethető), ez pedig egy SOSEM kitöltött sort.

import type { Plan } from './types';

export interface KitoltetlenSor {
  fazisIndex: number;
  fazisNev: string;
  sorIndex: number;
  fogak: string;
}

/** Tétel nélküli (`tetelId` üres) sorok, terv sorrendben. */
export function kitoltetlenSorok(plan: Plan): KitoltetlenSor[] {
  const eredmeny: KitoltetlenSor[] = [];
  plan.fazisok.forEach((fazis, fazisIndex) => {
    fazis.sorok.forEach((sor, sorIndex) => {
      if (!sor.tetelId.trim()) {
        eredmeny.push({ fazisIndex, fazisNev: fazis.megnevezes, sorIndex, fogak: sor.fogak });
      }
    });
  });
  return eredmeny;
}
