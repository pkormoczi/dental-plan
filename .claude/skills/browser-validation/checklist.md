# Böngészős validáció — checklist

Minden snippet ebben a fájlban ténylegesen le lett futtatva és bizonyítottan
működik (2026-08-10-i menet). `SKILL.md`-ben a protokoll, itt a konkrét
`evaluate_script` hívások.

---

## 1. Kontraszt / `controlBorder` / accent-mint-szövegszín

Route-onként egy hívás, mind a 7 route-on
(`#/`, `#/paciens`, `#/terv`, `#/elonezet`, `#/tervek`, `#/arlista`, `#/beallitasok`),
plusz egy nyitott `AlertDialog`/popover mellett is.

**Fontos:** a naiv "első nem-átlátszó `backgroundColor`" háttérkeresés hamis
pozitívot ad Radix `variant="soft"` gomboknál (félig-átlátszó `rgba` rétegek
egymáson) — rendes alfa-kompozitálás kell.

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

  // #f77409 soha nem lehet szövegszín
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
    if (el.classList.contains('rt-IconButton') || el.classList.contains('rt-variant-ghost')) continue; // docs/07 controlBorder "Kivétel 2"/"Kivétel 3" -- tudatosan kivétel, nem hiányzó keret
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

**Fókuszgyűrű** (külön, interakcióval — kevés mintaelemen elég):

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

Ismert korlát: az `effectiveBg` ős-bejárás lapos slate UI-n helyes, de
féligáteresztő overlay alatt (pl. egy `AlertDialog` MÖGÖTT látszó tartalom)
téved — dialóguson belüli találatokat kézzel is nézd át.

---

## 2. PDF (fontok, ő/ű, D23, fogtérkép A/B, letöltés)

Szcenárió: reset → `#/paciens` glyph-próba név (pl. `Tőkés Ödönné`) → `#/terv`
sor `ő`/`ű`-vel (pl. `Gyökérkezelés felső őrlőfogon`), fogszámmal → `#/elonezet`.

**Fontok ténylegesen letöltődtek-e:**

```js
() => performance.getEntriesByType('resource')
  .filter(e => /NotoSans/i.test(e.name))
  .map(e => ({ name: e.name.split('/').pop(), encodedBodySize: e.encodedBodySize }))
```

**A PDF nyers bájtjai** (a blob same-origin, `fetch`-elhető a page kontextusból):

```js
async () => {
  const f = document.querySelector('iframe[title="Kezelési terv előnézet"]');
  if (!f || !f.src.startsWith('blob:')) return { error: 'no blob iframe' };
  const buf = await (await fetch(f.src)).arrayBuffer();
  const raw = new TextDecoder('latin1').decode(new Uint8Array(buf));
  return {
    bytes: buf.byteLength,
    header: raw.slice(0, 8),
    allBaseFonts: [...raw.matchAll(/\/BaseFont\s*\/([^\s\/>]+)/g)].map(m => m[1]),
    hasHelvetica: raw.includes('/Helvetica'),
    fontFile2Count: (raw.match(/\/FontFile2/g) || []).length,
    imageXObjects: (raw.match(/\/Subtype\s*\/Image/g) || []).length,
    pageCount: (raw.match(/\/Type\s*\/Page[^s]/g) || []).length,
    objStmCount: (raw.match(/\/Type\s*\/ObjStm/g) || []).length, // ha >0, a nyers regex NEM megbízható -- ld. lent
  };
}
```

**Fontos:** `@react-pdf/renderer` (pdfkit) jelenleg klasszikus, tömörítetlen
xref-táblát és objektum-szótárakat ír (csak content stream-ek és font
fájlok Flate-tömörítettek) — ezért a nyers regex-alapú vizsgálat megbízható.
Ha egy jövőbeli verzió object stream-eket (`/Type /ObjStm`) vagy
cross-reference stream-et (`/Type /XRef`) vezetne be, a fenti `objStmCount`/
`xrefStreamCount` már nem nulla, és a `/BaseFont`/`/FontFile2` számlálás
megbízhatatlanná válik — ezt ellenőrizd, mielőtt bármilyen "X font nincs
beágyazva" következtetést levonsz belőle.

