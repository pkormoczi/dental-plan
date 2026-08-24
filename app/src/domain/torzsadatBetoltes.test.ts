import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DemoStorage } from '../storage/DemoStorage';
import {
  feloldPatientDir,
  feloldTervCimke,
  loadMegjelenitettTorzsadat,
  loadTorzsadatok,
  loadUtolsoTerv,
} from './torzsadatBetoltes';
import type { Plan } from './types';

function makeBlankPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: '',
    verzio: 0,
    statusz: 'VEGLEGES',
    nyelv: 'hu',
    penznem: 'HUF',
    keltezes: '2026-08-05',
    ervenyesIg: '2026-11-03',
    arlistaVerzio: '2026-07-01',
    orvos: 'Dr. Mándoki István',
    paciens: {
      nev: 'Teszt Elek',
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
    ...overrides,
  };
}

describe('torzsadatBetoltes', () => {
  let storage: DemoStorage;

  beforeEach(async () => {
    localStorage.clear();
    storage = new DemoStorage();
    await storage.init();
  });

  describe('loadUtolsoTerv', () => {
    it('a legfrissebb verziót adja vissza, két önálló terv-lánc közül is (D29)', async () => {
      // Nagy Éva seed-adata: b7d2e4 lánc v1 (2026-06-10) + v2 (2026-07-22),
      // és egy MÁSIK lánc, e6f0y3 (2026-08-01) -- ez utóbbi a legfrissebb.
      const patients = await storage.listPatients();
      const nagy = patients.find((p) => p.nev === 'Nagy Éva')!;
      const plan = await loadUtolsoTerv(storage, nagy.dirName);
      expect(plan?.fazisok[0]?.megnevezes).toBe('1. kezelés — szájhigiénia');
    });

    it('null-t ad egy terv nélküli páciensnek', async () => {
      const folder = await storage.createPatient('Terv Nélküli Páciens');
      expect(await loadUtolsoTerv(storage, folder.dirName)).toBeNull();
    });

    it('dob, ha a legfrissebb verzió terv.json-ja sérült', async () => {
      const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
      const key = `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
      localStorage.setItem(key, 'not valid json {{{');
      await expect(loadUtolsoTerv(storage, ref.patientDir)).rejects.toThrow();
    });
  });

  describe('loadMegjelenitettTorzsadat', () => {
    it('a lezárt törzsadatot adja vissza, ha van -- hiba nélkül', async () => {
      const patients = await storage.listPatients();
      const nagy = patients.find((p) => p.nev === 'Nagy Éva')!;
      const result = await loadMegjelenitettTorzsadat(storage, nagy);
      expect(result.hiba).toBeNull();
      expect(result.torzsadat.nev).toBe('Nagy Éva');
    });

    it('törzsadat nélkül a legutóbbi terv paciens pillanatképére esik vissza', async () => {
      const patients = await storage.listPatients();
      const kovacs = patients.find((p) => p.nev === 'Kovács János')!;
      const result = await loadMegjelenitettTorzsadat(storage, kovacs);
      expect(result.hiba).toBeNull();
      expect(result.torzsadat.nev).toBe('Kovács János');
    });

    it('törzsadat és terv nélkül uresTorzsadat-ra esik vissza', async () => {
      const folder = await storage.createPatient('Friss Páciens');
      const result = await loadMegjelenitettTorzsadat(storage, folder);
      expect(result.hiba).toBeNull();
      expect(result.torzsadat.nev).toBe('Friss Páciens');
    });

    it('sosem dob egy sérült paciens-adatok.json esetén -- a hiba mezőben jelenik meg, nem kivételként', async () => {
      const folder = await storage.createPatient('Sérült Törzsadat');
      const key = `dp:paciensek/${folder.dirName}/paciens-adatok.json`;
      localStorage.setItem(key, 'not valid json {{{');

      const result = await loadMegjelenitettTorzsadat(storage, folder);
      expect(result.hiba).not.toBeNull();
      expect(result.torzsadat.nev).toBe('Sérült Törzsadat');
    });
  });

  describe('loadTorzsadatok', () => {
    it('paciens-adatok.json nélküli páciensre is megadja a telefont a legutóbbi terv pillanatképéből', async () => {
      const patients = await storage.listPatients();
      const kovacs = patients.find((p) => p.nev === 'Kovács János')!;
      const eredmeny = await loadTorzsadatok(storage, [kovacs]);
      expect(eredmeny[kovacs.dirName].torzsadat.telefon).toBe('+36 30 123 4567');
    });

    it('dirName szerint kulcsol, egy sérült páciens nem üríti ki a többit', async () => {
      const nagy = (await storage.listPatients()).find((p) => p.nev === 'Nagy Éva')!;
      const serult = await storage.createPatient('Sérült A Listában');
      const key = `dp:paciensek/${serult.dirName}/paciens-adatok.json`;
      localStorage.setItem(key, 'not valid json {{{');

      const eredmeny = await loadTorzsadatok(storage, [nagy, serult]);

      expect(eredmeny[nagy.dirName].hiba).toBeNull();
      expect(eredmeny[nagy.dirName].torzsadat.nev).toBe('Nagy Éva');
      expect(eredmeny[serult.dirName].hiba).not.toBeNull();
      expect(eredmeny[serult.dirName].torzsadat.nev).toBe('Sérült A Listában');
    });
  });

  describe('feloldPatientDir', () => {
    it('a piszkozatPatientDir-t adja vissza, ha ismert -- a paciensId-t meg sem nézi', async () => {
      const dir = await feloldPatientDir(storage, 'Ismert-Dir_x1', 'nem-letezo-id');
      expect(dir).toBe('Ismert-Dir_x1');
    });

    it('piszkozatPatientDir hiányában a paciensId-ből oldja fel a dirName-et', async () => {
      const kovacs = (await storage.listPatients()).find((p) => p.nev === 'Kovács János')!;
      const dir = await feloldPatientDir(storage, null, kovacs.paciensId);
      expect(dir).toBe(kovacs.dirName);
    });

    it('null-t ad, ha sem patientDir, sem paciensId nem ismert', async () => {
      expect(await feloldPatientDir(storage, null, undefined)).toBeNull();
    });

    it('null-t ad, ha a paciensId nem oldható fel egyetlen páciensre sem', async () => {
      expect(await feloldPatientDir(storage, null, 'ismeretlen-id')).toBeNull();
    });
  });

  describe('feloldTervCimke', () => {
    it('üres tervId-nél null-t ad, storage-hívás nélkül (vadonatúj lánc)', async () => {
      const listPatientsSpy = vi.spyOn(storage, 'listPatients');
      const listPlansSpy = vi.spyOn(storage, 'listPlans');
      expect(await feloldTervCimke(storage, 'Ismert-Dir_x1', 'valami-id', '')).toBeNull();
      expect(listPatientsSpy).not.toHaveBeenCalled();
      expect(listPlansSpy).not.toHaveBeenCalled();
    });

    it('feloldja a planDir-t és a (még íratlan, null) tervCim-et a tervId szerint', async () => {
      const nagy = (await storage.listPatients()).find((p) => p.nev === 'Nagy Éva')!;
      const plans = await storage.listPlans(nagy.dirName);
      const lanc = plans.find((p) => p.tervId === 'b7d2e4')!;

      const ref = await feloldTervCimke(storage, nagy.dirName, nagy.paciensId, 'b7d2e4');
      expect(ref).toEqual({ patientDir: nagy.dirName, planDir: lanc.dirName, tervCim: null });
    });

    it('a kézzel mentett terv-cimke.json tartalmát adja vissza', async () => {
      const nagy = (await storage.listPatients()).find((p) => p.nev === 'Nagy Éva')!;
      const plans = await storage.listPlans(nagy.dirName);
      const lanc = plans.find((p) => p.tervId === 'b7d2e4')!;
      await storage.savePlanLabel(nagy.dirName, lanc.dirName, 'Fogpótlás felső ívben');

      const ref = await feloldTervCimke(storage, nagy.dirName, nagy.paciensId, 'b7d2e4');
      expect(ref?.tervCim).toBe('Fogpótlás felső ívben');
    });

    it('null-t ad, ha a tervId egyetlen lánchoz sem tartozik', async () => {
      const nagy = (await storage.listPatients()).find((p) => p.nev === 'Nagy Éva')!;
      expect(await feloldTervCimke(storage, nagy.dirName, nagy.paciensId, 'nincs-ilyen')).toBeNull();
    });

    it('null-t ad, ha a listPlans dob (P1-2 minta, sosem propagál)', async () => {
      const nagy = (await storage.listPatients()).find((p) => p.nev === 'Nagy Éva')!;
      vi.spyOn(storage, 'listPlans').mockRejectedValueOnce(new Error('sérült lánc'));
      expect(await feloldTervCimke(storage, nagy.dirName, nagy.paciensId, 'b7d2e4')).toBeNull();
    });

    it('null-t ad, ha a patientDir feloldhatatlan', async () => {
      expect(await feloldTervCimke(storage, null, 'ismeretlen-id', 'b7d2e4')).toBeNull();
    });
  });
});
