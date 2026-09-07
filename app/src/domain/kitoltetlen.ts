// Kitöltetlen (meg nem nevezett) sorok kiszűrése -- a fogtérkép-kattintással
// felvett, még be nem azonosított sor a szerkesztőben szándékosan
// megjelenhet (a doki még nem választott hozzá beavatkozást, és még nem
// nevezte el egyedi sorként sem), de véglegesítéskor ezt a PreviewPage
// KEMÉNY blokknak veszi -- névtelen, 0 Ft-os sor nem kerülhet az aláírandó
// PDF-re (lásd pdf/TervDocument.tsx sorrenderelése, ami a `nevSnapshot`-ot
// és az árat feltétel nélkül kiírja). Backlog-3 (szabad sornév + egyedi
// sor) óta a kritérium a NÉV, nem a `tetelId` -- egy szándékosan felvett
// egyedi (árlistán kívüli) sornak is üres a `tetelId`-je, de van neve, és
// az ára is lehet legitim 0 (pl. ingyenes konzultáció egyedi soron).
//
// Szándékosan MÁS, mint `toothVisual.ts` `hianyzoTetel`-je -- az egy MA MÁR
// az árlistából törölt/átnevezett `tetelId`-re mutató sort jelez (a
// `nevSnapshot`/ár pillanatkép továbbra is érvényes, csak a
// mai árlistával nem egyeztethető), ez pedig egy SOSEM megnevezett sort.

import { nincsListaar } from './penznemValtas';
import { sorOsszeg } from './totals';
import type { Plan, PriceList } from './types';

export interface KitoltetlenSor {
  fazisIndex: number;
  fazisNev: string;
  sorIndex: number;
  fogak: string;
}

/** Meg nem nevezett (`nevSnapshot` üres) sorok, terv sorrendben. */
export function kitoltetlenSorok(plan: Plan): KitoltetlenSor[] {
  const eredmeny: KitoltetlenSor[] = [];
  plan.fazisok.forEach((fazis, fazisIndex) => {
    fazis.sorok.forEach((sor, sorIndex) => {
      if (!sor.nevSnapshot.trim()) {
        eredmeny.push({ fazisIndex, fazisNev: fazis.megnevezes, sorIndex, fogak: sor.fogak });
      }
    });
  });
  return eredmeny;
}

/**
 * PUHA figyelmeztetés (backlog-19): névvel ellátott, de 0 összegű sorok, terv
 * sorrendben. A névtelen sorokat a fenti `kitoltetlenSorok` kemény blokkja
 * fedi -- ez itt csak a MEGNEVEZETT, de elgépelés vagy elfelejtett ár miatt
 * 0 Ft-on maradt sorokat kapja el (pl. a gépel->Enter ciklus nulla
 * találatnál egyedi sort vesz fel 0 Ft kezdőértékkel). Nincs sortípus
 * szerinti kivétel -- egy SAVOS eredetű, épp 0 egységárú sor is bekerül,
 * ez puha figyelmeztetésnél elhanyagolható súrlódás. `string[]`-et ad
 * vissza (a `nevSnapshot`-okat), mert ezeknek a soroknak VAN nevük -- lásd
 * `nemetNev.ts` `igazolatlanNemetNevek()` két csoportját, ugyanez a minta.
 */
export function nullaOsszeguSorok(plan: Plan): string[] {
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      if (sor.nevSnapshot.trim() && sorOsszeg(sor) === 0) {
        eredmeny.push(sor.nevSnapshot);
      }
    });
  });
  return eredmeny;
}

/**
 * PUHA figyelmeztetés: névvel ellátott sorok, amiken nincs fogszám, és a
 * hivatkozott tétel nincs `fogszamNemKell`-lel kivéve. Egyedi
 * (`tetelId` nélküli) és ismeretlen tételre hivatkozó sor is bekerül -- épp
 * a szabadon gépelt sorból marad ki a fogszám, a jelzés pedig puha.
 *
 * "Van fogszám" = a `fogak` trim után nem üres, NEM `parseTeeth`-érvényesség:
 * a mező elfogadottan jegyzetmező (PRODUCT.md § Nem cél), egy "felső front"
 * jegyzet nem hiány.
 */
export function fogszamNelkuliSorok(plan: Plan, priceList: PriceList): string[] {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      if (!sor.nevSnapshot.trim() || sor.fogak.trim()) return;
      if (tetelById.get(sor.tetelId)?.fogszamNemKell) return;
      eredmeny.push(sor.nevSnapshot);
    });
  });
  return eredmeny;
}

