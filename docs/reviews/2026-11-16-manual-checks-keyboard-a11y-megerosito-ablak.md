# manual-checks — `keyboard-a11y` szelet, 2026-11-16 (megerősítő ablak)

Kiváltó: `/implement megerosito-ablak-aria-hidden-figyelmeztetes` 2d lépése. A tétel a
`review:2026-11-16-manual-checks-keyboard-a11y#2` „Blocked aria-hidden” figyelmeztetését javította:
az „Új páciens” dialógus zárás utáni fókuszcélt kapott (`app/src/pages/paciensek/UjPaciensDialog.tsx`
`zarasFokuszCel`), az Új terv lap pedig a saját, képkockával késleltetett keresőfókusza helyett ezt
használja (`app/src/pages/NewPlanPage.tsx`).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5174/dental-plan/`), 1440×900, seed demó adat, determinisztikus reset a menet
elején. A szelet a `manual-checks-keyboard-szelet-leiras` tétellel frissített leírás szerint futott.
Futásidő: ~20 perc.

## A tételhez tartozó ellenőrzés — rendben

**Az ok pontosítása.** A javítás előtti reprodukció szerint a figyelmeztetés nem a megerősítő ablak
megnyitásakor jelenik meg, hanem már a quick-create ablak elvetésekor („Bezárás, a begépelt adat
elvetésével”): a lap egy képkockával a zárás után a keresőmezőre tette a fókuszt, miközben a
bezáródó dialógus a záró animációja alatt még rejtettnek jelölte a `#root`-ot. A keresőmezőből
Enterrel vagy kattintással nyitott megerősítés önmagában nem adott figyelmeztetést.

| Út (`#/uj-terv`, mentetlen piszkozattal), a javítás után | Eredmény |
|---|---|
| „+ Új páciens” → megerősítés → név gépelése → Escape → „Bezárás, a begépelt adat elvetésével” | ✅ nincs figyelmeztetés; a fókusz a keresőn, a `#root` nem rejtett, nincs nyitott dialógus |
| Ezután „+ Új páciens” | ✅ a megerősítés megkapja a fókuszt; Escape után a fókusz a „+ Új páciens” gombon |
| Megerősítés → quick-create gépelés nélkül → Escape | ✅ a fókusz a keresőn, nincs figyelmeztetés |
| A keresőből nem létező név + Enter (billentyűs út) | ✅ a megerősítés megkapja a fókuszt, nincs figyelmeztetés |
| `#/paciensek` „+ Új páciens” → Escape (a dialógus fókuszcél nélkül) | ✅ nincs figyelmeztetés; a fókusz a lap törzsére esik, lásd 1. megállapítás |

Konzol a teljes menetben: 0 hiba, 0 figyelmeztetés.

## Járulékos, ugyanebben a menetben igazolt viselkedés — rendben

- Tételfelvitel-ciklus a frissített leírás szerint (Enter, nincs `ArrowDown`) 3× egér nélkül:
  „Élpótlás”, „Esztétikus tömés 1 felszín”, „Esztétikus tömés 2 felszín” — mindhárom a teljes
  katalógus-névvel, `egyedi` jelölés nélkül került be, megállt a Fog mezőn, majd az üres keresőn.
- Egyedi sor (`xyz-nincs-ilyen`): `egyedi` jelöléssel, a beírt névvel, megáll a Fog mezőn.
- Fogszámot nem kívánó tétel („Konzultáció/fél óránként”): egy Enter után az üres kereső.
- Escape a keresőn (van szöveg, látható lista): a mező kiürül, a lista eltűnik, a fókusz a keresőn.
- Fogtérkép: csukva nincs a DOM-ban; nyitva `role="toolbar"`, `tabIndex` 0, 32 fog, 0 önálló
  Tab-megálló; Tab-bal rálépve `outline-style: solid`, a kurzor `display: inline`.
- `prefers-reduced-motion`: nem ellenőrizhető ezzel az eszközzel.

## Kritikus

Nincs.

## Közepes

Nincs.

## Apró

### 1. A Páciensek lapon az „Új páciens” ablak bezárása után a fókusz a lap törzsére esik

Érintett: `app/src/pages/PaciensekPage.tsx`, `app/src/pages/paciensek/UjPaciensDialog.tsx`. Repro:
`#/paciensek` → „+ Új páciens” → Escape: a dialógus bezárul, a `document.activeElement` a `<body>`. A
dialógus záráskori automatikus fókuszát letiltja, a Páciensek lap pedig nem ad meg fókuszcélt (az Új
terv lap a most bevezetett `zarasFokuszCel`-lel a keresőt adja). Billentyűvel dolgozva a következő
Tab a lap elejéről indul. A módosítás előtt is így volt.
- Döntés: backlog paciensek-uj-paciens-zaras-fokusz (2026-11-16)

### 2. A szelet `popoverOpen` ellenőrzése a tételkeresőnél mindig hamis

Érintett: `.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus ciklus” snippetje;
`app/src/pages/planEditor/ItemPicker.tsx`. A tervszintű kereső találati listája helyben, nem lebegő
Radix-elemként jelenik meg: a lista látható, miközben a `[data-radix-popper-content-wrapper]`
lekérdezés üres. A ciklus „`popoverOpen === false`” várt eredménye így akkor is teljesül, ha a lista
nyitva maradt — az ellenőrzés nem bizonyít semmit. A lista nyitottságát a látható opciókon kellene
mérni.

### 3. A tételkereső nem jelzi a felolvasó szoftvernek a nyitott találati listát

MÁR JELZETT (review:2026-08-25-arch-react-review#REACT-002).

Érintett: `app/src/pages/planEditor/ItemPicker.tsx`. A látható találati lista mellett a kereső
mezőnek nincs `aria-expanded` és `aria-controls` jelölése, és a DOM-ban nincs `role="listbox"` elem.
Felolvasó szoftverrel a gépelés közben megjelenő opciók és a kiemelt opció nem hallható; látó
felhasználónál nincs eltérés.
