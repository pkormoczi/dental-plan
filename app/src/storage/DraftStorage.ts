// docs/backlog-1-piszkozat-terv.md 2. döntés: külön, kicsi interfész a
// PlanStorage MELLETT, nem alatta -- docs/05-technologia.md architektúra-
// diagramja az IndexedDB-t testvér-dobozként rajzolja a PlanStorage mellett
// ("IndexedDB -- csak piszkozat-autosave, nem system of record"), ez a
// különválasztás szándékos. Mockupban egy localStorage-alapú implementáció
// (DemoDraftStorage), a 2. fázisban IndexedDB-alapú váltja -- ezen a
// felületen kívül semmi nem tudhat arról, melyik fut éppen.

import type { Plan } from '../domain/types';

export interface DraftRecord {
  schemaVersion: 1;
  /** ISO időbélyeg (Date().toISOString()) -- a Kezdőlap "utolsó módosítás" adata. */
  mentve: string;
  plan: Plan;
}

export interface DraftStorage {
  /** `null`, ha nincs perzisztált piszkozat -- ez a normál kiinduló állapot, nem hiba. */
  load(): Promise<DraftRecord | null>;
  /** Az időbélyeget az implementáció teszi rá; a mentett rekordot adja vissza. */
  save(plan: Plan): Promise<DraftRecord>;
  clear(): Promise<void>;
}
