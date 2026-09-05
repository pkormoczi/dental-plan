# nyomtatvanyok-tab-nyelv-elovalasztas
Status: planned
Type: feature
Source: docs/reviews/2026-09-05-doctor-review-nemet-euro.md 5. megállapítás
Target: master
Baseline: b6c3430781afbfc51b390fcbc802354b63c1b609

## Goal
A véglegesítési checklist „Nyomtatvány szövegei” gombja a Beállítások Nyomtatványok fülét a
hívó terv nyelvén nyitja — német tervről Deutsch állásban, nem egy plusz kattintás árán.

## Current state
- `app/src/domain/veglegesitesOr.ts` — `CsekklistaRoute` React-mentes string-típus; a
  `sablon-kihagyott-szekcio`, `sablon-fallback`, `nyilatkozat-placeholder` tételek route-ja
  statikus `/beallitasok?tab=nyomtatvanyok`, pedig a függvény a `plan`-nal dolgozik.
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — `ROUTE_GOMB_FELIRAT` route-literál →
  gombfelirat.
- `app/src/pages/settings/NyomtatvanyokTab.tsx` — `templateLang` mindig `'hu'`-val indul.
- `app/src/pages/settings/SettingsPage.tsx` — a `tab` query paramétert lazy `useState` inittel
  olvassa, param→state szinkron effekt nélkül; a Radix `Tabs.Content` az inaktív tabot
  unmountolja; a tabok csak `onDirtyChange`-en át beszélnek a shell-lel.

## Approach
- `veglegesitesOr.ts`: a három sablon-tétel route-ja a `plan.nyelv`-et is viszi
  (`&nyelv=de`), a `CsekklistaRoute` a nyelv-specifikus literálokkal bővül.
- `VeglegesitesChecklist.tsx`: az új literálok ugyanazt a „Nyomtatvány szövegei” feliratot kapják.
- `NyomtatvanyokTab.tsx`: `templateLang` kezdőértéke a saját `useSearchParams()` `nyelv`
  paraméteréből, érvénytelen/hiányzó esetén `'hu'`; a `SettingsPage` lazy-init mintáján.
Nem változik: a ChipGroup egyéb viselkedése (piszkozat-cache kulcsolás, Mentés/Mégse), a
`SettingsPage` `tab` kezelése.

## Decisions
- Query paraméter, nem `location.state` — mert a `CsekklistaRoute` szándékosan React-mentes, a
  state React Router-függést vinne a domain modulba.
- A tab maga olvassa a paramétert, nem `initialNyelv` prop — mert a tabok ma tudatosan nem kapnak
  induló-állapot propot, és a nyelv tisztán a tab belső prezentációs állapota.
- Elfogadott korlát: tab-váltás után visszatérve a query paraméter újra érvényesül a kézi
  választás helyett — mert a remount-túlélő „már felülbírálva” jelző aránytalan egy ritka,
  alacsony súlyú esethez; ha zavar, külön tétel.

## Verification
- [ ] tests — `de` terv checklistjéről navigálva a fül Deutsch állásban nyit; `hu` tervről
      Magyar; NavBar-ból (paraméter nélkül) Magyar; érvénytelen `nyelv` érték → Magyar
- [ ] typecheck/lint
- [ ] docs-check
