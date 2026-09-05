import { beforeEach, describe, expect, it } from 'vitest';
import { DemoStorage } from '../storage/DemoStorage';
import { ujTervForrasPaciensbol } from './planIndulas';
import type { Plan } from '../domain/types';

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

// 47. tétel: a nyelv/pénznem-öröklés a `ujTervForrasPaciensbol()`
// mindkét ágán (törzsadat és `paciens` pillanatkép) ugyanabból a forrásból
// (a páciens legutóbb VÉGLEGESÍTETT terve) történik.
describe('ujTervForrasPaciensbol -- nyelv/pénznem-öröklés', () => {
  let storage: DemoStorage;

  beforeEach(async () => {
    localStorage.clear();
    storage = new DemoStorage();
    await storage.init();
  });

  it('törzsadat nélküli, egyetlen VEGLEGES tervű páciensnél örökli a terv nyelvét/pénznemét', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const blank = makeBlankPlan();
    const ref = await storage.savePlan(
      makeBlankPlan({ nyelv: 'de', penznem: 'EUR', paciens: { ...blank.paciens, nev: 'Örökös Ottó' } }),
      new Uint8Array([1]),
    );

    const uj = await ujTervForrasPaciensbol(storage, settings, priceList, ref.patientDir);

    expect(uj.nyelv).toBe('de');
    expect(uj.penznem).toBe('EUR');
    expect(uj.paciens.nev).toBe('Örökös Ottó');
  });

  it('terv nélküli, csak törzsadatos páciensnél a globális alapértékre esik vissza', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const folder = await storage.createPatient('Friss Páciens');

    const uj = await ujTervForrasPaciensbol(storage, settings, priceList, folder.dirName);

    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('HUF');
  });

  it('törzsadattal ÉS VEGLEGES tervvel rendelkező páciensnél a törzsadat-ág is örököl', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const folder = await storage.createPatient('Törzsadatos Németh Nóra');
    await storage.savePlan(
      makeBlankPlan({ nyelv: 'de', penznem: 'EUR', paciensId: folder.paciensId }),
      new Uint8Array([1]),
    );

    const uj = await ujTervForrasPaciensbol(storage, settings, priceList, folder.dirName);

    // A paciens blokk a törzsadatból jön (nem a terv pillanatképéből) --
    // csak a nyelv/pénznem-öröklés forrása a terv.
    expect(uj.paciens.nev).toBe('Törzsadatos Németh Nóra');
    expect(uj.nyelv).toBe('de');
    expect(uj.penznem).toBe('EUR');
  });

  it('csak PISZKOZAT (soha nem véglegesített) tervű páciensnél a globális alapértékre esik vissza', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const ref = await storage.savePlan(
      makeBlankPlan({ statusz: 'PISZKOZAT', nyelv: 'de', penznem: 'EUR' }),
      new Uint8Array([1]),
    );

    const uj = await ujTervForrasPaciensbol(storage, settings, priceList, ref.patientDir);

    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('HUF');
  });

  it('egy sérült terv.json mellett sem dob, a globális alapértékre esik vissza', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const folder = await storage.createPatient('Sérült Terv Sára');
    const ref = await storage.savePlan(
      makeBlankPlan({ nyelv: 'de', penznem: 'EUR', paciensId: folder.paciensId }),
      new Uint8Array([1]),
    );
    const key = `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    localStorage.setItem(key, 'not valid json {{{');

    const uj = await ujTervForrasPaciensbol(storage, settings, priceList, folder.dirName);

    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('HUF');
    expect(uj.paciens.nev).toBe('Sérült Terv Sára');
  });

  it('dob, ha a páciensnek sem törzsadata, sem olvasható terve nincs', async () => {
    const settings = await storage.loadSettings();
    const priceList = await storage.loadPriceList();
    const ref = await storage.savePlan(makeBlankPlan(), new Uint8Array([1]));
    const key = `dp:paciensek/${ref.patientDir}/${ref.planDir}/${ref.versionDir}/terv.json`;
    localStorage.setItem(key, 'not valid json {{{');

    await expect(ujTervForrasPaciensbol(storage, settings, priceList, ref.patientDir)).rejects.toThrow(
      'Ehhez a pácienshez nincs sem törzsadata, sem olvasható korábbi terve.',
    );
  });
});
