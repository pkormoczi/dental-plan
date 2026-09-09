# doctor-review — surgos

Dátum: 2026-09-08
Forgatókönyv: surgos — új páciensnek, három perc alatt, aláírás nélküli írásos ár két tömésre és egy fogkőre
User-teszt készültség: javítás után mehet (1 blokkoló, 1 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 2 (új páciens gyorsan), 6, 15 („csak ajánlat"), 14 (előnézet, letöltés)
Megállapítások lencsénként: István 5 / vizuális 0 / rontás 2 / a11y 1
Bizonyosség-eloszlás: megfigyelt 6 / erős következtetés 2 / feltételezés 0
Képernyőképek: docs/reviews/screens/2026-09-08-surgos (21 kép: 20 a persona bejárásából, 1 a fő ügynök rontás-próbájából, `.gitignore`-olt)

## 1. Napi munkamenet összefoglalója

István egyedül, a recepción várakozó (fiktív) Fekete Márton nevében játszotta el a helyzetet: felvette Mártont új páciensként, felvitt két esztétikus tömést (14-es és 15-ös fog) és egy komplett fogkőeltávolítást, megnézte az Előnézetet, bepipálta a „Csak ajánlat" opciót, majd — tudatosan NEM véglegesítve a tervet, mert Márton nem ír alá semmit — letöltötte a papírt. A célt elérte, minden fő lépés elsőre sikerült; a becsült 15 műveletnél kicsit többre (kb. 18-ra) volt szüksége, mert a második tömés felvételéhez újra kellett indítania a tételkeresést.

Záró bekezdés a naplóból, szó szerint:

> „Holnap egyedül, segítség nélkül el tudnám-e végezni ugyanezt? Igen, alapvetően igen — a fő útvonal (Új páciens → Kezelések keresése → fog beírása → Előnézet → Csak ajánlat → Letöltés) magától értetődő volt, minden lépésnél kaptam valamilyen visszajelzést (»felvéve«, »Automatikusan mentve«, összeg azonnali frissülése, »letöltve« a fájlnévvel). Amiben bizonytalan maradnék: (1) nem tudom biztosan, mi történne, ha egy fog-mezőbe két fogszámot írnék be vesszővel — ezt inkább elkerülném a jövőben is, és mindig külön sort vennék fel, ami plusz keresést jelent minden alkalommal; (2) nem lennék biztos abban, hogy a »Csak ajánlat« mellett miért marad bent a Fizetési feltételek szöveg — ha egy páciens rutinból megkérdezné, miért van ott ez, ha nem ír alá semmit, nem tudnám neki gyorsan megmagyarázni; (3) a terv automatikus címe (»Tömések«) miatt papíron nem látszik azonnal, hogy fogkő is szerepel benne — ezt csak a táblázat elolvasásával venném észre, ami két beteg között könnyen elsiklik."

A fő ügynök ezen felül egy szisztematikus rontás-próbát is végzett (2c szakasz), ami — ugyanúgy, mint a `paciens-elott` menetben — ismét reprodukálta a legsúlyosabbnak minősített, két-fülön-jelentkező adatvesztést; ez tehát nem egyszeri, hanem a `DraftStorage` architektúra általánosan fennálló, forgatókönyv-független kockázata.

## 2. Legfontosabb megállapítások

### 1. Két nyitott fül: az egyik fülön sikeres véglegesítés csendben törli a másik fülön éppen elkezdett, még mentetlen tervet

- Súlyosság: **Blokkoló** (adatot veszít, visszajelzés nélkül)
- Gyakoriság: **ritka, de reális**
- Lencse: **rontás**
- Érintett folyamat: 6, 14
- Bizonyosság: **megfigyelt** (másodszor is reprodukáltam, most Fekete Márton [1. fül, véglegesítve] és Kiss Márta [2. fül, frissen indított új terv] szereplőkkel)
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 1. megállapítás — azóta nem volt a `DemoDraftStorage`-t érintő commit, a jelenség változatlan)
- Helyzet és reprodukció: 1. fül — Fekete Márton terve (3 tétel, Előnézet lépés). 2. fül — `Páciensek` → Kiss Márta → „+ Új terv" → helyesen megjelenő „Piszkozat felülírása" dialógus → „Új terv, piszkozat elvetésével" → a 2. fül a „Terv adatai" lépésre navigál, Kiss Márta nevével előtöltve. Ezután az 1. fülön „Véglegesítés és mentés". A 2. fület frissítve (F5) egy **teljesen üres „Új páciens" űrlap** jelenik meg (`r01-tab2-utan-tab1-veglegesites.png`) — Kiss Márta neve és minden adata eltűnt.
- Orvosi elvárás, Tapasztalt probléma, Napi hatás, Jelenlegi kerülőút, Javasolt javítási irány, Siker mércéje: lásd a `2026-09-08-doctor-review-paciens-elott.md` 1. megállapítását — a jelenség és a gyökérok azonos, csak a szereplők mások.
- Backlog: `piszkozat-masik-fulon-elveszik` (a korábbi jelentésben javasolt slug, még nincs tételfájl)
- Döntés: javítva ket-ful-piszkozat-utolso-iro-nyer, ellenőrizte review:2026-09-09-doctor-review-elso-megnyitas (2026-09-09)

### 2. Más páciensek neve, adatai és aktivitása kattintás/keresés nélkül látszik — most egy HARMADIK felületen is

- Súlyosság: **Súlyos**
- Gyakoriság: **minden tervnél**
- Lencse: **István** (megélte, ha csak nem is reflektált rá szóban ezúttal), megerősítve **rontás** lencsével (a fő ügynök újra megnyitva a Páciensek listát)
- Érintett folyamat: 2 (új páciens gyorsan), 6
- Bizonyosság: **megfigyelt**
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 2. megállapítás), **bővítve**: a korábbi jelentés a Kezdőlap „Legutóbbi páciensek" és a Páciensek lista két felületét dokumentálta; ez a menet egy HARMADIK felületet is megtalált: az „Új terv indítása" képernyő „Meglévő páciens keresése" panelje az „+ Új páciens" dialógus MÖGÖTT, keresés nélkül, egy hosszú, görgethető AKTIVITÁS-listát mutat legalább 14 páciensről, névvel ÉS az utolsó műveletükkel („Terv véglegesítve", „Páciens létrehozva", „Adatlap mentve", időbélyeggel) — ez több információt fed fel, mint a másik két felület (`04-enter-utan.png`, a dialógus mögött látszó lista).
- Orvosi elvárás, Tapasztalt probléma, Napi hatás, Jelenlegi kerülőút, Javasolt javítási irány, Siker mércéje: lásd a korábbi jelentés 2. megállapítását; a javítási iránynak erre a harmadik felületre is ki kell terjednie.
- Backlog: `paciens-lista-nem-rejtheto-paciens-elott` (a korábbi jelentésben javasolt slug, még nincs tételfájl)
- Döntés: duplikátum → review:2026-09-08-doctor-review-paciens-elott#2 (2026-09-09)

### 3. Nincs gyors mód ugyanazt a kezelést egy másik fogra felvenni — minden ismétlésnél új keresés kell

- Súlyosság: **Közepes** (lassít, de célba ér)
- Gyakoriság: **naponta többször** (két azonos kezelés más fogon — mint két tömés — rendelői rutin)
- Lencse: **István**
- Érintett folyamat: 6 — és kifejezetten a forgatókönyv „minimális kattintás-út" mércéje
- Bizonyosság: **megfigyelt** (a második „Esztétikus tömés 1 felszín" felvételéhez újra be kellett gépelnie a „tömés" szót a keresőbe; kód szerint nincs „sor másolása/duplikálása" funkció a `LineRow.tsx`-ben)
- Dedup: **ÚJ**
- Helyzet és reprodukció: `Kezelések` lépés — az első tömés-sor felvétele után a második, azonos tömés felvételéhez a doki a „Tétel keresése" mezőbe újra begépelte a „tömés" szót és újra kiválasztotta ugyanazt a listaelemet (`07-tomes-kereses.png`, `11-masodik-tomes.png`).
- Orvosi elvárás: ha egy kezelést két fogra is fel akarok írni, ne kelljen kétszer megkeresnem — csak a fogszámot akarom váltani.
- Tapasztalt probléma: a keresőmező minden új sorhoz kiürül, nincs „ugyanez még egyszer" parancsikon.
- Napi hatás: a becsült 15 művelet helyett kb. 18-ra volt szükség, pont emiatt a plusz keresés miatt — időveszteség egy olyan helyzetben, ahol a forgatókönyv szerint pont az idő számít (három perc).
- Jelenlegi kerülőút: újra gépelni a keresőszót minden ismétlődő tételnél — működik, csak lassabb.
- Javasolt javítási irány: egy „Sor másolása" gyorsgomb az adott sor „…" menüjében, ami egy új, azonos tételű sort hoz létre üres Fog mezővel, azonnal arra fókuszálva.
- Siker mércéje: két azonos kezelés felvétele (más fogon) egy keresésből, plusz egy kattintásból/Fog-beírásból megoldható.
- Backlog: `sor-masolasa-ismetelt-tetelhez`

### 4. A terv automatikusan generált címe csak a legnagyobb összegű kategóriát tükrözi — más, kisebb összegű kezelések (itt: a fogkő) kimaradnak a címből

- Súlyosság: **Közepes** (a táblázat maga helyes és teljes, de a cím önmagában félrevezető képet ad)
- Gyakoriság: **minden olyan tervnél, ahol több, különböző kategóriájú kezelés van**
- Lencse: **István**
- Érintett folyamat: 14 (előnézet, letöltés)
- Bizonyosság: **erős következtetés** (a doki maga nem tesztelte a szabályt közvetlenül, de a „Terv adatai" lapon expliciten olvasható szöveg — „Üresen a legnagyobb összegű kategória neve lesz a cím" — és a végleges PDF fejléce, ahol a cím „Tömések" lett annak ellenére, hogy egy komplett fogkőeltávolítás is szerepel a tervben, egyértelműen alátámasztja: `05-paciens-felveve.png`, `17-pdf-fejlec-fogterkep.png`)
- Dedup: **ÚJ**
- Helyzet és reprodukció: a terv 3 tételt tartalmaz (2× Esztétikus tömés, 1× Fogkőeltávolítás komplett); a tömések összege (68 000 Ft) nagyobb, mint a fogkőé (24 000 Ft), ezért a PDF fejlécében és a dokumentum-listákban a terv címe egyszerűen „Tömések" — a fogkő szó sehol nem jelenik meg a címben.
- Orvosi elvárás: ha egy gyors áttekintésre (pl. egy lista soraként) csak a címet nézem, tudjam, mi mindenről van szó a tervben, vagy legalább lássam, hogy több van, mint amit a cím sejtet.
- Tapasztalt probléma: a cím kizárólag a legnagyobb összegű kategóriát nevezi meg, más kategóriák jelenlétéről semmit nem közöl.
- Napi hatás: két beteg között, egy tervlistát futtában átfutva a doki tévesen azt hiheti, egy adott tervben csak egyfajta kezelés van.
- Jelenlegi kerülőút: kézzel beírt, összetettebb cím a „Terv címe" mezőbe — ez működik, de a doki alapból nem tudja, hogy szükség lenne rá, amíg a PDF-et meg nem nézi.
- Javasolt javítási irány: nem egyértelmű, hogy ez javítandó-e (lásd az 2. kérdezendő pontot) — ha igen, egy lehetőség: több kategória esetén „X és más kezelések" formátumú alapértelmezett cím.
- Siker mércéje: a doki a terv címéből tudja, hogy egynél több FÉLE kezelés szerepel a tervben, anélkül hogy a táblázatot végig kellene olvasnia.
- Backlog: `terv-cim-tobb-kategoria-jelzese`

### 5. A tervazonosító kód (pl. „g8e5zz") felirat nélkül jelenik meg a kinyomtatott dokumentumon és a fájlnévben

- Súlyosság: **Közepes**
- Gyakoriság: **minden tervnél**
- Lencse: **István**
- Érintett folyamat: 14 (letöltés)
- Bizonyosság: **megfigyelt** (PDF fejléc: „g8e5zz · v1 · 2026.09.08.", `17-pdf-fejlec-fogterkep.png`; fájlnév: „PISZKOZAT-kezelesi-terv-Fekete-Márton-g8e5zz-ajanlat.pdf", `20-letoltve-visszajelzes.png`)
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 5. megállapítás — ugyanaz a jelenség, más terv-azonosítóval; nincs javítási kísérlet azóta)
- Helyzet, orvosi elvárás, javasolt irány stb.: lásd a korábbi jelentés 5. megállapítását.
- Backlog: `tervid-kod-felirat-nyomtatvanyon` (a korábbi jelentésben javasolt slug, még nincs tételfájl)

### 6. Az Új páciens dialógusban az Enter a Névmezőből csak a következő mezőre visz, vizuális jelzés nélkül arról, hogy ez történt

- Súlyosság: **Kis** (semmi nem veszett el, a doki egy pillanat alatt alkalmazkodott)
- Gyakoriság: **naponta többször** (minden gyors új páciens felvételnél előfordulhat)
- Lencse: **István**
- Érintett folyamat: 2 (új páciens gyorsan)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ** — **Pontosítás:** ez pontosan a mai napon, EBBEN a menetben szándékosan bevezetett viselkedés (`65009c6 uj-paciens-enter-mentes`, 2026-09-08 16:27): a commit üzenete szerint kifejezetten az volt a cél, hogy a Névmezőből azonnal mentő Enter (a korábbi, meglepetést okozó viselkedés) megszűnjön, és helyette egy Tab-szerű mezőről-mezőre láncolás + egy második, már a Mentés gombon leadott Enter mentsen. István megfigyelése tehát a tervezett viselkedést írja le, nem hibát — a jelentésbe csak azért kerül, mert a lánc közben (mielőtt a fókusz a gombra érne) semmilyen vizuális jel nem különbözteti meg „ez most csak tovább lépett" és „ez most mentett" között.
- Helyzet és reprodukció: „Új páciens" dialógus, Név mezőbe „Fekete Márton" beírása után Enter — a fókusz a Született dátummezőre ugrik, semmi más nem változik a képernyőn (`04-enter-utan.png`).
- Orvosi elvárás: ha nyomok egy Entert, tudjam, hogy csak léptem vagy már mentettem is.
- Tapasztalt probléma: a mezőről mezőre lépés néma — csak a fókuszgyűrű helyéből lehet rájönni.
- Napi hatás: elhanyagolható — legfeljebb egy röpke bizonytalanság, amíg a doki rájön, hogy még nem mentett.
- Jelenlegi kerülőút: a Mentés gombra kattintás kézzel — ezt István magától is megtette.
- Javasolt javítási irány: nincs önálló javaslat — ez egy ma meghozott, dokumentált tervezői döntés, aminek pontosan ez (a szándékos nem-azonnali mentés) volt a célja.
- Siker mércéje: n/a — validálandó inkább, hogy ez a néma lépés-visszajelzés elfogadható-e (lásd a kérdezendő szakaszt).

### 7. Konzol: „A form field element should have an id or name attribute" (3 előfordulás)

- Súlyosság: **Kis**
- Gyakoriság: n/a
- Lencse: **a11y**
- Bizonyosság: **megfigyelt** (az üzenet ténye), az eredetre nézve **erős következtetés** (feltehetően a beágyazott natív Chrome PDF-nézegetőből jön, nem az app saját mezőiből — lásd a korábbi jelentés azonos megállapítását)
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 6. megállapítás — szó szerint ugyanaz a konzolüzenet)

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- **A Fog mezőbe írt több fogszám automatikusan frissíti a Db (mennyiség) mezőt is** (`domain/mennyiseg.ts` `kovetettMennyiseg` — amíg a Db mezőt kézzel át nem írja a doki, a fogak száma és a mennyiség szinkronban marad, tehát „14, 15" beírása egyetlen sorba helyesen Db=2-t és a duplázott összeget adta volna). István ezt **nem próbálta ki** — tudatosan elkerülte a kockázatot, mert semmi a felületen nem biztosította előre, hogy ez helyesen viselkedne, és inkább egy plusz keresést (lásd a 3. megállapítást) választott helyette. **0 próbálkozásból nem fedezte fel**, hogy ez a funkció létezik és jól működne.

## 4. Ami jól működik

- Az „+ Új páciens" dialógus utáni „Fekete Márton felvéve" zöld visszaigazolás pontosan azt a friss, mai fejlesztést (`65009c6`) igazolja vissza működés közben, amit szán — a doki egyértelműen tudta, hogy sikerült a felvétel.
- A tétel felvétele után a fókusz azonnal a Fog mezőre ugrott mindkét tömésnél — nem kellett külön rákattintania.
- A „Fázis összesen" és a „Mindösszesen" minden tételnél azonnal, élőben frissült — a doki fejben tudta ellenőrizni az összeget (34+34+24=92 000 Ft, stimmelt).
- A „Csak ajánlat" checkbox bepipálásakor a PDF-előnézet azonnal, élőben 3 oldalról 2 oldalra rövidült.
- A letöltés utáni „…letöltve" visszajelzés a pontos fájlnévvel — a doki magabiztosan tudta, mi történt.
- A sárga (csak jelzés) és a — itt elő nem forduló — piros (blokkoló) figyelmeztetések vizuálisan elkülönülnek, és egy magyarázó mondat is kíséri őket („Piros: amíg fennáll... Sárga és szürke: csak jelzés...") — a doki nem félt tévesen attól, hogy a hiányzó Garancia-szöveg blokkolná a letöltést.
- A fogtérkép a PDF-en pontosan a 14-es és 15-ös fogat emelte ki zölddel, a tömések kategóriaszínével — a doki ezt kifejezetten hasznosnak találta.
- A rontás-próba szerint a „Letöltés" gombon végzett gyors dupla kattintás nem okozott problémát vagy duplikált letöltést.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi terveket keresed, páciens nélkül?
2. A „Csak ajánlat" dokumentumon a Fizetési feltételek szövege bent marad, csak a nyilatkozat+aláírás oldal marad ki — ha egy páciens, aki nem ír alá semmit, rákérdez, miért van ott ez a szöveg, mit mondanál neki? Kell-e ez egyáltalán egy alá nem írt papírra?
3. A terv automatikus címe (pl. „Tömések") csak a legnagyobb összegű kategóriát nevezi meg — zavart okozott-e már ez nálad, vagy eddig mindig kézzel írtad át a címet, ha több félét is tartalmazott a terv?
4. Ér-e annyit egy „ugyanez a tétel másik fogra" gyorsgomb, hogy megérje, vagy a mostani, tételenkénti újra-keresés elég ritka helyzet ahhoz, hogy ne foglalkozzunk vele?
5. Az „Új páciens" dialógusban az Enter most mezőről mezőre visz, és csak a Mentés gombon ment — ez így természetes neked, vagy inkább azt várnád, hogy egy Enter a Névnél már mentsen?

## 6. Nem ellenőrizhető

- A letöltött PDF tényleges lemezre kerülése (izolált profil).
- A PDF 2. oldalának (Fizetési feltételek) pontos szövege — csak a bélyegkép-szintű megjelenést ellenőriztük, a réteges szöveg-kinyerés strukturálisan nem lehetséges.
