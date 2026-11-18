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

/** A telepített appban a fájl nem letöltődik, hanem a doki által választott helyre másolódik. */
export type LetoltesFelirat = 'Letöltve' | 'Másolva';

export interface LetoltesJelzoAllapot {
  /** A legutóbb letöltött fájl neve, vagy `null`, ha még nem volt letöltés. */
  fajlnev: string | null;
  felirat: LetoltesFelirat;
  jelezLetoltes: (fajlnev: string, felirat?: LetoltesFelirat) => void;
  urit: () => void;
}

export function useLetoltesJelzo(): LetoltesJelzoAllapot {
  const [allapot, setAllapot] = useState<{ fajlnev: string | null; felirat: LetoltesFelirat }>({
    fajlnev: null,
    felirat: 'Letöltve',
  });
  // `urit` stabil hivatkozás: a Terv részletei lapon egy effekt függősége,
  // ami minden renderben újraképzett függvénnyel azonnal eltüntetné a
  // frissen kiírt fájlnevet.
  const urit = useCallback(() => setAllapot((a) => ({ ...a, fajlnev: null })), []);
  const jelezLetoltes = useCallback(
    (fajlnev: string, felirat: LetoltesFelirat = 'Letöltve') => setAllapot({ fajlnev, felirat }),
    [],
  );
  return { ...allapot, jelezLetoltes, urit };
}

/**
 * A látható sor -- üresen semmit nem renderel, tehát helyet sem foglal. A
 * fájlnév `t.mono` szedéssel, mert a doki karakterről karakterre veti össze
 * a Letöltések mappa tartalmával.
 */
export function LetoltesFajlnevSor({
  fajlnev,
  felirat = 'Letöltve',
}: {
  fajlnev: string | null;
  felirat?: LetoltesFelirat;
}) {
  if (!fajlnev) return null;
  return (
    <Text as="div" size="1" color="gray" mt="1">
      {felirat}:{' '}
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
export function LetoltesEloRegio({
  fajlnev,
  felirat = 'Letöltve',
}: {
  fajlnev: string | null;
  felirat?: LetoltesFelirat;
}) {
  // Egész mondat, nem a látható sor „Letöltve: …” címke-alakja -- a
  // képernyőolvasó így nem kettőspont-töredéket mond be.
  return (
    <VisuallyHidden aria-live="polite">{fajlnev ? `${fajlnev} ${felirat.toLowerCase()}.` : ''}</VisuallyHidden>
  );
}

/** A látható sor és a bemondás együtt -- egyetlen letöltési pontot kiszolgáló hívóknak. */
export function LetoltesJelzo({ fajlnev, felirat }: { fajlnev: string | null; felirat?: LetoltesFelirat }) {
  return (
    <>
      <LetoltesEloRegio fajlnev={fajlnev} felirat={felirat} />
      <LetoltesFajlnevSor fajlnev={fajlnev} felirat={felirat} />
    </>
  );
}
