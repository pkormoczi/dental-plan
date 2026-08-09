# Backlog 6. tétel — Sablonszerkesztő bekötése + placeholder-őr a véglegesítésnél — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 6. tételének („Sablonszerkesztő bekötése +
placeholder-őr a véglegesítésnél") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Hatókör-korrekció (a backlog szövege elavult)

A backlog 6. tétele két részt ír le: „sablonszerkesztő bekötése" és
„placeholder-őr a véglegesítésnél". Kutatással megerősítve: **a
sablonszerkesztő rész már készen van** — a `119ab74` commit (2026-08-08,
tehát a 2026-08-06-i review UTÁN, de a backlog.md jelenlegi szövegének
frissítése előtt) teljesen megépítette a `SettingsPage.tsx` „Nyomtatvány
szövegei" kártyáját: nyelvváltós szerkesztő mindkét sablonra, `storage
.saveTemplate()`-re kötve, dirty-tracking, verziófájl-névkijelzés, mentési
hiba kezelése, mind teszteltek (`SettingsPage.test.tsx:54-130`). A backlog
„csak UI és a StorageContext exportja hiányzik" mondata elavult — a
`loadLatestTemplateByBase` már ma is exportált a `StorageContext`-en
keresztül (`StorageContext.tsx:29,51`).

**A ténylegesen hátralévő munka** — ez a döntési dokumentum erről szól:

1. Placeholder-őr a véglegesítésnél (az eredeti kérés magja).
2. A meglévő szerkesztő két, felülvizsgálat során talált hiányossága
   (a felhasználó kérésére bekerült ebbe a körbe): piszkozat-védelem és
   dupla-kattintás elleni zár.

Az implementáció végén a `docs/08-backlog.md` 6. tételének leírását is
korrigálni kell (a szerkesztő-rész "KÉSZ" jelölése, a "csak UI... hiányzik"
mondat törlése) — ugyanaz a minta, mint az 1. és 2. tételnél.

## Probléma (a placeholder-őr tényleges hiánya)

A `PreviewPage.tsx` véglegesítés-láncában (`attemptFinalize` → `doFinalize`,
kb. 175-250. sor) **nincs semmilyen ellenőrzés** arra, hogy a betöltött
`nyilatkozatMd`/`fizetesiFeltetelekMd` (kb. 58-116. sor, `loadOrFallback`)
tartalmaz-e `[PLACEHOLDER`/`[PLATZHALTER` jelölőt. Ma egy alapértelmezett
(nem szerkesztett) német terv simán véglegesíthető és „aláírásra kész"
PDF-ként menthető, holott mindkét seed sablon (`nyilatkozat-de-v1.md`,
`fizetesi-feltetelek-de-v1.md`) explicit placeholder — ez a
`docs/08-backlog.md` Függelék C napi, ténylegesen megtörtént jelenete.

**Kritikus felismerés a mechanizmus tervezéséhez:** a `TervDocument.tsx`
(kb. 395-425. sor) szerint a „Csak ajánlat" (`offerOnly`) kapcsoló **csak a
3. oldalt (nyilatkozat + aláírás) zárja ki** — a 2. oldal (fizetési
feltételek) **mindig** nyomtatódik, `offerOnly`-tól függetlenül. Emiatt a
két sablon placeholderjét NEM lehet egyformán kezelni: egy „kényszerített
offerOnly" megoldás a nyilatkozatra tökéletes védelmet ad, de a fizetési
feltételekre semmilyet.

Már létezik egy hasonló, tesztelt mechanizmus: ha egy sablon **hiányzik**,
a `loadOrFallback` (`PreviewPage.tsx` kb. 69-84. sor) csendben visszaesik a
magyar szövegre, sárga `sablonFallback` Callouttal (kb. 292-300. sor). Ez
ma **nem** kapcsol be egy meglévő, de placeholder-tartalmú fájlra — csak a
ténylegesen hiányzó fájl esetét kapja el (`err.message.startsWith('Nincs ')`).

**Megerősített duplikáció:** a placeholder-detektálás logikája már ma is
kétszer létezik, eltérő formában:
- `DemoStorage.ts:51-53` `isPlaceholderTemplate()` — `body.includes('[PLACEHOLDER')`
  / `body.includes('[PLATZHALTER')` (zárójellel).
- `SettingsPage.tsx:51-53` `isPlaceholderBody()` — `body.includes('PLACEHOLDER')`
  / `body.includes('PLATZHALTER')` (zárójel nélkül, szélesebb találat).

## Döntések

### 1. Nyilatkozat placeholder → kemény zár, nincs felülírás

Ha a ténylegesen betöltött `nyilatkozatMd` placeholdert tartalmaz, a „Csak
ajánlat" checkbox automatikusan bepipálva és **letiltva** jelenik meg (nem
kapcsolható ki, amíg a placeholder fennáll) — a 3. oldal (nyilatkozat +
aláírás) emiatt garantáltan kimarad minden PDF-ből (letöltés és
véglegesítés is ugyanazt a `pdfInstance`-t használja, lásd `PreviewPage
.tsx:134-157`). Egy piros `Callout.Root` jelzi, miért van letiltva, és
hova kell menni a javításhoz (Beállítások → Nyomtatvány szövegei). Nincs
„Folytatás mindenképp" felülírási lehetőség — ez nem a meglévő
`confirmStep`-lánc (hiányzó mezők, hiányzó német nevek) egy újabb tagja,
mert azok hiányos, de nem kifejezetten „jogilag még nincs lezárva"
jelölésű adatot védenek.

**Miért:** a backlog explicit „jogi kockázat, nem csak UX" framingje és a
Függelék C konkrét jelenete (a doki manuálisan vette észre és váltott
ajánlat-módra) azt kéri, hogy az app automatikusan érvényesítse ugyanazt a
korlátot, amit ma a doki fejben tart — nem egy megkerülhető
figyelmeztetést. A `docs/03-funkcionalis-spec.md` már ismer egy ehhez
hasonló súlyosságú, felül nem írható blokkot (kitöltetlen sor, „KEMÉNY
blokk") — ez ugyanabba a kategóriába esik: a páciens elé nem kerülhet
olyan aláírandó lap, amit a doki jogásza kifejezetten „még nincs lezárva"
jelöléssel látott el.

**Nem cél:** a `doFinalize()`-ba nem kell külön védelmet tenni — mivel a
checkbox ténylegesen nem kapcsolható ki, a `pdfInstance` már eleve
offer-only alakú, a mentés ezt menti el. A meglévő `statusz: 'VEGLEGES'`
beállítás (ami ma is offerOnly-tól függetlenül fut le) változatlan marad —
ez a tétel nem nyúl hozzá ehhez a szemantikához.

### 2. Fizetési feltételek placeholder → a meglévő `sablonFallback` kiterjesztése

A `loadOrFallback` melletti, KIZÁRÓLAG a fizetési feltételek betöltésére
vonatkozó extra lépés: ha a sikeresen betöltött `fizetesiFeltetelekMd`
placeholdert tartalmaz, a kód UGYANAZT a fallback-ágat futtatja le, mint a
hiányzó-fájl esetben (a magyar `fizetesi-feltetelek-hu` szöveg betöltése),
és a meglévő `sablonFallback`/sárga Callout jelzi. A `nyilatkozat`
betöltésénél ez az extra lépés NEM fut le (az ő placeholder-esete az 1.
döntés szerinti kemény zárat váltja ki, nem HU-visszaesést).

A meglévő Callout szövege pontosításra szorul, mert ma kifejezetten
„nem található a tárolóban"-t mond, ami félrevezető lenne a
placeholder-eset esetén: „A tervhez tartozó sablon nem érhető el a
megfelelő nyelven (hiányzik, vagy még jogi lektorálásra vár) — helyette a
magyar szöveg jelenik meg a nyomtatványon."

**Miért:** a 2. oldal (fizetési feltételek) sosem esik ki `offerOnly`
módban sem — egy „kényszerített offerOnly" megoldás ITT nulla védelmet
adna, mert az az oldal mindig nyomtatódik. Ugyanakkor ez az oldal
tisztán informatív (fizetési feltételek, nem aláírt nyilatkozat) — a
kódban már van egy pontosan erre a helyzetre (rossz/hiányzó nyelvű
sablon) épített, tesztelt, nem blokkoló mintázat (D21 szellemében: hiányzó
tartalom sose blokkol némán, de jelezni kell). Ennek kiterjesztése
konzisztens és nem vezet be új UI-mintát.

**Együttes hatás egy friss (nem szerkesztett) német tervnél** (a mai
alapértelmezett állapot, mert mindkét DE seed placeholder): a „Csak
ajánlat" letiltva/bepipálva, a nyomtatvány 2. oldala magyar fizetési
feltételekkel + sárga figyelmeztetéssel jelenik meg, a 3. oldal (nyilatkozat)
teljesen kimarad, piros Callout magyarázza miért. A két Callout egymás
alatt jelenik meg, a meglévő Callout-egymásra-halmozási mintát követve
(`templateError`, `sablonFallback`, `pdfError`, `saveError` stb. már ma is
így épül fel, kb. 285-336. sor).

### 3. Közös `isPlaceholderTemplate()` — kiemelve, a két duplikátum leváltva

Új export: `app/src/domain/templates.ts` (`domain/` réteg, mert ez egy
üzleti szabály — „mikor számít egy sablon jogilag lezáratlannak" —, nem
tárolási vagy oldal-specifikus logika). A kanonikus implementáció a
zárójeles változatot veszi át (`'[PLACEHOLDER'` / `'[PLATZHALTER'`,
`DemoStorage.ts` mai mintája), mert ez pontosabb — a seed szövegek mindig
`[PLATZHALTER ...]` alakban kezdik a jelölést, a zárójel nélküli változat
elméletileg egy jövőbeli, a szót emlegető, de nem tényleges placeholder
szövegen is félrecsapna.

`DemoStorage.ts` és `SettingsPage.tsx` saját, privát másolata törlődik,
mindkettő erre az exportra áll át. A `PreviewPage.tsx` (harmadik hívási
hely, ez a tétel vezeti be) ugyanezt importálja — nincs harmadik
másolat.

**Miért:** a CLAUDE.md „Meglévő segédfüggvények — használd, ne írd újra"
szelleme — két duplikátum már ma is inkonzisztens (eltérő string-egyezés),
egy harmadik hívási hely bevezetése a legjobb alkalom a konszolidálásra,
mielőtt egy negyedik hely is a saját változatát írná meg.

### 4. Sablon-piszkozat perzisztencia a szerkesztőben (a felhasználó kérésére, ebbe a körbe véve)

Felülvizsgálati találat: a `SettingsPage.tsx` sablonszerkesztő `templates`
állapota tiszta komponens-szintű `useState`/`useRef` — ha a doki ír egy
javítást, de elnavigál mentés előtt, a szerkesztés némán elvész. Ugyanaz a
hibaosztály, amit az 1. backlog-tétel (piszkozat-perzisztencia, lásd
`docs/backlog-1-piszkozat-terv.md`) a tervszerkesztőre már megoldott — a
sablonszerkesztőre nem terjedt ki.

**Építészeti döntés:** NEM a meglévő `DraftStorage`/`DemoDraftStorage`
interfész bővítése — az kizárólag `Plan`-ra van típusozva
(`DraftStorage.ts:22` `save(plan: Plan)`), a bővítése blur-özné az
egyetlen-felelősségét és egy már lezárt, tesztelt backlog-tétel kódjához
nyúlna. Helyette **ad hoc `localStorage`-olvasás/írás közvetlenül a
`SettingsPage.tsx`-ben**, egyetlen `dp:sablon-piszkozat` kulcs alatt, egy
base-kulcsolt JSON objektumként (pl. `{"nyilatkozat-hu": "...", "fizetesi-
feltetelek-de": "..."}`). A `dp:` prefix miatt a meglévő „Minden adat
törlése"/„Demó adat visszaállítása" (`DemoStorage.clearAll`/
`resetDemoData`, a `PREFIX`-seprés) automatikusan lesepri, külön kód
nélkül — ugyanaz a garancia, amit a `DemoStorage.ts:56-61` kommentje már
dokumentál a piszkozat-kulcsra.

**Írás:** minden `updateTemplateDraft` híváskor (nincs debounce — a
`localStorage`-írás szinkron és olcsó, a meglévő minta sem debounce-ol
sehol).

**Visszaállítás:** néma — betöltéskor, ha van cache-elt piszkozat egy
base-hez, az kerül a `draft` mezőbe az `original` helyett; a meglévő „Nem
mentett módosítás" felirat (már ma is `draft !== original` alapján dönt)
ezt automatikusan jelzi, nincs külön banner/Callout.

**Törlés:** kizárólag sikeres mentéskor, base-enként — a
`handleSaveTemplates` sikeres ágában az adott base piszkozat-cache
bejegyzése törlődik. Nincs külön „piszkozat elvetése" gomb.

**Miért:** a tét itt lényegesen kisebb, mint a Terv-piszkozatnál — nincs
GDPR-érzékeny páciensadat, csak szövegbevitel elvesztése. A docs/05
2. fázis-terve erről a funkcióról egyáltalán nem beszél, nem indokolt
előre formalizálni egy még nem specifikált interfészt egy alacsony tétű
kényelmi funkcióhoz. A néma visszaállítás + a meglévő "Nem mentett
módosítás" felirat elég visszajelzés ehhez a tét-szinthez — nincs itt
felülírás-elleni AlertDialog-ra szükség, mert nincs "korábbi mentett terv"
felülírásának kockázata, csak egy szerkesztődoboz tartalmáról van szó.

### 5. Dupla-kattintás elleni zár a „Szöveg mentése" gombon (a felhasználó kérésére, ebbe a körbe véve)

Felülvizsgálati találat: a „Szöveg mentése" gomb `disabled={templatesLoading
|| templateSaving || !templatesDirty}` — ugyanaz a minta, amit a P0-1
review-találat (lásd `PreviewPage.tsx` `savingRef` kommentje, kb. 53-56.
sor) kifejezetten elégtelennek minősített, mert egy második kattintás a
React-render ELŐTT is lefuthat.

**Megoldás:** ugyanaz a `useRef`-alapú in-flight zár, mint a `PreviewPage
.tsx` `savingRef`-je — egy `templateSavingRef` a `handleSaveTemplates`
elején ellenőrizve/beállítva, a `finally`-ban visszaállítva, függetlenül a
React state-frissítés időzítésétől.

**Miért:** ez a gyakorlatban alacsonyabb kockázatú, mint a `PreviewPage`-en
volt (a `saveTemplate` szinkron `localStorage`-írás, nincs benne valódi
async I/O-rés — lásd a Probléma-elemzés a korábbi grill-me körben), de
ugyanaz a hiányzó védelem, ami máshol már bevált mintaként létezik a
kódban — nem indokolt itt máshogy csinálni.

**Nem cél:** a `commit()`/`patch()` functional-updater hiánya (a
`docs/08-backlog.md` „Technikai adósság" szakaszában már névvel nevezett,
L-méretű architektúra-tétel) és a részleges-mentési-hiba UI-tükrözési
következetlenség (ha két sablon egyszerre mentődik és a második elhasal,
az első sikeres írása nem tükröződik vissza azonnal a state-be) NEM
tartozik ebbe a tételbe — ezek a már azonosított, nagyobb architektúra-
tétel tünetei, nem ad hoc javítandók itt.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `nemetEngedelyezve`/D21 hiányzó-tételnév figyelmeztetés** — külön,
  már működő mechanizmus (`hianyzoNevek`/`confirmStep === 'de-fallback-
  names'`), ez a tétel nem nyúl hozzá.
- **A `{{orvos}}` mail-merge helyőrző (`fillPlaceholders`,
  `pdf/markdownLite.ts`)** — teljesen más fogalom, mint a
  `[PLACEHOLDER]`/`[PLATZHALTER]` jogi-lezáratlanság jelölő, bár mindkettő
  a „placeholder" szót használja. Nem keverendő össze, a tervben
  végig külön kezelve.
- **A `statusz: 'VEGLEGES'`/„Csak ajánlat" kapcsolat átgondolása** — ma a
  `doFinalize()` mindig `VEGLEGES`-re állít, `offerOnly`-tól függetlenül;
  ez a meglévő, nem ennek a tételnek a hatóköre tartozó szemantika,
  változatlan marad.
- **`commit()`/`patch()` functional updater bevezetése általánosan** — a
  már névvel nevezett, L-méretű architektúra-tétel; ez a tétel csak a
  konkrét dupla-kattintás-rést zárja a `savingRef`-mintával, nem oldja meg
  az egész osztályát.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/templates.ts` (ÚJ) — `isPlaceholderTemplate(body: string): boolean`.
- `app/src/storage/DemoStorage.ts` — a privát `isPlaceholderTemplate` törlése,
  import a `domain/templates.ts`-ből.
- `app/src/pages/SettingsPage.tsx`
  - a privát `isPlaceholderBody` törlése, import a `domain/templates.ts`-ből.
  - sablon-piszkozat `localStorage` olvasás/írás a `dp:sablon-piszkozat`
    kulcson (4. döntés).
  - `templateSavingRef` bevezetése a `handleSaveTemplates`-hez (5. döntés).
- `app/src/pages/PreviewPage.tsx`
  - a sablon-betöltő `useEffect` (kb. 58-116. sor) kiegészítése: a
    fizetési feltételek ágán placeholder-ellenőrzés + fallback (2. döntés).
  - új derived állapot: `nyilatkozatIsPlaceholder = isPlaceholderTemplate(nyilatkozatMd)`.
  - `offerOnly` kényszerítése + a checkbox `disabled` propja (1. döntés).
  - új piros `Callout.Root` a nyilatkozat-zárhoz; a meglévő `sablonFallback`
    Callout szövegének pontosítása (2. döntés).
- `app/src/domain/templates.test.ts` (ÚJ) — az `isPlaceholderTemplate`
  predikátum tesztje (mindkét jelölő forma + valódi szöveg negatív eset).
- `app/src/pages/PreviewPage.test.tsx` — új tesztek: alapértelmezett német
  terv → nyilatkozat-zár aktív (checkbox bepipálva/letiltva, piros Callout);
  csak a fizetési feltételek placeholder (egyedi seed, a nyilatkozat valódi
  szöveggel) → sárga fallback Callout, checkbox NEM letiltott, véglegesítés
  simán megy.
- `app/src/pages/SettingsPage.test.tsx` — új tesztek: piszkozat túléli az
  oldalról-elnavigálást-és-visszatérést (4. döntés); dupla-kattintás a
  „Szöveg mentése" gombon csak egy új verziófájlt hoz létre (5. döntés).
- `docs/08-backlog.md` — a 6. tétel leírásának korrekciója implementáció
  után (a szerkesztő-rész "KÉSZ" jelölése, elavult mondat törlése) — az 1.
  és 2. tétel mintája szerint.
