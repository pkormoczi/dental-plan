# frissites-veglegesites-kozben-ures-elonezet
Type: bug
Source: doctor-review elso-megnyitas (2026-09-05), 15.; nagy-terv (2026-09-05), 16.; papirrol (2026-09-05), 21. megállapítás

Ha a doki a véglegesítés kellős közepén frissít, a mentés lefut (`_v2`, `VEGLEGES`, 615 000 Ft,
a `_v1` érintetlen, a piszkozat törölve), de a képernyőn egy üres terv előnézete marad, piros
hibadobozokkal („A páciens neve kötelező”, „1 üres fázis”) — a doki a sikeres mentés helyett
hibát lát. Adat nem veszett el; a probléma a visszajelzés. Ritka helyzet, kis súly, de három
független futásban reprodukálódott. Irány: a véglegesítés befejeztével a navigáció ne az üres
piszkozat előnézetére fusson vissza; ha a piszkozat törölve van, a sikerképernyő vagy a Terv
részletei a helyes cél.
