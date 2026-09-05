# Szelet: `keyboard-a11y` — tételfelvitel-ciklus, Escape, Tab-sorrend, fogtérkép, geometria

Minden snippet ténylegesen lefutott és bizonyítottan működik (2026-08-10-i menet). A
protokoll a `SKILL.md`-ben; a szabályok forrása az `app/src/CLAUDE.md` („Amit soha”,
„Akadálymentesség”). Becsült idő: ~10 perc.

## A kritikus ciklus

`app/src/CLAUDE.md` Amit soha: a tételfelvitel ciklusát eltörni (gépel → ↑↓ → Enter →
kereső ürül, fókusz marad) — ez az Excel elleni fő előny. 3× egymás után, egér nélkül:
`type_text` → `wait_for` (tömb!) → `press_key ArrowDown` → `press_key Enter` →
ellenőrzés:

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

**Egyedi sor** (nulla találat → Enter): ugyanaz a ciklus egy nem létező tétel nevével;
ellenőrizd, hogy létrejött-e egy `egyedi` jelöléssel ellátott sor a beírt névvel.

**Escape:** kereső megnyitva (van szöveg + popover), `press_key Escape`, utána
`value === ''`, a popover zárva, a fókusz a keresőn marad.

## Fogtérkép — egy Tab-stop

```js
() => ({ chartInDom: !!document.querySelector('[role="toolbar"]') })
```

Csukott panel mellett várt `false` (nem CSS-sel rejtett, ténylegesen hiányzik a
DOM-ból). Nyitott panelnél:

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

## `paint-order: stroke` (jsdom nem implementálja)

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

`.is-active` a plan-szintű (`role="toolbar"`) módban ÉS a soronkénti
`ToothPickerPopover` (`role="listbox"`) módban is létrejön (nyíllal mozgó kurzor) — a
kurzort nem a `.tooth-fill` saját stroke-ja adja, hanem két külön, a fókuszált fog
csoportjába injektált `<path>` (fehér `.tooth-kurzor-kontraszt` + ink `.tooth-kurzor`,
lásd `design/toothChartSvg.ts` `injectFocusCursor()`), és csak billentyűzet-fókuszban
(`:focus-visible`) látszik. `.is-picked` mindkét `szerep`-ben létrejöhet: a soronkénti
`ToothPickerPopover`-ben ÉS a Terv részletei plan-szintű, `selectedTeeth`-tel hívott
térképén is.

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

Tab a fogtérképre, majd ugyanez a lekérdezés: `wrapperOutlineWidth` `2px`-re vált, a
kurzor `display`-je `inline`-ra; egérrel egy fogra kattintva a kurzor visszavált
`none`-ra (a wrapper `:focus-visible`, nem `:focus`).

**Vonalvastagság mindkét megjelenített szélességen** (a `vector-effect:
non-scaling-stroke` miatt a mért CSS-pixel értéknek a 340 px-es popoverben és a
480 px-es panelekben egyeznie kell):

```js
() => {
  const kurzor = document.querySelector('.tooth-kurzor');
  const bbox = kurzor.getBoundingClientRect();
  return { strokeWidthPx: getComputedStyle(kurzor).strokeWidth, bboxWidth: bbox.width };
}
```

**Kombinált eset** (egy fog egyszerre `is-active` ÉS `is-picked` — a
`ToothPickerPopover`-ben egy MÁR kijelölt fogra lépve gyakori): a `paint-order` snippet
mindhárom rétegét (`kurzorStroke`/`kontrasztStroke`/`pickedStroke`) egy ilyen fogon
lekérdezve mindháromnak nem-`undefined` computed style-t kell adnia — a régi, forrás-
sorrend szerinti elnyomás (a narancs eltakarja az inket) megszűnt.

## Popover-geometria

A `Table.Root` `ScrollArea`-levágás elleni portál-mód igazolása — `ItemPicker.tsx`
`floating="portal"`, akkor aktív, ha egy sor `keresoMod`-ban van (pl. a fogtérképről
kattintással létrehozott, még azonosítatlan sornál). 1280×720-on is:

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

## Tab-sorrend és Escape általában

- Tab-sorrend a `#/terv` lapon: kereső → sorok mezői → fogtérkép (egy megálló) →
  gombsor; nincs fókuszcsapda, nincs `tabindex > 0`.
- Escape minden dialógust/popovert zár, a fókusz a megnyitó elemre tér vissza.
- `prefers-reduced-motion`: nem ellenőrizhető ezzel az eszközzel (lásd `SKILL.md`) —
  „nem ellenőrizhető”-ként jelentsd, ne kerüld meg.
