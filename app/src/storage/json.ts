// P1-6 (kiemelve DemoStorage.ts-ből, docs/08-backlog.md 1. tétel): a
// piszkozat-storage (DemoDraftStorage.ts) ugyanezt a JSON-beolvasási mintát
// igényli, mint a DemoStorage -- CLAUDE.md "használd, ne írd újra" szerint
// egy helyen kell élnie, nem duplikálva.

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
        `"Demó adat visszaállítása" gombot a Kezdőlapon.`,
    );
  }
}
