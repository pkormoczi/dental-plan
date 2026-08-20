# 2. Domain modell

## Mappastruktúra

A doki egyszer kijelöl egy gyökérmappát. Az app ezen belül mindent maga
kezel. Ez a mappa **a teljes rendszerállapot** — nincs adatbázis,
nincs szerver.

```
<gyökérmappa>/
  beallitasok.json
  arlista.json
  sablonok/
    nyilatkozat-hu-v1.md
    fizetesi-feltetelek-hu-v1.md
    garancia-hu-v1.md                ; placeholder -- a doki adja meg a tényleges szöveget
    nyilatkozat-de-v1.md            ; AI-fordítás, jogi lektorálás nélkül -- lásd README "Nyitott kérdések" #1
    fizetesi-feltetelek-de-v1.md    ; AI-fordítás, jogi lektorálás nélkül -- lásd README "Nyitott kérdések" #1
    garancia-de-v1.md                ; placeholder -- nincs mit fordítani, amíg a HU is az
  paciensek/
    Kovacs-Janos_k9m2r4/
      paciens.json
      paciens-adatok.json               ; csak az első törzsadat-mentés után létezik -- lásd "Páciens- és terv-mappa" lentebb
      Fogpotlas_a3f9c1/
        terv-cimke.json               ; csak kézi átírás után létezik -- lásd "Páciens- és terv-mappa" lentebb
        2026-08-05_v1/
          kezelesi-terv.pdf
          terv.json
        2026-08-19_v2/
          kezelesi-terv.pdf
          terv.json
      Sebeszet_c1b5e7/
        2026-09-01_v1/
          kezelesi-terv.pdf
          terv.json
```

### Mappanév szabályok

- Páciensmappa: `Vezeteknev-Keresztnev_<6 karakteres id>`
- Terv-mappa (a páciensmappán belül, D29): `<szlugosított terv-cím>_<6
  karakteres id>` — a cím a mappa LÉTREHOZÁSAKORI (a doki által átírt vagy
  automatikusan javasolt) terv-címkéből képződik, ugyanazokkal a
  szabályokkal, mint a páciensnév. A mappanév ezután **fix**, a
  megjelenített címke ettől függetlenül szabadon változik — lásd "Páciens-
  és terv-mappa" lentebb.
- **Az ékezeteket meg kell tartani** — a doki a Fájlkezelőben fog rájuk
  keresni. Ne transzliterálj.
- Tiltott karakterek cseréje: `/ \ : * ? " < > |` és a záró pont/szóköz.
- A `_<id>` azért kell, mert két Kovács János is lehet, és a név
  változhat. A páciens felismerése mostantól explicit `paciensId`-vel
  történik, nem névismétléssel (D29) — egy terv másolása (D26,
  `docs/03-funkcionalis-spec.md` § Terv másolása új tervként) a MEGLÉVŐ
  páciensmappában nyit egy újabb terv-mappát.
- Verziómappa: `<ISO dátum>_v<n>`. **Soha nem írunk felül** meglévőt.
- Az útvonal a Drive mount alatt hosszú lesz — tartsd a neveket rövidre
  (Windows 260 karakter).

### Páciens- és terv-mappa (`paciens.json`, `terv-cimke.json`, D29)

Két új, kis fájl a fenti fába — mindkettő kizárólag azonosító-/kereső-index
és szervezési metaadat, **soha nem system of record**: a terv tartalmi
igazsága változatlanul a `terv.json` (D7).

```jsonc
// paciensek/Kovacs-Janos_k9m2r4/paciens.json
{
  "schemaVersion": 1,
  "paciensId": "k9m2r4",
  "nev": "Kovács János",   // csak kereséshez/előtöltéshez -- SOHA nem írja felül egy már mentett terv.json paciens blokkját
  "utolsoAktivitas": { "tipus": "terv-veglegesitve", "idopont": "2026-08-09T10:15:00.000Z" }  // opcionális, D39
}
```

```jsonc
// paciensek/Kovacs-Janos_k9m2r4/Fogpotlas_a3f9c1/terv-cimke.json
{
  "schemaVersion": 1,
  "tervCim": "Fogpótlás"
}
```

- A `terv-cimke.json` a terv-mappa gyökerén, a verziómappákon **kívül**
  él — D4 (verziómappát soha nem írunk felül) rá nem vonatkozik: bármikor
  szabadon átírható, egy már véglegesített tervnél is, új verzió nyitása
  nélkül.
