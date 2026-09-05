# piszkozat-mentve-automatikus-szoveg
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 10. megállapítás

A szerkesztő fejlécében a „Piszkozat mentve HH:MM” felirat
(`app/src/pages/planEditor/PlanEditorHeader.tsx`) nem mondja ki, hogy a mentés automatikus és
folyamatos — az első napokban a doki emiatt frissíti az oldalt, hogy megbizonyosodjon, nem veszett-e
el semmi (nem veszett). Elvárt: „Automatikusan mentve HH:MM” — egyetlen szó betoldása, a
mentés-logika és az időbélyeg-formázás (`formatPiszkozatIdo`) változatlan.
