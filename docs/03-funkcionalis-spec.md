# 3. Funkcionális specifikáció

## Képernyők

1. Indítás
2. Páciens adatlap — itt dől el a terv nyelve és pénzneme (D21)
3. **Terv szerkesztő** — a legfontosabb
4. Előnézet és véglegesítés
5. Korábbi tervek
6. Árlista admin
7. Beállítások
8. Filerendszer — demó-only, a leendő fájlrendszeres architektúra vizualizációja

---

## 1. Indítás

Első futáskor a doki kijelöl egy gyökérmappát. Ez a `PlanStorage`
inicializálása. A böngészős implementációnál a hozzájárulást
munkamenetenként újra kell kérni — ez egy kattintás, de számolni kell vele.

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
Magyarországon, forintban fizetnek. Alapértéke ezért mindig `HUF`, még
német nyelvű ajánlatnál is.

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
- A darabszám (`Db`) továbbra is **kézi** — a fogtérkép nem állítja be
  automatikusan (D14 nem nyílik meg).

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
| Db | Kézi, alapérték 1, minimum 1 |
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

Német nyelvű terven a Beavatkozás mező mellett két, egymást kizáró jelvény
jelenhet meg: `HU`, ha a tételnek nincs német neve az árlistában, vagy
„átírt", ha van német neve, de a sor szövege attól eltér (kézzel
pontosítva). Csak `tetelId`-hez kötött soron jelenhet meg az „átírt" —
egyedi sor sosem kaphatja, hiszen nincs mihez viszonyítani. Magyar terven
egyik sem jelenik meg (a doki magyarul gépel, ott nincs mit jelezni, D21).

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
  „hiányzó német tételnevek" figyelmeztetésbe (a szerkesztőben `HU`
  jelvénnyel, véglegesítéskor a megerősítő listában) — szabad szöveghez
  nincs német változat.
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
  `parseTeeth()`). Nincs automatikus javítás (D14).
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
hozzá; a Kezdőlap „Új terv indítása” gombja maga feltétel nélkül navigál
(a köztes `/uj-terv` választóra, D29 — lásd § Korábbi tervek), de MINDEN
tényleges terv-létrehozó akció megerősítést kér, mielőtt felülírná: az
`/uj-terv` mindkét ága („Meglévő páciens keresése…”, „Vadonatúj páciens”)
és a „Korábbi tervek” mindhárom akciója („Új verzió”, „Másolás új
tervbe”, „Új terv”) — egyik sem kivétel. A megerősített felülírás
pillanatában a perzisztált piszkozat **azonnal** törlődik, nem a
következő írási triggerre vár.

Ha az automatikus mentés elhasal (pl. localStorage-kvóta), a hiba a Terv
szerkesztőben is látszik, nem csak a Kezdőlapon — ott dolgozik a doki.

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

**Német terv, hiányzó/eltérő tételnevekkel:** ha a tervben olyan sor van,
amihez nem tartozik német tétel név, vagy amelynek neve kézzel eltér az
árlistától (lásd D21, D24), a véglegesítés megerősítést kér — a páciens
ezt a dokumentumot írja alá, ezért ez a figyelmeztetés soha nem néma. A
megerősítő dialógus **két külön felsorolást** mutat: „N tételnek nincs
német neve" és „M sor neve eltér az árlistától (kézzel szerkesztve)" — a
két ok különböző dokitennivalót jelent, nem szabad egy lista mögé
bújtatni.

**Kitöltetlen sor (kemény blokk):** ha a fogtérképről kattintással felvett
sor tétel nélkül maradt, a véglegesítés **nem** kérhető meg és nem
folytatható — ez nem figyelmeztetés, hanem blokk, hogy névtelen, 0 Ft-os
sor sose kerülhessen az aláírandó dokumentumra. A hibaüzenet megnevezi a
fázist és a fogszámot; „Vissza a szerkesztőbe" gomb visz a hiányzó sorhoz.
Az Előnézet maga nem blokkolódik, csak a véglegesítés.

**Hiányzó csomag-leírás (puha megerősítés):** ha a tervben `csomag: true`
tételre hivatkozó, üres leírású sor van, a véglegesítés egy harmadik
megerősítő lépést kér — a lánc sorrendje: hiányzó páciensadat → hiányzó/
eltérő német tételnevek → hiányzó csomag-leírás. A dialógus felsorolja az
érintett sorokat, „Folytatás" gombbal átugorható (docs/02-domain-modell.md
§ Tétel-leírás). Ez a lépés kimarad, ha a terv `leirasokMutatasa` kapcsolója
ki van kapcsolva — ilyenkor a leírás úgysem kerül a nyomtatványra.

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

---

## 5. Korábbi tervek

A `paciensek/` fa beolvasása, kereshető listával. Páciensnév szerint
csoportosítva, alatta a terv-láncok (D29), azon belül a verziók dátummal
és **végösszeggel**.

