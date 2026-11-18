import { createWriteStream, promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { open as zipNyit, type Entry, type ZipFile } from 'yauzl';
import { makeBlankPlan } from '../src/storage/szerzodesTesztek';
import { MENTES_ALLAPOT_CSATORNA, MENTES_KESZIT_CSATORNA, type IpcEredmeny } from '../src/storage/taroloIpc';
import { MENTES_INDEX_FAJL, mentesKezelok, zipbeIr, type MentesForras, type MentesRendszer } from './biztonsagiMentes';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek } from './fsPrimitivek';
import { kuldoEllenor, type KuldoEsemeny } from './ipcKezelok';
import { gyokerNaplozo, Naplo } from './naplo';

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
  const m = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-mentes-'));
  mappak.push(m);
  return m;
}

async function listazRekurziv(gyoker: string): Promise<string[]> {
  const bejegyzesek = await fsp.readdir(gyoker, { recursive: true, withFileTypes: true });
  return bejegyzesek
    .filter((d) => d.isFile())
    .map((d) => path.relative(gyoker, path.join(d.parentPath, d.name)).split(path.sep).join('/'))
    .sort();
}

/** Adatmappa egy ékezetes nevű páciens teljes verziójával, plusz szemét, amit a mentés kihagy. */
async function adatmappa() {
  const gyoker = await ujMappa();
  const prim = new FsPrimitivek(gyoker, { kesleltet: async () => {} });
  const tarolo = new FileSystemStorage(prim, { gepId: 'gep-sajat' });
  await tarolo.adatmappatLetrehoz();
  const p = await tarolo.createPatient('Kovács János');
  await tarolo.savePlan(makeBlankPlan({ paciensId: p.paciensId }), new Uint8Array([1, 2, 3]));
  const mentendo = await listazRekurziv(gyoker);
  await fsp.mkdir(path.join(gyoker, 'paciensek', p.dirName, '.tmp-2026-08-05_v2-abc123'), { recursive: true });
  await fsp.writeFile(path.join(gyoker, 'paciensek', p.dirName, '.tmp-2026-08-05_v2-abc123', 'terv.json'), '{}');
  await fsp.writeFile(path.join(gyoker, 'arlista.json.tmp-0a1b2c3d'), 'félkész');
  await fsp.writeFile(path.join(gyoker, 'desktop.ini'), 'x');
  await fsp.writeFile(path.join(gyoker, '.DS_Store'), 'x');
  return { gyoker, prim, tarolo, mentendo };
}

