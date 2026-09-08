# osszeg-tagolas-kerdes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 13. megállapítás
Target: master
Baseline: e4c4746da9f69fc1274c8639b30bb9932bec8ee5

## Goal
Minden pénzösszeg ezres-tagolva jelenik meg már négyjegyűtől is: a doki „9 000 Ft”-ot lát „9000 Ft”
helyett, a szerkesztőben és a nyomtatványon egyaránt.

## Current state
- `app/src/domain/money.ts` `formatMoney` — az egyetlen pénzformázó, 28 hívási hely, a képernyő és a
  `pdf/` közösen használja (`app/src/pdf/TervDocument.tsx`,
  `app/src/pdf/tervDocument/PhaseTable.tsx`). A `hu-HU` négyjegyűnél nem tagol, a `de-DE` igen; a
  fájl 19–21. sorának kommentje rögzíti, hogy az elválasztó U+00A0.
- `app/src/domain/money.test.ts` — az „omits the thousands separator for 4-digit HUF amounts (hu-HU
  Intl convention, not a bug)” és a „DE + HUF 4-jegyű összegnél is tagol” teszt a mai viselkedést
  szándékosként rögzíti; mindkettő átfordul.
- Négyjegyű összeget váró tesztek: `app/src/pages/PlanEditorPage.test.tsx` („Kedvezmény: 5000 Ft”,
  „+5000 Ft”), `app/src/pages/planEditor/Summary.test.tsx` (ugyanezek + a `/4000 Ft/` negatív őr a
  nem-nettózásra), `app/src/pages/planEditor/EgyediVegosszegBlokk.test.tsx`,
  `app/src/pages/planEditor/ElolegBlokk.test.tsx` („8000 Ft”).
- Az `app/src/pdf/` tesztjeiben nincs négyjegyű összeg — a PDF-tesztek nem törnek.
- `formatCentForInput` (ugyanaz a fájl) szándékosan tagolatlan a `parseEuroInput`
  visszaolvashatósága miatt; a `NumberField` nyers számot vesz — beviteli oldalon nincs érintés.
- `docs/PRODUCT.md § A nyomtatvány szerződéses dokumentum` pénzformázási pontja ma csak hét jegyű
  példákat ad, a négyjegyű esetet nem mondja ki.

## Approach
Egy pont változik: a `formatMoney` mindkét pénznem-ága explicit „négyjegyűtől tagolj” beállítást kap;
hívási helyet nem kell nyúlni. A `money.ts` kommentje rögzíti, hogy ez tudatos eltérés a `hu-HU`
alapértelmezéstől, a `PRODUCT.md`-re mutatva; a `PRODUCT.md` pénzformázási pontja egy tagmondattal
kimondja a szabályt, hogy ne „javítsa vissza” senki.

NEM tartozik ide: a `formatCentForInput`/`parseEuroInput` beviteli formátum; a `NumberField`
számbevitele; a dátum- és darabszám-formázás; a nyomtatvány elrendezése és oszlopszélessége.

## Decisions
- Mindkét pénznem-ágra vonatkozik — mert az ok ugyanaz (a `hu-HU` négyjegyű kivétele), és a HUF-ot
  tagolva, az EUR-t tagolatlanul hagyva ugyanez a következetlenség jönne vissza egy képernyőn belül;
  nem csak a HUF-ág, mert az az 1000 € fölötti árakat nem oldaná meg.
- Képernyő és nyomtatvány közösen változik — mert a doki papíron kifogásolta; nem külön képernyős
  formázó, mert az ma nem létező eltérést vezetne be a két felület közé, 28 hívási hely auditja árán.
- Egy már véglegesített terv újragenerált PDF-je tipográfiailag eltér a korábban letöltöttől (az
  összeg értéke nem) — elfogadva, mert a pillanatkép-invariáns az árakra vonatkozik, nem a
  számjegy-csoportosításra.

## Verification
- [ ] tests — négyjegyű HUF-ra „9 000 Ft” (nem törhető szóközzel), négyjegyű egész EUR-ra `hu`
      nyelven „1 234,56 €”; a `de` viselkedés és a három vagy kevesebb jegyű összeg változatlan; a
      szerkesztő kedvezmény-, felár- és előlegsorai a tagolt alakot mutatják
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf — a fázistábla összegoszlopa négyjegyű tétellel valódi PDF-en (a plusz
      U+00A0 nem tör sort és nem lóg ki)
