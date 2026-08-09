# 8. Backlog — még fejlesztendő

Ez a fejezet a jövőbeli munka gyűjtőhelye: a 2026-08-06-i kódreview
(P0/P1 minden tétele javítva, lásd git history — a nyers review-passzok
nem élnek tovább a repóban) nyitva maradt P2-jei, és az azt követő
termékreview (`06-doktor-harom-nap` munkanév alatt készült anyag)
felvetései, szoftverarchitekt-triázzsal együtt. A `docs/01`
sérthetetlen keretei (D1–D21) egyik tételt sem sértik — ahol ez nem
nyilvánvaló, a tétel maga jelzi, melyik döntéssel fut össze.

**Sorrend, ha priorizálni kell:** ~~1 (piszkozat-perzisztencia)~~ → ~~5
(EUR-mező)~~ → ~~2 (friss dátum)~~ → ~~3 (sornév + egyedi sor)~~ → ~~6
(placeholder-őr)~~ → 8 (árlista-nap) → ~~4~~, 9 → a többi.
(Az eredeti triázs-sorrend tévesen kihagyta az 1. tételt és duplán
hivatkozott a 3.-ra — itt javítva. Az 1. tétel a doktor-nap narratívában
háromszor is felmerül ugyanazon a délelőttön, és fél nap a mérete —
ez indokolta az élen; 2026-08-09-én elkészült, lásd alább. A 2. tétel a
javasolt sorrendtől eltérően, az 5. előtt készült el — szintén
2026-08-09-én. A 3. tétel a javasolt sorrendtől eltérően, az 5. előtt
készült el — szintén 2026-08-09-én, és menet közben felfedte a 15. tételt
(nyelváltás névmegőrzése), ami rögtön utána, ugyanaznap el is készült. A
4. tétel a javasolt sorrendtől eltérően, az 5. és a 8. előtt készült el —
szintén 2026-08-09-én, mert a 3. tétel menet közben nyitva hagyott egy
záratlan szálat — lásd alább. Az 5. tétel a javasolt pozíciójában,
szintén 2026-08-09-én készült el. A 6. tétel a javasolt pozíciójában,
szintén 2026-08-09-én készült el — kutatással kiderült, hogy a benne
leírt sablonszerkesztő rész már korábban, a `119ab74` commit óta kész
volt, a ténylegesen hátralévő munka a placeholder-őr volt. A 14. tétel a
sorrenden kívül, a mérete miatt készült el — szintén 2026-08-09-én, mert
15 perc volt, és a publikus demón látható hibát javított.)

**A MOST lista minden tételének van tervdokumentuma.** A kész tételeknél
(1–7, 11, 12, 14, 15) a saját „Megvalósítás" blokkjuk hivatkozik rá; a
még nyitott tételeknél (8–10, 13) a tétel végén álló **Terv:** sor. Ezek `grill-me`
munkamenetek döntési összefoglalói — a nyitott tételek tehát **meg vannak
tervezve, de nincsenek implementálva**: a tervek nem tartalmaznak kódot,
az implementáció módja a megvalósító feladata. Ahol a tervezés
felülírta a tétel eredeti méretbecslését vagy hatókörét, azt a **Terv:**
sor jelzi.

---

## MOST (eredetileg kb. 6–7 fejlesztői nap + fél nap közös munka a dokival; a 11 kész tétel után kb. 4 nap van hátra, a 8. tétel megnőtt becslésével együtt)

Mindegyik kicsi, és egy konkrét, a `06-doktor-harom-nap` munkanapjain
ténylegesen felmerült fájdalmat szüntet meg (lásd a Függelékben). Egyik
sem sérti a D1–D21 kereteket, egyik sem visz adatot szerverre.

### 1. Piszkozat-perzisztencia (frissítés/összeomlás ne törölje a félkész tervet) — KÉSZ (2026-08-09)

- **Méret:** fél nap. Mockupban egy `dp:piszkozat` localStorage-kulcs, a
  véglegesben IndexedDB — pontosan az, amit a `docs/03` már úgyis a 2.
  fázisra ütemezett, csak korábbra hozva.
- **Kereteket sért?** Nem — a `DraftStorage` itt is csak piszkozat-cache
  marad, nem lesz system of record, mert véglegesítéskor törlődik és csak
  `PISZKOZAT` (vagy újranyitott `VEGLEGES`) státuszú tervet tölt vissza.
- **Valódi haszon:** hibacsökkentés és időmegtakarítás közvetlenül mérhető —
  a Függelék A) napján ez háromszori újragépelést jelentett volna megspórolva.
- **20%-os verzió:** `beforeunload` figyelmeztetés („nem mentett
  módosítások vannak") localStorage-írás nélkül — fél óra, de csak a
  szándékos bezárást védi, az összeomlást nem. Nem javasolt helyette, mert
  pont az összeomlás ellen kell a védelem, és a teljes megoldás is csak fél
  nap.
- **Megvalósítás:** a döntési részletek `docs/backlog-1-piszkozat-terv.md`-ben
  (grill-me munkamenet, 8 döntés). Új `DraftStorage` interfész + mockup
  `DemoDraftStorage` (`app/src/storage/`), `piszkozatTartalmas()`
  (`app/src/domain/piszkozat.ts`), `AppState.tsx` restore/írás/törlés
  logika, Home „Piszkozat folytatása” kártya + felülírás elleni
  AlertDialog-ok (Home, PlanHistoryPage), piszkozat törlése sikeres
  véglegesítéskor (`PreviewPage.tsx`). Lásd git history a részletes
  commitokért.

### 2. Visszatöltött terv új verziója friss dátummal induljon — KÉSZ (2026-08-09)

- **Méret:** 3 óra — egy függvény (`loadPlanIntoDraft` kiegészítése) plusz
  egy tájékoztató sáv a szerkesztőben.
- **Kereteket sért?** Nem, sőt: a D7 (pillanatkép) épp ezt kívánja meg — a
  korábbi sorok ára változatlan marad, csak a terv kelte és érvényessége
  igazodik a mához, amikor ténylegesen kinyomtatásra kerül.
- **Valódi haszon:** hibacsökkentés — ez konkrétan egy hibás, lejárt
  dátumú, aláírásra alkalmatlan dokumentum kiküszöbölése, nem kényelmi
  funkció.
- **20%-os verzió:** nincs kisebb, a hiba maga is kicsi — ez már a
  minimális javítás.
- **Megvalósítás:** a döntési részletek `docs/backlog-2-friss-datum-terv.md`-ben
  (grill-me munkamenet, 7 döntés). Új `todayIso()` export (`app/src/domain/date.ts`,
  kiemelve a `blankPlan.ts`-ből inline élő számításból), új
  `frissDatummal(plan, settings, ma)` pillanatkép-őrző segédfüggvény
  (`app/src/domain/ujVerzioDatum.ts`), az `AppState.tsx` `loadPlanIntoDraft`-ja
  ezt hívja betöltéskor és egy új `frissitettDatum` jelző-state-tel jelzi a
  változást (ugyanazzal az objektumreferenciával a `plan`/`mentettPlan`
  state-eknek, hogy a gépi dátumbélyeg ne fusson bele a "mentetlen piszkozat"
  heurisztikába), semleges (`gray`) `Callout` a `PlanEditorPage`-en a meglévő
  amber sáv fölött. Lásd git history a részletes commitért.

### 3. Sornév szerkeszthetővé tétele + szabad („egyedi") sor — KÉSZ (2026-08-09)

- **Méret:** ~1 nap — mező típusváltás, `assertPlanShape` és
  `fallbackSorok` ellenőrzése üres `tetelId`-re, teszt.
- **Kereteket sért?** Nem — a `nevSnapshot` már ma is szabad string a
  sémában, csak a UI nem engedi szerkeszteni. A D7 pont azt kívánja, hogy a
  snapshot legyen az igazság; ha a doki pontosít a soron, az erősíti, nem
  gyengíti a döntést.
- **Valódi haszon:** pácienskommunikáció és hibacsökkentés — az elgépelt,
  rövidített árlistai nevek ne kerüljenek szó szerint az aláírandó
  dokumentumra, és felvehető legyen olyan tétel is, ami nincs az
  árlistában (pl. egyedi anyagköltség).
- **20%-os verzió:** csak a sornév szerkeszthetősége, egyedi sor nélkül —
  fél nap. A teljes verzió javasolt, mert az egyedi sor ugyanazt a
  mechanizmust használja, és a Függelék B) napi „nincs tétel az
  érzéstelenítésre" problémája enélkül megmarad.
