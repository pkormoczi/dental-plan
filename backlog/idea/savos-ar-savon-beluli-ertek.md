# savos-ar-savon-beluli-ertek
Type: bug
Source: 2026-09-05 doctor-review (nagy terv) 2. megállapítás; papirrol (2026-09-05), 3. megállapítás

Sávos árú tételnél a sor az alsó árral jön be, a csatornaszámot senki nem kérdezi, és ha a doki
a sávon belüli valós árat írja be, az app felárnak minősíti. Repró: „gyökértömés” → „Gyökértömés
csatornaszámtól függően 38 000 Ft–65 000 Ft” kiválasztása → a sor 38 000 Ft-tal jön be; az
Ajánlati ár mezőbe 65000 → „+71%” jelvény a sor nevénél, „Felár: 81 000 Ft” a Mindösszesen alatt
(három fog), az előnézeten „Néhány sor ára eltér a mai árlistától — Kézzel felülírt ajánlati ár”.
A doki szerint „a 3 csatornás ár az árlista saját sávjában van, ez nem felár”; a jelzés miatt a
következő sávos tételnél inkább az alsó árat hagyta bent, és az sem derül ki neki, hogy a felár a
nyomtatványra nem kerül (nem kerül). Elvárt: a sávon belüli ajánlati ár ne kapjon
felár/kedvezmény jelvényt és ne számítson eltérésnek — ehhez a sor a sáv határait
pillanatképként tárolja, ugyanaz a feltétel, mint a savos-felso-hatar-nyomtatvanyon tételnél;
a „Felár” helyett a listaártól való eltérés semleges megnevezése; az előnézeti figyelmeztetés
mondja ki, hogy ez a papírra nem kerül. Nem tartozik ide a csatornaszám-választó a sávos tételen. A papirrol futásban ugyanez a felár
egy egyidejű kedvezménnyel nettózódik, és ez a nyomtatvány összesítőjén is megjelenik
(`nyomtatvany-osszesites-netto-felar`).
