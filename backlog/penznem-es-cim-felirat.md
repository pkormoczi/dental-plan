# penznem-es-cim-felirat
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 13. megállapítás
Target: master
Baseline: 0c6dbce479931bbe677a4c41c45c5f72e3f8362e

## Goal
A Terv adatai lap pénznem- és terv-cím feliratai a doki nyelvén mondják meg, mit dönt el a pénznem
és honnan jön az automatikus terv-cím — és egyik felirat sem állít valótlant a keresőről.

## Current state
- `app/src/pages/PatientPage.tsx` — `FieldGroup label="Pénznem (ez dönti el, mely tételek
  ajánlhatók)"`; alatta a `cov.arazott === 0` amber `Callout`, ami tévesen azt írja, hogy „a
  szerkesztő keresője nem fog találatot adni".
- `app/src/pages/planEditor/ItemPicker.tsx` `nincsBearazottTetel` — a kereső NEM szűr pénznemre; egy
  beárazatlan kezelés kereshető és felvehető.
- `app/src/domain/veglegesitesOr.ts` `araztalan-sor` — a beárazatlan sor a véglegesítés hard blokkja.
- `app/src/pages/patientPage/TervCimField.tsx` — a „domináns kategória" felirat (új lánc) és az
  „Üresen mentve visszaáll az automatikus javaslatra." (mentett lánc).
- `app/src/components/PatientPlanChains.tsx` — a ceruza-ikonos szerkesztés ugyanezzel a mondattal;
  már importál `domain/tervCim`-ből (`ALAPERTELMEZETT_TERV_CIM`).
- `app/src/domain/tervCim.ts` `dominansKategoria` — a legnagyobb ÖSSZEGŰ kategória; változatlan.
- Egyetlen teszt sem állít a négy érintett mondatra (`Pénznem` a Section-címre illeszkedik,
  `Terv címe` az input `aria-label`-jére).

## Approach
Csak felirat-szöveg változik, három fájlban:
- `PatientPage.tsx`: a címke „Pénznem (a nyomtatvány pénzneme)"; a `ChipGroup` alá egy szürke
  `Text size="1"` sor a `FieldGroup`-on belül: „Egy kezelésnek abban a pénznemben van ára,
  amelyikben az Árlistán árat rögzítettél hozzá." Az amber `Callout` mondata úgy íródik át, hogy a
  keresőről ne állítson valótlant: a kezelés felvehető, de ár nélkül marad, és a véglegesítés akad
  el rajta.
- `TervCimField.tsx`: az új-lánc felirat megnevezi a legnagyobb összegű kategóriát és a példát, és
  megtartja a véglegesítéskori rögzülést; a mentett-lánc felirat ugyanezt a szóhasználatot kapja.
- `PatientPlanChains.tsx`: a ceruza alatti mondat a mentett-lánc felirattal közös konstansból jön.

NEM tartozik ide: a `dominansKategoria` algoritmusa, a tie-break, a PDF-cím lokalizációja
(`pdf/pdfCimLokalizacio.ts`), a pénznem-váltás logikája, az `ItemPicker` üres-találat jegyzete, és a
`null` ár jelentését magyarázó kód-kommentek.

## Decisions
- Statikus mondat a chipek alatt, nem a választott pénznemre szabott dinamikus szöveg — mert a
  szabály mindkét pénznemre ugyanaz, és így a doki a váltás ELŐTT is elolvashatja; nem dinamikus
  mondat, mert az csak a már meghozott döntést ismételné.
- A címke marad a lap „Címke (rövid magyarázat)" mintájánál (`Nyelv (a nyomtatvány nyelve)`), a
  hosszabb magyarázat kerül külön sorba — mert egy három soros zárójeles címke elrontja a Section
  ritmusát.
- „kategória", nem „kezeléscsoport" — mert az Árlista oszlopa, a kereső „Kategória: …" fejléce és a
  Kategória-panel is így hívja; új szinonima két nevet adna egy fogalomnak.
- A két „üresen mentve" mondat közös exportált konstans a `domain/tervCim.ts`-ben — mert két fájlban
  szó szerint azonos, és a `PatientPlanChains.tsx` már innen veszi az `ALAPERTELMEZETT_TERV_CIM`-et;
  nem új modul, mert egyetlen sztringért nem jár.
- A „(pl. »Korona és hídpótlások«)" példa csak az új-lánc mondatában marad — mert ott találkozik vele
  a doki először; a mentett láncnál az input placeholdere már a valódi javaslatot mutatja.

## Verification
- [ ] tests — a Pénznem mező alatt olvasható, hogy a kezelésnek abban a pénznemben van ára,
      amelyikben az Árlistán árat rögzítettek hozzá; a felirat nem beszél „ajánlható tételekről"
- [ ] tests — beárazatlan pénznemben a figyelmeztetés nem állítja, hogy a kereső nem ad találatot
- [ ] tests — vadonatúj láncnál a terv-cím felirata a „legnagyobb összegű kategóriát" nevezi meg és
      a véglegesítéskori rögzülést; mentett láncnál és a Korábbi tervek ceruzájánál ugyanaz a
      szóhasználat
- [ ] typecheck/lint
- [ ] docs-check
