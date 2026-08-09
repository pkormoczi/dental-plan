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
    nyilatkozat-de-v1.md            ; placeholder -- jogi munka, lásd README "Nyitott kérdések"
    fizetesi-feltetelek-de-v1.md    ; placeholder -- jogi munka, lásd README "Nyitott kérdések"
  paciensek/
    Kovacs-Janos_a3f9c1/
      2026-08-05_v1/
        kezelesi-terv.pdf
        terv.json
      2026-08-19_v2/
        kezelesi-terv.pdf
        terv.json
```

### Mappanév szabályok

- Páciensmappa: `Vezeteknev-Keresztnev_<6 karakteres id>`
- **Az ékezeteket meg kell tartani** — a doki a Fájlkezelőben fog rájuk
  keresni. Ne transzliterálj.
- Tiltott karakterek cseréje: `/ \ : * ? " < > |` és a záró pont/szóköz.
- A `_<id>` azért kell, mert két Kovács János is lehet, és a név
  változhat.
- Verziómappa: `<ISO dátum>_v<n>`. **Soha nem írunk felül** meglévőt.
- Az útvonal a Drive mount alatt hosszú lesz — tartsd a neveket rövidre
  (Windows 260 karakter).

## `arlista.json`

Kész seed: `data/arlista.seed.json` (118 tétel, 12 kategória).

```jsonc
{
  "schemaVersion": 1,
  "arlistaVerzio": "2026-07-01",   // ez kerül a nyomtatvány láblécére
  "modositva": "2026-08-05",
  "kategoriak": [
    { "id": "k02", "nev": { "hu": "Tömések", "de": null }, "sorrend": 2 }
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
          "tenylegesEgysegar": 45000
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
  "elolegSzazalek": 50
}
```

### Nyelv és pénznem — nincs sémaváltozás

A `nyelv`/`penznem` mezők a tervben, a `nev.de`/`ar.EUR` kulcsok az
árlistában és az `alapertelmezettNyelv`/`nemetEngedelyezve` a
beállításokban **mind a `schemaVersion: 1` óta léteznek** — a német
kapcsoló bevezetése (D21) egyetlen új JSON-kulcsot sem igényelt, csak azt,
hogy a kód ténylegesen olvassa/vezérelje őket. A `nyelv` és a `penznem`
tudatosan **két külön mező**, nem egy összevont: az egyik a szöveget
(tételnevek, nyomtatvány feliratai, dátumformátum, sablon), a másik az
ajánlható tételkört és a pénzformátumot vezérli.

### Miért van `nevSnapshot` és `listaEgysegar` a soron

Mert **az ajánlat pillanatkép**. Ha az árlistában fél év múlva átnevezik
a tételt vagy változik az ára, a kinyomtatott és aláírt terv attól még
ugyanazt jelentette. A `tetelId` megmarad hivatkozásnak, de nem abból
rajzoljuk újra a dokumentumot.

Az üres `tetelId` (`''`) is érvényes érték: **egyedi, árlistán kívüli**
sort jelent (backlog-3, `docs/backlog-3-sornev-egyedi-sor-terv.md`) — a
doki a keresőben begépelt szöveget vette fel `nevSnapshot`-ként, mert
egyetlen árlistai tétel sem talált rá. Ilyen soron nincs értelmezhető
árlistai referenciaár, ezért `listaEgysegar === tenylegesEgysegar` mindig
(az ártétel utólagos szerkesztése mindkettőt együtt írja).

### Előleg (`elolegSzazalek`)

Fogtechnikai munkát tartalmazó kezelésnél a munka megkezdésekor fizetendő
előleg **százaléka**. `null` (vagy hiányzó mező) = a doki nem jelölte be,
nincs előleg-sor a nyomtatványon. Nem emelt `schemaVersion`-t: a mező
opcionális, egy régi `terv.json` változatlanul betölthető.

**Százalék tárolódik, nem összeg.** Az előleg és a fennmaradó rész összege
mindig élőben számol a `fazisok`-ból (a *tényleges*, kedvezménnyel
csökkentett végösszegből), ugyanúgy, ahogy a nyomtatvány `Fizetendő` sora
— így nem lehet elcsúszni a sorok és a belőlük számolt előleg között. A
számítás determinisztikusan reprodukálható a perzisztált százalékból és a
perzisztált sorokból, ezért ez nem sérti a D7 pillanatkép-elvét (a
verziómappát amúgy sem írjuk felül, D4).

Ugyanez a százalék tölti ki a fizetési feltételek sablonszövegének
`{{elolegSzazalek}}` helyőrzőjét, hogy az 1. oldal és a 2. oldal jogi
szövege ne mondhasson ellent egymásnak. Kikapcsolt kapcsolónál a
helyőrző az 50-es alapértékre esik vissza — a mondat ilyenkor szó szerint
az eredeti, aláírt szöveggel azonos.

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
  "logoFajl": "logo.png",          // a gyökérmappában
  "ervenyessegNap": 90,
  "alapertelmezettNyelv": "hu",    // ez lesz az új tervek nyelve, ha nemetEngedelyezve
  "nemetEngedelyezve": false       // alapértéke false; a Beállításokban kapcsolható (D21)
}
```

## Fogszám kezelés

A `fogak` mező **szabad szöveg**. Az MVP nem számol belőle darabszámot
(D14), de a parsert érdemes megírni, mert két különálló figyelmeztetéshez
kell:

- Érvényes FDI tokenek: maradó `11–18, 21–28, 31–38, 41–48`,
  tejfog `51–55, 61–65, 71–75, 81–85`.
- Regex: `/^(?:[1-4][1-8]|[5-8][1-5])$/`
- Elválasztók: vessző, pontosvessző, szóköz.
- Ha **minden** token érvényes és a darabszám ettől eltér → halvány
  figyelmeztetés a szerkesztőben (`X fog van felsorolva, a darabszám Y`).
  Nem blokkolás, és a nyomtatványon nem jelenik meg. (`parseTeeth()`.)
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
