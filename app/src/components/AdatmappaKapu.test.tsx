// A telepített app adatmappa-kapuja és záró képernyője. A valódi demó-tároló mellé a
// `useStorage` egy hamis `adattarolas` és `zaras` képességet ad: ez az a jelzés, amire a felület
// a telepített app viselkedését mutatja. A képesség nélküli (Pages) viselkedést a lapok saját
// tesztjei fedik. A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Adattarolas, Zaras } from '../storage/StorageContext';
import type { AdatmappaAllapot, MappaAllapot, MappaVizsgalat } from '../storage/taroloIpc';
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