- KÉT belépési pont írja: a „Terv-láncok és verziók” (5. képernyő)
  ceruza-ikonja, és a „Terv adatai” lap (2. képernyő) Terv címe mezője
  (D61, `docs/03-funkcionalis-spec.md` § 2. „Terv címe”) — utóbbi csak MÁR
  MENTETT lánchoz ír azonnal, egy vadonatúj lánchoz a `storage.savePlan()`
  UTÁN, a véglegesítéskor. A mappanév-képzés (lásd lent) egyik íráson sem
  változik: mindig az élő javaslatból képződik, sosem a kézi címkéből.
- Ha a fájl nem létezik (a doki még nem írta át kézzel), a Korábbi tervek
  fája élő auto-javaslatot mutat helyette: a terv legnagyobb ÖSSZEGŰ
  kategóriájának neve, holtversenynél a kisebb `sorrend`-ű kategória
  (`javasoltTervCim()`, `app/src/domain/tervCim.ts` — ugyanaz a
  precedencia-elv, mint a fogtérkép ütközésfeloldásában, D28). A javaslat
  a terv-lánc LEGFRISSEBB verziójának tartalmából számol, tehát friss tétel
  hozzáadása frissíti; kézi átírás után a mező megragad, üresen mentve
  visszaáll a javaslatra.
- A `paciens.json` `nev`-je minden terv-mentéskor frissül a legutóbb
  mentett `plan.paciens.nev`-re — ez index, nem pillanatkép, ellentétben a
  `terv.json` `paciens` blokkjával (D7) —, **kivéve, ha a pácienshez már
  létezik lezárt `paciens-adatok.json`** (lásd lent, D33): ilyenkor a
  törzsadat neve az igazság, a terv-mentés nem írhatja felül némán.
- Az `utolsoAktivitas` (D39, `docs/03-funkcionalis-spec.md` § 1. Indítás)
  opcionális mező — a Kezdőlap „Legutóbbi páciensek" listájának egyetlen
  adatforrása. Kizárólag három tényleges írási eseményen frissül (páciens
  létrehozása, `paciens-adatok.json` mentése, terv véglegesítése
  `storage.savePlan()`-nal); egy páciens/terv puszta megnyitása sosem ír
  bele. Csak a LEGUTÓBBI esemény marad meg, nem napló. Puszta index-mezőként
  (D29) egy sérült/ismeretlen alakú érték némán kimarad a listából, nem
  hibát dob a betöltéskor (`app/src/domain/paciensAktivitas.ts`
  `ervenyesAktivitas`).
- **Törlés (D50, `docs/03-funkcionalis-spec.md` § 10. Páciens részletei):**
  a törlés egysége a teljes páciensmappa (`paciens.json` +
  `paciens-adatok.json` + minden terv-lánc/verziómappa alatta) —
  KIZÁRÓLAG akkor, ha a mappa alatt sehol nincs `statusz === 'VEGLEGES'`
  verzió, és nincs rá mutató aktív, mentetlen piszkozat
  (`app/src/domain/paciensTorles.ts` `paciensTorlesAkadaly()`). Végleges,
  nincs "kuka"/helyreállítás — a D4 (verziómappa soha felül nem írható)
  adatintegritási korlátjának természetes kiterjesztése: egy aláírt/
  kiadott dokumentum mögül nem törölhető a páciens

### Páciens-szintű törzsadat (`paciens-adatok.json`, D33)

A `paciens.json`-tól és a `terv-cimke.json`-tól eltérően ez a fájl **valódi
system of record** a saját mezőire: a doki itt tartja a páciens JELENLEG
érvényes elérhetőségét/adatait, teljesen függetlenül attól, mit tartalmaz
bármelyik korábbi `terv.json` `paciens` blokkja. A `Paciens`
(`app/src/domain/types.ts`) teljes mezőköre benne van, a `nev`-et is
beleértve:

```jsonc
// paciensek/Kovacs-Janos_k9m2r4/paciens-adatok.json
{
  "schemaVersion": 1,
  "paciensId": "k9m2r4",
  "nev": "Kovács János",
  "szuletesiIdo": "1978-03-14",
  "lakcim": "1113 Budapest, Bartók Béla út 42. 2/5",
  "telefon": "+36 30 123 4567",
  "email": "kovacs.janos@example.hu",
  "taj": "123 456 789",
  "kiskoru": false,
  "torvenyesKepviselo": null
}
```

