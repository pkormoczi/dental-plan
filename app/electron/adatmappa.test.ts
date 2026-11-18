import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { makeBlankPlan } from '../src/storage/szerzodesTesztek';
import { ErvenytelenParameterError } from '../src/storage/taroloHibak';
import { Adatmappa, CONFIG_FAJL, type AdatmappaOpciok } from './adatmappa';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek } from './fsPrimitivek';

const mappak: string[] = [];
afterAll(async () => {
  await Promise.all(mappak.map((m) => fsp.rm(m, { recursive: true, force: true })));
});
async function ujMappa(): Promise<string> {
  const m = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-adatmappa-'));
  mappak.push(m);
  return m;
}

async function listazRekurziv(gyoker: string): Promise<string[]> {
  const bejegyzesek = await fsp.readdir(gyoker, { recursive: true, withFileTypes: true });
  return bejegyzesek.map((d) => path.relative(gyoker, path.join(d.parentPath, d.name))).sort();
}

async function sajatAdatmappa(): Promise<string> {
  const gyoker = await ujMappa();
  await new FileSystemStorage(new FsPrimitivek(gyoker)).adatmappatLetrehoz();
  return gyoker;
}

/** Egy induló app a megadott userData-val; a mappaválasztó a sorban következő utat adja. */
async function kornyezet(opciok: { userData?: string; valasztasok?: Array<string | null> } = {}) {
  const userData = opciok.userData ?? (await ujMappa());
  const valasztasok = [...(opciok.valasztasok ?? [])];
  const aktivalt: string[] = [];
  let id = 0;
  const o: AdatmappaOpciok = {
    userData,
    mappatValaszt: async () => valasztasok.shift() ?? null,
    primetNyit: (g) => new FsPrimitivek(g, { kesleltet: async () => {} }),
    aktivalva: (g) => aktivalt.push(g),
    ujGepId: () => `gep-${++id}`,
  };
  const adatmappa = new Adatmappa(o);
  const config = async () => {
    const raw = await fsp.readFile(path.join(userData, CONFIG_FAJL), 'utf8').catch(() => null);
    return raw == null ? null : JSON.parse(raw);
  };
  return { adatmappa, userData, aktivalt, config };
}

async function configIr(userData: string, tartalom: unknown): Promise<void> {
  await fsp.writeFile(path.join(userData, CONFIG_FAJL), typeof tartalom === 'string' ? tartalom : JSON.stringify(tartalom));
}

