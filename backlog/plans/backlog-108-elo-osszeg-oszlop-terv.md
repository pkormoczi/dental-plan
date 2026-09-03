# Backlog 108. tétel — Élő Összeg oszlop gépelés közben — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 108. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `pages/planEditor/LineRow.tsx` Összeg cellája a committált `line` propból
számol (`tenylegesEgysegar * mennyiseg`), a `components/NumberField.tsx` pedig
— szándékosan — csak blur/Enter/stepper esetén commitál. Így az Ajánlati ár
vagy a darabszám gépelése közben az Összeg a régi értéken marad, és csak a
mező elhagyásakor ugrik a helyes értékre. A doctor-review megfigyelt esete:
egy egyedi sor árába `8000`-et gépelve az Összeg `0 Ft` maradt, amíg a doki
Tabbal el nem hagyta a mezőt.

A commit-on-blur mechanizmus maga NEM visszabontandó — a `NumberField`
fejléc-kommentje szerint pontosan azért vezették be, mert korábban minden
leütés azonnal a törzsadatba írt (P0-4/P0-5/P1-4 review-találatok). A hiány
kizárólag a megjelenítés oldalán van: a `NumberField` `onDraftChange`
csatornája már ma is minden leütésre tüzel, csak az Összeg cella nem
hallgatja.

## Döntések

### 1. Hatókör: kizárólag a sor Összeg cellája

