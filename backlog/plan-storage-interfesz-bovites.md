# plan-storage-interfesz-bovites
Type: chore
Source: desktop-app-migration-plan-final.md §4.3 és §10.0
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
A doki számára nincs látható változás: a mentett PDF betöltése, a legfrissebb sablon betöltése és a
sablonfájlok listázása a `PlanStorage` szerződés része lesz, hogy a demó-export és a későbbi
FileSystemStorage ugyanarra építsen.

## Current state
- `app/src/storage/PlanStorage.ts` `PlanStorage`: nincs benne `loadPlanPdf`, `loadLatestTemplateByBase`,
  `listTemplates`; a fejléc-komment még `showDirectoryPicker()`-t említ (hamis, a 2. fázis Electron).
- `app/src/storage/StorageContext.tsx` `StorageContextValue`: `loadPlanPdf` és `loadLatestTemplateByBase`
  külön demó-mezőként; a fejléc-komment ezeket demó-kényelemnek nevezi.
- `app/src/storage/DemoStorage.ts` `loadPlanPdf`, `loadLatestTemplateByBase`, `latestTemplateFile` (a
  `TEMPLATES_PREFIX` kulcsait járja be).
- Hívók a `useStorage()`-ból: `components/PatientPlanChains.tsx`, `pages/Home.tsx`, `pages/PreviewPage.tsx`,
  `pages/TervReszleteiPage.tsx`, `pages/settings/EgyebTab.tsx` (kommentje is erre hivatkozik),
  `pages/settings/NyomtatvanyokTab.tsx`.
- `app/src/storage/DemoStorage.test.ts` „roundtrips the pdf bytes saved alongside a plan”, „saveTemplate
  overwrites the highest existing version, leaving lower ones untouched”.

## Approach
- A három metódus a `PlanStorage` interfészre kerül; a `DemoStorage` a meglévő kettőt változatlanul adja,
  a `listTemplates()` a `sablonok/` fájlneveit adja vissza rendezve.
- A két mező kikerül a `StorageContextValue`-ból, a hívók a `storage`-on át érik el. Az `isSeedVersion`,
  `listFileTree`, `readRawFile`, `resetDemoData`, `clearAll` a kontextuson marad (demó-only).
- A hamissá vált kommentek javítása (`PlanStorage.ts`, `StorageContext.tsx`, `EgyebTab.tsx`).
- NEM tartozik ide: a `listVersions()` `allapot` mezője, a `saveTemplate` sorosítása, FileSystemStorage-kód.

## Decisions
- A `listVersions()` `allapot: 'teljes' | 'hianyos'` mezője a manifestet író FileSystemStorage-tétellel jön,
  nem most — mert ma se termelője, se fogyasztója nem lenne, a hiányos verzió felületi kezelése csak ott
  tesztelhető; ez eltér a végleges terv §10.0 felsorolásától.
- `listTemplates()` fájlneveket ad (`nyilatkozat-hu-v1.md`), nem base-eket — mert az export és a
  FileSystemStorage is fájlszinten dolgozik.

## Verification
- [ ] tests — `listTemplates()` a seed-sablonok minden fájlnevét adja, egy `saveTemplate` után sem duplikál;
      a PDF-megnyitás, az Előnézet és a Nyomtatványok fül sablonbetöltése a kontextus-mezők nélkül is a
      korábbi módon működik (a meglévő oldaltesztek zöldek)
- [ ] typecheck/lint
- [ ] docs-check