- **Nincs automatikus szinkron egyik irányban sem** a `terv.json` `paciens`
  blokkjával: egy konkrét terv Terv adatai lapján tett módosítás soha nem
  írja át ezt a fájlt, és fordítva, ennek szerkesztése soha nem nyúl vissza
  egy már mentett `terv.json`-hoz. A `terv.json` `paciens` blokkja
  változatlanul pillanatkép marad (D7); ez a fájl egy PÁRHUZAMOS, önálló
  adatforrás.
- A terv-mappákon (és a verziómappákon) **kívül**, a páciens-mappa
  gyökerén él, mint a `paciens.json`, ezért D4 rá nem vonatkozik. De —
  ellentétben a `terv-cimke.json`-nal — **nincs "üres = törlés vissza az
  élő fallbackre" szemantikája**: a fájl létrejötte után a törzsadat
  lezárt, nincs visszaút.
- Amíg a fájl nem létezik, a Páciensek képernyő élő fallbacket mutat: a
  páciens legutóbb módosított terv-láncának legfrissebb `paciens`
  pillanatképét (`megjelenitettTorzsadat()`, `app/src/domain/paciensAdatok.ts`
  — ugyanaz a minta, mint a `megjelenitettTervCim()` a terv-címkénél). Ha a
  páciensnek egyetlen terve sincs (terv nélkül, a Páciensek képernyőn
  felvéve), egy a `paciens.json` nevéből épült üres rekordra esik vissza.
  Első mentéskor a teljes fájl egyszerre zár: minden mező (nem csak a
  ténylegesen módosított) bekerül a pillanatnyi értékén, onnantól a teljes
  fájl a forrás.
- A Páciensek képernyőn terv nélkül is felvihető páciens (minimálisan a
  `nev` kötelező mezővel) — ilyenkor is mindkét gyökér-fájl (`paciens.json`
  + `paciens-adatok.json`) létrejön egyszerre. A Korábbi tervek lista
  változatlanul csak a legalább 1 terv-lánccal rendelkező pácienseket
  listázza.
- A nyomtatvány (PDF) nem változik: a `paciens-adatok.json` SOHA nem
  forrása a PDF-nek, kizárólag a `terv.json` saját `paciens` blokkja kerül
  nyomtatásra (D7).
- **A két adatforrás összevetése/szinkronja mindig explicit, doki-kezdeményezésű
  (D48).** A Terv adatai lapon (`docs/03-funkcionalis-spec.md` § 2.) a
  "Páciens adatai" szekcióba ágyazva mezőszintű diffet ad a törzsadat és az AKTUÁLIS terv-piszkozat
  `paciens` blokkja között, két külön irányú művelettel (master → draft,
  draft → master) — sosem automatikus, sosem egy közös gomb. A "Terv adatai"
  workflow-lépés ELŐRE elhagyásakor, ha van VALÓDI ütközés (mindkét oldalon
  kitöltött, eltérő érték — egy üres mező pótlása nem az), a rendszer egyszer
  felkínálja a frissítést. Ez a mechanizmus nem érinti az itt leírt
  invariánsokat: a `terv.json` `paciens` blokkja a mentés pillanatában
  továbbra is pillanatkép marad (D7), és a törzsadat lezártsága/„nincs üres
  = törlés” szabálya változatlan.

## `arlista.json`

Kész seed: `data/arlista.seed.json` (118 tétel, 13 kategória).

```jsonc
{
  "schemaVersion": 1,
  "arlistaVerzio": "2026-07-01",   // ez kerül a nyomtatvány láblécére; minden admin-mentéskor a mai napra áll (D30)
  "modositva": "2026-08-05",
  "kategoriak": [
    {
      "id": "k02",
      "nev": { "hu": "Tömések", "de": null },
      "sorrend": 2,
      "szin": "#51cf66"            // fogtérkép-szín (hex), opcionális -- lásd design/treatmentVisuals.ts
    }
  ],
  "tetelek": [
    {
      "id": "t007",                 // stabil, soha nem használjuk újra
      "kategoriaId": "k02",
      "sorrend": 7,
      "aktiv": true,
      "gyakori": false,             // ez adja a szerkesztő gyorsgombjait
      "nev": { "hu": "Fognyaki tömés", "de": null },
      "ar": {
        "HUF": { "tipus": "FIX", "ertek": 25000 },
        "EUR": null                 // null = ezen a nyelven nem ajánljuk
      },
      "leiras": { "hu": "", "de": null },  // opcionális, "mi van benne?" -- lásd lent
      "csomag": false,              // opcionális, lásd lent
      "forrasSor": 7                // csak az importból; később elhagyható
    }
  ]
}
```

