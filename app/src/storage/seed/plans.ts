// Demó tervek -- 3 páciens, az egyiknél két verzió, hogy a "Korábbi tervek"
// képernyő és a D4 append-only viselkedés (mindkét verzió megmarad, egymás
// mellett) már a mockupban is látszódjon valódi adaton.
//
// A tetelId-k egyetlen hiteles forrása a data/arlista.seed.json (a
// seedPriceList-en át) -- NE egy prototípus vagy minta-konstans ellen
// ellenőrizd őket. Korábban pontosan ez volt a hiba: a seed a repo
// gyökerén állt ui/*.jsx prototípusok SAMPLE tömbjei ellen készült, amik
// más tXXX számozást használtak, így 8 sor egy létező, de rossz tételre
// mutatott (a fogtérkép ettől csendben rossz kategória-színt adott).
// A plans.test.ts mostantól kikényszeríti az egyezést.

import { addDaysIso } from '../../domain/date';
import { computeOsszesitok } from '../../domain/totals';
import type { Fazis, Plan } from '../../domain/types';
import { buildPatientDirName, buildVersionDirName } from '../paths';

const ARLISTA_VERZIO = '2026-07-01';
const ERVENYESSEG_NAP = 90;

function buildPlan(base: Omit<Plan, 'schemaVersion' | 'osszesitok' | 'ervenyesIg'>): Plan {
  return {
    ...base,
    schemaVersion: 1,
    ervenyesIg: addDaysIso(base.keltezes, ERVENYESSEG_NAP),
    osszesitok: computeOsszesitok(base.fazisok),
  };
}

// ---------- Kovács János -- egy verzió, sávos tétel + kedvezmény példa ----------

const kovacsFazisok: Fazis[] = [
  {
    sorszam: 1,
    megnevezes: '1. kezelés — gyökérkezelés és tömések',
    megjegyzes: '',
    sorok: [
      {
        tetelId: 't008',
        nevSnapshot: 'Esztétikus tömés 3 felszín',
        savos: false,
        fogak: '16, 17, 26',
        mennyiseg: 3,
        listaEgysegar: 45000,
        tenylegesEgysegar: 45000,
      },
      {
        tetelId: 't016',
        nevSnapshot: 'Gyökértömés csatornaszámtól függően',
        savos: true,
        fogak: '46',
        mennyiseg: 4,
        listaEgysegar: 38000,
        tenylegesEgysegar: 55000,
      },
      {
        tetelId: 't041',
        nevSnapshot: 'Fogeltávolítás',
        savos: false,
        fogak: '38',
        mennyiseg: 1,
        listaEgysegar: 25000,
        tenylegesEgysegar: 25000,
      },
    ],
  },
  {
    sorszam: 2,
    megnevezes: '2. kezelés — implantáció és pótlás',
    megjegyzes: 'Az implantáció beépülési ideje után, kb. 3 hónappal.',
    sorok: [
      {
        tetelId: 't057',
        nevSnapshot: 'Neodent implantátum',
        savos: false,
        fogak: '36',
        mennyiseg: 1,
        listaEgysegar: 170000,
        tenylegesEgysegar: 170000,
      },
      {
        tetelId: 't074',
        nevSnapshot: 'Zirkonkerámia korona fogra',
        savos: false,
        fogak: '35, 36',
        mennyiseg: 2,
        listaEgysegar: 135000,
        tenylegesEgysegar: 115000, // szándékos kedvezmény -- a szerkesztőben −X%, a PDF-en nem (D9)
      },
    ],
  },
];

const kovacsJanos = buildPlan({
  tervId: 'a3f9c1',
  verzio: 1,
  statusz: 'VEGLEGES',
  nyelv: 'hu',
  penznem: 'HUF',
  keltezes: '2026-08-05',
  arlistaVerzio: ARLISTA_VERZIO,
  sablonVerzio: 'nyilatkozat-hu-v1',
  orvos: 'Dr. Mándoki István',
  paciens: {
    nev: 'Kovács János',
    szuletesiIdo: '1978-03-14',
    lakcim: '1113 Budapest, Bartók Béla út 42. 2/5',
    telefon: '+36 30 123 4567',
    email: 'kovacs.janos@example.hu',
    taj: '123 456 789',
    kiskoru: false,
    torvenyesKepviselo: null,
  },
  fazisok: kovacsFazisok,
});

// ---------- Nagy Éva -- két verzió, a visszatérő páciens / append-only eset ----------

