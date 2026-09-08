// Kattintás utáni visszajelzés a PDF-letöltési pontokon: a doki a gomb
// mellett látja, MELYIK fájlt keresse a Letöltések mappában.
//
// A felirat "Letöltve", nem "Letöltés indítva" -- kimondott vállalás: a
// böngésző nem árulja el, hogy a fájl valóban lemezre került (Mentés
// másként, megszakítás), tehát a szó többet állít, mint amit tudunk; a doki
// fő kérdésére (mit keressek?) viszont a fájlnév válaszol.
//
// A felirat MARAD, amíg új dolog nem történik -- nincs időzítő, ezért a
// `useMentesJelzo` itt NEM használható: a jelentett helyzetben (páciens az
// asztal túloldalán) egy pár másodperces villanás pont akkorra tűnne el,
// mire a doki visszanéz.

import { useCallback, useState } from 'react';
import { Text, VisuallyHidden } from '@radix-ui/themes';
import { t } from '../design/tokens';

export interface LetoltesJelzoAllapot {
  /** A legutóbb letöltött fájl neve, vagy `null`, ha még nem volt letöltés. */
  fajlnev: string | null;
  jelezLetoltes: (fajlnev: string) => void;
  urit: () => void;
}

export function useLetoltesJelzo(): LetoltesJelzoAllapot {
  const [fajlnev, setFajlnev] = useState<string | null>(null);
  // `urit` stabil hivatkozás: a Terv részletei lapon egy effekt függősége,
  // ami minden renderben újraképzett függvénnyel azonnal eltüntetné a
  // frissen kiírt fájlnevet.
  const urit = useCallback(() => setFajlnev(null), []);
  return { fajlnev, jelezLetoltes: setFajlnev, urit };
}

/**
 * A látható sor -- üresen semmit nem renderel, tehát helyet sem foglal. A
 * fájlnév `t.mono` szedéssel, mert a doki karakterről karakterre veti össze
 * a Letöltések mappa tartalmával.
 */
export function LetoltesFajlnevSor({ fajlnev }: { fajlnev: string | null }) {
  if (!fajlnev) return null;
  return (
    <Text as="div" size="1" color="gray" mt="1">
      Letöltve:{' '}
      <Text style={{ fontFamily: t.mono }} size="1">
        {fajlnev}
      </Text>
    </Text>
  );
}

/**
 * A bemondás. Mountkor MÁR a DOM-ban van, csak a szövege vált -- egy
 * dinamikusan beszúrt `aria-live` régiót sok képernyőolvasó nem mond ki
 * (`PriceListAdminPage.tsx`, `NumberField.tsx`). Ahol több letöltési sor
 * van egy lapon, ebből EGY, lap-szintű példány áll, nem soronkénti.
 */
export function LetoltesEloRegio({ fajlnev }: { fajlnev: string | null }) {
  // Egész mondat, nem a látható sor „Letöltve: …” címke-alakja -- a
  // képernyőolvasó így nem kettőspont-töredéket mond be.
  return (
    <VisuallyHidden aria-live="polite">{fajlnev ? `${fajlnev} letöltve.` : ''}</VisuallyHidden>
  );
}

/** A látható sor és a bemondás együtt -- egyetlen letöltési pontot kiszolgáló hívóknak. */
export function LetoltesJelzo({ fajlnev }: { fajlnev: string | null }) {
  return (
    <>
      <LetoltesEloRegio fajlnev={fajlnev} />
      <LetoltesFajlnevSor fajlnev={fajlnev} />
    </>
  );
}
