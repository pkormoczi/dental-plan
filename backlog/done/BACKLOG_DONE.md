# Lezárt backlog-tételek

> **Folyamatosan bővülő napló**, nem egyszeri pillanatkép: ide kerül egy
> backlog-tétel összefoglalója, amikor a `backlog/BACKLOG.md`-ből
> „Backlog-tétel lezárása" (lásd `CLAUDE.md`) szerint törlődik, mert
> teljesen elkészült. **Erre a fájlra sehonnan sem szabad hivatkozni** —
> sem `docs/*.md`-ből, sem forráskódból, sem a `CLAUDE.md`-ből.
>
> Az alábbi, 2026-08-09 előtti szakasz az első kör lezárt anyaga —
> változatlanul hagyva, szándékosan történeti hűséggel (a belső
> kereszthivatkozásai a saját, akkori `docs/archive/backlog/`-beli
> tervfájljaira mutatnak; 2026-08-11-től ugyanezek a tervfájlok a
> `backlog/done/` alatt élnek, a szöveg erre nem lett átírva).
---

## MOST

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
- **Megvalósítás:** a döntési részletek `docs/archive/backlog/backlog-1-piszkozat-terv.md`-ben
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
- **Megvalósítás:** a döntési részletek `docs/archive/backlog/backlog-2-friss-datum-terv.md`-ben
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
- **Megvalósítás:** a döntési részletek `docs/archive/backlog/backlog-3-sornev-egyedi-sor-terv.md`-ben
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

### 4. Sor-szintű „becsült ár" (≈) kapcsoló — KÉSZ (2026-08-09)

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
  `docs/archive/backlog/backlog-4-becsult-ar-kapcsolo-terv.md`-ben (grill-me munkamenet, 6
  döntés + Utóirat). Az eredeti terv szerint egy mindig látható csillag
  `IconButton` került a `LineRow` névcellájába (a `PriceListAdminPage.tsx`
  `gyakori`-csillagjának mintája), ami `onPatch({ savos: !line.savos })`-t
  hív — bármelyik sor bármelyik irányba átbillenthető, eredet-nyilvántartás
  nélkül (egy ma is SAVOS árlistai tételről is levehető). Ugyanaznap két
  további iteráció (lásd a terv-doksi Utóiratát) átköltöztette a kapcsolót
  az "Ajánlati ár" cellába, az ár `NumberField` mellé: végül egy ghost
  `IconButton`, `≈` szövegglyph tartalommal (nem csillag — az összetéveszthető
  lett volna a "gyakori"-jelöléssel), `t.warn`/`t.uiTextFaint` szín jelzi az
  állapotot. A `pdf/TervDocument.tsx` nem változott — a csillag és a
  lábjegyzet ott már korábban is generikusan a `savos` mezőt olvasta.
  Mellékesen feloldotta a 3. backlog-tétel (egyedi sor) 7. döntését, ami a
  `savos: false`-t addig kezdőértéknek, nem zárolásnak szánta: az egyedi
  soron a kapcsoló ugyanúgy működik, mint bármelyik máson, a
  `sorMezokEgyedibol` kódkommentje ezt most már tükrözi. Új
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
- **Megvalósítás:** a döntési részletek `docs/archive/backlog/backlog-5-eur-mezo-terv.md`-ben
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
  `docs/archive/backlog/backlog-6-sablon-placeholder-terv.md`-ben (grill-me munkamenet, 5
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
- **Terv:** `docs/archive/backlog/backlog-7-kereso-terv.md` (4 döntés). A két rész
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

### 9. Előleg-sor a nyomtatványon — KÉSZ (2026-08-09)

- **Méret:** fél nap — opcionális mező a `Plan`-en (visszafelé
  kompatibilis, `schemaVersion` nem változik), szerkesztő mező, PDF-sor.
- **Kereteket sért?** Nem.
- **Valódi haszon:** pácienskommunikáció, közvetlenül a Függelék B) napi
  jelenetre — a fizetési feltételek szövege ma kimondja az 50%-ot, de
  sosem számolja ki, ezt ma fejben teszi a doki.
- **20%-os verzió:** ez már maga a 20%-os verzió — egy teljes fizetési
  ütemterv (részletekre bontás, dátumokkal) sokkal nagyobb munka lenne, és
  nem is merült fel igényként.
- **Terv:** `docs/archive/backlog/backlog-9-eloleg-sor-terv.md` (9 döntés). Egyetlen új
  opcionális mező (`Plan.elolegSzazalek: number | null`, `null` = kikapcsolva),
  `schemaVersion` marad 1; az összeg a `Fizetendő`-ből számol, nem a
  `Kezelések összesen`-ből; az 1. oldal összegzése két új sort kap (Előleg /
  Fennmaradó), a 2. oldal sablonszövegébe viszont csak a százalék kerül,
  forintösszeg nem. Méret változatlan.
- **Megvalósítás:** új opcionális `Plan.elolegSzazalek` mező (`domain/types.ts`,
  `schemaVersion` marad 1; hiányzó mező egy régi `terv.json`-ben `null`-ként
  olvasódik), `createBlankPlan()` `null`-lal indul, és a
  `piszkozatTartalmas()` is figyeli (egy bekapcsolt kapcsoló önmagában is
  védendő tartalom). Új `elolegOsszegek(fizetendo, szazalek)` +
  `ELOLEG_ALAP_SZAZALEK` export (`domain/totals.ts`) — az EGYETLEN hely,
  ahol a kerekítés eldől; a fennmaradó részt KIVONÁSSAL adja, nem külön
  kerekítéssel, hogy a két szám mindig pontosan a fizetendőt adja ki. A
  szerkesztőben új `ElolegBlokk` a `Summary` alatt (checkbox +
  0–100 közé szorított `NumberField` + a két összeg élőben). A
  nyomtatványon két új sor a `Fizetendő` alatt, kisebb súllyal, `hasRange`
  esetén MINDKETTŐ csillaggal; új `elolegSor(szazalek)`/`fennmaradoResz`
  felirat (`pdf/labels.ts`, mindkét nyelven), és a `savosFootnote` szövege
  is bővült, hogy a belőlük számolt összegeket is lefedje — nincs második
  csillag-jelentés az oldalon. A fizetési feltételek seed-sablonja
  `{{elolegSzazalek}}` helyőrzőt kapott, ami kikapcsolt kapcsolónál az
  50-es alapértékre esik vissza (a mondat így szó szerint a mai, aláírt
  szöveg marad) — nem kellett feltételes sablon-blokk. 12 új teszt
  (`totals.test.ts` kerekítés/szélsőértékek, `piszkozat.test.ts`,
  `TervDocument.test.tsx` ki/be/eltérő százalék/csillag/német,
  `PlanEditorPage.test.tsx` a kapcsoló élő számolása).
  `docs/02-domain-modell.md`, `docs/03-funkcionalis-spec.md` és
  `docs/04-nyomtatvany-spec.md` frissült. Menet közben javítva egy
  doc-drift: a `docs/03` „Egyedi sor" szakasza még azt állította, hogy a
  becsült-ár jelölő nem érhető el egyedi soron (a 4. tétel óta elérhető).

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
- **Terv:** `docs/archive/backlog/backlog-11-verzio-vegosszeg-terv.md` (5 döntés). A
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
- **Terv:** `docs/archive/backlog/backlog-12-osszegsor-terv.md` (5 döntés). **A döntés
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
- **Terv:** `docs/archive/backlog/backlog-14-demo-tetelid-terv.md`. **Hatókör-korrekció:
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
  `docs/archive/backlog/backlog-3b-nyelvvaltas-nevmegorzes-terv.md`-ben (grill-me
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

### 16. Terv-szintű „kerek végösszeg" kedvezmény — KÉSZ (2026-08-10)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — a D8 (kedvezmény külön tárolva, mérhetően)
  kifejezetten támogatja.
- **Valódi haszon:** bevétel + időmegtakarítás — az alku zárása („legyen
  kereken 2 050 000") korábban soronkénti visszaosztás volt számológéppel
  a páciens előtt.
- **20%-os verzió:** nem készült önállóan — a teljes megoldás (fix
  kedvezmény-összeg tárolása + a végösszeg soha nem negatív) egy
  összefüggő döntéssorozat volt.
- **Megvalósítás:** additív, opcionális `Plan.kedvezmenyOsszeg` mező (az
  `elolegSzazalek` precedense szerint, `schemaVersion` marad 1) —
  `docs/02-domain-modell.md` § Terv-szintű kedvezmény, D25
  (`docs/01-attekintes-es-dontesek.md`). A doki a szerkesztőben egy
  cél-végösszeget gépel be, az app ebből egyszer kiszámolja és FIX
  összegként tárolja a kedvezményt — így egy utólagos sormódosítás soha
  nem írja át némán. Új `tervVegosszeg(fazisok, kedvezmenyOsszeg)`
  (`domain/totals.ts`) az EGYETLEN hely, ahol a Fizetendő eldől — a
  szerkesztő, a nyomtatvány és a `computeOsszesitok()`/`osszesitokElter()`
  mind ezt hívja; korábban a sorok nyers összege három helyen,
  egymástól függetlenül számolódott újra. Soha nem ad negatívat (0-ra
  padlóz egy utólagos sortörlés esetén, a szerkesztő ezt jelzi is). A
  nyomtatványon a meglévő feltételes kétsoros összegzés
  (`docs/04-nyomtatvany-spec.md` § Összegzés) nyílik meg a terv-szintű
  kedvezménytől is, sorszintű eltérés nélkül; a kedvezmény összege
  továbbra sem jelenik meg (D9), és az előleg a csökkentett összegből
  számol.

### 17. Terv másolása új tervként / új terv a páciens adataival — KÉSZ (2026-08-10)

- **Méret:** fél–1 nap.
- **Kereteket sért?** Nem — D4 érintetlen, a másolat mindig új, üres
  `tervId`-vel indul, sosem csúszik be verzióként egy meglévő láncba.
- **Valódi haszon:** időmegtakarítás (visszatérő páciens adatai és a
  közös sorok újragépelése esik ki), pácienskommunikáció (A/B ajánlat a
  legnagyobb értékű konzultáción), hibacsökkentés (TAJ/cím újragépelése).
- **Megvalósítás:** két belépési pont a Korábbi tervek listán — „Új terv a
  páciens adataival" (páciensszinten, csak a `paciens` blokkot viszi
  tovább egy friss alaptervre) és „Másolás új tervként" (verziószinten,
  mindent átvisz a kattintott verzióból az azonosító/állapot/dátum
  kivételével). Mindkettő a Páciens adatlapra navigál, nem egyenesen a
  szerkesztőbe, és nincs hozzá külön tisztázó dialógus — a meglévő
  piszkozat-felülírás-őr elég. `docs/03-funkcionalis-spec.md` § Terv
  másolása új tervként, D26 (`docs/01-attekintes-es-dontesek.md`).

### 10. Tétel-leírás a csomagtételekhez — KÉSZ (2026-08-10)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — a D13-határ (nincs általános sor-szintű
  megjegyzés-oszlop) védelme a UI címkézésén múlik („Leírás (mi van
  benne?)"), a mező szigorúan "mi van ebben a sorban" tartalomra való.
- **Valódi haszon:** pácienskommunikáció — egy összetett tétel (pl.
  „All-on-4 Anax csomag") ezután nemcsak egyetlen árral, hanem egy
  kétnyelvű leírással is bekerül a tervbe, hogy a páciens otthon is el
  tudja mondani, mi van benne.
- **Megvalósítás:** additív, opcionális mezők — `Tetel.leiras`
  (`LokalizaltSzoveg`, a `nev` mintáján), `Tetel.csomag` (a
  véglegesítés-őrt vezérli), `Sor.leirasSnapshot` (pillanatkép, a
  `nevSnapshot` mintáján), `Plan.leirasokMutatasa` (terv-szintű
  nyomtatás-kapcsoló, alap `true`) — `docs/02-domain-modell.md` §
  Tétel-leírás, D27 (`docs/01-attekintes-es-dontesek.md`). A leírásnak,
  ellentétben a névvel, **nincs** HU-visszaesése: hiányzó német fordítás
  némán elmarad a nyomtatványról, nem esik vissza magyarra. A
  szerkesztőben összecsukható „+ leírás" trigger soronként (amber jelzés,
  ha a sor csomag-tételre hivatkozik és üres a leírása); a nyomtatványon a
  tételsor alatt, behúzva, a tételsorral egy oldaltörés-védett blokkban
  (`docs/04-nyomtatvany-spec.md` § Tételtáblázat); a véglegesítés-őr egy
  harmadik, puha megerősítő lépéssel jelzi a hiányzó csomag-leírásokat
  (`docs/03-funkcionalis-spec.md` § 4. Előnézet és véglegesítés).

### 8. Árlista-nap: kategóriakezelés kódban + adattisztítás a dokival — KÉSZ (2026-08-10)

- **Méret:** fél nap kód.
- **Kereteket sért?** Nem.
- **Valódi haszon:** kategória-CRUD (létrehozás, átnevezés, színezés,
  fel/le sorrendezés, törlés csak üres kategórián) egy összecsukható
  panelen az Árlista adminban — korábban a kategóriakezelés kódba
  huzalozott átnevezést/újratelepítést igényelt.
- **Megvalósítás:** a fogtérkép színe a kódba huzalozott 8 elemű
  „vödör"-tábla helyett közvetlenül az árlista `Kategoria.szin` mezőjéből
  olvas (`design/treatmentVisuals.ts` átírva); egy fogon több kezelés
  esetén a kategórialista sorrendje az ütközési prioritás —
  `docs/03-funkcionalis-spec.md` § Kategóriák panel,
  `docs/07-felulet-rendszer.md` § Szín, forma, sűrűség, D28
  (`docs/01-attekintes-es-dontesek.md`). Emellett a
  `data/arlista.seed.json`-ban elvégeztük azt az adattisztítást, ami
  tisztán mechanikus volt (nem igényelt doktori döntést): ~20 elgépelés
  javítva, `k01 Besorolatlan` átnevezve „Diagnosztika és
  konzultáció"-ra, az `k12 Egyéb kezelések` 6 fogszabályozási tétele
  saját `k13 Fogszabályozás` kategóriába átmozgatva, az 5 francia
  maradványtétel + a `Lokátor felépítmény` duplikátum inaktiválva
  (`aktiv: false`, id megtartva, D17) — `docs/06-arlista-import.md`. A
  hátralévő doktori adatmunka (`gyakori` csillagozás, `SAVOS`
  alsó-határok, a maradék kategorizálási döntések) külön, kódot nem
  igénylő tételként él tovább a `docs/08-backlog.md`-ben.

### 13. Garancia szakasz a nyomtatványon — KÉSZ (2026-08-10)

- **Méret:** fél nap kód.
- **Kereteket sért?** Nem — D23 emiatt lett általánosítva: a garancia a
  nyilatkozattal ellentétben nem kap kemény placeholder-zárat, mert nem
  aláírandó lap, a fizetési feltételekkel egyező HU-visszaesést kap.
- **Valódi haszon:** pácienskommunikáció — a „Van rá garancia?" kérdésre
  ma csak szóbeli válasz van.
- **Megvalósítás:** új, önálló oldal a nyomtatványon (a fizetési
  feltételek után, a nyilatkozat előtt), harmadik sablon-szlotként
  (`garancia-hu`/`garancia-de`) a nyilatkozat/fizetési feltételek már
  meglévő, teljesen generikus betöltő-/mentő-/verziózó infrastruktúráján
  — a Beállításokban szerkeszthető, „csak ajánlat" módban is mindig
  megjelenik — `docs/04-nyomtatvany-spec.md` § „3. oldal — garancia",
  `docs/03-funkcionalis-spec.md` § Sablon-placeholder őr, D23
  (`docs/01-attekintes-es-dontesek.md`). A tényleges magyar
  garanciaszöveg még a dokitól vár — a `GARANCIA_HU_V1` seed egyelőre
  placeholder; ez külön, kódot nem igénylő tételként él tovább a
  `docs/08-backlog.md`-ben.

### 25. Páciens-entitás a Korábbi tervek fájában — KÉSZ (2026-08-11)

- **Méret:** 2–4 fejlesztői nap.
- **Kereteket sért?** D26-ot pontosította, nem törölte el — az új D29
  rögzíti a páciens explicit entitásként (`paciensId`) való kezelését.
- **Valódi haszon:** a Korábbi tervek lista ezután páciens → terv → verzió
  háromszintű fát mutat, nem csak páciens → verzió kettőt — egy visszatérő
  páciens több terv-lánca (nem csak több verziója) is elkülönítve, saját
  címkével jelenik meg, csoportosítva, összecsukhatóan.
- **Megvalósítás:** új `paciens.json` (páciens-mappa index, `paciensId` +
  `nev`) és `terv-cimke.json` (terv-mappánként, a verziómappákon kívül,
  D4-en kívül eső, bármikor szabadon átírható címke) fájlszint —
  `docs/02-domain-modell.md` § Páciens- és terv-mappa, D29
  (`docs/01-attekintes-es-dontesek.md`). A `PlanStorage` interfész
  (`docs/05-technologia.md`) `listPlans`/`savePlanLabel`-lel bővült, a
  `PlanRef` hármas (`patientDir`/`planDir`/`versionDir`) lett. A Kezdőlap
  „Új terv indítása” gombja egy köztes páciens-választó lépésre navigál
  (`/uj-terv`) — „Meglévő páciens keresése” vagy „Vadonatúj páciens” —,
  csak itt kétértelmű a célpáciens; a Korábbi tervek saját terv-indító
  gombjai változatlanul a forrás tervből ismert páciensre mennek. A
  háromszintű fa a Korábbi tervek listán 2+ terv-lánccal rendelkező
  páciensnél alapból csukva nyílik, kattintásra bomlik ki; egyetlen lánc
  esetén (a tipikus eset) nincs plusz kattintás —
  `docs/03-funkcionalis-spec.md` § 5. Korábbi tervek. Új
  `javasoltTervCim()`/`megjelenitettTervCim()` (`app/src/domain/tervCim.ts`)
  — a terv-lánc élő címke-javaslata a legnagyobb összegű kategória nevéből,
  ugyanazzal a precedencia-elvvel, mint a fogtérkép ütközésfeloldása (D28).

### 26. Filerendszer nézet (mockup fájlfa-vizualizáció) — KÉSZ (2026-08-11)

- **Méret:** ~1 fejlesztői nap.
- **Kereteket sért?** Nem — demó-only, olvasás-only vizualizációs réteg; a
  `PlanStorage` interfészt nem bővíti és a valódi mentési útvonalakat nem
  kerüli meg.
- **Valódi haszon:** a doki és a fejlesztő közös mentális modellje a leendő
  fájlrendszeres (FileSystemStorage, 2. fázis) architektúráról — egy új
  „Filerendszer” képernyő konkrétan megmutatja, mit ment az app, hová,
  milyen néven, milyen tartalommal, ahelyett hogy csak dokumentációból
  kellene elképzelni.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § 8. Filerendszer. Új,
  `DemoStorage`-tól független tiszta függvény
  (`app/src/storage/demoFileTree.ts` `buildDemoFileTree()`) a `dp:`
  localStorage-kulcsokból épít rendezett fát, allowlist-alapon (a
  piszkozat-cache-ek némán kimaradnak); a `DemoStorage`
  `listFileTree()`/`readRawFile()` demó-only mezőin (a `resetDemoData`/
  `clearAll`/`loadPlanPdf` mintájára) át érhető el a `StorageContext`-ből.
  A fa-nézet és a tartalom-panel a `ToothChartPanel` diszklózúra-mintáját
  követi.

### 18. Fázis törlése megerősítéssel — KÉSZ (2026-08-11)

- **Méret:** 1–2 óra.
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés — a szerkesztő egyetlen
  egy-kattintásos, többsoros, helyreállíthatatlan adatvesztési útját zárta
  le, amit a piszkozat-autosave azonnal rögzített is.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § Fázisok,
  `docs/07-felulet-rendszer.md` § Komponensek. `PlanEditorPage.tsx`-ben a
  fázistörlés megerősítő döntése felkerült a szülőbe: sorral rendelkező
  fázis törlése egy `AlertDialog`-ot nyit, üres fázisé egy kattintás marad.
  A dialógus `Action` gombja szándékosan nem a trigger feliratát ismétli
  (accessible-name-ütközés a DOM-ban maradó többi soronkénti triggerrel).

### 19. 0 Ft-os sorok puha figyelmeztetése véglegesítéskor — KÉSZ (2026-08-11)

- **Méret:** 2–3 óra.
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés — a gépel→Enter ciklus nulla
  találatnál egyedi sort vesz fel 0 Ft kezdőértékkel, tehát egy elgépelés
  + reflexes Enter eddig némán tehetett egy fantomsort az aláírandó
  dokumentumra; ugyanez véd az egyedi soron elfelejtett ár ellen.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § 4. Előnézet és
  véglegesítés. Új `nullaOsszeguSorok(plan)` export
  (`app/src/domain/kitoltetlen.ts`) a névvel ellátott, de 0 összegű
  sorokra; a `PreviewPage` meglévő, négylépésessé bővült
  `confirmStep`-láncában PUHA (átugorható) lépésként, a hiányzó/eltérő
  német tételnevek után és a hiányzó csomag-leírás elé sorolva. A
  dialógus címe/szövege a terv pénznemét követi.

### 20. Letöltési fájlnév: páciensnév + „PISZKOZAT" előtag — KÉSZ (2026-08-11)

- **Méret:** 1–2 óra.
- **Kereteket sért?** Nem.
- **Valódi haszon:** hibacsökkentés (rossz PDF csatolása e-mailhez a sok
  egyforma `kezelesi-terv-*.pdf` közül) + időmegtakarítás; a
  `PISZKOZAT-` előtag a „kiadott, de nem archivált PDF" audit-lyuk olcsó
  első védvonala.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § 4. Előnézet és
  véglegesítés „Letöltési fájlnév" és § 5. Korábbi tervek. Új
  `buildPatientNameSlug`/`buildDownloadFileName` export
  (`app/src/storage/paths.ts`) — az Előnézet „Letöltés" linkje és a
  Korábbi tervek verziósorának „⋯" → „Letöltés" menüpontja egyaránt
  ezeket hívja, a `PISZKOZAT-` előtag a nyers `plan.statusz`-ból.

### 21. `arlistaVerzio` léptetése admin-mentéskor — KÉSZ (2026-08-11)

- **Méret:** ~1 óra + teszt.
- **Kereteket sért?** Nem — a keret betartását javítja: a nyomtatvány
  láblécének „melyik árlistából készült" audit-ígérete
  (`docs/04-nyomtatvany-spec.md`) az első admin-árszerkesztés után hamis
  volt, mert az `arlistaVerzio` a seed-értéken fagyva maradt.
- **Valódi haszon:** hibacsökkentés/jogi — vitánál a lábléc a
  hivatkozási pont.
- **Megvalósítás:** az Árlista admin `commit()`-je (`PriceListAdminPage.tsx`)
  minden mentéskor, tartalmi megkülönböztetés nélkül a mai napra állítja
  az `arlistaVerzio`-t a `modositva` mellett, egyetlen közös `todayIso()`
  hívással — `docs/03-funkcionalis-spec.md` § 6. Árlista admin, D30
  (`docs/01-attekintes-es-dontesek.md`). A már mentett terveken lévő
  érték ettől függetlenül pillanatkép marad (D7).

### 22. Régi terv megnyitása új lapon (csak megnézés) — KÉSZ (2026-08-11)

- **Méret:** 1–2 óra.
- **Kereteket sért?** Nem.
- **Valódi haszon:** időmegtakarítás + kockázatcsökkentés — a „csak
  ránézek" út eddig a szerkesztésre nyitáson (piszkozatot veszélyeztet,
  véletlen új verziót hozhat létre) vagy a Letöltések mappán át vezetett.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § 5. Korábbi tervek. A
  verziósor „⋯" menüjének új, legelső eleme („Megnézés") a `Letöltés`-sel
  azonos `loadPlanPdf`-et hívja, de a mentett PDF-et új böngészőlapon
  nyitja meg (`blob:` URL) a Letöltések mappa helyett, és a piszkozatot
  egyáltalán nem érinti. A popup-blokkolás elkerülésére a `window.open`
  szinkron, még a PDF-lekérés előtt fut; hiányzó PDF esetén az üres lap
  bezárul, és ugyanaz az inline hiba jelenik meg, mint a `Letöltés`-nél.

