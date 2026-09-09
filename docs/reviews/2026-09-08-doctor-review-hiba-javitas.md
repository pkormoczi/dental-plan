# doctor-review — hiba-javitas

Dátum: 2026-09-08
Forgatókönyv: hiba-javitas — páciens-összekeverés és elavult ár utólagos rendbetétele egy már kiadott, véglegesített tervnél
User-teszt készültség: javítás után mehet (1 blokkoló, 3 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 14 (kiadás), 17 (módosítás egy már kiadott tervnél), 9 (javítás), 16
Megállapítások lencsénként: István 6 / vizuális 0 / rontás 1 / a11y 0
Bizonyosség-eloszlás: megfigyelt 5 / erős következtetés 2 / feltételezés 0
Képernyőképek: docs/reviews/screens/2026-09-08-hiba-javitas (36 kép, mind a persona bejárásából, `.gitignore`-olt)

## 1. Napi munkamenet összefoglalója

István egyedül játszotta el a helyzetet: felvette Varga Zsófia (valójában már ismert, a listából választott) tervét egy fémkerámia koronára (26-os fog, 95 000 Ft), véglegesítette és letöltötte — így hitelesen jött létre a hibás, kiadott állapot. Ezután az asszisztens (fiktív) bejelentése után kétfelé kellett dolgoznia: (1) a helyes tervet felvinni Farkas Katalinnak, a listaárnál 20 000 Ft-tal magasabb, kézzel felülírt árral, és (2) valamit kezdeni a Varga Zsófia nevére tévesen kiadott, már véglegesített papírral. Az elsőt gördülékenyen megoldotta. A másodikhoz két zsákutcába futott (lásd lent), mielőtt egy saját ötlettel — a terv címének átírásával egy figyelmeztető szövegre — rendezte a helyzetet. A feladatot végül befejezte, mindkét páciensnek helyes, letöltött PDF-je lett, és a hibás terv is láthatóan meg lett jelölve, bár nem hivatalos, erre szánt funkcióval.

Egy módszertani megjegyzés a persona saját bevallásából: egy lépésnél a böngésző címsorába közvetlenül URL-t írt be a gyorsaság kedvéért — ezt saját maga jelezte eltérésként a szerepétől (István ezt valójában sosem tenné), ezért az az egy lépés nem számít hiteles UX-megfigyelésnek, a jelentésbe nem került be külön tételként.

Záró bekezdés a naplóból, szó szerint:

> „Vissza tudnám-e ezt holnap egyedül csinálni, segítség nélkül? Részben. Az alap munkafolyamatot (páciens keresése, tétel felvétele, fog megadása, ár felülírása, véglegesítés, letöltés) most már magabiztosan megismételném, mert a visszajelzések (összesítő frissülés, »+20 000 Ft eltérés«, letöltési fájlnév) végig egyértelműek voltak. De a hibajavítás nehezebb felét — amikor páciens-összekeverés történt egy már kiadott papírnál — nem oldanám meg magamtól ilyen jól: elsőre biztos újra belefutnék a »Másolás új tervbe« zsákutcájába, mert semmi nem figyelmeztet előre, hogy az nem old meg páciensváltást, csak akkor derül ki, ha már beírtam a nevet. És a »téves kiadás« címke-trükköt sem találnám ki magamtól magabiztosan — az én ötletem volt, egy kapkodó, informatikától távol álló kollégám valószínűleg csak tanácstalanul otthagyná a hibás tervet érintetlenül, vagy telefonálna segítségért, ahogy én is tenném, ha ez éles helyzet lenne, nem gyakorlás."

## 2. Legfontosabb megállapítások

### 1. Két nyitott fül: az egyik fülön sikeres véglegesítés csendben törli a másik fülön éppen elkezdett, még mentetlen tervet

- Súlyosság: **Blokkoló** (adatot veszít, visszajelzés nélkül)
- Gyakoriság: **ritka, de reális**
- Lencse: **rontás**
- Érintett folyamat: 14, 17
- Bizonyosság: **erős következtetés** ebben a menetben — ezúttal csak a védőháló felugrását ellenőriztük ismét (a „Piszkozat felülírása" dialógus helyesen megjelent, amikor Kovács János oldaláról „+ Új terv"-et indítottunk egy aktív Varga Zsófia-piszkozat mellett); a teljes adatvesztési láncot (két fül, egyik fülön véglegesítés, másik fülön reload → üres űrlap) ebben a menetben nem futtattuk újra végig — az a `2026-09-08-doctor-review-paciens-elott.md` és a `2026-09-08-doctor-review-surgos.md` jelentésekben **megfigyelt**, kétszer, két különböző páciens-párossal
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 1. megállapítás — azóta nem volt a `DemoDraftStorage`-t érintő commit)
- Helyzet, orvosi elvárás, javasolt irány stb.: lásd a korábbi jelentés 1. megállapítását.
- Backlog: `piszkozat-masik-fulon-elveszik` (a korábbi jelentésben javasolt slug, még nincs tételfájl)
- Döntés: javítva ket-ful-piszkozat-utolso-iro-nyer, ellenőrizte review:2026-09-09-doctor-review-elso-megnyitas (2026-09-09)

