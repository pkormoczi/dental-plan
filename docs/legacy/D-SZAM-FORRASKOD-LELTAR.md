# D-szám hivatkozások a forráskódban — leltár

Ez a leltár a `docs/PROBLEMS.md`-ben leírt 4. probléma ("A historikus
döntési azonosítók a forráskódot is szennyezik") méréséhez készült:
számba veszi, hogy **a forráskódban** (nem a `docs/`/`backlog/` markdown
fájlokban) jelenleg hol és hány `D<szám>` alakú hivatkozás található.
Nem javaslat vagy terv — pillanatfelvétel, amire a kivezetés (`PROBLEMS.md`
Cél szakasza) ráépíthető.

## Módszertan

- Keresési minta: `D[0-9]{1,3}\b` (szóhatáron kezdődő `D` + 1-3 számjegy),
  az `app/src` alatt, kizárólag `.ts`/`.tsx` kiterjesztésű fájlokban.
- Kizárva: `docs/`, `backlog/`, `CLAUDE.md` és minden egyéb `.md` fájl —
  ezekben a `D<szám>` hivatkozás a jelenlegi modellben szándékos (a
  döntéstábla maga), nem a leszámolt probléma tárgya.
- Kizárva két, kézzel ellenőrzött álpozitív forrás: `app/package-lock.json`
  (a függőség-hash base64 tartalma véletlenül tartalmaz `D`+számjegy
  mintát) és `app/src/assets/dental-chart-fdi-32.svg` (a beágyazott PNG
  base64 blob-ja, szintén véletlen egyezés — nem tényleges kód-hivatkozás).
- Minden egyéb találatot kézi mintavétellel ellenőriztem (pl. `D186`,
  `D240` — ezek nem elgépelések, hanem a `docs/01-attekintes-es-
  dontesek.md` döntéstáblájának a `CLAUDE.md`-ben nem idézett, magasabb
  sorszámú tételeire mutatnak; a legmagasabb ténylegesen hivatkozott
  szám `D603`).

## Összesítés

| Mérőszám | Érték |
|---|---|
| Összes `D<szám>` előfordulás | **834** |
| Érintett fájlok száma | **146** |
| Ebből production (nem `.test.`) fájl | 100 fájl, 513 előfordulás |
| Ebből teszt (`.test.ts`/`.test.tsx`) fájl | 46 fájl, 321 előfordulás |
| Egyedi (különböző) hivatkozott D-szám | 121 |
| Legmagasabb hivatkozott D-szám | D603 |

### Megoszlás mappánként (`app/src/` alatt)

| Mappa | Előfordulás |
|---|---|
| `pages/` | 349 |
| `domain/` | 207 |
| `storage/` | 115 |
| `components/` | 95 |
| `state/` | 30 |
| gyökér (`App.tsx`, `testUtils.tsx`, `testQueries.ts`) | 25 |
| `pdf/` | 12 |
| `design/` | 1 |

A `pages/` és a `domain/` viszi a hivatkozások kétharmadát — ez a két
réteg hordozza a legtöbb üzleti szabályt, ezért itt a legsűrűbb a "miért
így van" jellegű, D-számra mutató komment és teszt-elnevezés is.

### Leggyakrabban hivatkozott D-számok

| D-szám | Előfordulás |
|---|---|
| D29 | 47 |
| D72 | 38 |
| D33 | 37 |
| D21 | 30 |
| D31 | 28 |
| D66 | 27 |
| D37 | 26 |
| D4 | 24 |
| D39 | 21 |
| D7 | 20 |

## Fájlonkénti bontás (mind a 146 érintett fájl)

Csökkenő előfordulás-szám szerint rendezve, `app/src/`-hez relatív
útvonalakkal.

| Fájl | Előfordulás |
|---|---|
| `pages/PreviewPage.test.tsx` | 40 |
| `storage/seed/plans.ts` | 31 |
| `pages/demo/OsszesTervSection.test.tsx` | 29 |
| `domain/types.ts` | 26 |
| `pages/PreviewPage.tsx` | 24 |
| `components/PatientPlanChains.tsx` | 23 |
| `storage/DemoStorage.test.ts` | 21 |
| `storage/DemoStorage.ts` | 19 |
| `App.test.tsx` | 17 |
| `state/AppState.tsx` | 16 |
| `pages/PatientPage.test.tsx` | 16 |
| `pages/PlanEditorPage.tsx` | 14 |
| `domain/veglegesitesOr.ts` | 14 |
| `domain/veglegesitesOr.test.ts` | 14 |
| `domain/planCopy.test.ts` | 14 |
| `pages/SettingsPage.test.tsx` | 13 |
| `pages/PatientDetailPage.test.tsx` | 13 |
| `domain/paciensAktivitas.ts` | 13 |
| `storage/seed/plans.test.ts` | 12 |
| `pages/PriceListAdminPage.test.tsx` | 12 |
| `pages/planEditor/LineRow.tsx` | 10 |
| `pages/Home.test.tsx` | 10 |
| `domain/planCopy.ts` | 10 |
| `pages/settings/RendeloTab.tsx` | 9 |
| `pages/PatientDetailPage.tsx` | 9 |
| `pages/NewPlanPage.tsx` | 9 |
| `pages/NewPlanPage.test.tsx` | 9 |
| `components/PatientEditorPanel.tsx` | 9 |
| `storage/PlanStorage.ts` | 8 |
| `state/AppState.test.tsx` | 8 |
| `pages/planEditor/EgyediVegosszegBlokk.tsx` | 8 |
| `pages/PlanEditorPage.sorok.test.tsx` | 8 |
| `pages/PatientPage.tsx` | 8 |
| `pages/DemoPage.test.tsx` | 8 |
| `pages/PriceListAdminPage.tsx` | 7 |
| `pages/PaciensekPage.test.tsx` | 7 |
| `domain/totals.ts` | 7 |
| `storage/DemoDraftStorage.test.ts` | 6 |
| `pages/planEditor/PhaseSection.tsx` | 6 |
| `pages/planEditor/ElolegBlokk.test.tsx` | 6 |
| `pages/paciensek/UjPaciensDialog.tsx` | 6 |
| `pages/demo/OsszesTervSection.tsx` | 6 |
| `pages/PlanEditorPage.test.tsx` | 6 |
| `domain/totals.test.ts` | 6 |
| `domain/torzsadatBetoltes.ts` | 6 |
| `domain/nev.ts` | 6 |
| `domain/arKoveti.ts` | 6 |
| `components/NyelviReviewContext.tsx` | 6 |
| `components/LepesGuardContext.tsx` | 6 |
| `pdf/TervDocument.tsx` | 5 |
| `domain/penznemValtas.ts` | 5 |
| `domain/nemetNev.ts` | 5 |
| `components/TervWorkflowShell.tsx` | 5 |
| `components/TervWorkflowShell.test.tsx` | 5 |
| `components/NyelviReviewBar.tsx` | 5 |
| `storage/seed/templates.ts` | 4 |
| `storage/paths.ts` | 4 |
| `state/planIndulas.ts` | 4 |
| `pdf/labels.ts` | 4 |
| `pages/settings/NyomtatvanyokTab.tsx` | 4 |
| `pages/planEditor/ElolegBlokk.tsx` | 4 |
| `pages/planEditor/EgyediVegosszegBlokk.test.tsx` | 4 |
| `pages/patientPage/TorzsadatSyncCard.tsx` | 4 |
| `pages/PaciensekPage.tsx` | 4 |
| `domain/sorMezok.ts` | 4 |
| `domain/paciensKereses.ts` | 4 |
| `domain/orvosok.ts` | 4 |
| `components/TorzsadatDiffDialog.tsx` | 4 |
| `components/PatientListRow.tsx` | 4 |
| `components/NavGuardContext.tsx` | 4 |
| `components/NavBar.tsx` | 4 |
| `App.tsx` | 4 |
| `testUtils.tsx` | 3 |
| `storage/DraftStorage.ts` | 3 |
| `pdf/TervDocument.test.tsx` | 3 |
| `pages/previewPage/VeglegesitesChecklist.tsx` | 3 |
| `pages/planEditor/FazisMegjegyzes.tsx` | 3 |
| `pages/paciensek/PatientTableRow.tsx` | 3 |
| `pages/SettingsPage.tsx` | 3 |
| `pages/DemoPage.tsx` | 3 |
| `domain/ujVerzioDatum.ts` | 3 |
| `domain/planFolders.ts` | 3 |
| `domain/planChainData.ts` | 3 |
| `domain/paciensTorles.ts` | 3 |
| `domain/paciensDuplikacio.ts` | 3 |
| `domain/nyelviReview.ts` | 3 |
| `domain/masterSnapshotDiff.ts` | 3 |
| `domain/kitoltetlen.ts` | 3 |
| `domain/blankPlan.ts` | 3 |
| `domain/blankPlan.test.ts` | 3 |
| `components/useListStateMemory.ts` | 3 |
| `components/PatientDetailHeader.tsx` | 3 |
| `components/NavBar.test.tsx` | 3 |
| `components/DiscardChangesDialog.tsx` | 3 |
| `storage/paths.test.ts` | 2 |
| `storage/demoFileTree.test.ts` | 2 |
| `storage/DemoDraftStorage.ts` | 2 |
| `state/planIndulas.test.ts` | 2 |
| `pages/settings/EgyebTab.tsx` | 2 |
| `pages/priceListAdmin/UjTetelDialog.tsx` | 2 |
| `pages/priceListAdmin/ItemEditor.tsx` | 2 |
| `pages/planEditor/ItemPicker.tsx` | 2 |
| `pages/paciensek/UjPaciensDialog.test.tsx` | 2 |
| `pages/paciensek/DuplikacioJavaslatok.tsx` | 2 |
| `pages/PreviewPage.pdfHiba.test.tsx` | 2 |
| `domain/validate.ts` | 2 |
| `domain/ujVerzioDatum.test.ts` | 2 |
| `domain/toothVisual.ts` | 2 |
| `domain/tervCim.ts` | 2 |
| `domain/priceListIds.ts` | 2 |
| `domain/paciensAdatok.ts` | 2 |
| `domain/nev.test.ts` | 2 |
| `domain/kitoltetlen.test.ts` | 2 |
| `domain/date.ts` | 2 |
| `components/useAktivDraft.ts` | 2 |
| `testQueries.ts` | 1 |
| `storage/demoFileTree.ts` | 1 |
| `pages/priceListAdmin/BufferedFields.tsx` | 1 |
| `pages/planEditor/elemIdk.ts` | 1 |
| `pages/planEditor/Summary.tsx` | 1 |
| `pages/patientPage/TervCimField.tsx` | 1 |
| `pages/demo/FileTreeSection.test.tsx` | 1 |
| `pages/demo/AdatkezelesSection.tsx` | 1 |
| `pages/demo/AdatkezelesSection.test.tsx` | 1 |
| `domain/workflowLepesek.ts` | 1 |
| `domain/torzsadatBetoltes.test.ts` | 1 |
| `domain/toothVisual.test.ts` | 1 |
| `domain/schema.ts` | 1 |
| `domain/schema.test.ts` | 1 |
| `domain/priceListIds.test.ts` | 1 |
| `domain/piszkozat.ts` | 1 |
| `domain/penznemValtas.test.ts` | 1 |
| `domain/paciensValidacio.ts` | 1 |
| `domain/nyelviReview.test.ts` | 1 |
| `domain/nemetNev.test.ts` | 1 |
| `domain/money.ts` | 1 |
| `domain/money.test.ts` | 1 |
| `domain/mennyiseg.ts` | 1 |
| `domain/coverage.ts` | 1 |
| `design/motion.ts` | 1 |
| `components/usePaciensDuplikacio.ts` | 1 |
| `components/useListStateMemory.test.tsx` | 1 |
| `components/useDirtyDraft.ts` | 1 |
| `components/NavGuardContext.test.tsx` | 1 |
| `components/HuChip.tsx` | 1 |
| `components/DentalChartLegend.tsx` | 1 |

## Előfordulási minták (jellemző idézetek)

A találatok nagy része két alakban jelenik meg:

1. **Production kód WHY-kommentje**, pl.
   `domain/nev.ts`: `// D24 mintáján` vagy
   `pages/demo/OsszesTervSection.tsx`: `// D240: a keresőszöveg ÉS a
   lánc-nyitottság is visszaáll…` — ez pontosan a `PROBLEMS.md` 4.
   pontjában leírt eset: a komment nem a lokális invariánst írja le
   önmagában, hanem egy külső, csak a döntéstáblából visszakereshető
   azonosítóra mutat.
2. **Teszt-elnevezés/leírás**, pl. `it('D66 — előleg nem haladhatja meg
   a fizetendőt', …)` — ezek a `.test.ts`/`.test.tsx` fájlok 321
   előfordulásának túlnyomó része; a teszt neve önmagában dokumentálja,
   *melyik* szabályt fedi, de ugyanúgy a döntéstáblára utal vissza.

Egyik minta sem tartalmaz linket vagy útvonalat a `backlog/`-ra vagy a
`docs/01-attekintes-es-dontesek.md`-re — a hivatkozás kizárólag a puszta
`D<szám>` token, ami a coupling forrása: a jelentés csak a döntéstábla
egyidejű ismeretével fejthető vissza.

## Amit ez a leltár NEM tartalmaz

- A `docs/`, `backlog/` és `CLAUDE.md` saját `D<szám>` hivatkozásait — ott
  ez ma még szándékos szerkezet.
- Minőségi ítéletet arról, hogy egy adott hivatkozás mennyire "rossz"
  (pl. van-e mellette WHY szöveg is, vagy a `D<szám>` az egyetlen
  magyarázat). Ez a kivezetési munka (`PROBLEMS.md` Cél szakasza) egy
  következő lépése, fájlonkénti/kommentenkénti átnézést igényel.