### 23. Egyedi sor pontosabb megnevezése a német véglegesítés-őrben — KÉSZ (2026-08-11)

- **Méret:** fél óra + teszt.
- **Kereteket sért?** Nem — a D21-őr szigora (soha nem néma) változatlan
  maradt, a tétel csak a kategorizálást pontosította.
- **Valódi haszon:** kicsi, de valós hibacsökkentés — egy németül beírt
  egyedi sorra korábban az őr „farkast kiáltott" (a „nincs német nevük az
  árlistában" lista alá sorolta, holott nincs is mögötte árlistai tétel),
  ami pont ott koptatta a riasztás hitelét, ahol a valódi találat komoly.
- **Megvalósítás:** `docs/03-funkcionalis-spec.md` § Egyedi sor és § 4.
  Előnézet és véglegesítés. A `sorFallback()`/`fallbackSorok()`
  (`app/src/domain/nev.ts`) egy harmadik `'egyedi'` okot különböztet meg a
  korábbi `'nincsForditas'`-tól — a véglegesítés megerősítő dialógusa
  emiatt már három külön felsorolást mutat, a szerkesztő pedig egyedi
  soron csak a szürke „egyedi" jelvényt jeleníti meg, amber `HU`-t nem.

### Technikai adósság kör — KÉSZ (2026-08-12)

A `backlog/BACKLOG.md` „Technikai adósság" szakaszának négy, nem
számozott tétele — nem egyetlen tervezett funkció, hanem egy önálló
karbantartási kör négy önálló javítása.

- **`parseTeeth` dedupolása** (XS). A fogszám-parser mostantól
  sorrendtartóan dedupolja az ismételt FDI kódot (`domain/teeth.ts`) — egy
  „16, 17, 16" mező korábban két kiemelést adott a fogtérképen és hamis
  darabszám-eltérés figyelmeztetést. A nyomtatványra kerülő nyers szöveg
  változatlan marad (`docs/02-domain-modell.md` § Fogszám kezelés).
- **SAVOS fordított sáv puha figyelmeztetése** (S). Ha a `min` nagyobb,
  mint a `max`, az Árlista admin amber jelzést ad a mezőpár alatt, a
  mentés attól még lefut (`savosHatarForditott()`, `domain/money.ts`,
  `docs/03-funkcionalis-spec.md` § 6. Árlista admin).
- **`commit()`/`patch()` functional updater** (M, a kör magja). A
  `savePriceList`/`saveSettings` (`AppState.tsx`) mostantól kizárólag
  updatert fogad, a memóriabeli állapot a mentés előtt optimistán frissül,
  és az író réteg (`DemoStorage`) egy közös láncon sorosítja az
  egymást gyorsan követő írásokat — új D31 (`docs/01-attekintes-es-dontesek.md`),
  részletek `docs/05-technologia.md`-ben.
- **Véglegesítés-őr kiemelése** (M). A `PreviewPage.tsx` kemény
  blokkjának és puha `confirmStep`-láncának magja tiszta domain modulba
  költözött (`veglegesitesDiagnozis()`/`kovetkezoLepes()`,
  `domain/veglegesitesOr.ts`), unit tesztekkel — a React state és a
  dialógus-szövegek a `PreviewPage.tsx`-ben maradtak
  (`docs/03-funkcionalis-spec.md` § 4. Előnézet és véglegesítés).

### 27. Automatikus darabszám a fogszámokból — KÉSZ (2026-08-12)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — D14 részleges újranyitása (az egységtípus
  explicit tétel-/kategória-szintű besorolása változatlanul kimarad,
  heurisztika váltja ki); az új D32 a kézi felülbírálás védelmét mondja ki,
  a D24 mintáján.
- **Valódi haszon:** időmegtakarítás — a doki eddig minden sorban kézzel
  gépelte be a darabszámot is, miután már felsorolta a fogakat.
- **Megvalósítás:** additív, opcionális `Sor.mennyisegKezi` mező
  (`schemaVersion` marad 1) — `docs/02-domain-modell.md` § Fogszám kezelés,
  D32 (`docs/01-attekintes-es-dontesek.md`). Új
  `kovetettMennyiseg()`/`sorPatchKovetessel()` (`app/src/domain/mennyiseg.ts`)
  — az EGYETLEN hely, ahol egy `Sor`-patch fogak→darabszám hatása eldől; a
  `PlanEditorPage.tsx` `patchLine`-ja hívja minden sorpatchre. Hiányzó
  `mennyisegKezi` (egy, a funkció bevezetése előtt mentett sor) kézinek
  számít, nem automatikusan követőnek. A szerkesztőben a Db mező mellett egy
  ghost ⟳ ikongomb jelenik meg levált (kézzel felülbírált), de érvényes
  fogszám-listájú soron — egy kattintásra szinkronizál és a sor újra követővé
  válik; a meglévő „X fog van felsorolva…” szöveges figyelmeztetés is
  megmarad, második jelzésként. A nyomtatvány nem változott — a `mennyiseg`
  végső, elmentett értéke kerül papírra, forrástól függetlenül.

---

### 28. Páciens-szintű, terveken átívelő törzsadat-nyilvántartó — KÉSZ (2026-08-12)

- **Méret:** ~2-3 nap.
- **Kereteket sért?** Nem — új, önálló D33 (`docs/01-attekintes-es-dontesek.md`),
  D29 szövege és a `paciens.json` szerepe változatlan.
- **Valódi haszon:** a doki eddig egy visszatérő páciens telefonját/címét
  minden egyes tervben újra begépelte, mert a `terv.json` `paciens` blokkja
  tervenkénti pillanatkép (D7) — nem volt hely, ahol a páciens jelenleg
  érvényes adatait terv-mentéstől függetlenül tartaná.
- **Megvalósítás:** új `paciens-adatok.json` a páciens-mappa gyökerén
  (`docs/02-domain-modell.md` § Páciens-szintű törzsadat) — a `paciens.json`/
  `terv-cimke.json`-tól eltérően VALÓDI system of record a saját mezőire, a
  `nev`-et is beleértve; nincs automatikus szinkron a `terv.json` `paciens`
  blokkjával egyik irányban sem. Amíg nem létezik, élő fallback mutatja a
  legutóbb módosított terv-lánc legfrissebb `paciens` pillanatképét
  (`megjelenitettTorzsadat()`, `app/src/domain/paciensAdatok.ts`), első
  mentéskor a teljes fájl egyszerre zár. Új „Páciensek” képernyő
  (`docs/03-funkcionalis-spec.md` § 9), ahol terv nélkül is felvihető
  páciens; a Korábbi tervek és a Páciensek kölcsönösen linkelnek egymásra.
  A terv nélküli páciens a Korábbi tervek listáján nem jelenik meg. A
  „Meglévő páciens keresése”/páciensszintű „Új terv” közös
  forráskiválasztása (`ujTervForrasPaciensbol()`, `app/src/state/planIndulas.ts`)
  a törzsadatot preferálja, ha van — enélkül korábban hibát adott egy csak
  törzsadattal (terv nélkül) rendelkező páciens kiválasztása.

---

### 29. Fő navigáció és végleges IA — KÉSZ (2026-08-18)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új, önálló D34 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a redesign-döntéssorozat patient-first, öt tételes
  fő navigációjának (`Kezdőlap | Páciensek | Kezelések és árak |
  Beállítások | DEMO`) meghonosítása, hogy a doki-validáció a végleges
  IA-t lássa, ne a mai kilenc egyenrangú, lapos linket.
- **Megvalósítás:** a NavBar két csoportra bomlik — elöl a végleges öt
  link, egy függőleges elválasztó után az egyelőre megtartott négy
  átmeneti workflow-link (`Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi
  tervek`, halványabb stílussal), amíg a páciens-részletoldal és a
  terv-workflow shell át nem veszi a szerepüket (`docs/03-funkcionalis-
  spec.md` § Fő navigáció). Új `/demo` oldal (`DemoPage.tsx`) Radix
  `Tabs`-szal fogja össze a korábban önálló Filerendszer nézetet és a
  Kezdőlapról levett Funkciólista/Változásnapló kártyát. Az `Árlista`
  admin felhasználói neve `Kezelések és árak`-ra változott
  (`docs/03-funkcionalis-spec.md` § 6) — a modul/route belső neve
  (`PriceListAdminPage`, `/arlista`) változatlan maradt.

---

### 30. Páciens detail shell és tab-navigáció — KÉSZ (2026-08-18)

- **Méret:** ~2 nap.
- **Kereteket sért?** Nem — új, önálló D35 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a páciens-vonatkozású funkciók három, egymástól
  független oldalon éltek, egyik sem URL-lel címezhető egyetlen
  pácienshez — a két lista tranziens `location.state`-tel kereszt-linkelt
  egymásra, ami frissítésnél (F5) elvesztette, melyik pácienst nézte a
  doki, és mindkét fájlban duplikált "görgess a sorra és nyisd ki"
  boilerplate-et igényelt.
- **Megvalósítás:** új, URL-lel címezhető `/paciensek/:patientDir` oldal
  (`PatientDetailPage.tsx`) két tabbal: `Páciens adatai | Kezelési
  tervek` (`docs/03-funkcionalis-spec.md` § 10). A mai `PaciensekPage.tsx`
  törzsadat-szerkesztője és a `PlanHistoryPage.tsx` terv-lánc/verzió fája
  két közös komponensbe emelve (`components/PatientEditorPanel.tsx`,
  `components/PatientPlanChains.tsx`), amiket mindkét régi lista-oldal ÉS
  az új oldal is használ — a régi oldalak tartalma és nav-elérhetősége
  változatlan, csak a bennük lévő kereszt-linkek célja vált az új
  oldalra, a megfelelő tabbal előválasztva. Közös adatbetöltő
  (`loadPlanChainData`, `domain/planChainData.ts`) egy páciens terv-lánc/
  verzió adatainak 3-lépéses betöltésére, amit a `PlanHistoryPage.tsx`
  (minden páciensre egyszerre) és az új oldal (egyetlen páciensre) is
  hív. Sticky, kompakt fejléc (név/születési dátum/telefon) — az app első
  `position: sticky` használata; controlled Radix `Tabs` — az app második
  Tabs-használata a `DemoPage.tsx` (backlog-29) uncontrolled mintája
  után, `docs/07-felulet-rendszer.md`-ben rögzített stílus-szabállyal.

---

### 31. Terv workflow shell, breadcrumb és stepper — KÉSZ (2026-08-18)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új, önálló D36 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a három workflow-oldal (Páciens adatlap/Terv
  szerkesztő/Előnézet) között kizárólag egyirányú "Tovább" gombokkal
  lehetett haladni, visszafelé csak a NavBar négy, ideiglenesen megtartott
  linkjével (D34); nem volt sehol jelzés arról, hol tart a doki a
  folyamatban, sem kapaszkodó arról, melyik páciens tervén dolgozik.
- **Megvalósítás:** új közös layout-route (`components/TervWorkflowShell.tsx`,
  react-router `Outlet`, az app első nested route-mintája) a három
  workflow-oldal köré: állandó breadcrumb (`Páciensek > [páciens neve]`,
  a páciens-szegmens egyelőre nem link) + szabadon kattintható,
  route-vezérelt 3-lépéses stepper (`docs/03-funkcionalis-spec.md` §
  Terv-workflow héj). A meglévő laponkénti "Tovább" gombok változatlanul
  megmaradtak. A véglegesítés utáni sikerpanel "Korábbi tervek" gombja a
  MOST mentett páciens részletoldalára (30. tétel) navigál, nem a
  globális listára. Utolsó lépésként megszűnt a D34-ben átmenetileg
  megtartott négy NavBar-link (`Páciens`/`Terv szerkesztő`/`Előnézet`/
  `Korábbi tervek`) — a fő navigáció ezzel véglegesen ötelemű.

---

### 32. Aktív draft lifecycle és autosave — KÉSZ (2026-08-19)

- **Méret:** ~1 nap. Feltárás alapján a hatókör nagy része (egy aktív
  draft, felülírás-guard, szabad kilépés, quick-páciens túlélése,
  atomikus véglegesítés) már megvolt — a tétel négy konkrét hiányt zárt
  le.
- **Kereteket sért?** Nem — új, önálló D37 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a Kezdőlap "Piszkozat folytatása" gombja korábban egy
  névkitöltés-heurisztikával találgatta a célt, sosem az Előnézetre; a
  szerkesztőben sikeres mentésnél semmilyen visszajelzés nem volt; a
  teljes piszkozat eldobására sem a szerkesztőben, sem a Kezdőlap
  egészséges piszkozat-kártyáján nem volt út.
- **Megvalósítás:** a perzisztált `DraftRecord` (`storage/DraftStorage.ts`)
  két opcionális UI-workflow metaadatot kapott a `Plan` mellett:
  `patientDir` (a draft best-effort ismert páciens-mappája, a MEGLÉVŐ
  draft-indító helyeken átadva) és `lastRoute` (a terv-workflow héj írja
  route-váltáskor). A Kezdőlap "Megnyitás" gombja ismert `lastRoute`
  esetén oda navigál, a régi heurisztika fallbackként megmarad; a
  breadcrumb páciens-szegmense (D36) ismert `patientDir` esetén linkké
  vált a páciens-részletoldalára. A Terv szerkesztő fejléce pozitív
  "Piszkozat mentve HH:MM" jelzést kapott sikeres mentésnél, plusz egy
  kuka-ikont a teljes piszkozat megerősítéssel védett eldobására; a
  Kezdőlap egészséges piszkozat-kártyája ugyanilyen megerősítéssel védett
  eldobást kapott (a SÉRÜLT piszkozat kártyájának megerősítés nélküli
  eldobása szándékosan változatlan maradt). Egy `piszkozatKiirvaRef` őr
  védi ki, hogy egy véglegesítés/eldobás utáni puszta workflow-navigáció
  ne támasszon fel egy már törölt piszkozatot (`docs/03-funkcionalis-spec.md`
  § Autosave).

---

### 33. Közös Save/Cancel és dirty-navigation guard — KÉSZ (2026-08-19)

- **Méret:** ~1 nap. Feltárás alapján a D38 által kívánt viselkedés
  (mentési hiba nem dobja el a piszkozatot, elhagyás megerősítést kér) MÁR
  MA IS teljesült mindenhol — két különböző, egymástól független ok miatt
  (autosave-oldalakon D31 optimista modellje, explicit-Save oldalakon a
  `catch` ág egyszerűen nem nyúlt a draft-hoz). A tétel csak egy közös
  absztrakció ALÁ hozta a már működő viselkedést.
