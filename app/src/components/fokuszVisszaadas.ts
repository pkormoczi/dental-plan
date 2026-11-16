// Radix modális `Dialog`/`AlertDialog` trigger nélküli, kontrollált nyitásánál
// (state-ből vezérelt `open`, nincs `Dialog.Trigger`) a beépített záráskori
// fókusz-visszaadás a `triggerRef.current`-re hívódna, ami ilyenkor `null` --
// a fókusz a <body>-ra esne (Radix-forráskódban igazolt:
// @radix-ui/react-dialog `DialogContentModal` `onCloseAutoFocus`, lásd
// `DiscardChangesDialog.tsx` eredeti kommentje). Ez a helper adja a MEGADOTT
// célra fókuszáló `onCloseAutoFocus`-t: `cel` egy `ref` (ha a hívó egyetlen,
// stabil elemet birtokol), vagy egy kereső függvény (ha a trigger csak
// DOM-lekérdezéssel érhető el, pl. egy `.map`-ben renderelt sor gombja).

import type { RefObject } from 'react';

export function fokuszVisszaadasOnClose(
  cel: RefObject<HTMLElement | null> | (() => HTMLElement | null),
): (event: Event) => void {
  return (event) => {
    event.preventDefault();
    // rAF: a dialógus bezárása még a Radix FocusScope alatt fut -- egy
    // szinkron .focus() ide kívülre a trap visszalökné (ugyanaz az idióma,
    // mint a DiscardChangesDialog/UjPaciensDialog/NewPlanPage meglévő
    // fókusz-visszaadásánál).
    requestAnimationFrame(() => {
      const elem = typeof cel === 'function' ? cel() : cel.current;
      if (!elem?.isConnected || masModalisNyitva(elem)) return;
      elem.focus();
    });
  };
}

// Ha a zárással egy lépésben egy MÁSIK modális ablak nyílt (pl. a piszkozat-
// elvetés megerősítése után az „Új páciens” dialógus), a mögötte lévő célra
// vitt fókuszt a Radix-csapda nem hozza mindig vissza: a gépelés a háttérbe
// menne, egy szóköz pedig a háttérgombot nyomná meg. Egymásba ágyazott
// ablaknál a cél a nyitva maradó külső ablakban van, ott a visszaadás jár.
function masModalisNyitva(cel: HTMLElement): boolean {
  const nyitottak = document.querySelectorAll<HTMLElement>(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  );
  return Array.from(nyitottak).some((ablak) => !ablak.contains(cel));
}
