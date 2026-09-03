# Backlog 105. tétel — Sikerképernyő: mit fogadott el a doki véglegesítéskor — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 105. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** háttérfájl nélküli felvetés, a `pages/PreviewPage.tsx` mentés
utáni ágának közvetlen áttekintéséből.

## Probléma

- A `pages/PreviewPage.tsx` `savedRef` ága (a „A terv elmentve ✓" korai
  `return`) pontosan négy dolgot rendereli: a zöld sikerüzenetet, a
  `patientDir / planDir / versionDir` mono sort, legfeljebb két amber
  jelzést (a terv-címke írási hibája, illetve a piszkozat-takarítás
  hibája), és két gombot. A véglegesítés-őr checklistje
  (`pages/previewPage/VeglegesitesChecklist.tsx`) ebben az ágban nem
  szerepel — a korai `return` miatt a `csekklista` el sem jut a renderig.
- A doki a gombnyomás ELŐTT tudatosan elfogad puha figyelmeztetéseket
  (kézzel felülírt ajánlati ár, kimaradó nyomtatvány-szakasz, 0 összegű
  sor, nyelvi ellenőrzésre váró szöveg). A kattintás után ez a lista
  nyomtalanul eltűnik: sem a képernyőn, sem a mentett fájlokban nincs
  belőle semmi. Ha a doki utólag akarja ellenőrizni, „mi is volt még
  nyitva", a tervet új verzióként kellene újranyitnia.
- A `nyilatkozat-placeholder` info-tétel — ami azt mondja ki, hogy a
  kiadott PDF-ből az aláírás-oldal KÉNYSZERÍTVE kimaradt — ugyanígy
  eltűnik, pedig ez közvetlenül a ténylegesen kiadott dokumentum
  tartalmáról szól.
- A `doFinalize()` a mentés közben ÚJRAOLVASSA a páciens törzsadatát
  (`storage.loadPatientData`, a `masterPaciens` frissítéséhez) — a mentés
  utáni pillanatban egy élő újraszámolás tehát már MÁS
  `torzsadat-elteres` tételt adhatna, mint amit a doki a gombnyomáskor
  látott.

## Döntések

### 1. Tisztán megjelenítés — semmi nem kerül a `terv.json`-ba

A sikerképernyő felsorolja a véglegesítéskor fennállt figyelmeztetéseket,
és a lap elhagyásával a felsorolás eltűnik. Sem a `Plan`, sem bármely
más séma nem kap új mezőt; a `schemaVersion` marad `1`.

