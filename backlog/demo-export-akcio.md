# demo-export-akcio
Type: feature
Source: desktop-app-migration-plan-final.md 6. döntés és §7.1
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
A demó Adatkezelés fülén egy „Adatok exportálása az asztali alkalmazáshoz” gomb letölt egy JSON-fájlt a
doki árlistájával, beállításaival és sablonjaival, páciensadat nélkül.

## Current state
- `app/src/pages/demo/AdatkezelesSection.tsx`: két kártya („Demó adat visszaállítása”, „Adatvédelem” a
  „Minden adat törlése” gombbal); `app/src/pages/demo/AdatkezelesSection.test.tsx`.
- `app/src/storage/PlanStorage.ts`: `loadPriceList`, `loadSettings`, `loadTemplate`; a `listTemplates()` a
  `plan-storage-interfesz-bovites` tétellel jön (előfeltétel, előbb implementálandó).
- `app/src/domain/validate.ts` `assertPriceListShape`, `assertSettingsShape`.
- Letöltési minta: `app/src/components/PatientPlanChains.tsx` (`URL.createObjectURL` + `<a download>`).
- `app/src/components/DemoBanner.tsx` — nem változik.

## Approach
- Új, DOM-mentes export-összeállító a `PlanStorage` interfészen át olvas, alak-ellenőrzés után adja:
  `formatum: 'dental-plan-export'`, `schemaVersion: 1`, `keszult` (ISO időbélyeg), `arlista`,
  `beallitasok`, `sablonok` (fájlnév → szöveg). Az asztali app importja erre a formátumra épül.
- `AdatkezelesSection.tsx`: harmadik kártya a gombbal és rövid magyarázattal (mi kerül bele, mi nem; az
  import a telepített alkalmazásban lesz); letöltés `kezelesi-terv-export-<YYYY-MM-DD>.json` néven; hibánál
  piros `Callout` az okkal, és nincs letöltés.
- NEM tartozik ide: import, a `DemoBanner` szövege, páciensadat, a Nyomtatványok fül mentetlen
  sablon-piszkozata.

## Decisions
- A DEMÓ-sáv most nem változik — a doki döntése 2026-11-16: egy most készült export a további
  demó-szerkesztéstől elavulna; a felszólítás az asztali app telepíthetőségekor kerül be.
- Csak mentett sablonok exportálódnak, a mentetlen piszkozat nem — mert az export a tároló állapotát viszi,
  nem a szerkesztő munkaállapotát.
- Minden sablonfájl bekerül, nem csak a base-enként legfrissebb — mert a fájl-szintű másolat veszteségmentes,
  a válogatás az import dolga.
- Az összeállító a `PlanStorage` interfészen át olvas, nem `localStorage`-ból — tároló-határ invariáns; az
  alak-ellenőrzés exportáláskor bukik hangosan, nem egy friss gépen az importnál.

## Verification
- [ ] tests — a gomb egy JSON-t tölt le a fenti mezőkkel; az árlista és a beállítások a tárolóval egyeznek, a
      sablonok a tárolt fájlneveket tartalmazzák; a fájlban nincs páciens- vagy tervadat; sérült árlistánál
      nincs letöltés és a hiba olvasható
- [ ] typecheck/lint
- [ ] docs-check
