# az-arlista-adminban-nincs-vedelem
Type: feature
Source: review:2026-08-26-doctor-review-admin#1

Az árlista-adminban egy ár mezőbe beírt, a korábbi értéktől drasztikusan eltérő szám (pl. egy
extra nulla) azonnal, megerősítés nélkül élesedik: Tab-bal kilépve a sor rögtön az új árat
mutatja, semmilyen figyelmeztető dialógus nem jelenik meg, és az EUR/HUF pár emiatt nyilvánvaló,
ellenőrizetlen ellentmondásba kerülhet (`app/src/pages/priceListAdmin/ItemEditor.tsx`
`setFixPrice()` közvetlenül patchel, felső korlát vagy relatív-eltérés ellenőrzés nélkül; a
`components/NumberField.tsx` `min` propja csak alsó korlátot ismer). Elvárt viselkedés: ha egy
beírt ár egy adott százaléknál (pl. 50%) nagyobb mértékben tér el az előző értéktől, a mentés
előtt egy puha (nem feltétlenül blokkoló) megerősítést kérjen a felület, mielőtt a változás
érvénybe lép. Kizárt: kemény felső korlát bevezetése (az árak típusonként nagyon eltérőek
lehetnek) — csak relatív eltérés alapú figyelmeztetés.
