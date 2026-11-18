import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { makeBlankPlan } from '../src/storage/szerzodesTesztek';
import { NAPLO_MEGMUTAT_CSATORNA, type IpcEredmeny } from '../src/storage/taroloIpc';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek, type FsMuveletek } from './fsPrimitivek';
import { kuldoEllenor, naploKezelo, taroloHivas, type KuldoEsemeny } from './ipcKezelok';
import { gyokerNaplozo, Naplo, redaktal, type NaploFs } from './naplo';

const ORIGIN = 'app://mandoki-dental';
const foFrame = { url: `${ORIGIN}/index.html` };
const kuldoEngedett = kuldoEllenor(() => ({ webContents: { mainFrame: foFrame } }), ORIGIN);
const sajat: KuldoEsemeny = { senderFrame: foFrame };

const mappak: string[] = [];
afterAll(async () => {
  await Promise.all(mappak.map((m) => fsp.rm(m, { recursive: true, force: true })));
});
async function ujMappa(): Promise<string> {
  const m = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-naplo-'));
  mappak.push(m);
  return m;
}

describe('redaktal', () => {
  const gyoker = path.join(tmpdir(), 'Mandoki Adat');

  it.each([
    [path.join(gyoker, 'paciensek', 'Kovács-János_abc123', 'Tömés_def456', '2026-09-05_v3', 'terv.json'), 'paciensek/#abc123/#def456/2026-09-05_v3/terv.json'],
    ['paciensek/Kovács-János_abc123/paciens-adatok.json', 'paciensek/#abc123/paciens-adatok.json'],
    ['paciensek/Kovács-János_abc123 (1)/paciens.json', 'paciensek/#?/paciens.json'],
    ['paciensek/Kovács-János_abc123/Kovács pótlás_def456 (1)', 'paciensek/#abc123/#?'],
    ['paciensek/Kovács-János_abc123/Tömés_def456/.tmp-2026-09-07_v4-aaa111/terv.json.tmp-0a1b2c3d', 'paciensek/#abc123/#def456/.tmp-2026-09-07_v4-aaa111/terv.json.tmp-0a1b2c3d'],
    ['paciensek/Kovács-János_abc123/Tömés_def456/2026-09-05_v3/Kovács János.pdf', 'paciensek/#abc123/#def456/2026-09-05_v3/#?'],
    ['_utkozesek/Kovács-János_abc123.paciens-adatok.2026-11-18T10-00-00.000Z.json', '_utkozesek/#abc123.paciens-adatok.2026-11-18T10-00-00.000Z.json'],
    ['_utkozesek/arlista.2026-11-18T10-00-00.000Z.json', '_utkozesek/arlista.2026-11-18T10-00-00.000Z.json'],
    ['arlista (1).json', 'arlista (1).json'],
    ['sablonok/garancia-hu-v1.md', 'sablonok/garancia-hu-v1.md'],
    ['Kovács János jegyzet.txt', '#?'],
    [path.join(tmpdir(), 'Dokumentumok', 'kezelesi-terv-Kovács-János-abc123.pdf'), '[gyökéren kívül].pdf'],
  ])('%s → %s', (bemenet, vart) => {
    expect(redaktal(gyoker, bemenet)).toBe(vart);
  });

  it('a naplózó nyers útvonalat nem fogad, csak redaktáltat', () => {
    const naplo = new Naplo(path.join(tmpdir(), 'nem-iras'), { fs: { ...fsp, appendFile: async () => {} } });
    // @ts-expect-error -- nyers string nem RedaktaltUtvonal
    void naplo.ir({ muvelet: 'x', kod: 'IO', utvonal: 'paciensek/Kovács-János_abc123' });
    void naplo.ir({ muvelet: 'x', kod: 'IO', utvonal: redaktal(gyoker, 'paciensek/Kovács-János_abc123') });
  });
});

