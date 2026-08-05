import '@testing-library/jest-dom/vitest';

// Node 22+ ships an experimental global `localStorage` gated behind a
// --localstorage-file flag; the jsdom version this project uses defers to
// that global instead of polyfilling its own, so `localStorage` resolves
// to undefined under plain `vitest run` (DemoStorage relies on it, see
// src/storage/DemoStorage.ts). A tiny in-memory shim sidesteps the flag
// entirely -- simpler and more portable than wiring NODE_OPTIONS into CI.
if (typeof globalThis.localStorage === 'undefined') {
  class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length() {
      return this.store.size;
    }

    clear(): void {
      this.store.clear();
    }

    getItem(key: string): string | null {
      return this.store.has(key) ? this.store.get(key)! : null;
    }

    key(index: number): string | null {
      return [...this.store.keys()][index] ?? null;
    }

    removeItem(key: string): void {
      this.store.delete(key);
    }

    setItem(key: string, value: string): void {
      this.store.set(key, String(value));
    }
  }

  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}
