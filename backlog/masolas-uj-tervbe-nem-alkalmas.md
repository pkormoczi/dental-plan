# masolas-uj-tervbe-nem-alkalmas
Type: feature
Source: review:2026-09-08-doctor-review-hiba-javitas#2
Target: master
Baseline: 42d932062cc0076a45fa2ebca8344e1508eff570

## Goal
A páciens-ütközés piros üzenetéből a doki kattintással eljut az ütköző páciens saját oldalára,
ahonnan a helyes megoldást — új terv annak a páciensnek — el tudja indítani.

## Current state
`app/src/pages/PatientPage.tsx` piros `Callout` (`kotott && utkozok.length > 0`): ma csak azt
mondja el, MI a baj. Az adat `app/src/components/PaciensKotesContext.tsx` `usePaciensKotes()`
`utkozok` (`PatientFolder`, benne `dirName`, `nev`). A workflow-ból páciensoldalra mutató link
meglévő mintája `app/src/components/PaciensBreadcrumb.tsx` (`encodeURIComponent`, guard nélkül —
a piszkozat nem vész el). A célként megnevezett akció `app/src/pages/PatientDetailPage.tsx`
„+ Új terv" (`usePlanVersionActions`). Meglévő teszt: `app/src/pages/PatientPage.test.tsx`
„a beírt név egy MÁSIK, létező páciens NEVÉRE pontosan illesztve figyelmeztet".

## Approach
Csak `app/src/pages/PatientPage.tsx` piros `Callout`-jának tartalma bővül: a meglévő két mondat
után egy irányító mondat és ütköző páciensenként egy link az illető oldalára
(`/paciensek/<dirName>`), a `PaciensBreadcrumb` link-mintáján.

NEM változik: `app/src/domain/paciensKotes.ts` blokkoló logikája; a véglegesítés-őr
`nev-utkozes` tétele (`app/src/domain/veglegesitesOr.ts`) és a checklist route-gombja
(`app/src/pages/previewPage/VeglegesitesChecklist.tsx`) — az Előnézetről a „Terv adatai" gomb ma
is ide vezet, tehát elég egy helyen megjeleníteni; a `TorzsadatSyncCard` tiltásai; a másolt terv
tartalmának sorsa (nem kerül át másik pácienshez — az külön tétel lenne).

## Decisions
- Link az ütköző páciens oldalára — mert a jelentés javaslata ez, és nem húz be új hookot a
  PatientPage-re; nem egykattintásos „új terv indítása" gomb, mert az a
  `usePlanVersionActions`+dialógus párost hozná a workflow-lapra egy pusztán irányító üzenet
  kedvéért.
- Az üzenet kimondja, hogy az új terv üresen indul, a most átmásolt sorok nem jönnek át — mert a
  doki különben csak a cél-oldalon szembesülne a munkája elvesztésével.
- Ütköző páciensenként egy link — mert a pontos névegyezés több páciensre is illeszkedhet, és a
  meglévő szöveg is felsorolja mindet; nem csak az elsőre, mert az némán elrejtené a többit.
- Guard nélküli `Link`, a `PaciensBreadcrumb` mintáján — mert a piszkozat az AppState/DraftStorage-
  ban marad, az elnavigálás nem veszít adatot; a piszkozat-felülírás megerősítést a cél-oldali
  „+ Új terv" meglévő `PlanVersionActionDialog`-ja adja.

## Verification
- [ ] tests — pontos névegyezésnél a piros üzenetben megjelenik egy az ütköző páciens oldalára
      mutató link az ő nevével, és az üzenet kimondja, hogy az ott indított terv üresen indul;
      két ütköző páciensnél mindkettőre van link; ütközés nélkül nincs link
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — új interaktív elem (link) piros `Callout` washen:
      szövegkontraszt és fókuszgyűrű jsdom-ban nem ellenőrizhető
