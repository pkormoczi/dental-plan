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

import { arElteroSorok, type ArElteroSorok } from './arKoveti';
import {
  araztalanSorok,
  hianyzoCsomagLeirasok,
  kitoltetlenSorok,
  nullaOsszeguSorok,
  type HianyzoCsomagLeiras,
  type KitoltetlenSor,
} from './kitoltetlen';
import { masterSnapshotDiff, type MezoElteres } from './masterSnapshotDiff';
import { fallbackSorok, type FallbackSorokEredmeny } from './nev';
import { orvosProblema as szamitOrvosProblema, type OrvosProblema } from './orvosok';
import { elolegTullepi, tervVegosszeg } from './totals';
import type { Paciens, Plan, PriceList } from './types';

export type VeglegesitesLepes =
  | 'missing-fields'
  | 'de-fallback-names'
  | 'zero-price-rows'
  | 'missing-leiras'
  | 'price-drift';

// Rendezett lánc -- a sorrend implementációs döntés: a páciensadat és a
// nyelvi/jogi/pénzügyi probléma megelőzi a kommunikációs jellegű
// leírás-hiányt (docs/03-funkcionalis-spec.md § 4. Előnézet és
// véglegesítés). A `price-drift` (backlog-61, D70) utolsó lépésként --
// önmagában sosem blokkolja a többi lépés kommunikációs célját.
export const VEGLEGESITES_LEPESEK: VeglegesitesLepes[] = [
  'missing-fields',
  'de-fallback-names',
  'zero-price-rows',
  'missing-leiras',
  'price-drift',
];

export interface VeglegesitesDiagnozis {
  /** A név hiánya a mappanévhez kötelező (docs/03 § 2. Terv adatai) -- KEMÉNY blokk, nem a lánc tagja. */
  nameMissing: boolean;
  /** A fogtérkép-kattintással felvett, de be nem azonosított (nevSnapshot nélküli) sorok -- KEMÉNY blokk, nem a lánc tagja. */
  uresSorok: KitoltetlenSor[];
  /**
   * Az előleg (D66: abszolút összeg) meghaladja a fizetendőt -- KEMÉNY
   * blokk, nem a lánc tagja. A mai `0-100%`-os szorítás (a százalék-alapú
   * modell strukturális védelme) megszűnt, ezt a validációt explicit kell
   * kikényszeríteni: az érték nem vágódik le automatikusan, a doki
   * tudatosan rendezi (`elolegTullepi`, `domain/totals.ts`).
   */
  elolegTullep: boolean;
  /** Névvel ellátott, de a terv pénznemében beárazatlan, kézi árat sem kapott sorok -- KEMÉNY blokk (62. tétel, D71), nem a lánc tagja. */
  araztalanSorok: string[];
  nevProblemak: FallbackSorokEredmeny;
  nullaSorok: string[];
  hianyzoLeirasok: HianyzoCsomagLeiras[];
  /**
   * A páciens törzsadata (D33) és a terv `paciens` pillanatképe közötti
   * mezőszintű eltérés -- INFO-szintű jelzés (backlog-40, D162), NEM tagja a
   * PUHA `VEGLEGESITES_LEPESEK` láncnak és nem befolyásolja az
   * `alkalmazhato`-t: az a map közvetlenül a `kovetkezoLepes` bejárását
   * vezérli, egy ott felvett mező automatikusan megerősítő dialógust
   * nyitna, amit a D162 kifejezetten tilt (a véglegesítés önmagában nem
   * kényszerít szinkronizálást, D9/D33). `master: null`-nál mindig üres --
   * a hívó (`PreviewPage.tsx`) felelőssége eldönteni, mit jelent a `null`
   * (nincs lezárt törzsadat, vagy nem oldható fel a patientDir).
   */
  masterElteresek: MezoElteres[];
  /**
   * Hiányzó vagy már nem aktív kezelőorvos (D68) -- KEMÉNY blokk, akárcsak
   * `nameMissing`/`uresSorok`, NEM tagja a PUHA `VEGLEGESITES_LEPESEK`
   * láncnak és nem szerepel az `alkalmazhato`-ban, ugyanazon okból, mint a
   * `masterElteresek`: az `alkalmazhato` közvetlenül a `kovetkezoLepes`
   * bejárását vezérli, egy ott felvett mező automatikusan megerősítő
   * dialógust nyitna egy tényleges zár helyett.
   */
  orvosProblema: OrvosProblema | null;
  /**
   * Azon sorok, amik eltérnek a mai árlistától -- elavult pillanatkép
   * ÉS/VAGY kézzel felülírt ajánlati ár (backlog-61, D70,
   * `domain/arKoveti.ts`). PUHA figyelmeztetés: a kedvezmény/felár legitim,
   * szándékos állapot is lehet (D9/D25), ezért nem blokkol.
   */
  arElteresek: ArElteroSorok;
  /** Melyik PUHA lépés alkalmazható -- ez vezérli a `kovetkezoLepes` bejárását. */
  alkalmazhato: Record<VeglegesitesLepes, boolean>;
}

