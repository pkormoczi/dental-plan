# masolas-uj-tervbe-egy-masik
Type: bug
Source: review:2026-09-01-doctor-review-visszatero-paciens#1

A „Másolás új tervbe” a `paciensId`-t szándékosan változatlanul viszi át (ugyanahhoz a
pácienshez készül A/B alku-változat) — ez a viselkedés emiatt nem vitatott. A hiba: ha a doki a
másolat Terv adatai lapján a Név mezőt egy MÁSIK, a törzsadatban ténylegesen létező páciens
nevére írja át, a felület ezt semmivel nem jelzi — a törzsadat-eltérés dialógus a beírt névhez
tartozó valódi rekord helyett a MÁSOLÁS FORRÁSÁVAL hasonlít össze, a breadcrumb link célja pedig
a forrás páciens mappáján marad. Az így véglegesített terv a forrás páciens `paciensId`-jával,
telefonjával, e-mailjével, lakcímével és TAJ-számával jön létre, de a beírt (másik, valódi)
páciens nevével — ez GDPR 9. cikk szerinti adatkeveredés egy szerződéses dokumentumon. Elvárt
viselkedés: ha a Név mező a törzsadatban létező, a másolás forrásától eltérő páciensre változik,
a felület hangsúlyos, nem INFO-szintű figyelmeztetést adjon véglegesítés előtt arról, hogy a terv
továbbra is az eredeti (forrás) páciens rekordjához kötődik, és a törzsadat-diff a ténylegesen
beírt névhez tartozó valódi rekordot ajánlja fel összevetésre, ne a forrást. Kizárt: a
`paciensId` átvitelének megváltoztatása — az A/B alku-változat funkció marad.
