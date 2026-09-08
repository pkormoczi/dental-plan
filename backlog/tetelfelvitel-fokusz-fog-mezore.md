# tetelfelvitel-fokusz-fog-mezore
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 4. megállapítás
Target: master
Baseline: 3dcb93e41afbf61aeb819190eae3ef56a04eb842

## Goal
Fogszámot kívánó tétel felvétele után a kurzor a sor Fog mezőjében áll — a doki ott gépeli a
fogszámot, és Enterre visszatér a fázis keresőjébe, egér nélkül.

## Current state
- `app/src/pages/PlanEditorPage.tsx` `addLine` / `addEgyediLine` — a felvétel egyetlen útja (a
  fázis alatti kereső ÉS a „gyakori" gyorsgombok is ide futnak); ma nem állít fókuszt. A
  `setFokuszCel({ mit: 'fazisKereso', pi })` alak már használatban (`addPhase`).
- `app/src/pages/planEditor/elemIdk.ts` `FokuszCel` + `useFokuszEffekt.ts` — a
  `{ mit: 'fogak', pi, li }` cél és a `fogId()` már létezik és le van kezelve, de ma SEMMI nem
  állítja be.
- `app/src/pages/planEditor/ItemPicker.tsx` `finishPick` — választás után
  `requestAnimationFrame`-mel visszaveszi a fókuszt; ez ütközik a hívó fókuszszándékával.
- `app/src/pages/planEditor/LineRow.tsx` Fog mező (`fogId(pi, li)`) — ma nincs rajta
  billentyűkezelés; a lap körül nincs `<form>`, az Enter szabadon köthető.
- `app/src/domain/types.ts` `Tetel.fogszamNemKell` és `app/src/domain/kitoltetlen.ts`
  `fogszamNelkuliSorok` — a „kell-e fogszám" szabály már él; egyedi (`tetelId` nélküli) sorra
  a szabály: kell.
- `data/arlista.seed.json` — 118 tételből 6 jelölt (konzultáció, RTG/CBCT, fogkő ×2, komplett
  fogsor fehérítés); a Kivehető fogsorok (`k11`, 13 tétel) és az All-on-X csomagok (`k07`, 5)
  jelöletlen.
- `app/src/pages/planEditor/ItemPicker.test.tsx` — a felvitel-ciklus regressziós tesztjei.

## Approach
Változik: `PlanEditorPage.tsx` (a felvétel után fókuszcélt állít), `ItemPicker.tsx` (a hívó
átveheti a fókuszt — a self-refocus ekkor nem futhat), `LineRow.tsx` (Fog mező: Enter vissza a
fázis keresőjébe), `data/arlista.seed.json` (hiányzó `fogszamNemKell` pipák).

Nem változik: `domain/search.ts` és a keresés bármely szabálya; az „Egyedi tétel felvétele"
opció; a soron belüli (LineRow-beli, fogtérképről indult) ItemPicker fókuszkezelése; az
Árlista admin; `veglegesitesOr`.

Hatókör-határ: a fogszám-alakú keresőszöveg kezelése NEM ide tartozik — az „Egyedi tétel
felvétele: »36«" ajánlat megmarad arra az esetre, ha a doki mégis a keresőbe gépel fogszámot
(`fogszamNemKell` tétel után vagy utólagos javításkor). Külön tétel; a rokon
`kereso-fogszam-tokenezes` (vegyes „18 fogeltávolítás" keresés) szintén érintetlen.

A `app/src/CLAUDE.md § Amit soha` és a `docs/PRODUCT.md § Napi flow` 2. pontja a mai („fókusz
marad") alakot rögzíti — átírásuk a `/finish` 4. lépésében esedékes, nem az implementációban.

## Decisions
- Ugrás feltétele `!fogszamNemKell`, egyedi sornál is ugrik — mert ez ugyanaz a szabály, ami a
  `fogszamNelkuliSorok` puha jelzését hajtja; nem külön heurisztika, mert két, egymástól
  elcsúszó „kell-e fogszám" definíció rosszabb, mint egy.
- A „gyakori" gyorsgombok is ugranak — mert `addLine`-on futnak; nem ágazunk szét, mert egérrel
  felvett sornál is a fogszám a következő lépés.
- A soron belüli (LineRow) kereső NEM mozdítja a fókuszt — mert az a sor a fogtérképről jött,
  már van fogszáma; ott az ugrás visszafelé vinne.
- A Fog mezőben az Enter — üresen is — a fázis keresőjébe visz — mert így zárul a ciklus
  billentyűzeten; nem Tab, mert az a natív sorrendben a fogtérkép-gombra vinne, és nem Escape,
  mert annak az appban „elvet" jelentése van.
- A hiányzó `fogszamNemKell` pipák felkerülnek a seedben a Kivehető fogsorok és az All-on-X
  csomagok tételeire — mert e nélkül 18 tételnél fölösleges az ugrás (és ma fölösleges a
  véglegesítés-őr jelzése is); a doki élesben szerkesztett árlistáját a seed nem írja felül,
  ott az Admin pipája az út.

## Verification
- [ ] tests — fogszámot kívánó tétel felvétele után a sor Fog mezője kapja a fókuszt;
      `fogszamNemKell` tételnél a kereső tartja meg; egyedi tétel felvételekor is a Fog mező;
      a Fog mezőben az Enter a fázis keresőjébe visz; a „gyakori" gyorsgomb ugyanoda visz; a
      fogtérképről indult soron belüli kereső nem mozdítja a fókuszt
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
