# megerosito-ablak-aria-hidden-figyelmeztetes
Type: bug
Source: review:2026-11-16-manual-checks-keyboard-a11y#2

Repro (valódi Chrome, Új terv lap, mentetlen piszkozattal): a „+ Új páciens” quick-create ablakát
elvetve a fókusz a „Meglévő páciens keresése” mezőre kerül; ezután a „+ Új páciens” gombra
kattintva megnyílik a „Piszkozat felülírása” megerősítés, és a konzolban egyszer megjelenik a
Chrome figyelmeztetése: „Blocked aria-hidden on an element because its descendant retained
focus” (fókuszban a keresőmező, `aria-hidden` ős a `#root`). A megnyitás pillanatában a fókusz még
a háttérben van, amikor a modális ablak elrejti az oldal többi részét; felolvasó szoftvernél ez egy
pillanatra rejtett elemen hagyhatja a fókuszt. Elvárt: a megerősítő ablak megnyitásakor nincs
figyelmeztetés, a fókusz egyenesen az ablakba kerül. Hogy más kontrollált megerősítő ablaknál is
előjön-e, a feltárás dolga; a zárás utáni fókusz-visszaadás nem tartozik ide.
