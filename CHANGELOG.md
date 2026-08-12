# Változásnapló

Ez a napló összefoglalja, mi változott a programban — mindig a legfrissebb változás van felül.

## 2026. augusztus 12.

- Megjelent egy új „Páciensek” menüpont: itt a páciens elérhetőségei (telefon, e-mail, lakcím,
  TAJ, születési dátum, kiskorú esetén a törvényes képviselő adatai) egy önálló, minden
  konkrét ajánlattól független adatlapon tárolhatók és bármikor szerkeszthetők — nem kell
  minden új tervhez újra begépelni őket. Innen terv nélkül is felvehető egy új páciens, és egy
  kattintással át lehet váltani a páciens adatlapja és a korábbi tervei között.
- A Terv szerkesztőben a Db (darabszám) mező mostantól automatikusan követi a Fog mezőben
  felsorolt fogak számát, amíg kézzel felül nem írjuk — ekkor egy ⟳ gombbal bármikor
  visszaállítható az automatikus követésre.
- Javítottunk egy ritka hibát, amely miatt két, nagyon gyorsan egymás után elvégzett mentés
  (pl. az Árlistán vagy a Beállításokban) néha elveszíthette az egyik módosítást.
- Az Árlista adminban sávos ár megadásakor a program mostantól figyelmeztet, ha a „-tól” érték
  nagyobb, mint a „-ig” érték — korábban ez észrevétlenül átment, és a nagyobb (helytelen) szám
  került be egységárként a tervekbe.
- Javítottuk, hogy ha egy fogszám véletlenül kétszer szerepel a Fog mezőben (pl. „16, 17, 16”),
  a fogtérkép ne jelölje meg duplán, és ne jelenjen meg emiatt hamis „a darabszám nem egyezik”
  figyelmeztetés.

## 2026. augusztus 11.

- A Korábbi tervek egy régebbi verziójának menüjében megjelent egy „Megnézés” lehetőség: ezzel
  a mentett nyomtatvány közvetlenül, új böngészőlapon megtekinthető, anélkül hogy a
  szerkesztőbe töltődne (és ezzel veszélyeztetné a folyamatban lévő piszkozatot) vagy fájlt
  hagyna a Letöltések mappában.
- A német nyelvű ajánlat véglegesítésekor megjelenő figyelmeztető lista mostantól külön
  sorolja fel az egyedi (kézzel beírt, árlistán kívüli) tételeket a ténylegesen hiányzó német
  fordítású tételektől — pontosabb kép arról, mit érdemes ellenőrizni.
- Az árlista admin bármilyen mentése (akár csak egyetlen tétel „gyakori”-jelölése is)
  mostantól frissíti a nyomtatványon feltüntetett árlista-dátumot — eddig ez a dátum a
  legelső feltöltés óta változatlan maradt, holott az árlista azóta sokszor módosult.
- A letöltött kezelési terv PDF fájlneve mostantól tartalmazza a páciens nevét is (eddig csak
  egy azonosítót), piszkozat esetén pedig egy „PISZKOZAT-” előtaggal kezdődik — így a
  Letöltések mappában is könnyen megtalálható és megkülönböztethető.
- Véglegesítéskor a program mostantól figyelmeztet, ha egy megnevezett tétel 0 forintos/eurós
  áron szerepel a tervben — ez korábban észrevétlenül a nyomtatott dokumentumra kerülhetett,
  például egy elgépelés és egy reflexből megnyomott Enter miatt.
- Egy sorokat tartalmazó kezelési fázis törlése mostantól visszakérdez, mert ez korábban
  egyetlen kattintással, visszavonhatatlanul törölte az összes benne lévő tételt is. Üres
  fázis törlése változatlanul egy kattintás.
- A Korábbi tervek lista mostantól páciensenként akár több, egymástól független tervet is meg
  tud különböztetni — eddig egy páciens neve alatt csak egyetlen tervsorozat verziói fértek el,
  mostantól többféle önálló ajánlat (pl. egy fogpótlás és egy külön fogszabályozási terv) is
  elkülönítve, saját — a benne szereplő kezelések alapján magától javasolt, de bármikor szabadon
  átírható — címmel jelenik meg ugyanannál a páciensnél. Ha egy páciensnek több önálló terve is
  van, a lista alapból összecsukva mutatja őket, egy kattintással nyílnak ki; egyetlen terv
  esetén, ami a legtöbb páciensnél igaz, nincs ilyen plusz lépés. A lista gombjai is
  áttekinthetőbbek lettek: a páciens neve mellett egy rövid "Új terv" gomb áll, az egyes mentett
  verziók melletti műveletek (letöltés, új verzió mentése, másolás új tervbe) pedig egy közös
  menü mögé kerültek soronként.
- A Kezdőlap "Új terv indítása" gombja mostantól előbb megkérdezi, kinek indul a terv: kereshető
  a már meglévő páciensek között (ekkor a korábban megadott adatai előre kitöltődnek), vagy
  indítható egy teljesen új, még sosem szereplő páciens tervezésével.
- Megjelent egy új „Filerendszer” menüpont: itt előre megnézhető, hogy a program végleges
  változata pontosan hová, milyen mappákba és fájlnevekbe fogja majd menteni a kezelési
  terveket, az árlistát és a nyomtatvány szövegeit. Egy fájlra kattintva a tartalma is
  megtekinthető, egy már elmentett tervnél pedig akár a ténylegesen legenerált nyomtatvány is
  megnyitható innen, új lapon.

## 2026. augusztus 10.

