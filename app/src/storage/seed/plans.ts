// Demó tervek -- 3 páciens; Kovács János és Tóth Zoltán egy-egy terv-lánccal,
// Nagy Éva KÉT terv-lánccal (az egyik két verzióval), hogy a "Korábbi
// tervek" 3 szintű fája (páciens → terv → verzió), az összecsukás (2+ lánc)
// és a D4 append-only viselkedés (mindkét verzió megmarad, egymás mellett)
// már a mockupban is látszódjon valódi adaton -- D29,
// docs/02-domain-modell.md § Páciens- és terv-mappa.
//
// A tetelId-k egyetlen hiteles forrása a data/arlista.seed.json (a
// seedPriceList-en át) -- NE egy prototípus vagy minta-konstans ellen
// ellenőrizd őket. Korábban pontosan ez volt a hiba: a seed a repo
// gyökerén állt ui/*.jsx prototípusok SAMPLE tömbjei ellen készült, amik
// más tXXX számozást használtak, így 8 sor egy létező, de rossz tételre
// mutatott (a fogtérkép ettől csendben rossz kategória-színt adott).
// A plans.test.ts mostantól kikényszeríti az egyezést.

import { addDaysIso } from '../../domain/date';
import { javasoltTervCim } from '../../domain/tervCim';
import { computeOsszesitok } from '../../domain/totals';
import { ujAktivitas } from '../../domain/paciensAktivitas';
import type {
  AktivitasTipus,
  Fazis,
  PatientActivity,
  PatientMasterData,
  PatientRecord,
  Plan,
} from '../../domain/types';
import { buildPatientDirName, buildPlanDirName, buildVersionDirName } from '../paths';
import { seedPriceList } from './priceList';

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

// ---------- Kovács János -- egy lánc, sávos tétel + kedvezmény példa ----------

const KOVACS_PACIENS_ID = 'k7x2p9';

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
  paciensId: KOVACS_PACIENS_ID,
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

// ---------- Nagy Éva -- két terv-lánc, az egyik két verzióval (visszatérő páciens / append-only eset) ----------

const NAGY_PACIENS_ID = 'n4e8w1';

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
  paciensId: NAGY_PACIENS_ID,
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
  paciensId: NAGY_PACIENS_ID,
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

// Második, önálló terv-lánc UGYANAHHOZ a pácienshez (D29) -- ez mutatja meg
// a Korábbi tervek fáján, hogy egy páciens-mappa több terv-láncot is
// tartalmazhat, és hogy 2+ lánc esetén a páciens-blokk alapból csukva nyílik.
const nagyEvaSzures = buildPlan({
  tervId: 'e6f0y3',
  paciensId: NAGY_PACIENS_ID,
  verzio: 1,
  statusz: 'VEGLEGES',
  nyelv: 'hu',
  penznem: 'HUF',
  keltezes: '2026-08-01',
  arlistaVerzio: ARLISTA_VERZIO,
  sablonVerzio: 'nyilatkozat-hu-v1',
  orvos: 'Dr. Mándoki István',
  paciens: nagyEvaPaciens,
  fazisok: [
    {
      sorszam: 1,
      megnevezes: '1. kezelés — szájhigiénia',
      megjegyzes: '',
      sorok: [
        {
          tetelId: 't017',
          nevSnapshot: 'Komplett kezelés: ultrahang, sófúvás, kézi műszeres kez., polírozás',
          savos: false,
          fogak: '',
          mennyiseg: 1,
          listaEgysegar: 24000,
          tenylegesEgysegar: 24000,
        },
      ],
    },
  ],
});

// ---------- Tóth Zoltán -- kiskorú, tejfog eset ----------

