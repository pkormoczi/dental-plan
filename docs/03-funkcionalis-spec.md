# 3. Funkcionális specifikáció

## Képernyők

1. Indítás
2. Páciens adatlap — itt dől el a terv nyelve és pénzneme (D21)
3. **Terv szerkesztő** — a legfontosabb
4. Előnézet és véglegesítés
5. Korábbi tervek
6. Árlista admin
7. Beállítások

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
  nyilatkozat-sablon.
- **Pénznem** (`HUF` / `EUR`) — az ajánlható tételkör (csak azok a
  tételek, amiknek van áruk ebben a pénznemben) és a pénzformátum.

A német páciens a legvalószínűbb ok, amiért ez a kettő szétválik: sokan
Magyarországon, forintban fizetnek. Alapértéke ezért mindig `HUF`, még
német nyelvű ajánlatnál is.

Mindkettő **az első mentés után fagy** (D4) — a kártya ilyenkor statikus
szöveget mutat, chipek nélkül; új tervet kell nyitni a váltáshoz.

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

Ez dönti el, hogy az app gyorsabb-e az Excelnél. Prototípus:
`ui/PlanEditor.jsx`.

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
- Billentyűzet: `↑ ↓` navigál, `Enter` hozzáad, `Esc` bezár.
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
| Beavatkozás | **Szerkeszthető** szövegmező, alapból a felvételkor rögzített (árlistai vagy egyedi) névvel kitöltve — a doki pontosíthatja, elgépelt/rövidített árlistai nevet javíthat. Üresen a sor véglegesítéskor kemény blokk (lásd „Kitöltetlen sor" lent) |
| Fog | Szabad szöveg, felsorolás. Nem kötelező. A beírt *számokat* validáljuk (lásd lent), a folyószöveges jegyzet (pl. „jobb felső") változatlanul megengedett |
| Db | Kézi, alapérték 1, minimum 1 |
| Listaár | Csak megjelenítés, halványan. Sávos tételnél `35 000–55 000` formában, kiemelve. Egyedi sornál `—` (nincs árlistai referenciaár) |
| Tényleges ár | Szerkeszthető. Alapértéke a listaár (sávosnál a `min`, egyedi sornál `0`). EUR pénznemű tervnél a mező **euróban** fogad be és jelenít meg szöveget (pl. `35,50`), a tárolás változatlanul centben történik — ugyanaz a `NumberField` `unit` mechanizmus, ami az árlista adminban már véd az euró/cent tévesztéstől |
| Összeg | `tenylegesEgysegar * mennyiseg` |

A „Listaár"/„Tényleges"/„Összeg" oszlopfejléc a terv pénznemét is jelzi
(`(Ft)` / `(€)`), hogy egyetlen oszlop se tűnjön „biztonságosnak" a
pénznem-összetévesztéssel szemben.

Ha `tenylegesEgysegar < listaEgysegar`, a soron megjelenik egy `−X%`
jelölés. **Ez csak a szerkesztőben látszik, a nyomtatványon nem** (D9).

Sávos tételnél a listaár helyén a sáv látszik, és a tényleges ár mező ki
van emelve — jelzi, hogy itt dönteni kell.

### Egyedi sor

Ha a tételkeresőben nincs (megfelelő) találat, a gépelt szöveg egyedi
sorként vehető fel — lásd fent, „Tételkereső". Az egyedi sor:

- **Nincs árlistai hivatkozása** (`tetelId` üres) — a soron egy semleges
  „egyedi" jelvény jelzi, ugyanott, ahol a „sávos" felirat állna.
- **Egy ármező van rajta**, nincs külön „listaár" — a Tényleges ár
  szerkesztése a listaárat is vele együtt írja, ezért egyedi soron
  **sosem** jelenik meg kedvezmény-jelölés.
- **Mindig fix áron nyomtat**, csillag/lábjegyzet nélkül — a soronkénti
  „becsült ár" kapcsoló (4. backlog-tétel) egyelőre nem érhető el rajta.
- Német nyelvű ajánlaton egy **kitöltött** egyedi sor is bekerül a
  „hiányzó német tételnevek" figyelmeztetésbe (a szerkesztőben `HU`
  jelvénnyel, véglegesítéskor a megerősítő listában) — szabad szöveghez
  nincs német változat.
- Nem kötelező kitölteni azonnal: a fogtérkép-kattintással létrehozott,
  még névtelen sor is ugyanezt a mechanizmust használja (lásd fent,
  „Fogtérkép"), csak addig kereső módban marad, amíg a doki tételt nem
  választ vagy egyedi nevet nem ad neki.

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

- Tetszőleges számú fázis, átnevezhető, sorrendezhető, törölhető.
- Fázisonként egy szabad szöveges **megjegyzés** sor, ami a nyomtatványon
  is megjelenik. Ide megy az időzítés: *„az implantáció beépülési ideje
  után, kb. 3 hónappal"*.
- Fázisonkénti összeg, alul mindösszesen.

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
hozzá; a Kezdőlap „Új terv indítása” és a „Korábbi tervek” → „Megnyitás
szerkesztésre” gombja megerősítést kér, mielőtt felülírná. Részletek:
`docs/backlog-1-piszkozat-terv.md`.

---

## 4. Előnézet és véglegesítés

- A `PrintPreview` komponens rendereli a három oldalt.
- Kapcsoló: **„csak ajánlat"** — ilyenkor a 3. oldal (nyilatkozat és
  aláírás) kimarad. Ez a hazavitt példány.
- Véglegesítéskor:
  1. `tervId` generálás (új terv) vagy verzió növelés (meglévő)
  2. PDF generálás, a `terv.json` beágyazásával
  3. `pdf` + `json` kiírás az új verziómappába
  4. A piszkozat törlése az IndexedDB-ből

Meglévő terv szerkesztése **soha nem írja felül** a korábbi verziómappát
(D4).

**Német terv, hiányzó tételnevekkel:** ha a tervben olyan sor van, amihez
nem tartozik német tétel név (lásd D21), a véglegesítés a hiányzó neveket
felsorolva megerősítést kér — a páciens ezt a dokumentumot írja alá, ezért
ez a figyelmeztetés soha nem néma.

**Kitöltetlen sor (kemény blokk):** ha a fogtérképről kattintással felvett
sor tétel nélkül maradt, a véglegesítés **nem** kérhető meg és nem
folytatható — ez nem figyelmeztetés, hanem blokk, hogy névtelen, 0 Ft-os
sor sose kerülhessen az aláírandó dokumentumra. A hibaüzenet megnevezi a
fázist és a fogszámot; „Vissza a szerkesztőbe" gomb visz a hiányzó sorhoz.
Az Előnézet maga nem blokkolódik, csak a véglegesítés.

---

## 5. Korábbi tervek

A `paciensek/` fa beolvasása, kereshető listával. Páciensnév szerint
csoportosítva, alatta a verziók dátummal.

Ez a legerősebb indoka a fájlrendszer-hozzáférésnek — nem a mentés, hanem
a betöltés. Egy visszatérő pácienshez ne kelljen újragépelni 12 tételt.

Betöltés a `terv.json`-ból. Ha csak PDF van (kézzel átmozgatott fájl),
a beágyazott JSON-ból is menjen.

---

## 6. Árlista admin

Prototípus: `ui/PriceListAdmin.jsx`.

### Tábla

Kategóriánként csoportosítva, oszlopok: gyakori jelölő (csillag),
megnevezés, HUF ár, EUR ár, aktív jelölő (szem ikon).

**Egy tábla, két ár oszlop** — nem külön magyar és német nézet. Így egy
pillantás megmutatja, hol hiányzik az EUR ár.

### Szűrők

`Mind` · `Nincs EUR ár` · `Sávos ár` · `Inaktív` · `Gyakori`

A `Nincs EUR ár` szűrő **maga a német bevezetés munkalistája**.

### Sor kinyitása

Kattintásra a sor lenyílik, és ott van minden mező:

- magyar név, német név
- kategória (legördülő — **ezzel mozgatható át a tétel**, ez a takarítás
  fő eszköze)
- ártípus váltó: `FIX` / `SAVOS`
- HUF ár (vagy min/max), EUR ár (vagy min/max)
- aktív, gyakori

### Törlés helyett inaktiválás

A szem ikon inaktivál. Törölni nem lehet, és az `id`-t **soha nem
használjuk újra** (D17) — ezen múlik, hogy a régi tervek évek múlva is
értelmezhetők maradnak.

Kategória hozzáadása, átnevezése, sorrendezése ugyanitt.

---

## 7. Beállítások

- Gyökérmappa kijelölése / váltása
- Rendelő adatai (a nyomtatvány fejlécéhez és láblécéhez)
- Orvosok listája
- Logó fájl
- Ajánlat érvényessége napokban (alapérték 90)
- Sablonszövegek szerkesztése — a nyilatkozat és a fizetési feltételek,
  saját nyelvváltóval (Magyar/Deutsch, ha a német engedélyezve van).
  **Mentéskor új verziófájl keletkezik** (`nyilatkozat-hu-v2.md`), a régi
  marad, mert a korábbi tervek arra hivatkoznak — a mentés a
  véglegesítéskor épp aktuális (legfrissebb) verziót pinneli a tervre. A
  nyilatkozat szövegében a `{{orvos}}` helyőrző a kezelőorvos nevére
  cserélődik a nyomtatványon.
- **Német nyelvű ajánlat engedélyezése** (`nemetEngedelyezve`) — checkbox.
  Bekapcsolva megjelenik az **alapértelmezett nyelv** kapcsolója (ez lesz
  az új tervek nyelve), alatta a **német tartalom készültsége**:
  hány aktív tételnek van már német neve, hány tételnek van EUR ára, és a
  `nyilatkozat-de-v1.md`/`fizetesi-feltetelek-de-v1.md` státusza
  (placeholder, amíg a jogi fordítás el nem készül) — link az Árlistára,
  ahol a „Nincs EUR ár" szűrő a munkalista.
