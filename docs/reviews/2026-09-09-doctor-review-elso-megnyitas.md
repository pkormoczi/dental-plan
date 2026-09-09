# Doctor-review — `elso-megnyitas` — 2026-09-09

```
Dátum: 2026-09-09
Forgatókönyv: elso-megnyitas — István először látja az appot, cél nélkül, és megpróbálja elvégezni azt, amit a leggyakoribb dolgának gondol
User-teszt készültség: javítás után mehet (0 blokkoló, 4 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: —
Megállapítások lencsénként: István 13 / vizuális 2 / rontás 0 / a11y 0
Bizonyosság-eloszlás: megfigyelt 15 / erős következtetés 0 / feltételezés 0
Képernyőképek: docs/reviews/screens/2026-09-09-elso-megnyitas (28 persona + 13 reprodukciós kép, .gitignore-olt)
```

Az `elso-megnyitas` saját sablonja szerint: négy szekció a felfedezésről, utána a
„Nem javítandó, hanem Istvántól megkérdezendő" és az „Ami jól működik" szekció.

A `2026-09-05`-i futás óta a terület sok javítást kapott; a dedup-címkék ezt követik. A
korábbi jelentés 16 megállapításából **nyolc bizonyíthatóan javítva** — ezek az „Ami jól
működik" szekció végén, külön táblában.

---

## 1. Mit gondolt, mire való

István szavaival, a naplóból:

> „A cím és a legnagyobb, fekete »+ Új kezelési terv« gomb együtt egy pillanat alatt
> megmondja, hogy ez az Excelemet váltja."

A tízperces belenézés végén a saját összefoglalója:

> „Kezelési tervet és árajánlatot írni a páciensnek […] a terv magától mentődik
> piszkozatként […] a három lépéses sáv fent (Terv adatai → Kezelések → Előnézet és
> véglegesítés) végig megmondta, hol tartok."

Ez a kép a valós célt (`docs/PRODUCT.md` § Mi ez, § Napi flow) lényegében fedi. A
„piszkozat" szót elsőre helyesen tippelte meg („még nem kész, csak írom"), a
„véglegesítve" szót a Kezdőlap aktivitás-soraiból olvasta ki helyesen („kész,
kinyomtatható"). Amit **nem** ismert fel: hogy a mentett terv pillanatkép, hogy a
véglegesített verzió sosem íródik felül (a verziólánc fogalmát csak a páciens lapján, a
magyarázó sorból értette meg — ott viszont elsőre), és hogy a nyomtatvány szövegei a
Beállításokból jönnek.

## 2. Mit próbált elsőre, és sikerült-e

A „leggyakoribb feladat", amit magától választott: **meglévő pácienshez terv, árengedmény,
előleg, nyomtatvány, véglegesítés** — a termék fő flow-ja. 29 művelettel, a 25–30-as
kereten belül:

| # | Művelet | Eredmény |
|---|---|---|
| 1 | Kezdőlap | Megértette a célt, a „+ Új kezelési terv"-et azonnal megtalálta |
| 2 | „+ Új kezelési terv" | Az „Új terv indítása" választót elsőre megértette |
| 3–4 | „Szabó" keresés + Enter | Sikerült; a Terv adatai lapon minden adat kitöltve |
| 5 | Született mező | Az amerikai dátumsorrend megakasztotta (2 mp) |
| 6 | Terv adatai görgetés | Nyelv/pénznem/orvos érthető; a **kiadás dátuma tegnapi** |
| 7 | „Tovább a terv szerkesztőhöz" | A „piszkozat" + „Automatikusan mentve" megnyugtatta |
| 8 | Fejléc-kuka | Felirat nélküli, **nem merte megnyomni** |
| 9–10 | „koron" + Enter | **Rossz tétel:** „Korona felvágás eltávolítás /db" került a tervbe |
| 11 | Sor törlése | Sikerült; a visszavonás-sávot nem vette észre |
| 12 | „cirkon" | Egy pontos találat; az „Egyedi tétel" ajánlatot itt fedezte fel |
| 13 | Fog: „16, 17" | A **Db magától 2 lett** — először megijedt, aztán tetszett |
| 14 | Ajánlati ár: 125000 | A régi érték kicserélődött; „Kedvezmény: 20 000 Ft" megjelent |
| 15 | Gépelés közben | **Az elrendezés elugrott**, amikor a „−7%" jelvény megjelent |
| 16 | Sávos árú tétel | A narancs „≈" jelet nem értette, nem merte megnyomni |
| 17 | Fogszám a Db mezőbe | **36 db, 1 618 000 Ft, figyelmeztetés nélkül** |
| 18 | Javítás | Gyors, itt nem akadt el |
| 19 | Böngésző-frissítés | Minden megmaradt — megnyugodott |
| 20–21 | Előnézet | A checklist-legenda és a „Pótlás: …" mondat tetszett |
| 22 | Összesítés olvasása | **A kedvezmény nincs a papíron** — ezt nem tudta előre |
| 23 | Böngésző Vissza | Működött, adat nem veszett |
| 24–26 | Előleg 100 000 | **A „Fennmaradó rész" a képernyő alá esett**, az End nem segített |
| 27 | Vissza az előnézetre | **A terv azonosítója megváltozott** (3187kd → 87094x) |
| 28 | „Véglegesítés és mentés" (dupla katt) | Egy verzió jött létre; a sikerképernyőn ott a Letöltés |
| 29 | „Korábbi tervek" | A verzió-magyarázó sor „pontosan megválaszolta azt a kérdést, ami épp bennem volt" |

**Befejezte-e:** igen, végig, segítség nélkül, és a nyomtatható dokumentumhoz is eljutott —
a korábbi futással ellentétben **kerülőút nélkül**, mert a sikerképernyőn már ott van a
„Megnyitás külön" és a „Letöltés". A kikerülő dokumentum viszont rossz kiadási dátumot és
más azonosítót visel, mint amit az előnézetben látott.

## 3. Hol akadt el

Súlyosság szerint rendezve, minden lencse együtt.

### 1. A tétel-kereső első találata az ellentétes beavatkozás — az Enter azt veszi fel

