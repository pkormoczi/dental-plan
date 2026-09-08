# Szelet: `visual-css` — kontraszt, `controlBorder`, fókuszgyűrű

Minden snippet ténylegesen lefutott és bizonyítottan működik (2026-08-10-i menet; a
`control-border-contrast`/`control-no-border` ág 2026-09-08-án frissült és újra lefutott
mind a 7 route-on). A protokoll a `SKILL.md`-ben; a szabályok forrása az `app/src/CLAUDE.md`
(„Két felület, két szabály”, „Akadálymentesség”). Becsült idő: ~10 perc.

Route-onként egy hívás, mind a 7 route-on (`#/`, `#/paciens`, `#/terv`, `#/elonezet`,
`#/demo/tervek`, `#/arlista`, `#/beallitasok`), plusz egy nyitott
`AlertDialog`/popover mellett is.

**Fontos:** a naiv „első nem-átlátszó `backgroundColor`” háttérkeresés hamis pozitívot
ad Radix `variant="soft"` gomboknál (félig-átlátszó `rgba` rétegek egymáson) — rendes
alfa-kompozitálás kell.

## Kontraszt / `controlBorder` / accent-mint-szövegszín

```js
() => {
  const parseColor = (str) => {
    if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const m = str.match(/rgba?\(([^)]+)\)/);
    if (!m) return { r: 0, g: 0, b: 0, a: 0 };
    const parts = m[1].split(',').map(s => parseFloat(s.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const compositeOver = (fg, bg) => {
    const outA = fg.a + bg.a * (1 - fg.a);
    if (outA === 0) return { r: 255, g: 255, b: 255, a: 0 };
    return {
      r: (fg.r * fg.a + bg.r * bg.a * (1 - fg.a)) / outA,
      g: (fg.g * fg.a + bg.g * bg.a * (1 - fg.a)) / outA,
      b: (fg.b * fg.a + bg.b * bg.a * (1 - fg.a)) / outA,
      a: outA,
    };
  };
  const lum = (c) => {
    const [r, g, b] = [c.r, c.g, c.b].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const effectiveBg = (el) => {
    const chain = [];
    for (let n = el; n; n = n.parentElement) chain.push(n);
    chain.reverse();
    let acc = { r: 255, g: 255, b: 255, a: 1 };
    for (const n of chain) acc = compositeOver(parseColor(getComputedStyle(n).backgroundColor), acc);
    return acc;
  };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 50);
  const out = [];

  // #f77409 (accent) soha nem lehet szövegszín -- 2,82:1
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    if (cs.color === 'rgb(247, 116, 9)' && el.textContent.trim() &&
        ![...el.children].some(c => c.textContent.trim() === el.textContent.trim())) {
      out.push({ rule: 'accent-as-text', el: name(el), tag: el.tagName });
    }
  }

  // szövegkontraszt: 4.5:1 normál, 3:1 nagy (18px+)
  for (const el of document.querySelectorAll('p,span,label,button,a,td,th,h1,h2,h3,h4,li,div')) {
    if (!el.textContent.trim() || el.children.length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (el.disabled || el.getAttribute('data-disabled') === 'true') continue; // letiltott kontroll kivétel
    const bg = effectiveBg(el);
    const fg = compositeOver(parseColor(cs.color), bg);
    const big = parseFloat(cs.fontSize) >= 18;
    const r = ratio(fg, bg);
    if (r < (big ? 3 : 4.5)) out.push({ rule: 'text-contrast', el: name(el), ratio: +r.toFixed(2), px: cs.fontSize, color: cs.color, bg: `rgb(${bg.r.toFixed(0)},${bg.g.toFixed(0)},${bg.b.toFixed(0)})` });
  }

  // minden interaktív kontroll >=3:1 keret (controlBorder, soha nem uiLine)
  const CTRL = 'input,button,select,textarea,[role="button"],[role="combobox"],[role="checkbox"],[role="switch"],[role="option"]';
  // az index.css wrapper-szelektorai: a keret gyakran nem a CTRL-elemen, hanem ezen ül
  const WRAPPER = '.rt-BaseButton.rt-variant-soft,.rt-TextFieldRoot,.rt-SegmentedControlRoot,.rt-SelectTrigger,.rt-CheckboxRoot';
  const shadowBorderColor = (cs) => {
    const sh = cs.boxShadow;
    if (!sh || sh === 'none' || !sh.includes('inset')) return null; // csak inset szamit keretnek, a fokuszgyuru/emeles-arnyek nem
    // csak a teljes korvonalu inset (offsetX=0, offsetY=0, spread>0) szamit keretnek --
    // az egy-elu, spread nelkuli inset (pl. rt-TableCell sor-elvalaszto also vonala,
    // "0px -1px 0px 0px inset") diszito, nem a kontroll hatarat jelzi
    const nums = (sh.match(/-?\d+(\.\d+)?px/g) || []).map(parseFloat);
    const [offsetX = 0, offsetY = 0, , spread = 0] = nums;
    if (offsetX !== 0 || offsetY !== 0 || !spread) return null;
    const c = parseColor(sh);
    return c.a > 0 ? c : null;
  };
  // a bejelölt RadioCards-swatch a Radix sajátjából `outline`-t kap
  // (`--accent-indicator`), nem box-shadow-t -- a fókuszgyűrű ELLEN nem véd,
  // de az csak a ténylegesen fókuszban álló egy elemet érintheti egy menetben
  const outlineOf = (cs) => {
    if (cs.outlineStyle === 'none' || parseFloat(cs.outlineWidth) === 0) return null;
    const c = parseColor(cs.outlineColor);
    return c.a > 0 ? c : null;
  };
  // a kereten/kitöltésen kívül a Radix hol a ::before-on (Checkbox, Radio),
  // hol a ::after-en (RadioCards) rajzol -- mindkettőt nézni kell, elemenként
  // AZ ELSŐ találat számít, hogy egy checked-Radio ::before-ján maradt
  // halvány gray-a7 ne előzze meg a ténylegesen látszó kitöltést/keretet
  const borderOf = (cs) => {
    const bc = parseColor(cs.borderTopColor), bw = parseFloat(cs.borderTopWidth);
    if (bw && bc.a > 0) return bc;
    return shadowBorderColor(cs) || outlineOf(cs);
  };
  const findOwnBorder = (el) => borderOf(getComputedStyle(el)) || borderOf(getComputedStyle(el, '::before')) || borderOf(getComputedStyle(el, '::after'));
  const findBorder = (el) => {
    const direct = findOwnBorder(el);
    if (direct) return direct;
    let n = el.parentElement;
    for (let depth = 0; n && depth < 3; depth++, n = n.parentElement) {
      if (n.matches && n.matches(WRAPPER)) {
        const found = findOwnBorder(n);
        if (found) return found;
      }
    }
    return null;
  };
  const ownFillColor = (el) => {
    // a bepipált checkbox/radio kitöltése a Radix ::before-ján, a RadioCards
    // pipája a ::after-en ül, nem a sajátján -- ugyanaz a párosítás, mint a findBorder-nél
    const own = parseColor(getComputedStyle(el).backgroundColor);
    if (own.a > 0) return own;
    const before = parseColor(getComputedStyle(el, '::before').backgroundColor);
    if (before.a > 0) return before;
    return parseColor(getComputedStyle(el, '::after').backgroundColor);
  };
  const isChecked = (el) =>
    el.getAttribute('data-state') === 'checked' ||
    el.getAttribute('data-state') === 'indeterminate' ||
    el.getAttribute('aria-checked') === 'true';
  let noBorderCount = 0;
  const noBorderSample = [];
  for (const el of document.querySelectorAll(CTRL)) {
    if (el.classList.contains('rt-IconButton') || el.classList.contains('rt-variant-ghost')) continue; // app/src/CLAUDE.md controlBorder-kivételek (IconButton, ghost) -- tudatos, nem hiányzó keret
    if (el.disabled || el.getAttribute('data-disabled') === 'true' || el.getAttribute('aria-disabled') === 'true') continue; // WCAG 1.4.11 letiltott kontrollra nem kötelező
    if (isChecked(el)) {
      // bejelölt radio/checkbox/switch: a Radix checked-szabálya csak a
      // background-colort írja felül, a ::before-on maradó, nem-checked
      // ágból örökölt gray-a7 box-shadow (pl. natív <input> hiányában a
      // Radix :not(:checked) mindig igaz egy <button>-ön) VIZUÁLISAN
      // eltűnik a kitöltés alatt -- a kitöltés a valódi jelzés, azt kell
      // 3:1-hez mérni, nem az alatta maradt halvány keretet
      const outsideBg = effectiveBg(el.parentElement || el);
      const ownFill = ownFillColor(el);
      if (ownFill.a > 0 && ratio(compositeOver(ownFill, outsideBg), outsideBg) >= 3) continue;
    }
    const bc = findBorder(el);
    if (bc) {
      const bg = effectiveBg(el);
      const borderColor = compositeOver(bc, bg);
      const r = ratio(borderColor, bg);
      if (r < 3) out.push({ rule: 'control-border-contrast', el: name(el), border: `rgba(${bc.r.toFixed(0)},${bc.g.toFixed(0)},${bc.b.toFixed(0)},${bc.a.toFixed(2)})`, ratio: +r.toFixed(2) });
      continue;
    }
    // nincs keret sehol -- a solid Button és a bepipált checkbox/radio itt a SAJÁT (vagy ::before) kitöltése kontrasztjával megy át
    const outsideBg = effectiveBg(el.parentElement || el);
    const ownFill = ownFillColor(el);
    const fillOk = ownFill.a > 0 && ratio(compositeOver(ownFill, outsideBg), outsideBg) >= 3;
    if (!fillOk) {
      noBorderCount++;
      if (noBorderSample.length < 5) noBorderSample.push(name(el) + ' [' + el.tagName + ']');
    }
  }
  if (noBorderCount) out.push({ rule: 'control-no-border', count: noBorderCount, sample: noBorderSample });
  return { route: location.hash, count: out.length, violations: out.slice(0, 60) };
}
```

