// A kitöltetlen-sor véglegesítés-őr tesztje: egy fogtérkép-kattintással
// létrehozott, de be nem azonosított sor KEMÉNY blokk -- nem folytatható,
// amíg a doki nem választ hozzá beavatkozást vagy nem törli a sort. A
// @react-pdf/renderer usePDF()-jét ugyanúgy mockoljuk, mint App.test.tsx-ben
// (lásd ott a header-kommentet az indoklásért).

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import { DemoStorage } from '../storage/DemoStorage';
import { DemoDraftStorage } from '../storage/DemoDraftStorage';

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

/** A puha megerősítő lánc (docs/03 § 4.) ismételt "Folytatás" kattintással, amíg a siker-képernyő meg nem jelenik. */
async function finalizeThroughConfirms(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 5; i++) {
    if (screen.queryByText('A terv elmentve ✓')) return;
    const folytatas = screen.queryByRole('button', { name: 'Folytatás' });
    if (folytatas) {
      await user.click(folytatas);
      continue;
    }
    await waitFor(() => {
      if (
        !screen.queryByText('A terv elmentve ✓') &&
        !screen.queryByRole('button', { name: 'Folytatás' })
      ) {
        throw new Error('várakozás a következő lépésre');
      }
    });
  }
}

describe('PreviewPage -- kitöltetlen sorok véglegesítés-őre', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'kitöltetlen sorral a véglegesítés blokkolva -- kitöltés után folytatható',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Ilona');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      // Fogtérkép-kattintással létrehozott, tétel nélküli sor -- a panel
      // alapból csukva, előbb ki kell nyitni.
      await user.click(await screen.findByRole('button', { name: /Érintett fogak/ }));
      const chart = await screen.findByRole('toolbar');
      const tooth16 = chart.querySelector('[data-tooth="16"]') as Element;
      await user.click(tooth16);
      expect(screen.getByDisplayValue('16')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // D73: KEMÉNY blokk -- a csekklista-tétel MINDIG látható, a
      // gombnyomás előtt is; a gomb letiltott, amíg a hard tétel fennáll.
      expect(
        await screen.findByText(/A terv 1 kitöltetlen sort tartalmaz/),
      ).toBeInTheDocument();
      expect(screen.getByText(/1\. kezelés — 16/)).toBeInTheDocument();
      expect(finalizeBtn).toBeDisabled();
      expect(screen.queryByText('A terv elmentve ✓')).not.toBeInTheDocument();

      // "Vissza a szerkesztőbe" -- valóban a szerkesztőre navigál. Két
      // kereső van egyszerre a DOM-ban: a soron belüli (a még kitöltetlen
      // sorban) és a fázis alatti "+ tétel" kereső.
      await user.click(screen.getByRole('button', { name: 'Vissza a szerkesztőbe' }));
      const [rowSearch] = await screen.findAllByPlaceholderText(/Tétel keresése/);

      await user.type(rowSearch, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      expect(screen.getByDisplayValue('Fogeltávolítás')).toBeInTheDocument();
      expect(screen.getAllByPlaceholderText(/Tétel keresése/)).toHaveLength(1);

      // Most már folytatható a véglegesítés -- a hiányos páciensadat csak
      // PUHA tétel, nem blokkol, a gomb közvetlenül ment.
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(finalizeBtn2).not.toBeDisabled();
      await user.click(finalizeBtn2);
      await waitFor(() =>
        expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument(),
      );
    },
    20000,
  );
});

