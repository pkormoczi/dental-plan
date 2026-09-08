# tetelfelvitel-ciklus-doksi-atvezetes
Type: chore
Source: /implement-batch futás (2026-09-08), a tetelfelvitel-fokusz-fog-mezore lezárása után
Target: master
Baseline: 1c63da186ec59af54f05752bf7e741d8fde88be8

## Goal
A doki-facing doksi és a `keyboard-a11y` manual-check szelet az `496e493`-ban ténylegesen
bevezetett ciklust írja le (Fog mező köztes megállóval), nem a korábbit — a doki nem lát
másképp semmit, csak a leírás lesz igaz.

## Current state
`496e493` (`tetelfelvitel-fokusz-fog-mezore`) óta a kód: `app/src/pages/PlanEditorPage.tsx`
`fogszamotKivan`/`addLine`/`addEgyediLine`, `app/src/pages/planEditor/ItemPicker.tsx`
`fokuszAtadva`, `app/src/pages/planEditor/LineRow.tsx` Fog-mező `onKeyDown` — öt tesztje
`app/src/pages/PlanEditorPage.sorok.test.tsx`-ben. Három szöveg maradt a réginél:
`app/src/CLAUDE.md` § Amit soha (19–20. sor, anchor `ItemPicker.tsx#onPickEgyedi`),
`docs/PRODUCT.md` § Napi flow 2. pont, `.claude/skills/manual-checks/keyboard-a11y.md` „A
kritikus ciklus” + „Egyedi sor” szakasz (a snippet `isSearch === true`-t vár minden körben —
ez a legkárosabb, mert a következő böngészős menet hamis találatot adna).

## Approach
Csak ez a három szöveg változik. NEM tartozik ide: `CHANGELOG.md`/`FEATURES.md` (külön, kézi
hívás), a `docs/` alatti történeti/archív feljegyzések, a `manual-checks/SKILL.md` táblasora
(elég általános, igaz marad), bármely `app/`, `data/`, `assets/` alatti kód/teszt.

Mindhárom szöveg viszi az új ciklust ÉS a `fogszamNemKell` kivételt („fogszámot nem kívánó
tételnél a fókusz a keresőben marad”) — a manual-check szelet enélkül újra hamis találatot
adna. A `keyboard-a11y` snippet nem új, a meglévő lekérdezés bővül: az `isSearch` elvárás
körönként változik (a Fog mező a `pl. 16, 17, 26` placeholderrel azonosítható).

**Mechanikai korlát — budget.** `docs-check` karakterben mér: `app/src/CLAUDE.md`
2476/2500 (24 kar. headroom), `docs/PRODUCT.md` 5927/6000 (73). Az új szöveg gyakorlatilag
nem lehet hosszabb a réginél; budget-túllépést nem production-refactorral oldunk, a sort kell
tömöríteni. Ha a kivétel egyik helyre sem fér be tömörítve, állj meg és kérdezz.

**Mechanikai korlát — anchor.** `scripts/docs-check.mjs` `anchor()` a sor ELSŐ `→`-jét nézi,
és csak akkor ellenőriz, ha közvetlenül utána `<típus>:` áll. A több prózai nyilat tartalmazó
ciklusleírásnál a tördelést úgy tartsd, hogy az anchor-nyíl a saját sora első nyila legyen —
különben a docs-check némán átugorja (nem hibázik, csak elveszik az őr).

## Decisions
- Az `app/src/CLAUDE.md` anchorja `ItemPicker.tsx#onPickEgyedi` → `ItemPicker.tsx#fokuszAtadva`
  — a fókusz-átadás az új ciklus hordozó symbolja, azonos hosszú, a headroom kitart; nem
  maradhat a régi symbolon, mert az csak az egyedi ágat fedi.

## Verification
- [ ] tests — nincs kódváltozás, a meglévő 5 teszt (`PlanEditorPage.sorok.test.tsx`) zöld marad
- [ ] typecheck/lint
- [ ] docs-check — anchorok feloldhatók, egyik context-fájl sem lépi túl a budgetet
- [ ] szem-ellenőrzés: a `keyboard-a11y.md` szakasz az öt tesztnévvel egybevág
- [ ] manual-check szelet: keyboard-a11y — a javított szeletet a következő böngészős menet
      futtatja (doki-indítva, nem magától)
