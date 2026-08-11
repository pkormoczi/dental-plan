# 1. Áttekintés és döntések

## Mit vált ki

A Mándoki Dental jelenleg egy `.xls` munkafüzetben készíti a kezelési
terveket. A munkafüzet két lapból áll: `Kezelesi_Terv` (a nyomtatandó
dokumentum) és `Arlista` (157 sor).

**Nincs benne valódi makró.** A VBA projekt egyetlen üres
`Sub Lenyíló27_Változáskor()`-t tartalmaz. Amit a doktor makróknak hív,
az form control legördülők + `INDEX()` képletek kombinációja:

```
I14 = INDEX(Arlista!$B$1:$B$196, Arlista!$C1)   ; C1 = a combo box LinkedCell-je
K14 = I14 * J14
K23 = SUM(K14:K22)
I48 = K23 + K36 + K46
```

### Miért nem elég az Excelt megjavítani

A doktor négy kérése közül három megoldható lenne a táblában is
(egységár-oszlop felszabadítása, második ár-oszlop, nyomtatási terület
logóval). Az alkalmazás valódi indokai ezek:

1. **Az árlookup sorindex alapú.** Ha bárki beszúr egy sort az `Arlista`
   közepére, minden korábban mentett terv csendben más árat mutat. Ez néma
   adatkorrupció egy olyan dokumentumban, amit a páciens aláír.
2. **A tábla már most szétesett.** A LinkedCell-ek `C1..C5, C9, C11` —
   a saját kommentjei szerint *"A 4. sor nem működik, ezért kihagyva!"*.
3. **Kemény limitek:** maximum 3 kezelési fázis, fázisonként 7–9 sor.
4. **Nincs tervtörténet és nincs verziókövetés.**

## Döntések

