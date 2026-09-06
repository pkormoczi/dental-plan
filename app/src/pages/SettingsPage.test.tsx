import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './SettingsPage';
import NavBar from '../components/NavBar';
import { NavGuardProvider } from '../components/NavGuardContext';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';
import { TestProviders } from '../testUtils';
import { duplikaltIdk, mezokIdVagyNameNelkul } from '../testQueries';

function renderSettings() {
  return render(
    <TestProviders>
      <SettingsPage />
    </TestProviders>,
  );
}

// 87. tétel: a véglegesítés-őr "nyilatkozat-placeholder" checklist-tétele
// (`domain/veglegesitesOr.ts`) `/beallitasok?tab=nyomtatvanyok&nyelv=...`-ra
// navigál -- a query paraméterek kizárólag a KEZDETI mountot vezérlik.
function renderSettingsOnTemplatesTab(path = '/beallitasok?tab=nyomtatvanyok') {
  return render(
    <TestProviders initialEntries={[path]}>
      <SettingsPage />
    </TestProviders>,
  );
}

// A NavBar-t IS rendereli, ugyanabban a router-fában -- a valós
// bekötés (`useNavGuard(dirty)` a SettingsPage-ben, a NavBar
// kattintás-elfogása) csak így igazolható, nem a `renderSettings()` szűkebb
// harness-ével.
function renderSettingsWithNavBar() {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={['/beallitasok']}>
        <StorageProvider>
          <AppStateProvider>
            <NavGuardProvider>
              <NavBar />
              <Routes>
                <Route path="/beallitasok" element={<SettingsPage />} />
                <Route path="/" element={<div>Kezdőlap-próba</div>} />
              </Routes>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

// Radix Tabs jsdom-gotcha: a `Tabs.Trigger`
// jsdom alatt duplázott accessible name-et ad (a CSS-sel takart width-
// tartalék span miatt) -- minden tab-lekérdezés regexet kap.
async function goToTab(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(await screen.findByRole('tab', { name }));
}

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a Rendelő adatai tab aktív alapból', async () => {
    renderSettings();
    await screen.findByText('Beállítások');
    expect(screen.getByRole('tab', { name: /Rendelő adatai/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('?tab=nyomtatvanyok belépési ponton a Nyomtatványok tab aktív', async () => {
    renderSettingsOnTemplatesTab();
    await screen.findByText('Beállítások');
    expect(screen.getByRole('tab', { name: /Nyomtatványok/ })).toHaveAttribute('aria-selected', 'true');
  });

  // 5. megállapítás (doctor-review): a checklist route-ja a hívó terv
  // nyelvét a `nyelv` query paraméterben viszi -- a tab ezt olvassa
  // kezdőértéknek, hogy a doki ne kattintson még egyet a Deutsch chipre.
  describe('?tab=nyomtatvanyok&nyelv=... nyelv-előválasztás', () => {
    it('nyelv=de esetén a Deutsch chip aktív és a német seed-szöveg látszik', async () => {
      renderSettingsOnTemplatesTab('/beallitasok?tab=nyomtatvanyok&nyelv=de');
      await screen.findByText('Beállítások');

      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByRole('radio', { name: 'Deutsch' })).toHaveAttribute('aria-checked', 'true');
      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozat.value).toContain('Der Auftraggeber bestellt die im BEHANDLUNGSPLAN');
    });

    it('nyelv=hu esetén a Magyar chip aktív', async () => {
      renderSettingsOnTemplatesTab('/beallitasok?tab=nyomtatvanyok&nyelv=hu');
      await screen.findByText('Beállítások');

      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByRole('radio', { name: 'Magyar' })).toHaveAttribute('aria-checked', 'true');
    });

    it('nyelv paraméter nélkül Magyar chip aktív', async () => {
      renderSettingsOnTemplatesTab('/beallitasok?tab=nyomtatvanyok');
      await screen.findByText('Beállítások');

      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByRole('radio', { name: 'Magyar' })).toHaveAttribute('aria-checked', 'true');
    });

    it('érvénytelen nyelv értékre Magyar chip aktív', async () => {
      renderSettingsOnTemplatesTab('/beallitasok?tab=nyomtatvanyok&nyelv=xx');
      await screen.findByText('Beállítások');

      const panel = screen.getByRole('tabpanel');
      expect(within(panel).getByRole('radio', { name: 'Magyar' })).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Rendelő adatai', () => {
    it('shows "Mentve ✓" after a successful save', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      const nev = screen.getByLabelText('Név');
      await user.clear(nev);
      await user.type(nev, 'Dr. Mándoki Fogászat Kft.');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
    });

    // P0-8: korábban a "Mentve ✓" a tényleges mentési eredménytől függetlenül
    // jelent meg (`void saveSettings(...)`, nem várt be semmit).
    it('does NOT show "Mentve ✓" when the save fails, and shows the error instead', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      const nev = screen.getByLabelText('Név');
      await user.clear(nev);
      await user.type(nev, 'Dr. Mándoki Fogászat Kft.');

      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'dp:beallitasok.json') throw new DOMException('QuotaExceededError');
        originalSetItem(key, value);
      });

      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      expect(screen.queryByRole('button', { name: 'Mentve ✓' })).not.toBeInTheDocument();
      expect(await screen.findByText(/A mentés nem sikerült/)).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    // A tabosítás óta a rendelő-mezők pufferelt draftba írnak, egy
    // közös Mentés commitolja őket -- a race, amit ez a teszt EREDETILEG
    // egy render-idejű `{ ...settings, ... }` closure ellen védett,
    // egy `setDraft`-alapú pufferelt draft mellett szerkezetileg kizárt
    // (a functional setState mindig a legfrissebb draftra épít). A teszt
    // most azt ellenőrzi, hogy egy Mentés mindkét, egy tickben szerkesztett
    // mezőt megőrzi.
    it('két rendelő-mező gyors, egymást követő szerkesztése (egy tickben) mindkettőt megőrzi Mentéskor', async () => {
      renderSettings();
      await screen.findByText('Beállítások');

      fireEvent.change(screen.getByLabelText('Név'), {
        target: { value: 'Dr. Mándoki Fogászat Kft.' },
      });
      fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+36 1 234 5678' } });
      fireEvent.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          rendelo: { nev: string; telefon: string };
        };
        expect(s.rendelo.nev).toBe('Dr. Mándoki Fogászat Kft.');
        expect(s.rendelo.telefon).toBe('+36 1 234 5678');
      });
    });

    it('a rendelő-mezőkbe gyors gépeléskor nem esik ki karakter', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      const nev = screen.getByLabelText('Név');
      await user.clear(nev);
      await user.type(nev, 'Mándoki Dental Kft.');

      expect(nev).toHaveValue('Mándoki Dental Kft.');
    });
  });

  // Az "Orvosok" szekció soronkénti listája (korábban egyetlen
  // textarea) -- a seed egyetlen orvosa 'Dr. Mándoki István'.
  describe('Orvosok', () => {
    it('a seed orvosa megjelenik a listában, aktívan', async () => {
      renderSettings();
      await screen.findByText('Beállítások');

      expect(screen.getByRole('textbox', { name: '1. orvos neve' })).toHaveValue('Dr. Mándoki István');
      expect(screen.getByRole('checkbox', { name: 'Dr. Mándoki István aktív' })).toBeChecked();
    });

    it('"+ Orvos hozzáadása" új üres sort ad, ami mentéskor némán kimarad', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      expect(screen.getByRole('textbox', { name: '2. orvos neve' })).toHaveValue('');

      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          orvosok: string[];
        };
        expect(s.orvosok).toEqual(['Dr. Mándoki István']);
      });
    });

    it('egy második orvos felvétele és mentése perzisztálja mindkét nevet', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Új Orsolya');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          orvosok: string[];
        };
        expect(s.orvosok).toEqual(['Dr. Mándoki István', 'Dr. Új Orsolya']);
      });
    });

    // "Nincs másik aktív" ág: az egyetlen orvos deaktiválása a
    // dialógus megnyitása NÉLKÜL engedett, figyelmeztetéssel; a Mentés
    // lefut, az alapertelmezettOrvos kulcs nélkül.
    it('az egyetlen orvos deaktiválása figyelmeztet, de a Mentés lefut, alapertelmezettOrvos nélkül', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      await user.click(screen.getByRole('checkbox', { name: 'Dr. Mándoki István aktív' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(await screen.findByText(/Nincs aktív kezelőorvos/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          orvosok: string[];
          inaktivOrvosok?: string[];
          alapertelmezettOrvos?: string;
        };
        expect(s.orvosok).toEqual(['Dr. Mándoki István']);
        expect(s.inaktivOrvosok).toEqual(['Dr. Mándoki István']);
        expect(s.alapertelmezettOrvos).toBeUndefined();
      });
    });

    // "Van másik aktív" ág: a jelenlegi default deaktiválása modális
    // választót nyit; Mégse visszavonja magát a deaktiválást is.
    it('a default deaktiválása másik aktív orvos mellett modális választót nyit, Mégse visszavonja', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Új Orsolya');

      await user.click(screen.getByRole('checkbox', { name: 'Dr. Mándoki István aktív' }));

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText('Ki legyen az alapértelmezett orvos?')).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Dr. Mándoki István aktív' })).toBeChecked();
    });

    it('a modálisban választott orvos lesz az új alapértelmezett, mentéskor perzisztálva', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Új Orsolya');
      await user.click(screen.getByRole('checkbox', { name: 'Dr. Mándoki István aktív' }));
      const dialog = await screen.findByRole('dialog');

      // A default-lista első (és itt egyetlen) maradék aktív orvosa
      // ('Dr. Új Orsolya') előre kiválasztva jelenik meg a modális Selecten.
      await user.click(within(dialog).getByRole('button', { name: 'Beállítás' }));

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          inaktivOrvosok?: string[];
          alapertelmezettOrvos?: string;
        };
        expect(s.inaktivOrvosok).toEqual(['Dr. Mándoki István']);
        expect(s.alapertelmezettOrvos).toBe('Dr. Új Orsolya');
      });
    });

    it('duplikált orvosnév blokkolja a mentést, hibaszöveggel', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      const eredetiRaw = localStorage.getItem('dp:beallitasok.json');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Mándoki István');

      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      expect(await screen.findByText('Két orvos neve nem lehet azonos.')).toBeInTheDocument();
      // A blokkolt Mentés nem írt -- a seed-elve meglévő tartalom változatlan.
      expect(localStorage.getItem('dp:beallitasok.json')).toBe(eredetiRaw);
    });

    it('egy orvos törlése eltünteti a sort, mentéskor nem kerül vissza', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Új Orsolya');

      await user.click(screen.getByRole('button', { name: 'Dr. Új Orsolya törlése' }));
      expect(screen.queryByRole('textbox', { name: '2. orvos neve' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mentés' }));

      await waitFor(() => {
        const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
          orvosok: string[];
        };
        expect(s.orvosok).toEqual(['Dr. Mándoki István']);
      });
    });

    it('Mégse visszaállítja az orvos-listát a mentett állapotra', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));
      await user.type(screen.getByRole('textbox', { name: '2. orvos neve' }), 'Dr. Ideiglenes');

      await user.click(screen.getByRole('button', { name: 'Mégse' }));

      expect(screen.queryByRole('textbox', { name: '2. orvos neve' })).not.toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '1. orvos neve' })).toHaveValue('Dr. Mándoki István');
    });

    it('urlap-mezo-id-name: a rendelő-mezőknek és az orvos-soroknak van id-jük, nincs köztük duplikált', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');
      await user.click(screen.getByRole('button', { name: '+ Orvos hozzáadása' }));

      expect(mezokIdVagyNameNelkul()).toEqual([]);
      expect(duplikaltIdk()).toEqual([]);
    });
  });

  describe('Tab-váltás nem mentett módosítással', () => {
    it('dirty Rendelő adatai piszkozattal tab-váltás megerősítést kér -- a dialógus Mégse-je a lapon tart, a piszkozat megmarad', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      const nev = screen.getByLabelText('Név');
      await user.clear(nev);
      await user.type(nev, 'Dr. Mándoki Fogászat Kft.');

      await goToTab(user, /Nyomtatványok/);
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Rendelő adatai/ })).toHaveAttribute('aria-selected', 'true');
      expect(screen.getByLabelText('Név')).toHaveValue('Dr. Mándoki Fogászat Kft.');
    });

    it('dirty Rendelő adatai piszkozattal "Váltás, módosítás elvetésével" tényleg vált, és a piszkozat elvész', async () => {
      const user = userEvent.setup();
      renderSettings();
      await screen.findByText('Beállítások');

      const originalNev = (screen.getByLabelText('Név') as HTMLInputElement).value;
      const nev = screen.getByLabelText('Név');
      await user.clear(nev);
      await user.type(nev, 'Dr. Mándoki Fogászat Kft.');

      await goToTab(user, /Nyomtatványok/);
      await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

      expect(screen.getByRole('tab', { name: /Nyomtatványok/ })).toHaveAttribute('aria-selected', 'true');

      await goToTab(user, /Rendelő adatai/);
      expect(screen.getByLabelText('Név')).toHaveValue(originalNev);
    });

    it('a Nyomtatványok tab elvetéses tab-váltása törli a sablon-piszkozat cache-t is (nem téríti vissza egy F5)', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');
      await waitFor(() =>
        expect(localStorage.getItem('dp:sablon-piszkozat')).toContain('Elmentetlen piszkozat.'),
      );

      await goToTab(user, /Rendelő adatai/);
      await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

      // A shell teljesen törli a cache-kulcsot (nem csak a dirty base-eket),
      // lásd `clearAllTemplateDraftCache` (NyomtatvanyokTab.tsx).
      expect(localStorage.getItem('dp:sablon-piszkozat')).toBeNull();

      await goToTab(user, /Nyomtatványok/);
      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).not.toContain('Elmentetlen piszkozat.');
    });
  });

  describe('Egyéb', () => {
    // 52. tétel: a `nemetEngedelyezve` funkciókapcsoló megszűnt -- a német
    // tartalom készültsége blokk és az alapértelmezett nyelv váltó feltétel
    // nélkül, gate/checkbox nélkül látszik.
    it('a "német tartalom készültsége" blokk feltétel nélkül látszik, nincs engedélyező checkbox', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Egyéb/);

      expect(await screen.findByText('A német tartalom készültsége')).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: 'Német nyelvű ajánlat engedélyezése' }),
      ).not.toBeInTheDocument();
    });

    it('az alapértelmezett pénznem EUR-ra váltása és mentése perzisztálja az értéket, a Mégse visszaállítja HUF-ra', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Egyéb/);

      const panel = screen.getByRole('tabpanel');
      await user.click(within(panel).getByRole('radio', { name: 'EUR — euró' }));
      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();

      const stored = JSON.parse(localStorage.getItem('dp:beallitasok.json') ?? '{}');
      expect(stored.alapertelmezettPenznem).toBe('EUR');

      await user.click(within(panel).getByRole('radio', { name: 'HUF — forint' }));
      expect(within(panel).getByRole('radio', { name: 'HUF — forint' })).toHaveAttribute('aria-checked', 'true');
      await user.click(screen.getByRole('button', { name: 'Mégse' }));
      expect(within(panel).getByRole('radio', { name: 'EUR — euró' })).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('Nyomtatványok', () => {
    it('shows the real seed text (without the "# " heading) in both boxes', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozat.value.startsWith('#')).toBe(false);
      expect(nyilatkozat.value).toContain('Megrendelő megrendeli a KEZELÉSI TERV szerinti');

      const fizetesiFeltetelek = screen.getByLabelText('Fizetési feltételek') as HTMLTextAreaElement;
      expect(fizetesiFeltetelek.value.startsWith('#')).toBe(false);
      expect(fizetesiFeltetelek.value).toContain('Megrendelő a kezelési tervben szereplő');

      expect(screen.getByText('nyilatkozat-hu-v1.md')).toBeInTheDocument();
    });

    // 52. tétel: a tab nyelvváltója feltétel nélkül megjelenik -- a Deutsch
    // chip váltás a német (AI-fordítású) szöveget mutatja, a nem mentett HU
    // piszkozat pedig visszaváltáskor megmarad.
    it('switching the tab language to Deutsch shows the DE seed text, HU draft survives switching back', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' HU piszkozat.');

      const panel = screen.getByRole('tabpanel');
      await user.click(within(panel).getByRole('radio', { name: 'Deutsch' }));

      const deNyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(deNyilatkozat.value).toContain('Der Auftraggeber bestellt die im BEHANDLUNGSPLAN');

      await user.click(within(panel).getByRole('radio', { name: 'Magyar' }));
      const huAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(huAgain.value).toContain('HU piszkozat.');
    });

    it('saving an edited template overwrites the current file, the shown filename stays the same', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
      expect(screen.getByText('nyilatkozat-hu-v1.md')).toBeInTheDocument();

      const stored = localStorage.getItem('dp:sablonok/nyilatkozat-hu-v1.md');
      expect(stored).toContain('Kiegészítés.');
      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md')).toBeNull();
    });

    // Garancia szakasz a nyomtatványon (placeholder-jelölt szövege címestől kimarad,
    // lásd app/src/pdf/CLAUDE.md): harmadik
    // sablon-szlot, ugyanazon a mechanizmuson --
    // a mező alapból a placeholder szöveget mutatja (a nyilatkozattal/
    // fizetési feltételekkel ellentétben, azoknak már van valódi tartalma).
    it('a Garancia mező alapból a placeholder szöveget mutatja, szerkesztése felülírja ugyanazt a fájlt', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const garancia = (await screen.findByLabelText('Garancia')) as HTMLTextAreaElement;
      expect(garancia.value).toContain('[PLACEHOLDER');

      await user.type(garancia, ' Kiegészítés.');
      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
      expect(screen.getByText('garancia-hu-v1.md')).toBeInTheDocument();

      const stored = localStorage.getItem('dp:sablonok/garancia-hu-v1.md');
      expect(stored).toContain('[PLACEHOLDER');
      expect(stored).toContain('Kiegészítés.');
      expect(localStorage.getItem('dp:sablonok/garancia-hu-v2.md')).toBeNull();
    });

    it('does NOT show "Mentve ✓" when saving a template fails, and shows the error instead', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'dp:sablonok/nyilatkozat-hu-v1.md') throw new DOMException('QuotaExceededError');
        originalSetItem(key, value);
      });

      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(screen.queryByRole('button', { name: 'Mentve ✓' })).not.toBeInTheDocument();
      expect(await screen.findByText(/A szöveg mentése nem sikerült/)).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    // A sablonszerkesztő
    // piszkozata a `dp:sablon-piszkozat` localStorage-kulcson él, néma
    // visszaállítással -- ugyanaz a hibaosztály, amit a terv-autosave a
    // tervszerkesztőre már megoldott.
    it('a piszkozat túléli az elnavigálást (unmount + újrarender) mentés nélkül', async () => {
      const user = userEvent.setup();
      const { unmount } = renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');
      await waitFor(() =>
        expect(localStorage.getItem('dp:sablon-piszkozat')).toContain('Elmentetlen piszkozat.'),
      );

      unmount();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).toContain('Elmentetlen piszkozat.');
      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
    });

    // Ugyanaz a
    // `useRef`-alapú in-flight zár, mint a `PreviewPage.tsx` `savingRef`-je --
    // a `disabled` prop önmagában megkerülhető egy render előtti második
    // kattintással (`fireEvent.click` szinkron, `await` nélkül a kettő közt).
    it('dupla kattintás a "Szöveg mentése" gombon nem hoz létre új verziófájlt', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const saveBtn = screen.getByRole('button', { name: 'Szöveg mentése' });
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument(),
      );

      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v1.md')).toContain('Kiegészítés.');
      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md')).toBeNull();
    });

    // A szekció eddig egyedüliként nem kapott Mégse gombot,
    // holott a Save/Cancel-mintát máshol (PatientEditorPanel) már követte.
    it('a "Mégse" gomb tiltott, amíg nincs piszkozat-eltérés', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);
      await screen.findByLabelText('Nyilatkozat');

      expect(screen.getByRole('button', { name: 'Mégse' })).toBeDisabled();
    });

    // A Mégse minden nyelv/szlot piszkozatát elveti -- ezért (a Rendelő
    // adatai/Egyéb tab azonnali Mégse-jétől eltérően) megerősítést kér, és
    // a `dp:sablon-piszkozat` cache-t is törli, különben egy F5 után a
    // piszkozat visszatérne.
    it('"Mégse" megerősítés után visszaállítja a mentett szöveget, és törli a piszkozat-cache-t (túléli az F5-öt is)', async () => {
      const user = userEvent.setup();
      const { unmount } = renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');
      await waitFor(() =>
        expect(localStorage.getItem('dp:sablon-piszkozat')).toContain('Elmentetlen piszkozat.'),
      );

      await user.click(screen.getByRole('button', { name: 'Mégse' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Elvetés' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(nyilatkozat.value).not.toContain('Elmentetlen piszkozat.');
      expect(localStorage.getItem('dp:sablon-piszkozat')).not.toContain('Elmentetlen piszkozat.');

      // unmount + újrarender (F5-szimuláció) -- a cache-törlés miatt a
      // piszkozat NEM tér vissza.
      unmount();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);
      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).not.toContain('Elmentetlen piszkozat.');
    });

    it('"Mégse" a dialóguson belüli "Mégse"-re (elvetve az elvetést) megtartja a piszkozatot', async () => {
      const user = userEvent.setup();
      renderSettings();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');

      await user.click(screen.getByRole('button', { name: 'Mégse' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(nyilatkozat.value).toContain('Elmentetlen piszkozat.');
    });

    // Korábban (a dirty-őr eredeti hatóköre) csak a "Mégse" gomb volt védve --
    // a NavBar-ról elnavigálva a sablon-piszkozat némán elveszett.
    it('mentetlen sablon-piszkozattal a NavBar-kattintás is megerősítést kér -- Mégse a lapon tart', async () => {
      const user = userEvent.setup();
      renderSettingsWithNavBar();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');

      await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Nem mentett módosítás')).toBeInTheDocument();
      expect(screen.queryByText('Kezdőlap-próba')).not.toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(nyilatkozat.value).toContain('Elmentetlen piszkozat.');
    });

    it('mentetlen sablon-piszkozattal a NavBar-kattintás megerősítés után ténylegesen navigál', async () => {
      const user = userEvent.setup();
      renderSettingsWithNavBar();
      await goToTab(user, /Nyomtatványok/);

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');

      await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
      await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

      expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
    });
  });
});