Kivétel-osztály (`rt-IconButton`, `rt-variant-ghost`) marad kettő — nevesített WCAG 1.4.11
kivétel, nincs se keretük, se kitöltésük. A `solid` Button és a bepipált checkbox nem
osztály-kihagyással megy át, hanem a fenti fallback méri a saját kitöltésük kontrasztját;
ha ez mégis `control-no-border`-ként jelenik meg, az valódi hiányt jelez, nem a mérés hibáját.

## Fókuszgyűrű

Külön, interakcióval — kevés mintaelemen elég. `outline: none` tilos, a fókusz látható
gyűrűt kap:

```js
() => {
  const snap = (el) => {
    const cs = getComputedStyle(el);
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, boxShadow: cs.boxShadow };
  };
  const els = [...document.querySelectorAll('a,button,input,[tabindex]')].slice(0, 12);
  return els.map(el => {
    const before = snap(el);
    el.focus();
    const after = snap(el);
    const changed = before.outlineStyle !== after.outlineStyle || before.outlineWidth !== after.outlineWidth || before.boxShadow !== after.boxShadow;
    const label = (el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 40);
    el.blur();
    return { el: label, changed };
  });
}
```

Ismert korlát: az `effectiveBg` ős-bejárás lapos slate UI-n helyes, de féligáteresztő
overlay alatt (pl. egy `AlertDialog` MÖGÖTT látszó tartalom) téved — dialóguson belüli
találatokat kézzel is nézd át.

