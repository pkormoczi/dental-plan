# paciensek-uj-paciens-zaras-fokusz
Type: bug
Source: review:2026-11-16-manual-checks-keyboard-a11y-megerosito-ablak#1

Repro: a Páciensek lapon „+ Új páciens” → a felugró ablakban Escape (vagy Mégse): az ablak
bezárul, de a fókusz a lap elejére esik, nem a megnyitó gombra; billentyűvel dolgozva a következő
Tab a lap elejéről indul, és a doki elveszíti, hol tartott. Az „Új páciens” ablak a záráskori
automatikus fókuszt letiltja, és a Páciensek lap nem ad meg fókuszcélt; az Új terv lap ugyanehhez
az ablakhoz már a keresőmezőt adja meg célként. Elvárt: mentés nélküli záráskor a fókusz a
„+ Új páciens” gombra tér vissza. Hogy sikeres mentés után hová kerüljön a fókusz (például az új
páciens sorára), a tervezés dönti el.