- **Kereteket sért?** Nem — új, önálló D38 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** három egymástól független dirty-detektálás
  (referencia-egyenlőség, `JSON.stringify`-alapú mély-egyenlőség,
  mezőnkénti string-összehasonlítás) és egy ötször másolat-beillesztett
  megerősítő `AlertDialog` élt egymás mellett — egy kódkomment maga is
  elismerte a duplikációt.
- **Megvalósítás:** két közös primitív, `components/useDirtyDraft.ts`
  (`draftDirty`/`useDirtyDraft`, a `PatientEditorPanel` bevált
  `JSON.stringify`-komparátorából kiemelve) és
  `components/DiscardChangesDialog.tsx` (`useDiscardGuard`/
  `DiscardChangesDialog`). A `PatientEditorPanel` és a `PaciensekPage.tsx`
  sor-váltási guardja bájtra változatlan viselkedéssel állt át rájuk. A
  Beállítások "Nyomtatvány szövegei" szekciója — az egyetlen, ami már
  eddig is dirty-gated explicit Save-et használt — kapott egy hiányzó
  Mégse gombot, megerősítéssel (mert egyszerre minden nyelv/szlot
  piszkozatát elveti) és a `dp:sablon-piszkozat` cache törlésével.
  Feltárás közben előkerült egy, a 30. tételtől eredő valódi rés is: a
  `PatientDetailPage.tsx` a Radix `Tabs` unmountolása miatt némán
  elveszítette a "Páciens adatai" tabon félbehagyott szerkesztést egy
  tab-váltásnál — ez is ugyanerre a guardra állt rá. Az Árlista admin és a
  Beállítások többi szekciójának autosave-mechanizmusa, valamint a
  "piszkozat felülírása" aktív-draft guardok (D37, `docs/03-funkcionalis-spec.md`
  § Autosave) szándékosan változatlanok maradtak. Nincs böngésző-/
  router-szintű navigáció-blokkolás — az app `HashRouter`-t használ, amit
  a react-router `useBlocker`-e nem támogat data router nélkül, és a
  sablon-piszkozat egyébként is túléli az elnavigálást a cache-en át.

---

### 34. Kezdőlap új struktúrája — KÉSZ (2026-08-19)

- **Méret:** ~1,5 nap. A valódi új hatókör egyetlen, korábban sehol nem
  létező adat volt: egy páciensenkénti wall-clock "utolsó jelentős
  aktivitás" időbélyeg (a `PlanVersion.isoDate`/`Plan.keltezes` a doki
  által szabadon szerkeszthető ÜZLETI dátum, D22, nem mentési időpont).
- **Kereteket sért?** Nem — új D39 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a korábbi Home öt egymásra épülő kártyát/gombot
  mutatott egyszerre, demó-eszközök és üzleti navigáció keverten, és
  sehol nem látszott, kikkel dolgozott a doki nemrég.
- **Megvalósítás:** a `paciens.json` (`PatientRecord`) kap egy opcionális
  `utolsoAktivitas: { tipus, idopont }` mezőt, additív, `schemaVersion`
  emelése nélkül — három MEGLÉVŐ storage-írási pont (`createPatient`,
  `savePatientData`, `savePlan`) tölti ki, egy negyedik (a legacy-mappa
  migráció) szándékosan nem, hogy ne szintetizáljon hamis időbélyeget az
  üzleti `keltezes`-ből. Puszta index-mezőként (D29) egy sérült/ismeretlen
  érték a betöltéskor némán kimarad, nem hibát dob
  (`domain/paciensAktivitas.ts` `ervenyesAktivitas`). Új domain-réteg:
  `domain/paciensAktivitas.ts` (a rendező/limitáló `legutobbAktivPaciensek`
  és a sor-szöveg `aktivitasSzoveg`, mindkettőt a Kezdőlap ÉS a 35. tétel
  páciensválasztója is hívja majd), `domain/date.ts` `formatRelativIdo`
  (szándékosan kézzel formázva, nem `Intl.RelativeTimeFormat`-tal — annak
  magyar kimenete pontatlan/félrevezető a kívánt "2 órája"/"tegnap"
  szöveghez képest), és `domain/torzsadatBetoltes.ts`
  (`loadUtolsoTerv`/`loadMegjelenitettTorzsadat`, amit a Kezdőlap ÉS a
  `PaciensekPage.tsx` sorkinyitása is megoszt — utóbbi belső sétáját ez
  váltotta ki, bájtra változatlan viselkedéssel). A Kezdőlap három blokkra
  csökkent (fő CTA `+ Új kezelési terv`, változatlan aktív-draft kártya,
  max 5 recent páciens); a demó-only "Demó adat visszaállítása"/"Minden
  adat törlése" a DEMO oldal új, negyedik (Adatkezelés) fülére költözött a
  hozzá tartozó `reloadFromStorage()` P0-6 óvatossággal együtt; a "Korábbi
  tervek" gomb megszűnt, a globális `/tervek` lista mostantól kizárólag
  URL-ről érhető el.

---

### 35. Új terv páciensválasztó — KÉSZ (2026-08-19)

- **Méret:** ~0,5 nap.
- **Kereteket sért?** Nem — új D40 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** ez a képernyő minden új tervnél megnyílik, mégis
  autofókusz és billentyűzet-navigáció nélkül, mindig teljes/alfabetikus
  listával indult — ugyanaz a gépel → nyíl → Enter ciklus hiányzott
  róla, amit a tételkeresőnél a CLAUDE.md kötelezővé tesz.
- **Megvalósítás:** a keresőmező autofókuszt kapott; 0–1 karakternél a 34.
  tétel (D39) megosztott `legutobbAktivPaciensek()` helpere adja a listát
  (max 5, recency szerint), 2+ karaktertől egy új domain-függvény
  (`domain/paciensKereses.ts` `paciensTalalatok`) relevancia szerint
  rendez (teljes név eleje > szótöredék eleje > belső egyezés, azon belül
  alfabetikus). A találati/recents sorok az `ItemPicker.tsx` bevált
  gépel → nyíl → Enter/Esc ciklusát követik, de valódi Radix `Button`-ok
  maradnak (Tab-sorrendből nem esnek ki). Nulla találatnál egy közvetlen
  "Új páciens: „…"" pszeudó-opció a begépelt névvel indítja a "Vadonatúj
  páciens" ágat, a mindig látható gomb mellett.

---

### 36. Quick Patient létrehozás — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D41 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** az `/uj-terv` "Vadonatúj páciens" ága a terv előtt nem
  hozott létre valódi páciensrekordot (a mappa csak mentéskor
  materializálódott) — ez ellentmondott annak, hogy a `/paciensek` "+ Új
  páciens" belépési pontja már D29 szerint valódi rekordot ír.