// D68: hiányzó vagy már nem aktív kezelőorvos -- KEMÉNY blokk, a
// kitöltetlen-sor blokk mintáján, a `nameMissing` UTÁN, az `uresSorok`
// ELŐTT (docs/03-funkcionalis-spec.md § 4. Előnézet és véglegesítés).
describe('PreviewPage -- D68: hiányzó/nem aktív kezelőorvos kemény blokk', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  function seedDraftWithOrvos(orvos: string) {
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({
        schemaVersion: 1,
        mentve: '2026-08-09T10:15:00.000Z',
        plan: {
          schemaVersion: 1,
          tervId: '',
          verzio: 0,
          statusz: 'PISZKOZAT',
          nyelv: 'hu',
          penznem: 'HUF',
          keltezes: '2026-08-05',
          ervenyesIg: '2026-11-03',
          arlistaVerzio: '2026-07-01',
          orvos,
          paciens: {
            nev: 'Teszt Orvosblokk',
            szuletesiIdo: '',
            lakcim: '',
            telefon: '',
            email: '',
            taj: '',
            kiskoru: false,
            torvenyesKepviselo: null,
          },
          // D103: egy 0 soros fázis önmagában is HARD blokk -- ez a teszt
          // nem az üres fázist vizsgálja, ezért egy sort kap (a 0 Ft csak
          // PUHA "nulla-osszegu-sor" tételt ad, nem blokkol).
          fazisok: [
            {
              sorszam: 1,
              megnevezes: '1. kezelés',
              megjegyzes: '',
              sorok: [
                {
                  tetelId: '',
                  nevSnapshot: 'Kontroll',
                  savos: false,
                  fogak: '',
                  mennyiseg: 1,
                  listaEgysegar: 0,
                  tenylegesEgysegar: 0,
                },
              ],
            },
          ],
          osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
        },
      }),
    );
  }

  it(
    'hiányzó orvos esetén a véglegesítés blokkolva -- a "Kezelőorvos kiválasztása" gomb a Terv adatai lapra navigál',
    async () => {
      const user = userEvent.setup();
      localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
      localStorage.setItem('dp:beallitasok.json', JSON.stringify({ ...seedSettings, orvosok: [] }));
      seedDraftWithOrvos('');
      render(<App />);
      window.location.hash = '#/elonezet';

      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // D73: KEMÉNY blokk -- a csekklista-tétel a gombnyomás ELŐTT is
      // látszik, a gomb letiltott.
      expect(await screen.findByText(/A tervhez nincs kezelőorvos rendelve/)).toBeInTheDocument();
      expect(finalizeBtn).toBeDisabled();
      expect(screen.queryByText('A terv elmentve ✓')).not.toBeInTheDocument();

      // A hiányos páciensadat (puha) is /paciens-re routolt "Terv adatai"
      // gombot ad -- mindkettő ugyanoda navigál.
      const [terveAdataiGomb] = screen.getAllByRole('button', { name: 'Terv adatai' });
      await user.click(terveAdataiGomb);
      expect(await screen.findByRole('heading', { name: 'Terv adatai' })).toBeInTheDocument();
    },
    20000,
  );

  it(
    'nem aktív orvosra hivatkozó terv piros Callout-tal blokkol, aktív orvos választása után folytatható',
    async () => {
      const user = userEvent.setup();
      localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
      localStorage.setItem(
        'dp:beallitasok.json',
        JSON.stringify({
          ...seedSettings,
          orvosok: ['Dr. Mándoki István', 'Dr. Régi Rezső'],
          inaktivOrvosok: ['Dr. Régi Rezső'],
        }),
      );
      seedDraftWithOrvos('Dr. Régi Rezső');
      render(<App />);
      window.location.hash = '#/elonezet';

      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      expect(
        await screen.findByText(/A terv kezelőorvosa \(Dr\. Régi Rezső\) már nem szerepel/),
      ).toBeInTheDocument();
      expect(finalizeBtn).toBeDisabled();
      expect(screen.queryByText('A terv elmentve ✓')).not.toBeInTheDocument();

      const [terveAdataiGomb] = screen.getAllByRole('button', { name: 'Terv adatai' });
      await user.click(terveAdataiGomb);
      await screen.findByRole('heading', { name: 'Terv adatai' });
      await user.click(screen.getByRole('combobox', { name: 'Kezelőorvos (aláírás-blokk)' }));
      await user.click(await screen.findByRole('option', { name: 'Dr. Mándoki István' }));

      window.location.hash = '#/elonezet';
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      // A páciens egyéb adatai hiányosak (a `seedDraftWithOrvos` csak a
      // nevet tölti ki), de ez csak PUHA tétel -- nem blokkol.
      expect(finalizeBtn2).not.toBeDisabled();
      await user.click(finalizeBtn2);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

// 62. tétel (D71): egy a terv pénznemében beárazatlan, kézi árat sem kapott
// sor KEMÉNY blokk -- lásd domain/kitoltetlen.ts `araztalanSorok()`.
describe('PreviewPage -- 62. tétel (D71): beárazatlan sor kemény véglegesítés-blokkja', () => {
  function seedWithNoEurPriceItem() {
    const custom = {
      ...seedPriceList,
      tetelek: seedPriceList.tetelek.map((x) =>
        x.nev.hu === 'Fogeltávolítás' ? { ...x, ar: { ...x.ar, EUR: null } } : x,
      ),
    };
    localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
    localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
  }

  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'beárazatlan, kézi árat sem kapott sorral a véglegesítés blokkolva -- kézi ár megadása után folytatható',
    async () => {
      const user = userEvent.setup();
      seedWithNoEurPriceItem();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt EUR');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      // Pénznemváltás EUR-ra -- a tétel EUR ára null, a sor "hiányzó ár"
      // állapotba kerül, de nem törlődik.
      await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
      await screen.findByText('Pénznem');
      await user.click(screen.getByRole('radio', { name: 'EUR — euró' }));
      const penznemDialog = await screen.findByRole('alertdialog');
      expect(
        within(penznemDialog).getByText(/egyik sem beárazott az új pénznemben/),
      ).toBeInTheDocument();
      await user.click(within(penznemDialog).getByRole('button', { name: 'Folytatás' }));

      await user.click(screen.getByRole('link', { name: 'Kezelések' }));
      await screen.findByDisplayValue('Fogeltávolítás');
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // D73: KEMÉNY blokk -- a tétel a gombnyomás ELŐTT is látszik, a gomb
      // letiltott. A sor egyúttal a puha "nulla-osszegu-sor" tételt is
      // kiváltja (0/0 áru sor) -- ugyanaz a név emiatt KÉT tételben is
      // szerepel, innen a `getAllByText`.
      expect(
        await screen.findByText(/nincs beárazva a terv pénznemében/),
      ).toBeInTheDocument();
      expect(screen.getAllByText(/Fogeltávolítás/).length).toBeGreaterThan(0);
      expect(finalizeBtn).toBeDisabled();
      expect(screen.queryByText('A terv elmentve ✓')).not.toBeInTheDocument();

      // A "nulla-osszegu-sor" puha tétel ugyanerre a sorra /terv-re
      // routolt gombot is ad -- mindkettő ugyanoda navigál.
      const [visszaGomb] = screen.getAllByRole('button', { name: 'Vissza a szerkesztőbe' });
      await user.click(visszaGomb);
      const priceField = (await screen.findByLabelText('Ajánlati egységár')) as HTMLInputElement;
      await user.clear(priceField);
      await user.type(priceField, '30,00');
      await user.tab();

      // Most már folytatható a véglegesítés -- a hiányos páciensadat és a
      // kézzel beírt ár okozta árlista-eltérés (D70) is csak PUHA tétel,
      // egyik sem blokkol, a gomb közvetlenül ment.
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(finalizeBtn2).not.toBeDisabled();
      await user.click(finalizeBtn2);
      await waitFor(() =>
        expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument(),
      );
    },
    20000,
  );
});

// docs/03-funkcionalis-spec.md véglegesítés-lánc 4. lépése ("A piszkozat
// törlése") -- ha ez elmaradna, a most fájlba mentett terv azonnal
// vissza"íródna" piszkozatként (lásd AppState.tsx markPlanSaved).
describe('PreviewPage -- piszkozat törlése sikeres véglegesítéskor', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'sikeres véglegesítés után nincs perzisztált dp:piszkozat kulcs',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Piszkozat Béla');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      // A piszkozat itt már perzisztálva van -- az író effekt debounce
      // nélkül fut (3. döntés).
      await waitFor(() => expect(localStorage.getItem('dp:piszkozat')).not.toBeNull());

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      // A hiányos páciensadat csak PUHA tétel -- nem blokkol.
      await user.click(finalizeBtn);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      expect(localStorage.getItem('dp:piszkozat')).toBeNull();
    },
    20000,
  );
});

