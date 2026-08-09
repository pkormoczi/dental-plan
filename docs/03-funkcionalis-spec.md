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

### Gyorsgombok

Az `arlista.json`-ban `gyakori: true` jelölésű tételek chipként
megjelennek a kereső alatt. Egy kattintás = hozzáadás.

### Sor mezői

| Mező | Viselkedés |
|---|---|
| Beavatkozás | Csak megjelenítés, snapshot a hozzáadás pillanatából |
| Fog | Szabad szöveg, felsorolás. Nem kötelező |
| Db | Kézi, alapérték 1, minimum 1 |
| Listaár | Csak megjelenítés, halványan. Sávos tételnél `35 000–55 000` formában, kiemelve |
| Tényleges ár | Szerkeszthető. Alapértéke a listaár (sávosnál a `min`) |
| Összeg | `tenylegesEgysegar * mennyiseg` |

Ha `tenylegesEgysegar < listaEgysegar`, a soron megjelenik egy `−X%`
jelölés. **Ez csak a szerkesztőben látszik, a nyomtatványon nem** (D9).

Sávos tételnél a listaár helyén a sáv látszik, és a tényleges ár mező ki
van emelve — jelzi, hogy itt dönteni kell.

### Figyelmeztetés (nem blokkoló)

Ha a `Fog` mező N érvényes FDI számot tartalmaz és `mennyiseg !== N`,
halvány jelzés a sor alatt. Ennyi — nincs automatikus javítás (D14).

### Fogtérkép (kattintható)

A fogtérkép a szerkesztő alján **mindig látszik**, üresen is — nemcsak
áttekintés, beviteli eszköz is. Kezelés-kategóriánként színezve (lásd
`app/src/design/treatmentVisuals.ts`).

- **Kattintás egy már érintett fogra** a hozzá tartozó sorra ugrik
  (fókusz + görgetés a „Fog" mezőre). Ha több sor is érinti (pl.
  gyökérkezelés és korona ugyanazon a fogon), az ismételt kattintás a
  következő érintett sorra lép, körbe.
- **Kattintás egy kezeletlen fogra** új, tétel nélküli sort vesz fel a
  kiválasztott fázisban, a fogszámmal már kitöltve, és a sor
  „Beavatkozás" cellájában megjelenő keresőre fókuszál — ugyanazzal a
  gépel → nyíl → Enter ciklussal, mint a fázis alatti keresőnél. A
  választás a sort **a helyén tölti ki**, nem fűz újat.
- **Fázisválasztó** csak akkor jelenik meg a fogtérkép mellett, ha egynél
  több fázis van — eldönti, melyik fázisba kerüljön az új sor.
- **Soronkénti fogválasztó**: a „Fog" mező melletti ikongomb egy felugró
  fogtérképet nyit, ahol kattintással jelölhetők ki a sor fogai (a mező
  szabadszöveges marad — ha nem FDI-formátumú tartalmat talál, pl. „jobb
  felső", megerősítést kér felülírás előtt, nem ír felül némán).
- **Billentyűzet**: a fogtérkép egyetlen Tab-megállóként érhető el,
  nyilakkal lépked a fogak közt (`←`/`→` az állcsonton belül, `↑`/`↓`
  állcsontot vált ugyanabban a pozícióban), `Enter`/`Szóköz` aktivál.
- A darabszám (`Db`) továbbra is **kézi** — a fogtérkép nem állítja be
  automatikusan (D14 nem nyílik meg).

### Fázisok

- Tetszőleges számú fázis, átnevezhető, sorrendezhető, törölhető.
- Fázisonként egy szabad szöveges **megjegyzés** sor, ami a nyomtatványon
  is megjelenik. Ide megy az időzítés: *„az implantáció beépülési ideje
  után, kb. 3 hónappal"*.
- Fázisonkénti összeg, alul mindösszesen.

### Autosave

A piszkozat IndexedDB-be mentődik folyamatosan. **Ez nem system of
record** — csak azért van, hogy egy félbeszakadt terv ne vesszen el.
A fájlrendszerre csak véglegesítéskor írunk.

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