Egy páciensnek **1 terv-lánca** esetén (a tipikus eset) a blokk alapból
kibontva jelenik meg — nincs plusz kattintás. **2+ lánc** esetén alapból
csukva nyílik (csak a páciensnév, a láncok száma és a legutóbb módosított
lánc legfrissebb dátuma/összege látszik), kattintásra bomlik ki. A
verzió-szint egy kibontott terven belül mindig látszik, nincs harmadik
szintű összecsukás.

Minden terv-lánc fejlécén egy **címke** áll: `<tervCim> · <a lánc
legkorábbi verziójának dátuma>`. A címke a doki által bármikor szabadon
átírható (`terv-cimke.json`, `docs/02-domain-modell.md` § Páciens- és
terv-mappa) — egy már véglegesített terv címkéjének átírása NEM hoz létre
új verziót. Amíg a doki nem ír át semmit, a mező egy élő auto-javaslatot
mutat (a terv domináns kategóriájának neve, `javasoltTervCim()`).

A verziósoron megjelenő összeg a verzió saját `terv.json`-jából jött
`osszesitok.fizetendo` (a ténylegesen fizetendő, nem a listaáras
`kezelesekOsszesen`), a verzió saját pénznemében — a doki nyitás nélkül
látja, mennyiért adta azt az ajánlatot. A mentett érték az igazság,
nincs újraszámolás: az `osszesitok` eltérés-őre ott fut, ahol
ténylegesen kockázatos (szerkesztőbe töltéskor). Ha egy verzió
`terv.json`-ja nem olvasható, csak annál a sornál „—” áll az összeg
helyén, és a páciens megkapja a meglévő „⚠ néhány verziója nem
olvasható” jelzést.

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
| **„Új terv indítása"** | Kezdőlap, az `/uj-terv` köztes választón át (lásd „Új terv indítása — a köztes páciens-választó" lentebb) | „Meglévő páciens keresése": a kiválasztott páciens `paciens` blokkja; „Vadonatúj páciens": semmi | **új** terv-mappa — a kiválasztott MEGLÉVŐ vagy egy vadonatúj páciens-mappában, `<ma>_v1` (D26/D29) |

Ebből következik a feliratok kötelező rendszere: **minden új tervláncot
indító akció felirata tartalmazza az „új terv" kifejezést („Új terv",
„Másolás új tervbe", „Új terv indítása", „Vadonatúj páciens"), és egyedül
a meglévő láncot folytató akció feliratában szerepel a „verzió" szó („Új
verzió").** Egy „Megnyitás…" típusú, a mechanizmust (és nem az eredményt)
megnevező felirat elrejtené azt az egyetlen különbséget, amit a dokinak
kattintás előtt látnia kell — lásd `docs/07-felulet-rendszer.md` („a
gombfelirat azt mondja, mi történik"). Ugyanezt mondja ki egy rövid,
szürke magyarázó sor a lista tetején, a kereső alatt.

**A verziósoron nincs látható akciógomb** — mind a három verzió-szintű
művelet a sor végi `⋯` menüben van, ebben a sorrendben: `Letöltés`,
elválasztó, `Új verzió`, `Másolás új tervbe`. Elöl a csak-olvasó művelet
áll, utána a terv-létrehozók gyakoriság szerint. Egymás mellett három
hosszú feliratú gomb zsúfolt és összetéveszthető volt; a menüben egymás
ALATT állnak, ezért rövid feliratot is elbírnak.

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
(docs/07: soha nem szövegszín).

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

- **`planUjPaciensselTervhez` — csak a páciensadat.** Két belépési pontja
  van, ugyanazzal az eredménnyel:
  - **„Új terv"** — a Korábbi tervek listán, a páciensnév mellett balra,
    páciensszinten (nem egy konkrét verzióhoz kötve). A doki által látott
    LEGUTÓBB MÓDOSÍTOTT terv-lánc legfrissebb verziójának `paciens`
    adatát viszi tovább (`latestVersionAcrossPlans()`,
    `app/src/domain/planFolders.ts`).
  - **„Meglévő páciens keresése…"** — a Kezdőlap „Új terv indítása"
    gombja utáni `/uj-terv` köztes választón (lásd lentebb), a kiválasztott
    páciens ugyanígy meghatározott legfrissebb verziójának `paciens`
    adatával.

  Mindkét esetben minden más mező (`nyelv`, `penznem`, `orvos`, `fazisok`,
  `elolegSzazalek`, `kedvezmenyOsszeg`) a mai `createBlankPlan()` friss
  alapértéke — pontosan úgy, mintha a doki egy „Vadonatúj páciens" tervet
  indítana, csak a páciens mezők (és a `paciensId`) már ki vannak töltve.
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
egy másikban. A „Vadonatúj páciens" ág (lásd lentebb) ettől eltérően:
üres `paciensId`-vel indul, tehát ott új páciens-mappa nyílik.

### „Új terv indítása" — a köztes páciens-választó (D29)

A Kezdőlap „Új terv indítása" gombja nem egyenesen a Páciens adatlapra
navigál, hanem egy köztes kereső/választó lépésre (`/uj-terv`,
`app/src/pages/NewPlanPage.tsx`) — a teljesen friss, Home-ról induló útnál
a doki még nem gépelt be semmit, tehát itt (és csak itt) van
kétértelműség, hogy melyik páciensről van szó:

- **„Meglévő páciens keresése…"** — névre kereső mező a páciens-index
  (`storage.listPatients()`) alapján, ékezetfüggetlenül (`norm()`).
  Kiválasztás után a `planUjPaciensselTervhez` úton (lásd fent) előtöltve
  nyílik a Páciens adatlap.
- **„Vadonatúj páciens"** — a Páciens adatlap üresen nyílik (a mai
  `resetPlanDraft()` úton), pontosan úgy, mint korábban a Kezdőlap
  gombja közvetlenül.