// backlog-69 (D74): a tartós mentés (savePlan+loadPlan) és a piszkozat
// best-effort takarítása (markPlanSaved -> drafts.clear()) két külön
// hibazóna -- egy sikeres mentés utáni takarítás-hiba a doki szemszögéből
// SOHA nem "A mentés nem sikerült", legfeljebb egy halk amber jelzés a
// siker-képernyőn (lásd PreviewPage.tsx doFinalize()).
describe('PreviewPage -- backlog-69: piszkozat-törlés hibája nem hiúsítja meg a mentést', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'hibázó drafts.clear() mellett is a siker-képernyő jelenik meg, amber jelzéssel',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Takaritas Hiba Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      // A `clear()` csak MOST, a piszkozat-írás(ok) UTÁN kap hibát -- a
      // fenti szerkesztés maga ne hiúsuljon meg.
      vi.spyOn(DemoDraftStorage.prototype, 'clear').mockRejectedValue(
        new Error('megtelt a tárhely'),
      );

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      // A hiányos páciensadat csak PUHA tétel -- nem blokkol.
      await user.click(finalizeBtn);

      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
      expect(screen.queryByText(/A mentés nem sikerült/)).not.toBeInTheDocument();
      expect(
        await screen.findByText(/A piszkozat automatikus törlése nem sikerült/),
      ).toBeInTheDocument();

      vi.restoreAllMocks();
    },
    20000,
  );

  it(
    'sikeres drafts.clear() mellett nincs amber piszkozat-jelzés',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Takaritas Sikeres Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);

      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
      expect(screen.queryByText(/A piszkozat automatikus törlése nem sikerült/)).not.toBeInTheDocument();
    },
    20000,
  );
});

// backlog-51 (D61): a "Terv adatai" lap cím mezőjének (`TervCimField`) két
// írási útvonala -- vadonatúj lánchoz a `doFinalize()` írja ki a
// `DraftMeta.tervCim`-et, mentett lánchoz ez a második `savePlanLabel` hívás
// SOSEM fut (a cím már korábban, a lapon íródott).
describe('PreviewPage -- backlog-51: terv címe véglegesítéskor', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'vadonatúj lánc véglegesítése a beírt címmel írja a terv-cimke.json-t',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Cím Teszt Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
      await user.type(cimInput, 'Fogpótlás felső ívben');

      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
      expect(screen.queryByText(/nem mentődött/)).not.toBeInTheDocument();

      const storage = new DemoStorage();
      const patient = (await storage.listPatients()).find((p) => p.nev === 'Cím Teszt Elek')!;
      const [chain] = await storage.listPlans(patient.dirName);
      expect(chain.tervCim).toBe('Fogpótlás felső ívben');
    },
    20000,
  );

  it(
    'a savePlanLabel hibája nem hiúsítja meg a mentést -- a siker-képernyőn amber jelzés jelenik meg',
    async () => {
      const user = userEvent.setup();
      vi.spyOn(DemoStorage.prototype, 'savePlanLabel').mockRejectedValue(
        new Error('megtelt a tárhely'),
      );
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Cím Hiba Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

      const cimInput = await screen.findByRole('textbox', { name: 'Terv címe' });
      await user.type(cimInput, 'Fogpótlás felső ívben');

      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await screen.findByText('Fogeltávolítás');
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);

      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });
      expect(screen.queryByText(/A mentés nem sikerült/)).not.toBeInTheDocument();
      expect(await screen.findByText(/A terv címe nem mentődött/)).toBeInTheDocument();

      vi.restoreAllMocks();
    },
    20000,
  );

  it(
    'mentett lánc véglegesítése nem hívja a savePlanLabel-t (a cím korábban a "Terv adatai" lapon íródott)',
    async () => {
      const user = userEvent.setup();
      const savePlanLabelSpy = vi.spyOn(DemoStorage.prototype, 'savePlanLabel');
      render(<App />);

      window.location.hash = '#/tervek';
      const patientNameEl = await screen.findByText('Kovács János');
      const card = patientNameEl.closest('[data-patient]') as HTMLElement;
      await user.click(within(card).getByRole('button', { name: 'Új verzió' }));
      await screen.findAllByPlaceholderText(/Tétel keresése/, {}, { timeout: 5000 });

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      expect(savePlanLabelSpy).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    },
    20000,
  );
});

/**
 * Egy német tervhez szükséges beállítás + egy árlista, amiben pontosan egy
 * tételnek ("Fogeltávolítás") van német neve -- a többi 117-nek nincs.
 * Ugyanaz a minta, mint `PlanEditorPage.test.tsx`
 * `seedGermanPlanWithOneTranslatedItem`-je.
 */
