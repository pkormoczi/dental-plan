// A felülírás-ütközés dialógusának állapota (migrációs terv §4.6): egy kérdés egyszerre, a
// válasz egy Promise-on érkezik vissza. A közvetlen tároló-hívók (törzsadat, sablon) a `ment`-et,
// az AppState a `kerdez`-t használja a saját mentési sorával (`state/felulirasSor.ts`).

import { useCallback, useState } from 'react';
import type { UtkozesKimenet } from '../state/felulirasSor';
import { FelulirasUtkozesError } from '../storage/taroloHibak';

export const ARLISTA_UTKOZES_CIM = 'Az árlista időközben a másik gépen módosult.';
export const BEALLITASOK_UTKOZES_CIM = 'A beállítások időközben a másik gépen módosultak.';
export const torzsadatUtkozesCim = (nev: string) => `${nev} törzsadata időközben a másik gépen módosult.`;
export const sablonUtkozesCim = (megnevezes: string) =>
  `A(z) „${megnevezes}” szöveg időközben a másik gépen módosult.`;

export type UtkozoMentesEredmeny<T> = { kimenet: 'mentve'; ertek: T } | { kimenet: 'betoltes' } | { kimenet: 'megsem' };

export interface FelulirasUtkozesDialogusProps {
  open: boolean;
  cim: string;
  onValasz: (kimenet: UtkozesKimenet) => void;
}

export function useFelulirasUtkozes() {
  const [kerdes, setKerdes] = useState<{ cim: string; valasz: (k: UtkozesKimenet) => void } | null>(null);

  const kerdez = useCallback(
    (cim: string) =>
      new Promise<UtkozesKimenet>((resolve) => {
        setKerdes({
          cim,
          valasz: (k) => {
            setKerdes(null);
            resolve(k);
          },
        });
      }),
    [],
  );

  /**
   * A mentés ütközés esetén a doki elé kerül: `sajat`-nál felülírás-jelzővel újrafut, a másik
   * két kimenetnél semmi nem íródik, és a hívó dönt (újratöltés, ill. „Nem mentve” jelzés).
   */
  const ment = useCallback(
    async <T>(mentes: (felulir: boolean) => Promise<T>, cim: string): Promise<UtkozoMentesEredmeny<T>> => {
      try {
        return { kimenet: 'mentve', ertek: await mentes(false) };
      } catch (err) {
        if (!(err instanceof FelulirasUtkozesError)) throw err;
      }
      const kimenet = await kerdez(cim);
      if (kimenet === 'sajat') return { kimenet: 'mentve', ertek: await mentes(true) };
      return { kimenet };
    },
    [kerdez],
  );

  const dialogus: FelulirasUtkozesDialogusProps = {
    open: kerdes !== null,
    cim: kerdes?.cim ?? '',
    onValasz: (k) => kerdes?.valasz(k),
  };

  return { ment, kerdez, dialogus };
}
