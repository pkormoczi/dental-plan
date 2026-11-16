# megerosito-ablak-aria-hidden-figyelmeztetes
Type: bug
Source: review:2026-11-16-manual-checks-keyboard-a11y#2
Target: master
Baseline: 795034fd86a452fb5e6fe16908bbd090e9f75c4d

## Goal
Repro (valódi Chrome, Új terv lap, mentetlen piszkozattal): a quick-create ablak elvetése után a fókusz
a „Meglévő páciens keresése” mezőn áll; a „+ Új páciens” után megnyíló „Piszkozat felülírása”
megerősítésnél a konzolban „Blocked aria-hidden on an element because its descendant retained focus”
jelenik meg. Elvárt: a megerősítő ablak megnyitásakor nincs figyelmeztetés, a fókusz az ablakban van.

## Current state
- `app/src/components/PlanVersionActionDialog.tsx` `usePlanVersionActions` `inditas` (a `visszaFokuszRef`
  a nyitáskori `document.activeElement`), és a kontrollált, trigger nélküli Radix `AlertDialog`.
- `app/src/pages/NewPlanPage.tsx`: a „+ Új páciens” gomb és a kereső `onKeyDown` Enter-ága is `inditas`-t
  hív; a billentyűs úton a fókusz megnyitáskor a keresőmezőn van. `handleUjOpenChange` a quick-create
  zárása után képkockával később a keresőre fókuszál.
- A megfigyelés időzítésfüggő: ugyanabban a menetben egy korábbi, szintén keresőről induló megnyitás nem
  adott figyelmeztetést (`docs/reviews/2026-11-16-manual-checks-keyboard-a11y.md` 2. megállapítás).
- Chrome a figyelmeztetésnél nem alkalmazza a rejtést a `#root`-ra: amíg a megerősítés nyitva van, a
  háttér a felolvasó szoftver számára nem rejtett.
- További kontrollált `AlertDialog`-ok: `components/DiscardChangesDialog.tsx`,
  `components/PiszkozatKonfliktusDialog.tsx`, `components/PatientPlanChains.tsx`,
  `pages/PatientDetailPage.tsx` és a `pages/` alatti szerkesztő-dialógusok.

## Approach
- Előbb az ok azonosítása valódi böngészőben: melyik megnyitási út (kattintás vagy a keresőből Enter) és
  milyen előzmény (a quick-create zárása utáni késleltetett fókusz) váltja ki.
- Javítás a megerősítő ablak megnyitási útján; ha az ok közös a kontrollált `AlertDialog`-okban, a közös
  ponton, minden érintett hívóra.
- NEM tartozik ide: a záráskori fókusz-visszaadás (`components/fokuszVisszaadas.ts`), Radix-verzióváltás
  vagy -foltozás, `inert`-alapú saját rejtés, a nem modális felületek.

## Decisions
- Ha az ok a Radix belső sorrendje, és csak a könyvtár foltozásával kerülhető meg, a tétel kimarad, és
  elvetésre javasolt — mert a Chrome a hibás rejtést blokkolja, így a kár egy pillanatnyi, nem rejtett
  háttér; egy könyvtár belső működését felülíró kerülőút drágább ennél.
- Ha a kiváltó a NewPlanPage saját késleltetett keresőfókusza, az ott javul, a közös helper nem változik —
  mert a záráskori visszaadás szabályát az előző javítás már rögzítette.

## Verification
- [ ] tests — a megerősítő ablak megnyitásakor, kattintással és a keresőből Enterrel is, a fókusz az
      ablakon belül van, a quick-create elvetése után közvetlenül is
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a szelet mellett a fenti repro lefut, és a konzolban nincs
      „Blocked aria-hidden” figyelmeztetés