- **Megvalósítás:** a döntési részletek `docs/backlog-3-sornev-egyedi-sor-terv.md`-ben
  (grill-me munkamenet, 11 döntés). A `Sor` „Beavatkozás" cellája
  (`PlanEditorPage.tsx` `LineRow`) mindig szerkeszthető szövegmező lett,
  „egyedi" jelvénnyel, ha a sor `tetelId`-je üres. A `ItemPicker`
  (`pages/planEditor/ItemPicker.tsx`) új `onPickEgyedi` prop-ja: nulla
  találatnál az Enter, találatok mellett egy pszeudo-opció a lista alján
  veszi fel a gépelt szöveget egyedi sorként — ugyanabban a
  gépel → nyíl → Enter ciklusban. `kitoltetlenSorok`
  (`domain/kitoltetlen.ts`) kritériuma `tetelId`-ről `nevSnapshot`-ra
  váltott (a kemény véglegesítés-blokk mostantól a *nevet* várja el, az
  ár lehet 0). Új `sorFallback()` export (`domain/nev.ts`) — az EGYETLEN
  hely, ahol eldől, hogy egy sor neve visszaesne-e magyarra a terv nyelvén
  (a szerkesztő `HU` jelvénye és a `fallbackSorok` véglegesítés-őr is ezt
  hívja), egyedi soron mindig visszaesésként számolva, ha van neve.
  A backlog 5. tétele (`unit="EUR"` a Tényleges ár mezőn) tudatosan
  **nem** része ennek a körnek. Lásd git history a részletes commitokért.

### 4. Sor-szintű „becsült ár" (csillag) kapcsoló — KÉSZ (2026-08-09)

- **Méret:** ~2 óra — a `Sor.savos` mező már létezik és már vezérli a PDF
  csillagot/lábjegyzetet, csak UI-kapcsoló kell rá minden sorhoz, nem csak
  az árlista SAVOS tételeihez.
- **Kereteket sért?** Nem — épp a D15 jogi védelmét viszi oda, ahol
  ténylegesen bizonytalan a mennyiség (csontpótlás, membrán), nem csak ott,
  ahol az árlista véletlenül SAVOS típusú.
- **Valódi haszon:** jogi védelem és pácienskommunikáció — ez direkt a
  Függelék B) napi kockázatot csökkenti (fix számként nyomtatott, valójában
  bizonytalan ár).
- **20%-os verzió:** ez már maga a 20%-os verzió egy nagyobb „tételenkénti
  megjegyzés" funkcióhoz képest — nincs nála egyszerűbb, ami ugyanezt a
  kockázatot kezelné.
- **Megvalósítás:** a döntési részletek
  `docs/backlog-4-becsult-ar-kapcsolo-terv.md`-ben (grill-me munkamenet, 6
  döntés). A `LineRow` névcellájában (`PlanEditorPage.tsx`) a mai, csak
  olvasható „sávos" szöveges jelvény helyén egy mindig látható csillag
  `IconButton` (a `PriceListAdminPage.tsx` `gyakori`-csillagjának mintája),
  ami `onPatch({ savos: !line.savos })`-t hív — bármelyik sor bármelyik
  irányba átbillenthető, eredet-nyilvántartás nélkül (egy ma is SAVOS
  árlistai tételről is levehető). A `pdf/TervDocument.tsx` nem változott —
  a csillag és a lábjegyzet ott már korábban is generikusan a `savos`
  mezőt olvasta. Mellékesen feloldotta a 3. backlog-tétel (egyedi sor) 7.
  döntését, ami a `savos: false`-t addig kezdőértéknek, nem zárolásnak
  szánta: az egyedi soron a csillag ugyanúgy működik, mint bármelyik
  máson, a `sorMezokEgyedibol` kódkommentje ezt most már tükrözi. Új
  `app/src/pdf/TervDocument.test.tsx` — az első teszt, ami közvetlenül a
  `TervDocument`-et rendereli (a react-pdf primitíveket egyszerű
  DOM-elemekre képező mockon át), és egy manuálisan bekapcsolt, nem
  árlistai-SAVOS-eredetű (egyedi) soron igazolja a csillagot és a
  lábjegyzetet a nyomtatványon, magyarul és németül is. Lásd git history a
  részletes commitért.

### 5. `unit="EUR"` a szerkesztő „Tényleges ár" mezőjén — KÉSZ (2026-08-09)

- **Méret:** 15 perc — egy prop átadása, ami az árlista adminban már megvan.
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés, közvetlenül — ez egy majdnem 100×-os
  beviteli hiba lehetősége éles pénzügyi dokumentumon (cent vs. euró
  tévesztés, lásd Függelék C).
