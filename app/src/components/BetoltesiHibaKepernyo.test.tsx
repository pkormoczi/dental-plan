// A betöltési hibaképernyő a telepített appban és a demóban. A hibát a valódi demó-tároló
// `loadPriceList`-je adja (sérült árlista); a telepített appot a `useStorage` hamis
// `adattarolas` képessége jelzi (a minta: AdatmappaKapu.test.tsx). A usePDF mockolásának
// indoklása: App.test.tsx fejléckommentje.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Plan } from '../domain/types';
import { DemoStorage } from '../storage/DemoStorage';
import type { Adattarolas } from '../storage/StorageContext';
import { SerultJsonError } from '../storage/taroloHibak';
import type { AdatmappaAllapot, MappaAllapot, MappaVizsgalat } from '../storage/taroloIpc';

const kepesseg = vi.hoisted(() => ({ adattarolas: null as Adattarolas | null }));

vi.mock('../storage/StorageContext', async (eredeti) => {
  const m = await eredeti<typeof import('../storage/StorageContext')>();
  return { ...m, useStorage: () => ({ ...m.useStorage(), adattarolas: kepesseg.adattarolas }) };
});

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [{ loading: false, error: null, blob: new Blob(['%PDF-fake']), url: 'blob:fake' }, () => {}],
  };
});

const HIBA = 'Az arlista.json sérült, nem olvasható.';

function vizsgalat(allapot: MappaAllapot): MappaVizsgalat {
  return { ut: 'D:/Masik/Mandoki', allapot, hianyzik: [], hosszuUtvonal: false };
}

function hamisAdattarolas(valasztott: MappaVizsgalat | null) {
  const a = {
    allapot: { ...vizsgalat('rendben'), ut: 'C:/Mandoki' } as AdatmappaAllapot,
    valaszt: vi.fn(async () => valasztott),
    ujraellenoriz: vi.fn(async (): Promise<AdatmappaAllapot> => vizsgalat('rendben')),
    potol: vi.fn(async () => vizsgalat('rendben')),
    hasznal: vi.fn(async (letrehoz: boolean) => vizsgalat(letrehoz || valasztott?.allapot === 'rendben' ? 'rendben' : 'ures')),
    megnyit: vi.fn(async () => {}),
    alapsablonokatPotol: vi.fn(async () => [] as string[]),
    ujratolt: vi.fn(),
  };
  kepesseg.adattarolas = a;
  return a;
}

function felkeszTerv(): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'PISZKOZAT',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Félkész Elek',
      szuletesiIdo: '1980-01-01',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [],
    osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
  };
}

/** Sérült árlistával indul; `egyszer`-nél a második betöltés már sikerül. */
async function hibasIndulas(opciok: { egyszer?: boolean; piszkozat?: string } = {}) {
  await new DemoStorage().init();
  if (opciok.piszkozat != null) localStorage.setItem('dp:piszkozat', opciok.piszkozat);
  const spy = vi.spyOn(DemoStorage.prototype, 'loadPriceList');
  if (opciok.egyszer) spy.mockRejectedValueOnce(new SerultJsonError('arlista.json', HIBA));
  else spy.mockRejectedValue(new SerultJsonError('arlista.json', HIBA));
  render(<App />);
  expect(await screen.findByText('Nem sikerült betölteni az adatokat', {}, { timeout: 10000 })).toBeInTheDocument();
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  kepesseg.adattarolas = null;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('betöltési hibaképernyő', () => {
  it('a telepített appban a hibaüzenet mellett Újrapróbálás, Mappa megnyitása és Másik mappa kiválasztása látszik; a megnyitás a telepített app műveletét hívja', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(null);
    await hibasIndulas();

    expect(screen.getByText(HIBA)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Újrapróbálás' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Másik mappa kiválasztása' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mappa megnyitása' }));
    expect(a.megnyit).toHaveBeenCalledOnce();
  });

  it('a Másik mappa kiválasztása a meglévő adatmappára kérdés nélkül vált és újratölt', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('rendben'));
    await hibasIndulas();

    await user.click(screen.getByRole('button', { name: 'Másik mappa kiválasztása' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Félkész terv')).toBeNull();
  });

  it('üres mappánál a létrehozás megerősítése jön; a Mégsem semmit nem változtat', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('ures'));
    await hibasIndulas();

    await user.click(screen.getByRole('button', { name: 'Másik mappa kiválasztása' }));
    const dialogus = await screen.findByRole('dialog');
    expect(within(dialogus).getByText(/Ha a másik gépeden már van adatmappa/)).toBeInTheDocument();
    await user.click(within(dialogus).getByRole('button', { name: 'Mégsem' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(a.hasznal).not.toHaveBeenCalled();
    expect(a.ujratolt).not.toHaveBeenCalled();
  });

  it('félkész tervnél előbb megerősítést kér: Mégse-re nem vált és a terv megmarad, igenre elveti és vált', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('rendben'));
    await hibasIndulas({
      piszkozat: JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:15:00.000Z', plan: felkeszTerv() }),
    });

    await user.click(screen.getByRole('button', { name: 'Másik mappa kiválasztása' }));
    let kerdes = await screen.findByRole('alertdialog');
    expect(within(kerdes).getByText(/Mappaváltáskor elvész/)).toBeInTheDocument();
    await user.click(within(kerdes).getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(a.hasznal).not.toHaveBeenCalled();
    expect(localStorage.getItem('dp:piszkozat')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Másik mappa kiválasztása' }));
    kerdes = await screen.findByRole('alertdialog');
    await user.click(within(kerdes).getByRole('button', { name: 'Váltás, a félkész terv elvetésével' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('dp:piszkozat')).toBeNull();
  });

  it('olvashatatlan félkész tervnél is megerősítést kér a váltás előtt', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('rendben'));
    await hibasIndulas({ piszkozat: '{ nem json' });

    await user.click(screen.getByRole('button', { name: 'Másik mappa kiválasztása' }));

    expect(await screen.findByRole('alertdialog')).toBeInTheDocument();
    expect(a.hasznal).not.toHaveBeenCalled();
  });

  it('az Újrapróbálás újratölt, és a sikeres betöltés után az app látszik', async () => {
    const user = userEvent.setup();
    hamisAdattarolas(null);
    await hibasIndulas({ egyszer: true });

    await user.click(screen.getByRole('button', { name: 'Újrapróbálás' }));

    expect(await screen.findByText('Legutóbbi páciensek', {}, { timeout: 10000 })).toBeInTheDocument();
  });

  it('a demóban csak az Újrapróbálás látszik', async () => {
    await hibasIndulas();

    expect(screen.getByRole('button', { name: 'Újrapróbálás' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mappa megnyitása' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Másik mappa kiválasztása' })).toBeNull();
  });
});
