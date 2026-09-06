# fazisnev-tab-fokusz
Type: bug
Source: doctor-review papirrol (2026-09-05), 13. megállapítás
Target: master
Baseline: 179536153022276ce1a8ecab03566e23e6823354

## Goal
A fázisnév átírása után a Tab (és az Enter) a fázis tételkeresőjébe viszi a fókuszt, nem a tábla
első sorának Beavatkozás-mezőjébe — a sietve gépelt karakterek nem írnak át egy meglévő tételnevet.

## Current state
- `app/src/pages/planEditor/PhaseSection.tsx` — a fázisnév `TextField.Root` (`fazisNevId(pi)`)
  mezőn nincs `onKeyDown`; DOM-ban utána a fel/le/törlés `IconButton`-ök állnak, amik egyetlen
  fázisnál `disabled`/hiányzók, ezért a Tab a `LineRow` névmezőjére esik. A célmező ugyanebben a
  fájlban: `ItemPicker` `id={fazisKeresoId(pi)}`, csak `open` esetén renderelve.
- `app/src/pages/PlanEditorPage.tsx` `addPhase()` — a `setFokuszCel({ mit: 'fazisKereso', pi })`
  kész útvonala; `app/src/pages/planEditor/useFokuszEffekt.ts` fókuszál és `scrollIntoView`-ol.
- `app/src/pages/PlanEditorPage.test.tsx` „Fázis hozzáadása” után az ÚJ fázis keresője kap fókuszt
  — a `getElementById('kereso-fazis-1')` + `toHaveFocus()` tesztminta.
- A szerkesztőben nincs `<form>`/`onSubmit`, tehát az Enter ma a névmezőben semmit nem csinál.

## Approach
A `PhaseSection` fázisnév-mezője `onKeyDown`-t kap: nyitott fázisnál a Tab és az Enter (módosító
nélkül) a fázis keresőjébe viszi a fókuszt, a meglévő `fokuszCel` útvonalon — a `PhaseSection` egy
új callback proppal szól a `PlanEditorPage`-nek, ami a már meglévő
`setFokuszCel({ mit: 'fazisKereso', pi })`-t hívja. Csukott fázisnál (`open === false`) nincs
beavatkozás. A Shift+Tab, az `ItemPicker` és a `useFokuszEffekt` változatlan.

NEM tartozik ide: a fázisnév felfedezhetősége/placeholder-felirata és a fázis-terminológia
(`fazisnev-terminologia-es-sor-mozgatas`), a Terv címe mező Enterje (`terv-cim-enter`), a sormezők
és a fázis-megjegyzés Tab-sorrendje, a fel/le/törlés gombok elrendezése.

## Decisions
- Tab ÉS Enter is a keresőbe visz — mert a doki ritmusa „kész a név, jöhet a tétel”; ez felülírja a
  `fazisnev-terminologia-es-sor-mozgatas` (2) „az Enter marad no-op” kikötését, ott csak a
  felfedezhetőség marad nyitva.
- Csukott fázisnál marad a natív Tab — mert a kereső nincs a DOM-ban, az elnyelt Tab fókuszcsapda
  lenne; nem nyitjuk ki a fázist, mert egy Tab ne rendezze át láthatóan az oldalt.
- A fel/le/törlés gombokat az előre-Tab átugorja — mert a gyakori út a név → tétel; a gombok
  Shift+Tabbal (a keresőből visszafelé) és egérrel elérhetők maradnak, nincs billentyűzet-csapda.
- A fókuszt a meglévő `fokuszCel` útvonalon állítjuk, nem `PhaseSection`-beli közvetlen
  `getElementById().focus()`-szal — mert így a fókusz és a hozzá tartozó görgetés egy helyen marad.

## Verification
- [ ] tests — nyitott fázisban a fázisnév mezőből Tab, illetve Enter után a fázis keresője a
      fókuszált elem (nem az első sor Beavatkozás-mezője), több soros fázisnál is; összecsukott
      fázisnál a Tab nem a keresőbe visz; a fázisnév értéke egyik billentyűre sem változik
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
