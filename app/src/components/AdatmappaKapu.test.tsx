// A telepített app adatmappa-kapuja és záró képernyője. A valódi demó-tároló mellé a
// `useStorage` egy hamis `adattarolas` és `zaras` képességet ad: ez az a jelzés, amire a felület
// a telepített app viselkedését mutatja. A képesség nélküli (Pages) viselkedést a lapok saját
// tesztjei fedik. A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Adattarolas, Zaras } from '../storage/StorageContext';
import type { AdatmappaAllapot, ImportMod, ImportOsszegzes, MappaAllapot, MappaVizsgalat } from '../storage/taroloIpc';
import { DRIVE_EMLEKEZTETO } from './adatmappaSzovegek';
import { ZARO_KEPERNYO_MS } from './ZaroKepernyo';

const kepesseg = vi.hoisted(() => ({
  adattarolas: null as Adattarolas | null,
  zaras: null as Zaras | null,
}));

vi.mock('../storage/StorageContext', async (eredeti) => {
  const m = await eredeti<typeof import('../storage/StorageContext')>();
  return {
    ...m,
    useStorage: () => ({ ...m.useStorage(), adattarolas: kepesseg.adattarolas, zaras: kepesseg.zaras }),
  };
});

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [{ loading: false, error: null, blob: new Blob(['%PDF-fake']), url: 'blob:fake' }, () => {}],
  };
});

const UT = 'C:/Users/doki/Google Drive/Mandoki';

function vizsgalat(allapot: MappaAllapot, extra: Partial<MappaVizsgalat> = {}): MappaVizsgalat {
  return { ut: UT, allapot, hianyzik: [], hosszuUtvonal: false, ...extra };
}

function osszegzes(extra: Partial<ImportOsszegzes> = {}): ImportOsszegzes {
  return {
    mod: 'uj',
    keszult: '2026-11-16T10:00:00.000Z',
    tetelSzam: 142,
    arlistaVerzio: '2026-11-10',
    jelenlegiArlistaVerzio: null,
    rendeloNev: 'Export Rendelő',
    sablonSzam: 3,
    potoltSablonSzam: 4,
    ...extra,
  };
}

function hamisAdattarolas(allapot: AdatmappaAllapot, valasztott: MappaVizsgalat | null = null) {
  const a = {
    allapot,
    valaszt: vi.fn(async () => valasztott),
    ujraellenoriz: vi.fn(async (): Promise<AdatmappaAllapot> => vizsgalat('rendben')),
    potol: vi.fn(async () => vizsgalat('rendben')),
    hasznal: vi.fn(async (letrehoz: boolean) =>
      valasztott?.allapot === 'idegen' ? valasztott : vizsgalat(letrehoz || valasztott?.allapot !== 'ures' ? 'rendben' : 'ures'),
    ),
    megnyit: vi.fn(async () => {}),
    alapsablonokatPotol: vi.fn(async () => [] as string[]),
    importElonezet: vi.fn(async (_mod: ImportMod): Promise<ImportOsszegzes | null> => null),
    importIr: vi.fn(async () => vizsgalat('rendben')),
    ujratolt: vi.fn(),
  };
  kepesseg.adattarolas = a;
  return a;
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  kepesseg.adattarolas = null;
  kepesseg.zaras = null;
});

