import { describe, expect, it } from 'vitest';
import { buildToothChartSvg } from './toothChartSvg';
import type { KategoriaVizual } from './treatmentVisuals';
import type { FogterkepAllapot, FogVizualisAllapot } from '../domain/toothVisual';

const KORONA_VIZUAL: KategoriaVizual = {
  id: 'k10',
  nev: { hu: 'Korona és híd', de: 'Krone und Brücke' },
  szin: '#4dabf7',
  sorrend: 4,
};

function makeAllapot(fogak: Record<string, KategoriaVizual>): FogterkepAllapot {
  const map = new Map<string, FogVizualisAllapot>();
  for (const [fdi, vizual] of Object.entries(fogak)) {
    map.set(fdi, { fdi, vizual, kezelesek: [] });
  }
  return { fogak: map, tejfogak: [], ismeretlen: [], hianyzoTetel: false, jelmagyarazat: [] };
}

describe('buildToothChartSvg', () => {
  it('mind a 32 data-tooth csoportot tartalmazza', () => {
    const svg = buildToothChartSvg(makeAllapot({}));
    const matches = svg.match(/data-tooth="\d\d"/g) ?? [];
    expect(matches).toHaveLength(32);
  });

  it('responsive sizing esetén nincs width/height attribútum a gyökér svg-n, a viewBox megmarad', () => {
    const svg = buildToothChartSvg(makeAllapot({}), { sizing: 'responsive' });
    const rootTag = svg.match(/<svg[^>]*>/)![0];
    expect(rootTag).not.toMatch(/\swidth="/);
    expect(rootTag).not.toMatch(/\sheight="/);
    expect(svg).toContain('viewBox="-100 0 1576 768"');
  });

  it('fixed sizing esetén a scale-lel szorzott explicit width/height szerepel', () => {
    const svg = buildToothChartSvg(makeAllapot({}), { sizing: 'fixed', scale: 2 });
    const rootTag = svg.match(/<svg[^>]*>/)![0];
    expect(rootTag).toContain('width="3152"');
    expect(rootTag).toContain('height="1536"');
  });

  it('pontosan a várt fogra injektál színszabályt', () => {
    const svg = buildToothChartSvg(makeAllapot({ '11': KORONA_VIZUAL }));
    expect(svg).toContain(`#tooth-11{color:${KORONA_VIZUAL.szin}}`);
    expect(svg).not.toContain('#tooth-12{color:');
  });

  it('showToothNumbers: false (alap) esetén nincs <text> elem', () => {
    const svg = buildToothChartSvg(makeAllapot({}));
    expect(svg).not.toContain('<text');
  });

  it('showToothNumbers: true esetén mind a 32 fogra kerül egy <text> elem', () => {
    const svg = buildToothChartSvg(makeAllapot({}), { showToothNumbers: true });
    const texts = svg.match(/<text /g) ?? [];
    expect(texts).toHaveLength(32);
  });

  describe('interactive (PDF-regressziós védőháló + kattintható mód)', () => {
    it('interactive nélkül (alap, a PDF-útvonal ezt kapja) NINCS role/aria-label a fog-csoportokon, a gyökér marad aria-hidden a magyar címmel', () => {
      const svg = buildToothChartSvg(makeAllapot({ '11': KORONA_VIZUAL }));
      expect(svg).not.toContain('role="button"');
      expect(svg).not.toContain('role="option"');
      expect(svg).not.toContain('aria-label="11');
      expect(svg).not.toContain('aria-selected');
      expect(svg).not.toContain('is-active');
      expect(svg).not.toContain('is-picked');
      const rootTag = svg.match(/<svg[^>]*>/)![0];
      expect(rootTag).toContain('aria-hidden="true"');
      expect(svg).toContain('<title id="title">Fogászati kezelési terv');
    });

    it('interactive: true, szerep "button" -- mind a 32 fog role="button"-t kap, a gyökér nem aria-hidden, cím üres', () => {
      const svg = buildToothChartSvg(makeAllapot({}), { interactive: true });
      const buttons = svg.match(/role="button"/g) ?? [];
      expect(buttons).toHaveLength(32);
      const rootTag = svg.match(/<svg[^>]*>/)![0];
      expect(rootTag).not.toContain('aria-hidden');
      expect(svg).toContain('<title id="title"></title>');
    });

    it('kezelt fog beszédes aria-label-t kap a kategórianévvel, kezeletlen fog "nincs kezelés"-t', () => {
      const svg = buildToothChartSvg(makeAllapot({ '11': KORONA_VIZUAL }), { interactive: true });
      expect(svg).toContain('aria-label="11. fog – Korona és híd"');
      expect(svg).toContain('aria-label="12. fog – nincs kezelés"');
    });

    it('a kategórianévben lévő idézőjelet/kacsacsőrt escape-eli, hogy ne törje el az attribútumot', () => {
      const vegyes: KategoriaVizual = {
        id: 'k99',
        nev: { hu: 'Fura "kategória" <script>', de: null },
        szin: '#adb5bd',
        sorrend: 9,
      };
      const svg = buildToothChartSvg(makeAllapot({ '11': vegyes }), { interactive: true });
      expect(svg).toContain('aria-label="11. fog – Fura &quot;kategória&quot; &lt;script&gt;"');
      expect(svg).not.toContain('aria-label="11. fog – Fura "kategória" <script>"');
    });

    it('focusedTooth az adott fogra (és csakis arra) is-active classt tesz', () => {
      const svg = buildToothChartSvg(makeAllapot({}), { interactive: true, focusedTooth: '24' });
      expect(svg).toContain('<g id="tooth-24" data-tooth="24" class="tooth is-active"');
      expect(svg).not.toContain('<g id="tooth-25" data-tooth="25" class="tooth is-active"');
    });

    it('szerep "option": selectedTeeth aria-selected="true"-t és is-picked classt ad, a többi aria-selected="false"', () => {
      const svg = buildToothChartSvg(makeAllapot({}), {
        interactive: true,
        szerep: 'option',
        selectedTeeth: ['16'],
      });
      expect(svg).toContain('<g id="tooth-16" data-tooth="16" class="tooth is-picked" role="option" aria-label="16. fog – nincs kezelés" aria-selected="true"');
      expect(svg).toContain('aria-selected="false"');
      const trueCount = (svg.match(/aria-selected="true"/g) ?? []).length;
      expect(trueCount).toBe(1);
    });

    it('szerep "button" (alap) esetén nincs aria-selected attribútum', () => {
      const svg = buildToothChartSvg(makeAllapot({}), { interactive: true, selectedTeeth: ['16'] });
      expect(svg).not.toContain('aria-selected');
    });

    it('szerep "button" + selectedTeeth: a kijelölt fog aria-pressed="true", a többi "false", aria-selected NÉLKÜL (Terv részletei -- több fogas kijelölés-navigáció)', () => {
      const svg = buildToothChartSvg(makeAllapot({}), {
        interactive: true,
        selectedTeeth: ['16'],
      });
      expect(svg).toContain(
        '<g id="tooth-16" data-tooth="16" class="tooth is-picked" role="button" aria-label="16. fog – nincs kezelés" aria-pressed="true"',
      );
      expect(svg).not.toContain('aria-selected');
      const trueCount = (svg.match(/aria-pressed="true"/g) ?? []).length;
      expect(trueCount).toBe(1);
      const falseCount = (svg.match(/aria-pressed="false"/g) ?? []).length;
      expect(falseCount).toBe(31);
    });

    it('szerep "button" selectedTeeth NÉLKÜL (a szerkesztő plan-szintű térképe) NINCS aria-pressed -- a markup bájtra változatlan', () => {
      const svg = buildToothChartSvg(makeAllapot({}), { interactive: true });
      expect(svg).not.toContain('aria-pressed');
    });
  });
});
