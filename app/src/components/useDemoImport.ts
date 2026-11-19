// A demó-export importjának lépései (migrációs terv §7.2): a fájlt a main választja, olvassa és
// ellenőrzi, a doki az összegzést megerősíti, csak utána íródik bármi. A varázsló üres-mappa ága
// és a Beállítások Adattárolás füle közösen használja.

import { useCallback, useState } from 'react';
import type { Adattarolas } from '../storage/StorageContext';
import type { ImportMod, ImportOsszegzes } from '../storage/taroloIpc';

export interface DemoImport {
  mod: ImportMod;
  /** Az ellenőrzött export összegzése; amíg nem `null`, a megerősítő ablak nyitva. */
  osszegzes: ImportOsszegzes | null;
  folyamatban: boolean;
  hiba: string | null;
  /** A használt mappa felülírása után: az ablak az újratöltés előtt a sikert mutatja. */
  kesz: boolean;
  indit: () => Promise<void>;
  megerosit: () => Promise<void>;
  megse: () => void;
  /** A siker nyugtázása: a memóriabeli árlista és beállítások a régiek, ezért teljes újratöltés. */
  rendben: () => void;
}

export function useDemoImport(
  adattarolas: Adattarolas,
  mod: ImportMod,
  /** A váltás előtti utolsó szó (a félkész terv megerősítése); hamisra nem ír. */
  elott?: () => Promise<boolean>,
): DemoImport {
  const [osszegzes, setOsszegzes] = useState<ImportOsszegzes | null>(null);
  const [folyamatban, setFolyamatban] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [kesz, setKesz] = useState(false);

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

  return {
    mod,
    osszegzes,
    folyamatban,
    hiba,
    kesz,
    indit: () =>
      fut(async () => {
        setKesz(false);
        setOsszegzes(null);
        setOsszegzes(await adattarolas.importElonezet(mod));
      }),
    megerosit: () =>
      fut(async () => {
        if (elott && !(await elott())) return;
        await adattarolas.importIr();
        // Az új mappára a renderer csak újratöltéssel vált át; a felülírt mappánál előbb a siker látszik.
        if (mod === 'uj') adattarolas.ujratolt();
        else setKesz(true);
      }),
    megse: () => {
      setOsszegzes(null);
      setHiba(null);
    },
    rendben: () => adattarolas.ujratolt(),
  };
}
