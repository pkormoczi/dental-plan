# uj-paciens-enter-mentes
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 7. megállapítás
Target: master
Baseline: dc70a1125e52b80727c3813dbe8a667cc35449b7

## Goal
Az „Új páciens” dialógusban az Enter mezőnként a következőre visz (Név → Született → Telefon →
Mentés gomb fókusz, nem azonnali mentés); sikeres mentés után mindkét célképernyőn „<Név> felvéve”
jelzés fogadja a dokit.

## Current state
- `app/src/pages/paciensek/UjPaciensDialog.tsx` — a `<form onSubmit>` (208–212. sor) natívan
  lefut Enterre bármelyik mezőből; a három mező stabil `id`-vel (`uj-paciens-nev`,
  `uj-paciens-szuletesiido`, `uj-paciens-telefon`), egyiken sincs `onKeyDown`. A „Mentés” gombnak
  (`type="submit"`, 275–277. sor) nincs `id`-je. `handleSubmit` a `nevTrim`/`dob`-validáció után
  hívja `onSave`-et.
- `app/src/pages/PaciensekPage.tsx` `handleCreatePatient` (83–103. sor) — sikeres mentés
  `navigate(.../paciensek/:dir, { state: { tab: 'adatai', mod: 'szerkesztes' } })`.
- `app/src/pages/NewPlanPage.tsx` `createAndStart` (116–128. sor) →
  `app/src/components/PlanVersionActionDialog.tsx` `ujTervPaciensAdataival` (161–172. sor) →
  `navigate('/paciens')` (a `PatientPage.tsx`).
- `app/src/pages/PatientDetailPage.tsx` (75., 82. sor) és `app/src/pages/PaciensekPage.test.tsx`
  (31–33. sor) — a meglévő `location.state`-minta (`tab`, `mod`) lapok közti jelzésre.
- `app/src/pages/PatientPage.tsx` — a Terv adatai lap teteje, ahova a NewPlanPage-ág navigál.
- Tesztek: `app/src/App.test.tsx` (50–54. sor), `app/src/pages/PaciensekPage.test.tsx` (142–166.
  sor), `app/src/pages/NewPlanPage.test.tsx` (352–399. sor) — mind a Mentés gombot kattintják, nem
  Entert nyomnak, tehát a mai tesztkészlet a hibás Enter-utat nem fedi.

## Approach
`UjPaciensDialog.tsx`: a három mezőre `onKeyDown` kerül (Enter → `preventDefault` + fókusz a
következőre, a Telefonról a Mentés gombra, ami `id`-t kap) — a `terv-cim-enter` tervben már
eldöntött `id` + fókusz-minta szerint. A `<form onSubmit>` marad a gombról jövő Enterre/kattintásra.
Új, megosztott jelző a „<Név> felvéve” szöveghez, amit mindkét hívó a saját sikeres mentési ágán
ad tovább a célképernyőnek — a meglévő `location.state`-mintát bővítve (a `PaciensekPage.tsx` és a
`PlanVersionActionDialog.tsx`/`NewPlanPage.tsx` navigációs hívásainál), a `PatientDetailPage.tsx`
és a `PatientPage.tsx` fogadja és jeleníti meg, önmagát eltüntetve.

NEM tartozik ide: a dialógus mezőkészletének bővítése (az idea fájl explicit kizárja); a
duplikáció-megerősítő `AlertDialog` (`nyitMegerosites`/`megerositesAkcio`) Enter-kezelése — az a
gombra kattint, nem szöveges mezőt zár le; a `torzsadat-elteres-ures-mezo` (a kimaradt telefonszám
utólagos pótlásának csapdája, külön tétel); a letöltött fájl neve.

## Decisions
- A „felvéve” jelzés a meglévő `location.state`-mintára épül (mint a `tab`/`mod`), nem új
  globális toast-rendszer — mert mindkét célképernyő már `navigate(..., { state })`-tel érkezik,
  és a mintát a `PatientDetailPage.tsx` már ismeri.
- A Mentés gomb `id`-t kap a fókuszmozgatáshoz — a `terv-cim-enter` tervben lezárt
  `document.getElementById(id)?.focus()` mintát követve, nem ref-láncot.
- A duplikáció-megerősítő dialógus Enter-kezelése változatlan — az egy `AlertDialog` gombra fut,
  nem a most bővített szöveges mezőkre.

## Verification
- [ ] tests — a Név mezőből Enter a Született mezőre viszi a fókuszt (nem ment, nem navigál); a
      Telefonból Enter a Mentés gombra viszi a fókuszt; egy második Enter (a gombról) ment; sikeres
      mentés után a Terv adatai lapon ÉS a páciens részletoldalán (szerkesztés módban) megjelenik a
      „<Név> felvéve” jelzés
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