function seedGermanPlanWithOneTranslatedItem() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) =>
      x.nev.hu === 'Fogeltávolítás'
        ? { ...x, nev: { ...x.nev, de: 'Zahnextraktion' } }
        : { ...x, nev: { ...x.nev, de: null } },
    ),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, alapertelmezettNyelv: 'de' }),
  );
}

/**
 * Egy vadonatúj, német nyelvű piszkozat közvetlen localStorage-seedelése,
 * a `sorok` paraméterrel megadott sorokkal -- ugyanaz a minta, mint a D68
 * `seedDraftWithOrvos()`. Direkt seedelés kell, mert a D74/D133 hard
 * blokk predikátuma (`nemetNeveIgazolt()`, `domain/nemetNev.ts`) a
 * `Sor.nevNyelv` (D72) metaadattól függ -- ezt a szerkesztő UI-n át
 * begépelt szöveg MINDIG a jelenlegi dokumentumnyelvre stampeli (D72),
 * ezért a "kézzel eltérített, DE terven review nélkül maradt név" esetet
 * csak úgy lehet reprodukálni, ha a `nevNyelv` egy KORÁBBI (nem `de`)
 * nyelvre igazolt állapotban kerül a piszkozatba.
 */
function seedGermanNameDraft(sorok: Record<string, unknown>[]) {
  const customPriceList = {
    schemaVersion: 1,
    arlistaVerzio: '2026-07-01',
    modositva: '2026-07-01',
    kategoriak: [],
    tetelek: [
      {
        id: 't1',
        kategoriaId: 'k1',
        sorrend: 1,
        aktiv: true,
        gyakori: false,
        nev: { hu: 'Fogeltávolítás', de: null },
        ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
      },
      {
        id: 't2',
        kategoriaId: 'k1',
        sorrend: 2,
        aktiv: true,
        gyakori: false,
        nev: { hu: 'Fogkő eltávolítás', de: 'Zahnsteinentfernung' },
        ar: { HUF: { tipus: 'FIX', ertek: 5000 }, EUR: null },
      },
    ],
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(customPriceList));
  localStorage.setItem(
    'dp:beallitasok.json',
    JSON.stringify({ ...seedSettings, orvosok: ['Dr. Mándoki István'], inaktivOrvosok: [] }),
  );
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({
      schemaVersion: 1,
      mentve: '2026-08-09T10:15:00.000Z',
      plan: {
        schemaVersion: 1,
        tervId: '',
        verzio: 0,
        statusz: 'PISZKOZAT',
        nyelv: 'de',
        penznem: 'HUF',
        keltezes: '2026-08-05',
        ervenyesIg: '2026-11-03',
        arlistaVerzio: '2026-07-01',
        orvos: 'Dr. Mándoki István',
        paciens: {
          nev: 'Teszt Nemetnev',
          szuletesiIdo: '1990-01-01',
          lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
          telefon: '+36 30 123 4567',
          email: 'teszt.nemetnev@example.hu',
          taj: '123 456 789',
          kiskoru: false,
          torvenyesKepviselo: null,
        },
        fazisok: [{ sorszam: 1, megnevezes: '1. kezelés', megjegyzes: '', sorok }],
        osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
      },
    }),
  );
}

// D74/D133 (user-döntés, lásd a tervdokumentumot): a hiányzó/eltérő német
// tételnév PUHÁRÓL KEMÉNY blokkra emelve -- a predikátum két javítási út
// szerint bont (`domain/nemetNev.ts` `igazolatlanNemetNevek()`).
describe('PreviewPage -- D74/D133: német tételnév kemény blokk', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'fordítatlan tétel és kézzel átírt, nem review-olt tétel egyaránt hard blokkot ad, két külön csoportban',
    async () => {
      seedGermanNameDraft([
        {
          tetelId: 't1',
          nevSnapshot: 'Fogeltávolítás',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 10000,
          tenylegesEgysegar: 10000,
        },
        {
          tetelId: 't2',
          nevSnapshot: 'Kézzel átírt szöveg',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 5000,
          tenylegesEgysegar: 5000,
          nevNyelv: { authoredInLanguage: 'hu' },
        },
      ]);
      render(<App />);
      window.location.hash = '#/elonezet';

      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      expect(
        await screen.findByText(
          /Ez egy német nyelvű ajánlat, de néhány sor neve nem igazoltan németül kerül a nyomtatványra/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Nincs német nevük az árlistában \(1\): Fogeltávolítás/),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Kézzel írt\/átírt, nyelvileg nem ellenőrzött \(1\): Kézzel átírt szöveg/),
      ).toBeInTheDocument();
      expect(finalizeBtn).toBeDisabled();
    },
    20000,
  );

  it(
    'a "Vissza a szerkesztőbe" gomb a nemet-nev tételről a szerkesztőbe navigál',
    async () => {
      const user = userEvent.setup();
      seedGermanNameDraft([
        {
          tetelId: 't1',
          nevSnapshot: 'Fogeltávolítás',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 10000,
          tenylegesEgysegar: 10000,
        },
      ]);
      render(<App />);
      window.location.hash = '#/elonezet';

      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });
      await user.click(screen.getByRole('button', { name: 'Vissza a szerkesztőbe' }));
      expect(await screen.findByPlaceholderText(/Tétel keresése/)).toBeInTheDocument();
    },
    20000,
  );

  it(
    'igazoltan németül írt egyedi (árlistán kívüli) sor NEM ad hard blokkot',
    async () => {
      seedGermanNameDraft([
        {
          tetelId: '',
          nevSnapshot: 'Egyedi anyagköltség',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 0,
          tenylegesEgysegar: 0,
          nevNyelv: { authoredInLanguage: 'de' },
        },
      ]);
      render(<App />);
      window.location.hash = '#/elonezet';

      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(
        screen.queryByText(/nem igazoltan németül kerül a nyomtatványra/),
      ).not.toBeInTheDocument();
      expect(finalizeBtn).not.toBeDisabled();
    },
    20000,
  );
});