### Ártípusok

| tipus | Mezők | Viselkedés |
|---|---|---|
| `FIX` | `ertek` | Az egységár alapértéke |
| `SAVOS` | `min`, `max` | Az egységár alapértéke `min`; a nyomtatványon `*` jelölést kap |

`null` ár egy pénznemben **nem 0** — azt jelenti, hogy a tétel abban a
**pénznemben** nem ajánlható. A keresőben ilyenkor nem jelenik meg (a
szűrés a terv pénzneme szerint megy, nem a nyelve szerint — lásd D21 a
`01-attekintes-es-dontesek.md`-ben).

Az árak egész számként tárolandók a pénznem alapegységében: HUF-nál
forint, EUR-nál **cent** (`23550` = 235,50 €). Így nincs lebegőpontos
kerekítési hiba az összegzésben.

## `terv.json`

```jsonc
{
  "schemaVersion": 1,
  "tervId": "a3f9c1",
  "paciensId": "k9m2r4",            // opcionális -- lásd "Páciens- és terv-mappa" fent (D29); hiányzó/üres = a terv még nincs elmentve
  "verzio": 1,
  "statusz": "VEGLEGES",           // PISZKOZAT | VEGLEGES
  "nyelv": "hu",                   // a nyomtatvány szövege, dátumformátuma, sablonja
  "penznem": "HUF",                // az ajánlható tételkör és a pénzformátum -- D21: független a nyelvtől
  "keltezes": "2026-08-05",
  "ervenyesIg": "2026-11-05",      // számított: keltezes + beallitasok.ervenyessegNap
  "arlistaVerzio": "2026-07-01",   // melyik árlistából készült
  "sablonVerzio": "nyilatkozat-hu-v1",
  "orvos": "Dr. Mándoki István",

  "paciens": {
    "nev": "Kovács János",
    "szuletesiIdo": "1978-03-14",
    "lakcim": "1113 Budapest, Bartók Béla út 42. 2/5",
    "telefon": "+36 30 123 4567",
    "email": "kovacs.janos@example.hu",
    "taj": "123 456 789",
    "kiskoru": false,
    "torvenyesKepviselo": null      // csak ha kiskoru === true
  },

  "fazisok": [
    {
      "sorszam": 1,
      "megnevezes": "1. kezelés — gyökérkezelés és tömések",
      "megjegyzes": "",
      "sorok": [
        {
          "tetelId": "t009",
          "nevSnapshot": "Esztétikus tömés 3 felszín",
          "savos": false,
          "fogak": "16, 17, 26",
          "mennyiseg": 3,
          "listaEgysegar": 45000,
          "tenylegesEgysegar": 45000,
          "leirasSnapshot": "",     // opcionális, lásd "Tétel-leírás" lentebb
          "mennyisegKezi": false    // opcionális, lásd "Fogszám kezelés" lentebb
        }
      ]
    }
  ],

  "osszesitok": {
    "kezelesekOsszesen": 820000,
    "kedvezmeny": 40000,
    "fizetendo": 780000
  },

  // Opcionális (hiányozhat egy régi fájlból, ilyenkor `null`-ként olvasandó).
  // Lásd "Előleg" lentebb.
  "elolegOsszeg": 390000,

  // Opcionális (hiányozhat egy régi fájlból, ilyenkor `null`-ként olvasandó).
  // Lásd "Terv-szintű kedvezmény" lentebb.
  "kedvezmenyOsszeg": 130000,

  // Opcionális (hiányozhat egy régi fájlból, ilyenkor `true`-ként
  // olvasandó). Lásd "Tétel-leírás" lentebb.
  "leirasokMutatasa": true
}
```

### Nyelv és pénznem — nincs sémaváltozás

A `nyelv`/`penznem` mezők a tervben és a `nev.de`/`ar.EUR` kulcsok az
árlistában **mind a `schemaVersion: 1` óta léteznek** — a német nyelv
bevezetése (D21) egyetlen új JSON-kulcsot sem igényelt, csak azt, hogy a
kód ténylegesen olvassa/vezérelje őket. A `nyelv` és a `penznem` tudatosan
**két külön mező**, nem egy összevont: az egyik a szöveget (tételnevek,
nyomtatvány feliratai, dátumformátum, sablon, **pénzösszeg ezres/tizedes
elválasztója**), a másik az ajánlható tételkört és a pénzösszeg
tizedesjegyeit/pénznemjelét vezérli (D63).

