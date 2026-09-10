# manual-checks — `keyboard-a11y` szelet, 2026-09-10

Kiváltó: `/implement dropdownmenu-alertdialog-fokusz-visszaadas` 5b lépése. A tétel a
`DropdownMenu`/`AlertDialog` fókusz-/Tab-kezelést érintette (kontrollált, trigger nélküli
`AlertDialog`-ok záráskori fókusz-visszaadása), a `keyboard-a11y` szelet ehhez a
változástípushoz tartozik (`SKILL.md` táblázata).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5194/dental-plan/`), 1440×900 és 1280×720, seed demó adat, determinisztikus
reset minden szcenárió előtt. Futásidő: ~20 perc.

## A tételhez tartozó ellenőrzés — rendben

Mind a négy érintett dialógus záráskor a megnyitó `⋯` gombra (vagy látható gombra) adja
vissza a fókuszt, nem a `<body>`-ra — Escape-pel ÉS sikeres akcióval (Mégse/mentés/törlés)
egyaránt:

| Út | Escape/Mégse | Sikeres akció |
|---|---|---|
| `#/demo/tervek` verziósor `⋯` → Érvénytelenítés | ✅ fókusz a `⋯`-n | ✅ fókusz a `⋯`-n (mentés után) |
| `#/demo/tervek` verziósor `⋯` → Érvénytelenítés visszavonása | ✅ fókusz a `⋯`-n (Mégse) | — |
| `#/demo/tervek` verziósor `⋯` → Másolás új tervbe (piszkozat-őr) | ✅ fókusz a `⋯`-n (Mégse) | — |
| `#/demo/tervek` „Új verzió" látható gomb (piszkozat-őr) | ✅ fókusz a gombon (Mégse) | — |
| Páciens-lap `⋯` → Páciens törlése (Kelemen Petra, az egyetlen törölhető seed-páciens) | ✅ fókusz a `⋯`-n (Mégse) | — |

Az érvénytelenítés-dialógus nyitáskori fókusza (indoklás-mező, nem a Mégse gomb) is
változatlanul helyes maradt a záráskori javítás mellett. Konzol mindvégig tiszta (0
error/warn).

## Járulékos, ugyanebben a menetben igazolt viselkedés — rendben

A `#/terv` lapon a tétel NEM módosított kód, a szelet szabvány-ellenőrzését (a fókusz-/
Tab-kezelés stabil vakfoltjait) is lefuttattam, regresszió-ellenőrzésként:

- Tételfelvitel-ciklus (gépel → `wait_for` → `ArrowDown` → `Enter` → **Fog** → `Enter` →
  **kereső, üresen**) 3× egymás után, egér nélkül — mindhárom körben megállt a Fog mezőn,
  majd a kiürült keresőn, popover zárva.
- Nulla találatos keresés (`xyz-nincs-ilyen`) → Enter: létrejött az `egyedi` jelöléssel
  ellátott sor, ugyanúgy megáll a Fog mezőn.
- Escape a keresőn (van szöveg, nincs találat): a mező kiürül, a fókusz a keresőn marad.
- Fogtérkép egy Tab-stop: csukott panel mellett `[role="toolbar"]` nincs a DOM-ban; nyitva
  `toolbarTabIndex: 0`, `toothCount: 32`, `focusableToothCount: 0`, roving
  `aria-activedescendant` — egyik fog sem önálló Tab-megálló.
- `paint-order: stroke` és a fókuszhoz kötött kurzor: fókusz előtt a wrapper
  `outlineStyle: none` és a kurzor `display: none`; fókuszban `outlineStyle: solid`,
  kurzor `display: inline`. Kombinált eset (egy fog egyszerre `is-active` ÉS `is-picked`,
  a sor saját `ToothPickerPopover`-jében, `role="listbox"`): mindhárom réteg
  (`kurzorStroke`/`kontrasztStroke`/`pickedStroke`) helyes, nem-`undefined` computed
  style-t ad, `pickedColor` nem accent.
- A `ToothPickerPopover` Escape-je a triggerre (`Fogak kijelölése a fogtérképen` gomb) adja
  vissza a fókuszt.

## Nem reprodukálva ebben a menetben

**Popover-geometria** (`ItemPicker.tsx` `floating="portal"`, `keresoMod` sor): a
próbált út (a plan-szintű „Érintett fogak" összesítő fogtérkép Enter/Space-e) nem hoz létre
`keresoMod` sort — ez a térkép csak megjelenítő (a felvett kezelések fogszámait mutatja,
lásd a lap saját szövege), nem bemeneti vezérlő. A valódi `keresoMod`-ba jutás útja nem
tisztázódott ebben a menetben; mivel a tétel diffje az `ItemPicker.tsx`-hez, a
`ToothPickerPopover.tsx`-hez és a `floating="portal"`-hoz nem nyúlt, ez nem regresszió-
gyanú, csak nyitva maradt ellenőrzés. Ha legközelebb ez a szelet fut, a szelet-fájl
frissítése (a pontos lépéssor rögzítése) segítene.

## Nem ellenőrizhető

`prefers-reduced-motion` — az `emulate` tool nem támogat CSS media-feature emulációt
(`SKILL.md`).
