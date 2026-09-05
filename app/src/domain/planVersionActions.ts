// Egy verzió-linkelt akció (Új verzió / Másolás új tervbe / Új terv / Új
// páciens) tiszta döntési logikája -- a `components/PlanVersionActionDialog.tsx`
// (React/storage-kontextus) és ennek MIND A NÉGY hívója (a
// `PatientPlanChains.tsx` verziósora, a `TervReszleteiPage.tsx`, a
// `NewPlanPage.tsx` köztes választója és a `PatientDetailPage.tsx` üres
// állapota) egyaránt ezt hívja, hogy a megerősítő dialógus szövege és a
// piszkozat-felülírás-őr feltétele ne driftelhessen szét a hívóhelyek
// között.

export interface VersionRef {
  planDir: string;
  versionDir: string;
}

export type PendingKind = 'open' | 'copy' | 'ujTerv' | 'ujPaciens';

/**
 * `historical` kizárólag `kind: 'copy'`-nál értelmes: igaz, ha a másolt
 * verzió NEM a lánc legfrissebbje. Ez önmagában is megerősítést kér (lásd
 * `kellMegerosites`), és ez dönti el a dialógus tartalmát (lásd
 * `megerositesTartalom`).
 *
 * `patientDir` opcionális: a hívó (`components/PlanVersionActionDialog.tsx`)
 * hook-szintű alapértékkel is rendelkezhet, ilyenkor csak azok az akciók
 * adják meg itt, amiknek a célpáciense a hívó saját kötésétől eltér (pl.
 * `pages/NewPlanPage.tsx` soronként más pácienst indít). `nev` kizárólag
 * `kind: 'ujPaciens'`-nél értelmes: a quick-create dialógust ezzel a
 * begépelt névvel előtöltve nyitja meg a hívó `onUjPaciens` callbackje.
 */
export type PendingAction = Partial<VersionRef> & {
  kind: PendingKind;
  historical?: boolean;
  patientDir?: string;
  nev?: string;
};

export interface MegerositesTartalom {
  title: string;
  description: string;
  actionLabel: string;
}

/**
 * Igaz, ha az akció megerősítést igényel: mentetlen piszkozat VAN, VAGY egy
 * korábbi (nem legfrissebb) verziót másolunk -- a piszkozat-felülírás és a
 * "régi verziót másolsz" két FÜGGETLEN ok a dialógusra, lásd
 * `megerositesTartalom`.
 */
export function kellMegerosites(action: PendingAction, vanMentetlenPiszkozat: boolean): boolean {
  const historicalCopy = action.kind === 'copy' && action.historical === true;
  return vanMentetlenPiszkozat || historicalCopy;
}

const PENDING_SPECS: Record<PendingKind, { description: string; actionLabel: string }> = {
  open: {
    description:
      'Van mentetlen piszkozatod. Ha ebből a verzióból újat készítesz, a jelenlegi ' +
      'piszkozat elvész — nem került fájlba, csak ebben a böngészőben volt meg. Biztosan ' +
      'folytatod?',
    actionLabel: 'Új verzió, piszkozat elvetésével',
  },
  copy: {
    description:
      'Van mentetlen piszkozatod. Ha ennek a verziónak a tartalmával új tervet indítasz, a ' +
      'jelenlegi piszkozat elvész — nem került fájlba, csak ebben a böngészőben volt meg. ' +
      'Biztosan folytatod?',
    actionLabel: 'Másolás, piszkozat elvetésével',
  },
  ujTerv: {
    description:
      'Van mentetlen piszkozatod. Ha a páciens adataival új tervet indítasz, a jelenlegi ' +
      'piszkozat elvész — nem került fájlba, csak ebben a böngészőben volt meg. Biztosan ' +
      'folytatod?',
    actionLabel: 'Új terv, piszkozat elvetésével',
  },
  ujPaciens: {
    description:
      'Van mentetlen piszkozatod. Ha új tervet indítasz, ez elvész — nem került fájlba, ' +
      'csak ebben a böngészőben volt meg. Biztosan új tervvel kezded?',
    actionLabel: 'Új páciens, piszkozat elvetésével',
  },
};

// A lánchoz azóta újabb verzió készült -- a pontos (exact) másolás
// továbbra is engedett, csak tudatosítva.
const HISTORICAL_MASOLAS_FIGYELMEZTETES =
  'Ez egy korábbi, nem a legfrissebb verzió — a lánchoz azóta újabb verzió készült. A pontos ' +
  'másolás (ezzel a régebbi tartalommal) folytatható, ha ez volt a szándékod.';

/**
 * A dialógus címe/szövege/gombfelirata a megerősítés okától függ: a
 * piszkozat-felülírás és a historical-másolás egymástól FÜGGETLEN okok,
 * együtt és külön-külön is előfordulhatnak. A cím a súlyosabb
 * (visszafordíthatatlanabb) következményt nevezi meg -- piszkozat-vesztés
 * esetén ez marad "Piszkozat felülírása" akkor is, ha historical másolás
 * is történik; tisztán historical másolásnál (nincs piszkozat) NEM
 * piszkozatról van szó, a cím ezt tükrözi.
 */
export function megerositesTartalom(
  action: PendingAction,
  vanMentetlenPiszkozat: boolean,
): MegerositesTartalom {
  const historical = action.kind === 'copy' && action.historical === true;
  const spec = PENDING_SPECS[action.kind];
  if (!vanMentetlenPiszkozat && historical) {
    return {
      title: 'Korábbi verzió másolása',
      description: HISTORICAL_MASOLAS_FIGYELMEZTETES,
      actionLabel: 'Másolás a korábbi verzióval',
    };
  }
  return {
    title: 'Piszkozat felülírása',
    description: historical ? `${HISTORICAL_MASOLAS_FIGYELMEZTETES} ${spec.description}` : spec.description,
    actionLabel: spec.actionLabel,
  };
}

/**
 * A Terv részletei útvonal egyetlen építőhelye -- a verziósor "Megnézés"
 * gombja/menüpontja és a Terv részletei lap prev/next/"Ugrás a
 * legfrissebbre" navigációja mind ezt hívja.
 */
export function tervReszleteiUtvonal(patientDir: string, ref: VersionRef): string {
  return `/paciensek/${encodeURIComponent(patientDir)}/tervek/${encodeURIComponent(ref.planDir)}/${encodeURIComponent(ref.versionDir)}`;
}
