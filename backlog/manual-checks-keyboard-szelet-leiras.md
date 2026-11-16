# manual-checks-keyboard-szelet-leiras
Type: chore
Source: review:2026-11-16-manual-checks-keyboard-a11y#1
Target: master
Baseline: 795034fd86a452fb5e6fe16908bbd090e9f75c4d

## Goal
Nincs doki-látható változás: a `keyboard-a11y` böngészős szelet leírása a katalógus-tételt azzal a
lépéssorral veszi fel, amit a kereső ma ténylegesen kér, az egyedi sort pedig külön lépés ellenőrzi.

## Current state
- `.claude/skills/manual-checks/keyboard-a11y.md` „A kritikus ciklus”: „`type_text` → `wait_for` →
  `press_key ArrowDown` → `press_key Enter`” a katalógus-tétel köreire; „Egyedi sor (nulla találat →
  Enter)” külön bekezdés.
- `app/src/pages/planEditor/ItemPicker.tsx`: minden gépeléskor az első találat kiemelt (`hi` nullázása a
  keresőszöveg változásakor); az opciók végén az „Egyedi tétel felvétele” sor áll. A leírt `ArrowDown`
  ezért a második opcióra lép, egy találatnál az egyedi sorra.
- A 2026-11-16-i menet első köre így „Fognyaki” egyedi sort vett fel a „Fognyaki tömés” helyett
  (`docs/reviews/2026-11-16-manual-checks-keyboard-a11y.md` 1. megállapítás).

## Approach
- Csak a `keyboard-a11y.md`: a katalógus-tétel körei `Enter`-rel induljanak; az 1. ellenőrzés mellé
  kerüljön, hogy a felvett sor neve a katalógus-név, `egyedi` jelölés nélkül; az egyedi sor
  ellenőrzése maradjon külön lépés, a mostani nulla találatos névvel.
- NEM tartozik ide: a `SKILL.md`, a többi szelet, alkalmazáskód, a kereső kiemelési szabálya.

## Decisions
- nincs

## Verification
- [ ] a leírt lépések a `ItemPicker.tsx` mai kiemelési szabályával egyeznek (olvasással ellenőrizve), és a
      katalógus-tétel köre nem vesz fel egyedi sort
- [ ] docs-check
