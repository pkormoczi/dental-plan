import { describe, expect, it } from 'vitest';
import {
  egyezoKategoriaIdk,
  fogszamBontas,
  nevEgyezik,
  norm,
  rangsoroltTetelTalalatok,
} from './search';
import type { Kategoria, LokalizaltSzoveg, Tetel } from './types';

describe('norm', () => {
  it('strips accents so "gyoker" matches "Gyökérkezelés"', () => {
    expect(norm('Gyökérkezelés').includes(norm('gyoker'))).toBe(true);
  });

  it('strips accents so "eszetikus" pattern matches "Esztétikus"', () => {
    expect(norm('Esztétikus tömés').includes(norm('esztetikus'))).toBe(true);
  });

  it('lowercases', () => {
    expect(norm('KORONA')).toBe('korona');
  });

  it('handles null/undefined without throwing', () => {
    expect(norm(null)).toBe('');
    expect(norm(undefined)).toBe('');
  });
});

describe('nevEgyezik', () => {
  const nev = { hu: 'Zirkonkerámia korona', de: 'Zirkonkeramikkrone' };

  it('a magyar néven egyezik', () => {
    expect(nevEgyezik(nev, norm('zirkonkeramia'))).toBe(true);
  });

  // A doki magyarul gépel akkor is, ha német ajánlatot állít össze -- de egy
  // csak németül elnevezett/elgépelt tételt is meg kell találnia.
  it('a német néven is egyezik, a terv nyelvétől függetlenül', () => {
    expect(nevEgyezik(nev, norm('keramikkrone'))).toBe(true);
  });

  it('nem egyezik, ha egyik névben sincs benne', () => {
    expect(nevEgyezik(nev, norm('implantatum'))).toBe(false);
  });

  it('hiányzó német névnél nem hasal el, a magyar ág változatlanul működik', () => {
    const csakHu = { hu: 'Fogeltávolítás', de: null };
    expect(nevEgyezik(csakHu, norm('fogeltavolitas'))).toBe(true);
    expect(nevEgyezik(csakHu, norm('krone'))).toBe(false);
  });
});

describe('rangsoroltTetelTalalatok', () => {
  let sorrend = 0;
  function tetel(
    hu: string,
    jelolok: { gyakori?: boolean; csomag?: boolean; de?: string } = {},
  ): Tetel {
    sorrend += 1;
    const nev: LokalizaltSzoveg = { hu, de: jelolok.de ?? null };
    return {
      id: `t${sorrend}`,
      kategoriaId: 'k01',
      sorrend,
      aktiv: true,
      gyakori: jelolok.gyakori ?? false,
      nev,
      ar: { HUF: { tipus: 'FIX', ertek: 10000 }, EUR: null },
      ...(jelolok.csomag != null ? { csomag: jelolok.csomag } : {}),
    };
  }
  const nevek = (talalatok: Tetel[]) => talalatok.map((x) => x.nev.hu);

  it('a szóhatár-egyezés megelőzi a belső egyezést, az árlista-sorrend ellenére', () => {
    const talalatok = [
      tetel('Gyökértömés eltávolítása /csatorna'),
      tetel('Gyökértömés csatornaszámtól függően'),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('csatorna')))).toEqual([
      'Gyökértömés csatornaszámtól függően',
      'Gyökértömés eltávolítása /csatorna',
    ]);
  });

  it('a szó eleji egyezés megelőzi a szóhatár-egyezést', () => {
    const talalatok = [tetel('Neodent implantátumfej'), tetel('Implantátumfej-csavar')];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('implantatumfej')))).toEqual([
      'Implantátumfej-csavar',
      'Neodent implantátumfej',
    ]);
  });

  it('azonos relevancia-szinten a gyakori tétel előrébb, a csomag hátrébb kerül', () => {
    const talalatok = [
      tetel('Neodent implantátum csomagban', { csomag: true }),
      tetel('Neodent implantátum'),
      tetel('Neodent felépítmény', { gyakori: true }),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('neodent')))).toEqual([
      'Neodent felépítmény',
      'Neodent implantátum',
      'Neodent implantátum csomagban',
    ]);
  });

  it('a relevancia dönt a gyakori/csomag jelölés ellenére is', () => {
    const talalatok = [
      tetel('Sebészi gyökértömés', { gyakori: true }),
      tetel('Gyökértömés csomag', { csomag: true }),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('gyokertomes')))).toEqual([
      'Gyökértömés csomag',
      'Sebészi gyökértömés',
    ]);
  });

  it('a két nyelv közül a jobbik rang számít -- egy erős magyar egyezést nem nyom le a gyenge német', () => {
    const talalatok = [
      tetel('Fogászati korona', { de: 'Krone' }),
      // A német név csak belső egyezés (rang 2), a magyar viszont szó eleji
      // (rang 0) -- a jobbik számít.
      tetel('Korona', { de: 'Vollkeramikkorona' }),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('korona')))).toEqual([
      'Korona',
      'Fogászati korona',
    ]);
  });

  it('amíg van másik névtalálat, a visszabontás-tétel nem lehet az első', () => {
    const talalatok = [
      tetel('Gyökértömés eltávolítása /csatorna'),
      tetel('Gyökértömés csatornaszámtól függően'),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('gyokertomes')))).toEqual([
      'Gyökértömés csatornaszámtól függően',
      'Gyökértömés eltávolítása /csatorna',
    ]);
  });

  it('a büntetés a relevanciát is felülírja: a szó eleji visszabontás-tétel a belső egyezés mögé kerül', () => {
    const talalatok = [
      tetel('Korona felvágás eltávolítás /db'),
      tetel('Zirkonkerámia korona'),
    ];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('koron')))).toEqual([
      'Zirkonkerámia korona',
      'Korona felvágás eltávolítás /db',
    ]);
  });

  it('aki visszabontást gépel, azt kapja: a büntetés néma, a relevancia dönt', () => {
    const talalatok = [tetel('Fogeltávolítás'), tetel('Korona felvágás eltávolítás /db')];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('eltavolitas')))).toEqual([
      'Korona felvágás eltávolítás /db',
      'Fogeltávolítás',
    ]);
  });

  // Az önálló, elsődleges kezelés nem egy pótlás ellentéte -- a kulcsszó ott
  // összetett szó belsejében áll, nem tokenkezdetként.
  it('a "Fogeltávolítás" nem kap büntetést, mert a kulcsszó nem külön token', () => {
    const talalatok = [tetel('Fogeltávolítás'), tetel('Fogkőeltávolítás')];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('fog')))).toEqual([
      'Fogeltávolítás',
      'Fogkőeltávolítás',
    ]);
  });

  it('azonos rangon és jelölés nélkül a kapott árlista-sorrend marad', () => {
    const talalatok = [tetel('Neodent A'), tetel('Neodent B'), tetel('Neodent C')];
    expect(nevek(rangsoroltTetelTalalatok(talalatok, norm('neodent')))).toEqual([
      'Neodent A',
      'Neodent B',
      'Neodent C',
    ]);
  });
});

