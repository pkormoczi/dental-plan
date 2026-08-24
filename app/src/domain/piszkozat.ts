// docs/03-funkcionalis-spec.md § Autosave: az "érintetlen, üres
// piszkozatot (ami megegyezik a friss createBlankPlan() eredményével) nem
// perzisztáljuk -- csak az első tartalmi módosítás után kezd írni". Ez a
// "tartalmas piszkozat" definíciója, amit az AppState (írási trigger) és a
// Home/OsszesTervSection (felülírás elleni AlertDialog) egyaránt használ --
// ne írd újra máshol.

import { ELSO_FAZIS_NEV } from './blankPlan';
import type { Plan } from './types';
import type { WorkflowRoute } from '../storage/DraftStorage';

/**
 * Igaz, ha a terven van olyan tartalom, amit kár lenne elveszíteni.
 *
 * SZÁNDÉKOSAN NEM `createBlankPlan()`-nal mély-egyenlőséget hasonlít: a
 * `keltezes`/`ervenyesIg` a mai dátumból, az `orvos`/`nyelv` a
 * beállításokból, az `arlistaVerzio` az árlistából származik -- egy
 * éjfél vagy egy beállítás-módosítás hamis "módosítva" jelzést adna. Ehelyett
 * a ténylegesen doki által begépelt mezőket nézi.
 *
 * Az `osszesitok` szándékosan kimarad: a UI sehol nem szerkeszti közvetlenül,
 * csak véglegesítéskor számolódik (PreviewPage.tsx `computeOsszesitok`).
 * A `nyelv`/`penznem` váltás is kimarad: két kattintás, nem gépelt munka --
 * önmagában nem teszi kárba veszővé a piszkozatot.
 */
export function piszkozatTartalmas(plan: Plan): boolean {
  // A PatientPage.tsx szerint a tervId -- nem a statusz -- a jó
  // diszkriminátor a "már mentve volt" jelzésre: egy újranyitott VEGLEGES
  // terv is védendő, amíg a doki újra véglegesíti (1. döntés).
  if (plan.tervId !== '') return true;

  const p = plan.paciens;
  if (
    p.nev.trim() ||
    p.szuletesiIdo.trim() ||
    p.lakcim.trim() ||
    p.telefon.trim() ||
    p.email.trim() ||
    p.taj.trim() ||
    p.kiskoru ||
    p.torvenyesKepviselo
  ) {
    return true;
  }

  const vanSor = plan.fazisok.some((f) => f.sorok.length > 0);
  if (vanSor) return true;

  // Az előleg-kapcsoló bekapcsolása tudatos doki-döntés (backlog-9), nem
  // gépi alapérték -- önmagában is védendő tartalom, még üres páciensadat
  // és sorok nélkül is.
  if (plan.elolegOsszeg != null) return true;

  // Ugyanez a terv-szintű kedvezmény kapcsolójára (backlog-16).
  if (plan.kedvezmenyOsszeg != null) return true;

  const csakEgyAlapFazis =
    plan.fazisok.length === 1 &&
    plan.fazisok[0].megnevezes === ELSO_FAZIS_NEV &&
    !plan.fazisok[0].megjegyzes.trim();
  if (!csakEgyAlapFazis) return true;

  return false;
}

/**
 * Hová navigáljon a piszkozat "Megnyitás"/"Folytatás" akciója: a D37
 * `piszkozatLastRoute` metaadata, ha ismert, egyébként a névkitöltés
 * heurisztikája (a Home.tsx eredeti kifejezése, 46. tétel óta kiemelve --
 * a Kezdőlap kártyája ÉS a terv-lánc fa aktív-draft blokkja is ezt hívja,
 * ne másolódjon).
 */
export function piszkozatCelRoute(lastRoute: WorkflowRoute | null, plan: Plan): WorkflowRoute {
  return lastRoute ?? (plan.paciens.nev.trim() ? '/terv' : '/paciens');
}
