# nyomtatvany-osszesites-netto-felar
Type: bug
Source: doctor-review papirrol (2026-09-05), 1. megállapítás

A tétel egy korábbi, kódkommentben rögzített döntést vizsgál felül: ma a „Kezelések összege”
referenciasor szándékosan iránytól függetlenül nyílik meg. A szerkesztő egyetlen „Felár: 4000 Ft”
sort ír oda, ahol valójában 27 000 Ft felár és 23 000 Ft kedvezmény áll egymással szemben
(`grand − listTotal`, `app/src/pages/planEditor/Summary.tsx`), a nyomtatvány Összesítés blokkja
pedig a „Kezelések összege 611 000 Ft” sort a „Végösszeg 615 000 Ft” fölé teszi (`grand !==
listTotal`, `app/src/pdf/TervDocument.tsx`) — a páciens egy magyarázatlan 4000 Ft-os többletet
lát, a kedvezmény gesztusából semmit. Repró: gyökértömés 38 000 → 65 000, fémkerámia 95 000 →
85 500, cirkon 135 000 → 121 500; a Mindösszesen alatt „Felár: 4000 Ft”, a PDF 2. oldalán a két
összesítő sor, a mentett `osszesitok.kedvezmeny = −4000`. A doki elvárása: a kedvezmény ne
kerüljön papírra (így is van), de a felár se jelenjen meg nettóban, és a Kezelések összege ne
legyen kevesebb a fizetendőnél; „a 3 csatornás ár nem felár”. Kizárt scope: a kedvezmény
összegének vagy százalékának megjelenítése a nyomtatványon. A `savos-ar-savon-beluli-ertek`
megoldása itt a felár-oldalt nullázná, de a nettózás és a referenciasor iránya attól
függetlenül eldöntendő.
