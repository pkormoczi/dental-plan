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
// jórészt zárt halmazokból jön -- a fog-id-k csak `isMaradoFog()`-on átment
// FDI kódok lehetnek (`buildToothVisualStates` már ezt garantálja), a színek
// pedig a `HEX_COLOR_RE`-n átmenő (vagy `ALAP_KATEGORIA_SZIN`-re eső) hex
// értékek. A kategórianév viszont a doki által szerkesztett szabadszöveg
// (`Kategoria.nev`, a kategória-karbantartó panelen) -- interaktív módban ez
// kerül az `aria-label` attribútumba, ezért a `attrEscape()` mindig lefut rá,
// mielőtt markupba kerülne.

import chartSvgRaw from '../assets/dental-chart-fdi-32.svg?raw';
import { isMaradoFog, type FogterkepAllapot } from '../domain/toothVisual';
import { ALAP_KATEGORIA_SZIN } from './treatmentVisuals';

export const CHART_ARIA_LABEL = 'Fogászati kezelési terv – érintett fogak vizuális jelölése';
// A components/DentalChart.tsx interaktív wrapperének class-a -- innen
// hivatkozik rá az INTERACTIVE_STYLE lent, a fókuszhoz kötött szabályokhoz.
export const CHART_WRAPPER_CLASS = 'dp-fogterkep';

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
// Csak a fog-<g>-ket találja el (id/data-tooth/class fix sorrendben, lásd az
// asset fejléce) -- a bölcsességfog-vonalrajz klip-csoportjait NEM, azoknak
// nincs data-tooth-juk.
const TOOTH_GROUP_OPEN_RE = /<g id="tooth-(\d\d)" data-tooth="\d\d" class="tooth"([^>]*)>/g;
// A kattintható mód aktív/kijelölt gyűrűje -- két KÜLÖN csatorna: a
// `.tooth-fill` `fill`-je (currentColor) a kezelés kategóriáját mutatja; a
// billentyűzetes kurzor (`is-active`) és a kijelölés (`is-picked`) viszont
// EGYSZERRE is látszania kell ugyanazon a fogon (a doki a MÁR felvett
// fogakon lépked végig) -- egy elemnek egy stroke-ja van, tehát a kurzor
// NEM a `.tooth-fill` saját stroke-ja, hanem `injectFocusCursor()` két
// külön `<path>`-t másol a fókuszált fog `.tooth-fill` path-jai ELÉ
// (`.tooth-kurzor-kontraszt` fehér, `.tooth-kurzor` ink, szaggatott). Mivel
// SVG-ben a dokumentum-sorrend egyben a festési sorrend, a `.tooth-fill`
// (mindig utoljára, tehát legfelül) lefedi a két új réteg belső felét --
// kifelé koncentrikus sávok maradnak, ugyanaz a trükk, mint a `.tooth.
// is-picked .tooth-fill` saját `paint-order:stroke`-ja, csak elem-szinten.
// `vector-effect:non-scaling-stroke` mindenhol: a rajz viewBox-a 1576
// egység, a megjelenítés 340 (ToothPickerPopover) / 480 px (a két plan-
// szintű panel) -- enélkül egy viewBox-egységben megadott vastagság a
// megjelenítéskor szubpixelre zsugorodna, és a két hívási hely között is
// eltérne. A kurzor-rétegek alapból `display:none` -- csak a wrapper
// (components/DentalChart.tsx, `CHART_WRAPPER_CLASS`) `:focus-visible`
// állapotában látszanak, hogy egy soha meg nem érintett fogtérképen ne
// üljön tartós, kijelölésnek olvasható jelölés a kezdő fogon. Ez a szabály
// és a wrapper saját fókuszgyűrűje is EBBEN a `<style>`-ban él, ami
// `dangerouslySetInnerHTML`-lel kerül a dokumentumba -- egy így beszúrt
// `<style>` a teljes dokumentum stíluslapjai közé kerül, a szelektorai a
// beszúrási pont FÖLÖTTI (wrapper) DOM-ra is hatnak, nem csak az SVG-n
// belülre. `#f77409` itt szabályos: tokens.ts "CSAK díszítés" + a
// fogtérkép kiemelése néven nevezett kivétel (docs/07-felulet-rendszer.md),
// szövegszínként viszont soha nem használható.
const INTERACTIVE_STYLE =
  '.tooth{cursor:pointer}' +
  '.tooth-kurzor,.tooth-kurzor-kontraszt{fill:none;pointer-events:none;vector-effect:non-scaling-stroke;display:none}' +
  `.${CHART_WRAPPER_CLASS}:focus-visible .tooth-kurzor,.${CHART_WRAPPER_CLASS}:focus-visible .tooth-kurzor-kontraszt{display:inline}` +
  '.tooth-kurzor-kontraszt{stroke:#fff;stroke-width:12}' +
  '.tooth-kurzor{stroke:#2D2D2D;stroke-width:8;stroke-dasharray:6 4}' +
  '.tooth.is-picked .tooth-fill{stroke:#f77409;stroke-width:4;paint-order:stroke;vector-effect:non-scaling-stroke}' +
  `.${CHART_WRAPPER_CLASS}:focus-visible{outline:2px solid var(--focus-8, #2D2D2D);outline-offset:2px;border-radius:6px}`;

