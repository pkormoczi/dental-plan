// Az adatmappa kiválasztásának lépései egy helyen: az első indítás varázslója, az induláskori
// blokkoló képernyő és a Beállítások „Mappa váltása” ugyanezt futtatja (migrációs terv §6.2–§6.4).
// A miénknek talált mappára azonnal átvált; üresbe csak megerősítés után épít, hiányosba csak
// a doki explicit pótlása után ír.

import { useCallback, useState } from 'react';
import type { Adattarolas } from '../storage/StorageContext';
import type { AdatmappaAllapot } from '../storage/taroloIpc';

/** Honnan a mutatott vizsgálat: a már beállított mappáé (induláskor), vagy egy frissen választotté. */
export type VizsgalatForras = 'beallitott' | 'valasztott';

export interface MutatottVizsgalat {
  v: AdatmappaAllapot;
  forras: VizsgalatForras;
}

export interface AdatmappaValasztas {
  mutatott: MutatottVizsgalat | null;
  folyamatban: boolean;
  hiba: string | null;
  valassz: () => Promise<void>;
  ujra: () => Promise<void>;
  potol: () => Promise<void>;
  letrehoz: () => Promise<void>;
  alaphelyzet: () => void;
}

export function useAdatmappaValasztas(
  adattarolas: Adattarolas,
  opciok: {
    kezdo: AdatmappaAllapot | null;
    /** A váltás előtti utolsó szó (a félkész terv megerősítése); hamisra nem vált. */
    valtasElott?: () => Promise<boolean>;
  },
): AdatmappaValasztas {
  const [mutatott, setMutatott] = useState<MutatottVizsgalat | null>(
    opciok.kezdo ? { v: opciok.kezdo, forras: 'beallitott' } : null,
  );
  const [folyamatban, setFolyamatban] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const { valtasElott } = opciok;

  const fut = useCallback(async (fn: () => Promise<void>) => {
    setFolyamatban(true);
    setHiba(null);
    try {
      await fn();
    } catch (err) {
      setHiba(err instanceof Error ? err.message : String(err));
    } finally {
      setFolyamatban(false);
    }
  }, []);

  const atvalt = useCallback(
    async (letrehoz: boolean, forras: VizsgalatForras) => {
      if (valtasElott && !(await valtasElott())) return;
      const v = await adattarolas.hasznal(letrehoz);
      if (v.allapot === 'rendben') adattarolas.ujratolt();
      else setMutatott({ v, forras });
    },
    [adattarolas, valtasElott],
  );

  const eredmeny = useCallback(
    async (v: AdatmappaAllapot, forras: VizsgalatForras) => {
      if (v.allapot === 'rendben') await atvalt(false, forras);
      else setMutatott({ v, forras });
    },
    [atvalt],
  );

  const forras = mutatott?.forras ?? 'valasztott';
  return {
    mutatott,
    folyamatban,
    hiba,
    valassz: () =>
      fut(async () => {
        const v = await adattarolas.valaszt();
        if (v) await eredmeny(v, 'valasztott');
      }),
    ujra: () => fut(async () => eredmeny(await adattarolas.ujraellenoriz(), forras)),
    potol: () => fut(async () => eredmeny(await adattarolas.potol(), forras)),
    letrehoz: () => fut(() => atvalt(true, forras)),
    alaphelyzet: () => {
      setMutatott(null);
      setHiba(null);
    },
  };
}
