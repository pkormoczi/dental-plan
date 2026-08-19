import { describe, expect, it } from 'vitest';
import { emailHiba, szuletesiIdoHiba } from './paciensValidacio';

describe('emailHiba', () => {
  it('üres mezőnél nincs hiba -- opcionális', () => {
    expect(emailHiba('')).toBeNull();
    expect(emailHiba('   ')).toBeNull();
  });

  it('érvényes formátumnál nincs hiba', () => {
    expect(emailHiba('kovacs.janos@example.hu')).toBeNull();
  });

  it('kukac vagy pont nélküli szövegnél hibát ad', () => {
    expect(emailHiba('kovacs.janos@')).not.toBeNull();
    expect(emailHiba('kovacsjanos')).not.toBeNull();
    expect(emailHiba('kovacs janos@example.hu')).not.toBeNull();
  });
});

describe('szuletesiIdoHiba', () => {
  const ma = '2026-08-19';

  it('üres mezőnél nincs hiba -- opcionális', () => {
    expect(szuletesiIdoHiba('', ma)).toBeNull();
  });

  it('mai vagy korábbi dátumnál nincs hiba', () => {
    expect(szuletesiIdoHiba(ma, ma)).toBeNull();
    expect(szuletesiIdoHiba('1978-03-14', ma)).toBeNull();
  });

  it('jövőbeli dátumnál hibát ad', () => {
    expect(szuletesiIdoHiba('2026-08-20', ma)).not.toBeNull();
  });

  it('hiányos (nem teljes) dátumnál hibát ad', () => {
    expect(szuletesiIdoHiba('1990-11', ma)).not.toBeNull();
  });
});