A `beallitasok.json` korábbi `nemetEngedelyezve` mezője (a német nyelv
engedélyező funkciókapcsolója) megszűnt (D63, 52. tétel) — a német nyelv
mindig választható, nincs hozzá gate. Egy régebbi, még ezt a kulcsot
tartalmazó `beallitasok.json` betöltésekor a mező némán figyelmen kívül
marad (nincs validálva, nincs olvasva).

Egy meglévő pácienshez induló ÚJ terv-lánc kiinduló `nyelv`/`penznem`-e a
`beallitasok.json` fenti globális mezőit csak *tartalékként* használja
(D52): ha a pácienshez van legalább egy VÉGLEGESÍTETT terve, annak
`nyelv`/`penznem`-e öröklődik (`app/src/domain/blankPlan.ts`
`createBlankPlan()` opcionális harmadik paramétere,
`app/src/state/planIndulas.ts` `ujTervForrasPaciensbol()` tölti ki).

### Miért van `nevSnapshot` és `listaEgysegar` a soron

Mert **az ajánlat pillanatkép**. Ha az árlistában fél év múlva átnevezik
a tételt vagy változik az ára, a kinyomtatott és aláírt terv attól még
ugyanazt jelentette. A `tetelId` megmarad hivatkozásnak, de nem abból
rajzoljuk újra a dokumentumot.

Az üres `tetelId` (`''`) is érvényes érték: **egyedi, árlistán kívüli**
sort jelent — a doki a keresőben begépelt szöveget vette fel `nevSnapshot`-ként, mert
egyetlen árlistai tétel sem talált rá. Ilyen soron nincs értelmezhető
árlistai referenciaár, ezért `listaEgysegar === tenylegesEgysegar` mindig
(az ártétel utólagos szerkesztése mindkettőt együtt írja).

Az ár-**követés** DERIVED, nincs hozzá tárolt mező a sémában (D69): egy sor
akkor „követi” az árlistát, ha `listaEgysegar` pontosan a tétel MAI
árlistai alapára — ez mindig levezethető a meglévő két mezőből, a
`nevKoveti()`/`leirasKoveti()` mintáján (`domain/arKoveti.ts` `arKoveti()`).
A szerkesztő ezen a bázison mutat explicit refresh-vezérlőt a driftelt
soron; az árlista mentése ettől függetlenül SOHA nem írja át automatikusan
egy már megnyitott/mentett terv sorait.

### Tétel-leírás (`leiras`, `csomag`, `leirasSnapshot`, `leirasokMutatasa`)

