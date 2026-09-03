# Backlog 103. tétel — Demó-eredetű, PDF nélküli verziók üzenete — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 103. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A demó-seed (`app/src/storage/DemoStorage.ts` `resetDemoData()`) a
`seed/plans.ts` `seedPlans` tömbjéből minden verzióhoz `terv.json`-t ír, de
PDF-bájtokat sosem — a `pdfKey(...)` kulcs csak a tényleges
`savePlan(plan, pdf)` hívásnál keletkezik. Emiatt `loadPlanPdf()` minden
seed-elt verzióra `null`-t ad vissza, a `usePlanPdfObjectUrl` hookban
`hianyzik: true`-t eredményezve, a `pages/tervReszletei/MentettPdfPanel.tsx`
pedig egy semleges, szürke „Ehhez a verzióhoz nincs mentett PDF." üzenetet
mutat. Ugyanez a string négy helyen ismétlődik:
`MentettPdfPanel.tsx`, `pages/TervReszleteiPage.tsx` „Megnyitás külön"
akciója (üres lapot nyit, majd bezárja és egy piros hibasávban jelzi),
`components/PatientPlanChains.tsx` `downloadVersion()` (a lánc-lista `⋯`
menüjének „Letöltés"-e, szintén piros hibaként), és a Filerendszer nézet
`pages/demo/fileTree/FileContentPanel.tsx`-e.

A `docs/reviews/2026-09-01-doctor-review-visszatero-paciens.md` 2.
megállapítása szerint ez három seed-páciensnél (Nagy Éva mindkét verziója,
Kovács János, később Kovács János megerősítésként még egyszer) reprodukált,
gyakori jelenség — a hibaüzenet semleges/technikai jellegű, nem mondja meg,
hogy ez a DEMÓ-adat velejárója, nem éles hiba. Sem a terven, sem a betöltő
állapotában nincs ma semmi, amiből a demó-eredet megkülönböztethető lenne
egy valódi, hiányzó fájltól.

## Döntések

### 1. Magyarázó üzenet, PDF-generálás nélkül

A demó-seed továbbra sem gyárt PDF-bájtokat — sem seedeléskor, sem igény
szerint, a megtekintés pillanatában újragenerálva. A megoldás kizárólag a
felhasználónak mutatott SZÖVEGET differenciálja: seed-eredetű, PDF nélküli
verziónál egy magyarázó, információs hangnemű üzenet jelenik meg a mai
semleges szöveg helyén.

**Miért:** a legkisebb hatókörű megoldás, ami nem hazudik és nem vezet be
új adatintegritási felületet. A demó a doki UX-validálására való (lásd
`CLAUDE.md` „Két fázisú build"), nem a PDF-generálás bemutatására — egy
hiányzó dokumentumról szóló, pontos magyarázat ugyanazt a bizalmi célt
szolgálja, mint egy ténylegesen legenerált demó-PDF, munka nélkül.

Elvetett alternatíva — **a seed írjon valódi PDF-et**: a „Demó adat
visszaállítása"/első indítás a seed tervekhez ténylegesen legenerálná és
elmentené a PDF-bájtokat (ugyanaz a `TervDocument` renderer). Teljesen
életszerű demót adna (Letöltés/Megnyitás/beágyazott viewer is működne), de
a seedelés aszinkron és lassú lenne (~25+ PDF-render), és a localStorage
kvótáját is jelentősen terhelné (base64-kódolt bájtok) — ez a mockup
localStorage-alapú `DemoStorage`-ának (lásd `docs/05-technologia.md`)
ismert korlátja, amit egy demó-only kényelmi funkció miatt nem érdemes
feszegetni.

Elvetett alternatíva — **igény szerinti újragenerálás**: a seed-verzió PDF-je
kattintásra, a mentett `terv.json`-ból generálódna újra, egyértelműen
megjelölve, hogy ez demó-újragenerálás. Olcsó tárolást adna, de szembemegy
a `docs/03-funkcionalis-spec.md` § 11 „Mentett PDF" elvével — „sosem
generálódik újra (nem `usePDF()`, mert ez már lezárt, mentett dokumentum)"
— és egy valódi hiányzó PDF-nél soha nem lenne szabad ugyanezt felkínálni;
két, hasonló felületű, de eltérő garanciájú PDF-forrás egyszerre élne a
lapon.

### 2. Felismerés — statikus seed-lista alapján

Egy tiszta predikátum dönti el, hogy egy adott `(patientDir, planDir,
versionDir)` hármas szerepel-e a `storage/seed/plans.ts` `seedPlans`
tömbjében. A `DemoStorage` teszi ki ezt a demó-only felületén, a
`StorageContext` pedig egy újabb demó-only mezőként adja tovább — a
`resetDemoData`/`clearAll`/`loadPlanPdf`/`listFileTree`/`readRawFile`
mintáján (`StorageContext.tsx` fejléckommentje: ezek NEM a `PlanStorage`
interfész részei, a `FileSystemStorage`-váltáskor egyszerűen megszűnnek).

**Miért:** a `seedPlans` már ma is pontosan ezt az információt hordozza —
nincs szükség új tárolt állapotra vagy séma-mezőre ahhoz, hogy eldőljön,
egy verzió a beépített demó-készletből származik-e. A `Plan` típuson
(`domain/types.ts`) így nem jelenik meg semmilyen demó-jelző mező, ami a
lemezre írt sémát (D18 sémaverziózás, a `docs/02-domain-modell.md` `terv.json`
szerkezete) szennyezné — egy ilyen mező a végleges, fájlrendszeres
alkalmazásban értelmezhetetlen lenne.

Elvetett alternatíva — **perzisztens jelölőkulcs**: a `resetDemoData()`
verziónként egy külön localStorage-jelölő kulcsot is írna. Hűbben követné a
tényleges tárolt állapotot, de új kulcsalakot vezetne be, amit a
Filerendszer nézet `storage/demoFileTree.ts` allowlist-jéből külön ki
kellene zárni — különben egy nem létező „fájl" jelenne meg abban a
nézetben, ami pont azt mutatja, mi kerülne a doki gépén a lemezre.

Elvetett alternatíva — **nincs külön felismerés**: mivel a mockupban a
`savePlan(plan, pdf)` mindig ír PDF-bájtokat (hibánál mindkét kulcsot
visszagörgeti), hiányzó PDF gyakorlatilag csak seed-verziónál fordulhat
elő — egyetlen üzenet, nulla új API. Elvetve, mert a szöveg egy ténylegesen
elveszett/olvashatatlan fájlnál is tévesen „demó-adat"-ot állítana, ami
éppen a jelentés által felvetett bizalmi problémát fordítaná meg (egy
valódi hibát ártalmatlannak mutatna).

### 3. Két, egymástól eltérő hangnemű szöveg

Seed-eredetű, PDF nélküli verziónál a szöveg információs jellegű: „Ez a
verzió a beépített demó-adatkészletből származik, ezért nincs hozzá mentett
PDF. Éles használatban minden véglegesített verzióhoz elmentődik a kiadott
dokumentum." Nem-seed hiányzó PDF-nél a mai `hianyzik` ág utóda marad,
figyelmeztető hangnemben (pl. „A verzióhoz nem található mentett PDF").

**Miért:** a két állapot más cselekvést vár a dokitól — az egyik
elvárt/ártalmatlan (demó), a másik potenciálisan tényleges adathiba,
aminek utána kellene néznie. Egy közös szöveg vagy elmosná ezt a
különbséget, vagy a demó esetet is riasztóvá tenné.

### 4. A demó-eredet a hívó oldalán dől el, nem a hookban

A `storage/usePlanPdfObjectUrl.ts` hook érintetlen marad — a `CLAUDE.md`
szerint ez a „bájtok → Blob → object URL, cleanupban revoke" effekt
megosztott otthona, két hívóval (`TervReszleteiPage.tsx`,
`FileContentPanel.tsx`), és a `hianyzik`/`hiba`/`url`/`toltes` alakja ma is
elegendő. A demó-eredet ismerete a HÍVÓ oldalán (lap/komponens szintjén)
dől el, a `StorageContext` demó-only mezőjének meghívásával, és propként
jut el a `MentettPdfPanel`-be.

**Miért:** a hook a `PlanRef`-en kívül semmilyen üzleti/demó-tudást nem
hordoz — ha a demó-predikátumot bevinnénk, a hookot a `FileSystemStorage`-
váltáskor is módosítani kellene, holott a `CLAUDE.md` explicit kimondja:
„ne hozz létre harmadik, egyedi blob-URL-effektet PDF-bájtokhoz" — ez a
tétel nem ad okot a meglévő megosztott effekt kibővítésére egy demó-only
ismerettel.

### 5. A letiltás kizárólag a `hianyzik` ágra vonatkozik, a `hiba` ágra nem

A `pages/TervReszleteiPage.tsx` „Megnyitás külön" akciója letiltottra vált,
ha a PDF hiányzik (`pdfState.hianyzik`) — ugyanúgy, ahogy a „Letöltés" gomb
ma is letiltott ebben az esetben (408–425. sor). Betöltési HIBÁNÁL
(`pdfState.hiba`) a „Megnyitás külön" kattintható marad, hogy maradjon
újrapróbálkozási út — ezt az ágat a panel külön, piros Callout-tal jelzi
(`MentettPdfPanel.tsx` `hiba` ág), a gomb pedig újra lekéri a bájtokat.

**Miért:** a „hiányzó" és a „hiba" két, szándékosan külön állapot
(`usePlanPdfObjectUrl` — lásd a hook fejléckommentjét: „a hiányzó mentett
PDF KÜLÖN, nem hiba állapot"); a hiányzó PDF-nél a gomb sosem tudna mást
tenni, mint amit a panel már közöl (nincs mit letölteni), míg egy átmeneti
hiba (pl. sérült base64, storage-kvóta) esetén az újrapróbálkozás
értelmes, elvárt viselkedés.

### 6. A megosztott akció-hibacsatorna súlyosság-jelzést kap

A `components/PlanVersionActionDialog.tsx` `VerzioAkcioHiba` típusa (ma
`{ planDir, versionDir, message }` — a `null`/`null` pár a nem sorhoz
kötött hibát jelöli) egy opcionális súlyosság-mezőt kap. A két render-hely
(`PatientPlanChains.tsx` 331. és 632. sor, `TervReszleteiPage.tsx` 436.
sor) ez alapján dönt szín/ikon között — a demó-eredetű „nincs mentett PDF"
eset (pl. a lánc-lista `⋯` menüjének „Letöltés"-e seed-verzión) semleges/
információs Callout-ot kap piros helyett, minden más hiba (letöltési hiba,
felugró ablak letiltása, valódi hiányzó/olvashatatlan PDF) változatlanul
piros marad.

**Miért:** a `VerzioAkcioHiba` ma egyetlen, mindig piros csatorna — ha a
demó-üzenetet is ezen küldenénk súlyosság-jelzés nélkül, az két, eltérő
jelentésű állapotot (tényleges hiba vs. elvárt demó-korlát) mosna össze
ugyanabban a piros dobozban, pont azt a problémát reprodukálva, amit ez a
tétel megszüntetni hivatott. A mezőt OPCIONÁLISNAK kell hagyni (alapértelmezett
= piros/hiba), hogy a meglévő, ma is piros hívások (letöltési hiba, felugró
ablak tiltása) módosítás nélkül változatlanok maradjanak.

Elvetett alternatíva — **külön, harmadik állapot-csatorna a demó-üzenethez**
(pl. egy másik `useState` a két hívóban, a `hiba` mellett): szétválasztaná
a renderelést két helyen egyszerre újraírandó feltétel-ágra, miközben a
`VerzioAkcioHiba` ma is pontosan a „sorhoz/lánchoz kötött, tranziens
üzenet" fogalmát hordozza — egy második csatorna ugyanazt a fogalmat
duplikálná, nem bővítené.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A Filerendszer nézet `pages/demo/fileTree/FileContentPanel.tsx`-e.**
  Ott egy seed-verziónak eleve NINCS `pdf` csomópontja a fában (a
  `storage/demoFileTree.ts` allowlist-je csak a ténylegesen létező
  kulcsokból épít), a `pages/demo/FileTreeSection.tsx` fejlécszövege ezt
  már kimondja („A most még nem mentett (csak a demó-adatból származó)
  terveknél egyelőre nincs kezelesi-terv.pdf"). Ott a `hianyzik` ág csak
  akkor lenne elérhető, ha a kulcs a fa renderelése után tűnne el — ez
  valódi anomália, a mai általános szöveg marad.
- **A seed-adat bővítése tényleges PDF-fájlokkal.** Lásd 1. döntés
  elvetett alternatívája.
- **A jövőbeli `PISZKOZAT` státuszú mentett verziók** (`backlog/BACKLOG.md`
  „KIDOLGOZÁSRA VÁR" 5. pontja — több félretett, később folytatható
  kezelési terv). Azok a verziók is lehetnek PDF nélküliek, de ez egy
  önálló, még ki nem dolgozott tétel — nem bővítjük rájuk ennek a
  tételnek a szövegét előre.
- **A `DemoBanner`/DEMO oldal (`pages/DemoPage.tsx`) meglévő szövegei.**
  Azok már ma is kimondják az általános demó-jelleget; ez a tétel egy
  konkrét, verzió-szintű üzenetre szorítkozik, nem a globális demó-
  kommunikációra.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/seed/plans.ts` — a `seedPlans` mellé kerülhet a
  demó-eredet predikátumának forrása (a lista maga már megvan).
- `app/src/storage/DemoStorage.ts` — az új demó-only metódus otthona, a
  `loadPlanPdf`/`listFileTree`/`readRawFile` mintáján.
- `app/src/storage/StorageContext.tsx` — az új demó-only mező a
  `StorageContextValue`-n, ugyanabban a csoportban, mint a többi
  demó-only mező (`resetDemoData`/`clearAll`/`loadPlanPdf`/`listFileTree`/
  `readRawFile`).
- `app/src/pages/tervReszletei/MentettPdfPanel.tsx` — a `hianyzik` ág
  két szövegváltozatra bomlik (demó vs. valódi hiány).
- `app/src/pages/TervReszleteiPage.tsx` — a `MentettPdfPanel` propjai és
  a „Megnyitás külön" letiltási feltétele.
- `app/src/components/PatientPlanChains.tsx` — a `downloadVersion()`
  hibaüzenete demó-verzión, illetve a renderelés súlyosság szerint.
- `app/src/components/PlanVersionActionDialog.tsx` — a `VerzioAkcioHiba`
  típus opcionális súlyosság-mezője.
- Tesztek, amik a MAI viselkedést rögzítik és felülvizsgálandók:
  `app/src/pages/demo/OsszesTervSection.test.tsx` („A seed-verziókhoz
  nincs mentett PDF (csak terv.json)"), `app/src/pages/
  TervReszleteiPage.test.tsx` (a ma duplán megjelenő hiányzó-PDF üzenet).

## Tesztelés (irányadó, nem kimerítő)

1. **Seed-verzió, Terv részletei.** Egy seed-elt (pl. Kovács János)
   véglegesített verziónál a „A mentett PDF" panel a demó-magyarázó
   szöveget mutatja, a „Megnyitás külön" gomb letiltott, a „Letöltés" gomb
   (a mai módon) szintén letiltott.
2. **Seed-verzió, lánc-lista.** A `⋯` menü „Letöltés"-e seed-verzión
   kattintható marad; a sor alatti üzenet semleges/információs, NEM piros
   `Callout`.
3. **Ténylegesen mentett verzió.** Egy saját véglegesítéssel létrehozott
   verziónál minden gomb és a panel is a mai, változatlan módon
   viselkedik (a `savePlan` valódi PDF-bájtjaival).
4. **Valódi hiba.** Egy szimulált betöltési hibánál (pl. sérült base64) a
   panel piros hibaszöveget ad, és a „Megnyitás külön"/„Letöltés"
   kattintható marad (nem a `hianyzik`, hanem a `hiba` ág fut).
5. Regresszió: a felugró ablak letiltásának és a letöltési hibának a
   szövege/piros színe változatlan marad.
6. `cd app && npm test && npm run build && npm run lint`.
