// Közös teszt-wrapper a lapszintű teszteknek (SettingsPage.test.tsx,
// PatientPage.test.tsx stb.), amik NEM az <App/>-on keresztül renderelnek --
// a Radix portál-komponensek (Select, AlertDialog stb.) a portál tartalmát
// egy belső <Theme> újrainjektálással csomagolják, ami hiba nélkül csak
// akkor működik, ha VAN ambiens Theme kontextus a fán (lásd App.tsx).

import { useMemo, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { LepesGuardProvider } from './components/LepesGuardContext';
import { NavGuardProvider } from './components/NavGuardContext';
import { NyelviReviewProvider } from './components/NyelviReviewContext';
import { PaciensKotesProvider } from './components/PaciensKotesContext';
import { AppStateProvider } from './state/AppState';
import { StorageProvider } from './storage/StorageContext';

/**
 * `PatientPage.tsx` (`useLepesGuard`) és a `TorzsadatSyncCard.tsx`
 * (`useLepesElhagyas`) csak a `TervWorkflowShell` alatt kap valódi
 * lépés-elhagyási ajánlatot (backlog-40) -- a lapszintű tesztek (amik nem a
 * teljes `<App/>`-on, hanem közvetlenül `PatientPage`-en keresztül
 * renderelnek) egy néma, mindig-azonnal-továbbengedő értéket kapnak, hogy a
 * Provider hiánya ne dobjon. A tényleges elfogás-logikát a
 * `TervWorkflowShell.test.tsx` teszteli, a valódi shell-lel.
 */
function TestLepesGuardProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({
      kerLepesValtas: (proceed: () => void) => proceed(),
      regisztralLepesHandler: () => {},
      elutasitottDiffId: null,
      setElutasitottDiffId: () => {},
    }),
    [],
  );
  return <LepesGuardProvider value={value}>{children}</LepesGuardProvider>;
}

export function TestProviders({
  children,
  initialEntries,
}: {
  children: ReactNode;
  /** A `MemoryRouter` induló útvonala(i) -- alapból `['/']`, csak akkor kell megadni, ha egy teszt query paramétert vagy konkrét path-t igényel. */
  initialEntries?: string[];
}) {
  return (
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={initialEntries}>
        <StorageProvider>
          <AppStateProvider>
            {/* D46: a D38-védett lapok (pl. SettingsPage sablon-szekciója)
                useNavGuard()-ot hívnak -- Provider nélkül dob. */}
            <NavGuardProvider>
              <TestLepesGuardProvider>
                {/* 65. tétel (D72): a `PlanEditorPage`/`PreviewPage`
                    `useNyelviReview()`-t hív -- Provider nélkül dob, a
                    `TervWorkflowShell` mintáján. */}
                <NyelviReviewProvider>
                  {/* 94. tétel: a `PatientPage`/`TorzsadatSyncCard`/
                      `PreviewPage` `usePaciensKotes()`-t hív -- Provider
                      nélkül dob. Ez a valódi, önmagát betöltő provider (nem
                      egy néma teszt-stub, mint a `TestLepesGuardProvider`),
                      mert a védőháló tesztelt viselkedése épp a betöltésétől
                      függ. */}
                  <PaciensKotesProvider>{children}</PaciensKotesProvider>
                </NyelviReviewProvider>
              </TestLepesGuardProvider>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>
  );
}