**D23 placeholder-zár valós bájtokon:** a Beállításokban írj `[PLACEHOLDER`
törzsű nyilatkozatot a terv nyelvén, mentsd, térj vissza az előnézetre, és
hasonlítsd össze a `pageCount`-ot előtte/utána (3 → 2 várt, a
nyilatkozat+aláírás oldal hiányzik).

**Fogtérkép A/B:** egy terv `fogak`-kal → `imageXObjects` nő, a screenshot
mutatja a színezett térképet; ugyanaz a terv fogak nélkül (a "Fog" mező
törölve, ELÉ kattints be és `Ctrl+A`+`Backspace`+`Tab` — egy üres `fill()`
NEM biztos, hogy commitolja a törlést egy controlled inputon) → a térkép
és az "Érintett fogak" cím teljesen hiányzik, az összesítő teljes
szélességet kap.

**Glyphek vizuálisan:** `take_screenshot` — a PDF PDFium out-of-process
frame-ben renderel, nincs `contentDocument`/szövegréteg, a képet az ügynök
közvetlenül olvassa.

**Letöltés-instrumentálás** (csak friss oldalbetöltés után, ld. SKILL.md):

```js
() => {
  window.__dp = { created: [], revoked: [], clicks: [] };
  const co = URL.createObjectURL, re = URL.revokeObjectURL, ac = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = function (b) { const u = co.call(URL, b); window.__dp.created.push(u); return u; };
  URL.revokeObjectURL = function (u) { window.__dp.revoked.push(u); return re.call(URL, u); };
  HTMLAnchorElement.prototype.click = function () { window.__dp.clicks.push(this.href); return ac.call(this); };
  return 'instrumented';
}
```
majd a letöltés-gomb kattintása után (async flow esetén várj ~300-400ms-et
egy második `evaluate_script`-ben, mielőtt `window.__dp`-t olvasod — a
`downloadVersion`-szerű handlerek `await loadPlanPdf(...)`-ot futtatnak a
blob létrehozása előtt).

---

## 3. Billentyűzet + geometria

**A kritikus ciklus** (`docs/07`: "ez a ciklus nem törhet el") — 3×
egymás után, egér nélkül: `type_text` → `wait_for` (tömb!) → `press_key
ArrowDown` → `press_key Enter` → ellenőrzés:

```js
() => {
  const search = document.activeElement;
  return {
    value: search.value,
    isSearch: (search.getAttribute('placeholder') || '').includes('Tétel'),
    popoverOpen: !!document.querySelector('[data-radix-popper-content-wrapper]'),
  };
}
```
Várt minden körben: `value === ''`, `isSearch === true`, `popoverOpen === false`.

**Egyedi sor** (nulla találat → Enter): ugyanaz a ciklus, egy nem létező
tétel nevével; ellenőrizd, hogy létrejött-e egy `egyedi` jelöléssel ellátott
sor a beírt névvel.

**Escape:** kereső megnyitva (van szöveg + popover), `press_key Escape`,
utána `value === ''` és a popover zárva, fókusz a keresőn marad.

**Fogtérkép Tab-stop konszolidáció:**

```js
() => ({ chartInDom: !!document.querySelector('[role="toolbar"]') })
```
csukott panel mellett várt `false` (nem CSS-sel rejtett, ténylegesen hiányzik
a DOM-ból). Nyitott panelnél:

```js
() => {
  const toolbar = document.querySelector('[role="toolbar"]');
  const teeth = [...toolbar.querySelectorAll('[data-tooth]')];
  return {
    toolbarTabIndex: toolbar.tabIndex, // várt: 0
    toothCount: teeth.length,          // 32
    focusableToothCount: teeth.filter(t => t.tabIndex >= 0).length, // várt: 0
    ariaActivedescendant: toolbar.getAttribute('aria-activedescendant'),
  };
}
```

**`paint-order: stroke`** (jsdom nem implementálja):

