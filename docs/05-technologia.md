# 5. Technológia

## Az architektúra egy mondatban

Statikus React SPA, ami a doki gépén lévő mappába ír PDF-et és JSON-t.
**Nincs backend, nincs adatbázis, nincs deploy pipeline.**

```
React + TypeScript SPA
  ├─ PlanStorage       → Drive-tükrözött helyi mappa
  ├─ PDF generálás     → kliensoldal (páciensadat nem hagyhatja el a gépet)
  └─ IndexedDB         → csak piszkozat-autosave, nem system of record
```

Miért nem Spring Boot + Postgres: nincs szerveroldali páciensadat, egy
rendelő, egy felhasználó, nincs külső integráció. Nem a fejlesztés lenne
a költség, hanem hogy három év múlva ki patch-eli a Postgres-t.

## A fájlrendszer elérése

Két implementáció, **egy interface mögött**:

```ts
interface PlanStorage {
  init(): Promise<void>
  listPatients(): Promise<PatientFolder[]>
  listVersions(patientDir: string): Promise<PlanVersion[]>
  loadPlan(ref: PlanRef): Promise<Plan>
  savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef>
  loadPriceList(): Promise<PriceList>
  savePriceList(pl: PriceList): Promise<void>
  loadSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  loadTemplate(name: string): Promise<string>
  saveTemplate(name: string, body: string): Promise<string>  // új verziófájlt ad vissza
}
```

### Kezdd a File System Access API-val

`showDirectoryPicker()`, a doki egyszer kijelöl egy gyökérmappát.

- Nulla telepítés, holnap tudsz demót mutatni.
- **Csak Chrome/Edge** (Firefox és Safari nem támogatja).
- HTTPS kell (vagy `localhost`).
- A hozzájárulást munkamenetenként újra kell kérni — egy kattintás.
  A `FileSystemDirectoryHandle` IndexedDB-be perzisztálható, így nem kell
  újra kitallózni, csak engedélyezni.

### Váltás Tauri-ra, ha kell

Natív fájlrendszer, nincs böngészőkényszer, nincs munkamenetenkénti
engedélykérés. Cserébe telepítés, frissítés és Windows kódaláírás
(különben SmartScreen figyelmeztetés minden indításnál).

**Ez egy implementáció cseréje, nem újraírás** — 1-2 nap, ha az interface
tiszta. Akkor kell, ha a rendelői gépeken nem Chrome/Edge a default, vagy
ha a hozzájárulás-kérés zavaró.

### Google Drive

A doki Drive-ra szinkronizálja a gyökérmappát. Két dolog kell hozzá:

- **A Drive kliens „Tükrözés" módban legyen, ne „Streamelés"-ben.** Ez
  nem az alapértelmezett. Streamelésnél a fájlok nincsenek a lemezen, a
  `paciensek/` fa bejárása minden JSON-t letölt, és a File System Access
  API is szeszélyes virtuális meghajtón.
- A D4 döntés (soha nem írunk felül) itt fizetődik ki: a Drive akkor
  csinál `conflicted copy`-t, ha egy fájl szinkron közben módosul.
  Append-only írásnál ez nem tud előfordulni.

## PDF generálás

**Kliensoldalon kell** — páciensadat nem mehet szerverre, tehát a headless
Chromium / Playwright út kizárva.

Javaslat: **`@react-pdf/renderer`** a dokumentum layoutjához +
**`pdf-lib`** a `terv.json` beágyazásához mellékletként.

| Opció | Mikor |
|---|---|
| `@react-pdf/renderer` | JSX-ben írod a dokumentumot, van oldaltörés-kezelés. Ha React a frontend, ez a legkisebb ugrás |
| `pdf-lib` | Melléklet beágyazása, utólagos manipuláció. Vektoros logóhoz `embedPdf()` |
| Print CSS + `Ctrl+P` | Fél nap alatt kész, tökéletes layout — de a böngésző fejlécet/láblécet tesz rá, és **nem lehet JSON-t beágyazni**. Csak prototípushoz |

A `terv.json` beágyazása azért kell, mert a különálló JSON és PDF szét fog
csúszni abban a pillanatban, amikor a doki e-mailben csak a PDF-et küldi
el. Redundáns, és pont ezért jó.

Betöltéskor: elsődlegesen a `terv.json`, fallback a PDF mellékletéből.

## Fontok

A nyomtatvány magyar szöveg, tehát a fontnak kell `ő` és `ű`. A
`@react-pdf/renderer` beépített Helvetica-ja **nem tartalmazza ezeket** —
regisztrálni kell egy Unicode fontot (pl. Inter, Source Sans, vagy
Noto Sans), különben a hosszú ékezetek eltűnnek vagy elromlanak.

Ez az a hiba, ami csak a végleges PDF-en látszik, a HTML előnézeten nem.

## Hosztolás

Statikus fájlok. HTTPS kell a File System Access API miatt, tehát:

- statikus hoszt (Netlify / Cloudflare Pages / bármi), vagy
- `localhost`-on futó lokális szerver a rendelői gépen.

**Ez az egyetlen üzemeltetendő komponens.** Nincs mögötte adat — ha
lemegy, a doki fájljai attól még ott vannak a lemezén.

Ha statikus, publikus hoszton van, az árlista JSON nincs rajta — az a
doki mappájában van, nem az appban. A publikus hoszt csak a kódot
szolgálja ki.

## Sémaverziózás

Minden JSON fájl `schemaVersion: 1` mezővel kezdődik. Betöltéskor:

- ismert verzió → betölt
- alacsonyabb verzió → migrálja memóriában, és a következő mentéskor már
  az új sémával ír
- **magasabb verzió → megtagadja a betöltést**, érthető üzenettel
  („ez a fájl az alkalmazás újabb verziójával készült")

Ez a Drive-on évekig élő fájlok miatt kell. Egy egész szám ma nulla
költség.

## Amit nem szabad

- Ne írj felül meglévő verziómappát (D4).
- Ne használj újra tétel-`id`-t (D17).
- Ne tedd az IndexedDB-t system of recorddá — az csak piszkozat-cache.
- Ne rajzold újra a mentett tervet az aktuális árlistából — a snapshot az
  igazság (D7).
- Ne tárolj pénzt lebegőpontosan — egész szám a pénznem alapegységében.
