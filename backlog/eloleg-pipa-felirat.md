# eloleg-pipa-felirat
Type: feature
Source: doctor-review papirrol (2026-09-05), 16. megállapítás
Target: master
Baseline: 7a2f144418eadd534528b87d48b69aedc2fdb6a3

## Goal
Az előleg-pipa felirata az első szavával kimondja, hogy ez az előleg helye, és nem köti
fogtechnikai munkához: „Előleg feltüntetése a nyomtatványon”.

## Current state
- `app/src/pages/planEditor/ElolegBlokk.tsx` 106. sor: a Checkbox felirata „Ez a terv fogtechnikai
  munkát tartalmaz — előleg feltüntetése”. A pipa `on` állapota komponens-lokális; a `Plan`-en
  csak `elolegOsszeg` (`null` = nincs előleg-sor) él — a felirat nem jelöl fogtechnika-adatot.
- `app/src/pages/planEditor/ElolegBlokk.test.tsx`: 12 helyen
  `getByRole('checkbox', { name: /fogtechnikai munkát tartalmaz/ })` a szelektor.
- A blokk működését (Ft/% váltó, „Fennmaradó rész”, 0 = canonical disable, `elolegTullepi`) a
  `doctor-review nemet-euro` jelentés jónak találta.

## Approach
Egyetlen felirat-string cseréje `ElolegBlokk.tsx`-ben, és a rá hivatkozó teszt-szelektorok
átírása a `ElolegBlokk.test.tsx`-ben. Semmi más: a checkbox viselkedése, az `autoFocus`-szabály,
a Ft/% mód, a `Plan` sémája és a nyomtatvány változatlan.

NEM tartozik ide: a fizetési feltételek sablonszövege
(`app/src/storage/seed/templates.ts`, „Fogtechnikai munkát tartalmazó kezelés esetén {{eloleg}}
fizetendő…”) — az a doki által a Beállításokban szerkeszthető adat, nem kód; a nyomtatvány
előleg-címkéi (`app/src/pdf/labels.ts` `elolegSor`, `fennmaradoResz`, `elolegKifejezes`); a blokk
vizuális elkülönülése a fázis-szerkesztőtől (`nemet-euro` jelentés, külön megfigyelés); az előleg
számítása; a `docs/FEATURES.md` mondata (külön, kézi `/update-features`).

## Decisions
- „Előleg feltüntetése a nyomtatványon” — mert az előleg szó elöl áll (ez a megállapítás lényege),
  és a második fele megmondja, mit tesz a pipa (előleg-sor a nyomtatványon, `elolegOsszeg = null`
  ellentéte); nem „Előleg feltüntetése (fogtechnikai munkánál)”, mert a doki fogtechnika nélkül is
  kér előleget, és a zárójeles megszorítás pont a keresett mezőt rejtené el újra.
- A fogtechnika-hivatkozás nyom nélkül kikerül a feliratból — nem marad segédszövegként sem, mert
  a pipa semmilyen fogtechnika-adatot nem rögzít.
- A teszt-szelektorok a felirat új szövegére állnak át (nem `getByRole('checkbox')` névtelenül) —
  a felirat a megfigyelhető viselkedés része, a teszt őrizze.

## Verification
- [ ] tests — a Kezelések lap alján „Előleg feltüntetése a nyomtatványon” feliratú jelölőnégyzet
      áll; bekapcsolva megjelenik az előleg-mező azonnali fókusszal, kikapcsolva eltűnik és az
      előleg `null` lesz; a Ft/% váltás, a 0-ra kikapcsolás és a „Fennmaradó rész” változatlan
- [ ] typecheck/lint
- [ ] docs-check
