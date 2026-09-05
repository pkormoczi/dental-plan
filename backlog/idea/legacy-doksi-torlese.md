# legacy-doksi-torlese
Type: chore
Prio: later
Source: agent-first dokumentációs migráció follow-up

2026-11-04 után, külön commitban: a `docs` alatti karantén-mappa (a 2026-09-05 előtti
tervdokumentáció és a lezárt tétel-archívum) `git rm -r`-rel törlődik, a README erre utaló
bekezdésével együtt. A docs-check legacy-ref szabálya a törlés után is marad, hogy a régi
útvonalak ne térjenek vissza. A már triázsolt, régi `docs/reviews/` jelentések ugyanekkor
mehetnek.