| # | Döntés | Indoklás / következmény |
|---|---|---|
| D1 | Egy rendelő, belső eszköz — nem termék | Nincs multi-tenancy, nincs auth a fő flow-ban |
| D2 | Nincs szerveroldali páciensadat | A fejlesztő soha nem lesz adatfeldolgozó; nincs DB, nincs adatfeldolgozói szerződés |
| D3 | A fájlrendszer a system of record | A doki kijelöl egy gyökérmappát, az app oda ír. Google Drive-val szinkronizálja |
| D4 | Soha nem írunk felül tervet | Módosításkor mindig új verziómappa (`v2`). Aláírt szerződést nem lehet visszamenőleg átírni |
| D5 | A PDF és a `terv.json` együtt íródik | Plusz a JSON **beágyazva a PDF-be** is — így a PDF önhordozó marad, ha külön elküldik |
| D6 | Ártétel-hivatkozás stabil `id`-vel, nem sorindexszel | Ez az eredeti Excel fő hibája |
| D7 | Az ajánlat pillanatkép | A terv sorai snapshotolják a tételnevet és az árat; az árlista későbbi változása nem írja felül a múltat |
| D8 | Kedvezmény = `listaEgysegar` és `tenylegesEgysegar` külön tárolva | A kedvezmény származtatott, tehát mérhető. Nem felülírás |
| D9 | A kedvezmény **nem jelenik meg** a nyomtatványon | Nem volt rá igény; a doki szóban kommunikálja |
| D10 | Kétnyelvű modell az első naptól, magyar tartalommal indul | A német nyelv egy kapcsoló, ami a fordítások elkészülte előtt is bekapcsolható — a hiány az appban számszerűen látszik (lásd D21) |
| D11 | HUF és EUR ár egymástól függetlenül szerkeszthető | Nincs árfolyam-átváltás, nincs külső hívás |
| D12 | Tetszőleges számú fázis és sor | Az Excel 3×7 limitje tisztán technikai artefaktum volt |
| D13 | Egy `Fog` mező soronként, szabad felsorolás | Nem külön megjegyzés oszlop. Megjegyzés fázis szinten van |
| D14 | Egységtípus és automatikus darabszám **kimarad az MVP-ből** | A 118 tétel besorolása hetekre elakasztotta volna a projektet |
| D15 | Sávos árú tétel jelölése `*` + lábjegyzet | Jogi védelem: a sávos ár fix számként nyomtatva kötelező érvényű ajánlattá válna. A `*` forrása a **sor** `savos` mezője, nem az árlistai ártípus — a doki soronként kézzel is átbillentheti egy fix árú tételt becsültre, ha a mennyiség csak a kezelés során derül ki |
| D16 | Minden nem-null Excel sor importálódik | A takarítás az adminban történik, nem az importban |
| D17 | Tétel inaktiválható, de nem törölhető | Az `id` soha nem használható újra — a régi tervek értelmezhetősége múlik rajta |
| D18 | Minden JSON fájl `schemaVersion` mezővel indul | Ezek a fájlok évekig élnek a Drive-on; a 3. verziónak is olvasnia kell a mait |
| D19 | Search-only tételkereső, nincs kategória böngésző | A doki fejből tudja a tételeket; a keresés ékezetfüggetlen |
| D20 | „Gyakori" tételek kézzel jelölve | Nem használati statisztikából — kiszámítható, nem ugrál a UI |
| D21 | A terv nyelve és pénzneme egymástól **függetlenül** választható | A német páciens Magyarországon forintban is fizethet. Az 1:1 kötés (`de` → EUR) rossz tervezés lenne még kész fordítás/árazás mellett is — a nyelv a nyomtatvány szövegét vezérli (tételnevek, feliratok, dátumformátum, sablon), a pénznem az ajánlható tételkört és a pénzformátumot. Emellett a döntés idején (és amíg a doki nem lektorálta a 118 gépi fordítást és becsült EUR árat, lásd `docs/06-arlista-import.md`) a kötés használhatatlanná is tenné a német módot |
| D22 | Korábbi terv új verzióra nyitásakor a `keltezes` és az `ervenyesIg` a betöltés pillanatában frissül a mai napra (és az aktuális `ervenyessegNap`-ra), nem véglegesítéskor | Visszatöltött terv különben hónapokkal korábbi, akár lejárt keltezéssel nyomtatna. A véglegesítéskori írás a mentett JSON-t és a már renderelt PDF-blobot szétcsúsztatná. Csak dokumentum-metaadat változik: a sorok ára és `nevSnapshot`-ja pillanatkép marad (D7) |
| D23 | Placeholder-jelölésű (`[PLACEHOLDER`/`[PLATZHALTER`) nyilatkozat esetén a nyomtatvány nyilatkozat és aláírás oldala nem nyomtatható — a „csak ajánlat" mód kényszerített és letiltott, felülírás nélkül | Jogi kockázat: a páciens elé nem kerülhet aláírandó lap, amit a jogász „még nincs lezárva" jelöléssel látott el. A fizetési feltételek és a garancia `offerOnly` módban is nyomtatódik, ezért azoknál a magyar szövegre visszaesés + jelzés a helyes válasz, nem zár |
| D24 | Kézzel megadott sornevet automatikus mechanizmus soha nem ír felül némán — nyelvváltáskor csak az a `tetelId`-hez kötött sor frissül, ami a váltás előtti nyelven még pontosan az árlistai nevet viselte | A `nevSnapshot` szerkeszthető; a feltétel nélküli újraírás törölné a doki pontosítását. Új sémamező nélkül eldönthető (`nevSnapshot === tetel.nev[nyelv]`); az eltérést az „átírt" jelvény és a véglegesítés megerősítő listája teszi láthatóvá |
| D25 | A terv-szintű „kerek végösszeg" kedvezmény (`Plan.kedvezmenyOsszeg`) FIX összegként tárolódik, nem a doki által begépelt cél-végösszegként | Ha a cél-végösszeget tárolnánk élőben, egy utólagos sormódosítás némán, a doki tudta nélkül változtatná meg a kedvezményt — ez D8 szellemével (a kedvezmény mérhető, explicit tényállapot) ütközne. A `Fizetendő` emellett soha nem megy 0 alá: ha a fix kedvezmény egy utólagos sortörlés után meghaladja a sorok összegét, a végösszeg 0-ra padlózódik, nem negatív szám kerül az aláírandó papírra (`tervVegosszeg()`, `domain/totals.ts`) |
| D26 | Egy terv másolása (akár csak a páciensadattal, akár a sorokkal együtt) mindig új tervláncot indít — üres `tervId`, `verzio: 0`, `PISZKOZAT` státusz, mai keltezés — és a másolat `osszesitok`-ja a saját (átvett) soraiból újraszámolva indul, nem a forrás mentett értékének másolata. A `paciensId` (D29) átöröklődik, tehát az új lánc a MEGLÉVŐ páciens-mappában nyílik, nem egy újban | D4 kiegészítése: a másolat sosem csúszhat be verzióként egy meglévő, esetleg aláírt láncba. A forrás `osszesitok`-ja az EREDETI, már mentett terv fájl-igazsága (D7) — egy soha nem mentett piszkozatra másolva hamis „mentett vs. újraszámolt” eltérést jelezne |
| D27 | A `Tetel.leiras` hiányzó német fordítása némán elmarad a nyomtatványról, nem esik vissza magyarra (ellentétben a `nevSnapshot`-tal) | A leírás kiegészítő, díszítő tartalom, nem a sor lényege (azt a név hordozza) — egy vegyes nyelvű nyomtatvány rosszabb lenne, mint a leírás hiánya. A `nevSnapshot`-hoz hasonló szigorú HU-visszaesés/jelvény-apparátus túlkezelés lenne egy opcionális mezőhöz (docs/02-domain-modell.md § Tétel-leírás) |
| D28 | A fogtérkép kezelés-kategóriánkénti színe az árlista `Kategoria.szin` mezőjéből olvas, nem kódba huzalozott táblából; egy fogon több kezelés esetén a kategórialista sorrendje egyben az ütközési prioritás (a legkisebb `sorrend`-ű kategória színe nyer) | A szín így a doki kezében marad a Kategóriák panelen, kódmódosítás nélkül; a prioritás magyarázat nélkül is kiszámítható, mert ugyanaz a sorrend, amit ő állított be (`docs/07-felulet-rendszer.md` § Szín, forma, sűrűség, `resolveToothVisual`) |
| D29 | A páciens explicit, azonosított entitás (`paciensId`, `paciens.json`) egy köztes szinten a páciens-mappa és a terv-mappák között — egy páciens-mappa TÖBB terv-láncot (terv-mappát) is tartalmazhat, nem csak egyet. A `paciens.json`/`terv-cimke.json` kizárólag azonosító-/kereső-index és szervezési metaadat, SOHA nem system of record: a `terv.json` `paciens` blokkja marad a pillanatkép (D7), a terv-mappa neve a létrehozáskor fix, a megjelenített terv-címke attól függetlenül szabadon szerkeszthető | A korábbi névismétlés-alapú felismerés (két Kovács János is lehet, egy név a doki keze alatt is változhat) tévesen összevonna/szétválasztana pácienseket; egy explicit azonosító ezt kizárja. A `paciens.json` csak index (D3: a fájlrendszer a system of record, de a keresést/előtöltést nem kell minden alkalommal a teljes fa bejárásával megoldani) |

