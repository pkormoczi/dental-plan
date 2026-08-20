// Német nyelvi teljesség a nyomtatványon -- KEMÉNY véglegesítés-blokk
// (D74). SZÁNDÉKOSAN külön modul: a `nev.ts` `sorFallback()`-ja azt méri,
// van-e ÁRLISTAI német fordítás, a `nyelviReview.ts` pedig azt, hogy a
// doki SAJÁT, kézzel gépelt szövege milyen nyelvű -- a CLAUDE.md szerint a
// két kérdés szándékosan külön él. Ez a modul a kettőt KOMPONÁLJA egy
// harmadik kérdéshez ("van-e a sornak igazolt német neve, bárhonnan is
// jön"), egyik meglévő modult sem módosítja.

import { nevKoveti } from './nev';
import { nyelviMismatch } from './nyelviReview';
import { buildToothVisualStates } from './toothVisual';
import type { Plan, PriceList, Sor, Tetel } from './types';

/**
 * Igaz, ha a sor neve igazoltan németül van -- vagy azért, mert az
 * árlistai német nevet követi (`nevKoveti`), vagy azért, mert a doki
 * kézzel írt/átírt szövege a D72 review-metaadat szerint igazoltan
 * németre íródott (`nevNyelv`, nem mismatch). A `tetelId`-je a mai
 * árlistában nem található sort (törölt/átnevezett tétel) szándékosan
 * kihagyja -- ugyanaz a leniency, mint a `sorFallback()`-nál
 * (`domain/nev.ts`), ezt a blokk nem szigorítja.
 */
export function nemetNeveIgazolt(sor: Sor, tetel: Tetel | undefined): boolean {
  if (!sor.nevSnapshot.trim()) return true; // a kitoltetlenSorok() kemény blokkja fedi
  if (sor.tetelId.trim() && !tetel) return true;
  if (tetel && tetel.nev.de != null && nevKoveti(sor, tetel, 'de')) return true;
  return sor.nevNyelv != null && !nyelviMismatch(sor.nevNyelv, 'de');
}

export interface IgazolatlanNemetNevek {
  /** Az árlistában nincs német neve a tételnek, ÉS a sor sem igazolt kézi szöveg -- pótolható az Árlista adminban vagy a soron. */
  nincsArlistaiNev: string[];
  /** Van árlistai német név, de a sor kézzel eltér tőle, és nyelvileg nincs igazolva -- pótolható "Nyelv ellenőrizve" akcióval. */
  ellenorizetlenKeziNev: string[];
}

/**
 * A tervben lévő, nyelvileg nem igazolt német nevű sorok, javítási út
 * szerint két listára bontva (D74/D133). Csak `nyelv === 'de'` terven ad
 * eredményt -- magyar terven a német nyelvi teljesség nem releváns.
 */
export function igazolatlanNemetNevek(plan: Plan, priceList: PriceList): IgazolatlanNemetNevek {
  const eredmeny: IgazolatlanNemetNevek = { nincsArlistaiNev: [], ellenorizetlenKeziNev: [] };
  if (plan.nyelv !== 'de') return eredmeny;
  const tetelById = new Map(priceList.tetelek.map((x) => [x.id, x]));
  for (const fazis of plan.fazisok) {
    for (const sor of fazis.sorok) {
      const tetel = tetelById.get(sor.tetelId);
      if (nemetNeveIgazolt(sor, tetel)) continue;
      if (tetel && tetel.nev.de == null) eredmeny.nincsArlistaiNev.push(sor.nevSnapshot);
      else eredmeny.ellenorizetlenKeziNev.push(sor.nevSnapshot);
    }
  }
  return eredmeny;
}

/**
 * A fogtérkép-legendán ténylegesen megjelenő (`buildToothVisualStates`
 * `jelmagyarazat`), de német név nélküli kategóriák magyar neve -- D404.
 * A tervben NEM használt kategória hiányzó német neve szándékosan nem
 * blokkol, csak ami ténylegesen a nyomtatványra kerül. Az
 * `ISMERETLEN_KATEGORIA` (üres `id`) kimarad -- az nem valódi kategória
 * (`design/treatmentVisuals.ts`).
 */
export function igazolatlanNemetKategoriak(plan: Plan, priceList: PriceList): string[] {
  if (plan.nyelv !== 'de') return [];
  const { jelmagyarazat } = buildToothVisualStates(plan, priceList);
  return jelmagyarazat.filter((k) => k.id !== '' && k.nev.de == null).map((k) => k.nev.hu);
}
