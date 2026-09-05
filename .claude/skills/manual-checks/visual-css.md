# Szelet: `visual-css` — kontraszt, `controlBorder`, fókuszgyűrű

Minden snippet ténylegesen lefutott és bizonyítottan működik (2026-08-10-i menet). A
protokoll a `SKILL.md`-ben; a szabályok forrása az `app/src/CLAUDE.md` („Két felület,
két szabály”, „Akadálymentesség”). Becsült idő: ~10 perc.

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
  let noBorderCount = 0;
  const noBorderSample = [];
  for (const el of document.querySelectorAll(CTRL)) {
    if (el.classList.contains('rt-IconButton') || el.classList.contains('rt-variant-ghost')) continue; // app/src/CLAUDE.md controlBorder-kivételek (IconButton, ghost) -- tudatos, nem hiányzó keret
    const cs = getComputedStyle(el);
    const bc = parseColor(cs.borderTopColor), bw = parseFloat(cs.borderTopWidth);
    const sh = cs.boxShadow;
    if ((!bw || bc.a === 0) && sh === 'none') {
      noBorderCount++;
      if (noBorderSample.length < 5) noBorderSample.push(name(el) + ' [' + el.tagName + ']');
    } else if (bw && bc.a > 0) {
      const bg = effectiveBg(el);
      const borderColor = compositeOver(bc, bg);
      const r = ratio(borderColor, bg);
      if (r < 3) out.push({ rule: 'control-border-contrast', el: name(el), border: cs.borderTopColor, ratio: +r.toFixed(2) });
    }
  }
  if (noBorderCount) out.push({ rule: 'control-no-border', count: noBorderCount, sample: noBorderSample });
  return { route: location.hash, count: out.length, violations: out.slice(0, 60) };
}
```

A harmadik nevesített kivétel a `solid` Button: annak saját kitöltése 3:1 fölött van
a lap háttere felől, a snippet `boxShadow`-ágán átmegy — ha `control-no-border`-ként
jelenik meg, az a kaszkád hibája, nem kivétel.

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

## Háttér és skeleton

- Az app háttere hideg slate — `getComputedStyle(document.body).backgroundColor` és a
  `main` háttere SOHA nem meleg krém/bézs (a márka-meleg csak a nyomtatványé).
- Loading-állapot: skeleton a végleges elrendezés alakjában, nem spinner — a tranziens
  állapot screenshotja nem elkapható (lásd `SKILL.md`), forráskódból igazold.
