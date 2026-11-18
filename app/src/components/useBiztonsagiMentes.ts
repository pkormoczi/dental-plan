// A biztonsági mentés állapota és indítása, a Kezdőlap emlékeztetőjének és az Adattárolás fülnek
// közösen. Az utolsó mentés időpontját a két gép a gyökérmappán át közösen látja.

import { useCallback, useEffect, useState } from 'react';
import type { BiztonsagiMentes } from '../storage/StorageContext';
import type { MentesAllapot } from '../storage/taroloIpc';

export interface BiztonsagiMentesAllapot {
  /** `undefined`, amíg az első lekérdezés tart. */
  allapot: MentesAllapot | undefined;
  folyamatban: boolean;
  hiba: string | null;
  /** Az ebben a nézetben utoljára elmentett fájl neve. */
  mentettNev: string | null;
  ment: () => Promise<void>;
}

export function useBiztonsagiMentes(mentes: BiztonsagiMentes): BiztonsagiMentesAllapot {
  const [allapot, setAllapot] = useState<MentesAllapot | undefined>(undefined);
  const [folyamatban, setFolyamatban] = useState(false);
  const [hiba, setHiba] = useState<string | null>(null);
  const [mentettNev, setMentettNev] = useState<string | null>(null);

  useEffect(() => {
    let megszakitva = false;
    mentes.allapot().then(
      (a) => !megszakitva && setAllapot(a),
      (err: unknown) => !megszakitva && setHiba(err instanceof Error ? err.message : String(err)),
    );
    return () => {
      megszakitva = true;
    };
  }, [mentes]);

  const ment = useCallback(async () => {
    setFolyamatban(true);
    setHiba(null);
    try {
      const nev = await mentes.keszit();
      if (nev) {
        setMentettNev(nev);
        setAllapot(await mentes.allapot());
      }
    } catch (err) {
      setHiba(err instanceof Error ? err.message : String(err));
    } finally {
      setFolyamatban(false);
    }
  }, [mentes]);

  return { allapot, folyamatban, hiba, mentettNev, ment };
}
