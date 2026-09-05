import { describe, expect, it } from 'vitest';
import { basePrice } from '../../domain/money';
import { ervenyesAktivitas, legutobbAktivPaciensek } from '../../domain/paciensAktivitas';
import type { PatientFolder } from '../../domain/types';
import { seedPatientData, seedPatients, seedPlans, seedVerzio } from './plans';
import { seedPriceList } from './priceList';

// A demó tervek tetelId-hivatkozásainak integritása. A hiba, amit ez a teszt
// megfog: egy LÉTEZŐ, de ROSSZ tételre mutató id -- a sor szövege és ára
// ilyenkor is helyes marad (nevSnapshot/listaEgysegar pillanatkép), de a
// fogtérkép (domain/toothVisual.ts) a jelenlegi árlistából olvassa a
// kategóriát az id alapján, tehát csendben rossz színt ad. A puszta
// létezés-ellenőrzés ezt nem fogja meg, az ár-egyezés igen.
//
// Hatókör: kizárólag a demó/seed adat. Éles, véglegesített terveken a
// pillanatkép SZÁNDÉKOSAN eltérhet a mai árlistától (árlista-frissítés
// után) -- ott ugyanez az állítás hamis pozitív lenne.
//
// Névre nincs assertion: a nevSnapshot a demóban is lehet pontosabb az
// árlistainál (t057 "Neodent implantátum" vs. az árlista ékezethibás
// "implantatum"-a; t074 "Zirkonkerámia korona fogra" vs. a rövidebb
// "Zirkonkerámia fogra"), és a backlog 3. tétele óta a doki kézzel is
// szerkesztheti -- a szó szerinti egyezés nem érvényes invariáns.

const tetelById = new Map(seedPriceList.tetelek.map((t) => [t.id, t]));

interface SeedSor {
  cimke: string;
  tetelId: string;
  listaEgysegar: number;
  penznem: (typeof seedPlans)[number]['plan']['penznem'];
}

const sorok: SeedSor[] = seedPlans.flatMap(({ plan }) =>
  plan.fazisok.flatMap((fazis) =>
    fazis.sorok
      .filter((sor) => sor.tetelId !== '')
      .map((sor) => ({
        cimke: `${plan.paciens.nev} v${plan.verzio} / ${fazis.sorszam}. fázis / "${sor.nevSnapshot}"`,
        tetelId: sor.tetelId,
        listaEgysegar: sor.listaEgysegar,
        penznem: plan.penznem,
      })),
  ),
);

describe('seedPlans tetelId-integritás', () => {
  it('minden demó sor hivatkozik legalább egy tételre', () => {
    expect(sorok.length).toBeGreaterThan(0);
  });

  it.each(sorok)('$cimke -> $tetelId létezik az árlistában', ({ tetelId }) => {
    expect(tetelById.get(tetelId)).toBeDefined();
  });

  it.each(sorok)(
    '$cimke -> $tetelId árlistai ára egyezik a listaEgysegar-ral',
    ({ tetelId, listaEgysegar, penznem }) => {
      const tetel = tetelById.get(tetelId);
      expect(tetel).toBeDefined();
      expect(basePrice(tetel!.ar[penznem])).toBe(listaEgysegar);
    },
  );
});

// A páciens-entitás bevezetése óta minden seed tervnek explicit
// paciensId-vel kell a saját páciens-mappájához tartoznia -- ez a teszt
// fogná meg, ha egy új seed terv paciensId nélkül vagy egy `seedPatients`-be
// fel nem vett azonosítóval kerülne be.
describe('seedPlans paciensId-integritás', () => {
  const patientDirsByPaciensId = new Map(
    seedPatients.map(({ patientDir, record }) => [record.paciensId, patientDir]),
  );

  it.each(
    seedPlans.map(({ patientDir, planDir, plan }) => ({
      cimke: `${plan.paciens.nev} v${plan.verzio} (${planDir})`,
      patientDir,
      paciensId: plan.paciensId,
    })),
  )('$cimke -> paciensId egy seedPatients-beli rekordra mutat, a saját mappájával', ({
    patientDir,
    paciensId,
  }) => {
    expect(paciensId).toBeTruthy();
    expect(patientDirsByPaciensId.get(paciensId!)).toBe(patientDir);
  });

  it('ugyanahhoz a tervId-hez tartozó verziók ugyanabban a planDir-ben vannak', () => {
    const planDirByTervId = new Map<string, string>();
    for (const { planDir, plan } of seedPlans) {
      const existing = planDirByTervId.get(plan.tervId);
      if (existing == null) {
        planDirByTervId.set(plan.tervId, planDir);
      } else {
        expect(planDir).toBe(existing);
      }
    }
  });

  it('Nagy Éva két önálló terv-láncot kap ugyanabban a páciens-mappában', () => {
    const nagyEntries = seedPlans.filter(({ plan }) => plan.paciens.nev === 'Nagy Éva');
    const distinctPatientDirs = new Set(nagyEntries.map((e) => e.patientDir));
    const distinctPlanDirs = new Set(nagyEntries.map((e) => e.planDir));
    expect(distinctPatientDirs.size).toBe(1);
    expect(distinctPlanDirs.size).toBe(2);
  });
});

