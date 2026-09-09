# datummezok-amerikai-sorrendben-magyar-alak
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#10
Target: master
Baseline: 006c38614b3c8c85623f8abba4733524a3b2c49e

## Goal
A `Született` mező alatt hónapnévvel áll a dátum („1985. április 22."), így a natív mező
sorrendjétől függetlenül sosem téveszthető össze a hónap és a nap — ahogy a `Kiadás dátuma`
és az `Érvényes eddig` alatt már ma is.

## Current state
- `app/src/components/Field.tsx` `Field` — az `olvashatoErtek` a mező ALATT, a `<label>`-en
  kívül; a doc-komment kimondja, hogy a `lang` nem segít.
- Három `Született` mező adja `formatShortDate(..., 'hu')`-t az `olvashatoErtek`-nek:
  `app/src/components/PatientEditorPanel.tsx`, `app/src/pages/PatientPage.tsx`,
  `app/src/pages/paciensek/UjPaciensDialog.tsx`.
- `app/src/pages/PatientPage.tsx` `Kiadás dátuma` / `Érvényes eddig` már
  `formatLongDate(..., 'hu')` — változatlan.
- `app/src/domain/date.ts` `formatShortDate` („1985.04.22."), `formatLongDate`
  („1985. április 22.") — mindkettő megvan, új helper nem kell.
- A rövid alakot rögzítő három teszt: `app/src/pages/PatientPage.test.tsx` „a »Született«
  mező alatt rövid magyar alakban áll az érték, üres mezőnél semmi”,
  `app/src/pages/PatientDetailPage.test.tsx` „a szerkesztő »Született« mezője alatt magyar
  alakban áll a dátum”, `app/src/pages/paciensek/UjPaciensDialog.test.tsx` „a »Született«
  mező alatt magyar alakban áll a beírt dátum, üres mezőnél semmi”.

## Approach
A három `Született` mező `olvashatoErtek`-je `formatShortDate` helyett `formatLongDate`.
A három teszt elvárása és neve követi (a PatientPage-tesztből a „rövid” szó kikerül); az
`UjPaciensDialog.test.tsx` jelölt-soros tesztje a rövid alakot várja továbbra is, azt nem
érinti.

NEM tartozik ide: a natív `type="date"` lecserélése saját beviteli mezőre; a `lang`
attribútum (mérve hatástalan); a Páciensek lista, a jelölt-sorok és a páciens-fejléc
`formatShortDate` hívásai; a PDF lábléc dátumformázása; a `Kiadás dátuma` / `Érvényes
eddig` mezők; az Electron-fázis böngésző-nyelv beállítása (külön ötlet lehet).

## Decisions
- Natív `type="date"` marad, csak az alatta lévő szöveg lesz egyértelmű — mert a doki az
  `Érvényes eddig`-nél használja a naptár-felugrót, és egy saját dátumbevitel elvenné azt,
  cserébe négy helyszín bevitel-értelmezését, hibaszövegét és tesztjét írná újra; nem saját
  magyar sorrendű bevitel, mert ez a mostani panasz kockázat nélkül orvosolható.
- `lang="hu"` nem opció — izolált en-US Chrome-ban mérve az inputon és a dokumentumon is
  hatástalan (`04/22/1985` mindhárom változatban); nem „kézzel ellenőrizendő”, ahogy a
  review javasolta, mert a mérés megtörtént.
- A hosszú alak csak a szerkeszthető mezők alatt — mert a hónapnév ott az amerikai sorrendű
  mező ellensúlya; nem az egész appban, mert a sűrű adattáblában a rövid alak a helyes
  (`app/src/CLAUDE.md` § Mi ez).

## Verification
- [ ] tests — a három `Született` mező alatt a beírt dátum hónapnévvel áll
      („1978. március 14."), üres mezőnél semmi; a Páciensek lista és a jelölt-sor
      születési dátuma rövid alakban marad
- [ ] typecheck/lint
- [ ] docs-check
