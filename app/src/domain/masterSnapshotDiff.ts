// Páciens master (paciens-adatok.json, D33) <-> terv-piszkozat paciens-
// blokk mezőszintű összevetése -- backlog-40 (redesign DP-016). A D33
// invariánsa (nincs automatikus szinkron egyik irányban sem) változatlan
// marad; ez a modul csak az összevetéshez ad tiszta, I/O-mentes építőkövet
// mindkét irányú, EXPLICIT szinkron-művelethez
// (components/TorzsadatDiffDialog.tsx, pages/patientPage/TorzsadatSyncCard.tsx).
//
// A diffelhető mezőkör pontosan a `Paciens` 8 mezője -- a
// `PatientMasterData` ezen felüli mezői (`schemaVersion`, `paciensId`)
// metaadatok, nem terv-pillanatkép részei, ezért nem diffelendők. A master
// `Paciens`-alakra hozásához a MÁR MEGLÉVŐ `paciensTorzsadatbol()`
// (domain/paciensAdatok.ts) hívandó, nem duplikálva itt.

import { formatShortDate } from './date';
import type { Paciens } from './types';

export interface MezoElteres {
  kulcs: keyof Paciens;
  cimke: string;
}

export const MASTER_DIFF_MEZOK: ReadonlyArray<{ kulcs: keyof Paciens; cimke: string }> = [
  { kulcs: 'nev', cimke: 'Név' },
  { kulcs: 'szuletesiIdo', cimke: 'Született' },
  { kulcs: 'lakcim', cimke: 'Lakcím' },
  { kulcs: 'telefon', cimke: 'Telefon' },
  { kulcs: 'email', cimke: 'E-mail' },
  { kulcs: 'taj', cimke: 'TAJ' },
  { kulcs: 'kiskoru', cimke: 'Kiskorú' },
  { kulcs: 'torvenyesKepviselo', cimke: 'Törvényes képviselő' },
];

/** `torvenyesKepviselo`-nál a `null` és az üres string ugyanazt jelenti -- nem eltérés, csak a mező alakja tér el. */
function ertekEgyezik(a: unknown, b: unknown): boolean {
  const na = a ?? '';
  const nb = b ?? '';
  return na === nb;
}

/**
 * Csak az ELTÉRŐ mezőket adja vissza (a `TorzsadatDiffDialog` táblája csak
 * ezeket listázza, docs/03-funkcionalis-spec.md § 2. Páciens adatlap). Az
 * "üres az egyik oldalon, kitöltött a másikon" IS eltérésnek számít --
 * ellentétben a `paciensDuplikacio.ts` `AdatViszony`-jával (ahol a hiányzó
 * adat sosem "ellentmond"), itt pont az a kérdés, átvegyük-e a másik oldal
 * értékét, tehát egy hiányzó mező is döntést igényel.
 */
export function masterSnapshotDiff(master: Paciens, snapshot: Paciens): MezoElteres[] {
  return MASTER_DIFF_MEZOK.filter(
    ({ kulcs }) => !ertekEgyezik(master[kulcs], snapshot[kulcs]),
  ).map(({ kulcs, cimke }) => ({ kulcs, cimke }));
}

/** Egy mező emberi olvasható értéke a diff-táblához -- üres a docs/07 "—" konvenciója szerint. */
export function mezoErtekSzoveg(p: Paciens, kulcs: keyof Paciens): string {
  if (kulcs === 'kiskoru') return p.kiskoru ? 'Igen' : 'Nem';
  if (kulcs === 'szuletesiIdo') return p.szuletesiIdo ? formatShortDate(p.szuletesiIdo, 'hu') : '';
  const ertek = p[kulcs];
  return typeof ertek === 'string' ? ertek : '';
}

/** A kijelölt mezőket `forras`-ból `cel`-be másolja, a többit érintetlenül hagyja. */
export function alkalmazMezoket(cel: Paciens, forras: Paciens, kulcsok: (keyof Paciens)[]): Paciens {
  const next = { ...cel };
  for (const kulcs of kulcsok) {
    (next as Record<keyof Paciens, unknown>)[kulcs] = forras[kulcs];
  }
  return next;
}

/**
 * Az `elteresek` azon részhalmaza, ahol MINDKÉT oldalon van érték, és azok
 * különböznek -- egy üres mező pótlása (a másik oldal kitöltött) nem
 * ÜTKÖZÉS, csak hiányzó adat kiegészítése. A lépés-elhagyási prompt
 * (backlog-40, 1. döntés) EZT használja a megjelenítés eldöntéséhez, hogy
 * egy vadonatúj páciens első adatkitöltése (a quick-create után a doki
 * kitölti a többi mezőt a Páciens adatlapon, miközben a master még csak a
 * nevet tartalmazza) ne szakítsa félbe minden alkalommal a workflow-t. A
 * kártya (`TorzsadatSyncCard`) és az Előnézet info-sora ellenben a TELJES
 * `masterSnapshotDiff`-et mutatja -- ott egy üres mező pótlása is hasznos
 * infó, nem zavaró megszakítás.
 */
export function valodiUtkozesek(elteresek: MezoElteres[], master: Paciens, snapshot: Paciens): MezoElteres[] {
  return elteresek.filter(
    ({ kulcs }) => mezoErtekSzoveg(master, kulcs) !== '' && mezoErtekSzoveg(snapshot, kulcs) !== '',
  );
}

/**
 * Stabil aláírás egy konkrét (master, snapshot) eltérés-állapothoz -- a
 * "diffenként egyszer" lépés-elhagyási prompt (3. döntés, D161) ezzel dönti
 * el, hogy a doki MÁR látta-e és elutasította-e pontosan EZT az eltérést.
 * Csak a mezőkulcsok listája nem lenne elég: egy átszerkesztett érték is
 * "más" diffnek számít, ezért mindkét oldal ÉRTÉKE is az aláírás része.
 */
export function diffAzonosito(elteresek: MezoElteres[], master: Paciens, snapshot: Paciens): string {
  return elteresek
    .map(({ kulcs }) => `${kulcs}:${mezoErtekSzoveg(master, kulcs)}→${mezoErtekSzoveg(snapshot, kulcs)}`)
    .join('|');
}
