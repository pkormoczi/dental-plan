# checklist-figyelmeztetes-szovege
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 10. megállapítás

Az előnézet két puha checklist-doboza nem mondja meg a dokinak, mit tegyen. A
`sablon-kihagyott-szekcio` címe („A szakasz szövege hiányzik, vagy még jogi lektorálásra vár — a
címével együtt kimarad a nyomtatványból.”, `app/src/domain/veglegesitesOr.ts`) a fejlesztő nyelvén
beszél: „Milyen szakasz? Ki lektorál jogilag?” — a szakasznevek a részletek között ott vannak, de a
cím nem köti össze a teendővel, és a gomb felirata („Nyomtatvány szövegei”) nem cselekvésre hív. A
`hianyzo-paciensadat` tétel („Néhány páciensadat hiányzik (nem kötelező, de a nyomtatványon üresen
marad).”) egyáltalán nem nevezi meg, MELYIK mező hiányzik (születési dátum, lakcím, telefon,
e-mail, TAJ) — pedig a szomszédos `torzsadat-elteres` tétel a saját címében már felsorolja az
érintett mezőket. A doki emiatt az előnézetről visszalép kitalálni, mi hiányzik. Elvárt: a
`sablon-kihagyott-szekcio` szövege mondja ki a szakasz nevét és a pótlás helyét („A Garancia szöveg
nincs kitöltve — a nyomtatványból kimarad. Kitöltés a Beállításokban”); a `hianyzo-paciensadat`
sorolja fel a hiányzó mezőket a `torzsadat-elteres` mintájában. Csak szövegezés és `reszletek`: a
súlyosságok, a placeholder-zár, a blokkolás és a `route` változatlan. Nem ide tartozik a
garancia-szöveg tényleges kitöltése (`arlista-nap`, doki-teendő).