// docs/03-funkcionalis-spec.md § Sablon-placeholder őr (D23): a betöltött
// nyilatkozat placeholder (jogilag még nincs lezárva) esetén a "Csak
// ajánlat" mód kényszerítve/letiltva -- a nyilatkozat és aláírás blokk
// garantáltan kimarad a PDF-ből.
describe('PreviewPage -- nyilatkozat placeholder kemény zár', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'placeholder sablonokkal (pl. jogilag visszavont AI-fordítás) a "Csak ajánlat" bepipálva és letiltva, mindkét Callout látszik',
    async () => {
      const user = userEvent.setup();
      seedGermanPlanWithOneTranslatedItem();
      // A seed v1 sablonok 2026-08-10 óta AI-fordítású, nem placeholder
      // szöveget tartalmaznak (lásd storage/seed/templates.ts) -- a
      // placeholder-kemény-zárat itt egy explicit -v2 placeholderrel
      // szimuláljuk, mintha egy korábban élesített fordítást vissza kellene
      // vonni jogi lektorálásra.
      localStorage.setItem(
        'dp:sablonok/nyilatkozat-de-v2.md',
        '# Erklärung\n\n[PLATZHALTER -- Übersetzung ausstehend]\n',
      );
      localStorage.setItem(
        'dp:sablonok/fizetesi-feltetelek-de-v2.md',
        '# Zahlungsbedingungen\n\n[PLATZHALTER -- Übersetzung ausstehend]\n',
      );
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Placeholder');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'zahnextraktion');
      await user.click(await screen.findByText('Zahnextraktion'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();
      expect(
        await screen.findByText(/A nyilatkozat szövege ezen a nyelven még jogi lektorálásra vár/),
      ).toBeInTheDocument();
      // Mindkét seed DE sablon placeholder -- a fizetési feltételek a
      // meglévő sárga fallback-Callouton át is jelez (2. döntés).
      expect(
        screen.getByText(/A tervhez tartozó sablon nem érhető el a megfelelő nyelven/),
      ).toBeInTheDocument();
    },
    20000,
  );
});

// docs/03-funkcionalis-spec.md § Sablon-placeholder őr: a fizetési feltételek
// placeholderje a meglévő HU-visszaesésbe esik, NEM a nyilatkozat kemény
// zárába -- a "Csak ajánlat" ilyenkor NEM kényszerített.
describe('PreviewPage -- csak a fizetési feltételek placeholder', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'sárga fallback Callout, a "Csak ajánlat" NEM letiltott, véglegesítés végigmegy',
    async () => {
      const user = userEvent.setup();
      seedGermanPlanWithOneTranslatedItem();
      // Egy valódi (nem placeholder) német nyilatkozat -v2 -- a fizetési
      // feltételek marad placeholderen (a seed v1 2026-08-10 óta már nem
      // placeholder, lásd storage/seed/templates.ts -- itt egy explicit
      // -v2 placeholderrel szimuláljuk, mintha egy korábban élesített
      // fordítást vissza kellene vonni jogi lektorálásra).
      localStorage.setItem(
        'dp:sablonok/nyilatkozat-de-v2.md',
        '# Erklärung\n\nEin echter, bereits lektorierter deutscher Text.\n',
      );
      localStorage.setItem(
        'dp:sablonok/fizetesi-feltetelek-de-v2.md',
        '# Zahlungsbedingungen\n\n[PLATZHALTER -- Übersetzung ausstehend]\n',
      );
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Fallback');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'zahnextraktion');
      await user.click(await screen.findByText('Zahnextraktion'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });

      expect(
        await screen.findByText(/A tervhez tartozó sablon nem érhető el a megfelelő nyelven/),
      ).toBeInTheDocument();
      expect(
        screen.queryByText(/A nyilatkozat szövege ezen a nyelven még jogi lektorálásra vár/),
      ).not.toBeInTheDocument();
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      expect(checkbox).not.toBeDisabled();

      const finalizeBtn = screen.getByRole('button', { name: /Véglegesítés és mentés/ });
      // A hiányos páciensadat csak PUHA tétel, és ez az egyetlen ITT
      // teljesen lefordított sor (Zahnextraktion) -- nincs "nemet-nev"
      // hard tétel, a gomb közvetlenül ment.
      expect(finalizeBtn).not.toBeDisabled();
      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

/** Ugyanaz a minta, mint `PlanEditorPage.test.tsx` `seedWithCsomagItem`-je. */
function seedWithCsomagItem() {
  const custom = {
    ...seedPriceList,
    tetelek: seedPriceList.tetelek.map((x) =>
      x.nev.hu === 'Fogeltávolítás' ? { ...x, csomag: true } : x,
    ),
  };
  localStorage.setItem('dp:arlista.json', JSON.stringify(custom));
  localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
}

// docs/02-domain-modell.md § Tétel-leírás: PUHA megerősítő lépés, nem kemény
// blokk -- a doki tudatosan átugorhatja és véglegesíthet leírás nélkül is.
describe('PreviewPage -- backlog-10: hiányzó csomag-leírás megerősítő lépés', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'csomag tételre hivatkozó, üres leírású sor a láncban harmadik lépésként jelenik meg, majd folytatható',
    async () => {
      const user = userEvent.setup();
      seedWithCsomagItem();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Csomag');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // D73: PUHA tétel -- a gombnyomás ELŐTT is látszik, de NEM blokkol.
      expect(await screen.findByText(/csomagtételre hivatkozó soron nincs leírás/)).toBeInTheDocument();
      expect(screen.getByText(/Fogeltávolítás/)).toBeInTheDocument();
      expect(finalizeBtn).not.toBeDisabled();

      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );

  it(
    '"Tétel-leírások nyomtatása" kikapcsolva a lépés kimarad, akkor is, ha van csomag-hiány',
    async () => {
      const user = userEvent.setup();
      seedWithCsomagItem();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Kikapcsolva');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('checkbox', { name: 'Tétel-leírások nyomtatása' }));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // Nincs "hianyzo-leiras" tétel; a hiányos páciensadat csak PUHA
      // tétel -- a gomb közvetlenül ment.
      expect(screen.queryByText(/csomagtételre hivatkozó soron nincs leírás/)).not.toBeInTheDocument();
      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

// backlog-19: névvel ellátott, de 0 Ft-os sor -- PUHA csekklista-tétel
// (D73), a gomb megnyomása előtt is látszik, de nem blokkol (a 0 ár lehet
// szándékos, pl. ingyenes kontroll). A gépel->0 találat->Enter úton felvett egyedi sor
// ("Érzéstelenítés", ugyanaz a minta, mint PlanEditorPage.test.tsx backlog-3
// tesztje) 0 Ft kezdőértékkel jön létre -- ez a fantomsor-eset, amit a tétel
// megfog.
describe('PreviewPage -- backlog-19: 0 Ft-os sorok megerősítő lépése', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'teljesen kitöltött páciensadattal a 0 Ft-os tétel a gombnyomás előtt is látszik, nem blokkol',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));

      // Minden páciensmező kitöltve -- a "Hiányzó páciensadatok" lépés
      // kimarad, hogy a 0 Ft-os dialógus jöjjön elsőként.
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Nulla');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.change(await screen.findByLabelText('Született'), { target: { value: '1990-01-01' } });
      await user.type(screen.getByLabelText('TAJ'), '123 456 789');
      await user.type(
        screen.getByLabelText('Lakcím'),
        '1113 Budapest, Bartók Béla út 42. 2/5',
      );
      await user.type(screen.getByLabelText('Telefon'), '+36 30 123 4567');
      await user.type(screen.getByLabelText('E-mail'), 'teszt.nulla@example.hu');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'Érzéstelenítés');
      await screen.findByText(/Egyedi tétel felvétele/);
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));
      expect(screen.getByDisplayValue('Érzéstelenítés')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      expect(await screen.findByText(/A terv 1 0 Ft-os tételt tartalmaz/)).toBeInTheDocument();
      expect(screen.getByText(/Érintett sorok \(1\): Érzéstelenítés/)).toBeInTheDocument();
      expect(finalizeBtn).not.toBeDisabled();

      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );

  it(
    'hiányos páciensadattal a hiányzó adatok ÉS a 0 Ft-os sorok egyszerre látszanak, egyik sem blokkol',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Lánc');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'Érzéstelenítés');
      await screen.findByText(/Egyedi tétel felvétele/);
      await user.keyboard('{Enter}');
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      expect(
        await screen.findByText(/Néhány páciensadat hiányzik/),
      ).toBeInTheDocument();
      expect(screen.getByText(/A terv 1 0 Ft-os tételt tartalmaz/)).toBeInTheDocument();
      expect(finalizeBtn).not.toBeDisabled();

      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

// backlog-40 (6. döntés, D162/D163): a páciens törzsadata és a terv
// `paciens` pillanatképe közötti eltérés INFO-szintű, nem blokkoló sorként
// jelenik meg -- a véglegesítés önmagában nem kényszerít szinkronizálást.
describe('PreviewPage -- backlog-40: páciens törzsadata info-sáv', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'eltérő törzsadatnál info-Callout jelenik meg, de a véglegesítés emiatt NEM kér megerősítést',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      // A quick-create után a törzsadat még csak a nevet tartalmazza -- a
      // többi mező kitöltése itt egy master<->draft ELTÉRÉS (fill-in), ami
      // az Előnézeten info-sávot ad, de a lépés-elhagyáskor NEM szakítja
      // félbe a workflow-t (`domain/masterSnapshotDiff.ts` `valodiUtkozesek`).
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Info');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.change(await screen.findByLabelText('Született'), { target: { value: '1990-01-01' } });
      await user.type(screen.getByLabelText('TAJ'), '123 456 789');
      await user.type(screen.getByLabelText('Lakcím'), '1113 Budapest, Bartók Béla út 42. 2/5');
      await user.type(screen.getByLabelText('Telefon'), '+36 30 123 4567');
      await user.type(screen.getByLabelText('E-mail'), 'teszt.info@example.hu');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'Fogeltávolítás');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });

      expect(
        await screen.findByText(/A páciens törzsadata \d+ mezőben eltér a terv adataitól/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Telefon/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /Véglegesítés és mentés/ }));

      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );

  it(
    'a "Terv adatai" gomb a törzsadat info-sávból a Terv adatai lapra navigál',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Info2');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.type(await screen.findByLabelText('Telefon'), '+36 30 123 4567');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'Fogeltávolítás');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByText(/A páciens törzsadata \d+ mezőben eltér a terv adataitól/);
      // A hiányos páciensadat (puha) is /paciens-re routolt "Terv adatai"
      // gombot ad -- mindkettő ugyanoda navigál, elég az elsőt kattintani.
      const [terveAdataiGomb] = screen.getAllByRole('button', { name: 'Terv adatai' });
      await user.click(terveAdataiGomb);

      expect(await screen.findByDisplayValue('Teszt Info2')).toBeInTheDocument();
    },
    20000,
  );
});