```js
() => {
  const cs = (e) => e && getComputedStyle(e);
  const picked = document.querySelector('.tooth.is-picked .tooth-fill');
  const kurzor = document.querySelector('.tooth.is-active .tooth-kurzor');
  const kontraszt = document.querySelector('.tooth.is-active .tooth-kurzor-kontraszt');
  return {
    pickedPaintOrder: cs(picked)?.paintOrder,     // 'stroke'
    pickedStroke: cs(picked)?.stroke,             // accent, rgb(247,116,9) -- MINT STROKE, megengedett
    pickedColor: cs(picked)?.color,               // NEM lehet accent -- az szövegszín-használat lenne
    kurzorStroke: cs(kurzor)?.stroke,             // ink, rgb(45,45,45)
    kurzorDisplay: cs(kurzor)?.display,           // 'inline' (a fogtérkép fókuszban van)
    kontrasztStroke: cs(kontraszt)?.stroke,       // rgb(255,255,255)
  };
}
```
`.is-active` a plan-szintű (`role="toolbar"`) MÓDBAN IS és a soronkénti
`ToothPickerPopover` (`role="listbox"`) módban is létrejön (nyíllal mozgó
kurzor) — a kurzort MOSTANTÓL nem a `.tooth-fill` saját stroke-ja adja,
hanem két külön, a fókuszált fog csoportjába injektált `<path>` (fehér
`.tooth-kurzor-kontraszt` + ink `.tooth-kurzor`, lásd
`design/toothChartSvg.ts` `injectFocusCursor()`), és csak a fogtérkép
billentyűzet-fókuszban (`:focus-visible`) látszik. `.is-picked` mindkét
`szerep`-ben létrejöhet: a soronkénti `ToothPickerPopover`-ben ÉS a Terv
részletei plan-szintű, `selectedTeeth`-tel hívott térképén is (nem csak a
`role="listbox"` módban).

**Fókuszhoz kötött megjelenés + wrapper fókuszgyűrű:**

```js
() => {
  const toolbar = document.querySelector('[role="toolbar"], [role="listbox"]');
  const kurzor = toolbar?.querySelector('.tooth-kurzor');
  const cs = getComputedStyle(toolbar);
  return {
    beforeFocusDisplay: kurzor && getComputedStyle(kurzor).display, // 'none' fókusz előtt
    wrapperOutlineWidth: cs.outlineWidth,   // '0px' fókusz előtt
  };
}
```
Tab a fogtérképre, majd ugyanez a lekérdezés: `wrapperOutlineWidth` `2px`-re
vált, a kurzor `display`-je `inline`-ra; egérrel egy fogra kattintva a
kurzor visszavált `none`-ra (a wrapper `:focus-visible`, nem `:focus`).

**Vonalvastagság mindkét megjelenített szélességen** (a `vector-effect:
non-scaling-stroke` miatt a mért CSS-pixel értéknek a 340 px-es popoverben
és a 480 px-es panelekben egyeznie kell):

```js
() => {
  const kurzor = document.querySelector('.tooth-kurzor');
  const bbox = kurzor.getBoundingClientRect();
  return { strokeWidthPx: getComputedStyle(kurzor).strokeWidth, bboxWidth: bbox.width };
}
```

**Kombinált eset** (egy fog egyszerre `is-active` ÉS `is-picked` — a
`ToothPickerPopover`-ben egy MÁR kijelölt fogra lépve gyakori): a fenti
`paint-order` snippet mindhárom rétegét (`kurzorStroke`/`kontrasztStroke`/
`pickedStroke`) egy ilyen fogon lekérdezve mindháromnak nem-`undefined`
computed style-t kell adnia — a régi, forrás-sorrend szerinti elnyomás
(a narancs teljesen eltakarja az inket) megszűnt.

**Popover-geometria** (a `Table.Root` `ScrollArea`-levágás elleni portál-mód
igazolása — `ItemPicker.tsx` `floating="portal"`, akkor aktív, ha egy sor
`keresoMod`-ban van, pl. a fogtérképről kattintással létrehozott, még
azonosítatlan sornál):

```js
() => {
  const w = document.querySelector('[data-radix-popper-content-wrapper]');
  if (!w) return { error: 'no popper' };
  const r = w.getBoundingClientRect();
  const opts = [...w.querySelectorAll('*')].filter(el => el.textContent.trim() && !el.children.length);
  const first = opts[0];
  const or = first && first.getBoundingClientRect();
  const hit = or && document.elementFromPoint(or.left + or.width / 2, or.top + or.height / 2);
  return {
    nonZero: r.width > 0 && r.height > 0,
    inViewport: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth,
    hitInsideWrapper: hit ? w.contains(hit) : null, // a valódi levágás/eltakarás-teszt
  };
}
```
