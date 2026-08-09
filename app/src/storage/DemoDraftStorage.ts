// Mockup-implementáció a DraftStorage-hoz -- lásd DraftStorage.ts fejléce és
// docs/backlog-1-piszkozat-terv.md. localStorage, a `dp:piszkozat` kulcson,
// a DemoStorage.ts PREFIX konstansát újrahasznosítva, hogy a "Minden adat
// törlése"/"Demó adat visszaállítása" gomb prefix-seprése (DemoStorage.ts
// `clearAll()`) a piszkozatot is elsöpörje, külön kód nélkül.
//
// FONTOS: az olvasási út szó szerint a DemoStorage.loadPlan() háromlépcsős
// mintáját követi (parseJson -> assertKnownSchemaVersion -> assertPlanShape)
// -- D18 a piszkozatra is vonatkozik, egy magasabb sémaverziójú vagy sérült
// perzisztált piszkozatot a betöltést meg kell tagadni, érthető üzenettel,
// nem néma eldobással (7. döntés).

import { assertKnownSchemaVersion } from '../domain/schema';
import { assertPlanShape } from '../domain/validate';
import type { Plan } from '../domain/types';
import type { DraftRecord, DraftStorage } from './DraftStorage';
import { PREFIX } from './DemoStorage';
import { parseJson } from './json';

const DRAFT_KEY = `${PREFIX}piszkozat`;

export class DemoDraftStorage implements DraftStorage {
  async load(): Promise<DraftRecord | null> {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw == null) return null;
    const rec = parseJson<DraftRecord>(raw, 'piszkozat');
    // A rekord burkon ÉS a benne lévő Plan-en is ellenőrizzük a
    // sémaverziót -- a kettő elvileg együtt nő, de külön mezőn él.
    assertKnownSchemaVersion(rec, 'piszkozat');
    assertKnownSchemaVersion(rec.plan, 'piszkozat');
    assertPlanShape(rec.plan, 'piszkozat');
    return rec;
  }

  async save(plan: Plan): Promise<DraftRecord> {
    const rec: DraftRecord = { schemaVersion: 1, mentve: new Date().toISOString(), plan };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rec));
    } catch {
      // Ez minden tartalmi módosításra lefut (3. döntés, debounce nélkül) --
      // egy nyers QuotaExceededError minden leütésnél elfogadhatatlan
      // lenne. A doki a szerkesztőben marad, csak a mentés hiúsul meg (lásd
      // PlanEditorPage.tsx hiba-Callout-ja).
      throw new Error(
        'A piszkozatot nem sikerült automatikusan elmenteni -- valószínűleg megtelt a ' +
          'böngésző tárhelye. A terv a szerkesztőben megmarad, de frissítés vagy ' +
          'összeomlás esetén elveszhet, amíg ez fennáll.',
      );
    }
    return rec;
  }

  async clear(): Promise<void> {
    localStorage.removeItem(DRAFT_KEY);
  }
}
