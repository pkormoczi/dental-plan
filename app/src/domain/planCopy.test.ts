import { describe, expect, it } from 'vitest';
import { createBlankPlan } from './blankPlan';
import { planMasolatKent, planUjPaciensselTervhez, planUjTorzsadattal } from './planCopy';
import type { Paciens, PatientMasterData, Plan, PriceList, Settings } from './types';

const settings: Settings = {
  schemaVersion: 1,
  rendelo: {
    nev: 'Teszt Rendelő',
    cim: '',
    telefon: '',
    email: '',
    adoszam: '',
    cegjegyzekszam: '',
  },
  orvosok: ['Dr. Teszt Elek'],
  ervenyessegNap: 90,
  alapertelmezettNyelv: 'hu',
};

const priceList: PriceList = {
  schemaVersion: 1,
  arlistaVerzio: '2026-07-01',
  modositva: '2026-07-01',
  kategoriak: [],
  tetelek: [],
};

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    schemaVersion: 1,
    tervId: 'p1',
    paciensId: 'pac1',
    verzio: 2,
    statusz: 'VEGLEGES',
    nyelv: 'de',
    penznem: 'EUR',
    keltezes: '2026-06-10',
    ervenyesIg: '2026-07-10',
    arlistaVerzio: '2026-05-01',
    sablonVerzio: 'nyilatkozat-de-v1',
    orvos: 'Dr. Teszt Elek',
    paciens: {
      nev: 'Nagy Éva',
      szuletesiIdo: '1980-01-01',
      lakcim: 'Budapest',
      telefon: '+36 30 000 0000',
      email: 'eva@example.hu',
      taj: '123 456 789',
      kiskoru: false,
      torvenyesKepviselo: null,
    },
    fazisok: [
      {
        sorszam: 1,
        megnevezes: '1. kezelés',
        megjegyzes: '',
        sorok: [
          {
            tetelId: 't001',
            nevSnapshot: 'Fogeltávolítás',
            savos: false,
            fogak: '16',
            mennyiseg: 1,
            listaEgysegar: 100,
            tenylegesEgysegar: 90,
          },
        ],
      },
    ],
    // Szándékosan HAMIS a valós sorösszeghez (90) képest -- igazolja, hogy
    // planMasolatKent() nem ezt a mezőt másolja, hanem újraszámolja.
    osszesitok: { kezelesekOsszesen: 9999, kedvezmeny: 9999, fizetendo: 9999 },
    elolegOsszeg: 50000,
    kedvezmenyOsszeg: 5,
    ...overrides,
  };
}

describe('planUjPaciensselTervhez', () => {
  it('csak a paciens blokkot viszi át, minden más a friss createBlankPlan() alapértéke', () => {
    const plan = makePlan();
    const uj = planUjPaciensselTervhez(plan, settings, priceList);
    const blank = createBlankPlan(settings, priceList);

    expect(uj.paciens).toEqual(plan.paciens);
    expect(uj).toEqual({ ...blank, paciens: plan.paciens, paciensId: plan.paciensId });
  });

  it('nem a forrás nyelvét/pénznemét/soraiat viszi -- a mai alapérték áll be', () => {
    const plan = makePlan();
    const uj = planUjPaciensselTervhez(plan, settings, priceList);

    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('HUF');
    expect(uj.fazisok.every((f) => f.sorok.length === 0)).toBe(true);
    expect(uj.elolegOsszeg).toBeNull();
    expect(uj.kedvezmenyOsszeg).toBeNull();
    expect(uj.tervId).toBe('');
  });

  it('nem mutálja a forrás tervet', () => {
    const plan = makePlan();
    const eredetiPaciens = plan.paciens;
    planUjPaciensselTervhez(plan, settings, priceList);
    expect(plan.paciens).toBe(eredetiPaciens);
  });

  // D29: a paciensId a másolatot UGYANABBAN a páciens-mappában tartja --
  // enélkül a storage.savePlan() tévesen egy MÁSIK páciens-mappát nyitna.
  it('a forrás paciensId-jét viszi tovább, hogy a másolat ugyanabban a páciens-mappában maradjon', () => {
    const plan = makePlan();
    const uj = planUjPaciensselTervhez(plan, settings, priceList);
    expect(uj.paciensId).toBe('pac1');
  });

  // D534 (47. tétel): a nyelv/pénznem-öröklés az `oroklott` paraméteren át
  // jut el a createBlankPlan()-be, nem a forrás `plan`-ből.
  it('az oroklott nyelvet/pénznemet veszi át, nem a forrás terv nyelvét/pénznemét', () => {
    const plan = makePlan(); // nyelv: 'de', penznem: 'EUR'
    const uj = planUjPaciensselTervhez(plan, settings, priceList, { nyelv: 'hu', penznem: 'EUR' });
    expect(uj.nyelv).toBe('hu');
    expect(uj.penznem).toBe('EUR');
  });
});

