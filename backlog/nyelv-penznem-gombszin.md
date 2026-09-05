# nyelv-penznem-gombszin
Status: planned
Type: bug
Source: docs/reviews/2026-09-05-doctor-review-nemet-euro.md 3. megállapítás
Target: master
Baseline: b6c3430781afbfc51b390fcbc802354b63c1b609

## Goal
A Terv adatai lap nyelv- és pénznemváltás megerősítő dialógusának „Folytatás” gombja mindkét
váltásnál ugyanazt a semleges színt kapja — a nyelvváltás ma egyedül piros, pedig egyik váltás
sem töröl adatot.

## Current state
- `app/src/pages/PatientPage.tsx` — a megerősítő `AlertDialog` „Folytatás” gombja
  `color={pending?.kind === 'nyelv' ? 'red' : undefined}`; `applyNyelv()`/`applyPenznem()`
  csak neveket/árakat frissít, a kézi felülírásokat érintetlenül hagyja.
- `app/src/components/PlanVersionActionDialog.tsx` — a kódbázis konvenciója a kommentben:
  piros csak piszkozat-vesztés kockázatánál. Minden más `AlertDialog.Action` ezt követi.
- `app/src/pages/PatientPage.test.tsx` — a dialógus meglévő tesztjei.

## Approach
Csak a gomb `color` propja változik a `PatientPage.tsx`-ben: a feltétel megszűnik, a gomb
alapértelmezett akcentusszínt kap. Nem változik: a dialógus szövege és élő számlálása
(`nyelvvaltasHatas`/`penznemvaltasHatas`, `penznemDialogSzoveg()`), az `applyNyelv`/`applyPenznem`
viselkedése, a `PlanVersionActionDialog` feltételes pirosa (az helyes, referencia).

## Decisions
- Mindkét váltás semleges — mert a piros a kódbázisban valódi adatvesztést jelöl, és egyik váltás
  sem az; nem a pénznemváltás lesz piros, mert az a konvencióval menne szembe; nem tooltip a
  piros mellé, mert a szín első pillantásra akkor is súlyosabbat sugallna.

## Verification
- [ ] tests — tételes tervben nyelvet váltva a „Folytatás” gomb nem piros; pénznemet váltva
      ugyanígy semleges; a dialógus szövege/számlálása változatlan
- [ ] typecheck/lint
- [ ] docs-check
