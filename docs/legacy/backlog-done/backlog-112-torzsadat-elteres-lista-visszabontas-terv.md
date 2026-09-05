# Backlog 112. tétel: A terv-lánc lista törzsadat-eltérés jelzésének visszabontása — döntési összefoglaló

Ez a fájl a 112. tétel megbeszélt döntéseit rögzíti. A tétel a 104. tétel
(`backlog/done/backlog-104-torzsadat-elteres-lanc-listan-terv.md`) teljes
kódját és dokumentációját bontja vissza.

## Probléma

A doki egy `/grill-me` munkamenetben nézte át a 104. tétel eredményét: a
Korábbi tervek fáján minden verziósor amber jelvényt kapott, ha a páciens
törzsadata eltért a mentett pillanatképtől. Két konkrét panasza volt: (1)
a felirat nem mondja meg, MI változott — a páciens törzsadata, a kezelési
sorok vagy az árak; (2) ennyi információ nem való ebbe a listanézetbe. A
lelet forrása egy doctor-persona review agent volt, nem a valódi doki.

A grillezés a következő tényeket tárta fel:

- A jelvény szám-alapú, a mezőneveket csak `title`-ben (egérrel, nem
  billentyűzettel/érintéssel) adja, az értékeket sehol — kattinthatatlan.
- Mind a három archív verzió ugyanahhoz az egy élő törzsadathoz mér, tehát
  egyetlen törzsadat-javítás után a TELJES előzmény sárgán villog: a
  jelzés pont akkor a leghangosabb, amikor a legkevésbé indokolt.
- Az `OsszesTervSection` a jelvényért páciensenként +1
  `loadPatientData`-hívást tett, a végleges `FileSystemStorage`-ban ez N
  fájlolvasás az app legterheltebb listáján.
- A 104. tétel eredete a `docs/reviews/2026-09-01-doctor-review-nevutkozes.md`
  2. megállapítása: a persona a `Páciens adatai` fülön javított egy
  telefonszámot, és azt észlelte, hogy a `Kezelési tervek` fül lánc-sora
  vizuálisan változatlan maradt. Ez nem hiányzó adat volt: a mentés utáni
  visszajelzés (`PatientEditorPanel` azonnal olvasható módra vált a friss
  értékkel) ma is működik, a `Kezelési tervek` fülnek pedig szándékosan
  NEM kell szinkronizálnia — a mentett tervek `paciens` blokkja pillanatkép
  (`docs/02-domain-modell.md` § Páciens-szintű törzsadat). A persona a
  domain-modellt (pillanatkép-elv) nem ismerte fel, a 104. tétel pedig egy
  tervezési döntést próbált vizuálisan megmagyarázni, minden verziósoron,
  állandóan.

## Döntések

### 1. Teljes visszabontás, nulla pótlás a listán

A négy releváns akció közül (Megnézés, Új verzió nyitása, Másolás új
tervbe, Letöltés) három már fedett a jelzés nélkül is: *Megnézés* → a Terv
részletei lap kétoszlopos, valódi értékeket mutató táblája; *Új verzió* →
a Terv adatai lap `TorzsadatSyncCard`-ja (mezőnkénti, checkboxos szinkron)
plusz a véglegesítés-őr `torzsadat-elteres` INFO tétele, ami a
mezőneveket ki is írja; *Másolás új tervbe* → a `PlanVersionActionDialog`
már ma is az ÉLŐ törzsadatból tölti a `paciens` blokkot. A negyedik,
*Letöltés*, szándékosan pótlás nélkül marad: a mentett PDF aláírt,
történeti dokumentum — az van rajta, ami akkor volt, és ez helyes.

**Miért:** a jelzés nem információt hordoz, hanem egy már meglévő
tervezési döntést (pillanatkép-elv) ismétel el N-szer, kontextus és akció
nélkül. Elvetett alternatíva: a jelzés megtartása, csak konkrétabb
felirattal (mezőnevek számok helyett) — elvetve, mert az N-szeres
ismétlést nem oldja meg, csak hosszabbá teszi.

### 2. A megmaradó négy felület szövege változatlan

A `TervReszleteiPage` „N mező azóta módosult”, a `TorzsadatSyncCard` „N
mező eltér a páciens törzsadatától” és a véglegesítés-őr INFO tétele nem
módosul.