### 2. A „Másolás új tervbe" nem alkalmas páciensváltásra, és a hibaüzenet nem irányít a helyes megoldáshoz

- Súlyosság: **Súlyos** (végül talált kerülőutat, de csak két elpazarolt lépés és önálló felfedezés árán)
- Gyakoriság: **ritka, de reális** — pontosan akkor lép fel, amikor páciens-összekeverés történt, mint ma
- Lencse: **István**
- Érintett folyamat: 9 (javítás), 17
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ** — de szorosan kapcsolódik a `2026-09-01-doctor-review-visszatero-paciens.md` 1. megállapításához (**Kritikus**, GDPR-kockázatú páciens-identitás keveredés ugyanennél a „Másolás új tervbe" funkciónál). **Fontos, pozitív fejlemény:** az akkori Kritikus hiba — hogy egy másik, létező páciens nevének beírása CSENDBEN, véglegesíthető állapotban hozott létre téves identitású dokumentumot — időközben megszűnt: a `c3573a9 94. tétel: Másolás új tervbe — páciens-identitás védőháló` commit óta a rendszer PONTOS névegyezésnél KEMÉNYEN blokkolja a véglegesítést, piros figyelmeztetéssel (lásd a 4. „Ami jól működik" pontot). A ma megfigyelt probléma egy MÁSIK, enyhébb szintű: a blokk maga jó, de a hibaüzenet nem mondja meg, mi a helyes teendő.
- Helyzet és reprodukció: Varga Zsófia véglegesített tervének „…további műveletek" menüjéből „Másolás új tervbe" (a menüben ekkor csak ez a két opció volt: „Letöltés" és „Másolás új tervbe", `16-tovabbi-muveletek-menu.png`). Az így nyitott „Terv adatai" lapon minden mező (TAJ, cím, telefon, e-mail) még Varga Zsófiáé maradt — csak a Név mező tűnt szabadon írhatónak. A Név mezőbe „Farkas Katalin"-t írva megjelent: „A beírt név egy MÁSIK, létező páciensre (Farkas Katalin) illik pontosan — a terv ettől függetlenül a fenti kötött páciensmappába mentődik. A véglegesítés blokkolva van, amíg a név nem egyezik a kötött páciens nevével." (`18-nev-atirasa.png`). Ez helyesen megakadályozta a hibás mentést, DE nem írta le, hogy a helyes teendő egy ÚJ terv indítása Farkas Katalin SAJÁT oldaláról — a doki két lépést (másolás + névátírás) pazarolt el, mire magától rájött erre.
- Orvosi elvárás: ha egy tervet egy másik, meglévő páciensnek szánok, vagy a funkció ezt megoldja, vagy azonnal, egyértelműen elmondja, melyik funkció oldja meg.
- Tapasztalt probléma: a hibaüzenet leírja, MI a baj, de nem mondja meg, MIT tegyen helyette a doki.
- Napi hatás: páciens-összekeverés — mint a mai eset — reális, időnként előforduló rendelői hiba; a javítás pont ebben a helyzetben lassabb, mint kellene.
- Jelenlegi kerülőút: a doki maga jön rá, hogy a Páciensek listáról a HELYES páciens saját oldaláról kell „+ Új terv"-et indítania.
- Javasolt javítási irány: a piros figyelmeztetés szövege egészüljön ki egy konkrét, kattintható javaslattal (pl. „Ha ezt a tervet Farkas Katalinnak szánod, indíts helyette új tervet az ő oldaláról" — link vagy gomb az érintett páciens oldalára).
- Siker mércéje: a doki a hibaüzenetből — próbálkozás nélkül — tudja, melyik gombot/oldalt kell használnia a helyes páciensre irányításhoz.
- Backlog: `masolas-uj-tervbe-hibauzenet-iranyitas`
- Döntés: backlog masolas-uj-tervbe-nem-alkalmas (2026-09-09)

### 3. Nincs mód egy tévesen kiadott, véglegesített terv érvénytelenítésére vagy megjelölésére — csak a cím kézi átírásával rögtönzött megoldás létezik

- Súlyosság: **Súlyos** (a doki maga rögtönzött megoldást talált, de az adatok — összeg, „véglegesítve" állapot — technikailag érvényesként maradnak a rendszerben)
- Gyakoriság: **ritka, de reális**
- Lencse: **István**
- Érintett folyamat: 9, 17
- Bizonyosság: **megfigyelt** (a terv szintű „…további műveletek" menü csak Letöltést és Másolást kínált, nincs törlés/érvénytelenítés opció, `16-tovabbi-muveletek-menu.png`); **erős következtetés**, hogy a „Páciens törlése" is emiatt van letiltva (`domain/paciensTorles.ts` `paciensTorlesAkadaly`: `'veglegesitett-terv'` akadály pontosan akkor áll fenn, ha a páciensnek van legalább egy `VEGLEGES` státuszú verziója). **Pontosítás:** a persona úgy jelezte, hogy a letiltás oka „sehol nincs kiírva" — ez tárgyi tévedés: a „Páciens törlése" menüpont alatt, ugyanabban a lenyíló menüben, egy külön sorban ott áll a szöveges indoklás: „Véglegesített terve van" (`32-paciens-muveletek-menu.png`) — a doki csak nem vette észre/nem olvasta el a menüben, ez felfedezhetőségi, nem hiányzó-információs probléma.
- Dedup: **ÚJ**
- Helyzet és reprodukció: Varga Zsófia oldalán a „…további műveletek" verzió-menü csak „Letöltés"-t és „Másolás új tervbe"-t kínált; a páciens-szintű „…" menüben a „Páciens törlése" letiltva állt (indoklással, lásd fent). A doki emiatt a „Terv címének szerkesztése" gombbal a terv címét „Korona és hídpótlások"-ról „TÉVES kiadás - helyette lásd Farkas Katalin"-ra írta át — ez sikeresen mentődött (`33-35`, `36-vegso-allapot.png`), és technikailag egy külön `terv-cimke.json` indexfájlba kerül, az eredeti, véglegesített `terv.json` tartalmát nem érinti.
- Orvosi elvárás: ha egy már kiadott papírról kiderül, hogy tévesen lett kiállítva, legyen a rendszerben egy hivatalos módja annak, hogy „ez érvénytelen, ne vegyék figyelembe" — ne kelljen kitalálnom egy kerülőmegoldást.
- Tapasztalt probléma: a cím átírása csak szöveges jelzés — az összeg (95 000 Ft) és a „véglegesítve" állapot változatlanul megmarad, mintha érvényes ügylet lenne; ha van valahol a rendszerben egy bevételi/kimutatási összesítő, ez a hibás tétel tévesen benne maradna.
- Napi hatás: páciens-összekeverés esetén a doki improvizálni kényszerül, ahelyett hogy egy megbízható, mindenki számára egyértelmű jelölést használna.
- Jelenlegi kerülőút: a terv címének átírása egy figyelmeztető szövegre — működik felismerhetőségi szempontból, de nem old meg semmit az adatszinten.
- Javasolt javítási irány: egy explicit „Érvénytelenítés" művelet a véglegesített terv „további műveletek" menüjében, ami látható, nem törölhető jelölést tesz a tervre (pl. áthúzott összeg, „ÉRVÉNYTELEN" címke), és kizárja az esetleges összesítésekből — a `_v<n+1>` és a „mentett verzió sosem íródik felül" elvek sérelme nélkül.
- Siker mércéje: egy tévesen kiadott, véglegesített terv egy hivatalos, a rendszer által is felismert állapotba kerül, ami megkülönbözteti egy érvényes tervtől bárhol, ahol az összegek megjelennek.
- Backlog: `veglegesitett-terv-ervenytelenitese`
- Döntés: backlog veglegesitett-terv-ervenytelenitese (2026-09-09)

### 4. Más páciensek neve, adatai és aktivitása kattintás/keresés nélkül látszik

- Súlyosság: **Súlyos**
- Gyakoriság: **minden tervnél**
- Lencse: **István** (a „Legutóbbi páciensek" lista rögtön a névre kattintás előtt megmutatta Varga Zsófia és tucatnyi más páciens legutóbbi aktivitását), megerősítve **rontás** lencsével (a Páciensek lista harmadszor is szűrés nélkül jelent meg)
- Érintett folyamat: 16
- Bizonyosság: **megfigyelt**
- Dedup: **MÁR JELZETT** (`2026-09-08-doctor-review-paciens-elott.md`, 2. megállapítás; `2026-09-08-doctor-review-surgos.md`, 2. megállapítás — most már HARMADSZOR, egymástól független forgatókönyvekben)
- Helyzet és reprodukció: lásd a korábbi jelentéseket; itt az „Új terv indítása" lap „Legutóbbi páciensek" listája (`02-uj-terv.png`) és a Páciensek lista (`19-paciensek-lista.png`) mutatta ugyanezt.
- Backlog: `paciens-lista-nem-rejtheto-paciens-elott` (a korábbi jelentésben javasolt slug, még nincs tételfájl)
- Döntés: duplikátum → review:2026-09-08-doctor-review-paciens-elott#2 (2026-09-09)

### 5. A tétel-kereső nem talál semmit egy köznyelvi, összetett kifejezésre („fémkerámia korona"), csak a törzsadatban szereplő rövidebb névre

- Súlyosság: **Közepes** (célba ér, de plusz próbálkozást igényel)
- Gyakoriság: **naponta többször**
- Lencse: **István**
- Érintett folyamat: 9
- Bizonyosság: **megfigyelt** (a „fémkerámia korona" keresés „Nincs találat."-ot adott, `05-tetel-kereses.png`; a „korona" önmagában 10+ találatot adott, köztük a helyes „Fémkerámia" tételt, `07-korona-talalatok.png`)
- Dedup: **ÚJ** — **rokon, de más jelenség**, mint a `2026-08-25-doctor-review-uj-terv.md` 1. megállapítása (ott a puszta „fogkő" kategórianév adott nulla találatot — ez az eset azóta megoldódott, a kereső ma már kategórianévre is talál, lásd a `2026-09-08-doctor-review-paciens-elott.md` „Ami jól működik" szakaszát). Itt egy KÉTSZAVAS, összetett kifejezés a probléma: sem a tétel neve („Fémkerámia"), sem a kategórianév („Korona és hídpótlások") nem tartalmazza szó szerint a teljes „fémkerámia korona" karakterláncot, és a kereső (`domain/search.ts` `nevEgyezik`) a teljes, egybefűzött keresőszöveget egyetlen `includes()` egyezésként kezeli, nem szavankénti ÉS-kapcsolatként.
- Orvosi elvárás: ha a köznyelvi nevet gépelem be (ahogy a papíron/fejben van), találjak rá a tételre.
- Tapasztalt probléma: nulla találat, csak az „Egyedi tétel felvétele" marad — a doki nem tudja, hogy csak rövidebben kellett volna gépelnie.
- Napi hatás: felesleges újra-próbálkozás, két páciens között időveszteség.
- Jelenlegi kerülőút: rövidebb keresőszóval (pl. csak „korona") újra próbálkozni.
- Javasolt javítási irány: a keresés bontsa szóközre a keresőszöveget, és minden szótöredékre KÜLÖN illesszen (ÉS-kapcsolat), ne csak az egybefűzött teljes szövegre.
- Siker mércéje: egy köznyelvi, kétszavas kifejezés (tétel + kategória szó) is megtalálja a helyes tételt.
- Backlog: `kereso-tobbszavas-koznyelvi-kifejezes`

### 6. Visszatérő páciens kiválasztásakor nincs egyértelmű jelzés, hogy új, üres terv indul-e, vagy egy korábbi terv nyílik meg szerkesztésre

- Súlyosság: **Közepes** (bizonytalanít, de célba ér, mert az üres mezők utólag megerősítik)
- Gyakoriság: **minden alkalommal, amikor visszatérő pácienst választ az „Új terv indítása" listából**
- Lencse: **István**
- Érintett folyamat: 16
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: az „Új terv indítása" lapon a „Legutóbbi páciensek" listából Varga Zsófiára kattintva a „Terv adatai" lap nyílt meg, ahol semmilyen felirat nem mondja ki explicit módon, hogy ez egy vadonatúj, üres terv-e vagy a korábbi tervének megnyitása (`03-varga-zsofia-adatlap.png`) — csak az üres „Terv címe" mező és a „piszkozat, 0 Ft" állapot (a KÖVETKEZŐ lépésen) erősítette meg utólag, hogy új tervről van szó.
- Orvosi elvárás: mielőtt bármit szerkesztek, tudjam biztosan, hogy egy vadonatúj tervet indítok, nem egy már aláírt dokumentumot írok át.
- Tapasztalt probléma: a bizonytalanság néhány másodpercig fennáll, amíg a doki a következő lépésre ér.
- Napi hatás: elhanyagolható időveszteség, de bizalmi szempontból nem elhanyagolható — pont a véglegesített dokumentumok sérthetetlensége a szerződéses garancia egyik pillére.
- Jelenlegi kerülőút: továbblépés és a „piszkozat, 0 Ft" állapot elolvasása.
- Javasolt javítási irány: egy rövid, explicit felirat a Terv adatai lap tetején visszatérő páciens választásakor: „Új, üres terv indul [Név]-nek."
- Siker mércéje: a doki már a Terv adatai lap megnyitásakor, olvasás nélkül is tudja, hogy új tervet indított.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- **A „Páciens törlése" letiltásának indoklása** ugyanabban a lenyíló menüben, egy külön soron jelenik meg („Véglegesített terve van") — a doki ezt a menüben **nem vette észre elsőre**, és tévesen azt hitte, sehol nincs megmagyarázva (lásd a 3. megállapítás Pontosítását). **1 próbálkozásból nem fedezte fel**, bár a menü nyitva volt előtte.

## 4. Ami jól működik

- **Megerősített javítás:** a `2026-09-01-doctor-review-visszatero-paciens.md`-ben Kritikusként jelentett GDPR-kockázat — hogy a „Másolás új tervbe" egy másik, létező páciens nevének beírásakor csendben, véglegesíthető állapotban hozott létre téves identitású dokumentumot — ma már nem áll fenn: a rendszer PONTOS névegyezésnél kemény, piros figyelmeztetéssel blokkolja a véglegesítést (`18-nev-atirasa.png`). Ez egy jelentős, működés közben visszaigazolt biztonsági javítás.
- Az ártérés felismerése azonnali és pontos volt: a listaár kézi felülírásakor (95 000 → 115 000 Ft) a rendszer azonnal megjelenített egy „+21%" jelzést és „Eltérés a listaártól: +20 000 Ft" feliratot — ez szó szerint egyezett az asszisztens által mondott összeggel, ami konkrét, számszerű megerősítést adott a dokinak.
- A „Terv elmentve ✓" visszaigazolás mindkét véglegesítésnél (Varga Zsófia, Farkas Katalin) egyértelmű volt, a mappa-struktúra kiírásával együtt.
- A letöltés utáni fájlnév-visszajelzés mindkét esetben pontos és azonnali volt.
- A terv-cím kézi átírása (a doki rögtönzött megoldása) egy külön, a véglegesített `terv.json`-t nem érintő `terv-cimke.json` fájlba kerül — technikailag biztonságos módja volt az improvizációnak, nem sértette a verzió-változatlanság szabályát.
- A „Piszkozat felülírása" védőháló ismét (most már harmadszor, három különböző forgatókönyvben) helyesen, világos szöveggel jelent meg, amikor egy aktív piszkozat mellett új tervet próbált indítani egy másik páciensnél.
- Ez volt az első menet mind közül, ahol a konzol teljesen tiszta maradt — egyetlen hiba, figyelmeztetés vagy a11y-jelzés sem keletkezett.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi terveket keresed, páciens nélkül?
2. Ha egy tétel ára a listánkban megváltozik, honnan tudnád meg, hogy egy korábban felvitt sor már elavult árat mutat — van erre valamilyen rendelői rutinod (pl. rendszeres árlista-átnézés), vagy eddig nem volt rá szükség?
3. Ha egy már kiadott, aláírt papírról utólag kiderül, hogy téves páciensnek készült — mi a jelenlegi (papíralapú/Excel-es) gyakorlatod ilyenkor? Ez segítene eldönteni, milyen jelölés lenne számodra a leghasznosabb a programban.
4. A „Másolás új tervbe" és az „Új terv" közötti különbség (ugyanahhoz a pácienshez alternatív ajánlat, vagy önálló, új tervlánc) most, hogy látod, egyértelmű-e, vagy inkább a nevük alapján mást várnál?
5. Van-e olyan rendelői kimutatás vagy összesítő, amibe egy tévesen kiadott, de a rendszerben technikailag „véglegesítve" maradt terv összege tévesen belekerülhetne?

## 6. Nem ellenőrizhető

- A letöltött PDF-ek tényleges lemezre kerülése (izolált profil).
- A ténylegesen kinyomtatott és aláírt papír sorsa egy valós rendelői adminisztrációban (számlázás, könyvelés) — csak feltételezés alapján jelezhető kockázatként (3. megállapítás).
