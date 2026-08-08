// Közös teszt-wrapper a lapszintű teszteknek (SettingsPage.test.tsx,
// PatientPage.test.tsx stb.), amik NEM az <App/>-on keresztül renderelnek --
// a Radix portál-komponensek (Select, AlertDialog stb.) a portál tartalmát
// egy belső <Theme> újrainjektálással csomagolják, ami hiba nélkül csak
// akkor működik, ha VAN ambiens Theme kontextus a fán (lásd App.tsx).

import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { AppStateProvider } from './state/AppState';
import { StorageProvider } from './storage/StorageContext';

export function TestProviders({ children }: { children: ReactNode }) {
  return (
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter>
        <StorageProvider>
          <AppStateProvider>{children}</AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>
  );
}
