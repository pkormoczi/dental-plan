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

**A blob URL `fetch`-elése a CSP miatt tiltott** (`connect-src 'self' data:` — a `blob:` séma
szándékosan nincs benne; a konzolban „Refused to connect … Content Security Policy” jelenik meg,
ami a snippet hibája, nem az appé). Ehelyett a `Blob` objektumot kell elkapni a létrejöttekor:
`navigate_page` az `#/elonezet`-re **`initScript`-tel** (a piszkozat a `localStorage`-ban van,
az előnézet újrarenderel):

```js
// navigate_page → initScript (minden más script előtt fut, friss dokumentumon)
window.__dp = { blobs: [], created: [], revoked: [], clicks: [] };
const co = URL.createObjectURL, re = URL.revokeObjectURL, ac = HTMLAnchorElement.prototype.click;
URL.createObjectURL = function (b) { const u = co.call(URL, b); window.__dp.blobs.push(b); window.__dp.created.push(u); return u; };
URL.revokeObjectURL = function (u) { window.__dp.revoked.push(u); return re.call(URL, u); };
HTMLAnchorElement.prototype.click = function () { window.__dp.clicks.push(this.href); return ac.call(this); };
```

majd a „Véglegesítés és mentés” gomb megjelenése (`wait_for`) után:

```js
async () => {
  const pdfs = window.__dp.blobs.filter(b => b && b.type === 'application/pdf');
  const b = pdfs[pdfs.length - 1];
  if (!b) return { error: 'no pdf blob captured', types: window.__dp.blobs.map(x => x && x.type) };
  const buf = await b.arrayBuffer();
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

### Oldalankénti `/Resources /Font` — ez a riasztás kritériuma

A puszta `hasHelvetica` substring KEVÉS: a `PDFFont.finalize()` korán kilép
`dictionary == null` esetén, tehát egy sosem hivatkozott font ki sem íródik — ha a
substring mégis megjelenik, az azt jelenti, hogy egy oldal `/Resources /Font` szótára
ténylegesen hivatkozik rá, vagyis egy szövegfutam a pdfkit alapértelmezésére esett vissza.

```js
// ugyanabban az evaluate_script-ben, a `raw` fölött
const objDict = {};
for (const m of raw.matchAll(/(\d+)\s+0\s+obj\s*([\s\S]*?)\s*(?:stream\r?\n|endobj)/g)) objDict[m[1]] = m[2];
const fontObj = {};
for (const [id, d] of Object.entries(objDict)) {
  if (!/\/Type\s*\/Font/.test(d)) continue;
  const bf = /\/BaseFont\s*\/([^\s\/>\]]+)/.exec(d);
  if (bf) fontObj[id] = bf[1];
}
const oldalak = [];
for (const [id, d] of Object.entries(objDict)) {
  if (!/\/Type\s*\/Page[^s]/.test(d)) continue;
  const ind = /\/Resources\s+(\d+)\s+0\s+R/.exec(d);  // a Resources INDIREKT hivatkozás
  const res = ind ? objDict[ind[1]] : d;
  const fd = /\/Font\s*<<([\s\S]*?)>>/.exec(res);
  oldalak.push({ oldal: id, fontok: fd ? [...fd[1].matchAll(/\/([\w+.-]+)\s+(\d+)\s+0\s+R/g)].map(r => fontObj[r[2]]) : [] });
}
return oldalak.filter(o => o.fontok.some(f => /Helvetica/.test(f)));  // VÁRT: üres tömb
```

**Várt érték:** üres tömb; `allBaseFonts` kizárólag a két NotoSans-subset
(`XXXXXX+NotoSans-Regular`, `XXXXXX+NotoSans-SemiBold`), `hasHelvetica: false`.
**Riasztás:** bármelyik oldal Helveticára hivatkozik. Ilyenkor a bűnös szövegfutam a
content stream-ben kereshető: dekompresszáld az oldal `/Contents` stream-jét
(`DecompressionStream('deflate')`, a hosszt a `/Length`-ből vedd), és keresd a
glyph nélküli `BT … /F<n> … Tf … ET` blokkot. A 2026-09-08-i menetben ez egy `Text`-en
BELÜLI sortörés volt (`{'\n'}` gyerek ÉS a stringbe írt `\n` egyaránt) — a react-pdf a
sortörést önálló, glyph nélküli futamként rendereli, ami a pdfkit alapértelmezésére vált.
Több sor = több `Text`; a vitest-oldali őr: `pdf/TervDocument.test.tsx` „egyetlen
nyomtatvány-szövegcsomópont sem tartalmaz sortörést".

**Fontos:** `@react-pdf/renderer` (pdfkit) klasszikus, tömörítetlen xref-táblát és
objektum-szótárakat ír (csak content stream-ek és font fájlok Flate-tömörítettek) —
ezért a nyers regex-vizsgálat megbízható. Ha egy jövőbeli verzió object stream-eket
(`/Type /ObjStm`) vagy cross-reference stream-et (`/Type /XRef`) vezetne be, az
`objStmCount` már nem nulla, és a `/BaseFont`/`/FontFile2` számlálás megbízhatatlan —
ezt ellenőrizd, mielőtt „X font nincs beágyazva” következtetést vonsz le.

## Placeholder-zár valós bájtokon

`docs/PRODUCT.md § A nyomtatvány szerződéses dokumentum`: placeholder-jelölésű nyilatkozat
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

Ugyanaz az `initScript`, mint fent (friss betöltésen, egyszer — lásd `SKILL.md`). A
letöltés-gomb kattintása után (async flow esetén várj ~300–400 ms-et egy második
`evaluate_script`-ben — a `downloadVersion`-szerű handlerek `await loadPlanPdf(...)`-ot
futtatnak a blob létrehozása előtt):

```js
async () => {
  await new Promise(r => setTimeout(r, 400));
  const d = window.__dp;
  return { created: d.created.length, revoked: d.revoked.length, clicks: d.clicks,
    external: d.created.concat(d.clicks).filter(u => !/^blob:http:\/\/localhost:\d+\//.test(u)) };
}
```

Várt: `external` üres (semmilyen nem-localhost URL). Az előnézet „Letöltés” gombja sima
`<a href="blob:…" download>` link — ott a `clicks` üres marad (nincs script-kattintás), a
verzió-oldali letöltésnél 1× `click`.
