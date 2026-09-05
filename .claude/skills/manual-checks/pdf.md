# Szelet: `pdf` — fontok, ő/ű, placeholder-zár, fogtérkép A/B, letöltés

Minden snippet ténylegesen lefutott és bizonyítottan működik (2026-08-10-i menet). A
protokoll (reset, instrumentálás, schemák) a `SKILL.md`-ben. Becsült idő: ~15 perc.

Szcenárió: reset → `#/paciens` glyph-próba név (pl. `Tőkés Ödönné`) → `#/terv` sor
`ő`/`ű`-vel (pl. `Gyökérkezelés felső őrlőfogon`), fogszámmal → `#/elonezet`.

## Fontok ténylegesen letöltődtek-e

A PDF fontja a NotoSans (`app/src/pdf/fonts.ts`) — a Helvetica nem tud ő/ű, és a hiba
csak a PDF-en látszik (`app/src/pdf/CLAUDE.md`).

```js
() => performance.getEntriesByType('resource')
  .filter(e => /NotoSans/i.test(e.name))
  .map(e => ({ name: e.name.split('/').pop(), encodedBodySize: e.encodedBodySize }))
```

## A PDF nyers bájtjai

A blob same-origin, `fetch`-elhető a page kontextusból:

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

**Fontos:** `@react-pdf/renderer` (pdfkit) klasszikus, tömörítetlen xref-táblát és
objektum-szótárakat ír (csak content stream-ek és font fájlok Flate-tömörítettek) —
ezért a nyers regex-vizsgálat megbízható. Ha egy jövőbeli verzió object stream-eket
(`/Type /ObjStm`) vagy cross-reference stream-et (`/Type /XRef`) vezetne be, az
`objStmCount` már nem nulla, és a `/BaseFont`/`/FontFile2` számlálás megbízhatatlan —
ezt ellenőrizd, mielőtt „X font nincs beágyazva” következtetést vonsz le.

## Placeholder-zár valós bájtokon

`PRODUCT.md § A nyomtatvány szerződéses dokumentum`: placeholder-jelölésű nyilatkozat
mellett a nyilatkozat+aláírás oldal nem kerülhet PDF-be. A Beállításokban írj
`[PLACEHOLDER` törzsű nyilatkozatot a terv nyelvén, mentsd, térj vissza az előnézetre,
és hasonlítsd össze a `pageCount`-ot előtte/utána (3 → 2 várt).

## Fogtérkép A/B

Egy terv `fogak`-kal → `imageXObjects` nő, a screenshot mutatja a színezett térképet;
ugyanaz a terv fogak nélkül (a „Fog” mező törölve — ELÉ kattints és
`Ctrl+A`+`Backspace`+`Tab`; egy üres `fill()` NEM biztos, hogy commitolja a törlést
egy controlled inputon) → a térkép és az „Érintett fogak” cím teljesen hiányzik, az
összesítő teljes szélességet kap.

## Glyphek vizuálisan

`take_screenshot` — a PDF PDFium out-of-process frame-ben renderel, nincs
`contentDocument`/szövegréteg; a képet az ügynök közvetlenül olvassa. Az ő/ű a
páciensnévben és a tételnévben egyaránt látszódjon.

## Letöltés-instrumentálás

Csak friss oldalbetöltés után (lásd `SKILL.md`):

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

majd a letöltés-gomb kattintása után (async flow esetén várj ~300–400 ms-et egy
második `evaluate_script`-ben, mielőtt `window.__dp`-t olvasod — a
`downloadVersion`-szerű handlerek `await loadPlanPdf(...)`-ot futtatnak a blob
létrehozása előtt). Várt: 1× `createObjectURL`, 1× `click`, `blob:` href, semmilyen
külső URL.
