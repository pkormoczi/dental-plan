# sor-fazisnev-mezok-levagott-szoveg
Type: bug
Source: doctor-review nagy-terv (2026-09-05), 12. megállapítás

Hosszú szövegek csonkolva jelennek meg két helyen: a sor Beavatkozás-mezőjében a tételnév görgetés
nélkül nem olvasható végig („Bölcsességfog műtéti eljárással (seb.”, „Komplett kezelés: ultrahang,
sófúvás”); az összecsukott fázis-fejléc name-mezőjében a fázisnév csonkul („2. szakasz —
gyökérkeze”, „4. szakasz — koronák, tö”) — pont ott, ahol az összecsukott áttekintés a célja
(l. `fazis-osszecsukas-megorzese-es-osszegzo`). Emellett a „kézzel felülírt ár” jelvényes soron a
névmező keskenyebb, a „+ leírás” a mező alá tördelődik, és a sor magasabb lesz a többinél —
következetlen elrendezés. Elvárt: a fázisnév-mező szélessége kövesse a tartalmat, vagy csukott
fejlécben a név statikus szövegként jelenjen meg, ne mezőben; a jelvények a névmező alá/fölé
kerüljenek, ne a mező szélességének rovására. Nem ide tartozik a jelvények szövegezése
(`savos-ar-savon-beluli-ertek`, `penznem-es-cim-felirat`).