- A nyomtatott kezelési terv kapott egy új "Garancia" oldalt, a fizetési feltételek után — ez is
  szerkeszthető a Beállításokban, ugyanúgy, mint a nyilatkozat és a fizetési feltételek szövege,
  és a "csak ajánlat" nyomtatásnál is mindig megjelenik (szemben a nyilatkozat és aláírás
  oldallal, ami ilyenkor kimarad). A szövege egyelőre helykitöltő ("a garanciafeltételek még
  nincsenek megadva"), amíg meg nem írjuk a tényleges garanciális feltételeket.
- Mostantól bármelyik tételhez (az Árlista adminban) és bármelyik sorhoz (a Terv szerkesztőben)
  hozzáadható egy kétnyelvű leírás arról, mi van benne — hasznos egy összetett, csomagszerű
  tételnél (pl. egy fogpótlási csomag), ahol a páciens otthon is szeretné tudni, pontosan mi
  tartozik az árhoz. Egy tétel megjelölhető "csomagtételnek" is: ha egy ilyen tételre hivatkozó
  soron nincs leírás, a szerkesztőben sárga jelzés figyelmeztet rá, véglegesítéskor pedig a
  program megkérdezi, biztos folytatható-e leírás nélkül (ez nem blokkolja a mentést). A leírás
  a nyomtatott terven a tétel neve alatt, kisebb, szürke betűvel jelenik meg — ez tervenként egy
  kapcsolóval ("Tétel-leírások nyomtatása") ki is kapcsolható, ha egy adott ajánlaton nem
  szeretnénk megjeleníteni.
- A Korábbi tervek listán két új gomb jelent meg: "Új terv a páciens adataival" (a páciensnév
  mellett — új, üres tervet indít, csak a személyes adatokat véve át, hogy visszatérő
  pácienshez ne kelljen újragépelni azokat) és "Másolás új tervként" (minden verziósoron — a
  kiválasztott ajánlat összes sorát átveszi egy önálló, új tervbe, amit utána szabadon lehet
  módosítani anélkül, hogy az eredeti ajánlat felülíródna — ez teszi könnyűvé egy A/B
  árváltozat elkészítését). Mindkét gomb a Páciens adatlapra visz, ahol az átvett adatok még
  pontosíthatók, mielőtt bármi mentődik.
- A Terv szerkesztőben új "Kerek végösszeg beállítása" kapcsoló jelent meg az Összesítés alatt —
  bekapcsolva megadható a kívánt kerek végösszeg (pl. "legyen kereken 2 050 000"), a program a
  belőle adódó kedvezményt automatikusan kiszámolja és kiírja, így ezt nem kell soronként fejben
  vagy számológéppel visszaosztani. A Fizetendő és az esetleges Előleg is ebből az összegből
  számol; a kedvezmény összege — a soronkénti kedvezményhez hasonlóan — a nyomtatványon nem
  jelenik meg, csak a szerkesztőben.
- Az Árlista adminban a "+ Új tétel" gomb mostantól a lista tetején is megjelenik (a lista alján
  is megmaradt), és felugró ablakban kérdez rá a névre és a kategóriára — eddig a kattintás
  azonnal, névtelenül és az első kategóriába emelt be egy tételt, ami hosszú listánál
  megtalálhatatlan és zavaró volt. A felugró ablak a kategóriaválasztást kötelezővé teszi (nincs
  alapértelmezett kitöltés), figyelmeztet, ha már van ugyanilyen nevű tétel, és a Mégse gombra
  vagy Escapre semmi nem jön létre. Mentés után a lista a friss sorhoz görget, és a fókusz
  rögtön az ár mezőn van.
- Az Árlista adminban új "Kategóriák" panel jelent meg: kategória létrehozható, átnevezhető, egy
  kurált palettából színt kaphat, sorrendje fel/le nyilakkal állítható, és törölhető is, ha már
  egyetlen tétel sincs benne.
- A fogtérképen egy kezelés színét mostantól közvetlenül a hozzá tartozó kategória színe adja
  (ugyanaz, amit a Kategóriák panelen be lehet állítani), nem egy előre rögzített, kódba írt
  táblázat — így egy átszínezett kategória azonnal megjelenik a fogtérképen is.
- Kijavítottunk kb. 20 elgépelést az árlista tételneveiben (például "Neodetn" → "Neodent",
  "Ideigenes" → "Ideiglenes").
- A "Besorolatlan" kategória neve "Diagnosztika és konzultáció"-ra változott.
- Új "Fogszabályozás" kategória jött létre, és a 6 odaillő tétel átkerült hozzá az "Egyéb
  kezelések" közül.
- Az 5 francia nyelvű maradványtétel és egy duplikált "Lokátor felépítmény" tétel inaktívvá vált
  (nem törlődtek, csak elrejtve a keresésből) — szükség esetén egy kattintással
  visszakapcsolhatók.
- Javítottuk, hogy az Árlista adminban a tétel- vagy kategórianév mezőbe gyorsan gépelve néha
  lemaradjon egy betű a beírt szövegből (például "Fogszabályozás" helyett "Fogszabályozs"
  mentődött) — a mező mostantól mindig pontosan azt mutatja és menti, amit begépeltünk.

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
- Bármelyik soron megjelölhető egy ≈ ikonnal az ajánlati ár mellett, hogy az ára csak
  becslés (eddig csak azokon a tételeken lehetett, amiket az árlista eleve "sávos"-nak
  jelölt). Az így jelölt sor a nyomtatványon csillagot és egy magyarázó lábjegyzetet kap —
  így egy csontpótló anyag vagy más, csak a műtőben pontosítható tétel nem kerül fix,
  kötelező érvényű árként az aláírandó dokumentumra. A jelölés szabadon be- és
  kikapcsolható bármelyik soron, egyedi soron is.
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
