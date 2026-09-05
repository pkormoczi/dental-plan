---
name: manual-checks
description: Manual verification of the app in a real (isolated, headless) Chrome via chrome-devtools MCP — the layer jsdom structurally cannot cover — split into three slices by trigger: pdf (real PDF bytes, font embedding, tooth-chart PNG, download), visual-css (computed-style contrast, controlBorder, focus ring, skeleton), keyboard-a11y (item-entry cycle, Escape, tab order, popover geometry, paint-order). Produces a dated findings report in docs/reviews and never edits application code as part of the skill itself. Invoke explicitly with /manual-checks <pdf | visual-css | keyboard-a11y | all>.
argument-hint: <pdf | visual-css | keyboard-a11y | all>
disable-model-invocation: true
---

# /manual-checks <szelet>

## Cél

Az `app/src/CLAUDE.md` (felület-rendszer), az `app/src/pdf/CLAUDE.md` és a
`PRODUCT.md § A nyomtatvány szerződéses dokumentum` azon szabályai, amiket a
vitest-készlet **strukturálisan nem tud** ellenőrizni:

- `app/src/main.tsx` betölti a Radix Themes CSS-t és a Robotót; `app/src/test-setup.ts`
  egyiket sem, és a vitest `css: false` amúgy is kicsonkolná — **egyetlen computed
  style sem a kaszkádból származik a tesztkészletben.** Kontraszt, `controlBorder`,
  fókuszgyűrű: nulla lefedettség jsdom alatt.
- `usePDF` `vi.mock`-olt az `App.test.tsx`/`PreviewPage.test.tsx`-ben — a valódi PDF
  sosem készül el tesztben. `pdf/toothChartImage.ts` `renderToothChartPng()`
  szándékosan `null`-t ad jsdom alatt (nincs canvas 2D context) — a fogtérkép minden
  tesztben csendben hiányzik a PDF-ből.
- `test-setup.ts` stubolja a `ResizeObserver`-t és a pointer capture-t — Radix
  popover-pozicionálás, `Table.Root` `ScrollArea`-levágás nincs tesztelve.
- `paint-order` CSS tulajdonságot jsdom nem implementálja.

Ez a réteg **kézzel indított, ügynök-vezérelt** ellenőrzés — nem e2e teszt, nem fut
CI-ban, nem helyettesíti a vitest-készletet. A meglévő tesztekhez NEM nyúl: azok
CI-t kapuzó, determinisztikus védelmek a szerződéses szabályokra (append-only verzió,
placeholder-zár, kitöltetlen sor) — a böngészős ellenőrzés kiegészíti, nem váltja ki.

**Csak jelentést készít.** A kódot NEM módosítja a skill része — a javítás külön,
szándékos lépés, amit a felhasználó indít (ugyanaz az elv, mint a
`code-and-architecture-review` skillnél). Kivétel lent, a „Kimenet” alatt.

Feature-specifikus, egyszeri ellenőrzés NEM ide való: az az aktív plan `Verification`
szakaszában él, és a plannel együtt tűnik el. Ide csak stabil, ismétlődő vakfolt kerül.

---

## Nem tárgyalható korlát

A root `CLAUDE.md` „Böngésző-automatizálás — nem tárgyalható” szakasza: a
chrome-devtools MCP KIZÁRÓLAG izolált módban futhat. TILOS a configba `--autoConnect`,
`--browserUrl`, vagy `--user-data-dir` a fejlesztő valós Chrome-profiljára. TILOS futó
Chrome-hoz csatlakozni vagy remote debuggingot bekapcsolni bármilyen böngészőben.

Ez a skill soha nem módosítja a `.mcp.json`-t (követett, verzió-pinnelt:
`chrome-devtools-mcp@1.6.0 --isolated --headless=true` — az egyetlen kikényszerítési
pont), és soha nem javasol kapcsolódást futó, valós Chrome-hoz.

**Soha ne gépelj valódi páciensadatot a böngészőbe** — csak seed/demó adat
(`PRODUCT.md § Adat- és deployment-korlátok`, GDPR 9. cikk). A demó adat
visszaállítása lent.

---

## Szeletek és kadencia

