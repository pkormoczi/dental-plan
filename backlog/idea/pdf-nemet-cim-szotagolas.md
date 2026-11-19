# pdf-nemet-cim-szotagolas
Type: bug
Source: review:2026-11-19-manual-checks-pdf#1

Német nyelvű terv PDF-jén a fejléc jobb oldali dokumentumcíme szótagolva törik: „Behandlungsplan
und Kostenvoran-” / „schlag”. Repro: bármely terv nyelvét Deutsch-ra állítva az előnézet első
oldalán. A cím két sorra tördelése szándékos (a 220 pt széles címblokk), de a react-pdf
alapértelmezett szótagolása a szó közepén vág, ami a páciens által aláírt dokumentumon
gondozatlannak látszik. Elvárt: a cím szóhatáron törjön („Behandlungsplan und” / „Kostenvoranschlag”),
kötőjel nélkül — ugyanúgy, ahogy a fejléc rendelő-blokkja és a lábléc már nem szótagol. A magyar
cím és a dokumentum többi része (táblázat, nyilatkozat) nem tartozik ide.
