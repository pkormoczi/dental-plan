# manual-checks-oszlopszelesseg-elvaras-frissites
Type: chore
Source: implement-batch böngészős szelete közben mérve (2026-09-09)

A `.claude/skills/manual-checks/visual-css.md` „Oszlopszélesség: Beavatkozás" szakasza
`beavatkozasOszlopPx` ~524 px-et és `nevmezoPx` ~465 px-et vár mindkét felbontáson;
izolált Chrome-ban, egy nyitott fázissal és egy sorral mérve 488 px / 429 px jött ki
1440×900-on ÉS 1280×720-on is, vízszintes túlcsordulás és névcsonkolás nélkül. A látvány
tehát nem romlott el, de az őr elvárt értéke nem illik a valóságra — egy ellenőrzés, ami
mindig „bukik", pár menet után néma lesz. A 2026-09-09-i batch bizonyítottan nem oka: a
frissen bevezetett ár-súgó csomópontot a DOM-ból kivéve is 488 px marad az oszlop, és az
`Ajánlati ár` cella végig a deklarált 148 px. Eldöntendő, hogy egy korábbi változás
szűkítette-e jogosan az oszlopot (akkor a `PhaseSection.tsx` szélességeit kell megnézni),
vagy a ~524-es szám más állapotban készült (akkor a szelet-fájl elvárása frissül) — a
`PhaseSection.tsx` oszlopszélességeinek git historyja dönti el. Nem tartozik ide maguknak
az oszlopszélességeknek a megváltoztatása, amíg ez nem dőlt el.
