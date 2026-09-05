# fazisnev-tab-fokusz
Type: bug
Source: doctor-review papirrol (2026-09-05), 13. megállapítás

A fázisnév átírása után a Tab a fázis első sorának Beavatkozás-mezőjébe ugrik, nem a fázis
keresőjébe: sietve gépelve a doki egy meglévő tétel nevét írja át, „átírt” jelvényt hagyva a
soron. Ok: egyetlen fázisnál a név-mező után a fel/le/törlés gombok tiltottak vagy hiányoznak,
így DOM-sorrendben a következő fókuszálható elem a sor névmezője
(`app/src/pages/planEditor/PhaseSection.tsx`). Repró: fázisnév átírása → Tab → a fókuszgyűrű az
első sor tételnevén. Irány: a fázisnév-mezőből a Tab (és az Enter) a fázis keresőjébe vigyen —
az `app/src/CLAUDE.md`-ben rögzített tételfelviteli ciklus felé. A
`fazisnev-terminologia-es-sor-mozgatas` a fázis-fejléc szóhasználatáról és a sormozgatásról
szól, a fókuszsorrendről nem.
