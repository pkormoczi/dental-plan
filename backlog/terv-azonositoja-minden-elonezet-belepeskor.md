# terv-azonositoja-minden-elonezet-belepeskor
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#3
Target: master
Baseline: 92734bbe9f6c5e5439600135d150c512c85266b6

## Goal
Egy vadonatúj tervlánc azonosítója az első Előnézet-belépéstől a véglegesítésig ugyanaz marad --
a doki tetszőleges „Vissza a szerkesztőbe" → Előnézet kör és böngésző-újratöltés után is azt a
számot látja a papíron, a letöltött PDF nevében és a mentett verzió mappanevében.

## Current state
- `app/src/pages/PreviewPage.tsx` `ujLancTervIdRef` (169) -- a friss lánc id-jét CSAK egy mountra
  stabilizálja; foglaló effekt 171-191, nyomtatványra bélyegzés 346-352, mentés 444-460.
- `app/src/domain/torzsadatBetoltes.ts` `feloldKovetkezoAzonosito` (177) -- üres `tervId`-nél
  `generateId()`; egyetlen hívója a PreviewPage, nem ír, csak olvas.
- `app/src/storage/DraftStorage.ts` `DraftMeta` (20) -- a piszkozat UI-metaadata (`patientDir`,
  `lastRoute`, `tervCim`), `DraftRecord.schemaVersion: 1`.
- `app/src/state/AppState.tsx` -- `piszkozatMeta` (247), meta-rekonstrukció app-bootnál (311) és
  a piszkozat-konfliktus feloldásánál (541), írás-trigger (347-406), `jelezTervCim` (562), a
  metát nullázó `loadPlanIntoDraft` (502) / `copyPlanIntoDraft` (512) / `resetPlanDraft` (460) /
  `discardPersistedDraft` (566) / `markPlanSaved` (575).
- `plan.tervId === ''` = „vadonatúj lánc" diszkriminátor: `app/src/domain/piszkozat.ts:30`,
  `app/src/pages/patientPage/TervCimField.tsx:41`, `app/src/pages/PlanEditorPage.tsx:349`,
  `app/src/components/PatientPlanChains.tsx:298`.
- Tesztek: `app/src/pages/PreviewPage.azonositoFoglalas.test.tsx` (négy eset, remount nincs
  köztük), `app/src/domain/piszkozat.test.ts` „is true once tervId is set",
  `app/src/storage/DemoDraftStorage.test.ts` meta-esetei.

## Approach
A foglalás eredménye a piszkozat metaadatába kerül: új opcionális `DraftMeta` mező a `tervCim`
mintájára, az `AppState` a `piszkozatTervCim`/`jelezTervCim` párral azonos alakban adja ki és
írja, a `PreviewPage` az `ujLancTervIdRef` helyett ezt olvassa, és az első foglaláskor írja
vissza. A két meta-rekonstrukciós hely (app-boot, piszkozat-konfliktus) is átveszi a mezőt,
különben a foglalás ott elveszne. Változik: `DraftStorage.ts`, `DemoDraftStorage.ts`,
`AppState.tsx`, `PreviewPage.tsx`.

NEM tartozik ide: `feloldKovetkezoAzonosito` viselkedése; a `plan.tervId`/`verzio` mezők (a
piszkozatban üresen maradnak); a foglalás korábbra hozása a terv indításához; az azonosító
megjelenítése a szerkesztőben; `schemaVersion` emelés; az id ütközés-ellenőrzése.

## Decisions
- A foglalt id a `DraftMeta`-ba kerül, nem a `plan.tervId`-be -- mert az üres `tervId` négy
  helyen a „vadonatúj lánc" diszkriminátora (a `PreviewPage.tsx:346-349` komment ezt kimondja),
  a bélyegzés átírná a `piszkozatTartalmas` / `TervCimField` / `PlanEditorPage` /
  `PatientPlanChains` jelentését, és a „feloldhatatlan foglalás" zárat hamisan kiváltaná. A
  review javasolt iránya (`plan.tervId`) ezért nem érvényesül; a doki-látható eredmény azonos.
- Opcionális mező, `schemaVersion` marad 1 -- a régi rekord hiányzó mezője „még nincs foglalás";
  a `tervCim` bevezetésének mintája.
- A foglalás az első Előnézet-belépéskor születik (doki döntése, 2026-09-09), nem a terv
  indításakor -- a szerkesztőben nincs látható azonosító, és ez a jelentés siker-mércéje.
- A foglalás a piszkozattal együtt szűnik meg -- a metát a `loadPlanIntoDraft` /
  `copyPlanIntoDraft` / `resetPlanDraft` / `discardPersistedDraft` / `markPlanSaved` már ma
  nullázza, új terv tehát új számot kap.
- Nem perzisztált (`piszkozatTartalmas` false) piszkozatnál a foglalás nem éli túl az
  újratöltést -- üres terven az Előnézet amúgy sem ad kiadható papírt; az autosave-triggert nem
  bővítjük.

## Verification
- [ ] tests -- ugyanaz az azonosító a papíron és a PISZKOZAT-PDF fájlnevében egy Előnézet →
      szerkesztő → Előnézet kör után; ugyanaz a piszkozat újratöltése (app-boot) után is; a
      véglegesített verzió mappaneve és `terv.json`-ja ezt az azonosítót kapja; új terv indítása
      és másolatból indítás után MÁS azonosító; meglévő láncnál (nem üres `tervId`) a mai
      viselkedés változatlan, a feloldhatatlan foglalás továbbra is zár
- [ ] typecheck/lint
- [ ] docs-check
