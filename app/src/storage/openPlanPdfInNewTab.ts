// A mentett PDF új lapon való megnyitása, popup-blokk-tűrő módon: az ablakot
// MÉG a `await` előtt nyitjuk (a felhasználói gesztus alatt), és utólag
// irányítjuk át a blob-URL-re -- egy `await` utáni `window.open()` a
// böngészőnek már nem gesztus-eredetű, és néma blokkolást kap. Három hívó
// osztozik rajta (Terv részletei, az előnézet sikerképernyője, a Kezdőlap
// "imént véglegesített terv" kártyája), ezért nem másolat.
//
// Az eredmény-fajták szándékosan nem kész üzenetek: a "nincs mentett PDF"
// szövege a hívó rétegben él (`components/PlanVersionActionDialog.tsx`
// `nincsMentettPdfHiba`), demó-eredetnél más hangnemmel.

import type { PlanRef } from '../domain/types';

export type PdfMegnyitasEredmeny =
  | { fajta: 'ok' }
  | { fajta: 'nincs-pdf' }
  | { fajta: 'hiba'; message: string };

export async function openPlanPdfInNewTab(
  ref: PlanRef,
  loadPlanPdf: (ref: PlanRef) => Promise<Uint8Array | null>,
): Promise<PdfMegnyitasEredmeny> {
  const win = window.open('', '_blank');
  if (!win) {
    return {
      fajta: 'hiba',
      message:
        'A böngésző letiltotta az új lap megnyitását — engedélyezd a felugró ablakokat ehhez ' +
        'az oldalhoz, vagy használd a Letöltést.',
    };
  }
  try {
    const bytes = await loadPlanPdf(ref);
    if (!bytes) {
      win.close();
      return { fajta: 'nincs-pdf' };
    }
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    win.location.href = URL.createObjectURL(blob);
    return { fajta: 'ok' };
  } catch (err) {
    win.close();
    return {
      fajta: 'hiba',
      message:
        err instanceof Error
          ? `A megnyitás nem sikerült: ${err.message}`
          : 'A megnyitás váratlanul meghiúsult.',
    };
  }
}
