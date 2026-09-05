# elonezet-vissza-iframe-hibaoldal
Type: bug
Source: doctor-review nagy-terv (2026-09-05), 4. megállapítás; doctor-review papirrol (2026-09-05), 6. megállapítás

Az Előnézeten a böngésző Vissza gombja a beágyazott PDF-nézegetőt lépteti vissza, nem az appot: a
`<iframe src={pdfInstance.url}>` (`app/src/pages/PreviewPage.tsx`) blob-URL-váltása bekerül a
böngésző-előzménybe, és a Vissza egy már felszabadított blob-URL-re navigál — a dokumentum helyén
angol „szomorú fájl” hibaoldal jelenik meg, az app URL-je `#/elonezet` marad. A `Vissza a
szerkesztőbe` app-gomb működik, csak ezt a doki nem tudja elsőre. Repro: Előnézet megnyitása, a PDF
betöltődik, böngésző Vissza. Elvárt: a böngésző Vissza az Előnézetről a Kezelések lapra vigyen,
hibaoldal nélkül — akár úgy, hogy az iframe blob-URL cseréje ne kerüljön a history-ba
(`location.replace` az iframe-en belül, vagy a nézegető `key`-es remountolása `src`-csere helyett),
akár úgy, hogy az app egy `popstate`-figyeléssel a Kezelések lapra navigál. Nem ide tartozik a
sikerképernyő utáni Vissza-viselkedés (`sikerkepernyo-nyomtatas-letoltes` kizárt scope-ja). A
papirrol futásban ez történt kétszer egymás után, és ez volt a menet egyetlen pontja, ahol a
doki kollégát hívna.