| Szelet | Fájl | Mit fed | Becsült idő* |
|---|---|---|---|
| `pdf` | `pdf.md` | NotoSans letöltés/beágyazás valós PDF-bájtokon, ő/ű glyphek, placeholder-zár oldalszámmal, fogtérkép A/B (`imageXObjects`), letöltés-instrumentálás | ~15 perc |
| `visual-css` | `visual-css.md` | accent-mint-szövegszín, szövegkontraszt, `controlBorder` + a 3 nevesített kivétel, fókuszgyűrű, route-onként | ~10 perc |
| `keyboard-a11y` | `keyboard-a11y.md` | tételfelvitel-ciklus ×3 egér nélkül, egyedi sor, Escape, fogtérkép egy Tab-stop, `paint-order`/fókusz-kurzor, popover-geometria | ~10 perc |

\* A 2026-08-10-i teljes menet alapján becsülve; minden jelentés végén rögzítsd a
tényleges időt, és ha egy szelet tartósan 15 perc fölé nő, bontsd tovább — a
70 tételes, senki által nem futtatott checklist a kerülendő végállapot.

**Melyik változás melyik szeletet kéri:**

| Ha ehhez nyúltál | Szelet |
|---|---|
| `app/src/pdf/**`, `design/toothChartSvg.ts`, `assets/fonts/**` | `pdf` |
| `design/tokens.ts`, `index.css`, bármi stílus, új Radix komponens/variáns | `visual-css` |
| `pages/planEditor/ItemPicker.tsx`, `ToothPickerPopover.tsx`, `DentalChart.tsx`, fókusz-/Tab-kezelés, `motion.ts` | `keyboard-a11y` |
| Mielőtt megmutatod a dokinak | `all` |

Soha nem commitonként, soha nem automatikusan. A `/finish` a plan `Verification`
bejelölt szelete szerint hívja.

---

## Protokoll (minden szeletre)

### Dev szerver

```
cd app && npm run dev
```

A tényleges URL-t a szerver kimenetéből olvasd (Vite 5174+-ra léphet, ha az 5173
foglalt). A `base: '/dental-plan/'` (vite.config.ts) + `HashRouter` miatt minden route
`http://localhost:<port>/dental-plan/#/<route>` alakú:
`#/`, `#/paciens`, `#/terv`, `#/elonezet`, `#/demo/tervek`, `#/arlista`, `#/beallitasok`.

A production build (`npm run build && npm run preview`, port 4173) kell, ha a
lazy-loadolt `PreviewPage` chunk (~1,45 MB, `@react-pdf/renderer`) valódi
méretét/betöltési idejét vizsgálod — dev módban Vite ESM-modulokat ad ki egyenként.

### Determinisztikus reset — KRITIKUS gotcha

**Ne a Home gombjait kattintsd** (kattintás + `AlertDialog` megerősítés = törékeny).
Helyette:

```js
// evaluate_script
() => {
  Object.keys(localStorage).filter(k => k.startsWith('dp:')).forEach(k => localStorage.removeItem(k));
  return 'cleared';
}
```

majd **teljes újratöltés két lépésben**:

```
navigate_page → "about:blank"
navigate_page → "http://localhost:<port>/dental-plan/#/"
```

Miért két lépés: `navigate_page` ugyanarra a hash-URL-re SPA-szempontból no-op — a
React app életben marad, a `StorageProvider` `useMemo`-ja nem fut újra, a
`DemoStorage.init()` nem veti vissza a törölt seedet. Az `about:blank` közbeiktatása
garantáltan teljes újratöltést vált ki (megerősítve: `list_network_requests` minden JS
modult újra kér). Anélkül hamis negatívot kapsz (mintha a `resetDemoData()` nem
működne). Reset **minden szcenárió előtt**, nem csak a menet elején.

### Instrumentálás (monkey-patch) — csak friss oldalbetöltés után

Ha `URL.createObjectURL`/`revokeObjectURL`/`HTMLAnchorElement.prototype.click`
felülírásával figyelsz eseményeket, **mindig közvetlenül egy teljes újratöltés UTÁN**
tedd, és **soha ne futtasd újra ugyanazt az instrumentáló szkriptet egy nem
újratöltött SPA-n belül** — a második réteg az elsőre épül, és hamis „duplikált hívás”
jelet ad (ez megtörtént: 2× `createObjectURL`/`click` a saját rétegződés műterméke
volt; friss betöltés után egyértelműen 1×).

### Viewport

1440×900 (rendelői laptop) a fő menethez, 1280×720 kiegészítésként a popover-levágás
ellenőrzéséhez.

### `evaluate_script` — pontos schema