A piszkozat-felülírás-őr innentől ezen a köztes lépésen fut le (mindkét
ágon), NEM a Kezdőlap gombján — a Kezdőlap gombja feltétel nélkül
navigál ide, mert a piszkozat itt még nem veszik el.

A Korábbi tervek saját „Új terv"/„Másolás új tervbe" gombjai (lásd fent)
**nem** ide navigálnak — azoknál a célpáciens már adott a forrás tervből,
nincs kétértelműség.

---

## 6. Árlista admin

Megvalósítás: `app/src/pages/PriceListAdminPage.tsx`.

### Tábla

Kategóriánként csoportosítva, oszlopok: gyakori jelölő (csillag),
megnevezés, HUF ár, EUR ár, aktív jelölő (szem ikon).

**Egy tábla, két ár oszlop** — nem külön magyar és német nézet. Így egy
pillantás megmutatja, hol hiányzik az EUR ár.

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

- Gyökérmappa kijelölése / váltása
- Rendelő adatai (a nyomtatvány fejlécéhez és láblécéhez)
- Orvosok listája
- Logó fájl
- Ajánlat érvényessége napokban (alapérték 90)
- Sablonszövegek szerkesztése — a nyilatkozat, a fizetési feltételek és
  a garancia, saját nyelvváltóval (Magyar/Deutsch, ha a német engedélyezve van).
  **Mentéskor új verziófájl keletkezik** (`nyilatkozat-hu-v2.md`), a régi
  marad, mert a korábbi tervek arra hivatkoznak — a mentés a
  véglegesítéskor épp aktuális (legfrissebb) verziót pinneli a tervre. A
  nyilatkozat szövegében a `{{orvos}}` helyőrző a kezelőorvos nevére
  cserélődik a nyomtatványon. A szerkesztőmezők tartalma elnavigálásig sem
  vész el: egy `dp:sablon-piszkozat` localStorage-kulcs base-enként
  cache-eli, néma visszaállítással, és sikeres mentéskor base-enként
  törlődik. **Ez tudatosan nem a `DraftStorage` bővítése** — az
  kizárólag `Plan`-ra típusozott, egyetlen felelősséggel; a `dp:` prefix
  miatt a „Minden adat törlése"/„Demó adat visszaállítása" ezt is elsöpri,
  külön kód nélkül. A „Szöveg mentése" gomb `useRef`-alapú in-flight
  zárat visel, mert a `disabled` prop önmagában megkerülhető egy render
  előtti második kattintással.
- **Német nyelvű ajánlat engedélyezése** (`nemetEngedelyezve`) — checkbox.
  Bekapcsolva megjelenik az **alapértelmezett nyelv** kapcsolója (ez lesz
  az új tervek nyelve), alatta a **német tartalom készültsége**:
  hány aktív tételnek van már német neve, hány tételnek van EUR ára, és a
  `nyilatkozat-de-v1.md`/`fizetesi-feltetelek-de-v1.md` státusza
  (placeholder, amíg a jogi fordítás el nem készül) — link az Árlistára,
  ahol a „Nincs EUR ár" szűrő a munkalista.

---

## 8. Filerendszer

**Kizárólag a mockup-fázisra való, demó-only nézet** — a végleges asztali
alkalmazásban a doki a valódi Fájlkezelőt használná erre, ez a képernyő
nem feltétlenül él tovább a `FileSystemStorage`-váltás (2. fázis) után.
Célja, hogy a doki és a fejlesztő közösen lássa, mit írna az app a
gyökérmappába — a `docs/02-domain-modell.md` "Mappastruktúra" élő,
kattintható vetülete a mockup `localStorage`-adatából.

- **Read-only fa**: mappa/fájl diszklózúra, a gyökér és az első szint
  (`sablonok/`, `paciensek/`, a két root JSON) alapból nyitva, mélyebb
  szintek (páciens-/terv-/verziómappák) csukva. Semmilyen törlés/
  átnevezés/írás nincs ezen a képernyőn — a meglévő útvonalak (Korábbi
  tervek, Árlista admin, Beállítások) változatlanok.
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
