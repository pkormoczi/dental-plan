# domain-validate-ts-json-shape
Type: chore
Source: review:2026-08-25-arch-react-review#ARCH-001
Target: master
Baseline: e6b75060a3ee94a43d972cad8779173e2fef42a0

## Goal
A `domain/validate.ts` alak-guardjai teszt alá kerülnek, hogy egy néma regresszió ne hozhassa
vissza a sérült/kézzel piszkált JSON-ból jövő NaN- vagy adatvesztés-hibát anélkül, hogy bármelyik
teszt jelezné. Doki által látható viselkedés nem változik.

## Current state
`app/src/domain/validate.ts` négy exportált guardja: `assertPriceListShape`, `assertPlanShape`,
`assertSettingsShape`, `assertPatientMasterDataShape`, plusz a belső `assertAr`.
`app/src/domain/validate.test.ts` ma csak `assertPlanShape`/`assertPriceListShape` tört-pénz
ágait fedi (a 2026-09-08-as penz-egesz-validacio tételből); `assertSettingsShape` és
`assertPatientMasterDataShape` nincs is importálva, és minden guardnál hiányzik a strukturális
eset: hiányzó/nem-tömb mező, nem-objektum elem, ismeretlen `ar.tipus`, és az érvényes
minimál-alak elfogadása.

## Approach
Csak `app/src/domain/validate.test.ts` bővül. A `validate.ts` nem változik — ha egy új teszt
hibát talál a guard logikájában, az egy külön tétel, nem ennek a chore-nak a része.

## Decisions
- nincs

## Verification
- [ ] tests — minden guard `ValidationError`-t dob hiányzó/nem-tömb mezőnél (`kategoriak`,
      `tetelek`, `orvosok`, `fazisok`, `sorok`), nem-objektum tömbelemnél és ismeretlen
      `ar.tipus`-nál, és átengedi a saját érvényes minimál-alakját;
      `assertSettingsShape`/`assertPatientMasterDataShape` a saját kötelező mezőire
      (`rendelo`, `orvosok`, `ervenyessegNap`, illetve `paciensId`, `nev`, `kiskoru`)
- [ ] typecheck/lint
- [ ] docs-check
