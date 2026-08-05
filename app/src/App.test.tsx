// Végponttól végpontig teszt: Kezdőlap -> Páciens -> Terv szerkesztő ->
// Előnézet -> véglegesítés -> Korábbi tervek -> újranyitás -> újabb
// véglegesítés. Ez a mockup teljes létjogosultságát teszteli egyben,
// beleértve a D4 append-only viselkedést (a v1 nem tűnik el, amikor a v2
// elkészül).
//
// A @react-pdf/renderer usePDF()-jét mockoljuk: a valódi PDF-renderelés a
// betűtípus-fájlokat Vite dev-URL-ként próbálná letölteni, ami valódi HTTP
// szerver nélkül (jsdom alatt) nem működik -- ez a réteg élesben, böngészőben
// ellenőrizendő. Minden más (Document/Page/Text/Image/Font) az igazi
// implementáció marad, hogy a TervDocument JSX-e ténylegesen lefusson.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [
      {
        loading: false,
        error: null,
        blob: new Blob(['%PDF-fake'], { type: 'application/pdf' }),
        url: 'blob:fake-preview-url',
      },
      () => {},
    ],
  };
});

describe('Végpontok közötti folyamat', () => {
  beforeEach(() => {
    localStorage.clear();
    // jsdom nem implementálja a window.confirm/alert-et (mindig undefined-et
    // ad vissza) -- a teszt páciense szándékosan hiányos (csak a név van
    // kitöltve), ez a nem blokkoló figyelmeztetést váltja ki véglegesítéskor.
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  it('új terv létrehozása, véglegesítése, majd újranyitva egy második verzió mentése -- a v1 megmarad (D4)', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Kezdőlap -> Új terv indítása -> Páciens adatlap
    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Aladár');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    // Egy tétel felvétele a kritikus billentyűzetes ciklussal.
    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await screen.findByText('Fogeltávolítás');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByText('Fogeltávolítás')).toBeInTheDocument();

    // Előnézet -> Véglegesítés és mentés.
    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    const finalizeBtn1 = await screen.findByRole(
      'button',
      { name: /Véglegesítés és mentés/ },
      { timeout: 10000 },
    );
    await user.click(finalizeBtn1);
    expect(await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 })).toBeInTheDocument();

    // Korábbi tervek -- a demó seed miatt több páciens is szerepel, ezért a
    // saját tervünket a kártyáján (nevén) belül keressük, nem globálisan.
    await user.click(screen.getByRole('button', { name: 'Korábbi tervek' }));
    const patientNameEl = await screen.findByText('Teszt Aladár');
    const patientCard = patientNameEl.parentElement as HTMLElement;
    expect(within(patientCard).getByText(/^v1 ·/)).toBeInTheDocument();

    // Megnyitás szerkesztésre -> a korábban felvitt tétel már ott van --
    // ezért nem kell újragépelni (ez a "Korábbi tervek" fő létjogosultsága).
    await user.click(within(patientCard).getByRole('button', { name: 'Megnyitás szerkesztésre' }));
    await screen.findByPlaceholderText(/Tétel keresése/);
    expect(screen.getByText('Fogeltávolítás')).toBeInTheDocument();

    // Újabb véglegesítés -- új verzió (v2) keletkezik, a v1 nem sérül.
    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    const finalizeBtn2 = await screen.findByRole(
      'button',
      { name: /Véglegesítés és mentés/ },
      { timeout: 10000 },
    );
    await user.click(finalizeBtn2);
    await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

    await user.click(screen.getByRole('button', { name: 'Korábbi tervek' }));
    const patientNameEl2 = await screen.findByText('Teszt Aladár');
    const patientCard2 = patientNameEl2.parentElement as HTMLElement;
    expect(within(patientCard2).getByText(/^v2 ·/)).toBeInTheDocument();
    expect(within(patientCard2).getByText(/^v1 ·/)).toBeInTheDocument(); // v1 megmarad -- D4
  }, 20000);
});
