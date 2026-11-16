import { beforeEach, describe, expect, it } from 'vitest';
import { DemoStorage } from './DemoStorage';
import { adatExportFajlnev, adatExportOsszeallitasa } from './adatExport';

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