**Miért:** a `terv.json` a dokumentum TARTALMÁNAK pillanatképe
(`docs/02-domain-modell.md` § „Miért van `nevSnapshot` és `listaEgysegar`
a soron") — egy „mit látott a doki a mentés pillanatában" napló nem
tartalom, hanem az alkalmazás working-state-je. Ugyanaz az elv választja
el ma is a technikai hibákat (sablon-, PDF-, mentési hiba) a
checklist-modelltől (`docs/03-funkcionalis-spec.md` § „Véglegesítési
checklist"). A `docs/02` minden eddigi additív mezőbővítése a dokumentum
tartalmáról szólt; ez lenne az első kivétel.

**Elvetett alternatíva — mentett audit-nyom a `terv.json`-ban:** a
döntési interjúban felmerült (opcionális, additív mező a `csakAjanlat`
mintáján, `schemaVersion` emelése nélkül), és ezzel a Terv részletei lap
évek múlva is meg tudná mutatni, mit fogadott el a doki. A felhasználó
elvetette: a tétel megnevezett fájdalma a sikerképernyő, nem a hosszú
távú auditálhatóság. Ha a tartós nyom később mégis kell, az önálló
backlog-tétel, saját döntési interjúval.

### 2. A lista tartalma: minden `soft` és `info` tétel, ami a gombnyomáskor fennállt

A felsorolás a `domain/veglegesitesOr.ts` `veglegesitesDiagnozis()`
kimenetének teljes `soft` + `info` része, a mai push-sorrendben. `hard`
tétel definíció szerint nem szerepelhet benne: amíg van ilyen, a
„Véglegesítés és mentés" gomb letiltott (`vanKemenyBlokk()`), tehát
mentés sem történhet.

**Miért:** az `info` szint négy tétele (`nyilatkozat-placeholder`,
`torzsadat-elteres`, `orokolt-kezi-ar`, `orokolt-fazismegjegyzes`)
ugyanúgy olyan tény, amit a doki a véglegesítés pillanatában tudomásul
vett — a `nyilatkozat-placeholder` ráadásul a legerősebb jelöltje a
visszatekintésnek, mert a ténylegesen kiadott PDF-ből hiányzó
aláírás-oldalról szól. A szűrés a súlyosság szerint ezen a képernyőn
önkényes lenne: a lista amúgy sem hosszú.

**Elvetett alternatívák:** csak a puha tételek (kihagyná a
`nyilatkozat-placeholder`-t, épp a legrelevánsabbat); puha + kizárólag a
`nyilatkozat-placeholder` (két, egymástól eltérő szabály ugyanazon
`info` szint tételeire — indokolhatatlan kivétel).

### 3. Befagyasztott pillanatkép, nem élő újraszámolás

A `doFinalize()` a mentés megkezdése ELŐTT rögzíti az aktuális
`csekklista` értéket, és a sikerképernyő ezt jeleníti meg — a `savedRef`
mintáján, önálló állapotként, nem a minden renderben újraszámolt élő
értékből.

**Miért:** a `doFinalize()` maga olvassa újra a páciens törzsadatát a
mentés közben, tehát egy élő újraszámolás a `torzsadat-elteres` tételt
megjelenítheti vagy eltüntetheti ahhoz képest, amit a doki a
gombnyomáskor látott — pontosan a tétel célját (mit fogadott el)
hazudtolná meg. Mellékesen ez teszi a listát stabillá minden más késve
érkező async forrással szemben is (sablonbetöltés, fogtérkép-PNG).

**Elvetett alternatíva — a mai, élő `csekklista` változatlan
újrahasználása:** kevesebb állapot, de a fenti eltérés miatt a
sikerképernyő olyan listát mutathatna, amit a doki soha nem látott.

### 4. Megjelenítés: a meglévő checklist-render újrahasználva, navigációs gombok nélkül

A `pages/previewPage/VeglegesitesChecklist.tsx` rendereli a listát a
sikerképernyőn is — ugyanazokkal a súlyosság-színekkel (amber/szürke) és
`reszletek` névlistákkal, mint a mentés előtt, de EGYETLEN gomb nélkül:
sem a `route`-alapú navigációs gombok („Vissza a szerkesztőbe", „Terv
adatai", „Beállítások", „Nyomtatvány szövegei"), sem a `nyelvi-review`
tétel „Irányított ellenőrzés" akciója nem jelenik meg.

**Miért gombok nélkül:** a piszkozat ekkor már törölve van
(`markPlanSaved`), aktív terv-draft nem létezik — egy „Vissza a
szerkesztőbe" gomb nem a most mentett verzióba, hanem egy üres/alapállapotú
szerkesztőbe vinne. Ugyanezért értelmetlen a guided review indítása is:
nincs mit szerkeszteni.

**Miért ugyanaz a komponens:** egy külön, párhuzamos renderelő a
checklist fő renderjétől idővel szét-driftelne (szöveg, szín,
részlet-formátum) — ugyanaz az érv, ami a `sorElteres()` és a
`components/Section.tsx` konszolidációját is indokolta. Mellékesen így a
sikerképernyő automatikusan örökli a 101. tétel jelvény-renderelését is,
ha az előbb valósul meg.

**Elvetett alternatívák:** egyetlen semleges, szürke összefoglaló doboz
csak a tételek `cim`-ével — elveszne, MELY sorok voltak érintve, ami
éppen az utólagos ellenőrzés lényege; összecsukható blokk — új
interakciós elem egy eddig teljesen statikus lapon, miközben a lista
jellemzően rövid.

### 5. Elhelyezés és bevezető szöveg

A felsorolás az útvonal-sor és a két gomb KÖZÖTT jelenik meg, a meglévő
két amber jelzés (terv-címke írási hibája, piszkozat-takarítás hibája)
UTÁN, balra igazítva — a mai amber `Callout`-ok `textAlign: 'left'`
mintáján, a középre igazított sikerpanelen belül.

Egy halk, magyarázó bevezető sor előzi meg, mert a lista puszta
megjelenése a mentés UTÁN nem magától értetődő. A bevezető semlegesen,
múlt időben fogalmaz („Ezek a figyelmeztetések álltak fenn a
véglegesítéskor") — nem „ezeket fogadtad el" alakban, mert az `info`
tételek nem elfogadást igényelnek, csak tájékoztatnak.

**Miért ez a sorrend:** az útvonal-sor a mentés TÉNYÉT zárja le, a két
gomb a KÖVETKEZŐ lépést nyitja — a visszatekintés e kettő közé
tartozik. A két amber hibajelzés az imént lezajlott mentés
mellékhatásáról szól, tehát szorosabban kötődik a fenti sikerüzenethez,
mint a terv tartalmáról szóló felsoroláshoz.

### 6. Nulla puha/info tétel esetén a sikerképernyő pontosan a mai marad

Ha a véglegesítés pillanatában egyetlen `soft`/`info` tétel sem állt
fenn, sem lista, sem bevezető sor, sem pozitív megerősítő mondat nem
jelenik meg — a képernyő bájtra a mai.

Ez azt is jelenti, hogy a `VeglegesitesChecklist` mai üres-állapot
szövege („Nincs figyelmeztetés vagy hiányzó adat — a terv
véglegesíthető.") sem kerülhet ide: az jövő idejű, a mentés ELŐTTI ágra
szabott mondat.

**Miért:** a tétel egy elveszett információt pótol, nem egy új gratuláló
elemet vezet be. Egy figyelmeztetés nélkül lezárt terv esetén a zöld
pipa önmagában elmondja ugyanazt.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Tartós, `terv.json`-ba mentett audit-nyom**, és annak megjelenítése a
  Terv részletei lapon — az 1. döntésben explicit elvetve; ha később
  mégis felmerül, önálló backlog-tétel.
- **A checklist tartalmának, sorrendjének, szövegének vagy jelvényeinek
  módosítása** — ez a nyitott 101. tétel hatóköre
  (`backlog/plans/backlog-101-checklist-rangsor-szamlalo-terv.md`). A 105.
  tétel a MEGLÉVŐ rendert használja újra, semmit nem módosít rajta; a két
  tétel bármelyik sorrendben megvalósítható, a később következő
  automatikusan örökli a másik eredményét.
- **A `domain/veglegesitesOr.ts` bővítése** — sem a `CsekklistaTetel`
  modell, sem a `veglegesitesDiagnozis()` nem változik.
- **Bármi a nyomtatványon** — a véglegesítés-őr jelzései soha nem
  kerülnek PDF-be, ez a tétel ezen nem változtat.
- **A sikerképernyő gombjainak, útvonal-sorának átalakítása**, letöltés-
  vagy „Megnyitás" gomb hozzáadása — nem része ennek a tételnek.
- **A `hard` tételek megjelenítése a sikerképernyőn** — definíció szerint
  nem lehet ilyen, amíg a gomb `vanKemenyBlokk()` esetén letiltott.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PreviewPage.tsx` — a `doFinalize()` befagyasztó lépése
  (a mentés megkezdése előtt), és a `savedRef` ág renderje (5. döntés
  szerinti elhelyezés, 6. döntés szerinti üres-eset kihagyás).
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — a gombok
  nélküli, csak-olvasó megjelenítés lehetősége. A mentés ELŐTTI ág
  viselkedése (route-gombok, guided-review gomb, üres-állapot szöveg)
  változatlan marad.
- `app/src/domain/veglegesitesOr.ts` — VÁLTOZATLAN.
- Tesztek: `app/src/pages/PreviewPage.test.tsx` — a sikerképernyőre váró
  `'A terv elmentve ✓'` assertion már sok teszteset végén ott van, az
  újak ezek mellé illeszkednek; a mentés előtti ág meglévő
  checklist-assertjeit nem szabad megzavarni (a két ág ugyanazt a
  szöveget rendereli, tehát a lekérdezéseknek egyértelműnek kell
  maradniuk).
- `app/src/dokumentacioGuard.baseline.json` — a doc-marker számok
  frissítése, ha a változtatás közben módosulnak.
- Lezáráskor bővítendő dokumentáció: `docs/03-funkcionalis-spec.md` § 4.
  „Sikeres véglegesítés" (ma kizárólag az útvonalat és a két gombot
  sorolja fel).

## Tesztelés (irányadó, nem kimerítő)

- Egy puha (pl. `nulla-osszegu-sor`) ÉS egy info (pl.
  `torzsadat-elteres`) tételt is tartalmazó terv véglegesítése után
  mindkettő megjelenik a sikerképernyőn, a mentés előttivel megegyező
  szöveggel és `reszletek` névlistával.
- A sikerképernyőn megjelenő tételeken NINCS „Vissza a szerkesztőbe" /
  „Terv adatai" / „Beállítások" / „Nyomtatvány szövegei" gomb, és a
  `nyelvi-review` tételen sincs „Irányított ellenőrzés" gomb.
- Ha a `storage.loadPatientData` a `doFinalize()` közbeni újraolvasáskor
  MÁS törzsadatot ad vissza (a `torzsadat-elteres` megszűnne vagy
  újonnan megjelenne), a sikerképernyő továbbra is a GOMBNYOMÁSKORI
  állapotot mutatja.
- Figyelmeztetés nélküli terv véglegesítése után a sikerképernyő
  változatlan: nincs lista, nincs bevezető sor, és nem jelenik meg a
  „Nincs figyelmeztetés vagy hiányzó adat…" szöveg sem.
- A mentés ELŐTTI ág változatlan: route-gombok, guided-review gomb és az
  üres-állapot szöveg ugyanúgy működik, mint ma.
- A `cimkeHiba` és a `piszkozatTorlesHiba` amber jelzései továbbra is
  megjelennek, és a felsorolás FÖLÖTT állnak.
- Egy sikertelen mentés (`saveError`) után továbbra sem jelenik meg
  sikerképernyő, tehát felsorolás sem.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/` alatt.