**Miért:** ott a szám-alapú felirat kontextusba ágyazott („Páciens adatai
a véglegesítéskor” blokk, „Páciens törzsadata” szekció) és mindkettő
lefúrható (kinyitható tábla, illetve szinkron-dialógus) — a 104.
tételnél kifogásolt kétértelműség ott nem áll fenn.

### 3. Könyvelés: új tétel, nem a 104. módosítása

A visszabontás önálló, 112. tételként zárul, saját tervfájllal. A 104.
tétel `backlog/done/BACKLOG_DONE.md`-beli bejegyzése egy záró mondatot kap
arról, hogy a 112. tétel visszabontotta — a bejegyzés többi szövege
történeti, érintetlen marad.

**Miért:** a `BACKLOG_DONE.md` a döntések tényleges sorrendjét rögzítő
napló — egy utólagos átírás azt sugallná, mintha a 104. sosem történt
volna meg, holott a levont tanulság (a persona-lelet túlolvasása) éppen
abból ered, hogy megtörtént.

### 4. Nincs folyamatszabály a persona-lelet félreolvasására

A doktrína (`/doctor-review` skill, review-dokumentum sablon) nem kap új
szabályt a „nem láttam változást” típusú leletek kezelésére.

**Miért:** ez egyetlen eset — korai lenne belőle általános szabályt
levonni. Ha a mintázat megismétlődik, az a kellő jelzés egy külön
folyamat-tételhez.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `pages/TervReszleteiPage.tsx` „Páciens adatai a véglegesítéskor” blokkja
  — változatlan.
- `pages/patientPage/TorzsadatSyncCard.tsx` és a `TorzsadatDiffDialog` —
  változatlan, ez marad az EGYETLEN akcióképes szinkron-hely.
- `domain/veglegesitesOr.ts` `'torzsadat-elteres'` INFO checklist-tétele —
  változatlan.
- `domain/masterSnapshotDiff.ts` — változatlan, több hívója van.
- `components/PlanVersionActionDialog.tsx` élő-törzsadatos másolása —
  változatlan.

## Érintett helyek

- `app/src/domain/torzsadatElteres.ts` és `.test.ts` — törölve (a 104.
  tétel bevezette modul, egyetlen hívóval).
- `app/src/components/PatientPlanChains.tsx` — a `torzsadat` prop, a
  lánc-fejléc/verziósor/piszkozat-blokk három jelvénye és a hozzá tartozó
  számítás törölve; a komponens minden más viselkedése változatlan.
- `app/src/pages/demo/OsszesTervSection.tsx` — a páciensenkénti
  `loadPatientData`-hívás megszűnt, visszaállt az egyetlen
  `loadPlanChainData`-ágra.
- `app/src/pages/PatientDetailPage.tsx` — csak a `torzsadat` prop leadása
  szűnt meg; az `adatok` state és a törzsadat-betöltés változatlan (a
  `PatientEditorPanel` és a fejléc `megjelenitettTorzsadat()`-ja
  továbbra is használja).
- `app/src/pages/demo/OsszesTervSection.test.tsx`,
  `app/src/pages/PatientDetailPage.test.tsx` — a 104. tétel jelvényeit
  igazoló tesztek törölve.
- `docs/03-funkcionalis-spec.md` § 5 (a „Törzsadat ↔ pillanatkép eltérés
  jelzése” bekezdés és az „Aktív draft a listán” hozzá tartozó mondata) és
  § 10 (a beágyazott fa törzsadat-betöltésének mondata) — törölve.
- `CLAUDE.md` „Meglévő segédfüggvények” — a 104. tétel bekezdése törölve.

## Tesztelés

- `cd app && npm run lint && npm test && npm run build` — mind zöld.
- Kézi ellenőrzés: egy páciens törzsadatában telefonszám átírása után a
  `Kezelési tervek` fülön sem a lánc-fejlécen, sem a verziósorokon, sem az
  aktív piszkozat blokkján nincs eltérés-jelvény; a `Legutóbbi`/`Csak
  ajánlat` jelvények és az összegek változatlanok.
- A négy megmaradó felület (Terv részletei tábla, Terv adatai szinkron-
  dialógus, véglegesítés-őr INFO tétel, Másolás új tervbe élő törzsadata)
  továbbra is működik.