describe('Adatmappa induláskor', () => {
  it('config nélkül első indítás: nincs tároló, és semmi nem íródik', async () => {
    const { adatmappa, userData } = await kornyezet();

    expect(await adatmappa.indul()).toEqual({ allapot: 'nincs' });

    expect(adatmappa.tarolo).toBeNull();
    expect(await fsp.readdir(userData)).toEqual([]);
  });

  it('érvényes configgal a miénk mappán rendben, a tároló ott fut, és a napló fejléce az adatmappát kapja', async () => {
    const gyoker = await sajatAdatmappa();
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: gyoker, gepId: 'gep-x' });
    const { adatmappa, aktivalt } = await kornyezet({ userData });

    const allapot = await adatmappa.indul();

    expect(allapot).toMatchObject({ allapot: 'rendben', ut: gyoker });
    expect(adatmappa.tarolo?.gyoker).toBe(gyoker);
    expect(aktivalt).toEqual([gyoker]);
  });

  it.each([
    ['nem létező', async () => path.join(await ujMappa(), 'nincs-ilyen'), 'elerhetetlen'],
    ['üres', async () => ujMappa(), 'ures'],
    [
      'hiányos',
      async () => {
        const g = await sajatAdatmappa();
        await fsp.rm(path.join(g, 'arlista.json'));
        return g;
      },
      'hianyos',
    ],
    [
      'idegen',
      async () => {
        const g = await ujMappa();
        await fsp.writeFile(path.join(g, 'Dokumentum.docx'), 'x');
        return g;
      },
      'idegen',
    ],
  ])('%s beállított mappánál blokkoló állapot, tároló nélkül, és a mappába semmi nem íródik', async (_nev, keszit, vart) => {
    const gyoker = await keszit();
    const elotte = await listazRekurziv(gyoker).catch(() => null);
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: gyoker, gepId: 'gep-x' });
    const { adatmappa } = await kornyezet({ userData });

    const allapot = await adatmappa.indul();

    expect(allapot).toMatchObject({ allapot: vart, ut: gyoker });
    expect(adatmappa.tarolo).toBeNull();
    expect(await listazRekurziv(gyoker).catch(() => null)).toEqual(elotte);
  });

  it('a hiányos mappa állapota megnevezi, mi hiányzik', async () => {
    const gyoker = await sajatAdatmappa();
    await fsp.rm(path.join(gyoker, 'sablonok'), { recursive: true });
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: gyoker, gepId: 'gep-x' });
    const { adatmappa } = await kornyezet({ userData });

    expect(await adatmappa.indul()).toMatchObject({ allapot: 'hianyos', hianyzik: ['sablonok'] });
  });

  it('fájlra mutató config elérhetetlen mappa, nem üres', async () => {
    const fajl = path.join(await ujMappa(), 'nem-mappa.txt');
    await fsp.writeFile(fajl, 'x');
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: fajl, gepId: 'gep-x' });
    const { adatmappa } = await kornyezet({ userData });

    expect(await adatmappa.indul()).toMatchObject({ allapot: 'elerhetetlen', errno: 'ENOTDIR' });
  });

  it('olvashatatlan vagy ismeretlen config: első indítás, és a fájl érintetlen marad', async () => {
    for (const tartalom of ['nem json', { schemaVersion: 2, gyokerMappa: 'C:/x', gepId: 'g' }, { schemaVersion: 1, gyokerMappa: 'relativ/ut', gepId: 'g' }]) {
      const userData = await ujMappa();
      await configIr(userData, tartalom);
      const elotte = await fsp.readFile(path.join(userData, CONFIG_FAJL), 'utf8');
      const { adatmappa } = await kornyezet({ userData });

      expect(await adatmappa.indul()).toEqual({ allapot: 'nincs' });
      expect(await fsp.readFile(path.join(userData, CONFIG_FAJL), 'utf8')).toBe(elotte);
    }
  });
});

