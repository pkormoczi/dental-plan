# Doctor-review forgatókönyvek

Tizenhárom forgatókönyv. Egy futás egy forgatókönyvet jár be. Minden
forgatókönyv öt mezőt kap:

- **Cél** — laikus nyelven, úgy, ahogy az asszisztens szólna Istvánnak az
  ajtóból. **App-szakszó (piszkozat, verzió, véglegesítés, „csak ajánlat",
  törzsadat, pillanatkép, admin) nem szerepelhet benne** — ha a cél maga
  megnevezi a funkciót, a felfedezhetőség nem mérhető. Ezt a mezőt kapja
  meg a persona.
- **Amit István tud** — a rendelői tények, amiket egy orvos e nélkül az
  app nélkül is tudna (a páciens neve, mit kér, mit adott). Ezt is a
  persona kapja.
- **Kiindulás (fő ügynök)** — melyik képernyőn álljon az app a persona
  indításakor, és mit kell a fő ügynöknek előkészítenie. **Ezt a mezőt a
  persona NEM kapja meg.**
- **Lefedett folyamatok** — a `persona.md` 21 pontos térképének sorszámai.
- **Ismert korlát.**

**Kattintási útvonal szándékosan nincs sehol** — azt a naiv bejárónak kell
megtalálnia.

A `Kiindulás` a `reset` (lásd `SKILL.md` § 0. fázis) UTÁNI, friss
seed-adatra épül (`app/src/storage/seed/plans.ts`). A konkrét páciensnevek
a seed jelenlegi tartalmát tükrözik (Kovács János, Nagy Éva — két
terv-lánccal —, Tóth Zoltán, Szabó Anna, Horváth Péter — német/eurós
tervvel —, Kiss Márta, Németh Gábor, Varga Zsófia, Molnár Tamás, Farkas
Katalin, Balogh Dániel, Takács Eszter). Ha a seed időközben változott, a fő
ügynöknek a felkínálás előtt egy gyors ellenőrzéssel (a Pácienslistán) kell
megbizonyosodnia, hogy a névre még illik a leírás, és ha nem, a legközelebbi
hasonló seed-pácienst kell ajánlania helyette, nem hibáznia a futást. A
seedben NEM szereplő, kitalált nevek (Lakatos Ilona, Fekete Márton) ezért
vannak: új páciens felvételéhez.

---

## Felfedezés

### `elso-megnyitas`

- **Cél:** „István, megjött a link a fejlesztőtől az új programhoz, ami az
  Excelt váltja. Nézz bele, amíg nincs páciens — kb. tíz perced van. Mondd
  el, szerinted mire való, mit lehet benne csinálni, és próbálj meg
  elvégezni valamit, ami szerinted a leggyakoribb dolgod lesz vele."
- **Amit István tud:** semmit az appról. Azt tudja, hogy eddig Excelben
  írta a kezelési terveket, kinyomtatta, a páciens aláírta.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés. A
  „tíz perc" a persona számára kb. 25–30 műveletet jelent — ezt a
  promptban számként add meg, hogy a bejárás véget érjen.
