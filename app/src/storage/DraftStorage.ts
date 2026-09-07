// Külön, kicsi interfész a
// PlanStorage MELLETT, nem alatta -- a végleges architektúrában az IndexedDB
// a PlanStorage testvér-doboza ("csak piszkozat-autosave, nem system of
// record", lásd app/src/storage/CLAUDE.md), ez a különválasztás szándékos.
// Mockupban egy localStorage-alapú implementáció
// (DemoDraftStorage), a 2. fázisban IndexedDB-alapú váltja -- ezen a
// felületen kívül semmi nem tudhat arról, melyik fut éppen.

import type { Plan } from '../domain/types';

/** A három workflow-oldal route-ja (TervWorkflowShell.tsx), amin a piszkozat állhat. */
export type WorkflowRoute = '/paciens' | '/terv' | '/elonezet';

/**
 * UI-workflow metaadat a piszkozathoz -- nem a terv TARTALMA (nem `Plan`-mező,
 * nem kerül papírra), csak navigációs segédlet: melyik pácienshez tartozik a
 * draft, és melyik lépésen járt a doki. Mindkettő "best effort": hiányuk nem
 * hibaállapot, csak a fallback-heurisztikák lépnek életbe.
 */
export interface DraftMeta {
  /** A páciens-mappa neve, ha a draft indításakor már ismert volt. */
  patientDir?: string;
  /** Az utolsó workflow-route, amit a doki meglátogatott ezzel a piszkozattal. */
  lastRoute?: WorkflowRoute;
  /**
   * A "Terv adatai" lap cím mezőjébe beírt érték (backlog-51) -- NEM a
   * terv tartalma, a cím a `terv-cimke.json`-ban él, ez csak a beírt
   * érték túlélje a `/paciens` -> `/terv` -> `/elonezet` navigációt. Az üres
   * string VALÓDI érték (a doki kiürítette a mezőt); `undefined` azt
   * jelenti, hogy a mezőhöz még nem nyúltak -- a kettő megkülönböztetése
   * tartja el a mezőt attól, hogy egy törlés után visszaugorjon a tárolt
   * címkére.
   */
  tervCim?: string;
}

export interface DraftRecord extends DraftMeta {
  schemaVersion: 1;
  /** ISO időbélyeg (Date().toISOString()) -- a Kezdőlap "utolsó módosítás" adata. */
  mentve: string;
  plan: Plan;
}

/**
 * Egy MÁSIK író (jellemzően a doki másik böngészőfüle) írt a tárolóba azóta,
 * hogy ez a hívó utoljára ide írt -- a mentés ilyenkor nem ír, hanem ezt
 * dobja, a tárolóban ténylegesen álló rekorddal együtt, hogy a hívó fel
 * tudja kínálni a két változatot. Enélkül az utolsó író némán nyerne.
 */
export class DraftConflictError extends Error {
  readonly tarolt: DraftRecord;

  constructor(tarolt: DraftRecord) {
    super('A piszkozatot időközben egy másik ablak felülírta.');
    this.name = 'DraftConflictError';
    this.tarolt = tarolt;
  }
}

export interface DraftStorage {
  /** `null`, ha nincs perzisztált piszkozat -- ez a normál kiinduló állapot, nem hiba. */
  load(): Promise<DraftRecord | null>;
  /**
   * Az időbélyeget az implementáció teszi rá; a mentett rekordot adja vissza.
   *
   * `elvartMentve`: milyen tárolt állapotra számít a hívó -- a legutóbb ÁLTALA
   * írt (vagy onnan olvasott) rekord `mentve` mezője, `null`, ha semmilyen
   * tárolt rekordot nem vár. Eltérésnél a mentés NEM ír, hanem
   * `DraftConflictError`-t dob. `undefined` = a hívó nem kér ütközés-
   * ellenőrzést (utolsó-író-nyer, a korábbi viselkedés).
   *
   * Az azonosító szándékosan a MEGLÉVŐ `mentve` időbélyeg, nem új mező: így
   * nem kell `schemaVersion`-t emelni egy perzisztált rekord-alakért.
   */
  save(plan: Plan, meta?: DraftMeta, elvartMentve?: string | null): Promise<DraftRecord>;
  clear(): Promise<void>;
}
