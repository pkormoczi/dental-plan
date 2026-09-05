# pdf-szuletesi-datum-formatum
Type: bug
Source: doctor-review papirrol (2026-09-05), 18. megállapítás

A nyomtatványon a születési dátum ISO-alakban áll („Született 1992-12-01”), miközben az appban
mindenhol magyar alakban („1992.12.01.”) — a szerződéses dokumentumon két különböző dátumnyelv
keveredik, a keltezés („2026. szeptember 5.”) mellett. Irány: a nyomtatványon is a magyar alak,
a `pdf/CLAUDE.md`-ben rögzített elv szerint a domain formázóival (`formatShortDate` /
`formatLongDate`), nem PDF-saját formázással. A `datummezo-formatum-inkonzisztens` a beviteli
mezők böngésző-függő kijelzéséről szól; a nyomtatvány ISO-alakja nem szerepelt benne.
