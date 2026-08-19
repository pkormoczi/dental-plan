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

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter>
        <StorageProvider>
          <AppStateProvider>
            {/* D46: a D38-védett lapok (pl. SettingsPage sablon-szekciója)
                useNavGuard()-ot hívnak -- Provider nélkül dob. */}
            <NavGuardProvider>
              <TestLepesGuardProvider>{children}</TestLepesGuardProvider>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>
  );
}
