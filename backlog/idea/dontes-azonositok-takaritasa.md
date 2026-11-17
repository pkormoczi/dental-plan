# dontes-azonositok-takaritasa
Type: chore
Source: lassu-pricelistadmin-tesztek implementálása közben talált (2026-11-17)

Az `app/`-ban (`src`, `electron`, `e2e`) 4 tesztnév „(N. döntés)” jelölést visel (pl.
`PriceListAdminPage.test.tsx` „a törlés gomb tiltva marad akkor is, ha egy kategória MINDEN
tétele inaktív (8. döntés)”), és 66 fájlban 135 kommentsor hivatkozik `backlog-N`-re vagy „N.
döntés”-re (pl. `PreviewPage.tsx` „backlog-40 (6. döntés)”) — a root `CLAUDE.md` Kommentek és
Tesztek szabálya döntési azonosítót és backlog-hivatkozást tilt, és ezek a régi számozásra
mutatnak, ami már sehol nem oldható fel. Elvárt: a tesztnevek az azonosító nélkül is konkrét
viselkedést írnak le, a kommentekből az azonosító kikerül, a WHY megmarad (ha termékszándék:
`PRODUCT.md § <cím>`); viselkedés és teszt-állítás nem változik. Mivel a szabály szerint meglévő
kommenthez csak hamissá váláskor nyúlunk, ez egy tudatos, egyszeri takarítás; érdemes utána
gépi őrt (lint vagy docs-check) kapnia, hogy ne térjen vissza. Rokon, de külön tétel: a
`legacy-doksi-torlese`.
