# pdf-verzioszam-mentett-verzio
Type: bug
Source: doctor-review elso-megnyitas (2026-09-05), 1. megállapítás
Target: master
Baseline: 686ef0c1365563dcfcb14274a1b51fd2c0f75fd5

## Goal
A kiadott PDF fejléce és lábléce pontosan azt az azonosítót és verziószámot mutatja, ami a
mentett `terv.json`-ban és a Terv részletei lapon áll — már az első kiadott papíron is.

## Current state
- `app/src/pdf/tervDocument/Chrome.tsx` `MainHeader` a `plan.tervId · v{plan.verzio} ·
  keltezés` sort, `Footer` a `plan.paciens.nev · plan.tervId`-t írja ki.
- A piszkozat `verzio`-ja 0 (`app/src/domain/blankPlan.ts`, `app/src/domain/planCopy.ts`), új
  verzióra nyitáskor a FORRÁS verziószáma marad (`app/src/state/AppState.tsx`
  `loadPlanIntoDraft`); a `tervId` vadonatúj láncnál `''`.
- A tényleges azonosítót a mentés osztja ki: `app/src/storage/DemoStorage.ts` `doSavePlan`
  (`nextVersionNumber`, `generateId`) — a PDF bájtjai viszont már korábban, az előnézetben
  elkészültek (`app/src/pages/PreviewPage.tsx`, `usePDF` + `doFinalize`).
- `app/src/domain/torzsadatBetoltes.ts` `feloldPatientDir`/`feloldTervCimke` már feloldja a
  `patientDir` + `planDir` párost (a PreviewPage ma csak a címkét használja a válaszából).
- `app/src/storage/paths.ts` `nextVersionNumber`, `generateId`, `buildDownloadFileName`.
- Tesztek: `app/src/pdf/TervDocument.test.tsx` (mockolt react-pdf primitívek, a fejlécszöveg
  állítható), `app/src/pages/PreviewPage.test.tsx` (mockolt `usePDF`, valódi `DemoStorage`).

## Approach
Az előnézet a PDF renderelése ELŐTT lefoglalja a végleges azonosítót (`tervId` + `verzio`), a
nyomtatvány ezt kapja, és a véglegesítés ugyanezt adja át a storage-nak.

- Új, sosem dobó feloldó a `app/src/domain/torzsadatBetoltes.ts`-be, a `feloldTervCimke`
  mintáján: a lánc következő szabad verziószáma (`listVersions` + `nextVersionNumber`);
  vadonatúj láncnál `1` + friss `generateId()`.
- `app/src/pages/PreviewPage.tsx`: a foglalás egyszer, az előnézet mountjához kötve, stabilan;
  a `TervDocument`, a `doFinalize` `finalPlan`-je és a „Letöltés” fájlneve
  (`buildDownloadFileName`) ugyanazt kapja. Amíg a foglalás nincs kész vagy nem oldható fel, a
  Letöltés/Véglegesítés le van tiltva — a `pdfError` mintáján, technikai zár, NEM a
  véglegesítés-őr új tétele.
- `app/src/storage/DemoStorage.ts` `doSavePlan`: a kiosztás marad a storage-nál, de a nem nulla
  `plan.verzio`-t ellenőrzi, és eltérésnél dob (semmi nem íródik ki).
- `Chrome.tsx` szövegösszefűzése változatlan: a foglalás után a `tervId` sosem üres.

Nem tartozik ide: a MÁR mentett PDF-ek utólagos javítása (append-only); a piszkozat
`plan.verzio`/`plan.tervId` mezőinek jelentése (marad 0 / üres, a foglalás előnézet-lokális); a
„NEM VÉGLEGES” jelzés (`nem-vegleges-jelzes-pdf`); a leendő verziószám külön kiírása a
szerkesztő felületén.

## Decisions
- Előnézet-lokális foglalás, nem a piszkozatba bélyegezve — mert az üres `plan.tervId` több
  helyen a „vadonatúj lánc" diszkriminátora (`TervCimField`, `PlanEditorPage`,
  `PatientPlanChains`, `domain/piszkozat.ts`); nem a `blankPlan`/`loadPlanIntoDraft`
  bélyegzése, mert az e mezők jelentését írná át az egész appban.
- A feloldás a `torzsadatBetoltes.ts`-be kerül, nem a PreviewPage-be — ott él már a
  `patientDir`/`planDir` feloldás, sosem dobó szerződéssel.
- A `savePlan` marad az autoritás, de eltérő nem nulla `plan.verzio`-nál DOB, nem ír felül
  némán — egy néma felülírás pont ezt a szétcsúszást állítaná vissza; visszaút: az előnézetre
  visszalépve újrafoglal.
- Feloldatlan foglalásnál a gombtiltás a PreviewPage-en, nem a véglegesítés-őrben — ez
  betöltési állapot, nem a tervről szóló tény (a `pdfError` is így zár).
- A letöltés fájlneve átveszi a lefoglalt azonosítót (doki döntése) — a fájlnév és a lapon
  látható fejléc ugyanazt mondja.

## Verification
- [ ] tests — vadonatúj láncnál a nyomtatvány fejléce `<tervId> · v1 · <keltezés>`, és a
      véglegesítés UGYANEZZEL a `tervId`-vel hozza létre a terv-mappát; egy v1-ből nyitott új
      verzió papírján v2 áll, és a mentett `terv.json` is v2; egy lánc RÉGEBBI verziójából
      nyitott új verzió a lánc következő szabad számát kapja, nem forrás+1-et; a lábléc jobb
      oldala sosem végződik magányos „·”-tel; a `savePlan` a lánc következő számától eltérő,
      nem nulla `plan.verzio`-ra dob, és semmit nem ír ki.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf
