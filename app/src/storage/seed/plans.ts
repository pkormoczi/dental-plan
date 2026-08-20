// Demó tervek. Három kézzel írt, egyedi történetű páciens (Kovács János,
// Nagy Éva, Tóth Zoltán -- lásd lent) alkotta az eredeti, kis demót; ez a
// szakasz onnantól 19 TOVÁBBI pácienssel bővíti a készletet (22 összesen),
// hogy a Pácienslista, a Korábbi tervek, az /uj-terv köztes páciensválasztó
// (35. tétel, D40) és a Kezdőlap "Legutóbbi páciensek" (D39) valódi,
// sokféle adaton kézzel tesztelhető legyen: több terv-lánc egy páciensen,
// több verzió láncként (D4 append-only), EUR pénznem, német nyelv (D21),
// sávos ár (D15) -- természetes SAVOS tételből ÉS a doki kézzel becsültre
// billentett jelzésével egy FIX tételen --, terv-szintű kerek végösszeg
// kedvezmény (D25), előleg (elolegOsszeg, D66), egyedi (árlistán kívüli) sor,
// kézzel átírt/HU-visszaeső névjelvény (D21 `sorFallback`), kiskorú +
// törvényes képviselő, valamint a törzsadat mindkét állapota (D33:
// `paciens-adatok.json` megvan / élő fallback a legutóbbi tervből) és egy
// `utolsoAktivitas` nélküli, legacy-migrációt szimuláló páciens is.
//
// A tetelId-k egyetlen hiteles forrása a data/arlista.seed.json (a
// seedPriceList-en át) -- NE egy prototípus vagy minta-konstans ellen
// ellenőrizd őket. Korábban pontosan ez volt a hiba: a seed a repo
// gyökerén állt ui/*.jsx prototípusok SAMPLE tömbjei ellen készült, amik
// más tXXX számozást használtak, így 8 sor egy létező, de rossz tételre
// mutatott (a fogtérkép ettől csendben rossz kategória-színt adott).
// A plans.test.ts mostantól kikényszeríti az egyezést.

import { addDaysIso } from '../../domain/date';
import { sablonVerzioFor } from '../../domain/blankPlan';
import { basePrice } from '../../domain/money';
import { javasoltTervCim } from '../../domain/tervCim';
import { computeOsszesitok } from '../../domain/totals';
import { ujAktivitas } from '../../domain/paciensAktivitas';
import type {
  AktivitasTipus,
  Fazis,
  Nyelv,
  Paciens,
  PatientActivity,
  PatientMasterData,
  PatientRecord,
  Penznem,
  Plan,
  Sor,
} from '../../domain/types';
import { buildPatientDirName, buildPlanDirName, buildVersionDirName } from '../paths';
import { seedPriceList } from './priceList';

const ARLISTA_VERZIO = '2026-07-01';
const ERVENYESSEG_NAP = 90;

// A `paciens.json` `utolsoAktivitas` demó-időbélyegei a BETÖLTÉS
// pillanatához képesti eltolásból számítanak (nem fix naptári dátumból),
// hogy a Kezdőlap/páciensválasztó relatív-idő sávjai (`formatRelativIdo`:
// "az imént" / "N perce" / "N órája" / "tegnap" / "N napja" / abszolút
// dátum) egy friss demóban is helyesen, elevenen látszódjanak.
const AKTIVITAS_ALAPIDO = new Date();
const PERC_MS = 60 * 1000;
const ORA_MS = 60 * PERC_MS;
const NAP_MS = 24 * ORA_MS;

function aktivitasEzelott(tipus: AktivitasTipus, msEzelott: number): PatientActivity {
  return ujAktivitas(tipus, new Date(AKTIVITAS_ALAPIDO.getTime() - msEzelott));
}

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

// ---------- 19 további páciens: táblázatos leíróból generálva ----------
//
// A fenti három páciens kézzel írt, egyedi történet marad -- ez a szakasz
// egy tömör leíróból (`UJ_PACIENSEK`) épít fel `Plan`/`PatientRecord`/
// `PatientMasterData` objektumokat, hogy a bővítés ne váljon több száz
// soros, ismétlődő kézi felsorolássá. A `basePrice()`/`sablonVerzioFor()`
// meglévő segédfüggvényeket hívja -- az árakat és a sablon-fájlnevet nem
// másoljuk be kézzel, a `seedPriceList`-ből olvassuk élőben, hogy a
// plans.test.ts ár-egyezés-ellenőrzése automatikusan teljesüljön.

const tetelById = new Map(seedPriceList.tetelek.map((t) => [t.id, t]));

interface SorTerv {
  /** Hiányzó/üres esetén a sor egyedi (árlistán kívüli), lásd `egyediNev`/`egyediAr`. */
  tetelId?: string;
  egyediNev?: string;
  egyediAr?: number;
  fogak?: string;
  mennyiseg?: number;
  /** A doki kézzel jelöli becsültnek a sort -- a sor `savos` mezője, FÜGGETLENÜL az árlistai ártípustól (D15). */
  savosOverride?: boolean;
  /** Soronkénti kedvezmény százalékban (0-100) -- a `tenylegesEgysegar` ebből számít. */
  kedvezmenySzazalek?: number;
  /** A doki kézzel átírt neve -- a `sorFallback()` 'elterAzArlistatol' ágának demója. */
  nevOverride?: string;
  leirasSnapshot?: string;
  /**
   * A `nevOverride` nyelvi review-metaadata (65. tétel, D72) --
   * `domain/nyelviReview.ts`. A `sorFallback`-tól ELTÉRŐEN ez akkor is
   * látszik, ha a terv nyelve MAGYAR: a demó ezt mutatja meg (a
   * `sorFallback` `hu` terven mindig `null`-t ad, D21).
   */
  nevNyelvOverride?: Nyelv;
}

function buildSor(terv: SorTerv, penznem: Penznem, nyelv: Nyelv): Sor {
  const mennyiseg = terv.mennyiseg ?? 1;
  const fogak = terv.fogak ?? '';
  if (!terv.tetelId) {
    const ar = terv.egyediAr ?? 0;
    return {
      tetelId: '',
      nevSnapshot: terv.egyediNev ?? '',
      savos: false,
      fogak,
      mennyiseg,
      listaEgysegar: ar,
      tenylegesEgysegar: ar,
      ...(terv.leirasSnapshot ? { leirasSnapshot: terv.leirasSnapshot } : {}),
    };
  }
  const tetel = tetelById.get(terv.tetelId)!;
  const arDef = tetel.ar[penznem];
  const lista = basePrice(arDef);
  const szazalek = terv.kedvezmenySzazalek ?? 0;
  const tenyleges = Math.round(lista * (1 - szazalek / 100));
  const nevSnapshot = terv.nevOverride ?? (nyelv === 'hu' ? tetel.nev.hu : (tetel.nev.de ?? tetel.nev.hu));
  return {
    tetelId: terv.tetelId,
    nevSnapshot,
    savos: terv.savosOverride ?? arDef?.tipus === 'SAVOS',
    fogak,
    mennyiseg,
    listaEgysegar: lista,
    tenylegesEgysegar: tenyleges,
    ...(terv.leirasSnapshot ? { leirasSnapshot: terv.leirasSnapshot } : {}),
    ...(terv.nevNyelvOverride
      ? { nevNyelv: { authoredInLanguage: terv.nevNyelvOverride } }
      : {}),
  };
}

interface FazisTerv {
  megnevezes: string;
  megjegyzes?: string;
  sorok: SorTerv[];
}

function buildFazisok(fazisok: FazisTerv[], penznem: Penznem, nyelv: Nyelv): Fazis[] {
  return fazisok.map((f, i) => ({
    sorszam: i + 1,
    megnevezes: f.megnevezes,
    megjegyzes: f.megjegyzes ?? '',
    sorok: f.sorok.map((s) => buildSor(s, penznem, nyelv)),
  }));
}

interface VerzioTerv {
  keltezes: string;
  fazisok: FazisTerv[];
  nyelv?: Nyelv;
  penznem?: Penznem;
  kedvezmenyOsszeg?: number;
  elolegOsszeg?: number;
}

interface LancTerv {
  tervId: string;
  /** Csökkenő sorrendben adva; a `verzio` mező a tömbindexből (1-től) képződik. */
  verziok: VerzioTerv[];
}

interface UjPaciensTerv {
  paciensId: string;
  nev: string;
  szuletesiIdo: string;
  lakcim: string;
  telefon: string;
  email: string;
  taj: string;
  kiskoru?: boolean;
  torvenyesKepviselo?: string | null;
  lancok: LancTerv[];
  /** Hiányzó = nincs `utolsoAktivitas` (legacy-migrációt szimuláló edge case, D39). */
  aktivitas?: { tipus: AktivitasTipus; msEzelott: number };
  /** `true` esetén a páciens lezárt `paciens-adatok.json` törzsadatot is kap (D33). */
  patientData?: boolean;
}

interface UjPaciensEredmeny {
  plans: SeedPlanEntry[];
  patient: { patientDir: string; record: PatientRecord };
  patientData: Array<{ patientDir: string; data: PatientMasterData }>;
}

function buildUjPaciens(spec: UjPaciensTerv): UjPaciensEredmeny {
  const paciens: Paciens = {
    nev: spec.nev,
    szuletesiIdo: spec.szuletesiIdo,
    lakcim: spec.lakcim,
    telefon: spec.telefon,
    email: spec.email,
    taj: spec.taj,
    kiskoru: spec.kiskoru ?? false,
    torvenyesKepviselo: spec.torvenyesKepviselo ?? null,
  };
  const patientDir = buildPatientDirName(spec.nev, spec.paciensId);

  const plans = spec.lancok.flatMap((lanc) => {
    const versions = lanc.verziok.map((v, i) => {
      const nyelv = v.nyelv ?? 'hu';
      const penznem = v.penznem ?? 'HUF';
      return buildPlan({
        tervId: lanc.tervId,
        paciensId: spec.paciensId,
        verzio: i + 1,
        statusz: 'VEGLEGES',
        nyelv,
        penznem,
        keltezes: v.keltezes,
        arlistaVerzio: ARLISTA_VERZIO,
        sablonVerzio: sablonVerzioFor(nyelv),
        orvos: 'Dr. Mándoki István',
        paciens,
        fazisok: buildFazisok(v.fazisok, penznem, nyelv),
        ...(v.kedvezmenyOsszeg != null ? { kedvezmenyOsszeg: v.kedvezmenyOsszeg } : {}),
        ...(v.elolegOsszeg != null ? { elolegOsszeg: v.elolegOsszeg } : {}),
      });
    });
    return toEntries(patientDir, versions);
  });

  const patient: { patientDir: string; record: PatientRecord } = {
    patientDir,
    record: {
      schemaVersion: 1,
      paciensId: spec.paciensId,
      nev: spec.nev,
      ...(spec.aktivitas
        ? { utolsoAktivitas: aktivitasEzelott(spec.aktivitas.tipus, spec.aktivitas.msEzelott) }
        : {}),
    },
  };

  const patientData: Array<{ patientDir: string; data: PatientMasterData }> = spec.patientData
    ? [{ patientDir, data: { schemaVersion: 1, paciensId: spec.paciensId, ...paciens } }]
    : [];

  return { plans, patient, patientData };
}

