# Backlog 25. tétel — Páciens-entitás a Korábbi tervek fájában — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 25. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `PlanHistoryPage.tsx` ("Korábbi tervek") ma páciensmappánként
csoportosít, alatta a verziókkal. Ez azért elég, mert a mai adatmodellben
**egy páciensmappa = egy terv-lánc** — ha ugyanahhoz a névhez új tervet
indítunk (akár „Új terv", akár „Másolás új tervbe"), az mindig egy MÁSIK
páciensmappát nyit (D26). A `docs/02-domain-modell.md` ezt szándékos
döntésként rögzíti: *"a doki a Korábbi tervek listán a névismétlésről
ismeri fel, hogy összetartoznak, nincs köztük külön hivatkozó mező."*

Egy visszatérő páciensnél ez a lista gyorsan áttekinthetetlenné válik: ha
egy páciensnek 10 terve van, mindegyiknek 2-3 verziója, ugyanaz a név
tucatszor ismétlődik egymás alatt, semmilyen csoportosítás nélkül. A
javasolt megoldás egy harmadik szint bevezetése: **páciens → terv →
verzió**, ahol a páciens most először válik a fájlrendszerben is
azonosítható, önálló entitássá.

## Döntések

### 1. Páciens mint valódi entitás, explicit hivatkozással — D26 pontosítása

Nem névegyezés-heurisztika dönti el, hogy két terv-lánc ugyanahhoz a
valós pácienshez tartozik-e, hanem egy explicit `paciensId`, amit a doki
tudatosan választ (lásd 5. döntés).

**Miért:** két elvetett alternatíva:

- **Csak vizuális csoportosítás névegyezés alapján** (a megjelenített nevet
  normalizálva csoportosítani a ma is független terv-mappákat) — nem
  igényelne mappa-átszervezést, de a `docs/02-domain-modell.md` már ma is
  figyelmeztet: *"két Kovács János is lehet"*. Egy ilyen csoportosítás
  tévesen összevonna két különböző, azonos nevű pácienst, és tévesen
  szétválasztana egy elgépelt vagy házasságkötés utáni névváltozású
  ugyanazon pácienst.
- **Utólagos, kézi összekapcsolás** külön mezővel, mappa-átszervezés
  nélkül — kevésbé invazív, de a doki felelőssége maradna felismerni és
  összekötni a duplikációt, ami pont az eredeti panaszt (a lista
  áttekinthetetlensége) hagyná megoldatlanul a kapcsolás megtörténtéig.

Ez **pontosítja**, nem törli el D26-ot: a „egy másolat sosem csúszhat be
verzióként egy meglévő láncba" invariáns változatlan (lásd 5. döntés
utolsó bekezdése). Ami változik: a páciens-szintű mappa mostantól nem
azonos a terv-lánc mappájával — egy páciensnek több terv-lánca lehet
ugyanabban a páciens-mappában.

### 2. Tárolási szerkezet: fészkelt mappák

```
paciensek/
  Kovacs-Janos_p7x2/              <- páciens-mappa (ÚJ szint)
    paciens.json                   <- ÚJ: { paciensId, nev } — lásd 3. döntés
    fogpotlas_a3f9c1/               <- terv-mappa (a mai páciensmappa, egy szinttel lejjebb)
      terv-cimke.json               <- ÚJ: { tervCim } — lásd 4. döntés
      2026-08-05_v1/
        kezelesi-terv.pdf
        terv.json
      2026-08-19_v2/
        kezelesi-terv.pdf
        terv.json
    fogszabalyozas_b8e1d2/
      terv-cimke.json
      2026-08-10_v1/
        ...
```

A páciens-mappa neve a mai páciensmappa-szabályt követi
(`Vezeteknev-Keresztnev_<6 karakteres id>`, `docs/02-domain-modell.md` §
Mappanév szabályok); a terv-mappa neve ugyanígy, a terv-címkéből
szlugosítva (`<szlugosított cím>_<6 karakteres id>`).

