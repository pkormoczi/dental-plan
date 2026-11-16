# sanitize-foglalt-windows-nevek
Type: chore
Source: desktop-app-migration-plan-final.md §4.8 és §10.0

A `sanitizeNamePart()` (`storage/paths.ts`) a záró pont/szóköz levágása után vág 40 karakterre, így
a vágás helyén új záró szóköz vagy pont maradhat, és a foglalt Windows-neveket (`CON`, `PRN`, `AUX`,
`NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) sem kezeli. Ma a kimenet a mappanévben mindig `-` vagy `_<id>`
elé kerül, ezért a hiba lappangó, valódi fájlrendszeren sem adna ma érvénytelen nevet. A
FileSystemStorage előtt mégis tesztekkel lefedett, sorrend-helyes őr legyen belőle, mert a függvény
a main processben is futni fog, és egy későbbi hívó teljes névként is használhatja. A `/plan` döntse
el, kell-e a foglalt-név védelem, vagy elég a vágás utáni újratisztítás.
