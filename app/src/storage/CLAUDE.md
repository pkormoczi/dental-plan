# app/src/storage

## Mental model
- Gyökérmappa = teljes rendszerállapot; `paths.ts` a névkonvenciók egyetlen helye.
  → symbol:app/src/storage/paths.ts#buildPatientDirName
- Mappanévben az ékezetek maradnak, csak tiltott karakter cserélődik; rövid nevek.
  → product:#adat-es-deployment-korlatok
- Verziómappa append-only: `savePlan` mindig `_v<n+1>`.
  → test:app/src/storage/DemoStorage.test.ts#savePlan on an existing tervId appends v2 without touching v1;
  symbol:app/src/storage/paths.ts#assertVersionDirAvailable
- Magasabb `schemaVersion` → betöltés megtagadva, minden JSON-ra.
  → test:app/src/storage/DemoStorage.test.ts#rejects loading a paciens-adatok.json with a newer-than-known schemaVersion
- `paciens.json`, `terv-cimke.json` csak index, sosem írja felül a `terv.json` `paciens` blokkját;
  `paciens-adatok.json` system of record a saját mezőire, nincs auto-szinkron.
  → symbol:app/src/domain/paciensAdatok.ts#paciensIndexNev
- `DraftStorage` a `PlanStorage` testvére, sosem system of record; egy kulcs, egy példány.
  → symbol:app/src/storage/DemoDraftStorage.ts#DRAFT_KEY; symbol:app/src/storage/StorageContext.tsx#drafts
- Updater-szerződés (`saveSettings`/`savePriceList` függvényt fogad) az `AppState`-en él; a
  `PlanStorage` kész értéket kap, a `DemoStorage` sorosít.
  → test:app/src/state/AppState.test.tsx#két, egy tickben indított savePriceList updater mindkét hatása perzisztál
- Ártétel-`id` sosem újra; törlés helyett `aktiv: false`.
  → test:app/src/domain/priceListIds.test.ts#törlés után nem ismétli meg a legnagyobb korábbi id-t
- `arlistaVerzio` minden admin-mentéskor a mai nap — a hívóban. → symbol:app/src/pages/PriceListAdminPage.tsx#arlistaVerzio
- `deletePatient` feltétel nélkül töröl; előfeltétel a hívóé. → symbol:app/src/domain/paciensTorles.ts#paciensTorlesAkadaly

## Boundary
- `PlanStorage`-on kívül semmi nem tudja, melyik implementáció fut; `DemoStorage` import kívülről
  lint-tiltott, egyetlen út a `useStorage()`. → symbol:app/src/storage/PlanStorage.ts#PlanStorage
- Demó-only felület (`listFileTree`, `readRawFile`, `isSeedVersion`, `resetDemoData`) a
  `StorageContext`-en él, nem az interfészen — a `FileSystemStorage`-váltásnál megszűnik.

## Find before writing
- paths: `buildPlanDirName`, `nextVersionNumber`, `buildDownloadFileName` · json: `parseJson` (nincs csupasz `JSON.parse`)
- state/AppState: `useAppState` (a piszkozat tulajdonosa), `loadPlanIntoDraft`, `copyPlanIntoDraft`
  · state/planIndulas: `ujTervForrasPaciensbol`