export interface ToothChartSvgOptions {
  /** 'responsive' (alap): width/height nélkül, CSS width:100% -- webes nézet. 'fixed': explicit pixelméret -- a canvas-adapterhez kell. */
  sizing?: 'responsive' | 'fixed';
  /** Csak 'fixed' sizing esetén számít: a viewBox-egységek pixel-szorzója. */
  scale?: number;
  /** Fejlesztői/debug mód: fogszám minden fog közepén. Alapból kikapcsolva. */
  showToothNumbers?: boolean;
  /**
   * Kattintható mód: minden fog-`<g>` kap `role`-t és beszédes
   * `aria-label`-t (`szerep: 'option'` esetén `aria-selected`-et is), a
   * gyökér `<svg>` elveszti a saját címét (nincs kettős a11y-csomópont a
   * components/DentalChart.tsx wrapperének `aria-activedescendant`-os
   * navigációja mellett). Alapból KIKAPCSOLVA, hogy a PDF-be rasterizált
   * markup (pdf/toothChartImage.ts) bájtra ugyanaz maradjon -- arra sosem
   * szabad `interactive: true`-t adni.
   */
  interactive?: boolean;
  /** Csak `interactive: true` esetén számít. `'button'` (alap): plan-szintű kattintás (sorugrás/új sor, VAGY -- ha `selectedTeeth` is jön -- a Terv részletei több fogas kijelölés-navigációja). `'option'`: a soron belüli választó, ahol több fog is kijelölhető (`aria-selected`). A két mód egymástól FÜGGETLEN a `selectedTeeth`-től -- a `szerep` dönt az ARIA-szemantikáról, a `selectedTeeth` a vizuális gyűrűről. */
  szerep?: 'button' | 'option';
  /** Csak `interactive: true` esetén számít: ez a fog kapja az `is-active` classt és a kétrétegű kurzor-gyűrűt (billentyűzetes navigáció, lásd DentalChart.tsx `aria-activedescendant`), `injectFocusCursor()`-on át. */
  focusedTooth?: string;
  /** Csak `interactive: true` esetén számít: ezek a fogak kapnak `is-picked` kijelölés-gyűrűt -- `szerep: 'option'` esetén ez adja az `aria-selected` értékét is, `szerep: 'button'` esetén (ha meg van adva) az `aria-pressed` értékét. */
  selectedTeeth?: readonly string[];
}

export function buildToothChartSvg(
  allapot: FogterkepAllapot,
  opts: ToothChartSvgOptions = {},
): string {
  const {
    sizing = 'responsive',
    scale = 1,
    showToothNumbers = false,
    interactive = false,
    szerep = 'button',
    focusedTooth,
    selectedTeeth,
  } = opts;

  let svg = chartSvgRaw.replace(XML_DECL_RE, '');

  const viewBoxMatch = svg.match(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/);
  const vbW = viewBoxMatch ? Number(viewBoxMatch[3]) : 1576;
  const vbH = viewBoxMatch ? Number(viewBoxMatch[4]) : 768;

  svg = svg.replace(ROOT_SVG_OPEN_RE, (openTag) => {
    const cleaned = openTag
      .replace(WIDTH_HEIGHT_ATTR_RE, '')
      .replace(ROLE_ARIA_ATTR_RE, '')
      .replace('<svg', interactive ? '<svg' : '<svg aria-hidden="true"');
    if (sizing === 'fixed') {
      return cleaned.replace('<svg', `<svg width="${vbW * scale}" height="${vbH * scale}"`);
    }
    return cleaned.replace('<svg', '<svg style="width:100%;height:auto;display:block"');
  });

  // Magyar cím/leírás -- az eredeti angol <title>/<desc> fejlesztői
  // dokumentáció volt az assetben. Olvasható módban a felhasználó felé a
  // magyar aria-label (lásd DentalChart.tsx) és ez a title számít.
  // Kattintható módban a gyökér <svg>-nek NINCS saját neve -- a wrapper
  // role="toolbar"/"listbox" aria-label-je az egyetlen a11y-csomópont, a
  // fogankénti role/aria-label pedig a wrapperen belüli navigáció, nem egy
  // második, versengő "kép" leírás (lásd DentalChart.tsx).
  svg = svg.replace(
    /<title id="title">[^<]*<\/title>/,
    `<title id="title">${interactive ? '' : CHART_ARIA_LABEL}</title>`,
  );
  svg = svg.replace(/<desc id="desc">[^<]*<\/desc>/, '<desc id="desc"></desc>');

  const colorRules: string[] = [];
  for (const [fdi, fogAllapot] of allapot.fogak) {
    if (!isMaradoFog(fdi)) continue; // védőháló, lásd fejléckomment
    // `kategoriaVizual()`/`vizualKategoriaFor()` már garantál érvényes hexet
    // -- ez a regex csak második védőháló, ha mégis érvénytelen jutna ide.
    const szin = HEX_COLOR_RE.test(fogAllapot.vizual.szin) ? fogAllapot.vizual.szin : ALAP_KATEGORIA_SZIN;
    colorRules.push(`#tooth-${fdi}{color:${szin}}`);
  }
  if (colorRules.length) {
    svg = svg.replace('</style>', `${colorRules.join('')}</style>`);
  }

  if (interactive) {
    svg = svg.replace('</style>', `${INTERACTIVE_STYLE}</style>`);
    svg = makeInteractive(svg, allapot, szerep, focusedTooth, selectedTeeth);
    svg = injectFocusCursor(svg, focusedTooth);
  }

  if (showToothNumbers) {
    svg = injectToothNumbers(svg);
  }

  return svg;
}

