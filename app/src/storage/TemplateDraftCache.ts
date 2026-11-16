// A Nyomtatványok fül mentetlen sablonszövegei base-enként (pl.
// "nyilatkozat-hu"), hogy egy újratöltés ne vigye el őket. A `DraftStorage`
// testvére, nem bővítése: az egyetlen `Plan`-rekordra szól ütközés-
// detektálással, ez base-kulcsolt szöveg. Sosem system of record.
//
// Szinkron, mert a fül minden leütésre ír, és a localStorage-implementáció
// Electron alatt is a renderer localStorage-ában marad.
export interface TemplateDraftCache {
  /** Hibánál vagy sérült tartalomnál üres objektum -- a cache best-effort. */
  load(): Record<string, string>;
  set(base: string, text: string): void;
  remove(base: string): void;
  clear(): void;
}