- Súlyosság: **Súlyos** (rossz tartalmú árajánlat keletkezik; a doki a páciens előtt gépel)
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 6 (kereső)
- Bizonyosság: **megfigyelt** — kétszer, két külön kifejezéssel reprodukálva:
  `R2-koron-talalati-sorrend.png` („koron" → kiemelt első találat **„Korona felvágás
  eltávolítás /db" 10 000 Ft**, a Fémkerámia 95 000 és a Zirkonkerámia 135 000 jóval
  lejjebb); `R11-gyokertomes-sorrend.png` („gyokertomes" → kiemelt első találat
  **„Gyökértömés eltávolítása /csatorna" 20 000 Ft**, alatta a tényleges „Gyökértömés
  csatornaszámtól függően"). Az Enter tényleg felveszi a kiemeltet: a próba után a sor
  „Korona felvágás eltávolítás /db", 10 000 Ft (`R3-enter-rossz-tetel-es-tagolatlan-ar.png`).
- Dedup: **ISMÉT** (`2026-09-05-doctor-review-elso-megnyitas.md`, 11. megállapítás — „A
  »koron« keresésre a végleges koronák nem az első képernyőn vannak"). A keresőt azóta
  érintette az `e68545b` (`kereso-fogszam-tokenezes`), a találati rangsor nem változott.
- Helyzet és reprodukció: üres terv → „koron" (vagy „gyokertomes") → Enter.
- Orvosi elvárás: „Ha azt írom, »koron«, akkor a koronát ajánlja fel, ne a korona
  eltávolítását. Az eltávolítás a ritkább eset."
- Tapasztalt probléma: a rangsor a rövidebb/eltávolító tételt hozza előre. Az eltávolítás
  és a pótlás **egymás ellentéte**, és az áruk nagyságrendje is más (10 000 vs 135 000 Ft).
- Napi hatás: az árajánlaton egy 10 000 Ft-os eltávolítás áll egy 135 000 Ft-os korona
  helyett. Ha a doki nem olvassa vissza a sort, ez a papírra kerül.
- Jelenlegi kerülőút: István kimondta, hogy „mostantól nem nyomok Entert, hanem mindig
  végigolvasom és egérrel kattintok" — ez pont a `PRODUCT.md` § Napi flow billentyűzetes
  előnyét számolja fel.
- Javasolt javítási irány: a rangsor a szó eleji, teljes-token egyezést hozza előre, és az
  „eltávolítás / felvágás / visszabontás" jellegű tételek kapjanak rangsor-büntetést a
  keresésben (ne rejtsük el őket, csak ne ők legyenek az Enter alapértelmezése).
- Siker mércéje: a „koron", „gyokertomes", „tomes" keresésre az Enter azt a tételt veszi
  fel, amit a doki a szóval megnevezett; az eltávolító párja megmarad a listában, lejjebb.
- Backlog: `kereso-talalati-rangsor-eltavolitas`
- Döntés: backlog kereso-talalati-rangsor-eltavolitas (2026-09-09)

### 2. A kiadás dátuma és az érvényesség egy nappal korábbi éjfél és hajnali 2 között

- Súlyosság: **Súlyos** (rossz keltezésű szerződéses dokumentum hagyja el a gépet)
- Gyakoriság: **ritka helyzet** (helyi 00:00–02:00 nyáron, 00:00–01:00 télen — de azon
  belül *minden* tervnél, és a persona az első futáson beleesett)
- Lencse: István
- Érintett folyamat: 2, 10 (dátumok), 14 (kiadás)
- Bizonyosság: **megfigyelt**, kétszeresen:
  - a persona saját futásán (`05-terv-adatai-also-resz.png`): „Kiadás dátuma **09/08/2026**
    → 2026. szeptember 8.", miközben ugyanazon a képernyőn az „Automatikusan mentve
    **2026. 09. 09.** 01:49" a helyes helyi napot mutatja (`13-gyoker-kereses.png`); a
    nyomtatvány fejléce is „2026.09.08." (`18-elonezet.png`), és a mentett mappa
    „2026-09-08_v1" (`26-veglegesites-dupla-kattintas.png`);
  - determinisztikusan, hamisított órával (`R1-datum-utc-eltolas.png`): helyi péntek
    2026-09-11 00:30 mellett az új terv „Kiadás dátuma 2026-09-10 / 2026. szeptember 10."
    és „Érvényes eddig 2026-12-09" — mindkettő egy nappal korábbi;
  - kód-szinten: `app/src/domain/date.ts` `todayIso()` = `new Date().toISOString().slice(0,10)`,
    azaz **UTC-naptári nap**. Ugyanabban a fájlban létezik a helyes `localIsoDate()`
    segéd, de csak a relatív időjelzés használja. A `todayIso()` írja a `Plan.keltezes`-t
    és az `ervenyesIg`-et (`domain/blankPlan.ts`), és ez kerül a mentett verzió
    mappanevébe is.
- Helyzet és reprodukció: helyi 00:00–02:00 között bármilyen új terv indítása.
- Orvosi elvárás: „Ami ma készül, azon a mai dátum álljon. Az érvényességet felolvasom a
  páciensnek."
- Tapasztalt probléma: a program egy képernyőn belül két különböző napot mond; a
  szerződéses adat (keltezés, érvényesség) a rosszabbik.
- Napi hatás: a papíron tegnapi keltezés; az érvényesség egy nappal rövidebb. Vitás
  helyzetben a papír dátuma nem egyezik azzal, amikor a beszélgetés történt.
- Jelenlegi kerülőút: kézzel átírni a Kiadás dátuma mezőt minden ilyen tervnél — István
  szerint „pont az a plusz kattintás, amit nem szeretnék".
- Javasolt javítási irány: a `todayIso()` a helyi naptári napot adja vissza (a fájlban már
  meglévő `localIsoDate(new Date())`); az `addDaysIso`/`formatLongDate` UTC-rögzítése
  maradhat, mert azok tiszta naptári dátumon dolgoznak.
- Siker mércéje: egy 00:30-kor indított terv keltezése a helyi mai nap, és megegyezik az
  „Automatikusan mentve" sor napjával és a mentett mappa nevével.
- Backlog: `kiadas-datuma-helyi-nap`
- Döntés: javítva kiadas-datuma-es-az-ervenyesseg (2026-09-09)

### 3. A terv azonosítója minden előnézet-belépéskor újra generálódik

- Súlyosság: **Súlyos** (a páciensnek megmutatott/letöltött papír más iktatószámot visel,
  mint a végül mentett terv)
- Gyakoriság: **minden olyan tervnél, ahol a doki visszamegy javítani** — azaz
  gyakorlatilag minden nem-triviális tervnél
- Lencse: István
- Érintett folyamat: 14 (előnézet, kiadás), 16
- Bizonyosság: **megfigyelt** — a persona futásán az első előnézet fejléce „**3187kd** · v1
  · 2026.09.08." (`18-elonezet.png`), a másodiké ugyanazé a tervé „**87094x** · v1"
  (`25-elonezet-vegleges-elott.png`), és a mentett mappa is `Korona és hídpótlások_87094x`
  (`26-veglegesites-dupla-kattintas.png`). Magam is reprodukáltam: az előnézet letöltési
  fájlneve `PISZKOZAT-kezelesi-terv-Kovács-János-8gh997.pdf`, egy „Vissza a
  szerkesztőbe" → „Előnézet" kör után `…-w1z19z.pdf`
  (`R4-azonosito-valtozas-masodik-elonezet.png`). Kód-szinten:
  `app/src/pages/PreviewPage.tsx` a friss lánc `tervId`-jét egy **`useRef`**-ben
  (`ujLancTervIdRef`) stabilizálja, ami csak EGY mountra érvényes — a saját kommentje is
  „az előnézeten belül STABIL"-t ígér; a lapelhagyás után a `feloldKovetkezoAzonosito`
  új azonosítót generál.
- Helyzet és reprodukció: új terv → Előnézet (azonosító #1) → „Vissza a szerkesztőbe" →
  Előnézet (azonosító #2).
- Orvosi elvárás: „Ez a szám nekem iktatószám. Egy tervnek egy száma van, attól a
  pillanattól, hogy elkezdtem."
- Tapasztalt probléma: ha a doki az első előnézetet letölti vagy megmutatja a páciensnek,
  majd visszamegy egy elgépelést javítani, a véglegesített papíron már más szám áll.
- Napi hatás: a páciensnél lévő (esetleg lefotózott) előzetes papír és a gépben lévő terv
  száma nem egyezik; a doki nem tudja megmagyarázni, miért.
- Jelenlegi kerülőút: nincs.
- Javasolt javítási irány: a friss lánc `tervId`-je a piszkozathoz kötődjön (a
  `plan.tervId` mezőbe íródjon az első foglaláskor), ne az előnézet-komponens
  élettartamához — így a remount ugyanazt találja.
- Siker mércéje: ugyanahhoz a piszkozathoz tetszőleges számú előnézet-belépés után is
  ugyanaz az azonosító tartozik, és a mentett verzió ezt kapja.
- Backlog: `terv-azonosito-elonezetek-kozott-stabil`
- Döntés: backlog terv-azonositoja-minden-elonezet-belepeskor (2026-09-09)

### 4. A darabszámnak nincs felső korlátja és nincs józan-ész-ellenőrzése

- Súlyosság: **Súlyos** (nagyságrenddel hibás árajánlat keletkezik, jelzés nélkül)
- Gyakoriság: **naponta többször** (ez a „fogszámot a rossz mezőbe" elgépelés
  következménye, amit a persona magától elkövetett)
- Lencse: István
- Érintett folyamat: 8 (mennyiség), 11 (ellenőrző jelzések), 14
- Bizonyosság: **megfigyelt** — a persona a 36-os fogszámot a Db mezőbe írta: 36 db
  gyökértömés, **1 618 000 Ft** végösszeg, semmilyen jelzés
  (`15-fogszam-a-db-mezobe.png`). Magam 136-tal reprodukáltam: **1 360 000 Ft**, a mezőn
  nincs `min`/`max` attribútum, és az előnézet checklistje csak a hiányzó fogszámot
  említi, a darabszámot nem. Kód-szinten: `app/src/domain/veglegesitesOr.ts` 24 ellenőrzése
  között nincs mennyiség-vizsgálat.
- Dedup: **ÚJ**
- Helyzet és reprodukció: bármely soron a Db mezőbe 36 → Tab → Előnézet.
- Orvosi elvárás: „Egy fogra egy korona. Ha 36-ot írok be, az szinte biztosan a fogszám
  akart lenni — legalább kérdezzen rá."
- Tapasztalt probléma: a program a 36 db-ot ugyanolyan csendben fogadja el, mint az 1-et.
  A hibát csak a végösszeg nagysága árulja el — a personát is ez mentette meg.
- Napi hatás: két páciens között, sietve, egy másfél milliós ajánlat kerülhet a papírra.
- Jelenlegi kerülőút: minden mentés előtt kézzel átolvasni a Db oszlopot.
- Javasolt javítási irány: puha (nem blokkoló) checklist-tétel egy küszöb (pl. 8) feletti
  darabszámra, a sor megnevezésével és „Kezelések" ugrógombbal — ugyanabban a mintában,
  mint a már meglévő `hianyzo-fogszam` tétel.
- Siker mércéje: 8 fölötti darabszámnál az előnézeten jelzés áll, amiről egy kattintással
  a sorhoz lehet ugrani; a véglegesítés nem blokkolt.
- Backlog: `darabszam-ellenorzes`
- Döntés: backlog darabszamnak-nincs-felso-korlatja-es (2026-09-09)

### 5. A kedvezmény nem jelenik meg a nyomtatványon, és a szerkesztő nem mondja meg előre

- Súlyosság: **Közepes** (a doki rosszul számol a legerősebb érvével)
- Gyakoriság: **minden kedvezményes tervnél**
- Lencse: István
- Érintett folyamat: 8 (kedvezmény), 14
- Bizonyosság: **megfigyelt** — a szerkesztő „Kedvezmény: 20 000 Ft"-ot ír zölden
  (`23-fennmarado-resz.png`), a nyomtatvány Összesítés blokkjában csak „Végösszeg
  288 000 Ft" áll, a kedvezményről egy szó sincs (`19-elonezet-gorgetes.png`).
- Dedup: **ÚJ**
- Helyzet és reprodukció: ajánlati ár < listaár → Előnézet → Összesítés.
- Orvosi elvárás: „Az árengedmény a legerősebb érvem. Ha nincs a papíron, otthon már nem
  emlékszik rá."
- Tapasztalt probléma: **nem az, hogy nem nyomtatódik** — ez a `PRODUCT.md` § A
  nyomtatvány szerződéses dokumentum szándéka —, hanem hogy a doki ezt **csak az
  előnézetben, utólag tudja meg**. A szerkesztő zöld „Kedvezmény" sora azt sugallja, hogy
  ez a terv része lesz.
- Napi hatás: a doki azt hiszi, a papír tartalmazza az engedményt, és nem mondja el
  szóban; vagy kézzel ráírja a kinyomtatott lapra.
- Jelenlegi kerülőút: szóban elmondani.
- Javasolt javítási irány: a szerkesztő „Kedvezmény: 20 000 Ft" sora mellé egy halk
  magyarázó fél mondat („a nyomtatványon nem jelenik meg külön — a végösszeg már
  tartalmazza"). Ez nem nyúl a nyomtatványhoz, csak megszünteti a téves várakozást.
  **Validálandó kérdés Istvánnak** (nem kód-döntés): akar-e olyan tervet, ahol a
  kedvezmény tételesen megjelenik a papíron.
- Siker mércéje: a doki az előnézet előtt tudja, mi lesz a papíron a kedvezményből.
- Backlog: `kedvezmeny-nem-nyomtatodik-jelzes`

### 6. A rendelő e-mail címe elválasztójellel törik a nyomtatvány fejlécében

- Súlyosság: **Közepes** (a papírról lemásolt e-mail cím hibás lesz)
- Gyakoriság: **minden nyomtatványon**
- Lencse: vizuális
- Érintett folyamat: 14
- Bizonyosság: **megfigyelt** — `18-elonezet.png` és `19-elonezet-gorgetes.png` fejléce:
  „+36 70 617 3172 · istvan@drmando-" / „ki.hu", azaz a képernyőn (és a papíron)
  **`istvan@drmando-ki.hu`** olvasható. Kód-szinten: `app/src/pdf/tervDocument/Chrome.tsx:31`
  a `{telefon} · {email}` futamot egy szűk oszlopba teszi, és a projektben **sehol nincs
  `Font.registerHyphenationCallback`** — a `@react-pdf/renderer` alapértelmezett
  szóelválasztása vág bele.
- Dedup: **ÚJ**
- Helyzet és reprodukció: bármely előnézet, a fejléc középső contact-blokkja.
- Orvosi elvárás: „A rendelő elérhetősége a papíron legyen pontosan az, ami."
- Tapasztalt probléma: a beszúrt kötőjel az e-mail cím részének látszik. Ugyanez a
  mechanizmus bármelyik hosszú beavatkozás-nevet és a webcímeket is elvághatja.
- Napi hatás: a páciens rossz címre ír, vagy feladja és telefonál.
- Jelenlegi kerülőút: nincs; a doki nem is tudja, hogy ez történik.
- Javasolt javítási irány: `Font.registerHyphenationCallback((word) => [word])` a
  nyomtatvány betöltésekor — egy sor, minden szövegfutamra hat. Ha valahol tényleg kell
  törés, az ott expliciten kérhető.
- Siker mércéje: a fejlécben az e-mail cím kötőjel nélkül olvasható.
- Backlog: `pdf-elvalasztas-tiltasa`

### 7. Az összegmezők tagolatlanok, közvetlenül a tagolt listaár mellett

- Súlyosság: **Közepes** (nullákat kell számolni pénzügyi mezőben)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 8, 13 (előleg)
- Bizonyosság: **megfigyelt** — egy soron belül „Listaár **10 000 Ft**" és „Ajánlati ár
  **10000**" (`R3-enter-rossz-tetel-es-tagolatlan-ar.png`); ugyanez „125000" mellett
  „135 000 Ft" (`23-fennmarado-resz.png`), és az Előleg mezőben „100000" a „288 000 Ft"
  mellett (`22-eloleg-osszeg.png`).
- Dedup: **ÚJ** (a `3a25e7f` `osszeg-tagolas-kerdes` a *megjelenített* összegeket tagolta
  négyjegyűtől; a beviteli mezők nyers értéke kimaradt)
- Helyzet és reprodukció: bármely sor Ajánlati ár mezője, illetve az Előleg mező.
- Orvosi elvárás: „Ha mellette 10 000 Ft van, akkor a mezőben is annyi legyen."
- Tapasztalt probléma: ugyanaz a szám kétféle alakban, egymás mellett. Hatjegyű árnál
  („125000") a doki a nullákat számolja.
- Napi hatás: lassítás és elgépelés-kockázat pont a legdrágább soroknál.
- Jelenlegi kerülőút: a szomszédos Összeg oszlopból ellenőrizni.
- Javasolt javítási irány: a mező **fókuszon kívül** tagoltan mutassa az értéket, gépelés
  közben maradjon nyers (ez a `NumberField` commit-on-blur mintájába illik, a
  billentyűzetes ciklust nem töri).
- Siker mércéje: a nem szerkesztett Ajánlati ár és Előleg mező ugyanúgy néz ki, mint a
  mellette lévő listaár.
- Backlog: `osszegmezo-tagolas-fokuszon-kivul`

### 8. Az előleg bekapcsolásakor a „Fennmaradó rész" a képernyő alá esik

- Súlyosság: **Közepes** (a doki azt keresi, amit fel akar olvasni a páciensnek)
- Gyakoriság: **minden előleges tervnél**
- Lencse: István
- Érintett folyamat: 13 (előleg)
- Bizonyosság: **megfigyelt** — a persona beírta a 100 000-et, és a „Fennmaradó rész" nem
  látszott; az End billentyű a mezőben állva nem csinált semmit
  (`22-eloleg-osszeg.png`, `23-fennmarado-resz.png`), csak üres helyre kattintás után
  tudott odagörgetni (`24-eloleg-eredmeny.png`). Magam megmértem
  (`R12-fennmarado-resz-kepernyo-alatt.png`): kétsoros tervnél, 1440×900-on a „Fennmaradó
  rész" felirat **y=889**, a viewport 900 — a sor a hajtás alatt kezdődik, az oldal 962 px
  magas, és az app `scrollY=0`-n marad, nem görget oda.
- Dedup: **ÚJ**
- Helyzet és reprodukció: kétsoros terv → „Előleg feltüntetése a nyomtatványon" pipa →
  összeg beírása.
- Orvosi elvárás: „Az előleg és a maradék az, amit felolvasok. Ne kelljen keresgélni."
- Tapasztalt probléma: a bekapcsolt kapcsoló eredménye a látható területen kívül jelenik
  meg; a mezőben álló kurzor miatt az End sem görget.
- Napi hatás: minden előleges tervnél egy kattintás + görgetés, páciens előtt.
- Javasolt javítási irány: a pipa bekapcsolásakor görgessük láthatóvá az előleg-blokkot
  (`scrollIntoView`), vagy a „Fennmaradó rész" kerüljön közvetlenül a Mindösszesen alá,
  a kapcsolók fölé.
- Siker mércéje: az előleg beírása után a fennmaradó összeg görgetés nélkül látszik.
- Backlog: `eloleg-fennmarado-lathatosag`

### 9. Az elrendezés 11 px-t ugrik, amikor az eltérés-jelvény megjelenik

- Súlyosság: **Közepes** (gépelés közben mozdul el, amire kattintani akarna)
- Gyakoriság: **minden kedvezményes sornál**
- Lencse: István
- Érintett folyamat: 8
- Bizonyosság: **megfigyelt** — a persona gépelés közben érzékelte („az egész sor és a
  fejléc oszlopai odébb csúsztak pár pixellel", `13-gyoker-kereses.png`). Tiszta A/B
  méréssel megerősítve, friss soron: érintetlen sor Fog=634 / Db=766 / Listaár=854 /
  Ajánlati ár=958 / Beavatkozás-mező 445 px → a „−7%" jelvény commitja után Fog=**623** /
  Db=**755** / Listaár=**843** / Ajánlati ár=**947** / Beavatkozás-mező **434 px**, azaz
  minden oszlop **11 px-t balra**.
- Dedup: **ÚJ** — de közvetlenül az `a69fd3d` (`kezelesi-sor-arcella-finomitas`,
  2026-09-09 01:42, a persona futása előtt egy perccel) által *célzott* jelenség. Az a
  commit külön cellát adott a jelvénynek azzal a szándékkal, hogy „mindig ugyanaz a hely
  foglalt, jelvény nélkül is" — a fenntartott hely viszont keskenyebb a tényleges
  jelvénynél, ezért 11 px maradt.
- Helyzet és reprodukció: friss sor felvétele → az Ajánlati ár átírása a listaár alá → Tab.
- Orvosi elvárás: „Ne mozogjon alattam a felület, amíg gépelek."
- Tapasztalt probléma: a jelvény cellája jelvény nélkül keskenyebb, mint a jelvénnyel;
  megjelenéskor a maradékot adó Beavatkozás-oszlop szűkül.
- Napi hatás: az első kedvezménynél elcsúszik a kattintás célpontja.
- Javasolt javítási irány: a jelvény-cellának adjunk fix minimális szélességet (a
  leghosszabb lehetséges címke, pl. „+100%" szélességét), ne a tartalom szabja meg.
- Siker mércéje: a „−7%" megjelenése előtt és után a fejléc-oszlopok bal széle azonos.
- Backlog: `elteres-jelveny-cella-fix-szelesseg`

### 10. A dátummezők amerikai sorrendben, a magyar alak alattuk

- Súlyosság: **Közepes** (bizonytalanít: „december 4. vagy április 12.?")
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 2, 10
- Bizonyosság: **megfigyelt** — „Született **04/22/1985**", alatta „1985.04.22."
  (`04-enter-utan-paciens.png`); „Kiadás dátuma **09/08/2026**", alatta „2026. szeptember 8.";
  „Érvényes eddig **12/07/2026**", alatta „2026. december 7." (`05-terv-adatai-also-resz.png`).
  A kijelzett sorrend a Chrome felület-nyelvétől függ; az izolált teszt-Chrome angol.
- Dedup: **ISMÉT** (`2026-09-05`, 6. megállapítás). A `9275791`
  (`datummezo-formatum-inkonzisztens`) azóta **odatette a magyar alakot a mező alá** — ez
  valódi javulás, István most 2 másodperc alatt feloldotta —, de a natív mező sorrendje
  változatlan, és a persona továbbra is megakadt rajta.
- Helyzet és reprodukció: Terv adatai lap, bármely dátummező.
- Orvosi elvárás: „Magyar sorrend, vagy legalább egyértelmű, melyik a hónap."
- Tapasztalt probléma: két alak egymás alatt; a szerkeszthető a rosszabbik.
- Napi hatás: dátumot nem mer felolvasni/átírni páciens előtt.
- Jelenlegi kerülőút: a szürke sort olvassa, nem a mezőt — ezt István ki is mondta.
- Javasolt javítási irány: `lang="hu"` a natív mezőn (kézzel ellenőrizendő, hogy a Chrome
  ettől magyar sorrendre vált-e), vagy saját, magyar sorrendű dátumbevitel. A böngésző-
  nyelvfüggés miatt a mérés a `/manual-checks` hatásköre.
- Siker mércéje: a mező és az alatta lévő szöveg ugyanabban a sorrendben mutatja a napot.
- Backlog: a `9275791` folytatása (meglévő terület)
- Döntés: backlog datummezok-amerikai-sorrendben-magyar-alak (2026-09-09)

### 11. A „Csak ajánlat" felirat mást ígér, mint amit csinál

- Súlyosság: **Közepes** (jogi következményű kapcsoló félreérthető főneve)
- Gyakoriság: **minden ajánlatnál**
- Lencse: István
- Érintett folyamat: 15
- Bizonyosság: **megfigyelt** — a persona szavaival: „elsőre a »csak ajánlat« nekem azt
  jelenti, hogy »nem kötelező érvényű«; a magyarázó fél mondatból viszont kiderült, hogy
  valójában arról szól, hogy nem kerül rá aláírás-oldal. Ez a kettő nem ugyanaz a
  fejemben." (`25-elonezet-vegleges-elott.png`)
- Dedup: **ÚJ** (a `backlog/idea/later/ajanlat-allapot-visszahivas.md` az ajánlat
  *állapotáról* szól, nem a feliratról)
- Helyzet és reprodukció: Előnézet → a jelölőnégyzet felirata.
- Orvosi elvárás: „Ha azt írja, »csak ajánlat«, azt hiszem, a papír jogi súlya változik."
- Tapasztalt probléma: a teljes felirat („Csak ajánlat — a nyilatkozat és aláírás oldal
  nélkül") pontos, de a **főnév megy előre**, és a doki azt olvassa el először.
- Napi hatás: a doki vagy nem meri bekapcsolni, vagy rosszul magyarázza a páciensnek.
- Jelenlegi kerülőút: elolvasni a gondolatjel utáni részt is.
- Javasolt javítási irány: a művelet kerüljön előre: „Aláírás-oldal nélkül (csak
  tájékoztató ajánlat)".
- Siker mércéje: a felirat első fele azt mondja meg, mi változik a papíron.
- Backlog: `csak-ajanlat-felirat-sorrend`

### 12. Az elsődleges (sötét) gomb nem a doki következő lépése

- Súlyosság: **Közepes** (a hangsúlyos gomb elviszi a figyelmet, és kockázatosabb is)
- Gyakoriság: **minden véglegesítés után, és minden páciens-lapon**
- Lencse: vizuális
- Érintett folyamat: 14, 16, 17
- Bizonyosság: **megfigyelt** — a sikerképernyőn a sötét, elsődleges gomb az „**Új terv
  indítása**", miközben a most befejezett munka természetes folytatása („Megnyitás
  külön" / „Letöltés") halvány másodlagos gombpár fölötte
  (`26-veglegesites-dupla-kattintas.png`). A páciens lapján a tervsor elsődleges, sötét
  gombja az „**Új verzió**", a „Megnézés" a halvány (`27-korabbi-tervek.png`).
- Dedup: **ÚJ**
- Helyzet és reprodukció: véglegesítés utáni képernyő; illetve páciens lapja → Kezelési
  tervek fül.
- Orvosi elvárás: „Amikor elmentettem, a papírt akarom kiadni, nem új tervet kezdeni.
  Amikor egy régi tervre nézek, először meg akarom nézni, nem újat csinálni belőle."
- Tapasztalt probléma: a vizuális hangsúly a ritkább (és a verziólánc szempontjából
  elkötelezőbb) műveleten van. István az „Új verzió"-t kifejezetten „nem merte megnyomni".
- Napi hatás: egy elvétett kattintás a páciens lapján fölösleges verziót indít; a
  sikerképernyőn a doki a papír helyett új tervet kezd.
- Javasolt javítási irány: a sikerképernyőn a „Letöltés" (vagy „Megnyitás külön") legyen
  az elsődleges, az „Új terv indítása" másodlagos; a páciens lapján a „Megnézés" az
  elsődleges, az „Új verzió" másodlagos.
- Siker mércéje: mindkét képernyőn a leggyakoribb következő lépés a hangsúlyos gomb.
- Backlog: `elsodleges-gomb-hangsuly-siker-es-pacienslap`

### 13. Belső kód a felületen: „Páciensmappa: Szabó-Anna_szaban" és a „Mappa:" sor

- Súlyosság: **Kis** (kozmetikai, de a doki attól tart, hogy a papírra kerül)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 2, 14
- Bizonyosság: **megfigyelt** — „Páciensmappa: `Szabó-Anna_szaban`" írógép-betűvel a Terv
  adatai lapon (`04-enter-utan-paciens.png`); „Mappa: `Szabó-Anna_szaban / Korona és
  hídpótlások_87094x / 2026-09-08_v1`" a sikerképernyőn (`26-veglegesites-dupla-kattintas.png`).
  A persona kimondta: „Nem tudom, mi ez és mit kezdjek vele; olyan, mint egy fájlnév."
- Dedup: **ISMÉT** (`2026-09-05`, 9. megállapítás). A `de3374a` (`belso-kodok-helyett-nevek`)
  a PDF-nézegető címét megjavította — most „Szabó Anna — Korona és hídpótlások" —, ez a
  két hely maradt.
- Orvosi elvárás: „Ne lássak fájlneveket. Ha tudnom kell, hol van, mondja emberi nyelven."
- Tapasztalt probléma: az aláhúzásos, hatjegyű toldalék semmit nem mond a dokinak, és
  bizalmatlanságot kelt („ez kerül a papírra?").
- Napi hatás: nincs közvetlen kár, de minden tervnél ott van a szeme előtt.
- Jelenlegi kerülőút: figyelmen kívül hagyni.
- Javasolt javítási irány: a Terv adatai lapon a sor elhagyható (a páciens neve fölötte
  áll); a sikerképernyőn „Szabó Anna / Korona és hídpótlások / 1. verzió" alakban, a
  `_szaban`/`_87094x` toldalék nélkül — a tényleges útvonal maradhat egy „Részletek" mögött.
- Siker mércéje: a doki egyetlen aláhúzásos belső kódot sem lát a fő útvonalon.
- Backlog: a `de3374a` folytatása (meglévő terület)

### 14. A sortörlés visszavonás-sávja ott van, de nem olvasódik ajánlatnak

- Súlyosság: **Kis** (a biztonsági háló megvan, de nem ér el a dokihoz)
- Gyakoriság: **minden téves törlésnél**
- Lencse: István
- Érintett folyamat: 9 (javítás, törlés, visszavonás)
- Bizonyosság: **megfigyelt.** István azt írta: a sor törlése „egy kattintás, azonnal
  eltűnt, **kérdés és visszavonás nélkül**". **Pontosítás:** visszavonás **van** — a
  törölt sor helyén egy halvány, meleg hátterű táblasor jelenik meg „Sor törölve: Korona
  felvágás eltávolítás /db" szöveggel és egy „Visszavonás" gombbal a sor jobb szélén, és
  a persona saját képernyőképén (`09-sor-torles-utan.png`) tisztán látszik. Megmértem:
  1180×38 px, `rgb(254,244,235)` háttér, 8 másodpercig él
  (`PhaseSection.tsx`, `setTimeout(…, 8000)`). István tehát ránézett és mégsem
  regisztrálta — ez felfedezhetőségi megállapítás, nem hiányzó funkció.
- Dedup: **ÚJ**
- Helyzet és reprodukció: sor törlése a sorvégi kukával.
- Orvosi elvárás: „Ha véletlenül törlök, legyen egy pár másodperces visszaút — és lássam."
- Tapasztalt probléma: a sáv **állapotközlésnek néz ki, nem ajánlatnak**: szürke szöveg
  halvány háttéren, a „Visszavonás" pedig csendes, másodlagos szürke gomb a sor **túlsó
  végén**, kb. 1100 px-re attól a kukától, ahova a doki szeme épp néz. Egy további csapda:
  ha a tétel-kereső legördülője nyitva van (ami közvetlenül tételfelvitel után a
  természetes állapot), a legördülő **eltakarja** a sávot — ezt is reprodukáltam
  (`R7-sor-torles-visszavonas-csik.png`).
- Napi hatás: a doki azt hiszi, a törlés visszafordíthatatlan, és óvatosabban dolgozik a
  kelleténél; 8 másodperc múlva tényleg az is.
- Jelenlegi kerülőút: újra felvenni a tételt kézzel.
- Javasolt javítási irány: a „Visszavonás" gomb kerüljön közel a törlés helyéhez (a sor
  bal oldalára vagy a kuka alá), és a sáv kapjon valamivel erősebb kontrasztot; a
  legördülő ne takarhassa (a sáv rendereljen a popover fölé, vagy a törlés zárja a
  legördülőt).
- Siker mércéje: egy sietős felhasználó a törlés után rátalál a visszavonásra anélkül,
  hogy keresné.
- Backlog: `sortorles-visszavonas-eszrevehetoseg`

### 15. Felirat nélküli ikonok, amiket a doki tudatosan kikerül

- Súlyosság: **Kis** (létező funkciók maradnak használatlanul)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 8, 9
- Bizonyosság: **megfigyelt** — a persona négyet nevezett meg és mindegyiket kihagyta: a
  fejléc-kuka az „Előnézet" mellett (`06-terv-szerkeszto.png`), a sorvégi „…"
  (`R3-enter-rossz-tetel-es-tagolatlan-ar.png`), a narancs „≈" (`14-savos-ar-tetel.png`),
  és a listaárra visszaállító nyíl (`13-gyoker-kereses.png`). Saját szavai a napló végén:
  „ezeket ma egyszerűen kikerültem, és holnap is ki fogom, tehát ha hasznos funkciók
  vannak mögöttük, azok számomra nem léteznek."
- Dedup: **ISMÉT** (`2026-09-05`, 12. megállapítás). A `4fa3c0d` + `0992e63`
  (`ikon-gombok-tooltip`) azóta **minden felirat nélküli ikon-gombnak tooltipet adott**, és
  a gépi nevek tényleg ott vannak („Piszkozat eldobása", „Becsült ár", „Ajánlati ár
  visszaállítása a listaárra", „1. sor — további műveletek"). A tooltip viszont hoverre
  jelenik meg, és a `persona.md` szerint István **nem visz egeret ikon fölé, hogy
  megnézze, mit ír ki** — ezért a felfedezhetőség számára nem javult.
- Orvosi elvárás: „Ha egy gomb törölhet valamit, legyen odaírva."
- Tapasztalt probléma: a tooltip a *tudó* felhasználót szolgálja ki; az elsőt használót nem.
  A fejléc-kuka külön kockázat: közvetlenül az elsődleges „Előnézet" gomb mellett áll.
- Napi hatás: a fogtérkép, a becsült ár kapcsolója és a sor-menü gyakorlatilag nem létezik
  a doki számára.
- Jelenlegi kerülőút: nem nyúl hozzájuk.
- Javasolt javítási irány: a fejléc-kuka kapjon szöveges feliratot („Piszkozat eldobása")
  vagy kerüljön el az „Előnézet" mellől; a „≈" mellé kerüljön a „becsült" szó a
  szerkesztőben is (István az előnézetben értette meg, mit jelent).
- Siker mércéje: a doki hover nélkül tudja, mit csinál a fejléc-kuka és a „≈".
- Backlog: `fejlec-kuka-felirat-es-becsult-ar-szo`

### Rontás-próba: négy vizsgálat, nulla új hiba

Mind a négy előírt rontás-lépés lefutott, és mind **jól viselkedett** — a részletek az
„Ami jól működik" szekcióban:

1. **Két fül egyszerre** — ütközés-ablak, összehasonlítással.
2. **Frissítés mentés közben** — a mentés befejeződik, a Kezdőlapon visszaesési kártya.
3. **Gyors dupla kattintás a véglegesítésen** — egy verzió jött létre.
4. **Platform-felirat** — a `.tsx` forrásokban **nincs egyetlen `Ctrl`/`Cmd`/`⌘`/`Alt`/
   `Option` felirat sem**; az egyetlen felhasználónak szóló billentyűszöveg a fogtérkép
   „Enterrel/szóközzel" súgója (`DentalChart.tsx:148–149`), ami Macen ugyanúgy olvasható.
   A két `ctrlKey`/`metaKey` találat (`LineRow.tsx:368`, `PhaseSection.tsx:234`)
   módosító-őr, nem felirat.

**Konzol:** a bejárás alatt és a saját reprodukcióim alatt is tiszta — csak a Vite HMR két
`debug` sora és a React DevTools `info` ajánlata. A `2026-09-05`-i jelentés 16.
megállapítása („A form field element should have an id or name attribute") **megszűnt**.

## 4. Mit nem vett észre

Fő funkciók, amelyek mellett István elment anélkül, hogy felismerte volna őket (ezt a
listát a persona sosem kapja meg):

- **Fogtérkép** (célkereszt a Fog mező mellett) és az **„Érintett fogak"** összesítő panel
  — a fogszámokat végig kézzel gépelte, a panelt ki sem nyitotta. Pedig a nyomtatványon
  látott fogtérképet külön megdicsérte, és nem kötötte össze a kettőt.
- **Több fázis** — a „Fázis hozzáadása" gombot látta, egyfázisú tervet készített; a
  „lépcsőkben fizetés" rendelői helyzet nem jutott eszébe.
- **Egyedi végösszeg beállítása** — a pipát elolvasta, nem próbálta.
- **Terv címe** mező — üresen hagyta, és a véglegesítés után meglepődött, hogy a papíron
  „Korona és hídpótlások" áll ott, ahol a páciens nevét várta. A mező fölött ott volt a
  magyarázat, amit ő maga is idézett — mégsem kötötte össze.
- **„+ leírás" és „+ megjegyzés"** — egyiket sem nyitotta ki.
- **Sorvégi „…" menü** (sor mozgatása, másolása) — felirat nélküli, kihagyta.
- **„≈" Becsült ár kapcsoló** — látta a jelet, nem ismerte fel kapcsolónak.
- **„↺" listaárra visszaállítás** — látta, nem merte megnyomni.
- **Kezelések és árak** (árlista-admin) és **Beállítások** — bevallottan nem nézett bele,
  pedig a checklist kétszer is odairányította („Pótlás: Beállítások → Nyomtatvány
  szövegei"), és a „Nyomtatvány szövegei" gombot sem nyomta meg.
- **Páciens adatai fül** a páciens lapján.
- **Deutsch / EUR** — észrevette, hogy van, nem váltott.
- **Másolás új tervbe** — a magyarázó sorban olvasta a nevét, nem kereste meg.
- **Új verzió** — látta, kifejezetten nem merte megnyomni.
- **DEMO menüpont** — „fogalmam sincs, mi az, nem is nyitom meg".
- **Piszkozat folytatása** kártya a Kezdőlapon — nem hagyott félbe tervet, ezért nem látta.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. **A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi
   terveket keresed, páciens nélkül?** (fix kérdés — az app ma a páciensből indulásra épít)
2. Az elmúlt hónapban melyik tíz kifejezéssel kerested a kezeléseket a legtöbbször? (a
   találati rangsor javításához, 1. megállapítás)
3. Van olyan tétel, amiből tényleg tízesével rendelsz egy terven belül (ideiglenes korona,
   röntgen, konzultáció)? Hol van az a darabszám, ami fölött már biztosan elgépelés? (4.)
4. Amikor engedsz az árból, a páciens lássa a papíron, hogy mennyit engedtél, vagy jobb,
   ha csak a végösszeg szerepel? Volt már ebből vitád? (5.)
5. Az elmúlt hónapban hányszor fordult elő, hogy egy tervet az előnézetig vittél,
   megmutattad a páciensnek, aztán visszamentél javítani? (3.)
6. Dolgozol-e éjfél után a programban, vagy a rendelés utáni adminisztráció mindig este
   10 előtt megvan? (2. — ez dönti el, mennyire sürgős)
7. A Chrome-od a Macen magyar vagy angol nyelvű? (10.)
8. Amikor egy sort tévedésből törölnél, mennyi idő alatt veszed észre — másodpercek, vagy
   csak a végösszegnél? (14. — elég-e a 8 másodperces ablak)
9. A kinyomtatott papírt a páciens szokta-e lefotózni, vagy elkéri e-mailben? (6. — ettől
   függ, mennyire számít az e-mail cím pontossága)
10. Ha egy tervet elmentettél és kiadtál, mi a következő dolgod: új pácienshez ugrasz,
    vagy még csinálsz valamit ezzel a tervvel? (12., a gombhangsúlyhoz)

## 6. Ami jól működik

**Amit István elsőre megértett vagy megtalált:**

- **A cél elsőre érthető**: a cím és a „+ Új kezelési terv" gomb együtt „egy pillanat
  alatt" elmondta, mire való.
- **A háromlépéses sáv** (Terv adatai → Kezelések → Előnézet és véglegesítés) végig
  megmondta, hol tart — ezt a napló záró bekezdésében külön kiemelte.
- **Az „Új terv indítása" választó** és a magyarázata („az ő mentett adatait a terv
  átveszi") — „teljesen érthető, itt nem akadtam el".
- **Az automatikus mentés**: a „piszkozat" + „Automatikusan mentve <időpont>" miatt „egy
  percig sem féltem, hogy elvesztem a munkámat"; a böngésző-frissítés és a Vissza gomb
  sem ártott neki.
- **A kereső ékezet nélküli tippje** („eszt, koron, gyoker") és a kategóriákra bontott,
  árazott találati lista.
- **Az „Egyedi tétel felvétele: »…«" ajánlat** — „nagyon jó hír nekem, mert Excelben
  rendszeresen írtam kézzel olyat, ami nincs az árlistán".
- **A fogszámból számolt darabszám** („16, 17" → Db 2) — első ijedség után „pont jól
  gondolta".
- **Az élő kedvezmény-számítás** („Kedvezmény: 20 000 Ft") — „ezt eddig fejben /
  számológépen csináltam".
- **A checklist-legenda** („Piros: amíg fennáll, a terv nem véglegesíthető. Sárga és
  szürke: csak jelzés") — „ezt a mondatot értékelem, mert megmondja, melyik állít meg".
- **A checklist cselekvésre váltható hibaüzenete** („Pótlás: Beállítások → Nyomtatvány
  szövegei") — „ez jó hibaüzenet".
- **A nyomtatvány fogtérképe és a becsült ár csillagos lábjegyzete** — „ilyen az Excelben
  sose volt"; a lábjegyzet mondatát „pont így mondanám a páciensnek is".
- **A verzió-magyarázó sor a páciens lapján** („Az »Új verzió« ugyanahhoz a tervhez
  készül; az »Új terv« és a »Másolás új tervbe« önálló, új tervet indít") — „pontosan
  megválaszolta azt a kérdést, ami épp bennem volt".
- **A sikerképernyő figyelmeztetés-összefoglalója** — „okos, mert utólag is látom, mit
  hagytam ki".
- **A DEMÓ-sáv** üzenetét megértette és betartotta.

**A `2026-09-05`-i jelentés óta bizonyíthatóan javított megállapítások** (mind
ellenőrizve ebben a futásban):

| Korábbi megállapítás | Amit most találtam |
|---|---|
| 1. A PDF-en „v0", a képernyőn „v1" | **Javítva** — a nyomtatvány fejléce „3187kd · **v1** · …"; az azonosító-foglalás (`PreviewPage.azonositoFoglalas.test.tsx`) működik |
| 2. A sikerképernyőn nincs Nyomtatás/Letöltés | **Javítva** — „Megnyitás külön" és „Letöltés" ott van (`26-veglegesites-dupla-kattintas.png`); István kerülőút nélkül jutott a papírhoz |
| 3. Fogszám nélküli sor szó nélkül átmegy | **Javítva** — „1 soron nincs fogszám. Érintett sorok: …" a checklistben (`veglegesitesOr.ts#hianyzo-fogszam`) |
| 4. Felvétel után a kurzor a keresőben marad | **Javítva** — a fókusz a sor Fog mezőjébe megy (`496e493`); István gond nélkül gépelte a „16, 17"-et |
| 8. Az „Új terv indítása" első sora kiemelt | **Javítva** — üres keresőn nincs kiemelt sor (`660cd6d`) |
| 14. Két fül: az utolsó író nyer, jelzés nélkül | **Javítva** — „A piszkozat két helyen változott" ablak, **összehasonlítással**: „Ebben az ablakban: 2 sor · 173 000 Ft / A másik ablakban: 1 sor · 135 000 Ft" (`R13-ketfulu-utkozes-dialogus.png`) |
| 15. Frissítés a véglegesítés közben: a doki nem tudja meg | **Javítva** — a mentés hiánytalanul befejeződik (`terv.json` + `pdf`), és a Kezdőlapon ott az „**Az imént véglegesített terv**" kártya Megnyitás/Letöltés gombbal |
| 16. Konzol-figyelmeztetés a form mezőkről | **Javítva** — a konzol tiszta |

Emellett a **dupla kattintás elleni védelem** a véglegesítésen továbbra is működik (egy
verzió jött létre, `2026-09-09_v1`, nincs v2), és a PDF-nézegető címe már a páciens és a
terv nevét mutatja, nem UUID-t (`de3374a`).

## Nem ellenőrizhető

| Amit nem tudtam ellenőrizni | Miért | Hogyan kezeltem |
|---|---|---|
| A ténylegesen kinyomtatott papír (a 6. megállapítás elválasztójele nyomtatásban) | Nincs nyomtató a menetben | A képernyőn megjelenő PDF alapján `megfigyelt`; a papír-hatásról nem állítok semmit |
| A letöltött fájl lemezre kerülése | Izolált profil | A letöltési `download` attribútum nevét olvastam ki (`PISZKOZAT-kezelesi-terv-Kovács-János-8gh997.pdf`); a tényleges mentés nem ellenőrizve |
| Valódi fájlrendszeres tárolás | A `FileSystemStorage` még nem létezik, a `DemoStorage` (localStorage) fut | A két fülre és a mentés közbeni frissítésre vonatkozó eredmények a mockup-fázisra érvényesek; Electronban másképp viselkedhetnek |
| Natív dátummező magyar Chrome-ban (10.) | A kijelzett sorrend böngésző-nyelvfüggő, a teszt-Chrome angol | A kétféle alak egy lapon attól függetlenül fennáll; a sorrend kérdését a 7. kérdés dönti el |
| Mac-specifikus billentyű-viselkedés | A futás Windows-Chrome-ban megy | A rontás-próba 4. pontja csak a FELIRATOKAT ellenőrizte, kód alapján — ott nincs platformfüggő szöveg |
| `prefers-reduced-motion` | Az `emulate` nem támogat CSS media-feature emulációt | Nem vizsgálva |
| A PDF iframe belseje szövegként | PDFium OOPIF, nincs szövegréteg | Képernyőképpel olvastam ki a fejlécet és az Összesítést (`18-elonezet.png`, `19-elonezet-gorgetes.png`, `25-elonezet-vegleges-elott.png`) |
