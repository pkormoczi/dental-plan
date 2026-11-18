import { promises as fsp } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { uresTorzsadat } from '../src/domain/paciensAdatok';
import { makeBlankPlan } from '../src/storage/szerzodesTesztek';
import { MEGMUTAT_CSATORNA, TAROLO_METODUSOK, type IpcEredmeny } from '../src/storage/taroloIpc';
import { FileSystemStorage } from './fileSystemStorage';
import { FsPrimitivek } from './fsPrimitivek';
import { kuldoEllenor, megmutatKezelo, taroloHivas, taroloKezelok, type KuldoEsemeny } from './ipcKezelok';
import { PDF_MAX_BAJT } from './ipcValidate';

const ORIGIN = 'app://mandoki-dental';
const foFrame = { url: `${ORIGIN}/index.html` };
const foablak = { webContents: { mainFrame: foFrame } };
const kuldoEngedett = kuldoEllenor(() => foablak, ORIGIN);
const sajat: KuldoEsemeny = { senderFrame: foFrame };

const mappak: string[] = [];
afterAll(async () => {
  await Promise.all(mappak.map((m) => fsp.rm(m, { recursive: true, force: true })));
});

async function ujMappa(): Promise<string> {
  const m = await fsp.mkdtemp(path.join(tmpdir(), 'mandoki-ipc-'));
  mappak.push(m);
  return m;
}

describe('kuldoEllenor', () => {
  it('csak a főablak top-frame-jét fogadja el, a saját originről', () => {
    expect(kuldoEngedett(sajat)).toBe(true);
    expect(kuldoEngedett({ senderFrame: { url: `${ORIGIN}/index.html` } })).toBe(false);
    expect(kuldoEllenor(() => foablak, 'http://localhost:5173')(sajat)).toBe(false);
    expect(kuldoEngedett({ senderFrame: null })).toBe(false);
    expect(kuldoEllenor(() => null, ORIGIN)(sajat)).toBe(false);
  });
});

describe('taroloHivas', () => {
  let gyoker: string;
  let tarolo: FileSystemStorage;
  const hiv = (metodus: Parameters<typeof taroloHivas>[2], args: unknown[], e: KuldoEsemeny = sajat) =>
    taroloHivas(tarolo, kuldoEngedett, metodus, e, args);
  const hibaKod = (r: IpcEredmeny<unknown>) => (r.ok ? 'OK' : r.hiba.kod);
  const paciensMappak = () => fsp.readdir(path.join(gyoker, 'paciensek'));

  beforeEach(async () => {
    gyoker = await ujMappa();
    tarolo = new FileSystemStorage(new FsPrimitivek(gyoker, { kesleltet: async () => {} }));
    await tarolo.init();
  });

  it('a saját főablakból érkező hívást kiszolgálja', async () => {
    const r = await hiv('createPatient', ['Próba Páciens']);

    expect(r.ok).toBe(true);
    expect(await paciensMappak()).toHaveLength(1);
  });

  it('idegen küldőtől érkező hívást elutasít, és nem ír', async () => {
    const r = await hiv('createPatient', ['Próba Páciens'], { senderFrame: { url: 'https://idegen.example/' } });

    expect(hibaKod(r)).toBe('TILTOTT_KULDO');
    expect(await paciensMappak()).toEqual([]);
  });

  it.each([['../Kint_abc123'], ['Kint_abc123/../..'], ['a\\b_abc123'], ['..'], ['nincs-azonosito']])(
    'a(z) %s útvonalelemet elutasítja, írás nélkül',
    async (patientDir) => {
      const r = await hiv('savePatientData', [patientDir, uresTorzsadat('Kint Elek', 'abc123')]);

      expect(hibaKod(r)).toBe('ERVENYTELEN_PARAMETER');
      expect(await paciensMappak()).toEqual([]);
      expect((await fsp.readdir(gyoker)).sort()).toEqual(['arlista.json', 'beallitasok.json', 'paciensek', 'sablonok']);
    },
  );

  it('a gyökéren kívülre mutató symlinken/junctionön át nem ír', async () => {
    const kint = await ujMappa();
    await fsp.symlink(kint, path.join(gyoker, 'paciensek', 'Kulso-Pac_abc123'), 'junction');

    const r = await hiv('savePatientData', ['Kulso-Pac_abc123', uresTorzsadat('Kulso Pac', 'abc123')]);

    expect(hibaKod(r)).toBe('IO');
    expect(await fsp.readdir(kint)).toEqual([]);
  });

  it('a 20 MB fölötti PDF-et elutasítja, verziómappa nélkül', async () => {
    const r = await hiv('savePlan', [makeBlankPlan(), new Uint8Array(PDF_MAX_BAJT + 1)]);

    expect(hibaKod(r)).toBe('ERVENYTELEN_PARAMETER');
    expect(await paciensMappak()).toEqual([]);
  });

  it('a nem Uint8Array PDF-et és az alak szerint hibás tervet elutasítja', async () => {
    expect(hibaKod(await hiv('savePlan', [makeBlankPlan(), 'nem pdf']))).toBe('ERVENYTELEN_PARAMETER');
    expect(hibaKod(await hiv('savePlan', [{ ...makeBlankPlan(), fazisok: 'x' }, new Uint8Array([1])]))).toBe(
      'ERVENYTELEN_PARAMETER',
    );
    expect(await paciensMappak()).toEqual([]);
  });

  it('a nem logikai felülírás-jelzőt elutasítja, és a fájlt nem írja', async () => {
    const pl = await tarolo.loadPriceList();

    const r = await hiv('savePriceList', [{ ...pl, arlistaVerzio: 'uj' }, { felulir: 'igen' }]);

    expect(hibaKod(r)).toBe('ERVENYTELEN_PARAMETER');
    expect((await tarolo.loadPriceList()).arlistaVerzio).toBe(pl.arlistaVerzio);
  });

  it('a törlés előtt újraellenőriz: frissen érkezett tervvel nem töröl', async () => {
    const folder = await tarolo.createPatient('Törlendő Páciens');
    // A renderer még terv nélkül látta; közben a másik gépről megérkezett egy verzió.
    await tarolo.savePlan(makeBlankPlan({ paciensId: folder.paciensId }), new Uint8Array([1]));

    const r = await hiv('deletePatient', [folder.dirName]);

    expect(hibaKod(r)).toBe('TORLES_AKADALY');
    expect(await paciensMappak()).toEqual([folder.dirName]);
  });

  it('terv nélküli pácienst töröl', async () => {
    const folder = await tarolo.createPatient('Törlendő Páciens');

    expect((await hiv('deletePatient', [folder.dirName])).ok).toBe(true);
    expect(await paciensMappak()).toEqual([]);
  });
});

