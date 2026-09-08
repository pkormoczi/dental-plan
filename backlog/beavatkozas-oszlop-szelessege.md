# beavatkozas-oszlop-szelessege
Type: bug
Source: /implement-batch futás (2026-09-08), manual-checks visual-css szelet
Target: master
Baseline: e0e528a4da7baa2be19ac0d818581f36110260c2

## Goal
A tipikus tételnév a szerkesztő Beavatkozás mezőjében görgetés és tooltip nélkül
végigolvasható: a névmező 185px → ~465px, ami a seed árlista leghosszabb magyar tételnevét
(67 karakter) is elbírja.

## Current state
- `app/src/pages/PlanEditorPage.tsx:358` — `<Box style={{ maxWidth: 900, margin: '0 auto' }}>`,
  a szerkesztő lap plafonja. Ez a hiba oka: 900 − 656 = 244, ezért ugyanannyi 1440×900-on és
  1280×720-on is.
- `app/src/pages/planEditor/PhaseSection.tsx:314-332` — a `Table.ColumnHeaderCell` `width`
  propok az EGYETLEN hely, ahol az oszlopszélességek élnek (Fog 132, Db 88, Listaár 104,
  Ajánlati ár 148, Összeg 112, záró 72 = 656); a Beavatkozás az egyetlen szélesség nélküli,
  maradék oszlop. Nincs `colgroup`, nincs `table-layout: fixed`, nincs design-token ezekre.
- `app/src/pages/planEditor/LineRow.tsx:221-263` — a Beavatkozás-cella első sávja: növő
  névmező (`minWidth: 0`) + `flexShrink: 0` „+ leírás” gomb; a gomb metszi 244-ből a 185-öt.
- `app/src/App.tsx:52` — `<main style={{ padding: 24 }}>`: 1280-as ablakon 1280 − 48 −
  görgetősáv ≈ 1217px a hasznos szélesség.
- Tesztek: `app/src/pages/PlanEditorPage.sorok.test.tsx` „a sor névmezője a teljes nevet a
  title-jében hordozza” + a „Beavatkozás-cella két sávja” blokk — egyik sem méretet állít;
  pixel szélességet ma egyetlen teszt sem ellenőriz (jsdomban nincs layout).

## Approach
Egy szám változik: `PlanEditorPage.tsx:358` `maxWidth` 900 → 1180, WHY-kommenttel arról, miért
szélesebb ez a lap a többinél. Az oszlopszélességek, a záró oszlop, a cella két sávja és a
`title` fallback változatlan — a plusz 280px teljes egészében a maradék Beavatkozás oszlopba
megy (244 → ~524px, névmező ~465px ≈ 66 karakter).

Mellette a `.claude/skills/manual-checks/visual-css.md` kap egy mérő-snippetet: ez a fájdalom
jsdomban nem fogható meg, és ma ad hoc mérésből derült ki, nem ismételhető ellenőrzésből.

NEM tartozik ide: a fix oszlopok szélessége; a záró oszlop összevonása (a 🗑 külön gomb marad);
a Terv részletei olvasó nézet (`tervReszletei/FazisReszlet.tsx:89,94` a 132/72 kézi másolata);
a többi lap plafonja (Terv részletei 900, Előnézet 1100, Páciens 560); a jelvények szövegezése;
a „+ leírás” gomb helye.

## Decisions
- Szélesebb lap, nem szűkebb fix oszlopok — a Fog oszlop szűkítését a `docs/PRODUCT.md` Nem cél
  sora terheli (a Fog mező jegyzetmezővé válása elfogadott, szabadszöveget kell elbírnia), a
  pénzoszlopokat az `1 234 567 Ft` alak; nem plafon nélküli fluid lap, mert a táblán kívüli
  blokkok 1440-en kényelmetlenül hosszú sorhosszt kapnának.
- 1180 a plafon — 1280×720-on a 24px-es `main`-padding és a görgetősáv mellett is marad ~37px
  tartalék, tehát a kisebb dokumentált felbontáson sincs vízszintes túlcsordulás.
- A szám inline literál marad a lapon, nem kerül design-tokenbe — a többi lap plafonja
  (900/1100/640/560) is így él, egy kedvéért nem nyitunk token-réteget.
- Nincs új unit teszt a szélességre — jsdomban nincs layout; a szélesség őre a `visual-css`
  szelet mérő-snippetje, a meglévő tesztek zöldje a regressziós kapu.

## Verification
- [ ] tests — a meglévő suite zöld; a névmező `title` fallbackje és a két sáv változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — 1440×900 ÉS 1280×720 mellett a Beavatkozás oszlop
      ~524px, a névmező ~465px, a „Bölcsességfog műtéti eljárással (seb. gond., varratszedés)”
      név csonkolás nélkül olvasható, és egyik felbontáson sincs vízszintes túlcsordulás
