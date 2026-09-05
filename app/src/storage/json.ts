// Kiemelve a DemoStorage.ts-ből: a piszkozat-storage (DemoDraftStorage.ts)
// ugyanezt a JSON-beolvasási mintát igényli, mint a DemoStorage -- egy
// helyen kell élnie, nem duplikálva (lásd app/src/storage/CLAUDE.md).

/**
 * `JSON.parse`, ember-olvasható hibaüzenettel, ha a fájl (localStorage-kulcs)
 * sérült. Sosem csupasz `JSON.parse` a betöltési határokon.
 */
export function parseJson<T>(raw: string, fileKind: string): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(
      `A(z) ${fileKind} fájl nem érvényes JSON, valószínűleg sérült. Próbáld a ` +
        `"Demó adat visszaállítása" gombot a DEMO oldal Adatkezelés fülén.`,
    );
  }
}