/**
 * KEMÉNY blokk (62. tétel): névvel ellátott sorok, amiknek a tétele
 * nincs beárazva a terv pénznemében (`nincsListaar()`, domain/penznemValtas.ts),
 * ÉS a doki még nem adott meg kézi ajánlati árat (`tenylegesEgysegar === 0`).
 * Szándékosan KEMÉNY, nem a `nullaOsszeguSorok` puha ágán -- egy ilyen sor
 * ára nem "elgépelés vagy elfelejtett ár" (mint a puha esetnél), hanem
 * strukturálisan nincs honnan jönnie: a tétel az adott pénznemben nem
 * ajánlható (`Tetel.ar[penznem] == null`), a doki kézi beavatkozása nélkül
 * a nyomtatványra 0-ás ár kerülne egy legitim tételre.
 */
export function araztalanSorok(plan: Plan, priceList: PriceList): string[] {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      const tetel = tetelById.get(sor.tetelId);
      if (sor.nevSnapshot.trim() && nincsListaar(sor, tetel, plan.penznem) && sor.tenylegesEgysegar === 0) {
        eredmeny.push(sor.nevSnapshot);
      }
    });
  });
  return eredmeny;
}

export interface UresFazis {
  fazisIndex: number;
  fazisNev: string;
}

/**
 * KEMÉNY blokk: 0 soros fázisok, terv sorrendben -- a nyomtatvány
 * (`pdf/TervDocument.tsx`) a `fazisok` tömböt feltétel nélkül végigrendereli,
 * egy ilyen fázis üres fejlécként kerülne a papírra.
 */
export function uresFazisok(plan: Plan): UresFazis[] {
  const eredmeny: UresFazis[] = [];
  plan.fazisok.forEach((fazis, fazisIndex) => {
    if (fazis.sorok.length === 0) {
      eredmeny.push({ fazisIndex, fazisNev: fazis.megnevezes });
    }
  });
  return eredmeny;
}

export interface HianyzoCsomagLeiras {
  fazisIndex: number;
  fazisNev: string;
  sorIndex: number;
  nev: string;
}

/**
 * PUHA diagnosztika -- szándékosan
 * KÜLÖN a fenti `kitoltetlenSorok` kemény blokkjától: azon sorok, amik egy
 * `csomag: true` tételre hivatkoznak, de a leírásuk üres. A `PreviewPage`
 * `confirmStep`-láncába kerül (megerősíthető, átugorható), NEM ide.
 */
export function hianyzoCsomagLeirasok(plan: Plan, priceList: PriceList): HianyzoCsomagLeiras[] {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const eredmeny: HianyzoCsomagLeiras[] = [];
  plan.fazisok.forEach((fazis, fazisIndex) => {
    fazis.sorok.forEach((sor, sorIndex) => {
      const tetel = tetelById.get(sor.tetelId);
      if (tetel?.csomag && !(sor.leirasSnapshot ?? '').trim()) {
        eredmeny.push({ fazisIndex, fazisNev: fazis.megnevezes, sorIndex, nev: sor.nevSnapshot });
      }
    });
  });
  return eredmeny;
}

/**
 * PUHA figyelmeztetés: névvel ellátott sorok, amiknek a tétele az Árlista
 * adminban időközben `aktiv: false`-ra váltott. A sor `nevSnapshot`-ja és
 * ára a pillanatkép-elv szerint továbbra is érvényes marad, ez csak
 * tájékoztat, hogy a doki esetleg cserélni akarja a tételt. `string[]`-et
 * ad vissza (a `nevSnapshot`-okat), a `nullaOsszeguSorok`/`araztalanSorok`
 * mintáján -- egyedi (`tetelId` nélküli) sort nem érint, arra ez a fogalom
 * nem értelmezhető.
 */
export function inaktivTetelreHivatkozoSorok(plan: Plan, priceList: PriceList): string[] {
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  const eredmeny: string[] = [];
  plan.fazisok.forEach((fazis) => {
    fazis.sorok.forEach((sor) => {
      const tetel = tetelById.get(sor.tetelId);
      if (sor.nevSnapshot.trim() && tetel && !tetel.aktiv) {
        eredmeny.push(sor.nevSnapshot);
      }
    });
  });
  return eredmeny;
}
