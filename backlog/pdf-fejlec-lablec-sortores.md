# pdf-fejlec-lablec-sortores
Type: bug
Source: felvetés 2026-11-19, PDF-fejléc képernyőkép alapján
Target: master
Baseline: de1e06cd2d6d7c290e6c9b0c982e10177f322d18

## Goal
A PDF fejléce négy tartalmi sorban áll (irányítószám, város / utca, házszám / telefon / e-mail), a
lábléc bal blokkja háromban (rendelő neve / címe / adószám · cégjegyzékszám), szótagoló kötőjel nélkül;
a Beállításokban a cím két külön mező.

## Current state
- `app/src/pdf/tervDocument/Chrome.tsx` `MainHeader`: két `Text` („cim”, „telefon · email”); a 151 pt
  széles `headerClinicBlock` szélességre tördel, a react-pdf alapértelmezett szótagolásával
  („drmando-ki.hu”). `Footer` bal blokk: „nev · cim” + adószám/cégjegyzékszám sor; az első 362 pt a
  293 pt-ből → „Zsig-mond”.
- `app/src/domain/types.ts` `Rendelo.cim` egyetlen szabadszöveges mező; `app/src/storage/seed/settings.ts`
  `seedSettings`; `app/src/pages/settings/RendeloTab.tsx` „Cím” mező.
- Az egyetlen olvasási út `app/src/storage/fajlTarolo.ts` `loadSettings` (demó és Electron is), ezt
  használja az `app/src/storage/adatExport.ts` export is; az alak-őr `app/src/domain/validate.ts`
  `assertSettingsShape` csak a `rendelo` objektumot nézi.
- Minta opcionális, `schemaVersion`-emelés nélküli Settings-mezőre és egyetlen feloldóra:
  `app/src/domain/beallitasok.ts` `alapertelmezettPenznem`.
- Tesztek: `app/src/pdf/TervDocument.test.tsx` „a nyomtatvány egyetlen szövege sem tartalmaz sortörést”,
  „az A blokk első fizikai oldalán a nagy fejléc látszik, a kompakt fejléc nem” (`rendelo.cim`-re keres).
- Mérés NotoSans-szal: „Móricz Zsigmond körtér 15. 3/8” 9 pt-on 132/151 pt; a lábléc leghosszabb sora
  (rendelő neve) 7,5 pt-on 190/293 pt — minden új sor elfér.

## Approach
- `Rendelo`: `cim` helyett `iranyitoszamVaros` és `utcaHazszam`; `schemaVersion` 1 marad.
- Régi, csak `cim`-et tartalmazó beállítás (mai localStorage, demóból exportált fájl): egy domain-oldali
  feloldó az első vesszőnél kettévágja (vessző nélkül az egész az első mezőbe), a `loadSettings` ezen
  át adja vissza; mentéskor már csak a két új mező íródik. Seed a két mezővel.
- `RendeloTab`: „Cím” helyett „Irányítószám, város” és „Utca, házszám” mező, címke fölötte.
- `MainHeader`: négy külön `Text`; üres mező sora kimarad. `Footer` bal blokk: három `Text` — név;
  „<irányítószám, város>, <utca, házszám>”; a meglévő adószám · cégjegyzékszám sor („—” üresen) változatlan.
- A fejléc rendelő-blokkjának és a lábléc szövegeinek nincs szótagolása (szóhatáron tör).
- NEM tartozik ide: a dokumentum többi részének szótagolása (táblázat, `Fog` mező, német tételnevek); a
  lábléc jobb blokkja és `app/src/pdf/footerLayout.ts`; az oldal `paddingBottom`-ja; a
  `schemaVersion`/migrációs keret (`backlog/idea/later/sema-migracios-keret.md`); a cégadatok kitöltése.

## Decisions
- Két külön mező, nem vesszőnél törő egy mező — doki döntés 2026-11-19.
- Új mezők `schemaVersion: 1` alatt, betöltéskori `cim`-szétvágással; nem `schemaVersion: 2` — doki
  döntés 2026-11-19: a meglévő opcionális-mező minta, és telepített régi appverzió még nincs.
- A legacy `cim` feloldása a `loadSettings`-ben — mert ez a demó, az Electron és az export egyetlen
  olvasási útja; nem a PDF-ben és az űrlapon külön, mert az két helyen duplikálná.
- Szótagolás-tiltás csak a fejléc rendelő-blokkján és a láblécen (`Text` szintű `hyphenationCallback`) —
  ez a panasz hatóköre; nem globális `Font.registerHyphenationCallback`, mert az a szűk táblaoszlopok
  tördelését is megváltoztatná ellenőrzés nélkül.
- `footerLayout.ts` és `paddingBottom` változatlan — a seed adattal a bal blokk ma is három sorra tör,
  a lábléc magassága nem nő; a hosszú névre számolt extra a jobb blokkhoz marad.

## Verification
- [ ] tests — a fejlécben négy külön sor: „1117 Budapest”, „Móricz Zsigmond körtér 15. 3/8”, telefon,
      e-mail; üres mező sora nem jelenik meg; a lábléc bal blokkja: név / „1117 Budapest, Móricz Zsigmond
      körtér 15. 3/8” / adószám · cégjegyzékszám
- [ ] tests — csak `cim`-et tartalmazó `beallitasok.json` betöltve a két mezőt adja (első vesszőnél
      vágva; vessző nélkül minden az első mezőben); a következő mentés nem ír `cim` kulcsot
- [ ] tests — a Beállítások Rendelő fülén a két cím-mező megjelenik, szerkesztése perzisztál
- [ ] tests — a fejléc rendelő-szövegei és a lábléc szövegei nem kapnak szótagolást; a „nincs sortörés
      `Text`-en belül” teszt zöld marad
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: pdf — valós PDF-en HU és DE nyelven: négysoros fejléc, háromsoros lábléc,
      kötőjeles törés nélkül; teli oldalon a lábléc nem ér a tartalomhoz
