import { describe } from 'vitest';
import { alapKeszletetIr, FajlTarolo } from './fajlTarolo';
import { MemoriaPrimitivek } from './memoriaPrimitivek';
import { taroloSzerzodesTesztek } from './szerzodesTesztek';

describe('FajlTarolo memóriás primitíveken, verzió-manifesttel és ütközésőrrel', () => {
  taroloSzerzodesTesztek(async () => {
    const prim = new MemoriaPrimitivek();
    await alapKeszletetIr(prim);
    const storage = new FajlTarolo(prim, {
      pdfFajlnev: 'kezelesi-terv.pdf',
      mentesHibaUzenet: 'A tervet nem sikerült elmenteni.',
      verzioManifest: true,
      utkozesOr: true,
    });
    return {
      storage,
      nyersOlvas: (ut) => prim.olvasSzoveg(ut),
      nyersIr: (ut, tartalom) => prim.irSzoveg(ut, tartalom),
      osszesFajl: async () => [...prim.fajlok.keys()],
      irasFigyelo: (fn) => {
        const { irSzoveg, irBajt } = prim;
        prim.irSzoveg = async (ut, tartalom) => {
          fn(ut);
          return irSzoveg.call(prim, ut, tartalom);
        };
        prim.irBajt = async (ut, tartalom) => {
          fn(ut);
          return irBajt.call(prim, ut, tartalom);
        };
        return () => {
          prim.irSzoveg = irSzoveg;
          prim.irBajt = irBajt;
        };
      },
    };
  });
});