**Miért:** a fészkelt szerkezet a doki Fájlkezelőbeli mentális modelljét
követi (ő is így keresne rá: páciens, azon belül melyik terv) — ugyanaz
az elv, ami miatt az ékezetes páciensnév-mappa is megmarad. Egy lapos
szerkezet + központi `paciensek.json` regiszter kevesebb fájl-mozgatással
járna, de egyetlen, minden új páciensnél újraírt közös fájlt vezetne be —
ez pont az a fajta ütközési kockázat (Drive `conflicted copy`), amit a
verziónkénti-új-mappa elv (D4) máshol tudatosan elkerül.

### 3. D7 megmarad — a `paciens.json` csak azonosító/index

A `paciens.json` MOST csak két mezőt kap: `paciensId`, `nev`. A
`terv.json` `paciens` blokkja (benne a **már ma is meglévő**
`telefon`/`email`/`lakcím`/`taj` mezőkkel, `app/src/domain/types.ts`
`Paciens` interfész) **változatlanul minden verzióban saját
pillanatképet őriz** — ezt ez a tétel nem érinti.

**Miért:** D7 ("az ajánlat pillanatkép") nem sérülhet — egy páciens
adatváltozása (költözés, névváltozás) nem írhatja át visszamenőleg egy
már mentett/aláírt terv megjelenített adatait. A `paciens.json` kizárólag
kereséshez és előtöltéshez való gyorsítótár, sosem ír felül már mentett
tervet.

### 4. Terv-címke: külön fájl, doki-szerkeszthető, auto-javaslattal

A `terv-cimke.json` (a terv-mappa gyökerén, a verzió-mappákon KÍVÜL, tehát
D4 hatályán kívül) egyetlen mezőt tartalmaz: `tervCim` (szabad szöveg).

- **Bármikor szabadon átírható**, egy már véglegesített/aláírt terv
  esetén is, új verzió nyitása nélkül — tisztán szervezési metaadat, nem
  kerül a nyomtatványra.
- **Élő auto-javaslattal előtöltve**: amíg a doki kézzel át nem írja, a
  mező a terv aktuális soraiból számolt domináns kategória nevét mutatja
  (a kategória-`sorrend` ütközési precedencia mintájára, lásd
  `resolveToothVisual`/D28) — a pontos metrika (legkisebb `sorrend`-ű
  kategória vs. legnagyobb összegű kategória a jelenlévők közül) az
  implementáló döntése. Kézi átírás után a javaslat „megragad", többé nem
  frissül automatikusan.
- **Megjelenítve a listán mindig**: `<tervCim> · <a terv legkorábbi
  verziójának dátuma>`.
- Üres tervnél (még nincs sor) egy egyszerű alapértelmezés látszik (pl.
  „Terv"), amíg az első tétel be nem kerül.

**Miért:** a doki explicit kérése — szabad szöveges címet akar, de fél,
hogy siettében semmitmondó szöveget írna be, ezért kell az automata
javaslat. A külön fájl a D4-ütközés elkerülése miatt kell (lásd a fájl
tetején lévő nyitókérdés): egy már aláírt terv címkéjét a doki bármikor
pontosíthatja, anélkül hogy ez új verziót igényelne.

### 5. Belépési pont: kereső/választó lépés a Home „Új terv indítása" előtt

A Home „Új terv indítása" gombja **egy köztes kereső/választó lépésre**
navigál, mielőtt a (mai, üres) Páciens adatlap betöltene:

- **„Meglévő páciens keresése…"** — névre kereső mező, a `paciens.json`
  index alapján. Kiválasztás után a Páciens adatlap előtöltve nyílik — a
  kiválasztott páciens legutóbb módosított terv-láncának legfrissebb
  verziójából átvett `paciens` blokkal, a meglévő
  `planUjPaciensselTervhez`/`ujTervPaciensAdataival` mechanizmus
  újrahasznosításával (csak a forrás kiválasztása más: nem egy konkrét
  Korábbi tervek-sorból indul, hanem a páciens-keresőből). Ha a
  páciensnek több terv-lánca van, melyiket tekintjük „legutóbb
  módosítottnak" az előtöltéshez — az implementáló döntése (alapértelmezett
  javaslat: a legfrissebb `keltezes`-ű terv-lánc legfrissebb verziója).
