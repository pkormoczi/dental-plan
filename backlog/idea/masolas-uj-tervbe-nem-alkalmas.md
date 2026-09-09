# masolas-uj-tervbe-nem-alkalmas
Type: feature
Source: review:2026-09-08-doctor-review-hiba-javitas#2

A „Másolás új tervbe” pontos névegyezésnél helyesen, keményen blokkolja a véglegesítést
(`paciensKotes.ts`, 2026-09-04 óta) — de a piros hibaüzenet („A páciens neve egy másik, létező
páciensre illik pontosan — a terv mégis a kötött páciensmappába mentődne.”) csak azt mondja meg,
MI a baj, azt nem, MIT tegyen helyette a doki. Repro: egy véglegesített terv „Másolás új
tervbe”-jén a Név mezőt egy másik, ténylegesen létező páciens nevére átírva a blokk megjelenik,
de a doki csak saját rájövéssel talál rá a helyes megoldásra (a Páciensek listáról a HELYES
páciens saját oldaláról „+ Új terv” indítása) — egy valós menetben két elpazarolt lépés és
önálló felfedezés árán. Elvárt viselkedés: a hibaüzenet egészüljön ki egy konkrét, kattintható
javaslattal — pl. „Ha ezt a tervet [Név]-nek szánod, indíts helyette új tervet az ő oldaláról” —
link vagy gomb az érintett páciens oldalára. Kizárt: a `paciensKotes` blokkoló logikájának
módosítása — csak az üzenet/CTA bővül.
