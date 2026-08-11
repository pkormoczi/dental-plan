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
import { seedPriceList } from './storage/seed/priceList';
import { seedSettings } from './storage/seed/settings';
import { verzioMenupont } from './testQueries';

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
    // A HashRouter a valódi window.location.hash-t használja, ami a jsdom
    // window-on a fájlon belüli tesztek között NEM reset -- enélkül a
    // második teszt ott folytatná a routingot, ahol az első abbahagyta.
    window.location.hash = '';
  });

  it('új terv létrehozása, véglegesítése, majd újranyitva egy második verzió mentése -- a v1 megmarad (D4)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Teszt Aladár');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await screen.findByText('Fogeltávolítás');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    const finalizeBtn1 = await screen.findByRole(
      'button',
      { name: /Véglegesítés és mentés/ },
      { timeout: 10000 },
    );
    await user.click(finalizeBtn1);
    // A páciens szándékosan hiányos (csak a név van kitöltve) -- ez a nem
    // blokkoló "hiányzó adatok" AlertDialogot váltja ki véglegesítéskor.
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
    expect(await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 })).toBeInTheDocument();

    // Korábbi tervek -- a demó seed miatt több páciens is szerepel, ezért a
    // saját tervünket a kártyáján (nevén) belül keressük, nem globálisan.
    await user.click(screen.getByRole('button', { name: 'Korábbi tervek' }));
    const patientNameEl = await screen.findByText('Teszt Aladár');
    const patientCard = patientNameEl.closest('[data-patient]') as HTMLElement;
    expect(within(patientCard).getByText(/^v1 ·/)).toBeInTheDocument();

    // Új verzió -> a korábban felvitt tétel már ott van -- ezért nem kell
    // újragépelni (ez a "Korábbi tervek" fő létjogosultsága).
    await user.click(await verzioMenupont(user, patientCard, 'Új verzió'));
    await screen.findByPlaceholderText(/Tétel keresése/);
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();

    // Újabb véglegesítés -- új verzió (v2) keletkezik, a v1 nem sérül.
    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    const finalizeBtn2 = await screen.findByRole(
      'button',
      { name: /Véglegesítés és mentés/ },
      { timeout: 10000 },
    );
    await user.click(finalizeBtn2);
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
    await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

    await user.click(screen.getByRole('button', { name: 'Korábbi tervek' }));
    const patientNameEl2 = await screen.findByText('Teszt Aladár');
    const patientCard2 = patientNameEl2.closest('[data-patient]') as HTMLElement;
    expect(within(patientCard2).getByText(/^v2 ·/)).toBeInTheDocument();
    expect(within(patientCard2).getByText(/^v1 ·/)).toBeInTheDocument(); // v1 megmarad -- D4
  }, 20000);

  it('a nyelv és a pénznem egymástól függetlenül választható és marad meg mentés után (D21: német nyelv, HUF pénznem)', async () => {
    // A DemoStorage.init() az árlista hiányában resetDemoData()-t futtatna,
    // ami felülírná a nemetEngedelyezve:true beállítást -- ezért az
    // árlistát is elő kell seedelni, nem csak a beállításokat.
    localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
    localStorage.setItem(
      'dp:beallitasok.json',
      JSON.stringify({ ...seedSettings, nemetEngedelyezve: true }),
    );

    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Németh Éva');

    // Nyelv: Deutsch. A pénznem NEM követi automatikusan -- D21 lényege,
    // hogy egy német nyelvű ajánlat is maradhat forintos.
    await screen.findByText('Az ajánlat nyelve és pénzneme');
    await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
    expect(screen.getByRole('radio', { name: 'HUF — forint' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await screen.findByText('Zahnextraktion');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));

    await user.click(screen.getByRole('button', { name: 'Előnézet' }));
    const finalizeBtn = await screen.findByRole(
      'button',
      { name: /Véglegesítés és mentés/ },
      { timeout: 10000 },
    );
    await user.click(finalizeBtn);
    await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
    await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

    // A mentett terv.json-t a "patientDir / planDir / versionDir" kijelzőből
    // rekonstruált localStorage-kulccsal olvassuk vissza -- ez a
    // rendszer-of-record, nem a memóriabeli state.
    const refEl = screen.getByText(/_v1$/);
    const [patientDir, planDir, versionDir] = (refEl.textContent ?? '').split(' / ');
    const raw = localStorage.getItem(`dp:paciensek/${patientDir}/${planDir}/${versionDir}/terv.json`);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw!);
    expect(saved.nyelv).toBe('de');
    expect(saved.penznem).toBe('HUF');
    expect(saved.sablonVerzio).toBe('nyilatkozat-de-v1');
  }, 20000);

  // docs/03-funkcionalis-spec.md § Autosave -- ez a teszt annak valódi
  // próbája, hogy a piszkozat frissítést/összeomlást éljen túl. `unmount()`
  // + újbóli `render(<App/>)` egy friss AppStateProvider-t (és benne friss,
  // memóriabeli `plan` state-et) hoz létre, ugyanazon a `localStorage`-on
  // -- ez modellezi az F5-öt.
  it('egy félkész piszkozat túléli az "F5"-öt (unmount + újbóli render, ugyanaz a localStorage)', async () => {
    const user = userEvent.setup();
    const first = render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
    await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
    const nameInput = await screen.findByPlaceholderText('Kovács János');
    await user.type(nameInput, 'Piszkozat Ilona');
    await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

    const search = await screen.findByPlaceholderText(/Tétel keresése/);
    await user.type(search, 'fogeltavolitas');
    await screen.findByText('Fogeltávolítás');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(search).toHaveValue(''));

    // Az író effekt debounce nélkül fut (3. döntés) -- megvárjuk, hogy a
    // piszkozat ténylegesen a localStorage-ban landoljon, mielőtt
    // "frissítünk".
    await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

    first.unmount();
    window.location.hash = '';

    render(<App />);

    // Csendes, memóriabeli restore (4. döntés) -- a Kezdőlapon a "Piszkozat
    // folytatása" kártya a belépési pont, a páciensnévvel.
    expect(await screen.findByText('Piszkozat folytatása')).toBeInTheDocument();
    expect(screen.getByText('Piszkozat Ilona')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Megnyitás' }));
    await screen.findByPlaceholderText(/Tétel keresése/);
    expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
  }, 20000);

  // D22 -- a demó seed szerinti v2 2026-07-22-i keltezésű, egy visszatérő
  // páciens új verziója ma mégsem indulhat ezzel a (a mai naphoz képest
  // lejárt) dátummal.
  it('egy korábbi terv megnyitása friss dátummal indítja az új verziót, az árakat érintetlenül hagyva', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Korábbi tervek' }));
    const nagyEva = await screen.findByText('Nagy Éva');
    const card = nagyEva.closest('[data-patient]') as HTMLElement;
    // Nagy Évának két önálló terv-lánca is van (D29) -- a páciens-blokk
    // emiatt alapból csukva nyílik, ki kell bontani a verziósorok eléréséhez.
    await user.click(within(card).getByRole('button', { name: /^\d+ terv$/ }));
    // A legfrissebb verzió (v2, 2026-07-22) az ELSŐ (fogpótlás) terv-láncban
    // van legfelül -- lásd PlanHistoryPage.tsx `.slice().reverse()`.
    await user.click(await verzioMenupont(user, card, 'Új verzió'));

    // A visszatérő páciensnek két fázisa is van (1. kezelés + 2. kezelés —
    // korona), tehát két ItemPicker-keresőmező is renderel -- itt csak azt
    // ellenőrizzük, hogy a szerkesztő betöltött.
    await screen.findAllByPlaceholderText(/Tétel keresése/);
    // A tájékoztató sáv megjelenik, a régi (2026-07-22-i) dátum sehol nem
    // látszik többé a szerkesztőben.
    expect(await screen.findByText(/Az új verzió mai dátummal indul/)).toBeInTheDocument();
    expect(screen.getByText(/a korábbi tételek ára változatlan/)).toBeInTheDocument();
    expect(screen.queryByText(/2026\. július 22\./)).not.toBeInTheDocument();
    // A korábbi (pillanatkép) sorok érintetlenek -- D7.
    expect(screen.getByDisplayValue('Fémkerámia')).toBeInTheDocument();
  }, 20000);
});
