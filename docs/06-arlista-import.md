# 6. Árlista import

A kész seed: **`data/arlista.seed.json`** — 118 tétel, 13 kategória, az
eredeti `MINTA_Kezelesi_Terv.xls` `Arlista` lapjából generálva.

Ezt nem kell újra előállítani. Az app első indításakor ez másolódik a
gyökérmappába `arlista.json` néven, ha még nincs ott.

## Az import szabálya

Minden sor bemegy, aminek van neve **és** van ára. A takarítás az
adminban történik, nem az importban (D16).

- Csak nevet tartalmazó sor (nincs ár) → **kategóriafejléc**
- Se név, se ár → kihagyva (üres elválasztó sorok)
- Név van, ár `0` → kihagyva (placeholder sorok: B44–46, B74–75, B143–144)
- Név + numerikus ár → `FIX` tétel
- Név + `"35-55000"` alakú szöveg → `SAVOS` tétel

A kategórianevek nagybetűsről mondatkezdőre lettek alakítva
(`TÖMÉSEK` → `Tömések`). A tételnevek **változatlanul** kerültek be, csak
a felesleges szóközök levágva — szándékosan nem javítottam semmit.

## Megoszlás

A 2026-08-09-i kategória-CRUD + adattisztítás óta — lásd „Két strukturális
probléma" alább arra, mi változott az eredeti importhoz képest:

| id | Kategória | Tétel |
|---|---|---|
| k01 | Diagnosztika és konzultáció | 3 |
| k02 | Tömések | 10 |
| k03 | Gyökérkezelés | 3 |
| k04 | Fogkőeltávolítás | 2 |
| k05 | Fogfehérítés | 2 |
| k06 | Gyermekfogászat | 5 |
| k07 | All-on-X csomagok | 5 |
| k08 | Szájsebészet | 33 |
| k09 | Parodontológia | 7 |
| k10 | Korona és hídpótlások | 21 |
| k11 | Kivehető fogsorok | 13 |
| k12 | Egyéb kezelések | 8 |
| k13 | Fogszabályozás | 6 |
| | **Összesen** | **118** |

## Két strukturális probléma az eredeti táblában — MEGOLDVA (2026-08-09)

Az alábbi két probléma az eredeti importban (2026-07-01) még nyitva állt;
a 2026-08-09-i kategória-CRUD + adattisztítás óta megoldva. Az eredeti
leírás lent marad — a kategória-karbantartó panel
elkészülte előtt ez volt az egyetlen mód a besorolásra (a sor kinyitása →
kategória legördülő), és a jövőbeli hasonló import-eseteknek is mintát ad.

### A `Besorolatlan` kategória (k01) — átnevezve

A tábla első három sora minden kategóriafejléc **előtt** volt:

- Konzultáció/fél óránként — 10 000
- Panoráma-, TeleRtg, Arcüregfelvétel — 9 000
- CBCT — 24 000

Nem találtunk ki nekik kategóriát, a `Besorolatlan` néven kerültek be,
hogy az adminban azonnal szembeötlők legyenek. A kategória azóta át van
nevezve **„Diagnosztika és konzultáció"**-ra (`k01`, ugyanaz az id — a
tételek besorolása nem változott, csak a kategórianév).

### Az „Egyéb kezelések" (k12) 14 tétele — szétválasztva

Eredetileg valójában **3** tartozott oda (fogékszer, horkolásgátló,
ínyformázás hyaluronsavval). A maradék 11 azért került alá, mert az
eredeti tábla 145. sora után elfogytak a kategóriafejlécek:

**Francia nyelvű maradványok** (valószínűleg egy korábbi idegennyelvű
próbálkozásból) — **inaktiválva** (`aktiv: false`), mert a magyar párjuk
mindegyiknek létezik az árlistában, de az ár nem egyezik meg, és nem
eldönthető import-szinten, melyik az érvényes (a doki egy kattintással
visszakapcsolhatja, ha mégis szükség van rájuk):
`Dévitalisation` (t108) · `Pivot` (t109) · `Couronne provisoire` (t110) ·
`Opération de gencive` (t111) · `Couronne zircon` (t112)

**Fogszabályozási tételek** — saját `k13 Fogszabályozás` kategóriát
kaptak, a `k12`-ből átmozgatva:
`Hyrax készülék` · `Önligírozó multiband készülék felső` ·
`Önligírozó multiband készülék alsó` ·
`Rögzített fogszabályzó eltávolítás, polírozás` ·
`Retenciós készülék állcsontonként` ·
`Rögzített készülék aktiválása alkalmanként`

Az adminban a Kategóriák panel (docs/03-funkcionalis-spec.md § Kategóriák
panel) adja a kategória létrehozását/átnevezését/törlését; a tétel-táblázat
sorának
kinyitása → kategória legördülő mozgatja át a tételeket köztük — ez
továbbra is a takarítás fő eszköze egy-egy jövőbeli, hasonlóan
félresorolt tételre.

## Sávos árú tételek

