# Backlog

A `docs/01` lezárt, történeti `D<szám>` döntéstáblája és a `CLAUDE.md`
„Sérthetetlen szabályok" táblája egyik tételt sem sértik — ahol ez nem
nyilvánvaló, a tétel maga jelzi, melyik korábbi döntéssel fut össze. Új
tétel nem hoz létre és nem hivatkozik új D-számra.

**Számozás:** a tételek sorszáma stabil azonosító, nem prioritás. Lezárt
tétel száma véglegesen nyugdíjazva, soha nem osztható ki újra — az új tételek a sorozatot onnan folytatják,
ahol a legutóbb kiosztott szám állt.

**Sorrend:** a listákon belül hasznosság szerint — a napi fájdalom
mérete × gyakorisága, holtversenynél a kisebb munka előre. 

---
## KIDOLGOZOTT

### 81. tétel — PDF fizetési feltételek és garancia
  (a `backlog/redesign/` redesign-döntéssorozat DP-075 tétele) — a
  `Plan.sablonVerzio` mező törlődik a sémából (C7/D595–D596): a mezőt
  ma semmi nem olvassa vissza történeti célra, a mentett final PDF a
  történeti forrás, nem egy JSON-ba pinnelt sablonazonosító. A
  vizsgálat során talált, a redesign-től független rés is itt záródik:
  a placeholder-ellenőrzés (`isPlaceholderTemplate`) ma csak a
  cross-language HU-visszaesésnél fut — egy magyar terven a még
  placeholder-jelölésű garancia-szöveg szó szerint rákerülne a PDF-re;
  az ellenőrzés kiterjed a terv saját nyelvére is, placeholder esetén a
  teljes szekció kimarad címmel együtt (D581). A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-81-pdf-fizetesi-garancia-terv.md`

### 82. tétel — PDF nyilatkozat és aláírásblokk
  (a `backlog/redesign/` redesign-döntéssorozat DP-076 tétele) — a
  `Plan.csakAjanlat` mezőre állás már megvan (`docs/02-domain-modell.md`
  § Csak ajánlat mód, D75), ez a MEGLÉVŐ `offerOnly` prop forrását
  cseréli React state-ről a mentett mezőre, a PDF-oldali logikát
  (`{!offerOnly && ...}`) változatlanul hagyva. Az aláírásblokk AS-IS
  elrendezése, a nyilatkozat folytatólagos
  „– folytatás" címe (D587, a react-pdf `subPageNumber`-ével — az
  EGYETLEN hely, ahol a 76. tétel elvetett folytatólagos-cím mechanizmusa
  mégis natívan megvalósul), és egy új árva-védelem az utolsó bekezdés és
  az aláírásblokk között (D584) kerül be. A döntéseket lásd a
  tervdokumentumban.
  **Terv:** `backlog/plans/backlog-82-pdf-nyilatkozat-alairas-terv.md`

### 83. tétel — Kezeléslista/editor: aktiválási modell és deaktiválás megerősítése
  (a `backlog/redesign/` redesign-döntéssorozat DP-080 tétele) — a
  jelenlegi, `docs/03`-ban dokumentált azonnali-aktiválás (Új tétel
  dialógus után a tétel rögtön `aktiv: true`, 0 Ft-tal) helyett a
  redesign D127–D131 óvatosabb modelljére tér át: a tétel kezdetben
  inaktívként jön létre, és csak a HUF ár mező első commitja aktiválja
  (automatikusan, ha >0; explicit megerősítéssel, ha 0 marad) — az
  „még soha nem aktivált” állapot tranziens, nincs séma-bővítés. A
  deaktiválás (aktív→inaktív) mostantól megerősítést kér (D124), a
  reaktiválás marad azonnali. Új, puha D113 véglegesítés-figyelmeztetés
  a deaktivált tételre hivatkozó sorokhoz, a MÁR meglévő (67. tétel)
  egységes checklistbe kötve. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-83-kezeleslista-aktivalas-terv.md`

