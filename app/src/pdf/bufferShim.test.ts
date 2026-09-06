// konzol-buffer-is-not-defined: a react-pdf @react-pdf/renderer bundle-be
// épített fetchImage()-e Buffer.isBuffer()-t hív minden <Image> node
// feloldásakor; böngészőben a hiányzó globális Buffer miatt ez
// ReferenceError-t dobna, amit a könyvtár elnyel, de közben console.warn-t
// ír. Ez a teszt a shim modult fedi -- a valódi react-pdf-renderelés
// jsdom-vakfolt (lásd pdf/CLAUDE.md), azt a `/manual-checks pdf` ellenőrzi.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const globalWindow = window as unknown as { Buffer?: { isBuffer: (value: unknown) => boolean } };

describe('bufferShim -- react-pdf Buffer.isBuffer shim', () => {
  beforeEach(() => {
    vi.resetModules();
    delete globalWindow.Buffer;
  });

  it('a modul betöltésekor pótolja a hiányzó window.Buffer.isBuffer-t -- bármely bemenetre false-t ad, nem dob', async () => {
    expect(globalWindow.Buffer).toBeUndefined();
    await import('./bufferShim');
    expect(() => globalWindow.Buffer!.isBuffer(undefined)).not.toThrow();
    expect(globalWindow.Buffer!.isBuffer(undefined)).toBe(false);
    expect(globalWindow.Buffer!.isBuffer(new Uint8Array())).toBe(false);
    expect(globalWindow.Buffer!.isBuffer('barmi')).toBe(false);
  });

  it('nem írja felül a már meglévő window.Buffer-t', async () => {
    const customIsBuffer = () => true;
    globalWindow.Buffer = { isBuffer: customIsBuffer };
    await import('./bufferShim');
    expect(globalWindow.Buffer.isBuffer).toBe(customIsBuffer);
  });
});