describe('taroloKezelok', () => {
  it('minden PlanStorage-metódushoz pontosan egy storage:<metódus> csatornát regisztrál', () => {
    const csatornak: string[] = [];
    taroloKezelok({ handle: (c) => void csatornak.push(c) }, {} as never, kuldoEngedett);

    expect(csatornak).toEqual(TAROLO_METODUSOK.map((m) => `storage:${m}`));
  });
});

describe('megmutatKezelo („Mappa megnyitása”)', () => {
  async function csatorna() {
    const gyoker = await ujMappa();
    const prim = new FsPrimitivek(gyoker, { kesleltet: async () => {} });
    const mutatott: string[] = [];
    let kezelo: ((e: KuldoEsemeny, ...args: unknown[]) => Promise<unknown>) | null = null;
    megmutatKezelo(
      { handle: (nev, k) => void (nev === MEGMUTAT_CSATORNA && (kezelo = k)) },
      prim,
      kuldoEngedett,
      (abs) => mutatott.push(abs),
    );
    const hiv = (ut: unknown, e: KuldoEsemeny = sajat) => kezelo!(e, ut) as Promise<IpcEredmeny<void>>;
    return { gyoker, mutatott, hiv };
  }
  const kod = (r: IpcEredmeny<void>) => (r.ok ? 'OK' : r.hiba.kod);

  it('a gyökéren belüli elemet a gyökérhez feloldva mutatja meg', async () => {
    const { gyoker, mutatott, hiv } = await csatorna();
    await fsp.mkdir(path.join(gyoker, '_utkozesek'));
    await fsp.writeFile(path.join(gyoker, '_utkozesek', 'a.json'), '{}');

    expect(kod(await hiv('_utkozesek/a.json'))).toBe('OK');
    expect(mutatott).toEqual([path.join(gyoker, '_utkozesek', 'a.json')]);
  });

  it.each([['../kint.txt'], ['_utkozesek/../../kint.txt'], ['/etc/passwd'], [''], [42]])(
    'a(z) %o útvonalat elutasítja, és nem mutat semmit',
    async (ut) => {
      const { mutatott, hiv } = await csatorna();

      expect(kod(await hiv(ut))).toBe('ERVENYTELEN_PARAMETER');
      expect(mutatott).toEqual([]);
    },
  );

  it('idegen küldőtől nem fogad el hívást', async () => {
    const { mutatott, hiv } = await csatorna();

    expect(kod(await hiv('arlista.json', { senderFrame: { url: `${ORIGIN}/index.html` } }))).toBe('TILTOTT_KULDO');
    expect(mutatott).toEqual([]);
  });
});