### 84. tétel — Kategóriakezelés: mentési modell és hiányzó német név jelzése
  (a `backlog/redesign/` redesign-döntéssorozat DP-081 tétele) — a
  kategória-attribútumszerkesztés (név, szín, sorrend) a ma
  dokumentált „az Árlista admin marad autosave” elvtől eltérve (D49)
  explicit Mentés/Mégse + dirty guardra vált (D52) — a kategória
  létrehozása/törlése marad azonnali. A panel bekapcsolódik a D46
  `NavGuardContext`-be. A lecsukott kategória-sor is kap egy „nincs DE
  név” jelvényt (D405), ugyanúgy mint a tétel-táblázat. A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-84-kategoriakezeles-terv.md`

### 85. tétel — Alapértelmezett dokumentum-pénznem
  (a `backlog/redesign/` redesign-döntéssorozat DP-084 tétele) — a
  nyelv-defaultnak már ma is van Settings-mezője és UI-ja (feltétel
  nélkül, engedélyező gate nélkül), de a pénznemnek nincs: a
  `blankPlan.ts` ma hardkódoltan mindig HUF-fal indít egy
  vadonatúj láncot. Ez a tétel egy új, konfigurálható
  `Settings.alapertelmezettPenznem` mezőt vezet be (alapérték HUF), az
  Egyéb tabon egy ChipGroup-pal a nyelv-default mellett. A döntéseket
  lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-85-penznem-default-terv.md`

