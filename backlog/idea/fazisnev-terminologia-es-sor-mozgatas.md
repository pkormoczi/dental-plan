# fazisnev-terminologia-es-sor-mozgatas
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 9. megállapítás

Három apró, ugyanabban a fázis-fejlécben és sorlistában jelentkező súrlódás: (1) az alapértelmezett
fázisnév „N. kezelés” (`app/src/domain/blankPlan.ts`), miközben a gombok „Fázis”-t mondanak
(„Fázis hozzáadása”) — a doki a fázist inkább „szakasznak” hívná; (2) a fázisnév mezőbe írt Enter
szándékosan nem lép tovább (a név azonnal mentődik), de visszajelzés nélkül ez „nem történt
semmi”-nek tűnik, és a mező maga sem jelzi átírhatóságát (ceruza-ikon vagy felirat nincs — a doki
próbából jött rá); (3) a sorok (nem a fázisok) sorrendje nem mozgatható — `PlanEditorPage.tsx`-ben
csak `movePhase` létezik, sor-szintű megfelelője nincs, így egy rossz sorrendben felvitt kezelés
(fogbél-megnyitás a gyökértömés elé) a végleges papíron is rossz sorrendben marad. Elvárt: az
alapnév „N. szakasz” vagy „N. fázis” (egyeztetve a gombfelirattal); a fázisnév mezőn halvány
placeholder-szerű felirat („Fázis neve — kattints az átíráshoz”); fel/le nyíl a soroknál, a
fázisokéhoz hasonló mintában. Nem ide tartozik a fázisnév Enterre való automatikus mentése — az
marad, csak a felfedezhetőség javul.
