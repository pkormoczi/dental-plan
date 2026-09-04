// Megosztott "Mentve ✓" jelző-primitív -- korábban négyszer másolat-
// beillesztve (RendeloTab, EgyebTab, NyomtatvanyokTab, KategoriaPanel), a
// `useDirtyDraft`/`useAktivDraft` névmintájában. Mind a négy meglévő
// másolat ugyanazt a hibát hordozta: a `setTimeout` nem takarított
// unmountkor, pedig egy Radix tab-váltás az időzítőn belül unmountolhatja a
// komponenst (a `pages/demo/AdatkezelesSection.tsx` ref-ben tartott
// időzítő + cleanup effekt mintája a helyes megoldás).

import { useEffect, useRef, useState } from 'react';

export interface MentesJelzo {
  saving: boolean;
  saved: boolean;
  /** Gombfeliratos mód: `alap` → 'Mentés…' → 'Mentve ✓'. */
  felirat: (alap: string) => string;
  /**
   * Egy mentési műveletet futtat -- `saving` a lefutása alatt igaz. Sikeres
   * (nem dob és nem `false`-t ad) lefutás kigyújtja a jelzést és
   * újraindítja az órát; `false` vagy dobott hiba esetén a jelzés azonnal
   * (újra) elalszik. A dobott hiba TOVÁBB SZÁLL -- a hívó saját
   * hibakezelése (pl. `saveError` Callout) változatlan marad.
   */
  futtat: (muvelet: () => Promise<boolean | void>) => Promise<boolean>;
  /** Csupasz mód: a jelzés kigyújtása/óra-újraindítás a `saving` állítása nélkül. */
  jelez: () => void;
  /** A pozitív jelzés azonnali eloltása -- pl. egy máshonnan (nem `futtat`-on
   * át) érkező hibánál. */
  olts: () => void;
}

const ALAPERTELMEZETT_IDOZITES = 2000;

export function useMentesJelzo(idozites = ALAPERTELMEZETT_IDOZITES): MentesJelzo {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    [],
  );

  function jelez() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSaved(true);
    timeoutRef.current = setTimeout(() => setSaved(false), idozites);
  }

  function olts() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setSaved(false);
  }

  async function futtat(muvelet: () => Promise<boolean | void>): Promise<boolean> {
    setSaving(true);
    try {
      const eredmeny = await muvelet();
      if (eredmeny === false) {
        olts();
        return false;
      }
      jelez();
      return true;
    } catch (err) {
      olts();
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function felirat(alap: string): string {
    return saving ? 'Mentés…' : saved ? 'Mentve ✓' : alap;
  }

  return { saving, saved, felirat, futtat, jelez, olts };
}
