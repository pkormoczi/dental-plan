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
