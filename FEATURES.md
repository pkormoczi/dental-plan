# Funkciók

Ez az összefoglaló bemutatja, mire használható az alkalmazás — képernyőnként csoportosítva, a fenti navigáció sorrendjében.

## Páciens

- Páciens adatainak rögzítése: név, születési dátum, TAJ, lakcím, telefon, e-mail, és kiskorú páciensnél a törvényes képviselő adatai.
- Itt dől el az ajánlat nyelve (magyar/német) és pénzneme (forint/euró) — ez a választás az első mentés után rögzül, utána már nem módosítható.
- Ha a tervben már vannak felvett tételek, nyelv- vagy pénznemváltás előtt a program megkérdezi, mi történjen velük (a tételnevek frissülnek az új nyelvre, pénznemváltásnál pedig törlődnek, hogy ne maradjon rossz pénznemben rögzített ár).

## Terv szerkesztő

- A kezelési terv összeállítása fázisokra bontva, gyors kereséssel az árlistából — gépeléssel, nyilakkal és Enterrel is, egérhasználat nélkül.
- Kattintható fogtérkép: egy fogra kattintva közvetlenül onnan is felvehető egy kezelés, és látszik, mely fogakon milyen kezelés szerepel.
- Tételenként megadható a fog, a mennyiség, az ajánlati ár (kedvezménnyel vagy felárral), és jelölhető, hogy az ár csak becsült-e; hozzáadható egy leírás is arról, mi tartozik a tételhez.
- Kerek végösszeg is beállítható a tervhez — a hozzá tartozó kedvezményt a program automatikusan kiszámolja —, és ha a kezelés fogtechnikai munkát tartalmaz, előleg is feltüntethető.

## Előnézet

- A végleges nyomtatvány megtekintése véglegesítés előtt, akár „csak ajánlat” (nyilatkozat és aláírás nélküli) változatban is.
- Innen indul a véglegesítés: ekkor készül el a letölthető PDF, és ekkor mentődik a terv új verzióként.
- Véglegesítés előtt a program figyelmeztet, ha hiányoznak páciensadatok, ha egy tétel neve nem a terv nyelvén szerepel, vagy ha egy csomagtételhez nincs megadva leírás.

## Korábbi tervek

- Egy visszatérő páciens korábbi ajánlatainak/terveinek keresése, megnyitása és PDF-letöltése, verziónkénti végösszeggel; egy páciensnek akár több, egymástól független terve is lehet, ezek külön, saját — magától javasolt, de szabadon átírható — címmel jelennek meg egymás alatt (több terv esetén összecsukva, egy kattintással kinyithatóan).
- Régi verzió sosem íródik felül — módosításkor mindig új verzió készül a meglévő tervhez, a korábbi (aláírt) állapot változatlan marad.
- Egy korábbi terv alapján önálló új terv is indítható: vagy csak a páciens adataival (visszatérő páciensnél nem kell újragépelni), vagy a teljes tartalom átvételével, például egy árváltozat elkészítéséhez.
- Új terv indításakor is kereshető, hogy a páciens szerepel-e már korábban — ha igen, az adatai előre kitöltődnek, ha nem, egy teljesen új, üres terv indul.

## Árlista

- A kínált kezelések, áraik (forint és euró) és kategóriáik karbantartása, kereséssel és szűrőkkel (pl. hiányzó euró ár, sávos ár, inaktív vagy gyakori tétel).
- Egy tétel törlés helyett inaktiválható, hogy a rá hivatkozó régi tervek később is értelmezhetők maradjanak — bármikor visszakapcsolható.
- Kategóriák létrehozása, átnevezése, színezése és sorrendezése — a kategória színe egyben a fogtérképen is ezt jelöli.
- Tételenként megadható „gyakori” jelölés (gyorsgomb a szerkesztőben), leírás arról, mi tartozik hozzá, és megjelölhető „csomagtételnek” is, hogy a véglegesítés figyelmeztessen, ha egy rá hivatkozó soron nincs leírás.

## Beállítások

- Rendelő adatai és az orvosok listája a nyomtatvány fejlécéhez/lábléchez.
- Nyilatkozat, fizetési feltételek és garancia szövegének szerkesztése — mentéskor mindig új verzió jön létre, a korábban aláírt tervek a saját, aláírt szövegükkel maradnak.
- Német nyelv engedélyezése, és annak áttekintése, mennyi tartalom (tételnevek, euró árak, nyilatkozat) áll már készen németül.
