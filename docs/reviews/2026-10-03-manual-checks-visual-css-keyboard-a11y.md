# Manual checks — `visual-css` + `keyboard-a11y` — 2026-10-03

```
Dátum: 2026-10-03
Szelet: visual-css, keyboard-a11y
Kiváltó: tetel-sorrend-drag-and-drop implementációja (/implement 2d) — a sor `⋯` menüje helyén ⠿ áthelyező fogantyú, natív HTML5 húzás fázison belül és fázisok között, billentyűs léptetés a fogantyún
Eszköz: chrome-devtools MCP (izolált, headless), Vite dev 5173, 1440×900
Route-ok: #/terv (új, üres piszkozat, seed árlista)
```

## Mit fedett

- Tételfelvitel-ciklus 3× egér nélkül: mindhárom körben az 1. megálló a Fog mező, a 2. a
  kiürült kereső, popover zárva. A ciklust a változás nem érintette.
- Fogantyú billentyűvel: Szóköz felvesz (`aria-pressed="true"`, a sor `--accent-wash`
  hátteret kap, `outline: 2px solid rgb(151,100,69)` fókuszgyűrű), ↓ ↓ két hellyel hátrébb
  viszi, a fókusz minden lépés után a mozgatott sor fogantyúján; az élő régió bemondja a
  helyet („…: 1. fázis, 3. hely.”). Escape az eredeti helyre teszi vissza, fókusz a
  fogantyún. Felvett állapotban Tab a kukára lép, a felvétel véget ér, a sor ott marad.
- Egérrel húzás valódi Chrome `DragEvent`/`DataTransfer` eseményekkel: a húzott sor
  `opacity: 0.5`, a célsor felett 2 px-es `inset` jelzővonal (`rgb(151,100,69)`, 4,97:1
  fehéren); fázisok közötti ejtés a jelzett helyre kerül, utána a mozgatott sor fogantyúja
  kap fókuszt; csukott fázis fejlécére ejtve a fázis szaggatott keretet kap, a sor a végére
  kerül, a fázis csukva marad, a fejléc tételszáma 2 → 3; új, üres fázis paneljére ejtve a
  sor oda kerül. `dragend` után nem marad jelző-osztály a DOM-ban.
- Kontraszt / `controlBorder` / accent-mint-szövegszín szkript a `#/terv`-en három fázissal:
  **0 szabálysértés**. A fogantyú `ghost` `IconButton` (nevesített kivétel), ikonja 5,74:1.
- Konzol: üres (nincs React-figyelmeztetés, nincs CSP-sértés).

## Kritikus

—

## Közepes

—

## Apró

—

## Nem ellenőrizhető

- A natív egérgesztus maga: a chrome-devtools MCP `drag` eszköze nem indít HTML5
  drag-and-drop-ot (a sor helyben maradt, `dragstart` sem futott). Helyette valódi Chrome
  `DragEvent`-ek, `DataTransfer`-rel; a böngésző saját húzás-képe (`setDragImage`) és a
  kurzor így nem látszik — ez a doki kézi tesztje a Pages-en.
- `prefers-reduced-motion` (nincs media-feature emuláció, lásd `SKILL.md`); a változás nem
  vezet be átmenetet vagy animációt.
- A többi route: a tétel nem érinti őket, ebben a futásban kihagyva.

Futásidő: ~12 perc (böngészős rész).
