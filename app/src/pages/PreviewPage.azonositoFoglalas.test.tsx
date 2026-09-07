// Az előnézet a PDF renderelése ELŐTT lefoglalja a most kiadandó azonosítót
// (tervId + a lánc következő szabad verziószáma), és a véglegesítés
// UGYANEZT adja a storage-nak -- így a papír fejléce és a mentett terv.json
// nem csúszhat szét. A usePDF mockja itt a `document` propot fogja el: a
// mockolt hookon át a TervDocument-nek ÁTADOTT plan figyelhető meg (a
// TervDocument.test.tsx bizonyítja, hogy a fejléc ebből a plan-ből épül).
// A usePDF mockolásának indoklása: App.test.tsx fejléckommentje.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { DemoStorage } from '../storage/DemoStorage';
import { seedPriceList } from '../storage/seed/priceList';
import { seedSettings } from '../storage/seed/settings';
import type { Plan } from '../domain/types';

const pdfMock = vi.hoisted(() => ({ lastDocument: null as unknown }));

vi.mock('@react-pdf/renderer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-pdf/renderer')>();
  return {
    ...actual,
    usePDF: (opts?: { document?: unknown }) => {
      if (opts?.document) pdfMock.lastDocument = opts.document;
      return [
        {
          loading: false,
          error: null,
          blob: new Blob(['%PDF-fake'], { type: 'application/pdf' }),
          url: 'blob:fake-preview-url',
        },
        (doc: unknown) => {
          if (doc) pdfMock.lastDocument = doc;
        },
      ];
    },
  };
});

/** A nyomtatványnak ÁTADOTT plan -- ebből épül a fejléc `tervId · v<n>` sora. */
function nyomtatvanyPlan(): Plan {
  return (pdfMock.lastDocument as { props: { plan: Plan } }).props.plan;
}

function planSablon(overrides: Partial<Plan> = {}): Plan {
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
      nev: 'Foglalás Elek',
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
    ...overrides,
  };
}

function seedDraft(plan: Plan, patientDir?: string) {
  localStorage.setItem(
    'dp:piszkozat',
    JSON.stringify({
      schemaVersion: 1,
      mentve: '2026-08-09T10:15:00.000Z',
      ...(patientDir ? { patientDir } : {}),
      plan,
    }),
  );
}

/** Egy `verziok` hosszú, lemezre mentett lánc a `DemoStorage`-on át. */
async function seedLanc(
  verziok: number,
): Promise<{ storage: DemoStorage; mentett: Plan; patientDir: string }> {
  const storage = new DemoStorage();
  await storage.init();
  let ref = await storage.savePlan(planSablon({ statusz: 'VEGLEGES' }), new Uint8Array([1]));
  let mentett = await storage.loadPlan(ref);
  for (let i = 2; i <= verziok; i++) {
    ref = await storage.savePlan({ ...mentett, verzio: 0 }, new Uint8Array([i]));
    mentett = await storage.loadPlan(ref);
  }
  return { storage, mentett, patientDir: ref.patientDir };
}

describe('PreviewPage -- az azonosító előzetes lefoglalása', () => {
  beforeEach(() => {
    localStorage.clear();
    window.location.hash = '';
    pdfMock.lastDocument = null;
  });

  it(
    'vadonatúj láncnál a nyomtatvány v1-et kap, és a véglegesítés UGYANAZZAL a tervId-vel hozza létre a terv-mappát',
    async () => {
      const user = userEvent.setup();
      localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
      localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
      seedDraft(planSablon());
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await waitFor(() => expect(nyomtatvanyPlan().tervId).toMatch(/^[a-z0-9]{6}$/));
      const foglaltId = nyomtatvanyPlan().tervId;
      expect(nyomtatvanyPlan().verzio).toBe(1);

      await waitFor(() => expect(gomb).not.toBeDisabled());
      await user.click(gomb);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      const storage = new DemoStorage();
      const patient = (await storage.listPatients()).find((p) => p.nev === 'Foglalás Elek')!;
      const [chain] = await storage.listPlans(patient.dirName);
      expect(chain.tervId).toBe(foglaltId);
      const versions = await storage.listVersions(patient.dirName, chain.dirName);
      const mentett = await storage.loadPlan({
        patientDir: patient.dirName,
        planDir: chain.dirName,
        versionDir: versions[0].dirName,
      });
      expect(mentett.tervId).toBe(foglaltId);
      expect(mentett.verzio).toBe(1);
    },
    20000,
  );

  it(
    'egy v1-ből nyitott új verzió papírján v2 áll, és a mentett terv.json is v2',
    async () => {
      const user = userEvent.setup();
      const { mentett, patientDir } = await seedLanc(1);
      seedDraft({ ...mentett, statusz: 'PISZKOZAT' }, patientDir);
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      await waitFor(() => expect(nyomtatvanyPlan().verzio).toBe(2));
      expect(nyomtatvanyPlan().tervId).toBe(mentett.tervId);

      await waitFor(() => expect(gomb).not.toBeDisabled());
      await user.click(gomb);
      await screen.findByText('A terv elmentve ✓', {}, { timeout: 10000 });

      const storage = new DemoStorage();
      const [chain] = await storage.listPlans(patientDir);
      const versions = await storage.listVersions(patientDir, chain.dirName);
      expect(versions.map((v) => v.verzio)).toEqual([1, 2]);
      const v2 = await storage.loadPlan({
        patientDir,
        planDir: chain.dirName,
        versionDir: versions[1].dirName,
      });
      expect(v2.verzio).toBe(2);
      expect(v2.tervId).toBe(mentett.tervId);
    },
    20000,
  );

  it(
    'egy lánc RÉGEBBI verziójából nyitott új verzió a lánc következő szabad számát kapja, nem forrás+1-et',
    async () => {
      const { patientDir, storage } = await seedLanc(2);
      const [chain] = await storage.listPlans(patientDir);
      const versions = await storage.listVersions(patientDir, chain.dirName);
      const v1 = await storage.loadPlan({
        patientDir,
        planDir: chain.dirName,
        versionDir: versions[0].dirName,
      });
      expect(v1.verzio).toBe(1); // a FORRÁS az első verzió -- forrás+1 = v2 lenne

      seedDraft({ ...v1, statusz: 'PISZKOZAT' }, patientDir);
      render(<App />);
      window.location.hash = '#/elonezet';

      await screen.findByRole('button', { name: /Véglegesítés és mentés/ }, { timeout: 10000 });
      await waitFor(() => expect(nyomtatvanyPlan().verzio).toBe(3));
    },
    20000,
  );

  it(
    'feloldhatatlan foglalásnál nincs kiadható papír: a Letöltés és a véglegesítés zárva, a doki magyarázatot kap',
    async () => {
      localStorage.setItem('dp:arlista.json', JSON.stringify(seedPriceList));
      localStorage.setItem('dp:beallitasok.json', JSON.stringify(seedSettings));
      // Nem létező láncra hivatkozó piszkozat -- a mappák nem oldhatók fel.
      seedDraft(planSablon({ tervId: 'zzz999', paciensId: 'nincs1' }));
      render(<App />);
      window.location.hash = '#/elonezet';

      const gomb = await screen.findByRole(
        'button',
        { name: /Véglegesítés és mentés/ },
        { timeout: 10000 },
      );
      expect(await screen.findByText(/A terv azonosítója nem oldható fel/)).toBeInTheDocument();
      await waitFor(() => expect(gomb).toBeDisabled());
      expect(screen.queryByRole('link', { name: 'Letöltés' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Azonosító hiányzik' })).toBeDisabled();
    },
    20000,
  );
});
