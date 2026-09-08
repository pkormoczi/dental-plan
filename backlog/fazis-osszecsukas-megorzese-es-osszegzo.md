# fazis-osszecsukas-megorzese-es-osszegzo
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 7. megállapítás
Target: master
Baseline: 99130de7ce17ae1ab60b638e5fc39f16bfaa04f5

## Goal
A doki görgetés nélkül látja fázisonként a részösszeget a Mindösszesen blokkban, az általa
összecsukott fázisok csukva maradnak az Előnézet → Vissza úton is, és a fázisfejléc nyila
látható felirattal mondja meg, mit csinál.

## Current state
- `app/src/pages/PlanEditorPage.tsx:77` `fazisCsukva` (`useState<Set<number>>`, a CSUKOTT
  indexek). Írja `:170` `deletePhase`, `:187` `movePhase`, `:109-114` a `nyelviReview.cel`
  effekt, `:419-426` `onToggleOpen`; olvassa `:418` `open={!fazisCsukva.has(pi)}`. Az
  újraindexelés kész: `app/src/domain/fazisSorrend.ts` `fazisCsukvaTorlesUtan`,
  `fazisCsukvaMozgatasUtan`.
- `app/src/App.tsx:62-73` — `/terv` és `/elonezet` testvér route-ok a `TervWorkflowShell`
  `Outlet`-je alatt: az Előnézetre lépés UNMOUNTOLJA a `PlanEditorPage`-t, a Set üresen
  születik újra.
- `app/src/state/AppState.tsx` `useAppState` — a piszkozat tulajdonosa (`app/src/CLAUDE.md`
  „Find before writing"). A `piszkozatMeta` + `jelezWorkflowLepes`/`jelezTervCim` a minta arra,
  hogyan él nem-`Plan` állapot a piszkozat mellett; nullázás `resetPlanDraft` (`:427-439`) és
  `reloadFromStorage` (`:395-414`).
- `app/src/pages/planEditor/PhaseSection.tsx:159-170` — a nyíl `IconButton`, csak chevron +
  `aria-label`; `:211-215` a csukott fejléc „N tétel · összeg"; `:363-364` „Fázis összesen" —
  mindkettő a `total` propból (`PlanEditorPage.tsx:416` `fazisOsszeg(p)`).
- `app/src/pages/planEditor/Summary.tsx` — ma csak `Mindösszesen` + Kedvezmény/Eltérés. A
  320px-es oszlopban áll (`PlanEditorPage.tsx:488-520`), alatta `EgyediVegosszegBlokk` (ez írja
  ki a terv-szintű eltérést: „→ X kedvezmény") és `ElolegBlokk`.
- `app/src/domain/totals.ts` `fazisOsszeg(fazis)` már létezik — új domain-függvény nem kell.
- Érintett tesztek: `app/src/pages/PlanEditorPage.test.tsx:473+` („fázis összecsukás", „fázis
  sorrendezés"; a gombokat `Fázis összecsukása`/`Fázis kinyitása` néven keresi),
  `app/src/pages/planEditor/Summary.test.tsx`, `app/src/pages/PlanEditorPage.sorok.test.tsx:1063`
  (a `Mindösszesen` szülőelemének textContentjére állít).

## Approach
Három független szelet:
1. `fazisCsukva` felköltözik az `AppState`-be, memóriában (nem `Plan`-mező, nem `DraftMeta`), a
   `piszkozatMeta` szomszédjaként; a `PlanEditorPage` a mai `Set<number>` szemantikát és a
   `fazisSorrend.ts` helpereket változatlanul használja. Ott nullázódik, ahol a `piszkozatMeta`.
2. A `Summary` a `Mindösszesen` FÖLÉ fázisonkénti listát rajzol (fázisnév + `fazisOsszeg`), csak
   `plan.fazisok.length > 1` esetén; a számot a `PlanEditorPage` adja át a meglévő
   `fazisOsszeg`-gel.
3. A `PhaseSection` nyila látható feliratot kap a chevron mellé.

NEM tartozik ide: a „N tétel" → „N sor"/„N kezelés" átfogalmazás (doki döntés: marad); a
terv-szintű kedvezmény fázisokra osztása; „Kezelések összesen" sor; a fázissorok
kattinthatósága; a `DraftMeta`/`schemaVersion` bővítése; a `tervReszletei/FazisokBlokk.tsx`
olvasó nézet; a gépelés közbeni élő összegzés (`elo-fazis-es-vegosszeg`, ami EZUTÁN jön).

## Decisions
- `fazisCsukva` az `AppState`-ben, memóriában — mert a piszkozat tulajdonosa ott van, és így
  minden navigációt túlél; nem `DraftMeta`, mert a perzisztálás minden összecsukásra újraírná a
  piszkozatot és a „Piszkozat mentve" bélyeget egy tisztán vizuális kattintásra frissítené; nem
  `TervWorkflowShell`, mert a Kezdőlapra kilépés is elvinné.
- Fázis-részösszegek csak >1 fázisnál — egy fázisnál szó szerint a Mindösszesen ismétlése.
- A fázissorok a nyers `fazisOsszeg`-et mutatják, terv-szintű kedvezmény nélkül — nincs fázisra
  osztott kedvezmény-fogalom; a különbséget az alatta álló `EgyediVegosszegBlokk` már kiírja.
- Nincs „Kezelések összesen" sor — doki döntés, mert az oszlop már négy blokkot hordoz.
- A nyíl látható felirata lesz az akadálymentes NÉV is (a mai `aria-label` HELYETT, nem mellette)
  — különben kétszer hangzik el; a mai teszt-lekérdezések ehhez igazodnak.
- Ez a tétel az `elo-fazis-es-vegosszeg` ELŐTT megy — doki döntés: ez csak olvassa a
  `fazisOsszeg`-et, az viszont átírja, honnan jön minden összeg.

## Verification
- [ ] tests — Előnézetre lépés és vissza után a korábban összecsukott fázis csukva marad, a
      nyitottak nyitva; piszkozat eldobása után minden fázis nyitva; kettő vagy több fázisnál a
      Mindösszesen fölött fázisonként egy név+összeg sor látszik, egyetlen fázisnál egy sem; a
      fázissorok a fázis nyers összegét mutatják akkor is, ha egyedi végösszeg van beállítva;
      fázis törlése/mozgatása után a részösszeg-sorok és a csukott állapot ugyanahhoz a
      fázishoz tartoznak; a fejléc nyila látható felirattal mondja meg a következő műveletet
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — új szövegelem a fázisfejlécben és új sorok az összesítő
      oszlopban (kontraszt, halvány szöveg)
