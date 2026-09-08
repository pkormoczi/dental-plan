# keltezes-datum-szerkesztheto
Type: feature
Source: doctor-review papirrol (2026-09-05), 5. megállapítás
Target: master
Baseline: 5a01fcca1fbb71106058cc753c9675da2f51d0d3

## Goal
Papírról bevitt tervnél a doki a Terv adatai lapon átírhatja a keltezést az eredeti napra;
korábbi terv új verziójánál a lap megmondja, miért a mai dátum áll ott.

## Current state
`app/src/pages/PatientPage.tsx` „Dátumok” szakasz: a `keltezes` `ReadOnlyField` (502. sor),
alatta az `ervenyesIg` szerkeszthető `Field` + `TextField.Root type="date"`, `alapErvenyesIg`
= `addDaysIso(plan.keltezes, settings.ervenyessegNap)`, `ervenyesIgEltrErAlaptol` gomb és az
`ervenyesIgHibas` amber Callout („Az érvényesség vége a kiadás dátuma előttre esik.”).
Meglévő teszt: `app/src/pages/PatientPage.test.tsx` „a »Kiadás dátuma« nem szerkeszthető…” —
ez a viselkedés változik; a szakasz fölötti komment is hamissá válik (és legacy azonosítót
tartalmaz).

A két eset megkülönböztetése: `app/src/state/AppState.tsx` `loadPlanIntoDraft` megőrzi a
forrás `verzio`-ját és `frissDatummal`-lal mai dátumot bélyegez
(`app/src/domain/ujVerzioDatum.ts` — a dátumbélyeg egyetlen forrása), míg
`app/src/domain/blankPlan.ts` és `planCopy.ts` `verzio: 0`-t ad. A frissítés tényét a
szerkesztőben már jelzi a `frissitettDatum` sáv (`app/src/pages/PlanEditorPage.tsx:343`).

A `keltezes` a nyomtatványra (`app/src/pdf/tervDocument/Chrome.tsx`, `pdf/TervDocument.tsx`
aláírássor) és a mentett verzió mappanevébe is megy
(`app/src/storage/paths.ts` `buildVersionDirName`, `storage/DemoStorage.ts` `savePlan`); a
„legfrissebb verzió” e szerint rendez (`app/src/domain/planFolders.ts`
`verziokFrissessegSzerint`).

## Approach
`app/src/pages/PatientPage.tsx` „Dátumok” szakasza: új tervnél szerkeszthető keltezés
(a szomszédos `ervenyesIg` mező mintájára), korábbi terv új verziójánál marad az olvasható
mező + rövid magyarázat („A nyomtatvány a mai dátummal készül”). A jövőbeli dátum jelzése és
az `ervenyesIg` követése ugyanitt. A hozzá tartozó tesztek
`app/src/pages/PatientPage.test.tsx`-ben.

NEM tartozik ide: a mezőcímke terminológiája („Kiadás dátuma” vs. a nyomtatvány „Keltezés”-e)
és a dátumok megjelenési alakja (`datummezo-formatum-inkonzisztens`); a `ujVerzioDatum.ts`
szerződése és a `PRODUCT.md` § Napi flow 4. pontja (a betöltéskori frissítés változatlan); a
`TervReszleteiPage` mentett terv nézete (pillanatkép, olvasható marad); a `pdf/` és a
`storage/` — a beírt dátum a meglévő úton megy tovább, ott nincs változás.

## Decisions
- A szerkeszthetőség az új terv piszkozatához kötött (`verzio: 0`), nem külön kapcsolóhoz —
  ez a meglévő, megfigyelhető jelzés a két eset között; így egy visszadátumozott verzió nem
  kerülhet a saját láncán belül egy frissebb verzió mögé.
- Jövőbeli keltezés a „Dátumok” szakasz Calloutjaként jelenik meg, nem a véglegesítés-őr új
  tételeként — a pontosan analóg `ervenyesIgHibas` is így él; a `veglegesitesOr` bővítése
  külön termékdöntés lenne.
- Az `ervenyesIg` követi a keltezést, amíg az alapértéken áll, kézi érték után nem — ez a
  „követi, amíg kézzel el nem térítik” minta (`domain/arKoveti.ts`, `domain/nev.ts`).
- Elfogadott következmény: egy augusztusra visszadátumozott új terv a páciens „legfrissebb
  verziója” keresésénél a szeptemberi lánc mögé kerül — ez helyes, az a terv tényleg régebbi.

## Verification
- [ ] tests — új terv Terv adatai lapján a keltezés átírható múltbeli napra, és a beírt dátum
      marad a terven; jövőbeli dátumra hibaüzenet jelenik meg a szakaszban; az „Érvényes
      eddig” elmozdul a keltezéssel, ha alapértéken állt, és marad, ha kézzel átírták;
      korábbi terv új verziójánál a keltezés nem szerkeszthető, és látszik a magyarázat
- [ ] typecheck/lint
- [ ] docs-check