- **Lefedett folyamatok:** nincs kijelölt — a felfedezhetőséget méri
  önmagában. Ez az egyetlen forgatókönyv, amelynek saját jelentés-sablonja
  van (`SKILL.md` § Jelentés-szerződés, „elso-megnyitas sablon").
- **Ismert korlát:** a persona nem kap célt, ezért a napló csapongó lehet —
  ez a szándék, nem hiba.

## Mindennapi munka

### `zsufolt-reggel`

- **Cél:** „Hétfő reggel, az első páciens tíz perc múlva jön. Tegnap
  délután elkezdted Balogh Dániel tervét, de a telefon miatt félbehagytad —
  fejezd be. Utána jön egy vadonatúj páciens, Lakatos Ilona, akiről még
  csak a nevét tudjuk, őt is vedd fel. És ha közben csörög a telefon, hát
  csörög."
- **Amit István tud:** Balogh Dániel régi páciens. Lakatos Ilona még sosem
  járt itt. A telefon a rendelőben tényleg gyakran csörög.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Mivel a reset a
  félbehagyott munkát is törli, a promptba ezt a kiegészítést tedd bele
  István nyelvén: „A tegnapi félbehagyást most játszd el: kezdd el Balogh
  Dániel tervét, írj bele két-három kezelést, aztán — mintha csörögne a
  telefon — nézz meg valami mást a programban, és csak utána térj vissza
  befejezni."
- **Lefedett folyamatok:** 1 (nap indítása, félkész munka felismerése/
  folytatása), 2 (új páciens gyors felvétele, csak névvel), 21 (visszatérés
  megszakítás után).
- **Ismert korlát:** a demó `localStorage`-alapú, nincs valódi
  „telefonhívás" esemény — a megszakítást navigációval kell szimulálni.

### `uj-terv`

- **Cél:** „Nagy Éva egy nagyobb rendbetételt kér, de több lépcsőben akarja
  csináltatni, ahogy a pénze engedi. Rakd össze neki: ami a listánkban van,
  azt onnan, de kell egy éjszakai harapásemelő sín is, ami szerintem nincs
  a listában. Írd rá, melyik fogról van szó."
- **Amit István tud:** Nagy Éva régi páciens. A kezelések: 16-os fog
  gyökérkezelés + korona (első lépcső), 26-os és 27-es tömés (második
  lépcső), fogkő + sín (harmadik lépcső). Menet közben rá fog jönni, hogy
  egyik tömést a 25-ösre írta 26 helyett, és hogy a fogkőnek az elsőnek
  kellene lennie, nem a harmadiknak.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A promptba tedd bele
  István nyelvén: „Amikor már bent van minden, vedd észre, hogy az egyik
  tömést rossz fogra írtad, és a lépcsők sorrendje sem jó — javítsd."
- **Lefedett folyamatok:** 5 (több fázis, több sor), 6 (kereső + fogtérkép),
  7 (egyedi kezelés), 8 (fogak/mennyiség/ár/kedvezmény/leírás/becsült ár),
  9 (javítás, törlés, visszavonás, átrendezés).
- **Ismert korlát:** nincs.

### `papirrol`

- **Cél:** „Kiss Márta múlt héten kapott egy kézzel írt tervet tőled,
  itt van a lap. Vidd be a programba pontosan úgy, ahogy a papíron van,
  hogy legyen róla rendes nyomtatvány."
- **Amit István tud:** a papírlap tartalma, szó szerint így (az ő saját
  rövidítéseivel — a programban a hivatalos neveket kell megtalálnia):

  ```
  Kiss Márta — terv, aug.
  1. lépcső (előkészítés)
    - panoráma rtg
    - fogkő komplett
    - 16: gyökértömés, 3 csat.
    - 16: csonkfelépítés
  2. lépcső (pótlás)
    - 16: fémker. korona
    - 36: Neodent impl.
    - 36: impl. fej
    - 36: cirkon korona implantra — kb. ár, függ a technikustól
  3. lépcső
    - 21: eszt. tömés 2 felsz.
    - konzultáció ½ óra
  koronára 10% kedv.
  előleg 100 e Ft
  ```
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A papírlap szövegét
  szó szerint, a fenti kódblokkban, tedd a promptba.
- **Lefedett folyamatok:** 5, 6, 8 (fogak, mennyiség, kedvezmény, becsült
  ár), 13 (előleg) — és a tételfelvitel sebessége egy valós, 10 soros
  bevitelen mérve.
- **Ismert korlát:** a persona gépel, nem másol — egy futás hosszú lesz.
  Ez a szándék: pont a bevitel ritmusát mérjük.

### `nagy-terv`

- **Cél:** „Németh Gábor teljes szanálást kér, négy szakaszban, sok
  kezeléssel. Itt a lista, vidd fel az egészet, és a végén nézd meg, hogy
  stimmel-e az összeg, meg hogy a második szakasz mennyi külön."
- **Amit István tud:** a kezelések listája szakaszonként:

  ```
  1. szakasz — előkészítés
    panoráma rtg; fogkő komplett; 18 fogeltávolítás; 28 fogeltávolítás;
    38 bölcsességfog műtéti; 48 bölcsességfog műtéti; 46 fogeltávolítás
  2. szakasz — gyökérkezelések
    16 gyökértömés 3 csat.; 16 csonkfelépítés; 26 gyökértömés 3 csat.;
    26 csonkfelépítés; 36 fogbél megnyitás + gyógyszeres zárás;
    36 gyökértömés 3 csat.; 36 csonkfelépítés
  3. szakasz — implantátumok
    46 Neodent impl.; 46 impl. fej; 46 cirkon korona implantra (kb.);
    ideiglenes korona rendelői 3 db
  4. szakasz — koronák, tömések
    16 fémker. korona; 26 fémker. korona; 36 fémker. korona;
    11 eszt. tömés 1 felsz.; 21 eszt. tömés 1 felsz.; 12 fognyaki tömés;
    22 fognyaki tömés; konzultáció ½ óra
  ```
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A listát szó szerint
  tedd a promptba.
- **Lefedett folyamatok:** 5 (sok fázis, sok sor), 8, 14 részben (az
  összegek ellenőrzése az előnézet előtt) — hosszú görgetéses, sok soros
  tervnél az áttekinthetőség.
- **Ismert korlát:** hosszú futás. Ha a persona a 26 sorból 15 után
  kimondja, hogy elég volt, az önmagában érvényes megállapítás — ne
  kényszerítsd végig.

### `surgos`

- **Cél:** „A recepción vár egy új páciens, Fekete Márton, három perced van
  rá. Írásos árat kér két tömésre és egy fogkőre, csak hogy tudja, mire
  számítson — aláírni most nem fog semmit, csak a papírt viszi el."
- **Amit István tud:** Fekete Márton még sosem volt itt. Két esztétikus
  tömés (1 felszín, 14 és 15), egy fogkő komplett. Nem kell aláírás.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés.
- **Lefedett folyamatok:** 2 (új páciens gyorsan), 6, 15 („csak ajánlat"
  jellegű dokumentum, anélkül, hogy a persona ezt a nevet ismerné), 14
  (előnézet, letöltés) — a minimális kattintás-út mérése.
- **Ismert korlát:** a „három perc" a persona számára kb. 15 művelet —
  add meg számként. Ha túllépi, jegyezze fel, hol ment el az idő.

### `paciens-elott`

- **Cél:** „Molnár Tamás bent ül melletted, együtt nézitek a képernyőt,
  neki magyarázod, mi mennyibe kerül. Rakd össze a tervét vele együtt, és
  a végén adj neki valamit a kezébe, amit hazavihet."
- **Amit István tud:** Molnár Tamás régi páciens, árérzékeny, kérdezni fog
  a kedvezményről. A terv: 46 gyökérkezelés + korona, 47 tömés. István
  10% kedvezményt ad a koronára, de ezt nem akarja a többi páciens előtt
  „hirdetni".
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A promptba tedd bele
  István nyelvén: „Minden képernyőnél mondd ki, mi az, amit NEM szeretnéd,
  hogy a páciens lásson — más páciens neve, belső jelzés, kedvezmény, ami
  nem neki szól —, és hogy szerinted látja-e."
- **Lefedett folyamatok:** 6, 8 (kedvezmény), 14, 16 részben — és az a
  kérdés, hogy a képernyő páciens előtt is mutatható-e.
- **Ismert korlát:** a persona egyedül van, a „páciens" fiktív — a
  megállapítások itt jellemzően erős következtetés szintűek.

## Ritkább, de valós helyzetek

### `nevutkozes`

- **Cél:** „Bejelentkezett egy új páciens, úgy hívják, Nagy Éva — vedd fel.
  Közben Kovács János szólt, hogy rosszul van bent a telefonszáma, javítsd
  ki, és nézd meg, hogy a régebbi tervén is a jó szám van-e."
- **Amit István tud:** van már egy Nagy Éva páciensük; az új Nagy Éva egy
  másik ember (más születési dátum, más telefon). Kovács János új száma:
  +36 30 111 2222.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés.
- **Lefedett folyamatok:** 3 (hasonló nevű/már létező páciens), 4 (meglévő
  páciens keresése és adatjavítás), 19 (a páciens adatlapja és egy régebbi
  terven szereplő adat eltérése).
- **Ismert korlát:** a seedben nincs két EGYMÁSHOZ HASONLÓ (de nem azonos)
  nevű páciens — ha ez a részág fontos, a promptba tedd bele: „a páciens
  neve lehet, hogy Nagy Évi, nem biztos" a duplikáció-felismerés
  próbájához.

### `nemet-euro`

- **Cél:** „Horváth Péter új tervet kér. Elkezdted neki magyarul,
  forintban, ahogy mindenkinek, de kiderült, hogy németül és euróban kéri
  a papírt, mint eddig. Adott 500 euró előleget is, és a végösszeget
  kerekítsd le egy kerek számra, ahogy megbeszéltétek."
- **Amit István tud:** Horváth Péter osztrák, korábban is németül kapta a
  papírt. Kezelések: 36 Neodent implantátum + fej + cirkon korona
  implantátumra. Előleg: 500 EUR. A végösszeget 3 000 EUR-ra kerekítik.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés.
- **Lefedett folyamatok:** 10 (nyelv/pénznem/orvos/dátum módosítás
  megkezdett tervnél), 12 (magyar/német, forint/euró terv), 13 (előleg és
  egyedi végösszeg).
- **Ismert korlát:** nincs.

### `veglegesites`

- **Cél:** „Kiss Márta terve kész, ő itt van, aláírja. Nézd át, mi kerül a
  papírra, amit alá fog írni, figyelj oda, ha a program szól valamiért, és
  add ki neki. Utána Takács Eszternek is kell egy ár két tömésről, de ő
  csak gondolkodni akar rajta, nem ír alá semmit."
- **Amit István tud:** Kiss Márta terve: 16 gyökértömés (a csatornák száma
  még nem biztos, ezért az ára is csak körülbelüli), 16 fémkerámia korona,
  és egy „arcüregemelés zárt", aminek a listánkban szereplő ára István
  szerint már régi — ő 180 000 Ft-ot mondott a páciensnek, azt kell a
  papírra írni. Takács Eszter: 24 és 25 esztétikus tömés 1 felszín.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A persona maga készíti
  el a tervet — nincs előkészítés. A seed árlistában ma minden tétel
  beárazott, ezért a „hiányos ár" ág nem a listából jön, hanem a kézzel
  átírt (180 000 Ft) és a becsült (gyökértömés) árból; ha a seed
  időközben kap ár nélküli tételt, azt is írd bele az „Amit István tud"
  mezőbe.
- **Lefedett folyamatok:** 11 (hiányos/elavult/kézzel átírt tartalom az
  ellenőrző jelzéseken), 14 (előnézet, figyelmeztetések, kiadás), 15
  (aláírás nélküli, csak árat közlő dokumentum).
- **Ismert korlát:** a PDF-iframe belseje nem ellenőrizhető képernyőképpel
  (lásd `SKILL.md` § Nem ellenőrizhető) — a persona csak a külső
  megjelenést és a letöltési felajánlást tudja értékelni.

### `hiba-javitas`

- **Cél:** „Vedd fel Varga Zsófiának ezt a kis tervet: 26-os fogra egy
  fémkerámia korona, add is ki neki, itt van, aláírja. — Fél óra múlva
  bejön az asszisztens: bocsánat, összekeverte, ez nem Varga Zsófia volt,
  hanem Farkas Katalin. És a korona ára is rossz, a mostani listánkon
  20 000-rel több. Hozd rendbe úgy, hogy Farkas Katalin a jót kapja, és a
  Varga Zsófia nevére kiadott papírral is legyen valami."
- **Amit István tud:** a hiba nem az ő hibája, de neki kell rendbe tennie.
  Nem tudja, mit lehet egy már kiadott papírral csinálni a programban.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. A persona maga készíti
  és adja ki az első (rossz) tervet — így a hibás állapot hitelesen jön
  létre. A promptba tedd bele: „Az asszisztens megjegyzése csak AZUTÁN
  jön, hogy a papírt már kiadtad."
- **Lefedett folyamatok:** 14 (kiadás), 17 (módosítás egy már kiadott
  terven), 9 (javítás), 16 — és az a kérdés, mit lehet visszacsinálni,
  mit nem, és érthető-e, hogy miért nem.
- **Ismert korlát:** a kiadott dokumentumot a szabályok szerint nem lehet
  átírni — a persona ezt nem tudja, és valószínűleg meg fogja próbálni.
  Ez a szándék.

### `visszatero-paciens`

- **Cél:** „Nagy Éva visszajött, tavaly volt itt. Keresd meg, mit
  csináltunk neki eddig, add oda újra a papírt, mert elvesztette. Aztán két
  kezelést mégsem kér a régiből, azt vedd ki és adj neki új papírt. Ja, és
  Molnár Tamás pont ugyanezt a kezelést kéri, ne írd be neki elölről az
  egészet."
- **Amit István tud:** Nagy Évának volt már terve, több is. Molnár Tamás
  is régi páciens.
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés.
- **Lefedett folyamatok:** 16 (korábbi terv megkeresése, megtekintése, PDF
  letöltése), 17 (módosított változat egy régi tervből), 18 (átvitel egy
  másik páciensre).
- **Ismert korlát:** a letöltött fájl tényleges lemezre kerülése nem
  ellenőrizhető (izolált profil); a seed-elt régi tervekhez nincs mentett
  PDF.

## Rendelő karbantartása

### `admin`

- **Cél:** „Rendelés előtti fél óra. A technikus drágább lett: az
  esztétikus tömés 2 felszín mától 5 000 Ft-tal több. A fogfehérítés
  egy fogra kezelést nem csináljuk többet, ne is lehessen kiválasztani. És
  a rendelő telefonszáma is megváltozott, az kerüljön a papírokra."
- **Amit István tud:** az új árat és az új telefonszámot (+36 1 999 8877).
  Nem tudja, hol vannak a programban „a beállítások".
- **Kiindulás (fő ügynök):** reset után a Kezdőlap. Semmi előkészítés.
- **Lefedett folyamatok:** 11 (hiányos ár, elavult árlistai adat, inaktív
  kezelés — az admin oldaláról), 20 (árlista/rendelői beállítás
  módosítása reális helyzetben).
- **Ismert korlát:** nincs.
