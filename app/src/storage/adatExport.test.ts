import { beforeEach, describe, expect, it } from 'vitest';
import { DemoStorage } from './DemoStorage';
import {
  AdatImportError,
  adatExportFajlnev,
  adatExportOsszeallitasa,
  adatImportEllenoriz,
  exportLegfrissebbSablonjai,
  type AdatExport,
} from './adatExport';

describe('adatExportOsszeallitasa', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a tárolt árlistát, beállításokat és minden sablonfájlt viszi, a doki átírt szövegével', async () => {
    const storage = new DemoStorage();
    await storage.init();
    await storage.saveTemplate('garancia-hu', '# Garancia\n\nSaját garanciaszöveg.\n');

    const adat = await adatExportOsszeallitasa(storage, new Date('2026-11-16T10:00:00Z'));

    expect(Object.keys(adat).sort()).toEqual([
      'arlista',
      'beallitasok',
      'formatum',
      'keszult',
      'sablonok',
      'schemaVersion',
    ]);
    expect(adat.formatum).toBe('dental-plan-export');
    expect(adat.schemaVersion).toBe(1);
    expect(adat.keszult).toBe('2026-11-16T10:00:00.000Z');
    expect(adat.arlista).toEqual(await storage.loadPriceList());
    expect(adat.beallitasok).toEqual(await storage.loadSettings());
    expect(Object.keys(adat.sablonok)).toEqual(await storage.listTemplates());
    expect(adat.sablonok['garancia-hu-v1.md']).toBe('# Garancia\n\nSaját garanciaszöveg.\n');
  });

  it('a fájlnév a napot viseli', () => {
    expect(adatExportFajlnev('2026-11-16')).toBe('kezelesi-terv-export-2026-11-16.json');
  });
});


describe('adatImportEllenoriz', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  async function demoExport(): Promise<AdatExport> {
    const storage = new DemoStorage();
    await storage.init();
    return adatExportOsszeallitasa(storage, new Date('2026-11-16T10:00:00Z'));
  }

  const hibaja = (raw: string) => {
    try {
      adatImportEllenoriz(raw);
    } catch (err) {
      return err;
    }
    throw new Error('nem bukott');
  };

  it('a demó exportja változatlanul átmegy', async () => {
    const adat = await demoExport();

    expect(adatImportEllenoriz(JSON.stringify(adat))).toEqual(adat);
  });

  it('nem JSON fájlra olvasható üzenet jön, a demó visszaállító gombjának említése nélkül', () => {
    const hiba = hibaja('nem json');

    expect(hiba).toBeInstanceOf(AdatImportError);
    expect((hiba as Error).message).toBe('A fájl nem olvasható: nem a demóból exportált fájl, vagy sérült.');
  });

  it('más formátumú JSON-t (például egy árlistát) nem fogad el demó-exportként', async () => {
    const adat = await demoExport();

    expect((hibaja(JSON.stringify(adat.arlista)) as Error).message).toMatch(/nem a demóból exportált adatfájl/);
    expect((hibaja(JSON.stringify({ ...adat, formatum: 'mas' })) as Error).message).toMatch(/nem a demóból exportált/);
    expect((hibaja(JSON.stringify({ ...adat, schemaVersion: 'egy' })) as Error).message).toMatch(/nem a demóból exportált/);
  });

  it('egy újabb alkalmazás exportját frissítési kéréssel elutasítja', async () => {
    const adat = await demoExport();

    const hiba = hibaja(JSON.stringify({ ...adat, schemaVersion: 2 })) as Error;

    expect(hiba).toBeInstanceOf(AdatImportError);
    expect(hiba.message).toMatch(/újabb verziója készítette \(formátumverzió: 2/);
    expect(hiba.message).toMatch(/Frissítsd az asztali alkalmazást/);
  });

  it('az export újabb sémájú árlistáját vagy beállításait elutasítja', async () => {
    const adat = await demoExport();

    const arlista = hibaja(JSON.stringify({ ...adat, arlista: { ...adat.arlista, schemaVersion: 2 } })) as Error;
    const beallitasok = hibaja(JSON.stringify({ ...adat, beallitasok: { ...adat.beallitasok, schemaVersion: 2 } })) as Error;

    expect(arlista.message).toMatch(/arlista\.json fájl az alkalmazás egy újabb verziójával készült/);
    expect(beallitasok.message).toMatch(/beallitasok\.json fájl az alkalmazás egy újabb verziójával készült/);
    expect(arlista.message).not.toMatch(/másik gépen/);
  });

  it('a hibás árlista és a hibás beállítások okát megnevezi', async () => {
    const adat = await demoExport();
    const tetelek = adat.arlista.tetelek.map((t, i) => (i === 0 ? { ...t, id: '' } : t));

    const arlista = hibaja(JSON.stringify({ ...adat, arlista: { ...adat.arlista, tetelek } })) as Error;
    const beallitasok = hibaja(JSON.stringify({ ...adat, beallitasok: { ...adat.beallitasok, orvosok: 'x' } })) as Error;

    expect(arlista.message).toBe('Az export nem tölthető be. A(z) arlista.json fájl szerkezete nem érvényes: tetelek[0].id hiányzik');
    expect(beallitasok.message).toMatch(/beallitasok\.json fájl szerkezete nem érvényes: hiányzik vagy nem tömb az "orvosok" mező/);
  });

  it('a sablonkulcs csak <név>-v<szám>.md lehet: útvonal, nagybetű vagy más kiterjesztés bukik', async () => {
    const adat = await demoExport();

    for (const kulcs of ['../x-v1.md', 'sablonok/x-v1.md', 'Garancia-hu-v1.md', 'garancia-hu.md', 'garancia-hu-v0.md', 'garancia-hu-v1.txt']) {
      const hiba = hibaja(JSON.stringify({ ...adat, sablonok: { ...adat.sablonok, [kulcs]: 'x' } })) as Error;
      expect(hiba, kulcs).toBeInstanceOf(AdatImportError);
      expect(hiba.message).toContain(`„${kulcs}” nem nyomtatvány-szöveg fájlneve`);
    }
  });

  it('a nem szöveg tartalmú sablont és a hiányzó sablonlistát elutasítja', async () => {
    const adat = await demoExport();

    expect((hibaja(JSON.stringify({ ...adat, sablonok: { 'garancia-hu-v1.md': 5 } })) as Error).message).toMatch(
      /„garancia-hu-v1\.md” tartalma nem szöveg/,
    );
    expect((hibaja(JSON.stringify({ ...adat, sablonok: [] })) as Error).message).toMatch(/hiányoznak belőle a nyomtatvány-szövegek/);
  });

  it('az ellenőrzés sorrendje: a formátum hibája előbb jön, mint az árlistáé', async () => {
    const adat = await demoExport();

    const hiba = hibaja(JSON.stringify({ ...adat, formatum: 'mas', arlista: null })) as Error;

    expect(hiba.message).toMatch(/nem a demóból exportált/);
  });
});

describe('exportLegfrissebbSablonjai', () => {
  it('alapnevenként a legmagasabb sorszámú fájlt adja, számként és nem betűrendben összevetve', () => {
    const legfrissebb = exportLegfrissebbSablonjai({
      'garancia-hu-v2.md': 'b',
      'garancia-hu-v10.md': 'c',
      'garancia-hu-v1.md': 'a',
      'nyilatkozat-de-v1.md': 'd',
    });

    expect([...legfrissebb]).toEqual([
      ['garancia-hu', 'garancia-hu-v10.md'],
      ['nyilatkozat-de', 'nyilatkozat-de-v1.md'],
    ]);
  });
});
