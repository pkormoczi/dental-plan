import { describe, expect, it } from 'vitest';
import { draftDirty } from './useDirtyDraft';

describe('draftDirty', () => {
  it('is false for two structurally equal objects with the same key order', () => {
    expect(draftDirty({ a: 1, b: 'x' }, { a: 1, b: 'x' })).toBe(false);
  });

  it('is true when a nested field differs', () => {
    expect(draftDirty({ nested: { a: 1 } }, { nested: { a: 2 } })).toBe(true);
  });

  it('treats null and empty string as different (unlike a loose fallback comparison)', () => {
    expect(draftDirty({ v: null }, { v: '' })).toBe(true);
  });

  it('is false for primitive values that are equal', () => {
    expect(draftDirty('szöveg', 'szöveg')).toBe(false);
  });
});
