// Külön, kicsi interfész a
// PlanStorage MELLETT, nem alatta -- docs/05-technologia.md architektúra-
// diagramja az IndexedDB-t testvér-dobozként rajzolja a PlanStorage mellett
// ("IndexedDB -- csak piszkozat-autosave, nem system of record"), ez a
// különválasztás szándékos. Mockupban egy localStorage-alapú implementáció
// (DemoDraftStorage), a 2. fázisban IndexedDB-alapú váltja -- ezen a
// felületen kívül semmi nem tudhat arról, melyik fut éppen.

import type { Plan } from '../domain/types';

/** A három workflow-oldal route-ja (TervWorkflowShell.tsx), amin a piszkozat állhat. */
export type WorkflowRoute = '/paciens' | '/terv' | '/elonezet';

/**
 * UI-workflow metaadat a piszkozathoz -- nem a terv TARTALMA (nem `Plan`-mező,
 * nem kerül papírra), csak navigációs segédlet: melyik pácienshez tartozik a
 * draft, és melyik lépésen járt a doki. Mindkettő "best effort": hiányuk nem
 * hibaállapot, csak a fallback-heurisztikák lépnek életbe (D37).
 */
export interface DraftMeta {
  /** A páciens-mappa neve, ha a draft indításakor már ismert volt. */
  patientDir?: string;
  /** Az utolsó workflow-route, amit a doki meglátogatott ezzel a piszkozattal. */
  lastRoute?: WorkflowRoute;
  /**
   * A "Terv adatai" lap cím mezőjébe beírt érték (backlog-51, D61) -- NEM a
   * terv tartalma, a cím a `terv-cimke.json`-ban él (D29), ez csak a beírt
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

export interface DraftStorage {
  /** `null`, ha nincs perzisztált piszkozat -- ez a normál kiinduló állapot, nem hiba. */
  load(): Promise<DraftRecord | null>;
  /** Az időbélyeget az implementáció teszi rá; a mentett rekordot adja vissza. */
  save(plan: Plan, meta?: DraftMeta): Promise<DraftRecord>;
  clear(): Promise<void>;
}
