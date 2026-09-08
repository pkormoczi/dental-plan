# uj-verzio-vagy-uj-terv-valasztas
Type: feature
Source: doctor-review papirrol (2026-09-05), 10. megállapítás
Target: master
Baseline: 34739f2b8d1e88aabeff0590ec8591a202bbe256

## Goal
A páciens lapján is ott áll, hogy az „Új verzió” ugyanazt a tervet folytatja, az „Új terv”
pedig önálló tervet indít — a doki nem rendelői rutinból választ.

## Current state
`app/src/pages/demo/OsszesTervSection.tsx` a lista fölött egyszer kiírja a különbséget
(„Az »Új verzió« ugyanahhoz a tervhez készül; az »Új terv« és a »Másolás új tervbe« önálló, új
tervet indít.”), `size="1"` szürke `Text`, `patients.length > 0` mellett, tudatosan nem
Callout. Ugyanez a szakasz `standalone` módban rendereli a
`app/src/components/PatientPlanChains.tsx`-et; a páciens lapja (`app/src/pages/
PatientDetailPage.tsx`) `embedded` módban, ahol ez a mondat nincs sehol.

A két gomb a komponensben: „+ Új terv” a lista fölötti fejléc-`Flex`-ben (`latestOverall ||
aktivDraft` mellett), „Új verzió” a lánc legfrissebb verziósorán, látható gombként (a lánc
alapból nyitva: `nyitva()` / `alapNyitottDir`). Egyik gomb helye és felirata sem változik.
A mondatra ma egyetlen teszt sem hivatkozik.

## Approach
A magyarázó mondat megjelenik a `PatientPlanChains` `embedded` fejlécében is, ugyanabban az
alakban (`size="1"` szürke `Text`, nem Callout), egyetlen szövegforrásból az
`OsszesTervSection`-nel. Tesztek: `app/src/pages/PatientDetailPage.test.tsx` és
`app/src/pages/demo/OsszesTervSection.test.tsx`.

NEM tartozik ide: a gombok felirata, mérete, helye és sorrendje; a lánc nyitottság-logikája;
a „Másolás új tervbe” és a `PlanVersionActionDialog` szövegei; a terv-címke szerkesztése és a
lánc-fejléc felépítése; a `domain/planCopy.ts` / `planVersionActions.ts` viselkedése.

## Decisions
- A mondat `embedded` módban jelenik meg, nem mindig — `standalone`-ban az
  `OsszesTervSection` már kiírja egyszer a teljes lista fölött, páciensenként megismételve
  zaj lenne.
- Egy szövegforrás a két képernyőnek — két, egymástól idővel elcsúszó literál pont azt a
  bizonytalanságot hozná vissza, amit a mondat megszüntet.
- Csak akkor jelenik meg, ha a páciensnek van legalább egy terv-lánca — terv nélküli
  páciensnél egyedül a „+ Új terv” létezik, nincs mit összetéveszteni (ugyanaz a feltétel,
  mint az `OsszesTervSection` `patients.length > 0`-ja).
- Marad `Text`, nem `Callout` — nem hiba és nem figyelmeztetés, ahogy a másik képernyőn sem.

## Verification
- [ ] tests — a páciens terv-lapján a mondat látszik, ha van legalább egy terv-lánc, és nem
      látszik terv nélküli páciensnél; az „Összes terv” képernyőn továbbra is pontosan egyszer
      szerepel, akkor is, ha több páciens listázódik
- [ ] typecheck/lint
- [ ] docs-check
