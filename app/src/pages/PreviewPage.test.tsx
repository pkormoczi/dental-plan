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
      await user.click(finalizeBtn);

      // KEMÉNY blokk -- nincs AlertDialog, a hiba a lapon jelenik meg.
      expect(
        await screen.findByText(/A terv 1 kitöltetlen sort tartalmaz/),
      ).toBeInTheDocument();
      expect(screen.getByText(/1\. kezelés — 16/)).toBeInTheDocument();
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
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

      // Most már folytatható a véglegesítés (a hiányos páciensadat miatt a
      // szokásos, NEM blokkoló megerősítő dialóguson át).
      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn2 = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn2);
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
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
      await user.click(finalizeBtn);
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      expect(localStorage.getItem('dp:piszkozat')).toBeNull();
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
      await finalizeThroughConfirms(user);
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
      await finalizeThroughConfirms(user);

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
      await finalizeThroughConfirms(user);
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
    JSON.stringify({ ...seedSettings, nemetEngedelyezve: true, alapertelmezettNyelv: 'de' }),
  );
}

// docs/03-funkcionalis-spec.md § 4. Előnézet és véglegesítés: a
// véglegesítés megerősítő dialógusa két külön okot sorol fel -- ne
// keveredjenek egy listába.
describe('PreviewPage -- hiányzó és eltérő tételnevek két külön listában', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'a dialógus külön sorolja fel a fordítás nélküli és a kézzel eltérített tételneveket',
    async () => {
      const user = userEvent.setup();
      seedGermanPlanWithOneTranslatedItem();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Elek');
      await user.click(screen.getByRole('button', { name: 'Mentés' }));
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
      await user.click(await screen.findByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

      const search = await screen.findByPlaceholderText(/Tétel keresése/);
      // Fordítás nélküli tétel -- "nincsForditas".
      await user.type(search, 'csatornaszam');
      await user.click(await screen.findByText('Gyökértömés csatornaszámtól függően'));
      await waitFor(() => expect(search).toHaveValue(''));

      // Fordítással rendelkező, de kézzel eltérített tétel -- "elterAzArlistatol".
      await user.type(search, 'zahnextraktion');
      await user.click(await screen.findByText('Zahnextraktion'));
      await waitFor(() => expect(search).toHaveValue(''));
      const nameField = screen.getByDisplayValue('Zahnextraktion');
      await user.clear(nameField);
      await user.type(nameField, 'Kihúzás egyedi megjegyzéssel');

      await user.click(screen.getByRole('button', { name: 'Előnézet' }));
      const finalizeBtn = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await user.click(finalizeBtn);
      // A páciens hiányos (csak a név kitöltött), ezért előbb a
      // "Hiányzó páciensadatok" dialógus jön -- a "Folytatás" a láncban a
      // KÖVETKEZŐ dialógust nyitja meg, nem véglegesít rögtön.
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Tételnevek nem németül')).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Nincs német nevük az árlistában \(1\)/),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Kézzel átírt, eltér az árlistától \(1\)/),
      ).toBeInTheDocument();
    },
    20000,
  );

  it(
    'backlog-23: egy valódi egyedi sor a "nyelvét te írtad" cím alatt szerepel, nem a "nincs német nevük" alatt',
    async () => {
      const user = userEvent.setup();
      seedGermanPlanWithOneTranslatedItem();
      render(<App />);

      await user.click(await screen.findByRole('button', { name: '+ Új kezelési terv' }));
      await user.click(await screen.findByRole('button', { name: '+ Új páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Egyedi');
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
      await user.click(finalizeBtn);
      // A páciens hiányos, ezért előbb a "Hiányzó páciensadatok" dialógus
      // jön -- a "Folytatás" a láncban a KÖVETKEZŐ dialógust nyitja meg.
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Tételnevek nem németül')).toBeInTheDocument();
      expect(
        within(dialog).getByText(/Egyedi, szabad szöveges sor — a nyelvét te írtad \(1\)/),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByText(/Nincs német nevük az árlistában/),
      ).not.toBeInTheDocument();
    },
    20000,
  );
});

// docs/03-funkcionalis-spec.md § Sablon-placeholder őr (D23): a betöltött
// nyilatkozat placeholder (jogilag még nincs lezárva) esetén a "Csak
// ajánlat" mód kényszerítve/letiltva -- a 4. oldal (nyilatkozat + aláírás)
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
      await user.click(finalizeBtn);
      // Csak a hiányos páciensadat-dialógus jön -- ez az egyetlen ITT
      // teljesen lefordított sor (Zahnextraktion), tehát nincs
      // "de-fallback-names" lépés.
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
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
      await user.click(finalizeBtn);

      // A páciens hiányos (csak a név kitöltött) -- előbb a "Hiányzó
      // páciensadatok" dialógus jön, a "Folytatás" a KÖVETKEZŐ lépésre visz.
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('Hiányzó tétel-leírások')).toBeInTheDocument();
      expect(within(dialog).getByText(/Fogeltávolítás/)).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Folytatás' }));
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
      await user.click(finalizeBtn);

      // Csak a hiányos páciensadat-dialógus jön -- nincs "missing-leiras" lépés.
      await user.click(await screen.findByRole('button', { name: 'Folytatás' }));
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );
});

// backlog-19: névvel ellátott, de 0 Ft-os sor -- PUHA megerősítő lépés, a
// doki egy "Folytatás" kattintással túljut rajta (a 0 ár lehet szándékos,
// pl. ingyenes kontroll). A gépel->0 találat->Enter úton felvett egyedi sor
// ("Érzéstelenítés", ugyanaz a minta, mint PlanEditorPage.test.tsx backlog-3
// tesztje) 0 Ft kezdőértékkel jön létre -- ez a fantomsor-eset, amit a tétel
// megfog.
describe('PreviewPage -- backlog-19: 0 Ft-os sorok megerősítő lépése', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
  });

  it(
    'teljesen kitöltött páciensadattal a 0 Ft-os dialógus jön egyenesen, majd folytatható',
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
      await user.click(finalizeBtn);

      const dialog = await screen.findByRole('alertdialog');
      expect(within(dialog).getByText('0 Ft-os tételek')).toBeInTheDocument();
      expect(within(dialog).getByText(/Érintett sorok \(1\)/)).toBeInTheDocument();
      expect(within(dialog).getByText(/Érzéstelenítés/)).toBeInTheDocument();

      await user.click(within(dialog).getByRole('button', { name: 'Folytatás' }));
      await waitFor(() => expect(screen.getByText('A terv elmentve ✓')).toBeInTheDocument());
    },
    20000,
  );

  it(
    'hiányos páciensadattal a lánc előbb a hiányzó adatokat, majd a 0 Ft-os sorokat kéri megerősíteni',
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
      await user.click(finalizeBtn);

      const missingFieldsDialog = await screen.findByRole('alertdialog');
      expect(within(missingFieldsDialog).getByText('Hiányzó páciensadatok')).toBeInTheDocument();
      await user.click(within(missingFieldsDialog).getByRole('button', { name: 'Folytatás' }));

      const zeroPriceDialog = await screen.findByRole('alertdialog');
      expect(within(zeroPriceDialog).getByText('0 Ft-os tételek')).toBeInTheDocument();
      await user.click(within(zeroPriceDialog).getByRole('button', { name: 'Folytatás' }));

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
      await user.click(screen.getByRole('button', { name: 'Terv adatai' }));

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
