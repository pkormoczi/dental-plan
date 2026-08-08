// A dental-chart-fdi-32.svg (lásd app/src/assets/) nyers markupjából épít egy
// már színezett SVG-stringet -- ez a string kerül DOM-ba a webes
// fogtérképen (components/DentalChart.tsx, dangerouslySetInnerHTML-lel) ÉS
// canvas-on át PNG-be a nyomtatványhoz (pdf/toothChartImage.ts). Egyetlen
// vizuális forrás, két felhasználás -- lásd CLAUDE.md-be felvett adatutat.
//
// Az eredeti asset a `.tooth { color:#ffffff } .tooth .tooth-fill {
// fill:currentColor }` CSS-mechanizmust használja -- egy fogankénti
// `#tooth-NN { color: ... }` szabály (id-specificitás > class) felülírja azt
// anélkül, hogy a fekete vonalrajzhoz (egyetlen <image>, lásd a fájl
// tetején) vagy a path-adathoz hozzá kellene nyúlni.
//
// Biztonság: mivel ez `dangerouslySetInnerHTML`-be kerül, a beszúrt adat
// zárt halmazokból jön -- a fog-id-k csak `isMaradoFog()`-on átment FDI
// kódok lehetnek (`buildToothVisualStates` már ezt garantálja), a színek
// csak a `KEZELES_VIZUALOK` statikus hex-értékei. Az injektált szabályok
// előállítása így nem enged tetszőleges stringet a markupba.

import chartSvgRaw from '../assets/dental-chart-fdi-32.svg?raw';
import { isMaradoFog, type FogterkepAllapot } from '../domain/toothVisual';
import { KEZELES_VIZUALOK } from './treatmentVisuals';

export const CHART_ARIA_LABEL = 'Fogászati kezelési terv – érintett fogak vizuális jelölése';

const XML_DECL_RE = /^<\?xml[^>]*\?>\s*/;
const ROOT_SVG_OPEN_RE = /<svg\b[^>]*>/;
const WIDTH_HEIGHT_ATTR_RE = /\s(?:width|height)="[^"]*"/g;
// A gyökér <svg> saját role="img"/aria-labelledby-je (az eredeti aszettben)
// egy MÁSODIK, egymásba ágyazott "kép" akadálymentességi csomópontot adna a
// wrapper <div role="img" aria-label=...> mellé (lásd DentalChart.tsx) --
// ugyanazzal a névvel, tehát a képernyőolvasó duplán mondaná be. A belső
// svg-t ezért ártalmatlanítjuk (`aria-hidden`), az egyetlen akadálymentességi
// forrás a wrapper marad.
const ROLE_ARIA_ATTR_RE = /\s(?:role|aria-labelledby)="[^"]*"/g;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export interface ToothChartSvgOptions {
  /** 'responsive' (alap): width/height nélkül, CSS width:100% -- webes nézet. 'fixed': explicit pixelméret -- a canvas-adapterhez kell. */
  sizing?: 'responsive' | 'fixed';
  /** Csak 'fixed' sizing esetén számít: a viewBox-egységek pixel-szorzója. */
  scale?: number;
  /** Fejlesztői/debug mód: fogszám minden fog közepén. Alapból kikapcsolva. */
  showToothNumbers?: boolean;
}

export function buildToothChartSvg(
  allapot: FogterkepAllapot,
  opts: ToothChartSvgOptions = {},
): string {
  const { sizing = 'responsive', scale = 1, showToothNumbers = false } = opts;

  let svg = chartSvgRaw.replace(XML_DECL_RE, '');

  const viewBoxMatch = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  const vbW = viewBoxMatch ? Number(viewBoxMatch[3]) : 1576;
  const vbH = viewBoxMatch ? Number(viewBoxMatch[4]) : 768;

  svg = svg.replace(ROOT_SVG_OPEN_RE, (openTag) => {
    const cleaned = openTag
      .replace(WIDTH_HEIGHT_ATTR_RE, '')
      .replace(ROLE_ARIA_ATTR_RE, '')
      .replace('<svg', '<svg aria-hidden="true"');
    if (sizing === 'fixed') {
      return cleaned.replace('<svg', `<svg width="${vbW * scale}" height="${vbH * scale}"`);
    }
    return cleaned.replace('<svg', '<svg style="width:100%;height:auto;display:block"');
  });

  // Magyar cím/leírás -- az eredeti angol <title>/<desc> fejlesztői
  // dokumentáció volt az assetben, a felhasználó felé a magyar aria-label
  // (lásd DentalChart.tsx) és ez a title számít.
  svg = svg.replace(
    /<title id="title">[^<]*<\/title>/,
    `<title id="title">${CHART_ARIA_LABEL}</title>`,
  );
  svg = svg.replace(/<desc id="desc">[^<]*<\/desc>/, '<desc id="desc"></desc>');

  const colorRules: string[] = [];
  for (const [fdi, fogAllapot] of allapot.fogak) {
    if (!isMaradoFog(fdi)) continue; // védőháló, lásd fejléckomment
    const szin = KEZELES_VIZUALOK[fogAllapot.vizual].szin;
    if (!HEX_COLOR_RE.test(szin)) continue; // védőháló
    colorRules.push(`#tooth-${fdi}{color:${szin}}`);
  }
  if (colorRules.length) {
    svg = svg.replace('</style>', `${colorRules.join('')}</style>`);
  }

  if (showToothNumbers) {
    svg = injectToothNumbers(svg);
  }

  return svg;
}

/**
 * Fogonkénti bounding box a path-adatból (csak M/L/Z parancsok, abszolút
 * koordináták -- lásd az asset fejlécében rögzített mérést), a csoport
 * `transform="translate(dx dy)"`-jével eltolva. Nincs kézzel karbantartott
 * koordinátatábla -- ha az asset változik, ez automatikusan követi.
 */
function injectToothNumbers(svg: string): string {
  const texts: string[] = [];
  const toothGroupRe = /<g id="tooth-(\d\d)"([^>]*)>([\s\S]*?)<\/g>/g;
  let match: RegExpExecArray | null;
  while ((match = toothGroupRe.exec(svg))) {
    const [, fdi, attrs, body] = match;
    const transformMatch = attrs.match(/translate\((-?[\d.]+)[ ,](-?[\d.]+)\)/);
    const dx = transformMatch ? Number(transformMatch[1]) : 0;
    const dy = transformMatch ? Number(transformMatch[2]) : 0;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const pathRe = /d="([^"]+)"/g;
    let pathMatch: RegExpExecArray | null;
    while ((pathMatch = pathRe.exec(body))) {
      const nums = pathMatch[1].match(/-?[\d.]+/g)?.map(Number) ?? [];
      for (let i = 0; i + 1 < nums.length; i += 2) {
        const x = nums[i];
        const y = nums[i + 1];
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (!Number.isFinite(minX)) continue;

    const cx = (minX + maxX) / 2 + dx;
    const cy = (minY + maxY) / 2 + dy;
    texts.push(
      `<text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" ` +
        `dominant-baseline="central" font-size="26" fill="#000" fill-opacity="0.55" ` +
        `pointer-events="none">${fdi}</text>`,
    );
  }
  return svg.replace('</svg>', `<g id="tooth-numbers">${texts.join('')}</g></svg>`);
}
