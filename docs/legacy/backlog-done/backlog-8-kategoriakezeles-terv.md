# Backlog 8. tétel — Árlista-nap: kategóriakezelés kódban — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 8. tételének kódrészét rögzíti
implementáció-indításhoz (`grill-me` munkamenet). A tétel eredeti leírása
két félből áll: „kategóriakezelés kódban" + „fél nap közös munka a
dokival az adatra". **Ez a terv kizárólag az elsőt fedi le** — az
adattisztítás (gyakori-csillagok, elgépelések, duplikátumok) emberi
munka, nem ide tartozik, és a kategóriakezelés kódja csak előfeltétele,
nem része neki.

A munkamenet során kiderült, hogy a doki eredeti ötlete (a fogtérkép
kategóriánkénti színeinek szerkeszthetővé tétele) egy jelenleg rejtett
architekturális réteget érint — ezért a terv mérete **nagyobb, mint az
eredeti fél napos becslés** (lásd 1. döntés). Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja a megvalósító feladata.

## Probléma (a mai állapot)

**Nincs kategória-CRUD.** A `PriceListAdminPage.tsx` `ItemEditor`-ja
(`kategória` mező) csak egy meglévő kategóriák közötti Select-et ad —
kategória létrehozása, átnevezése, törlése vagy sorrendezése sehol nincs
a felületen. A `ui/PriceListAdmin.jsx` prototípusban sincs, a CLAUDE.md
ezt név szerint dokumentálja: „Kategória hozzáadás/átnevezés NINCS a
prototípusban sem — csak a meglévők közötti mozgatás."

**A fogszín NEM kategóriánkénti.** A `app/src/design/treatmentVisuals.ts`
ma egy rejtett köztes réteget tartalmaz: a 12 valódi árlista-kategória
(`k01`–`k12`) mindegyike egy fix, 8 elemű `KezelesVizual` „vödör" egyikébe
van kódban belehuzalozva (`KATEGORIA_VIZUAL`), és csak a vödör kap színt,
feliratot és ütközési prioritást (`KEZELES_VIZUALOK`,
`KEZELES_VIZUAL_PRIORITAS`). Ezt a réteget nyolc fájl használja: a webes
fogtérkép (`design/toothChartSvg.ts`), a PDF fogtérkép
(`pdf/ToothChartPdf.tsx`), a jelmagyarázat (`components/DentalChartLegend.tsx`),
a fogankénti állapotszámító (`domain/toothVisual.ts`) és ezek tesztjei.

## Döntések

### 1. Méret és sorrend — egyben, egy körben

A kategória-CRUD és a szín-architektúra átírása egy összefüggő
változtatásként megy: egy új kategóriának azonnal kell szín, tehát a
kettő szétválasztása kétszeri hozzányúlást jelentene ugyanazokhoz a
fájlokhoz. Becsült méret **1.5–2 fejlesztői nap** (nem az eredeti fél
nap — az eredeti becslés csak a CRUD-ot, nem a szín-architektúra
átírását fedte).

**Miért:** a doki explicit kérte mindkettőt egy `grill-me` körben, és a
fázisolt alternatíva (előbb CRUD, utána szín) egy átmeneti állapotot
hozna létre, ahol egy új kategóriát kézzel kellene besorolni a régi 8
vödör valamelyikébe — ez maga is munka, amit a végleges megoldás úgyis
eltöröl.

### 2. Szín-architektúra — direkt kategória-szín, a vödör-réteg megszűnik

A `KezelesVizual` unió típus, a `KEZELES_VIZUALOK`, `KEZELES_VIZUAL_PRIORITAS`
és `KATEGORIA_VIZUAL` exportok megszűnnek. A `Kategoria` típus (`domain/types.ts`)
új `szin: string` mezőt kap (hex érték). A fogtérkép, a jelmagyarázat és a
PDF innentől közvetlenül a kategória `szin` mezőjéből olvas, a
`vizualKategoriaFor(kategoriaId)` segédfüggvény pedig a kategóriát magát
adja vissza (vagy az „ismeretlen" tartalékot, lásd 7. döntés) a mai
vödör helyett.

**Miért:** a doki mentális modellje már ma is „kategóriánkénti szín" —
a vödör-réteg egy implementációs részletező-döntés volt, ami csak addig
volt indokolt, amíg nem volt kategória-CRUD. Most, hogy lesz, a két
fogalom (kategória, vödör) párhuzamos fenntartása felesleges komplexitás
lenne.

### 3. Ütközési prioritás forrása — a meglévő `sorrend` mező

Nincs új mező a prioritásra. A `resolveToothVisual` (`domain/toothVisual.ts`)
mostantól a kategóriák `sorrend` szerinti sorrendjét használja: ha egy
fogon több kezelés van, a legkisebb `sorrend`-ű kategóriájú kezelés
színe nyer (kivéve a 7. döntés szerinti tartalékot, ami mindig veszít).

**Miért:** a doki ezt választotta a külön prioritás-mező helyett — kevesebb
fogalom, és a kategória-lista sorrendje amúgy is egyfajta „fontossági
sorrendet" fejez ki. Tudatos mellékhatás: a kategóriák átrendezése (10.
döntés) innentől nemcsak a lista-/PDF-sorrendet, hanem a fogszín-ütközés
kimenetelét is befolyásolja.

