# elo-fazis-es-vegosszeg
Type: feature
Source: doctor-review papirrol (2026-09-05), 12. megállapítás

Ármező gépelése közben a sor Összege már frissül (`f838db2`, „Élő Összeg oszlop”), a Fázis
összesen és a Mindösszesen viszont csak a mező elhagyása után — a doki egy pillanatra azt hitte,
a program rosszul számol. Repró: a Panoráma árába „20000”-t gépelve a sor 20 000 Ft-ot, a Fázis
összesen és a Mindösszesen még a régi értéket mutatja, amíg a mező fókuszban van. Ugyanez a
jelenség már szerepelt a `2026-08-25` uj-terv jelentés 3. megállapításában; a javítás akkor csak
a sor szintjéig ért el. Két lehetséges kimenet: a fázis- és végösszeg is kövesse az élő
piszkozatot, vagy — ha a késleltetés szándékos — a két összegző halványodjon el, amíg egy
ármező nyitva van.
