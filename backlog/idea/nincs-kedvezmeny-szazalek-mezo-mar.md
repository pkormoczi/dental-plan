# nincs-kedvezmeny-szazalek-mezo-mar
Type: feature
Source: review:2026-09-08-doctor-review-paciens-elott#3

Az Ajánlati ár mező elfogadja a százalékos gyorsírást (`-10%`/`+10%`/`10%`, kiszámolja az
abszolút árat — `app/src/pages/planEditor/LineRow.tsx` `szazalekosAr`, a `952acf2` óta), de a
mezőn semmi nem jelzi ezt: sem placeholder, sem tooltip, sem melléírt szöveg. Egy első
alkalommal használó doki, aki nem tudja előre, hogy ez a képesség létezik, nem talál rá, és a
régi, fejben számolós utat választja (pl. „koronára 10% kedv." → 95 000 × 0,9 = 85 500 kézzel
begépelve) — pont azt a hibalehetőséget hozva vissza, amit a funkció megszüntetni hivatott.
Elvárt viselkedés: egy rövid, halvány placeholder vagy segédszöveg az Ajánlati ár mező
mellett/alatt (pl. „…vagy −10%”), hogy a képesség első használat előtt is felfedezhető legyen.
Kizárt: a `szazalekosAr` számítási logika módosítása — az már helyesen működik, csak a
felfedezhetőség hiányzik.
