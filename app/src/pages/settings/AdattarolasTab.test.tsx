// A Beállítások Adattárolás füle a telepített appban. A valódi demó-tároló mellé a `useStorage`
// hamis `adattarolas` és `naploMegmutat` képességet ad (a minta: AdatmappaKapu.test.tsx). A
// képesség nélküli (Pages) viselkedés: SettingsPage.test.tsx. A usePDF mockolásának indoklása:
// App.test.tsx fejléckommentje.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { GEPVALTASI_SZABALY } from '../../components/adatmappaSzovegek';
import type { Plan } from '../../domain/types';
import { DemoStorage } from '../../storage/DemoStorage';
import type { Adattarolas } from '../../storage/StorageContext';
import type { AdatmappaAllapot, MappaAllapot, MappaVizsgalat } from '../../storage/taroloIpc';

const kepesseg = vi.hoisted(() => ({
  adattarolas: null as Adattarolas | null,
  naploMegmutat: null as (() => Promise<void>) | null,
}));

vi.mock('../../storage/StorageContext', async (eredeti) => {
  const m = await eredeti<typeof import('../../storage/StorageContext')>();
  return {
    ...m,
    useStorage: () => ({ ...m.useStorage(), adattarolas: kepesseg.adattarolas, naploMegmutat: kepesseg.naploMegmutat }),
  };
});

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [{ loading: false, error: null, blob: new Blob(['%PDF-fake']), url: 'blob:fake' }, () => {}],
  };
});

const JELENLEGI = 'C:/Users/doki/Google Drive/Mandoki';
const MASIK = 'D:/Masik/Mandoki';

function vizsgalat(allapot: MappaAllapot, ut = MASIK): MappaVizsgalat {
  return { ut, allapot, hianyzik: [], hosszuUtvonal: false };
}

function hamisAdattarolas(valasztott: MappaVizsgalat | null) {
  const a = {
    allapot: vizsgalat('rendben', JELENLEGI) as AdatmappaAllapot,
    valaszt: vi.fn(async () => valasztott),
    ujraellenoriz: vi.fn(async (): Promise<AdatmappaAllapot> => vizsgalat('rendben')),
    potol: vi.fn(async () => vizsgalat('rendben')),
    hasznal: vi.fn(async (letrehoz: boolean) => vizsgalat(letrehoz || valasztott?.allapot === 'rendben' ? 'rendben' : 'ures')),
    megnyit: vi.fn(async () => {}),
    alapsablonokatPotol: vi.fn(async () => ['garancia-hu-v1.md']),
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
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. fázis',
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
  };
}

async function adattarolasFul(piszkozattal = false) {
  await new DemoStorage().init();
  if (piszkozattal) {
    localStorage.setItem(
      'dp:piszkozat',
      JSON.stringify({ schemaVersion: 1, mentve: '2026-08-09T10:15:00.000Z', plan: felkeszTerv() }),
    );
  }
  window.location.hash = '#/beallitasok?tab=adattarolas';
  render(<App />);
  const ful = await screen.findByRole('tab', { name: /Adattárolás/ }, { timeout: 10000 });
  expect(ful).toHaveAttribute('aria-selected', 'true');
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  kepesseg.adattarolas = null;
  kepesseg.naploMegmutat = null;
});

describe('Beállítások → Adattárolás a telepített appban', () => {
  it('az aktuális mappát és a gépváltási szabályt mutatja; a megnyitás, a sablon-pótlás és a napló a telepített app műveletét hívja', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(null);
    const naplo = vi.fn(async () => {});
    kepesseg.naploMegmutat = naplo;
    await adattarolasFul();

    expect(screen.getByText(JELENLEGI)).toBeInTheDocument();
    for (const lepes of GEPVALTASI_SZABALY) expect(screen.getByText(lepes)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mappa megnyitása' }));
    expect(a.megnyit).toHaveBeenCalledOnce();

    await user.click(screen.getByRole('button', { name: 'Hiányzó alapsablonok pótlása' }));
    expect(await screen.findByText('Pótolva: garancia-hu-v1.md.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Napló megnyitása' }));
    expect(naplo).toHaveBeenCalledOnce();
  });

  it('félkész terv nélkül a meglévő adatmappára kérdés nélkül vált, és újratölt', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('rendben'));
    await adattarolasFul();

    await user.click(screen.getByRole('button', { name: 'Mappa váltása…' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(false);
    expect(screen.queryByText('Félkész terv')).toBeNull();
  });

  it('félkész tervnél megerősítést kér: Mégse-re nem vált és a terv megmarad, igenre elveti és vált', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('rendben'));
    await adattarolasFul(true);

    await user.click(screen.getByRole('button', { name: 'Mappa váltása…' }));
    let kerdes = await screen.findByRole('alertdialog');
    expect(within(kerdes).getByText(/Mappaváltáskor elvész/)).toBeInTheDocument();
    await user.click(within(kerdes).getByRole('button', { name: 'Mégse' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(a.hasznal).not.toHaveBeenCalled();
    expect(localStorage.getItem('dp:piszkozat')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Mappa váltása…' }));
    kerdes = await screen.findByRole('alertdialog');
    await user.click(within(kerdes).getByRole('button', { name: 'Váltás, a félkész terv elvetésével' }));

    await waitFor(() => expect(a.ujratolt).toHaveBeenCalledOnce());
    expect(a.hasznal).toHaveBeenCalledWith(false);
    expect(localStorage.getItem('dp:piszkozat')).toBeNull();
  });

  it('üres mappára váltáskor a létrehozás megerősítése jön; a Mégsem semmit nem változtat', async () => {
    const user = userEvent.setup();
    const a = hamisAdattarolas(vizsgalat('ures'));
    await adattarolasFul();

    await user.click(screen.getByRole('button', { name: 'Mappa váltása…' }));
    const dialogus = await screen.findByRole('dialog');
    expect(within(dialogus).getByText(/Ha a másik gépeden már van adatmappa/)).toBeInTheDocument();
    await user.click(within(dialogus).getByRole('button', { name: 'Mégsem' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(a.hasznal).not.toHaveBeenCalled();
    expect(a.ujratolt).not.toHaveBeenCalled();
  });
});
