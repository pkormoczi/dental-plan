import { describe, expect, it } from 'vitest';
import { seedPriceList } from './priceList';

describe('seedPriceList', () => {
  it('loads the 118-item / 13-category seed from data/arlista.seed.json', () => {
    expect(seedPriceList.schemaVersion).toBe(1);
    // +1 kategória (k13 Fogszabályozás, kiválva a korábbi k12 Egyéb
    // kezelésekből) -- a tételszám változatlan.
    expect(seedPriceList.kategoriak).toHaveLength(13);
    expect(seedPriceList.tetelek).toHaveLength(118);
  });
});
