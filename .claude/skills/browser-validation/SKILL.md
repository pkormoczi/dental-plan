---
name: browser-validation
description: Manual, periodic verification of the app in a real (isolated) Chrome via chrome-devtools MCP — the layer jsdom structurally cannot cover: computed-style contrast/borders, real PDF bytes and font embedding, canvas→PNG tooth chart, Radix popover geometry, paint-order, tab order. Produces a dated findings report and never edits application code as part of the skill itself. Invoke explicitly with /browser-validation.
disable-model-invocation: true
---

# Böngészős validáció

## Cél

A `docs/07-felulet-rendszer.md` és `docs/04-nyomtatvany-spec.md` azon szabályai,
amiket a 36 fájlos vitest-készlet **strukturálisan nem tud** ellenőrizni:

- `app/src/main.tsx` betölti a Radix Themes CSS-t és a Robotót; `app/src/test-setup.ts`
  egyiket sem, és a vitest `css: false` amúgy is kicsonkolná — **egyetlen computed
  style sem a kaszkádból származik a tesztkészletben.** Kontraszt, `controlBorder`,
  fókuszgyűrű: nulla lefedettség jsdom alatt.
- `usePDF` `vi.mock`-olt az `App.test.tsx`/`PreviewPage.test.tsx`-ben — a valódi PDF
  sosem készül el tesztben. `pdf/toothChartImage.ts` `renderToothChartPng()`
  szándékosan `null`-t ad jsdom alatt (nincs canvas 2D context) — a fogtérkép
  minden tesztben csendben hiányzik a PDF-ből.
- `test-setup.ts` stubolja a `ResizeObserver`-t és a pointer capture-t — Radix
  popover-pozicionálás, `Table.Root` `ScrollArea`-levágás nincs tesztelve.
- `paint-order` CSS tulajdonságot jsdom nem implementálja.

Ez a réteg **kézzel indított, ügynök-vezérelt, periodikus** ellenőrzés — nem e2e
teszt, nem fut CI-ban, nem helyettesíti a vitest-készletet. A meglévő tesztekhez
NEM nyúl: azok CI-t kapuzó, determinisztikus védelmek jogi-integritási
szabályokra (D4, D23, kitöltetlen sor) — a böngészős ellenőrzés kiegészíti,
nem váltja ki őket.

**Csak jelentést készít.** A kódot NEM módosítja a skill része — a javítás
külön, szándékos lépés, amit a felhasználó indít el (ugyanaz az elv, mint a
`code-and-architecture-review` skillnél).

---

## Nem tárgyalható korlát

A CLAUDE.md "Böngésző-automatizálás — nem tárgyalható" szakasza szó szerint:

> A chrome-devtools MCP KIZÁRÓLAG izolált módban futhat. TILOS a configba
> kerülnie: `--autoConnect`, `--browserUrl`, vagy `--user-data-dir` a fejlesztő
> valós Chrome profiljára mutatva. TILOS javasolni vagy megkísérelni a futó
> Chrome példányhoz csatlakozást, és tilos remote debuggingot bekapcsolni
> bármilyen böngészőben.

Ez a skill soha nem módosítja a `.mcp.json`-t, és soha nem javasol
kapcsolódást egy futó, valós Chrome-hoz. `.mcp.json` (követett, verzió-pinnelt:
`chrome-devtools-mcp@1.6.0 --isolated --headless=false`) az egyetlen
kikényszerítési pont.

**Soha ne gépelj valódi páciensadatot a böngészőbe** — csak seed/demó adat
(D2, GDPR 9. cikk). A demó adat visszaállítása lásd lent.

---

## Protokoll

### Dev szerver

```
cd app && npm run dev
```

A tényleges URL-t a szerver kimenetéből olvasd (Vite 5174+-ra léphet, ha az
5173 foglalt). A `base: '/dental-plan/'` (vite.config.ts) + `HashRouter` miatt
minden route `http://localhost:<port>/dental-plan/#/<route>` alakú:

`#/`, `#/paciens`, `#/terv`, `#/elonezet`, `#/demo/tervek`, `#/arlista`, `#/beallitasok`.

A production build (`npm run build && npm run preview`, port 4173) szükséges,
ha a lazy-loadolt `PreviewPage` chunk (~1,45 MB, `@react-pdf/renderer`) valódi
méretét/betöltési idejét akarod vizsgálni — dev módban Vite ESM-modulokat
szolgál ki egyenként, nem egy nagy chunkot.