- **20%-os verzió:** nincs kisebb egység, ez már a legkisebb javítás.
- **Megvalósítás:** a döntési részletek `docs/backlog-5-eur-mezo-terv.md`-ben
  (grill-me munkamenet, 3 döntés). A `LineRow` „Tényleges" `NumberField`-je
  (`PlanEditorPage.tsx`) megkapta a `unit={currency}` propot — a `Penznem`
  típus szó szerint megegyezik a `NumberField.unit` típusával, nem
  igényelt leképezést. A `PhaseSection` táblázatfejléce (`Listaár`/
  `Tényleges`/`Összeg`) mindhárom pénzoszlopon jelzi a terv pénznemét
  (`(Ft)`/`(€)`), nem csak a szerkeszthető oszlopon — vizuális
  következetesség miatt. Új regressziós teszt a
  `PlanEditorPage.test.tsx`-ben, ami a bevált teljes-App útvonalon EUR
  pénznemű tervet indít, felvesz egy EUR-áras tételt (CBCT), és igazolja,
  hogy a mező euróban jelenít meg (`66,00`, nem `6600`), és a beírt
  `35,50` euróként (3550 centként), nem HUF-ágon parseolva committálódik.

### 6. Sablonszerkesztő bekötése + placeholder-őr a véglegesítésnél — KÉSZ (2026-08-09)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — ugyanazt a verziófájl-mechanizmust használja,
  amit a D4 már megkövetel (`nyilatkozat-hu-v2.md`, a régi megmarad).
- **Valódi haszon:** ez nem funkció, hanem egy éles hiba elhárítása — ma
  egy `[PLATZHALTER]` szöveg mehet ki egy aláírandó szerződésre, és az app
  erről nem szól semmit (lásd Függelék C, a legrosszabb pillanat). Jogi
  kockázat, nem csak UX.
- **20%-os verzió:** csak a placeholder-őr (fél nap), a szerkesztő nélkül —
  de akkor a doki jogásza sehol nem tudja feltölteni a végleges szöveget az
  appon belül, csak fájlrendszeri kerülővel a végleges verzióban. Mivel a
  szerkesztő maga is csak fél nap plusz, együtt javasolt.
- **Megvalósítás:** a döntési részletek
  `docs/backlog-6-sablon-placeholder-terv.md`-ben (grill-me munkamenet, 5
  döntés). Hatókör-korrekció a munkamenet elején: a „sablonszerkesztő
  bekötése” rész már a `119ab74` commit óta kész volt (a `SettingsPage.tsx`
  „Nyomtatvány szövegei" kártyája), a backlog szövege elavult volt — a
  ténylegesen hátralévő munka a placeholder-őr és két, felülvizsgálat során
  talált szerkesztő-hiányosság volt. Új `isPlaceholderTemplate()` export
  (`app/src/domain/templates.ts`) — a `DemoStorage.ts` és a `SettingsPage.tsx`
  korábban egymástól eltérő privát duplikátumai erre álltak át, a
  `PreviewPage.tsx` a harmadik (immár egyetlen) hívási hely. A
  `TervDocument.tsx` szerint a „Csak ajánlat” kapcsoló csak a 3. oldalt
  (nyilatkozat + aláírás) zárja ki, a 2. oldal (fizetési feltételek) mindig
  nyomtatódik — emiatt a két sablon placeholderjét nem lehet egyformán
  kezelni. Ha a MEGJELENÍTETT nyilatkozat placeholder, a „Csak ajánlat”
  checkbox bepipálva és letiltva jelenik meg (nincs felülírási lehetőség,
  ez KEMÉNY zár, nem a `confirmStep`-lánc egy tagja), piros Callout
  magyarázza miért; egy `effectiveOfferOnly` derived érték
  (`offerOnly || nyilatkozatIsPlaceholder`) váltotta fel a nyers `offerOnly`
  state-et a PDF-generálásban, a letöltési fájlnévben és a checkbox
  megjelenítésében is, hogy a zár ne csak vizuális legyen. A fizetési
  feltételek placeholderje ezzel szemben a meglévő, hiányzó-sablon esetén
  már működő HU-visszaesésbe (`sablonFallback`, sárga Callout) esik bele —
  csak nem-magyar tervnél fut le, hogy egy magyar terv ne essen vissza
  önmagára. Mellékesen, felülvizsgálati találatként bekerült a körbe: a
  sablonszerkesztő piszkozata ezután túléli az elnavigálást (ad hoc
  `localStorage`, `dp:sablon-piszkozat` kulcs, base-kulcsolt JSON, néma
  visszaállítás, törlés csak sikeres mentéskor — szándékosan NEM a `Plan`-ra
  típusozott `DraftStorage` bővítése), és a „Szöveg mentése” gomb
  `templateSavingRef`-alapú dupla-kattintás zárat kapott, ugyanazt a mintát
  követve, mint a `PreviewPage.tsx` `savingRef`-je. Lásd git history a
  részletes commitért.

### 7. Kereső: néma találat-csonkítás jelzése + admin kereső kiegészítése némettel — KÉSZ (2026-08-09)

- **Méret:** ~1 óra összesen.
- **Kereteket sért?** Nem.
- **Valódi haszon:** kicsi, de valós hibacsökkentés — a Függelék C napi
  „nem találom a Neodent implantátumot" probléma gyökere nem ez (az az
  elgépelés az adatban), de a csonkítás-jelzés és a némettel bővített
  admin-keresés segít, amíg az adat nincs kitakarítva.
- **20%-os verzió:** ez maga a 20%-os verzió egy „fuzzy" kereséshez
  képest — elgépelés-tűrő keresés (Levenshtein-távolság) külön eszköz
  lenne, nem javasolt, mert az adattisztítás (8. tétel) olcsóbban old meg
  ugyanannyi problémát.
- **Terv:** `docs/backlog-7-kereso-terv.md` (4 döntés). A két rész
  egymástól független; az egyetlen kapcsolat egy közös kétnyelvű
  név-egyezés helper, ami a mai `domain/search.ts`-be kerül ki (ma az
  `ItemPicker.tsx:92` és a `PriceListAdminPage.tsx:103` külön-külön
  szűrnek, az admin csak `nev.hu`-ra). Méret változatlan.
