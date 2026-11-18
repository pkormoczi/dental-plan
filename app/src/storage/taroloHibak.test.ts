import { describe, expect, it } from 'vitest';
import { IoError } from './taroloHibak';

describe('IoError szövege a doki nyelvén', () => {
  it.each([
    ['ENOENT', /^A beállított adatmappa nem érhető el\. Lehet, hogy a Google Drive még nem szinkronizált\./],
    ['EACCES', /^Nincs jogosultság ehhez a fájlhoz, vagy más program használja\./],
    ['EPERM', /^Nincs jogosultság ehhez a fájlhoz, vagy más program használja\./],
    ['EBUSY', /^Nincs jogosultság ehhez a fájlhoz, vagy más program használja\./],
    ['ENOSPC', /^Nincs elég szabad hely a lemezen\.$/],
    ['EROFS', /^Az adatmappa írásvédett\./],
    ['EMFILE', /^Váratlan fájlrendszer-hiba, indítsd újra az alkalmazást\./],
    ['EGYEB', /^Váratlan fájlrendszer-hiba, indítsd újra az alkalmazást\./],
  ] as const)('%s: %s', (errno, szoveg) => {
    const hiba = new IoError(errno, 'C:/Adat/arlista.json');

    expect(hiba.message).toMatch(szoveg);
    expect(hiba.message).not.toMatch(errno);
  });

  it.each(['EISDIR', 'ENOTDIR'] as const)('%s: a váratlan tartalmú fájlt megnevezi', (errno) => {
    expect(new IoError(errno, 'C:/Adat/arlista.json').message).toBe(
      'A(z) C:/Adat/arlista.json váratlan tartalmú, a mappa sérülhetett.',
    );
  });

  it('a hely nélküli hibánál is a fájl útja a szövegben marad, hogy a doki megtalálja', () => {
    expect(new IoError('EACCES', 'C:/Adat/arlista.json').message).toContain('C:/Adat/arlista.json');
  });
});
