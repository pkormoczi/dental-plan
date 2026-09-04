// Páciens-duplikáció kétfázisú detektálása (D42,
// docs/03-funkcionalis-spec.md § „Új terv indítása" / § 9. Páciensek) --
// külön modul a `paciensKereses.ts`-től, mert az a keresődoboz szöveg⊂név
// relevancia-rendezője, ez pedig NÉV↔NÉV hasonlóság. 1. fázis (ez a modul):
// tisztán `PatientFolder[]`-ből, olcsón, minden leütésre futtatható. 2. fázis
// (a `torzsadatBetoltes.ts` `loadTorzsadatok`-ja): a szűk jelölt-körre
// betöltött DOB/telefon, amit ez a modul `duplikaciosJeloltek()`-ben fésül
// össze a névtalálatokkal.

import { norm } from './search';
import type { PatientFolder } from './types';

export type NevEgyezes = 'nev-pontos' | 'nev-hasonlo';
export type AdatViszony = 'egyezik' | 'ellentmond' | 'hianyzik';

export interface NevJelolt {
  patient: PatientFolder;
  egyezes: NevEgyezes;
}

export interface JeloltAdat {
  szuletesiIdo: string;
  telefon: string;
}

export interface DuplikaciosJelolt extends NevJelolt {
  szuletesiIdo: AdatViszony;
  telefon: AdatViszony;
  /**
   * Igaz, ha a DOB VAGY a telefon ellentmond (nem csak hiányzik). Mivel a
   * `duplikaciosJeloltek()` a `nev-hasonlo` + ellentmondás kombinációt
   * mindig kiszűri (lásd lent), ez a mező csak `nev-pontos` jelöltnél
   * fordulhat elő -- a hívó megerősítő dialógusa emiatt ritkán, kizárólag
   * a pontos-egyezés ágon nyílik.
   */
  ellentmondas: boolean;
  /** Lefutott-e már a jelöltre a 2. fázis (DOB/telefon betöltése). */
  betoltve: boolean;
  /** A jelölt nyilvántartott DOB/telefonja; `null`, ha még nincs betöltve, vagy nem olvasható. */
  adat: JeloltAdat | null;
}

/** D230: a javaslat-lista alapból ennyit mutat, fölötte "+N további". */
export const JAVASLAT_LATHATO = 3;
/** A 2. fázis (DOB/telefon) betöltésének felső korlátja egy begépelt névre. */
export const JELOLT_MAX = 10;

const NEM_BETU_SZAM = /[^\p{L}\p{N}]+/u;
const ISO_DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Ékezetfüggetlen, nem-betű/szám határon vágott tokenek (`norm()`-ra épül). */
export function nevTokenek(nev: string): string[] {
  return norm(nev)
    .split(NEM_BETU_SZAM)
    .filter(Boolean);
}

export function nevKulcs(nev: string): string {
  return nevTokenek(nev).join(' ');
}

/**
 * Két token egyezik, ha azonos, vagy az egyik (min. 3 karakteres) prefixe a
 * másiknak -- KIVÉVE a magyar "-né" toldalékot ("János" ⊄ "Jánosné" jelölt
 * társaként): enélkül ez lenne a leggyakoribb hamis pozitív a
 * páciensnévanyagban, két különböző embert (férj/feleség) mosna össze.
 */
function tokenEgyezik(a: string, b: string): boolean {
  if (a === b) return true;
  const [rovid, hosszu] = a.length <= b.length ? [a, b] : [b, a];
  if (rovid.length < 3 || !hosszu.startsWith(rovid)) return false;
  return hosszu !== rovid + 'ne';
}

/** Mohó, egy-az-egyhez tokenpárosítás -- nem mutálja a bemenetet. */
function egyezoTokenSzam(aTokenek: string[], bTokenek: string[]): number {
  const szabad = [...bTokenek];
  let szam = 0;
  for (const a of aTokenek) {
    const idx = szabad.findIndex((b) => tokenEgyezik(a, b));
    if (idx !== -1) {
      szabad.splice(idx, 1);
      szam++;
    }
  }
  return szam;
}

/**
 * 1. fázis: olcsó, csak `PatientFolder[]`-t igénylő névszűrés. Küszöb
 * `min(2, min(|A|,|B|))` egyező tokenpár -- egy önmagában begépelt
 * vezetéknév is felszínre hozza az azonos vezetéknevű pácienseket (a max-3
 * megjelenítési korlát, D230, ezt kezelhetővé teszi), egytokenes nevek
 * pedig egyetlen egyező tokennel is jelöltek. Szándékosan NEM
 * Levenshtein/fuzzy-egyezés.
 */
export function nevJeloltek(
  patients: PatientFolder[],
  nev: string,
  opts?: { kihagyottPaciensId?: string },
): NevJelolt[] {
  const bTokenek = nevTokenek(nev);
  if (bTokenek.length === 0) return [];
  const bKulcs = bTokenek.join(' ');
  const kihagyott = opts?.kihagyottPaciensId;

  const jeloltek: NevJelolt[] = [];
  for (const patient of patients) {
    if (kihagyott && patient.paciensId === kihagyott) continue;
    const aTokenek = nevTokenek(patient.nev);
    if (aTokenek.length === 0) continue;
    if (aTokenek.join(' ') === bKulcs) {
      jeloltek.push({ patient, egyezes: 'nev-pontos' });
      continue;
    }
    const kuszob = Math.min(2, Math.min(aTokenek.length, bTokenek.length));
    if (egyezoTokenSzam(aTokenek, bTokenek) >= kuszob) {
      jeloltek.push({ patient, egyezes: 'nev-hasonlo' });
    }
  }
  return jeloltek;
}

