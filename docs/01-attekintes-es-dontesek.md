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
| D10 | Kétnyelvű modell az első naptól, magyar tartalommal indul | A német nyelv egy kapcsoló, ami akkor kapcsol be, amikor a fordítások megvannak |
| D11 | HUF és EUR ár egymástól függetlenül szerkeszthető | Nincs árfolyam-átváltás, nincs külső hívás |
| D12 | Tetszőleges számú fázis és sor | Az Excel 3×7 limitje tisztán technikai artefaktum volt |
| D13 | Egy `Fog` mező soronként, szabad felsorolás | Nem külön megjegyzés oszlop. Megjegyzés fázis szinten van |
| D14 | Egységtípus és automatikus darabszám **kimarad az MVP-ből** | A 118 tétel besorolása hetekre elakasztotta volna a projektet |
| D15 | Sávos árú tétel jelölése `*` + lábjegyzet | Jogi védelem: a sávos ár fix számként nyomtatva kötelező érvényű ajánlattá válna |
| D16 | Minden nem-null Excel sor importálódik | A takarítás az adminban történik, nem az importban |
| D17 | Tétel inaktiválható, de nem törölhető | Az `id` soha nem használható újra — a régi tervek értelmezhetősége múlik rajta |
| D18 | Minden JSON fájl `schemaVersion` mezővel indul | Ezek a fájlok évekig élnek a Drive-on; a 3. verziónak is olvasnia kell a mait |
| D19 | Search-only tételkereső, nincs kategória böngésző | A doki fejből tudja a tételeket; a keresés ékezetfüggetlen |
| D20 | „Gyakori" tételek kézzel jelölve | Nem használati statisztikából — kiszámítható, nem ugrál a UI |

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
| A német tartalom (118 név + jogi szöveg) sosem készül el | Az MVP magyarul teljes értékű; a német kapcsoló addig rejtve marad |
| A doki lassabbnak találja az Excelnél | A tételfelvitel billentyűzetes flow-ja az első, amit tesztelni kell — a PDF előtt |
| A Drive „streamelés" módban lassú `paciensek/` fa olvasás | A Drive kliensben **Tükrözés** módot kell beállítani, nem Streamelést |
| A `Fog` mező jegyzetmezővé válik | Elfogadott: szabadszöveget is elbír, csak az esetleges későbbi automatika nem indul el |
| Windows 260 karakteres útvonalkorlát | Rövid mappanevek, tiltott karakterek szűrése — lásd `02-domain-modell.md` |
