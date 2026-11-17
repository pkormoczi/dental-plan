import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { USER_DATA_MAPPA } from './protocol.js';

describe('USER_DATA_MAPPA', () => {
  it('egyezik a package.json name-jével, amit az NSIS-eltávolító töröl', () => {
    const pkgUt = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgUt, 'utf-8')) as { name: string };
    expect(USER_DATA_MAPPA).toBe(pkg.name);
  });
});
