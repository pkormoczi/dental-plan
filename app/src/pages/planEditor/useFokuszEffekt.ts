// A `fokuszCel` (PlanEditorPage.tsx) render UTÁNI fókusz/scroll-effektje --
// kiemelve, hogy a PlanEditorPage.tsx böngészhető maradjon. A `fokuszCel`/
// `setFokuszCel` állapot maga a hívóban (PlanEditorPage.tsx) él -- ez a hook
// csak magát az effektust futtatja, ugyanabban a hívási pozícióban, mint
// korábban.

import { useEffect } from 'react';
import { csokkentettMozgas } from '../../design/motion';
import {
  fazisKeresoId,
  fazisMegjegyzesId,
  fazisNevId,
  fogId,
  keresoId,
  leirasId,
  nevId,
  type FokuszCel,
} from './elemIdk';

export function useFokuszEffekt(fokuszCel: FokuszCel, setFokuszCel: (cel: FokuszCel) => void) {
  useEffect(() => {
    if (!fokuszCel) return;
    // A `leiras`/`fazisMegjegyzes` cél összecsukott sávban lehet -- a
    // `LineRow`/`FazisMegjegyzes` a lentebb tovább-adott `fokuszCel` propon
    // keresztül kényszerítve nyitja magát, de a TextArea/TextField csak a
    // KÖVETKEZŐ commit után létezik. A tényleges fókuszt ezért
    // `requestAnimationFrame`-mel késleltetjük (a `PatientPlanChains.tsx`
    // `ugrasLegfrissebbre` mintája) -- a `fokuszCel`-t csak EZUTÁN nullázzuk,
    // hogy a gyerek addig lássa a kényszerítő propot.
    if (fokuszCel.mit === 'leiras' || fokuszCel.mit === 'fazisMegjegyzes') {
      const id =
        fokuszCel.mit === 'leiras'
          ? leirasId(fokuszCel.pi, fokuszCel.li)
          : fazisMegjegyzesId(fokuszCel.pi);
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ block: 'nearest', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
        (el as HTMLElement | null)?.focus();
        setFokuszCel(null);
      });
      return;
    }
    let id: string;
    if (fokuszCel.mit === 'fazisKereso') id = fazisKeresoId(fokuszCel.pi);
    else if (fokuszCel.mit === 'fazisNev') id = fazisNevId(fokuszCel.pi);
    else if (fokuszCel.mit === 'fogak') id = fogId(fokuszCel.pi, fokuszCel.li);
    else if (fokuszCel.mit === 'nev') id = nevId(fokuszCel.pi, fokuszCel.li);
    else id = keresoId(fokuszCel.pi, fokuszCel.li); // fokuszCel.mit === 'kereso'
    const el = document.getElementById(id);
    el?.scrollIntoView({ block: 'nearest', behavior: csokkentettMozgas() ? 'auto' : 'smooth' });
    (el as HTMLInputElement | null)?.focus();
    setFokuszCel(null);
    // A `setFokuszCel` a hívó `useState`-jéből jön -- stabil azonosságú,
    // de a hooknak paraméterként adva az oxlint exhaustive-deps szabálya
    // ezt már nem tudja levezetni, ezért explicit szerepel itt.
  }, [fokuszCel, setFokuszCel]);
}
