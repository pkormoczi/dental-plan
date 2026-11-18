import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { GEPVALTAS_BEVEZETO, GEPVALTASI_SZABALY } from './adatmappaSzovegek';

describe('gépváltási szabály', () => {
  it('a telepítési útmutató szóról szóra ugyanazt mondja, mint az app Adattárolás füle', () => {
    const utmutato = readFileSync(path.resolve(import.meta.dirname, '../../../docs/TELEPITES.md'), 'utf8');

    expect(utmutato).toContain(GEPVALTAS_BEVEZETO);
    GEPVALTASI_SZABALY.forEach((lepes, i) => expect(utmutato).toContain(`${i + 1}. ${lepes}`));
  });
});
