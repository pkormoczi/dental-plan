// Helyi diagnosztikai napló a fájlrendszeri hibákról és a két gép közti ütközésekről (migrációs
// terv §5.2): utólag kivizsgálható, de páciens- vagy tervnév, tartalom és hibaszöveg nélkül. Csak
// helyi fájl a `userData` alatt -- sehová nem továbbítódik (PRODUCT.md § Adat- és
// deployment-korlátok).

import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { parsePatientDirName, parsePlanDirName, parseVersionDirName, VersionConflictError } from '../src/storage/paths';
import {
  FelulirasUtkozesError,
  HianyosVerzioError,
  IoError,
  TorlesAkadalyError,
} from '../src/storage/taroloHibak';

declare const redaktaltJel: unique symbol;
/** Naplózható útvonal: csak a `redaktal` állítja elő, egy nyers string fordítási hibával bukik. */
export type RedaktaltUtvonal = string & { readonly [redaktaltJel]: true };

const ISMERETLEN = '#?';
const GYOKEREN_KIVUL = '[gyökéren kívül]';

// Amit az app maga nevez el, és nem hordoz nevet: a fájlok, a verzió- és temp-mappák, illetve
// ezek Drive-ütközéses és félbemaradt-írásos változatai.
const TEMP_UTOTAG = String.raw`(\.tmp-[0-9a-f]+)?`;
const UTKOZES_UTOTAG = String.raw`( \(\d+\)| conflicted copy)?`;
const GYOKER_NEV = new RegExp(String.raw`^((arlista|beallitasok|biztonsagi-mentes)${UTKOZES_UTOTAG}\.json${TEMP_UTOTAG}|sablonok|paciensek|_utkozesek)$`);
const SABLON_NEV = new RegExp(String.raw`^[a-z-]+-v\d+${UTKOZES_UTOTAG}\.md${TEMP_UTOTAG}$`);
const PACIENS_FAJL = new RegExp(String.raw`^paciens(-adatok)?${UTKOZES_UTOTAG}\.json${TEMP_UTOTAG}$`);
const LANC_ELEM = new RegExp(
  String.raw`^(\d{4}-\d{2}-\d{2}_v\d+${UTKOZES_UTOTAG}|\.tmp-\d{4}-\d{2}-\d{2}_v\d+-[a-z0-9]+|terv-(cimke|ervenytelenitesek)\.json${TEMP_UTOTAG})$`,
);
const VERZIO_FAJL = new RegExp(String.raw`^(terv\.json|kezelesi-terv\.pdf|manifest\.json)${TEMP_UTOTAG}$`);

const azonosito = (id: string | undefined) => (id ? `#${id}` : ISMERETLEN);

/**
 * A gyökérhez képest számolt, névtelenített útvonal. A páciens- és a tervmappa olvasható része
 * az azonosítójára cserélődik; ami nem az app mintája (pl. egy Drive-másolat), `#?` lesz, mert a
 * neve páciensnevet hordozhat. A gyökéren kívüli útból csak a kiterjesztés marad: a „Másolás
 * máshová” fájlneve a páciens nevét tartalmazza.
 */
export function redaktal(gyoker: string, utvonal: string): RedaktaltUtvonal {
  let rel = utvonal;
  if (path.isAbsolute(utvonal)) {
    rel = path.relative(gyoker, utvonal);
    if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
      return `${GYOKEREN_KIVUL}${path.extname(utvonal)}` as RedaktaltUtvonal;
    }
  }
  const reszek = rel.split(/[\\/]/).filter(Boolean);
  const kimenet = reszek.map((resz, i) => {
    if (i === 0) return GYOKER_NEV.test(resz) ? resz : ISMERETLEN;
    if (reszek[0] === 'sablonok') return SABLON_NEV.test(resz) ? resz : ISMERETLEN;
    if (reszek[0] === '_utkozesek') {
      const elotag = resz.indexOf('.paciens-adatok.');
      return elotag > 0 ? `${azonosito(parsePatientDirName(resz.slice(0, elotag))?.patientId)}${resz.slice(elotag)}` : resz;
    }
    if (reszek[0] !== 'paciensek') return ISMERETLEN;
    if (i === 1) return azonosito(parsePatientDirName(resz)?.patientId);
    if (i === 2) return PACIENS_FAJL.test(resz) ? resz : azonosito(parsePlanDirName(resz)?.planId);
    if (i === 3) return LANC_ELEM.test(resz) ? resz : ISMERETLEN;
    return VERZIO_FAJL.test(resz) ? resz : ISMERETLEN;
  });
  return kimenet.join('/') as RedaktaltUtvonal;
}

export interface NaploBejegyzes {
  /** A hívott tároló-metódus vagy csatorna neve. */
  muvelet: string;
  kod: string;
  errno?: string;
  syscall?: string;
  utvonal?: RedaktaltUtvonal;
}

