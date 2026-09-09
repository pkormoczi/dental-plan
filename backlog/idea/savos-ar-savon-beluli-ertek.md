# savos-ar-savon-beluli-ertek
Type: bug
Source: review:2026-09-05-doctor-review-nagy-terv#2; review:2026-09-05-doctor-review-papirrol#3

Sávos (`SAVOS`) tételnél a sor a sáv `min` értékével jön be egységáraként; ha a doki a sávon
BELÜLI, magasabb tényleges árat írja be (pl. 38 000–65 000 Ft sávban 65 000-et 3 csatornás
gyökértömésnél), a szerkesztő „+71%” jelvényt és „Felár: 81 000 Ft” sort ad, az előnézet pedig
„Kézzel felülírt ajánlati ár”-ként jelzi — mintha kedvezmény/felár lenne, holott a doki a saját
árlistája saját sávján belül maradt. Emiatt a doki vagy alulárazza a sort (megtartja az alsó
árat, hogy elkerülje a jelzést), vagy a véglegesítés előtt bizonytalankodik, mert nem tudja, mi
kerül a nyomtatványra (valójában semmi extra — a felár nem nyomtatódik, csak a `*`). Elvárt
viselkedés: a sávon belüli ár ne kapjon felár/kedvezmény jelvényt és ne számítson eltérésnek — a
sor tárolja a sáv `min`/`max` pillanatképét is, és az eltérés-számítás (`domain/sorElteres.ts`)
ezekhez viszonyítson, ne a puszta lista- és ajánlati ár különbségéhez. Kizárt scope: a sáv felső
határának nyomtatványon való megjelenítése külön tétel (`savos-felso-hatar-nyomtatvanyon`).
