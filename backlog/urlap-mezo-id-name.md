# urlap-mezo-id-name
Type: chore
Source: doctor-review elso-megnyitas (2026-09-05), 16. megállapítás; doctor-review nagy-terv (2026-09-05), 18. megállapítás
Target: master
Baseline: 3ca25fe54e6713f072ee74c9f8bd926220b26f65

## Goal
A böngésző konzolján sehol ne jelenjen meg a „form field element should have an id or name
attribute" Chrome-jelzés; a páciens-PII mezők ne kínáljanak fel autofill-javaslatot korábbi
páciensek adataiból.

## Current state
- A gyökérok NEM a `<form>`-hoz kötött: `LineRow.tsx` egyik mezője sincs `<form>`-ban, mégis ez
  adja a 16 soros tervnél megfigyelt 32-es jelzésszámot — Chrome minden interaktív mezőre lefut,
  formától függetlenül. Az idea `<form>`-only feltevése téves.
- `app/src/components/NumberField.tsx` — kézzel írt `<input>`, a `NumberFieldProps` típus ma NEM
  engedi át `id`/`name`/`autoComplete`-et. Hívói: `LineRow.tsx` (mennyiség, ár),
  `ElolegBlokk.tsx`, `EgyediVegosszegBlokk.tsx`, `ItemEditor.tsx`, `TomegesArDialog.tsx`.
- Radix `TextField.Root`/`TextArea` natívan átengedi `id`/`name`/`autoComplete`-et a beágyazott
  elemre — ott csak a hívási helyen hiányzik a prop (~20 hely, pl. `PatientPage.tsx`,
  `PatientEditorPanel.tsx`, `UjPaciensDialog.tsx`, `RendeloTab.tsx`, `PriceListAdminPage.tsx`,
  `UjTetelDialog.tsx`, `FazisMegjegyzes.tsx`, `PhaseSection.tsx`, `settings/*`).
- Már megoldott precedens: `PaciensekPage.tsx` keresője (`id`+`htmlFor`) — `storage/CLAUDE.md`
  szerint ma az EGYETLEN ilyen az appban.
- Már létező sor-egyedi id-minta: `LineRow.tsx` `nevId`/`fogId` — ugyanez hiányzik a sor
  `mennyiseg`/`tenylegesEgysegar` (NumberField) és a leírás (`TextArea`) mezőiről.
- Páciens-PII bevitel három helyen: `PatientPage.tsx` „Páciens adatai" szekció,
  `PatientEditorPanel.tsx`, `paciensek/UjPaciensDialog.tsx` (mind a `Paciens` típus mezői: nev,
  szuletesiIdo, lakcim, telefon, email, taj, torvenyesKepviselo).

## Approach
`NumberField` prop-felülete bővül `id`/`name`/`autoComplete`-tel (a meglévő `...rest`-spread már
az inputra tolja, csak a típus tiltja ma). Minden érintett `TextField.Root`/`NumberField`/
`TextArea` hívás egyedi `id`-t kap: egyszeri mezőknél statikus string, `LineRow.tsx` soronként
ismétlődő mezőinél a meglévő `nevId`/`fogId`-mintát követő generátorral. A három PII-hely mezői
EGYÜTT kapnak `id`-t ÉS `autoComplete="off"`-ot; minden más mező csak `id`-t (a `PaciensekPage.tsx`
keresője már megoldott, változatlan marad). Nem ide tartozik a `Field`/`FieldGroup` helper
átalakítása (auto-id-generálás label-ből) — ez a tétel a meglévő, bevált mintát ismétli
következetesen, nem vezet be új absztrakciót.

## Decisions
- Statikus id egyszeri mezőn, generátoros id soronkénti mezőn — a meglévő `nevId`/`fogId` mintát
  követi, nem új absztrakció.
- PII mezőkön kötelező `autoComplete="off"` — a doki döntése: a natív autofill más páciensek
  korábbi adatát ajánlaná fel, ami zavaró és bizalom-vesztő, holott az adat nem hagyja el a gépet
  (nem hard invariáns sérülés, UX-kockázat).
- A `Field` helper nem kap auto-id-logikát — külön absztrakció volna, meghaladná a hatókört.

## Verification
- [ ] tests — új, megosztott segédfüggvény (`testQueries.ts`), ami egy renderelt konténerben
      ellenőrzi: minden textbox/spinbutton/searchbox szerepű mezőnek van `id` vagy `name`-je; ezt
      hívja egy reprezentatív kör a már létező lapteszekből (`PatientPage.test.tsx`,
      `UjPaciensDialog`, `LineRow`/`PlanEditorPage`, `RendeloTab`/`PriceListAdminPage`).
      `LineRow`: N sor esetén nincs két azonos `id`. PII mezők: `autoComplete="off"` jelen van.
- [ ] typecheck/lint
- [ ] docs-check
