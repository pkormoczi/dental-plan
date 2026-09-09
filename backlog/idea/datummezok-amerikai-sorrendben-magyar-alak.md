# datummezok-amerikai-sorrendben-magyar-alak
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#10

A négy natív `type="date"` mezőnél (Született, Kiadás dátuma, Érvényes eddig) a böngésző a
saját nyelvi beállítása szerinti sorrendben jeleníti meg és engedi szerkeszteni a napot
(angol Chrome-on hónap/nap/év, pl. „04/22/1985"), miközben alatta a magyar alak áll
(„1985.04.22.") — ezt a magyar alakot a `datummezo-formatum-inkonzisztens` (9275791) tette
oda, valódi javulás, de a natív mező saját sorrendje változatlan és félreérthető maradt: a
szerkeszthető mező a rosszabbik alak, a doki a szürke szöveget olvassa a mező helyett.
Elvárt viselkedés: a mező és az alatta lévő szöveg ugyanabban a sorrendben mutassa a napot —
akár a natív mezőn `lang="hu"` attribútummal (böngésző-nyelvfüggő hatás, kézzel a
`/manual-checks` alatt ellenőrizendő, hogy tényleg magyar sorrendre vált-e), akár egy saját,
magyar sorrendű dátumbevitellel. Kizárt scope: a PDF lábléc dátumformázása külön terület,
változatlan.