- **Megvalósítás:** a `PlanStorage.createPatient` opcionális
  `kezdoAdatok` (`szuletesiIdo`/`telefon`) paramétert kapott, egy
  logikailag atomi írásban a `uresTorzsadat()` alappal együtt. A közös
  `UjPaciensDialog.tsx` DOB+telefon mezőt kapott, és egy `onUseExisting`
  callbackot: névegyezésnél a figyelmeztetés cselekvővé vált ("Ezt a
  pácienst választom"), a begépelt adatok eldobásával a MEGLÉVŐ
  páciensre folytatva a flow-t. Az `/uj-terv` "Vadonatúj páciens" ága
  mostantól ugyanezt a dialógust nyitja meg, és csak sikeres
  `storage.createPatient` után futtatja a MEGLÉVŐ `selectExistingPatient`
  útvonalat a friss páciens-mappára — ez a törzsadat-ágon tölti elő a
  draftot, és mellékesen kitölti a `DraftMeta.patientDir`-t (D37) külön
  kód nélkül. Elfogadott mellékhatás: egy elhagyott piszkozat után is
  ottmarad a létrehozott páciensrekord, ami a Kezdőlap "Legutóbbi
  páciensek" (D39) listáján is megjelenik.

---

### 37. Páciens-duplikáció felismerés és feloldás — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D42 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a duplikáció-jelzés korábban egyetlen helyen,
  tisztán pontos név-egyezésen alapult, cselekvés nélkül, és a
  törzsadat-átnevezésnél egyáltalán nem volt ellenőrzés.
- **Megvalósítás:** kétfázisú detektálás -- olcsó, csak
  `PatientFolder[]`-t igénylő token-alapú név-hasonlóság (a magyar "-né"
  toldalékra explicit kivétellel), majd csak a szűk jelölt-körre
  betöltött születési dátum/telefon szűrve tovább. Pontos névegyezés az
  ellentmondó adat mellett is látszik, jelöléssel; hasonló névegyezés
  ellentmondásnál kiesik. A quick-create dialógus (`UjPaciensDialog.tsx`)
  gépelés közben inline javaslat-listát mutat (max 3 + "+N további"), a
  Mentés gomb pedig mindig lefuttatja ugyanezt az ellenőrzést a végleges
  adatokra -- találat esetén egyetlen, diszkriminált-unió állapotú
  `AlertDialog` fedi le mind a "Mégis új páciens létrehozása", mind az
  eltérő-adatú találat kiválasztásának megerősítését. A törzsadat-
  szerkesztő (`PatientEditorPanel.tsx`) Mentés gombja csak a save-time
  ellenőrzést kapta meg, javaslat-lista nélkül -- ott nem választás,
  hanem átnevezés a kérdés.

---

### 38. Pácienslista és keresés — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D43 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a lista sorai eddig helyben nyíltak ki egy inline
  törzsadat-szerkesztővel, pedig a páciens-részletoldal (D35) óta ez egy
  duplikált belépési pont volt ugyanahhoz a szerkesztőhöz; a sor emellett
  csak nevet mutatott, nem volt DOB/telefon a megkülönböztetéshez, és a
  keresőszöveg/scroll elveszett egy megnyitás-visszalépés után.
- **Megvalósítás:** a lista tiszta navigációs listává alakult -- a sorok
  a páciens-részletoldalra navigálnak, a törzsadat-szerkesztő
  (`PatientEditorPanel`) egyetlen hívási helye onnantól a részletoldal
  "Páciens adatai" tabja. A kompakt sor (`components/PatientListRow.tsx`,
  a Kezdőlap "Legutóbbi páciensek" listájával közös komponens) nevet,
  születési dátumot és telefont mutat, a törzsadat két normál állapota
  jelvény nélkül, kizárólag a betöltési hiba jelezve. A keresés névre
  (mint korábban) és -- 2+ begépelt számjegytől -- a születési
  dátumra/telefonszámra is illeszkedik, elválasztójeltől függetlenül
  (`domain/paciensKereses.ts` `keresoKulcs`/`torzsadatEgyezik`, a D42
  `telefonKulcs()`-előtag-normalizálását újrahasznosítva). Egy sorra
  navigálva, majd böngésző-"vissza"-val visszatérve a keresőszöveg és a
  görgetési pozíció megmarad (`components/useListStateMemory.ts`) --
  kizárólag ezen az úton, munkamenetre szűkítve, böngészőtár nélkül.

---

### 42. Redundáns fejléc-elemek a páciens-részletoldal tabjain — KÉSZ (2026-08-19)

- **Méret:** ~fél nap.
- **Kereteket sért?** Nem — új D44 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a páciens-részletoldal "Kezelési tervek" tabján a
  páciensnév és a "Páciens adatai" kereszt-link kétszer szerepelt (a
  sticky fejlécben ÉS a beágyazott terv-lánc blokk fejlécében) -- a doki
  screenshoten jelezte, hogy a második, halványabb példány zavaró és
  félrevezető, mert azt sugallja, MÁS célra visz, mint a fölötte lévő tab.
- **Megvalósítás:** a két hívóhelyű `PatientPlanChains` fejléc-elemei
  kötelező `header: 'standalone' | 'embedded'` propon dőlnek el,
  alapértelmezés nélkül. A Korábbi tervek listáján (`standalone`)
  változatlan a névfejléc + kereszt-link + kis "Új terv" gomb; a
  páciens-részletoldalon (`embedded`) csak az "Új terv" marad, teljes
  értékű CTA-ként -- a nevet a sticky fejléc, a törzsadat felé vezető
  utat a tabsor már hordozza. A `PatientEditorPanel` alján megszűnt a
  tükör-"Korábbi tervek" gomb is, ugyanezen elv szerint.

---

### 39. Páciens adatok read-only / edit / full create — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D45 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a törzsadat-szerkesztő (`PatientEditorPanel`) egy
  páciens puszta megtekintésekor is rögtön szerkeszthető mezőket nyitott
  meg (véletlen módosítás kockázata), és semmilyen mezőszintű validáció
  nem védte a `paciens-adatok.json`-t (valódi system of record, D33) egy
  jövőbeli születési dátum vagy szintaktikailag hibás e-mail cím ellen.
- **Megvalósítás:** a panel kétállású — alapból READ-ONLY nézet
  (`components/Field.tsx` új `ReadOnlyField` exportja, a kitöltetlen
  mezőkön az app meglévő "—" hiányzó-érték jelölésével), egy "Szerkesztés"
  gombbal a MEGLÉVŐ input-mezős nézetre váltva. Az e-mail-formátum és a
  jövőbeli születési dátum blokkoló mezővalidáció lett (új
  `domain/paciensValidacio.ts` `emailHiba`/`szuletesiIdoHiba`), a Mentés
  gomb nem tiltott, de hibás mezőnél a mentés megszakad — ugyanez a
  Született-validáció a quick-create (`UjPaciensDialog.tsx`) mezőjére is
  kiterjed, hogy ugyanaz az adat ne kapjon két ítéletet a két belépési
  ponton. A Save/Cancel gombpár, a dirty-detektálás, a tab-váltási guard
  (D38) és a mentési hiba utáni state-megőrzés funkcionálisan
  változatlan maradt, csak a szerkesztés módra korlátozva. A `PaciensekPage.tsx`
  "+ Új páciens" sikeres mentése a részletoldalt kivételesen SZERKESZTÉS
  módban nyitja (`location.state.mod: 'szerkesztes'`) — egy MEGLÉVŐ
  páciens kiválasztása (kereszt-link, "Ezt a pácienst választom") READ-ONLY
  nézetben nyit. Az üres mezők jelölésére szándékosan az app meglévő "—"
  konvenciója maradt az egyetlen forrás, nem egy új szöveges jelölés.

---

### 43. Nem mentett módosítás védelem kiterjesztése a NavBar-navigációra — KÉSZ (2026-08-19)

- **Méret:** ~fél nap.
- **Kereteket sért?** Nem — új D46 (`docs/01-attekintes-es-dontesek.md`),
  a D38 hatókörének kiterjesztése. Ez a tétel nem szerepelt korábban a
  `backlog/BACKLOG.md`-ben: a 39. tétel (D45) kézi tesztelése közben
  derült ki, a 15. tétel precedense szerint.
- **Valódi haszon:** a D38 "van nem mentett módosítás" védelme eddig csak
  a lapon belüli elem-váltásra (sor-/tab-váltás) és a Mégse gombra terjedt
  ki -- a NavBar valamelyik linkjére kattintva egy piszkozat (pl. a
  Páciens adatai tabon félbehagyott szerkesztés, vagy a Beállítások
  "Nyomtatvány szövegei" szekciója) figyelmeztetés nélkül, nyomtalanul
  elveszett.
- **Megvalósítás:** a NavBar linkjei a saját `NavLink` komponenseink,
  tehát a kattintásukat `onClick`+`preventDefault`-tal el lehet fogni --
  ehhez, a D38 eredeti indoklásával ellentétben, NEM kell router-szintű
  blokkolás (amit a `HashRouter` amúgy sem támogatna). Új
  `components/NavGuardContext.tsx`: egyetlen, app-szintű megosztott "van
  piszkozat" jelző (`NavGuardProvider`), amit egy védett felület egy plusz
  `useNavGuard(dirty)` hívással regisztrál a MÁR meglévő dirty state-jével
  (`PatientDetailPage.tsx`, `SettingsPage.tsx` -- egy-egy sor, nincs
  prop-fűzés), és amit a `NavBar.tsx` olvas, a MEGLÉVŐ
  `useDiscardGuard`/`DiscardChangesDialog` primitívet (D38) újrahívva --
  nem egy második megerősítő-mechanizmust bevezetve. Böngésző vissza/előre
  gomb, F5, URL-sáv átírás változatlanul védtelen marad, tudatos
  döntésként.

---

### 44. Pácienslista oszlopos átdizájnolása — KÉSZ (2026-08-19)

- **Méret:** ~fél nap.
- **Kereteket sért?** Nem — új D47 (`docs/01-attekintes-es-dontesek.md`).
  Ez a tétel nem szerepelt korábban a `backlog/BACKLOG.md`-ben: a doki
  közvetlen, `/grill-me` munkamenetben adott dizájn-visszajelzésből indult
  (a 43. tétel precedense szerint).
- **Valódi haszon:** a Pácienslista sora egy futó szöveges `Flex` volt
  (`components/PatientListRow.tsx`) — nem volt vizuális ritmusa (a
  születési dátum/telefon soronként más-más vízszintes pozícióra esett),
  nem jelezte hover/fókuszra, hogy kattintható, és a sor "léptéke" ~62px
  volt, kevés pácienst mutatva egy képernyőn.
- **Megvalósítás:** a Pácienslista saját, oszlopos táblázat-sort kapott
  (`pages/paciensek/PatientTableRow.tsx`, Radix `Table.Root size="2"`,
  ~42px sormagasság), fejléccel (Név / Született / Telefon, félkövér,
  `t.brand` színű felirattal, az Árlista admin kategória-fejlécével azonos
  stílusban). Hiányzó születési dátum/telefon az
  app "—" jelölését kapja; a törzsadat-betöltési hiba egy összevont,
  két oszlopot átfogó cellában jelenik meg. A sor egérrel bárhol
  kattintható, de a névcella valódi `<a>` maradt (középső gomb/"megnyitás
  új lapon" is működik) — a sor onClick-je a `closest('a')` őrrel kizárja
  a duplikált navigációt. Hoverre/fókuszra a teljes sor háttere
  `accentWash`-ra vált, a Radix `--table-row-background-color`
  változóján át (`index.css`, `main.tsx` írja be `tokens.ts`-ből). A
  keresőmező látható "Keresés" címkét kapott (`docs/07`: "Címke az input
  fölött, soha placeholder helyett"), és a lista fölé egy találatszám
  sor került. A Kezdőlap "Legutóbbi páciensek" listája (`components/
  PatientListRow.tsx`) SZÁNDÉKOSAN változatlan maradt — a két lista
  elrendezése ezután tudatosan eltér (D47).

### 40. Páciens master ↔ terv snapshot compare/sync — KÉSZ (2026-08-19)

- **Méret:** ~1.5 nap.
- **Kereteket sért?** Nem — új D48 (`docs/01-attekintes-es-dontesek.md`),
  a D33 (nincs automatikus szinkron) meglévő invariánsának felülete, nem
  új korlát.
- **Valódi haszon:** a D33 (28. tétel) már kimondta, hogy a
  `paciens-adatok.json` és a `terv.json` `paciens` blokkja között nincs
  automatikus szinkron, de semmilyen felület nem mutatta meg vagy tette
  kezelhetővé, ha a kettő szétcsúszik — a doki vakon szerkesztette a terv
  pillanatképét anélkül, hogy látta volna, mit tart a törzsadat.
- **Megvalósítás:** a Páciens adatlapon (a Személyes adatok kártya alatt)
  új "Páciens törzsadata" kártya (`pages/patientPage/TorzsadatSyncCard.tsx`)
  mezőszintű összevetést mutat, két külön irányú gombbal ("Frissítés a
  törzsadatból" / "Törzsadat frissítése a tervből") — soha nem egy közös
  "Szinkronizálás" gomb; mindkettő ugyanazt a checkbox-listás dialógust
  nyitja (`components/TorzsadatDiffDialog.tsx`), alapból semmi nincs
  kijelölve. A "Terv adatai" lépés ELŐRE elhagyásakor (a "Tovább" gomb és a
  workflow-stepper Kezelések/Előnézet linkjei,
  `components/LepesGuardContext.tsx` — külön mechanizmus a D46
  NavGuard-tól) egyszer felkínálja a frissítést, de KIZÁRÓLAG valódi
  ütközésnél (mindkét oldalon kitöltött, eltérő érték) — egy üres mező
  puszta pótlása (a leggyakoribb eset, quick-create utáni adatkitöltés) nem
  szakítja félbe a workflow-t. Törzsadat nélküli páciensnél információs
  blokk + azonnali létrehozás opció. Írási hiba esetén a dialógus nyitva
  marad, Újra/Folytatás írás nélkül választással, a piszkozat mindkét
  esetben érintetlen. A véglegesítésnél (`domain/veglegesitesOr.ts`
  `masterElteresek`) a mastert újraolvasva egy INFO-szintű, nem blokkoló
  sor jelzi az eltérést — a véglegesítés emiatt sosem kér megerősítést
  (docs/03-funkcionalis-spec.md § 2. és § 4.).

---

### 45. Beállítások oldal tabosítása — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D49 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a Beállítások öt egymás alatti kártyája két,
  egymásnak ellentmondó mentési modellt kevert: a legtöbb mező
  leütésenként mentődött, az egyetlen alsó „Mentés" gomb viszont
  ténylegesen csak az Orvosok mezőt commitolta, ami `onBlur`-ra amúgy is
  megtörtént — a gomb no-op volt, miközben azt sugallta, addig semmi
  sincs mentve. A nem konfigurálható „Logó" kártya (a `settings.logoFajl`
  sehol nem volt ténylegesen felhasznált — a PDF és a NavBar egy statikus
  `assets/logo.png` importot használ) holt adatot mutatott.
- **Megvalósítás:** három tab (`Rendelő adatai` | `Nyomtatványok` |
  `Egyéb`, `pages/settings/*Tab.tsx`), mindegyik saját pufferelt draftot
  vezet explicit Mentés/Mégse gombpárral (`useDirtyDraft`) — a
  leütésenkénti autosave ezen a lapon megszűnt, az Árlista admin autosave
  marad. A Rendelő adatai/Egyéb Mégse azonnali, a Nyomtatványok Mégse
  megerősítést kér (mindkét nyelv piszkozatát elveti egyszerre). A lap
  egyetlen közös `dirty` state-et tart (a Radix `Tabs.Content` úgyis
  unmountolja az inaktív tabot), amit tab-váltáskor és NavBar-navigációnál
  is ugyanaz a megerősítő dialógus fog el; megerősítés után a
  Nyomtatványok tab `dp:sablon-piszkozat` localStorage-cache-e is törlődik,
  különben egy F5 a tab-váltás után visszahozná a már elvetett szöveget. A
  Logó kártya a `Settings.logoFajl` mezővel együtt törölve.

---

### 41. Páciens törlése — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D50 (`docs/01-attekintes-es-dontesek.md`),
  a D4 (verziómappa soha felül nem írható) természetes kiterjesztése
  törlésre.
- **Valódi haszon:** törlési képesség SEHOL nem létezett a rendszerben —
  egy véletlenül felvitt vagy duplikált páciens (a quick-create és a
  duplikáció-detektálás óta egyre könnyebben keletkező eset) örökre a
  listákban maradt, visszaút nélkül.
- **Megvalósítás:** a `PlanStorage` interfész első destruktív metódusa
  (`deletePatient(patientDir)`) a teljes páciensmappát törli egy
  prefix-seprésben. A törölhetőségi feltételt (nincs véglegesített terve,
  nincs rá mutató aktív, mentetlen piszkozata, minden terv-lánca olvasható
  volt) egy tiszta domain-őr dönti el (`paciensTorlesAkadaly()`), a
  draft-hovatartozást a MEGLÉVŐ D48 `feloldPatientDir()`-rel felismerve,
  nem új heurisztikával. Az elérési pont kizárólag a páciens-részletoldal
  sticky fejlécének `⋯` menüje — a menüpont akadály esetén tiltott marad,
  alatta rövid indoklással, nem tűnik el. Megerősítő dialógus, végleges
  törlés — nincs „kuka”, nincs helyreállítás, nincs páciens-összevonás
  (docs/02-domain-modell.md § Páciens- és terv-mappa,
  docs/03-funkcionalis-spec.md § 10. Páciens részletei).

---

### 46. Kezelési terv-lánc fa — KÉSZ (2026-08-19)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D51 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a terv-lánc/verzió fa (`PatientPlanChains.tsx`) a
  lánc-fejlécen a lánc LEGRÉGEBBI verziójának dátumát mutatta (tényleges
  bug), a láncok storage-enumerációs, rendezetlen sorrendben jelentek
  meg, és az aktív, mentetlen piszkozat sehol nem látszott ezen a
  listán — csak a Kezdőlapon, amikor a doki már egy másik akciót
  indítana, és a felülírás-őr csak akkor jelezte a konfliktust.
- **Megvalósítás:** a korábbi, kizárólag a Korábbi tervek listán élő
  páciens-szintű "N terv" kapcsoló megszűnt, helyette lánc-SZINTŰ
  összecsukás él mindkét hívón (Korábbi tervek lista és a páciens-
  részletoldal "Kezelési tervek" tabja egyaránt) — alapból csak a
  legfrissebb VÉGLEGESÍTETT dátumú lánc nyitva, a láncok e szerint a
  dátum szerint csökkenően rendezve. A lánc-fejléc nyitottságtól
  függetlenül mindig a lánc tényleges legfrissebb verzióját mutatja,
  csukott állapotban a lánc végösszegét is; a legfrissebb verziósor
  2+ verziós láncon "Legutóbbi" jelvényt kap. Az aktív piszkozat a hozzá
  tartozó lánc fejlécén jelzést kap, plusz egy önálló, a láncok fölötti
  blokkot (kontextus, workflow-lépés, utolsó módosítás, végösszeg),
  aminek kattintása a piszkozat-felülírás-őrt megkerülve navigál — a
  saját draft folytatása nem felülírás. A lánc-nyitottság és a
  keresőszöveg is visszaáll böngésző-"vissza" navigációnál
  (`components/useListStateMemory.ts` bővítése,
  docs/03-funkcionalis-spec.md § 5. Korábbi tervek).

---

### 47. Új kezelési terv (új lánc) inicializálása — KÉSZ (2026-08-19)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D52 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** egy új terv-lánc korábban mindig a globális
  alapértékekkel indult (nyelv a Beállításokból, pénznem mindig HUF),
  függetlenül attól, van-e a pácienshez korábbi véglegesített terve — egy
  visszatérő, korábban németül/EUR-ban tárgyalt páciensnél ez minden
  alkalommal felesleges, elfelejthető átállítást rótt a dokira, aminek
  elmulasztása rossz nyelvű/pénznemű ajánlatot eredményezett.
- **Megvalósítás:** meglévő pácienshez induló új lánc (mindhárom belépési
  ponton: Korábbi tervek páciensszintű "Új terv", a páciens-részletoldal
  első-terv CTA-ja, a Kezdőlap "+ Új kezelési terv" → "Meglévő páciens
  keresése") örökli a doki által látott legutóbb VÉGLEGESÍTETT terv-
  verzió nyelvét/pénznemét (`domain/blankPlan.ts` `createBlankPlan()`
  opcionális harmadik paramétere, `state/planIndulas.ts`
  `ujTervForrasPaciensbol()` tölti ki, `domain/planFolders.ts`
  `verziokFrissessegSzerint()` a bejárás alapja) — véglegesített terv
  híján a globális alapérték marad érvényben. Az orvos-mező (a mai
  egyszerű `settings.orvosok[0]`) és a tervcím-mechanizmus (élő
  javaslat) változatlan marad (docs/01-attekintes-es-dontesek.md D52,
  docs/02-domain-modell.md § Nyelv és pénznem, docs/03-funkcionalis-
  spec.md § 2. Páciens adatlap és § 5. Korábbi tervek).

---

### 48. Új verzió létrehozása — KÉSZ (2026-08-19)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D53 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** "Új verzió" korábban bármelyik verziósorról
  indulhatott, jelöletlenül a lánc fejére kerülve (félrevezető sorrend a
  Korábbi tervek listán), és a betöltött piszkozat `statusz`-a tévesen a
  forrás verzióé (`VEGLEGES`) maradt — ez hamis "véglegesítve" jelvényt
  mutatott a szerkesztő fejlécén, és a letöltés elmaradt a `PISZKOZAT-`
  előtagtól egy még el sem mentett piszkozatnál.
- **Megvalósítás:** a `⋯` menü "Új verzió" pontja mostantól kizárólag a
  lánc legfrissebb verziósorán jelenik meg (`components/
  PatientPlanChains.tsx`, a `domain/planFolders.ts`
  `legfrissebbVerzio()`-val); a betöltés (`state/AppState.tsx`
  `loadPlanIntoDraft()`) a `statusz`-t PISZKOZAT-ra állítja, a `tervId`-t
  (a lánc-hovatartozás jele) érintetlenül hagyva. A nyelv/pénznem-
  zárolás feloldása és az orvos-öröklés továbbra is a 52./53. tételre vár
  (docs/01-attekintes-es-dontesek.md D53, docs/03-funkcionalis-
  spec.md § 4. Előnézet és véglegesítés "Letöltési fájlnév", § 5.
  Korábbi tervek).

---

### 54. „Összes terv" a DEMO oldalon — KÉSZ (2026-08-19)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D54 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a `Korábbi tervek` globális, több-pácienses nézet a
  páciens-központú redesign óta teljesen árva volt — sehonnan nem linkelt
  rá semmi, csak kézzel beírt `/tervek` URL-lel volt elérhető, miközben a
  `docs/03-funkcionalis-spec.md` és a `PaciensekPage.tsx` tooltipje
  továbbra is élő, kölcsönösen linkelt képernyőként írta le. Ez a limbó
  garantálta, hogy egy jövőbeli munkamenet vagy némán kitakarítja, vagy
  visszatesz rá egy nav-linket, holott a redesign IA már kimondta:
  a tartalom a páciens `Kezelési tervek` tabjába olvad.
- **Megvalósítás:** a globális terv-lánc/verzió fa (`PlanHistoryPage.tsx`
  → `pages/demo/OsszesTervSection.tsx`) a DEMO oldal új, ötödik („Összes
  terv") fülére költözött, változatlan tartalommal és akciókkal — a
  páciens-részletoldal `Kezelési tervek` tabja marad az elsődleges gazda
  (D35/D44), ez az áttekintő másodlagos. A `/tervek` URL erre a fülre
  (`/demo/tervek`) redirectel; mind az öt DEMO fül URL-címezhető
  (`/demo/:tab`), a fülváltás `replace` navigáció, hogy a
  `useListStateMemory` (D43/D51) POP-alapú megőrzése ne ragadjon fülbe
  zárva. A `PaciensekPage.tsx` tooltipje és a `docs/03-funkcionalis-
  spec.md` § 5 (átnevezve „Terv-láncok és verziók"-ra) már a helyes
  elsődleges/másodlagos viszonyt írja le
  (docs/01-attekintes-es-dontesek.md D54, docs/03-funkcionalis-spec.md
  § 5. Terv-láncok és verziók).

---

### 55. „Új terv indítása": új páciens felülre, kereső alulra — KÉSZ (2026-08-19)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D55 (`docs/01-attekintes-es-dontesek.md`),
  D40 pontosítva.
- **Valódi haszon:** a köztes páciensválasztón az új-páciens ág a kereső
  ALATT állt, a projekt "Mégse"-stílusával (`variant="soft" color="gray"`)
  — a képernyőnek nem volt vizuális elsődleges akciója, és az olvasási
  sorrend a doki tényleges döntési sorrendjének (előbb új vs. visszatérő
  páciens, utána a konkrét személy) fordítottja volt.
- **Megvalósítás:** a „+ Új páciens" gomb a kereső kártya FÖLÉ költözött,
  a `PaciensekPage.tsx`-szel szó szerint azonos megjelenéssel (solid,
  alapértelmezett méret) és felirattal, mindig látható, elsődleges
  rangban; a két utat egy „vagy" feliratú elválasztó tagolja. A
  kártyán belüli no-match „Új páciens: „…"" opció és a gépel → nyíl →
  Enter/Esc billentyűzet-ciklus változatlan. A feliratrendszer
  (`docs/03-funkcionalis-spec.md` "A négy terv-létrehozási út és a
  gombfeliratok rendszere") kimondott kivételt kapott erre a képernyőre:
  a "új terv" fogalmat itt a fejléc hordozza, nem az egyes gombok
  (docs/01-attekintes-es-dontesek.md D40/D55, docs/03-funkcionalis-spec.md
  § "Új terv indítása" — a köztes páciens-választó).

---

### 56. „Új terv indítása": legutóbbi páciensek 15-ös, egysoros lista — KÉSZ (2026-08-19)

- **Méret:** ~0.25 nap.
- **Kereteket sért?** Nem — új D56 (`docs/01-attekintes-es-dontesek.md`),
  D40 pontosítva.
- **Valódi haszon:** az `/uj-terv` köztes páciensválasztó a doki
  elsődleges belépési pontja egy visszatérő pácienshez, de a
  "Legutóbbi páciensek" lista a Kezdőlappal megegyező, szűk 5-ös
  korlátot örökölte — ez túl gyakran kényszerítette gépelésre, holott a
  cél épp a gépelés elkerülése.
- **Megvalósítás:** új, önálló `UJ_TERV_RECENT_LIMIT = 15` konstans
  (`domain/paciensAktivitas.ts`), a Kezdőlap `RECENT_PACIENS_LIMIT`
  (5) mellett — ugyanaz a `legutobbAktivPaciensek()` helper, más
  `limit`-paraméterrel, a Kezdőlap érintetlen. A sor kétsorosból
  egysorosra vált (név balra, aktivitás-szöveg jobbra, ugyanazon a
  soron), tipográfia/szín változatlan — a lépték-növelés előfeltétele
  volt, hogy 15 sor ne fusson feleslegesen hosszúra
  (docs/01-attekintes-es-dontesek.md D40/D56, docs/03-funkcionalis-
  spec.md § "Új terv indítása" — a köztes páciens-választó).

### 49. tétel: Másolás új tervként — KÉSZ (2026-08-20)

- **Méret:** ~0.25 nap.
- **Kereteket sért?** Nem — új D57 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a "Másolás új tervbe" a doki tényleges A/B
  alku-változat munkafolyamata, de a páciensadatot eddig a forrás
  verzió (akár hónapokkal korábbi) pillanatképéből vitte tovább, nem a
  páciens jelenlegi adatából — a másolás pillanatában ez a friss adat a
  releváns, nem a régi.
- **Megvalósítás:** a tervdokumentum 7 döntéséből ténylegesen csak a
  páciens-master-öröklés (3. döntés) volt ma elvégezhető — a többi
  (default-following árfrissítés + hozzá tartozó markerek, "csak
  ajánlat" öröklése, nyelvi review-metaadat öröklése) egy még nem
  létező modellre vár, és külön útra terelődött: az orvos-öröklés az
  53. tételhez, a többi a `backlog/redesign/` DP-044/DP-048/DP-051/
  DP-054 tételeihez, amikor azok kidolgozásra kerülnek. A
  `planMasolatKent()` (`app/src/domain/planCopy.ts`) opcionális
  negyedik `master` paraméterrel bővült — ha van, a `paciens` blokkot
  ebből építi (a meglévő `paciensTorzsadatbol()`-lal), a `paciensId`
  változatlanul a forrás tervből jön. A `PatientPlanChains.tsx`
  `copyVersion()` egyetlen hívási helye a `loadPatientData()`-t is
  betölti a másolt verzió mellé; olvashatatlan törzsadatnál a másolás
  hibaüzenettel áll meg, nem esik vissza némán a régi adatra
  (docs/01-attekintes-es-dontesek.md D57, docs/03-funkcionalis-spec.md
  § "Terv másolása új tervként").

### 50. tétel: Verzió-szintű akciók és historical figyelmeztetések — KÉSZ (2026-08-20)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D58 (`docs/01-attekintes-es-dontesek.md`),
  D53 parentézise pontosítva.
- **Valódi haszon:** a verziósor eddig minden verzión azonos, csupasz
  `⋯` menüt mutatott, nincs vizuális jelzés a legfrissebb/historical
  verzió között, és nem figyelmeztetett, ha a doki egy régi verziót
  másolt, miközben időközben újabb is született — könnyen elavult
  ajánlat-változaton lehetett észrevétlenül dolgozni.
- **Megvalósítás:** a lánc legfrissebb verziósora két látható gombot
  kapott (elsődleges "Új verzió", másodlagos "Megnézés"), a `⋯` ott
  Letöltésre és Másolás új tervbére szűkült; egy historical soron nincs
  látható gomb, csak a `⋯`, plusz egy új "Ugrás a legfrissebb verzióra"
  menüpont (azonos oldalon belüli scroll+fókusz, a meglévő `data-plan`
  horgonyra, `requestAnimationFrame`-es fókuszkezeléssel a Radix
  FocusScope miatt). Egy historical verzió másolásakor, ha a láncnak
  van nála frissebb verziója, a meglévő piszkozat-felülírás-őr
  (`runOrConfirm`/`AlertDialog`) bővült egy külön figyelmeztetéssel,
  FÜGGETLENÜL attól, van-e mentetlen piszkozat -- a pontos másolás a
  megerősítés után is lefut. A `csokkentettMozgas()`
  (prefers-reduced-motion lekérdezés) kiemelve egy közös
  `app/src/design/motion.ts` fájlba, mert a második hívóhely
  (`PatientPlanChains.tsx`) miatt megszűnt egyetlen-hívós lenni
  (docs/01-attekintes-es-dontesek.md D58, docs/03-funkcionalis-spec.md
  § 5 "A verziósoron…").

### 57. tétel: Kezelésszerkesztő oldal alaplayout és fogtérkép — KÉSZ (2026-08-20)

- **Méret:** ~0.25 nap.
- **Kereteket sért?** Nem — új D59 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a feltárás szerint a tétel forrás-döntéseinek
  (fogtérkép alapból csukva, terv-szintű összegzés kizárólag a
  fázislista végén) döntő többsége már megvolt a kódban, csak nem volt
  dokumentálva — ez a tétel ezt rögzítette. Az egyetlen valódi hiány a
  friss piszkozat kereső-autofókusza volt: a doki eddig mindig
  kattintott a keresőmezőbe egy vadonatúj terv megnyitásakor, mielőtt
  gépelhetett volna, holott a billentyűzetes ciklus (gépel → nyíl →
  Enter) a legfontosabb UX-pont.
- **Megvalósítás:** a fázis alatti tételkereső (`ItemPicker`) automatikus
  fókuszt kap, ha a terv-lánc még soha nem lett mentve (`tervId === ''`)
  ÉS egyetlen fázisnak sincs sora — kizárólag az első fázis keresőjén; egy
  betöltött terv ("Új verzió"/"Másolás új tervbe") vagy egy már tartalmas
  fázis, illetve egy 2.+ fázis keresője soha nem kap automatikus fókuszt.
  Ezzel egyidejűleg egy docs↔kód drift is javítva lett: a csukott
  fogtérkép-gomb felirata a specben még darabszámot ígért, a kód viszont
  ezt korábban tudatosan eltávolította
  (docs/01-attekintes-es-dontesek.md D59, docs/03-funkcionalis-spec.md
  § 3 "Fogtérkép"/"Tételkereső"/"Fázisok").

### 58. tétel: Kezelési fázisok kezelése — KÉSZ (2026-08-20)

- **Méret:** ~0.5 nap.
- **Kereteket sért?** Nem — új D60 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a tervszerkesztő fázisai eddig nem voltak
  összecsukhatók/sorrendezhetők (nulla infra a kód szintjén, a spec
  "sorrendezhető" állítása drift volt), a sortörlésnek nem volt Undo-ja,
  a fázismegjegyzés mindig látszott (nincs progresszív elrejtés). A
  feltárás emellett egy hibás korábbi feltevést is talált: egy nyitott
  tétel terve tévesen "MÁR MEGVAN"-nak jelölt egy üres-fázis
  finalizációs blokkot, ami valójában sosem létezett — ez átkerült egy
  másik, még nyitott tételhez, ahol a tényleges javítás helye van.
- **Megvalósítás:** a fázisfejléc négy új vezérlőt kapott: egymástól
  független nyitás/csukás (csukva a nevet, a sorok számát és a
  fázisösszeget mutatja), ↑/↓ sorrendezés (a mozgatott fázis GENERÁLT
  neve — ha még a doki nem írta át — a pozíciójára frissül, a kézzel
  átírt név érintetlen marad), és a szöveges "Fázis törlése" gomb
  kuka-ikonra cserélve (az üres-fázis egykattintásos gyorsút
  változatlan). A sortörlés kuka-ikont kapott, és azonnali marad
  (nincs megerősítés), de a törölt sor helyén egy inline "Visszavonás"
  sáv jelenik meg rövid ideig, ami visszaállítja a sort az eredeti
  pozíciójába. A fázismegjegyzés a sor "+ leírás" progresszív
  elrejtés-mintáját kapta
  (docs/01-attekintes-es-dontesek.md D60, docs/03-funkcionalis-spec.md
  § 3 "Sor mezői"/"Fázisok").

### 51. tétel: Terv adatai oldal layout + cím + dátumok — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D61/D62 (`docs/01-attekintes-es-dontesek.md`),
  új sor a "Sérthetetlen szabályok" táblában (`ervenyesIg` soha nem
  maradhat üresen).
- **Valódi haszon:** a "Páciens adatlap" (a workflow-stepper már ekkor is
  "Terv adatai"-nak hívta) három, lazán szervezett kártyából állt, cím
  mező nélkül (a cím kizárólag a `terv-cimke.json`-ban, csak már mentett
  lánchoz volt szerkeszthető) és szerkeszthető érvényességi dátum nélkül.
- **Megvalósítás:** a lap fejléce "Terv adatai"-ra vált, és hat,
  vizuálisan elkülönített szekcióra tagolódik (közös `Section`
  komponens, korábban öt helyen másolat-beillesztve): Terv címe, Páciens
  adatai (a személyes adatok + beágyazva a "Páciens törzsadata"
  eltérés-jelzés, kártyakeret nélkül), Dokumentum nyelve, Pénznem,
  Kezelőorvos (üres slot egy későbbi tételnek), Dátumok. A cím mező két
  írási útvonalon él: már mentett lánchoz azonnal ír a meglévő
  `storage.savePlanLabel`-lel, vadonatúj lánchoz a piszkozat UI-workflow
  metaadatában (`DraftMeta.tervCim`) él és a véglegesítéskor íródik ki,
  külön hibazónával (egy címke-írási hiba nem jelenti azt, hogy "a
  mentés nem sikerült", mert a terv ekkor már a lemezen van). Az
  "Érvényes eddig" szerkeszthetővé vált, alapértéke
  `keltezes + ervenyessegNap`, kiürítve automatikusan visszaáll erre
  (docs/01-attekintes-es-dontesek.md D61/D62, docs/03-funkcionalis-spec.md
  § 2 "Terv adatai").

---

### 52. tétel: Dokumentumnyelv és pénznem kiválasztása / öröklése — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D63 (`docs/01-attekintes-es-dontesek.md`),
  pontosított D21.
- **Valódi haszon:** a német nyelv a `nemetEngedelyezve` funkciókapcsoló
  mögé volt zárva (ami a pénznem-szekciót is elrejtette, pedig annak
  semmi köze a némethez), a nyelv/pénznem-kártya az első véglegesítés
  után "Új verzió" drafton is véglegesen zárolva maradt, és a pénzformátum
  csak a pénznemtől függött, a nyelvtől nem — egy német nyelvű, forintos
  terven `1 234 567 Ft` jelent meg `1.234.567 Ft` helyett.
- **Megvalósítás:** a `nemetEngedelyezve` mező teljesen eltűnt a
  `Settings` típusból és minden rá épülő gate-ből (Terv adatai lap,
  Beállítások Egyéb tab, Nyomtatványok tab) — a német nyelv mindig
  választható. A nyelv/pénznem-kártya zárolása (`locked = plan.tervId
  !== ''`) megszűnt, a teljes piszkozat-életciklus alatt szerkeszthető.
  `formatMoney`/`formatPrice` (`domain/money.ts`) új, kötelező `nyelv`
  paramétert kapott: az ezres/tizedes elválasztó a nyelvtől függ (`hu`
  szóköz, `de` pont, a `domain/date.ts` `formatLongDate` mintáján), a
  tizedesjegyek száma és a pénznemjel változatlanul a pénznemtől — a
  képernyős összegek (szerkesztő, verzió-lista, Előnézet) is követik a
  terv nyelvét, csak az Árlista admin (nincs `Plan` a scope-ban) és a UI
  prózája/dátumai maradtak magyarok (docs/01-attekintes-es-dontesek.md
  D21/D63, docs/02-domain-modell.md § Nyelv és pénznem, docs/03-
  funkcionalis-spec.md § 2 "Dokumentum nyelve / Pénznem", docs/04-
  nyomtatvany-spec.md § Számformátum).

---

### 59. tétel: Kezelés keresés, quick items és hozzáadás — KÉSZ (2026-08-20)

- **Méret:** ~0.25 nap.
- **Kereteket sért?** Nem — új D64 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a feltárás szerint a tétel forrás-döntéseinek
  döntő többsége már a kívánt állapotban volt: a redesign fókusz-
  csereötlete (tételhozzáadás után a Fog mezőre ugrás) explicit
  elvetésre került, mert ütközne a `CLAUDE.md` „A UX kritikus pontja"
  gépel → nyíl → Enter ciklusával — ez a ciklus változatlan maradt. Az
  egyetlen valódi hiány az volt, hogy új fázis hozzáadásakor a doki
  kattintani kényszerült a fázis keresőjébe, mielőtt gépelhetett volna.
- **Megvalósítás:** a „Fázis hozzáadása" gomb az új fázis keresőjére
  automatikusan fókuszál és odagördít, a fogtérkép-kattintás meglévő
  `fokuszCel`-mechanizmusát bővítve egy fázis-szintű ággal
  (docs/01-attekintes-es-dontesek.md D64, docs/03-funkcionalis-spec.md
  § 3 "Tételkereső"/"Fázisok"/"Gyorsgombok").

---

### 60. tétel: Kezeléssor szerkesztése — KÉSZ (2026-08-20)

- **Méret:** ~0,5 nap.
- **Kereteket sért?** Nem — új D65 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a kézzel átírt sornév jelzése ("átírt" jelvény) csak
  a fordítás-hiány kérdésére válaszoló komparátoron (`sorFallback`)
  keresztül élt, ami magyar terven sosem futott le — egy magyaron kézzel
  átírt sornév ezért jelöletlen maradt. Az ajánlati árnak sem volt
  soronkénti felár-jelzése, és sem a névre, sem az árra, sem a leírásra
  nem létezett reset az árlistai értékre.
- **Megvalósítás:** egy új, nyelvfüggetlen komparátor a felvételkori
  (nyelv-visszaesést is figyelembe vevő) névhez mér, a meglévő
  fordítás-hiány-komparátortól függetlenül; mindhárom mezőn (név,
  ajánlati ár, leírás) kompakt reset-vezérlő jelent meg, a leírásnál a
  már létező, de a szerkesztőbe eddig be nem kötött összehasonlító
  hívásával. A soron megjelent egy amber felár-jelzés a meglévő
  kedvezmény-jelzés mellé, a becsült ár `≈` kapcsoló pedig az ajánlati ár
  mező alá költözött (`docs/01-attekintes-es-dontesek.md` D65,
  `docs/03-funkcionalis-spec.md` § "Sor mezői").

---

### 64. tétel: Előleg és fennmaradó összeg — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D66 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** az Előleg tudatos, drift-mentes tervezési döntéssel
  SZÁZALÉK-alapú volt (a 0–100%-os szorítás mellékesen strukturálisan
  garantálta `előleg ≤ fizetendő`-t); a doki a redesign mellett döntött,
  ami abszolút összeget kér, és ezt a strukturális védelmet megszünteti.
- **Megvalósítás:** a `Plan.elolegSzazalek` mező `elolegOsszeg`-re váltott
  (abszolút összeg, pénznem alapegységében), előtöltés nélkül,
  bekapcsoláskor üres/azonnal fókuszált mezővel. A `deposit ≤ final`
  validációt nulláról építettük fel: ha a fizetendő az előleg alá
  csökken, az érték VÁLTOZATLAN marad, inline hard error jelzi, a
  fennmaradó rész „—”, és ez új KEMÉNY véglegesítési blokk
  (`domain/veglegesitesOr.ts` `elolegTullep`). Egyenlőségnél a fennmaradó
  rész explicit `0`. Explicit `0` beírása blur/Enter után automatikusan
  kikapcsolja a kapcsolót. A PDF összegző sora és a fizetési feltételek
  sablon-placeholdere (`{{elolegSzazalek}}` → `{{eloleg}}`, új v2 sablon,
  a v1 örökre változatlan marad) összeg-alapúra váltott (docs/01-
  attekintes-es-dontesek.md D66, docs/02-domain-modell.md § Előleg,
  docs/03-funkcionalis-spec.md § 2 "Terv adatai" és § 4 "Előnézet és
  véglegesítés", docs/04-nyomtatvany-spec.md § "Fizetendő" blokk).

---

### 53. tétel: Kezelőorvos kiválasztása és öröklési szabályai — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D67/D68 (`docs/01-attekintes-es-dontesek.md`),
  új sor a "Sérthetetlen szabályok" táblában (a véglegesítés blokkolva
  hiányzó/nem aktív kezelőorvosnál).
- **Valódi haszon:** a `Settings.orvosok` sima névlista volt, aktív/
  inaktív jelölés és alapértelmezett-orvos fogalom nélkül; a "Terv
  adatai" lap Kezelőorvos szekciója csak olvasható placeholder, a doki
  sehol nem tudott másik orvost választani egy konkrét tervhez, és a
  véglegesítésnek nem volt orvos-őre.
- **Megvalósítás:** additív `Settings` mezők (`inaktivOrvosok?`,
  `alapertelmezettOrvos?`, séma-bővítés nélkül), egyetlen feloldó modul
  (`domain/orvosok.ts`). Három öröklési szabály: új terv-lánc mindig a
  globális default orvossal indul; "Új verzió" örökli a forrás orvosát,
  ha még aktív, egyébként a globális defaultra esik vissza (semleges
  info-sáv); "Másolás új tervbe" mindig a globális default orvossal
  indul, a forrás orvosa sosem másolódik át. A "Terv adatai" lap
  Kezelőorvos szekciója Radix `Select`-té vált, csak aktív orvosokkal.
  A Beállítások Orvosok szekciója soronkénti listára váltott (aktív/
  inaktív, sorrend, törlés, alapértelmezett-választó); a default
  deaktiválása másik aktív orvos mellett modális újraválasztást
  kényszerít. A véglegesítés harmadik kemény blokkja a hiányzó/nem
  aktív orvost jelzi (docs/01-attekintes-es-dontesek.md D67/D68,
  docs/02-domain-modell.md § "beallitasok.json", docs/03-funkcionalis-
  spec.md § 2 "Kezelőorvos", § 4 "Előnézet és véglegesítés", § 7
  "Rendelő adatai").

---

### 63. tétel: Egyedi végösszeg — KÉSZ (2026-08-20)

- **Méret:** ~fél nap.
- **Kereteket sért?** Nem — új D69 (`docs/01-attekintes-es-dontesek.md`),
  pontosított D25.
- **Valódi haszon:** a terv-szintű „Kerek végösszeg" kedvezmény korábban
  csak lefelé (kedvezményre) volt szorítható, felár nem volt megadható,
  bekapcsoláskor hamis `0` előtöltéssel indult, és a teljes elengedést
  jelentő `0` végösszeg megerősítés nélkül beállítható volt.
- **Megvalósítás:** a blokk „Egyedi végösszeg"-re nevet váltott, felső
  korlát nélkül — a `Plan.kedvezmenyOsszeg` mostantól ELŐJELES eltérés
  (pozitív kedvezmény, negatív felár), a `tervVegosszeg()` 0-padlózása
  (D25) változatlan. A kapcsoló bekapcsolása üres, azonnal fókuszált
  mezőt ad a korábbi `0` előtöltés helyett; a kötelező-mező hiba csak
  blur után jelenik meg. A `0` cél-végösszeg (teljes elengedés) egyszeri,
  a szerkesztő saját lokális állapotában tárolt megerősítést kér, ami
  `0 → más érték → 0` váltásnál újra megkérdez (docs/01-attekintes-
  es-dontesek.md D25/D69, docs/02-domain-modell.md § Terv-szintű egyedi
  végösszeg, docs/03-funkcionalis-spec.md § Egyedi végösszeg,
  docs/04-nyomtatvany-spec.md § Pénzügyi összesítés). A redesign D487/
  D524 szerinti pénznemenkénti dual-state a 62. tételre várva külön,
  89. tételként vált le.

---

### 61. tétel: Árlista-snapshot és explicit refresh — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D70 (`docs/01-attekintes-es-dontesek.md`).
- **Valódi haszon:** a sor `listaEgysegar`-ja pillanatkép (D7), de eddig
  semmi nem vetette össze soha többé a mai árlistával — egy hónapokkal
  korábbi tervet újranyitva a doki észrevétlenül dolgozhatott elavult
  áron, és a "Másolás új tervbe" is elavult árakkal készített "friss"
  változatot. Ez oldotta fel a 49. tétel (D57) 2./6. döntésének korábban
  VÁRAKOZÓ állapotát.
- **Megvalósítás:** új `domain/arKoveti.ts` modul (`nevKoveti()` mintájú
  derived komparátor, nincs tárolt flag) adja az ár-követés magját. A
  szerkesztő Listaár cellája minden eltérő soron egy ⟳ vezérlőt kap, ami
  megerősítő előnézettel (régi→új listaár, a kézi felülírás törlése, a
  "Kezelések összege"/"Fizetendő" hatása) frissíti a sort a mai
  árlistára. A véglegesítés-őr (`veglegesitesOr.ts`) ötödik, utolsó puha
  lépést kapott — elavult pillanatkép ÉS/VAGY kézzel felülírt ajánlati ár
  esetén, nem blokkolva a mentést. A "Másolás új tervbe" (`planMasolatKent()`
  opcionális ötödik `priceList` paramétere) a default-following (ár ÉS
  név ÉS leírás is követő) sorokat az aktuális árlistára frissíti, az
  `arlistaVerzio`-t is átbélyegezve; a kézzel felülírt sorok érintetlenek
  maradnak. Az árlista admin-mentése változatlanul soha nem ír át
  automatikusan egy már megnyitott/mentett tervet (docs/01-attekintes-
  es-dontesek.md D70, docs/02-domain-modell.md § "Miért van
  `nevSnapshot` és `listaEgysegar` a soron", docs/03-funkcionalis-
  spec.md § 3 "Sor mezői" és § 4 "Előnézet és véglegesítés").

---

### 62. tétel: Többpénznemes listaár / ajánlati ár state — KÉSZ (2026-08-20)

- **Méret:** ~1 nap.
- **Kereteket sért?** Nem — új D71 (`docs/01-attekintes-es-dontesek.md`),
  additív mező, `schemaVersion` nem emelkedett.
- **Valódi haszon:** a pénznemváltás korábban DESTRUKTÍV volt (törölte a
  terv összes sorát), mert nem volt hova "elmenteni" a másik pénznem
  állapotát — egy félig kész HUF-terv EUR-ra váltása a doki teljes
  munkáját elvitte, holott az árlistában az EUR árak már ott voltak.
  Emellett egy a kiválasztott pénznemben nem beárazott tétel a keresőben
  meg sem jelent, így a doki nem tudott kézi ajánlati árral felvenni egy
  legitim tételt.
- **Megvalósítás:** a `Sor` additív `masikPenznemAr?: { listaEgysegar;
  tenylegesEgysegar } | null` stash-mezőt kapott
  (`domain/penznemValtas.ts` `sorPenznemValtassal()`): kilépéskor a
  jelenlegi árpár ide kerül, belépéskor a korábban itt mentett érték
  emelkedik elő (kézzel írt ár sosem vész el egy oda-vissza váltásban),
  ennek hiányában az árlistából szedődik újra, egyébként a sor "hiányzó
  ár" (`0/0`) állapotba kerül, törlés nélkül. A pénznemváltás
  megerősítő dialógusa megmaradt, de hatás-számlálóval (hány sor kapja
  vissza a mentett árát, hány frissül az árlistából, hány marad ár
  nélkül) és semleges (nem piros) gombbal, mert nincs adatvesztés. A
  kereső (`PlanEditorPage.tsx`) többé nem szűr a terv pénznemére — egy
  beárazatlan tétel is kereshető/felvehető, `—` listaárral; a
  beárazatlan, kézi árat sem kapott, névvel ellátott sor viszont új
  KEMÉNY véglegesítés-blokk (`domain/kitoltetlen.ts` `araztalanSorok()`).
  Nincs automatikus HUF↔EUR átváltás egyik ágban sem
  (docs/01-attekintes-es-dontesek.md D11/D71, docs/02-domain-modell.md
  § Pénznemváltás, docs/03-funkcionalis-spec.md § 2 "Dokumentum nyelve /
  Pénznem" és § 4 "Előnézet és véglegesítés").

---

### 65. tétel: Manuális szövegek nyelvi review-ja — KÉSZ (2026-08-20)

- **Méret:** ~2 nap.
- **Kereteket sért?** Nem — új D72 (`docs/01-attekintes-es-dontesek.md`),
  additív mezők, `schemaVersion` nem emelkedett.
- **Valódi haszon:** a doki kézzel gépelt szövegein (sornév, sorleírás,
  fázisnév, fázis-megjegyzés) korábban semmi nem jelezte, ha egy szöveg
  nem a dokumentum nyelvén íródott. A meglévő `sorFallback` egy MÁSIK
  kérdésre válaszol (van-e árlistai fordítás), magyar terven mindig
  `null`-t ad, és egyedi (árlistán kívüli) sornál deklaráltan tehetetlen —
  egy magyar tervbe véletlenül vagy szándékosan németül begépelt szöveg
  korábban teljesen láthatatlan volt, a leírásnak pedig semmilyen nyelvi
  jelzése nem volt.
- **Megvalósítás:** a `Sor`/`Fazis` additív, TÁROLT
  `{ authoredInLanguage; reviewedForLanguage? } | null` review-metaadatot
  kapott mind a négy szabad szövegén (`domain/nyelviReview.ts`) — az
  ELSŐ tárolt nyelvi jelző a sémában, szemben a projekt eddigi derived
  komparátoraival, mert "milyen nyelven gépelte a doki" utólag semmiből
  nem vezethető le. Mismatch esetén a szerkesztő mezőszintű `HU szöveg`/
  `DE szöveg` jelvényt és egy "Nyelv ellenőrizve" vezérlőt mutat — ezt
  KIZÁRÓLAG ez az explicit akció oldja fel, a szöveg szerkesztése (akár a
  helyes nyelvre teljesen átírva) vagy a dokumentumnyelv váltása
  önmagában nem. A véglegesítés-őr hatodik, a `de-fallback-names` UTÁNI
  puha lépést kapott, amiből egy nem-modális, irányított review
  indítható (`NyelviReviewContext`/`NyelviReviewBar`,
  `TervWorkflowShell.tsx`-ben mountolva) — a VALÓDI szerkesztőmezőkhöz
  navigál, a meglévő fókusz-mechanizmusra építve, nem egy duplikált
  modal-szerkesztőre. A meglévő `sorFallback`/`fallbackSorok`
  (árlistai fordítás-hiány) mechanizmus változatlanul, egymás mellett él
  ezzel (docs/01-attekintes-es-dontesek.md D72, docs/02-domain-modell.md
  § "Nyelvi review a kézzel írt szövegeken", docs/03-funkcionalis-
  spec.md § 3 "Sor mezői", § "Fázisok" és § 4 "Előnézet és
  véglegesítés").

---

### 67. tétel: Finalization validation engine — KÉSZ (2026-08-20)

- **Méret:** ~2 nap.
- **Kereteket sért?** Nem — új D76/D77/D78
  (`docs/01-attekintes-es-dontesek.md`), egy új sor a `CLAUDE.md`
  "Sérthetetlen szabályok" táblájában (D77); `schemaVersion` nem
  emelkedett.
- **Valódi haszon:** a véglegesítés-őr korábban tizenegy, egymástól
  eltérő alakú mezőt adott vissza (boolean flag-ek, `string[]` listák,
  egy `alkalmazhato` map által vezérelt szekvenciális megerősítő-lánc),
  amit a doki csak a "Véglegesítés és mentés" gombnyomás UTÁN,
  szekvenciális "Folytatás" dialógusokon keresztül látott. Emellett
  kódolvasás közben kiderült: egy 0 soros fázis semmit nem blokkolt
  finalizáláskor, és üres fejlécként kikerült a nyomtatványra.
- **Megvalósítás:** `veglegesitesDiagnozis()` egységes, navigálható
  `hard`/`soft`/`info` súlyosságú `CsekklistaTetel`-listát ad vissza
  (`domain/veglegesitesOr.ts`) — a `PreviewPage.tsx` a teljes listát
  MINDIG megjeleníti, a gombnyomás ELŐTT is; a szekvenciális modal-lánc
  megszűnt, a gomb kizárólag `hard` tétel jelenlétekor letiltott. A
  hiányzó/eltérő német tételnév a doki explicit döntése alapján PUHÁRÓL
  KEMÉNY blokkra emelkedett — a predikátum (`domain/nemetNev.ts`
  `nemetNeveIgazolt()`) az árlistai fordítást (`nevKoveti`) ÉS a D72
  nyelvi review-metaadatot (`Sor.nevNyelv`) komponálja, hogy a kézzel
  átírt és egyedi sorok is elháríthatók maradjanak. Új kemény blokk a
  fogtérkép-legendán ténylegesen látszó, hiányzó német kategórianévre
  és a 0 soros fázisra (`uresFazisok()`, `domain/kitoltetlen.ts`). A
  meglévő domain-függvények (`kitoltetlenSorok`/`nullaOsszeguSorok`/
  `hianyzoCsomagLeirasok`/`arElteroSorok`/`masterSnapshotDiff`/
  `orvosProblema`/`nyelviMismatchek`) hívása változatlan (lásd
  `docs/01-attekintes-es-dontesek.md` D76/D77/D78,
  `docs/02-domain-modell.md` § "Nyelvi review a kézzel írt szövegeken",
  `docs/03-funkcionalis-spec.md` § "Fázisok" és § 4 "Előnézet és
  véglegesítés").

---

### 68. tétel: PDF előnézet generálás és invalidálási életciklus — KÉSZ (2026-08-20)

- **Méret:** kicsi (egy fájl érdemi módosítása + új tesztfájl).
- **Kereteket sért?** Nem — új D73 (`docs/01-attekintes-es-dontesek.md`),
  nincs sémaváltozás.
- **Valódi haszon:** az előzetes állapotfelmérés szerint a PDF-előnézet
  életciklusának többsége már megfelelt a kívánalmaknak (auto-generálás,
  töltés alatti beszürkítés, a mentett historical PDF elkülönítve); a
  kódolvasás viszont két, korábban dokumentálatlan defektust tárt fel
  ugyanabban a hibaútvonalban: a hiba-`Callout` a `usePDF()` típusígérete
  (`string`) és a futásidejű alakja (nyers `Error`) közti eltérés miatt
  render-hiba esetén ténylegesen összeomlott volna, és a „Letöltés” gomb
  hibaállapotban is aktív maradt egy már a képernyőn látott tervvel nem
  egyező, elavult PDF-fel.
- **Megvalósítás:** a hiba-Callout biztonságosan alakítja szöveggé a
  `pdfInstance.error`-t (`instanceof Error` védelemmel), és egy explicit
  „Újrapróbálás” gomb kapott helyet mellette, ami újra meghívja
  `updatePdf(tervDocument)`-et. Amíg a hiba fennáll, a „Letöltés” helyén
  letiltott „Elavult PDF” gomb jelenik meg, és az utolsó sikeres előnézet
  beszürkítve (nem eltűnve) látszik — a `usePDF()` a hibán át megőrzi az
  `url`/`blob`-ot. A „Véglegesítés és mentés” letiltása változatlan
  maradt (docs/01-attekintes-es-dontesek.md D73, docs/03-funkcionalis-
  spec.md § 4 "Előnézet és véglegesítés", docs/05-technologia.md
  § "PDF generálás").

---

### 69. tétel: Atomikus véglegesítés (PDF+JSON) — KÉSZ (2026-08-20)

- **Méret:** kicsi (egy fájl érdemi módosítása + két új teszt).
- **Kereteket sért?** Nem — új D74 (`docs/01-attekintes-es-dontesek.md`),
  nincs sémaváltozás.
- **Kódban azonosított hiba, nem csak hiányzó feature:** a véglegesítés
  (`doFinalize()`) egyetlen try blokkban futtatta a tartós mentést
  (`savePlan`/`loadPlan`) és a piszkozat best-effort takarítását
  (`markPlanSaved`, ami végül `drafts.clear()`-t hív) — egy sikeres
  mentés utáni hibázó takarítás hamis „A mentés nem sikerült” üzenetet
  mutatott volna egy valójában tartósan mentett verzió mellett.
- **Megvalósítás:** a takarítás saját try/catch-be került, a
  sikerképernyő (`savedRef`) a takarítás hibájától függetlenül mindig
  megjelenik; egy hibázó takarítás legfeljebb egy halk, amber jelzést
  kap a sikerképernyőn (a meglévő `cimkeHiba` mintáján), soha nem
  minősül mentési hibának (docs/01-attekintes-es-dontesek.md D74,
  docs/03-funkcionalis-spec.md § 4 "Előnézet és véglegesítés",
  docs/05-technologia.md § "Piszkozat-autosave").

---

### 70. tétel: „Csak ajánlat” mód — KÉSZ (2026-08-20)

- **Méret:** kicsi (öt fájl érdemi módosítása + öt új/bővített teszt-fájl).
- **Kereteket sért?** Nem — új D75 (`docs/01-attekintes-es-dontesek.md`),
  additív mező, nincs sémaváltozás.
- **Hiányzó feature:** a „Csak ajánlat” kapcsoló kizárólag a
  `PreviewPage.tsx` helyi React state-je volt — nem élte túl a
  navigációt, nem öröklődött „Új verzió” nyitásakor, és egy
  véglegesített `terv.json`-ból utólag nem volt kiolvasható.
- **Megvalósítás:** additív `Plan.csakAjanlat?: boolean` mező a meglévő
  draft-state/autosave/`finalPlan`-spread útvonalba kötve. Friss terv
  `false`-ból indul, „Új verzió” nyitása a meglévő `frissDatummal()`
  spreadje miatt automatikusan örökli, „Másolás új tervbe” explicit
  `false`-ra állítja. Véglegesítéskor a mentett érték az EFFEKTÍV
  állapot (kézi választás VAGY a placeholder-nyilatkozat miatti
  kényszer) — a mentett `terv.json` mindig a ténylegesen kiadott PDF-et
  tükrözi. A véglegesített verziók sorában (`PatientPlanChains.tsx`)
  ez alapján jelenik meg egy „Csak ajánlat” jelvény
  (docs/01-attekintes-es-dontesek.md D75, docs/02-domain-modell.md
  § "Csak ajánlat mód", docs/03-funkcionalis-spec.md § 4 "Előnézet és
  véglegesítés" és § 5 "Terv-láncok és verziók").

---

### 66. tétel: Előnézet oldal layout és validation checklist — KÉSZ (2026-08-20)

- **Méret:** kicsi (egy fájl érdemi átalakítása + egy új komponens, nincs
  új teszt — a meglévő `PreviewPage.test.tsx` lefedettsége változatlanul
  a markup-átalakítás fölött is zöld maradt).
- **Kereteket sért?** Nem — új D79 (`docs/01-attekintes-es-dontesek.md`),
  nincs sémaváltozás.
- **Megvalósítás:** az Előnézet oldal az addigi egyoszlopos elrendezésről
  kéthasábosra vált: a PDF-előnézet balra (elsődleges, nagy), a
  véglegesítési checklist (D76) jobbra, natív Radix `Grid`
  `areas`/`gridArea` responsive propokkal — szűk viewporton a checklist
  kerül a PDF FÖLÉ, nem alá. A „Csak ajánlat” kapcsoló és a Letöltés/
  Véglegesítés gombsor a checklist hasáb aljára költözött. A checklist
  renderelése önálló komponensbe (`pages/previewPage/
  VeglegesitesChecklist.tsx`) került, kiemelve a `PreviewPage.tsx`-ből
  (docs/01-attekintes-es-dontesek.md D79, docs/03-funkcionalis-spec.md
  § 4 "Előnézet és véglegesítés" → "Elrendezés").

---

### 71. tétel: Final terv részletei alapnézet és verziónavigáció — KÉSZ

- **Méret:** közepes — 2 új fájl (`domain/planVersionActions.ts`,
  `components/PlanVersionActionDialog.tsx`), 1 új oldal
  (`pages/TervReszleteiPage.tsx`), 1 új route, meglévő komponensek
  áthuzalozása, 4 új/módosított tesztfájl.
- **Megvalósítás:** új, URL-lel címezhető read-only nézet egy
  véglegesített terv-verzióra
  (`/paciensek/:patientDir/tervek/:planDir/:versionDir`) — fejléc,
  akciósáv, verziónavigáció, historical páciens-pillanatkép read-only
  diffje, teljes lokális state-reset verzióváltáskor. A terv-lánc fa
  „Megnézés” akciója mostantól ide navigál a nyers PDF közvetlen
  megnyitása helyett — az utóbbi a Terv részletei lap „Megnyitás külön”
  akciójává vált. A verzió-linkelt akciók (Új verzió/Másolás új tervbe)
  megosztott döntési logikája és megerősítő dialógusa kiemelve a
  terv-lánc fából, hogy két hívó (a fa és az új oldal) ne térjen el
  egymástól. Részletek: `docs/03-funkcionalis-spec.md` § 11 "Terv
  részletei (véglegesített verzió)".

---

### 72. tétel: Final fázis- és kezeléssor megjelenítés — KÉSZ

- **Méret:** közepes — 4 új fájl (`pages/tervReszletei/FazisokBlokk.tsx`,
  `FazisReszlet.tsx`, `SorReszlet.tsx`, `FazisUgroNav.tsx` + saját
  tesztfájl), 2 módosított fájl (`TervReszleteiPage.tsx`, `index.css`).
- **Megvalósítás:** a Terv részletei nézet „fázisok és kezelési sorok”
  slotja read-only, alapból nyitott, összecsukható fázis-szekciókkal
  töltődött fel — stabil 5 oszlop, ajánlati ár elsődleges/listaár csak
  eltérésnél, explicit kibontású leírás-sorok (a nyitottság a fázis-
  összecsukást túlélő szülő-állapotban él), statikus „Becsült ár”
  jelvény, és 4+ fázisnál egy sticky fázis-ugró legördülő scrollspy-vel.
  A fázisonkénti sticky táblafejléc a Radix `Table.Root` belső
  `ScrollArea`-jának overflow-feloldásával jött létre egy scoped CSS-
  szabállyal. Minden sor stabil, egyedi DOM id-t kapott a jövőbeli
  fogtérkép-navigáció horgonyaként. Részletek:
  `docs/03-funkcionalis-spec.md` § 11 "Terv részletei (véglegesített
  verzió)" → "Fázisok és kezelési sorok".

---

### 73. tétel: Final fogtérkép navigáció — KÉSZ

- **Méret:** kicsi — 1 új fájl
  (`pages/tervReszletei/FogterkepPanel.tsx`), 6 módosított fájl
  (`design/toothChartSvg.ts`, `components/DentalChart.tsx`,
  `components/ToothPickerPopover.tsx`, `pages/tervReszletei/
  FazisokBlokk.tsx` + `FazisReszlet.tsx` + `SorReszlet.tsx`,
  `pages/TervReszleteiPage.tsx`), 3 tesztfájl bővítve.
- **Megvalósítás:** a Terv részletei nézeten a „Kezelési fázisok" fölé
  egy read-only, alapból csukva induló „Érintett fogak" fogtérkép-panel
  került, ami a szerkesztő MEGLÉVŐ interaktív infrastruktúráját
  (billentyűzet-navigáció, `is-picked` kijelölés-gyűrű) hasznosítja
  újra. A `DentalChart` egy explicit `szerep: 'button' | 'option'` propot
  kapott — korábban ezt a `selectedTeeth` megléte döntötte el, ami a
  soronkénti fogválasztót (`ToothPickerPopover`) is átbillentette volna,
  ha a plan-szintű térkép is kapott volna kijelölést; a szétválasztás
  után a soronkénti választó explicit `szerep="option"`-t ad, a
  plan-szintű térképek (a szerkesztő és a Terv részletei is) az
  alapértelmezett `'button'`-t, `aria-pressed`-del. Több fog is
  kijelölhető egyszerre (kezeletlen fogra kattintás hatástalan), a
  kijelölt fogak sorainak uniója additív, semleges háttérkiemelést kap,
  csak az első kijelölés görget a sorra, egy csukott fázisba eső
  kijelölés automatikusan kinyitja azt. Részletek:
  `docs/03-funkcionalis-spec.md` § 11 "Terv részletei (véglegesített
  verzió)" → "„Érintett fogak" panel", `docs/07-felulet-rendszer.md`
  „Komponensek".

---

### 74. tétel: Final pénzügyi összesítés — KÉSZ

- **Méret:** közepes — 2 új fájl (`domain/sorElteres.ts` + teszt,
  `pages/tervReszletei/PenzugyiOsszesites.tsx` + teszt), 4 módosított
  fájl (`pages/PlanEditorPage.tsx`, `pages/tervReszletei/SorReszlet.tsx`,
  `pages/TervReszleteiPage.tsx`, `storage/seed/plans.ts`), 3 tesztfájl
  bővítve.
- **Megvalósítás:** a Terv részletei nézet placeholder-slotja egy teljes
  pénzügyi összesítő blokkra cserélődött, ami a MENTETT
  `plan.osszesitok`-ból olvas (sosem a sorokból újraszámolt értékből) —
  domináns Fizetendő, feltételes Kezelések összesen referenciasor,
  becsült tételek info-sora, csak előleg megléte esetén megjelenő
  Fizetés alcsoport, és egy eddig kizárólag piszkozat-betöltéskor futó
  eltérés-ellenőrzés (`osszesitokElter()`) info-szintű figyelmeztetése.
  Új, megosztott `sorElteres()` classifier váltotta a szerkesztő inline
  kedvezmény/felár-számítását — ugyanaz a logika adja a szerkesztő
  zöld/amber jelvényét és a lezárt terv semleges szürke jelvényét,
  kiegészítve a hiányzó `Felár` (0 listaár) esettel és a nemnulla
  eltérés hazug kerekítés elleni védelmével. Részletek:
  `docs/03-funkcionalis-spec.md` § 11 "Terv részletei (véglegesített
  verzió)" → "Pénzügyi összesítés", `docs/02-domain-modell.md` § "Sor-
  szintű ár-eltérés osztályozása".

---

### 75. tétel: Mentett PDF viewer / külön megnyitás — KÉSZ

- **Méret:** kicsi — 2 új fájl (`storage/usePlanPdfObjectUrl.ts`,
  `pages/tervReszletei/MentettPdfPanel.tsx`), 3 módosított fájl
  (`pages/TervReszleteiPage.tsx`, `pages/demo/fileTree/FileContentPanel.tsx`,
  `test-setup.ts`), 1 tesztfájl bővítve.
- **Megvalósítás:** a Terv részletei nézet a strukturált tartalom UTÁN
  beágyazva jeleníti meg a ténylegesen véglegesítéskor mentett PDF-et
  (~80vh natív `<iframe>`), a MEGLÉVŐ bájtokból (`loadPlanPdf()`), sosem
  újragenerálva. A "bájtok → Blob → object URL, cleanupban revoke" effekt
  egy új, megosztott `usePlanPdfObjectUrl` hookba került ki — a Filerendszer
  nézet korábban egyedül élő PDF-betöltő logikája erre állt át, hogy ne
  legyen két egyforma másolat. Az akciósáv egy "Letöltés" gombot kapott a
  MEGLÉVŐ fájlnév-konvencióval; a "Megnyitás külön" változatlan maradt.
  Hiányzó/olvashatatlan mentett PDF esetén a viewer helyén üzenet jelenik
  meg, a lap többi, JSON-ból származó tartalma érintetlen. Részletek:
  `docs/03-funkcionalis-spec.md` § 11 "Terv részletei (véglegesített
  verzió)" → "Mentett PDF".

---

### 76. tétel: PDF oldalváz — fejléc/lábléc/oldalszám — KÉSZ

- **Méret:** kicsi-közepes — 2 új fájl (`pdf/footerLayout.ts` +
  tesztje), 1 érdemben átalakított fájl (`pdf/TervDocument.tsx`), a
  kísérő teszt és a `pdf/labels.ts` bővítve, a nyomtatvány-spec és
  néhány kereszthivatkozó komment frissítve.
- **Megvalósítás:** a nyomtatvány mai négy fix `<Page>`-je három folyó
  blokkra vált (terv és ár / fizetési feltételek + garancia egy
  folyamban / nyilatkozat és aláírás) — mindegyik szabadon túlfolyhat
  több fizikai oldalra. A kompakt fejléc mostantól minden nem-első
  fizikai oldalon megjelenik (a nagy fejléc kizárólag a dokumentum
  legelső oldalán), a react-pdf `fixed`+`render` mechanizmusára építve,
  a pagináció tényleges viselkedésének megfelelően. A nyilatkozat blokk
  többoldalas tördelésekor a második és minden további fizikai oldal
  "Nyilatkozat – folytatás" címet kap. A lábléc jobb blokkja
  (páciensnév + tervId) névhossz-alapú, a dokumentum elején egyszer
  számolt, minden oldalon azonos magasságot kap (`pdf/footerLayout.ts`,
  karakterszám-heurisztika — a `@react-pdf/renderer` nem ad
  szövegmérést). A fázis-/szakaszszintű folytatólagos cím a fázisokra
  és a fizetési feltételekre/garanciára szándékosan nem valósult meg —
  a react-pdf folyam-modellje ezt egy blokkon belüli szakaszhatáron nem
  tudja natívan kifejezni. Részletek: `docs/04-nyomtatvany-spec.md` §
  "Fejléc", "Lábléc — minden oldalon", "2. blokk — fizetési feltételek
  és garancia", "3. blokk — nyilatkozat és aláírás".

---

### 77. tétel: PDF első oldal: cím + páciensadatok + fogtérkép — KÉSZ

- **Méret:** kicsi-közepes — 2 érdemben átalakított fájl
  (`pdf/TervDocument.tsx`, `pages/PreviewPage.tsx`), a kísérő teszt
  bővítve, a nyomtatvány-spec frissítve.
- **Megvalósítás:** az 1. blokk tartalmi sorrendje fejléc → terv címe +
  páciensadatok → fogtérkép → fázisok → összegzésre vált, a korábbi,
  a fogtérkép és az összegzés egymás mellett álló kéthasábos alsó sor
  megszűnésével — az összegzés mostantól mindig a fázisok után, teljes
  szélességben áll. A `TervDocument` egy új, kötelező `tervCim` propot
  kapott (a `PreviewPage.tsx` adja fel oldva: már mentett lánchoz a
  tárolt terv-cimke, vadonatúj lánchoz az élő javaslat), séma-változás
  nélkül — a cím a `terv-cimke.json`-ban él, nem a `terv.json`-ban. A
  páciensblokk egy sorrendfüggetlen kétoszlopos rácsból két fix
  szemantikus oszlopra vált (bal: Név/Született/TAJ/Lakcím, jobb:
  Telefon/E-mail), és az üres mező mostantól teljesen kimarad a sorból
  `—` helyett, rebalance nélkül — a hiányzó mező helye a saját
  oszlopában marad üresen. Részletek: `docs/04-nyomtatvany-spec.md`
  § "1. blokk — kezelési terv és ár", "Terv címe", "Pácienstömb",
  "Fogtérkép", "Összegzés".

### 78. tétel: PDF fázisok és kezeléstáblák — KÉSZ

- **Méret:** kicsi — 1 érdemben átalakított fájl (`pdf/TervDocument.tsx`,
  ezen belül a `PhaseTable`), egy szöveg-módosítás (`pdf/labels.ts`), a
  kísérő teszt bővítve, a nyomtatvány-spec frissítve.
- **Megvalósítás:** a tételtáblázat üres `Fog` cellája mostantól `—`-t
  kap üres cella helyett; a becsült-ár csillag a tételnév utánról az
  Egységár melletti, fix szélességű sávba költözik, hogy a csillagos és
  nem csillagos sorok összege ugyanarra a függőleges vonalra igazodjon.
  A sávos lábjegyzet szövege rövidebb, de a származtatott összegekre
  (Fizetendő, Előleg, Fennmaradó rész) vonatkozó jogi védelmet
  tartalmilag megtartja. Új oldaltörési szabályok: a fáziscím +
  táblázatfejléc + legalább az első tételsor együtt marad (a cím nem
  maradhat árván az oldal alján), a `Fázis összesen` + a fázis
  megjegyzése szintén nem szakadhat szét. A tételsor+leírás
  keep-together csoport szűkült a puszta alapsorra (név/fog/db/ár) — a
  hozzá tartozó leírás, ha extrém hosszú, önállóan törhet oldalra.
  Részletek: `docs/04-nyomtatvany-spec.md` § "Tételtáblázat".

### 79. tétel: PDF pénzügyi összesítés — KÉSZ

- **Méret:** kicsi — 3 érintett fájl (`pdf/labels.ts`, `pdf/TervDocument.tsx`,
  `pages/tervReszletei/PenzugyiOsszesites.tsx`), a kísérő tesztek bővítve,
  a nyomtatvány- és funkcionális spec frissítve.
- **Megvalósítás:** az Összesítés blokk saját címet kapott (`Összesítés`/
  `Zusammenfassung`), a `Fizetendő`/`Kezelések összesen` feliratok
  `Végösszeg`/`Kezelések összege`-re változtak — a Terv részletei
  (véglegesített verzió) képernyővel EGYÜTT, hogy a két felület szókincse
  ne csússzon szét. Az Előleg/Fennmaradó rész sorok mostantól három
  megkülönböztethető vizuális szintet kapnak (Végösszeg > Fennmaradó rész
  > Előleg), finom elválasztóvonallal a Végösszeg alatt. A számítási
  forrás változatlanul `tervVegosszeg()`. Részletek:
  `docs/04-nyomtatvany-spec.md` § "Összegzés".

### 80. tétel: PDF lokalizáció, dátum- és pénzformázás — KÉSZ

- **Méret:** kicsi — a `pdf/labels.ts` TAJ-felirata, egy új
  `pdf/pdfCimLokalizacio.ts` modul + kísérő teszt, egy kis refaktor a
  `domain/tervCim.ts`-ben, bekötés a `pdf/TervDocument.tsx`-ben, a
  nyomtatvány-spec és a `CLAUDE.md` frissítve.
- **Megvalósítás:** a német TAJ-felirat szó szerint `TAJ` lett
  (`TAJ-Nr.` helyett). Új, kizárólag a `pdf/` alól importálható
  lokalizáló réteg: a soha át nem írt (auto-javasolt) terv-cím és a
  generált fázisnév-minta egy német terven lokalizálódik (a domináns
  kategória `nev.de`-je, illetve `"N. Behandlung"`), kézzel átírt/
  átnevezett szöveget változatlanul hagyva — a szerkesztő UI-ja
  (`javasoltTervCim`/`generaltFazisNev`) szándékosan magyar marad. A
  doki a tervdokumentum EUR pénznemjel-cseréjét (szöveges `EUR` a `€`
  szimbólum helyett) explicit felülbírálta: a `€` marad, a Ft-tal
  konzisztensen, ehhez a ponthoz nem tartozott kódváltozás. Részletek:
  `docs/04-nyomtatvany-spec.md` § "Nyelv".

### 91. tétel: Előleg megadása százalékban is — KÉSZ

- **Méret:** kicsi — egy új tiszta függvény (`domain/totals.ts`), egy
  additív `ChipGroup` prop, a szerkesztő Előleg blokkjának bővítése
  (`pages/PlanEditorPage.tsx`), kísérő tesztek, a funkcionális spec és a
  `CLAUDE.md` frissítve.
- **Megvalósítás:** a szerkesztő Előleg blokkja Ft/% módváltót kapott — a
  százalék kizárólag beviteli segéd, a bevitel pillanatában a
  Fizetendőből abszolút összeggé számol (felfelé kerekítve a legközelebbi
  1000 pénznem-alapegységre), és sem a mód, sem a beírt százalék nem
  kerül a `Plan`-re: a fájlban továbbra is kizárólag az abszolút összeg
  tárolódik, a nyomtatvány, a sablon és a véglegesítés-őr érintetlen.
  Kezelési sor nélkül (0 Fizetendő) a módváltó nem jelenik meg. Részletek:
  `docs/03-funkcionalis-spec.md` § "Előleg".

### 81. tétel: PDF fizetési feltételek és garancia — KÉSZ

- **Méret:** kicsi-közepes — a `Plan.sablonVerzio` mező törlése ~50
  fájlt érintett (túlnyomó többségük mechanikus teszt-fixture takarítás),
  a tényleges viselkedésváltozás két fájlban (`pdf/TervDocument.tsx`,
  `domain/veglegesitesOr.ts`) + egy új segédfüggvény
  (`domain/templates.ts`), kísérő tesztek, a nyomtatvány- és
  funkcionális spec frissítve.
- **Megvalósítás:** a `terv.json` innentől nem tárol sablonazonosítót —
  a történeti igazság kizárólag a véglegesítéskor mentett final PDF. Egy
  a vizsgálat során talált, önálló rés is itt záródott: a fizetési
  feltételek/garancia szakasz a HU-visszaesés UTÁN is placeholder- vagy
  üres szövege esetén a címével együtt teljesen kimarad a nyomtatványból
  (`sablonNyomtathato()`), nem csak a cross-language esetben — ha emiatt
  mindkét szakasz kimaradna, a teljes blokk (`<Page>`) sem kerül a
  dokumentumba. A véglegesítés-őr új, puha checklist-tétellel jelzi a
  dokinak, mely szakaszok maradnak ki. Részletek:
  `docs/04-nyomtatvany-spec.md` § "2. blokk — fizetési feltételek és
  garancia" és `docs/03-funkcionalis-spec.md` § "Sablon-placeholder őr".

### 82. tétel: PDF nyilatkozat és aláírásblokk — KÉSZ

- **Méret:** kicsi — a tétel eredeti hatóköréből az `offerOnly` prop
  `plan.csakAjanlat`-ra állítása és a nyilatkozat folytatólagos
  „– folytatás" címe időközben más tételekben már megvalósult; egyedül
  az aláírásblokk és a nyilatkozat utolsó bekezdése közti árva-védelem
  maradt nyitott.
- **Megvalósítás:** a nyilatkozat utolsó bekezdése egy `minPresenceAhead`-
  del ellátott `View`-ba került, a fáziscím/szakaszcím-védelem meglévő
  mintáján — ha az egyben maradó (`wrap={false}`) aláírásblokk nem fér ki
  az oldal aljára, ez a bekezdés is átkerül vele a következő oldalra,
  nem marad árván elszakítva az aláírástól. Részletek:
  `docs/04-nyomtatvany-spec.md` § "3. blokk — nyilatkozat és aláírás".

### 83. tétel: Kezeléslista/editor: aktiválási modell és deaktiválás megerősítése — KÉSZ

- **Méret:** közepes — két fő fájl (`pages/PriceListAdminPage.tsx`,
  `domain/kitoltetlen.ts` + `domain/veglegesitesOr.ts`) és kísérő
  tesztek.
- **Megvalósítás:** a mai azonnali-aktiválásról a redesign óvatosabb
  modelljére tért át. Egy új tétel mostantól inaktívként jön létre; a
  HUF ár mező első elhagyása dönt az aktiválásról (pozitív ár némán
  aktivál, 0 Ft megerősítést kér) — ez az "első interakció" állapot
  tranziens, nincs hozzá séma-mező, elmúlik, ha a doki a sort érintés
  előtt bezárja. A deaktiválás mostantól megerősítést kér, a
  reaktiválás marad azonnali. Új, puha véglegesítés-checklist-tétel
  jelzi, ha egy draft sor egy időközben inaktivált tételre hivatkozik
  (`inaktivTetelreHivatkozoSorok()`, `domain/kitoltetlen.ts`), a sor
  neve/ára a pillanatkép-elv szerint változatlan marad. Részletek:
  `docs/03-funkcionalis-spec.md` § "6. Kezelések és árak" „Új tétel
  felvitele" / „Törlés helyett inaktiválás" / „Véglegesítési
  checklist".

### 84. tétel: Kategóriakezelés: mentési modell és hiányzó német név jelzése — KÉSZ

- **Méret:** kicsi-közepes — egyetlen fájl (`pages/PriceListAdminPage.tsx`)
  és kísérő tesztek.
- **Megvalósítás:** a Kategóriák panel attribútum-szerkesztése (HU/DE név,
  szín, fel/le sorrendezés) a korábbi leütésenkénti autosave-ról pufferelt
  draftra tért át, saját explicit Mentés/Mégse gombpárral — a panel
  becsukása és a NavBar-navigáció nem mentett módosítással megerősítést
  kér, a Mégse azonnali. A kategória létrehozása és törlése marad
  azonnali, mert ezek identitás-változtató műveletek, amiket egy Mégse
  nem tud értelmesen visszavonni; egy folyamatban lévő draft-szerkesztés
  ettől érintetlen marad. A lecsukott kategória-sor mostantól egy szürke
  „nincs DE név” jelvényt mutat, ha a kategóriának nincs német neve,
  ugyanaz a vizuális minta, mint a tétel-táblázat során. Részletek:
  `docs/03-funkcionalis-spec.md` § "6. Kezelések és árak" „Kategóriák
  panel", `docs/07-felulet-rendszer.md` § "Komponensek".

### 85. tétel: Alapértelmezett dokumentum-pénznem — KÉSZ

- **Méret:** kicsi — három forrásfájl (`domain/types.ts`, új
  `domain/beallitasok.ts`, `domain/blankPlan.ts`) és a Beállítások Egyéb
  tabja, kísérő tesztekkel.
- **Megvalósítás:** a nyelv-defaulthoz hasonlóan a pénznemnek is lett
  Settings-mezője (`alapertelmezettPenznem`, opcionális, HUF
  visszaeséssel) és egy ChipGroup-ja az Egyéb tabon, a nyelv-kapcsoló
  alatt, ugyanazzal az explicit Mentés/Mégse modellel. A `blankPlan.ts` a
  korábbi hardkódolt HUF helyett ezt a mezőt olvassa, öröklés híján —
  meglévő pácienshez induló új lánc továbbra is a legutóbb véglegesített
  terv pénznemét örökli. Részletek: `docs/02-domain-modell.md` §
  `beallitasok.json`, `docs/03-funkcionalis-spec.md` § "Egyéb".

### 86. tétel: Nyomtatványszöveg-sablonok felülírása + markdown-bővítés — KÉSZ

- **Méret:** kicsi-közepes — négy forrásfájl
  (`storage/DemoStorage.ts`, `storage/PlanStorage.ts`,
  `pdf/markdownLite.ts`, `pdf/TervDocument.tsx`) és a Nyomtatványok tab
  súgószövege, kísérő tesztekkel.
- **Megvalósítás:** a Beállítások → Nyomtatványok sablon-mentése a
  korábbi, minden mentésnél új `-vN.md` fájlt létrehozó viselkedésről a
  jelenlegi legfrissebb fájl felülírására tért át — a fájlnév a szöveg
  létrehozásakor rögzül, egy korábbi szövegváltozatnak nincs másik
  forrása, mint egy már véglegesített terv mentett PDF-je. A
  placeholder-jelölésű seed-sablon (garancia) őrfeltétele emiatt
  szűkült: egy doki által bővített, de a `[PLACEHOLDER` jelölőt
  szándékosan bent hagyó szöveget egy újbóli `init()` többé nem ír felül
  némán. A sablon-markdown emellett két, korábban dokumentált, de nem
  implementált elemmel bővült: `**félkövér**` inline renderelés és
  számozott lista (a nyomtatványon a beírt sorszám látszik, nem 1-től
  újraszámolt). A kézi sortörés-megőrzés bevezetése explicit elmaradt —
  a mai szoft-tördelés (egy bekezdésen belüli Enter szóközzé olvad)
  változatlan. Részletek: `docs/02-domain-modell.md` § "Mappastruktúra",
  `docs/03-funkcionalis-spec.md` § "Nyomtatványok",
  `docs/04-nyomtatvany-spec.md` § "2. blokk — fizetési feltételek és
  garancia", `docs/05-technologia.md` § `PlanStorage`.

### 87. tétel: Üres/whitespace sablon-validáció és hard-block navigáció — KÉSZ

- **Méret:** kicsi — egy domain-modul (`domain/templates.ts`), egy
  checklist-route bővítés (`domain/veglegesitesOr.ts`,
  `pages/previewPage/VeglegesitesChecklist.tsx`), a Beállítások lap
  induló fül-választása (`pages/SettingsPage.tsx`), kísérő tesztekkel.
- **Megvalósítás:** `isPlaceholderTemplate()` mostantól a `[PLACEHOLDER`/
  `[PLATZHALTER` jelölő MELLETT azt is felismeri, ha a sablon törzse a
  markdown-címsor levágása után üres/csak-whitespace — a sablonszerkesztő
  mentéskor mindig kiírja a „# Cím” sort, ezért az ürességet csak a címsor
  UTÁN lehet érdemben mérni. A nyilatkozat véglegesítés-őr checklist-tétele
  (`'nyilatkozat-placeholder'`) mostantól közvetlenül a Beállítások
  Nyomtatványok fülére navigál (`/beallitasok?tab=nyomtatvanyok`), nem csak
  a lap tetejére — a `SettingsPage` a query paramétert kizárólag a kezdeti
  mounton olvassa, nincs param→state szinkron effekt. Részletek:
  `docs/03-funkcionalis-spec.md` § "Sablon-placeholder őr".

### 88. tétel: Tárolás tájékoztató szöveg a DEMO oldalon — KÉSZ

- **Méret:** apró — egy mondat bővítés a DEMO → Adatkezelés fül első
  kártyájában (`pages/demo/AdatkezelesSection.tsx`), kísérő teszttel.
- **Megvalósítás:** a redesign DP-087 tételének leszűkített szelete — a
  `CLAUDE.md` „Két fázisú build” elve miatt a valódi mappa-választás/hard
  gate a 2. fázis (`FileSystemStorage`) hatásköre marad, ide csak egy
  statikus, nem interaktív tájékoztató mondat került: a mockup a böngésző
  `localStorage`-át használja rendszerállapotként, a végleges alkalmazásban
  a doki egyszer kijelöl egy Google Drive-val szinkronizálható
  gyökérmappát. Részletek: `docs/03-funkcionalis-spec.md` § "Fő navigáció
  (D34)".

### 89. tétel: Egyedi végösszeg és előleg pénznemenkénti állapota — KÉSZ

- **Méret:** kicsi-közepes — egy domain-modul bővítése
  (`domain/penznemValtas.ts`, `domain/types.ts`, `domain/piszkozat.ts`) és
  a Terv adatai lap pénznemváltás-kezelése (`pages/PatientPage.tsx`),
  kísérő tesztekkel.
- **Megvalósítás:** a soronkénti pénznemváltás-stash (`Sor.masikPenznemAr`)
  terv-szintű párja: a `Plan.kedvezmenyOsszeg`/`elolegOsszeg` mostantól a
  NEM aktív pénznemben utoljára ismert értékét egy közös
  `Plan.masikPenznemOsszegek` slotban tartja meg, hogy a két érték sose
  csúszhasson szét egymástól. Stash hiányában mindkét mező kikapcsol
  (nincs automatikus HUF↔EUR átváltás), stash meglétekor a korábban
  beállított érték visszaáll. A pénznemváltás-megerősítő dialógus a
  sorokról szóló mondat mellett ezt a hatást is kimondja, és sor nélküli,
  de beállított tervnél is megjelenik. Részletek:
  `docs/02-domain-modell.md` § "Pénznemváltás", § "Előleg", § "Terv-szintű
  egyedi végösszeg"; `docs/03-funkcionalis-spec.md` § 2. "Dokumentum
  nyelve / Pénznem", § "Egyedi végösszeg", § "Előleg (D66)".

### 90. tétel: Másolt terv örökölt szakmai-tartalom jelzései — KÉSZ

- **Méret:** kicsi-közepes — egy új domain-modul
  (`domain/orokoltJelzesek.ts`), a `Sor`/`Fazis` séma két-egy additív
  mezője (`domain/types.ts`), a "Másolás új tervbe" bekötése
  (`domain/planCopy.ts`), a szerkesztő két jelvénye
  (`pages/PlanEditorPage.tsx`), három új véglegesítés-őr checklist-tétel
  (`domain/veglegesitesOr.ts`), kísérő tesztekkel.
- **Megvalósítás:** "Másolás új tervbe" (árlista átadásával) mostantól
  finoman jelzi, mely tartalom maradt szó szerint egy korábbi tervből: egy
  kézzel felülírt ajánlati árú sor "örökölt ár" jelvényt kap
  (`Sor.orokoltKeziAr`), egy már a másoláskor is inaktivált tételre
  hivatkozó sor a meglévő, bármely tervre érvényes soft checklist-tétel
  MELLETT egy hangsúlyosabb, saját tételt is kap (`Sor.orokoltInaktivTetel`),
  egy nem üres fázismegjegyzés pedig "örökölt" jelvényt
  (`Fazis.orokoltMegjegyzes`). A markerek a másolat pillanatában, a
  másolati állapotból újraszámolva íródnak (nem a forrásból átvéve), hogy
  egy korábbi másolat-láncból ittmaradt jelzés sose öröklődjön tovább
  hamisan; a szerkesztő badge-e és a checklist ugyanazt a megosztott
  predikátumot olvassa. Árlista nélküli másoláskor egyik jelzés sem
  keletkezik. Részletek: `docs/02-domain-modell.md` § "Másolat-eredet
  jelzései"; `docs/03-funkcionalis-spec.md` § "Terv másolása új
  tervként", § 3. "Sor mezői", § "Fázisok", § 4. "Előnézet és
  véglegesítés".

### 92. tétel: Tömeges árváltoztatás az árlista adminban — KÉSZ

- **Méret:** közepes — egy új domain-modul (`domain/tomegesAr.ts`, kísérő
  teszttel), egy új dialógus-komponens
  (`pages/priceListAdmin/TomegesArDialog.tsx`), az Árlista admin fejlécsora
  és `keep()`-szűrője (`pages/PriceListAdminPage.tsx`), külön
  teszt-fájlban a lap-szintű végigjátszás.
- **Megvalósítás:** a fejlécsorban egy „Tömeges árváltoztatás" gomb
  dialógust nyit: kör-választó (teljes árlista / egy kategória / a lapon
  éppen szűrt lista), egy kötelező pénznem, irány + pozitív százalék
  (emelésnél 0–100%, csökkentésnél 0–90%), és egy közös kerekítési létra
  (a pénznem alapegységében kifejezve), amin a doki csak felső korlátot
  választ — a ténylegesen használt lépés soronként a nyers változáshoz
  igazodik, hogy a kerekítés sose lője túl nagyságrendekkel a kért
  százalékot. Az élő előnézet-táblázat minden módosítható sort alapból
  kipipálva mutat (opt-out kivétel-jelölés), a `null` ár és a 0-ra
  csökkenő sor sosem kap értéket, a lábléc kihagyás-okonként bontott
  darabszámokat ír ki összegzés nélkül. Egy összesített megerősítés után a
  teljes módosítás EGYETLEN mentésben landol, egyetlen
  `arlistaVerzio`-bélyeggel — a mentett tervek árait a művelet nem
  érinti. Részletek: `docs/03-funkcionalis-spec.md` § 6. Kezelések és
  árak "Tömeges árváltoztatás"; `docs/07-felulet-rendszer.md` §
  Komponensek (a checkbox-listás dialógus fordított alapállapota és
  annak indoka).

### 93. tétel: A legnagyobb komponensfájlok felbontása — KÉSZ

- **Méret:** nagy — három fájl felbontása, mindegyik kiemelés + tesztbontás
  lépésben: `pages/PlanEditorPage.tsx` (2249 → ~640 sor, hét új
  komponensfájl a `pages/planEditor/` alatt, plusz két új domain-modul),
  `pages/PriceListAdminPage.tsx` (1476 → ~840 sor, három új fájl a
  `pages/priceListAdmin/` alatt, plusz egy új domain-modul),
  `pdf/TervDocument.tsx` (751 → ~280 sor, négy új fájl a
  `pdf/tervDocument/` alatt).
- **Megvalósítás:** viselkedésmegőrző kiemelés — a React-állapot
  elrendezése, a hookok sorrendje és a renderelt kimenet (HTML/PDF)
  változatlan maradt; a meglévő tesztfájlok a kiemelő lépésekben mindvégig
  érintetlenek voltak (üres tesztfájl-diff), ez adta a gépi bizonyítékot.
  A fájl-lokális tiszta logika (sor-mezők tétel-/egyedi-alapú felépítése,
  fázis-mozgatás index-matematikája, árlista-szűrés predikátumai)
  domain-modulokba költözött, saját unit tesztekkel; a terv szerkesztő
  DOM-id-jei (korábban négy helyen egymástól függetlenül leírva) egy
  közös helyre kerültek. A tesztfájlok egy része is szétvált: a
  ténylegesen izolált, prop-tiszta komponensek (Egyedi végösszeg/Előleg
  blokk, Mindösszesen sor, a szerkesztő fejléce) saját, önállóan
  renderelt komponensteszteket kaptak, a lapot ténylegesen igénylő
  integrációs leírások pedig egy témás testvér-tesztfájlba. Az Árlista
  admin és a nyomtatvány kiemelt komponensei a meglévő helyi
  tesztkonvenció szerint (ott minden komponens kizárólag a teljes lapon
  keresztül tesztelt, dedikált komponensteszt-fájl nélkül) nem kaptak
  hasonló bontást. Részletek: `docs/05-technologia.md`, `CLAUDE.md`
  "Meglévő segédfüggvények".

### 95. tétel: Egységes piszkozat-felülírás védelem minden „új terv" belépési ponton — KÉSZ

- **Méret:** közepes — egy meglévő megosztott réteg bővítése három hívóhelyen.
- **Megvalósítás:** a `domain/planVersionActions.ts` `PendingKind`-ja egy
  negyedik, `'ujPaciens'` taggel bővült, a `components/PlanVersionActionDialog.tsx`
  `usePlanVersionActions` hookja pedig opciós argumentumra állt
  (`patientDir?`/`onUjPaciens?`), egy `futtat()` (a megerősítés
  megkerülésével, kizárólag már megerősített útra) és egy `fut`
  (az épp futó akció, soronkénti letiltáshoz) mezővel. A
  `pages/NewPlanPage.tsx` párhuzamos, saját `AlertDialog`-os védelme
  teljesen elbontva a hook javára; a `pages/PatientDetailPage.tsx` terv
  nélküli páciens üres-állapotának „+ Új terv" gombja (korábban
  megerősítés NÉLKÜL hívta a `copyPlanIntoDraft`-ot) most a hookon
  keresztül fut. Mind a négy belépési pont (verziósor, Terv részletei,
  köztes választó, üres állapot) egyetlen szövegtáblát és feltételt
  oszt meg. Részletek: `docs/03-funkcionalis-spec.md` § 5. „A négy
  terv-létrehozási út" és „Új terv indítása", § 10. „Kezelési tervek
  tab"; `CLAUDE.md` "Sérthetetlen szabályok" és "Meglévő
  segédfüggvények".

### 94. tétel: Másolás új tervbe — páciens-identitás védőháló — KÉSZ

- **Méret:** közepes — egy új domain-modul + egy önmagát betöltő React
  Context, három meglévő felület bekötve.
- **Megvalósítás:** a `domain/paciensKotes.ts` egy tiszta függvénnyel
  (a meglévő névegyezés-detektálást újrahasznosítva) dönti el, melyik
  páciensmappához köti a piszkozatot, és pontosan mely MÁSIK páciens neve
  ütközik a Terv adatai lap Név mezőjével. A `components/
  PaciensKotesContext.tsx` a `TervWorkflowShell.tsx` alatt mindenhol
  elérhetővé teszi ezt: a Terv adatai lapon mindig látszik a kötött
  páciensmappa (Név mezőtől függetlenül), ütközésnél piros figyelmeztetés
  jelenik meg (váltás-akció nélkül), a „Páciens törzsadata" mindhárom
  piszkozat → törzsadat írási útja letiltott, a breadcrumb felirata a
  kötött mappa tárolt nevét mutatja (nem a szerkeszthető Név mezőt), és a
  véglegesítés-őr egy önálló, kemény checklist-tétellel blokkol, amíg az
  ütközés fennáll — a meglévő, ÁLTALÁNOS „Páciens törzsadata eltér"
  info-tétel változatlan maradt mellette. Részletek:
  `docs/03-funkcionalis-spec.md` § 2. „Páciens adatai" „Páciens-identitás
  védőháló" bekezdés, § 4. „Véglegesítési checklist", § „Terv-workflow
  héj"; `CLAUDE.md` "Sérthetetlen szabályok" és "Meglévő
  segédfüggvények".

### 96. tétel: Elgépelés-védelem az árlista árainál — KÉSZ

- **Méret:** kicsi-közepes — egy új domain-modul + egy meglévő komponens
  bővítése.
- **Megvalósítás:** két, egymást kiegészítő puha detektor
  (`domain/arElgepeles.ts`): a relatív (a sor kinyitásakori, ár-slotonként
  rögzített baseline-hoz képest legalább ötszörös/ötödrészes ugrás) és az
  abszolút (az árlista többi aktív tételének csúcsárához képest
  háromszoros, önkalibráló referencia). Az `ItemEditor` mind a hat
  ár-mező alatt megjeleníti a jelzést egy „Visszaállítás" akcióval, ami a
  baseline-ra írja vissza az érintett slotot; a Tömeges árváltoztatás a
  nyitva maradt sor baseline-ját a művelet után újrarögzíti, jelzés
  nélkül. Sem a jelzés, sem a baseline nem kerül a `Tetel` sémába — a sor
  bezárásával nyomtalanul elvész. Részletek:
  `docs/03-funkcionalis-spec.md` § 6. „Sor kinyitása" „Elgépelés-védelem
  az ár-mezőkön"; `CLAUDE.md` "Meglévő segédfüggvények".

### 97. tétel: Kategórianévre is találjon a kezelés-kereső — KÉSZ

- **Méret:** kicsi-közepes — egy közös domain-függvény + két meglévő
  keresési predikátum bővítése, plusz plumbing az `ItemPicker` három
  hívási szintjén.
- **Megvalósítás:** a `domain/search.ts` `egyezoKategoriaIdk()` a meglévő
  `nevEgyezik()`-re épülve adja az egyező kategória-id-k halmazát, egyszer
  a tétel-ciklus előtt. Az `arlistaSzures.ts` `tetelIlleszkedik()`/
  `tetelMegtartando()` ezt kapja negyedik paraméterként, így az Árlista
  admin szűrője (és vele a Tömeges árváltoztatás köre) is a kategórianévre
  is talál, külön UI nélkül. A szerkesztő `ItemPicker`-je egy `catName`
  callback helyett a teljes `kategoriak` tömböt kapja, és a találatokat két
  szintre bontja: a mai névtalálatok, utána a csak kategórianéven át
  egyező tételek `Kategória: …` fejléc alatt — közös 12-es limittel, a
  névtalálatok elsőbbségével, az Enter célpontja pedig változatlanul az
  első névtalálat marad. Részletek: `docs/03-funkcionalis-spec.md` §
  Tételkereső és § Keresés és szűrők; `CLAUDE.md` "A UX kritikus pontja"
  és "Meglévő segédfüggvények".

### 98. tétel: Számmezők tartalmának kijelölése fókuszáláskor — KÉSZ

- **Méret:** kicsi — egyetlen komponens egysoros bővítése + 4 új teszteset.
- **Megvalósítás:** a `components/NumberField.tsx` `onFocus`-a a natív
  `select()`-et hívja a fókuszált mezőn, így a teljes tartalom kijelölve
  fogadja a gépelést — a régi érték már nem fűződik a beírt számjegyekhez
  (pl. `24000` mezőbe `28000`-et gépelve a mező `28000`-et mutat, nem
  `2400028000`-et), az `autoFocus`-szal mountolódó mezőknél (árlista fix
  ár, Előleg, Egyedi végösszeg) is már az első fókuszálásnál. A
  `pages/priceListAdmin/BufferedFields.tsx` (tétel név/leírás
  szövegmezők) szándékosan kimarad. Részletek:
  `docs/07-felulet-rendszer.md` § Komponensek.

### 99. tétel: Állapotfüggő gomb-címkék az árlista adminban — KÉSZ

- **Méret:** kicsi — két `aria-label` prop a táblasoron + a tesztfájl
  meglévő lekérdezéseinek átállítása két állapot-agnosztikus helperre,
  plusz 3 új célzott teszteset.
- **Megvalósítás:** a `pages/PriceListAdminPage.tsx` táblasorán a
  „Gyakori tétel" csillag és az „Aktív" szem `IconButton` `aria-label`-je
  a statikus szöveg helyett `<tételnév> <állapotfüggő akció>` alakú lett
  (`<név> megjelölése gyakorinak`/`<név> gyakori jelölés törlése`, `<név>
  aktiválása`/`<név> inaktiválása`) — a szóhasználat a meglévő
  megerősítő dialógusok szótövét követi, a tétel nevének bevonása a
  `docs/07-felulet-rendszer.md` „Soronkénti akciók" sor-azonosítási
  szabályát elégíti ki. Részletek: `docs/03-funkcionalis-spec.md` § 6.
  „Tábla"; `docs/07-felulet-rendszer.md` § Komponensek.

### 100. tétel: „Piszkozat folytatása" csak tényleges szerkesztés után — KÉSZ

- **Méret:** kicsi — egy kötelező paraméter bővítés két produkciós
  hívóhellyel, plusz 4 új teszteset.
- **Megvalósítás:** az `AppStateValue.copyPlanIntoDraft` kapott egy
  kötelező `kiindulas: 'alapallapot' | 'mentetlen-munka'` paramétert, ami
  eldönti, hogy a betett `Plan` a `loadPlanIntoDraft` mintáját követve
  tiszta alapállapotnak számít-e (`mentettPlan` a `next`-tel azonos
  referenciára áll, `vanMentetlenPiszkozat` azonnal hamis), vagy a régi,
  azonnal védett viselkedést kapja. A puszta törzsadat-előtöltés
  (`ujTervForrasPaciensbol` eredménye, `components/PlanVersionActionDialog.tsx`
  `ujTervPaciensAdataival`) mostantól `'alapallapot'`-tal hív — ez fedi le
  mindhárom belépési pontot („Meglévő páciens keresése…”, „Első terv
  indítása”, terv-lánc fa „Új terv”), mert mindhárom a megosztott
  `usePlanVersionActions` hookon fut. A teljes terv-másolat
  (`planMasolatKent`, „Másolás új tervbe”) VÁLTOZATLANUL azonnal védett
  marad. Az autosave-írás (`piszkozatTartalmas()`) mindkét ágon egyformán
  fut, a crash-recovery nem gyengült. Részletek:
  `docs/03-funkcionalis-spec.md` § Autosave; `CLAUDE.md` "Meglévő
  segédfüggvények".

### 101. tétel: Véglegesítés-őr — puha figyelmeztetések rangsora és számlálója — KÉSZ

- **Méret:** kicsi — egy tétel-átrendezés a `veglegesitesOr.ts`-ben, egy
  jelvény-renderelő segéd a `VeglegesitesChecklist.tsx`-ben, plusz új és
  módosított tesztek.
- **Megvalósítás:** a `domain/veglegesitesOr.ts` puha (`soft`) csoportja
  a nyomtatvány TARTALMÁT érintő két tétellel (`sablon-kihagyott-szekcio`,
  utána `sablon-fallback`) kezdődik, a maradék hét tétel a mai relatív
  sorrendjében marad mögöttük — a `hard`/`info` csoport belső sorrendje
  változatlan, nincs új severity-szint, nincs új szín. A
  `VeglegesitesChecklist.tsx` mostantól kiolvassa a `tetel.szamlalo`
  mezőt, és a tétel címe mellé egy súlyosság-színű `Badge`-et rendereld
  — ha a tételnek egynél több `reszletek`-alcsoportja van (pl. az
  `ar-elteres` „Elavult árlistai pillanatkép”/„Kézzel felülírt ajánlati
  ár” bontása), alcsoportonként külön jelvény jár, nem egy összegzett,
  duplikációra hajlamos szám; a `reszletek` szöveges soraiból az addigi
  inline `(N):` előtag elmaradt. Részletek:
  `docs/03-funkcionalis-spec.md` § „Véglegesítési checklist”; `CLAUDE.md`
  "Meglévő segédfüggvények".

### 102. tétel: Fogtérkép billentyűzetes fókuszjelzőjének kontrasztja — KÉSZ

- **Méret:** kicsi — a `design/toothChartSvg.ts` kurzor-CSS-e és
  markup-injektálása, egy wrapper-class a `components/DentalChart.tsx`-ben,
  plusz új tesztek és a böngészős checklist kiterjesztése.
- **Megvalósítás:** a billentyűzetes kurzor (`is-active`) és a kijelölés
  (`is-picked`) korábban ugyanazt a `.tooth-fill` stroke-ot versengve
  használta, ezért egyszerre aktív és kijelölt fogon a kijelölés teljesen
  elnyomta a kurzort, és a viewBox-egységben megadott vonalvastagság a
  megjelenítéskor (340/480 px) szubpixelre zsugorodott. A kurzor mostantól
  két külön, a fókuszált fog `.tooth-fill` path-jai ELÉ injektált réteg
  (fehér kontraszt + ink, `vector-effect:non-scaling-stroke`), a kijelölés
  pedig a `.tooth-fill` saját stroke-ja marad — egy egyszerre aktív és
  kijelölt fogon mindkettő koncentrikus gyűrűként, egymást nem takarva
  látszik. A kurzor csak a fogtérkép wrapperének billentyűzet-fókuszában
  (`:focus-visible`) jelenik meg, a wrapper pedig a Radix-kontrollokéval
  egyező `--focus-8` fókuszgyűrűt kapja. A vizuális igazolás a
  `.claude/skills/browser-validation/` menetéhez tartozik (mértékek,
  kontraszt), a vitest-készlet a markup-szintű állításokat őrzi. Részletek:
  `docs/07-felulet-rendszer.md` § Szín, forma, sűrűség és § Billentyűzet;
  `docs/03-funkcionalis-spec.md` § Fogtérkép (kattintható).

### 103. tétel: Demó-eredetű, PDF nélküli verziók üzenete — KÉSZ

- **Méret:** kicsi — egy statikus seed-eredet predikátum, egy demó-only
  storage-mező, a "nincs mentett PDF" üzenet két hangnemre bontása, és a
  három érintett felület (Terv részletei panel + gombok, terv-lánc fa
  `⋯` menüje) megosztott hibacsatornájának súlyosság-jelzése.
- **Megvalósítás:** a demó-seed sosem ír PDF-bájtot egyik verzióhoz sem,
  ezért egy tiszta predikátum eldönti, hogy egy adott
  patientDir/planDir/versionDir hármas a beépített demó-készletből
  származik-e — nem kerül új mező a `terv.json` sémájába. Seed-eredetű,
  hiányzó PDF-nél egy semleges, információs szöveg jelenik meg ("a demó-
  adatkészletből származik"), valódi (saját mentésű) hiánynál egy
  figyelmeztető szöveg; mindkét esetben a "Megnyitás külön"/"Letöltés"
  letiltott, betöltési HIBÁNÁL viszont változatlanul kattintható marad.
  Részletek: `docs/03-funkcionalis-spec.md` § 11 "Mentett PDF"; `CLAUDE.md`
  "Meglévő segédfüggvények".