Az élő követés a `LineRow` Összeg cellájára korlátozódik. A fázis-összesen
(`PhaseSection` összecsukott fejléc és „Fázis összesen" lábléc), a `Summary`
sticky „Mindösszesen" sávja, az `EgyediVegosszegBlokk` és az `ElolegBlokk`
(„Fennmaradó rész") változatlanul a committált `plan`-ből számol.

**Miért:** a `LineRow` a draftot ma is lokális state-ben tartja
(`mennyisegDraft`), tehát a sorszintű megoldás nem igényel state-liftet és nem
nyúl a `domain/totals.ts`-hez. A fázis- vagy terv-szintű élő követéshez a
draftnak ki kellene szöknie a `LineRow`-ból egy új callbacken át a
`PhaseSection`-ön keresztül a `PlanEditorPage`-ig, és a `fazisOsszeg()`/
`sorokOsszeg()`/`tervVegosszeg()` vagy szintetizált `Sor`-t, vagy új
szignatúrát kapna — miközben a `tervVegosszeg()` dokumentáltan „az EGYETLEN
hely, ahol a Fizetendő eldől". Elvetett alternatíva: a teljes lánc a
Fizetendőig — elvetve, mert a sticky összegsáv minden leütésre változna
(vizuális zaj a képernyő aljának állandó elemén), és mert a doctor-review
megfigyelése és a backlog-tétel szövege is kifejezetten az Összeg oszlopról
szól. A doki a blur után egyetlen pillantással látja a frissült fázis- és
terv-összeget; a sor szintjén viszont pont gépelés közben akarja ellenőrizni,
hogy jót gépelt-e.

### 2. Az ár ÉS a darabszám piszkozata is beleszámít

Az élő Összeg mindkét szorzótényezőt a piszkozatból veszi: az Ajánlati ár
mező most bevezetendő draftjéből és a MÁR meglévő `mennyisegDraft`-ból.

**Miért:** a két mező egymás szomszédja ugyanabban a sorban; ha az ár gépelése
frissítené az Összeget, a darabszámé viszont nem, az a dokinak
megmagyarázhatatlan, véletlenszerűnek látszó viselkedés lenne. A
`mennyisegDraft` ráadásul ma is létezik és a prop-változásra szinkronizálódik
— nem új mechanizmus, csak egy második fogyasztót kap. Elvetett alternatíva:
szigorúan a doctor-review megfigyelt esete (csak az ár) — elvetve a fenti
inkonzisztencia miatt.

### 3. A vezető nulla NEM ennek a tételnek a hatóköre

A `08000` átmeneti megjelenése a mezőben kizárt scope: a `backlog/BACKLOG.md`
98. tétele (a számmező tartalmának kijelölése fókuszáláskor) pontosan ezt a
forgatókönyvet szünteti meg — a `0`-t tartalmazó mezőbe kattintva a tartalom
kijelölt lesz, az első leütés lecseréli, tehát `08000` nem áll elő. A jelen
tétel a `NumberField` piszkozat-kezeléséhez egyáltalán nem nyúl.

**Miért:** a piszkozat gépelés közbeni normalizálása (vezető nulla levágása) a
`NumberField`-ben új élcsúcsokat vinne egy ma megbízhatóan működő mezőbe: EUR
módban a `0,50` beírásának első karaktere is vezető nulla, tehát a szabályt
„csak nulla után KÖZVETLENÜL következő számjegynél" alakúra kellene szűkíteni,
vagy pénznemenként eltérően viselkedni. A `08000` ráadásul már ma is helyes
értéket ad az `onDraftChange`-nek (`Number("08000") === 8000`), tehát az élő
Összeg akkor is jó lesz, ha a mező átmenetileg vezető nullát mutat — a két
probléma technikailag független. Elvetett alternatívák: (a) normalizálás
mindkét pénznemben, (b) normalizálás csak HUF-nál — előbbi a tizedes-beírást
rontaná, utóbbi két viselkedést vezetne be egyetlen komponensbe egy olyan
tünet miatt, amit egy másik, már megtervezett tétel amúgy is megszüntet.

### 4. Az élő Összeg megjelenése azonos a committálttal

Nincs vizuális megkülönböztetés (halványítás, dőlt betű, keret) arra, hogy az
éppen látott Összeg még nem committált értékből származik.

**Miért:** az érték, amit a doki lát, pontosan az, ami a blur pillanatában
rögzülni fog — nincs mit „ideiglenesnek" jelölni, és a jelölés maga keltene
bizonytalanságot („miért más ez a szám?"). Egy fókusz-függő stílusváltás
ráadásul minden mezőbe-belépéskor és -kilépéskor átszínezné a táblázat egy
celláját, ami sorról sorra haladva látható villódzás. Elvetett alternatíva:
halvány szín, amíg a mező fókuszban van és a draft eltér a committálttól —
elvetve, mert új vizuális szabályt vinne a `docs/07-felulet-rendszer.md`-be egy
olyan állapotra, ami tipikusan egy-két másodpercig áll fenn.

### 5. Az ár-eltérés jelvény és a többi sor-jelzés NEM követi a gépelést

A `domain/sorElteres.ts`-ből származó zöld `−X%` / amber `+X%` jelvény, az
„örökölt ár" jelvény, az ár-reset vezérlő és a Listaár ⟳ gomb megjelenése
mind a committált `line`-ból számol, változatlanul.

**Miért:** ezek a jelzések a sor ÁLLAPOTÁRÓL szólnak (eltér-e a listaártól,
örökölt-e egy másolatból), nem egy folyamatban lévő számításról — egy
félbegépelt ár mellett a jelvény típusa (kedvezmény↔felár) és színe minden
leütésre átválthatna, ami zajosabb, mint amennyit segít. Az Összeg ezzel
szemben tisztán aritmetikai következmény, ott a folyamatos követés egyértelmű
nyereség. A két elem eltérő viselkedése ezért nem inkonzisztencia, hanem a
két jelzés eltérő természetéből következik.

### 6. Érvénytelen piszkozat esetén a committált érték látszik

Ha az `onDraftChange` `null`-t ad (üres mező, értelmezhetetlen szöveg), az
Összeg a committált értékből számol tovább — ugyanaz a `?? line.mennyiseg`
minta, amit a `mennyisegDraft` ma is használ. Egy `min` alatti, de számszerű
piszkozatot (ár `-5`, darabszám `0`) viszont megjelenít.

**Miért:** az üres mező soha nem eshet 0-ra — ez a `NumberField` `commit()`-
jének kimondott szabálya (P0-4), és az Összegnek ugyanezt a szemantikát kell
tükröznie, különben egy pillanatra `0 Ft`-ot mutatna pont akkor, amikor a doki
a régi értéket törli, hogy újat írjon. A `min` alatti számszerű értéket viszont
azért mutatja, mert a `NumberField` maga is azt adja át, és mert az állapot
tranziens: blur/Enter után a mező és az Összeg is magától visszaáll az utolsó
érvényes értékre. Elvetett alternatíva: a `LineRow` szűrje ki a `min` alatti
draftot is — elvetve, mert ehhez a `LineRow`-nak duplikálnia kellene a
mezőnkénti `min` szabályokat, amiket ma kizárólag a `NumberField` ismer, és
egy jövőbeli `min`-változás némán szét-driftelne a két hely között.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `NumberField` commit-on-blur mechanizmusa** — VÁLTOZATLAN. A tétel a
  meglévő `onDraftChange` csatorna egy második fogyasztóját köti be, a
  piszkozat/commit logikát nem érinti.
- **A vezető nulla (`08000`) a mezőben** — a 98. tétel hatóköre (lásd 3.
  döntés).
- **A fázis-összesen, a sticky Fizetendő, az Előleg és az Egyedi végösszeg
  élő követése** — kizárva (lásd 1. döntés).
- **A `−X%`/`+X%` eltérés-jelvény és a többi sor-jelzés élő követése** —
  kizárva (lásd 5. döntés).
- **A Listaár cella** — csak megjelenítés, nincs hozzá szerkesztőmező, tehát
  fogalmilag sem érintett.
- **Az árlista admin `ItemEditor`/`TomegesArDialog` számmezői** — nincs
  mellettük élő származtatott érték, változatlanok.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/planEditor/LineRow.tsx` — az Ajánlati ár `NumberField`-je
  kap `onDraftChange`-et, a hozzá tartozó lokális draft-state a meglévő
  `mennyisegDraft` (88-89. sor) mintáját követi, prop-szinkronizáló effekttel
  együtt; az Összeg cella (430. sor) a két draftból számol.
- `app/src/domain/totals.ts` `sorOsszeg()` — az Összeg cella ma inline
  képletet használ; a megvalósító mérlegelheti a meglévő segédfüggvény
  használatát. A `totals.ts` maga NEM módosul (nem kap új szignatúrát).
- `app/src/components/NumberField.tsx` — VÁLTOZATLAN; az `onDraftChange` prop
  már ma is létezik és megfelelő szemantikájú.
- `app/src/pages/planEditor/PhaseSection.tsx`, `Summary.tsx`,
  `EgyediVegosszegBlokk.tsx`, `ElolegBlokk.tsx`, `PlanEditorPage.tsx` —
  VÁLTOZATLANOK (1. döntés).
- `docs/03-funkcionalis-spec.md` § 3. „Sor mezői" — az Összeg sor
  (`tenylegesEgysegar * mennyiseg`) kiegészítendő azzal, hogy gépelés közben
  is követi a mezőket; ez a lezárási checklist 2. lépése, nem az
  implementációé.

## Tesztelés (irányadó, nem kimerítő)

- Egy 0 Ft ajánlati árú (pl. egyedi) soron az Ajánlati ár mezőbe `8000`-et
  gépelve az Összeg már gépelés közben `8 000 Ft`-ot mutat, blur nélkül.
- Ugyanez a darabszám mezőre: `1`-ről `3`-ra gépelve az Összeg azonnal a
  háromszoros értéket mutatja.
- A két mező együtt: ár és darabszám egymás utáni átírásakor az Összeg
  végig a két legfrissebb piszkozat szorzata.
- Az ár mező tartalmát TELJESEN törölve az Összeg a törlés ELŐTTI committált
  értéket mutatja, nem `0 Ft`-ot; a mezőt így elhagyva (blur) a régi érték
  áll vissza a mezőben is, és az Összeg változatlan marad.
- Escape a mezőben: a mező és az Összeg is egyszerre áll vissza a committált
  értékre.
- A stepper ▲/▼ és a ArrowUp/ArrowDown: az Összeg követi (ezek amúgy is
  azonnal commitálnak).
- EUR pénznemű terven az ár mezőbe `35,50`-et gépelve az Összeg élőben a
  helyes euró-értéket mutatja (a `NumberField` euró→cent parse-ja után),
  nem a centben értelmezett számot.
- A `−X%`/`+X%` eltérés-jelvény gépelés közben NEM változik, csak blur/Enter
  után — ez szándékos.
- A fázis „Fázis összesen" lábléce, a sticky „Mindösszesen", az Előleg
  „Fennmaradó rész" sora és az Egyedi végösszeg blokk gépelés közben NEM
  változik, csak commit után — ez szándékos.
- A meglévő fog/darabszám mismatch-figyelmeztetés (ami ma is a
  `mennyisegDraft`-ot használja) változatlanul, gépelés közben jelenik meg.
