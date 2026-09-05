# datummezo-formatum-inkonzisztens
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 6. megállapítás
Kerdes: A Chrome-od a Macen magyar vagy angol nyelvű? (A dátummezők kijelzése ettől függ.)

A Terv adatai lapon négyféle dátumalak él egymás mellett: a lista magyarul („1978.03.14."), a
natív dátummező a böngésző nyelvén („mm/dd/yyyy” angol Chrome-ban), a Kiadás dátuma kézzel
formázva („2026. szeptember 5.”), az Érvényes eddig natívan („12/04/2026”) — a doki nem meri
felolvasni az érvényességi dátumot a páciensnek, mert nem biztos, hónap vagy nap áll elöl.
Rendelőben a hónap/nap felcserélése kiskorú/felnőtt és érvényesség kérdésében konkrét
hibaforrás. Érintett: `app/src/pages/paciensek/UjPaciensDialog.tsx` és
`app/src/pages/PatientPage.tsx` natív `type="date"` mezői — a kijelzett formátum a Chrome
felület-nyelvétől függ, nem az app dönti el. Elvárt: a natív dátummező mellett/helyett egy
kézzel formázott, a lapon máshol használt alakú (2026. december 4.) olvasható érték, vagy a
`lang="hu"` attribútum a mezőn — ez utóbbi hatását jsdomban nem lehet ellenőrizni, kézi teszt
kell (`/manual-checks`). A Kerdes dönti el, hogy a doki valós gépén egyáltalán jelentkezik-e a
tünet (magyar Chrome-ban natívan is éééé.hh.nn a formátum).
