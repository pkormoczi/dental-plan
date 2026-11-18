# lanc-fejlec-hianyos-jelzes
Type: feature
Source: fs-verzio-manifest implementálása közben talált
Target: master
Baseline: 90617d166eb1268c50fc8b87f55c90128b75f7db

## Goal
Csukott terv-láncon, ha a legfrissebb verzió még hiányos, a fejléc a magyarázat nélküli „—” összeg helyett a verziósorral azonos „Szinkron folyamatban vagy hiányos” jelvényt mutatja.

## Current state
- `app/src/components/PatientPlanChains.tsx`: a lánc-fejléc a `legfrissebbVerzio(versions)`-ből számol (`legfrissebb`, `chainTotal`); az összeg csak `!isEditing && !lancNyitva` mellett látszik, `formatMoney(chainTotal?.fizetendo ?? null, …)` → hiányos legfrissebbnél „—”. A verziósor hiányos jelvénye ugyanitt (`hianyos`, „Szinkron folyamatban vagy hiányos”, amber soft `Badge`).
- Teszt-minta: `app/src/pages/PatientDetailPage.test.tsx` „hiányos (még szinkronizálódó) verzió a Kezelési tervek tabon” (`DemoStorage.prototype.listVersions` kém, `lanc-toggle-<planDir>`, `data-plan`).

## Approach
- Csak a `PatientPlanChains` lánc-fejlécének jobb oldali összeg-helye változik: csukott láncon, ha a `legfrissebb.allapot === 'hianyos'`, az összeg helyett a verziósorral azonos jelvény áll; nyitott láncon és teljes legfrissebbnél minden változatlan.
- A jelvény szövege és színe a verziósoréval egy forrásból jön, hogy a kettő ne térjen el.
- NEM ide: a fejléc toggle-gombja, címe, a „Piszkozat” jelvény, a verziósor és a Terv részletei lap; Újraellenőrzés gomb a fejlécen (az a kinyitott sor dolga).

## Decisions
- Csak csukott láncon, az összeg helyén — mert a fejléc összege is csak csukva látszik (nyitva a legfrissebb sor mutatja), ugyanez a redundancia-szabály; nem a toggle-gombon belül, mert akkor a gomb akadálymentes neve nyitás-csukáskor változna.
- Nincs új szöveg vagy szín — mert a doki a sorban már ezt a jelvényt ismeri; egy rövidebb fejléc-változat két néven mutatná ugyanazt az állapotot.

## Verification
- [ ] tests — csukott láncon hiányos legfrissebbnél a fejlécen a jelvény látszik, „—” nincs; kinyitva a fejléc-jelvény eltűnik, a sor jelvénye marad; teljes legfrissebbnél a csukott fejléc a végösszeget mutatja, jelvény nélkül
- [ ] typecheck/lint
- [ ] docs-check