- **Megvalósítás:** új `nevEgyezik(nev, nq)` export (`domain/search.ts`) —
  a kétnyelvű egyezés EGYETLEN helye, a már normalizált keresőszöveget
  várja (a hívó a ciklus előtt egyszer normalizál); az `ItemPicker` és az
  admin `keep()`-je is erre állt át, a CLAUDE.md segédfüggvény-listája
  bővült vele. Az `ItemPicker` `results` `useMemo`-ja a teljes szűrt
  tömböt és a levágott darabszámot is visszaadja (`LATHATO_TALALAT = 12`
  konstans, a limit maga változatlan), a lista alján pedig — a találatok
  és az „egyedi" opció között — megjelenik egy statikus, NEM választható
  sor: „+N további találat — pontosíts a kereséssel". A sor nincs benne az
  `opcioSzam`-ban, tehát a gépel → nyíl → Enter ciklus bájtra ugyanaz
  maradt (külön teszt igazolja: 12 lefelé lépés után az Enter az ELSŐ
  találatot adja hozzá, nem a jelző sort). Öt új teszt: `search.test.ts`
  (HU-egyezés, DE-egyezés, nincs egyezés, hiányzó `nev.de`),
  `ItemPicker.test.tsx` (13+ találatnál a pontos N, pontosan 12-nél nincs
  jelzés, a ciklus érintetlen), `PriceListAdminPage.test.tsx` (a
  „zahnhals" keresés megtalálja a „Fognyaki tömés"-t, a sor továbbra is a
  magyar nevet mutatja). `docs/03-funkcionalis-spec.md` „Tételkereső" és
  az admin „Keresés és szűrők" szakasza frissült.

### 8. Árlista-nap: kategóriakezelés kódban + adattisztítás a dokival

- **Méret:** fél nap kód (kategória létrehozás/átnevezés/sorrendezés az
  adminban — ma csak áthelyezés van) + fél nap közös munka a dokival az
  adatra (gyakori-csillagok, elgépelések, duplikátumok, hiányzó tételek).
- **Kereteket sért?** Nem — a D16 kifejezetten az adminra bízza a
  takarítást, csak ma az admin nem tudja megcsinálni, mert nincs
  kategória-CRUD.
- **Valódi haszon:** ez a legmagasabb haszon/befektetés arányú tétel a
  listán — egyetlen fél napos ülés kiváltja mind a hat, A/B/C napban
  felmerült keresési és hiányzó-tétel problémát: gyorsgombok, elgépelések,
  „Komplett fogsor" félrevezető találata, hiányzó
  érzéstelenítés/kontroll/műtéti díj tételek.
- **20%-os verzió:** csak a gyakori-csillagozás és a legdurvább öt
  elgépelés javítása, kategóriakezelés nélkül — ez menne akár most azonnal,
  kód nélkül, de a `k01 Besorolatlan` és a francia maradványtételek
  rendbetétele blokkolva marad kategória-CRUD nélkül (lásd `docs/06`). Mivel
  a kód-rész is csak fél nap, a teljes verzió javasolt.
- **Terv:** `docs/backlog-8-kategoriakezeles-terv.md` — **csak a kódrészre**
  (a doki adattisztítása emberi munka, nem tervezhető ide). **Méretkorrekció:
  a kódrész 1.5–2 fejlesztői nap, nem fél nap** — a munkamenet feltárta, hogy
  a kategóriák létrehozása egy ma rejtett architekturális réteget is érint
  (a fogtérkép kategóriánkénti színei, `design/treatmentVisuals.ts`), amit az
  eredeti becslés nem tartalmazott. A tétel másik fele (fél nap közös munka
  a dokival) változatlan.

### 9. Előleg-sor a nyomtatványon

- **Méret:** fél nap — opcionális mező a `Plan`-en (visszafelé
  kompatibilis, `schemaVersion` nem változik), szerkesztő mező, PDF-sor.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció, közvetlenül a Függelék B) napi
  jelenetre — a fizetési feltételek szövege ma kimondja az 50%-ot, de
  sosem számolja ki, ezt ma fejben teszi a doki.
- **20%-os verzió:** ez már maga a 20%-os verzió — egy teljes fizetési
  ütemterv (részletekre bontás, dátumokkal) sokkal nagyobb munka lenne, és
  nem is merült fel igényként.
- **Terv:** `docs/backlog-9-eloleg-sor-terv.md` (9 döntés). Egyetlen új
  opcionális mező (`Plan.elolegSzazalek: number | null`, `null` = kikapcsolva),
  `schemaVersion` marad 1; az összeg a `Fizetendő`-ből számol, nem a
  `Kezelések összesen`-ből; az 1. oldal összegzése két új sort kap (Előleg /
  Fennmaradó), a 2. oldal sablonszövegébe viszont csak a százalék kerül,
  forintösszeg nem. Méret változatlan.

### 10. Tétel-leírás a csomagtételekhez

- **Méret:** ~1 nap — opcionális mező az árlistában és a soron (D7 szerint
  ez is pillanatkép), admin-mező, PDF-megjelenítés.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció — közvetlenül a Függelék B) napi
  „mi van ebben az egy sorban" kérdésre válaszol.
- **20%-os verzió:** ez maga a 20%-os verzió egy valódi „csomag = tételek
  listája" struktúrához képest, amit direkt nem javasolt (lásd KÉSŐBB) — a
  szabad szöveges leírás ugyanazt a problémát olcsóbban oldja meg,
  séma-törés nélkül.
