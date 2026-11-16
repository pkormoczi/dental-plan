# newplanpage-uj-paciens-teszt-villodzik
Type: bug
Source: CI deploy-futás 2026-11-16 17:20 (run 43917358722); az első /implement reprodukciója szerint alkalmazáshiba
Target: master
Baseline: 999e08d35658b5da4a1710b5537c942ee32410b1

## Goal
Repro: mentetlen piszkozattal az Új terv oldalon „+ Új páciens” → „Új páciens, piszkozat elvetésével”;
a megnyíló „Új páciens” ablakban egy képkocka után a fókusz a mögötte lévő „+ Új páciens” gombra
ugrik, így a kattintás nélkül gépelt név nem kerül a Név mezőbe, a szóköz pedig újra megnyitja a
megerősítő ablakot. Elvárt: a fókusz az „Új páciens” ablakban marad, a gépelés a Név mezőbe megy.

## Current state
- `app/src/components/fokuszVisszaadas.ts` `fokuszVisszaadasOnClose`: záráskor egy képkockával később
  (rAF) a megadott célra fókuszál, ha az még a DOM-ban van — azt nem nézi, hogy közben megnyílt-e
  egy másik modális ablak.
- `app/src/components/PlanVersionActionDialog.tsx`: a megerősítő `AlertDialog` `onCloseAutoFocus`-a ezt
  hívja (`akciok.visszaFokuszRef` = a „+ Új páciens” gomb); az `ujPaciens` akció ugyanabban a lépésben
  nyitja az `app/src/pages/paciensek/UjPaciensDialog.tsx` dialógusát (`app/src/pages/NewPlanPage.tsx`
  `openQuickCreate`).
- További hívók: `components/DiscardChangesDialog.tsx`, `components/PatientPlanChains.tsx` (két
  helyen), `pages/PatientDetailPage.tsx`.
- Reprodukció (ideiglenes jsdom-kísérlet): a dialógus megnyílta után kattintás nélkül egy képkockát
  várva a fókusz a dialóguson kívüli gombon van, egy szóköz után újra nyitva a megerősítő ablak; ha a
  névmező már fókuszban volt, a fókusz bent marad.
- `app/src/pages/NewPlanPage.test.tsx` „"+ Új páciens" megerősítést kér mentetlen piszkozatnál -- Mégse
  megtartja” és „végigvitt quick-create mentetlen piszkozattal: nincs második megerősítő dialógus”: a
  CI-n ritkán bukó két teszt, mert a kattintásuk és a késleltetett fókusz-visszaadás versenyez.

## Approach
- `fokuszVisszaadas.ts`: a késleltetett visszaadás kimarad, ha éppen nyitva van egy modális ablak
  (dialog vagy alertdialog), amely nem tartalmazza a célt; egymásba ágyazott esetben (belső ablak
  zárul egy nyitva maradó külső ablakon belül) a cél a külső ablakban van, a visszaadás megtörténik.
- Új regressziós teszt a `NewPlanPage.test.tsx`-ben a fenti reprodukcióra, és a helper saját tesztje.
- NEM tartozik ide: a két meglévő teszt átírása, a `NewPlanPage.tsx` `handleUjOpenChange` saját
  fókusz-visszaadása, a Radix fókuszcsapda megkerülése, a többi teszt keresési mintája.

## Decisions
- A közös helper javul, nem csak a `PlanVersionActionDialog` `ujPaciens` ága — mert ugyanaz a hiba
  minden olyan zárásnál előjön, ami után másik modális ablak nyílik; egy hívóhelyi kivétel a többit
  nyitva hagyná.
- A két meglévő teszt változatlan marad — mert a hiba javítása után determinisztikusak; a tesztoldali
  kerülőút elfedte volna az alkalmazáshibát.
- A slug marad — mert a tétel azonosítója már commitokban és jelentésekben szerepel; a `Type` `bug`-ra
  vált.

## Verification
- [ ] tests — NewPlanPage: a megerősítés után egy képkockával is az „Új páciens” ablakban van a fókusz,
      a kattintás nélkül gépelt szóközös név a Név mezőbe kerül, és a megerősítő ablak nem nyílik
      újra; helper: nyitott, a célt nem tartalmazó modális ablak mellett nem fókuszál, beágyazott
      esetben és modális ablak nélkül igen; a meglévő fókusz-visszaadási tesztek zöldek
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
