// Globális alapértelmezett pénznem feloldása -- az `orvosok.ts`
// `alapertelmezettOrvosNeve()` mintája: az opcionális `Settings`-mező
// visszaesésének EGYETLEN helye, hogy a `HUF` fallback ne duplikálódjon a
// hívási helyek között.

import type { Penznem, Settings } from './types';

export function alapertelmezettPenznem(settings: Settings): Penznem {
  return settings.alapertelmezettPenznem ?? 'HUF';
}
