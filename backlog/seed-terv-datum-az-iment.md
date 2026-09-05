# seed-terv-datum-az-iment
Type: chore
Source: doctor-review papirrol (2026-09-05), 17. megállapítás
Target: master
Baseline: 9d799e0adf06f246505b42f2065f65d30b23745e

## Goal
Friss demóban egyetlen seed-aktivitás se essen az „az imént" (<60 mp) sávba a Kezdőlapon/páciensválasztóban.

## Current state
- `app/src/storage/seed/plans.ts` — a `UJ_PACIENSEK` tömbben Kiss Márta (`kissma`)
  `terv-veglegesitve` aktivitása `msEzelott: 30 * 1000`; a mellette álló komment szándékosan
  ezt mutatja be „az imént" sávként.
- `app/src/domain/date.ts` `formatRelativIdo` — az „az imént" küszöb (<60 000 ms), változatlan marad.
- `app/src/storage/seed/plans.test.ts` `describe('seedPatients utolsoAktivitas')` — a meglévő,
  adatvezérelt invariáns-tesztek helye egy új esetnek.

## Approach
Kiss Márta `msEzelott` értékét napokkal korábbira állítom, és a mellette lévő, ekkor hamissá váló
kommentet frissítem. Az `AKTIVITAS_ALAPIDO` (betöltéshez képesti relatív eltolás) mechanizmus
nem változik — csak az egyetlen, ténylegesen „imént" sávba eső bejegyzés mozdul. Nem érinti a
`PISZKOZAT`/`VEGLEGES` logikát, a `formatRelativIdo` sávhatárait, sem a többi seed pácienst.

## Decisions
- Az új offset `2 * NAP_MS` (két nappal korábbi) — mert az idea kifejezetten napokkal korábbit
  kér, hogy a Kezdőlap aktivitás-listája elsőre megalapozottnak tűnjön, ne csak épp túl legyen
  az „imént" küszöbön; nem perc/óra skálájú érték, mert az még mindig gyanúsan frissnek hatna.
- Kiss Márta relatív pozíciója az aktivitás-listán belül csökkenhet — nem invariáns, a
  `legutobbAktivPaciensek` adatvezérelt tesztje ezt automatikusan kezeli.

## Verification
- [ ] tests — a `plans.test.ts`-ben új eset: a demó egyetlen valós `utolsoAktivitas`-a se essen
      betöltéskor az „az imént" sávba (<60 mp)
- [ ] typecheck/lint
- [ ] docs-check