describe('Adatmappa választás', () => {
  it('üres mappába csak a létrehozás kérésére épít; utána a config és a tároló az új mappáé', async () => {
    const uj = await ujMappa();
    const { adatmappa, config } = await kornyezet({ valasztasok: [uj] });
    await adatmappa.indul();

    expect(await adatmappa.valaszt()).toMatchObject({ allapot: 'ures', ut: uj });
    expect(await adatmappa.hasznal(false)).toMatchObject({ allapot: 'ures' });
    expect(await fsp.readdir(uj)).toEqual([]);
    expect(await config()).toBeNull();
    expect(adatmappa.tarolo).toBeNull();

    expect(await adatmappa.hasznal(true)).toMatchObject({ allapot: 'rendben', ut: uj });

    expect((await fsp.readdir(uj)).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
    expect(await config()).toEqual({ schemaVersion: 1, gyokerMappa: uj, gepId: 'gep-1' });
    expect(adatmappa.tarolo?.gyoker).toBe(uj);
    expect(adatmappa.allapot).toMatchObject({ allapot: 'rendben', ut: uj });
  });

  it('idegen mappát elutasít: nem ír bele, és a config nem íródik', async () => {
    const idegen = await ujMappa();
    await fsp.writeFile(path.join(idegen, 'Dokumentum.docx'), 'x');
    const { adatmappa, config } = await kornyezet({ valasztasok: [idegen] });
    await adatmappa.indul();

    expect(await adatmappa.valaszt()).toMatchObject({ allapot: 'idegen' });
    expect(await adatmappa.hasznal(true)).toMatchObject({ allapot: 'idegen' });

    expect(await fsp.readdir(idegen)).toEqual(['Dokumentum.docx']);
    expect(await config()).toBeNull();
  });

  it('a bezárt dialógus semmit nem változtat', async () => {
    const gyoker = await sajatAdatmappa();
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: gyoker, gepId: 'gep-x' });
    const { adatmappa } = await kornyezet({ userData, valasztasok: [null] });
    await adatmappa.indul();

    expect(await adatmappa.valaszt()).toBeNull();
    expect(adatmappa.tarolo?.gyoker).toBe(gyoker);
  });

  it('relatív utat a mappaválasztótól nem fogad el', async () => {
    const { adatmappa } = await kornyezet({ valasztasok: ['relativ/mappa'] });
    await adatmappa.indul();

    await expect(adatmappa.valaszt()).rejects.toBeInstanceOf(ErvenytelenParameterError);
  });

  it('hiányos mappában a pótlás csak a hiányzót írja, és utána a mappa használható', async () => {
    const gyoker = await sajatAdatmappa();
    await fsp.writeFile(path.join(gyoker, 'arlista.json'), '{"sajat":true}');
    await fsp.rm(path.join(gyoker, 'beallitasok.json'));
    const { adatmappa } = await kornyezet({ valasztasok: [gyoker] });
    await adatmappa.indul();
    expect(await adatmappa.valaszt()).toMatchObject({ allapot: 'hianyos', hianyzik: ['beallitasok.json'] });

    expect(await adatmappa.potol()).toMatchObject({ allapot: 'rendben' });

    expect(await fsp.readFile(path.join(gyoker, 'arlista.json'), 'utf8')).toBe('{"sajat":true}');
    expect(await fsp.readdir(gyoker)).toContain('beallitasok.json');
  });

  it('a pótlás idegen mappába nem ír', async () => {
    const idegen = await ujMappa();
    await fsp.writeFile(path.join(idegen, 'Dokumentum.docx'), 'x');
    const { adatmappa } = await kornyezet({ valasztasok: [idegen] });
    await adatmappa.indul();
    await adatmappa.valaszt();

    expect(await adatmappa.potol()).toMatchObject({ allapot: 'idegen' });
    expect(await fsp.readdir(idegen)).toEqual(['Dokumentum.docx']);
  });

  it('mappaváltás után a tároló és a napló fejléce az új gyökéré, a gépazonosító ugyanaz marad', async () => {
    const regi = await sajatAdatmappa();
    const uj = await sajatAdatmappa();
    const userData = await ujMappa();
    await configIr(userData, { schemaVersion: 1, gyokerMappa: regi, gepId: 'gep-allando' });
    const { adatmappa, aktivalt, config } = await kornyezet({ userData, valasztasok: [uj] });
    await adatmappa.indul();

    await adatmappa.valaszt();
    expect(await adatmappa.hasznal(false)).toMatchObject({ allapot: 'rendben', ut: uj });

    expect(adatmappa.tarolo?.gyoker).toBe(uj);
    expect(aktivalt).toEqual([regi, uj]);
    expect(await config()).toEqual({ schemaVersion: 1, gyokerMappa: uj, gepId: 'gep-allando' });
  });

  it('a gépazonosító egyszer generálódik: újraindítás után a configból jön, és a manifestbe kerül', async () => {
    const uj = await ujMappa();
    const elso = await kornyezet({ valasztasok: [uj] });
    await elso.adatmappa.indul();
    await elso.adatmappa.valaszt();
    await elso.adatmappa.hasznal(true);

    const masodik = await kornyezet({ userData: elso.userData });
    await masodik.adatmappa.indul();
    const ref = await masodik.adatmappa.tarolo!.savePlan(makeBlankPlan(), new Uint8Array([1, 2]));

    const manifest = JSON.parse(
      await fsp.readFile(path.join(uj, 'paciensek', ref.patientDir, ref.planDir, ref.versionDir, 'manifest.json'), 'utf8'),
    );
    expect(manifest.gepId).toBe('gep-1');
    expect((await masodik.config()).gepId).toBe('gep-1');
  });
});