const UJ_PACIENSEK: UjPaciensTerv[] = [
  // Két önálló terv-lánc (mint Nagy Éva) -- fogszabályozás (3 verzió) +
  // önálló fogfehérítés-lánc. Törzsadata lezárt, aktivitása "órája" sávban.
  {
    paciensId: 'szaban',
    nev: 'Szabó Anna',
    szuletesiIdo: '1985-04-22',
    lakcim: '6720 Szeged, Kárász utca 12.',
    telefon: '+36 20 234 5678',
    email: 'szabo.anna@example.hu',
    taj: '345 678 912',
    patientData: true,
    aktivitas: { tipus: 'torzsadat-mentve', msEzelott: 5 * ORA_MS },
    lancok: [
      {
        tervId: 'szab1a',
        verziok: [
          {
            keltezes: '2026-02-10',
            fazisok: [
              {
                megnevezes: '1. kezelés — felmérés',
                sorok: [{ tetelId: 't002' }, { tetelId: 't003' }],
              },
            ],
          },
          {
            keltezes: '2026-05-18',
            fazisok: [
              { megnevezes: '1. kezelés — felmérés', sorok: [{ tetelId: 't002' }, { tetelId: 't003' }] },
              { megnevezes: '2. kezelés — készülék', sorok: [{ tetelId: 't113' }] },
            ],
          },
          {
            keltezes: '2026-07-05',
            fazisok: [
              { megnevezes: '1. kezelés — felmérés', sorok: [{ tetelId: 't002' }, { tetelId: 't003' }] },
              { megnevezes: '2. kezelés — készülék', sorok: [{ tetelId: 't113' }] },
              {
                megnevezes: '3. kezelés — multiband',
                sorok: [{ tetelId: 't114' }, { tetelId: 't115' }],
              },
            ],
          },
        ],
      },
      {
        tervId: 'szab1b',
        verziok: [
          {
            keltezes: '2026-07-02',
            fazisok: [{ megnevezes: '1. kezelés — fogfehérítés', sorok: [{ tetelId: 't019' }] }],
          },
        ],
      },
    ],
  },
  // Külföldi (német nyelvű, EUR-ban fizető) páciens -- All-on-4 nagy eset,
  // 2 verzió (terv → pontosított terv). Nincs törzsadat, nincs TAJ.
  {
    paciensId: 'horvpe',
    nev: 'Horváth Péter',
    szuletesiIdo: '1970-09-05',
    lakcim: '80331 München, Marienplatz 3. (Németország)',
    telefon: '+49 89 123 4567',
    email: 'peter.horvath@example.de',
    taj: '',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 8 * ORA_MS },
    lancok: [
      {
        tervId: 'horv1a',
        verziok: [
          {
            keltezes: '2026-03-01',
            nyelv: 'de',
            penznem: 'EUR',
            fazisok: [
              {
                megnevezes: '1. kezelés — sebészet és ideiglenes pótlás',
                sorok: [{ tetelId: 't027' }, { tetelId: 't030' }],
              },
            ],
          },
          {
            keltezes: '2026-06-20',
            nyelv: 'de',
            penznem: 'EUR',
            fazisok: [
              {
                megnevezes: '1. kezelés — sebészet és ideiglenes pótlás',
                sorok: [{ tetelId: 't027' }, { tetelId: 't030' }],
              },
              { megnevezes: '2. kezelés — végleges pótlás', sorok: [{ tetelId: 't080' }] },
            ],
          },
        ],
      },
    ],
  },
  // Implantátum + korona, 3 verzió -- a felépítmény sora KÉZZEL becsültre
  // billentve (savosOverride), holott árlistailag FIX árú tétel (D15). A
  // legfrissebb aktivitás "az imént" sávban.
  {
    paciensId: 'kissma',
    nev: 'Kiss Márta',
    szuletesiIdo: '1992-12-01',
    lakcim: '4025 Debrecen, Piac utca 20.',
    telefon: '+36 30 345 6789',
    email: 'kiss.marta@example.hu',
    taj: '456 789 123',
    patientData: true,
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 30 * 1000 },
    lancok: [
      {
        tervId: 'kiss1a',
        verziok: [
          {
            keltezes: '2026-01-15',
            fazisok: [
              {
                megnevezes: '1. kezelés — eltávolítás és implantáció',
                sorok: [
                  { tetelId: 't041', fogak: '46' },
                  { tetelId: 't057', fogak: '46' },
                ],
              },
            ],
          },
          {
            keltezes: '2026-04-10',
            fazisok: [
              {
                megnevezes: '1. kezelés — eltávolítás és implantáció',
                sorok: [
                  { tetelId: 't041', fogak: '46' },
                  { tetelId: 't057', fogak: '46' },
                ],
              },
              {
                megnevezes: '2. kezelés — felépítmény',
                sorok: [
                  { tetelId: 't082', fogak: '46' },
                  {
                    tetelId: 't073',
                    fogak: '46',
                    savosOverride: true, // a végleges fogszín/labor-anyagköltség csak munka közben derül ki
                  },
                ],
              },
            ],
          },
          {
            keltezes: '2026-07-30',
            fazisok: [
              {
                megnevezes: '1. kezelés — eltávolítás és implantáció',
                sorok: [
                  { tetelId: 't041', fogak: '46' },
                  { tetelId: 't057', fogak: '46' },
                ],
              },
              {
                megnevezes: '2. kezelés — felépítmény',
                sorok: [
                  { tetelId: 't082', fogak: '46' },
                  { tetelId: 't073', fogak: '46', savosOverride: true },
                ],
              },
              {
                megnevezes: '3. kezelés — kontroll',
                // 65. tétel (D72): a doki tévedésből németül gépelte át a
                // sor nevét egy MAGYAR terven -- ezt a `sorFallback` (D21)
                // sosem jelezné (hu terven mindig `null`-t ad), a nyelvi
                // review viszont igen.
                sorok: [
                  { tetelId: 't001', nevOverride: 'Kontrolle nach Behandlung', nevNyelvOverride: 'de' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  // Kis terv (konzultáció, majd tömés), 2 verzió. Nincs törzsadat.
  {
    paciensId: 'nemega',
    nev: 'Németh Gábor',
    szuletesiIdo: '1988-06-18',
    lakcim: '9021 Győr, Bajcsy-Zsilinszky út 5.',
    telefon: '+36 70 456 7890',
    email: 'nemeth.gabor@example.hu',
    taj: '567 891 234',
    aktivitas: { tipus: 'letrehozva', msEzelott: 3 * NAP_MS },
    lancok: [
      {
        tervId: 'neme1a',
        verziok: [
          { keltezes: '2026-04-01', fazisok: [{ megnevezes: '1. kezelés — konzultáció', sorok: [{ tetelId: 't001' }] }] },
          {
            keltezes: '2026-06-15',
            fazisok: [
              { megnevezes: '1. kezelés — konzultáció', sorok: [{ tetelId: 't001' }] },
              {
                megnevezes: '2. kezelés — tömések',
                sorok: [
                  { tetelId: 't006', fogak: '14' },
                  { tetelId: 't011', fogak: '24' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  // Teljes szájrehabilitáció, terv-szintű kerek végösszeg kedvezménnyel
  // (D25) a v2-n. Törzsadata lezárt.
  {
    paciensId: 'varazs', // Varga Zsófia
    nev: 'Varga Zsófia',
    szuletesiIdo: '1965-02-27',
    lakcim: '7621 Pécs, Rákóczi út 30.',
    telefon: '+36 20 567 8901',
    email: 'varga.zsofia@example.hu',
    taj: '678 912 345',
    patientData: true,
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: NAP_MS + 3 * ORA_MS },
    lancok: [
      {
        tervId: 'vara1a',
        verziok: [
          {
            keltezes: '2026-02-20',
            fazisok: [
              { megnevezes: '1. kezelés — fogsor és fehérítés', sorok: [{ tetelId: 't095' }, { tetelId: 't019' }] },
            ],
          },
          {
            keltezes: '2026-05-05',
            kedvezmenyOsszeg: 50000,
            fazisok: [
              { megnevezes: '1. kezelés — fogsor és fehérítés', sorok: [{ tetelId: 't095' }, { tetelId: 't019' }] },
              { megnevezes: '2. kezelés — igazítás', sorok: [{ tetelId: 't025', fogak: '11, 21', mennyiseg: 2 }] },
            ],
          },
        ],
      },
    ],
  },
  // Nagy implantációs munka, előleggel (elolegOsszeg, D66) -- a v2-n
  // vezetik be, amikor a doki eldönti a fogtechnikai munka előlegét (v2
  // összege 340 000 Ft sorösszeghez képest kerekített ~30%). Nincs törzsadat.
  {
    paciensId: 'molnta',
    nev: 'Molnár Tamás',
    szuletesiIdo: '1979-08-14',
    lakcim: '3525 Miskolc, Széchenyi utca 40.',
    telefon: '+36 30 678 9012',
    email: 'molnar.tamas@example.hu',
    taj: '789 123 456',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 4 * NAP_MS },
    lancok: [
      {
        tervId: 'moln1a',
        verziok: [
          {
            keltezes: '2026-03-10',
            fazisok: [
              {
                megnevezes: '1. kezelés — implantáció',
                sorok: [{ tetelId: 't054', fogak: '16' }, { tetelId: 't053' }],
              },
            ],
          },
          {
            keltezes: '2026-06-25',
            elolegOsszeg: 100000,
            fazisok: [
              {
                megnevezes: '1. kezelés — implantáció',
                sorok: [{ tetelId: 't054', fogak: '16' }, { tetelId: 't053' }],
              },
              { megnevezes: '2. kezelés — felépítmény', sorok: [{ tetelId: 't081', fogak: '16' }] },
            ],
          },
        ],
      },
    ],
  },
  // Sávos (SAVOS) gyökérkezelés, majd korona -- 2 verzió. Nincs törzsadat.
  {
    paciensId: 'farkka',
    nev: 'Farkas Katalin',
    szuletesiIdo: '1995-05-30',
    lakcim: '6000 Kecskemét, Kossuth tér 1.',
    telefon: '+36 20 789 0123',
    email: 'farkas.katalin@example.hu',
    taj: '891 234 567',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 12 * NAP_MS },
    lancok: [
      {
        tervId: 'fark1a',
        verziok: [
          {
            keltezes: '2026-01-20',
            fazisok: [
              {
                megnevezes: '1. kezelés — gyökérkezelés',
                sorok: [
                  { tetelId: 't014', fogak: '36' },
                  { tetelId: 't016', fogak: '36' },
                ],
              },
            ],
          },
          {
            keltezes: '2026-04-15',
            fazisok: [
              {
                megnevezes: '1. kezelés — gyökérkezelés',
                sorok: [
                  { tetelId: 't014', fogak: '36' },
                  { tetelId: 't016', fogak: '36' },
                ],
              },
              {
                megnevezes: '2. kezelés — korona',
                sorok: [{ tetelId: 't013', fogak: '36' }, { tetelId: 't071', fogak: '36' }],
              },
            ],
          },
        ],
      },
    ],
  },
  // Kivehető fogpótlás, 3 verzió, előleggel a lánc ELEJÉTŐL (D25/előleg
  // pár, hogy ne csak a "menet közben bevezetett" esetet lássuk). Az összeg
  // (D66) verziónként kerekítve követi a sorösszeg kb. felét (25 000 / 50 000;
  // 115 000 / 230 000; 120 000 / 245 000) -- mivel abszolút összeg, nem
  // automatikusan élő arány. Nincs törzsadat.
  {
    paciensId: 'baloda',
    nev: 'Balogh Dániel',
    szuletesiIdo: '1958-11-11',
    lakcim: '4400 Nyíregyháza, Dózsa György út 15.',
    telefon: '+36 30 890 1234',
    email: 'balogh.daniel@example.hu',
    taj: '912 345 678',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 5 * NAP_MS },
    lancok: [
      {
        tervId: 'balo1a',
        verziok: [
          {
            keltezes: '2025-12-05',
            elolegOsszeg: 25000,
            fazisok: [{ megnevezes: '1. kezelés — eltávolítás', sorok: [{ tetelId: 't041', fogak: '17, 27', mennyiseg: 2 }] }],
          },
          {
            keltezes: '2026-03-01',
            elolegOsszeg: 115000,
            fazisok: [
              { megnevezes: '1. kezelés — eltávolítás', sorok: [{ tetelId: 't041', fogak: '17, 27', mennyiseg: 2 }] },
              { megnevezes: '2. kezelés — fogsor', sorok: [{ tetelId: 't095' }] },
            ],
          },
          {
            keltezes: '2026-06-10',
            elolegOsszeg: 120000,
            fazisok: [
              { megnevezes: '1. kezelés — eltávolítás', sorok: [{ tetelId: 't041', fogak: '17, 27', mennyiseg: 2 }] },
              { megnevezes: '2. kezelés — fogsor', sorok: [{ tetelId: 't095' }] },
              { megnevezes: '3. kezelés — igazítás', sorok: [{ tetelId: 't104' }] },
            ],
          },
        ],
      },
    ],
  },
  // Egyedi (árlistán kívüli) sor + leírás-pillanatkép demója, NÉMET nyelvű
  // tervben -- a magyarul gépelt egyedi sor itt az 'egyedi' HU-visszaesési
  // jelvényt mutatja (sorFallback, D21). Nincs törzsadat.
  {
    paciensId: 'takaes',
    nev: 'Takács Eszter',
    szuletesiIdo: '1982-07-09',
    lakcim: '8000 Székesfehérvár, Fő utca 22.',
    telefon: '+36 20 901 2345',
    email: 'takacs.eszter@example.hu',
    taj: '923 456 781',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 35 * NAP_MS },
    lancok: [
      {
        tervId: 'taka1a',
        verziok: [
          {
            keltezes: '2025-11-20',
            nyelv: 'de',
            fazisok: [{ megnevezes: '1. kezelés — konzultáció', sorok: [{ tetelId: 't001' }] }],
          },
          {
            keltezes: '2026-02-14',
            nyelv: 'de',
            fazisok: [
              { megnevezes: '1. kezelés — konzultáció', sorok: [{ tetelId: 't001' }] },
              {
                megnevezes: '2. kezelés — esztétikai zóna',
                sorok: [
                  {
                    egyediNev: 'Konzultáció fogászati implantológus kollégával',
                    egyediAr: 15000,
                    leirasSnapshot:
                      'Külső szakorvosi vélemény bekérése az esztétikai zóna implantációjához.',
                  },
                  { tetelId: 't076', fogak: '12, 11, 21, 22', mennyiseg: 4 },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  // Két önálló terv-lánc (mint Nagy Éva/Szabó Anna): bölcsességfog-sebészet
  // (2 verzió) + önálló fogkő-lánc. Törzsadata lezárt.
  {
    paciensId: 'juhabe',
    nev: 'Juhász Bence',
    szuletesiIdo: '1999-01-25',
    lakcim: '9700 Szombathely, Fő tér 3.',
    telefon: '+36 30 012 3456',
    email: 'juhasz.bence@example.hu',
    taj: '934 567 812',
    patientData: true,
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 18 * NAP_MS },
    lancok: [
      {
        tervId: 'juha1a',
        verziok: [
          {
            keltezes: '2026-01-05',
            fazisok: [{ megnevezes: '1. kezelés — bölcsességfog', sorok: [{ tetelId: 't034', fogak: '38' }] }],
          },
          {
            keltezes: '2026-03-22',
            fazisok: [
              { megnevezes: '1. kezelés — bölcsességfog', sorok: [{ tetelId: 't034', fogak: '38' }] },
              { megnevezes: '2. kezelés — másik oldal', sorok: [{ tetelId: 't034', fogak: '48' }] },
            ],
          },
        ],
      },
      {
        tervId: 'juha1b',
        verziok: [
          { keltezes: '2026-06-01', fazisok: [{ megnevezes: '1. kezelés — fogkő', sorok: [{ tetelId: 't017' }] }] },
        ],
      },
    ],
  },
  // Külföldi (EUR, de magyarul beszélő) páciens -- a pénznem D21 szerint
  // FÜGGETLEN a nyelvtől: itt a nyelv marad 'hu'. Törzsadata lezárt.
  {
    paciensId: 'lakare',
    nev: 'Lakatos Réka',
    szuletesiIdo: '1991-03-17',
    lakcim: '1010 Wien, Stephansplatz 2. (Ausztria)',
    telefon: '+43 1 234 5678',
    email: 'lakatos.reka@example.at',
    taj: '',
    patientData: true,
    aktivitas: { tipus: 'torzsadat-mentve', msEzelott: 90 * NAP_MS },
    lancok: [
      {
        tervId: 'laka1a',
        verziok: [
          {
            keltezes: '2025-10-01',
            penznem: 'EUR',
            fazisok: [
              {
                megnevezes: '1. kezelés — esztétikai tömések',
                sorok: [
                  { tetelId: 't007', fogak: '15' },
                  { tetelId: 't006', fogak: '25' },
                ],
              },
            ],
          },
          {
            keltezes: '2026-01-18',
            penznem: 'EUR',
            fazisok: [
              {
                megnevezes: '1. kezelés — esztétikai tömések',
                sorok: [
                  { tetelId: 't007', fogak: '15' },
                  { tetelId: 't006', fogak: '25' },
                ],
              },
              { megnevezes: '2. kezelés — betét indikáció', sorok: [{ tetelId: 't009', fogak: '36' }] },
            ],
          },
        ],
      },
    ],
  },
  // Parodontológiai kezelés, NÉMET nyelven -- a 2. sor nevSnapshot-ja
  // KÉZZEL átírva a német tétel-névtől eltérőre ('elterAzArlistatol',
  // sorFallback, D21). Nincs törzsadat.
  {
    paciensId: 'simoma',
    nev: 'Simon Máté',
    szuletesiIdo: '1975-10-08',
    lakcim: '2000 Szentendre, Dumtsa Jenő utca 6.',
    telefon: '+36 20 123 4567',
    email: 'mate.simon@example.hu',
    taj: '945 678 123',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 45 * NAP_MS },
    lancok: [
      {
        tervId: 'simo1a',
        verziok: [
          {
            keltezes: '2025-12-15',
            nyelv: 'de',
            fazisok: [
              { megnevezes: '1. kezelés — küret', sorok: [{ tetelId: 't064', fogak: '16, 17, 26, 27', mennyiseg: 4 }] },
            ],
          },
          {
            keltezes: '2026-03-05',
            nyelv: 'de',
            fazisok: [
              { megnevezes: '1. kezelés — küret', sorok: [{ tetelId: 't064', fogak: '16, 17, 26, 27', mennyiseg: 4 }] },
              {
                megnevezes: '2. kezelés — lágyrész pótlás',
                sorok: [{ tetelId: 't068', nevOverride: 'Weichgewebe-Aufbau (individuell angepasst)' }],
              },
            ],
          },
        ],
      },
    ],
  },
  // Sávos gyökérkezelés, 2 verzió. Törzsadata lezárt.
  {
    paciensId: 'raczil',
    nev: 'Rácz Ildikó',
    szuletesiIdo: '1969-04-02',
    lakcim: '5000 Szolnok, Baross utca 8.',
    telefon: '+36 30 234 5678',
    email: 'racz.ildiko@example.hu',
    taj: '956 789 234',
    patientData: true,
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 2 * NAP_MS },
    lancok: [
      {
        tervId: 'racz1a',
        verziok: [
          {
            keltezes: '2026-02-01',
            fazisok: [{ megnevezes: '1. kezelés — gyökérkezelés', sorok: [{ tetelId: 't014', fogak: '46' }] }],
          },
          {
            keltezes: '2026-05-20',
            fazisok: [
              { megnevezes: '1. kezelés — gyökérkezelés', sorok: [{ tetelId: 't014', fogak: '46' }] },
              {
                megnevezes: '2. kezelés — csonkfelépítés',
                sorok: [{ tetelId: 't016', fogak: '46' }, { tetelId: 't013', fogak: '46' }],
              },
            ],
          },
        ],
      },
    ],
  },
  // Kivehető fogsor javítás, 2 verzió. Nincs törzsadat -- a legrégebbi
  // aktivitás-időbélyeg a demóban (abszolút dátum sáv).
  {
    paciensId: 'fekezo',
    nev: 'Fekete Zoltán',
    szuletesiIdo: '1955-01-30',
    lakcim: '7100 Szekszárd, Béla király tér 1.',
    telefon: '+36 70 345 6789',
    email: 'fekete.zoltan@example.hu',
    taj: '967 891 245',
    aktivitas: { tipus: 'letrehozva', msEzelott: 60 * NAP_MS },
    lancok: [
      {
        tervId: 'feke1a',
        verziok: [
          { keltezes: '2025-09-10', fazisok: [{ megnevezes: '1. kezelés — elhorgonyzás', sorok: [{ tetelId: 't096' }] }] },
          {
            keltezes: '2025-12-20',
            fazisok: [
              { megnevezes: '1. kezelés — elhorgonyzás', sorok: [{ tetelId: 't096' }] },
              { megnevezes: '2. kezelés — klipsz', sorok: [{ tetelId: 't100' }] },
            ],
          },
        ],
      },
    ],
  },
  // Bölcsességfog eltávolítás, 2 verzió. Nincs törzsadat.
  {
    paciensId: 'orsore',
    nev: 'Orsós Renátó',
    szuletesiIdo: '2001-09-19',
    lakcim: '6800 Hódmezővásárhely, Andrássy út 10.',
    telefon: '+36 20 456 7890',
    email: 'orsos.renato@example.hu',
    taj: '978 912 356',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 21 * NAP_MS },
    lancok: [
      {
        tervId: 'orso1a',
        verziok: [
          { keltezes: '2026-04-08', fazisok: [{ megnevezes: '1. kezelés — felvétel', sorok: [{ tetelId: 't002' }] }] },
          {
            keltezes: '2026-06-30',
            fazisok: [
              { megnevezes: '1. kezelés — felvétel', sorok: [{ tetelId: 't002' }] },
              { megnevezes: '2. kezelés — eltávolítás', sorok: [{ tetelId: 't034', fogak: '48' }] },
            ],
          },
        ],
      },
    ],
  },
  // Fogfehérítés és esztétika, 2 verzió, kis terv-szintű kedvezménnyel a
  // v2-n (második D25 példa). Törzsadata lezárt.
  {
    paciensId: 'pappkr',
    nev: 'Papp Krisztina',
    szuletesiIdo: '1987-06-25',
    lakcim: '3300 Eger, Dobó tér 6.',
    telefon: '+36 30 567 8901',
    email: 'papp.krisztina@example.hu',
    taj: '989 123 467',
    patientData: true,
    aktivitas: { tipus: 'torzsadat-mentve', msEzelott: 14 * NAP_MS },
    lancok: [
      {
        tervId: 'papp1a',
        verziok: [
          {
            keltezes: '2026-05-01',
            fazisok: [{ megnevezes: '1. kezelés — fehérítés', sorok: [{ tetelId: 't020', fogak: '11' }] }],
          },
          {
            keltezes: '2026-07-10',
            kedvezmenyOsszeg: 20000,
            fazisok: [
              { megnevezes: '1. kezelés — fehérítés', sorok: [{ tetelId: 't020', fogak: '11' }] },
              { megnevezes: '2. kezelés — héjak', sorok: [{ tetelId: 't076', fogak: '11, 21', mennyiseg: 2 }] },
            ],
          },
        ],
      },
    ],
  },
  // Kiskorú, törvényes képviselővel (a Tóth Zoltán melletti második ilyen
  // eset). Törzsadata lezárt, a legfrissebb "perce" sávú aktivitás.
  {
    paciensId: 'galhan',
    nev: 'Gál Hanna',
    szuletesiIdo: '2017-05-14',
    lakcim: '1085 Budapest, József körút 20.',
    telefon: '',
    email: '',
    taj: '991 234 578',
    kiskoru: true,
    torvenyesKepviselo: 'Gál Andrea (édesanya) — +36 30 678 9012',
    patientData: true,
    aktivitas: { tipus: 'torzsadat-mentve', msEzelott: 15 * PERC_MS },
    lancok: [
      {
        tervId: 'galh1a',
        verziok: [
          {
            keltezes: '2026-03-15',
            fazisok: [
              {
                megnevezes: '1. kezelés — gyermekfogászat',
                sorok: [
                  { tetelId: 't022', fogak: '55' },
                  { tetelId: 't024', fogak: '16, 26', mennyiseg: 2 },
                ],
              },
            ],
          },
          {
            keltezes: '2026-06-05',
            fazisok: [
              {
                megnevezes: '1. kezelés — gyermekfogászat',
                sorok: [
                  { tetelId: 't022', fogak: '55' },
                  { tetelId: 't024', fogak: '16, 26', mennyiseg: 2 },
                ],
              },
              { megnevezes: '2. kezelés — tejfog tömés', sorok: [{ tetelId: 't023', fogak: '64' }] },
            ],
          },
        ],
      },
    ],
  },
  // Legacy-migrációt szimuláló edge case (D39): NINCS utolsoAktivitas --
  // ilyenkor a páciens a Kezdőlap/páciensválasztó recent listájából kimarad,
  // de kereséssel továbbra is megtalálható. Nincs törzsadat.
  {
    paciensId: 'csasti',
    nev: 'Császár Tibor',
    szuletesiIdo: '1962-08-03',
    lakcim: '6300 Kalocsa, Szent István út 12.',
    telefon: '+36 20 678 9012',
    email: 'csaszar.tibor@example.hu',
    taj: '912 345 689',
    lancok: [
      {
        tervId: 'csas1a',
        verziok: [
          { keltezes: '2025-11-05', fazisok: [{ megnevezes: '1. kezelés — korona', sorok: [{ tetelId: 't071', fogak: '26' }] }] },
          {
            keltezes: '2026-02-08',
            fazisok: [
              { megnevezes: '1. kezelés — korona', sorok: [{ tetelId: 't071', fogak: '26' }] },
              { megnevezes: '2. kezelés — csonkfelépítés', sorok: [{ tetelId: 't013', fogak: '26' }] },
            ],
          },
        ],
      },
    ],
  },
  // Fogszabályozás retenciója, 2 verzió. Nincs törzsadat.
  {
    paciensId: 'urbame',
    nev: 'Urban Melinda',
    szuletesiIdo: '1993-10-12',
    lakcim: '9200 Mosonmagyaróvár, Fő utca 5.',
    telefon: '+36 30 789 0123',
    email: 'urban.melinda@example.hu',
    taj: '923 456 791',
    aktivitas: { tipus: 'terv-veglegesitve', msEzelott: 25 * NAP_MS },
    lancok: [
      {
        tervId: 'urba1a',
        verziok: [
          {
            keltezes: '2026-01-10',
            fazisok: [{ megnevezes: '1. kezelés — eltávolítás', sorok: [{ tetelId: 't116' }] }],
          },
          {
            keltezes: '2026-04-02',
            fazisok: [
              { megnevezes: '1. kezelés — eltávolítás', sorok: [{ tetelId: 't116' }] },
              { megnevezes: '2. kezelés — retenció', sorok: [{ tetelId: 't117', mennyiseg: 2 }] },
            ],
          },
        ],
      },
    ],
  },
  // Terv nélküli páciens (backlog-41, D50) -- a Páciensek képernyőn felvéve,
  // de még nincs kezelési terve. Lezárt törzsadata van, de a Korábbi
  // tervek listán NEM jelenik meg (nincs terv-lánca, `OsszesTervSection.tsx`
  // ezt a filtert alkalmazza). E nélkül friss demó adaton EGYETLEN páciens
  // sem lenne törölhető -- mindenki másnak van véglegesített terve.
  {
    paciensId: 'kelepe',
    nev: 'Kelemen Petra',
    szuletesiIdo: '1997-02-19',
    lakcim: '7621 Pécs, Király utca 8.',
    telefon: '+36 20 890 1234',
    email: 'kelemen.petra@example.hu',
    taj: '934 567 812',
    patientData: true,
    // Szándékosan a Nagy Éva-nál (NAP_MS) régebbi, hogy a
    // NewPlanPage.test.tsx "utolsoAktivitas nélküli páciens kimarad a
    // recentsből" tesztje (ami a Kovács-aktivitás eltávolítása utáni top-5
    // között konkrétan Nagy Évát várja) ne csússzon el egy új, frissebb
    // seed-aktivitástól.
    aktivitas: { tipus: 'letrehozva', msEzelott: 2 * NAP_MS },
    lancok: [],
  },
];

const ujPaciensek = UJ_PACIENSEK.map(buildUjPaciens);

export const seedPlans: SeedPlanEntry[] = [
  ...toEntries(kovacsDir, [kovacsJanos]),
  ...toEntries(nagyDir, [nagyEvaV1, nagyEvaV2]),
  ...toEntries(nagyDir, [nagyEvaSzures]),
  ...toEntries(tothDir, [tothZoltan]),
  ...ujPaciensek.flatMap((p) => p.plans),
];

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
  ...ujPaciensek.map((p) => p.patient),
];

/**
 * A `paciens-adatok.json` törzsadatok (D33) -- a demó mindkét állapotot
 * mutatja: néhány páciens "rögzített törzsadat", a többi "élő adat a
 * legutóbbi tervből" (nincs saját fájljuk, a Páciensek képernyő a
 * legfrissebb `terv.json` `paciens` blokkjából mutat élő fallbacket).
 */
export const seedPatientData: Array<{ patientDir: string; data: PatientMasterData }> = [
  { patientDir: nagyDir, data: { schemaVersion: 1, paciensId: NAGY_PACIENS_ID, ...nagyEvaPaciens } },
  ...ujPaciensek.flatMap((p) => p.patientData),
];
