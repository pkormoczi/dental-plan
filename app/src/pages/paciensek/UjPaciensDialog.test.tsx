// A duplikáció-detektálás (D42) közvetlen tesztje -- a két hívó
// (`PaciensekPage.test.tsx`, `NewPlanPage.test.tsx`) a pontos-egyezés
// regresszió-őrét fedi, ez a fájl a javaslat-listát és a két megerősítő
// dialógust (`AlertDialog`) teszteli önmagában, `TestProviders`-szel (a
// hook `useStorage()`-ot hív).

import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UjPaciensDialog from './UjPaciensDialog';
import { TestProviders } from '../../testUtils';
import { DemoStorage } from '../../storage/DemoStorage';
import type { PatientFolder } from '../../domain/types';

function Harness({
  patients,
  onSave,
  onUseExisting,
}: {
  patients: PatientFolder[];
  onSave: (nev: string, kezdoAdatok: { szuletesiIdo: string; telefon: string }) => void;
  onUseExisting?: (patient: PatientFolder) => void;
}) {
  const [open, setOpen] = useState(true);
  return (
    <UjPaciensDialog
      open={open}
      onOpenChange={setOpen}
      patients={patients}
      onSave={(nev, kezdoAdatok) => {
        onSave(nev, kezdoAdatok);
        setOpen(false);
      }}
      onUseExisting={(p) => {
        onUseExisting?.(p);
        setOpen(false);
      }}
    />
  );
}

function renderHarness(patients: PatientFolder[], overrides?: { onUseExisting?: (p: PatientFolder) => void }) {
  const onSave = vi.fn();
  const onUseExisting = vi.fn(overrides?.onUseExisting);
  render(
    <TestProviders>
      <Harness patients={patients} onSave={onSave} onUseExisting={onUseExisting} />
    </TestProviders>,
  );
  return { onSave, onUseExisting };
}

function syntheticPatients(n: number, nev: string): PatientFolder[] {
  return Array.from({ length: n }, (_, i) => ({
    dirName: `szintetikus-${i}`,
    paciensId: `szint${i}`,
    nev,
  }));
}

describe('UjPaciensDialog', () => {
  let seededPatients: PatientFolder[];

  beforeEach(async () => {
    localStorage.clear();
    const seeder = new DemoStorage();
    await seeder.init();
    seededPatients = await seeder.listPatients();
  });

  it('pontos névegyezés azonnal, betöltés előtt is megjelenik javaslatként (regresszió-őr)', async () => {
    renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Kovács János');

    expect(await screen.findByText('Kovács János (azonos név)')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Ezt a pácienst választom: Kovács János' }),
    ).toBeInTheDocument();
  });

  it('hasonló nevű, egyező születési dátumú páciens javaslatként jelenik meg', async () => {
    renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Nagy Éva Mária');
    await user.type(screen.getByLabelText('Született'), '1990-11-02');

    expect(
      await screen.findByText('Nagy Éva (hasonló név, egyező születési dátum)', undefined, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('hasonló nevű, ellentmondó telefonú páciens NEM jelenik meg -- egy korábban megjelent javaslat is eltűnik, ha a telefon utólag ellentmondóra változik', async () => {
    renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Nagy Éva Mária');
    await user.type(screen.getByLabelText('Telefon'), '+36 20 555 1234');
    // Előbb bizonyítjuk, hogy a 2. fázis (telefon) ténylegesen betöltött és
    // egyezést talált -- csak ez után van értelme a "nem jelenik meg"
    // negatív állításnak (különben egy még-be-nem-töltött állapotot is
    // hamisan "sikeresnek" olvasnánk).
    await screen.findByText('Nagy Éva (hasonló név, egyező telefon)', undefined, { timeout: 3000 });

    await user.clear(screen.getByLabelText('Telefon'));
    await user.type(screen.getByLabelText('Telefon'), '+36 20 999 9999');

    await waitFor(() => expect(screen.queryByText(/Nagy Éva/)).not.toBeInTheDocument());
  });

  it('legfeljebb 3 javaslat látszik, a többi "+N további" mögött (D230)', async () => {
    renderHarness(syntheticPatients(4, 'Teszt Duplikátum'));
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Teszt Duplikátum');

    expect(await screen.findAllByText('Teszt Duplikátum (azonos név)')).toHaveLength(3);
    expect(screen.getByText('+1 további')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /további/ }));
    expect(await screen.findAllByText('Teszt Duplikátum (azonos név)')).toHaveLength(4);
  });

  it('a Mentés lefuttatja az ellenőrzést, és megerősítést kér, ha van találat', async () => {
    const { onSave } = renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByText('Mégis új páciens létrehozása?')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('"Mégis új páciens létrehozása" hívja az onSave-et, és bezárja a dialógust', async () => {
    const { onSave } = renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    const alert = await screen.findByRole('alertdialog');
    await user.click(within(alert).getByRole('button', { name: 'Mégis új páciens létrehozása' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onSave).toHaveBeenCalledWith('Kovács János', { szuletesiIdo: '', telefon: '' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('a megerősítés Mégse-je nyitva hagyja a dialógust, a begépelt adat megmarad', async () => {
    const { onSave } = renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));
    const alert = await screen.findByRole('alertdialog');
    await user.click(within(alert).getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Név *' })).toHaveValue('Kovács János');
  });

  it('találat nélkül a Mentés azonnal ment, megerősítés nélkül', async () => {
    const { onSave } = renderHarness([]);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Teljesen Ismeretlen Név');
    await user.click(screen.getByRole('button', { name: 'Mentés' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Teljesen Ismeretlen Név', { szuletesiIdo: '', telefon: '' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('ellentmondó adatú pontos találat kiválasztásakor megerősítés jelenik meg, a konkrét eltéréssel', async () => {
    const { onUseExisting } = renderHarness(seededPatients);
    const user = userEvent.setup();

    await user.type(await screen.findByRole('textbox', { name: 'Név *' }), 'Kovács János');
    await user.type(screen.getByLabelText('Született'), '1990-01-01');

    const valasztomBtn = await screen.findByRole(
      'button',
      { name: 'Ezt a pácienst választom: Kovács János' },
      { timeout: 3000 },
    );
    await user.click(valasztomBtn);

    // CI-n (gyengébb futtatókon) a debounce (DUPLIKACIO_DEBOUNCE_MS) utáni
    // click+render lánc néha az alapértelmezett 1000ms fölé csúszik, ugyanaz
    // az ok, ami miatt a fenti `valasztomBtn` keresés is 3000ms-et kapott.
    const alert = await screen.findByRole('alertdialog', {}, { timeout: 3000 });
    expect(within(alert).getByText('A megadott adatok eltérnek')).toBeInTheDocument();
    expect(within(alert).getByText(/a születési dátum/)).toBeInTheDocument();
    expect(onUseExisting).not.toHaveBeenCalled();

    await user.click(within(alert).getByRole('button', { name: 'Mégis ezt a pácienst választom' }));
    await waitFor(() => expect(onUseExisting).toHaveBeenCalled());
    expect(onUseExisting.mock.calls[0][0].nev).toBe('Kovács János');
  });
});