function makeTorzsadat(overrides: Partial<PatientMasterData> = {}): PatientMasterData {
  const paciens: Paciens = {
    nev: 'Tóth Márta',
    szuletesiIdo: '1975-05-05',
    lakcim: 'Szeged',
    telefon: '+36 20 111 2222',
    email: 'marta@example.hu',
    taj: '111 222 333',
    kiskoru: false,
    torvenyesKepviselo: null,
  };
  return { schemaVersion: 1, paciensId: 'pacT', ...paciens, ...overrides };
}

// D33 (backlog-28): planUjTorzsadattal a törzsadatból indít -- a
// planUjPaciensselTervhez párja, csak más forrásból.
describe('planUjTorzsadattal', () => {
  it('a törzsadatból épített paciens blokkot és a paciensId-t viszi át, minden más a friss createBlankPlan() alapértéke', () => {
    const adatok = makeTorzsadat();
    const uj = planUjTorzsadattal(adatok, settings, priceList);
    const blank = createBlankPlan(settings, priceList);

    expect(uj.paciens).toEqual({
      nev: adatok.nev,
      szuletesiIdo: adatok.szuletesiIdo,
      lakcim: adatok.lakcim,
      telefon: adatok.telefon,
      email: adatok.email,
      taj: adatok.taj,
      kiskoru: adatok.kiskoru,
      torvenyesKepviselo: adatok.torvenyesKepviselo,
    });
    expect(uj).toEqual({ ...blank, paciens: uj.paciens, paciensId: adatok.paciensId });
  });

  it('nem mutálja a törzsadatot', () => {
    const adatok = makeTorzsadat();
    const eredetiNev = adatok.nev;
    planUjTorzsadattal(adatok, settings, priceList);
    expect(adatok.nev).toBe(eredetiNev);
  });

  // D534 (47. tétel)
  it('az oroklott nyelvet/pénznemet veszi át', () => {
    const adatok = makeTorzsadat();
    const uj = planUjTorzsadattal(adatok, settings, priceList, { nyelv: 'de', penznem: 'EUR' });
    expect(uj.nyelv).toBe('de');
    expect(uj.penznem).toBe('EUR');
  });
});

