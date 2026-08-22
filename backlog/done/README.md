# Lezárt tételek

Ez a mappa lezárt, történeti anyag: a teljesen megvalósított backlog-tételek
tömör összefoglalója (`BACKLOG_DONE.md`, folyamatosan bővülő napló,
az első kör doktor-nap narratívájával és architekt-triázzsal együtt) és a
hozzájuk tartozó döntési összefoglalók (a lezárt `backlog-N-*-terv.md`
fájlok, lezáráskor a `backlog/plans/`-ból idekerülve).

Egy tétel akkor kerül ide, amikor a `CLAUDE.md` „Backlog-tétel lezárása"
checklistje szerint lezárul: a tartósan érvényes döntései előtte bekerülnek
a `docs/02`–`07` fő dokumentumokba, prózaként, a megfelelő
funkcionális/nyomtatvány/technológia szakaszokba. A `docs/01` `D<szám>`
döntéstáblája lezárt, történeti napló — nem bővül, új döntés nem kap
D-számot. **Erre a mappára sehonnan nem szabad hivatkozni** — sem a
`docs/*.md` fájlokból, sem a forráskódból, sem a `CLAUDE.md`-ből. Ha egy
döntés háttere kell, a fő dokumentumok az aktuális forrás; ez a mappa csak
azért maradt meg, hogy a döntéshez vezető eredeti gondolatmenet a git
history-n kívül is kereshető legyen.
