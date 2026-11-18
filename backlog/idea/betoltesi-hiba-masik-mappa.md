# betoltesi-hiba-masik-mappa
Type: feature
Source: gyokermappa-varazslo implementálása közben talált

A telepített appban, ha a miénknek talált adatmappában egy fájl nem tölthető be (sérült vagy újabb sémájú árlista, sérült beállítások), az indulás a „Nem sikerült betölteni az adatokat” képernyőn áll meg, amelyen csak „Újrapróbálás” gomb van. Innen a doki nem tud másik adatmappát választani (például egy visszaállított mentést), és a mappát sem tudja megnyitni a fájlkezelőben, hogy megnézze a hibás fájlt; a Beállítások Adattárolás füle ilyenkor elérhetetlen. A blokkoló képernyő („Újrapróba” / „Másik mappa kiválasztása”) ezt a hibaállapotot ma nem fedi. Elvárt: ugyanezen a képernyőn a telepített appban „Másik mappa kiválasztása” és „Mappa megnyitása” is legyen; a Pages-demó hibaképernyője nem változik. Nem tartozik ide: a sérült fájl automatikus javítása vagy felülírása.
