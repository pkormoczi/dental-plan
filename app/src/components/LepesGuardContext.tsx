// Terv-workflow "lépés elhagyása" ajánlat -- backlog-40 (3. döntés,
// redesign D161). KÜLÖN mechanizmus a `NavGuardContext`-től (D46): az "van
// nem mentett módosítás -> elvetnéd?" boolean nem illik ide, a terv-draft
// autosave-el (D37) -- itt egy AJÁNLAT hangzik el (frissítenéd a
// törzsadatot, mielőtt továbblépsz?), nem egy adatvesztés elleni blokk.
//
// A hatókör szűk és szándékos: KIZÁRÓLAG a `/paciens` lépés ELŐRE
// (Kezelések/Előnézet felé) elhagyását fedi -- a NavBar-navigációt és a
// breadcrumb-ot a D38/D46 guard-ja már védi, ott egy MÁSODIK, ajánlat-
// jellegű prompt zavaró lenne.
//
// A `useBlocker` itt nem használható (a `HashRouter`, `App.tsx`, nem data
// router) -- a `NavBar.tsx` kattintás-elfogási mintáját követi:
// `e.preventDefault()` + a tényleges navigáció csak `proceed()` hívásakor
// történik meg.
//
// A state (a regisztrált handler ÉS KÉT lépés-elhagyási memória -- a
// diffenkénti elutasítás, plusz a törzsadat-hiány ág "már eldöntöttem ezen
// a piszkozaton" boolean-je) a `TervWorkflowShell`-ben él, nem itt és nem a
// `TorzsadatSyncCard`-ban -- a `PatientPage` (és vele a kártya) minden
// lépésváltáskor unmountol, a `TervWorkflowShell` viszont a workflow teljes
// életciklusán át mountolva marad (layout-route, D36). A `TorzsadatSyncCard`
// csak REGISZTRÁLJA a saját döntési logikáját (`useLepesElhagyas`), a
// `PatientPage` "Tovább" gombja pedig a `kerLepesValtas`-t hívja
// (`useLepesGuard`) -- mindkettő ezen a Contexten keresztül éri el a
// `TervWorkflowShell` állapotát.

import { createContext, useContext, useEffect } from 'react';

/** `true` = elfogta a navigációt (saját dialógust nyitott, `proceed`-et később ő hívja); `false` = engedje azonnal tovább. */
export type LepesHandler = (proceed: () => void) => boolean;

export interface LepesGuardValue {
  kerLepesValtas: (proceed: () => void) => void;
  regisztralLepesHandler: (handler: LepesHandler | null) => void;
  /** A legutóbb elutasított diff azonosítója (backlog-40, `domain/masterSnapshotDiff.ts` `diffAzonosito`) -- `null`, ha nincs ilyen. */
  elutasitottDiffId: string | null;
  setElutasitottDiffId: (id: string | null) => void;
  /** Igaz, ha a doki már döntött (kihagyta vagy létrehozta) a törzsadat-hiány ág "Törzsadat létrehozása" ajánlatáról ezen a piszkozaton -- ellentétben az `elutasitottDiffId`-vel nincs megkülönböztetendő tartalma, a törzsadat-hiány bináris állapot. */
  letrehozasPromptEldontve: boolean;
  setLetrehozasPromptEldontve: (v: boolean) => void;
}

const LepesGuardContext = createContext<LepesGuardValue | null>(null);

/** A `TervWorkflowShell` saját, felépített értékét adja tovább -- lásd a fájl fejlécét. */
export const LepesGuardProvider = LepesGuardContext.Provider;

function useLepesGuardContext(): LepesGuardValue {
  const ctx = useContext(LepesGuardContext);
  if (!ctx) {
    throw new Error(
      'useLepesGuard/useLepesElhagyas csak a TervWorkflowShell alatt (LepesGuardProvider-en belül) használható.',
    );
  }
  return ctx;
}

/** A `PatientPage.tsx` "Tovább" gombja hívja -- a stepper linkjei a `TervWorkflowShell` saját, lokális closure-jét hívják, nem ezt (lásd a fájl fejlécét). */
export function useLepesGuard(): {
  kerLepesValtas: (proceed: () => void) => void;
  elutasitottDiffId: string | null;
  setElutasitottDiffId: (id: string | null) => void;
  letrehozasPromptEldontve: boolean;
  setLetrehozasPromptEldontve: (v: boolean) => void;
} {
  const {
    kerLepesValtas,
    elutasitottDiffId,
    setElutasitottDiffId,
    letrehozasPromptEldontve,
    setLetrehozasPromptEldontve,
  } = useLepesGuardContext();
  return {
    kerLepesValtas,
    elutasitottDiffId,
    setElutasitottDiffId,
    letrehozasPromptEldontve,
    setLetrehozasPromptEldontve,
  };
}

/**
 * Egy `/paciens`-en mountolt felület (a `TorzsadatSyncCard`) regisztrálja a
 * saját döntési logikáját -- unmountkor automatikusan leiratkozik, hogy egy
 * korábbi lépés handlere ne ragadjon be, miután a kártya feloldatlan
 * `patientDir` miatt egyáltalán nem is renderelődik.
 */
export function useLepesElhagyas(handler: LepesHandler | null): void {
  const { regisztralLepesHandler } = useLepesGuardContext();
  useEffect(() => {
    regisztralLepesHandler(handler);
    return () => regisztralLepesHandler(null);
  }, [handler, regisztralLepesHandler]);
}
