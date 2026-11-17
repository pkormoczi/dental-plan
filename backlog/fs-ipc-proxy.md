# fs-ipc-proxy
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 4eb7a608ad29a5373b1f2e6ffa9cf3d4a2da672f

## Goal
A renderer a `PlanStorage`-ot IPC-n át éri el a main-oldali `FileSystemStorage`-on, típusos
hibaeredménnyel és kikényszerített main-oldali őrökkel; a doki számára nincs látható változás — a
telepített app gyökérmappa nélkül, ahogy ma, a `DemoStorage`-on fut.

## Current state
- `app/electron/main.ts` `WEB_BEALLITASOK` (`contextIsolation`, `sandbox`, `nodeIntegration: false`):
  nincs preload és nincs `ipcMain`; a `DENTAL_PLAN_TESZT_USER_DATA` a teszt-hook mintája.
- `app/electron/navigacio.ts` `sajatOrigin`, `app/electron/protocol.ts` `APP_ORIGIN`.
- `FileSystemStorage` és fs-primitívek az `app/electron/` alatt (`fs-storage-alap`).
- Hibák ma: `VersionConflictError` (`app/src/storage/paths.ts`), `SchemaVersionError`
  (`app/src/domain/schema.ts`); a `parseJson` (`app/src/storage/json.ts`) csupasz `Error`-t dob.
- `app/src/storage/StorageContext.tsx`: mindig `DemoStorage`, a demó-only mezőkkel (`listFileTree`,
  `readRawFile`, `isSeedVersion`, `resetDemoData`, `clearAll`).
- `app/src/domain/paciensTorles.ts` `paciensTorlesAkadaly`: a piszkozatos ága a renderer piszkozatán
  múlik.
- `app/src/domain/validate.ts` `assertPlanShape`, `assertPriceListShape`, `assertSettingsShape`,
  `assertPatientMasterDataShape`; `app/src/storage/paths.ts` `parsePatientDirName`,
  `parsePlanDirName`, `parseVersionDirName`.
- `app/e2e/electronApp.ts` `inditas`, `app/e2e/fust.spec.ts`.

## Approach
- Preload (contextBridge): csak a storage-csatornák szűk `invoke`-ja kerül a rendererbe, más Node-
  vagy Electron-API nem.
- Main: `storage:<metódus>` handlerek. Mindegyik előbb a küldőt ellenőrzi (a főablak top-frame-je a
  saját originen; más küldő → elutasítás hibaeredménnyel), majd a bemenetet futásidőben validálja
  (alak-őrök; PDF `Uint8Array`, legfeljebb 20 MB; `patientDir`/`planDir`/`versionDir` a névnyelvtan
  szerinti egyetlen útvonalelem, elválasztó és `.`/`..` nélkül). Minden útvonal `realpath` után is a
  gyökérmappán belül marad (symlink/junction-kilépés elutasítva). `deletePatient` előtt a main újra
  listázza a páciens terveit; ha azóta verzió érkezett, törlési akadályt ad, és nem töröl.
- A válasz kivétel helyett diszkriminált unió (`ok` / `hiba`) a migrációs terv §3.3 teljes
  `StorageHiba`-készletével. A renderer-oldali `ElectronStorage implements PlanStorage` ezt a mai
  hibaosztályokra (`VersionConflictError`, `SchemaVersionError`, sérült JSON) és az újakra
  (`FelulirasUtkozesError`, `HianyosVerzioError`, `IoError`, törlési akadály) fordítja, payloaddal,
  így a pages-kód `try/catch`-es marad. A hibaosztályok megosztott, DOM-mentes modulban élnek; a
  `parseJson` felismerhető hibaosztályt kap, a mai üzenettel.
- PDF-bájtok `Uint8Array`-ként, base64 nélkül.
- `StorageContext`: ha a preload-API elérhető és a main gyökérmappát jelez, `ElectronStorage`;
  különben `DemoStorage`, ahogy ma. Gyökérmappa ebben a tételben csak teszt-hookból jön
  (`DENTAL_PLAN_TESZT_GYOKER`). `ElectronStorage` mellett a demó-only mezők üresek, no-op.
- Nem tartozik ide: gyökérmappa-config és varázsló; hiba-felületek; ütközésőr és az `AppState`
  ütközés utáni állapota (`fs-utkozesor`); napló és redaktált útvonal (`fs-naplo-redakcio`);
  `shell.openPath` és dialógusok.

## Decisions
- Gyökérmappa csak teszt-hookból — mert a választás a `gyokermappa-varazslo` tétele, a doki
  telepített appja addig a `DemoStorage`-on marad; a hook a `DENTAL_PLAN_TESZT_USER_DATA` mintája.
- A teljes `StorageHiba`-unió most — mert egy szerződés; a még elő nem állított ágakat
  (`FELULIRAS_UTKOZES`, `HIANYOS_VERZIO`) a későbbi tételek töltik meg.
- A main törlés előtti újraellenőrzése csak az „azóta terv érkezett” ágra — mert a piszkozat a
  renderer `localStorage`-ában él, a main nem látja.
- 20 MB PDF-korlát — a migrációs terv §3.2 javasolt értéke.

## Verification
- [ ] tests — idegen küldő, `..`-t vagy elválasztót tartalmazó útvonalelem, gyökéren kívülre mutató
      symlink, 20 MB fölötti PDF, `deletePatient` frissen érkezett tervvel: mind elutasítva, írás
      nélkül; minden `StorageHiba`-ág a megfelelő hibaosztályként és payloaddal jön ki a
      renderer-proxyból
- [ ] `npm run test:electron` — teszt-gyökérmappával a csomagolt appban egy páciens felvitele a
      gyökérmappában mappát hoz létre, és újraindítás után is látszik, CSP-sértés nélkül; teszt-gyökér
      nélkül a meglévő füst-tesztek változatlanul zöldek
- [ ] typecheck/lint
- [ ] docs-check
