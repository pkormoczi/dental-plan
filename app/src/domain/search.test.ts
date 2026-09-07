import { describe, expect, it } from 'vitest';
import { egyezoKategoriaIdk, nevEgyezik, norm, rangsoroltTetelTalalatok } from './search';
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
