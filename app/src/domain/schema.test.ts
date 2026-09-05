import { describe, expect, it } from 'vitest';
import { assertKnownSchemaVersion, CURRENT_SCHEMA_VERSION, SchemaVersionError } from './schema';

describe('assertKnownSchemaVersion', () => {
  it('accepts the current version', () => {
    expect(() =>
      assertKnownSchemaVersion({ schemaVersion: CURRENT_SCHEMA_VERSION }, 'terv'),
    ).not.toThrow();
  });

  it('rejects a newer-than-known version with a readable message', () => {
    expect(() => assertKnownSchemaVersion({ schemaVersion: 2 }, 'terv')).toThrow(
      SchemaVersionError,
    );
    try {
      assertKnownSchemaVersion({ schemaVersion: 2 }, 'terv');
    } catch (e) {
      expect((e as Error).message).toMatch(/újabb verziójával/);
    }
  });

  it('does not throw for missing/undefined schemaVersion', () => {
    expect(() => assertKnownSchemaVersion({}, 'terv')).not.toThrow();
    expect(() => assertKnownSchemaVersion(null, 'terv')).not.toThrow();
  });
});