// backlog-20: a lényegi sanitizálás/előtag-logika a
// storage/paths.test.ts `buildDownloadFileName`-jét fedi -- itt csak azt,
// hogy a "Letöltés" link ténylegesen az ő kimenetét használja.
describe('PreviewPage -- letöltési fájlnév', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a "Letöltés" link download attribútuma a páciensnévvel és PISZKOZAT- előtaggal épül, "Csak ajánlat"-tal -ajanlat végződéssel',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Ilona');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });

      // A terv még nincs véglegesítve -- PISZKOZAT- előtag, "uj" tervId.
      const link = await screen.findByRole('link', { name: 'Letöltés' });
      expect(link).toHaveAttribute('download', 'PISZKOZAT-kezelesi-terv-Teszt-Ilona-uj.pdf');

      await user.click(screen.getByRole('checkbox'));
      expect(link).toHaveAttribute('download', 'PISZKOZAT-kezelesi-terv-Teszt-Ilona-uj-ajanlat.pdf');
    },
    10000,
  );
});

// D75: a "Csak ajánlat" a `Plan.csakAjanlat` mezője, nem helyi React
// state -- navigáció oda-vissza megőrzi, és a mentett terv.json is
// tükrözi a ténylegesen kiadott PDF-et.
describe('PreviewPage -- backlog-70: "Csak ajánlat" mező perzisztencia és véglegesített érték', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a checkbox bepipálása túléli a Kezelések/Előnézet közti oda-vissza navigációt',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Perzisztencia Teszt');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });
      await user.click(screen.getByRole('checkbox'));
      expect(screen.getByRole('checkbox')).toBeChecked();

      await user.click(screen.getByRole('link', { name: 'Kezelések' }));
      await screen.findByDisplayValue('Fogeltávolítás');
      await user.click(screen.getByRole('link', { name: 'Előnézet és véglegesítés' }));
      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });

      expect(screen.getByRole('checkbox')).toBeChecked();
    },
    15000,
  );

  it(
    'véglegesítéskor a bepipált állapot "csakAjanlat: true"-ként mentődik a terv.json-ba',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Mentett Ajánlat Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(screen.getByRole('checkbox'));
      await user.click(finalizeBtn);
      await finalizeThroughConfirms(user);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      const storage = new DemoStorage();
      const patient = (await storage.listPatients()).find((p) => p.nev === 'Mentett Ajánlat Elek')!;
      const [chain] = await storage.listPlans(patient.dirName);
      const [version] = await storage.listVersions(patient.dirName, chain.dirName);
      const saved = await storage.loadPlan({
        patientDir: patient.dirName,
        planDir: chain.dirName,
        versionDir: version.dirName,
      });
      expect(saved.csakAjanlat).toBe(true);
    },
    20000,
  );

  it(
    'placeholder-nyilatkozat miatt kényszerített (kézzel be nem pipált) módban is "csakAjanlat: true"-ként mentődik',
    async () => {
      const user = userEvent.setup();
      seedGermanPlanWithOneTranslatedItem();
      localStorage.setItem(
        'dp:sablonok/nyilatkozat-de-v2.md',
        '# Erklärung\n\n[PLATZHALTER -- Übersetzung ausstehend]\n',
      );
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Kényszerített Ajánlat Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'zahnextraktion');
      await user.click(await screen.findByText('Zahnextraktion'));
      await waitFor(() => expect(search).toHaveValue(''));

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeDisabled();

      await user.click(finalizeBtn);
      await finalizeThroughConfirms(user);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      const storage = new DemoStorage();
      const patient = (await storage.listPatients()).find(
        (p) => p.nev === 'Kényszerített Ajánlat Elek',
      )!;
      const [chain] = await storage.listPlans(patient.dirName);
      const [version] = await storage.listVersions(patient.dirName, chain.dirName);
      const saved = await storage.loadPlan({
        patientDir: patient.dirName,
        planDir: chain.dirName,
        versionDir: version.dirName,
      });
      // A mezőbe a doki soha nem pipálta be kézzel a "Csak ajánlat"-ot --
      // a kényszer (D23) mégis igazként mentődik, mert a ténylegesen
      // kiadott PDF-ből a nyilatkozat és aláírás blokk ugyanúgy kimaradt.
      expect(saved.csakAjanlat).toBe(true);
    },
    20000,
  );
});

// backlog-61 (D70): a puha "price-drift" lépés a lánc ötödik, utolsó tagja --
// itt egyedül fut le, mert a páciensadat teljes, a terv magyar (nincs
// de-fallback-names), a sor nem 0 összegű és nem csomagtétel.
describe('PreviewPage -- backlog-61: árlista-eltérés véglegesítési lépés', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'kézzel felülírt ajánlati ár esetén az "ar-elteres" tétel a gombnyomás előtt is látszik, nem blokkol',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));

      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Árdrift');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.change(await screen.findByLabelText('Született'), { target: { value: '1990-01-01' } });
      await user.type(screen.getByLabelText('TAJ'), '123 456 789');
      await user.type(screen.getByLabelText('Lakcím'), '1113 Budapest, Bartók Béla út 42. 2/5');
      await user.type(screen.getByLabelText('Telefon'), '+36 30 123 4567');
      await user.type(screen.getByLabelText('E-mail'), 'teszt.ardrift@example.hu');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      // Kézi kedvezmény -- a listaár és az ajánlati ár eltér, ez a
      // "price-drift" lépést teszi alkalmazhatóvá (nem az elavult
      // pillanatkép ága).
      const actualPriceInput = screen.getByDisplayValue('25000');
      await user.clear(actualPriceInput);
      await user.type(actualPriceInput, '20000');
      await user.tab();

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(await screen.findByText(/Néhány sor ára eltér a mai árlistától/)).toBeInTheDocument();
      expect(screen.getByText(/Kézzel felülírt ajánlati ár \(1\): Fogeltávolítás/)).toBeInTheDocument();
      expect(finalizeBtn).not.toBeDisabled();

      await user.click(finalizeBtn);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

