// A demó-export importja a main oldalon (migrációs terv §7.2): a fájlt a doki a natív
// dialógusban választja, a main olvassa és ellenőrzi, a renderer csak az összegzést kapja.
// Íráskor a main a nála megtartott, már ellenőrzött exportot írja -- a renderer tartalmat nem
// küld, így azt sem kell újra ellenőrizni.

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import {
  AdatImportError,
  adatImportEllenoriz,
  exportLegfrissebbSablonjai,
  sablonBase,
  type AdatExport,
} from '../src/storage/adatExport';
import { ARLISTA_FAJL, hianyzoAlapsablonok } from '../src/storage/fajlTarolo';
import { parseJson } from '../src/storage/json';
import { ErvenytelenParameterError, TiltottKuldoError } from '../src/storage/taroloHibak';
import {
  hibaBolStorageHiba,
  IMPORT_ELONEZET_CSATORNA,
  IMPORT_IR_CSATORNA,
  type AdatmappaAllapot,
  type ImportMod,
  type ImportOsszegzes,
  type IpcEredmeny,
  type MappaVizsgalat,
} from '../src/storage/taroloIpc';
import type { IpcRegisztralo, KuldoEsemeny } from './ipcKezelok';
import type { Naplozo } from './naplo';

/** Egy demó-export néhányszor tíz kilobájt; egy ennél sokkal nagyobb fájl nem az, nem olvassuk be. */
export const IMPORT_MAX_MERET = 5 * 1024 * 1024;

/** Az adatmappa main-oldali kezelője, ahogy az import látja. */
export interface ImportAdatmappa {
  readonly allapot: AdatmappaAllapot;
  readonly tarolo: { exportotAtvesz(adat: AdatExport): Promise<void>; listTemplates(): Promise<string[]> } | null;
  readonly prim: { olvasSzoveg(rel: string): Promise<string | null> } | null;
  importal(adat: AdatExport): Promise<MappaVizsgalat>;
}

export interface ImportRendszer {
  /** Natív fájlválasztó; a választott fájl útja, vagy `null`, ha a doki bezárta. */
  fajltValaszt(): Promise<string | null>;
}

async function exportotOlvas(ut: string): Promise<string> {
  let meret: number;
  try {
    const st = await fsp.stat(ut);
    if (!st.isFile()) throw new AdatImportError('A választott elem nem fájl.');
    meret = st.size;
  } catch (err) {
    if (err instanceof AdatImportError) throw err;
    throw new AdatImportError('A választott fájl nem olvasható.');
  }
  if (meret > IMPORT_MAX_MERET) throw new AdatImportError('A fájl túl nagy ahhoz, hogy a demóból exportált adatfájl legyen.');
  try {
    return await fsp.readFile(ut, 'utf8');
  } catch {
    throw new AdatImportError('A választott fájl nem olvasható.');
  }
}

export function demoImportKezelok(
  ipc: IpcRegisztralo,
  adatmappa: ImportAdatmappa,
  kuldoEngedett: (e: KuldoEsemeny) => boolean,
  rendszer: ImportRendszer,
  irasTortent: () => void,
  naplozo?: Naplozo,
): void {
  // Az utolsó előnézet ellenőrzött exportja: csak ezt írja az `importIr`, és csak egyszer.
  let fuggo: { adat: AdatExport; mod: ImportMod } | null = null;

  const kezel =
    <T>(csatorna: string, fn: (...args: unknown[]) => Promise<T>) =>
    async (e: KuldoEsemeny, ...args: unknown[]): Promise<IpcEredmeny<T>> => {
      try {
        if (!kuldoEngedett(e)) throw new TiltottKuldoError();
        return { ok: true, ertek: await fn(...args) };
      } catch (err) {
        try {
          naplozo?.(csatorna, err);
        } catch {
          // a napló hibája nem írhatja felül a hívás eredményét
        }
        return { ok: false, hiba: hibaBolStorageHiba(err) };
      }
    };
  const aktivTarolo = () => {
    if (!adatmappa.tarolo) throw new Error('Nincs megnyitott adatmappa.');
    return adatmappa.tarolo;
  };

  /** Sérült vagy hiányzó árlistánál is van összegzés: épp ezt cserélné le az import. */
  const jelenlegiArlistaVerzio = async (): Promise<string | null> => {
    try {
      const raw = await adatmappa.prim?.olvasSzoveg(ARLISTA_FAJL);
      if (raw == null) return null;
      const v = parseJson<{ arlistaVerzio?: unknown }>(raw, ARLISTA_FAJL).arlistaVerzio;
      return typeof v === 'string' ? v : null;
    } catch {
      return null;
    }
  };

  const osszegez = async (adat: AdatExport, mod: ImportMod): Promise<ImportOsszegzes> => {
    const alapnevek = new Set(exportLegfrissebbSablonjai(adat.sablonok).keys());
    let jelenlegi: string | null = null;
    if (mod === 'csere') {
      for (const nev of await aktivTarolo().listTemplates()) {
        const base = sablonBase(nev);
        if (base) alapnevek.add(base);
      }
      jelenlegi = await jelenlegiArlistaVerzio();
    }
    const { arlistaVerzio } = adat.arlista as { arlistaVerzio?: unknown };
    const { nev } = adat.beallitasok.rendelo as { nev?: unknown };
    return {
      mod,
      keszult: Number.isNaN(Date.parse(adat.keszult)) ? null : adat.keszult,
      tetelSzam: adat.arlista.tetelek.length,
      arlistaVerzio: typeof arlistaVerzio === 'string' ? arlistaVerzio : '',
      jelenlegiArlistaVerzio: jelenlegi,
      rendeloNev: typeof nev === 'string' ? nev : '',
      sablonSzam: Object.keys(adat.sablonok).length,
      potoltSablonSzam: hianyzoAlapsablonok(alapnevek).length,
    };
  };

  ipc.handle(
    IMPORT_ELONEZET_CSATORNA,
    kezel(IMPORT_ELONEZET_CSATORNA, async (mod): Promise<ImportOsszegzes | null> => {
      if (mod !== 'uj' && mod !== 'csere') throw new ErvenytelenParameterError('import módja');
      fuggo = null;
      if (mod === 'csere') aktivTarolo();
      const ut = await rendszer.fajltValaszt();
      if (ut == null) return null;
      if (typeof ut !== 'string' || !path.isAbsolute(ut)) throw new ErvenytelenParameterError('fájl');
      const adat = adatImportEllenoriz(await exportotOlvas(ut));
      const osszegzes = await osszegez(adat, mod);
      fuggo = { adat, mod };
      return osszegzes;
    }),
  );

  ipc.handle(
    IMPORT_IR_CSATORNA,
    kezel(IMPORT_IR_CSATORNA, async (): Promise<MappaVizsgalat> => {
      const f = fuggo;
      if (!f) throw new ErvenytelenParameterError('nincs beolvasott export');
      let v: MappaVizsgalat;
      try {
        if (f.mod === 'uj') {
          v = await adatmappa.importal(f.adat);
        } else {
          await aktivTarolo().exportotAtvesz(f.adat);
          const a = adatmappa.allapot;
          if (a.allapot === 'nincs') throw new Error('Nincs megnyitott adatmappa.');
          v = a;
        }
      } catch (err) {
        // Egy félbemaradt írás után is fel kell tölteni, ami már a mappába került.
        if (!(err instanceof AdatImportError)) irasTortent();
        throw err;
      }
      fuggo = null;
      irasTortent();
      return v;
    }),
  );
}
