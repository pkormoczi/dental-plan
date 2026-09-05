// backlog-29: a DEMO oldal a korábban önálló Filerendszer nézetet és a
// Kezdőlapról levett Funkciólista/Változásnapló kártyát fogja össze -- a Kezdőlap
// letisztítása óta, onnan ide költözött két demó-adatkezelő gombbal
// (Adatkezelés fül) kiegészülve, majd a globális, több-pácienses
// terv-lánc/verzió fával ("Összes terv" fül). Ez a teszt a fül-váltást ÉS
// az öt fül URL-címezhetőségét (`/demo/:tab`) fedi -- az egyes
// tartalmak saját tesztjei (FileTreeSection.test.tsx,
// FeatureOverviewCard.test.tsx, OsszesTervSection.test.tsx) változatlanul
// felelősek a bennük lévő viselkedésért.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import DemoPage from './DemoPage';
import { NavGuardProvider } from '../components/NavGuardContext';
import { AppStateProvider } from '../state/AppState';
import { StorageProvider } from '../storage/StorageContext';

// A `useParams()`-alapú fülvezérlés csak akkor kap valódi `:tab`
// paramétert, ha a komponens ténylegesen egy paraméteres `<Route>` alatt
// renderel -- a `TestProviders` bare `MemoryRouter`-je (`Route` nélkül)
// ehhez nem elég, ezért itt saját, App.tsx-et tükröző route-táblát építünk.
function TesztVisszaGomb() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Vissza a teszthez</button>;
}

function renderDemoPage(initialEntries: string[] = ['/demo']) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={initialEntries}>
        <StorageProvider>
          <AppStateProvider>
            <NavGuardProvider>
              <TesztVisszaGomb />
              <Routes>
                <Route path="/elozo-oldal" element={<div>ELŐZŐ OLDAL</div>} />
                <Route path="/demo" element={<DemoPage />} />
                <Route path="/demo/:tab" element={<DemoPage />} />
              </Routes>
            </NavGuardProvider>
          </AppStateProvider>
        </StorageProvider>
      </MemoryRouter>
    </Theme>,
  );
}

// Radix Tabs.Trigger renders a második, csak CSS-sel (`visibility: hidden`)
// takart span-t a felirat mellé, hogy a kijelölt/nem kijelölt vastagság
// ne tördelje újra a sávot -- a vitest-készlet nem tölti be a Radix
// Themes CSS-t (jsdom-vakfolt, lásd app/src/CLAUDE.md), ezért az accessible name jsdom alatt duplázva számít ki
// (pl. "FunkciókFunkciók"). Ezért a fül-lekérdezések regexet használnak.

describe('DemoPage', () => {
  it('az öt fület mutatja, alapból a Funkciók kiválasztva', async () => {
    renderDemoPage();

    const funkciok = await screen.findByRole('tab', { name: /Funkciók/ });
    const tervek = screen.getByRole('tab', { name: /Összes terv/ });
    const filerendszer = screen.getByRole('tab', { name: /Filerendszer/ });
    const valtozasnaplo = screen.getByRole('tab', { name: /Változásnapló/ });
    const adatkezeles = screen.getByRole('tab', { name: /Adatkezelés/ });

    expect(funkciok).toHaveAttribute('aria-selected', 'true');
    expect(tervek).toHaveAttribute('aria-selected', 'false');
    expect(filerendszer).toHaveAttribute('aria-selected', 'false');
    expect(valtozasnaplo).toHaveAttribute('aria-selected', 'false');
    expect(adatkezeles).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByText('Miben segít az alkalmazás?')).toBeInTheDocument();
  });

  it('a Változásnapló fülre kattintva a változásnapló-kártya jelenik meg', async () => {
    const user = userEvent.setup();
    renderDemoPage();

    await user.click(await screen.findByRole('tab', { name: /Változásnapló/ }));
    expect(await screen.findByRole('heading', { name: 'Változásnapló' })).toBeInTheDocument();
  });

  it('a Filerendszer fülre kattintva a fájlfa jelenik meg', async () => {
    const user = userEvent.setup();
    renderDemoPage();

    await user.click(await screen.findByRole('tab', { name: /Filerendszer/ }));
    expect(await screen.findByText(/Ez a nézet azt mutatja meg/)).toBeInTheDocument();
  });

  it('az Adatkezelés fülre kattintva a két demó-adatkezelő gomb jelenik meg', async () => {
    const user = userEvent.setup();
    renderDemoPage();

    await user.click(await screen.findByRole('tab', { name: /Adatkezelés/ }));
    expect(await screen.findByRole('button', { name: 'Demó adat visszaállítása' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Minden adat törlése' })).toBeInTheDocument();
  });

  // A globális, több-pácienses terv-lánc/verzió fa -- ez az EGYETLEN
  // fül, ami valódi terv-adatot mutat, a tartalmát az OsszesTervSection.test.tsx
  // fedi részletesen.
  it('az Összes terv fülre kattintva a terv-lánc fa keresője jelenik meg', async () => {
    const user = userEvent.setup();
    renderDemoPage();

    await user.click(await screen.findByRole('tab', { name: /Összes terv/ }));
    expect(await screen.findByRole('heading', { name: 'Összes terv' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Keresés páciensnévre' })).toBeInTheDocument();
  });

  // Mind az öt fül közvetlenül, URL-ről is elérhető -- ez a `/tervek`
  // redirect (App.tsx) célja is.
  it('közvetlen `/demo/:tab` URL a megfelelő fület nyitja meg', async () => {
    renderDemoPage(['/demo/filerendszer']);

    expect(await screen.findByRole('tab', { name: /Filerendszer/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText(/Ez a nézet azt mutatja meg/)).toBeInTheDocument();
  });

  it('ismeretlen fül-slug a Funkciókra esik vissza, hiba nélkül', async () => {
    renderDemoPage(['/demo/nincsilyen']);
    expect(await screen.findByRole('tab', { name: /Funkciók/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('a puszta `/demo` (fül-slug nélkül) is a Funkciókra esik vissza', async () => {
    renderDemoPage(['/demo']);
    expect(await screen.findByRole('tab', { name: /Funkciók/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  // A fülváltás `replace` navigáció (DemoPage.tsx) -- enélkül a
  // `useListStateMemory` POP-alapú megőrzése az Összes terv
  // fülön fülbe zárva, elérhetetlenül maradna egy böngésző-"vissza" után.
  it('a fülváltás replace navigáció -- egy böngésző-"vissza" a DEMO ELŐTTI oldalra visz, nem fülről fülre', async () => {
    const user = userEvent.setup();
    renderDemoPage(['/elozo-oldal', '/demo']);

    await user.click(await screen.findByRole('tab', { name: /Változásnapló/ }));
    await screen.findByRole('heading', { name: 'Változásnapló' });
    await user.click(await screen.findByRole('tab', { name: /Filerendszer/ }));
    await screen.findByText(/Ez a nézet azt mutatja meg/);

    await user.click(screen.getByRole('button', { name: 'Vissza a teszthez' }));
    expect(await screen.findByText('ELŐZŐ OLDAL')).toBeInTheDocument();
  });
});
