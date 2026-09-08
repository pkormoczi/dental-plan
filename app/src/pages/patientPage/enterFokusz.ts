// Enter-lánc a Terv adatai lap szöveges mezőin: a leütés nem küld űrlapot,
// hanem a következő mezőre viszi a fókuszt. `id` + `getElementById` a
// meglévő minta szerint (tervReszletei/FazisokBlokk.tsx,
// components/PatientPlanChains.tsx) -- NEM ref-lánc, mert a lánc egyes
// tagjai feltételesen renderelődnek (Kiskorú → Törvényes képviselő), és egy
// ref-tömb ettől törékennyé válna.

import type { KeyboardEvent } from 'react';

export function fokuszra(id: string) {
  document.getElementById(id)?.focus();
}

/** `onKeyDown` a lánc egy tagjára: Enter → a `kovetkezoId` elem kap fókuszt. */
export function enterFokusz(kovetkezoId: string) {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    fokuszra(kovetkezoId);
  };
}
