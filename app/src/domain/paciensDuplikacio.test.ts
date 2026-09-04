import { describe, expect, it } from 'vitest';
import {
  duplikaciosJeloltek,
  nevJeloltek,
  nevKulcs,
  nevTokenek,
  szuletesiIdoViszony,
  telefonKulcs,
  telefonViszony,
} from './paciensDuplikacio';
import type { PatientFolder } from './types';

function patient(nev: string, paciensId = nev): PatientFolder {
  return { dirName: nev, paciensId, nev };
}

describe('nevTokenek', () => {
  it('ékezetfüggetlen, kisbetűs tokenekre bont', () => {
    expect(nevTokenek('Kovács János')).toEqual(['kovacs', 'janos']);
  });

  it('nem-betű/szám határon vág, nem csak szóközön', () => {
    expect(nevTokenek('Dr. Kovács János')).toEqual(['dr', 'kovacs', 'janos']);
    expect(nevTokenek('Kovács-Nagy Éva')).toEqual(['kovacs', 'nagy', 'eva']);
    expect(nevTokenek('Kovács, János')).toEqual(['kovacs', 'janos']);
  });

  it('üres/csak whitespace bemenetre üres tömböt ad', () => {
    expect(nevTokenek('')).toEqual([]);
    expect(nevTokenek('   ')).toEqual([]);
  });
});

describe('nevKulcs', () => {
  it('a tokeneket szóközzel összefűzve adja vissza', () => {
    expect(nevKulcs('Kovács  János')).toBe(nevKulcs('kovács jános'));
    expect(nevKulcs('Kovács János')).toBe('kovacs janos');
  });
});

describe('nevJeloltek', () => {
  it('ékezet-/kisbetűfüggetlen pontos egyezést talál', () => {
    const kovacs = patient('Kovács János');
    expect(nevJeloltek([kovacs], 'Kovacs Janos')).toEqual([{ patient: kovacs, egyezes: 'nev-pontos' }]);
  });

  it('felcserélt szórendet hasonlónak jelöl, nem pontosnak', () => {
    const kovacs = patient('Kovács János');
    expect(nevJeloltek([kovacs], 'János Kovács')).toEqual([{ patient: kovacs, egyezes: 'nev-hasonlo' }]);
  });

  it('a "-né" toldalékos nevet NEM jelöli hasonlónak (a leggyakoribb hamis pozitív)', () => {
    const janosne = patient('Kovács Jánosné');
    expect(nevJeloltek([janosne], 'Kovács János')).toEqual([]);
  });

  it('becenevet (prefix-egyezést) hasonlónak jelöl', () => {
    const ildiko = patient('Kovács Ildikó');
    expect(nevJeloltek([ildiko], 'Kovács Ildi')).toEqual([{ patient: ildiko, egyezes: 'nev-hasonlo' }]);
  });

  it('csak egy közös vezetéknévi token esetén nem jelöl (2 tokenes névnél a küszöb 2)', () => {
    const fekete = patient('Fekete Zoltán');
    expect(nevJeloltek([fekete], 'Tóth Zoltán')).toEqual([]);
    const krisztian = patient('Papp Krisztián');
    expect(nevJeloltek([krisztian], 'Papp Krisztina')).toEqual([]);
  });

  it('hosszabb, harmadik tokent tartalmazó nevet is jelöl, ha a közös rész eléri a küszöböt', () => {
    const annaMaria = patient('Szabó Anna Mária');
    expect(nevJeloltek([annaMaria], 'Szabó Anna')).toEqual([{ patient: annaMaria, egyezes: 'nev-hasonlo' }]);
  });

  it('a kihagyott paciensId-jű páciens sosem jelölt', () => {
    const kovacs = patient('Kovács János', 'p1');
    expect(nevJeloltek([kovacs], 'Kovács János', { kihagyottPaciensId: 'p1' })).toEqual([]);
  });

  it('üres begépelt névre üres listát ad', () => {
    const kovacs = patient('Kovács János');
    expect(nevJeloltek([kovacs], '   ')).toEqual([]);
  });

  it('nem mutálja a bemeneti tömböt', () => {
    const patients = [patient('Kovács János'), patient('Nagy Éva')];
    const eredeti = [...patients];
    nevJeloltek(patients, 'Kovács János');
    expect(patients).toEqual(eredeti);
  });
});

