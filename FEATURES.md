# Funkciók

Ez az összefoglaló bemutatja, mire használható az alkalmazás — képernyőnként csoportosítva, a fenti navigáció sorrendjében.

## Páciensek

- Kereshető pácienslista (Név / Született / Telefon oszloppal) — a keresés a névre, a születési dátumra és a telefonszámra egyaránt működik. Új páciens terv nélkül is felvehető, csak a névvel; ha hasonló nevű, azonos születési dátumú vagy telefonszámú páciens már szerepel a rendszerben, a program figyelmeztet, mielőtt duplikátum jönne létre.
- Minden páciensnek saját részletoldala van két füllel: „Páciens adatai” (a törzsadat — elérhetőségek, TAJ, lakcím, kiskorú páciensnél a törvényes képviselő adatai —, alapból csak megtekinthető, egy „Szerkesztés” gombbal válik szerkeszthetővé) és „Kezelési tervek” (a páciens korábbi ajánlatai). Innen indítható vagy folytatható egy új kezelési terv is.
- Ha a páciens törzsadata eltér egy korábban mentett tervben szereplő adatoktól, a program jelzi, és felkínálja mindkét irányú frissítést (a törzsadatot a tervből, vagy fordítva); a terv véglegesítésekor egy nem kötelező figyelmeztetés is jelez ilyen eltérést.
- Egy páciens törölhető a részletoldal menüjéből, ha nincs véglegesített terve és nincs rá mutató, még mentetlen piszkozata sem — egyéb esetben a program megmondja, miért nem törölhető. A törlés végleges, nem vonható vissza.
- Egy visszatérő páciens korábbi ajánlatainak/terveinek listája: egy verzió közvetlenül megtekinthető böngészőben (letöltés nélkül) vagy letölthető PDF-ként, verziónkénti végösszeggel. Egy páciensnek akár több, egymástól független terve is lehet, ezek külön, saját — magától javasolt, de szabadon átírható — címmel jelennek meg, a legfrissebb elöl. Régi verzió sosem íródik felül, módosításkor mindig új verzió készül, és egy tervhez csak a legfrissebb verzióról indítható újabb verzió.
- Egy korábbi terv alapján önálló új terv is indítható: vagy csak a páciens adataival (visszatérő páciensnél nem kell újragépelni — a nyelv és a pénznem is a páciens legutóbbi véglegesített ajánlatából öröklődik), vagy a teljes tartalom átvételével, például egy árváltozat elkészítéséhez.
- Új terv indításakor kereshető, hogy a páciens szerepel-e már korábban, keresés nélkül is felajánlva a legutóbb aktív pácienseket. Ha nincs találat, egy „Új páciens” opció azonnal indítja a felvitelét a már begépelt névvel.
- A páciens adatlapján dől el az ajánlat nyelve (magyar/német) és pénzneme (forint/euró) — ez a választás az első mentés után rögzül, utána már nem módosítható. Ha a tervben már vannak felvett tételek, nyelv- vagy pénznemváltás előtt a program megkérdezi, mi történjen velük (a tételnevek frissülnek az új nyelvre, pénznemváltásnál pedig törlődnek, hogy ne maradjon rossz pénznemben rögzített ár).
- A kezelési terv összeállítása fázisokra bontva, gyors kereséssel az árlistából — gépeléssel, nyilakkal és Enterrel is, egérhasználat nélkül. Kattintható fogtérkép: egy fogra kattintva közvetlenül onnan is felvehető egy kezelés, és látszik, mely fogakon milyen kezelés szerepel. Tételenként megadható a fog, a mennyiség (a felsorolt fogak számából automatikusan kitöltve, de bármikor kézzel felülírható), az ajánlati ár (kedvezménnyel vagy felárral), és jelölhető, hogy az ár csak becsült-e; hozzáadható egy leírás is arról, mi tartozik a tételhez. A szerkesztés folyamatosan, automatikusan mentődik piszkozatként, és egy gombbal bármikor eldobható.
- Kerek végösszeg is beállítható a tervhez — a hozzá tartozó kedvezményt a program automatikusan kiszámolja —, és ha a kezelés fogtechnikai munkát tartalmaz, előleg is feltüntethető.
- A végleges nyomtatvány megtekintése véglegesítés előtt, akár „csak ajánlat” (nyilatkozat és aláírás nélküli) változatban is. Véglegesítés előtt a program figyelmeztet, ha hiányoznak páciensadatok, ha egy tétel neve nem a terv nyelvén szerepel, ha egy csomagtételhez nincs megadva leírás, vagy ha egy tétel díjmentesen (0 Ft-tal) szerepel a tervben. Ha a nyilatkozat szövege még jogi lektorálásra vár, a program automatikusan „csak ajánlat” módra kényszerít, mert enélkül nem generálható aláírásra alkalmas nyomtatvány.
- Innen indul a véglegesítés: ekkor készül el a letölthető PDF, és ekkor mentődik a terv új verzióként. A tervkészítés három lépése (Terv adatai → Kezelések → Előnézet és véglegesítés) fölött egy állandó, kattintható folyamatjelző mutatja, hol tart éppen a munka, és bármelyik korábbi lépésre bármikor vissza lehet lépni.

