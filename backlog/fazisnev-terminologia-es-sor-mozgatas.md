# fazisnev-terminologia-es-sor-mozgatas
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 9. megállapítás
Target: master
Baseline: 2ed51f2767a1a6c2649136781727cb849ca33f66

## Goal
A fázis alapneve „N. fázis” (a gombfelirattal egyezően), a fázisnév mező fölött látszik, hogy
átírható, és egy fázison belül a sorok sorrendje mozgatható.

## Current state
- `app/src/domain/blankPlan.ts` `generaltFazisNev` (17. sor) — az EGYETLEN hely a `${pos}. kezelés`
  literállal; `fazisNevGeneralt` és `ELSO_FAZIS_NEV` erre épül. Fogyasztók:
  `app/src/domain/fazisSorrend.ts` (mozgatáskor csak a generált nevet számozza át),
  `app/src/domain/piszkozat.ts` `piszkozatTartalmas`, `app/src/pdf/pdfCimLokalizacio.ts`
  `pdfFazisNev` / `generaltFazisNevDe` (`${pos}. Behandlung`).
- `app/src/pages/planEditor/PhaseSection.tsx:171-190` — a fázisnév `TextField.Root`: nincs címke,
  placeholder vagy `aria-label`; az Enter/Tab már a fázis keresőjébe visz (`onNevKesz`, 182-188.).
- `app/src/pages/planEditor/PhaseSection.tsx:259-316` — a 7 oszlopos sortábla, az utolsó
  `ColumnHeaderCell` 32px; a sorok remount-kulcsa `sorResetToken` (108.), a sortörlés Undo-sávja
  `removeWithUndo` / `UndoRow` (118-153., 373-397.).
- `app/src/pages/planEditor/LineRow.tsx:456-467` — a sor egyetlen szerkezeti akciója, a „Sor
  törlése” kuka-`IconButton`. Nincs `onMoveUp`/`onMoveDown` prop.
- `app/src/pages/PlanEditorPage.tsx` `movePhase` (180-188.) — index-alapú csere
  `fazisokFelcserelve`-vel + `fazisResetToken` bump; a sor-mutációk inline az `updatePlan`-en
  (435-444.). A `Sor`-nak nincs `id`-je, a tömbindex a sorrend (`app/src/domain/types.ts`).
- `⋯` menü-minta: `app/src/components/PatientPlanChains.tsx` (`DropdownMenu`); a fókusz-irányítás
  meglévő útja: `app/src/pages/planEditor/useFokuszEffekt.ts` + `elemIdk.ts`.
- A névváltás által érintett tesztek: `app/src/domain/fazisSorrend.test.ts`,
  `app/src/pdf/pdfCimLokalizacio.test.ts`, `app/src/domain/kitoltetlen.test.ts`,
  `app/src/domain/veglegesitesOr.test.ts`, `app/src/pages/PlanEditorPage.test.tsx` (349-558.),
  és a `'1. kezelés'` fixture-ök (`AppState.test.tsx`, `DemoStorage.test.ts`,
  `TervWorkflowShell.test.tsx`, `PiszkozatKonfliktusDialog.test.tsx`, `piszkozat.test.ts`,
  `TervDocument.test.tsx`).

## Approach
Három szelet, mind a szerkesztőben:
1. `generaltFazisNev` literálja `${pos}. fázis`, `generaltFazisNevDe`-é `${pos}. Phase`. Más felirat
   nem változik — a „Fázis” szó a gombokon és az aria-labeleken már ma is ez.
2. A `PhaseSection` fázisnév-mezője halvány „Fázis neve” címkét kap FÖLÉ (a mező `id`-jére kötve),
   csak NYITOTT fázisban.
3. Sor-mozgatás fázison belül: `⋯` `DropdownMenu` a sor záró cellájában, a kuka MELLETT
   („Feljebb” / „Lejjebb”, a szélen tiltva); a záró oszlop ehhez szélesedik. A tiszta tömbművelet
   `app/src/domain/fazisSorrend.ts`-be kerül a `fazisokFelcserelve` mellé; a `PlanEditorPage` egy
   `moveLine(pi, li, irany)`-t ad le a `movePhase` mintájára, `sorResetToken` bumppal, és a meglévő
   `fokuszCel` úton a mozgatott sor `⋯` gombjára viszi a fókuszt.

Nem tartozik ide: fázishatáron átnyúló sor-mozgatás; drag&drop; az összecsukott fejléc elrendezése
és a levágott fázisnév (`sor-fazisnev-mezok-levagott-szoveg`); a fázisonkénti részösszeg
(`fazis-osszecsukas-megorzese-es-osszegzo`); a read-only `tervReszletei/` nézet; a már mentett
tervek `megnevezes` mezőjének visszamenőleges átírása (pillanatkép marad).

## Decisions
- Alapnév „N. fázis”, a „Fázis” gombfeliratok maradnak — mert egy SOR is egy kezelés, a fázis neve
  ne ugyanaz a szó legyen; nem „N. szakasz”, mert az az egész felület terminológiáját cserélné.
- Németül „N. Phase” — mert a szakasz lábában már ma is „Phase gesamt” áll (`pdf/labels.ts`); nem
  marad „Behandlung”, mert az a papíron ma is ütközik a lábfelirattal.
- Címke a mező fölött, nem ceruza-ikon és nem placeholder — mert a mező sosem üres (a placeholder
  nem látszana), a fejlécben pedig már három ikon van; a „címke az input FÖLÖTT” szabály áll.
- A címke csak nyitott fázisban látszik — mert a csukott fejléc egysoros összegzés.
- `⋯` menü, a kuka látható marad — mert így két látható gomb marad a soron („legfeljebb két látható
  gomb egy adatsoron”); nem ↑↓ ikonok, mert az ÚJ nevesített kivételt kérne, 16 soros tervnél 48
  ikonnal.
- Csak fázison belül — mert a doki esete (fogbél-megnyitás a gyökértömés elé) ezen belül van.
- Mozgatás után a mozgatott sor `⋯` gombja kapja a fókuszt — mert a `sorResetToken` remount
  különben elnyelné a fókuszt, és az ismételt mozgatás egérrel is újranyitást kérne.

## Verification
- [ ] tests — új terv első fázisa „1. fázis”, „Fázis hozzáadása” után „2. fázis”; fázis-mozgatás
      után a generált nevek a pozíciót követik, a kézzel átírt név nem; DE terven a PDF „2. Phase”-t
      ír, kézzel átnevezett fázisnál a tárolt nevet; a fázisnév mező a „Fázis neve” címkével
      elérhető, csukott fázisban a címke nincs a DOM-ban; a sor „⋯” menüjében a „Lejjebb” a sort
      eggyel hátrébb viszi ugyanabban a fázisban, az utolsó soron tiltott, az elsőn a „Feljebb”
      tiltott, és mozgatás után a mozgatott sor „⋯” gombja a fókusz.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css | keyboard-a11y
