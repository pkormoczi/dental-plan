# terv-cim-enter
Type: feature
Source: doctor-review papirrol (2026-09-05), 15. megállapítás
Target: master
Baseline: ed553e5f4e2af2d76805bdbcf1246529da175565

## Goal
A Terv adatai lapon az Enter minden szöveges mezőben a következő mezőre viszi a fókuszt (az
utolsóból a „Tovább” gombra); a Terv címe mentett láncon emellett ment, és „Mentve ✓” jelzi.

## Current state
- `app/src/pages/patientPage/TervCimField.tsx` — az `onKeyDown` Entert csak `dirty && !saving`
  mellett kezel; `dirty` `isNewChain` ágon mindig `false`, ezért új terven az Enter néma. Saját
  `saving` state-et tart, a mentés egyetlen visszajelzése a „Mentés” gomb eltűnése.
- `app/src/pages/PatientPage.tsx` — a lap szöveges mezői stabil `id`-vel (`paciens-nev`,
  `paciens-szuletesiido`, `paciens-taj`, `paciens-lakcim`, `paciens-telefon`, `paciens-email`,
  `paciens-torvenyes-kepviselo`); a „Tovább a terv szerkesztőhöz” gombnak nincs `id`-je.
- `app/src/components/useMentesJelzo.ts` — meglévő „Mentve ✓” primitív (`saving`/`saved`/
  `futtat`, 2 mp, unmount-takarítással).
- `app/src/components/PatientPlanChains.tsx` `saveLabel` (226. sor) és
  `app/src/pages/tervReszletei/FazisokBlokk.tsx` (181. sor) — a meglévő
  `document.getElementById(id)?.focus()` fókuszmozgatás-minta.
- Tesztek: `app/src/pages/PatientPage.test.tsx` „terv címe mező” describe (Enterrel mentés,
  hibaág, navigáció-túlélés).

## Approach
Új közös helper a fókuszláncolásra `app/src/pages/patientPage/` alatt (id alapján, a fenti
meglévő minta szerint). `TervCimField.tsx`: az Enter mindkét állapotban tovább visz; mentett
láncon előbb ment, a saját `saving` state helyére `useMentesJelzo` kerül, a „Mentve ✓” a mező
mellett jelenik meg. `PatientPage.tsx`: az Enter-lánc Név → Született → TAJ → Lakcím → Telefon →
E-mail → (Kiskorúnál Törvényes képviselő) → a „Tovább” gomb, ami `id`-t kap.

NEM tartozik ide: az Új páciens dialógus Entere (`uj-paciens-enter-mentes`, külön tétel); a
`PatientPlanChains` ceruza-szerkesztője és a `PatientEditorPanel` (más felület); a nem szöveges
kontrollok (Kiskorú checkbox, nyelv/pénznem `ChipGroup`, orvos `Select`) és a Dátumok szekció
„Érvényes eddig” mezője — a lánc az E-mailnél/Törvényes képviselőnél a „Tovább” gombra zár.

## Decisions
- Fókuszmozgás `id` + `getElementById().focus()` a meglévő minta szerint, közös helperben — mert
  a mezőknek már van stabil `id`-jük; nem ref-lánc, mert a feltételes Törvényes képviselő mező
  egy ref-tömböt törékennyé tenne.
- A „Mentve ✓” a meglévő `useMentesJelzo` (2 mp) — mert a jelző-primitív és az unmount-takarítás
  már megvan; nem új komponens.
- A „Mentve ✓” a „Mentés” gombra kattintva is megjelenik (ugyanaz a mentési út), de a fókuszt
  csak az Enter mozgatja — a gombról elrángatni a fókuszt váratlan lenne.
- Sikertelen mentésnél a fókusz a Terv címe mezőben marad — a hibaüzenet a mező alatt jelenik
  meg, az elugró fókusz elvágná az összefüggést.
- A „Tovább” gomb csak fókuszt kap, nem sül el — az azonnali navigáció épp az
  `uj-paciens-enter-mentes` panaszolt mintája lenne.

## Verification
- [ ] tests — új terven a Terv címe mezőből Enter → a fókusz a „Név *” mezőn, „Mentve ✓” nélkül;
      mentett láncon Enter → a cím a `terv-cimke.json`-ban, „Mentve ✓” látszik, a fókusz a Néven;
      sikertelen mentésnél a fókusz a Terv címe mezőben marad a hibaüzenet mellett; a Név mezőből
      Enter → Született; az E-mailből Enter → a „Tovább” gomb kap fókuszt; Kiskorú bepipálva az
      E-mailből Enter → Törvényes képviselő
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