### 4. Színválasztó UI — kurált paletta, nem szabad hex

A kategória-szerkesztő egy előre összeállított, egymástól jól
megkülönböztethető színkészletből enged választani (a mai 8 vödör-szín
kiindulásként, kiegészítve további, hasonlóan megkülönböztethető
árnyalatokkal, hogy elegendő legyen akár 16+ kategóriára is). Nincs
natív `<input type="color">` vagy szabad hex mező.

**Miért:** garantáltan olvasható marad a fogtérképen és a jelmagyarázatban
— szabad választás mellett a doki választhatna egy fehérhez közeli vagy
két kategóriára is ugyanolyan árnyalatot adó színt anélkül, hogy ezt a
felület jelezné.

### 5. Új kategória alapszíne és a szín-ütközés kezelése

Új kategória létrehozásakor egy semleges szürke alapszínt kap, amit a
doki utólag módosíthat. Két kategória kaphat azonos színt — a felület
ezt nem jelzi és nem tiltja.

**Miért:** a doki ezt választotta az explicit figyelmeztetés helyett —
egy adott terv valószínűleg úgysem használ egyszerre minden kategóriát,
és a felesleges figyelmeztetés-logika nem éri meg a hasznot.

### 6. Meglévő adat migrálása

A `data/arlista.seed.json` 12 kategóriája megkapja a `szin` mezőt, a
MAI (a válasz idején érvényes) vödör-színezésnek megfelelő értékkel — a
doki első betöltéskor ugyanazt a fogtérkép-kinézetet látja, mint most.
Mivel a `szin` egy additív mező (nincs `schemaVersion`-emelés, lásd 15.
döntés, a 9. backlog-tétel precedense szerint), egy már létező (böngésző
`localStorage`-ban tárolt demó) árlistán hiányozhat — ilyenkor a
kategória az 5. döntésben leírt semleges szürkét kapja runtime
alapértelmezésként, nem hibát.

**Miért:** a cél, hogy a funkció bevezetése önmagában ne okozzon vizuális
regressziót — a doki csak akkor lát színváltozást, ha ténylegesen
szerkeszt egy kategóriát.

### 7. Eltévedt hivatkozás színe — fix, nem szerkeszthető tartalék

Ha egy sor `tetelId`-je nincs a mai árlistában (pl. a demó tervek hibás
id-jai, 14. backlog-tétel), vagy egy tétel `kategoriaId`-ja nem létező
kategóriára mutat, a fog egy kódban rögzített, NEM szerkeszthető,
semleges szürke „Ismeretlen kategória" színt kap (a mai `EGYEB` szürkéje,
`#adb5bd`). Ez a tartalék mindig a legalacsonyabb prioritású a 3.
döntés szerinti ütközés-feloldásban — soha nem nyer, ha a fogon van
másik, valódi kategóriájú kezelés is. Nem jelenik meg a kategória-
karbantartó felületen, mert nem valódi kategória.

**Miért:** a doki ezt választotta, mert az alternatíva (az első valódi
kategória színét adni) félrevezető lenne — úgy nézne ki, mintha a fog
tényleg abba a kategóriába tartozna.

### 8. Kategória törlése — csak üres kategória, valódi törlés

Egy kategória csak akkor törölhető, ha **egyetlen tétel sem** hivatkozik
rá — sem aktív, sem inaktív (`aktiv: false`) tétel. Ha van rá
hivatkozás, a törlés gomb le van tiltva, tooltippel/szöveggel: „előbb
mozgasd át a hozzá tartozó tételeket". Üres kategóriánál valódi törlés
történik a `kategoriak` tömbből — nincs `aktiv` mező a `Kategoria`
típuson.