// backlog-28: a seedPatientData SZÁNDÉKOSAN csak egy páciensnek
// (Nagy Éva) ad paciens-adatok.json-t -- a demónak mindkét állapotot
// (rögzített törzsadat vs. élő fallback) mutatnia kell.
describe('seedPatientData', () => {
  it('minden bejegyzés egy seedPatients-beli patientDir-re és a hozzá tartozó paciensId-re mutat', () => {
    const patientDirsByRecord = new Map(seedPatients.map(({ patientDir, record }) => [patientDir, record]));
    for (const { patientDir, data } of seedPatientData) {
      const record = patientDirsByRecord.get(patientDir);
      expect(record).toBeDefined();
      expect(data.paciensId).toBe(record!.paciensId);
    }
  });

  it('szándékosan nem minden seed páciensnek van törzsadata', () => {
    expect(seedPatientData.length).toBeLessThan(seedPatients.length);
  });
});

// backlog-41: a páciens-törlés csak akkor kipróbálható friss demó
// adaton, ha legalább egy seed páciensnek nincs terv-lánca -- mindenki
// másnak van (legalább egy) VEGLEGES verziója, ami a törlést blokkolná.
describe('seedPatients terv nélküli demó páciens (backlog-41)', () => {
  it('legalább egy seed páciensnek nincs egyetlen terv-lánca sem', () => {
    const patientDirsWithPlans = new Set(seedPlans.map((e) => e.patientDir));
    const tervNelkuli = seedPatients.filter(({ patientDir }) => !patientDirsWithPlans.has(patientDir));
    expect(tervNelkuli.length).toBeGreaterThanOrEqual(1);
  });
});

// A Kezdőlap és az /uj-terv köztes páciensválasztó recent listája
// üres állapotot mutatna friss demón, ha a seed pácienseknek nincs
// utolsoAktivitas-uk -- ez a teszt a pontos időbélyeget SZÁNDÉKOSAN nem
// vizsgálja (betöltési időhöz képesti relatív eltolásból származik, lásd
// plans.ts), csak az invariánsokat: legalább 20 páciens, minden VALÓS
// (`aktivitas` mezővel megadott) időbélyeg érvényes és múltbeli, és a
// `legutobbAktivPaciensek` a SAJÁT rendezési szabálya szerint determinisztikus
// sorrendet ad -- adatvezérelten, a konkrét pácienslistától függetlenül,
// hogy a demó-készlet bővítése ne törje meg ezt a tesztet.
describe('seedPatients utolsoAktivitas', () => {
  const patientFolders: PatientFolder[] = seedPatients.map(({ patientDir, record }) => ({
    dirName: patientDir,
    paciensId: record.paciensId,
    nev: record.nev,
    utolsoAktivitas: record.utolsoAktivitas,
  }));

  it('legalább 20 demó páciens van', () => {
    expect(seedPatients.length).toBeGreaterThanOrEqual(20);
  });

  it('van olyan páciens, akinek nincs utolsoAktivitas-a (legacy-migráció edge case)', () => {
    expect(seedPatients.some(({ record }) => record.utolsoAktivitas == null)).toBe(true);
  });

  it.each(
    seedPatients
      .filter(({ record }) => record.utolsoAktivitas != null)
      .map(({ patientDir, record }) => ({ patientDir, record })),
  )('$patientDir -- utolsoAktivitas érvényes és múltbeli', ({ record }) => {
    const aktivitas = ervenyesAktivitas(record.utolsoAktivitas);
    expect(aktivitas).toBeDefined();
    expect(Date.parse(aktivitas!.idopont)).toBeLessThan(Date.now());
  });

  it('legutobbAktivPaciensek a limitnek megfelelő számú, csökkenő időrendű, utolsoAktivitas nélküli pácienst nem tartalmazó listát ad', () => {
    const LIMIT = 5;
    const top = legutobbAktivPaciensek(patientFolders, LIMIT);
    const aktivakSzama = patientFolders.filter((p) => p.utolsoAktivitas != null).length;
    expect(top).toHaveLength(Math.min(LIMIT, aktivakSzama));
    expect(top.every((p) => p.utolsoAktivitas != null)).toBe(true);
    for (let i = 1; i < top.length; i++) {
      expect(Date.parse(top[i - 1].utolsoAktivitas!.idopont)).toBeGreaterThanOrEqual(
        Date.parse(top[i].utolsoAktivitas!.idopont),
      );
    }
    // Determinisztikus: ugyanaz a bemenet mindig ugyanazt a nevsorrendet adja.
    const ujra = legutobbAktivPaciensek(patientFolders, LIMIT).map((p) => p.nev);
    expect(ujra).toEqual(top.map((p) => p.nev));
  });
});

// 103. tétel: a `seedVerzio()` az EGYETLEN forrás, amiből a "nincs mentett
// PDF" oka (demó-készlet vs. valódi hiány) eldönthető.
describe('seedVerzio', () => {
  it('igaz minden seedPlans-beli hármasra', () => {
    for (const { patientDir, planDir, versionDir } of seedPlans) {
      expect(seedVerzio({ patientDir, planDir, versionDir })).toBe(true);
    }
  });

  it('hamis egy nem seed-eredetű hármasra', () => {
    expect(
      seedVerzio({ patientDir: 'nincs-ilyen-paciens', planDir: 'terv', versionDir: 'v1_2026-01-01' }),
    ).toBe(false);
  });

  it('hamis, ha csak a versionDir tér el egy létező seed-lánctól', () => {
    const [elso] = seedPlans;
    expect(
      seedVerzio({ ...elso, versionDir: `${elso.versionDir}-nemletezo` }),
    ).toBe(false);
  });
});