describe('egyezoKategoriaIdk', () => {
  const kategoriak: Kategoria[] = [
    { id: 'k01', nev: { hu: 'Fogkőeltávolítás', de: 'Zahnsteinentfernung' }, sorrend: 1 },
    { id: 'k02', nev: { hu: 'Korona és hídpótlások', de: null }, sorrend: 2 },
  ];

  it('a magyar kategórianévre illeszkedő id bekerül a halmazba', () => {
    expect(egyezoKategoriaIdk(kategoriak, norm('fogko'))).toEqual(new Set(['k01']));
  });

  it('a német kategórianévre is illeszkedik, a terv nyelvétől függetlenül', () => {
    expect(egyezoKategoriaIdk(kategoriak, norm('zahnstein'))).toEqual(new Set(['k01']));
  });

  it('nem illeszkedő szóra üres halmazt ad', () => {
    expect(egyezoKategoriaIdk(kategoriak, norm('implantatum'))).toEqual(new Set());
  });
});

describe('fogszamBontas', () => {
  it('leválasztja a fogszám-tokent, a maradék a névrész', () => {
    expect(fogszamBontas('18 fogeltávolítás')).toEqual({ fogak: '18', nevResz: 'fogeltávolítás' });
  });

  it('több fogszámot a Fog mező elválasztójával fűz össze, a sorrendet tartva', () => {
    expect(fogszamBontas('16 17 korona')).toEqual({ fogak: '16, 17', nevResz: 'korona' });
  });

  it('a fogszám a szöveg végén is leválik', () => {
    expect(fogszamBontas('korona 26')).toEqual({ fogak: '26', nevResz: 'korona' });
  });

  it('ismételt fogszám nem duplikálódik', () => {
    expect(fogszamBontas('16 16 korona')).toEqual({ fogak: '16', nevResz: 'korona' });
  });

  it('csupa fogszámnál nem bont: az eredeti szöveg marad a névrész, a fogak üres', () => {
    expect(fogszamBontas('36')).toEqual({ fogak: '', nevResz: '36' });
    expect(fogszamBontas('16 17')).toEqual({ fogak: '', nevResz: '16 17' });
  });

  it('fogszám nélküli keresés érintetlen', () => {
    expect(fogszamBontas('gyokertomes')).toEqual({ fogak: '', nevResz: 'gyokertomes' });
  });

  it('a nem érvényes FDI szám NEM válik le -- az árlistában vannak számos nevek', () => {
    expect(fogszamBontas('tomes 3 felszin')).toEqual({ fogak: '', nevResz: 'tomes 3 felszin' });
    expect(fogszamBontas('All-on-4')).toEqual({ fogak: '', nevResz: 'All-on-4' });
    expect(fogszamBontas('klipsz 99')).toEqual({ fogak: '', nevResz: 'klipsz 99' });
  });
});
