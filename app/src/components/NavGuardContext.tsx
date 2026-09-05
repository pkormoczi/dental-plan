// Megosztott "van-e éppen nem mentett piszkozat" jelző -- a Mentés/Mégse
// dirty-őr (`useDirtyDraft`/`useDiscardGuard`/`DiscardChangesDialog`)
// hatóköre eredetileg csak a
// lapon belüli elem-váltásra (sor-/tab-váltás) és a Mégse gombra terjedt
// ki; ez a Context a NavBar-kattintásra is kiterjeszti, a MEGLÉVŐ
// `useDiscardGuard`-ot újrahasznosítva, nem egy második megerősítő-
// mechanizmust bevezetve.
//
// Egyetlen boolean, nem kulcsolt regisztry: ebben az egy-útvonalas SPA-ban
// (HashRouter, egyszerre egy route renderel) egyszerre KIZÁRÓLAG egy
// Mentés/Mégse-őrrel védett felület lehet mountolva -- ha ez az invariáns
// valaha megdől (pl.
// egy jövőbeli modális szerkesztő egy lap MELLETT mountolva), ezt a
// designt újra kell gondolni.
//
// A `storage/StorageContext.tsx` mintáját követi: `createContext<T | null>`,
// a `useX()` accessor Provider nélkül dob, nincs csendes alapérték.

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface NavGuardContextValue {
  dirty: boolean;
  setDirty: (dirty: boolean) => void;
}

const NavGuardContext = createContext<NavGuardContextValue | null>(null);

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const [dirty, setDirty] = useState(false);
  const value = useMemo<NavGuardContextValue>(() => ({ dirty, setDirty }), [dirty]);
  return <NavGuardContext.Provider value={value}>{children}</NavGuardContext.Provider>;
}

function useNavGuardContext(): NavGuardContextValue {
  const ctx = useContext(NavGuardContext);
  if (!ctx) throw new Error('useNavGuard/useNavGuardState csak a NavGuardProvider-en belül használható.');
  return ctx;
}

/**
 * Egy Mentés/Mégse-őrrel védett felület hívja, a SAJÁT dirty state-jével -- a
 * `PatientDetailPage.tsx`/`SettingsPage.tsx` a már meglévő
 * `dirtyAdatai`/`templatesDirty` state-jét adja át, nincs plusz prop-fűzés.
 * Unmountkor `false`-ra állít vissza, hogy egy nem NavBar-on át történő
 * elhagyás (pl. tab-váltás, sikeres mentés) után ne ragadjon be `true`.
 */
export function useNavGuard(dirty: boolean): void {
  const { setDirty } = useNavGuardContext();
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);
}

/** A NavBar olvassa ezt a kattintás-elfogás eldöntéséhez. */
export function useNavGuardState(): { dirty: boolean } {
  const { dirty } = useNavGuardContext();
  return { dirty };
}
