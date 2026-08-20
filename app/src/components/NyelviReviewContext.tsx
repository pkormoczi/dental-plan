// Irányított nyelvi review -- 65. tétel (docs/01-attekintes-es-dontesek.md
// D72), a tervdokumentum 5. döntése. Tranziens SESSION-állapot (nem
// perzisztált), a `TervWorkflowShell.tsx`-ben mountolva -- ez a
// `/paciens`-`/terv`-`/elonezet` egyetlen közös őse, hogy a session
// túlélje a route-váltást (a doki a `PreviewPage`-ről indítja, a
// `PlanEditorPage`-en navigál).
//
// KÜLÖN mechanizmus a `NavGuardContext`-től (D46) és a
// `LepesGuardContext`-től (D48) -- más a szemantika (nem "van nem mentett
// piszkozat" és nem "lépés-elhagyás ajánlat"), nem épül rájuk és nem
// keverendő össze velük. A `StorageContext.tsx`/`NavGuardContext.tsx`
// mintáját követi: `createContext<T | null>`, a `useNyelviReview()`
// accessor Provider nélkül dob.
//
// A JELENLEGI cél (`cel`) az EGYETLEN állapot, amit ez a Context tart --
// a "hány szöveg van még hátra" mindig a JELENLEGI piszkozatból élőben
// számolódik (`domain/nyelviReview.ts` `nyelviMismatchek()`), nem egy itt
// tárolt, befagyott lista (D473) -- ezt a `NyelviReviewBar.tsx` hívja,
// aminek van `plan`-hozzáférése (`useAppState()`), ennek a Contextnek
// nincs.

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ReviewCel } from '../domain/nyelviReview';

interface NyelviReviewContextValue {
  aktiv: boolean;
  /** A JELENLEGI navigációs cél, vagy `null`, ha a session aktív, de még nincs kiválasztott cél. */
  cel: ReviewCel | null;
  /** A "Vissza" gomb session-előzménye (D474/D475) -- ez a NAVIGÁCIÓS történet, nem a hátralévő sor. */
  elozmeny: ReviewCel[];
  /** Session indítása egy célra ugorva, üres előzménnyel. */
  indit: (elsoCel: ReviewCel) => void;
  /** Egy célra ugrás -- a jelenlegi cél (ha volt) az előzménybe kerül. */
  ugras: (cel: ReviewCel) => void;
  /** Az előzmény utolsó elemére lép vissza; nincs hatása, ha az előzmény üres. */
  vissza: () => void;
  /** A session teljes leállítása -- a sáv eltűnik, minden állapot törlődik. */
  leallit: () => void;
}

const NyelviReviewContext = createContext<NyelviReviewContextValue | null>(null);

export function NyelviReviewProvider({ children }: { children: ReactNode }) {
  const [aktiv, setAktiv] = useState(false);
  const [cel, setCel] = useState<ReviewCel | null>(null);
  const [elozmeny, setElozmeny] = useState<ReviewCel[]>([]);

  const value = useMemo<NyelviReviewContextValue>(
    () => ({
      aktiv,
      cel,
      elozmeny,
      indit: (elsoCel) => {
        setAktiv(true);
        setCel(elsoCel);
        setElozmeny([]);
      },
      ugras: (ujCel) => {
        setCel((elozoCel) => {
          if (elozoCel) setElozmeny((e) => [...e, elozoCel]);
          return ujCel;
        });
      },
      vissza: () => {
        setElozmeny((e) => {
          if (e.length === 0) return e;
          setCel(e[e.length - 1]);
          return e.slice(0, -1);
        });
      },
      leallit: () => {
        setAktiv(false);
        setCel(null);
        setElozmeny([]);
      },
    }),
    [aktiv, cel, elozmeny],
  );

  return <NyelviReviewContext.Provider value={value}>{children}</NyelviReviewContext.Provider>;
}

export function useNyelviReview(): NyelviReviewContextValue {
  const ctx = useContext(NyelviReviewContext);
  if (!ctx) throw new Error('useNyelviReview csak a NyelviReviewProvider-en belül használható.');
  return ctx;
}