- **„Vadonatúj páciens"** — a Páciens adatlap üresen nyílik, pontosan mint
  ma.

A **Korábbi tervek** oldal saját „Új terv…" gombjai (verzió-sor és
páciens-szint egyaránt) **változatlanul** viselkednek — csak most már egy
meglévő páciens EGY MÁSIK terv-láncát indítják el (nem új
páciens-mappát), mert a célpáciens azonosítója már adott a forrás
tervből. Itt nincs szükség a kereső/választó lépésre, mert nincs
kétértelműség.

**Miért:** a mai három terv-indítási útból kettő (a Korábbi tervek
gombjai) már ma is egy konkrét, ismert forrásból indul — a
kétértelműség kizárólag a teljesen friss, Home-ról induló útnál áll fenn,
ahol a doki még nem gépelt be semmit. Csak ott van szükség új UI-lépésre.

### 6. Kontaktadatok hatóköre: kikerül ebből a tételből

A `paciens.json` sémája MOST csak `paciensId` + `nev`. A `terv.json`
`paciens` blokkjában már ma is létező `telefon`/`email`/`lakcím`/`taj`
mezők (pillanatképként, D7 szerint, változatlanul) **nem ennek a
tételnek a részei** — ezek már ma is működnek, csak tervenként, nem
páciensenként aggregálva.

Egy önálló, terveken átívelő, „élő" kontaktnyilvántartó (amit a doki a
terv-mentéstől függetlenül bármikor frissíthet — pl. ha a páciens
telefonszámot vált) — **külön backlog-tétel**, nem ennek a tételnek a
része.

**Miért:** a doki csak jövőbeli lehetőségként említette ("Később
amúgy is lehetséges..."), nem konkrét igényként. A `paciens.json` sémája
később bővíthető ezekkel a mezőkkel, de a most bevezetett minimális alak
(csak azonosításhoz szükséges `nev`) nem zár ki semmit.

### 7. Kibontás/összecsukás: páciens szinten, a terv-szám alapján

A páciens-blokk alapból **összecsukva** jelenik meg, ha a páciensnek
**1-nél több** terv-lánca van (csak a név + terv-szám + a legutóbb
módosított terv legfrissebb dátuma/összege látszik zárt állapotban — a
pontos zárt-állapot tartalom az implementáló döntése), kattintásra nyílik
ki a terv-lista, alatta tervenként a verziók. Ha a páciensnek csak
**egyetlen** terve van (ma ez a tipikus eset), automatikusan kibontva
jelenik meg — nincs plusz kattintás az egyszerű esetben.

A verzió-szint egy kibontott terven belül **mindig** látszik, nincs
harmadik szintű összecsukás (tipikusan 2-3 verzió, még átlátható).

**Miért:** ez oldja meg közvetlenül az eredeti panaszt (sok páciens × sok
terv = végtelen görgetés) anélkül, hogy a tipikus, egyetlen terv/páciens
esetben extra kattintást vezetne be.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Kontaktadat-kezelő UI / önálló „páciensek" képernyő** (telefonszám,
  email szerkesztése páciensszinten) — lásd 6. döntés, külön backlog-tétel.
- **Két páciens-entitás utólagos összevonása**, ha a doki tévedésből
  duplikált egy valós személyt (pl. elgépelt névvel nem találta meg a
  keresőben) — erről nem volt szó, nyitva maradt kérdés; ha felmerül
  igényként, külön tétel.
- **Terv-címkére kiterjedő keresés** — a Korábbi tervek keresőmezője
  marad páciensnév-alapú, nem bővül a terv-címkére.
- **Meglévő demó-adat (`storage/seed/plans.ts`, `DemoStorage.ts`)
  tényleges átalakítása** az új mappastruktúrára — implementációs lépés,
  nem külön döntés: a mockup-fázisban nincs éles doktori adat, a demó
  bármikor újragenerálható.
