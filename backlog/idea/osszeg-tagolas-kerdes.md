# osszeg-tagolas-kerdes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 13. megállapítás
Kerdes: Zavar-e a papíron, hogy a négyjegyű összegek (pl. „9000 Ft”) nincsenek ezres-tagolva, míg az ötjegyűek (pl. „24 000 Ft”) igen?

A `hu-HU` locale `toLocaleString()` szabálya szerint (`app/src/domain/money.ts`) a négyjegyű
összegek nem kapnak ezres-tagoló szóközt, az öt- és többjegyűek igen — ez a nyomtatványon is így
van, tehát NEM hiba, hanem szándékos, locale-hű formázás. A képernyőn egymás alatt („9000 Ft” a
„24 000 Ft” mellett) mégis következetlennek látszik. A tétel sorsa a doki válaszán múlik: ha nem
zavarja a papíron, nincs teendő; ha igen, a döntés azt is érinti, hogy a képernyős és a
nyomtatványi formázás szándékosan eltérjen-e egymástól (ma nem tér el) — ezt a `/plan` fázis
dolgozná ki, ha a válasz igen.
