import { describe, expect, it } from 'vitest';
import { parseChangelog } from './changelog';

describe('parseChangelog', () => {
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

    expect(parseChangelog(md)).toEqual([
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

    expect(parseChangelog(md)).toEqual([
      {
        cim: '2026. augusztus 9.',
        tetelek: ['Egy hosszú mondat, ami a következő sorban folytatódik.', 'Másik tétel.'],
      },
    ]);
  });

  it('üres bemenetre üres tömböt ad', () => {
    expect(parseChangelog('')).toEqual([]);
  });
});
