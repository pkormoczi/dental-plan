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

function renderSettings() {
  return render(
    <TestProviders>
      <SettingsPage />
    </TestProviders>,
  );
}

// D46: a NavBar-t IS rendereli, ugyanabban a router-fában -- a valós
// bekötés (`useNavGuard(templatesDirty)` a SettingsPage-ben, a NavBar
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

describe('SettingsPage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows "Mentve ✓" after a successful save', async () => {
    const user = userEvent.setup();
    renderSettings();

    await screen.findByText('Beállítások');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
  });

  // P0-8: korábban a "Mentve ✓" a tényleges mentési eredménytől függetlenül
  // jelent meg (`void saveSettings(...)`, nem várt be semmit).
  it('does NOT show "Mentve ✓" when the save fails, and shows the error instead', async () => {
    const user = userEvent.setup();
    renderSettings();

    // A kezdeti seed-írás (StorageProvider init) legyen kész, MIELŐTT a
    // localStorage.setItem-et hibázóra állítjuk.
    await screen.findByText('Beállítások');

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

  // D31: a `patch()` a friss `prev`-re merge-el (AppState.tsx `saveSettings`
  // updater-szerződése) -- két rendelő-mező gyors, ugyanabban a tickben
  // történő szerkesztése korábban a render-idejű `settings` closure-ből
  // épített `{ ...settings, ...fields }` miatt kiütötte volna egymást
  // (ugyanaz a mintázat, mint a fenti dupla-kattintásos teszt, csak itt két
  // KÜLÖNBÖZŐ mezőn, `await` nélkül a két `fireEvent.change` között).
  it('két rendelő-mező gyors, egymást követő szerkesztése (egy tickben) mindkettőt megőrzi', async () => {
    renderSettings();
    await screen.findByText('Beállítások');

    fireEvent.change(screen.getByLabelText('Név'), {
      target: { value: 'Dr. Mándoki Fogászat Kft.' },
    });
    fireEvent.change(screen.getByLabelText('Telefon'), { target: { value: '+36 1 234 5678' } });

    await waitFor(() => {
      const s = JSON.parse(localStorage.getItem('dp:beallitasok.json') as string) as {
        rendelo: { nev: string; telefon: string };
      };
      expect(s.rendelo.nev).toBe('Dr. Mándoki Fogászat Kft.');
      expect(s.rendelo.telefon).toBe('+36 1 234 5678');
    });
  });

  it('a rendelő-mezőkbe gyors gépeléskor nem esik ki karakter (D31: optimista, szinkron állapotfrissítés)', async () => {
    const user = userEvent.setup();
    renderSettings();
    await screen.findByText('Beállítások');

    const nev = screen.getByLabelText('Név');
    await user.clear(nev);
    await user.type(nev, 'Mándoki Dental Kft.');

    expect(nev).toHaveValue('Mándoki Dental Kft.');
  });

  describe('Nyomtatvány szövegei', () => {
    it('shows the real seed text (without the "# " heading) in both boxes', async () => {
      renderSettings();

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozat.value.startsWith('#')).toBe(false);
      expect(nyilatkozat.value).toContain('Megrendelő megrendeli a KEZELÉSI TERV szerinti');

      const fizetesiFeltetelek = screen.getByLabelText('Fizetési feltételek') as HTMLTextAreaElement;
      expect(fizetesiFeltetelek.value.startsWith('#')).toBe(false);
      expect(fizetesiFeltetelek.value).toContain('Megrendelő a kezelési tervben szereplő');

      expect(screen.getByText('nyilatkozat-hu-v1.md')).toBeInTheDocument();
    });

    // A seed nemetEngedelyezve:true (mockup-alapérték), tehát a kártya saját
    // nyelvváltója is megjelenik -- a Deutsch chip váltás a német (AI-fordítású)
    // szöveget mutatja, a nem mentett HU piszkozat pedig visszaváltáskor megmarad.
    it('switching the card language to Deutsch shows the DE seed text, HU draft survives switching back', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' HU piszkozat.');

      const card = screen.getByText('Nyomtatvány szövegei').closest('.rt-Card') as HTMLElement;
      await user.click(within(card).getByRole('radio', { name: 'Deutsch' }));

      const deNyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(deNyilatkozat.value).toContain('Der Auftraggeber bestellt die im BEHANDLUNGSPLAN');

      await user.click(within(card).getByRole('radio', { name: 'Magyar' }));
      const huAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(huAgain.value).toContain('HU piszkozat.');
    });

    it('saving an edited template creates a new -v2 file and updates the shown filename', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
      expect(screen.getByText('nyilatkozat-hu-v2.md')).toBeInTheDocument();

      const stored = localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md');
      expect(stored).toContain('Kiegészítés.');
      // A v1 változatlan marad (D4 -- korábbi tervek erre hivatkozhatnak).
      const v1 = localStorage.getItem('dp:sablonok/nyilatkozat-hu-v1.md');
      expect(v1).not.toContain('Kiegészítés.');
    });

    // Garancia szakasz a nyomtatványon (docs/04-nyomtatvany-spec.md § „3.
    // oldal — garancia"): harmadik sablon-szlot, ugyanazon a mechanizmuson --
    // a mező alapból a placeholder szöveget mutatja (a nyilatkozattal/
    // fizetési feltételekkel ellentétben, azoknak már van valódi tartalma).
    it('backlog-13: a Garancia mező alapból a placeholder szöveget mutatja, szerkesztése új -v2 fájlt hoz létre', async () => {
      const user = userEvent.setup();
      renderSettings();

      const garancia = (await screen.findByLabelText('Garancia')) as HTMLTextAreaElement;
      expect(garancia.value).toContain('[PLACEHOLDER');

      await user.type(garancia, ' Kiegészítés.');
      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(await screen.findByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument();
      expect(screen.getByText('garancia-hu-v2.md')).toBeInTheDocument();

      const stored = localStorage.getItem('dp:sablonok/garancia-hu-v2.md');
      expect(stored).toContain('Kiegészítés.');
      // A v1 (a placeholder) változatlan marad (D4).
      const v1 = localStorage.getItem('dp:sablonok/garancia-hu-v1.md');
      expect(v1).toContain('[PLACEHOLDER');
      expect(v1).not.toContain('Kiegészítés.');
    });

    it('does NOT show "Mentve ✓" when saving a template fails, and shows the error instead', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const originalSetItem = localStorage.setItem.bind(localStorage);
      vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
        if (key === 'dp:sablonok/nyilatkozat-hu-v2.md') throw new DOMException('QuotaExceededError');
        originalSetItem(key, value);
      });

      await user.click(screen.getByRole('button', { name: 'Szöveg mentése' }));

      expect(screen.queryByRole('button', { name: 'Mentve ✓' })).not.toBeInTheDocument();
      expect(await screen.findByText(/A szöveg mentése nem sikerült/)).toBeInTheDocument();

      vi.restoreAllMocks();
    });

    // docs/03-funkcionalis-spec.md § 7. Beállítások: a sablonszerkesztő
    // piszkozata a `dp:sablon-piszkozat` localStorage-kulcson él, néma
    // visszaállítással -- ugyanaz a hibaosztály, amit a § Autosave a
    // tervszerkesztőre már megoldott.
    it('a piszkozat túléli az elnavigálást (unmount + újrarender) mentés nélkül', async () => {
      const user = userEvent.setup();
      const { unmount } = renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');
      await waitFor(() =>
        expect(localStorage.getItem('dp:sablon-piszkozat')).toContain('Elmentetlen piszkozat.'),
      );

      unmount();
      renderSettings();

      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).toContain('Elmentetlen piszkozat.');
      expect(screen.getByText('Nem mentett módosítás')).toBeInTheDocument();
    });

    // docs/03-funkcionalis-spec.md § 7. Beállítások: ugyanaz a
    // `useRef`-alapú in-flight zár, mint a `PreviewPage.tsx` `savingRef`-je --
    // a `disabled` prop önmagában megkerülhető egy render előtti második
    // kattintással (`fireEvent.click` szinkron, `await` nélkül a kettő közt).
    it('dupla kattintás a "Szöveg mentése" gombon csak egy új verziófájlt hoz létre', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Kiegészítés.');

      const saveBtn = screen.getByRole('button', { name: 'Szöveg mentése' });
      fireEvent.click(saveBtn);
      fireEvent.click(saveBtn);

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Mentve ✓' })).toBeInTheDocument(),
      );

      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v2.md')).not.toBeNull();
      expect(localStorage.getItem('dp:sablonok/nyilatkozat-hu-v3.md')).toBeNull();
    });

    // D38: a szekció eddig egyedüliként nem kapott Mégse gombot,
    // holott a Save/Cancel-mintát máshol (PatientEditorPanel) már követte.
    it('a "Mégse" gomb tiltott, amíg nincs piszkozat-eltérés', async () => {
      renderSettings();
      await screen.findByLabelText('Nyilatkozat');

      expect(screen.getByRole('button', { name: 'Mégse' })).toBeDisabled();
    });

    // A Mégse minden nyelv/szlot piszkozatát elveti -- ezért (a
    // PatientEditorPanel azonnali Mégse-jétől eltérően) megerősítést kér,
    // és a `dp:sablon-piszkozat` cache-t is törli, különben egy F5 után a
    // piszkozat visszatérne.
    it('"Mégse" megerősítés után visszaállítja a mentett szöveget, és törli a piszkozat-cache-t (túléli az F5-öt is)', async () => {
      const user = userEvent.setup();
      const { unmount } = renderSettings();

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
      const nyilatkozatAgain = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      expect(nyilatkozatAgain.value).not.toContain('Elmentetlen piszkozat.');
    });

    it('"Mégse" a dialóguson belüli "Mégse"-re (elvetve az elvetést) megtartja a piszkozatot', async () => {
      const user = userEvent.setup();
      renderSettings();

      const nyilatkozat = (await screen.findByLabelText('Nyilatkozat')) as HTMLTextAreaElement;
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');

      await user.click(screen.getByRole('button', { name: 'Mégse' }));
      const dialog = await screen.findByRole('alertdialog');
      await user.click(within(dialog).getByRole('button', { name: 'Mégse' }));

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(nyilatkozat.value).toContain('Elmentetlen piszkozat.');
    });

    // D46: korábban (D38 eredeti hatóköre) csak a "Mégse" gomb volt védve --
    // a NavBar-ról elnavigálva a sablon-piszkozat némán elveszett.
    it('mentetlen sablon-piszkozattal a NavBar-kattintás is megerősítést kér -- Mégse a lapon tart', async () => {
      const user = userEvent.setup();
      renderSettingsWithNavBar();

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

      const nyilatkozat = await screen.findByLabelText('Nyilatkozat');
      await user.type(nyilatkozat, ' Elmentetlen piszkozat.');

      await user.click(screen.getByRole('link', { name: 'Kezdőlap' }));
      await user.click(await screen.findByRole('button', { name: 'Váltás, módosítás elvetésével' }));

      expect(await screen.findByText('Kezdőlap-próba')).toBeInTheDocument();
    });
  });
});
