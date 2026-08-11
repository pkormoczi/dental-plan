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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Ilona');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Piszkozat Béla');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Elek');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Placeholder');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Fallback');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Csomag');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      const nameInput = await screen.findByPlaceholderText('Kovács János');
      await user.type(nameInput, 'Teszt Kikapcsolva');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));

      // Minden páciensmező kitöltve -- a "Hiányzó páciensadatok" lépés
      // kimarad, hogy a 0 Ft-os dialógus jöjjön elsőként.
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Nulla');
      fireEvent.change(screen.getByLabelText('Született'), { target: { value: '1990-01-01' } });
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

      await user.click(await screen.findByRole('button', { name: 'Új terv indítása' }));
      await user.click(await screen.findByRole('button', { name: 'Vadonatúj páciens' }));
      await user.type(await screen.findByPlaceholderText('Kovács János'), 'Teszt Lánc');
      await user.click(screen.getByRole('button', { name: 'Tovább a terv szerkesztőhöz' }));

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