- **A leendő `FileSystemStorage` (2. fázis) tényleges megvalósítása** —
  ez a tétel csak a `PlanStorage` interfész és a mappastruktúra
  CÉLKÉPÉT rögzíti a mockupban; a fájlrendszeres implementáció
  változatlanul a 2. fázisra van ütemezve (`docs/05-technologia.md`).

## Érintett helyek (tájékoztató, nem kimerítő)

- `docs/01-attekintes-es-dontesek.md` — D26 pontosítása (lásd 1. döntés);
  a lezáráskor a szokásos folyamat szerint (`CLAUDE.md` § Backlog-tétel
  lezárása) dől el, hogy módosított D26-sorként vagy új D-számként kerül
  be.
- `docs/02-domain-modell.md` § Mappastruktúra, § Mappanév szabályok — az
  új páciens-mappa szint, a `paciens.json` és a `terv-cimke.json` séma, a
  terv-mappa névképzési szabálya.
- `docs/03-funkcionalis-spec.md` § Korábbi tervek, § Terv másolása új
  tervként — a 3-szintű lista leírása, a belépési pont, a névismétlés-
  alapú felismerést kimondó mondat cseréje.
- `docs/05-technologia.md` § `PlanStorage` interface — a `PatientFolder`/
  `PlanRef`/`listPatients`/`listVersions` fogalmak egy köztes „terv"
  szinttel bővülnek; a pontos interfész-alak az implementáló döntése.
- `app/src/domain/types.ts` — `PatientFolder` átalakul/kiegészül
  (páciens-mappa szint), új típus a terv-mappa szintre (`tervCim`,
  terv-mappa azonosító), `PlanRef` bővítése egy `paciensDir`/`tervDir`/
  `versionDir` hármassá.
- `app/src/storage/paths.ts` — a `buildPatientDirName`/
  `parsePatientDirName` mintájára egy terv-mappa névképző/-visszafejtő
  pár, plusz a `terv-cimke.json` fájlnév és olvasó/író segédfüggvény.
- `app/src/storage/DemoStorage.ts`, `app/src/storage/seed/plans.ts` — a
  demó-implementáció és a seed-adat átalakítása az új struktúrára.
- `app/src/pages/Home.tsx` — az „Új terv indítása" gomb új köztes
  kereső/választó lépésre navigál `startNewPlan()` helyett/mellett.
- `app/src/pages/PatientPage.tsx` — előtöltés meglévő páciens
  választásakor (a `planUjPaciensselTervhez`/`ujTervPaciensAdataival`
  minta újrahasznosítása).
- `app/src/pages/PlanHistoryPage.tsx` — a lista 3 szintre bővül (páciens
  → terv → verzió), összecsukás/kibontás állapot, terv-címke inline
  szerkesztése és élő auto-javaslata.
- Új domain-segédfüggvény a domináns-kategória auto-javaslathoz (a
  `resolveToothVisual`/kategória-`sorrend` precedencia mintájára,
  `app/src/domain/` alá) — ha ez a tétel lezáráskor bekerül a
  `CLAUDE.md` „Meglévő segédfüggvények" listájába, ez lesz az anchor.

## Tesztelés (irányadó, nem kimerítő)

- Egy páciens két terv-láncának egymás mellett, helyesen elkülönített
  megjelenése (nem folynak össze, nem tűnik el egyik sem).
- A terv-címke auto-javaslata: friss tétel hozzáadása frissíti, kézi
  átírás után nem frissül tovább.
- „Meglévő páciens keresése" a Home-ról: kiválasztás előtölti a Páciens
  adatlapot; „Vadonatúj páciens" üresen nyit, mint ma.
- Páciens-blokk kibontás/összecsukás: 1 terv esetén alapból nyitva, 2+
  esetén alapból csukva, kattintásra nyílik.
- Egy már véglegesített (`VEGLEGES` státuszú) terv címkéjének átírása
  nem hoz létre új verziót.
