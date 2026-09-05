# urlap-mezo-id-name
Type: chore
Source: doctor-review elso-megnyitas (2026-09-05), 16. megállapítás

A persona bejárása alatt a konzolon egy Chrome-issue jelent meg: „A form field element should have
an id or name attribute”. A jelzés a böngésző automatikus-kitöltési heurisztikájából jön, és csak
`<form>`-on belüli mezőkre fut — az appban két `<form>` van: az „+ Új páciens” dialógus
(`app/src/pages/paciensek/UjPaciensDialog.tsx`) és az Új tétel dialógus
(`app/src/pages/priceListAdmin/UjTetelDialog.tsx`); a bejárás az elsőt nyitotta meg, innen az
egyetlen issue. Mindkettő mezői a `Field` helperen át kapnak címkét (`app/src/components/Field.tsx`:
körbeölelő `<label>`, implicit asszociáció), `name`/`id` nélkül — az egész `app/src`-ben egyetlen
űrlapmezőn van `id` + `htmlFor` (a Páciensek lap keresője). Következmény: a böngésző nem kínálja fel
a korábban beírt értéket, és a mezőnek nincs azonosítója a képernyőolvasó felé. Elvárt: a két
dialógus mezői beszédes `name`-t kapjanak, a bejárás alatt a konzol tiszta legyen; a `Field`
implicit `<label>`-mintája és az accessible name számítása ne romoljon (a `FieldGroup` pont emiatt
`<div>`). Az őr jsdom-teszt lehet: `<form>`-on belüli mező `name` nélkül. Nem ide tartozik a
`<form>`-on kívüli mezők (fázisnév, keresők) átalakítása.