```
{ function: string, args?: string[] /* elem-uid-k a snapshotból, NEM tetszőleges JS érték */, filePath?: string, dialogAction?: string }
```

A visszatérési érték legyen kicsi és JSON-serializálható — **csak a szabálysértéseket
add vissza**, sose teljes elem-listát.

### `wait_for` — pontos schema

`text` egy **tömb**, nem string: `{ text: string[], timeout?: number }`. Bármelyik érték
megjelenésekor felold.

### `emulate` — a tényleges képességi felület

Nincs `prefers-reduced-motion` (vagy bármilyen CSS media-feature) emuláció — csak
`colorScheme`, `cpuThrottlingRate`, `networkConditions`
(`Offline`/`Slow 3G`/`Fast 3G`/`Slow 4G`/`Fast 4G`), `geolocation`, `userAgent`,
`viewport`. Az `app/src/CLAUDE.md` `prefers-reduced-motion` szabálya emiatt **nem
ellenőrizhető** ezzel az eszközzel — ne kerüld meg, jelezd „nem ellenőrizhető”-ként.

### Tranziens állapotok (loading skeleton stb.) — strukturális korlát

A `navigate_page` és a `click` kivárja az oldal „megnyugvását” — egy köztes betöltési
állapot (Suspense fallback egy lassú chunk alatt) **nem kapható el megbízhatóan
screenshottal**, `networkConditions` fojtással sem. A skeleton helyességét forráskód-
szinten (a végleges elrendezéssel egyező méretű `Skeleton`, lásd
`pages/demo/OsszesTervSection.tsx` `HistorySkeleton`) és a vitest-készleten át igazold.

### Konzol

Minden szcenárió végén `list_console_messages` — bármely React hiba/figyelmeztetés
önmagában találat, és **bármely CSP-sértés is** (az `index.html` CSP-je a „páciensadat
nem hagyja el a gépet” gépi alakja). Gyanús üzenetnél `get_console_message` a teljes
stackhez; egy generikus `at (client:529:4)` stack Vite saját wrappere, nem a forrás —
a végső ítélethez a PDF-bájt- vagy képernyőkép-bizonyíték számít.

---

## Kimenet

`docs/reviews/YYYY-MM-DD-manual-checks-<szelet>.md` (az `all` egy fájlba, szeletenként
szakaszolva), a `code-and-architecture-review` konvenciója szerint
(`Kritikus`/`Közepes`/`Apró`). A végén: futásidő percben. Átmeneti munkatermék: a
valódi találatok a `backlog/BACKLOG.md`-be vándorolnak, utána a jelentés törölhető.

Ha egy találat **egyértelmű, kicsi, célzott** felület-szabály-sértés (pl. egy
loading-állapot szöveg helyett skeletont igényel egy-két call site-on) — javítható a
menet részeként, `npm test` + `tsc -b` + `oxlint` zöld eredménnyel igazolva. Ha
**rendszerszintű** (sok fájlt/az egész appot érintő vizuális döntés, vagy egy upstream
könyvtár hibája) — NE javítsd autonóm módon; jelentsd, és kérdezd meg a felhasználót.

---

## Nem ellenőrizhető (ne próbáld megkerülni)

| Nem ellenőrizhető | Miért | Alternatíva |
|---|---|---|
| Pixelek/szöveg a PDF iframe-en belül | PDFium OOPIF; nincs `contentDocument`, nincs szövegréteg | `take_screenshot` + vizuális ellenőrzés; a PDF nyers bájtjainak `fetch`-elése a blob URL-ről (same-origin) |
| A letöltött fájl tényleges lemezre kerülése | Izolált profil, nincs download-inspection tool | Az anchor/blob hívások in-page instrumentálása kattintás előtt (fájlnév-szerződés, URL-szivárgás) |
| `prefers-reduced-motion` | Az `emulate` tool nem támogat CSS media-feature emulációt | Jelezd „nem ellenőrizhető”-ként |
| Tranziens betöltési állapot screenshotja | `navigate_page`/`click` kivárja a megnyugvást | Forráskód-szintű igazolás (lásd fent) |
| Valós profil, bejelentkezett munkamenet, korábban megadott mappa-engedély | Izolációs szabály | Ne kerüld meg; jelezd, hogy nem megy, javasolj `PlanStorage` teszt-implementációt |

A bizonyított `evaluate_script` snippetek a szelet-fájlokban.
