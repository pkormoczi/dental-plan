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
- A kezelési sor neve mostantól javítható: egy elgépelt vagy túl rövidített árlistai
  megnevezés a soron pontosítható, az ár és a többi adat nem változik. Ha a keresőben nincs
  megfelelő tétel, a beírt szöveg egyedi sorként vehető fel (például egyedi anyagköltség
  vagy egy árlistában nem szereplő tétel) — a soron ekkor egy "egyedi" jelölés látszik, és
  nincs listaár, csak a beírt ár. Egy meg nem nevezett sor továbbra sem kerülhet az
  aláírandó dokumentumra.
- Német nyelvű ajánlaton egy kitöltött egyedi sor is megkapja a "HU" jelölést, és bekerül a
  véglegesítés előtti "hiányzó német tételnevek" figyelmeztetésbe — szabad szöveghez
  ugyanis nincs német fordítás.
- Javítottuk, hogy a terv nyelvének utólagos váltása (Páciens adatlap) csendben felülírta
  volna egy kézzel pontosított sornevet. Mostantól csak azok a sorok frissülnek az új
  nyelvre, amik még az árlistai eredeti nevet viselték; egy kézzel átírt név változatlan
  marad, "átírt" jelöléssel a szerkesztőben, és a nyelvváltás előtt a program előre
  megmondja, hány sor frissül és hány marad változatlan.
- A véglegesítés előtti "hiányzó német tételnevek" figyelmeztetés mostantól külön sorolja
  fel, melyik tételnek nincs egyáltalán német neve, és melyik sor neve tér el kézzel az
  árlistától. (Eddig egy vele összefüggő hiba miatt ez a figyelmeztetés hiányos páciensadat
  mellett néha teljesen kimaradt a véglegesítésből — ez is javítva.)
- Javítottuk, hogy euró pénznemű tervnél a "Tényleges" ár mező nyers centet mutatott és
  fogadott be a szerkesztőben (pl. `2800` `28,00 €` helyett) — a beírt szám ráadásul rossz
  nagyságrenden íródott a tervbe. Mostantól ez a mező is euróban jelenít meg és fogad be,
  ugyanúgy, ahogy az árlista admin EUR mezői már eddig is. Az oszlopfejlécek is jelzik a
  terv pénznemét ("Listaár (Ft)"/"(€)" stb.).
- Bármelyik soron megjelölhető egy "≈ Becsült" jelölővel, hogy az ára csak becslés (eddig
  csak azokon a tételeken lehetett, amiket az árlista eleve "sávos"-nak jelölt). Az így
  jelölt sor a nyomtatványon csillagot és egy magyarázó lábjegyzetet kap — így egy
  csontpótló anyag vagy más, csak a műtőben pontosítható tétel nem kerül fix, kötelező
  érvényű árként az aláírandó dokumentumra. A jelölés szabadon be- és kikapcsolható
  bármelyik soron, egyedi soron is.
- A nyomtatványon a "Kezelések összesen" sor csak akkor jelenik meg, ha ténylegesen eltér a
  fizetendő összegtől — kedvezmény nélkül eddig ugyanaz a szám állt kétszer egymás alatt,
  ami a páciensnek is zavaró volt. Ilyenkor mostantól csak a kiemelt "Fizetendő" sor látszik.
  (A kedvezmény összege továbbra sem jelenik meg a nyomtatványon.) Ha egy sor tényleges ára a
  listaár fölé kerül, azt a szerkesztő "Felár" sorként jelzi a végösszeg alatt — eddig erről
  nem adott visszajelzést.
- A tételkereső mostantól szól, ha több találat van, mint amennyit kilistáz: a lista alján
  megjelenik, hány további tétel maradt le ("+3 további találat — pontosíts a kereséssel").
  Eddig a 12. találat után némán levágta a többit.
- Az Árlista keresője a német néven is talál — eddig csak a magyar nevet nézte, így egy csak
  németül elgépelt vagy elnevezett tétel egyáltalán nem jött elő az adminban (a szerkesztő
  keresője viszont már eddig is megtalálta).
- Fogtechnikai munkát tartalmazó kezelésnél a program kiszámolja az előleget: a szerkesztőben
  a végösszeg alatt egy kapcsoló ("Ez a terv fogtechnikai munkát tartalmaz"), alapból 50%-kal,
  szabadon átírható. Bekapcsolva a nyomtatványon a Fizetendő alatt megjelenik az "Előleg" és a
  "Fennmaradó rész" sor, a fizetési feltételek szövegében pedig ugyanaz a százalék szerepel,
  amit a doki beállított. Eddig ezt fejben kellett kiszámolni és kézzel a papír aljára írni.
- A "Korábbi tervek" listában minden verzió mellett ott a végösszege is, így megnyitás nélkül
  látszik, mennyiért ment ki egy korábbi ajánlat. (Ha egy terv fájlja sérült, annál a
  sornál "—" áll az összeg helyén.)

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
