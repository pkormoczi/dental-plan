// A Kezdőlapról átköltöztetett demó-adatkezelés -- korábban a
// Home.test.tsx sem fedte a reset/clearAll gombokat, ez nettó új
// lefedettség. A "Demó adat visszaállítása" tesztje szándékosan a
// localStorage-ot ellenőrzi közvetlenül a `reloadFromStorage()` hívás
// regressziós őreként (P0-6, lásd a komponens kommentjét) -- egy
// AppStateProvider-en belüli memóriabeli állapot enélkül csendben
// visszaírná a régi értéket a friss seed fölé.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import AdatkezelesSection from './AdatkezelesSection';
import { TestProviders } from '../../testUtils';

function renderSection() {
  return render(
    <TestProviders>
      <AdatkezelesSection />
    </TestProviders>,
  );
}

function arlistaVerzio(): string {
  return JSON.parse(localStorage.getItem('dp:arlista.json')!).arlistaVerzio;
}

describe('AdatkezelesSection', () => {
  it('a Demó adat visszaállítása ténylegesen visszaírja a seedet, nem csak a feliratot váltja', async () => {
    const user = userEvent.setup();
    renderSection();
    await waitFor(() => expect(arlistaVerzio()).toBe('2026-07-01'));

    // A doki egy szerkesztést szimulál -- ugyanaz a minta, mint
    // DemoStorage.test.ts "resetDemoData wipes edits back to the seed".
    const raw = JSON.parse(localStorage.getItem('dp:arlista.json')!);
    raw.arlistaVerzio = 'modositva-teszt';
    localStorage.setItem('dp:arlista.json', JSON.stringify(raw));

    await user.click(screen.getByRole('button', { name: 'Demó adat visszaállítása' }));
    await user.click(await screen.findByRole('button', { name: 'Visszaállítás' }));

    expect(await screen.findByRole('button', { name: 'Visszaállítva ✓' })).toBeInTheDocument();
    expect(arlistaVerzio()).toBe('2026-07-01');
  });

  it('a Minden adat törlése megerősítés után a feliratot Törölve ✓-re váltja', async () => {
    const user = userEvent.setup();
    renderSection();
    await waitFor(() => expect(arlistaVerzio()).toBe('2026-07-01'));

    await user.click(screen.getByRole('button', { name: 'Minden adat törlése' }));
    await user.click(await screen.findByRole('button', { name: 'Törlés' }));

    expect(await screen.findByRole('button', { name: 'Törölve ✓' })).toBeInTheDocument();
    // A törlés után is a demó seed az igazság -- clearAll() majd resetDemoData().
    expect(arlistaVerzio()).toBe('2026-07-01');
  });

  // 88. tétel: statikus tárolás-tájékoztató szöveg, interakció nélkül -- a
  // regex a bevezető mondatra szűkít, mert a lenti Adatvédelem kártya is
  // említi külön a "localStorage" szót.
  it('megjeleníti a localStorage/Google Drive tárolás-tájékoztató szöveget', async () => {
    renderSection();
    expect(
      await screen.findByText(/böngésző helyi tárolójában \(localStorage\) tartja/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Google Drive-val is szinkronizálható/)).toBeInTheDocument();
  });

  it('Mégse esetén a localStorage érintetlen marad', async () => {
    const user = userEvent.setup();
    renderSection();
    await waitFor(() => expect(arlistaVerzio()).toBe('2026-07-01'));

    const raw = JSON.parse(localStorage.getItem('dp:arlista.json')!);
    raw.arlistaVerzio = 'modositva-teszt';
    localStorage.setItem('dp:arlista.json', JSON.stringify(raw));

    await user.click(screen.getByRole('button', { name: 'Demó adat visszaállítása' }));
    await user.click(await screen.findByRole('button', { name: 'Mégse' }));

    expect(arlistaVerzio()).toBe('modositva-teszt');
    expect(screen.queryByRole('button', { name: 'Visszaállítva ✓' })).not.toBeInTheDocument();
  });
});
