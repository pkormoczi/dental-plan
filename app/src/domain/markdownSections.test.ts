import { describe, expect, it } from 'vitest';
import { parseSections } from './markdownSections';

describe('parseSections', () => {
  it('szakaszokra bontja a "## " címeket, és listaelemekre a "- " sorokat', () => {
    const md = [
      '# Változásnapló',
      '',
      'Bevezető szöveg, amit nem kell megjeleníteni.',
      '',
      '## 2026. augusztus 9.',
      '',
      '- Első tétel.',
      '- Második tétel.',
      '',
      '## 2026. augusztus 8.',
      '',
      '- Harmadik tétel.',
    ].join('\n');

    expect(parseSections(md)).toEqual([
      { cim: '2026. augusztus 9.', tetelek: ['Első tétel.', 'Második tétel.'] },
      { cim: '2026. augusztus 8.', tetelek: ['Harmadik tétel.'] },
    ]);
  });

  it('több sorra tördelt listaelemeket egyetlen tétellé fűzi össze', () => {
    const md = [
      '## 2026. augusztus 9.',
      '',
      '- Egy hosszú mondat, ami',
      '  a következő sorban',
      '  folytatódik.',
      '- Másik tétel.',
    ].join('\n');

    expect(parseSections(md)).toEqual([
      {
        cim: '2026. augusztus 9.',
        tetelek: ['Egy hosszú mondat, ami a következő sorban folytatódik.', 'Másik tétel.'],
      },
    ]);
  });

  it('üres bemenetre üres tömböt ad', () => {
    expect(parseSections('')).toEqual([]);
  });

  it('"alcimek" opció nélkül a "### " sort figyelmen kívül hagyja (visszamenőleg kompatibilis)', () => {
    const md = ['## Cím', '', '### Nem alcím, csak szöveg', '- Tétel.'].join('\n');

    expect(parseSections(md)).toEqual([{ cim: 'Cím', tetelek: ['Tétel.'] }]);
  });

  it('"alcimek: true" mellett "### " alcsoportokba rendezi a tételeket', () => {
    const md = [
      '## Páciensek',
      '',
      '### Első csoport',
      '- Első tétel.',
      '- Második tétel.',
      '',
      '### Második csoport',
      '- Harmadik tétel.',
    ].join('\n');

    expect(parseSections(md, { alcimek: true })).toEqual([
      {
        cim: 'Páciensek',
        tetelek: ['Első tétel.', 'Második tétel.', 'Harmadik tétel.'],
        csoportok: [
          { cim: 'Első csoport', tetelek: ['Első tétel.', 'Második tétel.'] },
          { cim: 'Második csoport', tetelek: ['Harmadik tétel.'] },
        ],
      },
    ]);
  });

  it('"alcimek: true" mellett egy alcím előtti pont "cím nélküli" csoportba kerül', () => {
    const md = ['## Páciensek', '', '- Bevezető tétel.', '', '### Csoport', '- Csoportos tétel.'].join('\n');

    expect(parseSections(md, { alcimek: true })).toEqual([
      {
        cim: 'Páciensek',
        tetelek: ['Bevezető tétel.', 'Csoportos tétel.'],
        csoportok: [
          { cim: null, tetelek: ['Bevezető tétel.'] },
          { cim: 'Csoport', tetelek: ['Csoportos tétel.'] },
        ],
      },
    ]);
  });

  it('"alcimek: true" mellett, "### " nélküli szakasznál nincs "csoportok" mező', () => {
    const md = ['## Kezelések és árak', '', '- Egy tétel.'].join('\n');

    expect(parseSections(md, { alcimek: true })).toEqual([
      { cim: 'Kezelések és árak', tetelek: ['Egy tétel.'] },
    ]);
  });
});
