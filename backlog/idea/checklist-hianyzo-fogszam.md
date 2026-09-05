# checklist-hianyzo-fogszam
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 3. megállapítás
Kerdes: Melyik kezeléseknél nem írtál soha fogszámot a papírra (fogkő, röntgen, konzultáció, fogfehérítés) — van olyan sor, ahol a hiányzó fogszám rendben van?

Fogszám nélküli korona szó nélkül átmegy a véglegesítésen: a kiadott papír Fog oszlopában „—”
áll, a doki csak a kiadás után veszi észre. A hiányzó (nem kötelező) születési dátumra kap
figyelmeztetést, a hiányzó fogszámra semmit. Repro: két sor, az egyiknek nincs fogszáma →
Előnézet → a checklist egyik dobozában sincs fogszám-jelzés → véglegesítés → a tervlapon és a
PDF-en „—”. Oka: az `app/src/domain/veglegesitesOr.ts` tételei között nincs „hiányzó fogszám”
ellenőrzés; a `kitoltetlen-sor` kemény blokk csak a megnevezetlen beavatkozású sorra vonatkozik.
Elvárt: puha, NEM blokkoló checklist-tétel („N tételnél nincs fogszám megadva”) az érintett sorok
felsorolásával és a sorhoz ugró `/terv` akcióval — a `nulla-osszegu-sor` mintájában. Az új
feltétel a véglegesítés-őrbe kerül, nem a PreviewPage-be. Kemény blokk nem lehet: a `Fog` mező
jegyzetmezővé válása elfogadott. A kizárási lista (mely beavatkozásnál rendben van a fogszám
hiánya) a Kerdes-en múlik — nélküle a jelzés minden tervnél zajt adna. Nem ide tartozik a
fogtérkép-ikon felfedezhetősége (a jelentés 12. megállapítása).
