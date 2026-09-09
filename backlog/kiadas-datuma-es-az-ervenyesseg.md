# kiadas-datuma-es-az-ervenyesseg
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#2
Target: master
Baseline: e6b75060a3ee94a43d972cad8779173e2fef42a0

## Goal
Helyi 00:00–02:00 (nyáron; télen 00:00–01:00) között indított új tervnél a „Kiadás dátuma” és
az „Érvényes eddig” egy nappal korábbi legyen a valós helyi napnál — elvárt, hogy mindkettő a
helyi naptári napot mutassa, egyezően az „Automatikusan mentve” sorral.

## Current state
`app/src/domain/date.ts` `todayIso()` ma UTC-naptári napot ad
(`new Date().toISOString().slice(0,10)`); ugyanabban a fájlban létezik a helyes, modul-privát
`localIsoDate()`, amit ma csak `formatRelativIdo()` használ. `todayIso()` fogyasztói:
`domain/blankPlan.ts` (`keltezes`, `ervenyesIg`), `state/AppState.tsx` `frissDatummal`,
`components/PlanVersionActionDialog.tsx`, `pages/PatientPage.tsx`, `pages/PriceListAdminPage.tsx`,
`components/PatientEditorPanel.tsx`, `pages/paciensek/UjPaciensDialog.tsx`. Meglévő teszt:
`app/src/domain/date.test.ts` „todayIso — returns an ISO (YYYY-MM-DD) date” — az alakot nézi, a
naptári napot nem.

## Approach
Csak a `todayIso()` teste vált `localIsoDate(new Date())`-re. A hívóhelyek és az
`addDaysIso`/`formatLongDate`/`formatShortDate` — tiszta naptári dátumon, UTC-re rögzítve
dolgozó — számítása változatlan marad, nem tartozik ide.

## Decisions
- a meglévő modul-privát `localIsoDate()`-et használjuk, nem új helpert — mert a
  `formatRelativIdo` már ugyanezt a helyi-nap fogalmat használja, és a fájl így egy definíción
  osztozik.

## Verification
- [ ] tests — `todayIso()` a helyi naptári napot adja egy rögzített időpillanatnál is, ahol a
      UTC-nap eltér a helyitől (pl. helyi éjfél után, UTC szerint még előző nap)
- [ ] typecheck/lint
- [ ] docs-check
