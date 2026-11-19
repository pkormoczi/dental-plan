import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { seedPriceList } from '../src/storage/seed/priceList';
import { IMPORT_ELONEZET_CSATORNA, IMPORT_IR_CSATORNA, type IpcEredmeny } from '../src/storage/taroloIpc';
import { Adatmappa } from './adatmappa';
import { demoImportKezelok, IMPORT_MAX_MERET } from './demoImport';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek } from './fsPrimitivek';
import { kuldoEllenor, type KuldoEsemeny } from './ipcKezelok';
import { tesztExport } from './tesztExport';

const ORIGIN = 'app://mandoki-dental';
const foFrame = { url: `${ORIGIN}/index.html` };
const kuldoEngedett = kuldoEllenor(() => ({ webContents: { mainFrame: foFrame } }), ORIGIN);
const sajat: KuldoEsemeny = { senderFrame: foFrame };
const idegen: KuldoEsemeny = { senderFrame: { url: `${ORIGIN}/index.html` } };

const mappak: string[] = [];
afterAll(async () => {
  await Promise.all(mappak.map((m) => fsp.rm(m, { recursive: true, force: true })));
});
async function ujMappa(): Promise<string> {
  const m = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-import-'));
  mappak.push(m);
  return m;
}

async function exportFajl(tartalom: string = JSON.stringify(tesztExport())): Promise<string> {
  const ut = path.join(await ujMappa(), 'kezelesi-terv-export-2026-11-16.json');
  await fsp.writeFile(ut, tartalom);
  return ut;
}

type Kezelo = (e: KuldoEsemeny, ...args: unknown[]) => Promise<unknown>;

/** Az import csatornái egy valódi `Adatmappa` fölött; a fájlválasztó a megadott utat adja. */
async function kornyezet(opciok: { mappa?: string; fajl?: string | null; aktiv?: boolean } = {}) {
  const mappa = opciok.mappa ?? (await ujMappa());
  const adatmappa = new Adatmappa({
    userData: await ujMappa(),
    mappatValaszt: async () => mappa,
    primetNyit: (g) => new FsPrimitivek(g, { kesleltet: async () => {} }),
    ujGepId: () => 'gep-1',
  });
  await adatmappa.indul();
  await adatmappa.valaszt();
  if (opciok.aktiv) await adatmappa.hasznal(false);
  const fajl = opciok.fajl === undefined ? await exportFajl() : opciok.fajl;
  const kezelok = new Map<string, Kezelo>();
  let irasok = 0;
  let valasztasok = 0;
  demoImportKezelok(
    { handle: (c, k) => void kezelok.set(c, k) },
    adatmappa,
    kuldoEngedett,
    { fajltValaszt: async () => (valasztasok++, fajl) },
    () => irasok++,
  );
  const hiv = <T>(c: string, ...args: unknown[]) => kezelok.get(c)!(sajat, ...args) as Promise<IpcEredmeny<T>>;
  return { mappa, adatmappa, hiv, kezelok, irasok: () => irasok, valasztasok: () => valasztasok };
}

async function sajatAdatmappa(): Promise<string> {
  const gyoker = await ujMappa();
  await new FileSystemStorage(new FsPrimitivek(gyoker)).adatmappatLetrehoz();
  return gyoker;
}

