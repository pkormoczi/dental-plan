# 5. Technológia

## Az architektúra egy mondatban

Statikus React SPA, ami a doki gépén lévő mappába ír PDF-et és JSON-t.
**Nincs backend, nincs adatbázis, nincs deploy pipeline.**

```
React + TypeScript SPA
  ├─ PlanStorage    → Drive-tükrözött helyi mappa
  ├─ DraftStorage   → csak piszkozat-autosave, nem system of record
  │                    (mockup: localStorage, végleges: IndexedDB)
  └─ PDF generálás  → kliensoldal (páciensadat nem hagyhatja el a gépet)
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
  listPlans(patientDir: string): Promise<PlanFolder[]>        // D29: köztes szint a verziók felett
  listVersions(patientDir: string, planDir: string): Promise<PlanVersion[]>
  loadPlan(ref: PlanRef): Promise<Plan>
  savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef>
  savePlanLabel(patientDir: string, planDir: string, tervCim: string): Promise<void>  // üres = törlés, vissza az auto-javaslatra
  loadPriceList(): Promise<PriceList>
  savePriceList(pl: PriceList): Promise<void>
  loadSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<void>
  loadTemplate(name: string): Promise<string>
  saveTemplate(name: string, body: string): Promise<string>  // új verziófájlt ad vissza
  loadPatientData(patientDir: string): Promise<PatientMasterData | null>  // null = nincs törzsadat, élő fallback
  savePatientData(patientDir: string, data: PatientMasterData): Promise<void>
  createPatient(nev: string, kezdoAdatok?: Pick<Paciens, 'szuletesiIdo' | 'telefon'>): Promise<PatientFolder>  // terv nélküli páciens, D41
  deletePatient(patientDir: string): Promise<void>  // teljes páciensmappa törlése, D50 -- előfeltétel a hívó felelőssége
}
```

### `savePriceList`/`saveSettings` szerializációs szerződés (D31)

A `PlanStorage` szignatúrája kész objektumot kap (fent), de a hívó
(`AppState.tsx` `savePriceList`/`saveSettings` context-metódusa) SOHA nem
ad tovább render-idejű closure-be zárt régi állapotot: mindkettő
`(updater: (prev) => next) => Promise<void>` alakú, az updatert a mentés
ELŐTT, szinkron futtatja le, és a memóriabeli állapotot (state + egy
`ref`-tükör) optimistán, MÉG A TÁROLÓ-ÍRÁS ELŐTT frissíti. Sikertelen
mentésre nem gördül vissza (D31) — a hibaszöveg megjelenik, de a doki
begépelt szövege nem tűnik el.

Ha az implementáció írása nem atomi (mint a tervezett
`FileSystemStorage`-nál: `createWritable`/`write`/`close`), neki kell
sorosítania az egymást gyorsan követő írásokat egy közös láncon, hogy két
párhuzamos writable ne írjon egymásra, és a végeredmény sorrendje a hívási
sorrendet kövesse — lásd `DemoStorage` `enqueue`/`savingChain`, ami ma
(szinkron `localStorage.setItem` mellett) önmagában no-op, de a
`savePlan`/`savePriceList`/`saveSettings` mindhárom útját egy közös láncba
fűzi.

`PlanRef` a `{ patientDir, planDir, versionDir }` hármas (D29) — a köztes
`planDir` szint miatt bővült a korábbi kettősről.

### Piszkozat-autosave: `DraftStorage`, a `PlanStorage` MELLETT

Külön, kicsi interfész — nem a `PlanStorage` bővítése, mert az IndexedDB
(illetve a mockupban a `localStorage`) itt is csak testvér-doboz marad, nem
a fájlrendszeres tárolás része:

```ts
interface DraftMeta {
  patientDir?: string
  lastRoute?: '/paciens' | '/terv' | '/elonezet'
}
interface DraftRecord extends DraftMeta {
  schemaVersion: 1
  mentve: string
  plan: Plan
}
interface DraftStorage {
  load(): Promise<DraftRecord | null>
  save(plan: Plan, meta?: DraftMeta): Promise<DraftRecord>
  clear(): Promise<void>
}
```

Mockup-implementáció: `app/src/storage/DemoDraftStorage.ts`, a `dp:piszkozat`
localStorage-kulcson (ugyanaz a `dp:` prefix, mint a `DemoStorage`
kulcsainál — a "Minden adat törlése"/"Demó adat visszaállítása" gomb
prefix-seprése emiatt a piszkozatot is elsöpri, külön kód nélkül). A
véglegesben ugyanezt az interfészt egy IndexedDB-alapú implementáció váltja.
Az olvasás ugyanazt a sémaverzió- és alak-ellenőrzést követi, mint a
`PlanStorage.loadPlan()` (D18) — egy sérült/inkompatibilis piszkozatot a
betöltés megtagad, érthető üzenettel, nem néma eldobással. A `DraftMeta`
két mezője (D37, `docs/01-attekintes-es-dontesek.md`) PUHÁN validált — nem
a `Plan` tartalma, csak UI-workflow navigációs tipp, ezért egy szemetes
vagy ismeretlen érték némán elmarad, nem dobja el az egész piszkozatot.

Egyetlen `dp:piszkozat` kulcs, egyetlen memóriabeli `plan` slot — több
böngészőfül esetén last-write-wins, ütközésfeloldás nélkül. **Elfogadott
kockázat**: egyszemélyes asztali eszköznél nem realisztikus munkafolyamat.

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
- Ne tedd a `DraftStorage`-ot (mockupban `localStorage`, véglegesben
  IndexedDB) system of recorddá — az csak piszkozat-cache.
- Ne rajzold újra a mentett tervet az aktuális árlistából — a snapshot az
  igazság (D7).
- Ne tárolj pénzt lebegőpontosan — egész szám a pénznem alapegységében.
