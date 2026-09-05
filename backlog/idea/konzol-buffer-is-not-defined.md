# konzol-buffer-is-not-defined
Type: chore
Source: doctor-review nagy-terv (2026-09-05), 17.; papirrol (2026-09-05), 22. megállapítás

Az előnézet renderelésekor a konzolra 14–19 alkalommal kiíródik a „Buffer is not defined”
figyelmeztetés. A doki nem látja, a PDF elkészül — de egy ismeretlen eredetű, futásonként
tucatszor ismétlődő figyelmeztetés elfedi a valódi hibákat, és a `@react-pdf` egy Node-`Buffer`-t
feltételező ágát sejteti. A keresett szöveg a csomagok `lib` mappáiban nem található, tehát
futásidejű `typeof Buffer` ág. Teendő: a stack alapján a forrás azonosítása, majd vagy egy
`Buffer` polyfill a Vite configban, vagy annak igazolása (és rögzítése), hogy ártalmatlan.
