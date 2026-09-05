# Doctor-review — `papirrol` — 2026-09-05

```
Dátum: 2026-09-05
Forgatókönyv: papirrol — Kiss Márta kézzel írt, háromlépcsős, tízsoros tervének bevitele a papírról (fogszámok, becsült ár, 10% korona-kedvezmény, 100 000 Ft előleg), hogy rendes nyomtatvány legyen belőle
User-teszt készültség: javítás után mehet (0 blokkoló, 3 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 5, 6, 8, 13 (és a tételfelvitel ritmusa 10 soron)
Megállapítások lencsénként: István 17 / vizuális 2 / rontás 3 / a11y 0
Bizonyosság-eloszlás: megfigyelt 19 / erős következtetés 3 / feltételezés 0 (a 9. tétel lemezre írása másodlagos mezőként feltételezés)
Képernyőképek: docs/reviews/screens/2026-09-05-papirrol (47 persona-kép + r01 reprodukciós kép, .gitignore-olt)
```

## 1. Napi munkamenet összefoglalója

István a Kezdőlapon nem az „+ Új kezelési terv" gombra, hanem Kiss Márta nevére kattintott, a
páciens lapján az „+ Új terv" gombot választotta (és nem a régi szájsebészeti terv „Új
verzió"-ját — rendelői logikából tippelve), címet adott („Terv, aug."), és a Kezelések lapon
**mind a tíz sort felvitte** három, a papír szerint átnevezett lépcsőben, fogszámokkal, két
leírással („3 csatorna", „kb. ár, függ a technikustól") és a cirkon koronán a becsült-jelöléssel.
A „koronára 10% kedv."-hez nem talált mezőt: fejben számolt (85 500, 121 500), és az Ajánlati ár
átírásával vitte be — a „−10%" jelvény igazolta vissza. Az előleget a „fogtechnikai munkát
tartalmaz" pipa alatt találta meg. Frissített (F5), semmi nem veszett el. Az előnézeten a
böngésző Vissza gombja kétszer is hibaoldalt hozott a dokumentum helyén — itt mondta ki, hogy a
rendelőben kollégát hívna —, az app „Vissza a szerkesztőbe" gombjával jutott vissza. Végül
**véglegesített** (egy kattintással, megerősítés nélkül), a Korábbi tervek listáján megtalálta
a „Terv, aug. · v1 · 615 000 Ft" sort, megnézte a terv részleteit, és a Letöltés gombra
kattintott, amiről nem kapott visszajelzést.

A napló záró bekezdése szó szerint:

> A papírról bevitel részét szerintem holnap is meg tudnám csinálni segítség nélkül: a kereső
> gyors, a fázisok, fogak, leírások, előleg megtalálhatók, és a piszkozat magától mentődik — ezt
> ma megtanultam. Amiben elakadnék vagy hibáznék: (1) a kereső Enterrel az első találatot veszi,
> és kétszer is rossz lett volna (Neodent csomag, Straumann fej) — sietve biztos becsúszik; (2) a
> kedvezményt fejben kell számolnom, nincs százalék-mező; (3) a „Felár" és a „Kezelések összege /
> Végösszeg" számait nem értem, és a páciens előtt nem mernék rájuk mutatni; (4) a kiadási
> dátumot nem tudom augusztusra állítani, pedig a papír augusztusi; (5) a böngésző Vissza gombja
> után azt hittem, elveszett a terv — ezt legközelebb is megnyomnám, mert ez a reflexem; (6) a
> véglegesítés után nem egyértelmű, hol a letöltés, és a mentés-visszaigazolás nem a terv címét
> mutatja; (7) a „Garancia kimarad" figyelmeztetéssel nem tudok mit kezdeni. Ezek közül a 3., 5.
> és 7. miatt holnap még mindig megkérdezném a kollégát, mielőtt a páciensnek odaadom a
> nyomtatványt.

A mentett `_v1` tartalma: 10 sor, három fázis, fizetendő 615 000 Ft, előleg 100 000 Ft, két
becsült sor, a két leírás nyomtatva. A dokumentum összesítője viszont „Kezelések összege
611 000 Ft" fölé „Végösszeg 615 000 Ft"-ot ír — lásd az 1. megállapítást.

## 2. Legfontosabb megállapítások

### 1. A 10% korona-kedvezmény és a sávos gyökértömés felára nettózódik: a szerkesztő „Felár: 4000 Ft"-ot ír, a nyomtatvány pedig „Kezelések összege 611 000 Ft" fölé „Végösszeg 615 000 Ft"-ot — a páciens egy magyarázatlan 4000 Ft-os többletet lát, a kedvezményből semmit