describe('szuletesiIdoViszony', () => {
  it('egyező ISO dátumra egyezik', () => {
    expect(szuletesiIdoViszony('1978-03-14', '1978-03-14')).toBe('egyezik');
  });

  it('eltérő ISO dátumra ellentmond', () => {
    expect(szuletesiIdoViszony('1978-03-14', '1990-01-01')).toBe('ellentmond');
  });

  it('üres oldalra hianyzik', () => {
    expect(szuletesiIdoViszony('', '1978-03-14')).toBe('hianyzik');
    expect(szuletesiIdoViszony('1978-03-14', '')).toBe('hianyzik');
  });

  it('nem-ISO alakú értékre hianyzik, sosem ellentmond', () => {
    expect(szuletesiIdoViszony('1978.03.14', '1978-03-14')).toBe('hianyzik');
  });
});

describe('telefonKulcs', () => {
  it('a mobilszám alakjait azonos kulcsra hozza', () => {
    const k = telefonKulcs('+36 30 123 4567');
    expect(telefonKulcs('06301234567')).toBe(k);
    expect(telefonKulcs('30 123 4567')).toBe(k);
  });

  it('a vezetékes (8 jegyű) szám alakjait azonos kulcsra hozza', () => {
    const k = telefonKulcs('+36 1 234 5678');
    expect(telefonKulcs('06 1 234 5678')).toBe(k);
    expect(telefonKulcs('1234 5678')).toBe(k);
  });

  it('7 jegynél rövidebb töredékre null-t ad', () => {
    expect(telefonKulcs('234 5678')).toBeNull();
    expect(telefonKulcs('')).toBeNull();
  });
});

describe('telefonViszony', () => {
  it('egyező kulcsra egyezik, eltérőre ellentmond', () => {
    expect(telefonViszony('+36 30 123 4567', '06301234567')).toBe('egyezik');
    expect(telefonViszony('+36 30 123 4567', '+36 20 999 8888')).toBe('ellentmond');
  });

  it('hiányzó oldalra hianyzik, sosem ellentmond', () => {
    expect(telefonViszony('', '+36 30 123 4567')).toBe('hianyzik');
  });
});

