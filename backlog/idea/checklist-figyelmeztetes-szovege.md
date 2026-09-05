# checklist-figyelmeztetes-szovege
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 10. megállapítás; doctor-review nagy-terv (2026-09-05), 8. megállapítás

Az előnézet két puha checklist-doboza nem mondja meg a dokinak, mit tegyen. A
`sablon-kihagyott-szekcio` címe („A szakasz szövege hiányzik, vagy még jogi lektorálásra vár — a
címével együtt kimarad a nyomtatványból.”, `app/src/domain/veglegesitesOr.ts`) a fejlesztő nyelvén
beszél: „Milyen szakasz? Ki lektorál jogilag?” — a gomb felirata („Nyomtatvány szövegei”) sem
cselekvésre hív. A `hianyzo-paciensadat` tétel nem nevezi meg, MELYIK mező hiányzik — a szomszédos
`torzsadat-elteres` tétel a saját címében már felsorolja az érintetteket. A doki emiatt az
előnézetről visszalép kitalálni, mi hiányzik. Elvárt: a `sablon-kihagyott-szekcio` mondja ki a
szakasz nevét és a pótlás helyét („A Garancia szöveg nincs kitöltve — kimarad. Kitöltés a
Beállításokban”); a `hianyzo-paciensadat` sorolja fel a hiányzó mezőket. A checklist szín-kódja
(piros = megállít, sárga = csak figyelmeztet — `VeglegesitesChecklist.tsx` `SULYOSSAG_SZIN`) sincs
megnevezve; ezt is a szövegezésnek kell kimondania. Csak szövegezés: a súlyosságok, a
placeholder-zár és a blokkolás változatlan. Nem ide tartozik a garancia-szöveg tényleges
kitöltése (`arlista-nap`, doki-teendő).