## Adatvédelmi keret

A kezelési terv tartalma — név, születési idő, lakcím, TAJ, elvégzendő
beavatkozások — **GDPR 9. cikk szerinti különleges adat**.

A D2 és D3 döntés következménye, hogy az adat soha nem hagyja el a rendelő
gépét és a doktor saját Google fiókját. A fejlesztő semmilyen minőségben
nem kerül az adatkezelési láncba.

Amit a rendelőnek kell rendeznie (nem fejlesztési feladat, de szólni kell
róla):

- **Google Workspace kell, nem ingyenes Gmail-fiók.** Workspace-nél van
  Data Processing Amendment; ingyenes fióknál nincs, és a mappanevekben
  páciensnevek lesznek.
- A gyökérmappa **ne** a `Letöltések` legyen — az sok gépen automatikusan
  személyes OneDrive-ra szinkronizál.
- Lemeztitkosítás (BitLocker) legyen bekapcsolva.
- A Drive szinkron **nem backup**: negyedévente kézi másolat külső lemezre.

## Kockázatok

| Kockázat | Kezelés |
|---|---|
| A német tartalom (118 név + jogi szöveg) sosem készül el | Az MVP magyarul teljes értékű. A kapcsoló nincs elrejtve (D21): a doki bekapcsolhatja és kipróbálhatja a német módot, a hiányzó fordítások száma számszerűen látszik a Beállításokban és a Páciens adatlapon, a hiányzó nevű tételek magyarra esnek vissza jelöléssel, a véglegesítés pedig figyelmeztet, mielőtt a páciens aláírna egy részben magyar nyelvű dokumentumot |
| A doki lassabbnak találja az Excelnél | A tételfelvitel billentyűzetes flow-ja az első, amit tesztelni kell — a PDF előtt |
| A Drive „streamelés" módban lassú `paciensek/` fa olvasás | A Drive kliensben **Tükrözés** módot kell beállítani, nem Streamelést |
| A `Fog` mező jegyzetmezővé válik | Elfogadott: szabadszöveget is elbír, csak az esetleges későbbi automatika nem indul el |
| Windows 260 karakteres útvonalkorlát | Rövid mappanevek, tiltott karakterek szűrése — lásd `02-domain-modell.md` |