/**
 * A véglegesítés-őr összes bemenete egy helyen, tiszta függvényként.
 * `leirasokMutatasa` a hívó felelőssége (`plan.leirasokMutatasa ?? true`) --
 * ez a modul nem ismeri a `Plan` mező alapértékét, csak a kikapcsolt/
 * bekapcsolt tényt. `master` ugyanígy a hívó betöltése (`null` = nincs
 * lezárt törzsadat vagy nem ismert a patientDir). `aktivOrvosNevek` a hívó
 * MÁR feloldott aktív-orvos listája (`domain/orvosok.ts` `aktivOrvosok()`)
 * -- ez a modul csak feloldott bemenetet kap, `Settings`-et sosem lát
 * közvetlenül, ugyanaz az elv, mint a fenti két paraméternél. Szándékosan
 * kötelező, nem defaultos paraméter -- egy csendben kikapcsolt hard block
 * jogi kockázat lenne (a `ujVerzioDatum.ts` `ma` paraméterének mintája).
 */
export function veglegesitesDiagnozis(
  plan: Plan,
  priceList: PriceList,
  leirasokMutatasa: boolean,
  master: Paciens | null,
  aktivOrvosNevek: string[],
): VeglegesitesDiagnozis {
  const nameMissing = !plan.paciens.nev.trim();
  const otherFieldsMissing =
    !plan.paciens.szuletesiIdo ||
    !plan.paciens.lakcim ||
    !plan.paciens.telefon ||
    !plan.paciens.email ||
    !plan.paciens.taj;
  const uresSorok = kitoltetlenSorok(plan);
  const elolegTullep =
    plan.elolegOsszeg != null &&
    elolegTullepi(tervVegosszeg(plan.fazisok, plan.kedvezmenyOsszeg), plan.elolegOsszeg);
  // KEMÉNY blokk (62. tétel, D71): egy beárazatlan tétel 0 Ft-tal nem
  // kerülhet aláírandó dokumentumra -- a doki vagy kézi ajánlati árat ad,
  // vagy törli/másik pénznemre vált.
  const araztalanSorokLista = araztalanSorok(plan, priceList);
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
  const masterElteresek = master ? masterSnapshotDiff(master, plan.paciens) : [];
  const orvosProblema = szamitOrvosProblema(plan.orvos, aktivOrvosNevek);
  const arElteresek = arElteroSorok(plan, priceList);

  return {
    nameMissing,
    uresSorok,
    elolegTullep,
    araztalanSorok: araztalanSorokLista,
    nevProblemak,
    nullaSorok,
    hianyzoLeirasok,
    masterElteresek,
    orvosProblema,
    arElteresek,
    alkalmazhato: {
      'missing-fields': otherFieldsMissing,
      'de-fallback-names': nevProblemaSzama > 0,
      'zero-price-rows': nullaSorok.length > 0,
      'missing-leiras': hianyzoLeirasok.length > 0,
      'price-drift': arElteresek.elavult.length + arElteresek.keziAr.length > 0,
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