## Kezelések és árak

- A kínált kezelések, áraik (forint és euró) és kategóriáik karbantartása, kereséssel és szűrőkkel (pl. hiányzó euró ár, sávos ár, inaktív vagy gyakori tétel).
- Egy tétel törlés helyett inaktiválható, hogy a rá hivatkozó régi tervek később is értelmezhetők maradjanak — bármikor visszakapcsolható.
- Kategóriák létrehozása, átnevezése, színezése és sorrendezése — a kategória színe egyben a fogtérképen is ezt jelöli.
- Tételenként megadható „gyakori” jelölés (gyorsgomb a szerkesztőben), leírás arról, mi tartozik hozzá, és megjelölhető „csomagtételnek” is, hogy a véglegesítés figyelmeztessen, ha egy rá hivatkozó soron nincs leírás.

## Beállítások

- Három fülre osztva: Rendelő adatai, Nyomtatványok és Egyéb — mindegyiken önálló Mentés/Mégse gombpár védi a még nem mentett módosítást.
- Rendelő adatai: a rendelő adatai és az orvosok listája a nyomtatvány fejlécéhez/lábléchez.
- Nyomtatványok: a nyilatkozat, a fizetési feltételek és a garancia szövegének szerkesztése — mentéskor mindig új verzió jön létre, a korábban aláírt tervek a saját, aláírt szövegükkel maradnak.
- Egyéb: az ajánlat érvényességi ideje, a német nyelv engedélyezése, és annak áttekintése, mennyi tartalom (tételnevek, euró árak, nyilatkozat) áll már készen németül.

## DEMO

- Fejlesztési/demonstrációs felület, elkülönítve az üzleti munkától, öt füllel: Funkciók, Összes terv, Filerendszer, Változásnapló, Adatkezelés.
- A Funkciók fül ez az összefoglaló, a Változásnapló fül a program eddigi változásainak naplója.
- Az Összes terv fül minden páciens minden kezelési tervét egy helyen mutatja, kereshetően — a napi munkára a páciens saját részletoldalának „Kezelési tervek” tabja való, ez a fül a teljes állomány áttekintésére szolgál.
- A Filerendszer fül böngészhető mappa- és fájlszerkezetet mutat: hová, milyen néven kerülnek majd a mentett kezelési tervek, az árlista és a nyomtatvány-szövegei a végleges programban. Egy fájlra kattintva megnézhető a tényleges tartalma is — egy már elmentett tervnél akár a ténylegesen legenerált nyomtatvány is megnyitható innen, új lapon.
- Az Adatkezelés fülön a demó adat visszaállítható a kiindulási állapotra, vagy az összes tárolt adat véglegesen törölhető. A többi fül csak megtekintésre való — onnan semmi nem törölhető vagy módosítható.
