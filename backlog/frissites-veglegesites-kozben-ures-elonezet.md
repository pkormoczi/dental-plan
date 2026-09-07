# frissites-veglegesites-kozben-ures-elonezet
Type: bug
Source: doctor-review elso-megnyitas (2026-09-05), 15.; nagy-terv (2026-09-05), 16.; papirrol (2026-09-05), 21. megállapítás
Target: master
Baseline: b68b8c10199d8fc369f3a89f866622121153d2c5

## Goal
Az Előnézet lap nem jelenik meg üres piszkozattal: aki a véglegesítés közben frissít, a
Kezdőlapon köt ki — ahol a páciens „Terv véglegesítve · az imént” sora áll —, nem egy üres terv
piros hibadobozain.

## Current state
- `app/src/pages/PreviewPage.tsx` — a `savedRef` sikerképernyő komponens-state, egy újratöltés
  elveszti; a lap az `useAppState()` `plan`-jét feltétel nélkül rendereli, üres terven a
  `veglegesitesDiagnozis` hard tételeivel („A páciens neve kötelező”, „üres fázis”).
- `app/src/pages/PreviewPage.tsx` `doFinalize` — a piszkozatot törlő `markPlanSaved` a
  `savePlan` UTÁN fut, tehát az üres piszkozat mindig azt jelenti, hogy a verzió már a lemezen
  van.
- `app/src/components/TervWorkflowShell.tsx` — a három workflow-route közös héja; már ismeri a
  `pathname`-et és hívja a `useAppState()`-et; a stepper mindhárom lépése feltétel nélküli `Link`.
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas` — a meglévő, megosztott „van-e itt bármi”
  predikátum.
- `app/src/pages/Home.tsx` + `app/src/domain/paciensAktivitas.ts` — a Kezdőlap recent-sora már ma
  kiírja a „Terv véglegesítve · az imént” aktivitást.
- `app/src/components/TervWorkflowShell.test.tsx` — a héj meglévő tesztjei (stepper, lépés-őr).

## Approach
Egyetlen fájl: `app/src/components/TervWorkflowShell.tsx`. Üres piszkozaton
(`piszkozatTartalmas` hamis) az `/elonezet` a Kezdőlapra irányít, `replace`-szel; ugyanezen a
feltételen a stepper 3. lépése nem kattintható link. A `/paciens` és a `/terv` érintetlen — üres
piszkozattal azok a vadonatúj terv szabályos kiindulópontjai.

NEM tartozik ide: az „az imént véglegesített terv” kártya és a sikerképernyő
Nyomtatás/Letöltés gombjai (`sikerkepernyo-nyomtatas-letoltes` — oda fut a 15. megállapítás
javasolt iránya); a sikerképernyő újratöltés-túlélése; az előnézet-iframe Vissza-viselkedése
(`elonezet-vissza-iframe-hibaoldal`); a véglegesítés közbeni frissítés megakadályozása
(`beforeunload`); a `PreviewPage` sikerképernyőjének szövegezése.

## Decisions
- A cél a Kezdőlap, nem a frissen véglegesített verzió Terv részletei lapja — mert újratöltés
  után nincs megbízható mutató arra, MELYIK verzió készült el (a „legfrissebb VEGLEGES”
  heurisztika egy párhuzamos fülön más tervre mutatna), a Kezdőlap „Terv véglegesítve · az
  imént” sora viszont már ma megmondja, hogy a mentés sikerült.
- Nem perzisztálunk „utoljára véglegesített” mutatót a sikerképernyő túléléséhez — mert a
  `DraftStorage` egy-kulcs, sosem system-of-record szerződését sértené (`app/src/storage/CLAUDE.md`),
  és a látható haszon a szomszéd tétel kártyájával amúgy is megvan.
- `replace` navigáció — mert egy új history-bejegyzést a Vissza gomb ugyanerre az üres
  előnézetre dobna vissza, hurokba.
- A stepper 3. lépése üres piszkozaton letiltott — mert az őr különben egy szabályos kattintást
  is magyarázat nélkül kidobna a workflow-ból.
- Az őr a héjban él, nem a `PreviewPage`-ben — mert ott a döntés a `Suspense`-betöltés és a
  PDF-generáló effektek UTÁN esne meg; a héj már ismeri a `pathname`-et és a `plan`-t, és a
  stepper is ugyanez a fájl.
- A feltétel a meglévő `piszkozatTartalmas`, nem új predikátum — ugyanaz a kérdés, amit az
  autosave és a Home felülírás-dialógusa is használ.

## Verification
- [ ] tests — üres piszkozattal az `/elonezet` a Kezdőlapot rendereli, nem a checklistet, és nem
      hagy vissza-léphető bejegyzést; tartalmas piszkozattal az Előnézet változatlanul
      megjelenik; üres piszkozaton a stepper 3. lépése nem navigál, tartalmason igen; a
      `/paciens` és a `/terv` üres piszkozattal is elérhető marad
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a letiltott 3. lépés fókusz- és Tab-viselkedése
