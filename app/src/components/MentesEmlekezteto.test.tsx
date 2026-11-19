// A Kezdőlap biztonsági-mentés-emlékeztetője a telepített appban. A valódi demó-tároló mellé a
// `useStorage` hamis `adattarolas` és `biztonsagiMentes` képességet ad (a minta:
// AdatmappaKapu.test.tsx). A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import type { Adattarolas, BiztonsagiMentes } from '../storage/StorageContext';
import type { MentesAllapot } from '../storage/taroloIpc';

const kepesseg = vi.hoisted(() => ({
  adattarolas: null as Adattarolas | null,
  biztonsagiMentes: null as BiztonsagiMentes | null,
}));

vi.mock('../storage/StorageContext', async (eredeti) => {
  const m = await eredeti<typeof import('../storage/StorageContext')>();
  return {
    ...m,
    useStorage: () => ({
      ...m.useStorage(),
      adattarolas: kepesseg.adattarolas,
      biztonsagiMentes: kepesseg.biztonsagiMentes,
    }),
  };
});

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: () => [{ loading: false, error: null, blob: new Blob(['%PDF-fake']), url: 'blob:fake' }, () => {}],
  };
});

const NAP = 86_400_000;

function telepitett(allapot: MentesAllapot, keszit: () => Promise<string | null> = async () => 'mandoki-dental-mentes-2026-11-18.zip') {
  kepesseg.adattarolas = {
    allapot: { ut: 'C:/Mandoki', allapot: 'rendben', hianyzik: [], hosszuUtvonal: false },
    valaszt: vi.fn(async () => null),
    ujraellenoriz: vi.fn(async () => ({ allapot: 'nincs' as const })),
    potol: vi.fn(),
    hasznal: vi.fn(),
    megnyit: vi.fn(async () => {}),
    alapsablonokatPotol: vi.fn(async () => []),
    importElonezet: vi.fn(async () => null),
    importIr: vi.fn(),
    ujratolt: vi.fn(),
  };
  let aktualis = allapot;
  const m = {
    allapot: vi.fn(async () => aktualis),
    keszit: vi.fn(async () => {
      const nev = await keszit();
      if (nev) aktualis = { utolso: new Date().toISOString(), ezenAGepen: true };
      return nev;
    }),
  };
  kepesseg.biztonsagiMentes = m;
  return m;
}

async function kezdolap() {
  render(<App />);
  await screen.findByText('Legutóbbi páciensek', {}, { timeout: 10000 });
}

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
  kepesseg.adattarolas = null;
  kepesseg.biztonsagiMentes = null;
});

describe('biztonsági-mentés-emlékeztető a Kezdőlapon', () => {
  it('mentés nélkül emlékeztet; a „Biztonsági mentés most” ment, és utána az emlékeztető helyén a mentett fájl neve áll', async () => {
    const user = userEvent.setup();
    const m = telepitett({ utolso: null, ezenAGepen: false });
    await kezdolap();

    expect(await screen.findByText(/Még nem készült biztonsági mentés az adatmappáról/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Biztonsági mentés most' }));

    expect(m.keszit).toHaveBeenCalledOnce();
    expect(await screen.findByText('mandoki-dental-mentes-2026-11-18.zip')).toBeInTheDocument();
    expect(screen.getByText(/Elmentve:/)).toBeInTheDocument();
    expect(screen.queryByText(/Még nem készült biztonsági mentés/)).toBeNull();
  });

  it('30 napon belüli mentésnél nincs emlékeztető; a régebbinél a napok száma látszik', async () => {
    telepitett({ utolso: new Date(Date.now() - 10 * NAP).toISOString(), ezenAGepen: true });
    const { unmount } = render(<App />);
    await screen.findByText('Legutóbbi páciensek', {}, { timeout: 10000 });
    await waitFor(() => expect(kepesseg.biztonsagiMentes!.allapot).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: 'Biztonsági mentés most' })).toBeNull();
    unmount();

    telepitett({ utolso: new Date(Date.now() - 40 * NAP).toISOString(), ezenAGepen: false });
    await kezdolap();

    expect(await screen.findByText(/Az utolsó biztonsági mentés 40 napja készült/)).toBeInTheDocument();
  });

  it('az Elrejtés erre a futásra eltünteti: másik lapra és vissza navigálva sem jön vissza', async () => {
    const user = userEvent.setup();
    telepitett({ utolso: null, ezenAGepen: false });
    await kezdolap();

    await user.click(await screen.findByRole('button', { name: 'Elrejtés' }));
    expect(screen.queryByText(/Még nem készült biztonsági mentés/)).toBeNull();

    act(() => {
      window.location.hash = '#/paciensek';
    });
    await screen.findByRole('heading', { name: /Páciensek/ });
    act(() => {
      window.location.hash = '#/';
    });
    await screen.findByText('Legutóbbi páciensek');

    expect(screen.queryByText(/Még nem készült biztonsági mentés/)).toBeNull();
  });

  it('a mentés hibája az emlékeztetőben látszik, és az emlékeztető marad', async () => {
    const user = userEvent.setup();
    telepitett({ utolso: null, ezenAGepen: false }, async () => {
      throw new Error('A mentés nem kerülhet az adatmappába.');
    });
    await kezdolap();

    await user.click(await screen.findByRole('button', { name: 'Biztonsági mentés most' }));

    expect(await screen.findByText('A mentés nem kerülhet az adatmappába.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Biztonsági mentés most' })).toBeInTheDocument();
  });

  it('képesség nélkül (Pages) nincs emlékeztető', async () => {
    await kezdolap();

    expect(screen.queryByText(/biztonsági mentés/i)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Biztonsági mentés most' })).toBeNull();
  });
});
