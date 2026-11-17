// A tárolók típusos hibái. DOM-mentes modul: a main process dobja, a renderer felismeri
// (migrációs terv §3.3, §5).

/** A tároló-hibák errno-osztályai; ami nem ezek egyike, `EGYEB`. */
export const IO_ERRNO = ['ENOENT', 'EACCES', 'EPERM', 'EBUSY', 'ENOSPC', 'EROFS', 'EMFILE', 'EISDIR', 'ENOTDIR'] as const;
export type IoErrno = (typeof IO_ERRNO)[number] | 'EGYEB';

export function ioErrno(kod: unknown): IoErrno {
  return (IO_ERRNO as readonly unknown[]).includes(kod) ? (kod as IoErrno) : 'EGYEB';
}

/** Fájlrendszeri hiba; az `utvonal` teljes, csak a felületen mutatható. */
export class IoError extends Error {
  readonly kod = 'IO';
  readonly errno: IoErrno;
  readonly utvonal: string;

  constructor(errno: IoErrno, utvonal: string) {
    super(`Fájlrendszer-hiba (${errno}): ${utvonal}`);
    this.name = 'IoError';
    this.errno = errno;
    this.utvonal = utvonal;
  }
}

/** A gyökérmappa a miénk, de egy része hiányzik -- az `init()` ilyenkor nem ír semmit. */
export class HianyosMappaError extends Error {
  readonly hianyzik: string[];

  constructor(hianyzik: string[]) {
    super(`Az adatmappa hiányos (hiányzik: ${hianyzik.join(', ')}).`);
    this.name = 'HianyosMappaError';
    this.hianyzik = hianyzik;
  }
}

/** A gyökérmappa nem üres, és nem a miénk -- az `init()` nem ír bele. */
export class IdegenMappaError extends Error {
  constructor() {
    super('A kiválasztott mappa nem üres, és nem a Mándoki Dental adatmappája.');
    this.name = 'IdegenMappaError';
  }
}

/** Sérült (nem JSON) fájl -- az üzenet a `parseJson` mai, ember-olvasható szövege. */
export class SerultJsonError extends Error {
  readonly fajl: string;

  constructor(fajl: string, uzenet: string) {
    super(uzenet);
    this.name = 'SerultJsonError';
    this.fajl = fajl;
  }
}

/** A fájl a betöltés óta a lemezen megváltozott (migrációs terv §4.6). */
export class FelulirasUtkozesError extends Error {
  readonly fajl: string;
  readonly lemezenLevo: unknown;
  readonly mentettMasolat: string;

  constructor(fajl: string, lemezenLevo: unknown, mentettMasolat: string) {
    super(`A(z) ${fajl} időközben a másik gépen módosult.`);
    this.name = 'FelulirasUtkozesError';
    this.fajl = fajl;
    this.lemezenLevo = lemezenLevo;
    this.mentettMasolat = mentettMasolat;
  }
}

/** A verzió még nem teljes JSON+PDF-pár (migrációs terv §4.3). */
export class HianyosVerzioError extends Error {
  readonly versionDir: string;
  readonly hianyzik: string[];

  constructor(versionDir: string, hianyzik: string[]) {
    super(`Ez a verzió még nem teljes (hiányzik: ${hianyzik.join(', ')}).`);
    this.name = 'HianyosVerzioError';
    this.versionDir = versionDir;
    this.hianyzik = hianyzik;
  }
}

/** A páciens az ellenőrzés óta tervet kapott -- a törlés elmarad. */
export class TorlesAkadalyError extends Error {
  readonly ok: string;

  constructor(ok: string) {
    super('A páciens időközben kapott tervet, nem törölhető.');
    this.name = 'TorlesAkadalyError';
    this.ok = ok;
  }
}

/** A hívás nem a főablak saját oldaláról jött -- a main nem szolgálja ki. */
export class TiltottKuldoError extends Error {
  constructor() {
    super('A tároló-hívás nem az alkalmazás főablakából érkezett.');
    this.name = 'TiltottKuldoError';
  }
}

/** A hívás paramétere nem felel meg a szerződésnek -- a main nem ír semmit. */
export class ErvenytelenParameterError extends Error {
  constructor(uzenet: string) {
    super(`Érvénytelen tároló-paraméter: ${uzenet}`);
    this.name = 'ErvenytelenParameterError';
  }
}
