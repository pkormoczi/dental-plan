// Sémaverziózás -- lásd docs/05-technologia.md "Sémaverziózás" és D18.
//
// Minden JSON fájl schemaVersion mezővel indul, mert évekig élnek a Drive-on
// (a mockupban: localStorage-ban). Betöltéskor:
//   - ismert vagy alacsonyabb verzió -> betölt (alacsonyabbnál migrálna, de
//     ez a mockup csak az 1-es verziót ismeri, migráció még nincs)
//   - magasabb verzió -> a betöltést MEG KELL TAGADNI, érthető üzenettel

export const CURRENT_SCHEMA_VERSION = 1;

export class SchemaVersionError extends Error {
  readonly fileKind: string;
  readonly foundVersion: number;

  constructor(fileKind: string, foundVersion: number) {
    super(
      `Ez a(z) ${fileKind} fájl az alkalmazás egy újabb verziójával készült ` +
        `(schemaVersion: ${foundVersion}, ez az alkalmazás legfeljebb ` +
        `${CURRENT_SCHEMA_VERSION}-et ismer). Frissítsd az alkalmazást a betöltéshez.`,
    );
    this.name = 'SchemaVersionError';
    this.fileKind = fileKind;
    this.foundVersion = foundVersion;
  }
}

/** Dobja a SchemaVersionError-t, ha a fájl séma-verziója újabb, mint amit ismerünk. */
export function assertKnownSchemaVersion(
  data: { schemaVersion?: number } | null | undefined,
  fileKind: string,
): void {
  const version = data?.schemaVersion;
  if (typeof version === 'number' && version > CURRENT_SCHEMA_VERSION) {
    throw new SchemaVersionError(fileKind, version);
  }
}