const nagyEvaPaciens = {
  nev: 'Nagy Éva',
  szuletesiIdo: '1990-11-02',
  lakcim: '2100 Gödöllő, Petőfi Sándor utca 8.',
  telefon: '+36 20 555 1234',
  email: 'nagy.eva@example.hu',
  taj: '234 567 891',
  kiskoru: false,
  torvenyesKepviselo: null,
};

const nagyEvaV1Fazisok: Fazis[] = [
  {
    sorszam: 1,
    megnevezes: '1. kezelés — fogkő és tömés',
    megjegyzes: '',
    sorok: [
      {
        tetelId: 't004',
        nevSnapshot: 'Fognyaki tömés',
        savos: false,
        fogak: '24',
        mennyiseg: 1,
        listaEgysegar: 25000,
        tenylegesEgysegar: 25000,
      },
      {
        tetelId: 't008',
        nevSnapshot: 'Esztétikus tömés 3 felszín',
        savos: false,
        fogak: '36, 37',
        mennyiseg: 2,
        listaEgysegar: 45000,
        tenylegesEgysegar: 45000,
      },
    ],
  },
];

const nagyEvaV1 = buildPlan({
  tervId: 'b7d2e4',
  verzio: 1,
  statusz: 'VEGLEGES',
  nyelv: 'hu',
  penznem: 'HUF',
  keltezes: '2026-06-10',
  arlistaVerzio: ARLISTA_VERZIO,
  sablonVerzio: 'nyilatkozat-hu-v1',
  orvos: 'Dr. Mándoki István',
  paciens: nagyEvaPaciens,
  fazisok: nagyEvaV1Fazisok,
});

const nagyEvaV2 = buildPlan({
  tervId: 'b7d2e4',
  verzio: 2,
  statusz: 'VEGLEGES',
  nyelv: 'hu',
  penznem: 'HUF',
  keltezes: '2026-07-22',
  arlistaVerzio: ARLISTA_VERZIO,
  sablonVerzio: 'nyilatkozat-hu-v1',
  orvos: 'Dr. Mándoki István',
  paciens: nagyEvaPaciens,
  // A visszatérő páciens korábbi fázisa megmarad, plusz egy új -- lásd
  // docs/03-funkcionalis-spec.md "5. Korábbi tervek".
  fazisok: [
    ...nagyEvaV1Fazisok,
    {
      sorszam: 2,
      megnevezes: '2. kezelés — korona',
      megjegyzes: '',
      sorok: [
        {
          tetelId: 't071',
          nevSnapshot: 'Fémkerámia',
          savos: false,
          fogak: '36',
          mennyiseg: 1,
          listaEgysegar: 95000,
          tenylegesEgysegar: 85000,
        },
      ],
    },
  ],
});

// ---------- Tóth Zoltán -- kiskorú, tejfog eset ----------

const tothZoltan = buildPlan({
  tervId: 'd4e8a2',
  verzio: 1,
  statusz: 'VEGLEGES',
  nyelv: 'hu',
  penznem: 'HUF',
  keltezes: '2026-07-15',
  arlistaVerzio: ARLISTA_VERZIO,
  sablonVerzio: 'nyilatkozat-hu-v1',
  orvos: 'Dr. Mándoki István',
  paciens: {
    nev: 'Tóth Zoltán',
    szuletesiIdo: '2015-02-20',
    lakcim: '1088 Budapest, Rákóczi út 5.',
    telefon: '+36 30 987 6543',
    email: '',
    taj: '987 654 321',
    kiskoru: true,
    torvenyesKepviselo: 'Tóth Ildikó (édesanya) — +36 30 111 2222',
  },
  fazisok: [
    {
      sorszam: 1,
      megnevezes: '1. kezelés — gyermekfogászat',
      megjegyzes: '',
      sorok: [
        {
          tetelId: 't001',
          nevSnapshot: 'Konzultáció/fél óránként',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 10000,
          tenylegesEgysegar: 10000,
        },
        {
          tetelId: 't041',
          nevSnapshot: 'Fogeltávolítás',
          savos: false,
          fogak: '55',
          mennyiseg: 1,
          listaEgysegar: 25000,
          tenylegesEgysegar: 25000,
        },
      ],
    },
  ],
});

export interface SeedPlanEntry {
  patientDir: string;
  versionDir: string;
  plan: Plan;
}

function toEntry(plan: Plan): SeedPlanEntry {
  return {
    patientDir: buildPatientDirName(plan.paciens.nev, plan.tervId),
    versionDir: buildVersionDirName(plan.keltezes, plan.verzio),
    plan,
  };
}

export const seedPlans: SeedPlanEntry[] = [
  toEntry(kovacsJanos),
  toEntry(nagyEvaV1),
  toEntry(nagyEvaV2),
  toEntry(tothZoltan),
];
