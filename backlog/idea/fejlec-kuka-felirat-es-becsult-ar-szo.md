# fejlec-kuka-felirat-es-becsult-ar-szo
Type: feature
Source: review:2026-09-09-doctor-review-elso-megnyitas#15

A tooltip a tudó felhasználót szolgálja ki, az elsőt használót nem: az `ikon-gombok-tooltip`
óta minden felirat nélküli ikon-gombnak van tooltipje és `aria-label`-je (`IkonGomb`, 33 hívási
hely, oxlint-őrrel), a persona mégis négy gombot nevezett meg és mindegyiket kikerülte — a
fejléc-kuka, a sorvégi „…”, a narancs „≈” és a listaárra visszaállító nyíl —, mert nem visz
egeret ikon fölé, hogy megnézze, mit ír ki: „ezeket ma egyszerűen kikerültem, és holnap is ki
fogom”. A hover mögé rejtett név tehát nem felfedezhetőség, és a fogtérkép, a becsült ár
kapcsolója meg a sor-menü gyakorlatilag nem létezik a doki számára. Két konkrét irány a
jelentésből: a fejléc-kuka kapjon szöveges feliratot („Piszkozat eldobása”) vagy kerüljön el az
elsődleges „Előnézet” gomb mellől — törlő gomb az elsődleges akció mellett a kiemelt kockázat —,
a „≈” mellé pedig kerüljön oda a „becsült” szó a szerkesztőben is, mert az előnézetben István
megértette. Siker mércéje: a doki hover nélkül tudja, mit csinál a fejléc-kuka és a „≈”.
Feszültség, amit a kidolgozásnak rendeznie kell: az `app/src/CLAUDE.md` szerint a Radix Themes az
egyetlen UI-lib, az `IconButton` felirat nélküli, a „≈” szövegglyph pedig nevesített kivétel —
nem cserélhető SVG-re. Nem ide tartozik a tooltipek bővítése: az kész.
