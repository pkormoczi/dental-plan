# darabszamnak-nincs-felso-korlatja-es
Type: feature
Source: review:2026-09-09-doctor-review-elso-megnyitas#4

A tétel Db (mennyiség) mezőjének nincs felső korlátja vagy józan-ész-ellenőrzése: egy fogszám
véletlen a Db mezőbe gépelése (pl. 36) ugyanolyan csendben elfogadódik, mint az 1, és
nagyságrenddel hibás végösszeget eredményez (36 db → 1 618 000 Ft) minden jelzés nélkül — a
hibát csak a végösszeg szokatlan mérete árulja el. Kód-szinten a mezőn nincs `min`/`max`
attribútum, és az `app/src/domain/veglegesitesOr.ts` ellenőrzései között nincs mennyiség-
vizsgálat (a hiányzó fogszámot igen, a darabszámot nem nézi). Elvárt viselkedés: egy küszöb
(pl. 8) feletti darabszámra a checklist puha, NEM blokkoló tételt adjon, a sor megnevezésével és
egy „Kezelések” ugrógombbal — ugyanabban a mintában, mint a meglévő `hianyzo-fogszam` tétel.
Kizárt: kemény felső korlát vagy blokkolás — a doki rendelhet ténylegesen tíz fölötti
darabszámot (pl. ideiglenes korona, röntgen), a véglegesítés emiatt nem állhat meg.
