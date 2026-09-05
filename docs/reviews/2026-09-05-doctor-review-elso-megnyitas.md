# Doctor-review — `elso-megnyitas` — 2026-09-05

```
Dátum: 2026-09-05
Forgatókönyv: elso-megnyitas — István először látja az appot, cél nélkül, és megpróbálja elvégezni azt, amit a leggyakoribb dolgának gondol
User-teszt készültség: javítás után mehet (0 blokkoló, 3 súlyos)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: —
Megállapítások lencsénként: István 13 / vizuális 3 (az 1., 6., 9. tételbe olvasztva) / rontás 2 / a11y 1
Bizonyosság-eloszlás: megfigyelt 15 / erős következtetés 1 / feltételezés 0
Képernyőképek: docs/reviews/screens/2026-09-05-elso-megnyitas (29 kép, .gitignore-olt)
```

Az `elso-megnyitas` saját sablonja szerint: négy szekció a felfedezésről, utána a
„Nem javítandó, hanem Istvántól megkérdezendő" és az „Ami jól működik" szekció.

---

## 1. Mit gondolt, mire való

István szavaival, a naplóból:

> „A cím: »Kezelési terv és árajánlat«. Ebből úgy látom, a program arra való, hogy a
> páciensnek kezelési tervet és árajánlatot írjak — pont az, amit eddig Excelben
> csináltam."

A tízperces belenézés végén:

> „Kezelési tervet és árajánlatot írni a páciensnek a rendelő árlistájából, fogszámmal,
> fázisokra bontva, magyarul vagy németül, forintban vagy euróban; a terv magától mentődik
> piszkozatként; a véglegesítés után PDF lesz belőle, amit letölteni és külön lapon
> megnyitni lehet; a pácienseknek van egy lapja a korábbi tervekkel, és ugyanabból a
> tervből »új verzió« vagy másolat készíthető. A »Kezelések és árak« és a »Beállítások«
> menüpontba nem néztem bele."

