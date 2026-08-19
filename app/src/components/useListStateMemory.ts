// Lista keresőszövegének és scroll-pozíciójának megőrzése route-váltás
// után-vissza (D43, docs/03-funkcionalis-spec.md § 9. Páciensek) --
// KIZÁRÓLAG böngésző-"vissza" (POP) navigációnál áll vissza; a NavBar
// linkjéről vagy más PUSH-ról érkező belépés mindig tiszta listát ad. Modul-
// szintű `Map`-ben tartja az állapotot, NEM böngészőtárban -- a
// keresőszöveg páciensnév-töredék lehet, ezt a munkamenetre (a lap
// bezárásáig) szűkíti, F5 után nem marad meg.

import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigationType } from 'react-router-dom';

interface ListaAllapot {
  q: string;
  scrollY: number;
}

const memoria = new Map<string, ListaAllapot>();

/**
 * Csak teszteknek: az egyetlen modul-szintű mutábilis állapot ebben a
 * kódbázisban -- éles használatban egy valódi böngésző-újratöltés
 * (a modul újratöltődik) magától kiüríti, de a vitest-készletben egy
 * MemoryRouter kezdeti navigációja is `POP`-nak számít (react-router
 * `createMemoryHistory` forrása), tehát tesztfájlon belüli `it()`-ek
 * enélkül tévesen öröklik egymás keresőszövegét/scroll-pozícióját.
 */
export function resetListStateMemoryForTests(): void {
  memoria.clear();
}

/**
 * `ready`: a lista tartalma már renderel-e (a betöltés kész) -- a scroll
 * csak ekkor állítható vissza megbízhatóan, amíg a lap még a skeletonnal
 * alacsony, a célpozíció esetleg túlnyúlna a görgethető tartományon.
 *
 * StrictMode dev-only mellékhatás: a duplán futó mount-effekt miatt
 * fejlesztői módban a scroll-visszaállítás néha kimarad -- ez a React
 * StrictMode ismert, éles buildben nem jelentkező sajátossága, nem hiba
 * ebben a hookban.
 */
export function useListStateMemory(key: string, ready: boolean) {
  const isPop = useNavigationType() === 'POP';
  const [q, setQState] = useState(() => (isPop ? (memoria.get(key)?.q ?? '') : ''));

  const scrollYRef = useRef(isPop ? (memoria.get(key)?.scrollY ?? 0) : 0);
  const restoredRef = useRef(false);

  useLayoutEffect(() => {
    if (!isPop || !ready || restoredRef.current) return;
    restoredRef.current = true;
    window.scrollTo(0, scrollYRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPop, ready]);

  useLayoutEffect(() => {
    function onScroll() {
      scrollYRef.current = window.scrollY;
      memoria.set(key, { q, scrollY: scrollYRef.current });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [key, q]);

  function setQ(next: string) {
    setQState(next);
    memoria.set(key, { q: next, scrollY: scrollYRef.current });
  }

  return { q, setQ };
}