### Determinisztikus reset — KRITIKUS gotcha

**Ne a Home gombjait kattintsd** (kattintás + `AlertDialog` megerősítés =
törékeny). Helyette:

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

**Miért két lépés, nem egy `navigate_page` közvetlenül ugyanarra az URL-re:**
ezt a menetben empirikusan tévesen feltételeztem, hogy `navigate_page`
ugyanarra a hash-URL-re mindig teljes újratöltést kényszerít. **Nem igaz.**
Ha a böngésző már az adott URL-en van, a `navigate_page` ugyanarra az URL-re
egy no-op SPA-szempontból — a React app életben marad, a `StorageProvider`
`useMemo`-ja nem fut le újra, tehát a `DemoStorage.init()` nem veti vissza a
törölt seed adatot. Az `about:blank` közbeiktatása garantáltan más URL-ről más
URL-re navigál, ami mindig valódi, teljes újratöltést vált ki (megerősítve:
`list_network_requests` az összes JS modult újra lekéri). Anélkül a
`localStorage` üres marad, és rossz negatív eredményt kapsz (mintha a
`resetDemoData()` nem működne).

Reset **minden szcenárió előtt**, nem csak a menet elején.

### Instrumentálás (monkey-patch) — csak friss oldalbetöltés után

Ha `URL.createObjectURL`/`revokeObjectURL`/`HTMLAnchorElement.prototype.click`
felülírásával figyelsz eseményeket (letöltés-teszt), **mindig közvetlenül egy
teljes újratöltés (a fenti about:blank trükk) UTÁN** tedd, és **soha ne
futtasd újra ugyanazt az instrumentáló szkriptet egy nem újratöltött SPA-n
belül.** Ha mégis megteszed, a régi wrapper a régi `window.__dp`-t zárja be
closure-ként, és a második réteg ráépül az elsőre — hamis "duplikált hívás"
jelet ad (ez pontosan megtörtént ebben a menetben: a letöltés-instrumentálás
első futtatása 2×-ös `createObjectURL`/`click`-et mutatott, ami a saját
rétegződésem műterméke volt, nem valódi app-hiba; friss oldalbetöltés után a
mérés egyértelműen 1×-öt adott).

### Viewport

1440×900 (rendelői laptop) a fő menethez, 1280×720 kiegészítésként a
popover-levágás ellenőrzéséhez.

### `evaluate_script` — pontos schema

```
{ function: string, args?: string[] /* elem-uid-k a snapshotból, NEM tetszőleges JS érték */, filePath?: string, dialogAction?: string }
```

A visszatérési érték legyen kicsi és JSON-serializálható — **csak a
szabálysértéseket add vissza**, sose teljes elem-listát.

### `wait_for` — pontos schema

`text` egy **tömb**, nem string: `{ text: string[], timeout?: number }`. Bármelyik
érték megjelenésekor felold.

### `emulate` — a tényleges képességi felület

Nincs `prefers-reduced-motion` (vagy bármilyen CSS media-feature) emuláció —
csak `colorScheme` (`dark`/`light`/`auto`), `cpuThrottlingRate`,
`networkConditions` (enum: `Offline`/`Slow 3G`/`Fast 3G`/`Slow 4G`/`Fast 4G`),
`geolocation`, `userAgent`, `viewport`. A `docs/07` `prefers-reduced-motion`
szabálya emiatt **nem ellenőrizhető** ezzel az eszközzel — ne próbáld
megkerülni, jelezd "nem ellenőrizhető"-ként.

### Tranziens állapotok (loading skeleton stb.) screenshotolása — strukturális korlát

A `navigate_page` és a `click` MCP-tool mindkettő kivárja az oldal
"megnyugvását", mielőtt visszaadja az irányítást — emiatt egy genuinely
köztes betöltési állapot (pl. Suspense fallback egy lassú chunk alatt) **nem
kapható el megbízhatóan screenshottal**, még `networkConditions` fojtással
sem. Ha egy skeleton/loading-állapot helyességét kell igazolni, tedd
forráskód-szinten (a végleges elrendezéssel egyező méretű `Skeleton`
komponens, lásd `pages/demo/OsszesTervSection.tsx` `HistorySkeleton`
mintáját) és a
vitest-készleten keresztül, ne várj rá screenshot-bizonyítékot.

