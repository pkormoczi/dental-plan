# elo-fazis-es-vegosszeg
Type: feature
Source: doctor-review papirrol (2026-09-05), 12. megállapítás
Target: master
Baseline: 1caa063f52e82c172580bbfa295ccbe862f3bc52

## Goal
Gépelés közben a Fázis összesen és a Mindösszesen (a Kedvezmény/Eltérés a listárától bontással
együtt) ugyanúgy élőben kövesse az ár-/darabszám-mező tartalmát, ahogy a sor Összege ma.

## Current state
- `app/src/pages/planEditor/LineRow.tsx:89-95` — `arDraft`/`mennyisegDraft`, KOMPONENS-LOKÁLIS
  state, a `NumberField` `onDraftChange` csatornáján (`app/src/components/NumberField.tsx:58`)
  táplálva; csak a sor saját Összeg celláját frissíti (`LineRow.tsx:445-454`). Semmi nem szökik
  ki a `LineRow`-ból felé — `onPatch`/`onRequestArFrissites`/`onRemove` a jelenlegi felfelé menő
  csatornák (44-46).
- `app/src/pages/planEditor/PhaseSection.tsx:42` `total` prop → `:364` „Fázis összesen", `:213`
  csukott fejléc-összegzés — mindkettő a propból jön, amit a szülő ad.
- `app/src/pages/PlanEditorPage.tsx:235-237` — `sorszintuOsszeg`, `grand`
  (`tervVegosszeg`), `bontas` (`elteresBontas`), mind `plan.fazisok`-ból (committált). `:416`
  `total={fazisOsszeg(p)}` fázisonként; `:492-509` `Summary`/`EgyediVegosszegBlokk` a
  `grand`/`bontas`/`sorszintuOsszeg`-et kapja; `:510-520` `ElolegBlokk` a `grand`-et.
- Van már MINTA ugyanerre a problémára: `PlanEditorPage.tsx:243-261` `pendingSor` /
  `pendingFrissites` / `pendingUjFazisok` — az ár-frissítés megerősítő dialógusának „Hatás a
  tervre" előnézete egy PATCHELT `Fazis[]`-másolatot épít, és a MEGLÉVŐ
  `sorokOsszeg()`/`tervVegosszeg()`-gel számol rajta, nem új szignatúrával.
- `app/src/domain/totals.ts` — `fazisOsszeg`, `sorokOsszeg`, `tervVegosszeg`, `elteresBontas`
  mind `Fazis[]`-t várnak; `tervVegosszeg` doc-kommentje: „Ez az EGYETLEN hely, ahol a Fizetendő
  eldől" — a szignatúra nem változik.
- Rögzített, invertálandó teszt: `app/src/pages/PlanEditorPage.sorok.test.tsx:1063` „gépelés
  közben a »Fázis összesen« és a »Mindösszesen« NEM változik, csak commit után".
- Változatlan marad: `app/src/pages/planEditor/ElolegBlokk.tsx` (`grand`-et fogyasztja, de a
  saját mezője és figyelmeztetése commit-only marad), `app/src/pages/planEditor/
  EgyediVegosszegBlokk.tsx` (`sorszintuOsszeg`-et fogyasztja, commit-only marad).
- `NumberField.tsx` maga nem változik — a csatorna (`onDraftChange`) már megvan.

## Approach
A meglévő `pendingUjFazisok`-mintát terjesztjük ki az ÉPPEN SZERKESZTETT sorra: a `LineRow`
ár- és darabszám-draftja egy új, felfelé menő csatornán (a `PhaseSection`-ön át) eljut a
`PlanEditorPage`-ig, ahol egy „élő" `Fazis[]`-másolat épül — a `plan.fazisok`-ból, csak a
ténylegesen szerkesztett sor ár/mennyiség mezőjét cserélve a draftra —, és `fazisOsszeg`,
`sorokOsszeg`, `tervVegosszeg`, `elteresBontas` EZEN a másolaton fut a `total`/`grand`/`bontas`
propokhoz. Egyszerre csak egy sor lehet fókuszban, ezért csak egy sor override-ja kell.

Változó fájlok/boundary-k: `LineRow.tsx` (a draft-változás felfelé jelzése), `PhaseSection.tsx`
(a jelzés áteresztése, propok bővítése), `PlanEditorPage.tsx` (az élő `Fazis[]`-másolat építése
és a `total`/`grand`/`bontas` innen számolása), `PlanEditorPage.sorok.test.tsx` (a mai
„NEM változik" teszt invertálása).

NEM változik: `app/src/domain/totals.ts` — a függvények szignatúrája és a `tervVegosszeg`
„EGYETLEN hely" invariánsa érintetlen, csak a hívó adja át más `Fazis[]`-t. NEM tartozik ide az
`ElolegBlokk` és az `EgyediVegosszegBlokk` élővé tétele — mindkettő beviteli mezőt és
figyelmeztetést tartalmaz, aminek villogása gépelés közben rosszabb volna, mint a mai
késleltetés (a doki kifejezetten csak a két összegzőt kérte élővé). NEM tartozik ide a
`fazis-osszecsukas-megorzese-es-osszegzo` tétel (csukott állapot megőrzése, állandó
részösszeg-sor) — szomszédos, de független módosítás ugyanabban a fájlban.

## Decisions
- Élő: Fázis összesen, Mindösszesen, Kedvezmény/Eltérés a listárától — doki döntés, felülbírálja
  a korábbi `backlog-108` 1. döntését, mert a review kétszer jelezte ugyanazt a zavart.
- Commit-only marad: Előleg blokk, Egyedi végösszeg blokk — doki döntés, mert beviteli mezőt és
  figyelmeztetést hordoznak, nem csak megjelenítést.
- A meglévő `pendingUjFazisok`-mintát (patchelt `Fazis[]`-másolat + a meglévő `domain/totals.ts`
  függvények) újrahasznosítjuk — mert pontosan erre a problémára már bevált minta, és nem sérti
  a `tervVegosszeg` „EGYETLEN hely" dokumentált invariánsát.
- Csak az aktívan szerkesztett sor kap draft-override-ot, a többi a committált `plan.fazisok`-ból
  jön — mert egyszerre csak egy ár-/darabszám-mező lehet fókuszban.

## Verification
- [ ] tests — gépelés közben (blur előtt) a Fázis összesen és a Mindösszesen (és a
      Kedvezmény/Eltérés a listárától sor, ha releváns) az ÉPPEN GÉPELT értékkel frissül, ugyanúgy
      ahogy a sor Összege ma; blur/Enter/Escape után ugyanaz marad, mint ma; commit nélkül
      (Escape, mező elhagyása üres/érvénytelen inputtal) a régi committált érték látszik; az
      Előleg és az Egyedi végösszeg blokk gépelés közben változatlan
- [ ] typecheck/lint
- [ ] docs-check