// 65. tétel (D72) + D74/D133: a "nyelvi-review" PUHA tétel és a "nemet-nev"
// KEMÉNY tétel egyszerre fut le (a sornév kézzel átírva, ami MIND az
// árlistai-fordítás-hiányt, MIND a nyelvi review-t alkalmazhatóvá teszi) --
// és a "Nyelv ellenőrizve" akció mindkettőt egyszerre oldja fel, mert a
// D74 hard blokk predikátuma (`nemetNeveIgazolt()`) is a `nevNyelv`
// review-metaadaton áll.
describe('PreviewPage -- 65. tétel (D72) + D74/D133: nyelvi review és a német tételnév kemény blokk', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a nyelvváltás után kézzel átírt (magyarul maradt) sornév EGYSZERRE ad "nemet-nev" hard és "nyelvi-review" soft tételt; az "Irányított ellenőrzés" a szerkesztőbe visz, a "Nyelv ellenőrizve" mindkettőt feloldja',
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));

      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Nyelvireview');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      fireEvent.change(await screen.findByLabelText('Született'), { target: { value: '1990-01-01' } });
      await user.type(screen.getByLabelText('TAJ'), '123 456 789');
      await user.type(screen.getByLabelText('Lakcím'), '1113 Budapest, Bartók Béla út 42. 2/5');
      await user.type(screen.getByLabelText('Telefon'), '+36 30 123 4567');
      await user.type(screen.getByLabelText('E-mail'), 'teszt.nyelvireview@example.hu');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      await user.type(search, 'fogeltavolitas');
      await user.click(await screen.findByText('Fogeltávolítás'));
      await waitFor(() => expect(search).toHaveValue(''));

      // Kézzel átír a sor nevén MAGYAR dokumentumon -- a metaadat
      // `authoredInLanguage: 'hu'`-ra stampel, ami a MOSTANI (hu) nyelvvel
      // nem mismatch (a szerkesztő ekkor még nem jelez semmit).
      const nameField = screen.getByDisplayValue('Fogeltávolítás');
      await user.clear(nameField);
      await user.type(nameField, 'Kihúzás megbeszélt módon');

      await user.click(screen.getByRole('link', { name: 'Terv adatai' }));
      await screen.findByText('Dokumentum nyelve');
      await user.click(screen.getByRole('radio', { name: 'Deutsch' }));
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

      await user.click(screen.getByRole('link', { name: 'Kezelések' }));
      await screen.findByDisplayValue('Kihúzás megbeszélt módon');
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );

      // D74/D133: KEMÉNY blokk -- a sor kézzel eltér az árlistai német
      // névtől, és a review-metaadat nem a jelenlegi (de) nyelvre igazolt.
      expect(
        await screen.findByText(
          /Ez egy német nyelvű ajánlat, de néhány sor neve nem igazoltan németül kerül a nyomtatványra/,
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Kézzel írt\/átírt, nyelvileg nem ellenőrzött \(1\): Kihúzás megbeszélt módon/),
      ).toBeInTheDocument();
      expect(finalizeBtn).toBeDisabled();

      // 65. tétel (D72): a SAJÁT, ettől független PUHA tétel -- ugyanarra a
      // sorra, más okból.
      expect(
        screen.getByText(/1 kézzel írt szöveg nem biztos, hogy a dokumentum nyelvén helyes/),
      ).toBeInTheDocument();
      expect(screen.getByText(/Sor neve: Kihúzás megbeszélt módon/)).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Irányított ellenőrzés' }));

      // A guided review a szerkesztőbe navigál, a nem-modális sávval, és a
      // sornévhez fókuszál -- nem nyit külön modalt (D469).
      await screen.findByText(/Nyelvi ellenőrzés — még 1 ellenőrizendő/);
      expect(await screen.findByDisplayValue('Kihúzás megbeszélt módon')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Kihúzás megbeszélt módon')).toHaveFocus();

      // "Nyelv ellenőrizve" -- a sáv automatikusan befejeződik, mert nincs
      // több ellenőrizendő szöveg (D468).
      await user.click(screen.getByRole('button', { name: 'Nyelv ellenőrizve' }));
      await waitFor(() =>
        expect(screen.queryByText(/Nyelvi ellenőrzés/)).not.toBeInTheDocument(),
      );

      // A "Nyelv ellenőrizve" (reviewElfogadva) EGYSZERRE oldja fel a
      // "nyelvi-review" puha tételt ÉS a "nemet-nev" hard blokkot -- a
      // predikátum ugyanarra a `nevNyelv` metaadatra épül (domain/nemetNev.ts).
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(
        screen.queryByText(/nem igazoltan németül kerül a nyomtatványra/),
      ).not.toBeInTheDocument();
      expect(finalizeBtn2).not.toBeDisabled();
      await user.click(finalizeBtn2);
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});
