import { describe, expect, it } from 'vitest';
import { buildToothChartSvg } from './toothChartSvg';
import { KEZELES_VIZUALOK } from './treatmentVisuals';
import type { FogterkepAllapot, FogVizualisAllapot } from '../domain/toothVisual';

function makeAllapot(fogak: Record<string, keyof typeof KEZELES_VIZUALOK>): FogterkepAllapot {
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
    const svg = buildToothChartSvg(makeAllapot({ '11': 'KORONA' }));
    expect(svg).toContain(`#tooth-11{color:${KEZELES_VIZUALOK.KORONA.szin}}`);
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
});