describe('demó-import csatornái', () => {
  it('üres mappánál az előnézet írás nélkül az export számait adja; a megerősítés után az exportból épül az adatmappa, és a kilépés emlékeztetni fog', async () => {
    const k = await kornyezet();

    const elonezet = await k.hiv(IMPORT_ELONEZET_CSATORNA, 'uj');

    expect(elonezet).toEqual({
      ok: true,
      ertek: {
        mod: 'uj',
        keszult: '2026-11-16T10:00:00.000Z',
        tetelSzam: seedPriceList.tetelek.length,
        arlistaVerzio: '2026-11-10',
        jelenlegiArlistaVerzio: null,
        rendeloNev: 'Export Rendelő',
        sablonSzam: 3,
        potoltSablonSzam: 4,
      },
    });
    expect(await fsp.readdir(k.mappa)).toEqual([]);
    expect(k.irasok()).toBe(0);

    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: true, ertek: { allapot: 'rendben', ut: k.mappa } });

    expect((await fsp.readdir(k.mappa)).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
    expect((await k.adatmappa.tarolo!.loadSettings()).rendelo.nev).toBe('Export Rendelő');
    expect(k.irasok()).toBe(1);
  });

  it('egy előnézet csak egyszer írható: a második írás és az előnézet nélküli írás elutasítva', async () => {
    const k = await kornyezet();

    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: false, hiba: { kod: 'ERVENYTELEN_PARAMETER' } });
    await k.hiv(IMPORT_ELONEZET_CSATORNA, 'uj');
    await k.hiv(IMPORT_IR_CSATORNA);
    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: false, hiba: { kod: 'ERVENYTELEN_PARAMETER' } });
  });

  it('hibás fájlnál az előnézet a bukás okát adja, és utána írás sem indul: a mappa üres marad', async () => {
    const k = await kornyezet({ fajl: await exportFajl(JSON.stringify({ ...tesztExport(), formatum: 'mas' })) });

    const elonezet = await k.hiv(IMPORT_ELONEZET_CSATORNA, 'uj');

    expect(elonezet).toMatchObject({ ok: false, hiba: { kod: 'EGYEB', uzenet: expect.stringMatching(/nem a demóból exportált/) } });
    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: false, hiba: { kod: 'ERVENYTELEN_PARAMETER' } });
    expect(await fsp.readdir(k.mappa)).toEqual([]);
    expect(k.irasok()).toBe(0);
  });

  it('nem létező és túl nagy fájlt olvasható üzenettel elutasít', async () => {
    const nincs = await kornyezet({ fajl: path.join(await ujMappa(), 'nincs-ilyen.json') });
    const nagy = await kornyezet({ fajl: await exportFajl('x'.repeat(IMPORT_MAX_MERET + 1)) });

    expect(await nincs.hiv(IMPORT_ELONEZET_CSATORNA, 'uj')).toMatchObject({
      ok: false,
      hiba: { uzenet: 'A választott fájl nem olvasható.' },
    });
    expect(await nagy.hiv(IMPORT_ELONEZET_CSATORNA, 'uj')).toMatchObject({
      ok: false,
      hiba: { uzenet: expect.stringMatching(/túl nagy/) },
    });
  });

  it('bezárt dialógusnál nincs összegzés és nincs írás', async () => {
    const k = await kornyezet({ fajl: null });

    expect(await k.hiv(IMPORT_ELONEZET_CSATORNA, 'uj')).toEqual({ ok: true, ertek: null });
    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: false });
    expect(await fsp.readdir(k.mappa)).toEqual([]);
  });

  it('a csatornák idegen küldőt és ismeretlen módot elutasítanak, a fájlválasztó meg sem nyílik', async () => {
    const k = await kornyezet();

    expect(await k.kezelok.get(IMPORT_ELONEZET_CSATORNA)!(idegen, 'uj')).toMatchObject({ ok: false, hiba: { kod: 'TILTOTT_KULDO' } });
    expect(await k.kezelok.get(IMPORT_IR_CSATORNA)!(idegen)).toMatchObject({ ok: false, hiba: { kod: 'TILTOTT_KULDO' } });
    expect(await k.hiv(IMPORT_ELONEZET_CSATORNA, 'mind')).toMatchObject({ ok: false, hiba: { kod: 'ERVENYTELEN_PARAMETER' } });
    expect(k.valasztasok()).toBe(0);
  });

  it('a közben nem üressé vált mappába nem ír, és olvasható hibát ad', async () => {
    const k = await kornyezet();
    await k.hiv(IMPORT_ELONEZET_CSATORNA, 'uj');
    await fsp.writeFile(path.join(k.mappa, 'Dokumentum.docx'), 'x');

    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({
      ok: false,
      hiba: { uzenet: expect.stringMatching(/már nem üres: az import nem írt bele/) },
    });
    expect(await fsp.readdir(k.mappa)).toEqual(['Dokumentum.docx']);
    expect(k.irasok()).toBe(0);
  });

  it('a használt mappában az összegzés a mostani árlista-verziót és a pótlandó alapsablonokat is mutatja; az írás lecseréli az árlistát', async () => {
    const mappa = await sajatAdatmappa();
    await fsp.rm(path.join(mappa, 'sablonok', 'garancia-de-v1.md'));
    const k = await kornyezet({ mappa, aktiv: true });

    expect(await k.hiv(IMPORT_ELONEZET_CSATORNA, 'csere')).toMatchObject({
      ok: true,
      ertek: { mod: 'csere', jelenlegiArlistaVerzio: seedPriceList.arlistaVerzio, arlistaVerzio: '2026-11-10', potoltSablonSzam: 1 },
    });
    expect(await k.hiv(IMPORT_IR_CSATORNA)).toMatchObject({ ok: true, ertek: { allapot: 'rendben', ut: mappa } });

    expect((await k.adatmappa.tarolo!.loadPriceList()).arlistaVerzio).toBe('2026-11-10');
    expect(await fsp.readdir(path.join(mappa, 'sablonok'))).toContain('garancia-de-v1.md');
    expect(k.irasok()).toBe(1);
  });

  it('a használt mappa cseréje megnyitott adatmappa nélkül hibát ad, a fájlválasztó meg sem nyílik', async () => {
    const k = await kornyezet();

    expect(await k.hiv(IMPORT_ELONEZET_CSATORNA, 'csere')).toMatchObject({ ok: false, hiba: { uzenet: 'Nincs megnyitott adatmappa.' } });
    expect(k.valasztasok()).toBe(0);
  });
});