Egy összetett tétel (pl. „All-on-4 Anax csomag") egyetlen sorként megy be a
tervbe, egyetlen árral — a `Tetel.leiras: LokalizaltSzoveg` (opcionális,
`{ hu, de }`, a `nev` mintáján) rögzíti, mi van benne, hogy a páciens otthon
is el tudja mondani. A `Sor.leirasSnapshot` (opcionális `string`) a
`nevSnapshot` mintáján **pillanatkép** (D7): felvételkor a `Tetel.leiras[nyelv]`
aktuális értékéről indul, utána szabadon átírható, és nyelvváltáskor
`leirasKoveti()` (`app/src/domain/nev.ts`) dönti el, hogy szinkronizáljon-e
— pontosan úgy, ahogy a `nevKoveti()` a névnél, "kézzel írt szöveg nem
íródik felül" elven (D24).

**Egy ponton szándékosan eltér a névtől: nincs HU-visszaesés (D27).** Ha a
`Tetel.leiras.de` hiányzik egy német nyelvű terven, a leírás egyszerűen nem
jelenik meg — nincs `HU` jelvény, nem esik vissza magyar szövegre, és nem
számít bele a `fallbackSorok`/`lefedettseg()` diagnosztikába. A leírás
kiegészítő, díszítő tartalom, nem a sor lényege (azt a név hordozza) — a
névhez hasonló szigorú fallback-apparátus túlkezelés lenne egy opcionális
mezőhöz.

A `Tetel.csomag: boolean` (opcionális, alap `false`) **kizárólag** a
véglegesítés-őr puha figyelmeztetését vezérli: ha egy `csomag: true` tételre
hivatkozó soron üres a `leirasSnapshot`, a `PreviewPage` megerősítést kér
(`hianyzoCsomagLeirasok()`, `app/src/domain/kitoltetlen.ts`) — nem kemény
blokk, a doki tudatosan átugorhatja. A flag nem korlátozza, mely tételek
kaphatnak leírást (bármelyik tétel vagy egyedi sor is kaphat), csak azt
jelöli, melyiknél számít a hiánya jelzésre méltónak.

A `Plan.leirasokMutatasa: boolean` (opcionális, alap `true`) terv-szintű
kapcsoló: nyomtatódjanak-e a leírások. Kikapcsolva sem a nyomtatvány, sem a
véglegesítés-őr hiányzó-leírás figyelmeztetése nem néz `leirasSnapshot`-ot.
Ugyanúgy pillanatkép-jellegű, mint `nyelv`/`penznem` — betöltéskor és terv-
másoláskor öröklődik, nem nullázódik.

Egyik mező sem emelte a `schemaVersion`-t — mind a négy additív, a hiányzó
mező üres string/`false`/`true` alapértékkel olvasandó (a `Kategoria.szin`
precedense szerint).

### Előleg (`elolegOsszeg`)

Fogtechnikai munkát tartalmazó kezelésnél a munka megkezdésekor fizetendő
előleg **abszolút összege**, a pénznem alapegységében (HUF: forint, EUR:
cent) — D66. `null` (vagy hiányzó mező) = a doki nem jelölte be, nincs
előleg-sor a nyomtatványon. Nem emelt `schemaVersion`-t: a mező opcionális,
egy régi `terv.json` változatlanul betölthető, de a benne esetleg szereplő
korábbi, százalék-alapú `elolegSzazalek` mező betöltéskor FIGYELMEN KÍVÜL
MARAD — nincs migráció rá, egy régi verzióból nyitott új verzión a
kapcsoló kikapcsolva indul.

**Fix összeg tárolódik, nem élő százalék.** A mező bevezetésekor (backlog-9)
tudatos, drift-mentes tervezési döntés volt, hogy a százalékból az összeg
mindig élőben számoljon a `fazisok`-ból — így nem csúszhatott el a sorok és
a belőlük számolt előleg. A doki a redesign (D66) mellett tudatosan
elvetette ezt a védelmet egy fix összeg javára: egy utólagos sormódosítás
emiatt ELCSÚSZTATHATJA az eredeti arányt. Az `előleg > fizetendő` esetet
(amikor egy sortörlés a fizetendő alá viszi a végösszeget) a
véglegesítés-őr (`domain/veglegesitesOr.ts`, `elolegTullep` mező) KEMÉNY
blokkal fogja meg — az érték nem vágódik le automatikusan, a doki
tudatosan rendezi a szerkesztőben (`domain/totals.ts` `elolegTullepi`).
Egyenlőségnél (`előleg === fizetendő`) a fennmaradó rész explicit `0`,
ez legitim állapot.

Egy formázott kifejezés (`pdf/labels.ts` `elolegKifejezes`) tölti ki a
fizetési feltételek sablonszövegének `{{eloleg}}` helyőrzőjét, hogy az 1.
oldal és a 2. oldal jogi szövege ne mondhasson ellent egymásnak.
Kikapcsolt kapcsolónál a helyőrző egy "a megállapított előleg"/"die
vereinbarte Anzahlung" megfogalmazásra esik vissza — a mondat ilyenkor
nem konkrét összeget mond, de nem is hamis nullát.

### Terv-szintű kedvezmény (`kedvezmenyOsszeg`)

Az alku lezárásakor a doki gyakran kerek végösszegben állapodik meg a
pácienssel. A szerkesztőben a doki a kívánt **cél-végösszeget** gépeli be,
de a `Plan`-en ez FIX kedvezmény-**összegként** (`kedvezmenyOsszeg`)
rögzül, nem a begépelt cél-végösszegként (D25) — a sorok tiszta
összegéből ennyi vonódik le. `null` (vagy hiányzó mező) = nincs terv-
szintű kedvezmény, a `Fizetendő` a sorok tiszta összege (a mai
viselkedés). Nem emelt `schemaVersion`-t, az `elolegOsszeg` precedense
szerint.

**Fix összeg tárolódik, nem a cél-végösszeg.** Ha a cél-végösszeget
tárolnánk élőben, egy utólagos sormódosítás után a kedvezmény
észrevétlenül változna — ez D8 szellemével (a kedvezmény mérhető,
explicit tényállapot) ütközne, ugyanúgy, ahogy a soronkénti
`listaEgysegar` vs `tenylegesEgysegar` sem "él" a listaár változásával. Ha
a doki utólag módosítja a sorokat, a `Fizetendő` elcsúszhat a kerek
számtól — ez szándékos viselkedés, a doki bármikor újra beírhatja a kerek
számot, ami felülírja a `kedvezmenyOsszeg`-et.

**`tervVegosszeg(fazisok, kedvezmenyOsszeg)` soha nem ad negatívat**
(`domain/totals.ts`): mivel a kedvezmény fix összeg, egy utólagos
sortörlés a sorok összege fölé emelheti — ilyenkor a `Fizetendő` 0-ra
padlózódik, nem negatív szám kerül az aláírandó papírra (D25).

Ne keverd a `plan.osszesitok.kedvezmeny` mezővel: az a KIMENET (a sor- és
a terv-szintű eltérés összege a listaártól, véglegesítéskor számolva), a
`kedvezmenyOsszeg` a BEMENET (a doki által beállított terv-szintű összeg).
A kedvezmény összege — akárcsak az előlegnél — sehol nem jelenik meg a
nyomtatványon (D9), csak a `Fizetendő` lesz kisebb.

### Miért van `osszesitok`, ha származtatható

Mert ez az, ami **ténylegesen ki lett nyomtatva**. Ha egy későbbi
verzióban változik a kerekítési logika, az aláírt papírral kell egyeznie,
nem az újraszámolt értékkel. Betöltéskor újraszámolható, de eltérés esetén
a fájlban lévő érték az igazság — és érdemes figyelmeztetni.

## `beallitasok.json`

```jsonc
{
  "schemaVersion": 1,
  "rendelo": {
    "nev": "Mándoki Dental Kft.",
    "cim": "1114 Budapest, Móricz Zsigmond körtér 15. 3/8",
    "telefon": "+36 1 234 5678",
    "email": "rendelo@mandokidental.hu",
    "adoszam": "",                 // kitöltendő
    "cegjegyzekszam": ""           // kitöltendő
  },
  "orvosok": ["Dr. Mándoki István"],
  "inaktivOrvosok": [],             // hiánya/üres = minden orvos aktív (D63)
  "alapertelmezettOrvos": "Dr. Mándoki István",  // hiányzó/inaktív érték: az első AKTÍV név (D63)
  "ervenyessegNap": 90,
  "alapertelmezettNyelv": "hu"     // öröklés híján ez lesz az új tervek nyelve (D52)
}
```

Az `inaktivOrvosok` és az `alapertelmezettOrvos` additív mezők (D63,
`schemaVersion` nem emelkedett) — egy régi fájl mindkettő hiányával
olvasódik be, ilyenkor minden `orvosok`-beli név implicit aktív, a
default az első aktív név. A feloldás egyetlen helye
`app/src/domain/orvosok.ts`. A `terv.json` `orvos` mezője NÉV-pillanatkép
(egyelőre csak a NÉV, nincs komplex `doctorSnapshot` titulussal/aláírás-
képpel, D63) — egy orvos törlése/deaktiválása a korábbi terveket nem
érinti (D7).

## Fogszám kezelés

A `fogak` mező **szabad szöveg**. Az egységtípus (fogankénti/alkalmankénti)
explicit, tétel- vagy kategória-szintű besorolása kimarad (D14 fele
változatlan) — helyette heurisztika dönt: egy sor „fogankéntinek" számít, ha
a `fogak` mező `parseTeeth()` szerint tiszta, érvényes FDI-felsorolás. A
parsert emellett két különálló figyelmeztetéshez is használjuk:

- Érvényes FDI tokenek: maradó `11–18, 21–28, 31–38, 41–48`,
  tejfog `51–55, 61–65, 71–75, 81–85`.
- Regex: `/^(?:[1-4][1-8]|[5-8][1-5])$/`
- Elválasztók: vessző, pontosvessző, szóköz.
- Ha **minden** token érvényes, a `mennyiseg` automatikusan követi a fogak
  (dedupolt) számát — lásd „Automatikus darabszám (`mennyisegKezi`)" lentebb
  (D32, D14 részleges újranyitása). A `Fog` mező alatti halvány szöveges
  figyelmeztetés (`X fog van felsorolva, a darabszám Y. Szándékos?`) emellett
  megmarad, második jelzésként a doki kézi felülbírálása után — nem
  blokkolás, és a nyomtatványon nem jelenik meg (`parseTeeth()`).
  A `parseTeeth()` az ismételt FDI kódot (pl. „16, 17, 16") egyszer
  számítja — a fogtérképen is csak egy kiemelést kap, és a darabszám-
  követés/eltérés fenti számítása sem duplán számol vele. A nyomtatványra
  kerülő NYERS szöveg (`formatTeethForPrint()`) ettől függetlenül változatlan
  marad — a duplikátum-mentesítés csak a leszármaztatott (fogtérkép,
  darabszám) oldalon hat, a doki által begépelt szöveget nem írja át.
- **FDI-formátum figyelmeztetés** (D-döntés, 2026-08-09): a mező
  validálja a beírt *számokat*, de a folyószöveges jegyzetet
  továbbra is engedi — a kettő megkülönböztetése azon múlik, hogy egy
  token számjegyekből áll-e:
  - Ha egy token **csupa számjegy, de nem érvényes FDI kód** (pl. elgépelt
    `99`, ahol nincs 9. kvadráns) → piros keret + „Nem érvényes FDI
    fogszám: 99 — …" hibaszöveg a mező alatt. Ez tényleges elgépelés
    jelzése, nem blokkol.
  - Ha egy token **nem csupa számjegy** (pl. `jobb`, `felső`) → szándékos
    szabadszöveges jegyzet, nincs semmilyen figyelmeztetés rá. Ez
    érvényes, dokumentált tartalom (pl. „jobb felső").
  - A két eset függetlenül él egymás mellett ugyanabban a mezőben: a
    „16, 99, jobb felső" bemenetnél csak a `99` kap hibajelzést, a `16`
    és a „jobb felső" nem. Lásd `app/src/domain/teeth.ts`
    `invalidFdiTokens()` — ez az EGYETLEN hely, ami ezt a
    megkülönböztetést eldönti, ne írd újra máshol.
  - Ez a figyelmeztetés is csak a szerkesztőben látszik, a nyomtatványon
    nem jelenik meg, és nem blokkolja a véglegesítést.
- Hídnál a pótolt (hiányzó) fogat is fel kell sorolni, mert az is egy tag.

A fogtérkép a nyomtatványon ugyanebből a mezőből rajzolódik, **számok
nélkül**, csak kiemeléssel. A fogtérkép-vizualizáció (`buildToothVisualStates`)
és a soronkénti fogválasztó (`ToothPickerPopover`) továbbra is a
`parseTeeth()` mindent-vagy-semmit logikáját használják — a fenti
FDI-formátum figyelmeztetés ettől független, csak a szerkesztő mezője
alatti szöveges visszajelzésre vonatkozik.

### Automatikus darabszám (`mennyisegKezi`)

A `Sor.mennyisegKezi` (opcionális `boolean`) dönti el, hogy a `mennyiseg`
mezőt a fogak-követés írhatja-e: `false` = automatikusan követi a `fogak`
mezőt (a sorban felsorolt, dedupolt fogszámra áll minden érvényes
FDI-módosításnál), `true` = a doki kézzel felülbírálta, a sor levált — onnantól
a `fogak` módosítása többé nem írja felül némán. Hiányzó mező (egy, a
funkció bevezetése előtt mentett sor) **kézinek** számít, nem automatikusan
követőnek — egy régi terv szándékosan eltérő darabszáma így soha nem íródik
felül csendben (D32, a `nevKoveti()`-nél alkalmazott D24 mintáján). A
szerkesztő a levált soron egy visszakapcsoló vezérlőt ad, amire kattintva a
sor egy lépésben szinkronizálódik és újra követővé válik
(`app/src/domain/mennyiseg.ts` `sorPatchKovetessel()` — ez az EGYETLEN hely,
ahol ez a döntés eldől). Nem emelt `schemaVersion`-t, a `leirasSnapshot`
precedense szerint.

Nincs kivétel a heurisztika alól: a `csomag: true` tételre hivatkozó és az
egyedi (tétel nélküli) sorok is egységesen követnek, ha a `fogak` mezőjük
érvényes FDI-lista — a kézi leállás ugyanúgy védi őket, mint bármelyik más
sort. A nyomtatvány nem változik: a `mennyiseg` végső, elmentett értéke kerül
papírra, forrástól (automatikus vagy kézi) függetlenül; a `mennyisegKezi` mező
soha nem jelenik meg a nyomtatványon.