/**
 * Csak akkor `'egyezik'`/`'ellentmond'`, ha MINDKÉT oldal ISO (`ÉÉÉÉ-HH-NN`)
 * alakú -- egy hibás/régi pillanatkép-formátum sosem hazudhat ellentmondást,
 * `'hianyzik'`-ra esik vissza.
 */
export function szuletesiIdoViszony(a: string, b: string): AdatViszony {
  if (!ISO_DATUM.test(a) || !ISO_DATUM.test(b)) return 'hianyzik';
  return a === b ? 'egyezik' : 'ellentmond';
}

/**
 * Csak számjegyek, országhívó-/körzet-előtag levágva -- a vezetékes szám
 * 8 jegyű, a mobil 9, ezért nem "utolsó N jegy", hanem prefix-normalizálás.
 * `< 8` számjegynél `null` (a hívó `'hianyzik'`-ra fordítja), sosem hamis
 * ellentmondás forrása.
 */
export function telefonKulcs(telefon: string): string | null {
  let d = telefon.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('36') && (d.length === 10 || d.length === 11)) d = d.slice(2);
  else if (d.startsWith('06')) d = d.slice(2);
  return d.length >= 8 ? d : null;
}

export function telefonViszony(a: string, b: string): AdatViszony {
  const ka = telefonKulcs(a);
  const kb = telefonKulcs(b);
  if (ka === null || kb === null) return 'hianyzik';
  return ka === kb ? 'egyezik' : 'ellentmond';
}

function jeloltRang(j: DuplikaciosJelolt): number {
  if (j.ellentmondas) return 2;
  if (j.szuletesiIdo === 'hianyzik' && j.telefon === 'hianyzik') return 1;
  return 0; // megerősített: legalább egy 'egyezik', nulla 'ellentmond'
}

/**
 * 2. fázis: a névtalálatokat a betöltött DOB/telefonnal fésüli össze.
 * `torzsadatByDir` KULCS-JELENLÉTE jelzi, hogy egy jelöltre már betöltöttük
 * a fázis-2 adatot (érték `null` = betöltve, de nincs adat) -- egy még be
 * nem töltött `nev-hasonlo` jelölt emiatt NEM jelenik meg (nincs
 * felvillanó-majd-eltűnő javaslat), de egy `nev-pontos` jelölt betöltés
 * előtt is azonnal látszik, mindkét viszonya `'hianyzik'`-ként -- ez a mai
 * (egysoros `norm()`-egyezésű) viselkedés, nulla késleltetéssel.
 *
 * Ellentmondó adatnál a `nev-hasonlo` jelölt kiesik (1. döntés), a
 * `nev-pontos` jelölt viszont bennmarad, `ellentmondas: true`-val (2.
 * döntés) -- két azonos nevű páciensnél az eltérő DOB/telefon nem tünteti
 * el a figyelmeztetést, csak jelöléssel látja el.
 */
export function duplikaciosJeloltek(
  jeloltek: NevJelolt[],
  bemenet: { nev: string; szuletesiIdo: string; telefon: string },
  torzsadatByDir: Record<string, JeloltAdat | null>,
): DuplikaciosJelolt[] {
  const eredmeny: DuplikaciosJelolt[] = [];
  for (const jelolt of jeloltek) {
    const dirName = jelolt.patient.dirName;
    const betoltve = dirName in torzsadatByDir;
    if (!betoltve) {
      if (jelolt.egyezes === 'nev-pontos') {
        eredmeny.push({
          ...jelolt,
          szuletesiIdo: 'hianyzik',
          telefon: 'hianyzik',
          ellentmondas: false,
          betoltve: false,
          adat: null,
        });
      }
      continue;
    }
    const adat = torzsadatByDir[dirName];
    const szulViszony = adat ? szuletesiIdoViszony(bemenet.szuletesiIdo, adat.szuletesiIdo) : 'hianyzik';
    const telViszony = adat ? telefonViszony(bemenet.telefon, adat.telefon) : 'hianyzik';
    const ellentmondas = szulViszony === 'ellentmond' || telViszony === 'ellentmond';
    if (jelolt.egyezes === 'nev-hasonlo' && ellentmondas) continue;
    eredmeny.push({ ...jelolt, szuletesiIdo: szulViszony, telefon: telViszony, ellentmondas, betoltve: true, adat });
  }

  return [...eredmeny].sort((a, b) => {
    if (a.egyezes !== b.egyezes) return a.egyezes === 'nev-pontos' ? -1 : 1;
    const ra = jeloltRang(a);
    const rb = jeloltRang(b);
    if (ra !== rb) return ra - rb;
    return a.patient.nev.localeCompare(b.patient.nev, 'hu');
  });
}