Ez a kép a valós célt (`docs/PRODUCT.md` § Mi ez, § Napi flow) lényegében teljesen fedi:
egy fogorvos belső eszköze kezelési terv és árajánlat készítésére, Excel-váltóként, két
nyelven, két pénznemben, verziókövetéssel. Amit nem ismert fel: hogy a mentett terv
pillanatkép (nem rajzolódik újra az árlistából), hogy a véglegesített verzió sosem íródik
felül (a „végleges" szót visszavonhatatlannak értette, a verziólánc fogalmát nem), és hogy
az árlista és a rendelői adatok karbantartása is az appban történik.

## 2. Mit próbált elsőre, és sikerült-e

A „leggyakoribb feladat", amit magától választott: **új páciensnek terv, nyomtatás,
aláíratás** — pontosan a termék fő flow-ja. Időrendben (a persona 30 műveletes keretén
belül, 26 művelettel):

| # | Művelet | Eredmény |
|---|---|---|
| 1 | Kezdőlap megnézése | Megértette a célt, a „+ Új kezelési terv" gombot azonnal megtalálta |
| 2 | „+ Új kezelési terv" | Az „Új terv indítása" választót megértette; zavarta, hogy Kiss Márta sora kiemelt |
| 3 | „+ Új páciens" | Űrlap érthető; az amerikai dátumformátum megijesztette |
| 4 | Név + Enter | Az Enter mentett és a Terv adatai lapra ugrott, dátum/telefon nélkül; a nevet átvitte |
| 5–6 | Terv adatai lap végiggörgetése | Nyelv, pénznem, orvos, dátumok — a „mely tételek ajánlhatók" és a kétféle dátumformátum nem érthető |
| 7 | Telefon beírása | „1 mező eltér a páciens törzsadatától" + két gomb — nem értette, egyiket sem nyomta meg |
| 8 | „Tovább a terv szerkesztőhöz" | A szerkesztőt és a „Piszkozat mentve" jelzést megértette |
| 9–10 | „tomes" keresés, tétel felvétele | Sikerült, összeg frissült |
| 11–12 | Fogszám a keresőbe gépelve, Escape | A „36" a keresőbe ment; Escape kiürítette; adat nem veszett el |
| 13–14 | Fog mezőbe 36 + Tab | Sikerült |
| 15–18 | „koron", majd „zirkon" keresés | A „koron" találati sorrendjében a végleges koronákat nem látta; „zirkon"-ra elsőre jó |
| 19 | Enter | Korona felvéve, 175 000 Ft |
| 20 | Böngésző-frissítés | Minden megmaradt — megnyugodott |
| 21 | „Előnézet" | Három figyelmeztetés; a „jogi lektorálás" doboz és a hiányzó-páciensadat doboz nem érthető; PDF-fejlécben kód; cím „Korona és hídpótlások" |
| 22 | „Véglegesítés és mentés" | Kérdés nélkül mentett; a PDF eltűnt, nyomtatás/letöltés nincs |
| 23 | Böngésző Vissza | Nem történt semmi |
| 24 | „Korábbi tervek" | Páciens-lap, a terv v1 sora; „Új verzió"-t nem merte megnyomni |
| 25 | „Megnézés" | Tervlap; a korona sorában „—" a Fog oszlopban; „Nyomtatás" itt sincs |
| 26 | „Megnyitás külön" | A PDF külön lapon, nyomtató-ikonnal — itt jutott el a nyomtatható laphoz |

**Befejezte-e:** igen, a tervet összeállította és véglegesítette, a nyomtatható lapot
megtalálta — de a véglegesítés után három kattintásnyi kerülőúttal, a böngésző Vissza
gombjával tett sikertelen próbálkozás után, és a saját szavai szerint „két próbálkozás után
most inkább papírt vennék elő vagy a kollégát hívnám". A dokumentum, ami kikerült, egy
fogszám nélküli koronát és egy a képernyővel nem egyező verziószámot tartalmaz.

## 3. Hol akadt el

Súlyosság szerint rendezve, minden lencse együtt.

### 1. A mentett PDF-en „v0" áll, a képernyőn „v1" — a kiadott papír és a program verziószáma soha nem egyezik

- Súlyosság: **Súlyos** (rossz tartalmú, de aláírható dokumentum hagyja el a gépet; a
  doki nem tudja utólag párosítani a papírt a gépben lévő verzióval)
- Gyakoriság: **minden tervnél**
- Lencse: István (vizuális lencsével megerősítve)
- Érintett folyamat: 14 (előnézet, véglegesítés, kiadás), 16 (korábbi terv megtekintése)
- Bizonyosság: **megfigyelt** (`18-elonezet.png`: a PDF fejlécében „· v0 · 2026.09.05.";
  `22-megnezes.png`: „Verzió v1"; `23-megnyitas-kulon.png`: a mentett PDF külön lapon
  továbbra is „v0". Kód-szinten megerősítve: a véglegesítés az előnézethez már legenerált
  PDF bájtjait menti el változatlanul (`app/src/pages/PreviewPage.tsx` a `pdfInstance.blob`
  tartalmát adja át a `savePlan`-nek), a verziószámot pedig a tároló osztja ki UTÁNA
  (`app/src/storage/DemoStorage.ts`, `nextVersionNumber`); a PDF fejléce a piszkozat
  `verzio` mezőjét írja ki (`app/src/pdf/tervDocument/Chrome.tsx`). „Új verzió"-nál a
  piszkozat megtartja az előző verziószámot (`app/src/domain/ujVerzioDatum.test.ts`),
  ezért a v2-ként mentett PDF-en „v1" áll — az eltolás minden verziónál egy.)
- Dedup: **ÚJ**
- Helyzet és reprodukció: új páciens, két tétel, Előnézet → „Véglegesítés és mentés" →
  Korábbi tervek → Megnézés → Megnyitás külön. A képernyő „v1"-et, a PDF „v0"-t mutat.
- Orvosi elvárás: „Ha a páciens visszahozza a papírt, és én a gépben v1-et látok, tudjam,
  hogy ugyanaz-e."
- Tapasztalt probléma: a dokumentum, amit a páciens aláír és hazavisz, más verziószámot
  visel, mint amit a program a terv lapján, a verziósorban és a mappanévben mutat. Egy
  többverziós láncnál (v1, v2, v3) a papírokon v0, v1, v2 áll.
- Napi hatás: a papír és a gépben lévő terv párosítása fejben történik („a v1 papírja
  valójában a v2"); vitás helyzetben (melyik ajánlatot írta alá a páciens) a doki nem tud
  a papírra hivatkozni.
- Jelenlegi kerülőút: nincs — a doki a dátumból és az összegből következtet.
- Javasolt javítási irány: a PDF-et a végleges verziószám ismeretében kell generálni
  (a tároló a verziószámot a bájtok átadása előtt is ki tudja osztani), vagy a fejlécből
  a piszkozat-állapotú verziószám maradjon ki („v0" helyett semmi), és csak a mentett
  verzió PDF-jén jelenjen meg. Ugyanitt: a fejléc első tagja egy új tervnél üres
  (`tervId` = ''), ezért a fejléc egy különálló „·" jellel kezdődik („· v0 · 2026.09.05.").
- Siker mércéje: a mentett PDF fejlécében pontosan az a verziószám áll, amit a verziósor
  és a Terv részletei lap mutat; a fejléc nem kezdődik elválasztójellel.
- Backlog: `pdf-verzioszam-mentett-verzio`

### 2. Véglegesítés után a kész dokumentum eltűnik — nincs Nyomtatás vagy Letöltés a sikerképernyőn

- Súlyosság: **Súlyos** (továbbjut, de csak olyan háromlépéses kerülőúttal, amit
  magától a böngésző Vissza gombja után, próbálgatással talált meg)
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 14 (kiadás), 21 (visszatérés)
- Bizonyosság: **megfigyelt** (`19-veglegesites-kattintas.png`, `20-vissza-gomb-utan.png`,
  `21-korabbi-tervek.png`, `22-megnezes.png`, `23-megnyitas-kulon.png`; kód-szinten:
  a sikerképernyő csak „Új terv indítása" és „Korábbi tervek" gombot ad,
  `app/src/pages/PreviewPage.tsx` `savedRef` ág)
- Dedup: **ÚJ** (a `2026-08-25-doctor-review-veglegesites.md` 4. megállapítása a
  sikerképernyő figyelmeztetés-összefoglalóját hiányolta — az azóta megvan; a
  nyomtatás/letöltés hiánya ott nem került elő)
- Helyzet és reprodukció: Előnézet → „Véglegesítés és mentés" → „A terv elmentve ✓"
  képernyő. Se PDF, se Nyomtatás, se Letöltés. Böngésző Vissza: ugyanaz a képernyő marad
  (a persona kétszer ellenőrizte). A nyomtatható laphoz vezető út: Korábbi tervek →
  Megnézés → Megnyitás külön (vagy Letöltés).
- Orvosi elvárás: „Ez az a pillanat, amikor a páciens az asztal túloldalán ül és várja a
  papírt. Véglegesítés után a kész dokumentum egy nagy Nyomtatás gombbal."
- Tapasztalt probléma: a sikerképernyő a fájl helyét (belső kódokkal) és a
  figyelmeztetéseket ismétli, de a doki egyetlen tényleges következő lépését — kiadni a
  papírt — nem kínálja fel. A böngésző Vissza gombja nem visz vissza az előnézethez.
- Napi hatás: minden tervnél három plusz kattintás páciens előtt; első használatkor a
  doki nem tudja, hogy a papír egyáltalán megvan-e még.
- Jelenlegi kerülőút: Korábbi tervek → Megnézés → Megnyitás külön / Letöltés.
- Javasolt javítási irány: a sikerképernyőn maradjon ott a mentett PDF (vagy legalább egy
  „Nyomtatás" + „Letöltés" gombpár a most mentett verzióra) — ugyanaz a két művelet, ami a
  Terv részletei lapon már létezik. A böngésző Vissza gombja a sikerképernyőről a most
  mentett verzió részletlapjára vihetne, ne egy zárt zsákutcába.
- Siker mércéje: a „Véglegesítés és mentés" utáni képernyőről egy kattintással nyomtatható
  vagy letölthető a kiadott dokumentum; a persona nem használ kerülőutat.
- Backlog: `sikerkepernyo-nyomtatas-letoltes`

### 3. Fogszám nélküli korona szó nélkül átmegy a véglegesítésen — a papíron „—" áll a Fog oszlopban

- Súlyosság: **Súlyos** (rossz tartalmú dokumentum hagyja el a gépet: koronás terv
  fogszám nélkül; a doki csak a kiadás után vette észre)
- Gyakoriság: **naponta többször** (minden olyan sornál, ahol a doki a fogszámot a
  következő tétel keresése közben elfelejti — ez pont a 4. megállapítás forgatókönyve)
- Lencse: István
- Érintett folyamat: 8 (fogak), 11 (hiányos tartalom az ellenőrző jelzéseken), 14
- Bizonyosság: **megfigyelt** (`16-zirkon-felveve.png`: a korona sor Fog mezője üres;
  `18-elonezet.png`: a checklist három dobozában nincs fogszám-figyelmeztetés;
  `22-megnezes.png` és `23-megnyitas-kulon.png`: „—" a Fog oszlopban. Kód-szinten:
  `app/src/domain/veglegesitesOr.ts` tételei között nincs „hiányzó fogszám" ellenőrzés —
  a `kitoltetlen-sor` kemény blokk csak a beavatkozás nélküli sorra vonatkozik.)
- Dedup: **ÚJ**
- Helyzet és reprodukció: két sor, az egyiknek nincs fogszáma → Előnézet → véglegesítés.
- Orvosi elvárás: „A hiányzó születési dátumra figyelmeztetett, a hiányzó fogszámra nem.
  Koronás terv fogszám nélkül a páciens kezében szakmailag kínos."
- Tapasztalt probléma: a checklist a nem kötelező páciensadat hiányát puha
  figyelmeztetésként jelzi, a tétel fogszámának hiányát semmiként.
- Napi hatás: a papírra fogszám nélküli beavatkozás kerül; a páciens vagy a technikus
  visszakérdez; új verzió kell.
- Jelenlegi kerülőút: a doki a Terv részletei lapon utólag veszi észre, és „Új verzió"-t
  csinál (amit István nem mert megnyomni, mert nem tudta, mi lesz a v1-gyel).
- Javasolt javítási irány: puha (nem blokkoló) checklist-tétel: „N tételnél nincs fogszám
  megadva" a sorok felsorolásával és „Kezelések" gombbal, ugyanabban a mintában, mint a
  hiányzó páciensadat. Validálandó kérdés Istvánnak: mely tételtípusoknál nem kell fogszám
  (fogkő, konzultáció, röntgen) — ezekre ne szóljon.
- Siker mércéje: fogszám nélküli fogra vonatkozó tétel mellett a véglegesítés előtt egy
  jelzés látszik, amiről egy kattintással a sorhoz lehet ugrani.
- Backlog: `checklist-hianyzo-fogszam`

### 4. Tétel felvétele után a kurzor a keresőben marad, a doki a fogszámot oda gépeli — az app „egyedi tételt" kínál a „36"-ból

- Súlyosság: **Közepes** (lassít, bizonytalanít; az adat nem vész el, de a 3.
  megállapítás közvetlen oka)
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 6 (kereső), 8 (fogak)
- Bizonyosság: **megfigyelt** (`11-fogszam-rossz-mezobe.png`; kód-szinten: a kereső
  felvétel után szándékosan visszakapja a fókuszt, `app/src/pages/planEditor/ItemPicker.tsx`
  `requestAnimationFrame(() => ref.current?.focus())` — ez a `PRODUCT.md` § Napi flow
  billentyűzetes ciklusa)
- Dedup: **ÚJ**
- Helyzet és reprodukció: „tomes" → tétel kiválasztása → azonnal „36" gépelése. A kereső
  „Nincs találat." és narancssárgán kiemelt „Egyedi tétel felvétele: »36«" sort mutat.
- Orvosi elvárás: „Tétel felvétele után a kurzor ugorjon az új sor Fog mezőjébe" — vagy a
  csupa számból álló keresésnél ne az egyedi tétel legyen az alapértelmezett.
- Tapasztalt probléma: a doki fejében a természetes sorrend „mi → melyik fog"; az app a
  „mi → mi → mi" gyors ciklusra optimalizál. Ha István itt Entert nyom (ahogy a Név
  mezőnél tette), egy „36" nevű, 0 Ft-os egyedi sor keletkezik — ezt nem próbálta ki,
  erős következtetés.
- Napi hatás: minden sor után egy Escape vagy kattintás; a fogszám kimaradása.
- Jelenlegi kerülőút: Escape (István megtalálta, de csak próbából), majd kattintás a Fog
  mezőbe.
- Javasolt javítási irány: a billentyűzetes ciklus megtartása mellett a csupa szám (1–2
  fogszám-alakú token) keresésre a kereső ne egyedi tételt ajánljon, hanem egy tippet:
  „Fogszámot a sor Fog mezőjébe írj — Tab" — vagy az Enter ilyenkor az utoljára felvett
  sor Fog mezőjébe írja a számot.
- Siker mércéje: a „tétel → fogszám" sorrendben gépelő doki nem kap „Egyedi tétel"
  ajánlatot, és nem keletkezik „36" nevű sor.

### 5. A tervbe beírt telefonszám „eltér a törzsadattól" — két, egyformán hangsúlyos gomb, és a szám nem kerül a páciens kartonjára

- Súlyosság: **Közepes** (a doki nem nyúl hozzá, továbbmegy — de az új páciens
  telefonszáma ténylegesen nem kerül a páciens adatai közé)
- Gyakoriság: **minden új páciensnél**, akinek a doki utólag ír be adatot a Terv adatai
  lapon
- Lencse: István
- Érintett folyamat: 2 (új páciens), 10 (páciensadat módosítás), 19 (törzsadat-eltérés)
- Bizonyosság: **megfigyelt** (`07-telefon-beirva.png`: „1 mező eltér a páciens
  törzsadatától." + „Frissítés a törzsadatból" / „Törzsadat frissítése a tervből";
  `18-elonezet.png`: „A páciens törzsadata 1 mezőben eltér a terv adataitól (Telefon)";
  `r04-frissites-mentes-kozben.png`: a Kezdőlap „Legutóbbi páciensek" listáján Teszt Elek
  sora telefonszám nélkül, míg a többi páciensé telefonnal — a szám valóban csak a tervben
  van.)
- Dedup: **ÚJ** (a `2026-09-01-doctor-review-visszatero-paciens.md` és a
  `2026-09-01-doctor-review-nevutkozes.md` a törzsadat-jelzőt más helyzetben — másolás,
  puszta kiválasztás — vizsgálta; az „új páciens, üres kartonra írt első adat" eset nem
  került elő)
- Helyzet és reprodukció: „+ Új páciens" csak névvel (Enter) → Terv adatai lap → Telefon
  mező kitöltése. Azonnal megjelenik az eltérés-jelzés a két gombbal.
- Orvosi elvárás: „Én egy helyen akarom beírni, egyszer. Beírom, kész, a páciensnél
  megvan."
- Tapasztalt probléma: a két gomb neve tükörszimmetrikus („Frissítés a törzsadatból" /
  „Törzsadat frissítése a tervből"), egyforma súlyú, és az egyiktől a doki azt féli, hogy
  törli, amit most írt be. Nem nyomta meg egyiket sem → a szám a kartonra nem került fel.
  Az előnézet és a sikerképernyő újra jelzi, de ugyanazzal a szóval.
- Napi hatás: a következő látogatásnál a páciens telefonszáma nincs meg; a doki minden
  tervnél újra beírja.
- Jelenlegi kerülőút: nincs, amit István magától megtalálna.
- Javasolt javítási irány: ha a törzsadat mezője ÜRES és a tervben most kap értéket, az
  írás kérdés nélkül menjen a törzsadatra is (nincs mit felülírni); az eltérés-dialógus
  csak akkor jelenjen meg, ha a törzsadatban már más érték van. A két gomb közül az
  egyik legyen elsődleges, és a felirat mondja ki a hatást („A telefonszámot a páciens
  adataihoz is mentem").
- Siker mércéje: egy csak névvel felvett páciensnek a Terv adatai lapon beírt telefonszáma
  gomb nélkül megjelenik a Kezdőlap „Legutóbbi páciensek" sorában.

### 6. Dátummezők amerikai sorrendben („mm/dd/yyyy", „12/04/2026") ugyanazon a lapon, ahol a másik dátum magyarul van

- Súlyosság: **Közepes** (bizonytalanít: „ez most december 4. vagy április 12.?"; a doki
  nem mer dátumot beírni a páciens előtt)
- Gyakoriság: **minden tervnél**
- Lencse: István (vizuális lencsével megerősítve: `06-terv-adatai-teljes.png` — „Kiadás
  dátuma 2026. szeptember 5." és alatta „Érvényes eddig 12/04/2026")
- Érintett folyamat: 2, 10 (dátumok)
- Bizonyosság: **megfigyelt** a futtató böngészőben; **Pontosítás:** a mező natív
  `<input type="date">` (`app/src/pages/paciensek/UjPaciensDialog.tsx`,
  `app/src/pages/PatientPage.tsx`), amelynek a kijelzett formátumát a Chrome
  felület-nyelve adja — az izolált teszt-Chrome angol, ezért „mm/dd/yyyy". István
  Macjén, magyar Chrome-mal ez „éééé. hh. nn." lenne; ha viszont a Chrome-ja angol
  (gyakori Macen), pontosan ezt látja. A kétféle formátum egy lapon (kézzel formázott
  magyar dátum + natív mező) attól függetlenül fennáll.
- Dedup: **ÚJ**
- Helyzet és reprodukció: „+ Új páciens" dialógus Született mezője; Terv adatai lap
  Született és Érvényes eddig mezője.
- Orvosi elvárás: „Magyar sorrend (éééé.hh.nn), vagy legalább egy felirat a mező fölött,
  hogy hónap/nap/év." Rendelőben a hónap/nap felcserélése kiskorú/felnőtt és
  érvényesség kérdésében konkrét hibaforrás.
- Tapasztalt probléma: a listában „1978.03.14.", a mezőben „mm/dd/yyyy", a Kiadás dátuma
  „2026. szeptember 5.", az Érvényes eddig „12/04/2026" — négy alak egy képernyőn belül.
- Napi hatás: a doki nem meri felolvasni az érvényességi dátumot a páciensnek.
- Jelenlegi kerülőút: a Terv részletei lap már magyarul írja („2026. december 4.").
- Javasolt javítási irány: a natív dátummező mellett/helyett egy kézzel formázott,
  a lapon máshol használt alakú (2026. december 4.) olvasható érték; vagy a `lang="hu"`
  attribútum a mezőn, ami a Chrome-ot magyar sorrendre bírja a felület nyelvétől
  függetlenül — ezt kézzel ellenőrizni kell (`/manual-checks`).
- Siker mércéje: a Terv adatai lapon minden dátum ugyanabban az alakban olvasható.

### 7. Az Enter a Név mezőben azonnal menti a pácienst és továbblép — dátum és telefon kimarad

- Súlyosság: **Közepes** (a doki továbbjut, a név megmarad, de meglepődik, és a többi
  mezőt a következő lapon kell újra megkeresnie)
- Gyakoriság: **minden új páciensnél**
- Lencse: István
- Érintett folyamat: 2
- Bizonyosság: **megfigyelt** (`03-uj-paciens-urlap.png` → `04-nev-enter-utan.png`;
  kód-szinten: a dialógus `<form onSubmit>`-ja fut Enterre,
  `app/src/pages/paciensek/UjPaciensDialog.tsx`)
- Dedup: **ÚJ** (a `2026-08-25-doctor-review-zsufolt-reggel.md` 2. megállapítása a
  megszakításkor elvesző nevet jelezte — ez a fordítottja: az Enter túl korán ment)
- Helyzet és reprodukció: „+ Új páciens" → név begépelése → Enter.
- Orvosi elvárás: „Az Enter a következő mezőbe ugrik, vagy ment — de ha ment, akkor
  mondja, hogy »páciens mentve«."
- Tapasztalt probléma: se „Páciens mentve" visszajelzés, se lehetőség a dátum/telefon
  kitöltésére a dialógusban; a doki egy egészen más képernyőn találja magát.
- Napi hatás: kicsi, mert a mezők a Terv adatai lapon is ott vannak — de az ott beírt
  adat az 5. megállapítás csapdájába fut.
- Jelenlegi kerülőút: a Terv adatai lap.
- Javasolt javítási irány: Enter a Név mezőben → fókusz a Született mezőre (a Mentés csak
  a gombról vagy az utolsó mezőből Enterre); vagy mentés után egy rövid „Teszt Elek
  felvéve" jelzés a Terv adatai lap tetején.
- Siker mércéje: a doki a dialógusban ki tudja tölteni mindhárom mezőt Enterrel lépkedve,
  és a mentés pillanatában látja, hogy a páciens létrejött.

### 8. Az „Új terv indítása" lapon a lista első sora (Kiss Márta) kiemelt, mintha ki lenne választva — Enter tényleg őt indítaná

- Súlyosság: **Közepes** (bizalom: „nem merek Entert nyomni")
- Gyakoriság: **minden tervnél**
- Lencse: István
- Érintett folyamat: 1, 2
- Bizonyosság: **megfigyelt** a kiemelés (`02-uj-terv-gomb-utan.png`); **erős
  következtetés** az Enter hatására: a kód szerint üres keresőnél a kiemelt (0. indexű)
  páciensre indul az új terv (`app/src/pages/NewPlanPage.tsx`, `hi` kezdőértéke 0, Enter
  → `akciok.inditas({ kind: 'ujTerv', … })`) — a persona nem nyomta meg.
- Dedup: **ÚJ**
- Helyzet és reprodukció: Kezdőlap → „+ Új kezelési terv". Kattintás nélkül Kiss Márta sora
  narancssárga csíkkal kiemelt.
- Orvosi elvárás: „Ne legyen kiemelve semmi, amíg nem nyúlok hozzá, vagy legyen egy szó,
  hogy »javasolt«."
- Tapasztalt probléma: a kiemelés a billentyűzetes ciklushoz kell (nyíl + Enter), de gépelés
  nélkül azt sugallja, hogy már választott valaki; és egy véletlen Enter a legutóbbi
  páciensnek indít tervet (ami a zsufolt-reggel jelentés 1. megállapítása szerint a meglévő
  piszkozatot is csendben felülírhatja).
- Napi hatás: bizonytalanság az első képernyőn; rossz páciens tervének véletlen indítása.
- Jelenlegi kerülőút: egérrel kattint.
- Javasolt javítási irány: üres keresőnél ne legyen kiemelt sor (a kiemelés az első
  leütés vagy nyíl után jelenjen meg); vagy a kiemelt sor kapjon feliratot („Enter: terv
  indítása neki").
- Siker mércéje: gépelés nélküli Enter nem indít tervet senkinek.

### 9. Belső kódok a felületen: „Teszt Elek (Teszt-Elek_dqyezl)", „Korona és hídpótlások_uczsr0 / 2026-09-05_v1", a PDF-nézegető és a külön lap címe egy UUID

- Súlyosság: **Kis** (kozmetikai, de a doki attól fél, hogy ez a nyomtatványra kerül, és a
  letöltött fájl neve ilyen lesz)
- Gyakoriság: **minden tervnél**
- Lencse: István + vizuális (`04-nev-enter-utan.png`, `19-veglegesites-kattintas.png`,
  `18-elonezet.png` és `23-megnyitas-kulon.png` fejléce: „1318324f-096e-4ac7-b1a…",
  „86781ccb-d989-46a6-98e7-cee9387f216f")
- Érintett folyamat: 2, 14, 16
- Bizonyosság: **megfigyelt**. Pontosítás: a fejléc-kód a böngésző beépített
  PDF-nézegetőjének blob-URL címe, nem az app által adott fájlnév — a tényleges letöltés
  fájlnevét az izolált profilban nem lehetett ellenőrizni (lásd „Nem ellenőrizhető").
- Dedup: **ÚJ**
- Orvosi elvárás: „Inkább »Teszt Elek kezelési terv« kellene."
- Javasolt javítási irány: a Terv adatai lapon a mappanév-magyarázat („A terv ehhez a
  páciensmappához kötve mentődik") helyett/mellett egy laikus mondat („A terv a Teszt Elek
  nevű mappába kerül"); a sikerképernyőn a monospace elérési út helyett „Teszt Elek ·
  Korona és hídpótlások · 1. verzió"; a PDF blob helyett a beágyazott nézegető
  `title`-je a páciens neve.
- Siker mércéje: a doki egyetlen képernyőn sem lát hat karakteres véletlen utótagot vagy
  UUID-t.

### 10. Az előnézet figyelmeztetései a doki nyelvén nem mondják meg, mit tegyen

- Súlyosság: **Kis–Közepes** (a doki elfogadja, továbbmegy; de a „jogi lektorálás" és a
  „Nyomtatvány szövegei" gomb nem cselekvésre hív)
- Gyakoriság: **minden tervnél**, amíg a garancia-szöveg placeholder
- Lencse: István
- Érintett folyamat: 11, 14
- Bizonyosság: **megfigyelt** (`18-elonezet.png`)
- Dedup: a garancia-szöveg hiánya **MÁR TERVEZETT** (`backlog/idea/arlista-nap.md`: a
  garancia-szakasz magyar szövege a doki adattisztítási teendője); a szövegezés
  érthetetlensége **ÚJ** (a `2026-08-25-doctor-review-uj-terv.md` „Ami jól működik"
  szakasza ugyanezt a dobozt még egyértelműnek találta — két persona-futás eltérő
  olvasata, megerősítendő a valódi teszten)
- Orvosi elvárás: „A garancia-szöveg még nincs kitöltve, ezért kimarad. Kitöltés →". A
  hiányzó páciensadat-doboz sorolja fel, MELYIK adat hiányzik („Születési dátum, lakcím").
- Tapasztalt probléma: „Milyen szakasz? Ki lektorál jogilag? A gomb neve sem »javítás«."
  A második doboz („Néhány páciensadat hiányzik") nem nevezi meg a mezőt — az előnézetről
  vissza kell menni kitalálni.
- Javasolt javítási irány: a `sablon-kihagyott-szekcio` szövege a doki felől
  („A Garancia szöveg nincs kitöltve — a nyomtatványból kimarad. Kitöltés a
  Beállításokban"); a `hianyzo-paciensadat` tétel sorolja fel a hiányzó mezőket, ahogy
  a törzsadat-eltérés tétel már teszi („(Telefon)").
- Siker mércéje: a doki a dobozból, továbbkattintás nélkül tudja, mi hiányzik és hol
  pótolja.

### 11. A „koron" keresésre a végleges koronák nem az első képernyőn vannak

- Súlyosság: **Kis** (lassít; „zirkon"-ra elsőre jó)
- Gyakoriság: **naponta többször**
- Lencse: István
- Érintett folyamat: 6
- Bizonyosság: **megfigyelt** (`14-koron-kereses.png`: a kiemelt első találat „Impl.
  ideiglenes korona" (Szájsebészet), utána teleszkóp és ideiglenes koronák, a lista alján
  egy „Kategória: Korona és hídpótlások" fejléc, ami alatt a fémkerámia/cirkon tételek
  csak görgetve látszanak)
- Dedup: **ÚJ** (a korábbi „kategórianévre nem talál" megállapítás — uj-terv 1., admin 3.
  — javítva: a „Kategória: …" fejléc pont ennek a következménye; a sorrend kérdése új)
- Orvosi elvárás: „Gyakoribb tételek előrébb, vagy a lista magasabb."
- Javasolt javítási irány: a `gyakori` jelölésű tételek (ha vannak) a találati lista
  elejére; a részszó-találat rangsorolása a tétel nevének elejére eső egyezés szerint
  („Korona…" előrébb, mint „Impl. ideiglenes korona").
- Siker mércéje: „koron"-ra a lista első öt sorában van fémkerámia és cirkon korona.

### 12. Ikon felirat nélkül: „≈" az ajánlati ár alatt, célkereszt a Fog mező mellett, kuka a fejlécben, „…" a verziósorban

- Súlyosság: **Kis**
- Gyakoriság: **minden tervnél**
- Lencse: István („csak a fában láttam" jelöléssel: a nevük Becsült ár, Fogak kijelölése a
  fogtérképen, Piszkozat eldobása)
- Érintett folyamat: 8, 9
- Bizonyosság: **megfigyelt** (`10-tomes-felveve.png`, `08-terv-szerkeszto.png`,
  `21-korabbi-tervek.png`)
- Dedup: a „≈" jelvény a `2026-08-10-browser-validation.md`-ben mint meglévő elem
  szerepel, felfedezhetőségi találatként **ÚJ**
- Tapasztalt probléma: István egyiket sem nyomta meg, mert nem tudta, mit csinál — a
  persona nem viszi az egeret ikon fölé. A fogtérkép (ami a fogszám-hiba fő
  megelőzője lenne) így felfedezetlen maradt.
- Javasolt javítási irány: a célkereszt mellé egy rövid felirat („Fogtérkép"); a „≈"
  mellé „becsült"; a kuka mellé „Elvetés". A fogtérkép-ikon egy üres Fog mezőnél
  hangsúlyosabb lehet.
- Siker mércéje: a persona egy következő futásban kattintás előtt kimondja, mit fog
  csinálni a gomb.

### 13. A kétféle „ajánlható" és „domináns kategória" felirat nem érthető

- Súlyosság: **Kis**
- Lencse: István
- Bizonyosság: **megfigyelt** (`06-terv-adatai-teljes.png`: „Pénznem (ez dönti el, mely
  tételek ajánlhatók)"; „Üresen a domináns kategória neve lesz a cím — a véglegesítéskor
  rögzül")
- Dedup: **ÚJ**
- Tapasztalt probléma: „mi az, hogy ajánlható tétel?"; a terv címe „Korona és hídpótlások"
  lett, amit nem ő adott — „egy tömés + egy korona tervnek ez furcsa cím". A cím a
  legnagyobb összegű kategóriából jön (`app/src/domain/tervCim.ts`), ez a mondatból nem
  derül ki.
- Javasolt javítási irány: „Euróban csak azok a kezelések választhatók, amelyeknek van
  euró-áruk"; „Ha üresen hagyod, a legnagyobb összegű kezeléscsoport neve lesz a cím
  (pl. »Korona és hídpótlások«)".

### 14. Két fülön nyitva ugyanaz a piszkozat: az utolsó író nyer, jelzés nélkül

- Súlyosság: **Közepes** (adatvesztés a másik fülön felvett sor; „ritka helyzet", de a
  valódi teszten egy asszisztens második gépe vagy egy véletlen második fül pont ez)
- Gyakoriság: **ritka helyzet**
- Lencse: rontás
- Érintett folyamat: 21
- Bizonyosság: **megfigyelt** (`r01-ket-ful-1-fül.png`, `r02-ket-ful-2-fül.png`)
- Dedup: **ÚJ**
- Helyzet és reprodukció: a Teszt Elek-piszkozat megnyitva két fülön. 2. fülön fogkő sor
  felvéve (199 000 Ft, „Piszkozat mentve 19:20"). 1. fülön panoráma sor felvéve (184 000
  Ft). A tárolt piszkozatban csak az 1. fül három sora maradt — a fogkő elveszett. Egyik
  fülön sincs jelzés arról, hogy a másik módosított; a 2. fül továbbra is 199 000 Ft-ot
  mutat.
- Napi hatás: a doki a 2. fülön dolgozva biztos benne, hogy a fogkő bent van; a
  véglegesítés az 1. fül állapotát adja ki.
- Javasolt javítási irány: a piszkozat-írás előtt a tárolt piszkozat frissességének
  ellenőrzése (időbélyeg), eltérésnél „Ezt a tervet egy másik lapon is szerkesztik —
  Betöltés / Felülírás" jelzés; vagy a `storage` esemény figyelése és a másik fül
  frissítése.
- Siker mércéje: két fülön felvett sorok egyike sem tűnik el csendben.

### 15. Frissítés a véglegesítés kellős közepén: a mentés befejeződik, de a doki nem tudja meg

- Súlyosság: **Kis** (adat nem veszett el: a v3 teljes, a piszkozat törlődött — de a
  sikerképernyő elmaradt, és a Kezdőlapon csak a „Terv véglegesítve · az imént" sor utal rá)
- Gyakoriság: **ritka helyzet**
- Lencse: rontás
- Bizonyosság: **megfigyelt** (`r04-frissites-mentes-kozben.png`; a tárolóban
  `2026-09-05_v3/terv.json` és `/pdf` egyaránt létrejött, piszkozat nincs)
- Dedup: **ÚJ**
- Napi hatás: a doki, aki nem látta a sikerképernyőt, könnyen újra véglegesít → duplikált
  v4 (a dupla kattintás elleni védelem ezt nem fogja, mert két külön oldalbetöltés).
- Javasolt javítási irány: a Kezdőlapon (vagy a páciens lapján) egy „az imént véglegesített
  terv" kártya Nyomtatás/Letöltés gombbal — ez a 2. megállapítás megoldásával egybeesik.

### 16. Konzol: „A form field element should have an id or name attribute"

- Súlyosság: **Kis**
- Lencse: a11y
- Bizonyosság: **megfigyelt** a persona konzol-kimenetében (1 db, `issue` típus); a
  Kezdőlapon újra futtatott ellenőrzés nem talált id/name nélküli mezőt, tehát a jelzés a
  bejárás valamelyik közbenső képernyőjéhez (valószínűleg a dialógus vagy a fázisnév mező)
  tartozik.
- Dedup: **ÚJ**
- Javasolt javítási irány: a `/manual-checks` vagy egy jsdom-teszt keresse meg a
  `name`/`id` nélküli mezőt; a böngésző automatikus kitöltése és a képernyőolvasók emiatt
  nem párosítják a mezőt.

### Rontás-próba, ami rendben volt

- **Gyors dupla kattintás** a „Véglegesítés és mentés" gombon: egyetlen v2 keletkezett
  (`r03-dupla-veglegesites.png`; a `saving` state és a `savingRef` in-flight védelem
  működik).
- **Platform-felirat**: a forrás `.tsx` fájljaiban nincs felhasználónak megjelenő
  `Ctrl`/`Cmd`/`⌘`/`Alt` felirat; az egyetlen billentyű-felirat a fogtérkép aria-címkéjében
  („Enterrel/szóközzel") platformfüggetlen. Nincs találat.

## 4. Mit nem vett észre

Fő funkciók, amelyek mellett István elment anélkül, hogy felismerte volna őket (a
persona ezt a listát sosem kapja meg):

- **Fogtérkép** a sor Fog mezője mellett (célkereszt-ikon) és az „Érintett fogak"
  összesítő — a fogszám-hiba fő megelőzője; nem nyomta meg egyiket sem.
- **Új verzió** — látta, de nem merte megnyomni („akkor a v1 mi lesz?"); a verzió-lánc
  immutabilitását (a v1 sosem íródik felül) nem ismerte fel.
- **Másolás új tervbe** — látta a gombot, nem próbálta.
- **Több fázis** — a „Fázis hozzáadása" gombot látta, egyfázisú tervet készített.
- **Kedvezmény / ajánlati ár átírása / becsült ár jelölése** — az Ajánlati ár mezőt nem
  írta át, a „≈" jelet nem értette.
- **Egyedi végösszeg, előleg** — a pipákat megnevezte, nem próbálta.
- **Csak ajánlat** — a pipát megértette („ha csak árat akar"), nem használta.
- **Kezelések és árak** (árlista-admin) és **Beállítások** (rendelői adatok, nyomtatvány
  szövegei) — bevallottan nem nézett bele; a „Nyomtatvány szövegei" gombot az előnézeten
  nem nyomta meg.
- **Páciens adatai fül** a páciens lapján (a telefonszám-probléma itt lenne javítható).
- **Terv címének szerkesztése** (ceruza a verziósorban) — észrevette, kitalálta, mire
  való, nem próbálta.
- **Piszkozat folytatása** kártya a Kezdőlapon — nem hagyott félbe tervet, ezért nem
  látta.
- **Deutsch / EUR** — észrevette, hogy van, nem váltott.

## 5. Nem javítandó, hanem Istvántól megkérdezendő

1. A napi munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a korábbi
   terveket keresed, páciens nélkül? (fix kérdés — az app ma a páciensből indulásra épít)
2. Amikor egy tervet kinyomtattál és a páciens aláírta, mi történt a papírral az elmúlt
   hónapban: lefűzted, lefotóztad, beszkennelted, vagy csak a páciensnél maradt? (a
   sikerképernyő „mi a következő lépés" kérdéséhez)
3. Az elmúlt héten hányszor írtál be páciensnek telefonszámot vagy születési dátumot
   utólag, a terv írása közben — és hányszor a kartonra külön?
4. Melyik kezeléseknél nem írtál soha fogszámot a papírra (fogkő, röntgen,
   konzultáció, fogfehérítés)? Van olyan, ahol egy fogszám nélküli sor rendben van?
5. A Chrome-od a Macen magyar vagy angol nyelvű? (A dátummezők kijelzése ettől függ.)
6. Amikor a kezelést gépeled, először a beavatkozás neve jut eszedbe és utána a fog, vagy
   fordítva — a papíron eddig melyiket írtad előbb?
7. Az elmúlt hónapban hányszor fordult elő, hogy ugyanazt a tervet két gépen vagy két
   ablakban is nyitva tartottad (asszisztens + saját gép)?
8. Ha a program egy kész terv címét „Korona és hídpótlások"-nak nevezi el, ezt a papíron
   így hagynád, vagy átírnád — és mire?
9. Egy három oldalas nyomtatványt (terv + nyilatkozat + aláírás) hogyan adtál eddig oda:
   mind a három lapot kinyomtatva, vagy csak az elsőt?
10. Egy kiadott terv után hányszor kellett eddig „még egyszer ugyanazt, egy kis javítással"
    csinálnod — és mit tettél a régi papírral?

## 6. Ami jól működik

- **A cél elsőre érthető**: a Kezdőlap címe és a „+ Új kezelési terv" gomb önmagában
  elmondta Istvánnak, mire való a program — helyes képet alkotott, és a fő flow-t kereste
  elsőnek.
- **A háromlépéses fejléc** (Terv adatai — Kezelések — Előnézet és véglegesítés) rögtön
  érthető volt, és végig tudta, hol tart.
- **Az „Új terv indítása" magyarázata** („az ő mentett adatait a terv átveszi, nem kell
  újragépelni") megnyugtató és igaz.
- **A tétel-kereső**: az ékezet nélküli tipp („eszt, koron, gyoker") tetszett, a
  csoportosított, árakkal jelölt találati lista „pont ez kellett"; a „zirkon" keresés és
  az Enter elsőre sikerült.
- **Az automatikus mentés** és a „Piszkozat mentve HH:MM" jelzés: a böngésző-frissítés
  után minden megmaradt, István megnyugodott — „nem kell külön menteni".
- **Escape a keresőben** kiüríti a téves bevitelt; István másodszor már tudatosan
  használta.
- **A fogtérkép a PDF-en**: „szép, a 36-os zölden — a páciens érti".
- **A sikerképernyő figyelmeztetés-összefoglalója** („Ezek a figyelmeztetések álltak fenn
  a véglegesítéskor") megvan — a veglegesites-jelentés 4. megállapítása óta javítva.
- **A dupla kattintás elleni védelem** a véglegesítésen működik.
- **A DEMÓ-sáv** üzenetét („ne írj be valódi páciensadatot") István megértette és
  betartotta.

## Nem ellenőrizhető

- **A letöltött fájl neve és lemezre kerülése** (izolált profil): István elvárása
  („Teszt Elek kezelési terv" legyen a fájlnév, ne UUID) a 9. megállapításban
  `megfigyelt` a nézegető címére, a tényleges letöltési fájlnévre **feltételezés**.
- **Natív dátummező magyar Chrome-ban** (6. megállapítás): a kijelzett formátum
  böngésző-nyelvfüggő; István Macjén nem ellenőrizhető innen — a valódi teszten az 5.
  kérdés dönti el.
- **Valódi fájlrendszeres tárolás**: a `DemoStorage` (localStorage) fut; a 14. és 15.
  megállapítás (két fül, mentés közbeni frissítés) az Electron/`FileSystemStorage`
  fázisban másképp viselkedhet — ez a mockup-fázis korlátja.
- **A ténylegesen kinyomtatott papír**: nincs nyomtató a menetben; István a nyomtató-ikont
  szándékosan nem nyomta meg.
- **A PDF iframe belseje**: csak képernyőképpel (`18-elonezet.png`,
  `23-megnyitas-kulon.png`) ellenőrizve; a „v0" felirat a képen olvasható. A
  `22-megnezes.png` fekete doboza a teljes oldalas képernyőkép műterméke (a beágyazott
  PDF-nézegető az a11y-fában rendesen betöltve látszik), nem app-hiba.
