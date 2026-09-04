// Mockup-implementáció a DraftStorage-hoz -- lásd DraftStorage.ts fejléce és
// docs/05-technologia.md § Piszkozat-autosave. localStorage, a `dp:piszkozat` kulcson,
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
import type { DraftMeta, DraftRecord, DraftStorage, WorkflowRoute } from './DraftStorage';
import { PREFIX } from './DemoStorage';
import { parseJson } from './json';

const DRAFT_KEY = `${PREFIX}piszkozat`;
const ISMERT_ROUTEOK: ReadonlySet<string> = new Set<WorkflowRoute>([
  '/paciens',
  '/terv',
  '/elonezet',
]);

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
    // A patientDir/lastRoute PUHA (nem `plan`-tartalom, csak navigációs tipp,
    // D37) -- egy szemetes/idegen érték némán elmarad, nem dobja el az egész
    // piszkozatot. Régi (a mező bevezetése előtti) rekordnál mindkettő
    // hiányzik, ami ugyanezt az ágat futtatja.
    if (typeof rec.patientDir !== 'string') delete rec.patientDir;
    if (typeof rec.lastRoute !== 'string' || !ISMERT_ROUTEOK.has(rec.lastRoute)) {
      delete rec.lastRoute;
    }
    if (typeof rec.tervCim !== 'string') delete rec.tervCim;
    return rec;
  }

  async save(plan: Plan, meta?: DraftMeta): Promise<DraftRecord> {
    const rec: DraftRecord = {
      schemaVersion: 1,
      mentve: new Date().toISOString(),
      plan,
      ...(meta?.patientDir != null ? { patientDir: meta.patientDir } : {}),
      ...(meta?.lastRoute != null ? { lastRoute: meta.lastRoute } : {}),
      // `!= null`, nem truthy -- az üres string valódi érték (lásd DraftStorage.ts).
      ...(meta?.tervCim != null ? { tervCim: meta.tervCim } : {}),
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rec));
    } catch {
      // Ez minden tartalmi módosításra lefut (3. döntés, debounce nélkül) --
      // egy nyers QuotaExceededError minden leütésnél elfogadhatatlan
      // lenne. A doki a szerkesztőben marad, csak a mentés hiúsul meg (lásd
      // PlanEditorPage.tsx hiba-Callout-ja).
      throw new Error(
        'A piszkozatot nem sikerült automatikusan elmenteni — valószínűleg megtelt a ' +
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
