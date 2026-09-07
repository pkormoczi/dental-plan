# control-border-meres-radix-wrapper
Type: chore
Source: manual-checks visual-css szelet (2026-09-07), 3. megállapítás

A `.claude/skills/manual-checks/visual-css.md` `control-no-border` ága 10 kontrollt jelöl meg
keret és `box-shadow` nélkülinek a `#/terv`-en, de a minta alapján ez mérési hiba, nem hiányzó
keret: a Radix `TextField` látható kerete a wrapperen ül, a snippet viszont a belső
`<input>`-et méri, a `solid` Buttonnál pedig a sötét kitöltés adja az affordanciát — utóbbit a
szelet-fájl maga nevesíti kivételként, mégis a találatok közé esik. Amíg így áll, minden
`visual-css` menet újratermeli ugyanezt a 10 elemes zajt a valódi találatok mellett, és pont
ettől válik egy őr használhatatlanná: az ember egy idő után átfutja a listát. Elvárt: a snippet
azt az elemet mérje, amelyik ténylegesen hordozza a keretet (a wrappert, ha az `<input>`-nek
nincs sajátja), a `solid` Button kivétele pedig ténylegesen érvényesüljön a másik három
nevesített kivétel mintájára — így a `control-no-border` nulla, amikor tényleg nincs hiba. Nem
tartozik ide a `controlBorder` token értéke és a kontraszt-küszöbök
(`terv-lap-halvany-szoveg-kontraszt`, `checklist-callout-szoveg-kontraszt`), sem a
`manual-checks` többi szelete.
