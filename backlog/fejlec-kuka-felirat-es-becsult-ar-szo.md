# fejlec-kuka-felirat-es-becsult-ar-szo
Type: feature
Source: review:2026-09-09-doctor-review-elso-megnyitas#15
Target: master
Baseline: b71f11497b2a82a54195eea1443984a6a8b77b8a

## Goal
A doki hover nélkül látja, hogy egy sor ára becsült, és a piszkozatot eldobó kuka nem az „Előnézet”
gomb mellett áll.

## Current state
- `app/src/pages/planEditor/PlanEditorHeader.tsx`: a jobb oldali `Flex gap="3"`-ban a kuka `IkonGomb`
  (`ariaLabel="Piszkozat eldobása"`) közvetlenül az „Előnézet” `Button` mellett; a bal `Box` viszi a
  címet, a páciens·státusz sort és az automatikus mentés / ütközés `Text`-et.
- `app/src/pages/PlanEditorPage.tsx` `handleDiscardDraft` + a `confirmDiscard` AlertDialog: a
  megerősítő gomb szándékosan `Eldobás`, mert a trigger a dialógus alatt is a DOM-ban marad, és a két
  akadálymentes név ütközne.
- `app/src/pages/planEditor/LineRow.tsx`: az Ajánlati ár cellában a `savos` kapcsoló `IkonGomb`
  (`ariaLabel="Becsült ár"`, `≈` szövegglyph, `t.warn` kitöltés bekapcsolva); az utána álló önálló
  cella ma csak a `sorElteres` jelvényét tartja.
- `app/src/pages/planEditor/PhaseSection.tsx`: `Table.ColumnHeaderCell width="40px"` az
  eltérés-jelvénynek, `width="148px"` az Ajánlati árnak.
- `app/src/pages/tervReszletei/SorReszlet.tsx`: a csak-olvasó nézet ugyanezt már „Becsült ár” amber
  jelvénnyel mutatja — ez a követendő minta.
- Tesztek: `app/src/pages/planEditor/PlanEditorHeader.test.tsx` „az Előnézet gomb az onPreview-t, a
  kuka ikon az onDiscard-ot hívja”; `app/src/pages/PlanEditorPage.sorok.test.tsx` „FIX árú tételen a
  chip alapból kikapcsolt, kattintásra bekapcsol”; `app/src/pages/PlanEditorPage.test.tsx` „a
  »Piszkozat eldobása« ablakot Escape-pel zárva a fókusz a megnyitó gombra tér vissza”.

## Approach
- `PlanEditorHeader.tsx`: a kuka `IkonGomb` átkerül a bal `Box` végére, az állapotsor alá; a jobb
  oldali klaszterben csak az „Előnézet” marad. A gomb ikon-only marad, a `cimke` és az `ariaLabel`
  szó szerint változatlan.
- `LineRow.tsx`: az eltérés-jelvény cellája `Flex`-szé válik, és `line.savos` esetén elé kerül egy
  `Badge` „becsült” szöveggel.
- `PhaseSection.tsx`: ez a cella `width="40px"` → `width="104px"`.
- Két komment hamissá válik, ezért frissül: a `PhaseSection.tsx`-beli, ami szerint a cella csak az
  eltérés-jelvényé, és a `PlanEditorPage.tsx`-beli 1180-as szélesség-indoklás, ami a ~67 karakteres
  tételnévre hivatkozik (a Beavatkozás oszlop ~440 → ~376 px-re szűkül).
- NEM tartozik ide: a „≈” gomb maga (felirat nélkül marad), a sorvégi „…” menü, a listaárra
  visszaállító nyíl, az `IkonGomb` wrapper, a nyomtatvány `*`-a és lábjegyzete.

## Decisions
- A „becsült” külön jelvény az eltérés-jelvény cellájában, nem felirat a gombon — mert az Ajánlati ár
  cella 148 px-éből a két ikon-gomb után ~76 px marad a számmezőnek; nem a gomb vagy az árcella
  szélesítése, mert az a névmezőt vinné, amire az 1180 px-et szánták.
- A kuka felirat nélkül marad, csak elkerül az elsődleges gomb mellől — doki-döntés; a jelentés
  látható szöveget javasolt, a doki a jelvényes irányt választotta a fejlécben is.
- A cella 40 → 104 px, a két jelvény egymás mellett — mert becsült sor lehet kedvezményes is; nem
  egymás alá tördelés, mert az sormagasságot ugráltatna a sűrű táblában.
- A jelvény szövege kisbetűs „becsült”, a sor többi jelvényének (`egyedi`, `átírt`, `örökölt ár`)
  nyelvét követve; a csak-olvasó nézet „Becsült ár” jelvénye változatlan marad.
- Amber `soft` jelvény — egyezik a bekapcsolt `≈` `t.warn` kitöltésével és a csak-olvasó nézettel.
- Az akadálymentes nevek szó szerint maradnak (`Becsült ár`, `Piszkozat eldobása`) — öt teszt kérdezi
  őket pontos egyezéssel, és a `Piszkozat eldobása` a megerősítő `Eldobás` gombbal való név-ütközést
  is így kerüli el.

## Verification
- [ ] tests — becsült soron látszik a „becsült” jelvény, a kapcsoló levételekor eltűnik; kedvezményes
      becsült soron mindkét jelvény látszik; a kuka és az „Előnézet” nem közös szülőben van, és
      mindkettő a saját műveletét hívja
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css