- Súlyosság: **Súlyos** (a dokumentum számai igazak, de a páciens felé az üzenet a szándék
  ellentéte: „drágább, mint a kezelések összege"; István a Terv részletein látta, nem tudta
  megmagyarázni, és nem mutatná meg a páciensnek — a Blokkoló határán: a papír már elkészült)
- Gyakoriság: **naponta többször** (minden tervnél, ahol sávos tétel felső ára és bármilyen
  kedvezmény együtt van — a papíron pont ez a kombináció szerepelt)
- Lencse: István (a nyomtatványra vizuális lencsével megerősítve)
- Érintett folyamat: 8 (kedvezmény, ár), 14 (a dokumentum tartalma)
- Bizonyosság: **megfigyelt** (`30-kedvezmeny-eloleg-pipa.png`: „Felár: 4000 Ft" a Mindösszesen
  alatt, miután 27 000 felár és 23 000 kedvezmény került a sorokra; `35-pdf-2-oldal.png`: a
  PDF „Összesítés" blokkja „Kezelések összege 611 000 Ft" / „Végösszeg 615 000 Ft";
  `45-megnezes.png`: ugyanez a Pénzügyi összesítésen. A mentett `terv.json`
  `osszesitok.kedvezmeny = −4000`. Kód: a szerkesztő `surcharge = grand − listTotal`
  (`app/src/pages/planEditor/Summary.tsx`), a nyomtatvány referenciasora `grand !== listTotal`
  esetén nyílik meg, iránytól függetlenül (`app/src/pdf/TervDocument.tsx`), a Terv részletei
  `osszesitok.kedvezmeny !== 0` esetén (`app/src/pages/tervReszletei/PenzugyiOsszesites.tsx`).)
- Dedup: **ÚJ** (a sávos alsó ár + „felár" jelzés önmagában **MÁR JELZETT**:
  `2026-09-05-doctor-review-nagy-terv.md`, 2. megállapítás — ott a kedvezmény nélküli eset;
  itt az új elem a nettózás és a nyomtatványon megjelenő referenciasor)
- Helyzet és reprodukció: gyökértömés 38 000 → 65 000 (felár 27 000), fémkerámia 95 000 →
  85 500 és cirkon 135 000 → 121 500 (kedvezmény 23 000). A Mindösszesen alatt „Felár:
  4000 Ft". Előnézet/PDF 2. oldal: „Kezelések összege 611 000 Ft", „Végösszeg 615 000 Ft".
- Orvosi elvárás: „A kedvezmény ne kerüljön a papírra — rendben. De akkor a felár se
  jelenjen meg nettóban, és a Kezelések összege ne legyen kevesebb a fizetendőnél; a 3 csatornás
  ár nem felár."
- Tapasztalt probléma: a szerkesztőben egy „felár" szó, ami valójában 27 000 felár és 23 000
  kedvezmény különbsége; a nyomtatványon egy referenciasor, amiből a páciens azt olvassa ki,
  hogy 4000 Ft-tal többet fizet, mint amennyibe a kezelések kerülnek — magyarázat nélkül.