const tothZoltan = buildPlan({
  tervId: 'd4e8a2',
  paciensId: 't5q3z8',
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
  planDir: string;
  versionDir: string;
  plan: Plan;
}

/**
 * Egy terv-lánc mappaneve a lánc ELSŐ (legkorábbi) verziójának tartalmából
 * számolt javaslatból képződik, és utána minden későbbi verzióra
 * változatlanul érvényes -- pontosan úgy, ahogy éles használatban is a
 * `storage.savePlan()` csak a lánc létrehozásakor dönti el a mappanevet
 * (D29). Ha egy chain-hez tartozó `versions` tömb 2+ elemű, csak az [0]
 * indexű (legkorábbi keltezésű) alapján számol.
 */
function toEntries(patientDir: string, versions: Plan[]): SeedPlanEntry[] {
  const elsoVerzio = versions[0];
  const tervCim = javasoltTervCim(elsoVerzio, seedPriceList);
  const planDir = buildPlanDirName(tervCim, elsoVerzio.tervId);
  return versions.map((plan) => ({
    patientDir,
    planDir,
    versionDir: buildVersionDirName(plan.keltezes, plan.verzio),
    plan,
  }));
}

const kovacsDir = buildPatientDirName(kovacsJanos.paciens.nev, KOVACS_PACIENS_ID);
const nagyDir = buildPatientDirName(nagyEvaPaciens.nev, NAGY_PACIENS_ID);
const tothDir = buildPatientDirName(tothZoltan.paciens.nev, tothZoltan.paciensId!);

export const seedPlans: SeedPlanEntry[] = [
  ...toEntries(kovacsDir, [kovacsJanos]),
  ...toEntries(nagyDir, [nagyEvaV1, nagyEvaV2]),
  ...toEntries(nagyDir, [nagyEvaSzures]),
  ...toEntries(tothDir, [tothZoltan]),
];

// A seed `keltezes` dátumai heteken belüliek (üzleti dátum, D22, nem
// aktivitás-időbélyeg) -- azokból az `utolsoAktivitas` relatív-idő sávjai
// közül csak a ">7 nap -> abszolút dátum" ág látszana. A betöltés
// pillanatához képesti eltolás mindhárom sávot (perc/óra, "tegnap", abszolút
// dátum) bemutatja egy friss demóban. Nagy Éva kapja a `torzsadat-mentve`
// típust, mert egyedül neki van `paciens-adatok.json`-ja lent -- a seed
// önmagában koherens marad.
const AKTIVITAS_ALAPIDO = new Date();
const ORA_MS = 60 * 60 * 1000;
const NAP_MS = 24 * ORA_MS;

function aktivitasEzelott(tipus: AktivitasTipus, msEzelott: number): PatientActivity {
  return ujAktivitas(tipus, new Date(AKTIVITAS_ALAPIDO.getTime() - msEzelott));
}

/** A `paciens.json` indexrekordok -- lásd docs/02-domain-modell.md § Páciens- és terv-mappa. */
export const seedPatients: Array<{ patientDir: string; record: PatientRecord }> = [
  {
    patientDir: kovacsDir,
    record: {
      schemaVersion: 1,
      paciensId: KOVACS_PACIENS_ID,
      nev: kovacsJanos.paciens.nev,
      utolsoAktivitas: aktivitasEzelott('terv-veglegesitve', 2 * ORA_MS),
    },
  },
  {
    patientDir: nagyDir,
    record: {
      schemaVersion: 1,
      paciensId: NAGY_PACIENS_ID,
      nev: nagyEvaPaciens.nev,
      utolsoAktivitas: aktivitasEzelott('torzsadat-mentve', NAP_MS),
    },
  },
  {
    patientDir: tothDir,
    record: {
      schemaVersion: 1,
      paciensId: tothZoltan.paciensId!,
      nev: tothZoltan.paciens.nev,
      utolsoAktivitas: aktivitasEzelott('terv-veglegesitve', 9 * NAP_MS),
    },
  },
];

/**
 * A `paciens-adatok.json` törzsadatok (D33) -- SZÁNDÉKOSAN csak Nagy Évának,
 * hogy a demó mindkét állapotot mutassa: Nagy Éva "rögzített törzsadat",
 * Kovács János és Tóth Zoltán "élő adat a legutóbbi tervből" (nincs saját
 * fájljuk, a Páciensek képernyő a legfrissebb `terv.json` `paciens`
 * blokkjából mutat élő fallbacket).
 */
export const seedPatientData: Array<{ patientDir: string; data: PatientMasterData }> = [
  { patientDir: nagyDir, data: { schemaVersion: 1, paciensId: NAGY_PACIENS_ID, ...nagyEvaPaciens } },
];
