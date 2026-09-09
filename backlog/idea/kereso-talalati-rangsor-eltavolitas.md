# kereso-talalati-rangsor-eltavolitas
Type: bug
Source: review:2026-09-09-doctor-review-elso-megnyitas#1

A tételkereső „koron"/„gyokertomes" keresésre az eltávolítás-jellegű tételt („Korona felvágás
eltávolítás /db" 10 000 Ft, „Gyökértömés eltávolítása /csatorna" 20 000 Ft) emeli ki elsőnek,
mert az a szóval kezdődik, míg a keresett pótlás-tétel neve („Fémkerámia korona" 95 000 Ft,
„Gyökértömés csatornaszámtól függően") csak szóhatáron egyezik. A `kereso-talalat-rangsor`
(1388e93) szöveg-relevancia rangsora — szó eleje > szóhatár > belső egyezés — ezt a pozíciós
előnyt nem különbözteti meg attól, hogy az eltávolítás és a pótlás egymás ellentéte; Enterre
így a ritkább, olcsóbb eltávolítás kerül a sorba a drágább pótlás helyett, a doki előtt a
páciensével. Repro: üres terv → „koron" vagy „gyokertomes" → Enter. Elvárt viselkedés: az
„eltávolítás/felvágás/visszabontás" jellegű tételnév kapjon rangsor-büntetést a keresésben —
nem tűnik el a listából, csak nem ő az Enter alapértelmezése. Kizárt scope: a találatok
szűrése vagy elrejtése a listából.
