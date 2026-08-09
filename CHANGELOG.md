# Változásnapló

Ez a napló összefoglalja, mi változott a programban — mindig a legfrissebb változás van felül.

## 2026. augusztus 9.

- A fogtérkép mostantól beviteli eszköz is: egy még kezeletlen fogra kattintva új sor indul,
  a fogszám előre kitöltve; egy már kezelt fogra kattintva a program a hozzá tartozó sorra
  ugrik (többszöri kattintással körbejárja az összeset). Minden sor mellett egy kis
  fogválasztó ablak is nyílik, és a fogtérkép billentyűzettel is végigjárható.
- Az "Érintett fogak" panel alapból összecsukva indul, és csukott állapotban is mutatja,
  hány fog érintett.
- A Fog mezőnél a program jelzi, ha elgépelt fogszám került bele (például "99"), a
  szabadszöveges megjegyzés (például "jobb felső") viszont továbbra is nyugodtan beírható.
- A véglegesítés nem engedi tovább azt a sort, amelyhez nem választottunk tételt — így
  névtelen, 0 Ft-os sor nem kerülhet az aláírandó dokumentumra.
- A félbehagyott terv nem vész el: ha véletlenül bezárul vagy összeomlik az ablak, a
  kezdőoldal felajánlja a piszkozat folytatását, és rákérdez, mielőtt egy új terv felülírná.
- Javítottuk, hogy egy korábbi, már véglegesített terv új verzióra nyitásakor a keltezés és
  az érvényesség lejárt, régi dátumot mutatott — ilyenkor aláírásra alkalmatlan lett volna a
  dokumentum. Mostantól a program a mai napra állítja ezt a két dátumot (a tételek ára nem
  változik), és egy tájékoztató sávval jelzi is ezt a szerkesztőben.

## 2026. augusztus 8.

- A nyilatkozat és a fizetési feltételek valódi szövege került a nyomtatványra, és mindkettő
  külön-külön szerkeszthető a Beállításokban.
- Javítottuk, hogy a nyomtatott terv lábléce bizonyos esetekben teljesen eltűnt.
- A fogtérképen mostantól a kezelés fajtája szerinti színnel jelöljük az érintett fogakat,
  jelmagyarázattal — ugyanúgy a képernyőn és a nyomtatott terven is.
- Az egész felület egységes megjelenést kapott: a böngésző saját felugró ablakai helyett
  rendes párbeszédablakok, olvashatóbb kontrasztok, teljes billentyűzetes használat, és a
  pénzösszegek többé nem törnek ketté a sor végén.

## 2026. augusztus 6.

- Elkészült a letölthető, nyomtatható kezelési terv: fejléc a rendelő adataival,
  pácienstömb, kezelési fázisok táblázata, fogtérkép, összegzés és nyilatkozat. Egy
  kapcsolóval "csak ajánlat" formában is kiadható.
- Új képernyők: páciens adatlap (kiskorúnál törvényes képviselő mezővel), korábbi tervek
  páciensenként csoportosítva — a régi terv megnyitható szerkesztésre vagy letölthető az
  eredetiben mentett dokumentum —, és a rendelő beállításai.
- A terv nyelve (magyar vagy német) és a pénzneme (forint vagy euró) mostantól egymástól
  függetlenül választható, tehát egy német nyelvű ajánlat is maradhat forintos. Ha egy
  tételnek nincs német neve, a magyar név jelenik meg jól látható HU jelöléssel, és
  véglegesítés előtt a program rákérdez.
- Mind a 118 tétel kapott német nevet és euró árat. Ezek gépi fordítások és a mai
  árfolyamon számolt árak, nincsenek átnézve — az Árlista képernyőn javíthatók.
- Az alkalmazás és a nyomtatvány a rendelő honlapjának színeit és logóját kapta.
- Az árlistában a "fix ↔ sávos" átállítás mostantól a forintos és az eurós árat is együtt
  váltja, hogy a sávos ár mindkét pénznemben csillaggal és lábjegyzettel jelenjen meg a
  nyomtatványon, sose csupasz fix összegként.
- A darabszám és a tényleges ár mezői megbízhatóbbak lettek: nem esnek némán nullára, van
  hozzájuk fel-le nyíl, és gépelés közben azonnal jelzik, ha a felsorolt fogak száma nem
  egyezik a megadott darabszámmal.
- Ha egy sorba sok fogszámot írunk, azok a nyomtatott terven már nem csúsznak át a Db
  oszlopba, hanem több sorba tördelődnek.
- A mentés biztonságosabb lett: egy félbeszakadt mentés nem hagy hátra féllkész verziót,
  egyetlen hibás terv nem viszi el az egész Korábbi tervek listát, és ha egy megnyitott terv
  végösszege nem egyezik a mentett dokumentumban lévővel, a program figyelmeztet.

## 2026. augusztus 5.

- Elkészült a kezelési terv szerkesztő: a tételek ékezetek nélkül is kereshetők, a felvitel
  végig billentyűzettel megy (gépelés → nyilakkal választás → Enter → a kereső kiürül és
  várja a következő tételt), a sorok kezelési fázisokba rendezhetők, fogszámmal,
  darabszámmal és kedvezménnyel.
- A kedvezmény csak a szerkesztőben látszik, a páciensnek átadott dokumentumon nem.
- Elkészült az Árlista képernyő: árak és kategóriák szerkesztése, új tétel felvétele, és a
  már nem használt tételek kivezetése törlés helyett — így a régi tervek évek múlva is
  ugyanazt jelentik.
- Egy meglévő terv módosítása mindig új verziót hoz létre, a korábbi változat érintetlenül
  megmarad.
