# kereso-talalat-rangsor
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 11.; nagy-terv (2026-09-05), 1.; papirrol (2026-09-05), 2. megállapítás
Target: master
Baseline: 7a580cf1ff09822e2397c7e5f4b5a05c9c74ae4e

## Goal
A tételkereső névtalálatai a szöveg-relevancia szerint sorrendben jelennek meg: a keresett
tétel az esetek túlnyomó többségében az első néhány találat között áll, nem a 12-es
láthatósági limit alatt.

## Current state
- `app/src/pages/planEditor/ItemPicker.tsx`: `results = useMemo(...)` — ma
  `available.filter((x) => nevEgyezik(x.nev, nq))` majd `.slice(0, LATHATO_TALALAT)`, rangsor
  nélkül. A `katResults` (2. szint, kategórianév-egyezés) kategória `sorrend` szerint rendezett,
  VÁLTOZATLAN marad.
- `app/src/domain/search.ts`: `nevEgyezik`, `norm` — a kétnyelvű, ékezetfüggetlen egyezés
  szabálya, változatlan.
- `app/src/domain/paciensKereses.ts` `paciensTalalatok()`: a másolandó rangsor-minta (szó eleje
  > szóhatár > belső egyezés), jelenleg páciensnévre.
- `app/src/domain/types.ts`: `Tetel.gyakori: boolean`, `Tetel.csomag?: boolean` (utóbbi
  dokumentált jelentése „csomag jellegű", ma a véglegesítés-őr leírás-figyelmeztetését vezérli).
- Tesztek: `app/src/domain/paciensKereses.test.ts` (a mintázat tesztjei), `ItemPicker` mögötti
  komponens-tesztek (`PlanEditorPage.test.tsx` vagy saját `ItemPicker.test.tsx`, ha van).

## Approach
- Új rangsoroló a `domain/search.ts`-ben (vagy önálló modulban, a `paciensKereses.ts` mellé) —
  bemenet a MÁR szűrt névtalálat-tömb és a normalizált `nq`, kimenet a rangsorolt tömb. A
  szó-eleji/szóhatár/belső rang ugyanaz a logika, mint a `paciensTalalatok()`-ban, kiegészítve a
  `gyakori`/`csomag` tie-break dimenzióval.
- `ItemPicker.tsx`: a `results` számítás a szűrés UTÁN, a `.slice(0, LATHATO_TALALAT)` ELŐTT
  rangsorol — így a limit már a rangsorolt sorrendből vág, nem az árlista sorrendjéből.
- A `katResults` (2. szint) rendezése VÁLTOZATLAN — a tétel a névtalálatokról szól, a kategória-
  szintű egyezés már ma is kategória `sorrend` szerint determinisztikus.
- NEM tartozik ide: a `kereso-fogszam-egyedi-tetel` (ugyanezt a listát más okból érinti); a
  `gyakori`/`csomag` mezők tényleges kitöltése (`arlista-nap` adatmunkája — a rangsor ezekkel a
  mezőkkel dolgozik, ma mind `false`/hiányzó); az Enter feltételes viselkedése (kizárva, ld.
  Context); a kategória-szintű `Kategoria.csomag` mező bevezetése.

## Decisions
- Rangsor-precedencia: szöveg-relevancia (szó eleje > szóhatár > belső egyezés) > `gyakori`
  (előrébb) > `csomag` (hátrébb) > eredeti árlista-sorrend — mert a bejelentett hiba oka a
  relevancia hiánya, ezt kell elsődlegesen orvosolni; a `gyakori`/`csomag` finomítás, nem
  felülírás (a doki explicit ezt választotta a „gyakori mindig felül" alternatívával szemben).
- A csomag-demóció a meglévő `Tetel.csomag` mezőre épül, nem új `Kategoria`-mezőre — a mező
  jelentése már ma „csomag jellegű tétel", újrahasznosítása elkerüli a séma bővítését; nem
  külön kategória-flag, mert az egy második, párhuzamos domainfogalmat vezetne be ugyanarra.
- Az Enter-viselkedés változatlan (mindig a `hi` indexű találatot választja) — a
  `app/src/CLAUDE.md` „Amit soha" tiltja a ciklus feltételessé tételét; a tétel alternatívája
  ezért kizárva, nem implementálva.
- A `katResults` rendezése változatlan (kategória `sorrend` szerint) — a tétel a névtalálatokról
  szól, a kategória-szintű ág scope-on kívül.

## Verification
- [ ] tests — a repró keresőszavaival („gyökértömés", „neodent", „implantátumfej"): a szó
      eleji/szóhatár-egyezésű találat megelőzi a belső egyezésűt (pl. „Gyökértömés" a
      „Gyökértömés eltávolítása" előtt); azonos relevancia-szinten a `gyakori: true` tétel
      előrébb, a `csomag: true` tétel hátrébb kerül, mint egy jelöletlen, azonos szintű találat;
      relevancia-különbség esetén a relevancia dönt a `gyakori`/`csomag` jelölés ellenére; a
      12-es limit a RANGSOROLT sorrendből vág; a kategória-szintű (`Kategória: …`) találatok
      sorrendje változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