describe('planMasolatKent', () => {
  // D63: az orvos NEM tartozik az "mindent átvisz" körbe -- lásd külön
  // describe lent, saját fixture-rel (itt a forrás orvosa és a default
  // egybeesne, ami álpozitív lenne).
  it('az azonosító/állapot/dátum és az orvos kivételével mindent átvisz a forrásból', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    expect(masolat.paciens).toEqual(plan.paciens);
    // D29: paciensId is átjön -- a másolat ugyanabban a páciens-mappában
    // nyit új terv-láncot (D26 érintetlen: nem verzióként csúszik be).
    expect(masolat.paciensId).toBe(plan.paciensId);
    expect(masolat.nyelv).toBe(plan.nyelv);
    expect(masolat.penznem).toBe(plan.penznem);
    expect(masolat.fazisok).toEqual(plan.fazisok);
    expect(masolat.arlistaVerzio).toBe(plan.arlistaVerzio);
    expect(masolat.elolegOsszeg).toBe(plan.elolegOsszeg);
    expect(masolat.kedvezmenyOsszeg).toBe(plan.kedvezmenyOsszeg);
    // docs/02-domain-modell.md § Tétel-leírás: ugyanúgy pillanatkép-jellegű,
    // mint nyelv/penznem -- öröklődik, nem nullázódik.
    expect(masolat.leirasokMutatasa).toBe(plan.leirasokMutatasa);
  });

  it('tervId/verzio/statusz nullázódik, a keltezés/ervenyesIg friss', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    expect(masolat.tervId).toBe('');
    expect(masolat.verzio).toBe(0);
    expect(masolat.statusz).toBe('PISZKOZAT');
    expect(masolat.keltezes).toBe('2026-08-10');
    expect(masolat.ervenyesIg).toBe('2026-11-08'); // 2026-08-10 + 90 nap
  });

  it('az osszesitok a saját sorokból ÚJRASZÁMOLVA jön, nem a forrás (hamis) osszesitok-ja', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');

    // A forrás sorösszege 90 (1 x 90), a kedvezmenyOsszeg 5.
    expect(masolat.osszesitok).toEqual({
      kezelesekOsszesen: 100,
      kedvezmeny: 15,
      fizetendo: 85,
    });
    expect(masolat.osszesitok).not.toEqual(plan.osszesitok);
  });

  it('nem mutálja a forrás tervet', () => {
    const plan = makePlan();
    const eredetiKeltezes = plan.keltezes;
    const eredetiOsszesitok = plan.osszesitok;
    planMasolatKent(plan, settings, '2026-08-10');
    expect(plan.keltezes).toBe(eredetiKeltezes);
    expect(plan.osszesitok).toBe(eredetiOsszesitok);
  });

  // D57: a master paraméter nélkül a mai viselkedés marad -- a forrás
  // pillanatképe másolódik, törzsadat híján ez az egyetlen elérhető forrás.
  it('master nélkül a forrás paciens pillanatképét viszi át', () => {
    const plan = makePlan();
    const masolat = planMasolatKent(plan, settings, '2026-08-10');
    expect(masolat.paciens).toEqual(plan.paciens);
  });

  // D57: masterrel a paciens blokk minden mezője a törzsadatból jön, a
  // forrás pillanatképe helyett.
  it('master megadásával a paciens blokk a törzsadatból jön, nem a forrás pillanatképéből', () => {
    const plan = makePlan();
    const master: PatientMasterData = {
      schemaVersion: 1,
      paciensId: 'masik-pac-id',
      nev: 'Nagy Éva',
      szuletesiIdo: '1980-01-01',
      lakcim: 'Debrecen, Friss utca 1.',
      telefon: '+36 30 999 9999',
      email: 'eva.friss@example.hu',
      taj: '123 456 789',
      kiskoru: false,
      torvenyesKepviselo: null,
    };
    const masolat = planMasolatKent(plan, settings, '2026-08-10', master);

    expect(masolat.paciens).toEqual({
      nev: master.nev,
      szuletesiIdo: master.szuletesiIdo,
      lakcim: master.lakcim,
      telefon: master.telefon,
      email: master.email,
      taj: master.taj,
      kiskoru: master.kiskoru,
      torvenyesKepviselo: master.torvenyesKepviselo,
    });
    expect(masolat.paciens).not.toEqual(plan.paciens);
  });

  // D26: a paciensId a másolatot a FORRÁS páciens-mappájában tartja --
  // masterrel is, a master saját paciensId-je nem veheti át a szerepét.
  it('masterrel is a forrás paciensId-jét viszi tovább, nem a masterét', () => {
    const plan = makePlan();
    const master: PatientMasterData = {
      schemaVersion: 1,
      paciensId: 'masik-pac-id',
      nev: 'Nagy Éva',
      szuletesiIdo: '1980-01-01',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    };
    const masolat = planMasolatKent(plan, settings, '2026-08-10', master);
    expect(masolat.paciensId).toBe(plan.paciensId);
    expect(masolat.paciensId).not.toBe(master.paciensId);
  });

  it('nem mutálja a master törzsadatot', () => {
    const plan = makePlan();
    const master: PatientMasterData = {
      schemaVersion: 1,
      paciensId: 'masik-pac-id',
      nev: 'Nagy Éva',
      szuletesiIdo: '1980-01-01',
      lakcim: '',
      telefon: '',
      email: '',
      taj: '',
      kiskoru: false,
      torvenyesKepviselo: null,
    };
    const eredetiNev = master.nev;
    planMasolatKent(plan, settings, '2026-08-10', master);
    expect(master.nev).toBe(eredetiNev);
  });

  // D63: az orvos MINDIG a globális default, a forrásé sosem másolódik --
  // a forrás orvosa itt SZÁNDÉKOSAN eltér a defaulttól, hogy a teszt ne
  // hamis-pozitívan menjen át (lásd a fenti "mindent átvisz" teszt kommentjét).
  it('az orvos mindig a globális default, a forrásé sosem másolódik', () => {
    const s = {
      ...settings,
      orvosok: ['Dr. Régi Rezső', 'Dr. Új Orsolya'],
      alapertelmezettOrvos: 'Dr. Új Orsolya',
    };
    const plan = makePlan({ orvos: 'Dr. Régi Rezső' });
    const masolat = planMasolatKent(plan, s, '2026-08-10');
    expect(masolat.orvos).toBe('Dr. Új Orsolya');
  });

  it('a default akkor is érvényesül, ha a forrás orvosa MÉG AKTÍV', () => {
    const s = {
      ...settings,
      orvosok: ['Dr. Régi Rezső', 'Dr. Új Orsolya'],
      alapertelmezettOrvos: 'Dr. Új Orsolya',
    };
    // Dr. Régi Rezső aktív -- egy "Új verzió" nyitás örökölné, a másolás nem.
    const plan = makePlan({ orvos: 'Dr. Régi Rezső' });
    const masolat = planMasolatKent(plan, s, '2026-08-10');
    expect(masolat.orvos).toBe('Dr. Új Orsolya');
    expect(masolat.orvos).not.toBe(plan.orvos);
  });
});