- Napi hatás: a páciens előtt kínos kérdés („miért több a végösszeg?"), a kedvezmény
  gesztusa elvész; István emiatt kollégát kérdezne a véglegesítés előtt.
- Jelenlegi kerülőút: nincs — a nyomtatványon a sor a doki tudta nélkül jelenik meg. A felár
  elkerülésére a sávos tételen az alsó árat hagyni (alulárazás), vagy a kedvezményt inkább az
  Egyedi végösszegben adni (azt István nem találta meg).
- Javasolt javítási irány: (a) a sávos tétel sávon belüli ára ne számítson eltérésnek (a
  `nagy-terv` 2. megállapításának iránya) — ezzel itt a kedvezmény tiszta 23 000 lenne, és a
  referenciasor a szándék szerint működne; (b) a szerkesztő ne nettózzon: „Kedvezmény: 23 000 Ft ·
  Eltérés a listaártól: +27 000 Ft" két külön sorban; (c) a nyomtatványon a „Kezelések összege"
  referenciasor csak akkor nyíljon meg, ha a fizetendő KISEBB a listaárasnál (kedvezmény-eset) —
  nettó felár mellett inkább ne, vagy egy semleges „Listaáron:" felirattal.
- Siker mércéje: ugyanezzel a tíz sorral a szerkesztő nem ír „Felár"-t, és a nyomtatvány
  összesítője nem tartalmaz a Végösszegnél kisebb „Kezelések összege" sort.
- Backlog: `nyomtatvany-osszesites-netto-felar`

### 2. Az Enter az első találatot veszi, és a „neodent", „implantátumfej" keresésre az első találat nem a keresett tétel

- Súlyosság: **Súlyos** (István kétszer csak olvasás után, egérrel kerülte el a rossz sort —
  „sietve biztos becsúszik")
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 5, 6
- Bizonyosság: **megfigyelt** (`19-neodent-kereses.png`: első „All-on-X csomagok — Neodent
  implantátum csomagban 150 000 Ft"; `21-implfej-kereses.png`: első „Straumann
  implantátumfej"; `09-gyoker-kereses.png`: „gyökér"-re első a „Gyökértömés eltávolítása")
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-nagy-terv.md`, 1. megállapítás —
  ugyanaz a három tétel; javasolt slug ott: `kereso-talalat-rangsor`)
- Tapasztalt probléma: „az Enter-az-elsőre szokásom kétszer is majdnem rossz tételt vitt be";
  ettől kezdve minden listát végigolvasott.
- Backlog: `kereso-talalat-rangsor` (a nagy-terv jelentés javaslata, még nincs tételfájl)

### 3. Sávos tételnél az alsó ár kerül be kérdés nélkül; a 3 csatornás 65 000 Ft „+71%" jelvényt és „Felár" sort kap

- Súlyosság: **Súlyos**
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 8
- Bizonyosság: **megfigyelt** (`10-gyokertomes-felveve.png`, `11-gyokertomes-fog-ar.png`,
  `12-leiras-gomb-utan.png`)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-nagy-terv.md`, 2. megállapítás; javasolt
  slug ott: `savos-ar-savon-beluli-ertek`)
- Tapasztalt probléma: „a »felár« szó egy páciensnek úgy hangzik, mintha pluszban kérnék tőle
  — nekem ez csak a 3 csatornás ár." A „csatornaszámtól függően" tétel a csatornaszámot nem
  kérdezi; István a „3 csatorna" leírásba írta, ami a nyomtatványra rá is került (jó).
- Backlog: `savos-ar-savon-beluli-ertek` (a nagy-terv jelentés javaslata, még nincs tételfájl)

### 4. Soronkénti kedvezményhez nincs százalék-mező: „koronára 10% kedv." fejben számolva, az Ajánlati árba gépelve

- Súlyosság: **Közepes** (célba ért, a „−10%" jelvény visszaigazolta; de „pont ez az, amiben az
  Excelben is elrontottam régen" — számolási hiba egy szerződéses dokumentumon)
- Gyakoriság: **naponta többször** (a kedvezmény a papíron százalékban áll)
- Lencse: István
- Érintett folyamat: 8 (kedvezmény)
- Bizonyosság: **megfigyelt** (`30-kedvezmeny-eloleg-pipa.png`: „−10%" jelvények a két koronán;
  kód: a `LineRow`-ban nincs százalékos bemenet, az eltérés-jelvény utólag, az árból számol —
  `app/src/domain/sorElteres.ts`; a terv-szintű „Egyedi végösszeg" blokk összeget vár, nem
  százalékot)
- Dedup: **ÚJ**
- Helyzet és reprodukció: Fémkerámia 95 000 → a doki 85 500-at számol és ír be; cirkon
  135 000 → 121 500. Nincs olyan mező, ahova „10%" írható.
- Orvosi elvárás: „A soron egy százalék-mező vagy egy »−10%« gomb; a program számoljon."
- Tapasztalt probléma: kézi szorzás két tételen; a kedvezmény ténye csak a jelvényből
  derül ki, összegben sehol („mennyit engedtem összesen?" — a Felár-sor pont ezt takarja el,
  lásd 1.).
- Napi hatás: minden százalékos kedvezménynél fejben vagy számológéppel számolás.
- Jelenlegi kerülőút: fejben számolt ár az Ajánlati árba; a jelvény ellenőrzésre.
- Javasolt javítási irány: az Ajánlati ár mező fogadjon el „−10%" alakú bevitelt (a mező már
  ismer visszaolvasható formátumot), vagy a jelvény mellett egy kis „%" gomb, ami százalékot
  kér és kiszámolja az árat; a Mindösszesen alatt „Kedvezmény összesen: 23 000 Ft".
- Siker mércéje: „koronára 10%" bevitele számolás nélkül, és a kedvezmény összege egy helyen
  látszik.

### 5. A kiadás dátuma nem írható át: a papír augusztusi, a nyomtatvány „2026. szeptember 5."-ét ír

- Súlyosság: **Közepes** (célba ér, de a papír és a nyomtatvány dátuma eltér; István számára
  nyitott, hogy ez baj-e)
- Gyakoriság: **hetente** (utólag rögzített, korábban kézzel kiadott tervek)
- Lencse: István
- Érintett folyamat: 4, 10 (dátumok)
- Bizonyosság: **megfigyelt** (`03-uj-terv-utan.png`, `46-megnezes-teljes-oldal.png`:
  „Keltezés 2026. szeptember 5."; kód: a mező `ReadOnlyField` — `app/src/pages/PatientPage.tsx`;
  `docs/PRODUCT.md` § Napi flow: a keltezés a betöltés pillanatában frissül)
- Dedup: **ÚJ** (a `2026-09-05-doctor-review-elso-megnyitas.md` 6. megállapítása a
  dátumformátumról szól, nem a szerkeszthetőségről)
- Orvosi elvárás: „Vagy írhassam át augusztusra, vagy mondja meg, miért nem."
- Tapasztalt probléma: „Kiadás dátuma: 2026. szeptember 5." csak kiírt szöveg, magyarázat
  nélkül; az „Érvényes eddig" viszont szerkeszthető, és nem mondja, hogy három hónap az alap.
- Napi hatás: a páciens kezében két különböző dátumú dokumentum ugyanarról a tervről.
- Jelenlegi kerülőút: nincs.
- Javasolt javítási irány: ha jogi ok miatt fix, egy rövid felirat a mező alatt („A
  nyomtatvány a mai dátummal készül"); ha nem, szerkeszthető keltezés múltbeli dátumra, a
  véglegesítés-őr puha figyelmeztetésével. **Istvántól megkérdezendő** (5. szekció).
- Siker mércéje: a doki a Terv adatai lapról tudja, miért az a dátum, vagy át tudja írni.

### 6. A böngésző Vissza gombja az előnézeten hibaoldalt hoz a dokumentum helyén — István két próbálkozás után kollégát hívna

- Súlyosság: **Közepes** (adat nem veszett el; az app gombja megoldja — de ez volt a menet
  egyetlen pontja, ahol István segítséget kért volna)
- Gyakoriság: **hetente**
- Lencse: István
- Érintett folyamat: 14, 21
- Bizonyosság: **megfigyelt** (`39-bongeszo-vissza.png`, `40-bongeszo-vissza-2.png`; a fő ügynök
  a `nagy-terv` futásban reprodukálta)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-nagy-terv.md`, 4. megállapítás) — itt
  kétszer egymás után, és a persona kimondott elakadásával; a megállapítás súlya ezzel nőtt.

### 7. A „Véglegesítés és mentés" egy kattintásra, megerősítés nélkül zár le egy visszavonhatatlan lépést

- Súlyosság: **Közepes** (István utólag lepődött meg: „egy visszavonhatatlan lépésnél
  számítottam volna rá")
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`43-veglegesites-katt.png`; kód: a megerősítő lánc
  szándékosan megszűnt, a puha tételek nem kérnek „Folytatás"-t — `app/src/pages/PreviewPage.tsx`
  `attemptFinalize`)
- Dedup: **ÚJ** (a `2026-08-25-doctor-review-veglegesites.md` a figyelmeztetések
  megkülönböztetéséről szól, a végső kattintás megerősítéséről nem)
- Orvosi elvárás: „Egy »Biztos? Ezután nem módosítható, csak új változat készíthető« kérdés."
- Tapasztalt probléma: a gomb neve „mentés", ami a doki fejében visszavonható; a „véglegesítés"
  szót ő először nem értette.
- Napi hatás: egy félrekattintás egy `_v1`-et hoz létre, amit csak új verzióval lehet
  „javítani" (a lánc megmarad).
- Jelenlegi kerülőút: nincs; utólag „Új verzió".
- Javasolt javítási irány: nem feltétlenül dialógus — a gomb alatt egy sor: „Véglegesítés
  után a terv nem módosítható, csak új változat készíthető"; vagy egyetlen, egyszerű
  megerősítés csak akkor, ha az előnézetet a doki még nem görgette végig. **Istvántól
  megkérdezendő**, hányszor véglegesített volna tévedésből.
- Siker mércéje: a persona a kattintás előtt tudja, hogy a lépés visszavonhatatlan.

### 8. Véglegesítés után a sikerképernyő belső mappanevet mutat a terv címe helyett, és nincs rajta Letöltés

- Súlyosság: **Közepes** („egy pillanatig azt hittem, elveszett a »Terv, aug.« címem, és a
  program átnevezte"; a letöltést a Terv részletein találta meg)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 14, 16
- Bizonyosság: **megfigyelt** (`43-veglegesites-katt.png`: „Kiss-Márta_kissma / Korona és
  hídpótlások_y7ca5v / 2026-09-05_v1"; `44-korabbi-tervek.png`: a listán „Terv, aug. · v1")
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 2. és 9.
  megállapítás; a mappanév ≠ cím jelenség: `2026-09-05-doctor-review-nagy-terv.md`, 16.
  megállapítás megjegyzése)
- Javasolt javítási irány: a sikerképernyőn a terv címe és a páciens neve („Kiss Márta —
  Terv, aug. · v1 elmentve"), a mappanév legfeljebb halványan alatta; Letöltés/Nyomtatás gomb.

### 9. A Letöltés gombra kattintva semmi látható nem történik

- Súlyosság: **Kis–Közepes** („a rendelőben a Letöltések mappában keresgélnék")
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 16
- Bizonyosság: **megfigyelt** a visszajelzés hiánya (`47-letoltes-utan.png`); a fájl
  tényleges lemezre kerülése **feltételezés** (izolált profil — lásd 6. szekció)
- Dedup: **ÚJ** (a `2026-09-01-doctor-review-visszatero-paciens.md` 2. megállapítása a
  seed-tervek hiányzó PDF-jéről szól)
- Javasolt javítási irány: a kattintás után rövid visszajelzés a gomb mellett („Letöltve:
  Kiss-Marta_Terv-aug_v1.pdf"), ahogy a böngésző letöltéssávja nem mindig látszik.

### 10. „Új verzió" és „+ Új terv" egymás mellett a páciens lapján, magyarázat nélkül — a jó választás rendelői logikából jött, nem a felületből

- Súlyosság: **Kis–Közepes** (helyesen választott; „ha a régi terv címe hasonló lett volna,
  simán »Új verzió«-t nyomok, és egy másik terv 4. változataként vittem volna be")
- Gyakoriság: **hetente**
- Lencse: István
- Érintett folyamat: 3, 17
- Bizonyosság: **erős következtetés** (`02-kiss-marta-lap.png`; a persona nem próbálta ki a
  rossz ágat)
- Dedup: **ÚJ** (az `elso-megnyitas` jelentés az „Új verzió" gombtól való félelmet jegyzi,
  a két gomb összetéveszthetőségét nem)
- Javasolt javítási irány: az „Új verzió" mellé félmondat („ennek a tervnek a folytatása"),
  vagy a gomb a terv-lánc fejlécében, a „+ Új terv" pedig a lap tetején — a kettő ne egy
  sorban legyen.

### 11. Az előnézet figyelmeztetései („Garancia kimarad", „Néhány sor ára eltér") nem mondják meg, kinek a dolga és megállít-e

- Súlyosság: **Közepes** (István miattuk is kollégát kérdezne)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`34-elonezet-varas-utan.png`)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 10.;
  `2026-08-25-doctor-review-veglegesites.md`, 1.; `2026-09-05-doctor-review-nagy-terv.md`, 8.);
  a garancia-szöveg **MÁR TERVEZETT** (`backlog/idea/arlista-nap.md`)
- Tapasztalt probléma: „ez nem az én asztalom, vagy mégis?"; a kézzel felülírt ár
  figyelmeztetésnél: „nem tudom, hogy ez hiba-e, amit javítanom kell, vagy csak szól."

### 12. Gépelés közben a sor Összege már frissül, a Fázis összesen és a Mindösszesen csak a mező elhagyása után

- Súlyosság: **Kis** („egy pillanatra azt hittem, rosszul számol")
- Gyakoriság: **minden árátírásnál**
- Lencse: István
- Érintett folyamat: 8
- Bizonyosság: **megfigyelt** (`11-gyokertomes-fog-ar.png`: sor 65 000 Ft, Fázis összesen
  71 000 Ft; a fő ügynök reprodukálta: a Panoráma árába „20000" gépelve a sor 20 000 Ft-ot,
  a Fázis összesen 118 000 Ft-ot, a Mindösszesen 615 000 Ft-ot mutatott, amíg a mező fókuszban volt)
- Dedup: **ISMÉT** (`2026-08-25-doctor-review-uj-terv.md`, 3. megállapítás — a javítás
  `f838db2` „Élő Összeg oszlop gépelés közben" a sor Összegét tette élővé; a fázis- és
  végösszeg továbbra is a commitra vár)
- Javasolt javítási irány: vagy a fázis/végösszeg is kövesse az élő piszkozatot, vagy —
  ha ez szándékos — a két összegző halványodjon el, amíg egy ármező nyitva van.

### 13. A fázisnév után a Tab a lista első sorának nevébe ugrik — sietve a kezelés nevét írja át a doki

- Súlyosság: **Kis–Közepes** (nem történt baj; a következő karakterek egy tételnevet írnának
  át, „átírt" jelvényt hagyva)
- Gyakoriság: **minden fázis-átnevezésnél**
- Lencse: István
- Érintett folyamat: 5, 9
- Bizonyosság: **erős következtetés** (`15-fazis-atnevezve.png`: a fókuszgyűrű a
  „Panoráma-, TeleRtg, Arcüregfelvétel" mezőn a Tab után; DOM-sorrend: egyetlen fázisnál a
  név-mező után a fel/le/törlés gombok tiltottak vagy hiányoznak, a következő fókuszálható
  elem a sor névmezője — `app/src/pages/planEditor/PhaseSection.tsx`)
- Dedup: **ÚJ**
- Javasolt javítási irány: a fázisnév-mezőből a Tab (és az Enter) a fázis keresőjébe ugorjon.

### 14. Oldalfrissítés és a szerkesztőbe visszatérés után a kurzor az Előleg mezőbe ugrik, az oldal aljára

- Súlyosság: **Kis** („nem tudom, miért")
- Gyakoriság: **minden előleges tervnél**, minden újratöltésnél
- Lencse: István
- Érintett folyamat: 13, 21
- Bizonyosság: **erős következtetés** (`32-f5-utan.png`, `41-vissza-a-szerkesztobe.png`: az
  Előleg mező fókuszban, a tartalma kijelölve; kód: `autoFocus` a `NumberField`-en, amely
  bekapcsoláskor szándékos, de betöltött előlegnél is tüzel — `app/src/pages/planEditor/ElolegBlokk.tsx`)
- Dedup: **ÚJ**
- Javasolt javítási irány: az `autoFocus` csak a doki bekapcsolásakor, nem betöltéskor.

### 15. Enter a Terv címe mezőben nem lép tovább és nem jelez

- Súlyosság: **Kis**
- Lencse: István
- Bizonyosság: **megfigyelt** (`04-cim-enter-utan.png`)
- Dedup: **ÚJ** (az `elso-megnyitas` 7. megállapítása a Név mező Enterjéről szól, ahol az
  Enter viszont túl sokat csinál)
- Javasolt javítási irány: Enter a címben → fókusz a következő mezőre vagy a „Tovább" gombra.

### 16. Az előleg helye a „fogtechnikai munkát tartalmaz — előleg feltüntetése" pipa alatt van; a pipa felirata nem mondja, hogy ez az előleg mezője

- Súlyosság: **Kis** (tippre megtalálta; „ha nincs fogtechnika, nem tudom, hova írnám")
- Lencse: István
- Bizonyosság: **megfigyelt** (`30-kedvezmeny-eloleg-pipa.png`, `31-eloleg-beirva.png`)
- Dedup: **ÚJ** mint felirat-kérdés (a nemet-euro jelentés a blokk működését jónak találta)
- Javasolt javítási irány: „Előleg feltüntetése (fogtechnikai munkánál)" — az előleg szó
  elöl. **Istvántól megkérdezendő**, kér-e előleget fogtechnika nélkül.

### 17. „Terv véglegesítve · az imént" a Kezdőlapon egy először megnyitott programban

- Súlyosság: **Kis** (demó-műtermék, de bizalmatlanságot keltett: „mit csináltam az imént?")
- Lencse: István
- Bizonyosság: **megfigyelt** (`01-kezdolap.png`)
- Dedup: **ÚJ** (az `elso-megnyitas` 15. megállapítása a feliratot a véglegesítés utáni
  jelzésként említi)
- Javasolt javítási irány: a seed-tervek dátuma ne „most" legyen, hanem napokkal korábbi.

### 18. A nyomtatványon a születési dátum „1992-12-01", az appban mindenhol „1992.12.01."

- Súlyosság: **Kis**
- Gyakoriság: **minden nyomtatványon**
- Lencse: vizuális
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** (`38-pdf-1-oldal-100.png`: „Született 1992-12-01";
  `45-megnezes.png`, `02-kiss-marta-lap.png`: „1992.12.01.")
- Dedup: **ÚJ** (az `elso-megnyitas` 6. megállapítása a beviteli mezők böngésző-formátumáról
  szól; a nyomtatvány ISO-alakja nem szerepelt)
- Javasolt javítási irány: a nyomtatványon is a magyar alak („1992. 12. 01."), a
  keltezéssel azonos formázóval.

### 19. A nyomtatvány fejlécében „v0", a listán és a Terv részletein „v1"

- Súlyosság: **Kis** (a persona itt nem vette észre; a képen látszik)
- Lencse: vizuális
- Bizonyosság: **megfigyelt** (`38-pdf-1-oldal-100.png`: „· v0 · 2026.09.05.")
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 1. megállapítás,
  javasolt slug: `pdf-verzioszam-mentett-verzio`; még nincs tételfájl)

### 20. Két fülön ugyanaz a piszkozat: az utolsó író nyer, jelzés nélkül

- Súlyosság: **Közepes** · Gyakoriság: **ritka helyzet** · Lencse: rontás
- Bizonyosság: **megfigyelt** (második lap: Konzultáció Db 1→2, 625 000 Ft; első lap: nem
  látta, ott Panoráma Db 1→2 → a tárolóban a Konzultáció Db visszaállt 1-re; figyelmeztetés
  egyik lapon sem)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 14.;
  `2026-09-05-doctor-review-nagy-terv.md`, 15.)

### 21. Frissítés a véglegesítés közben: a `_v2` elmentődik, a doki egy üres terv előnézetét kapja piros hibákkal

- Súlyosság: **Kis** · Gyakoriság: **ritka helyzet** · Lencse: rontás
- Bizonyosság: **megfigyelt** (`r01-frissites-veglegesites-kozben.png`; a tárolóban `_v2`
  `VEGLEGES`, 615 000 Ft, a `_v1` érintetlen, a piszkozat törölve)
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 15.;
  `2026-09-05-doctor-review-nagy-terv.md`, 16.)

### 22. Konzol: „Buffer is not defined" (14×) az előnézet renderelésekor; „A form field element should have an id or name attribute"

- Súlyosság: **Kis** · Lencse: rontás
- Bizonyosság: **megfigyelt**
- Dedup: **MÁR JELZETT** (`2026-09-05-doctor-review-nagy-terv.md`, 17. és 18.;
  `2026-09-05-doctor-review-elso-megnyitas.md`, 16.)

### Rontás-próba, ami rendben volt

- **Gyors dupla kattintás az „Új verzió" gombon** (Terv részletei, v1): egyszer navigált a
  szerkesztőbe, egy piszkozat jött létre, dialógus nem nyílt. Rendben.
- **Dupla kattintás az „Előnézet" gombon** (a persona tette): egyszer navigált. Rendben.
- **Platform-felirat:** a forrásban nincs felhasználónak szánt `Ctrl`/`Cmd`/`⌘`/`Alt` felirat
  (változatlan a `nagy-terv` futás óta). Rendben.
- **Gyors gépelés a következő keresésbe, mielőtt az előző találat bekerült:** semmi nem
  veszett el, nem duplázódott (persona, `09-gyoker-kereses.png`).

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- **„Egyedi végösszeg beállítása"** — a terv-szintű kedvezmény helye; István a „koronára 10%"
  kedvezményt soronként, fejben számolva vitte be, a pipát látta, de nem nyitotta ki
  (a papír kedvezménye soronkénti, ezért nem is ez lett volna a pontos megoldás).
- **„⟲ Ajánlati ár visszaállítása a listaárra"** — megjelent az átírt ár mellett; a nevét csak
  a fában látta, nem használta.
- **„≈" becsült ár kapcsoló** — a gyökértömésnél magától bekapcsolva; a cirkonnál találgatásból
  megnyomta (1 próbálkozás), a jelentését a Terv részletei „Becsült ár" jelvénye igazolta.
- **Fázisok összecsukása / fázis-sorrend nyilak** — nem használta (három rövid fázisnál nem
  is hiányzott).
- **Fogtérkép (célkereszt a Fog mező mellett, „Érintett fogak" panel)** — nem nyitotta meg;
  a fogszámokat gépelte.
- **„Vissza a szerkesztőbe" az előnézeten** — két böngésző-Vissza után találta meg.
- **Letöltés a Terv részletein** — megtalálta (a sikerképernyőn hiányzott), visszajelzés nélkül.
- **„Megnyitás külön", „Másolás új tervbe", „Összes verzió"** — látta, nem próbálta.
- **A kereső kategória-fejlécei** — látta („All-on-X csomagok", „Szájsebészet"), ez alapján
  kerülte el a csomagtételt.

## 4. Ami jól működik

- **Páciens nevére kattintás a Kezdőlapon → „+ Új terv"** — a természetes út működött, a
  páciens adatai előtöltve, „nem kell újragépelni".
- **A háromlépéses fejléc-csík** — „látom, mi vár rám".
- **Kereső + Enter ritmus tíz soron** — „a kereső gyors"; a gyors, kivárás nélküli gépelés sem
  vesztett adatot.
- **„−10%" jelvény** a kézzel átírt koronaárakon — „láttam, hogy nem számoltam el".
- **Előleg blokk**: Ft/% választó, azonnali „Fennmaradó rész 515 000 Ft"; a nyomtatványon és a
  Terv részletein ugyanezek a számok.
- **Leírás a soron** („3 csatorna", „kb. ár, függ a technikustól") — a nyomtatványra rákerült a
  sor alá.
- **Becsült jelölés** — a PDF-en `*` és lábjegyzet, a Terv részletein „2 tétel ára becsült".
- **F5 után minden megmaradt** — fázisnevek, leírások, jelvények, előleg.
- **Sikerképernyő** felsorolja, mely figyelmeztetések álltak fenn véglegesítéskor.
- **Korábbi tervek listája** a doki címével („Terv, aug. · v1 · 615 000 Ft").
- **A fázisnév átírása** kattintásra, mentés nélkül.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi terveket
   keresed, páciens nélkül?
2. Amikor egy múlt heti, kézzel írt tervet utólag viszel be: a nyomtatványon az eredeti
   (augusztusi) dátumot várod, vagy a bevitel napját? Volt már ebből vita a pácienssel?
3. A „koronára 10%" kedvezményt eddig hogyan írtad az Excelbe — a sorban csökkentett árral,
   vagy a végén egy „kedvezmény" sorral? Mutasd meg egy régi terven.
4. Kapott már páciens tőled olyan papírt, amin a listaáras összeg is szerepelt a fizetendő
   mellett? Mit kérdezett rá?
5. Sávos árnál (gyökértömés 38–65 ezer) a csatornaszámot mikor tudod — a terv írásakor, vagy
   csak a kezelésen? Ha a terv írásakor: a konkrét árat írod, vagy a sávot?
6. Előleget csak fogtechnikai munkánál kérsz, vagy máskor is (pl. implantátum-alapanyag)?
7. Hányszor fordult elő, hogy egy kész tervet a kinyomtatás után még módosítanod kellett
   (elírás, ár)? Mit csináltál ilyenkor a már kiadott papírral?
8. A kész PDF-et hogyan adod tovább: nyomtatod a rendelőben, e-mailben küldöd, vagy mindkettő?
   Hol keresed a letöltött fájlt?
9. Ugyanannak a páciensnek egy új, más témájú terve nálad „új terv", vagy a régi folytatása?
   (Az „Új verzió" / „+ Új terv" választáshoz.)
10. Használod a böngésző Vissza gombját munka közben, és ha egy program erre furcsán reagál,
    mit teszel: újratöltöd, bezárod, vagy szólsz valakinek?

## 6. Nem ellenőrizhető

- **A letöltött fájl tényleges lemezre kerülése** (9. megállapítás) — izolált profil; a persona
  szándéka és a visszajelzés hiánya alapján **feltételezés**.
- **A PDF-nézegető belseje** — a `35-pdf-2-oldal.png` és `38-pdf-1-oldal-100.png` képernyőképek
  mutatják az Összesítést és az első oldalt; a 3–4. oldal (fizetési feltételek, nyilatkozat) a
  persona képein látszik, tartalmilag nem ellenőriztük.
- **A „Save to Google Drive" gomb** tényleges viselkedése — a Chrome beépített nézegetője, a
  mockup-fázis korlátja (`nagy-terv` 14. megállapítás).
- **Valódi fájlrendszeres tárolás** — a mockup `DemoStorage`-t használ; a `_v1`/`_v2` és a
  mappanév-megfigyelések a `localStorage`-kulcsokból származnak.
- **A ténylegesen kinyomtatott papír**, **`prefers-reduced-motion`**, **Mac-billentyűk** — a
  futás Windows-Chrome-ban ment.
