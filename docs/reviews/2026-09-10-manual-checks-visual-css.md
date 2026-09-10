# Manual checks — `visual-css` — 2026-09-10

```
Dátum: 2026-09-10
Szelet: visual-css
Kiváltó: belso-kod-feluleten-paciensmappa-szabo implementációja (/implement 5b) — új ghost gomb a sikerképernyőn
Eszköz: chrome-devtools MCP (izolált, headless), Vite dev 5300, 1440×900
Route-ok: #/, #/paciens (kötött piszkozattal), #/terv, #/elonezet, #/elonezet?mentve=1 (sikerképernyő, csukva és nyitva), #/demo/tervek, #/arlista, #/beallitasok
```

## Mit fedett

- Kontraszt / `controlBorder` / accent-mint-szövegszín szkript mind a 8 route-állapoton:
  **0 szabálysértés** mindenhol (`accent-as-text`, `text-contrast`, `control-border-contrast`,
  `control-no-border` egyike sem).
- A tétel új eleme, a sikerképernyő „Hol van a gépen?” ghost gombja: billentyűs fókusz
  (Tab a lépés-navigáció „Előnézet és véglegesítés” linkjéről) `:focus-visible` igaz, látható
  gyűrű `outline: 2px solid rgb(151,100,69)`, offset −1px. Egér nélkül Enterrel nyílik és
  csukódik, `aria-expanded` false→true, `aria-controls` a megjelenő útvonal-sorra mutat, a
  fókusz a gombon marad.
- Csukott állapotban a `main` szövegében nincs „Mappa:” és nincs `_szaban`/`_v1` belső kód;
  nyitva a monospace útvonal (`Szabó-Anna_szaban / Szájsebészet_chxkic / 2026-09-10_v1`)
  13,3 px-en 5,92:1 kontraszttal.
- Terv adatai lap kötött piszkozattal: a kötés-jelző „Szabó Anna (1985.04.22.)”, „Páciensmappa”
  szöveg és toldalékos mappanév nem szerepel a `main`-ben.
- Háttér: `body`/`#root`/`main` átlátszó, a `.radix-themes` gyökér `rgb(255,255,255)` — nem
  meleg krém/bézs.
- Konzol: minden route-on üres (nincs React-figyelmeztetés, nincs CSP-sértés).

## Kritikus

—

## Közepes

—

## Apró

—

## Nem ellenőrizhető

- `prefers-reduced-motion` (nincs media-feature emuláció, lásd `SKILL.md`).
- Oszlopszélesség-mérés (`#/terv` Beavatkozás oszlop): nem a tétel területe, ebben a
  futásban kihagyva; a 2026-09-07-i futás fedi.

Futásidő: ~9 perc (böngészős rész).