### Konzol

Minden szcenárió végén `list_console_messages` — bármely React hiba/
figyelmeztetés önmagában találat. Ha valami gyanús (pl. "Buffer is not
defined"), `get_console_message`-mel nézd meg a teljes stack-et, de tartsd
szem előtt, hogy egy generikus `at (client:529:4)` jellegű stack Vite saját
wrappere, nem a valódi forrás — a végső ítélethez a PDF-bájt- vagy
képernyőkép-bizonyíték számít, nem a puszta warning jelenléte.

---

## Menetek

1. **Kontraszt / `controlBorder` / fókuszgyűrű** — legmagasabb várható hozam
   (a lefedettség ma szó szerint nulla), legalacsonyabb koreográfia (route-
   onként egy `evaluate_script`). Lásd `checklist.md` "1. Kontraszt".
2. **PDF-menet** — fontok, ő/ű glyphek, D23 placeholder-zár valódi bájtokon,
   fogtérkép A/B, letöltés-instrumentálás. Lásd `checklist.md` "2. PDF".
3. **Billentyűzet + geometria** — a kritikus tételfelvitel-ciklus (3×, egér
   nélkül), Escape, Tab-sorrend (fogtérkép egy stop, csukva nulla),
   popover-geometria, `paint-order:stroke`. Lásd `checklist.md` "3. Billentyűzet".

### Kadencia

| Ha ehhez nyúltál | Futtasd |
|---|---|
| `app/src/pdf/**`, `design/toothChartSvg.ts`, fontok | PDF-menet |
| `design/tokens.ts`, bármi stílus, új Radix komponens | Kontraszt-menet |
| `ItemPicker.tsx`, `ToothPickerPopover.tsx`, `DentalChart.tsx` | Billentyű + geometria |
| Mielőtt megmutatod a dokinak | Mindegyiket |

Soha nem commitonként, soha nem automatikusan.

---

## Kimenet

`docs/reviews/YYYY-MM-DD-browser-validation.md`, a `code-and-architecture-review`
skill konvenciója szerint (`Kritikus`/`Közepes`/`Apró` súlyosság). Átmeneti
munkatermék: a valódi találatok átvándorolnak a `backlog/BACKLOG.md`-be, utána
a jelentés törölhető.

Ha egy találat **egyértelmű, kicsi, célzott** `docs/07`/`docs/04` szabálysértés
(pl. egy loading-állapot szöveg helyett skeletont igényel egy-két
call site-on) — javítható a menet részeként, `npm test` + `tsc -b` + `oxlint`
zöld eredménnyel igazolva. Ha egy találat **rendszerszintű** (sok fájlt/az
egész appot érintő vizuális identitás-döntés, pl. "minden Radix Button kapjon-e
keretet", vagy egy upstream könyvtár font-feloldási hibája) — NE javítsd
autonóm módon, csak jelentsd, és kérdezd meg a felhasználót, mielőtt egy
ilyen döntést meghoznál helyette.

---

## Nem ellenőrizhető (ne próbáld megkerülni)

| Nem ellenőrizhető | Miért | Alternatíva |
|---|---|---|
| Pixelek/szöveg a PDF iframe-en belül | PDFium OOPIF; nincs `contentDocument`, nincs szövegréteg | `take_screenshot` + vizuális ellenőrzés; a PDF nyers bájtjainak `fetch`-elése a blob URL-ről (same-origin) |
| A letöltött fájl tényleges lemezre kerülése | Izolált profil, nincs download-inspection tool | Az anchor/blob hívások in-page instrumentálása kattintás előtt (fájlnév-szerződés, URL-szivárgás) |
| `prefers-reduced-motion` | Az `emulate` tool nem támogat CSS media-feature emulációt | Jelezd "nem ellenőrizhető"-ként |
| Tranziens betöltési állapot screenshotja | `navigate_page`/`click` kivárja a megnyugvást | Forráskód-szintű igazolás (lásd fent) |
| Valós profil, bejelentkezett munkamenet, korábban megadott mappa-engedély | Izolációs szabály | Ne kerüld meg; jelezd, hogy nem megy, javasolj `PlanStorage` teszt-implementációt |

Lásd `checklist.md` a bizonyított `evaluate_script` snippetekért hiányonként.