describe('adatmappa-kapu a telepített appban', () => {
  it('első indításkor a varázsló kimondja a mappa-követelményeket, és az app tartalma nem látszik', async () => {
    const a = hamisAdattarolas({ allapot: 'nincs' });
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Válaszd ki az adatmappát' })).toBeInTheDocument();
    expect(screen.getByText(/„Saját meghajtó”/)).toBeInTheDocument();
    expect(screen.getByText(/„Fájlok tükrözése”/)).toBeInTheDocument();
    expect(screen.getByText(/Shared Drive/)).toBeInTheDocument();
    expect(screen.getByText(/Ne a Letöltések mappát válaszd/)).toBeInTheDocument();
    expect(screen.queryByText('Legutóbbi páciensek')).toBeNull();
    expect(a.valaszt).not.toHaveBeenCalled();
  });

  it('üres mappánál a második gépre figyelmeztetve megerősítést kér, és csak a gombra épít új adatmappát', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('ures'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));

    expect(await screen.findByRole('heading', { name: 'Új adatmappa létrehozása' })).toBeInTheDocument();
    expect(screen.getByText(/Ha a másik gépeden már van adatmappa, ne ezt válaszd/)).toBeInTheDocument();
    expect(a.hasznal).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Új adatmappa létrehozása' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(true);
  });

  it('üres mappánál a demó-exportból is építhet: az összegzés a számokat mutatja, és csak a megerősítésre ír', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('ures'));
    a.importElonezet.mockResolvedValue(osszegzes());
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));
    await user.click(await screen.findByRole('button', { name: 'Van egy exportált fájlom a demóból' }));

    const ablak = await screen.findByRole('alertdialog', { name: 'Átvitel a demóból' });
    expect(a.importElonezet).toHaveBeenCalledWith('uj');
    expect(within(ablak).getByText('Az export készült: 2026. november 16.')).toBeInTheDocument();
    expect(within(ablak).getByText('Árlista: 142 tétel, árlista-verzió: 2026-11-10')).toBeInTheDocument();
    expect(within(ablak).getByText('Rendelő: Export Rendelő')).toBeInTheDocument();
    expect(within(ablak).getByText('Nyomtatvány-szövegek: 3 az exportból, 4 a beépítettből')).toBeInTheDocument();
    expect(within(ablak).queryByText(/elvesznek/)).toBeNull();
    expect(a.importIr).not.toHaveBeenCalled();

    await user.click(within(ablak).getByRole('button', { name: 'Adatmappa létrehozása az exportból' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.importIr).toHaveBeenCalledOnce();
    expect(a.hasznal).not.toHaveBeenCalled();
  });

  it('a demó-export összegzésénél a Mégse semmit nem ír, és a varázsló marad', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('ures'));
    a.importElonezet.mockResolvedValue(osszegzes());
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));
    await user.click(await screen.findByRole('button', { name: 'Van egy exportált fájlom a demóból' }));
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(a.importIr).not.toHaveBeenCalled();
    expect(a.ujratolt).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Új adatmappa létrehozása' })).toBeInTheDocument();
  });

  it('hibás exportfájlnál a bukás oka a varázslóban látszik, összegzés és írás nélkül', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('ures'));
    a.importElonezet.mockRejectedValue(new Error('A fájl nem a demóból exportált adatfájl (kezelesi-terv-export-….json).'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));
    await user.click(await screen.findByRole('button', { name: 'Van egy exportált fájlom a demóból' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('A fájl nem a demóból exportált adatfájl');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(a.importIr).not.toHaveBeenCalled();
  });

  it('ha a fájlválasztót bezárja, nincs összegzés és nincs hiba', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('ures'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));
    await user.click(await screen.findByRole('button', { name: 'Van egy exportált fájlom a demóból' }));

    await waitFor(() => expect(a.importElonezet).toHaveBeenCalledOnce());
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('idegen mappát elutasít, és nem vált rá', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('idegen'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));

    expect(await screen.findByText(/nem a Mándoki Dental adatmappája/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Másik mappa kiválasztása' })).toBeInTheDocument();
    expect(a.hasznal).not.toHaveBeenCalled();
    expect(a.ujratolt).not.toHaveBeenCalled();
  });

  it('a már meglévő adatmappára megerősítés nélkül átvált', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas({ allapot: 'nincs' }, vizsgalat('rendben'));
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adatmappa kiválasztása…' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(false);
  });

  it('elérhetetlen beállított mappánál blokkoló képernyő; az Újrapróba csak kattintásra vizsgál, és a megérkezett mappára átvált', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('elerhetetlen', { errno: 'ENOENT' }));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Az adatmappa nem érhető el' })).toBeInTheDocument();
    expect(screen.getByText(/Lehet, hogy a Google Drive még nem szinkronizált/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Másik mappa kiválasztása' })).toBeInTheDocument();
    expect(screen.queryByText('Legutóbbi páciensek')).toBeNull();
    expect(a.ujraellenoriz).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Újrapróba' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.ujraellenoriz).toHaveBeenCalledOnce();
    expect(a.hasznal).toHaveBeenCalledWith(false);
  });

  it('hiányos mappánál a hiányzók a fájlnevükkel látszanak, a pótlás csak megerősítés után fut', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('hianyos', { hianyzik: ['arlista.json', 'sablonok'] }));
    render(<App />);

    expect(await screen.findByText('az árlista (arlista.json)')).toBeInTheDocument();
    expect(screen.getByText('a nyomtatvány-szövegek mappája (sablonok)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Hiányzó alapfájlok létrehozása' }));
    let dialogus = await screen.findByRole('alertdialog');
    expect(within(dialogus).getByText(/Csak akkor folytasd, ha a Google Drive már végzett/)).toBeInTheDocument();
    await user.click(within(dialogus).getByRole('button', { name: 'Mégse' }));
    expect(a.potol).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Hiányzó alapfájlok létrehozása' }));
    dialogus = await screen.findByRole('alertdialog');
    await user.click(within(dialogus).getByRole('button', { name: 'Létrehozás' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.potol).toHaveBeenCalledOnce();
  });

  it('üresnek talált beállított mappánál nem kínál létrehozást, csak újrapróbát és másik mappát', async () => {
    hamisAdattarolas(vizsgalat('ures'));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Az adatmappa üres' })).toBeInTheDocument();
    expect(screen.getByText(/még nem töltötte le/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Újrapróba' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Másik mappa kiválasztása' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Új adatmappa létrehozása' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Van egy exportált fájlom a demóból' })).toBeNull();
  });

  it('a miénk adatmappával az app betölt; a DEMÓ-sáv helyén próbaüzem áll, a DEMO lapon nincs Filerendszer és Adatkezelés', async () => {
    hamisAdattarolas(vizsgalat('rendben'));
    render(<App />);

    expect(await screen.findByText('Legutóbbi páciensek', {}, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('PRÓBAÜZEM')).toBeInTheDocument();
    expect(screen.getByText(/csak kitalált páciensadattal dolgozz/)).toBeInTheDocument();
    expect(screen.queryByText(/csak ebben a böngészőben/)).toBeNull();

    act(() => {
      window.location.hash = '#/demo/filerendszer';
    });

    expect(await screen.findByRole('tab', { name: /Funkciók/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Összes terv/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Változásnapló/ })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Filerendszer/ })).toBeNull();
    expect(screen.queryByRole('tab', { name: /Adatkezelés/ })).toBeNull();
  });
});

