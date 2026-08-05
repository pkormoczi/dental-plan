import { describe, expect, it } from 'vitest';
import { seedPriceList } from './priceList';

describe('seedPriceList', () => {
  it('loads the 118-item / 12-category seed from data/arlista.seed.json', () => {
    expect(seedPriceList.schemaVersion).toBe(1);
    expect(seedPriceList.kategoriak).toHaveLength(12);
    expect(seedPriceList.tetelek).toHaveLength(118);
  });
});
