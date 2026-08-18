// backlog-29: a DEMO oldal a korábban önálló Filerendszer nézetet és a
// Kezdőlapról levett Funkciólista/Változásnapló kártyát fogja össze három
// fülben. Ez a teszt csak a fül-váltást fedi -- az egyes tartalmak saját
// tesztjei (FileTreeSection.test.tsx, FeatureOverviewCard.test.tsx)
// változatlanul felelősek a bennük lévő viselkedésért.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import DemoPage from './DemoPage';
import { TestProviders } from '../testUtils';

function renderDemoPage() {
  return render(
    <TestProviders>
      <DemoPage />
    </TestProviders>,
  );
}

// Radix Tabs.Trigger renders a második, csak CSS-sel (`visibility: hidden`)
// takart span-t a felirat mellé, hogy a kijelölt/nem kijelölt vastagság
// ne tördelje újra a sávot -- a vitest-készlet nem tölti be a Radix
// Themes CSS-t (docs/07-felulet-rendszer.md § Ellenőrzés valódi
// böngészőben), ezért az accessible name jsdom alatt duplázva számít ki
// (pl. "FunkciókFunkciók"). Ezért a fül-lekérdezések regexet használnak.

describe('DemoPage', () => {
  it('a három fület mutatja, alapból a Funkciók kiválasztva', async () => {
    renderDemoPage();

    const funkciok = await screen.findByRole('tab', { name: /Funkciók/ });
    const filerendszer = screen.getByRole('tab', { name: /Filerendszer/ });
    const valtozasnaplo = screen.getByRole('tab', { name: /Változásnapló/ });

    expect(funkciok).toHaveAttribute('aria-selected', 'true');
    expect(filerendszer).toHaveAttribute('aria-selected', 'false');
    expect(valtozasnaplo).toHaveAttribute('aria-selected', 'false');
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
});
