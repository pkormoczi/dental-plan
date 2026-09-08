import { describe, expect, it } from 'vitest';
import { t } from './tokens';

type Rgb = { r: number; g: number; b: number };
type Rgba = Rgb & { a: number };

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// 8-digit #rrggbbaa, mint a `@radix-ui/colors` *-alpha.css fájljaiban.
function hexToRgba(hex: string): Rgba {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >>> 24) & 255, g: (n >>> 16) & 255, b: (n >>> 8) & 255, a: (n & 255) / 255 };
}

function compositeOver(fg: Rgba, bg: Rgb): Rgb {
  return {
    r: fg.a * fg.r + (1 - fg.a) * bg.r,
    g: fg.a * fg.g + (1 - fg.a) * bg.g,
    b: fg.a * fg.b + (1 - fg.a) * bg.b,
  };
}

function relativeLuminance({ r, g, b }: Rgb) {
  const [rr, gg, bb] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}

function contrastOfRgb(a: Rgb, b: Rgb) {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (la + 0.05) / (lb + 0.05);
}

function contrastRatio(hexA: string, hexB: string) {
  return contrastOfRgb(hexToRgb(hexA), hexToRgb(hexB));
}

describe('t.uiTextFaint kontraszt', () => {
  it('legalább 4,5:1 a t.page hátterén', () => {
    expect(contrastRatio(t.uiTextFaint, t.page)).toBeGreaterThanOrEqual(4.5);
  });
});

// A fókuszgyűrű grafikus elem: WCAG 1.4.11 szerint 3:1 a SZOMSZÉDOS felület
// ellen. jsdomban nincs Radix CSS, a kirajzolt gyűrű csak a `visual-css`
// manual-check szeletben mérhető -- itt a token értéke őrizhető.
describe('t.focusRing kontraszt', () => {
  const hatterek: [string, string][] = [
    ['t.surface (szövegmező, panel)', t.surface],
    ['t.page (laphátter)', t.page],
    ['t.accentWash (fókuszált pácienslista-sor)', t.accentWash],
  ];

  for (const [nev, hatter] of hatterek) {
    it(`legalább 3:1 a ${nev} hátterén`, () => {
      expect(contrastRatio(t.focusRing, hatter)).toBeGreaterThanOrEqual(3);
    });
  }
});

// `main.tsx` + `index.css` ezekre a hexekre irányítja a Radix `--accent-a11`
// szövegszínt (Callout, soft Badge/Button, accent-colorral festett Text) --
// a legszigorúbb háttér a Calloutba ágyazott jelvény, ami a Callout ÉS a
// Badge SAJÁT `--accent-a3` washán ül (kettős kompozit, `t.page` alapon).
// Az alpha-hexek a `@radix-ui/colors` *-alpha.css (light, non-P3 fallback)
// szerint rögzítettek -- ha a Radix-verzió frissítéskor változtat rajtuk, ez
// a teszt jelzi, ha a kettős wash emiatt 4,5:1 alá csúszna.
const RADIX_AMBER_A3 = hexToRgba('#ffde003d');
const RADIX_RED_A3 = hexToRgba('#f3000d14');
const RADIX_GREEN_A3 = hexToRgba('#00a43319');

function doubleWashOverPage(wash: Rgba) {
  const layer1 = compositeOver(wash, hexToRgb(t.page));
  return compositeOver(wash, layer1);
}

describe('t.warn / t.danger / t.ok kontraszt a Radix accent-a11 alias kettős washán', () => {
  it('t.warn legalább 4,5:1 a Calloutba ágyazott kettős amber washon', () => {
    expect(contrastOfRgb(hexToRgb(t.warn), doubleWashOverPage(RADIX_AMBER_A3))).toBeGreaterThanOrEqual(4.5);
  });

  it('t.danger legalább 4,5:1 a Calloutba ágyazott kettős red washon', () => {
    expect(contrastOfRgb(hexToRgb(t.danger), doubleWashOverPage(RADIX_RED_A3))).toBeGreaterThanOrEqual(4.5);
  });

  it('t.ok legalább 4,5:1 a Calloutba ágyazott kettős green washon', () => {
    expect(contrastOfRgb(hexToRgb(t.ok), doubleWashOverPage(RADIX_GREEN_A3))).toBeGreaterThanOrEqual(4.5);
  });
});
