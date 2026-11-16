import { beforeEach, describe, expect, it } from 'vitest';
import { DemoStorage } from './DemoStorage';
import { DemoTemplateDraftCache } from './DemoTemplateDraftCache';

describe('DemoTemplateDraftCache', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('base-enként tárolja a szöveget, és egy bejegyzés törlése a többit megtartja', () => {
    const cache = new DemoTemplateDraftCache();
    cache.set('nyilatkozat-hu', 'félkész HU');
    cache.set('garancia-de', 'félkész DE');
    cache.remove('nyilatkozat-hu');

    expect(new DemoTemplateDraftCache().load()).toEqual({ 'garancia-de': 'félkész DE' });
  });

  it('a mai dp:sablon-piszkozat kulcson olvas, így a korábban elmentett félkész szöveg megmarad', () => {
    localStorage.setItem('dp:sablon-piszkozat', JSON.stringify({ 'fizetesi-feltetelek-hu': 'régi piszkozat' }));

    expect(new DemoTemplateDraftCache().load()).toEqual({ 'fizetesi-feltetelek-hu': 'régi piszkozat' });
  });

  it('sérült tartalomra üres objektumot ad, nem dob', () => {
    localStorage.setItem('dp:sablon-piszkozat', 'nem-json');

    expect(new DemoTemplateDraftCache().load()).toEqual({});
  });

  it('a demó Minden adat törlése a sablon-piszkozatot is elviszi', async () => {
    const storage = new DemoStorage();
    await storage.init();
    const cache = new DemoTemplateDraftCache();
    cache.set('nyilatkozat-hu', 'elmentetlen szöveg');

    storage.clearAll();

    expect(cache.load()).toEqual({});
  });
});
