import { describe, expect, it } from 'vitest';
import { mentesEsedekes, mentesFajlnev, mentesKoraNap } from './biztonsagiMentes';

const most = new Date(2026, 10, 18, 9, 30);

describe('biztonsági mentés esedékessége', () => {
  it('mentés nélkül esedékes', () => {
    expect(mentesEsedekes(null, most)).toBe(true);
    expect(mentesKoraNap(null, most)).toBeNull();
  });

  it('30 napon belül nem esedékes, a 31. naptól igen', () => {
    expect(mentesEsedekes(new Date(2026, 9, 19, 23, 59).toISOString(), most)).toBe(false);
    expect(mentesKoraNap(new Date(2026, 9, 19, 23, 59).toISOString(), most)).toBe(30);
    expect(mentesEsedekes(new Date(2026, 9, 18, 8, 0).toISOString(), most)).toBe(true);
    expect(mentesKoraNap(new Date(2026, 9, 18, 8, 0).toISOString(), most)).toBe(31);
  });

  it('olvashatatlan időpont: mintha nem volna mentés', () => {
    expect(mentesKoraNap('nem dátum', most)).toBeNull();
    expect(mentesEsedekes('nem dátum', most)).toBe(true);
  });

  it('a fájlnév a helyi naptári napot viseli', () => {
    expect(mentesFajlnev(new Date(2026, 10, 18, 23, 50))).toBe('mandoki-dental-mentes-2026-11-18.zip');
  });
});