describe('záró képernyő', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function hamisZaras() {
    let jelez: (() => void) | null = null;
    const z = {
      figyel: vi.fn((fn: () => void) => {
        jelez = fn;
        return () => {
          jelez = null;
        };
      }),
      kilep: vi.fn(async () => {}),
      jelez: () => act(() => jelez?.()),
    };
    kepesseg.zaras = z;
    return z;
  }

  it('a main jelzésére a Drive-emlékeztető jelenik meg, és a „Bezárás most” azonnal kilép', async () => {
    const user = userEvent.setup();
    hamisAdattarolas(vizsgalat('rendben'));
    const z = hamisZaras();
    render(<App />);
    await screen.findByText('Legutóbbi páciensek', {}, { timeout: 10000 });
    expect(screen.queryByText(DRIVE_EMLEKEZTETO)).toBeNull();

    z.jelez();

    expect(await screen.findByText(DRIVE_EMLEKEZTETO)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bezárás most' }));
    expect(z.kilep).toHaveBeenCalled();
  });

  it('gombnyomás nélkül is kilép a rövid idő leteltével', async () => {
    hamisAdattarolas({ allapot: 'nincs' });
    const z = hamisZaras();
    render(<App />);
    await screen.findByRole('heading', { name: 'Válaszd ki az adatmappát' });
    vi.useFakeTimers();

    z.jelez();
    expect(screen.getByText(DRIVE_EMLEKEZTETO)).toBeInTheDocument();
    expect(z.kilep).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(ZARO_KEPERNYO_MS);
    });

    expect(z.kilep).toHaveBeenCalledOnce();
  });
});
