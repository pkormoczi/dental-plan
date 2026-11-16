// A kulcs változatlan maradt a fülből való kiemeléskor: a doki böngészőjében
// lévő félkész sablonszöveg így túléli a deployt.

import { parseJson } from './json';
import { PREFIX } from './localKeys';
import type { TemplateDraftCache } from './TemplateDraftCache';

const TEMPLATE_DRAFT_CACHE_KEY = `${PREFIX}sablon-piszkozat`;

export class DemoTemplateDraftCache implements TemplateDraftCache {
  load(): Record<string, string> {
    try {
      const raw = localStorage.getItem(TEMPLATE_DRAFT_CACHE_KEY);
      return raw ? parseJson<Record<string, string>>(raw, 'sablon-piszkozat') : {};
    } catch {
      return {};
    }
  }

  set(base: string, text: string): void {
    const cache = this.load();
    cache[base] = text;
    this.write(cache);
  }

  remove(base: string): void {
    const cache = this.load();
    if (!(base in cache)) return;
    delete cache[base];
    this.write(cache);
  }

  clear(): void {
    try {
      localStorage.removeItem(TEMPLATE_DRAFT_CACHE_KEY);
    } catch {
      // Lásd `write` -- alacsony tét, néma no-op.
    }
  }

  private write(cache: Record<string, string>): void {
    try {
      localStorage.setItem(TEMPLATE_DRAFT_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Alacsony tét (csak szövegbevitel, nincs páciensadat): egy kvótahiba
      // itt nem kap külön UI-hibát, a szerkesztés a fül state-jében megmarad.
    }
  }
}
