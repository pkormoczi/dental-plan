# sor-fazisnev-mezok-levagott-szoveg
Type: bug
Source: doctor-review nagy-terv (2026-09-05), 12. megállapítás
Target: master
Baseline: cc507f1948cdd195eea3117b2b4e6bd88403a07f

## Goal
A hosszú tétel- és fázisnév görgetés nélkül végigolvasható, és a jelvényes sor ugyanolyan széles
névmezőt kap, mint a többi.

## Current state
- `app/src/pages/planEditor/PhaseSection.tsx` fázisfejléc: a `TextField.Root` (`fazisNevId(pi)`)
  `style={{ maxWidth: 360 }}` plafonja csonkolja a nevet; a mező csukott fázisban is mező marad,
  a `!open` ág csak a „N tétel · összeg" `Text`-et adja hozzá. A mezőn ülő Tab/Enter kezelő
  `if (!open) return;` ága kizárólag a csukott állapotra szól.
- `app/src/pages/planEditor/LineRow.tsx` Beavatkozás-cella: egy `Flex wrap="wrap"`-ben a névmező
  (`Box flexGrow="1"`, `minWidth: 160`) és MELLETTE, ugyanabban a sávban a jelvények (`egyedi`,
  `HuChip`, `átírt`+reset, HU/DE+✓, `elteres.cimke`, `örökölt ár`) meg a „+ leírás" `Button` — a
  jelvények a mező szélességéből vesznek el, majd a gomb a mező alá tördelődik.
- Az oszlopszélességek a `PhaseSection.tsx` `Table.Header`-ében ülnek; a Beavatkozás az egyetlen
  szélesség nélküli (maradék) oszlop.
- Precedens a statikus névre: `app/src/pages/tervReszletei/FazisReszlet.tsx` `Text weight="bold"`
  + ugyanaz a chevron/`aria-label` minta.
- A mai viselkedést rögzítő teszt: `app/src/pages/PlanEditorPage.test.tsx` „összecsukott fázisnál
  marad a natív Tab -- a kereső nincs a DOM-ban".

## Approach
Két fájl változik: `PhaseSection.tsx` és `LineRow.tsx`; mellettük a fenti teszt lecserélése és új
tesztek `PlanEditorPage.test.tsx` / `PlanEditorPage.sorok.test.tsx`-ben.

- Fázisfejléc: csukott állapotban a név statikus `Text` (a `FazisReszlet.tsx` mintájában), nyitott
  állapotban `TextField` a fejléc szabad szélességét kitöltve, felső plafon nélkül. A nyelvi
  jelvény + „Nyelv ellenőrizve" gomb, a „N tétel · összeg" felirat és a ↑↓🗑 gombok helye
  változatlan.
- Sor Beavatkozás-cella: két sávra bontva — felül a névmező és a „+ leírás" gomb egy nem tördelő
  sávban, alatta a jelvények sávja, ami csak jelvény esetén renderelődik.
- A sor névmezője `title`-t kap a teljes névvel.

NEM tartozik ide: a jelvények szövegezése és logikája (`savos-ar-savon-beluli-ertek`,
`penznem-es-cim-felirat`), a csukott állapot megőrzése és a fázis-részösszeg
(`fazis-osszecsukas-megorzese-es-osszegzo`), a fázisnév terminológiája és a szerkeszthetőség
jelzése (`fazisnev-terminologia-es-sor-mozgatas`), a leírás-sáv (`colSpan={7}` sor) elrendezése,
az oszlopszélességek és a Terv részletei olvasó nézet.

## Decisions
- Csukva statikus szöveg ÉS nyitva teljes fejlécszélesség — a csukott fejléc célja az áttekintés
  (ott a mezőkeret üres zaj), nyitva viszont szerkeszteni kell; nem tartalomkövető mezőszélesség,
  mert a gépelés közben mozgó elrendezés a `doctor-review/persona.md` hibalistáján szerepel.
- Csukott fázisnál a név nem írható át közvetlenül — a chevron egy kattintás, és a
  `FazisReszlet.tsx` olvasó nézete már ma így viselkedik; a Tab/Enter kezelő `!open` ága ezzel
  halott kóddá válik, a hozzá tartozó kommentrésszel együtt törlendő.
- A jelvénysáv csak jelvény esetén renderelődik, nem mindig — a névmező szélessége így soronként
  azonos és a „+ leírás" sosem tördelődik, de a jelvény nélküli sorok (a többség) nem nőnek; a
  sűrű adattáblát az `app/src/CLAUDE.md` írja elő.
- A növő névmező `minWidth: 0`-t kap a mai `160` helyett, a „+ leírás" gomb `flexShrink: 0`-t —
  nem tördelő sávban a 160-as padló keskeny ablakon kilógna a cellából.
- `title` csak a sor névmezőjén, a fázisnévén nem — ott a mező a fejléc teljes szabad szélességét
  kapja, nincs mellette 616px fix oszlop, csonkolás nem bizonyított.

## Verification
- [ ] tests — csukott fázisfejlécben a fázisnév statikus szöveg, nem beviteli mező (a mai
      natív-Tab teszt helyén), kinyitás után újra szerkeszthető mező; jelvényes soron a névmező
      és a „+ leírás" ugyanabban a sávban marad, a jelvények külön sávban; jelvény nélküli soron
      nincs jelvénysáv; a névmező `title`-je a teljes nevet adja
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — 1440×900 és 1280×720 mellett a „Bölcsességfog műtéti
      eljárással (sebészi feltárással)" sor és a „2. szakasz — gyökérkezelések…" fázisnév
      csonkolás nélkül olvasható, a jelvényes és a jelvény nélküli sor névmezője azonos
      szélességű, nincs vízszintes túlcsordulás