### 86. tétel — Nyomtatványszöveg-sablonok felülírása + markdown-bővítés
  (a `backlog/redesign/` redesign-döntéssorozat DP-085 tétele) — a
  C7/D573 szerint a sablon-mentés a ma dokumentált, verziózó
  (`DemoStorage.saveTemplate()` minden mentésnél új `-vN.md` fájlt hoz
  létre) viselkedésről felülírásra vált: a mentés a jelenlegi
  legfrissebb fájlt írja felül, a történeti igazság innentől
  kizárólag a mentett PDF (C9). A markdown-alrendszer
  (`pdf/markdownLite.ts`) kiegészül félkövér (`**szöveg**`) inline
  rendereléssel és számozott listával (D588) — a kézi
  sortörés-megőrzés (D590/D591) explicit ELVETVE, marad a mai
  szoft-tördelés. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-86-sablon-felulirasa-markdown-terv.md`

### 87. tétel — Üres/whitespace sablon-validáció és hard-block navigáció
  (a `backlog/redesign/` redesign-döntéssorozat DP-086 tétele) — az
  `isPlaceholderTemplate()` ma csak a `[PLACEHOLDER`/`[PLATZHALTER`
  jelölőt ismeri fel, üres/csak-whitespace szöveget nem (C8 hiányzó
  fele) — egy törölt nyilatkozat-szöveg ma nem váltaná ki a D23 zárat.
  Ez a tétel kiegészíti a predikátumot, és a nyilatkozat hard-block
  Callout-ja valódi, kattintható linket kap a Beállítások →
  Nyomtatványok tabra. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-87-sablon-ures-placeholder-terv.md`

### 88. tétel — Tárolás tájékoztató szöveg a DEMO oldalon
  (a `backlog/redesign/` redesign-döntéssorozat DP-087 tétele,
  leszűkített hatókörrel) — a forrás eredeti scope-ja (valódi
  mappa-választás, hard startup gate) a `CLAUDE.md` „Két fázisú build”
  elve szerint a 2. fázis (`FileSystemStorage`) hatásköre; ez a tétel
  EHELYETT egy rövid, statikus tájékoztató szöveget vezet be a DEMO →
  Adatkezelés fülre, ami elmagyarázza a mockup `localStorage`-alapú
  tárolását és a végleges alkalmazás mappa-modelljét — nincs
  interaktív elem. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-88-tarolas-tajekoztato-terv.md`

### 89. tétel — Egyedi végösszeg pénznemenkénti állapota
  A 63. tételből (D69, Egyedi végösszeg) levált maradék: a redesign
  D487/D524 döntés szerint az egyedi végösszeg (és a 0-végösszeg
  megerősítése) pénznemenkénti ÖNÁLLÓ állapotot kell tartson, a 62.
  tétel `masikPenznemAr`-stash mintájának analógiájára — ez a 63.
  tételben VÁRAKOZÓ maradt, mert a 62. tétel akkor még nem készült el.
  Nincs önálló tervdokumentum, a 62. tétel elkészülte után `/planning`
  futtatandó hozzá.

### 90. tétel — Másolt terv örökölt szakmai-tartalom jelzései
  A 61. tétel (D70) lezárásakor levált maradék: a 49. tétel (D57) 6.
  döntése az árlista-snapshot alapkőre (a 61. tételre) épült, de csak a
  default-following ár/név/leírás tényleges frissítése (49/2) készült el
  vele együtt. Hátravan még: inaktív (`aktiv: false`) tételre hivatkozó
  másolt sorok erősebb figyelmeztetése, az örökölt kézi ajánlati ár finom
  markere szerkesztésig/resetig, a fázismegjegyzés örökölt-jelzése, és
  ezek összesítése a véglegesítés-őr checklistjében — utóbbi a 67. tétel
  (Finalization validation engine) egységes modelljére vár, mert a
  checklist-infók helye oda tartozik. Terv még nincs hozzá, a `/planning`
  futtatása szükséges implementáció előtt.

### 91. tétel — Előleg megadása százalékban is
  A 64. tétel (D66) az előleget százalékos megadásról abszolút összegre
  váltotta; a doki viszont gyakran arányban állapodik meg a pácienssel
  (30%/50%), és ezt ma fejben kell összegre váltania. A tétel a szerkesztő
  Előleg blokkjába egy összeg/százalék módváltót tesz: százalékos
  megadásnál a beírt arány a Fizetendőből azonnal összeggé konvertálódik
  (felfelé kerekítve a legközelebbi 1000 pénznem-alapegységre), és a
  `Plan`-en változatlanul az abszolút `elolegOsszeg` tárolódik — nincs
  sémaváltozás. Explicit kizárva: a százalék visszahozása tárolt
  igazságként (élő, sorokat követő számítással), a nyomtatvány/sablon/
  séma/véglegesítés-őr bármilyen módosítása, és az Egyedi végösszeg
  százalékos bevitele. A döntéseket lásd a tervdokumentumban.
  **Terv:** `backlog/plans/backlog-91-eloleg-szazalek-bevitel-terv.md`

---
## NEM FEJLESZTÉS

### 24. tétel: Árlista-nap: közös ülés a dokival (adattisztítás és hiányzó szövegek)

**Nem kódtétel — tisztán adattisztítás és információkérés a dokitól.**
Fél nap, egyetlen ülésen begyűjthető, nincs hozzá tervdokumentum:

- a `gyakori` csillagozás (ma mind a 118 tétel `false`) — 8–12 tételt kell
  megjelölni, ezek lesznek a szerkesztő gyorsgombjai
- a két `SAVOS` tétel (`t014` Fogbél megnyitás + gyógyszeres zárás, `t016`
  Gyökértömés csatornaszámtól függően) alsó-határának visszaigazolása —
  az eredeti Excelben `"35-55000"` alakban szerepelt, a sáv alsó határa
  rövidítve; jelenleg a felső határ nagyságrendjéhez igazítva egészült ki
  (`35 000`/`38 000`), ez a doki jóváhagyására vár
- valódi ár-/kategorizálási döntést igénylő tételek: `t072`/`t073`
  „Fémkerámia implantátumra" azonos 95 000 Ft ára (csak a zárójeles
  kiegészítésben térnek el, az egyik valószínűleg felesleges), `t078`
  „Sín" jelenlegi `k10 Korona és hídpótlások` besorolása (valószínűleg
  `k12`-be való), `t064`/`t066` „Zárt/nyitott küret foganként" azonos
  10 000 Ft ára a kvadránsos változatuk eltérése (60 000 vs 85 000 Ft)
  mellett, és a `t054`/`t055`/`t056` (BLX/Straumann implantátumok) eltérő
  névforma (szórend) a három sor közt
- a `k04`/`k05`/`k06`/`k12` fogtérkép-színe (ma mind alap szürke,
  `#adb5bd`) — a kategória-karbantartó panelben egy kattintással
  átszínezhető
- a nyomtatvány garancia-szakaszának magyar szövege — kezeléstípusonkénti
  garanciaidők, kivételek; a `GARANCIA_HU_V1` seed egyelőre
  `[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`, a doki a
  Beállítások → Nyomtatvány szövegei alatt adja meg (a német verzió eddig
  is placeholder maradt volna, most már azért is, mert nincs mit
  AI-fordítani, amíg a magyar forrás maga is helykitöltő)
- a tétel-leírás (docs/02-domain-modell.md § Tétel-leírás) `csomag`-jelöléseinek
  és leírás-szövegeinek begyűjtése — ma egyik 118 tételen sincs kitöltve

---

## KIDOLGOZÁSRA VÁR

1. **Ajánlat-állapot és visszahívás-jelzés.** A páciens kezelési
   terveinek dokumentuméletciklusától (`PISZKOZAT`/`VEGLEGES`)
   függetlenül követhető legyen, hogy egy ajánlat üzletileg hol tart, és
   kit kell visszahívni. A kidolgozásnak kell meghatároznia az állapotokat,
   a lejárat/visszahívás működését és a tárolási modellt; az `allapot.json`
   csak lehetséges megoldás, nem előre rögzített követelmény.

2. **A legnagyobb komponensfájlok felbontása.** A
   `PlanEditorPage.tsx` (2132 sor), a `PriceListAdminPage.tsx` (1116 sor)
   és a `pdf/TervDocument.tsx` (567 sor) felelősségeit jól elkülönülő
   komponensekre, hookokra és tiszta segédfüggvényekre kell bontani. A
   kidolgozás célja viselkedésmegőrző refaktorálás és világos modulhatárok
   kialakítása legyen, ne önmagában a fájlok sorszámának csökkentése.

3. **Betegdokumentáció és EESZT-integráció lehetőségének feltárása.** A
   doktor által jelzett, más fogászati szoftverekben elérhető integráció
   távlati termékbővítés lehet, de a megvalósítás előtt fel kell tárni a
   kívánt rendelői munkafolyamatot, a szükséges adatokat, a hozzáférési és
   megfelelőségi feltételeket, valamint a reális fejlesztési költséget. A
   feltárás eredménye alapján dönthető el, hogy milyen konkrét fejlesztési
   tételekre érdemes bontani.

4. **Kezelési terv egyszeri elküldése e-mailben.** A már elkészült PDF-et
   a tervben rögzített e-mail-cím felhasználásával, kevés lépésben lehessen
   elküldeni a páciensnek. A kidolgozásnak össze kell hasonlítania az
   alapértelmezett levelező előkészítését, a rendszermegosztást és a saját
   levélküldést; utóbbi csak a hitelesítési, adatvédelmi és kézbesítési
   felelősség tisztázásával választható.

5. **Tömeges e-mailes emlékeztetők és automatikus utánkövetés
   feltárása.** A felhasználói visszajelzésben felmerült az esedékes
   kontrollok — például fogkő-eltávolítás — és a közelgő időpontok
   automatikus jelzése. Először az emlékeztetőtípusokat és a szükséges,
   jelenleg hiányzó adatforrásokat kell meghatározni; a későbbi megoldásnak
   az ütemezést, hozzájárulást, leiratkozást, kézbesítési hibákat és a
   küldési infrastruktúrát is kezelnie kell.

6. **Több félretett, később folytatható kezelési terv.** Az egyetlen aktív
   böngészős piszkozat mellett a doktor tartósan is félretehessen több
   megszakított munkát, a meglévő append-only mentési útvonalon,
   `PISZKOZAT` státuszú verzióként. A kidolgozásnak tisztáznia kell a
   listázást és folytatást, a törlést/takarítást, a hiányos sorok
   menthetőségét, valamint azt, hogy a félretett verzióhoz készüljön-e PDF.

7. **Tömeges árváltoztatás az adminban.** Százalékos emeléssel vagy
   csökkentéssel egyszerre lehessen korrigálni több ártételt — például az
   összes EUR-árat 5%-kal —, automatikus árfolyam-szolgáltatás nélkül. A
   kidolgozásnak rendeznie kell a módosítandó kör kiválasztását (teljes
   árlista, kategória, pénznem vagy kijelölt tételek), a kerekítési
   szabályokat, valamint a mentés előtti összesített előnézetet és
   megerősítést.

8. **Sémamigrációs stratégia és keretrendszer kidolgozása.** Meg kell
   határozni, hogyan alakulnak át a rendelő meglévő JSON-fájljai, amikor az
   alkalmazás valamelyik adatsémája megváltozik. A kidolgozás térjen ki a
   fájltípusonkénti, egymásra épülő verziólépésekre, a mentés előtti
   biztonsági másolatra, a validációra és részleges hiba esetén a
   visszaállásra, valamint a régi adatokon futó migrációs tesztekre; az
   első `schemaVersion: 2` bevezetése már ezt a módszert kövesse.

