# fs-storage-alap
Type: feature
Source: desktop-app-migration-plan-final.md §10.2a
Target: master
Baseline: 4eb7a608ad29a5373b1f2e6ffa9cf3d4a2da672f

## Goal
A main processben futó `FileSystemStorage` a közös storage-magot egy valódi gyökérmappán futtatja a
`PlanStorage` szerződés szerint, atomi írással és a platformközi buktatók kezelésével; a doki számára
nincs látható változás, mert a telepített app még nem használja.

## Current state
- A közös mag és a fájlprimitív-interfész az `app/src/storage/` alatt, a `DemoStorage`
  szerződéstesztjei implementációra paraméterezve (`storage-kozos-mag`).
- Megosztott, DOM-mentes modulok a main számára (migrációs terv §9.1): `app/src/storage/paths.ts`
  (`parsePatientDirName`, `parseVersionDirName`, `assertVersionDirAvailable`, `VersionConflictError`,
  `generateId`), `app/src/storage/json.ts` `parseJson`, `app/src/domain/schema.ts`,
  `app/src/domain/validate.ts`, `app/src/storage/seed/` (`priceList`, `settings`, `templates`; a
  `plans` fiktív demó-páciens).
- Build: `app/package.json` `electron:build` = `vite build --mode electron && tsc -p
  tsconfig.electron.build.json`; `app/tsconfig.electron.json` `nodenext`, `include: ["electron"]`,
  `lib: ES2023` (nincs DOM); `app/tsconfig.electron.build.json` `rootDir: electron` — a main ma nem
  importálhat `src/`-beli modult. A meglévő `app/electron/` fájlok `.js` kiterjesztéssel importálnak.
- `app/electron/main.ts`: nincs storage, nincs IPC.
- `app/electron/*.test.ts` vitesttel fut (a globális környezet jsdom).

## Approach
- `app/electron/` alatt fs-alapú fájlprimitívek a közös maghoz: atomi írás (`.tmp-*` → `fsync` →
  `rename`, hibánál a cél érintetlen); `EBUSY`/`EPERM`/`EACCES`-re 100–1600 ms exponenciális
  újrapróba, más errno azonnal a hívóhoz; a listázott és a generált nevek NFC-normalizáltak; az
  I/O-hiba errno-kódot és útvonalat hordozó típusos hibává válik.
- `FileSystemStorage` = közös mag + fs-primitívek egy gyökérmappán. `init()`: a mappa osztályozása
  (üres / a miénk / hiányos / idegen). Üresre a struktúra felépítése a termékbeli seedből (árlista,
  beállítások, sablonok, üres `paciensek/`, demó-páciens nélkül); hiányos és idegen mappára típusos
  hiba, írás nélkül; a miénkre validálás és séma-ellenőrzés. Az osztályozás és a hosszú
  gyökérútvonal (120 karakter fölött) figyelmeztetése külön is lekérdezhető a későbbi varázsló számára.
- `createPatient`: az új mappanév kis-/nagybetű-függetlenül sem ütközhet meglévővel — a mag
  szintjén, mindkét implementációra.
- `savePlan` ebben a tételben manifest nélkül, a verziómappa kizárólagos létrehozásával: létező
  mappára `VersionConflictError`, sosem felülírás.
- Build: a main process bundlerrel (a meglévő Vite) készül tsc-emit helyett, így közvetlenül
  importálhatja a megosztott DOM-mentes modulokat; a `tsconfig.electron.json` bundler-feloldásra
  áll, és a main által használt megosztott modulokat is DOM nélkül ellenőrzi.
- Nem tartozik ide: IPC, preload, a renderer bekötése (`fs-ipc-proxy`); manifest és hiányos verzió
  (`fs-verzio-manifest`); ütközésőr és a `.tmp-*`-maradványok listázása (`fs-utkozesor`);
  napló-redakció; a gyökérmappa kiválasztása (`gyokermappa-varazslo`).

## Decisions
- Sorrend: a `storage-kozos-mag` után, az `fs-ipc-proxy` előtt — mert az IPC a main-oldali storage-ot
  proxyzza, és ez a közös magra épül.
- A main bundlerrel épül — mert a megosztott modulok kiterjesztés nélkül importálnak, és a §9.1
  szerint a main közvetlenül használja őket; nem a `rootDir` tágítása tsc-vel, mert a `src/` importjai
  `nodenext` alatt nem futnának.
- Üres gyökérmappába demó-páciens nem kerül — mert a seed-páciensek fiktívek, teszt-fixture-ök
  (migrációs terv §2, §7.1).
- `savePlan` manifest nélkül, kizárólagos mappalétrehozással — mert a manifest önálló tétel, a
  telepített app ezt a storage-ot még nem használja, a felülírás-tilalom pedig ettől függetlenül áll.

## Verification
- [ ] tests — a közös szerződéstesztek a `FileSystemStorage`-on is zöldek egy `fs.mkdtemp` gyökéren;
      Node-környezetű tesztek: megszakított atomi írás után a cél érintetlen; `EBUSY` az első két
      hívásra, majd siker; tartós `EACCES` → IO-hiba az errno-val; hiányos mappára az `init()` nem ír,
      idegen mappát elutasít, üreset seedből épít fel demó-páciens nélkül; NFD-nevű páciensmappa
      beolvasható és NFC-ben látszik; kis-/nagybetűs névütközés `createPatient`-nél kizárva; létező
      verziómappára `VersionConflictError`, az eredeti érintetlen; magasabb `schemaVersion` betöltése
      megtagadva
- [ ] `npm run test:electron` zöld — a bundlerrel épített main változatlanul indul, CSP-sértés nélkül
- [ ] typecheck/lint — a main és a megosztott modulok DOM nélkül is fordulnak
- [ ] docs-check