## Oszlopszélesség: Beavatkozás (`#/terv`)

jsdomban nincs layout, a `PlanEditorPage.tsx` lap-plafonja és a `PhaseSection.tsx`
oszlopszélességei csak pixelben, valódi Chrome-ban ellenőrizhetők. Fussa le EGY nyitott
fázissal (van legalább egy sor) 1440×900-on ÉS 1280×720-on is (`resize_page`):

```js
() => {
  const nevInput = document.querySelector('input[aria-label="Beavatkozás megnevezése"]');
  const headerCell = [...document.querySelectorAll('th')].find((th) => th.textContent.trim().startsWith('Beavatkozás'));
  return {
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    beavatkozasOszlopPx: headerCell ? Math.round(headerCell.getBoundingClientRect().width) : null,
    nevmezoPx: nevInput ? Math.round(nevInput.getBoundingClientRect().width) : null,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  };
}
```

Elvárt mindkét felbontáson: `beavatkozasOszlopPx` ~524px, `nevmezoPx` ~465px,
`horizontalOverflow: false`. Egy hosszú tételnév (pl. a seed „Bölcsességfog műtéti
eljárással (seb. gond., varratszedés)” tétele) a névmező `title`-jében egérrel előhívható,
csonkolás nélkül.

## Háttér és skeleton

- Az app háttere hideg slate — `getComputedStyle(document.body).backgroundColor` és a
  `main` háttere SOHA nem meleg krém/bézs (a márka-meleg csak a nyomtatványé).
- Loading-állapot: skeleton a végleges elrendezés alakjában, nem spinner — a tranziens
  állapot screenshotja nem elkapható (lásd `SKILL.md`), forráskódból igazold.
