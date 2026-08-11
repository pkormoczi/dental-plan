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
// `nevSnapshot`/ár pillanatkép D7 szerint továbbra is érvényes, csak a
// mai árlistával nem egyeztethető), ez pedig egy SOSEM megnevezett sort.

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
 * `nev.ts` `fallbackSorok` `nincsForditas`/`elterAzArlistatol` mezőit,
 * ugyanez a minta.
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

export interface HianyzoCsomagLeiras {
  fazisIndex: number;
  fazisNev: string;
  sorIndex: number;
  nev: string;
}

/**
 * PUHA diagnosztika (docs/02-domain-modell.md § Tétel-leírás) -- szándékosan
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
