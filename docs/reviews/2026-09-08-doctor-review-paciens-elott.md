# doctor-review — paciens-elott

Dátum: 2026-09-08
Forgatókönyv: paciens-elott — közös tervépítés a páciens (Molnár Tamás) előtt, kedvezménnyel, hazavihető papírral
User-teszt készültség: javítás után mehet (1 blokkoló, 1 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 6, 8 (kedvezmény), 14, 16 részben
Megállapítások lencsénként: István 5 / vizuális 1 / rontás 1 / a11y 1
Bizonyosság-eloszlás: megfigyelt 7 / erős következtetés 1 / feltételezés 0
Képernyőképek: docs/reviews/screens/2026-09-08-paciens-elott (26 kép: 22 a persona bejárásából, 4 a fő ügynök rontás-próbájából, `.gitignore`-olt)

## 1. Napi munkamenet összefoglalója

István egyedül játszotta el a helyzetet (a „páciens" fiktív volt): megkereste Molnár Tamást, elindított neki egy új tervet, felvitt egy gyökértömést (46), egy 10%-kal kedvezményes fémkerámia koronát (46) és egy esztétikus tömést (47), megnézte az Előnézetet, bepipálta a „Csak ajánlat" opciót (mert Tamás csak gondolkodni akar, nem ír alá), és letöltötte a papírt. A célt elérte, minden lépés két próbálkozáson belül sikerült.

Záró bekezdés a naplóból, szó szerint:

> „Végső gondolat: vajon holnap egyedül, segítség nélkül el tudnám-e ezt végezni? Nagyrészt igen — a páciens keresése, a tétel felvétele, a fogszám és ár beírása, az Előnézet megnyitása és a letöltés mind logikus és követhető volt, két próbálkozáson belül mindent megtaláltam. Amiben bizonytalan maradnék: (1) a „Mentsem a páciens adatlapjára is?" dialógus, mert nem értettem, miért nincs adatlapja egy olyan páciensnek, akinek már volt korábbi terve — ezt legközelebb is találgatással nyomnám át; (2) a kedvezmény beállítása, mert nincs kész "kedvezmény %" mező, nekem kell fejben vagy géppel kiszámolnom az árat — ez két páciens között hibalehetőség, könnyen elszámolhatom magam sietségben; (3) a "Garancia szövege nincs kitöltve" figyelmeztetés jelentését nem tudom megítélni orvosszakmai/jogi szempontból, ez validálandó kérdés a fejlesztő vagy a rendelő vezetése felé, nem én döntenék róla félve, hogy elrontok valamit a szerződéses dokumentumon. Külön aggodalmam maradt a kezdőlap és a Páciensek lista azonnali, szűrés nélküli adatmegjelenítéséről (01. és 02. képernyőkép) — ez a legkomolyabb, amit ma tapasztaltam, mert ez pontosan abban a pillanatban látszik, amikor a páciens még ott ül és néz a monitorra, mielőtt bármit tehetnék ellene."

A fő ügynök ezen felül egy szisztematikus rontás-próbát is végzett (2c szakasz, István bejárása után, ugyanazon az állapoton) — ez tárta fel az itt legsúlyosabbnak minősített megállapítást (1. tétel lent), amit István egyedül dolgozva nem futtatott volna bele.

## 2. Legfontosabb megállapítások

### 1. Két nyitott fül: az egyik fülön sikeres véglegesítés csendben törli a másik fülön éppen elkezdett, még mentetlen tervet

- Súlyosság: **Blokkoló** (adatot veszít, visszajelzés nélkül)
- Gyakoriság: **ritka, de reális** — pontosan akkor lép fel, amikor a rendelőben egyszerre két böngészőfülön/gépen dolgoznak ugyanazzal a demó-tárolóval (doki + asszisztens, vagy a doki maga két fület nyitva felejt két páciens között)
- Lencse: **rontás**
- Érintett folyamat: 6, 14 (a `DraftStorage` „egy kulcs, egy példány" architektúráján át mindegyik tervre kihat)
- Bizonyosság: **megfigyelt** (magam reprodukáltam)
- Dedup: **ÚJ** — kapcsolódik a `2026-08-25-doctor-review-zsufolt-reggel.md` 1. megállapításához (közös gyökérok: a megosztott, egyetlen `piszkozat` localStorage-kulcs), de más felszíni tünet: ott az ÚJ TERV INDÍTÁSA oldalán hiányzott néhol a felülírás elleni megerősítés; itt a megerősítés helyesen megjelent és helyesen védett — a probléma egy MÁSIK, független fülön, egy sikeres véglegesítés MELLÉKHATÁSAKÉNT jelentkezik, amit semmilyen dialógus nem jelez az érintett fülön.
- Helyzet és reprodukció: 1. fül — Molnár Tamás terve folyamatban (3 tétel, `Előnézet és véglegesítés` lépés). 2. fül — `Páciensek` → Nagy Éva → „+ Új terv" → a helyesen megjelenő „Piszkozat felülírása" dialógusban „Új terv, piszkozat elvetésével" (`r01-tab2-uj-terv-nagy-eva.png`) → a 2. fül a „Terv adatai" lépésre navigál, Nagy Éva nevével előtöltve. Ezután az 1. fülön „Véglegesítés és mentés" (a 2. fül állapotát nem érinti láthatóan, `r02-tab1-utan-tab2-felulir.png`). A 2. fület frissítve (F5) a Nagy Éva-adatokkal előtöltött űrlap helyett egy **teljesen üres „Új páciens" űrlap** jelenik meg (`r04-tab2-utan-reload.png`) — a páciens-kötés és minden beírt adat nyomtalanul eltűnt, hibaüzenet vagy figyelmeztetés nélkül.
- Orvosi elvárás: ha az egyik fülön véglegesítek egy teljesen más páciens tervét, az ne tudjon hatással lenni egy másik fülön, egy másik páciensnél folyamatban lévő munkára.
- Tapasztalt probléma: a megosztott piszkozat-tárolón (`app/src/storage/DemoDraftStorage.ts` `DRAFT_KEY`, egyetlen kulcs) a véglegesítés utáni takarítás (a piszkozat törlése) nem ellenőrzi, hogy a törölt piszkozat még ugyanahhoz a munkamenethez tartozik-e — egy másik fülön időközben elindult, teljesen független piszkozatot is elvisz.
- Napi hatás: egy zsúfolt napon, amikor két munkaállomáson vagy két fülön párhuzamosan dolgoznak, egy teljesen ártatlan, sikeres véglegesítés (Molnár Tamásnál) észrevétlenül eltörölheti egy másik, éppen csak elkezdett terv (Nagy Éva) minden adatát — a doki csak akkor venné észre, amikor a páciens előtt ülve keresné a már beírtnak hitt adatokat.
- Jelenlegi kerülőút: nincs — a doki nem is tudhatja, hogy ez történt, amíg bele nem fut.
- Javasolt javítási irány: a piszkozat-rekord kapjon egy azonosítót (pl. a piszkozatba mentett `paciensId`/tervId), és a véglegesítés utáni törlés (`DemoDraftStorage` `clear`/`removeItem`) csak akkor fusson, ha a jelenleg tárolt piszkozat még ugyanahhoz a lezárt tervhez tartozik — különben hagyja érintetlenül a közben mást ott hagyó fület.
- Siker mércéje: két fülön, két különböző páciensen dolgozva, az egyik fül véglegesítése/törlése nem változtatja meg vagy törli a másik fül aktív piszkozatát; ha mégis ütközés áll fenn, a másik fül kapjon látható jelzést, ne csendben vesszen el az adat.
- Backlog: `piszkozat-masik-fulon-elveszik`

### 2. A Kezdőlap és a Páciensek lista kattintás/keresés nélkül, azonnal megmutatja más páciensek nevét, születési dátumát és telefonszámát

- Súlyosság: **Súlyos** (a doki továbbjut a feladatával, de a képernyő minden alkalommal olyan tartalmat mutat, amit páciens előtt nem szabadna)
- Gyakoriság: **minden tervnél** — ez az első és a második képernyő, amit a doki lát, mielőtt a keresett páciensre rákattintana
- Lencse: **István**
- Érintett folyamat: 6 (páciens keresése), és a forgatókönyv fő kérdése: „a képernyő páciens előtt is mutatható-e"
- Bizonyosság: **megfigyelt** (magam is reprodukáltam; kód: `app/src/pages/Home.tsx` „Legutóbbi páciensek" — utolsó 5 páciens név+születési dátum+telefon, kattintás nélkül; `app/src/pages/PaciensekPage.tsx` — üres keresőszóval az összes (jelen seeddel 23) páciens név+születés+telefon egyszerre listázva)
- Dedup: **ÚJ** (a korábbi review-k a törzsadat-eltérés jelzőjét vizsgálták hasonló képernyőkön, de a „más páciens adata simán látszik" felfedezhetőségi/adatvédelmi szöget egyik korábbi jelentés sem érintette)
- Helyzet és reprodukció: reset utáni Kezdőlap, semmilyen interakció nélkül: „Legutóbbi páciensek" — Gál Hanna, Kovács János (+36 30 123 4567), Szabó Anna (+36 20 234 5678), Horváth Péter (+49 89 123 4567), Nagy Éva (+36 20 555 1234) (`01-nyitokep.png`). A „Páciensek" fülre kattintva a teljes, 23 fős lista jelenik meg azonnal, szűrés nélkül, névvel, születési dátummal és telefonszámmal (`02-paciensek-lista.png`).
- Orvosi elvárás: amíg a keresett páciens nevét be nem gépelem, a képernyőn ne látsszon más páciens személyes adata — pont azért nyitom meg ezt a képernyőt, mert a páciens mellettem ül.
- Tapasztalt probléma: a „legutóbbi 5" és a teljes lista egyaránt alapértelmezetten, minden szűrés nélkül tárja fel más páciensek adatait.
- Napi hatás: minden olyan alkalommal, amikor a doki a páciens jelenlétében nyit Kezdőlapot vagy Páciensek listát (ami a forgatókönyv szerint a leggyakoribb belépési pont), más páciensek neve/telefonszáma/születési dátuma egy pillanatra vagy tovább látható a képernyőn — bizalmi és valószínűleg GDPR-releváns kockázat.
- Jelenlegi kerülőút: a doki gyorsan a keresőbe kezd gépelni, hogy minél előbb eltüntesse a listát — ez működik, de a kezdeti villanást nem előzi meg.
- Javasolt javítási irány: nem a doki dönti el, hogy ez a viselkedés elfogadott-e (lásd az 5. kérdezendő pontot) — ha nem az, egy lehetőség a Kezdőlap „Legutóbbi páciensek" blokkjának és/vagy a Páciensek lista kezdő nézetének elrejtése/elhomályosítása, amíg valaki nem indít rajta keresést vagy explicit interakciót.
- Siker mércéje: a doki a páciens jelenlétében megnyitva a Kezdőlapot vagy a Páciensek listát, más páciens nevét/telefonszámát nem látja addig, amíg maga nem kér rá (kereséssel vagy egy explicit „mutasd" művelettel).
- Backlog: `paciens-lista-nem-rejtheto-paciens-elott`

### 3. Nincs kedvezmény-százalék mező; a már létező „−10%" gyorsírás az Ajánlati ár mezőben semmilyen látható jelzést nem kap

- Súlyosság: **Közepes** (célba ért — a „−10%" jelvény utólag visszaigazolta a helyes eredményt —, de fejben/géppel kellett számolnia, ami sietségben hibalehetőség)
- Gyakoriság: **naponta többször** (a papíron/fejben a kedvezmény szinte mindig százalékban él, lásd a `papirrol` forgatókönyv „koronára 10% kedv." papírját)
- Lencse: **István**
- Érintett folyamat: 8 (kedvezmény)
- Bizonyosság: **megfigyelt** (95 000 Ft × 0,9 = 85 500 Ft-ot fejben számolt és gépelt be; a „−10%" jelvény utólag helyesen jelent meg, `14-korona-kedvezmenyes-ar.png`, `15-tomes-kereses.png`)
- Dedup: **ISMÉT** (`2026-09-05-doctor-review-papirrol.md`, 4. megállapítás — ugyanez a probléma, ugyanígy Közepes súlyossággal. Azóta VOLT egy célzott javítási kísérlet: `952acf2 soronkenti-szazalek-kedvezmeny` — az Ajánlati ár mezőbe ma már beírható „−10%"/„+10%"/„10%" is, és a mező automatikusan az abszolút árat számolja ki belőle (`app/src/pages/planEditor/LineRow.tsx` `szazalekosAr`). A jelenség a javítás UTÁN is fennáll, mert a képességnek nincs semmilyen látható jele a mezőn — sem placeholder, sem tooltip, sem felirat —, így István, aki nem tudja előre, hogy ez létezik, nem talált rá, és a régi, fejben számolós utat választotta.)
- Helyzet és reprodukció: `Kezelések` lépés, a Fémkerámia korona sorának Ajánlati ár mezője — sima szám mezőnek néz ki (`13-korona-hozzaadva.png`), a doki `95000` helyett `85500`-at gépelt be kézzel, ahelyett hogy `-10%`-ot írt volna be.
- Orvosi elvárás: ha a papíron „10% kedv." áll, ugyanezt akarom beírni a programba is, számolás nélkül.
- Tapasztalt probléma: a képesség létezik, de semmi nem jelzi a mező mellett vagy a mezőben, hogy elfogadja a százalékos jelölést.
- Napi hatás: a doki tovább fejben számol, amivel visszahozza pont azt a hibalehetőséget (elszámolás sietségben), amit a funkció megszüntetni hivatott.
- Jelenlegi kerülőút: fejben vagy géppel kiszámolt abszolút ár kézi beírása — működik, csak lassabb és hibára hajlamosabb.
- Javasolt javítási irány: egy rövid, halvány placeholder vagy segédszöveg az Ajánlati ár mező mellett/alatt (pl. „…vagy −10%"), hogy a képesség első használat előtt is felfedezhető legyen.
- Siker mércéje: egy első alkalommal használó doki a papíron szereplő „10% kedv." szöveget minden fejszámolás nélkül, közvetlenül be tudja gépelni az Ajánlati ár mezőbe.
- Backlog: `kedvezmeny-szazalek-gyorsiras-nem-felfedezheto` (chore/UX — a `952acf2` már megoldotta a számítást, csak a felfedezhetőség hiányzik)

### 4. „Mentsem a páciens adatlapjára is?" — zavaró és duplán jelzett figyelmeztetés egy már korábbi tervekkel rendelkező páciensnél

- Súlyosság: **Közepes** (bizonytalanít, de a doki mindkét gombbal helyesen tovább tud lépni)
- Gyakoriság: **hetente** (minden olyan visszatérő páciensnél előjön, akinek eddig sosem mentették el az önálló törzsadatát — a demó seedjében ez több páciensre is igaz)
- Lencse: **István** (a dialógusnál), kiegészítve **vizuális** pontosítással (az inline kártya)
- Érintett folyamat: 6, 16 részben (visszatérő páciens korábbi adatai)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: Molnár Tamásnak két korábbi verziója is van egy „Szájsebészet" tervlánchoz (`04-paciens-lap.png`), mégis, amikor az új tervnél a „Terv adatai" lépést elhagyja, felugrik: „Mentsem a páciens adatlapjára is? Ennek a páciensnek még nincs önálló adatlapja…" (`06-kezelesek-ures.png`). **Pontosítás:** ugyanez a szöveg és egy „Adatlap létrehozása a terv adataiból" gomb már INLINE, kártyaként megjelenik magán a „Terv adatai" lapon is, a mezők alatt (`05-uj-terv.png`) — a doki ezt a kártyát a bejárás közben nem reagálta le, csak a lépés-elhagyáskor felugró modal verzióját. A jelenség maga (a páciensnek ténylegesen nincs „önálló adatlapja" a korábbi tervei ellenére) a kód szerint valós és szándékos megkülönböztetés (`app/src/pages/patientPage/TorzsadatSyncCard.tsx`): egy tervben szereplő páciensadat pillanatkép, a „páciens adatlapja" (törzsadat) egy külön, opcionális, csak explicit művelettel létrehozható rekord — a kettő nincs automatikusan összekötve.
- Orvosi elvárás: ha valakinek már volt terve nálunk, feltételezem, hogy van róla „karton" is — nem értem, miért kérdezi ezt most.
- Tapasztalt probléma: (a) a fogalom („önálló adatlapja") laikus nyelven nem magyarázza meg, mi a különbség egy terv és egy „adatlap" között; (b) ugyanaz a figyelmeztetés két helyen, két formában (inline kártya, majd modal) jelentkezik, ami arra utal, hogy az elsőt könnyű átlátni/kihagyni anélkül, hogy a doki tudatosan döntött volna.
- Napi hatás: bizonytalanságot okoz egy olyan pillanatban, amikor a doki a páciens előtt ülve nem szeretne kockáztatni egy félreértett gombnyomást.
- Jelenlegi kerülőút: „Kihagyás, tovább lépek" — biztonságos, semmit nem ír felül, de a doki find magyarázat nélkül dönt.
- Javasolt javítási irány: a szöveg magyarázza el egy tagmondattal a különbséget (pl. „…a korábbi terveid a sajátjukban tárolják az akkori adatokat; egy külön, folyamatosan frissülő adatlapod még nincs"), és/vagy az inline kártya vizuálisan hangsúlyosabb legyen, hogy a modal ne érjen váratlanul.
- Siker mércéje: a doki a dialógus szövegéből — a Terv adatai lap inline kártyájának elolvasása nélkül is — meg tudja mondani, mi a különbség aközött, hogy „létrehozza az adatlapot" vagy „kihagyja".
- Backlog: `paciens-adatlap-fogalom-magyarazat`

### 5. A tervazonosító kód (pl. „irvbvj") felirat nélkül jelenik meg a kinyomtatott/letöltött, páciensnek szánt dokumentumon és a fájlnévben

- Súlyosság: **Közepes** (nem hibás tartalom, de egy formális, aláírásra/hazavitelre szánt dokumentumon egy magyarázat nélküli kód áll a páciens neve mellett)
- Gyakoriság: **minden tervnél** (a fejlécben és a láblécben is szerepel minden nyomtatványon, `app/src/pdf/tervDocument/Chrome.tsx` `MainHeader`/`Footer`)
- Lencse: **István**
- Érintett folyamat: 14 (letöltés)
- Bizonyosság: **megfigyelt** (a PDF fejlécében: „irvbvj · v1 · 2026.09.08." a cím alatt, `18-elonezet.png`; a letöltött fájl neve: „PISZKOZAT-kezelesi-terv-Molnár-Tamás-irvbvj-ajanlat.pdf", `22-letoltes-utan.png`)
- Dedup: **ÚJ**
- Helyzet és reprodukció: lásd fent. Kód szerint (`app/src/storage/paths.ts` `generateId`) ez egy stabil, 6 karakteres, véletlen tervazonosító, ami egyúttal a terv mappanevének is része lesz a jövőbeli fájlrendszeres tárolásnál (`app/src/storage/CLAUDE.md`) — tehát tudatos, következetes tervezői döntés, nem hiba, csak a doki (és a páciens) számára magyarázat nélküli.
- Orvosi elvárás: a papíron, amit a páciens hazavisz, ne legyen olyan felirat, aminek a jelentését én magam sem tudom megmondani, ha megkérdezi.
- Tapasztalt probléma: a kód sem a fejlécben, sem a fájlnévben nincs felirattal ellátva (pl. „Iktatószám:" vagy „Ügyszám:"), így értelmezhetetlen karaktersorozatnak hat.
- Napi hatás: kis eséllyel a páciens rákérdez, mit jelent ez, és a doki nem tudja megmondani.
- Jelenlegi kerülőút: nincs — a doki nem tudja kikapcsolni vagy elmagyarázni.
- Javasolt javítási irány: egy rövid, egy-két szavas felirat a kód elé (pl. „Terv: irvbvj" vagy „Azonosító: irvbvj") mind a fejlécben, mind a fájlnévben — a kód maga (a fájlrendszeres megfeleltethetőség miatt) maradhat.
- Siker mércéje: a páciensnek átadott papíron minden felirat magyarázat nélkül is értelmezhető annak, aki nem ismeri az app belső működését.
- Backlog: `tervid-kod-felirat-nyomtatvanyon`

### 6. Konzol: „A form field element should have an id or name attribute" (3 előfordulás)

- Súlyosság: **Kis**
- Gyakoriság: n/a (technikai jelzés, a képernyőn nem látszott hatása)
- Lencse: **a11y** („csak a fában láttam" — a persona explicit így jelölte, nem a saját tapasztalata)
- Bizonyosság: **megfigyelt** (az üzenet ténye), az eredetre nézve **erős következtetés**: az app saját űrlapmezőire ezt egy korábbi, célzott javítás (`f2f652b urlap-mezo-id-name: Minden űrlapmezőnek id/name`) már lefedte; a jelenlegi 3 találat valószínűleg a beágyazott, natív Chrome PDF-nézegető (`chrome-extension://…/index.html`, „Page number"/„Zoom level" mezők) saját, az app kódjától független markupjából jön — ez nem javítható az app oldaláról.
- Dedup: **ÚJ**
- Helyzet és reprodukció: `list_console_messages` a menet végén, a Kezelések/Előnézet lépések után.
- Orvosi elvárás: n/a — ez nem István tapasztalata.
- Javasolt javítási irány: nincs javasolt lépés, amíg meg nem erősíthető, hogy valóban a natív PDF-nézegetőből jön, nem az app saját mezőiből — egy következő `keyboard-a11y` vagy `visual-css` menetben érdemes DOM-szinten (nem konzol-szinten) azonosítani a 3 mezőt.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- **A „≈" (Becsült ár) ikon-gomb** a sor Ajánlati ár mezője alatt — István látta, de nem értette, mire való, és nem használta („nem tudom pontosan mit jelent, majd megnézem", de a bejárás során végül nem nyúlt hozzá). Ez egy tudatosan vállalt, dokumentált kompromisszum (`app/src/CLAUDE.md`: „a `≈` szövegglyph" nevesített kivétele az ikon-only szabály alól) — nem hiba, de ezen a menetsoron végül **nem fedezte fel**, 0 próbálkozásból.
- **A „Kategória: X" fejléc a kereső találati listájában** — amikor a doki a kategórianévvel (a „gyökérkezelés" szóval, ami maga nem tétel, csak kategórianév) keresett, a program helyesen, a kategórián belüli tételekkel válaszolt, jól látható „Kategória: Gyökérkezelés" fejléccel a találatok fölött (`08-tetel-kereses-gyoker.png`, ellenőrizve vizuálisan). István a naplójában ezt zavarónak írta le, de a képen a fejléc valójában jelen van és jól olvasható — ez tehát egy **működő, csak a doki által tudatosan nem regisztrált** funkció, nem hiányzó jelzés.

## 4. Ami jól működik

- A koronára beírt egyedi ár mellett a rendszer automatikusan felismerte és kiírta a „−10%" jelvényt, pontosan a doki fejben számolt kedvezményének megfelelően (`15-tomes-kereses.png`) — ez megerősítette a dokinak, hogy jól számolt, technikai hiba nélkül.
- A „Csak ajánlat" jelölőnégyzet bepipálásakor a PDF-előnézet azonnal, élőben 3 oldalról 2 oldalra rövidült (a nyilatkozat/aláírás oldal kimaradt) — gyors, jól érthető visszajelzés (`21-csak-ajanlat-bepipalva.png`).
- A letöltés után azonnal megjelenő „…letöltve" visszajelzés a pontos fájlnévvel — a doki egyértelműen tudta, mi történt (ez a `letoltes-visszajelzes` korábbi tétel javítását igazolja vissza működés közben).
- Az „Automatikusan mentve" felirat időbélyeggel a Kezelések lépésen megnyugtatta a dokit, hogy a munkája nem vész el explicit mentés nélkül sem (ez a `piszkozat-mentve-automatikus-szoveg` korábbi tétel javítását igazolja vissza működés közben).
- A rontás-próba során a „Piszkozat felülírása" dialógus a Nagy Éva-oldali „+ Új terv" gombon is helyesen, világos szöveggel jelent meg, amikor egy másik fülön aktív piszkozat volt — ez a védelmi minta helyesen működik ezen a belépési ponton (vö. az 1. megállapítással, ami egy MÁSIK, ez után következő lépésben talált rést ugyanebben a rendszerben).
- Gyors dupla kattintás a „Véglegesítés és mentés" gombon (rontás-próba, külön, „Rontás Teszt" nevű minimál terven) nem hozott létre duplikált verziót — csak egyetlen `_v1` mappa keletkezett.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi terveket keresed, páciens nélkül?
2. Ha egy páciensnek már volt korábbi terve nálunk, de nincs róla „önálló adatlap", ez zavar-e, vagy eddig fel sem tűnt? Elvárnád-e, hogy egy régi páciensnek automatikusan legyen adatlapja?
3. A „Legutóbbi páciensek" lista és a Páciensek lista alapból, kattintás nélkül mutatja mindenki nevét és telefonszámát — ez gond-e, ha épp egy páciens ül melletted, vagy eddig nem volt vele probléma?
4. A kiadott papíron és a letöltött fájl nevében van egy rövid, betű-szám kód (pl. „irvbvj") — feltűnt-e már ez neked vagy egy páciensnek, és zavaró-e, vagy egyáltalán nem tűnik fel?
5. A „Garancia szövege nincs kitöltve" figyelmeztetés minden tervnél megjelenik — ez egy egyszeri, Beállításokban elvégzendő adminisztratív teendő nálatok, vagy tudatosan tervenként/kezelésenként változna a garanciaszöveg?

## 6. Nem ellenőrizhető

- A PDF iframe belső, pontos szöveg-/pixeltartalma (a kedvezmény tényleges hiánya a nyomtatott dokumentumon) — a screenshot alapján a látható tartalom (fejléc, páciensadatok, fogtérkép) rendben volt, de a réteges szöveg-kinyerés strukturálisan nem lehetséges ezzel az eszközzel; a „kedvezmény soha nem a nyomtatványon" szabályt a meglévő automatizált teszt (`app/src/pdf/TervDocument.test.tsx`) fedi, ezt nem ismételtük meg kézzel.
- A letöltött PDF tényleges lemezre kerülése (izolált profil).
