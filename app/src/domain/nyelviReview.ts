// Manuális szövegek nyelvi review-ja (D72, 65. tétel). A doki szabadon
// gépelt szövegei (sornév, sorleírás, fázisnév, fázis-megjegyzés) a
// nyomtatványra kerülnek -- ez a modul jelzi, ha egy ilyen szöveg nem a
// dokumentum nyelvén íródott. SZÁNDÉKOSAN KÜLÖN modul a `nev.ts`
// `sorFallback`-jától: az az ÁRLISTAI fordítás hiányát/eltérését jelzi,
// magyar terven mindig `null`-t ad, és az egyedi sornál deklaráltan
// tehetetlen ("nem ellenőrizhető, milyen nyelven íródott") -- ez a modul
// pontosan ezt a kérdést válaszolja meg, mindkét nyelvű terven, minden
// kézzel írt szövegen. A két mechanizmus egymás MELLETT él, nem összevonva.

import type { Fazis, NyelviReview, Nyelv, Plan, Sor } from './types';

/**
 * A review-invalidáció normalizált kulcsa -- csak vezető/záró whitespace
 * nem invalidál egy meglévő review-t, minden más (belső szóköz, írásjel)
 * valódi tartalmi változás.
 */
function reviewKulcs(szoveg: string): string {
  return szoveg.trim();
}

/**
 * Igaz, ha a szöveg review-státusza szerint NEM biztos, hogy a JELENLEGI
 * dokumentumnyelven helyes -- hiányzó metaadat (árlistát követő szöveg,
 * vagy a mező bevezetése előtti terv) SOHA nem mismatch.
 */
export function nyelviMismatch(meta: NyelviReview | null | undefined, nyelv: Nyelv): boolean {
  if (!meta) return false;
  return meta.authoredInLanguage !== nyelv && meta.reviewedForLanguage !== nyelv;
}

/**
 * Egy szöveg-írás hatása a review-metaadatra. Ha a tartalom `reviewKulcs`
 * szerint nem változott (csak trim-eltérés), a meglévő metaadat érintetlen.
 *
 * Ha a mező MÁR mismatch-elt (`nyelviMismatch(elozo, nyelv)` igaz) a
 * szerkesztés PILLANATÁBAN, egy tényleges tartalmi változás is ÉRINTETLENÜL
 * hagyja a metaadatot -- D480: egy másik nyelven történő teljes átírás
 * (akár szó szerinti fordítás) sem old fel automatikusan, nincs "jelentős
 * változás" heurisztika, kizárólag az explicit "Nyelv ellenőrizve" akció
 * (`reviewElfogadva`) teheti ezt.
 *
 * Egyébként (nem volt mismatch -- akár mert nem volt metaadat, akár mert a
 * review épp a jelenlegi nyelvre szólt) egy valódi tartalmi változás friss
 * szerzőségnek számít a JELENLEGI dokumentumnyelven, minden korábbi
 * elfogadás elveszik (D479).
 */
export function reviewIrasUtan(
  elozo: NyelviReview | null | undefined,
  regiSzoveg: string,
  ujSzoveg: string,
  nyelv: Nyelv,
): NyelviReview | null {
  if (reviewKulcs(regiSzoveg) === reviewKulcs(ujSzoveg)) return elozo ?? null;
  if (nyelviMismatch(elozo, nyelv)) return elozo ?? null;
  return { authoredInLanguage: nyelv };
}

/** A "Nyelv ellenőrizve" akció: a szöveget explicit elfogadja a megadott nyelvre. */
export function reviewElfogadva(meta: NyelviReview | null | undefined, nyelv: Nyelv): NyelviReview {
  return { authoredInLanguage: meta?.authoredInLanguage ?? nyelv, reviewedForLanguage: nyelv };
}

/**
 * A `patchLine` (`PlanEditorPage.tsx`) kiegészítése a névre/leírásra a
 * nyelvi review-metaadat frissítésével -- a `sorPatchKovetessel()`
 * (mennyiség-követés) MELLETT hívandó, nem helyette. Ha a hívó patch-e MÁR
 * explicit tartalmazza a `nevNyelv`/`leirasNyelv` kulcsot (reset, "Nyelv
 * ellenőrizve"), az mindig nyer -- ez a függvény csak akkor számol, ha a
 * mező szövege változott, de a metaadatot a hívó nem érintette.
 */
export function sorPatchNyelvvel(sor: Sor, patch: Partial<Sor>, nyelv: Nyelv): Partial<Sor> {
  let eredmeny = patch;
  if ('nevSnapshot' in patch && !('nevNyelv' in patch)) {
    eredmeny = {
      ...eredmeny,
      nevNyelv: reviewIrasUtan(sor.nevNyelv, sor.nevSnapshot, patch.nevSnapshot ?? '', nyelv),
    };
  }
  if ('leirasSnapshot' in patch && !('leirasNyelv' in patch)) {
    eredmeny = {
      ...eredmeny,
      leirasNyelv: reviewIrasUtan(
        sor.leirasNyelv,
        sor.leirasSnapshot ?? '',
        patch.leirasSnapshot ?? '',
        nyelv,
      ),
    };
  }
  return eredmeny;
}

/** A guided review egy célszövegének helye a terven belül. */
export type ReviewMezo = 'fazisNev' | 'fazisMegjegyzes' | 'sorNev' | 'sorLeiras';

export interface ReviewCel {
  mezo: ReviewMezo;
  fazisIndex: number;
  sorIndex?: number;
}

export interface NyelviMismatchTetel {
  cel: ReviewCel;
  /** Rövid, ember-olvasható azonosító a figyelmeztetéshez (pl. fázisnév vagy sornév). */
  cimke: string;
  szoveg: string;
}

/**
 * A tervben lévő, nyelvi mismatch-es kézzel írt szövegek, dokumentum/
 * workflow sorrendben (fázisonként: fázisnév, fázis-megjegyzés, majd
 * soronként: sornév, sorleírás) -- a guided review (5. döntés) ezt a
 * sorrendet járja be. A `kitoltetlenSorok`/`nullaOsszeguSorok`
 * (`domain/kitoltetlen.ts`) plan-scan mintáját követi.
 */
export function nyelviMismatchek(plan: Plan): NyelviMismatchTetel[] {
  const eredmeny: NyelviMismatchTetel[] = [];
  plan.fazisok.forEach((fazis: Fazis, fazisIndex) => {
    if (nyelviMismatch(fazis.megnevezesNyelv, plan.nyelv)) {
      eredmeny.push({
        cel: { mezo: 'fazisNev', fazisIndex },
        cimke: fazis.megnevezes,
        szoveg: fazis.megnevezes,
      });
    }
    if (nyelviMismatch(fazis.megjegyzesNyelv, plan.nyelv)) {
      eredmeny.push({
        cel: { mezo: 'fazisMegjegyzes', fazisIndex },
        cimke: fazis.megnevezes,
        szoveg: fazis.megjegyzes,
      });
    }
    fazis.sorok.forEach((sor, sorIndex) => {
      if (nyelviMismatch(sor.nevNyelv, plan.nyelv)) {
        eredmeny.push({
          cel: { mezo: 'sorNev', fazisIndex, sorIndex },
          cimke: sor.nevSnapshot,
          szoveg: sor.nevSnapshot,
        });
      }
      if (nyelviMismatch(sor.leirasNyelv, plan.nyelv)) {
        eredmeny.push({
          cel: { mezo: 'sorLeiras', fazisIndex, sorIndex },
          cimke: sor.nevSnapshot,
          szoveg: sor.leirasSnapshot ?? '',
        });
      }
    });
  });
  return eredmeny;
}
