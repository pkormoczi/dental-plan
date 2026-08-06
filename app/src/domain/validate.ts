// Futásidejű alak-/típusvalidáció a JSON betöltési határokon (P1-6).
//
// Eddig az EGYETLEN futásidejű ellenőrzés a `schemaVersion` felső korlátja
// volt (schema.ts) -- egy sérült/kézzel piszkált terv.json/arlista.json/
// beallitasok.json más néven simán bejutott volna a state-be, és egy `null`
// vagy string egy pénzmezőben csendben 0-ra esett volna szorzásnál. Nincs
// zod/valibot függőség (a repo szándékosan minimál) -- kézzel írt guardok,
// csak a pénz- és tömbmezőkre, ahol egy hibás érték ténylegesen hihető
// rossz számot okozna a UI-on/PDF-en.

export class ValidationError extends Error {
  readonly fileKind: string;

  constructor(fileKind: string, reason: string) {
    super(`A(z) ${fileKind} fájl szerkezete nem érvényes: ${reason}`);
    this.name = 'ValidationError';
    this.fileKind = fileKind;
  }
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isArray(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function fail(fileKind: string, reason: string): never {
  throw new ValidationError(fileKind, reason);
}

function assertAr(ar: unknown, fileKind: string, path: string): void {
  if (ar == null) return; // null = ezen a pénznemen nem ajánlható -- érvényes
  if (typeof ar !== 'object') fail(fileKind, `${path} nem objektum`);
  const a = ar as Record<string, unknown>;
  if (a.tipus === 'FIX') {
    if (!isFiniteNumber(a.ertek)) fail(fileKind, `${path}.ertek nem véges szám`);
  } else if (a.tipus === 'SAVOS') {
    if (!isFiniteNumber(a.min)) fail(fileKind, `${path}.min nem véges szám`);
    if (!isFiniteNumber(a.max)) fail(fileKind, `${path}.max nem véges szám`);
  } else {
    fail(fileKind, `${path}.tipus ismeretlen ("${String(a.tipus)}")`);
  }
}

export function assertPriceListShape(data: unknown, fileKind = 'arlista.json'): void {
  if (data == null || typeof data !== 'object') fail(fileKind, 'nem objektum');
  const pl = data as Record<string, unknown>;
  if (!isArray(pl.kategoriak)) fail(fileKind, 'hiányzik vagy nem tömb a "kategoriak" mező');
  if (!isArray(pl.tetelek)) fail(fileKind, 'hiányzik vagy nem tömb a "tetelek" mező');
  pl.tetelek.forEach((raw, i) => {
    if (raw == null || typeof raw !== 'object') fail(fileKind, `tetelek[${i}] nem objektum`);
    const tetel = raw as Record<string, unknown>;
    if (typeof tetel.id !== 'string' || !tetel.id) fail(fileKind, `tetelek[${i}].id hiányzik`);
    if (tetel.ar == null || typeof tetel.ar !== 'object') {
      fail(fileKind, `tetelek[${i}].ar hiányzik`);
    }
    const ar = tetel.ar as Record<string, unknown>;
    assertAr(ar.HUF, fileKind, `tetelek[${i}].ar.HUF`);
    assertAr(ar.EUR, fileKind, `tetelek[${i}].ar.EUR`);
  });
}

export function assertPlanShape(data: unknown, fileKind = 'terv.json'): void {
  if (data == null || typeof data !== 'object') fail(fileKind, 'nem objektum');
  const plan = data as Record<string, unknown>;
  if (typeof plan.tervId !== 'string') fail(fileKind, 'hiányzik a "tervId" mező');
  if (!isArray(plan.fazisok)) fail(fileKind, 'hiányzik vagy nem tömb a "fazisok" mező');
  plan.fazisok.forEach((rawFazis, fi) => {
    if (rawFazis == null || typeof rawFazis !== 'object') {
      fail(fileKind, `fazisok[${fi}] nem objektum`);
    }
    const fazis = rawFazis as Record<string, unknown>;
    if (!isArray(fazis.sorok)) fail(fileKind, `fazisok[${fi}].sorok hiányzik vagy nem tömb`);
    fazis.sorok.forEach((rawSor, si) => {
      if (rawSor == null || typeof rawSor !== 'object') {
        fail(fileKind, `fazisok[${fi}].sorok[${si}] nem objektum`);
      }
      const sor = rawSor as Record<string, unknown>;
      const prefix = `fazisok[${fi}].sorok[${si}]`;
      if (!isFiniteNumber(sor.mennyiseg)) fail(fileKind, `${prefix}.mennyiseg nem véges szám`);
      if (!isFiniteNumber(sor.listaEgysegar)) {
        fail(fileKind, `${prefix}.listaEgysegar nem véges szám`);
      }
      if (!isFiniteNumber(sor.tenylegesEgysegar)) {
        fail(fileKind, `${prefix}.tenylegesEgysegar nem véges szám`);
      }
    });
  });
  if (plan.osszesitok == null || typeof plan.osszesitok !== 'object') {
    fail(fileKind, 'hiányzik az "osszesitok" mező');
  }
  const osszesitok = plan.osszesitok as Record<string, unknown>;
  for (const key of ['kezelesekOsszesen', 'kedvezmeny', 'fizetendo']) {
    if (!isFiniteNumber(osszesitok[key])) fail(fileKind, `osszesitok.${key} nem véges szám`);
  }
}

export function assertSettingsShape(data: unknown, fileKind = 'beallitasok.json'): void {
  if (data == null || typeof data !== 'object') fail(fileKind, 'nem objektum');
  const s = data as Record<string, unknown>;
  if (s.rendelo == null || typeof s.rendelo !== 'object') fail(fileKind, 'hiányzik a "rendelo" mező');
  if (!isArray(s.orvosok)) fail(fileKind, 'hiányzik vagy nem tömb az "orvosok" mező');
  if (!isFiniteNumber(s.ervenyessegNap)) fail(fileKind, '"ervenyessegNap" nem véges szám');
}
