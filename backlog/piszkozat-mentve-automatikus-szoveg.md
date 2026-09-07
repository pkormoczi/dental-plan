# piszkozat-mentve-automatikus-szoveg
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 10. megállapítás
Target: master
Baseline: a14eb627fc061274d04d3ba120ac902d0d423da1

## Goal
A doki minden felületen azt olvassa, hogy a piszkozat *automatikusan* mentve van, ezért nem
tölti újra az oldalt, hogy megbizonyosodjon róla.

## Current state
Ugyanaz az autosave-időbélyeg (`piszkozatMentve`, `app/src/state/AppState.tsx`;
`app/src/components/useAktivDraft.ts` `mentve`) három helyen, kétféle szókinccsel:
- `app/src/pages/planEditor/PlanEditorHeader.tsx` — „Piszkozat mentve {idő}”, mellette az
  ütközés-ág „Piszkozat nincs mentve — egy másik ablak változtatása feloldásra vár”
- `app/src/pages/Home.tsx` „Piszkozat folytatása” kártya — „Utolsó módosítás: {idő}”
- `app/src/components/PatientPlanChains.tsx` `AktivDraftBlokk` — „Utolsó módosítás: {idő}”

A formázó `app/src/domain/date.ts` `formatPiszkozatIdo`; a doc-kommentje és az
`app/src/storage/DemoDraftStorage.ts` `ujIdobelyeg` kommentje szó szerint idézi a régi feliratot.
Tesztek: `app/src/pages/planEditor/PlanEditorHeader.test.tsx`,
`app/src/pages/PlanEditorPage.test.tsx` „sikeres autosave után …”,
`app/src/pages/Home.test.tsx`, `app/src/pages/demo/OsszesTervSection.test.tsx`.

## Approach
Csak feliratok + a rájuk illeszkedő teszt-assertionök, és a két hamissá váló komment.
Pozitív felirat mindhárom helyen: „Automatikusan mentve {idő}”. Ütközés-ág: „Nincs
automatikusan mentve — egy másik ablak változtatása feloldásra vár”.

NEM tartozik ide: a `formatPiszkozatIdo` formátuma, az autosave ütemezése/logikája
(`AppState`), a `DraftStorage` ütközés-kezelése és a feloldó dialógus, a piros hiba-Callout
szövege, a „Piszkozat elvetése” gombok és dialógusok feliratai, a `docs/CHANGELOG.md` és a
`docs/reviews/**` (történeti szöveg, nem íródik át).

## Decisions
- Egységes szöveg mindhárom helyen, kettőspont nélkül — mert egy és ugyanaz az adat
  (`piszkozatMentve`); nem marad az „Utolsó módosítás:” forma, mert a kettős szókincs azt
  sugallja, két különböző dologról van szó.
- Ütközésnél „Nincs automatikusan mentve — …” — a pozitív felirat közvetlen tagadása, és
  tényszerű (a mentés nem történt meg); nem „Az automatikus mentés áll”, mert az olyan
  állapotot állítana, amit a kód nem garantál.
- A `date.ts` `formatPiszkozatIdo` doc-kommentje és a `DemoDraftStorage.ujIdobelyeg` kommentje
  frissül — a régi feliratot idézik, azzal hamissá válnának.

## Verification
- [ ] tests — sikeres autosave után a fejlécben „Automatikusan mentve {idő}”; feloldatlan
      ütközésnél helyette „Nincs automatikusan mentve — …” (a pozitív nem látszik); mentési
      hiba mellett a pozitív jelzés továbbra sem látszik; a Home „Piszkozat folytatása”
      kártyán és a páciens terv-listájának aktív-piszkozat kártyáján is az új felirat
- [ ] typecheck/lint
- [ ] docs-check