/**
 * A naplózandó hibákból bejegyzés, más hibára `null`. Csak mezők kerülnek bele, a hibaüzenet
 * soha: az `IoError` szövege a teljes utat, a `VersionConflictError`-é az orvos nevét viszi. A
 * `hivasUtvonal` a hívás saját (pl. verzió-) útja, ha a hibának nincs sajátja.
 */
export function naploBejegyzes(
  muvelet: string,
  err: unknown,
  gyoker: string,
  hivasUtvonal?: string,
): NaploBejegyzes | null {
  const hivasUt = hivasUtvonal ? redaktal(gyoker, hivasUtvonal) : undefined;
  if (err instanceof IoError) {
    return { muvelet, kod: 'IO', errno: err.errno, syscall: err.syscall, utvonal: redaktal(gyoker, err.utvonal) };
  }
  if (err instanceof FelulirasUtkozesError) return { muvelet, kod: 'FELULIRAS_UTKOZES', utvonal: redaktal(gyoker, err.fajl) };
  if (err instanceof VersionConflictError) {
    // A verziómappa neve csak dátum és sorszám, ezért a mintára illesztve közvetlenül naplózható;
    // ha nem illik, kimarad.
    const verzio = parseVersionDirName(err.dirName) ? err.dirName : null;
    const ut = hivasUt && verzio ? `${hivasUt}/${verzio}` : (hivasUt ?? verzio ?? undefined);
    return { muvelet, kod: 'VERZIO_UTKOZES', utvonal: ut as RedaktaltUtvonal | undefined };
  }
  if (err instanceof HianyosVerzioError) return { muvelet, kod: 'HIANYOS_VERZIO', utvonal: hivasUt };
  if (err instanceof TorlesAkadalyError) return { muvelet, kod: 'TORLES_AKADALY', utvonal: hivasUt };
  return null;
}

/** Fájlműveletek a naplóhoz -- a teszt hibát injektálhat. */
export interface NaploFs {
  mkdir: typeof fsp.mkdir;
  appendFile: typeof fsp.appendFile;
  stat: typeof fsp.stat;
  rename: typeof fsp.rename;
}

export const NAPLO_FAJL = 'io.log';
const ELOZO_FAJL = 'io.1.log';
const MAX_MERET = 1024 * 1024;

/**
 * `io.log`, ~1 MB-nál `io.1.log`-ra forgatva (a régit felülírva), `fsync` nélkül. A napló saját
 * hibája csendben elmarad: diagnosztika nem teheti használhatatlanná a mentést. Az írások egy
 * láncon futnak, hogy a forgatás és a hozzáfűzés ne keveredjen.
 */
export class Naplo {
  readonly mappa: string;
  private readonly fs: NaploFs;
  private readonly maxMeret: number;
  private lanc: Promise<void> = Promise.resolve();

  constructor(mappa: string, opciok: { fs?: NaploFs; maxMeret?: number } = {}) {
    this.mappa = mappa;
    this.fs = opciok.fs ?? fsp;
    this.maxMeret = opciok.maxMeret ?? MAX_MERET;
  }

  get fajl(): string {
    return path.join(this.mappa, NAPLO_FAJL);
  }

  /** Induláskori sor. A gyökérmappa útja a doki mappanevét hordozza, páciensnevet nem. */
  fejlec(adatok: { verzio: string; os: string; gyoker: string }): Promise<void> {
    return this.hozzafuz(`INDULAS app=${adatok.verzio} os=${adatok.os} gyoker=${adatok.gyoker}`);
  }

  ir(b: NaploBejegyzes): Promise<void> {
    return this.hozzafuz([b.muvelet, b.kod, b.errno, b.syscall, b.utvonal].filter(Boolean).join(' '));
  }

  private hozzafuz(szoveg: string): Promise<void> {
    const sor = `${new Date().toISOString()} ${szoveg}\n`;
    this.lanc = this.lanc.then(async () => {
      try {
        await this.fs.mkdir(this.mappa, { recursive: true });
        const meret = await this.fs.stat(this.fajl).then((s) => s.size, () => 0);
        if (meret >= this.maxMeret) await this.fs.rename(this.fajl, path.join(this.mappa, ELOZO_FAJL));
        await this.fs.appendFile(this.fajl, sor);
      } catch {
        // lásd az osztály kommentjét
      }
    });
    return this.lanc;
  }
}

/** A hívás naplózója a megadott gyökérhez: a naplózandó hibát bejegyzi, a többit átengedi. */
export function gyokerNaplozo(naplo: Pick<Naplo, 'ir'>, gyoker: string): Naplozo {
  return (muvelet, err, hivasUtvonal) => {
    const b = naploBejegyzes(muvelet, err, gyoker, hivasUtvonal);
    if (b) void naplo.ir(b);
  };
}

export type Naplozo = (muvelet: string, err: unknown, hivasUtvonal?: string) => void;