describe('duplikaciosJeloltek', () => {
  const bemenet = { nev: 'Kovács János', szuletesiIdo: '1978-03-14', telefon: '+36 30 123 4567' };

  it('pontos névegyezés MÉG BE NEM TÖLTÖTT fázis-2 adattal is azonnal megjelenik (nincs regresszió a mai viselkedéshez képest)', () => {
    const kovacs = patient('Kovács János');
    const eredmeny = duplikaciosJeloltek([{ patient: kovacs, egyezes: 'nev-pontos' }], bemenet, {});
    expect(eredmeny).toEqual([
      {
        patient: kovacs,
        egyezes: 'nev-pontos',
        szuletesiIdo: 'hianyzik',
        telefon: 'hianyzik',
        ellentmondas: false,
        betoltve: false,
        adat: null,
      },
    ]);
  });

  it('a be nem töltött jelölt megkülönböztethető a betöltött-de-üres jelölttől', () => {
    const kovacs = patient('Kovács János');
    const betoltveUres = duplikaciosJeloltek(
      [{ patient: kovacs, egyezes: 'nev-pontos' }],
      bemenet,
      { [kovacs.dirName]: null },
    );
    expect(betoltveUres[0].betoltve).toBe(true);
    expect(betoltveUres[0].adat).toBeNull();

    const megNincsBetoltve = duplikaciosJeloltek([{ patient: kovacs, egyezes: 'nev-pontos' }], bemenet, {});
    expect(megNincsBetoltve[0].betoltve).toBe(false);
    expect(megNincsBetoltve[0].adat).toBeNull();
  });

  it('hasonló névegyezés be nem töltött fázis-2 adattal NEM jelenik meg (nincs felvillanó-majd-eltűnő javaslat)', () => {
    const hasonlo = patient('Kovács Jánosi');
    const eredmeny = duplikaciosJeloltek([{ patient: hasonlo, egyezes: 'nev-hasonlo' }], bemenet, {});
    expect(eredmeny).toEqual([]);
  });

  it('pontos névegyezés ellentmondó DOB-bal is bennmarad, jelöléssel', () => {
    const kovacs = patient('Kovács János');
    const eredmeny = duplikaciosJeloltek(
      [{ patient: kovacs, egyezes: 'nev-pontos' }],
      bemenet,
      { [kovacs.dirName]: { szuletesiIdo: '1990-01-01', telefon: '' } },
    );
    expect(eredmeny).toEqual([
      {
        patient: kovacs,
        egyezes: 'nev-pontos',
        szuletesiIdo: 'ellentmond',
        telefon: 'hianyzik',
        ellentmondas: true,
        betoltve: true,
        adat: { szuletesiIdo: '1990-01-01', telefon: '' },
      },
    ]);
  });

  it('hasonló névegyezés ellentmondó telefonnal kiesik', () => {
    const hasonlo = patient('Kovács Jánosi');
    const eredmeny = duplikaciosJeloltek(
      [{ patient: hasonlo, egyezes: 'nev-hasonlo' }],
      bemenet,
      { [hasonlo.dirName]: { szuletesiIdo: '', telefon: '+36 20 999 8888' } },
    );
    expect(eredmeny).toEqual([]);
  });

  it('hasonló névegyezés egyező vagy hiányzó adattal bekerül', () => {
    const hasonlo = patient('Kovács Jánosi');
    const eredmeny = duplikaciosJeloltek(
      [{ patient: hasonlo, egyezes: 'nev-hasonlo' }],
      bemenet,
      { [hasonlo.dirName]: { szuletesiIdo: '1978-03-14', telefon: '' } },
    );
    expect(eredmeny).toEqual([
      {
        patient: hasonlo,
        egyezes: 'nev-hasonlo',
        szuletesiIdo: 'egyezik',
        telefon: 'hianyzik',
        ellentmondas: false,
        betoltve: true,
        adat: { szuletesiIdo: '1978-03-14', telefon: '' },
      },
    ]);
  });

  it('rendezés: pontos < hasonló, azon belül megerősített < hiányzó < ellentmondó, végül név szerint', () => {
    const pontosEllentmondo = patient('Kovács János Pontos', 'p1');
    const hasonloMegerositett = patient('Kovács Jánosi Hasonló', 'p2');
    const pontosHianyzo = patient('Kovács János Hianyzo', 'p3');
    const eredmeny = duplikaciosJeloltek(
      [
        { patient: pontosEllentmondo, egyezes: 'nev-pontos' },
        { patient: hasonloMegerositett, egyezes: 'nev-hasonlo' },
        { patient: pontosHianyzo, egyezes: 'nev-pontos' },
      ],
      bemenet,
      {
        [pontosEllentmondo.dirName]: { szuletesiIdo: '1990-01-01', telefon: '' },
        [hasonloMegerositett.dirName]: { szuletesiIdo: '1978-03-14', telefon: '' },
        [pontosHianyzo.dirName]: { szuletesiIdo: '', telefon: '' },
      },
    );
    expect(eredmeny.map((j) => j.patient.dirName)).toEqual([
      pontosHianyzo.dirName,
      pontosEllentmondo.dirName,
      hasonloMegerositett.dirName,
    ]);
  });

  it('nem mutálja a bemeneti tömböt', () => {
    const kovacs = patient('Kovács János');
    const jeloltek = [{ patient: kovacs, egyezes: 'nev-pontos' as const }];
    const eredeti = [...jeloltek];
    duplikaciosJeloltek(jeloltek, bemenet, {});
    expect(jeloltek).toEqual(eredeti);
  });
});