- **Terv:** `docs/backlog-10-tetel-leiras-terv.md` (17 döntés — a MOST lista
  legrészletesebben tervezett nyitott tétele). Kétnyelvű `Tetel.leiras` az
  árlistán + sor-szintű pillanatkép a `nevSnapshot` mintájára; hiányzó német
  leírás némán elmarad, **nem** esik vissza magyarra (ellentétben a névvel).
  A D13-határ védelme a UI címkézésén múlik („Leírás (mi van benne?)"), ezért
  az nem szabadon átfogalmazható. Két további mező is bekerült a hatókörbe:
  `Plan.leirasokMutatasa` (nyomtatáskori be/ki) és egy szűken értelmezett
  `Tetel.csomag: boolean`. `schemaVersion` marad 1, méret változatlan.

### 11. Verziónkénti végösszeg a Korábbi tervek listában — KÉSZ (2026-08-09)

- **Méret:** ~1 óra — a lista már betölti a legfrissebb `terv.json`-t
  páciensenként, csak minden verziót kell betöltenie (a
  `Promise.allSettled` már megvan) és kiírnia az összeget.
- **Kereteket sért?** Nem.
- **Valódi haszon:** kicsi, de valós időmegtakarítás — anélkül is látszik,
  mennyi volt a korábbi ajánlat, hogy meg kelljen nyitni.
- **20%-os verzió:** ez már maga a 20%-os verzió egy teljes
  verzió-diffhez (mi változott sorszinten) képest, amit a KÉSŐBB listára
  tettünk.
- **Terv:** `docs/backlog-11-verzio-vegosszeg-terv.md` (5 döntés). A
  megjelenő szám a mentett `osszesitok.fizetendo` — nincs újraszámolás,
  ellenőrzés sem (a sérthetetlen szabály szerint a fájl az igazság, de a
  lista nem az a hely, ahol egy eltérésre figyelmeztetni kellene); a
  betöltés a meglévő kezdeti `useEffect` `Promise.allSettled`-jébe épül be,
  olvashatatlan verziónál „—" áll az összeg helyén. Méret változatlan.
- **Megvalósítás:** a `PlanHistoryPage.tsx` kezdeti `useEffect`-jében a
  „csak a legfrissebb verzió betöltése a névhez" kör helyére egy minden
  verzióra futó `Promise.allSettled` került — a páciensnév ugyanebből a
  batch-ből oldódik fel, tehát nem lett plusz kör, csak szélesebb. Új
  `totalsByVersion` state (`patientDir/versionDir` kulcs → `{ fizetendo,
  penznem }`; a pénznem verziónként a saját `terv.json`-jából, D21), új
  `versionKey()` helyi segédfüggvény, és a verziósoron egy jobbra
  igazított, `tabular-nums` összeg a gombok előtt (`docs/07`). Sikertelen
  betöltésnél a kulcs kimarad, `formatMoney(null)` „—"-t ad, és a páciens
  a meglévő `unreadable` halmazba kerül — nem kellett új
  hibamegjelenítési minta. Két új teszt a `PlanHistoryPage.test.tsx`-ben
  (Nagy Éva két verziója a SAJÁT összegét mutatja; sérült verziónál „—",
  a többi páciens érintetlen). A tesztekben egy `penz()` helper váltja a
  `formatMoney` nem törhető szóközét sima szóközre — a testing-library a
  DOM szövegét normalizálja, az elvárt stringet nem.
  `docs/03-funkcionalis-spec.md` „5. Korábbi tervek" szakasza frissült.

### 12. Döntés: kettős összegsor (Kezelések összesen / Fizetendő) marad-e — KÉSZ (2026-08-09)

- **Méret:** fél óra kód, bármelyik irányban.
- **Kereteket sért?** A jelenlegi állapot feszíti a D9 szándékát (kedvezmény
  ne látsszon a nyomtatványon) — kedvezmény nélkül két azonos szám áll
  egymás alatt, ami inkább zavaró, mint informatív.
- **Valódi haszon:** ez eredetileg nem funkció volt, hanem egy döntés, amit
  a dokinak kellett meghoznia: eladási eszköznek szánja-e a két sort
  (mutatja, hogy van listaár, amiből dolgozik), vagy inkább zavarná a
  duplikáció. A döntés a tervezéskor megszületett, lásd alább.
- **20%-os verzió:** nincs — ez egy bináris döntés, a kód mindkét irányban
  egyformán olcsó.
- **Terv:** `docs/backlog-12-osszegsor-terv.md` (5 döntés). **A döntés
  megszületett:** a doki a duplikációt zavarónak ítélte, nem eladási
  eszköznek — a nyomtatvány ezután feltételesen mutat egy vagy két sort
  (két sor csak tényleges eltérésnél, az elválasztóval együtt), a szerkesztő
  már bevált `discount > 0` mintáját általánosítva mindkét eltérés-irányra
  (a felár ugyanúgy nyit két sort, mint a kedvezmény). Egysoros állapotban
  nincs új felirat és nincs séma-/label-bővítés. A `docs/04-nyomtatvany-spec.md`
  is frissül.
- **Megvalósítás:** a `pdf/TervDocument.tsx` összegzés-blokkjában a
  `Kezelések összesen` sor és a `summaryDivider` egy `grand !== listTotal`
  feltétel mögé került (a `Fizetendő` sor mindig marad, változatlan
  felirattal és stílussal) — se új `pdfLabels()` kulcs, se séma-változás.
  A `PlanEditorPage.tsx` `Summary` doboza a mai `discount` ág mellé kapott
  egy `surcharge` tükör-ágat („Felár: X"), azonos `t.ok` színnel: a
  felfelé eltérést eddig se a szerkesztő, se a nyomtatvány nem jelezte,
  most mindkettő megmutatja. Új teszt-blokk a `pdf/TervDocument.test.tsx`-
  ben (eltérés nélkül nincs referenciasor — magyarul és németül is;
  kedvezmény és felár esetén viszont van, a listaárral), és egy tükör-teszt
  a `PlanEditorPage.test.tsx`-ben a felár-jelzésre. A `buildPlan`/`renderDoc`
  segédfüggvények egy opcionális `{ lista, tenyleges }` paraméterrel
  bővültek. `docs/04-nyomtatvany-spec.md` „Összegzés" szakasza a
  feltételes viselkedést írja le, a CHANGELOG a doki nyelvén.

### 13. Garancia szakasz a nyomtatványon

- **Méret:** fél nap kód (ugyanaz a sablon-mechanizmus, mint a fizetési
  feltételeknél), a szöveg tartalma a dokitól kell.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció — ez volt a Függelék C) napi „mit
  kérdezne, amire ma nem tud jól válaszolni" egyik konkrét pontja.
- **20%-os verzió:** ez már maga a 20%-os verzió.
- **Terv:** `docs/backlog-13-garancia-terv.md` (9 döntés). Statikus,
  terv-független szöveg egy új `garancia` sablon-alapnéven — a betöltő/mentő
  logika sehol nincs két sablonra hardkódolva, ezért ez tényleg csak
  adatbővítés (`DEFAULT_TEMPLATES` két új sorral); önálló oldalként jelenik
  meg a PDF-ben, és „Csak ajánlat" módban is látszik. Nincs
  `Plan`-mező és nincs verzió-pinnelés (a fizetési feltételek, nem a
  nyilatkozat mintája). A magyar szöveg a dokitól/jogásztól kell, a német
  egyelőre placeholder — vagyis a 6. tétel placeholder-őrébe fut bele.
  Méret változatlan.

### 14. Demó tervek hibás `tetelId`-jainak javítása — KÉSZ (2026-08-09)

- **Méret:** 15 perc.
- **Kereteket sért?** Nem — ez csak a demó adat belső hibája (a
  `nevSnapshot` miatt a UI-n nem látszik), de mivel a `tetelId`-hivatkozás
  integritása (D6/D7 lényege) a projekt egyik alapköve, a demónak magának
  is hitelesnek kell lennie.
- **Valódi haszon:** nem pácienst érintő, hanem fejlesztői minőségi tétel —
  **ezt a tervezés részben cáfolta**, lásd alább.
- **20%-os verzió:** nincs kisebb.
- **Terv:** `docs/backlog-14-demo-tetelid-terv.md`. **Hatókör-korrekció:
  ez nem csak belső demóadat-hiba.** A 10 demó sorból 8-ban a `tetelId` egy
  létező, de rossz árlistai tételre mutat (6 különböző hibás id), és mivel
  a fogtérkép színezése (`domain/toothVisual.ts`) a `tetelId`-t a JELENLEGI
  árlistában oldja fel, a `hianyzoTetel` jelző nem ugrik be — a publikus
  GitHub Pages demó **ma is csendben rossz kategória-színt mutat 3 fogon**.
  A gyökérok: a seed a (`aab43f8`-ban azóta törölt) `ui/` prototípusok
  `SAMPLE` konstansai ellen lett ellenőrizve, nem a `data/arlista.seed.json`
  ellen. A javítás minden párnál egyértelmű (a `nevSnapshot` ÉS a
  `listaEgysegar` kétszeresen igazolja), plusz egy új `plans.test.ts`
  integritás-teszt köti meg. Méret változatlan.
- **Megvalósítás:** 8 `tetelId` cseréje az
  `app/src/storage/seed/plans.ts`-ben (6 különböző id: `t009`→`t008`,
  `t051`→`t041`, `t077`→`t057`, `t103`→`t074`, `t007`→`t004`,
  `t100`→`t071`) — a `nevSnapshot`/`listaEgysegar`/`tenylegesEgysegar`
  értékek egyike sem változott, a két szándékos kedvezmény is érintetlen.
  A fejléc-komment mostantól a `data/arlista.seed.json`-t nevezi meg
  egyetlen hiteles forrásként (korábban a törölt `ui/*.jsx` prototípusokra
  hivatkozott, ez volt a hiba gyökere). Új
  `app/src/storage/seed/plans.test.ts`: minden nem üres `tetelId`-jű demó
  sorra (a) az id létezik a `seedPriceList`-ben, (b)
  `basePrice(tetel.ar[penznem]) === sor.listaEgysegar`. A névre
  SZÁNDÉKOSAN nincs assertion — a `nevSnapshot` a demóban is lehet
  pontosabb az árlistainál (`t057` ékezet, `t074` „korona" szó), és a 3.
  tétel óta kézzel is szerkeszthető, tehát a szó szerinti egyezés nem
  érvényes invariáns; a hiba elkapásához az ár-egyezés bizonyítottan elég
  (a javítás visszaállításával mind a 10 sor-előfordulás piroson bukik).
  A fogtérkép ezzel a demóban a helyes színt adja: Kovács János 36-os foga
  SEBESZET (`t057` → `k08`), a 35/36 és Nagy Éva v2 36-os foga KORONA
  (`t074`/`t071` → `k10`). CHANGELOG-bejegyzést nem kapott: belső
  demóadat-hiba, nem a dokinak kommunikált viselkedésváltozás.

### 15. Nyelváltás megőrzi a kézzel szerkesztett tételneveket — KÉSZ (2026-08-09)

- **Méret:** ~fél nap. Felfedezve a 3. tétel (sornév-szerkeszthetőség)
  implementálása közben, nem az eredeti triázsban.
- **Kereteket sért?** Nem — a `PatientPage.tsx` `applyNyelv()` nyelvváltáskor
  minden `tetelId`-hez kötött soron feltétel nélkül felülírta a
  `nevSnapshot`-ot az árlista aktuális nevére. A 3. tétel előtt ártalmatlan
  volt (a név úgysem térhetett el), utána viszont egy kézzel pontosított
  nevet is szó nélkül eltüntetett volna, ha a doki a névszerkesztés UTÁN
  vált nyelvet a Páciens adatlapon.
- **Valódi haszon:** hibacsökkentés — pontosan a 3. tétel által frissen
  bevezetett funkciót (névpontosítás) védi egy néma adatvesztéstől.
- **20%-os verzió:** nem készült — a teljes megoldás (mag-összehasonlítás +
  két jelvény + megerősítő dialógus élő számlálással) egy összefüggő
  döntéssorozat volt, nem bontható kisebbre új mező bevezetése nélkül.
- **Megvalósítás:** a döntési részletek
  `docs/backlog-3b-nyelvvaltas-nevmegorzes-terv.md`-ben (grill-me
  munkamenet, 7 döntés). Új `nevKoveti()` mag-összehasonlítás
  (`app/src/domain/nev.ts`) — igaz, ha egy sor neve még pontosan az
  árlistai nevet használja adott nyelven; ezt hívja mind a `sorFallback`
  (a szerkesztő `HU`/„átírt" jelvényéhez, a JELENLEGI nyelvvel), mind a
  `PatientPage.tsx` `applyNyelv`-je (a RÉGI nyelvvel, hogy eldöntse, melyik
  sor nevét frissítse). A `sorFallback` visszatérési típusa `boolean`-ból
  egy ok-típusra (`SorFallbackOk`) váltott, mert két, vizuálisan
  megkülönböztetett esetet kell jeleznie. Új `nyelvvaltasHatasa()` a
  Páciens adatlap nyelváltás-megerősítő dialógusának élő számlálásához.
  A `PreviewPage.tsx` véglegesítés-őrének „Tételnevek nem németül"
  dialógusa két külön listára bontva sorolja fel a hiányzó fordítású és a
  kézzel eltérített neveket (`fallbackSorok` visszatérési típusa is ennek
  megfelelően objektummá vált). Mellékesen felszínre került és javításra
  került egy ettől független, korábban rejtett hiba is: a dialógus
  „Folytatás" gombja `AlertDialog.Action`-be volt csomagolva, aminek
  beépített auto-close viselkedése versenyhelyzetbe került a kétlépéses
  megerősítő lánccal (`missing-fields` → `de-fallback-names`), és emiatt a
  második dialógus sosem jelent meg — egy hiányos páciensadatú, hiányzó
  német tétellel rendelkező német terv csendben átugrotta a német
  figyelmeztetést. Lásd git history a részletes commitért.

---

## Technikai adósság (a 2026-08-06-i kódreview nyitva maradt tételei)

A review P0-jai (8/8) és P1-jei (9/9) mind javítva lettek — lásd git
history a `4aed289`, `65f8f91`, `a0d4a08` commitok környékén. Az alábbi
tételek maradtak nyitva:

**Storage-írási minta nincs kikényszerítve** (méret: **L**, architektúra-
szintű). A `PlanStorage` interfész csak a *hogyan*-t rögzíti (D5), a
*mikor*-t minden oldal maga dönti el: a tervszerkesztő pufferelt,
egyszeri mentést használ, az Árlista admin és a Beállítások azonnali,
mezőnkénti mentést. Ma ártalmatlan (`localStorage`), de a tervezett
`FileSystemStorage`-váltásnál (`docs/05` 2. fázis) teljesítmény- és
megbízhatósági kockázattá válik — pont ott, ahol a D16 takarítás miatt a
legtöbb jövőbeli admin-szerkesztés várható. Helyszín: architektúra-szintű,
nem egy file:line.

**`storage/seed/priceList.ts:6` határsértés** (méret: **S**). Négy
`../`-vel importál a repo gyökerén lévő `data/`-ból, át a CLAUDE.md
szerint „csak referencia" mappaként leírt határon — ha valaki
átmozgatja/átnevezi a fájlt, a build csendben eltörik. Nincs
másolási/validációs lépés a határon.

**`commit()`/`patch()` functional updater nélkül** (méret: **M**, félig
kész). `PriceListAdminPage.tsx` és `SettingsPage.tsx` render-idejű
closure-t zár be egy async mentéshez — gyors egymás utáni módosítás
versenyben felülírhatja egymást. A vizuális visszajelzés fele elkészült a
mentési-siker jelzéssel; a functional-updater átírás maradt nyitva. A
`NumberField` blur-commitja után a versenyablak a gyakorlatban minimálisra
szűkült, de nincs strukturálisan kizárva.

**Titkosítatlan `localStorage` páciensadattal** (méret: **L**, tervezési
döntés a mockup-fázisban — a CLAUDE.md szerint szándékos, a mockup a
system of record helyett demonstráció). A véglegesített `Plan` (név,
születési dátum, lakcím, telefon, email, TAJ, kiskorú esetén törvényes
képviselő) titkosítás és lejárat nélkül landol a publikus origin
`localStorage`-ában. Kockázatcsökkentve: `DemoBanner` figyelmeztet, „Minden
adat törlése" gomb elérhető a Kezdőlapon. Az architekturális megoldás a
`FileSystemStorage`-váltás (2. fázis), nem a mockup feladata.

**Cím szintű, kisebb tételek** (nem vitt tovább külön leírással, ha később
kellenének):
- `basePrice()` újraírva a `PlanEditorPage`-ben a `domain/money.ts` export
  helyett, holott a CLAUDE.md ezt név szerint a „használd, ne írd újra"
  listában sorolja fel.
- `SAVOS` min/max mezők függetlenül szerkeszthetők, `min > max`-ra nincs
  validáció.
- `parseTeeth` nem dedupol — egy elgépelt duplikált fogszám átmegy a
  validáción.
- Három legnagyobb/legvalószínűbben ütköző fájl: `PlanEditorPage.tsx`
  (628 sor — page shell, `PhaseCard`, `LineRow`, `ItemPicker` mind egy
  fájlban), `PriceListAdminPage.tsx` (441 sor — saját, driftelt
  stílus-másolatot cipel a `design/ui.ts` helyett), `pdf/TervDocument.tsx`
  (422 sor — közös `s` style-objektum, saját kommentje szerint már most
  „német layout-törés" kockázatot jelez).
- Háromféle gombstílus (`design/ui.ts` `btn()`, `PriceListAdminPage`
  helyi `btn()`, `Home.tsx` `btnPrimary`/`btnSecondary`) — vizuálisan
  eltérő gombméret képernyőnként.
- `PreviewPage.finalize()` tesztelhetetlen — a véglegesítés teljes
  őrlogikája (kötelező mező, hiányzó fordítás megerősítése, jogi
  fallback-ellenőrzés) egyetlen komponens-függvényben van, nincs belőle
  kiszedhető pure function.

---

## KÉSŐBB — valódi érték, de nagy vagy kockázatos

- **Ajánlat-állapot és visszahívás-jelzés** (pl. `allapot.json` a
  páciensmappában, a verziómappákon kívül) — valódi haszon
  (időmegtakarítás, hogy tudni lehessen, kit kell visszahívni), de új
  fájltípus és állapotgép, ami a D4 append-only szemléletéhez képest más
  jellegű adat; alaposabb tervezést igényel, hogy ne csússzon system of
  recorddá olyasmi, ami nem terv.
- **Teljes verzió-diff nézet** (mi változott sorszinten v1 és v2 között) —
  a 11. tétel egyszerű összeg-kiírása után derül ki, mennyire hiányzik ez
  ténylegesen; ha igen, külön kör.
- **Valódi összetett csomag-tétel** (csomag = tételek listája, nem szabad
  szöveg) — a 10. tétel (leírás-sor) valószínűleg kiváltja a szükségletet;
  csak akkor térjünk vissza rá, ha a leírás-sor nem elég.
- **Tömeges árváltoztatás az adminban** (pl. „minden implantátum ára +5%")
  — valódi időmegtakarítás egy árlistafrissítéskor, de nem sürgős, évente
  egyszer kell.
- **Fogtechnikusi munkalap generálása** — más célközönség (a technikus, nem
  a páciens), más adattartalom; külön funkció, nem ennek a nyomtatványnak a
  bővítése.
- **Séma-migrációs út** — ma a `schemaVersion` csak felfelé véd (magasabb
  verziót elutasít), lefelé nem migrál; amíg `schemaVersion` marad 1 (a
  fenti 14 tétel egyike sem emeli), nem sürgős, de a D18 előbb-utóbb
  megköveteli.
- **`terv.json` beágyazása a PDF-be** (D5) — a `docs/05` explicit a 2.
  fázisra (fájlrendszeres verzió, `pdf-lib`) ütemezi; a mockupban nincs
  értelme siettetni.
- **A német jogi szövegek tényleges lektorálása** — ez nem fejlesztési
  feladat, hanem jogászi munka; a 6. tétel (placeholder-őr) csak addig
  védi ki a kockázatot, amíg ez meg nem történik.
- **Automatikus darabszám a fogszámokból (D14 újranyitása)** — a `docs/01`
  szerint ez hetekre elakasztotta volna az eredeti projektet; a mai
  figyelmeztető sáv elég, amíg nincs konkrét panasz rá.

## SOHA — hangzatos, de nem éri meg, vagy sérti a kereteket

- **Számlázás, egészségpénztári igazolás, NAV-integráció** — külön
  szoftver dolga, nem ennek az eszköznek a felelőssége; összekötésük
  fölöslegesen bonyolítaná és kockáztatná a jelenlegi tiszta határt (nincs
  szerveroldali adat).
- **Betegdokumentáció, EESZT-kapcsolat** — teljesen más adatkezelési és
  jogi kategória, más szoftver.
- **E-mail küldés az appból** — akárhogy nézzük, ez páciensadatot mozgatna
  a rendelő gépén kívülre egy harmadik fél (levelezőszerver)
  szolgáltatásán át; ez ütközik a D2–D3 kerettel.
- **Páciensportál, online elfogadás, e-aláírás** — szerveroldali
  komponenst és páciensadat-tárolást igényelne a rendelőn kívül; kizárt a
  D2 miatt.
- **Statisztika-dashboard** — nem merült fel a doktor-napokból, és
  bármilyen fogászati szoftverre igaz lenne, nem erre a valós munkanapra
  épül.
- **Bármilyen AI ebben az appban** — nincs olyan konkrét munkalépés, amit
  egy AI kiváltana úgy, hogy a hibázás következménye elfogadható lenne egy
  aláírandó, szerződéses dokumentumon. (A meglévő gépi fordítás is épp
  azért van jelölve és lektorálásra várva, mert ez a kockázat már most is
  fennáll — nem szabad növelni.)
- **Automatikus árfolyam-lekérés** — a D11 kifejezetten kizárja, és
  jogosan: egy külső API-hívás egy szerződéses árat tenne függővé egy
  harmadik féltől.
- **Kedvezmény külön soron a nyomtatványon** — a D9 direkt ellenkezőjét
  mondja ki, jó okkal (a kedvezmény ne váljon a papíron vitatható ténnyé).
- **Többfelhasználós jogosultságkezelés** — a D1 szerint egy rendelő,
  belső eszköz; ez sosem lesz több felhasználós termék.
- **Mobilapp, felhőszinkron** — a Google Drive-tükrözés már megoldja a
  hozzáférést a doki gépéről; egy natív mobilapp új adatvédelmi felületet
  nyitna a GDPR 9. cikk szerinti adaton, feleslegesen.
- **Ártétel-ár historizálás az árlistában** — a D7 (soronkénti pillanatkép)
  már megoldja, amire ez kellene; egy párhuzamos történeti napló csak
  duplikálná ugyanazt az információt.
- **Sor-szintű megjegyzés-oszlop külön mezőként** — a D13 ezt kifejezetten
  kizárja, és a fenti 3. tétel (szerkeszthető sornév) + 10. tétel
  (leírás-sor) együtt lefedi, amire ténylegesen szükség volt.
- **Kategória-böngésző a keresőben** — a D19 kifejezetten kizárja; a
  doktor-napok egyike sem mutatott rá valós igényt a böngészésre, csak a
  keresés pontosságára.

---

## Függelék: honnan jönnek az igények (Dr. Mándoki István három munkanapja)

Termékreview a doki szemszögéből, a valódi kódra és a valódi árlistára
építve (`data/arlista.seed.json`, 118 tétel) — ebből fakad a fenti MOST
lista minden tétele.

**A) Egy hétköznap délelőtt.** Az első három beteg rutin, de nincs
gyorsgomb egyetlen tételen sem (senki nem jelölte be a `gyakori`
csillagot), így minden alkalommal karakterről karakterre gépelni kell
konzultáció/panoráma/CBCT-t. Egy sornevet (`"Bölcsességfog mütéti
eljárással (seb.gond.,varrat szedés)"`) nem lehet a soron javítani, csak
elfogadni ékezethibásan. Egy visszatérő páciens (Nagy Éva) új verziója a
régi, júniusi keltezéssel nyomtat — csak este derül ki a PDF-et
ellenőrizve, hogy egy lejárt ajánlatot nyomtatott ki, amit majdnem
aláírattak volna. Egy sürgős hívás közben elveszik a piszkozat, mert csak
memóriában él — harmadszori újragépelés aznap.

**B) Egy nagy All-on-X konzultáció.** Az „All-on-4 Anax csomag" egyetlen
sorként megy be 1 950 000 forinttal — a páciens megkérdezi, mi van benne,
nincs mit mutatni, csak amit a doki szóban mond. Nincs tétel az
érzéstelenítésre, kontrollvizsgálatra, hagyományos implantáció sebészi
díjára. A csontpótló anyagot fix áron viszi fel, pedig a mennyiség csak a
műtőben derül ki — a csillagos „becslés" jelölés ma csak két
gyökérkezelési tételen működik, itt nem. Az 50%-os fogtechnikai előleget
fejben osztja ki és kézzel írja a papír aljára. A „Kezelések összesen" és
a „Fizetendő" sor kedvezmény nélkül pontosan ugyanazt a számot mutatja,
amire nincs jó válasza, ha a páciens rákérdez.

**C) Egy német páciens.** A nyelvet bekapcsolja, a pénznemet forinton
hagyja — ezt az app jól kezeli. A keresőben nem találja a Neodent
implantátumot, mert az árlistában elgépelve szerepel („Neodetn"). Az
euró/cent tévesztés majdnem megtörténik nála is (606 helyett 60600
kellett volna) — az admin felületen ez már jól működik, a szerkesztőben
még nem (5. tétel). Véglegesítéskor a nyilatkozat helyén ott áll: „ez a
szöveg jogilag még nincs lezárva" — ezt a páciens elé nem lehet tenni, a
doki csak a „csak ajánlat" változatot tudja kinyomtatni, aláírás nélkül
(6. tétel).

**A négy kérdés, amit a review feltett:**

1. *Mi az a három dolog, ami miatt egy hét után visszatérne az
   Excelhez?* A piszkozat elvesztése minden frissítésnél (1. tétel), egy
   visszatérő páciens régi dátummal nyomtató új verziója (2. tétel), és
   hogy senki nem jelölte be a gyakori tételeket (8. tétel).
2. *Mit csinál a mai munkájában, amit az app egyáltalán nem érint?*
   Visszahívás/emlékeztető (Zsófi vezeti füzetben), fogtechnikussal való
   egyeztetés, garancia-nyilvántartás (fejben), egészségpénztári
   igazolás/számlázás (külön szoftver, szándékosan nem itt), utánkövetés.
   Ezekhez az app szándékosan nem nyúl.
3. *Mit kérdezne a páciens, amire ma nem tud jól válaszolni?* „Mi van
   benne ebben az egy sorban?" (10. tétel), „Miért van két összeg, ha
   ugyanaz a szám?" (12. tétel), „Mennyi az előleg?" (9. tétel), „Van rá
   garancia?" (13. tétel).
4. *Hol tévedtünk abban, ahogy elképzeltük a munkáját?* A billentyűzetes
   felviteli ciklus, a verziózás elve, a kétnyelvűség váza jó irányban
   vannak. De alábecsültük, hogy egy All-on-X ajánlat nem egy tömés-lista,
   hanem tárgyalási eszköz — a sorokat tökéletesre csiszoltuk, a sorok
   mögötti tartalmat (mi van benne, mennyi bizonytalan, mennyit kell most
   letenni) kihagytuk.
