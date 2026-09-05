# urlap-mezo-id-name
Type: chore
Source: doctor-review elso-megnyitas (2026-09-05), 16. megállapítás; doctor-review nagy-terv (2026-09-05), 18. megállapítás

A persona bejárása alatt a konzolon egy Chrome-issue jelent meg: „A form field element should have
an id or name attribute”. A jelzés a böngésző automatikus-kitöltési heurisztikájából jön, és csak
`<form>`-on belüli mezőkre fut — az appban két `<form>` van: az „+ Új páciens” dialógus
(`UjPaciensDialog.tsx`) és az Új tétel dialógus (`UjTetelDialog.tsx`). Mindkettő mezői a `Field`
helperen át kapnak címkét (implicit `<label>`), `name`/`id` nélkül — az egész `app/src`-ben
egyetlen mezőn van `id` + `htmlFor` (a Páciensek lap keresője). Következmény: a böngésző nem
kínálja fel a korábban beírt értéket, és a mezőnek nincs azonosítója a képernyőolvasó felé.
Elvárt: a két dialógus mezői beszédes `name`-t kapjanak, a bejárás alatt a konzol tiszta legyen; a
`Field` implicit `<label>`-mintája és az accessible name ne romoljon. Az őr jsdom-teszt lehet:
`<form>`-on belüli mező `name` nélkül. Egy 16 soros tervnél a jelzés száma 32-re nőtt —
ELLENTMOND annak, hogy csak `<form>`-on belülre futna: a szerkesztő sorai (`LineRow.tsx`) nincsenek
`<form>`-ba csomagolva. A gyökérokot a `/plan` fázisnak kell tisztáznia. Nem ide tartozik a
`<form>`-on kívüli mezők átalakítása.
