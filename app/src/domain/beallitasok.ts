// Globális alapértelmezett pénznem feloldása -- az `orvosok.ts`
// `alapertelmezettOrvosNeve()` mintája: az opcionális `Settings`-mező
// visszaesésének EGYETLEN helye, hogy a `HUF` fallback ne duplikálódjon a
// hívási helyek között.

import type { Penznem, Rendelo, Settings } from './types';

export function alapertelmezettPenznem(settings: Settings): Penznem {
  return settings.alapertelmezettPenznem ?? 'HUF';
}

type LemezenRendelo = Omit<Rendelo, 'iranyitoszamVaros' | 'utcaHazszam'> &
  Partial<Pick<Rendelo, 'iranyitoszamVaros' | 'utcaHazszam'>> & { cim?: unknown };

/**
 * A két cím-mező előtti fájlban (localStorage, demóból exportált fájl) a cím
 * egy `cim` szöveg, „1117 Budapest, Móricz Zsigmond körtér 15.” alakban: az
 * első vessző választja el a két mezőt, vessző nélkül minden az elsőbe kerül.
 * A `cim` kulcs elhagyódik, így a következő mentés már nem írja vissza.
 */
export function rendeloKetCimmezovel(settings: Settings): Settings {
  const { cim, ...rendelo } = settings.rendelo as LemezenRendelo;
  const regi = typeof cim === 'string' ? cim : '';
  const vesszo = regi.indexOf(',');
  const regiElso = (vesszo < 0 ? regi : regi.slice(0, vesszo)).trim();
  const regiMasodik = vesszo < 0 ? '' : regi.slice(vesszo + 1).trim();
  return {
    ...settings,
    rendelo: {
      ...rendelo,
      iranyitoszamVaros: rendelo.iranyitoszamVaros ?? regiElso,
      utcaHazszam: rendelo.utcaHazszam ?? regiMasodik,
    },
  };
}

/** Üres mező nem hagyhat árva vesszőt a nyomtatványon. */
export function rendeloEgysorosCim(rendelo: Rendelo): string {
  return [rendelo.iranyitoszamVaros, rendelo.utcaHazszam].filter(Boolean).join(', ');
}
