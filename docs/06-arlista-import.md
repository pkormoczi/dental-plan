# 6. Árlista import

A kész seed: **`data/arlista.seed.json`** — 118 tétel, 12 kategória, az
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

| id | Kategória | Tétel |
|---|---|---|
| k01 | Besorolatlan | 3 |
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
| k12 | Egyéb kezelések | 14 |
| | **Összesen** | **118** |

## Két strukturális probléma az eredeti táblában

### A `Besorolatlan` kategória (k01)

A tábla első három sora minden kategóriafejléc **előtt** van:

- Konzultáció/fél óránként — 10 000
- Panoráma-, TeleRtg, Arcüregfelvétel — 9 000
- CBCT — 24 000

Nem találtam ki nekik kategóriát. A `Besorolatlan` néven kerültek be, hogy
az adminban azonnal szembeötlők legyenek. Valószínű célkategória:
*„Diagnosztika"* vagy *„Konzultáció és röntgen"*.

### Az „Egyéb kezelések" 14 tétele félrevezető

Valójában **3** tartozik oda (fogékszer, horkolásgátló, ínyformázás
hyaluronsavval). A maradék 11 azért került alá, mert az eredeti tábla
145. sora után elfogytak a kategóriafejlécek:

**Francia nyelvű maradványok** (valószínűleg egy korábbi idegennyelvű
próbálkozásból):
`Dévitalisation` · `Pivot` · `Couronne provisoire` ·
`Opération de gencive` · `Couronne zircon`

**Fogszabályozási tételek, saját kategória nélkül:**
`Hyrax készülék` · `Önligírozó multiband készülék felső` ·
`Önligírozó multiband készülék alsó` ·
`Rögzitett fogszabályzó eltávolítás polirozás` ·
`Retencios készülék állcsontonként` ·
`Rögzitett készülék aktíválása alkalmanként`

Az adminban a sor kinyitása → kategória legördülő mozgatja át őket.
Ez a takarítás fő eszköze.

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

## Ismert szennyeződés, amit szándékosan nem javítottam

| Tétel | Probléma |
|---|---|
| `Esztétikus tömés 2felszin` | Hiányzó szóköz, hiányzó ékezet |
| `Fogékszer (kristály, arany, fehérarany` | Bezáratlan zárójel |
| `Rögzitett fogszabályzó eltávolítás polirozás` | Rövid `i` és `o` |
| `Lokátor felépítmény` | Kétszer szerepel (k10 és k11 alatt) — lehet szándékos, lehet duplikátum |
| `Implantátum BLX`, `Neodent implantatum` | Vegyes ékezethasználat ugyanazon fogalomra |

Ezek mind egy-egy admin-szerkesztés. A doki dolga eldönteni, mi a hiba és
mi a szándék.

## Amit még nem tartalmaz a seed

- **`de` nevek**: mind `null`. 118 fordítás, ez a német funkció valódi
  hosszú pole-ja. Ez **nem blokkolja** a német mód használatát (D21): a
  hiányzó nevű tétel a keresőben és a felvett soron is magyar névvel,
  jól látható `HU` jelöléssel jelenik meg, a véglegesítés pedig
  megerősítést kér, mielőtt egy részben magyar nyelvű dokumentum a
  páciens elé kerülne.
- **`EUR` árak**: mind `null`. Független érték, nincs árfolyam-átváltás
  (D11). Emiatt egy EUR pénznemű terv keresője üres — a Páciens adatlap
  ezt előre jelzi, mielőtt a doki a szerkesztőbe lépne.
- **`gyakori` jelölés**: mind `false`. A dokinak kell 8–12 tételt
  megjelölnie, ezek lesznek a szerkesztő gyorsgombjai.
- **`forrasSor`**: az eredeti Excel sorszáma, hogy az első átnézésnél
  vissza lehessen keresni. Az első admin-mentés után elhagyható.
