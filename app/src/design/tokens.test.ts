import { describe, expect, it } from 'vitest';
import { t } from './tokens';

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function relativeLuminance({ r, g, b }: { r: number; g: number; b: number }) {
  const [rr, gg, bb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastRatio(hexA: string, hexB: string) {
  const [la, lb] = [relativeLuminance(hexToRgb(hexA)), relativeLuminance(hexToRgb(hexB))].sort((a, b) => b - a);
  return (la + 0.05) / (lb + 0.05);
}

describe('t.uiTextFaint kontraszt', () => {
  it('legalább 4,5:1 a t.page hátterén', () => {
    expect(contrastRatio(t.uiTextFaint, t.page)).toBeGreaterThanOrEqual(4.5);
  });
});
