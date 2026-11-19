// A Súgó oldal a fül-váltást és a két fül URL-címezhetőségét (`/sugo/:tab`) fedi -- a Funkciók
// kártya tartalmáért a FeatureOverviewCard.test.tsx felel.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import SugoPage from './SugoPage';

// A `useParams()`-alapú fülvezérlés csak paraméteres `<Route>` alatt kap valódi `:tab`
// paramétert, ezért itt saját, App.tsx-et tükröző route-tábla épül.
function TesztVisszaGomb() {
  const navigate = useNavigate();
  return <button onClick={() => navigate(-1)}>Vissza a teszthez</button>;
}

function renderSugoPage(initialEntries: string[] = ['/sugo']) {
  return render(
    <Theme accentColor="brown" grayColor="slate" radius="small" scaling="95%">
      <MemoryRouter initialEntries={initialEntries}>
        <TesztVisszaGomb />
        <Routes>
          <Route path="/elozo-oldal" element={<div>ELŐZŐ OLDAL</div>} />
          <Route path="/sugo" element={<SugoPage />} />
          <Route path="/sugo/:tab" element={<SugoPage />} />
        </Routes>
      </MemoryRouter>
    </Theme>,
  );
}

// A Radix Tabs.Trigger a feliratot egy második, csak CSS-sel takart span-ban is rendereli; a
// vitest-készlet nem tölti be a Radix Themes CSS-t (app/src/CLAUDE.md jsdom-vakfoltok), ezért az
// accessible name duplázva számítódik ("FunkciókFunkciók") -- a fül-lekérdezések regexet használnak.

describe('SugoPage', () => {
  it('két fület mutat, Funkciók és Változásnapló, alapból a Funkciók kiválasztva', async () => {
    renderSugoPage();

    const funkciok = await screen.findByRole('tab', { name: /Funkciók/ });
    const valtozasnaplo = screen.getByRole('tab', { name: /Változásnapló/ });

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('heading', { name: 'Súgó' })).toBeInTheDocument();
    expect(funkciok).toHaveAttribute('aria-selected', 'true');
    expect(valtozasnaplo).toHaveAttribute('aria-selected', 'false');
    expect(await screen.findByText('Miben segít az alkalmazás?')).toBeInTheDocument();
  });

  it('a Változásnapló fülre kattintva a változásnapló-kártya jelenik meg', async () => {
    const user = userEvent.setup();
    renderSugoPage();

    await user.click(await screen.findByRole('tab', { name: /Változásnapló/ }));
    expect(await screen.findByRole('heading', { name: 'Változásnapló' })).toBeInTheDocument();
  });

  it('a `/sugo/valtozasnaplo` cím közvetlenül a Változásnapló fület nyitja meg', async () => {
    renderSugoPage(['/sugo/valtozasnaplo']);

    expect(await screen.findByRole('tab', { name: /Változásnapló/ })).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: 'Változásnapló' })).toBeInTheDocument();
  });

  it('ismeretlen fül-slug a Funkciókra esik vissza, hiba nélkül', async () => {
    renderSugoPage(['/sugo/nincsilyen']);
    expect(await screen.findByRole('tab', { name: /Funkciók/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('a fülváltás replace navigáció -- egy böngésző-"vissza" a Súgó ELŐTTI oldalra visz, nem fülről fülre', async () => {
    const user = userEvent.setup();
    renderSugoPage(['/elozo-oldal', '/sugo']);

    await user.click(await screen.findByRole('tab', { name: /Változásnapló/ }));
    await screen.findByRole('heading', { name: 'Változásnapló' });
    await user.click(screen.getByRole('tab', { name: /Funkciók/ }));
    await screen.findByText('Miben segít az alkalmazás?');

    await user.click(screen.getByRole('button', { name: 'Vissza a teszthez' }));
    expect(await screen.findByText('ELŐZŐ OLDAL')).toBeInTheDocument();
  });
});
