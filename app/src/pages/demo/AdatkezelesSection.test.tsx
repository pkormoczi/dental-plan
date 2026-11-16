// A Kezdőlapról átköltöztetett demó-adatkezelés -- korábban a
// Home.test.tsx sem fedte a reset/clearAll gombokat, ez nettó új
// lefedettség. A "Demó adat visszaállítása" tesztje szándékosan a
// localStorage-ot ellenőrzi közvetlenül a `reloadFromStorage()` hívás
// regressziós őreként (P0-6, lásd a komponens kommentjét) -- egy
// AppStateProvider-en belüli memóriabeli állapot enélkül csendben
// visszaírná a régi értéket a friss seed fölé.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('az export gomb egy JSON-fájlt tölt le az árlistával, a beállításokkal és a sablonokkal, páciensadat nélkül', async () => {
    let letoltott: Blob | null = null;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => {
      letoltott = obj as Blob;
      return 'blob:export';
    });
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let fajlnev: string | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      fajlnev = this.download;
    });
    const user = userEvent.setup();
    renderSection();
    await waitFor(() => expect(localStorage.getItem('dp:arlista.json')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'Adatok exportálása az asztali alkalmazáshoz' }));

    expect(await screen.findByRole('button', { name: 'Exportálva ✓' })).toBeInTheDocument();
    expect(fajlnev).toMatch(/^kezelesi-terv-export-\d{4}-\d{2}-\d{2}\.json$/);
    const adat = JSON.parse(await letoltott!.text());
    expect(adat.formatum).toBe('dental-plan-export');
    expect(adat.arlista).toEqual(JSON.parse(localStorage.getItem('dp:arlista.json')!));
    expect(adat.beallitasok).toEqual(JSON.parse(localStorage.getItem('dp:beallitasok.json')!));
    expect(Object.keys(adat.sablonok)).toContain('nyilatkozat-hu-v1.md');
    expect(Object.keys(adat)).not.toContain('paciensek');
    expect(JSON.stringify(adat)).not.toContain('"paciens"');
  });

  it('sérült árlistánál nem tölt le semmit, és kiírja az exportálás hibáját', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    const user = userEvent.setup();
    renderSection();
    await waitFor(() => expect(localStorage.getItem('dp:arlista.json')).not.toBeNull());
    localStorage.setItem('dp:arlista.json', 'nem-json');

    await user.click(screen.getByRole('button', { name: 'Adatok exportálása az asztali alkalmazáshoz' }));

    expect(await screen.findByText(/Az exportálás nem sikerült/)).toBeInTheDocument();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
