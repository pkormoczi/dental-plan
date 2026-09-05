# fogterkep-hozzaadas-fazisvalasztas
Type: feature
Source: Réka feedback 2026-08
Prio: later
Target: master
Baseline: 58f063df9d423a56d92ec99aef0e9a7bb68f2ba3

## Goal
A szerkesztő fogtérképe kattintásra már nem hoz létre sort: kezelt fogra a sorára ugrik (ismételt
kattintásra körbe), kezeletlen fogra nem történik semmi. A kezeléseket kizárólag a tétel-felvitel
kezeli.

## Current state
- `app/src/pages/PlanEditorPage.tsx` `onToothClick` — két ág: `cimek.length === 0` esetén tétel
  nélküli sort push-ol a `celFazisIndexClamped` fázisba és a soron belüli keresőre fókuszál;
  egyébként a `ciklusRef` körbejárásával a meglévő sorra fókuszál.
- `app/src/pages/PlanEditorPage.tsx` `celFazisIndex` / `celFazisIndexClamped` — kizárólag a
  hozzáadó ágat szolgálja ki.
- `app/src/components/ToothChartPanel.tsx` — „Új sor ide:" `Select` (`fazisok`, `celFazisIndex`,
  `onCelFazisChange` propok), és a `!hasFogterkep` üres állapot szövege („Kattints egy fogra, és
  felveszünk rá egy sort…").
- `app/src/pages/PlanEditorPage.sorok.test.tsx` „PlanEditorPage -- kattintható fogtérkép":
  „üres terven a fogtérkép csukva indul…", „kezeletlen fogra kattintva új, tétel nélküli sort hoz
  létre…", „már kezelt fogra kattintva a sorára ugrik…", „egyetlen fázisnál nincs fázisválasztó…".
- Változatlan referencia: `app/src/pages/tervReszletei/FogterkepPanel.tsx` (ugyanez a
  navigáció-csak viselkedés), `app/src/components/DentalChart.tsx`, és a fogszám-megadás két
  másik útja: `app/src/components/ToothPickerPopover.tsx`, a sor `Fog` mezője.

## Approach
Változik: `PlanEditorPage.tsx` (az `onToothClick` hozzáadó ága, a `celFazisIndex` state, a
`ToothChartPanel` fázis-propjai), `ToothChartPanel.tsx` (a `Select` és a fázis-propok törlése,
üres állapot szövege), `PlanEditorPage.sorok.test.tsx`.

NEM változik: `DentalChart.tsx` (marad `toolbar`, egy Tab-megálló, Enter/szóköz aktiválás), a
panel helye és csukott alapállapota, `ToothPickerPopover`, a sor `Fog` mezője, a `Terv részletei`
fogtérképe, a nyomtatvány/PDF fogtérkép, a domain (`fazisok`/`sorok` séma érintetlen).

A `/finish` egy Nem cél sort ír a `docs/PRODUCT.md`-be: a fogtérkép nem tétel-felviteli felület.

## Decisions
- Navigáció-csak, nem teljesen passzív ábra — mert a kezelt fogra ugrás a `Terv részletei` lapon
  már ma is ez, és Tab-megálló nélkül a doki elveszítené a fog→sor navigációt; nem `role="img"`
  readonly mód, mert az a meglévő, nem panaszolt viselkedést is elvinné.
- Kezeletlen fogra a kattintás némán nem csinál semmit — mert az üres állapot szövege és a sor
  `Fog` mezője elmondja a helyes utat; nem külön üzenet-visszajelzés, mert egy önmagát törlő
  státuszsáv új állapotot vezetne be egy visszabontás kedvéért.
- A `celFazisIndex` state és az „Új sor ide:" `Select` törlődik, nem marad kikapcsolva — az
  egyetlen fogyasztójuk a törölt ág.
- Az üres állapot szövege a maradó két útra mutat (sor `Fog` mezője, fogválasztó ikon) — mert a
  mai mondat a törölt viselkedést ígéri.

## Verification
- [ ] tests — kezeletlen fogra kattintva nem keletkezik új sor, a fázis sorainak száma
      változatlan; kezelt fogra kattintva a sorára ugrik, ismételt kattintásra körbeér; több
      fázis mellett nincs „Új sor ide" választó; a panel útmutató szövege nem ígér sor-felvételt
- [ ] typecheck/lint
- [ ] docs-check
