# beavatkozas-oszlop-szelessege
Type: bug
Source: /implement-batch futás (2026-09-08), manual-checks visual-css szelet

A szerkesztő Beavatkozás oszlopa 1440×900-on és 1280×720-on egyaránt 244px, benne a névmező
185px — a „Gyökérkezelés felső őrlőfogon” és a hosszabb tételnevek csonkolva látszanak. Repro:
`#/terv`, vegyél fel egy hosszú nevű tételt, és nézd meg a Beavatkozás cella mezőjét. Elvárt: a
tipikus tételnév görgetés és tooltip nélkül végigolvasható. A `sor-fazisnev-mezok-levagott-szoveg`
ezt a fájdalmat két sávval (a jelvények már nem vesznek el szélességet) és a névmező `title`-jével
enyhítette, az oszlopszélességeket viszont kifejezetten kizárta a hatóköréből — az a maradék, ami
itt marad. Két bemenete van: a hat fix szélességű oszlop (Fog 132, Db 88, Listaár 104, Ajánlati ár
148, Összeg 112) együtt 584px-et köt le, a sor-mozgató `⋯` menü bevezetése pedig a záró oszlopot
32→72px-re szélesítette, ami további 40px-et vett el a maradékként számolt Beavatkozás oszloptól.
Nyitott kérdés, hogy a szűkítés a fix oszlopokból, a táblázat teljes szélességéből vagy a záró
oszlop összevonásából jöjjön. Nem tartozik ide a jelvények szövegezése és a Terv részletei olvasó
nézet.
