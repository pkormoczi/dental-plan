# Backlog 97. tétel — Kategórianévre is találjon a kezelés-kereső — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 97. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** a `docs/reviews/2026-08-25-doctor-review-uj-terv.md`
doktor-szimulációs jelentés 1. megfigyelése (magas súlyosság). A
`backlog/redesign/` döntéssorozat nem ismeri ezt a felvetést.

## Probléma

- A `domain/search.ts` `nevEgyezik()` kizárólag a tétel saját
  `nev.hu`/`nev.de` mezőjét nézi. A tétel `kategoriaId`-ja a keresés
  szempontjából nem létezik — pedig a kategórianév ugyanolyan teljes
  `LokalizaltSzoveg`, mint a tételnév.
- A `data/arlista.seed.json` 118 tételéből **3** található meg a saját
  kategóriája nevére keresve. A „Fogkőeltávolítás" kategória két tétele
  („Komplett kezelés: ultrahang, sófúvás, kézi műszeres kez., polírozás"
  és „Ismételt kezelés 3-6 havonta") egyetlen szakmai szóra sem jön elő —
  a nevük csak a kategória-fejléc alatt értelmes. Ugyanígy: `szajseb` → 0
  találat (33 tétel mögötte), `paro` → 1 találat (7-ből).
- A hiba **hamis nulla-találat**: az „Egyedi tétel felvétele" kilépési út
  pontosan ott sül el, ahol nem szabadna — a tétel létezik és karbantartott.
  A kézi árazású egyedi sorral elvész a `tetelId`, az árlistai kötés, az
  ár-követés (`domain/arKoveti.ts`), a német név és a fogtérkép
  kategória-színe.
- Mindkét kereső felület érintett: a szerkesztő `pages/planEditor/
  ItemPicker.tsx`-e és az árlista admin `domain/arlistaSzures.ts`
  szűrője, mert mindkettő ugyanazt a `nevEgyezik()`-et hívja.
- Ez feszül a D19 indoklásával („a doki fejből tudja a tételeket"): épp
  azoknál a tételeknél nem igaz, amiknek a neve önmagában nem azonosít
  kezelést.

## Döntések

### 1. A keresés kiterjed a kategórianévre, mindkét felületen

A tétel akkor is találat, ha nem a saját neve, hanem a **kategóriájának
neve** illeszkedik a keresőszövegre. Ez egyaránt vonatkozik a szerkesztő
tétel-keresőjére és az árlista admin szűrőjére — a két felület keresési
szabálya ma is közös, és az is marad.

A nulla-találatos üzenet **változatlan** marad (`Nincs találat.` + az
„Egyedi tétel felvétele: „…"" pszeudo-opció).

**Miért:** a mérés szerint a probléma nem szélső eset, hanem a 118 tétel
többségét érinti. A kategórianév ráadásul már ma is a rendszer saját
szókincse: a `domain/tervCim.ts` `javasoltTervCim()` a kategórianévből
képzi a terv címkéjét, tehát a felület maga tanítja meg a dokinak ezeket
a szavakat.

**Elvetett alternatíva A — csak a nulla-találatos üzenet javítása
(„Ezt keresed? [Kategórianév] alatt N tétel"):** a doktor-jelentés is
felveti, de két baja van. Egyrészt csak a NULLA találatos esetet fedi,
tehát a mérés szerinti vegyes eseteken (`korona`: 6 névtalálat mellett 16
rejtett tétel; `tomes`: 9 + 4) néma marad. Másrészt egy második,
párhuzamos UI-mechanizmust vezet be a találati lista mellé, amire a
dokinak külön reagálnia kell — a közvetlen találat kevesebb lépés és nem
igényel új komponenst.

**Elvetett alternatíva B — a tétel-leírás (`Tetel.leiras`) bevonása a
keresésbe:** elvben ugyanezt a fájdalmat enyhítené, de a leírás ma
egyetlen tételen sincs kitöltve (24. tétel), és szabad szöveg lévén sokkal
zajosabb találatokat adna.

**D19 érintetlen.** Nem épül kategória-böngésző, fa vagy kategória-választó
dropdown: a doki továbbra is gépel, csak több szóra kap találatot.

### 2. A kétnyelvű egyezés szabálya egy helyen marad

A kategórianév egyezését ugyanaz a `nevEgyezik()` dönti el, mint a
tételnévét: a kategória akkor illeszkedik, ha a `nev.hu` VAGY a `nev.de`
tartalmazza a normalizált keresőszöveget — **függetlenül a terv nyelvétől**,
pontosan úgy, ahogy a tételnévnél. Nem születik második illesztési szabály.

Az illeszkedő kategóriák halmaza **egyszer, a tétel-ciklus ELŐTT** számítódik
ki, nem tételenként újra — ez a `domain/search.ts` fejlécében kimondott
„a hívó a ciklus előtt egyszer normalizál" konvenció folytatása.

Ebből következik egy plumbing-kötelezettség: az `ItemPicker` ma egy
`catName(id) => string` **megjelenítő** resolvert kap, ami a
`resolveNev()`-en át már feloldotta a nyelvet (magyar visszaeséssel). Ez az
egyetlen string a kétnyelvű illesztéshez **nem elég** — a komponensnek a
kategória teljes `LokalizaltSzoveg`-jét kell látnia.

**Miért:** a „mindkét nyelven keresünk, mindig" szabály a `CLAUDE.md`
„A UX kritikus pontja" szakaszának kimondott elve (a doki magyarul gépel
akkor is, ha német ajánlatot állít össze). Egy magyar-only kategória-egyezés
csendes aszimmetriát vinne a rendszerbe.

### 3. Kétszintű találati lista az ItemPickerben

A találatok két, vizuálisan elkülönített szintre bomlanak:

1. **Névtalálatok** — a MAI sorrendben (az `available` tömb sorrendje) és a
   MAI, csupasz kategória-fejlécekkel.
2. **Kategória-egyezések** — azok a tételek, amik CSAK a kategórianéven át
   találatok, `Kategória: <kategórianév>` fejléc alatt.

Szabályok:
- Egy tétel **soha nem szerepel mindkét szinten** (a 2. szint a
  névtalálatok halmazának kivonása után marad).
- Az **Enter célpontja változatlanul az első névtalálat** — a `hi` minden
  leütésre 0-ra áll vissza, és a 2. szint mögötte van.
- A `Kategória:` fejléc — a mai kategória-fejlécekhez hasonlóan — **nem
  választható**, nem része a `↑ ↓` ciklusnak.
- A fejléc nyelve a mai fejlécekével azonos: a terv nyelve, magyar
  visszaeséssel.
- Az „Egyedi tétel felvétele: „…"" pszeudo-opció marad a lista
  legalján, mindkét szint után.

**Miért:** a `CLAUDE.md` „A UX kritikus pontja" szerint a gépel → nyíl →
Enter ciklus dönti el, hogy az app gyorsabb-e az Excelnél; a `docs/07`
külön kimondja, hogy ez a ciklus „nem törhet el". A mérés szerint egyetlen
kategória-egyezés 33 tételt is behozhat — ezek beszórása a mai
csoportosításba a legelső Enter célpontját is elmozdíthatja.

A `Kategória:` előtag azért kell, mert egy kategória **mindkét szinten
szerepelhet** (`korona`, `tomes`, `fog` esetén mérten így van), és két
azonos szövegű, csupasz fejléc olvashatatlan lenne.

**Elvetett alternatíva A — kategória-egyezés csak visszaesésként (kizárólag
nulla névtalálatnál):** a mai napi ciklust bájtra érintetlenül hagyná, de a
vegyes eseteken (`korona` 6+16, `tomes` 9+4, `paro` 1+7) néma marad — pedig
ezek a leggyakoribbak.

**Elvetett alternatíva B — teljes egybeolvasztás a mai kategória-
csoportosításba:** a legolcsóbb implementáció, de az Enter célpontja a
kategóriák `sorrend`-jének függvényévé válna, és ugyanaz a kategória két
azonos fejlécet kapna.

### 4. A 12-es limit közös, nem szintenkénti

Egyetlen, közös 12-es megjelenítési korlát marad (`docs/03-funkcionalis-
spec.md`: „a 12-es megjelenítési limit szándékosan nem emelkedik"). Az 1.
szint tölt először, tehát **egy névtalálatot sosem szorít ki egy
kategória-egyezés**. A `+N további találat — pontosíts a kereséssel` sor
egyetlen számot mutat, a két szintet összevontan.

Vállalt következmény: 12-nél több névtalálat esetén (`fog`: 31) a
kategória-blokk **egyáltalán nem jelenik meg**. Ez helyes — akinek 31
közvetlen találata van, annak nem a rejtett tételek hiányoznak, hanem a
pontosítás.

**Miért:** két külön számláló két külön üzenetet igényelne, miközben a
tanács mindkettőnél ugyanaz („pontosíts").

### 5. Az árlista adminban nincs új UI, csak az üres-állapot szövege frissül

A `pages/PriceListAdminPage.tsx` ma is **kategóriánként csoportosít** és
elrejti az üres csoportokat, ezért egy kategória-egyezés ott magától
„az egész csoport visszajön" alakban jelenik meg — új csoportosító vagy
jelölő kód nélkül, pusztán a predikátum bővítésétől.

A lapon egyetlen szöveg változik: a nulla-találatos üzenet
(ma: „Nincs találat erre: „…". Próbálj más névre keresni, vagy válts
szűrőt.") mondja ki, hogy kategórianévre is lehet keresni — a `docs/07-
felulet-rendszer.md` § Kötelező állapotok szabálya szerint („az empty
mondja meg, mit tegyen a felhasználó").

**Elvetett alternatíva — jelzés a kategória-csoport fejlécén, ha maga a
kategórianév illeszkedett:** magyarázná, miért maradt bent 33 olyan tétel,
aminek a nevében nincs benne a keresett szó — de állandó vizuális költség
egy sűrű szerkesztőrácson (`docs/07` § Komponensek, `Table.Root size="1"`),
olyan információért, amit a csoportfejléc puszta jelenléte már elmond.

### 6. A tömeges árváltoztatás „jelenlegi szűrt lista" köre együtt tágul

A `domain/arlistaSzures.ts` `tetelIlleszkedik()` bővítése mellékhatásként
a Tömeges árváltoztatás dialógus „A jelenlegi szűrt lista (N tétel)"
körét is tágítja. Ez **szándékos**: egyetlen keresési predikátum marad a
lapon.

**Miért:** a `docs/03-funkcionalis-spec.md` § Tömeges árváltoztatás elve
szerint a kör a lap kereső/szűrő predikátuma — amit a doki lát, az a
művelet köre. Két, egymástól eltérő keresési szabály esetén a látott lista
és a művelet hatóköre némán szétválna, ami rosszabb hibamód, mint egy
tágabb kör: a dialógus élő előnézete és a megerősítő lépése úgyis
soronként felsorolja, mi változik.

A nyitott sor kivétele (`tetelMegtartando()`) változatlan — az továbbra is
csak a `grouped` ágon él, a tömeges körön nem.

### 7. Amit ez a tétel szándékosan nem mozdít

- A **gyorsgombok** (`gyakori: true` chipek) külön szűrt halmazból jönnek,
  érintetlenek.
- A **pénznem továbbra sem szűr** a találatokra (D71): egy beárazatlan
  tétel kategória-egyezésen keresztül is felvehető, `—` listaárral.
- A picker továbbra is **csak `aktiv: true`** tételeket listáz.
- A **soron belüli kereső** (`pages/planEditor/LineRow.tsx`, portal módban,
  a fogtérkép-kattintás által indított folyamat is) ugyanazt a komponenst
  használja, tehát ugyanezt a két szintet kapja — nincs külön szabály rá.
- A `Kategoria`-nak nincs `aktiv` mezője; minden kategória részt vesz az
  illesztésben.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Kategória-böngésző, kategória-fa vagy kategória-szűrő dropdown**
  bármelyik felületen — D19 kizárja, és ez a tétel nem nyitja újra.
- **Relevancia-rangsor a találatokban** (`gyakori`-elsőbbség, prefix >
  belső egyezés pontozás a `domain/paciensKereses.ts` mintájára) — önálló
  kérdés, saját UX-kockázattal az Enter célpontjára.
- **Fuzzy / token-alapú keresés.** A szabály substring marad: a `gyerek`
  ezután SEM találja a `Gyermekfogászat`-ot. Ha ez fájdalom, önálló tétel.
- **A `Tetel.leiras` bevonása a keresésbe** — az 1. döntésben elvetve.
- **A nulla-találatos üzenet átfogalmazása a szerkesztőben** — az 1.
  döntés szerint változatlan marad; az árlista adminban csak egyetlen
  mondat frissül (5. döntés).
- **A `docs/03` meglévő ellentmondása** a Tételkereső („a pénznem NEM
  szűr", D71) és a Gyorsgombok („`aktiv: true` ÉS az aktuális pénznemben
  árazott") szakasza közt — a feltárás során derült ki, független
  dokumentációs pontatlanság.
- **A `tetelIlleszkedik()` tételenkénti `norm(q)` hívása** (a
  normalize-once konvenció mai megsértése) — a bővítés közben kézenfekvő
  megjavítani, de nem ennek a tételnek a célja.
- **Az árlista kategória-besorolásának takarítása** (24. tétel, pl. a
  `t078` „Sín" valószínűleg rossz kategóriában van) — ez a funkció nem
  váltja ki, viszont láthatóbbá teszi a hibás besorolásokat.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/search.ts` — a `nevEgyezik()` maga változatlan; az
  illeszkedő kategóriák halmazának kiszámítása erre épül (a 2. döntés
  szerint egyszer, a ciklus előtt).
- `app/src/pages/planEditor/ItemPicker.tsx` — a találat-számító `useMemo`
  két szintre bomlik, a renderelő ciklus egy második fejléc-típust kap.
  A mai `catName` prop **fresh closure** minden `PlanEditorPage` renderen,
  ezért a memo dep-listája figyelmet igényel.
- `app/src/pages/PlanEditorPage.tsx` — a picker felé menő propok; a
  `priceList.kategoriak` már itt van, a `catName` innen származik.
- `app/src/pages/planEditor/PhaseSection.tsx` és `LineRow.tsx` — a propok
  továbbadása mindkét hívási helyen.
- `app/src/domain/arlistaSzures.ts` — `tetelIlleszkedik()`; a
  `tetelMegtartando()` nyitott-sor kivétele változatlan.
- `app/src/pages/PriceListAdminPage.tsx` — mindkét hívási hely (`grouped`
  és a tömeges dialógus köréhez használt szűrt lista), valamint a
  nulla-találatos üzenet szövege. A `sortedKategoriak` memo már megvan.
- Tesztek: `domain/search.test.ts`, `domain/arlistaSzures.test.ts` (a mai
  fixture nem ismer kategórianevet), és főleg
  `pages/planEditor/ItemPicker.test.tsx` — ott a `catName={() => 'Tömések'}`
  konstans stub és a csonkítás-tesztek (12 találat, wrap-around) rögzítik a
  mai sorrend-feltevést.
- `app/src/dokumentacioGuard.baseline.json` — ha az érintett fájlokban a
  dokumentáció-markerek száma változik.
- Lezáráskor bővítendő dokumentáció: `docs/03-funkcionalis-spec.md`
  § Tételkereső (a kétszintű lista és a közös 12-es limit) és § 6.
  „Keresés és szűrők" (a kategórianév-illesztés + a tömeges kör);
  `CLAUDE.md` „A UX kritikus pontja" (a kétnyelvű keresés mondata) és
  „Meglévő segédfüggvények" (a `nevEgyezik` bekezdése).

## Tesztelés (irányadó, nem kimerítő)

- `fogko` a szerkesztő keresőjében: a Fogkőeltávolítás mindkét tétele
  megjelenik, `Kategória: Fogkőeltávolítás` fejléc alatt. Ma nulla találat.
- `zahnstein` (a kategória NÉMET neve) ugyanezt adja egy MAGYAR nyelvű
  terven is.
- `korona`: elöl a hat névtalálat a mai, csupasz fejléccel, utána a
  `Kategória: Korona és hídpótlások` blokk; egyetlen tétel sem szerepel
  kétszer.
- `korona` beírása után azonnali Enter ugyanazt a tételt veszi fel, mint
  ma — az Enter célpontja nem mozdult.
- `implant`: 19 névtalálat, kategória-egyezés nincs → a lista a maival
  azonos.
- `szajseb`: nulla névtalálat, a `Kategória: Szájsebészet` blokk 12
  tétellel, alatta `+21 további találat — pontosíts a kereséssel`.
- `fog` (31 névtalálat): a kategória-blokk egyáltalán nem jelenik meg.
- A kategória-blokk sorai a `↑ ↓` ciklus részei; a `Kategória:` fejléc és
  a csonkítás-jelző sor nem; az „Egyedi tétel felvétele" pszeudo-opció a
  lista legalján marad.
- A soron belüli, fogtérkép-kattintással indított kereső ugyanígy
  viselkedik.
- Valódi nulla találat (`zzz`): a mai `Nincs találat.` üzenet, Enterre
  egyedi sor — változatlanul.
- Árlista admin, `fogko`: a Fogkőeltávolítás csoport megjelenik a két
  tételével, a lábléc számlálója ennek megfelelő.
- Árlista admin, Tömeges árváltoztatás: `fogko` beírása után a
  „jelenlegi szűrt lista (2 tétel)" kör pontosan ezt a két tételt fogja.
- Árlista admin, valódi nulla találat: az üres-állapot szövege kimondja,
  hogy kategórianévre is lehet keresni.
- Billentyűzet: a gépel → nyíl → Enter → kiürül és visszakapja a fókuszt
  ciklus mindkét szintről működik.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/` alatt.
