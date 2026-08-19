# 3. Funkcionális specifikáció

## Képernyők

1. Indítás
2. Páciens adatlap — itt dől el a terv nyelve és pénzneme (D21)
3. **Terv szerkesztő** — a legfontosabb
4. Előnézet és véglegesítés
5. Korábbi tervek
6. Kezelések és árak (árlista admin)
7. Beállítások
8. Filerendszer — demó-only, a leendő fájlrendszeres architektúra vizualizációja, a DEMO oldal egyik füle
9. Páciensek — élő, terv-mentéstől független törzsadat (D33)
10. Páciens részletei — URL-lel címezhető, két tabbal (D35)

### Fő navigáció (D34)

A fenti számozott lista a képernyők tartalmát írja le, nem a navigációs
sávot. A végleges, öt tételes fő navigáció:
`Kezdőlap | Páciensek | Kezelések és árak | Beállítások | DEMO`.

A `DEMO` menüpont négy fület fog össze: **Funkciók** (ez a dokumentum
felhasználó-szemszögű megfelelője, `FEATURES.md`), **Filerendszer** (a
fenti 8. képernyő), **Változásnapló** (`CHANGELOG.md`) és **Adatkezelés**
(a Kezdőlapról D39-cel átköltöztetett „Demó adat visszaállítása"/„Minden
adat törlése") — mind a négy fejlesztési/demonstrációs tartalom,
elkülönítve az üzleti workflow-tól.

A `Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi tervek` képernyők (2–5.)
korábban átmenetileg saját nav-linkkel is elérhetők voltak — ezt a
terv-workflow héj (lásd alább, D36) váltotta fel, a linkek megszűntek.

### Terv-workflow héj (D36)

A `Páciens adatlap`/`Terv szerkesztő`/`Előnézet és véglegesítés` (2–4.
képernyő) közös héjban él (`app/src/components/TervWorkflowShell.tsx`),
ami mindhárom oldal fölött állandó:

- **Breadcrumb** — `Páciensek > [páciens neve]`. A `Páciensek` szegmens a
  pácienslistára (9. képernyő) linkel. A páciens-név szegmens a piszkozat
  ismert `patientDir`-je (D37) esetén a páciens-részletoldalára (10.
  képernyő) linkel, egyébként csak szöveg — a `patientDir` nem minden
  belépési ponton ismert (pl. egy funkció előtti perzisztált piszkozat; a
  "Vadonatúj páciens" ág a quick-create dialógus (D41) sikeres mentése óta
  már ismeri). Üres névnél a "Új páciens" tartalék-címke látszik.
- **Stepper** — szabadon kattintható, 3 lépés: `Terv adatai → Kezelések →
  Előnézet és véglegesítés`. Az aktuális lépés a route-ból dől el
  (`/paciens`/`/terv`/`/elonezet`), nincs hozzá külön `Plan`/state-mező.
  Validáció és blokkolás nélkül bármelyik lépésre át lehet ugrani — ez a
  meglévő, laponkénti "Tovább a terv szerkesztőhöz"/"Előnézet" gombok
  MELLETT él, nem helyettük. Minden route-váltáskor a héj a piszkozat
  `lastRoute` metaadatát (D37) is frissíti — ebből tudja a Kezdőlap
  "Piszkozat folytatása" kártyája, melyik lépésre navigáljon vissza (lásd
  lent, § Autosave).
- **Lépés-elhagyási ajánlat** (D48) — a stepper Kezelések/Előnézet linkjei
  és a Páciens adatlap "Tovább" gombja MEGELŐZI a tényleges navigációt egy
  elfogási ponttal (`components/LepesGuardContext.tsx`), amit KIZÁRÓLAG a
  Páciens adatlap "Páciens törzsadata" kártyája (`TorzsadatSyncCard.tsx`)
  használ, amíg mountolva van — a stepper Terv adatai (visszafelé) linkje,
  a breadcrumb és a NavBar-navigáció (D46, külön mechanizmus) nem érintett.
  Lásd § 2. "Páciens törzsadata".

A sikeres véglegesítés utáni "A terv elmentve ✓" sikerpanel (lásd § 4)
felett a héj továbbra is látszik.

---

## 1. Indítás

Első futáskor a doki kijelöl egy gyökérmappát. Ez a `PlanStorage`
inicializálása. A böngészős implementációnál a hozzájárulást
munkamenetenként újra kell kérni — ez egy kattintás, de számolni kell vele.

### Kezdőlap tartalma (D39)

A Kezdőlap (`app/src/pages/Home.tsx`) minimalista: pontosan három blokk,
ebben a sorrendben.

- **Sérült-piszkozat kártya** és **aktív-draft kártya** — a piszkozat-
  autosave belépési pontja, lásd lent § Autosave. Legitim hibaállapot,
  illetve folyamatban lévő munka jelzése — nem demó-eszköz, nem tartozik a
  lenti recent listához.
- **Fő CTA**: `+ Új kezelési terv` — az `/uj-terv` köztes páciens-
  választóra visz (lásd § 5 „Új terv indítása"), feltétel nélkül (a
  piszkozat-felülírás-őr ott dől el).
- **Legutóbbi páciensek** — max 5 páciens, a legutóbbi JELENTŐS
  aktivitásuk szerint csökkenő sorrendben. „Jelentős aktivitás" a páciens
  létrehozása, a törzsadat mentése vagy egy terv véglegesítése — egy
  páciens/terv puszta MEGNYITÁSA sosem számít bele. Az időbélyeg a
  `paciens.json` új, opcionális `utolsoAktivitas` mezőjén él
  (`{ tipus, idopont }`, `docs/02-domain-modell.md` § Páciens- és
  terv-mappa) — puszta index, akárcsak a mező többi tartalma (D29): egy
  sérült/ismeretlen érték némán kimarad a listából, nem hibát dob. Egy sor
  a páciens nevét, születési dátumát, telefonját (a lezárt törzsadatból,
  vagy — ha az még nincs — a legutóbbi terv `paciens` pillanatképéből,
  `megjelenitettTorzsadat()`) és az aktivitás típusát + relatív idejét
  mutatja (pl. „Terv véglegesítve · 2 órája"); kattintásra a páciens
  részletoldalára navigál, a `Kezelési tervek` tabra (D192, alapértelmezett
  tab, nincs hozzá explicit `location.state`).

A korábbi „Demó adat visszaállítása"/„Minden adat törlése" gomb és a
„Korábbi tervek" gomb NEM része ennek a három blokknak — előbbi kettő a
DEMO oldal Adatkezelés fülére költözött, utóbbi (a globális `/tervek`
lista) csak URL-ről érhető el, lásd fent § Fő navigáció.

A nyelvválasztás nem itt, hanem a Páciens adatlapon van (2. képernyő) —
lásd ott.

---

## 2. Páciens adatlap

### Nyelv és pénznem (D21)

A személyes adatok fölött egy kártya, ami **csak akkor jelenik meg, ha
`beallitasok.nemetEngedelyezve === true`** — vagy ha a piszkozat már
németül indult (hogy egy időközben kikapcsolt kapcsoló ne tegye
szerkeszthetetlenül némává egy folyamatban lévő német tervet).

Két, egymástól **független** kétállású kapcsoló:

- **Nyelv** (`hu` / `de`) — a nyomtatvány szövege: a tételnevek (ha
  van hozzájuk fordítás), a PDF fix feliratai, a dátumformátum, a
  sablonszövegek (nyilatkozat, fizetési feltételek, garancia).
- **Pénznem** (`HUF` / `EUR`) — az ajánlható tételkör (csak azok a
  tételek, amiknek van áruk ebben a pénznemben) és a pénzformátum.

A német páciens a legvalószínűbb ok, amiért ez a kettő szétválik: sokan
Magyarországon, forintban fizetnek. Alapértéke ezért `HUF`, még német
nyelvű ajánlatnál is — hacsak a pácienshez nincs korábbi véglegesített
terv, lásd alább.

**Öröklés meglévő pácienshez induló új láncnál (D52):** ha a pácienshez
van legalább egy VÉGLEGESÍTETT terve, az új lánc ennek a nyelvét/
pénznemét veszi át kiinduló értékként (a doki utólag szabadon
módosíthatja, amíg a kártya szerkeszthető). Csak PISZKOZAT-státuszú
tervek, vagy egyetlen korábbi terv híján a fenti globális alapérték
marad érvényben.

Mindkettő **az első mentés után fagy** (D4) — a kártya ilyenkor statikus
szöveget mutat, chipek nélkül; új tervet kell nyitni a váltáshoz.

**Nyelváltás (fagyás előtt) megőrzi a kézzel szerkesztett sorneveket**
(D24): egy `tetelId`-hez kötött sor neve **csak akkor** frissül az új
nyelv szerinti árlistai névre, ha a váltás előtti nyelven még pontosan az
árlistai nevet viselte (`nevSnapshot === tetel.nev[nyelv]`, nyers érték,
nem hu-visszaeséses). Ha a doki kézzel pontosította, a név **változatlan
marad** — a nyelváltás sosem ír felül némán egy kézzel írt szöveget. Az
egyedi (`tetelId` üres) sorokat a nyelváltás sosem érinti, mert nincs
mihez viszonyítani. Ha a tervben már vannak sorok, a nyelváltás
megerősítő párbeszéde **előre kiírja a tényleges hatást**: hány sor
frissül az új nyelvre és hány marad változatlan, nem egy általános
figyelmeztető mondat.

Ha a kiválasztott nyelven/pénznemen hiányos a tartalom, a kártya alatt
figyelmeztetés jelenik meg (hány aktív tételnek nincs neve az adott
nyelven, illetve hogy a kiválasztott pénznemben van-e egyáltalán
beárazott tétel) — ez a „ne a szerkesztőben legyen meglepetés" elve.

### Személyes adatok

Mezők: név, születési idő, lakcím, telefon, e-mail, TAJ, „kiskorú"
jelölő. Ha kiskorú, megjelenik a törvényes képviselő neve és elérhetősége.

Csak a **név** kötelező (ebből képződik a mappanév). A többi hiánya
véglegesítéskor figyelmeztetést ad, de nem blokkol — a doki néha
gyorsan akar árajánlatot adni.

### Páciens törzsadata (D48)

A Személyes adatok kártya ALATT, önálló „Páciens törzsadata” kártya — a
`paciens-adatok.json` (D33) és az AKTUÁLIS terv-piszkozat `paciens` blokkja
közötti mezőszintű összevetés/szinkron. Csak akkor jelenik meg, ha a
piszkozat páciensmappája ismert (`feloldPatientDir()`,
`app/src/domain/torzsadatBetoltes.ts`); ha nem, a kártya kimarad.

- **Lezárt törzsadatnál**: az eltérő mezők száma, és KÉT külön gomb —
  „Frissítés a törzsadatból” (master → piszkozat) és „Törzsadat frissítése a
  tervből” (piszkozat → master) — soha nem egy közös „Szinkronizálás” gomb.
  Mindkettő ugyanazt a mezőszintű, checkboxos dialógust nyitja
  (`components/TorzsadatDiffDialog.tsx`), csak a kijelölt mezőket alkalmazva;
  alapból SEMMI nincs kijelölve, „Összes kijelölése” mindent bejelöl.
  Eltérés hiányában semleges szöveg, gombok nélkül.
- **Törzsadat nélkül (fallback)**: információs blokk (nem hiba-szín) jelzi,
  hogy a páciensnek még nincs önálló törzsadata, egy gombbal, ami AZONNAL
  létrehozza a piszkozat aktuális adataiból.
- **A „Tovább a terv szerkesztőhöz” gomb és a workflow-stepper Kezelések/
  Előnézet linkjei** (lásd lent, § Terv-workflow héj) a lépés elhagyásakor
  egyszer felkínálják a törzsadat-frissítést, ha VALÓDI ütközés áll fenn — két
  eltérő, MINDKÉT oldalon kitöltött érték. Egy üres mező puszta pótlása (a
  leggyakoribb eset: egy vadonatúj páciensnél a törzsadat a quick-create után
  még csak a nevet tartalmazza, a doki itt tölti ki a többit) NEM számít
  ütközésnek, nem szakítja félbe a workflow-t. Ugyanarra az eltérésre a
  prompt a workflow-n belül nem jelenik meg újra, amíg a diff nem változik.
  Ha nincs törzsadat, ugyanez a lépés egy (alapból kijelöletlen) opciót ad a
  törzsadat azonnali létrehozására.
- **Írási hiba** (kizárólag a piszkozat → master irányban) esetén a dialógus
  nyitva marad, a hibaüzenet mellett „Újra” (ugyanaz az írás újra) vagy —
  csak a lépés-elhagyási prompt módban — „Folytatás írás nélkül” (a
  piszkozat érintetlenül a workflow folytatódik) választással.

---

## 3. Terv szerkesztő

Ez dönti el, hogy az app gyorsabb-e az Excelnél. Megvalósítás:
`app/src/pages/PlanEditorPage.tsx`.

### Fogtérkép (kattintható)

A fogtérkép a **beavatkozás lista fölött**, egy lenyíló panelben van —
alapból **csukva**, akkor is, ha a tervben már vannak érintett fogak; a
csukott gomb felirata mutatja a darabszámot (`🦷 Érintett fogak (6)`).
Kattintásra nyílik ki. Kinyitva nemcsak áttekintés, beviteli eszköz is —
kezelés-kategóriánként színezve (lásd `app/src/design/treatmentVisuals.ts`).

- **Kattintás egy már érintett fogra** a hozzá tartozó sorra ugrik
  (fókusz + görgetés a „Fog" mezőre). Ha több sor is érinti (pl.
  gyökérkezelés és korona ugyanazon a fogon), az ismételt kattintás a
  következő érintett sorra lép, körbe.
- **Kattintás egy kezeletlen fogra** új, tétel nélküli sort vesz fel a
  kiválasztott fázisban, a fogszámmal már kitöltve, és a sor
  „Beavatkozás" cellájában megjelenő keresőre fókuszál — ugyanazzal a
  gépel → nyíl → Enter ciklussal, mint a fázis alatti keresőnél. A
  választás a sort **a helyén tölti ki**, nem fűz újat. (A panel nyitva
  marad, hogy a fókusz odaugorhasson.)
- **Fázisválasztó** csak nyitott panelen, és csak akkor jelenik meg, ha
  egynél több fázis van — eldönti, melyik fázisba kerüljön az új sor.
- **Soronkénti fogválasztó**: a „Fog" mező melletti 🦷 ikongomb egy felugró
  fogtérképet nyit, ahol kattintással jelölhetők ki a sor fogai (a mező
  szabadszöveges marad — ha nem FDI-formátumú tartalmat talál, pl. „jobb
  felső", megerősítést kér felülírás előtt, nem ír felül némán).
- **Billentyűzet**: csukva a panel gombja egy sima Tab-megálló; nyitva a
  fogtérkép **is** egyetlen Tab-megállóként érhető el, nyilakkal lépked a
  fogak közt (`←`/`→` az állcsonton belül, `↑`/`↓` állcsontot vált
  ugyanabban a pozícióban), `Enter`/`Szóköz` aktivál.
- A darabszám (`Db`) automatikusan követi a sor fogainak számát, amíg a doki
  kézzel felül nem írja (D32) — lásd „Sor mezői" és „Figyelmeztetés" lentebb.
  A fogtérkép-kattintással felvett új sor (fent) is ezen az úton indul.

### Tételkereső

- **Csak keresés, nincs kategória böngésző.**
- Ékezetfüggetlen: `gyoker` → *Gyökérkezelés*, `esztetikus` →
  *Esztétikus tömés*. Normalizálás:
  `s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')`
- A találatok kategória szerint csoportosítva jelennek meg, az ár a sor
  jobb szélén.
- Csak `aktiv: true` tételek, és csak azok, amiknek az aktuális pénznemben
  van áruk.
- A keresés **mindkét nyelven megy, mindig** — a doki magyar, magyarul
  gépel akkor is, ha német ajánlatot állít össze. Csak a *megjelenített*
  és a felvételkor *rögzített* név nyelvfüggő (lásd alább, „Hiányzó
  fordítás"); ha a tétel német neve hiányzik, a magyar névre esik vissza,
  jól látható `HU` jelöléssel a találati soron és a felvett soron is.
- A lista **legfeljebb 12 találatot** mutat. Ha ennél több egyezik, a
  lista alján egy nem választható, tájékoztató sor jelzi: „+N további
  találat — pontosíts a kereséssel". Pontosan 12 (vagy kevesebb) találatnál
  nincs jelzés — a lista ilyenkor teljes. A 12-es megjelenítési limit
  szándékosan **nem** emelkedik: a nagyobb limit csak elodázná, hogy a
  doki pontosítson.
- Billentyűzet: `↑ ↓` navigál, `Enter` hozzáad, `Esc` bezár. A csonkítás-
  jelző sor **nem** része a ciklusnak.
- **Hozzáadás után a kereső kiürül és visszakapja a fókuszt.** Ez a
  ciklus a lényeg: gépel → nyíl → Enter → gépel tovább, egérhasználat
  nélkül.
- **Nulla találat esetén** az Enter nem tesz semmit üresen — a gépelt
  szöveget veszi fel egyedi sorként (lásd „Egyedi sor" lent). Ha **van**
  találat, de egyik sem megfelelő, a lista alján egy „Egyedi tétel
  felvétele: „…"" pszeudo-opció is végigjárható ugyanazzal a `↑ ↓`/`Enter`
  ciklussal, a valódi találatok után.

### Gyorsgombok

Az `arlista.json`-ban `gyakori: true` jelölésű tételek chipként
megjelennek a kereső alatt. Egy kattintás = hozzáadás.

### Sor mezői

| Mező | Viselkedés |
|---|---|
| Beavatkozás | **Szerkeszthető** szövegmező, alapból a felvételkor rögzített (árlistai vagy egyedi) névvel kitöltve — a doki pontosíthatja, elgépelt/rövidített árlistai nevet javíthat. Az átírás megtartja a `tetelId`-t: az ár, a fogtérkép kategória-színe és a német-fallback ellenőrzés változatlanul az árlistai tételen át működik, csak a megjelenő szöveg (`nevSnapshot`) más. Üresen a sor véglegesítéskor kemény blokk (lásd „Kitöltetlen sor" lent) |
| Fog | Szabad szöveg, felsorolás. Nem kötelező. A beírt *számokat* validáljuk (lásd lent), a folyószöveges jegyzet (pl. „jobb felső") változatlanul megengedett |
| Db | Automatikusan követi a Fog mezőben felsorolt (dedupolt) fogszámot, amíg a doki kézzel be nem írja — attól kezdve a sor levált, egy ⟳ ikongomb jelenik meg a mező mellett, amire kattintva egy lépésben visszaáll a fogak számára és újra követővé válik (`Sor.mennyisegKezi`, docs/02-domain-modell.md § Fogszám kezelés, D32). Alapérték 1, minimum 1 |
| Listaár | Csak megjelenítés, halványan. Sávos tételnél `35 000–55 000` formában, kiemelve. Egyedi sornál `—` (nincs árlistai referenciaár) |
| Ajánlati ár | Szerkeszthető. Alapértéke a listaár (sávosnál a `min`, egyedi sornál `0`). EUR pénznemű tervnél a mező **euróban** fogad be és jelenít meg szöveget (pl. `35,50`), a tárolás változatlanul centben történik — ugyanaz a `NumberField` `unit` mechanizmus, ami az árlista adminban már véd az euró/cent tévesztéstől. Ez tisztán UI-réteg felirat, nem pénzösszeg-formázás, ezért nem indokol közös `domain/money.ts` segédfüggvényt |
| Becsült ár (≈) | Soronkénti, szabad és kétirányú kapcsoló az Ajánlati ár mező mellett (ghost ikongomb, `≈` szövegglyph) — bármelyik soron be- és kikapcsolható, függetlenül attól, hogy a sor árlistai FIX, SAVOS, fogtérkép-kattintásos vagy egyedi eredetű. Bekapcsolva a nyomtatványon `*` + lábjegyzetet kap (D15). Csak megjelenítést vezérel, az összegzésbe nem szól bele; nincs eredet-nyilvántartás, a sor nem jegyzi meg, honnan jött, és az aktuális árlistából sem kérdezzük vissza (D7) |
| Összeg | `tenylegesEgysegar * mennyiseg` |
| Leírás | Összecsukható, a Beavatkozás mező melletti „+ leírás"/„Leírás" jelvényre kattintva nyílik ki, teljes szélességben, a sor alatt (docs/02-domain-modell.md § Tétel-leírás). Bármelyik sor kaphat leírást, árlistai vagy egyedi is. Ha a sor egy `csomag: true` tételre hivatkozik és üres a leírás, a trigger amber jelzést kap — korai figyelmeztetés, mielőtt a véglegesítés-őr megerősítést kérne |

A „Listaár"/„Ajánlati"/„Összeg" oszlopfejléc a terv pénznemét is jelzi
(`(Ft)` / `(€)`), hogy egyetlen oszlop se tűnjön „biztonságosnak" a
pénznem-összetévesztéssel szemben.

Ha `tenylegesEgysegar < listaEgysegar`, a soron megjelenik egy `−X%`
jelölés. **Ez csak a szerkesztőben látszik, a nyomtatványon nem** (D9).

Sávos tételnél a listaár helyén a sáv látszik, és az ajánlati ár mező ki
van emelve — jelzi, hogy itt dönteni kell.

Német nyelvű terven, `tetelId`-hez kötött soron a Beavatkozás mező mellett
két, egymást kizáró jelvény jelenhet meg: `HU`, ha a tételnek nincs német
neve az árlistában, vagy „átírt", ha van német neve, de a sor szövege attól
eltér (kézzel pontosítva). Egyedi sor egyiket sem kaphatja, hiszen nincs
árlistai tétel, amihez viszonyítani lehetne (lásd lent, „Egyedi sor").
Magyar terven egyik sem jelenik meg (a doki magyarul gépel, ott nincs mit
jelezni, D21).

### Egyedi sor

Ha a tételkeresőben nincs (megfelelő) találat, a gépelt szöveg egyedi
sorként vehető fel — lásd fent, „Tételkereső". Az egyedi sor:

- **Nincs árlistai hivatkozása** (`tetelId` üres) — a Beavatkozás mező
  mellett egy semleges „egyedi" jelvény jelzi.
- **Egy ármező van rajta**, nincs külön „listaár" — az Ajánlati ár
  szerkesztése a listaárat is vele együtt írja, ezért egyedi soron
  **sosem** jelenik meg kedvezmény-jelölés.
- **A „becsült ár" jelölő ugyanúgy működik rajta**, mint bármelyik más
  soron — bekapcsolva a nyomtatványon csillagot és lábjegyzetet kap.
- Német nyelvű ajánlaton egy **kitöltött** egyedi sor is bekerül a
  véglegesítés megerősítő listájába, de **saját, harmadik felsorolás**
  alá („Egyedi, szabad szöveges sor — a nyelvét te írtad"), nem a „nincs
  német nevük az árlistában" alá — nem hiányzó fordításról van szó, hanem
  arról, hogy szabad szöveghez nincs mihez viszonyítani, a doki bármelyik
  nyelven írhatta. A szerkesztőben nem kap `HU` jelvényt.
- Nem kötelező kitölteni azonnal: a fogtérkép-kattintással létrehozott,
  még névtelen sor is ugyanezt a mechanizmust használja (lásd fent,
  „Fogtérkép"), csak addig kereső módban marad, amíg a doki tételt nem
  választ vagy egyedi nevet nem ad neki.
- **Leírást is kaphat**, ugyanúgy, mint egy árlistai sor (docs/02-domain-modell.md
  § Tétel-leírás) — mivel nincs háttér-tétel, mindig szabadon beírt szöveg,
  nyelváltás nem érinti, „átírt"/`HU` jelvénynek nincs értelme rajta.

### Kitöltetlen sor

Egy **meg nem nevezett** sor (üres Beavatkozás mező) a véglegesítésnél
kemény blokk — nem folytatható, amíg a doki tételt nem választ, egyedi
nevet nem ad, vagy nem törli a sort. Az ár lehet `0` egy kitöltött nevű
soron, ez önmagában nem blokkol (`app/src/domain/kitoltetlen.ts`
`kitoltetlenSorok`).

### Figyelmeztetés (nem blokkoló)

Két, egymástól független figyelmeztetés él a `Fog` mező alatt, egyik sem
blokkol, egyik sem jelenik meg a nyomtatványon:

- **Darabszám-eltérés**: ha a mező N érvényes FDI számot tartalmaz és
  `mennyiseg !== N`, halvány jelzés a sor alatt (`docs/02-domain-modell.md`
  `parseTeeth()`). Ez ma csak levált (kézzel felülbírált) soron fordulhat elő
  — a Db mező automatikusan követi a fogakat, amíg a doki kézzel be nem ír
  (D32); levált soron a jelzés a Db cella melletti ⟳ visszakapcsoló gomb
  mellett második, szöveges megerősítés.
- **FDI-formátum**: ha a mező tartalmaz egy olyan tokent, ami *számjegyekből
  áll, de nem érvényes FDI kód* (pl. elgépelt `99`), piros keret a mezőn +
  „Nem érvényes FDI fogszám: 99 — …" hibaszöveg alatta
  (`app/src/domain/teeth.ts` `invalidFdiTokens()`). Ez a betűs, nem
  számjegyekből álló tokeneket (pl. „jobb", „felső") **nem** érinti — a
  folyószöveges jegyzet (pl. „jobb felső") ettől függetlenül érvényes
  tartalom marad, nincs rá figyelmeztetés. A kettő ugyanabban a mezőben
  egymástól függetlenül jelentkezhet: „16, 99, jobb felső" mezőn csak a
  `99` kap hibajelzést.

### Fázisok

- Tetszőleges számú fázis, átnevezhető, sorrendezhető, törölhető. A „Fázis
  törlése" gomb csak akkor jelenik meg, ha 1-nél több fázis van. Sorral
  rendelkező fázis törlése megerősítő dialógust kér (a fázis összes sora
  vele törlődik, ez a szerkesztő egyetlen egy-kattintásos, többsoros,
  helyreállíthatatlan adatvesztési útja); üres fázis törlése egy kattintás
  marad, dialógus nélkül — újralétrehozása két kattintás.
- Fázisonként egy szabad szöveges **megjegyzés** sor, ami a nyomtatványon
  is megjelenik. Ide megy az időzítés: *„az implantáció beépülési ideje
  után, kb. 3 hónappal"*.
- Fázisonkénti összeg, alul mindösszesen. A „Mindösszesen" doboz eltérés
  esetén egy kisebb alszöveget mutat: kedvezménynél „Kedvezmény: X",
  **felárnál „Felár: X"** (az ajánlati árnak nincs felső korlátja, tehát a
  tényleges ár a listaár fölé is emelhető). A kettő kizárja egymást, és
  ugyanazt a zöld színt kapja — ez semleges ténymegállapítás, nem
  hibajelzés, a doki dolgozhat felárral is (pl. sietős munka).

### Kerek végösszeg

A „Mindösszesen" doboz alatt, még az Előleg fölött egy kapcsoló: *„Kerek
végösszeg beállítása"*. Bekapcsolva egy „Cél végösszeg" mező jelenik meg,
alapértéke a sorok jelenlegi (nyers) összege — a doki ide írja be, mennyi
legyen a végösszeg, ha az alkut kerek számra zárja. A mező commitkor
(blur/Enter) egyszer kiszámolja és fix összegként tárolja a kedvezményt
(`kedvezmenyOsszeg`, `domain/types.ts`) — nem magát a cél-végösszeget
(D25). A mező alatt élőben kiírva a belőle adódó kedvezmény összege. A
mező 0 és a sorok nyers összege közé szorított — csak kedvezményre való,
felárra nem.

Mivel a kedvezmény fix összeg, egy utólagos sortörlés a sorok összege fölé
emelheti — ilyenkor a „Fizetendő" 0-ra padlózódik (soha nem negatív), és a
blokk figyelmeztet, hogy a cél végösszeget újra be kell írni.

A „Mindösszesen" doboz „Kedvezmény: X" alszövege (fent) ettől a ponttól
kezdve a sorszintű ÉS a terv-szintű kedvezmény ÖSSZEGÉT mutatja,
összevonva — a kerek végösszeg blokk saját sora adja meg külön a saját
részét, ha a doki forrás szerint akarja látni. A kedvezmény összege a
nyomtatványon itt sem jelenik meg (D9), csak a „Fizetendő" lesz kisebb; az
előleg (lásd lent) ebből a csökkentett összegből számol.

### Előleg

A „Mindösszesen" doboz alatt egy kapcsoló: *„Ez a terv fogtechnikai
munkát tartalmaz — előleg feltüntetése"*. Bekapcsolva egy 50%-ról induló,
0–100 közé szorított százalék mező jelenik meg, mellette az előleg és a
fennmaradó rész forintban — mindkettő a **tényleges** végösszegből
számolva, élőben követve a sorok változását.

A kapcsoló állapotát és az értéket egyetlen mező hordozza
(`elolegSzazalek`, `null` = kikapcsolva), így a kettő nem kerülhet
egymásnak ellentmondó állapotba. Bekapcsolva a nyomtatvány 1. oldala két
új sort kap, és a 2. oldal fizetési feltételeinek szövege is ugyanezt a
százalékot mondja (lásd `docs/04-nyomtatvany-spec.md`).

### Tétel-leírások nyomtatása

Az Előleg blokk alatt egy kapcsoló: *„Tétel-leírások nyomtatása"* —
alapból bekapcsolva. Kikapcsolva egyetlen sor `leirasSnapshot`-ja sem
kerül a nyomtatványra (`docs/04-nyomtatvany-spec.md` § Tételtáblázat), és a
véglegesítés-őr hiányzó csomag-leírás figyelmeztetése (lásd lent) sem fut
le — ha úgysem nyomtatódik, a hiánya sem érdemel figyelmeztetést. Ugyanúgy
pillanatkép-jellegű, mint `nyelv`/`penznem` (docs/02-domain-modell.md §
Tétel-leírás): betöltéskor és terv-másoláskor öröklődik, nem áll vissza
alapértékre.

### Autosave

A piszkozat egy `DraftStorage` interface mögött mentődik folyamatosan,
minden tartalmi módosításra azonnal (debounce nélkül) — mockupban
`localStorage` (`app/src/storage/DemoDraftStorage.ts`, `dp:piszkozat`
kulcs), a végleges alkalmazásban IndexedDB. **Ez nem system of record** —
csak azért van, hogy frissítés vagy összeomlás ne törölje a félbeszakadt
tervet. A fájlrendszerre csak véglegesítéskor írunk, a piszkozat pedig
sikeres véglegesítéskor törlődik.

Ez a védelem `plan.statusz`/`tervId`-től függetlenül minden aktív
szerkesztésre vonatkozik — egy visszatérő páciens régi, `VEGLEGES` tervének
új verzióra nyitása is védett, amíg újra nem véglegesítik. Az érintetlen,
üres piszkozatot (ami megegyezik egy friss tervvel) nem perzisztálja, csak
az első tartalmi módosítás után kezd írni. A visszaállítás csendes és
memóriabeli — a Kezdőlap „Piszkozat folytatása” kártyája a belépési pont
hozzá; a Kezdőlap „+ Új kezelési terv” gombja maga feltétel nélkül navigál
(a köztes `/uj-terv` választóra, D29 — lásd § Korábbi tervek), de MINDEN
tényleges terv-létrehozó akció megerősítést kér, mielőtt felülírná: az
`/uj-terv` mindkét ága („Meglévő páciens keresése…”, „Vadonatúj páciens”)
és a „Korábbi tervek” mindhárom akciója („Új verzió”, „Másolás új
tervbe”, „Új terv”) — egyik sem kivétel. A megerősített felülírás
pillanatában a perzisztált piszkozat **azonnal** törlődik, nem a
következő írási triggerre vár.

Ha az automatikus mentés elhasal (pl. localStorage-kvóta), a hiba a Terv
szerkesztőben is látszik, nem csak a Kezdőlapon — ott dolgozik a doki.
Sikeres mentésnél a Terv szerkesztő fejlécében egy semleges „Piszkozat
mentve HH:MM” szöveg jelenik meg (a hiba-Callout MELLETT, nem helyette) —
a Kezdőlap ugyanezt az időbélyeget „Utolsó módosítás” címkével mutatja.

A perzisztált piszkozat két, a `Plan`-től független UI-workflow metaadatot
hordoz (D37): melyik páciens-mappához tartozik (`patientDir`, ahol ismert)
és melyik workflow-lépést látta utoljára a doki (`lastRoute`, a
terv-workflow héj írja route-váltáskor, lásd fent). A Kezdőlap „Piszkozat
folytatása” kártyájának „Megnyitás” gombja ismert `lastRoute` esetén oda
navigál; ha nem ismert (funkció előtti piszkozat), a régi
névkitöltés-heurisztika a fallback (üres név → Páciens adatlap, egyébként
Terv szerkesztő).

A piszkozat két helyről dobható el:
- A Terv szerkesztő fejlécében egy kuka-ikon a TELJES piszkozatra
  vonatkozik (nem sor-/fázisszintű) — megerősítést kér, elfogadás után a
  doki a piszkozat `patientDir`-je szerinti páciens-részletoldalára (10.
  képernyő) navigál, ismert `patientDir` nélkül a pácienslistára.
- A Kezdőlap egészséges „Piszkozat folytatása” kártyáján egy „Piszkozat
  elvetése” gomb, szintén megerősítéssel — elfogadás után a doki a
  Kezdőlapon marad, a kártya eltűnik.

Ez a két megerősítéssel védett út különbözik a Kezdőlap SÉRÜLT
(olvashatatlan) piszkozat-kártyájának „Piszkozat elvetése” gombjától, ami
megerősítés NÉLKÜL fut — egy olvashatatlan piszkozatnál nincs mit érdemben
mérlegelni, mert a doki úgysem látja a tartalmát.

---

## 4. Előnézet és véglegesítés

- A `PrintPreview` komponens rendereli a négy oldalt.
- Kapcsoló: **„csak ajánlat"** — ilyenkor a 4. oldal (nyilatkozat és
  aláírás) kimarad. Ez a hazavitt példány. A 3. oldal (garancia) ettől
  függetlenül mindig megjelenik.
- Véglegesítéskor:
  1. `tervId` generálás (új terv) vagy verzió növelés (meglévő)
  2. PDF generálás, a `terv.json` beágyazásával
  3. `pdf` + `json` kiírás az új verziómappába
  4. A piszkozat törlése az IndexedDB-ből

Meglévő terv szerkesztése **soha nem írja felül** a korábbi verziómappát
(D4).

**Német terv, hiányzó/eltérő/egyedi tételnevekkel:** ha a tervben olyan sor
van, amihez nem tartozik német tétel név, amelynek neve kézzel eltér az
árlistától (lásd D21, D24), vagy amelyik egyedi (nincs mögötte árlistai
tétel), a véglegesítés megerősítést kér — a páciens ezt a dokumentumot
írja alá, ezért ez a figyelmeztetés soha nem néma. A megerősítő dialógus
**három külön felsorolást** mutat: „N tételnek nincs német neve", „M sor
neve eltér az árlistától (kézzel szerkesztve)" és „K egyedi, szabad
szöveges sor — a nyelvét te írtad" — a három ok különböző dokitennivalót
jelent, nem szabad egy lista mögé
bújtatni.

**Kitöltetlen sor (kemény blokk):** ha a fogtérképről kattintással felvett
sor tétel nélkül maradt, a véglegesítés **nem** kérhető meg és nem
folytatható — ez nem figyelmeztetés, hanem blokk, hogy névtelen, 0 Ft-os
sor sose kerülhessen az aláírandó dokumentumra. A hibaüzenet megnevezi a
fázist és a fogszámot; „Vissza a szerkesztőbe" gomb visz a hiányzó sorhoz.
Az Előnézet maga nem blokkolódik, csak a véglegesítés.

**0 összegű sor (puha megerősítés):** ha a tervben van névvel ellátott, de
0 összegű sor (`tenylegesEgysegar * mennyiseg === 0`), a véglegesítés egy
megerősítő lépést kér — jellemzően egy elgépelés + reflexes Enter terméke a
gépel→↑/↓→Enter cikluson (nulla találatra a kereső egyedi sort vesz fel, 0 Ft
kezdőértékkel), de lehet szándékos is (pl. ingyenes kontroll), ezért nem
kemény blokk. A dialógus felsorolja az érintett sorok nevét, „Folytatás"
gombbal átugorható; a címe és a szövege a terv pénznemét követi (HUF: „0
Ft-os tételek", EUR: „0,00 €-s tételek").

**Hiányzó csomag-leírás (puha megerősítés):** ha a tervben `csomag: true`
tételre hivatkozó, üres leírású sor van, a véglegesítés egy megerősítő
lépést kér — a teljes lánc sorrendje: hiányzó páciensadat → hiányzó/eltérő
német tételnevek → 0 összegű sorok → hiányzó csomag-leírás. A dialógus
felsorolja az érintett sorokat, „Folytatás" gombbal átugorható
(docs/02-domain-modell.md § Tétel-leírás). Ez a lépés kimarad, ha a terv
`leirasokMutatasa` kapcsolója ki van kapcsolva — ilyenkor a leírás úgysem
kerül a nyomtatványra.

**Páciens törzsadat-eltérés (INFO-szint, D48):** ha a páciensnek van lezárt
törzsadata (`paciens-adatok.json`, D33), és az eltér a terv `paciens`
pillanatképétől, egy semleges (szürke) sáv sorolja fel az eltérő mezőket, egy
"Terv adatai" gombbal a Páciens adatlapra. Ez **nem** tagja a fenti
megerősítő-láncnak — nem kér "Folytatás"-t, nem blokkol, a véglegesítés
önmagában nem kényszerít szinkronizálást (D9/D33 elve marad). A mastert a
rendszer véglegesítéskor újraolvassa, hogy a sáv a legfrissebb állapotot
mutassa — a mentett `terv.json` `paciens` blokkja ettől függetlenül a
piszkozat pillanatképe marad (D7).

A fenti négy lépés sorrendje és a kemény/puha megkülönböztetés tiszta,
React-mentes függvényként él (`veglegesitesDiagnozis`/`kovetkezoLepes`,
`app/src/domain/veglegesitesOr.ts`) — ugyanez a függvény adja vissza az
INFO-szintű törzsadat-eltérést is, egy ötödik, a láncon KÍVÜLI mezőként
(`masterElteresek`), hogy egy ott felvett mező ne váltson ki automatikusan
megerősítő dialógust. A `PreviewPage.tsx` csak a React state-et, a
dialógus-szövegeket és a fenti Sablon-placeholder őr D23-zárát tartja meg, a
lánc bejárását innen kapja.

### Sablon-placeholder őr

Egy sablon (nyilatkozat, fizetési feltételek vagy garancia) akkor számít
jogilag lezáratlannak, ha a törzse `[PLACEHOLDER` vagy `[PLATZHALTER`
jelölőt tartalmaz (zárójellel — a jelölő nélküli szóemlítés nem elég).
Ez **egyetlen predikátum**, egyetlen helyen (`app/src/domain/templates.ts`
`isPlaceholderTemplate`); a sablonszerkesztő készültség-jelzése, a
seed-feltöltés és a véglegesítés-őr mind ezt hívja.

- **Nyilatkozat placeholder → kemény zár.** Ha a ténylegesen betöltött
  nyilatkozat placeholder, a „csak ajánlat" kapcsoló automatikusan
  bepipálva és **letiltva** jelenik meg, tehát a 4. oldal (nyilatkozat +
  aláírás) garantáltan kimarad minden PDF-ből — letöltésből és
  véglegesítésből egyaránt, mert mindkettő ugyanabból a renderelt
  példányból dolgozik. Piros figyelmeztetés jelzi az okot és hogy hol
  kell javítani (Beállítások → Nyomtatvány szövegei). **Nincs „Folytatás
  mindenképp"** — ez blokk, ugyanabban a súlyban, mint a kitöltetlen sor
  (D23).
- **Fizetési feltételek placeholder → HU-visszaesés, nem zár.** A 2.
  oldal „csak ajánlat" módban is mindig nyomtatódik, ezért ott a
  kényszerített ajánlat-mód nulla védelmet adna; helyette a hiányzó
  sablonnál is használt HU-visszaesés fut le (a magyar szöveg jelenik
  meg), sárga figyelmeztetéssel.
- **Garancia placeholder → HU-visszaesés, nem zár.** Ugyanaz a viselkedés,
  mint a fizetési feltételeknél — a 3. oldal (garancia) „csak ajánlat"
  módban is mindig nyomtatódik, tehát nála sincs mit védeni egy
  kényszerített ajánlat-móddal. A magyar szöveg ma is placeholder (a doki
  még nem adta meg), ezért a HU-visszaesés magyar nyelvű terven nem fut
  le (a placeholder szöveg magyarul nyomtatódik, sárga figyelmeztetés
  nélkül — nincs mire visszaesni), csak német nyelvű tervnél jelez.

### Sikeres véglegesítés

A mentés után a terv-workflow héj (D36) fölött megjelenő "A terv elmentve
✓" panel (`app/src/pages/PreviewPage.tsx`) a mentett terv útvonalát
(`patientDir / planDir / versionDir`) mutatja, két gombbal:

- **„Új terv indítása"** — az `/uj-terv` köztes páciens-választóra visz
  (lásd § 5 „Új terv indítása").
- **„Korábbi tervek"** — a MOST mentett páciens részletoldalára
  (10. képernyő, `Kezelési tervek` tab) navigál, nem a globális Korábbi
  tervek listára (§ 5) — az utóbbi D39 óta kizárólag URL-ről (`/tervek`)
  érhető el, nincs hozzá nav-link vagy Kezdőlap-gomb.

### Letöltési fájlnév

A „Letöltés" gomb (ez a képernyő) és a Korábbi tervek verziósorának „⋯"
menüje egyaránt a `buildDownloadFileName(nev, opts)`
(`app/src/storage/paths.ts`) kimenetét adja fájlnévnek, hogy egy
Letöltések mappában sok páciens sok fájlja között a doki a fájlnévről
lássa, kié:

```
[PISZKOZAT-]kezelesi-terv-<Vezetéknév-Keresztnév>-<tervId>[-<suffix>].pdf
```

A névrész a `buildPatientNameSlug` kimenete — ugyanaz a szlugosítás, mint
a páciensmappa nevéé (`docs/02-domain-modell.md` „Mappanév szabályok"),
hogy a fájl és a mappa neve vizuálisan párosítható legyen. A
`PISZKOZAT-` előtag a nyers `plan.statusz !== 'VEGLEGES'`-ből jön —
ugyanaz a jelzés, mint a szerkesztő fejlécének „véglegesítve"/„piszkozat"
jelvényéé. Tudatos korlát: ha egy már véglegesített tervet a doki
újranyit és módosít, de még nem véglegesíti újra, a `plan.statusz`
`'VEGLEGES'` marad, tehát a letöltés emiatt NEM kap `PISZKOZAT-`
előtagot, holott a tartalom már eltér a lemezen archivált változattól —
ugyanez a hiányosság, mint a fejléc jelvényéé, nem egy második,
pontosabb jelzés.

---

## 5. Korábbi tervek

A `paciensek/` fa beolvasása, kereshető listával. Páciensnév szerint
csoportosítva, alatta a terv-láncok (D29), azon belül a verziók dátummal
és **végösszeggel**. Egy terv nélküli, csak `paciens-adatok.json`-nal
rendelkező páciens (a Páciensek képernyőn, § 9, terv nélkül felvéve) itt
NEM jelenik meg — ez a képernyő a kezelési előzményekről szól, nem a
törzsadatról. Minden páciensnév mellett egy „Páciens adatai” kereszt-link
navigál a páciens-részletoldalra (§ 10), ugyanahhoz a pácienshez, a
`Páciens adatai` tabbal előválasztva — ezen a képernyőn a páciensnév az
EGYETLEN páciens-címke, a kereszt-link pedig az EGYETLEN út a
részletoldalra. Ugyanez a fa a részletoldalba beágyazva név és
kereszt-link NÉLKÜL renderel (D44, § 10).

Az összecsukás **lánc-szintű** (D51, nem páciens-szintű): minden terv-lánc
fejléce önálló, tiszta toggle (nem navigáció), és alapból CSAK a
legfrissebb VÉGLEGESÍTETT dátumú lánc van nyitva (lásd lent a
lánc-rendezésnél) — a többi csukva, több lánc egyszerre is nyitható.
Egyverziós lánc is megtartja a lánc→verzió hierarchiát, nem lapul össze
egyetlen sorrá. Ez a viselkedés MINDKÉT hívón azonos — a részletoldalba
beágyazva (§ 10, D44) sincs külön páciens-szintű "N terv" burkoló, csak a
névfejléc és a "Páciens adatai" kereszt-link marad el, a lánc-szintű
összecsukás ott is érvényes. A lánc-fejléc (nyitottságtól FÜGGETLENÜL
mindig renderel) a lánc LEGFRISSEBB verziójának adatait mutatja (dátum,
verziószám), csukott állapotban a lánc végösszegét is — nyitva ez az
utóbbi elmarad, mert redundáns a lent következő legfrissebb verziósor
azonos értékével. A lánc legfrissebb verziósora, ha a láncnak 2+ verziója
van, „Legutóbbi” jelvényt kap (egyverziós láncon nem, funkciótlan dísz
lenne). A böngésző-"vissza" navigációnál a lánc-nyitottság és a
keresőszöveg is visszaáll (`components/useListStateMemory.ts`).

A láncok a bennük lévő legfrissebb VÉGLEGESÍTETT verzió dátuma szerint
csökkenő sorrendben jelennek meg — NEM a lánc létrehozási (legkorábbi
verzió) dátuma szerint: egy régen indult, de nemrég frissített lánc
előrébb kerül, mint egy korábban lezárt, azóta nem frissült lánc.

Minden terv-lánc fejlécén egy **címke** áll: `<tervCim> · <a lánc
legfrissebb verziójának dátuma/verziószáma>`. A címke a doki által
bármikor szabadon átírható (`terv-cimke.json`, `docs/02-domain-modell.md`
§ Páciens- és terv-mappa) — egy már véglegesített terv címkéjének
átírása NEM hoz létre új verziót. Amíg a doki nem ír át semmit, a mező
egy élő auto-javaslatot mutat (a terv domináns kategóriájának neve,
`javasoltTervCim()`).

### Aktív draft a listán

Ha az EGYETLEN globális, mentetlen piszkozat (D21) a megjelenített
pácienshez tartozik, két helyen jelenik meg: (1) a hozzá tartozó terv-lánc
fejlécén egy nem-kattintható „Piszkozat” jelzés (a fejléc-toggle egyetlen
kattintási zónája marad, a jelzés nem hoz létre második, beágyazott
kattintható elemet), és (2) egy önálló blokk a láncok TETEJÉN, a
finalizált láncok fölött: a draft kontextusa („Új terv” vagy „Új verzió —
<lánc címke>”, ha a `tervId` egy meglévő lánccal egyezik), az aktuális
workflow-lépés, az utolsó módosítás időbélyege, és a jelenlegi végösszeg
előleg nélkül — tétel-/fázisszám nélkül, és HA a piszkozatban egyetlen
sor sincs, összeg nélkül. A teljes blokk kattintható, a piszkozat utolsó
workflow-lépésére navigál, plusz egy külön „Folytatás” gomb — EGYIK sem
megy át a piszkozat-felülírás-őrön, mert a saját draft folytatása nem
felülírás.

A verziósoron megjelenő összeg a verzió saját `terv.json`-jából jött
`osszesitok.fizetendo` (a ténylegesen fizetendő, nem a listaáras
`kezelesekOsszesen`), a verzió saját pénznemében — a doki nyitás nélkül
látja, mennyiért adta azt az ajánlatot. A mentett érték az igazság,
nincs újraszámolás: az `osszesitok` eltérés-őre ott fut, ahol
ténylegesen kockázatos (szerkesztőbe töltéskor). Ha egy verzió
`terv.json`-ja nem olvasható, csak annál a sornál „—” áll az összeg
helyén, és a páciens megkapja a meglévő „⚠ néhány verziója nem
olvasható” jelzést.

A verziósor „⋯" menüjének „Letöltés" pontja ugyanazt a
`buildDownloadFileName`-et hívja, mint az Előnézet (§ 4. Előnézet és
véglegesítés „Letöltési fájlnév") — a névhez és a `PISZKOZAT-`
előtag-döntéshez a verzió saját, már betöltött `terv.json`-ját használja,
a suffix a verziómappa neve. Olvashatatlan `terv.json`-nál a letöltés nem
hasal el emiatt: a névhez a páciens-szintű nevet, előtaghoz
`isDraft: false`-t használja — a letöltés nem válik szigorúbbá, mint a
puszta PDF-betöltés.

Ez a legerősebb indoka a fájlrendszer-hozzáférésnek — nem a mentés, hanem
a betöltés. Egy visszatérő pácienshez ne kelljen újragépelni 12 tételt.

Betöltés a `terv.json`-ból. Ha csak PDF van (kézzel átmozgatott fájl),
a beágyazott JSON-ból is menjen.

#### A négy terv-létrehozási út és a gombfeliratok rendszere

A képernyőkről négy úton indul terv, és a köztük lévő különbség nem
kényelmi kérdés, hanem az, hogy az eredmény **melyik terv-láncba (és
melyik páciens-mappába, D29)** kerül:

| Gomb | Hol | Mit visz át | Mentéskor |
|---|---|---|---|
| **„Új verzió"** | verziósor `⋯` menüjében | mindent, a `tervId`-t is | ugyanabba a terv-mappába `<ma>_v<n+1>` (D4) |
| **„Másolás új tervbe"** | verziósor `⋯` menüjében | mindent az azonosító/állapot/dátum kivételével | **új** terv-mappa a MEGLÉVŐ páciens-mappában, `<ma>_v1` (D26/D29) |
| **„Új terv"** | a páciensnév mellett, balra | csak a `paciens` blokkot | **új** terv-mappa a MEGLÉVŐ páciens-mappában, `<ma>_v1` (D26/D29) |
| **„+ Új kezelési terv"** | Kezdőlap, az `/uj-terv` köztes választón át (lásd „Új terv indítása — a köztes páciens-választó" lentebb) | „Meglévő páciens keresése": a kiválasztott páciens `paciens` blokkja; „Vadonatúj páciens": a quick-create dialógusban megadott név + opcionális születési dátum/telefon (D41) | **új** terv-mappa — a kiválasztott MEGLÉVŐ vagy a quick-create dialógussal frissen létrehozott páciens-mappában, `<ma>_v1` (D26/D29) |

Ebből következik a feliratok kötelező rendszere: **minden új tervláncot
indító akció felirata az „új terv" fogalmát hordozza — szó szerint („Új
terv", „Másolás új tervbe", „Vadonatúj páciens") vagy a D7 szerinti stabil
Kezdőlap-CTA szövegével („+ Új kezelési terv", D39) —, és egyedül a
meglévő láncot folytató akció feliratában szerepel a „verzió" szó („Új
verzió").** Egy „Megnyitás…" típusú, a mechanizmust (és nem az eredményt)
megnevező felirat elrejtené azt az egyetlen különbséget, amit a dokinak
kattintás előtt látnia kell — lásd `docs/07-felulet-rendszer.md` („a
gombfelirat azt mondja, mi történik"). Ugyanezt mondja ki egy rövid,
szürke magyarázó sor a lista tetején, a kereső alatt.

**A verziósoron nincs látható akciógomb** — mind a négy verzió-szintű
művelet a sor végi `⋯` menüben van, ebben a sorrendben: `Megnézés`,
`Letöltés`, elválasztó, `Új verzió`, `Másolás új tervbe`. Elöl a két
csak-olvasó művelet áll (a könnyebb, fájlt sem hagyó `Megnézés` a
`Letöltés` előtt), utána a terv-létrehozók gyakoriság szerint. Egymás
mellett több hosszú feliratú gomb zsúfolt és összetéveszthető volt; a
menüben egymás ALATT állnak, ezért rövid feliratot is elbírnak.

A `Megnézés` a verzió mentett PDF-jét nyitja meg új böngészőlapon (a
böngésző natív PDF-nézőjében, nincs beépített olvasó nézet) — ugyanazt a
`loadPlanPdf`-et hívja, mint a `Letöltés`, de nem ír fájlt a Letöltések
mappába, és a piszkozatot egyáltalán nem érinti (nincs `loadPlanIntoDraft`,
nincs navigáció, nincs piszkozat-felülírás-őr). A `window.open('',
'_blank')` a kattintás pillanatában, még a PDF-lekérés előtt, szinkron fut
— ha a lekérés után futna, a böngésző popup-blokkolója a legtöbb esetben
elnyelné. Hiányzó mentett PDF esetén a megnyitott üres lap bezárul, és
ugyanaz az inline hiba jelenik meg a soron, mint a `Letöltés`-nél.

A `⋯` `IconButton` `aria-label`-jében benne van a terv címkéje ÉS a
verziószám (`Fogpótlás — v2 — további műveletek`): egy páciensblokkban
több terv-lánc is lehet (D29), és mindegyik saját `v1`-gyel indul — a
puszta verziószám önmagában nem lenne egyedi, sem a szemnek, sem a
képernyőolvasónak.

A páciensszintű `Új terv` az egyetlen látható gomb, **balra, közvetlenül
a páciensnév mellett** — de a névfejlécen KÍVÜL, mert a páciensnév címke,
a gomb akció. A rövid felirat nem mondja ki, hogy a páciensadatot átviszi;
ezt az elhelyezés hordozza. A gomb `soft` accent (nem szürke), a
páciensnév `t.brand` színével egy családban; a `#f77409`-hez nem nyúlunk
(docs/07: soha nem szövegszín). Ez a leírás a Korábbi tervek listájának
`standalone` fejlécére vonatkozik (D44) — a részletoldalba (§ 10)
beágyazva ugyanez a gomb teljes értékű CTA, névfejléc nélkül.

### Korábbi terv új verzióra nyitása

Egy korábbi (jellemzően `VEGLEGES`) terv „Új verzió" menüponttal való
megnyitásakor a `keltezes` a mai napra, az `ervenyesIg` ebből és az **aktuális**
`beallitasok.ervenyessegNap`-ból újraszámolva íródik — nem a régi terv
megőrzött érvényességi ablak-hossza (D22). A bélyegzés **a betöltés
pillanatában** történik, nem véglegesítéskor: az előnézet a `plan`
state-ből rendereli a PDF-et, egy késői írás a mentett JSON-t és a már
renderelt PDF-blobot szétcsúsztatná. Minden más mező (sorok ára,
`nevSnapshot`, `listaEgysegar`, `tetelId`, `arlistaVerzio`) érintetlen
marad — a dátumfrissítés dokumentum-metaadat, nem újraárazás (D7).

A szerkesztő egy **semleges színű** tájékoztató sávban jelzi az új
dátumot és érvényességet, és kimondja, hogy a tételek ára változatlan. Az
amber sáv a valódi anomáliának (mentett vs. újraszámolt `osszesitok`
eltérése) van fenntartva — ugyanaz a szín itt félrevezető lenne.

### Terv másolása új tervként

Két transzformáció, három belépési ponton — a gombok/útvonalak elhelyezése
az adatkör-különbséget követi, nem kényszeríti egy szintre:

- **A páciens ELÉRHETŐ legjobb adataiból — csak a páciensadat.** Két
  belépési pontja van, ugyanazzal az eredménnyel, közös forráskiválasztással
  (`ujTervForrasPaciensbol()`, `app/src/state/planIndulas.ts`, D33):
  - **„Új terv"** — a Korábbi tervek listán, a páciensnév mellett balra,
    páciensszinten (nem egy konkrét verzióhoz kötve).
  - **„Meglévő páciens keresése…"** — a Kezdőlap „+ Új kezelési terv"
    gombja utáni `/uj-terv` köztes választón (lásd lentebb).

  Mindkét belépési pont ugyanazt a sorrendet követi: ha a pácienshez van
  lezárt törzsadat (`paciens-adatok.json`, § 9. Páciensek), onnan indul
  (`planUjTorzsadattal`); egyébként a doki által látott LEGUTÓBB MÓDOSÍTOTT
  terv-lánc legfrissebb verziójának `paciens` adatából
  (`latestVersionAcrossPlans()`, `app/src/domain/planFolders.ts` +
  `planUjPaciensselTervhez`). Ez utóbbi forrás híján (terv nélküli, de
  törzsadattal rendelkező páciensnél a törzsadat pótolja) korábban hibát
  adott — a törzsadat bevezetése óta egy csak törzsadattal rendelkező
  páciens is választható itt.

  Mindkét esetben minden más mező (`orvos`, `fazisok`, `elolegSzazalek`,
  `kedvezmenyOsszeg`) a mai `createBlankPlan()` friss alapértéke —
  pontosan úgy, mintha a doki egy „Vadonatúj páciens" tervet indítana,
  csak a páciens mezők (és a `paciensId`) már ki vannak töltve. A
  **`nyelv`/`penznem` kivétel** (D52, § 2. „Nyelv és pénznem” fent): ha a
  pácienshez van legalább egy VÉGLEGESÍTETT terve, `ujTervForrasPaciensbol()`
  ennek nyelvét/pénznemét adja tovább `createBlankPlan()`-nak, mindkét
  forráságon (törzsadat és a legutóbbi `paciens` pillanatkép) egységesen —
  a `paciens`-adatok forrásától függetlenül ugyanaz a legutóbbi
  VÉGLEGES verzió dönti el, melyik lánchoz tartozzon is az.
- **`planMasolatKent` — minden átjön.** Egyetlen belépési pontja a
  **„Másolás új tervbe"**, minden verzió-sor `⋯` menüjében, mert
  konkrétan AZT a verziót másolja, sorokkal együtt (egy régebbi verzió
  sorai eltérhetnek a legfrissebbtől). A
  `paciens`, `paciensId`, `nyelv`, `penznem`, `orvos`, `fazisok`,
  `elolegSzazalek`, `kedvezmenyOsszeg` és az `arlistaVerzio` is
  változatlanul átjön — ugyanaz a snapshot-elv, mint egy meglévő terv új
  verzióra nyitásakor. Ez a valódi A/B alku-változat használati eset: a
  doki utána csak azt módosítja, ami eltér a két ajánlat között, nem
  gépeli be újra az egészet.

Mindhárom út a meglévő `frissDatummal` (D22) hívásával bélyegzi a
`keltezes`/`ervenyesIg`-et a mai napra, és a másolat `osszesitok`-ja a
saját (átvett) soraiból újraszámolva indul, nem a forrás mentett
értékének másolata (D26) — a forrás `osszesitok`-ja az EREDETI, már
mentett terv fájl-igazsága (D7), nem a most keletkező piszkozaté. A
`tervId`/`verzio`/`statusz` mindhárom esetben nullázódik/`PISZKOZAT`-ra
áll — a másolat sosem csúszhat be verzióként egy meglévő láncba (D4).

Mindhárom út a **Páciens adatlapra** navigál, nem egyenesen a
szerkesztőbe — ugyanúgy, mint egy teljesen új terv indításakor. A doki itt
látja és pontosíthatja az átvett páciensadatot (pl. időközbeni
címváltozás), és ez a tranzitív lépés önmagában is jelzi, hogy ez egy ÚJ
terv indítása, nem egy meglévő verzió folytatása — nincs hozzá külön,
tisztázó megerősítő dialógus, csak a meglévő piszkozat-felülírás-őr fut le
mindegyiknél, ha van mentetlen munka. A megkülönböztetés másik fele a
feliratokban van (lásd § Korábbi tervek, „A négy terv-létrehozási út"):
mindegyik tartalmazza az „új terv" kifejezést, a láncot folytató akció
pedig az egyetlen, amiben a „verzió" szó szerepel.

A másolat rögtön MENTETLEN piszkozatnak számít (a „Piszkozat folytatása"
kártya azonnal megjelenik a Kezdőlapon), mert még soha nincs elmentve a
saját `tervId` alatt — más, mint egy `loadPlanIntoDraft`-tal betöltött,
már mentett terv. Mentéskor az átvitt `paciensId` miatt (D29) a
`storage.savePlan` a MEGLÉVŐ páciens-mappában nyit új terv-mappát — nem
egy másikban. A „Vadonatúj páciens" ág (lásd lentebb) ettől eltérően: a
quick-create dialógus (D41) sikeres mentése hoz létre egy ÚJ
páciens-mappát, MIELŐTT a Páciens adatlap megnyílna — a `paciensId` ott
sem üres, csak a keletkezés pillanata más.

### „Új terv indítása" — a köztes páciens-választó (D29)

A Kezdőlap „+ Új kezelési terv" gombja nem egyenesen a Páciens adatlapra
navigál, hanem egy köztes kereső/választó lépésre (`/uj-terv`,
`app/src/pages/NewPlanPage.tsx`) — a teljesen friss, Home-ról induló útnál
a doki még nem gépelt be semmit, tehát itt (és csak itt) van
kétértelműség, hogy melyik páciensről van szó:

- **„Meglévő páciens keresése…"** — névre kereső mező a páciens-index
  (`storage.listPatients()`) alapján, ékezetfüggetlenül (`norm()`),
  automatikusan fókuszban a lépés megnyílásakor (D40). Kétállású (D40):
  0–1 karakternél a D39 „legutóbbi páciensek" listája (max 5, ugyanaz a
  `legutobbAktivPaciensek()` helper, mint a Kezdőlapon); 2+ karaktertől a
  `paciensTalalatok()` (`domain/paciensKereses.ts`) relevancia szerinti
  rendezése (teljes név eleje > valamelyik szótöredék eleje > belső
  egyezés, azon belül alfabetikus). A lista a tételkeresővel
  (`ItemPicker.tsx`) azonos gépel → nyíl → Enter/Esc ciklust követi
  (`ArrowDown`/`ArrowUp` mozgatja a kiemelést, `Enter` kiválaszt,
  `Escape` kiüríti a keresőt). Nulla találatnál egy közvetlen „Új
  páciens: „…"" opció jelenik meg a begépelt névvel, a „Vadonatúj
  páciens" ágat indítja el, a quick-create dialógust a begépelt névvel
  előtöltve. Kiválasztás után a közös forráskiválasztáson (lásd fent,
  D33) előtöltve nyílik a Páciens adatlap — a nyelv/pénznem is a
  kiválasztott páciens legutóbb véglegesített tervéből örökölve (D52,
  fent § 2), ugyanazon a közös forráson keresztül.
- **„Vadonatúj páciens" (D41)** — a `PaciensekPage.tsx` „+ Új páciens"-
  ével közös quick-create dialógust nyitja meg
  (`app/src/pages/paciensek/UjPaciensDialog.tsx`): kötelező név +
  opcionális születési dátum/telefon. A dialógus Mégse/Escape-je a
  köztes választón hagyja a dokit, a keresőszöveg megmarad (D205), a
  fókusz visszakerül a keresőmezőre. A duplikáció-detektálás (D42)
  kétfázisú: gépelés közben a begépelt névre pontos vagy hasonló
  (token-alapú) egyezésű páciensek jelennek meg javaslatként (max 3,
  „+N további" kibontással), a szűk jelölt-körre betöltött születési
  dátum/telefon szűrve tovább — ellentmondó adatnál a hasonló-nevű
  javaslat kiesik, a pontos névegyezés viszont jelöléssel bennmarad. Egy
  javaslat „Ezt a pácienst választom" gombja a begépelt adatokat eldobva
  a MEGLÉVŐ páciensre folytatja a flow-t (D203/D204); ha a talált adatok
  ELTÉRNEK a begépeltektől, egy megerősítő dialógus kéri a végső
  jóváhagyást. A Mentés gomb javaslat hiányában is mindig lefuttatja
  ugyanezt az ellenőrzést a végleges adatokra, mielőtt tényleg ment — ha
  talál ütközést, „Mégis új páciens létrehozása" explicit megerősítést
  kér. Csak sikeres mentés után jön létre a valódi páciensrekord ÉS
  navigál a Páciens adatlapra — a mindig látható gomb üres, a fenti
  no-match „Új páciens" opció a begépelt névvel előtöltve nyitja ugyanezt
  a dialógust.

A piszkozat-felülírás-őr a köztes lépésen fut le (mindkét ágon), NEM a
Kezdőlap gombján — a Kezdőlap gombja feltétel nélkül navigál ide, mert a
piszkozat itt még nem veszik el. A „Vadonatúj páciens" ágon ez a
megerősítés a quick-create dialógus MEGNYITÁSA előtt fut le; a
dialógus saját Mégse/Escape-je (fent) ettől független, külön lépés.

A Korábbi tervek saját „Új terv"/„Másolás új tervbe" gombjai (lásd fent)
**nem** ide navigálnak — azoknál a célpáciens már adott a forrás tervből,
nincs kétértelműség.

---

## 6. Kezelések és árak (árlista admin)

Megvalósítás: `app/src/pages/PriceListAdminPage.tsx`.

### Tábla

Kategóriánként csoportosítva, oszlopok: gyakori jelölő (csillag),
megnevezés, HUF ár, EUR ár, aktív jelölő (szem ikon).

**Egy tábla, két ár oszlop** — nem külön magyar és német nézet. Így egy
pillantás megmutatja, hol hiányzik az EUR ár.

### Árlista-verzió

A fejlécben („verzió …") megjelenő `arlistaVerzio` MINDEN mentéskor a mai
napra áll, tartalmi megkülönböztetés nélkül (D30) — ez a forrása a
nyomtatvány láblécén megjelenő „árlista …" audit-adatnak
(`docs/04-nyomtatvany-spec.md`). Egy már mentett terven lévő
`arlistaVerzio` ettől függetlenül pillanatkép (D7): a terv a saját
létrehozásakori értékét viseli, nem frissül utólag.

### Keresés és szűrők

A keresőmező **mindkét nyelven illeszt** (`nev.hu` és `nev.de`), ugyanazzal
a szabállyal, mint a tervszerkesztő tétel-keresője — egy csak németül
elnevezett vagy csak a német nevében elgépelt tétel is megtalálható. A
találati sor változatlanul a magyar nevet mutatja; nincs külön jelzés
arra, hogy a találat a német névből jött.

`Mind` · `Nincs EUR ár` · `Sávos ár` · `Inaktív` · `Gyakori`

A `Nincs EUR ár` szűrő **maga a német bevezetés munkalistája**.

### Új tétel felvitele

A „+ Új tétel" gomb a lista TETEJÉN (a Kategóriák panel sorában) ÉS a lista
alján is megjelenik — hosszú listánál a felső a megtalálható, az alsó a
kéznél lévő. Mindkettő ugyanazt a felugró ablakot nyitja
(`pages/priceListAdmin/UjTetelDialog.tsx`).

A dialógus csak a névre és a kategóriára kérdez:

- Megnevezés (magyar) — kötelező, nem lehet üres/csak szóköz
- Bezeichnung (német) — opcionális
- Kategória — kötelező, **nincs alapértelmezett kitöltés** (a doki mindig
  tudatosan választ, nem esik némán az első kategóriába)

A Mentés gomb nem tiltott: kattintásra, ha valamelyik kötelező mező
érvénytelen, a mező alatt megjelenik a hibaszöveg, és a dialógus nyitva
marad. Ha egy már meglévő (aktív VAGY inaktív) tétel nevével ékezetfüggetlenül
pontosan egyezik a beírt név, egy nem blokkoló figyelmeztetés jelzi ezt — egy
inaktív tétel bármikor visszakapcsolható (D17), ezért hasznosabb, ha a doki
azt fontolja meg duplikálás helyett.

A dialógus Mégse gombja és az Escape is nyomtalanul eldobja a piszkozatot,
megerősítés-kérés nélkül — a törzsadatba semmi nem kerül a Mentés
megnyomásáig, és tétel-id sem foglalódik le.

Mentés után a tétel a listában, az ártípus `FIX` és a HUF ára `0` kezdőértékkel
jön létre (`aktiv: true`, `gyakori: false`, nincs EUR ára), a lista a friss
sorhoz görget, a sor kinyílik, és a fókusz a HUF ár mezőre kerül — a többi
mező (ártípus, HUF/EUR ár, gyakori, aktív) az alábbi „Sor kinyitása" szerinti
szerkesztőben állítható be.

### Sor kinyitása

Kattintásra a sor lenyílik, és ott van minden mező:

- magyar név, német név
- leírás (magyar, német) — „mi van benne?" (docs/02-domain-modell.md §
  Tétel-leírás), többsoros szövegmező
- csomagtétel jelölő — a véglegesítés-őr csak ennél a jelölésnél
  figyelmeztet hiányzó leírásra
- kategória (legördülő — **ezzel mozgatható át a tétel**, ez a takarítás
  fő eszköze)
- ártípus váltó: `FIX` / `SAVOS`
- HUF ár (vagy min/max), EUR ár (vagy min/max)
- aktív, gyakori

A `min`/`max` mezőpárra nincs betöltési szintű validáció (`validate.ts`
csak azt nézi, véges szám-e mindkettő) — ha a doki a „tól" mezőbe nagyobb
számot ír, mint az „ig"-be, a mezőpár alatt puha, amber figyelmeztetés
jelenik meg (`savosHatarForditott()`, `domain/money.ts`), de a mentés
ettől még lefut. Kemény tiltás azért nincs, mert gépelés közben (a „tól"
mező kitöltve, az „ig" még nem) a fordított állapot átmeneti.

Minden mezőszerkesztés (a szöveges mezők minden leütésre, a szám- és
egyéb mezők commit-onként) a `priceList`-et updateren át, a mentés ELŐTT
szinkron frissíti (D31, `docs/05-technologia.md`) — két, gyorsan egymást
követő szerkesztés (akár két különböző sor, akár ugyanannak a sornak két
mezője) emiatt nem üti ki egymást.

### Törlés helyett inaktiválás

A szem ikon inaktivál. Törölni nem lehet, és az `id`-t **soha nem
használjuk újra** (D17) — ezen múlik, hogy a régi tervek évek múlva is
értelmezhetők maradnak.

### Kategóriák panel

Összecsukható panel a tétel-táblázat FÖLÖTT. Kategória létrehozása,
átnevezése, színezése (kurált palettából, `KATEGORIA_PALETTA`), fel/le
sorrendezése; **törlés csak üres kategórián** — ha van rajta tétel, előbb
át kell mozgatni (a tétel-táblázat sorának kinyitása → kategória legördülő,
lásd „Sor kinyitása" fent).

A kategória sorrendje nem csak megjelenítési sorrend: a fogtérkép
ütközési prioritása is ebből olvas (docs/07-felulet-rendszer.md § Szín,
forma, sűrűség, D28) — egy fogon több kezelés esetén a listában előrébb
álló kategória színe nyer.

Az új kategória `id`-je a `nextKategoriaId()` max-alapú számításával
készül — a `nextTetelId` párja, ugyanaz a D17-szerű elv (soha nem
hossz-alapú, soha nem újrahasznosított).

---

## 7. Beállítások

Három tab (Radix `Tabs`, CONTROLLED — a tab-váltást a D38/D46
elhagyás-guardnak el kell kapnia, `docs/07-felulet-rendszer.md` §
Komponensek): **Rendelő adatai** (alapértelmezett) | **Nyomtatványok** |
**Egyéb** (D49). A Radix `Tabs.Content` unmountolja az inaktív tabot,
tehát egyszerre csak egy tab draftja él a memóriában.

**Mentési modell (D49, felváltja a korábbi D31 leütésenkénti autosave-ot
ezen a lapon)**: mindhárom tab pufferelt draftot vezet
(`components/useDirtyDraft.ts`), saját explicit Mentés/Mégse gombpárral.
A Rendelő adatai és az Egyéb tab Mégse gombja azonnali (nincs
megerősítés, mert csak a látható mezőket veszíti el); a Nyomtatványok
Mégse gombja megerősítést kér (lásd lent). Gyökérmappa kijelölése /
váltása — a 2. fázis (`docs/05-technologia.md`) tartalma, ma nem
implementált.

Tab-váltás (vagy NavBar-navigáció, D46) nem mentett módosítással
megerősítő dialógust nyit — megerősítés után a piszkozat **ténylegesen
elvész**, a Radix a tab tartalmát unmountolja.

### Rendelő adatai

- Rendelő adatai a nyomtatvány fejlécéhez és láblécéhez
  (Név/Cím/Telefon/E-mail/Adószám/Cégjegyzékszám)
- Orvosok listája (egy név soronként)

### Nyomtatványok

Sablonszövegek szerkesztése — a nyilatkozat, a fizetési feltételek és a
garancia, saját nyelvváltóval (Magyar/Deutsch, ha a német engedélyezve
van). **Mentéskor új verziófájl keletkezik** (`nyilatkozat-hu-v2.md`), a
régi marad, mert a korábbi tervek arra hivatkoznak — a mentés a
véglegesítéskor épp aktuális (legfrissebb) verziót pinneli a tervre. A
nyilatkozat szövegében a `{{orvos}}` helyőrző a kezelőorvos nevére
cserélődik a nyomtatványon. A szerkesztőmezők tartalma elnavigálásig sem
vész el: egy `dp:sablon-piszkozat` localStorage-kulcs base-enként
cache-eli, néma visszaállítással, és sikeres mentéskor base-enként
törlődik. **Ez tudatosan nem a `DraftStorage` bővítése** — az kizárólag
`Plan`-ra típusozott, egyetlen felelősséggel; a `dp:` prefix miatt a
„Minden adat törlése"/„Demó adat visszaállítása" ezt is elsöpri, külön
kód nélkül. A „Szöveg mentése" gomb `useRef`-alapú in-flight zárat visel,
mert a `disabled` prop önmagában megkerülhető egy render előtti második
kattintással.

**„Mégse" gomb** (D38) a „Szöveg mentése" mellett, dirty állapotban
engedélyezett — MEGERŐSÍTÉST kér (ellentétben a Rendelő adatai/Egyéb tab
azonnali Mégse-jével), mert egyszerre minden nyelv/szlot piszkozatát
elveti, nem csak a jelenleg látszó nyelvet, és a `dp:sablon-piszkozat`
cache-bejegyzést is törli minden érintett base-hez — enélkül a
piszkozat egy F5 után visszatérne. Ugyanez a cache-törlés fut le akkor
is, ha a doki dirty állapotban másik Beállítások-tabra vagy a NavBar-on
át máshova navigál, és a tab-váltás/D46 megerősítő dialógusban az
elvetést választja.

### Egyéb

- Ajánlat érvényessége napokban (alapérték 90)
- **Német nyelvű ajánlat engedélyezése** (`nemetEngedelyezve`) — checkbox.
  Bekapcsolva megjelenik az **alapértelmezett nyelv** kapcsolója (ez lesz
  az új tervek nyelve), alatta a **német tartalom készültsége**:
  hány aktív tételnek van már német neve, hány tételnek van EUR ára, és a
  `nyilatkozat-de-v1.md` státusza (placeholder, amíg a jogi fordítás el
  nem készül) — link a Kezelések és árak oldalra, ahol a „Nincs EUR ár"
  szűrő a munkalista. A készültség-blokk a MÉG NEM MENTETT
  `nemetEngedelyezve` draft-jából jelenik meg (a checkbox bepipálására
  azonnal látszik), a nyilatkozat státuszát a tab saját maga tölti be,
  függetlenül a Nyomtatványok tabtól.

---

## 8. Filerendszer

**Kizárólag a mockup-fázisra való, demó-only nézet, a `DEMO` oldal
Filerendszer füle** — a végleges asztali alkalmazásban a doki a valódi
Fájlkezelőt használná erre, ez a képernyő nem feltétlenül él tovább a
`FileSystemStorage`-váltás (2. fázis) után. Célja, hogy a doki és a
fejlesztő közösen lássa, mit írna az app a gyökérmappába — a
`docs/02-domain-modell.md` "Mappastruktúra" élő, kattintható vetülete a
mockup `localStorage`-adatából.

- **Read-only fa**: mappa/fájl diszklózúra, a gyökér és az első szint
  (`sablonok/`, `paciensek/`, a két root JSON) alapból nyitva, mélyebb
  szintek (páciens-/terv-/verziómappák) csukva. Semmilyen törlés/
  átnevezés/írás nincs ezen a képernyőn — a meglévő útvonalak (Korábbi
  tervek, Kezelések és árak, Beállítások) változatlanok.
- **Egy fájlra kattintva** a ténylegesen tárolt tartalom jelenik meg alatta:
  JSON fájloknál pretty-printelve, sablon-`.md` fájloknál nyers szöveggel
  (a `[PLACEHOLDER`/`[PLATZHALTER` jelöléssel együtt), a `kezelesi-terv.pdf`-nél
  egy "Megnyitás új lapon" linkkel a ténylegesen elmentett PDF-bájtokból
  épített ideiglenes URL-re.
- **Csak az valóban ott van, ami ténylegesen mentve lett** — a demó seed
  tervekhez (a „Demó adat visszaállítása" gomb után) egyelőre nincs PDF,
  az csak egy tényleges véglegesítés-és-mentés után jelenik meg a
  verziómappában; a fa nem mutat kitalált tartalmat.
- **A piszkozat-cache-ek (`dp:piszkozat`, a terv-autosave; és a
  sablonszerkesztő `dp:sablon-piszkozat`-ja, lásd fent § 7. Beállítások)
  soha nem jelennek meg** — a végleges architektúrában ezek IndexedDB,
  nem fájl, tehát a fa nem róluk szól.
- Üres tároló esetén ("Minden adat törlése" — bár ez a gombsorrend miatt
  ma mindig újra-seedel is, lásd Kezdőlap) semleges üres állapot, hiba
  esetén a hiba szövege — a `docs/07-felulet-rendszer.md` "Kötelező
  állapotok" szabálya szerint.

---

## 9. Páciensek

Tiszta navigációs lista a páciens-részletoldalhoz (§ 10) — funkcionálisan
külön a Korábbi tervektől (§ 5): az a kezelési előzmény/verziók képernyője,
ez a páciens-azonosítás/keresés képernyője. A kettő kölcsönösen linkel
egymásra ugyanahhoz a pácienshez. A törzsadat-szerkesztő (`paciens-
adatok.json`, D33) EGYETLEN helye a § 10 `Páciens adatai` tabja — a
szerkesztő mezői/mentés-szabályai ott vannak leírva (D43).

- **Lista**: `storage.listPatients()` + a törzsadat/fallback eager
  betöltésével (`loadTorzsadatok()`, `domain/torzsadatBetoltes.ts` — a
  `PlanHistoryPage` végösszeg-betöltésének mintájára) minden látható
  sorra egyszerre, nem soronkénti lusta betöltéssel. Alfabetikus
  (`localeCompare('hu')` a megjelenített néven).
- **Sor tartalma**: oszlopos táblázat (Radix `Table`, `pages/paciensek/
  PatientTableRow.tsx`, D47) — Név / Született / Telefon fejléccel, félkövér,
  `t.brand` színű oszlopcímekkel (az Árlista admin kategória-fejlécével
  azonos stílus). A Kezdőlap „Legutóbbi páciensek”
  sora (`components/PatientListRow.tsx`) SZÁNDÉKOSAN külön komponens (D47) —
  az eltérő elrendezés (táblázat vs. az aktivitás-szöveget hordozó kompakt
  sor) miatt. A két NORMÁL állapot („van már lezárt törzsadata” / „egyelőre
  csak élő fallback”) NEM kap semmilyen jelvényt; a törzsadat-betöltés
  hibája egy összevont, a Született+Telefon oszlopot átfogó cellában
  jelenik meg (`⚠ adat nem olvasható`). Hiányzó születési dátum vagy
  telefon az app „—” hiányzó-érték jelölését kapja. A sor egérrel bárhol
  kattintható (a névcella egy valódi `<a>`-t tartalmaz, középső gombbal/
  „megnyitás új lapon”-nal is elérhető), hoverre/fókuszra a teljes sor
  háttere `accentWash`-ra vált.
- **Keresés**: névre (ékezetfüggetlen, mint korábban), ÉS — 2+ begépelt
  számjegytől — a születési dátumra/telefonszámra is, elválasztójeltől
  függetlenül (`keresoKulcs()`/`torzsadatEgyezik()`,
  `domain/paciensKereses.ts`; a telefon-egyezéshez a D42
  `telefonKulcs()`-előtag-normalizálását is felhasználva). A mezőnek
  látható „Keresés” címkéje van a mező fölött (`docs/07`: címke soha nem
  csak placeholder), a lista fölött egy találatszám sor mutatja a
  szűrt/teljes arányt (`„N találat az M páciensből”`, szűrés nélkül
  `„M páciens”`).
- **Sor megnyitása**: a sorra kattintás a páciens-részletoldalra (§ 10)
  navigál — alapértelmezetten a `Kezelési tervek` tabra (a § 10
  alapértelmezése), NEM nyílik ki helyben szerkesztő.
- **Állapot-megőrzés**: a listáról egy sorra navigálva, majd böngésző-
  „vissza”-val visszatérve a keresőszöveg és a görgetési pozíció megmarad
  (`components/useListStateMemory.ts`) — KIZÁRÓLAG ezen az úton; egy friss
  belépés (pl. a NavBar „Páciensek” linkjéről) mindig tiszta listát ad.
  Munkamenetre szűkített (nem böngészőtár), lapfrissítés után nem marad meg.
- **Új páciens**: „+ Új páciens” gomb, mezős dialógus (kötelező Név +
  opcionális Született/Telefon — a többi adat a mentés után, a
  részletoldal `Páciens adatai` tabján adható meg, az `UjTetelDialog.tsx`
  mintájára). A Született mezőnél jövőbeli dátum blokkolóan hibát ad
  (D45, ugyanaz a szabály, mint a `PatientEditorPanel`-en), a Mentés
  gomb ilyenkor nem hoz létre pácienst. Ugyanez a dialógus
  (`UjPaciensDialog.tsx`) szolgálja az „Új terv indítása” köztes
  páciensválasztó „Vadonatúj páciens” ágát is (D41), a duplikáció-
  detektálás (D42) mindkét belépési ponton azonos (lásd fent, „Új terv
  indítása”). `storage.createPatient(nev, kezdoAdatok?)` mindkét
  gyökér-fájlt (`paciens.json` + `paciens-adatok.json`) létrehozza, terv
  nélkül, majd a mentés a páciens-részletoldalra, SZERKESZTÉS módban
  előválasztott `Páciens adatai` tabra navigál (D45). Az így felvitt
  páciens a Korábbi tervek listán NEM jelenik meg (§ 5) — csak akkor
  kerül oda, ha legalább egy terve is lesz.
- A nyomtatvány (PDF) nem változik: ez a képernyő SOHA nem forrása a
  PDF-nek (D7, D33).
- **Törlés** (D50): a lista élőben (`storage.listPatients()`) tölt be,
  tehát egy törölt páciens a törlés után azonnal eltűnik innen is —
  magát a törlés akcióját lásd § 10, ez a képernyő nem kínálja soronként.

---

## 10. Páciens részletei

URL-lel címezhető (`/paciensek/:patientDir`, D35), két tabbal: `Páciens
adatai | Kezelési tervek`. Megvalósítás: `app/src/pages/PatientDetailPage.tsx`.
Ez a képernyő a törzsadat-szerkesztést (§ 9) és a `Korábbi tervek` (§ 5)
tartalmát FOGADJA BE két tabként. A `Páciens adatai` tab tartalma
(`components/PatientEditorPanel.tsx`) itt van az EGYETLEN hívási helyén
(D43) — a § 9 Pácienslistája tiszta navigációs lista, nem tartalmazza. A
`Kezelési tervek` tab tartalma (`components/PatientPlanChains.tsx`)
ellenben KÉT hívási helyen közös: itt ÉS a `Korábbi tervek` (§ 5)
páciensenkénti listasorában, hogy egyik oldal se duplikálja a másikat. A
fejléce viszont hívónként eltér (D44, lásd lent): itt beágyazva
(`header: 'embedded'`), a listában önállóan (`header: 'standalone'`). A
`Páciensek`/`Korábbi tervek` listák önmagukban változatlanul elérhetők
maradnak — csak a bennük lévő kereszt-linkek mutatnak ide.

- **Sticky fejléc**: név + születési dátum + telefon, görgetéskor a lap
  tetején marad. Adatforrása a `megjelenitettTorzsadat()` (§ 9-cel azonos
  logika: lezárt törzsadat, vagy ha nincs, élő fallback a legutóbb
  módosított terv-lánc legfrissebb `paciens` pillanatképéből).
- **Alapértelmezett tab**: `Kezelési tervek` — a hívó (a két lista
  kereszt-linkje) `location.state`-ben jelezheti, hogy helyette a
  `Páciens adatai` tabbal nyisson (pl. teljes pácienslétrehozás után).
- **`Páciens adatai` tab**: a `PatientEditorPanel` — nincs rajta „Új terv”
  gomb, az kizárólag a `Kezelési tervek` tabhoz tartozik. Kétállású (D45):
  megnyitáskor alapból READ-ONLY nézet (`ReadOnlyField`-ekkel, a mentett
  adatból, sosem egy piszkozatból), egy „Szerkesztés” gombbal az input-
  mezős nézetre váltva — a puszta megtekintés így sosem indít piszkozatot.
  A kitöltetlen mezők READ-ONLY nézetben az app meglévő „—” hiányzó-érték
  jelölését kapják (nem egy külön szöveget). Ha a páciensnek nincs még
  `paciens-adatok.json`-ja, a mezők (Név / Született+TAJ / Lakcím /
  Telefon+E-mail / Kiskorú + feltételes Törvényes képviselő) a legutóbb
  módosított terv-láncának legfrissebb `paciens` pillanatképéből előre
  kitöltve nyílnak (READ-ONLY nézetben is), egy rövid sor jelzi, hogy ez az
  adat még nem önálló — mentéssel válik azzá. Szerkesztés módban explicit
  „Mentés”/„Mégse” gombpár, NEM leütésenkénti autosave (ellentétben pl. a
  Beállítások rendelő-mezőivel) — az első mentés szemantikus állapotváltás
  (fallback → lezárt törzsadat), ezt a dokinak szándékosan kell kiváltania;
  a „Mégse” gomb módosítás nélkül is elérhető, hogy vissza lehessen lépni
  READ-ONLY nézetbe. Az e-mail mező (ha kitöltött) szintaktikai formátumát
  és a Született mező jövőbeli dátumát a Mentés gomb blokkolóan ellenőrzi
  (hibaszöveg a mező alatt, a Mentés gomb kattintható marad); a Mentés
  gomb sikeres mentés után visszalép READ-ONLY nézetbe. Tab-váltáskor, ha
  szerkesztés módban van nem mentett módosítás, megerősítést kér (lásd
  lent) — a tab-váltás egyben READ-ONLY nézetre is visszaállítja a panelt.
  A Mentés gomb a duplikáció-detektálást (D42) is lefuttatja a végleges
  adatokra, mielőtt tényleg ment — ha egy MÁSIK páciensre pontos vagy
  hasonló találatot ad, egy megerősítő dialógus („Hasonló nevű páciens már
  létezik”) kéri a jóváhagyást, javaslat-lista/„Ezt a pácienst választom”
  akció nélkül (ez itt átnevezés, nem választás — a doki már egy konkrét,
  nyitott páciens adatlapján van). A `PaciensekPage.tsx` „+ Új páciens”
  sikeres mentése után a tab kivételesen SZERKESZTÉS módban nyílik (a
  hívó `location.state.mod: 'szerkesztes'`-t jelez) — a doki épp csak a
  nevet adta meg, valószínűleg tovább akarja tölteni a többi mezőt; egy
  MEGLÉVŐ páciens kiválasztása (kereszt-link, „Ezt a pácienst választom”)
  ellenben READ-ONLY nézetben nyit.
- **`Kezelési tervek` tab**: a `PatientPlanChains` (§ 5 fa/verzió/akció
  szabályai szerint), de a fejléce beágyazott (D44): a páciensnév és a
  „Páciens adatai” kereszt-link elmarad, mert a sticky fejléc és a
  tabsor már hordozza mindkettőt — csak az „Új terv” akció marad,
  teljes értékű CTA-ként, ugyanolyan hangsúllyal, mint a lenti üres
  állapoté. Ha a páciensnek még nincs egyetlen olvasható terv-verziója
  sem, a fa helyett egy „Új terv” CTA jelenik meg — ez az EGYETLEN eset,
  ahol ez a képernyő ilyen üres állapotot mutat, mert a Korábbi tervek
  listája (§ 5) egy ilyen pácienst eleve ki sem listáz.
- A `Páciens adatai` tab „Korábbi tervek” gombja — ami korábban a
  `PatientEditorPanel` alján állt — megszűnt (D44): a tabok közti váltás
  egyetlen helye a tabsor. A `Kezelési tervek` tab tartalma emiatt sem
  tart saját „Páciens adatai” utat.
- **Tab-váltási guard** (D38): a Radix `Tabs` unmountolja az inaktív tabot,
  tehát a `Páciens adatai` tabon félbehagyott, nem mentett szerkesztés
  egyébként némán elveszne egy tabváltásnál (`Tabs.List` kattintás — ez az
  EGYETLEN útja a tab-váltásnak ezen az oldalon, D44). A megosztott
  primitíven (`useDiscardGuard`/`DiscardChangesDialog`) megy át —
  megerősítést kér, a `Kezelési tervek` tab felé váltás irányban.
- **Páciens törlése** (D50): a sticky fejléc jobb szélén egy `⋯` menü
  (`components/PatientDetailHeader.tsx` `actions` propja) EGYETLEN
  ponttal, „Páciens törlése” — ez az EGYETLEN elérési pont az egész
  appban, nincs a Pácienslista sorain vagy a Korábbi tervek
  verziósorainak `⋯` menüjén. A pont csak akkor aktív, ha a páciensnek
  nincs véglegesített terve, nincs rá mutató aktív, mentetlen piszkozata,
  és minden terv-lánca/verziója olvasható volt; egyébként tiltott, alatta
  egy rövid indoklással („Véglegesített terve van” / „Aktív piszkozat
  tartozik hozzá” / „Néhány terve nem olvasható”). Kattintásra egy
  megerősítő `AlertDialog` nevezi meg a pácienst és mondja ki, hogy a
  művelet végleges; megerősítés után a teljes páciensmappa törlődik
  (`storage.deletePatient()`), és a doki a Pácienslistára kerül. Nincs
  „kuka”, nincs helyreállítás, nincs páciens-összevonás.
