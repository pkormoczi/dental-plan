# uj-paciens-enter-mentes
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 7. megállapítás

A „+ Új páciens” dialógusban az Enter a Név mezőből azonnal menti a pácienst és átdob a Terv
adatai lapra: a Született és a Telefon mező kitöltetlen marad, és nincs semmilyen „páciens
mentve” visszajelzés — a doki egy másik képernyőn találja magát, és nem tudja, létrejött-e a
rekord. Repro: „+ Új páciens” → név begépelése → Enter. Oka: a dialógus `<form onSubmit>`-ja
natívan lefut Enterre bármelyik mezőből (`app/src/pages/paciensek/UjPaciensDialog.tsx`), pedig a
fájl saját szándéka az explicit Mentés gomb, és a Született/Telefon mező pont azért van a
dialógusban, mert a doki már ott kéri őket. Elvárt: az Enter a Név mezőben a következő mezőre
viszi a fókuszt (mentés a gombról vagy az utolsó mezőből), vagy — ha ment — a Terv adatai lap
tetején egy rövid „<Név> felvéve” jelzés fogadja a dokit. A hatás továbbgyűrűzik: a kimaradt
telefonszámot a doki utólag a Terv adatai lapon írja be, ahol a `torzsadat-elteres-ures-mezo`
csapdájába fut. Nem ide tartozik a dialógus mezőkészletének bővítése.
