# 3. Funkcionális specifikáció

## Képernyők

1. Indítás / nyelvválasztás
2. Páciens adatlap
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

Nyelvválasztás csak akkor jelenik meg, ha
`beallitasok.nemetEngedelyezve === true`. Az MVP-ben nem.

A nyelv határozza meg a pénznemet, a tételkatalógust és a
nyilatkozat-sablont. **Terv közben nem váltható** — új tervet kell nyitni.

---

## 2. Páciens adatlap

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
- Sablonszövegek szerkesztése — a nyilatkozat és a fizetési feltételek.
  **Mentéskor új verziófájl keletkezik** (`nyilatkozat-hu-v2.md`), a régi
  marad, mert a korábbi tervek arra hivatkoznak.
