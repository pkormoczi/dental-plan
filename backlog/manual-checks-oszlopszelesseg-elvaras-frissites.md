# manual-checks-oszlopszelesseg-elvaras-frissites
Type: chore
Source: implement-batch böngészős szelete közben mérve (2026-09-09)
Target: master
Baseline: 19d650d597aa0eec3b065a5a870a64ea7cb41d7c

## Goal
A `visual-css` szelet oszlopszélesség-ellenőrzése újra elmegy egy ép `#/terv` lapon, és a
következő oszlopátrendezésnél sem avul el: pontos pixel helyett alsó küszöböt és a valódi
invariánsokat méri.

## Current state
- `.claude/skills/manual-checks/visual-css.md` „Oszlopszélesség: Beavatkozás (`#/terv`)" —
  `beavatkozasOszlopPx` ~524px / `nevmezoPx` ~465px elvárás; a `5ba7371` írta be, a lap-plafon
  900→1180 emelésével egy időben (akkori fix oszlopok összege 656, 1180−656 = 524).
- `app/src/pages/planEditor/PhaseSection.tsx` `Table.Header` — a `Beavatkozás` az egyetlen
  szélesség nélküli, maradék oszlop; a `a69fd3d` óta a fix oszlopok összege 676, mert a
  112px-es cella 40px (eltérés-jelvény) + 92px (Összeg) párosra bomlott.
- `app/src/pages/PlanEditorPage.tsx` lap-plafon `maxWidth: 1180`; a fölötte álló komment
  `(~524px)`-et állít a maradék oszlopról.
- Mért állapot izolált Chrome-ban, 1440×900-on és 1280×720-on is: 488px / 429px,
  `horizontalOverflow: false`, névcsonkolás nincs.

## Approach
A `visual-css.md` „Elvárt mindkét felbontáson" mondata és a `PlanEditorPage.tsx` komment
pixel-száma változik. NEM tartozik ide: a `PhaseSection.tsx` oszlopszélességei, a lap-plafon
értéke, a mérő snippet visszaadott mezői és logikája, más manual-check szelet.

## Decisions
- Az oszlop jogosan szűkült, a szélességekhez nem nyúlunk — mert a `a69fd3d` eltérés-jelvény
  oszlopa szándékos termékdöntés, és 488px-en a hosszú tételnév továbbra is csonkolás nélkül
  olvasható; nem szélesítjük vissza ~524-re, mert az a tétel hatókörén kívüli elrendezés-
  változtatás lenne.
- Az elvárás alsó küszöb + invariáns, nem pontos pixel: `beavatkozasOszlopPx` ≥ 480,
  `nevmezoPx` ≥ 420, `horizontalOverflow: false`, hosszú tételnév csonkolás nélkül — mert a
  szándék a hosszú név olvashatósága, nem egy adott pixel visszatérése; nem a snippetből
  számolt maradék-szélesség, mert az a kódból vezetné le az elvárást, és egy szándékolatlan
  szűkítést sem venne észre.
- A küszöb szűk sávval a mai mért érték alatt — mert így egy további szűkülés bukik, de egy
  jövőbeli keskeny oszlop nem indít fals riasztást.
- A `PlanEditorPage.tsx` `(~524px)` kommentje ugyanebben a tételben javul — mert ugyanattól a
  változástól vált hamissá, és a javítás nem változtat viselkedést; nem külön tétel.

## Verification
- [ ] tests — nincs: futtatható viselkedés nem változik (szelet-doksi + egy komment)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — `#/terv`, egy nyitott fázis egy sorral, 1440×900 ÉS
      1280×720: a snippet mindkét küszöböt teljesíti, `horizontalOverflow: false`, és a hosszú
      seed-tételnév a névmező `title`-jéből csonkolás nélkül előhívható.
