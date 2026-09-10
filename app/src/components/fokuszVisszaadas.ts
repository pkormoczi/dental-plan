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
      if (elem?.isConnected) elem.focus();
    });
  };
}
