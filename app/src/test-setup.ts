import '@testing-library/jest-dom/vitest';

// Whether `globalThis.localStorage` is already defined going into this file
// is Node-version-dependent (Node 22+ ships an experimental global gated
// behind a --localstorage-file flag; some builds pre-declare the accessor
// even without the flag, others don't -- observed to differ between the
// Node version used locally and the `lts/*` version CI resolves to). When
// it's already defined, vitest's jsdom environment defers to it instead of
// installing jsdom's own Storage, and jsdom's Storage turns out to be a
// WebIDL "legacy platform object" whose methods `vi.spyOn`/
// `Object.defineProperty` cannot actually override -- the mock is attached
// but never invoked, so DemoStorage.ts's real localStorage.setItem runs
// unmocked. That silently broke the write-failure-injection tests
// (DemoStorage.test.ts, SettingsPage.test.tsx) only on CI, since only CI's
// Node happened to leave `localStorage` undefined pre-setup. A plain,
// always-installed in-memory shim sidesteps environment/platform
// differences entirely, and is a normal object `vi.spyOn` can mock.
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