/** `"`/`&`/`<`/`>` escape-elése attribútumértékbe illesztés előtt -- a
 *  kategórianév (lásd lent) a doki szabadszövege, nem statikus tábla. */
function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Fogankénti `role`/`aria-label`(/`aria-selected`) + `is-active`/`is-picked`
 * class injektálás -- lásd `ToothChartSvgOptions.interactive` fejléckommentjét
 * a biztonsági indoklásért. A FDI-kódok zárt halmazból jönnek
 * (`TOOTH_GROUP_OPEN_RE` saját capture-je), a kategórianév viszont a doki
 * szerkesztett szövege (`Kategoria.nev.hu` a kategória-karbantartó panelen,
 * mindig magyar -- a kezelőfelület magyar), ezért `escapeAttr()`-en megy át.
 */
function makeInteractive(
  svg: string,
  allapot: FogterkepAllapot,
  szerep: 'button' | 'option',
  focusedTooth: string | undefined,
  selectedTeeth: readonly string[] | undefined,
): string {
  const selected = new Set(selectedTeeth ?? []);
  return svg.replace(TOOTH_GROUP_OPEN_RE, (_match, fdi: string, rest: string) => {
    const kezeles = allapot.fogak.get(fdi);
    const cimke = escapeAttr(kezeles ? kezeles.vizual.nev.hu : 'nincs kezelés');
    const isPicked = selected.has(fdi);
    const classes = ['tooth', fdi === focusedTooth && 'is-active', isPicked && 'is-picked']
      .filter(Boolean)
      .join(' ');
    const ariaSelected = szerep === 'option' ? ` aria-selected="${isPicked}"` : '';
    // `button` módban csak akkor kap `aria-pressed`-et a fog, ha a hívó
    // ténylegesen küld `selectedTeeth`-et -- a szerkesztő plan-szintű
    // térképe (sorugrás/új sor, nincs többszörös kijelölés) ma sem ad
    // ilyet, ott a markup emiatt bájtra változatlan marad.
    const ariaPressed =
      szerep === 'button' && selectedTeeth !== undefined ? ` aria-pressed="${isPicked}"` : '';
    return (
      `<g id="tooth-${fdi}" data-tooth="${fdi}" class="${classes}" role="${szerep}" ` +
      `aria-label="${fdi}. fog – ${cimke}"${ariaSelected}${ariaPressed}${rest}>`
    );
  });
}

/**
 * A billentyűzetes kurzor (`is-active`) fog csoportjába, a saját
 * `.tooth-fill` path-jai ELÉ két extra réteget másol (fehér kontraszt +
 * ink) -- lásd az `INTERACTIVE_STYLE` fejléckommentjét a festési sorrend
 * indoklásáért. A `d` a statikus assetből jön (`chartSvgRaw`), nem doki-
 * szerkesztett szöveg, ezért nem kell `escapeAttr()`-en átmennie. Csak a
 * FÓKUSZÁLT fog kap extra réteget -- a másik 31 fog markupja érintetlen.
 * `focusedTooth` hiányzó/érvénytelen (nem létező `<g>`-re mutató) értéke
 * esetén a `replace` nem talál egyezést a fókuszált fdi-re, no-op marad.
 */
function injectFocusCursor(svg: string, focusedTooth: string | undefined): string {
  if (!focusedTooth) return svg;
  const toothGroupRe = /<g id="tooth-(\d\d)"([^>]*)>([\s\S]*?)<\/g>/g;
  return svg.replace(toothGroupRe, (match, fdi: string, attrs: string, body: string) => {
    if (fdi !== focusedTooth) return match;
    const fillDs = [...body.matchAll(/<path class="tooth-fill" d="([^"]+)"\/>/g)].map((m) => m[1]);
    const cursorLayers = fillDs
      .map((d) => `<path class="tooth-kurzor-kontraszt" d="${d}"/><path class="tooth-kurzor" d="${d}"/>`)
      .join('');
    return `<g id="tooth-${fdi}"${attrs}>${cursorLayers}${body}</g>`;
  });
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