function zipBejegyzesek(zipUt: string): Promise<Array<{ nev: string; tartalom: Buffer }>> {
  return new Promise((resolve, reject) => {
    zipNyit(zipUt, { lazyEntries: true }, (err, zip?: ZipFile) => {
      if (err || !zip) return reject(err);
      const eredmeny: Array<{ nev: string; tartalom: Buffer }> = [];
      zip.on('entry', (entry: Entry) => {
        zip.openReadStream(entry, (err2, stream) => {
          if (err2 || !stream) return reject(err2);
          const darabok: Buffer[] = [];
          stream.on('data', (d: Buffer) => darabok.push(d));
          stream.on('end', () => {
            eredmeny.push({ nev: entry.fileName, tartalom: Buffer.concat(darabok) });
            zip.readEntry();
          });
        });
      });
      zip.on('end', () => resolve(eredmeny));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

async function kibont(zipUt: string, cel: string): Promise<void> {
  for (const { nev, tartalom } of await zipBejegyzesek(zipUt)) {
    const ut = path.join(cel, ...nev.split('/'));
    await fsp.mkdir(path.dirname(ut), { recursive: true });
    await new Promise<void>((resolve, reject) => {
      const ki = createWriteStream(ut);
      ki.on('error', reject).on('close', () => resolve());
      ki.end(tartalom);
    });
  }
}

describe('ZIP-be mentés', () => {
  it('a ZIP az adatmappa minden fájlját tartalmazza, az ékezetes páciensmappa nevével, a temp-maradványok és az OS-szemét nélkül', async () => {
    const { gyoker, mentendo } = await adatmappa();
    const cel = path.join(await ujMappa(), 'mentes.zip');

    const darab = await zipbeIr(gyoker, cel);

    const nevek = (await zipBejegyzesek(cel)).map((b) => b.nev).sort();
    expect(nevek).toEqual(mentendo);
    expect(darab).toBe(mentendo.length);
    expect(nevek.some((n) => n.startsWith('paciensek/Kovács-János_'))).toBe(true);
    expect(nevek.filter((n) => /\.tmp-|desktop\.ini|\.DS_Store/.test(n))).toEqual([]);
  });

  it('egy üres mappába kibontva az app a miénkként ismeri fel, és minden verzió teljes', async () => {
    const { gyoker } = await adatmappa();
    const cel = path.join(await ujMappa(), 'mentes.zip');
    await zipbeIr(gyoker, cel);
    const visszaallitott = await ujMappa();

    await kibont(cel, visszaallitott);

    const tarolo = new FileSystemStorage(new FsPrimitivek(visszaallitott, { kesleltet: async () => {} }));
    expect((await tarolo.osztalyoz()).allapot).toBe('mienk');
    await tarolo.init();
    const [paciens] = await tarolo.listPatients();
    expect(paciens.nev).toBe('Kovács János');
    const [lanc] = await tarolo.listPlans(paciens.dirName);
    const verziok = await tarolo.listVersions(paciens.dirName, lanc.dirName);
    expect(verziok.length).toBeGreaterThan(0);
    expect(verziok.every((v) => v.allapot === 'teljes')).toBe(true);
  });

  it('ha az átnevezés elhasal, a célhelyen nem marad sem ZIP, sem félkész temp fájl', async () => {
    const { gyoker } = await adatmappa();
    const celMappa = await ujMappa();
    const hibasFs = {
      rename: (async () => {
        throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
      }) as typeof fsp.rename,
    };

    await expect(zipbeIr(gyoker, path.join(celMappa, 'mentes.zip'), hibasFs)).rejects.toMatchObject({ errno: 'EACCES' });

    expect(await fsp.readdir(celMappa)).toEqual([]);
  });
});

describe('mentés csatornái', () => {
  type Kezelo = (e: KuldoEsemeny) => Promise<unknown>;

  async function kornyezet(opciok: { cel?: string | null; gepId?: string; rendszer?: Partial<MentesRendszer> } = {}) {
    const { gyoker, prim } = await adatmappa();
    const celMappa = await ujMappa();
    const cel = opciok.cel === undefined ? path.join(celMappa, 'mandoki-dental-mentes-2026-11-18.zip') : opciok.cel;
    const kezelok = new Map<string, Kezelo>();
    let irasok = 0;
    const naplo = new Naplo(path.join(await ujMappa(), 'naplo'));
    const forras: MentesForras = {
      gyoker: () => gyoker,
      gepId: () => opciok.gepId ?? 'gep-sajat',
      olvas: (rel) => prim.olvasSzoveg(rel),
      ir: (rel, t) => prim.irSzoveg(rel, t),
    };
    const javasoltNevek: string[] = [];
    mentesKezelok(
      { handle: (c, k) => void kezelok.set(c, k) },
      forras,
      kuldoEngedett,
      {
        helyetValaszt: async (nev) => (javasoltNevek.push(nev), cel),
        most: () => new Date(2026, 10, 18, 10, 0),
        ...opciok.rendszer,
      },
      () => irasok++,
      gyokerNaplozo(naplo, gyoker),
    );
    const hiv = <T>(c: string, e: KuldoEsemeny = sajat) => kezelok.get(c)!(e) as Promise<IpcEredmeny<T>>;
    const naploSzoveg = async () => {
      await naplo.ir({ muvelet: 'zaras', kod: 'X' });
      return fsp.readFile(naplo.fajl, 'utf8');
    };
    return { gyoker, celMappa, cel, hiv, irasok: () => irasok, javasoltNevek, naploSzoveg };
  }

  it('siker után a mentett fájl neve jön vissza, az index frissül ezen a gépen, és a kilépés emlékeztetni fog', async () => {
    const k = await kornyezet();
    expect(await k.hiv(MENTES_ALLAPOT_CSATORNA)).toEqual({ ok: true, ertek: { utolso: null, ezenAGepen: false } });

    expect(await k.hiv(MENTES_KESZIT_CSATORNA)).toEqual({ ok: true, ertek: 'mandoki-dental-mentes-2026-11-18.zip' });

    expect(k.javasoltNevek).toEqual(['mandoki-dental-mentes-2026-11-18.zip']);
    await expect(fsp.stat(k.cel!)).resolves.toBeTruthy();
    expect(await k.hiv(MENTES_ALLAPOT_CSATORNA)).toEqual({
      ok: true,
      ertek: { utolso: new Date(2026, 10, 18, 10, 0).toISOString(), ezenAGepen: true },
    });
    expect(JSON.parse(await fsp.readFile(path.join(k.gyoker, MENTES_INDEX_FAJL), 'utf8'))).toMatchObject({ gepId: 'gep-sajat' });
    expect(k.irasok()).toBe(1);
  });

  it('a másik gép mentése „a másik gépen” jelzést ad; sérült indexnél mintha nem volna mentés', async () => {
    const k = await kornyezet({ gepId: 'gep-sajat' });
    await fsp.writeFile(path.join(k.gyoker, MENTES_INDEX_FAJL), JSON.stringify({ schemaVersion: 1, utolso: '2026-10-01T08:00:00.000Z', gepId: 'gep-masik' }));
    expect(await k.hiv(MENTES_ALLAPOT_CSATORNA)).toEqual({ ok: true, ertek: { utolso: '2026-10-01T08:00:00.000Z', ezenAGepen: false } });

    await fsp.writeFile(path.join(k.gyoker, MENTES_INDEX_FAJL), '{ sérült');
    expect(await k.hiv(MENTES_ALLAPOT_CSATORNA)).toEqual({ ok: true, ertek: { utolso: null, ezenAGepen: false } });
  });

  it('az adatmappába vagy alá mentést elutasítja, megmondja miért, és semmit nem ír', async () => {
    for (const belso of ['', 'paciensek']) {
      const k = await kornyezet({ cel: null });
      const cel = path.join(k.gyoker, belso, 'mentes.zip');
      const elotte = await listazRekurziv(k.gyoker);
      const kk = await (async () => {
        const kezelok = new Map<string, Kezelo>();
        mentesKezelok(
          { handle: (c, h) => void kezelok.set(c, h) },
          { gyoker: () => k.gyoker, gepId: () => 'g', olvas: async () => null, ir: async () => {} },
          kuldoEngedett,
          { helyetValaszt: async () => cel },
          () => {},
        );
        return kezelok;
      })();

      const r = (await kk.get(MENTES_KESZIT_CSATORNA)!(sajat)) as IpcEredmeny<string | null>;

      expect(r).toMatchObject({ ok: false, hiba: { kod: 'EGYEB' } });
      expect(!r.ok && 'uzenet' in r.hiba && r.hiba.uzenet).toMatch(/nem kerülhet az adatmappába/);
      expect(await listazRekurziv(k.gyoker)).toEqual(elotte);
    }
  });

  it('bezárt dialógusnál nincs írás', async () => {
    const k = await kornyezet({ cel: null });

    expect(await k.hiv(MENTES_KESZIT_CSATORNA)).toEqual({ ok: true, ertek: null });

    await expect(fsp.stat(path.join(k.gyoker, MENTES_INDEX_FAJL))).rejects.toThrow();
    expect(k.irasok()).toBe(0);
  });

  it('a csatornák idegen küldőt elutasítanak, és nem mentenek', async () => {
    const k = await kornyezet();

    expect(await k.hiv(MENTES_KESZIT_CSATORNA, idegen)).toMatchObject({ ok: false, hiba: { kod: 'TILTOTT_KULDO' } });
    expect(await k.hiv(MENTES_ALLAPOT_CSATORNA, idegen)).toMatchObject({ ok: false, hiba: { kod: 'TILTOTT_KULDO' } });
    expect(await fsp.readdir(k.celMappa)).toEqual([]);
  });

  it('sikertelen írásnál a naplóban a cél csak „gyökéren kívül” jelzéssel áll, a páciensnevet hordozó fájlnév nélkül', async () => {
    const nemLetezo = path.join(await ujMappa(), 'nincs-ilyen-mappa', 'Kovács János mentése.zip');
    const k = await kornyezet({ cel: nemLetezo });

    expect(await k.hiv(MENTES_KESZIT_CSATORNA)).toMatchObject({ ok: false, hiba: { kod: 'IO' } });

    const szoveg = await k.naploSzoveg();
    expect(szoveg).toContain(`${MENTES_KESZIT_CSATORNA} IO`);
    expect(szoveg).toContain('[gyökéren kívül].zip');
    expect(szoveg).not.toMatch(/Kovács|János/);
  });
});
