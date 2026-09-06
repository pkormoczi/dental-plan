# nyomtatvany-osszesites-netto-felar
Type: bug
Source: doctor-review papirrol (2026-09-05), 1. megállapítás
Target: master
Baseline: 2fa4b8a7959d6fbb0a019c93e4b0cda69d0707ba

## Goal
A nyomtatványon minden szám levezethető a kinyomtatott sorokból: a sorok összeadva pontosan
a „Kezelések összege" referenciasort adják, a Végösszeg pedig sosem nagyobb nála. A
szerkesztőben a doki külön látja, mennyi kedvezményt adott és mennyi felárat kért — nem
egyetlen nettózott számot.

## Current state
- `app/src/pdf/TervDocument.tsx`: `listTotal = sorokListaOsszeg(plan.fazisok)`, a
  referenciasor feltétele `grand !== listTotal` — irányfüggetlen. A fázistáblák viszont
  `tenylegesEgysegar`-ral számolnak (`app/src/pdf/tervDocument/PhaseTable.tsx`), így a
  referencia nem egyezik a kinyomtatott sorok összegével.
- `app/src/pages/planEditor/Summary.tsx`: `discount = listTotal - grand`,
  `surcharge = grand - listTotal` — a két ág kizárja egymást, a repró 27 000 felára és
  23 000 kedvezménye egyetlen „Felár: 4000 Ft"-ra olvad.
- `app/src/pages/tervReszletei/PenzugyiOsszesites.tsx`: ugyanez a referenciasor a mentett
  `osszesitok.kedvezmeny !== 0` feltétellel, szándékosan a nyomtatvány sorrendjében.
- `app/src/domain/totals.ts`: `sorokOsszeg`, `sorokListaOsszeg`, `tervVegosszeg` (0-ra
  padló), `computeOsszesitok`.
- Meglévő tesztek `app/src/pdf/TervDocument.test.tsx`-ben: „felár: ugyanúgy mindkét sor
  megjelenik (az eltérés iránya nem számít)" (átfordul), „terv-szintű kedvezmény önmagában
  (sorszintű eltérés nélkül) is megnyitja a kétsoros összegzést" (marad igaz), „a
  terv-szintű kedvezmény összege, aránya és a »kedvezmény« szó SOHA nem jelenik meg".

## Approach
- `domain/totals.ts`: új aggregáló a bruttó kedvezmény- és felár-oldalra (a sor-szintű
  eltérések előjel szerint szétválogatva, a terv-szintű `kedvezmenyOsszeg` a saját előjele
  szerinti oldalra). Ez az egyetlen hely, ahol a bontás eldől.
- `pdf/TervDocument.tsx`: a referenciasor alapja a kinyomtatott sorok összege
  (`sorokOsszeg`), feltétele `referencia > Végösszeg`. `pdf/labels.ts` NEM változik — a
  „Kezelések összege" / „Behandlungen gesamt" felirat az új alapra még pontosabb.
- `planEditor/Summary.tsx`: az új bontásból két külön sor, ha mindkét oldal nemnulla; egy
  irány esetén marad egy sor. A „Mindösszesen" és a színek változatlanok.
- `tervReszletei/PenzugyiOsszesites.tsx`: ugyanaz a szabály, mint a nyomtatványon — a
  referencia a mentett sorokból, és csak a mentett `osszesitok.fizetendo` fölött jelenik meg.
- A referenciasor irányáról szóló, hamissá váló kódkommentek átírandók (backlog-hivatkozás
  és D-szám nélkül).
- NEM tartozik ide: a sávos sorok sávon belüli árának felár-minősítése és az erről szóló
  előnézeti figyelmeztetés (`savos-ar-savon-beluli-ertek`); a kedvezmény összegének vagy
  százalékának megjelenítése a nyomtatványon; a sor-szintű jelvények (`sorElteres`); az
  `osszesitok` séma és a `schemaVersion` — egyik sem változik.

## Decisions
- A nyomtatvány referenciája a kinyomtatott sorok összege, nem a listaárak összege — mert
  csak így adják össze a sorok pontosan azt a számot, ami fölöttük áll; a listaáras
  referencia egyetlen nyomtatott számmal sem egyezik, amint egy soron ár-eltérés van.
- A referenciasor csak lefelé nyílik — mert a szerződéses papíron a Kezelések összege nem
  lehet kevesebb a fizetendőnél; nem irányfüggetlen, mint eddig (ezt a korábbi,
  kódkommentben rögzített döntést ez a tétel váltja fel).
- Következmény, kimondva: sor-szintű ár-eltérés önmagában többé nem nyitja meg a
  referenciasort — a nyomtatványon csak a terv-szintű Egyedi végösszeg látszik eltérésként.
  Ez erősíti a „kedvezmény sosem kerül papírra" szabályt
  (PRODUCT.md § A nyomtatvány szerződéses dokumentum).
- A bontás két oldala mindig kiadja a Mindösszesent (listaár + felár − kedvezmény) — a
  `tervVegosszeg` 0-padlója esetén a kedvezmény-oldal ehhez igazodik, nem a begépelt
  értéket mutatja; nem a nyers `kedvezmenyOsszeg`, mert annál többet nem lehet elengedni,
  mint amennyi a tervben van.
- A `PenzugyiOsszesites` a mentett sorokból számolja a referenciát, a Végösszeg marad a
  mentett `osszesitok.fizetendo` — mert a sorok is a pillanatkép részei, a kettő eltérését
  pedig a meglévő `osszesitokElter` callout mutatja ki.

## Verification
- [ ] tests — a repró számaival (gyökértömés 38 000→65 000, fémkerámia 95 000→85 500,
      cirkon 135 000→121 500): a nyomtatványon nincs referenciasor, csak a Végösszeg, és a
      fázistáblák sorai ezt az összeget adják ki; sor-szintű kedvezmény önmagában sem nyit
      referenciasort; terv-szintű Egyedi végösszeg megnyitja, a referencia a kinyomtatott
      sorok összege; a szerkesztőben egyszerre látszik „Kedvezmény: 23 000 Ft" és „Felár:
      27 000 Ft"; egy irány esetén egy sor; a Terv részletei nézet felár-irányban nem mutat
      referenciasort
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf
