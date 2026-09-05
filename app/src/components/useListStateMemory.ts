// Lista keresőszövegének, scroll-pozíciójának ÉS a lista sorain belüli
// összecsukható blokkok nyitottságának megőrzése route-váltás után-vissza
// (a nyitottság a 46. tétel bővítése) -- KIZÁRÓLAG böngésző-"vissza" (POP) navigációnál
// áll vissza; a NavBar linkjéről vagy más PUSH-ról érkező belépés mindig
// tiszta listát ad. Modul-szintű `Map`-ben tartja az állapotot, NEM
// böngészőtárban -- a keresőszöveg páciensnév-töredék lehet, ezt a
// munkamenetre (a lap bezárásáig) szűkíti, F5 után nem marad meg. Hívói:
// `PaciensekPage.tsx` (csak `q`/scroll) és `OsszesTervSection.tsx` (mindhárom
// mező -- a terv-lánc fa lánc-összecsukása).
//
// A `nyitottak` mező tartalma a hívó belügye -- a hook nem ismeri, mit
// jelöl az `id` (az OsszesTervSection-en `${patientDir}/${planDir}`).

import { useLayoutEffect, useRef, useState } from 'react';
import { useNavigationType } from 'react-router-dom';

interface ListaAllapot {
  q: string;
  scrollY: number;
  nyitottak: Record<string, boolean>;
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
  const [nyitottak, setNyitottakState] = useState<Record<string, boolean>>(() =>
    isPop ? (memoria.get(key)?.nyitottak ?? {}) : {},
  );

  // A `q`/`nyitottak` state MELLETT vezetett tükör -- a `ment()`-nek a
  // MENTÉS pillanatában kell a teljes, aktuális `ListaAllapot`-ot írnia
  // (a `saveSettings`/`savePriceList` updater-mintája): két külön író (`setQ`,
  // az `onScroll` listener, most már `setNyitott` is) mindegyike TELJES
  // rekordot ír a `memoria`-ba -- ha csak a saját closure-ükből olvasott
  // mezőt írnák, a másik kettő csendben visszaesne a mentéskori értékére.
  const qRef = useRef(q);
  qRef.current = q;
  const nyitottakRef = useRef(nyitottak);
  nyitottakRef.current = nyitottak;

  const scrollYRef = useRef(isPop ? (memoria.get(key)?.scrollY ?? 0) : 0);
  const restoredRef = useRef(false);

  function ment(patch: Partial<ListaAllapot>) {
    memoria.set(key, {
      q: qRef.current,
      scrollY: scrollYRef.current,
      nyitottak: nyitottakRef.current,
      ...patch,
    });
  }

  useLayoutEffect(() => {
    if (!isPop || !ready || restoredRef.current) return;
    restoredRef.current = true;
    window.scrollTo(0, scrollYRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPop, ready]);

  useLayoutEffect(() => {
    function onScroll() {
      scrollYRef.current = window.scrollY;
      ment({ scrollY: scrollYRef.current });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function setQ(next: string) {
    setQState(next);
    ment({ q: next });
  }

  function setNyitott(id: string, nyitva: boolean) {
    setNyitottakState((prev) => {
      const next = { ...prev, [id]: nyitva };
      ment({ nyitottak: next });
      return next;
    });
  }

  return { q, setQ, nyitottak, setNyitott };
}
