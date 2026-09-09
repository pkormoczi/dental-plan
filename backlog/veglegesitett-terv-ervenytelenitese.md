# veglegesitett-terv-ervenytelenitese
Type: feature
Source: review:2026-09-08-doctor-review-hiba-javitas#3
Target: master
Baseline: 158c403858d49fb669fa8323ad765ce4fb310418

## Goal
A doki egy tévesen kiadott, véglegesített verziót a `⋯` menüből, kötelező indoklással
érvénytelenít: a verzió mindenhol „Érvénytelen" jelvényt, áthúzott összeget és az indoklást
mutatja — és a művelet ugyanonnan visszavonható.

## Current state
- Verzió-menü és verziósor: `app/src/components/PatientPlanChains.tsx` (a `⋯` `DropdownMenu`
  rögzített sorrendje Megnézés / Letöltés / — / Másolás új tervbe / Ugrás; a „Legutóbbi" és
  „Csak ajánlat" jelvény, a soronkénti `formatMoney` és a csukott lánc-fejléc `chainTotal`-ja
  is itt). Két hívó: `app/src/pages/demo/OsszesTervSection.tsx`,
  `app/src/pages/PatientDetailPage.tsx`.
- Verzió-részletek: `app/src/pages/TervReszleteiPage.tsx` `TervMetaadatok` jelvénysora
  („Véglegesített"), összeg `app/src/pages/tervReszletei/PenzugyiOsszesites.tsx`.
- Betöltés: `app/src/domain/planChainData.ts` `loadPlanChainData`; típusok
  `app/src/domain/types.ts` `PlanVersion`, `PlanLabel`.
- Módosítható metaadat a verziómappán KÍVÜL, meglévő minta: `terv-cimke.json` —
  `app/src/storage/PlanStorage.ts` `savePlanLabel`, `app/src/storage/DemoStorage.ts`
  (`listVersions` ma névre szűri a `'terv-cimke.json'`-t), `app/src/storage/demoFileTree.ts`
  `classify` allowlist.
- Érintett meglévő tesztek: `app/src/pages/demo/OsszesTervSection.test.tsx` „a »⋯« menü elemei
  rögzített sorrendben állnak, a legfrissebb sor két látható gombot kap"; „»Csak ajánlat«
  jelvény csak azon a verziósoron jelenik meg, aminek plan.csakAjanlat === true".

## Approach
Új, lánc-szintű sidecar a terv-mappa gyökerén (a `terv-cimke.json` mellett), verziómappa-névre
kulcsolva; új `PlanStorage` metódus írja/törli, a `listVersions` tölti a `PlanVersion` új,
opcionális mezőjébe. UI: új menüpont + saját dialógus kötelező indoklás-mezővel a
`PatientPlanChains.tsx`-ben; jelvény + áthúzott összeg + indoklás a verziósoron, a csukott
lánc-fejlécen (ha a legfrissebb verzió az) és a `TervReszleteiPage` jelvénysorán.

NEM változik: a `terv.json`, a `schemaVersion`, az `assertPlanShape` és a verziómappa tartalma;
a mentett PDF és a „Letöltés" (a kiadott bájtsor változatlan, vízjel nincs); a
`domain/paciensTorles.ts` tiltása; az „Új verzió" és a „Másolás új tervbe" engedélyezettsége; a
véglegesítés-őr; a Kezdőlap és a Páciensek lista (ma nincs bennük összeg). Nem általános
terv-állapot keret — az üzleti állapot (elfogadva/elutasítva) külön tétel.

## Decisions
- Verzió-szintű jelölés, de lánc-szintű fájlban — mert a doki verziónként dönt, viszont
  per-verzió módosítható metaadatra nincs precedens, és a verziómappába írás sértené az
  append-only szabályt; nem `terv.json`-mező, mert az a véglegesített fájl felülírása lenne.
- Külön fájl, nem a `terv-cimke.json` bővítése — mert annak „üres = törlés, vissza az élő
  javaslatra" szemantikája van, ami az érvénytelenítésre értelmetlen.
- A jelölés a `PlanVersion`-re kerül, a `listVersions`-ből — mert a `loadPlanChainData` három
  lépése így nem bővül, és a verziósoron közvetlenül olvasható.
- Visszavonható, a `savePlanLabel` mintájára üres indok = a bejegyzés törlése — a doki döntése;
  a jelölés a verziómappán kívül él, az invariáns így is sértetlen.
- Saját `AlertDialog` a `PatientDetailPage.tsx` törlés-dialógusának mintáján, nem a
  `PlanVersionActionDialog` — mert ez szöveges bevitelt kér, nem piszkozat-őrös megerősítést; a
  `DropdownMenu` `onCloseAutoFocus` gátja itt is kell.

## Verification
- [ ] tests — érvénytelenítés után a verziósor „Érvénytelen" jelvényt, áthúzott összeget és az
      indoklást mutatja, a verzió `terv.json`-ja változatlan; a legfrissebb verzió
      érvénytelenítése a csukott lánc-fejléc összegét is áthúzza; indoklás nélkül nem menthető;
      visszavonás után a sor és a fejléc újra jelöletlen; a Terv részletei lapon ugyanaz a
      jelvény és indoklás; a „Letöltés", az „Új verzió" és a „Másolás új tervbe" változatlanul
      elérhető; a `⋯` menü sorrendje az új ponttal is rögzített
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — áthúzott pénzérték és jelvény kontrasztja, valamint a
      dialógus fókuszgyűrűje jsdom-ban nem ellenőrizhető