Kettő van, mindkettő a `Gyökérkezelés` alatt:

| id | Tétel | min | max |
|---|---|---|---|
| t014 | Fogbél megnyitás + gyógyszeres zárás | 35 000 | 55 000 |
| t016 | Gyökértömés csatornaszámtól függően | 38 000 | 65 000 |

> **Figyelem az eredeti adatra:** az Excelben `"35-55000"` szerepel, tehát
> a sáv alsó határa rövidítve van. Az importer ezt `35000`-re egészíti ki
> (a felső határ nagyságrendjéhez igazítva). Ez helyesnek tűnik, de
> **érdemes a dokival visszaigazoltatni** — ez az egyetlen hely, ahol az
> import értelmezett, nem másolt.

Ezek a tételek kapják a `*` jelölést a nyomtatványon (D15).

## Ismert szennyeződés — státusz 2026-08-09 után

A 2026-08-09-i kategória-CRUD + adattisztítás során ~20 egyértelmű
elgépelés lett kijavítva közvetlenül a seedben (hiányzó szóközök/ékezetek,
bezáratlan zárójel, kisbetűs tételkezdés, vegyes `implantatum`/`implantátum`
írásmód). A
`Lokátor felépítmény` duplikátum (`t083`/`t093`, azonos 130 000 Ft)
**inaktiválva** lett (`t093`, `aktiv: false`) — nem törölve (D17), a doki
egy kattintással visszakapcsolhatja, ha mégis két külön tétel volt a
szándék.

Amit **szándékosan nem** javítottunk — ár- vagy kategorizálási döntés,
ami a dokira tartozik, az adminban egy-egy szerkesztés:

| Tétel(ek) | Probléma |
|---|---|
| `t072`/`t073` „Fémkerámia implantátumra” | Azonos 95 000 Ft, csak a zárójeles kiegészítésben térnek el — az egyik valószínűleg felesleges |
| `t078` „Sín” | A `k10 Korona és hídpótlások` alatt, valószínűleg `k12`-be való |
| `t064`/`t066` „Zárt/nyitott küret foganként” | Mindkettő 10 000 Ft, miközben a kvadránsos változatuk eltér (60 000 vs 85 000 Ft) — érdemes visszaigazolni |
| `t054`/`t055`/`t056` (BLX/Straumann implantátumok) | Ékezethasználat már egységes, de a névforma (szórend) a három sor közt eltér |
| `gyakori` jelölés | Mind `false` — a dokinak kell 8–12 tételt megjelölnie |
| A két `SAVOS` tétel alsó határa | Az import értelmezte, nem másolta (lásd fent) |
| `k04`/`k05`/`k06`/`k12` fogtérkép-színe | Mind az alap szürke (`#adb5bd`) — a kategória-karbantartó panelben egy kattintással átszínezhető |

## Amit a seed 2026-08-06 óta tartalmaz, és mit még nem

- **`de` nevek**: mind ki van töltve. 118 tétel gépi/AI-fordítása, szakmai
  pontosságra törekedve, de **orvos által nem lektorálva** — a hibák
  elfogadhatók, az adminban javítandók. Ez már a D21 előtt is
  **nem blokkolta** a német mód használatát: ha egy tételnek mégsem
  lenne `de` neve, a keresőben és a felvett soron is magyar névvel,
  jól látható `HU` jelöléssel jelenne meg, a véglegesítés pedig
  megerősítést kér, mielőtt egy részben magyar nyelvű dokumentum a
  páciens elé kerülne.
- **`EUR` árak**: mind ki van töltve — a HUF árból számolt becslés, a
  fordítás napján (2026-08-06) érvényes középárfolyamon (~363,3 HUF/EUR),
  egész euróra kerekítve. **Nem árfolyam-automatizmus** (D11 továbbra is
  érvényes: a `terv.json`-ban mentett `tenylegesEgysegar` egy pillanatkép,
  soha nem számolódik újra) — ez egy egyszeri, kézzel indított
  kiindulóérték-feltöltés, a doki az adminban soronként felülbírálhatja.
- **`gyakori` jelölés**: mind `false`. A dokinak kell 8–12 tételt
  megjelölnie, ezek lesznek a szerkesztő gyorsgombjai.
- **`forrasSor`**: az eredeti Excel sorszáma, hogy az első átnézésnél
  vissza lehessen keresni. Az első admin-mentés után elhagyható.
- **`Kategoria.szin`**: mind a 13 kategórián ki van töltve (2026-08-09) —
  a korábbi, kódba huzalozott kategória→szín "vödör"-tábla
  (`design/treatmentVisuals.ts`) helyett a
  fogtérkép színe innen olvas. Additív mező, nincs `schemaVersion`-emelés
  (D18 ettől függetlenül érvényben marad).
- **`Tetel.leiras`/`Tetel.csomag`**: egyik 118 tételen sincs kitöltve
  (docs/02-domain-modell.md § Tétel-leírás) — a dokinak kell megjelölnie,
  mely tételek csomag jellegűek, és megírnia a leírásukat.
