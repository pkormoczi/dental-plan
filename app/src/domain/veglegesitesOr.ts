// Véglegesítés-őr -- a PreviewPage.tsx kemény blokkjának és puha
// confirmStep-láncának tiszta, React-mentes magja (docs/03-funkcionalis-spec.md
// § 4. Előnézet és véglegesítés). Kiemelve, hogy a lánc SORRENDJE és a
// kemény/puha megkülönböztetés unit tesztelhető legyen -- korábban csak
// teljes `<App/>` renderen, `userEvent`-tel volt vizsgálható
// (`PreviewPage.test.tsx`). A meglévő domain-függvényeket hívja, egyiket sem
// írja újra -- lásd `domain/kitoltetlen.ts`, `domain/nev.ts`.
//
// A `PreviewPage.tsx`-ben marad: a React state, a dialógus-szövegek
// (`confirmStepTartalom`, `nevListaSzoveg` -- prezentáció), a `doFinalize()`,
// és az `isPlaceholderTemplate()`-re épülő D23-zár (a nyilatkozat+aláírás
// oldal letiltása) -- ez utóbbi nem ehhez a lánchoz, hanem a 4. oldal
// renderjéhez tartozik.

import {
  hianyzoCsomagLeirasok,
  kitoltetlenSorok,
  nullaOsszeguSorok,
  type HianyzoCsomagLeiras,
  type KitoltetlenSor,
} from './kitoltetlen';
import { fallbackSorok, type FallbackSorokEredmeny } from './nev';
import type { Plan, PriceList } from './types';

export type VeglegesitesLepes =
  | 'missing-fields'
  | 'de-fallback-names'
  | 'zero-price-rows'
  | 'missing-leiras';

// Rendezett lánc -- a sorrend implementációs döntés: a páciensadat és a
// nyelvi/jogi/pénzügyi probléma megelőzi a kommunikációs jellegű
// leírás-hiányt (docs/03-funkcionalis-spec.md § 4. Előnézet és
// véglegesítés).
export const VEGLEGESITES_LEPESEK: VeglegesitesLepes[] = [
  'missing-fields',
  'de-fallback-names',
  'zero-price-rows',
  'missing-leiras',
];

export interface VeglegesitesDiagnozis {
  /** A név hiánya a mappanévhez kötelező (docs/03 § 2. Páciens adatlap) -- KEMÉNY blokk, nem a lánc tagja. */
  nameMissing: boolean;
  /** A fogtérkép-kattintással felvett, de be nem azonosított (nevSnapshot nélküli) sorok -- KEMÉNY blokk, nem a lánc tagja. */
  uresSorok: KitoltetlenSor[];
  nevProblemak: FallbackSorokEredmeny;
  nullaSorok: string[];
  hianyzoLeirasok: HianyzoCsomagLeiras[];
  /** Melyik PUHA lépés alkalmazható -- ez vezérli a `kovetkezoLepes` bejárását. */
  alkalmazhato: Record<VeglegesitesLepes, boolean>;
}

/**
 * A véglegesítés-őr összes bemenete egy helyen, tiszta függvényként.
 * `leirasokMutatasa` a hívó felelőssége (`plan.leirasokMutatasa ?? true`) --
 * ez a modul nem ismeri a `Plan` mező alapértékét, csak a kikapcsolt/
 * bekapcsolt tényt.
 */
export function veglegesitesDiagnozis(
  plan: Plan,
  priceList: PriceList,
  leirasokMutatasa: boolean,
): VeglegesitesDiagnozis {
  const nameMissing = !plan.paciens.nev.trim();
  const otherFieldsMissing =
    !plan.paciens.szuletesiIdo ||
    !plan.paciens.lakcim ||
    !plan.paciens.telefon ||
    !plan.paciens.email ||
    !plan.paciens.taj;
  const uresSorok = kitoltetlenSorok(plan);
  // D21/D24: a hiányzó VAGY kézzel eltérített német tételnevek soha nem
  // eshetnek/maradhatnak néma módon a terven -- a doki itt látja, mely nevek
  // érintettek, mielőtt a páciens aláírja a dokumentumot. Három külön ok
  // (docs/03-funkcionalis-spec.md § 4. Előnézet és véglegesítés).
  const nevProblemak = fallbackSorok(plan, priceList);
  const nevProblemaSzama =
    nevProblemak.nincsForditas.length +
    nevProblemak.elterAzArlistatol.length +
    nevProblemak.egyedi.length;
  // PUHA figyelmeztetés (backlog-19) -- névvel ellátott, de 0 összegű sorok
  // (elgépelés + reflexes Enter az egyedi-sor-felvétel útján, vagy
  // elfelejtett ár). Szándékosan nem kemény blokk: a 0 ár legitim is lehet
  // (pl. ingyenes kontroll).
  const nullaSorok = nullaOsszeguSorok(plan);
  // PUHA figyelmeztetés (docs/02-domain-modell.md § Tétel-leírás) -- csak
  // akkor releváns, ha a leírások ténylegesen nyomtatódnak; kikapcsolt
  // `leirasokMutatasa` mellett a hiányuk nem érinti a nyomtatványt.
  const hianyzoLeirasok = leirasokMutatasa ? hianyzoCsomagLeirasok(plan, priceList) : [];

  return {
    nameMissing,
    uresSorok,
    nevProblemak,
    nullaSorok,
    hianyzoLeirasok,
    alkalmazhato: {
      'missing-fields': otherFieldsMissing,
      'de-fallback-names': nevProblemaSzama > 0,
      'zero-price-rows': nullaSorok.length > 0,
      'missing-leiras': hianyzoLeirasok.length > 0,
    },
  };
}

/** A `VEGLEGESITES_LEPESEK` láncban `fromIndex`-től kezdve az első alkalmazható lépés, vagy `null`. */
export function kovetkezoLepes(
  alkalmazhato: Record<VeglegesitesLepes, boolean>,
  fromIndex: number,
): VeglegesitesLepes | null {
  for (let i = fromIndex; i < VEGLEGESITES_LEPESEK.length; i++) {
    if (alkalmazhato[VEGLEGESITES_LEPESEK[i]]) return VEGLEGESITES_LEPESEK[i];
  }
  return null;
}