**Miért:** a D17 (item-id soha nem hasznosítjuk újra) kifejezetten az
ártétel-id-re vonatkozik, nem a kategóriára — semmi (sem `Sor`, sem
`Tetel` aktív állapotban) nem hivatkozik kategóriára tartalmilag azon
túl, hogy egy `Tetel.kategoriaId`-ja rá mutat, és ezt a törlés-tiltás már
kizárja. Az inaktív tételek számítása szükséges: egy `aktiv: false`
tétel bármikor visszakapcsolható a táblázat „Aktív" ikonjával
(`PriceListAdminPage.tsx`), tehát egy csak aktív tételek alapján
„üresnek" ítélt kategória valójában nem az.

### 9. Kategória-id generálása

Új export, `nextKategoriaId()` (`domain/priceListIds.ts`), a meglévő
`nextTetelId()` mintájára: a meglévő legnagyobb `kNN` utáni szám, nem a
lista hossza (hogy egy törlés után ne csússzon vissza és ütközzön egy
korábban törölt id-vel).

### 10. Kategória átrendezése — fel/le nyilak

Minden kategória-soron egy fel/le `IconButton` pár cseréli meg a
szomszédos `sorrend` értékeket — ugyanaz a mintázat, mint a táblázat
Gyakori/Aktív ikon-oszlopai. Nincs drag & drop — az app tudatosan
billentyűzet-első tervezésű (CLAUDE.md „A UX kritikus pontja"), egy dnd
könyvtár új, egér-alapú interakciót és függőséget vezetne be.

### 11. UI elhelyezés — összecsukható szekció az Árlista admin tetején

A kategória-karbantartó egy új, alapból becsukott „Kategóriák" panel a
`PriceListAdminPage.tsx` tétel-táblázata felett — nincs új route/oldal.

**Miért:** a doki egy helyen csinálja a takarítást (kategória
létrehozás/átnevezés/sorrendezés ÉS a tételek kategóriák közötti
mozgatása), oda-vissza navigálás nélkül.

### 12. Kategória szerkesztése — sorkénti kinyitás

Kattintásra kinyíló sor, a mai `ItemEditor` mintájára: HU név (kötelező)
és DE név (opcionális, mint a tételeknél) mező, plusz a 4. döntés
szerinti színpaletta-választó.

### 13. Jelmagyarázat fordítása — csendes HU-visszaesés, nincs jelvény

A `DentalChartLegend.tsx` a kategória nevét a meglévő
`resolveNev(kategoria.nev, nyelv)`-vel oldja fel — ha egy új kategóriának
nincs még DE neve, a jelmagyarázat csendben magyarra esik vissza,
`HU` jelvény vagy egyéb figyelmeztetés NÉLKÜL.

**Miért:** a `HU` jelvény és a `fallbackSorok` véglegesítés-őr (D21,
`domain/nev.ts`) kifejezetten a SOROK (ténylegesen ajánlott, árazott
tételek) nevére vonatkozik, mert azok a szerződéses dokumentum tartalma.
A jelmagyarázat dekoratív — a fogtérkép színkulcsa, nem egy ajánlott
tétel neve —, ugyanaz a hallgatólagos-visszaesés minta helyénvaló rá,
mint amit a `resolveNev` már ma is biztosít.

### 14. Színes jelvény a tétel-szerkesztő Kategória legördülőjében

Az `ItemEditor` (`PriceListAdminPage.tsx`) „Kategória" Select-jének
minden opciója egy kis színes pötty jelvényt kap a kategória neve
mellett, a kategória `szin` mezőjéből.

**Miért:** olcsó kiegészítés (a szín már úgyis elérhető adat), és
közvetlenül megerősíti a doki számára, hogy a most választott kategória
melyik fogtérkép-színt fogja adni — nem kell külön a fogtérképre nézni
vagy megjegyeznie.

### 15. Séma — nincs `schemaVersion`-emelés

A `Kategoria.szin` egy additív, visszafelé kompatibilis mező (a 9.
backlog-tétel precedense szerint: opcionális/hiányozható mező bevezetése
nem emeli a `schemaVersion`-t). A D18 (magasabb verzió betöltésének
megtagadása) ettől függetlenül érvényben marad — ez a döntés csak azt
mondja ki, hogy ez a változtatás NEM számít verzió-emelést igénylő
séma-törésnek.

## Tesztek

- `domain/priceListIds.test.ts` (ÚJ eset): `nextKategoriaId()` — üres
  lista, meglévő `kNN` sorozat, törlés utáni id nem ismétlődik.
- `domain/toothVisual.test.ts`: a `resolveToothVisual` és
  `vizualKategoriaFor` tesztjeinek átírása a vödör-alapú elvárásokról
  kategória-alapúra; új eset az eltévedt hivatkozás tartalék-színére
  (7. döntés) és a `sorrend`-alapú ütközés-feloldásra (3. döntés).
- `design/toothChartSvg.test.ts`, `components/DentalChart.test.tsx`,
  `pdf/ToothChartPdf` érintett tesztjei: a hardkódolt vödör-színek
  helyett dinamikus kategória-színekre állnak át.
- `pages/PriceListAdminPage.test.tsx` (ÚJ esetek): kategória létrehozás,
  átnevezés, átrendezés (fel/le), törlés tiltása nem üres kategórián,
  törlés sikeres üres kategórián (aktív ÉS inaktív tétel eseteire
  külön), színválasztás a kurált palettából.
- Kézi ellenőrzés (a doki felé jelezve, nem automatizálható): a PDF
  fogtérkép és a webes fogtérkép vizuálisan egyezik az admin kategória-
  panelben beállított színekkel, migráció után (6. döntés) az eredeti
  seed-adat betöltésekor nincs látható színváltozás.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Adattisztítás a dokival** (gyakori-csillagok, elgépelések,
  duplikátumok, `Besorolatlan`/francia maradványtételek átmozgatása) —
  a backlog-tétel másik fele, emberi munka, ez a kódrész csak
  előfeltétele (a tételek átmozgatása kategóriák között már ma is
  működik).
- **20%-os verzió** (csak gyakori-csillagozás + öt elgépelés javítása,
  kategóriakezelés nélkül) — a backlog szövege szerint ez kód nélkül,
  most azonnal mehetne, de nem oldja meg a `k01 Besorolatlan` és a
  francia maradványtételek rendbetételét kategória-CRUD nélkül. Ez a
  terv a teljes verziót fedi le, nem ezt.
- **Fuzzy/elgépelés-tűrő keresés** — a 7. backlog-tétel dolga, nem ez.
- **Tömeges árváltoztatás** (pl. „minden implantátum ára +5%") — KÉSŐBB
  lista, nem ide tartozik.
- **Kategória-böngésző a keresőben** — a D19 kifejezetten kizárja,
  ehhez a tételhez sincs köze (a kereső változatlanul search-only marad).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `Kategoria` új `szin: string` mezője.
- `app/src/domain/priceListIds.ts` — új `nextKategoriaId()` export
  (9. döntés).
- `app/src/design/treatmentVisuals.ts` — a `KezelesVizual` típus,
  `KEZELES_VIZUALOK`, `KEZELES_VIZUAL_PRIORITAS`, `KATEGORIA_VIZUAL`
  exportok megszűnnek; új export a kurált színpalettához (4. döntés) és
  az eltévedt hivatkozás tartalék-színéhez (7. döntés).
- `app/src/domain/toothVisual.ts` — `vizualKategoriaFor`,
  `resolveToothVisual` átírása kategória-alapúra, `sorrend`-alapú
  ütközés-feloldás (3. döntés).
- `app/src/components/DentalChartLegend.tsx` — a kategória `nev`/`szin`
  mezőjéből olvas, `resolveNev` csendes visszaeséssel (13. döntés).
- `app/src/design/toothChartSvg.ts`, `app/src/pdf/ToothChartPdf.tsx` —
  a vödör-szín-olvasás lecserélése kategória-szín-olvasásra.
- `app/src/pages/PriceListAdminPage.tsx` — új „Kategóriák" panel (11–12.
  döntés: létrehozás, átnevezés, átrendezés, törlés), az `ItemEditor`
  Kategória Select-jének színes jelvénye (14. döntés).
- `data/arlista.seed.json` — a 12 kategória `szin` mezője (6. döntés).
- `app/src/domain/toothVisual.test.ts`, `design/toothChartSvg.test.ts`,
  `components/DentalChart.test.tsx`, `pages/PriceListAdminPage.test.tsx`,
  `domain/priceListIds.test.ts` — lásd „Tesztek".
- `docs/02-domain-modell.md` — a `Kategoria` JSON séma példájának
  frissítése a `szin` mezővel.
- `CLAUDE.md` — a „Meglévő segédfüggvények" szakasz frissítése: a
  megszűnő `KEZELES_VIZUALOK`/`KEZELES_VIZUAL_PRIORITAS`/`KATEGORIA_VIZUAL`
  hivatkozások cseréje az új exportokra.
- `docs/08-backlog.md` — a 8. tétel kódrészének „KÉSZ" jelölése
  implementáció után, a dátummal, az 1–3. tétel mintája szerint (az
  adattisztítás fele külön marad nyitva).