describe('Naplo', () => {
  it('soronként időpontot, műveletet és mezőket ír; induláskor fejléc-sort a verzióval, az OS-sel és a gyökérrel', async () => {
    const mappa = await ujMappa();
    const naplo = new Naplo(mappa);

    await naplo.fejlec({ verzio: '1.2.3', os: 'win32 10.0', gyoker: 'C:/Mandoki' });
    await naplo.ir({ muvelet: 'savePlan', kod: 'IO', errno: 'EACCES', syscall: 'open', utvonal: redaktal('C:/Mandoki', 'arlista.json') });

    const sorok = (await fsp.readFile(naplo.fajl, 'utf8')).trim().split('\n');
    expect(sorok[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\S+ INDULAS app=1\.2\.3 os=win32 10\.0 gyoker=C:\/Mandoki$/);
    expect(sorok[1]).toMatch(/^\d{4}-\d{2}-\d{2}T\S+ savePlan IO EACCES open arlista\.json$/);
  });

  it('a méretkorlát fölött io.1.log-ra forgat, és az új sorok az io.log-ba kerülnek', async () => {
    const mappa = await ujMappa();
    const naplo = new Naplo(mappa, { maxMeret: 100 });

    for (let i = 0; i < 6; i++) await naplo.ir({ muvelet: `m${i}`, kod: 'IO' });

    const elozo = await fsp.readFile(path.join(mappa, 'io.1.log'), 'utf8');
    const aktualis = await fsp.readFile(naplo.fajl, 'utf8');
    expect(elozo).toContain(' m0 IO');
    expect(aktualis).toContain(' m5 IO');
    expect(aktualis).not.toContain(' m0 IO');
  });

  it('a napló saját írási hibája csendben elmarad', async () => {
    const fs: NaploFs = {
      ...fsp,
      appendFile: (async () => {
        throw Object.assign(new Error('ENOSPC'), { code: 'ENOSPC' });
      }) as typeof fsp.appendFile,
    };
    const naplo = new Naplo(await ujMappa(), { fs });

    await expect(naplo.ir({ muvelet: 'x', kod: 'IO' })).resolves.toBeUndefined();
  });
});

describe('naplózás az IPC-határon', () => {
  async function kornyezet(fs?: FsMuveletek) {
    const gyoker = await ujMappa();
    const tarolo = new FileSystemStorage(new FsPrimitivek(gyoker, { fs, kesleltet: async () => {} }));
    await tarolo.init();
    const naplo = new Naplo(path.join(await ujMappa(), 'naplo'));
    const naplozo = gyokerNaplozo(naplo, gyoker);
    const hiv = (metodus: Parameters<typeof taroloHivas>[2], args: unknown[]) =>
      taroloHivas(tarolo, kuldoEngedett, metodus, sajat, args, naplozo);
    const naploSzoveg = async () => {
      await naplo.ir({ muvelet: 'zaras', kod: 'X' });
      return fsp.readFile(naplo.fajl, 'utf8');
    };
    return { gyoker, tarolo, hiv, naploSzoveg };
  }

  it('egy I/O-hiba sora: művelet, errno, syscall és redaktált út -- páciensnév és OS-üzenet nélkül', async () => {
    let tiltva = false;
    const fs: FsMuveletek = {
      ...fsp,
      open: (async (...args: Parameters<typeof fsp.open>) => {
        if (tiltva) {
          throw Object.assign(new Error(`EACCES: permission denied, open '${String(args[0])}'`), {
            code: 'EACCES',
            syscall: 'open',
          });
        }
        return fsp.open(...args);
      }) as typeof fsp.open,
    };
    const { tarolo, hiv, naploSzoveg } = await kornyezet(fs);
    const p = await tarolo.createPatient('Kovács János');
    const adat = (await tarolo.loadPatientData(p.dirName))!;
    tiltva = true;

    const r = await hiv('savePatientData', [p.dirName, { ...adat, telefon: '1' }]);

    expect(r.ok).toBe(false);
    const szoveg = await naploSzoveg();
    expect(szoveg).toMatch(new RegExp(`savePatientData IO EACCES open paciensek/#${p.paciensId}/paciens-adatok\\.json`));
    expect(szoveg).not.toMatch(/Kovács|János|permission denied|Nincs jogosultság/);
  });

  it('felülírás-ütközésnél a kód és az út kerül be, a lemezen lévő tartalom nem', async () => {
    const { gyoker, tarolo, hiv, naploSzoveg } = await kornyezet();
    const pl = await tarolo.loadPriceList();
    await fsp.writeFile(path.join(gyoker, 'arlista.json'), JSON.stringify({ ...pl, arlistaVerzio: 'MASIK-GEP-TARTALMA' }));

    await hiv('savePriceList', [{ ...pl, arlistaVerzio: 'sajat' }]);

    const szoveg = await naploSzoveg();
    expect(szoveg).toMatch(/savePriceList FELULIRAS_UTKOZES arlista\.json/);
    expect(szoveg).not.toContain('MASIK-GEP-TARTALMA');
  });

  it('sorszám-ütközésnél a verziómappa neve kerül be, az ütköző verzió orvosa nem', async () => {
    const { tarolo, hiv, naploSzoveg } = await kornyezet();
    const ref = await tarolo.savePlan(makeBlankPlan({ orvos: 'Dr. Másik Gép' }), new Uint8Array([1]));
    const v1 = await tarolo.loadPlan(ref);

    await hiv('savePlan', [{ ...v1, verzio: 1, keltezes: '2026-08-19' }, new Uint8Array([2])]);

    const szoveg = await naploSzoveg();
    expect(szoveg).toContain(`savePlan VERZIO_UTKOZES ${ref.versionDir}`);
    expect(szoveg).not.toMatch(/Másik Gép|Teszt|Elek/);
  });

  it('ha a naplózó maga hibázik, az IPC-eredmény ugyanaz marad', async () => {
    const gyoker = await ujMappa();
    const tarolo = new FileSystemStorage(new FsPrimitivek(gyoker, { kesleltet: async () => {} }));
    await tarolo.init();
    const pl = await tarolo.loadPriceList();
    await fsp.writeFile(path.join(gyoker, 'arlista.json'), '{}');

    const r = await taroloHivas(tarolo, kuldoEngedett, 'savePriceList', sajat, [pl], () => {
      throw new Error('napló elromlott');
    });

    expect(r).toMatchObject({ ok: false, hiba: { kod: 'FELULIRAS_UTKOZES' } });
  });

  it('a naplómappa-csatorna idegen küldőt elutasít, a sajátot kiszolgálja', async () => {
    let megmutatva = 0;
    let kezelo: ((e: KuldoEsemeny) => Promise<unknown>) | null = null;
    naploKezelo(
      { handle: (nev, k) => void (nev === NAPLO_MEGMUTAT_CSATORNA && (kezelo = k)) },
      kuldoEngedett,
      async () => void megmutatva++,
    );

    const idegen = (await kezelo!({ senderFrame: { url: `${ORIGIN}/index.html` } })) as IpcEredmeny<void>;
    const sajatValasz = (await kezelo!(sajat)) as IpcEredmeny<void>;

    expect(idegen).toMatchObject({ ok: false, hiba: { kod: 'TILTOTT_KULDO' } });
    expect(sajatValasz).toEqual({ ok: true, ertek: undefined });
    expect(megmutatva).toBe(1);
  });
});
