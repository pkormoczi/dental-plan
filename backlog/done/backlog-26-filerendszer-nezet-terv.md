# Backlog 26. tétel — Filerendszer nézet (mockup fájlfa-vizualizáció) — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 26. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `docs/02-domain-modell.md` "Mappastruktúra" szakasza leírja, mit fog a
végleges (2. fázisú, `FileSystemStorage`-alapú) alkalmazás a doki
gyökérmappájába írni — de ez ma csak dokumentáció. A mockup-fázisban
(`DemoStorage`, `localStorage`) a doki és a fejlesztő számára ez a
struktúra láthatatlan: nincs mód rá, hogy egy pillantással lássák, mit hol
tárolna az app, milyen néven, és pontosan milyen tartalommal — miközben ez
pont a két fázisos build (`CLAUDE.md` "Két fázisú build") lényegi
kockázata: hogy a doki csak akkor szembesül a végleges mappa/fájl-modellel,
amikor az már éles. A `DemoStorage.ts` szándékosan **már ma is** a
`docs/02` mappastruktúráját tükröző kulcsneveket használ a
`localStorage`-ban (lásd a fájl fejléckommentje) — ez a tétel nem hoz létre
új adatforrást, csak megjeleníti a már meglévőt.

## Döntések

### 1. Hatókör és tartósság: demó-only escape hatch, nem `PlanStorage`-bővítés

Az oldal adatforrása a `StorageContext`-en egy új, demó-only mezőn
keresztül érhető el — pontosan úgy, ahogy a meglévő
`resetDemoData`/`clearAll`/`loadPlanPdf`/`loadLatestTemplateByBase` mezők
sem a `PlanStorage` interfész részei (`StorageContext.tsx` fejléckommentje
ezt már ma is explicit dokumentálja). Ez a mező a `DemoStorage` nyers `dp:`
`localStorage`-kulcsait sétálja be és alakítja fává; a `FileSystemStorage`
2. fázisú bevezetésekor ez a mező egyszerűen megszűnik/kikerül, mert a doki
onnantól a valódi Fájlkezelőt használja — nincs kényszer, hogy ez a
képernyő (vagy bármi hasonló) a végleges alkalmazásban is létezzen.

**Miért:** Az elvetett alternatíva egy formális `PlanStorage`-bővítés
(pl. `listAllFiles()` az interfészen) lett volna, ami ezt a nézetet tartós,
a `FileSystemStorage`-nak is implementálandó funkcióvá tenné. Ez sértené a
"Két fázisú build" szellemét (`CLAUDE.md`: "A `PlanStorage`-on kívül eső
kód... változatlan marad — ezért ne kerülje meg senki az interfészt" —
itt épp fordítva: ne HÚZZUNK be az interfészbe egy funkciót, aminek nincs
helye a végleges appban, csak mert a mockupban hasznos). A doki a végleges
asztali alkalmazásban a valódi Fájlkezelőt fogja használni erre a célra.

### 2. A fa hatóköre: teljes gyökérmappa, a piszkozat kizárva

A fa a `docs/02` teljes mappastruktúráját tükrözi: `beallitasok.json`,
`arlista.json`, `sablonok/*.md` ÉS `paciensek/` mind látszik, nem csak a
páciensrész.

**Kizárás:** a `dp:piszkozat` kulcs (a `DraftStorage`/`DemoDraftStorage`
autosave-cache-e) **soha nem jelenik meg a fában** — ez a kulcs ugyan a
`PREFIX`-et örökli (lásd `DemoDraftStorage.ts` fejléckomment), de nem felel
meg semmilyen valós fájlnak a végleges architektúrában (a piszkozat ott
IndexedDB, nem fájl, `docs/05-technologia.md` § Piszkozat-autosave). A fa
egy hűséges vetülete legyen a `PlanStorage`-nak, nem a nyers
`localStorage`-nak.

**Miért:** Az elvetett alternatíva a "csak `paciensek/`" hatókör lett
volna — ez olcsóbb, de nem teljesítené a kérést ("látszik az alkalmazás
folder és file struktúrája", nem csak a páciensrész), és elrejtené pont azt
a részt (sablonok verziózása, árlista-fájl), ami a doki számára a
legkevésbé magától értetődő a `docs/02`-ből.

### 3. Interakció: csak nézegetés (read-only)

Az oldalon nincs törlés, átnevezés vagy bármilyen írási művelet a fáról
közvetlenül. A meglévő törlési/kezelési útvonalak (pl. Korábbi tervek)
változatlanok; ez az oldal kizárólag megmutatja, mi van ott.

**Miért:** A felvetés "nézegető felület"-ként ("Kvázi kis filerendszer
nézegető felület") fogalmazta meg az igényt. Az elvetett alternatíva
(törlés is a fáról) új, a D4-gyel (verziómappát soha nem írunk felül/nem
törlünk csendben) összefüggő megerősítő-UI-t nyitna, jelentősen növelve a
tétel méretét egy olyan funkcióért, amit a kérés nem igényelt.

### 4. Adatforrás frissítése: mount-időben olvas, nincs cross-tab élő szinkron

A fa a `localStorage`-ból mount-időkor (route-váltáskor, ami a `HashRouter`
alatt a lapkomponens újramountolását jelenti) olvas újra. Nincs
`storage`-esemény-figyelő a lapok közötti élő szinkronhoz.

**Miért:** A "ha valamit mentek, megjelenik" igényt ez a minta már lefedi
— a doki egy másik oldalon ment, majd a Filerendszer oldalra navigál, ahol
friss olvasás történik. Egy `storage`-esemény-alapú, fülek közötti élő
frissítés technikailag lehetséges lenne, de ez a mockup (és a végleges
`DraftStorage`, lásd `docs/05` "Egyetlen `dp:piszkozat` kulcs... last-write-
wins, ütközésfeloldás nélkül. Elfogadott kockázat") már ma is egy-felhasználós,
egy-fület feltételez — a plusz komplexitás nem indokolt.

### 5. Tartalom-megjelenítés fájltípusonként

Egy fájlra kattintva a tényleges, ténylegesen tárolt tartalom jelenik meg:

- **JSON fájlok** (`arlista.json`, `beallitasok.json`, `paciens.json`,
  `terv-cimke.json`, `terv.json`): pretty-printelt (behúzott) nyers JSON,
  monospace szedéssel.
- **Markdown sablonok** (`sablonok/*.md`): nyers szöveg, monospace
  szedéssel — beleértve a `[PLACEHOLDER`/`[PLATZHALTER` jelölőket is, ha
  vannak.
- **PDF** (`kezelesi-terv.pdf`): a ténylegesen elmentett PDF-bájtokból
  (`loadPlanPdf`, a `StorageContext`-en már ma is elérhető mezőn keresztül)
  blob-URL, megnyitás új böngészőfülön egy gombbal/linkkel — nincs
  beágyazott PDF-előnézet ezen az oldalon.

**Miért:** Az elvetett alternatíva a PDF-nél egy "itt egy PDF lenne"
jelzés lett volna, tartalom nélkül — ez a legérdekesebb részt (a valóban
legenerált dokumentum) hagyná ki, miközben a bájtok már ma is elérhetők a
`loadPlanPdf`-en át.

### 6. A `pdf` kulcs megjelenítési névleképzése

A `DemoStorage.pdfKey()` a tárolt kulcsot kiterjesztés nélkül, `.../pdf`
alakban zárja (nem `.../kezelesi-terv.pdf` — ez a mai kód egy apró,
ártalmatlan inkonzisztencia a `docs/02`-ben dokumentált végleges fájlnévhez
képest). A fa-építő logika ezt a szegmenst **megjelenítéskor**
`kezelesi-terv.pdf`-re képezi le — a mögöttes `localStorage`-kulcs literál
változatlan marad, ez tisztán megjelenítési döntés.

**Miért:** A `docs/02` mappastruktúra-ábrája (és a felhasználói elvárás:
"milyen néven") a `kezelesi-terv.pdf` nevet dokumentálja mint a végleges
fájlnevet — a nézetnek ezt kell mutatnia, nem a mockup belső kulcs-literálját.
A kulcs tényleges átnevezése a `DemoStorage`-ban ezen a tételen kívül esik
(lásd "Kapcsolódó, de NEM tartozó" lent).

### 7. Illusztratív gyökérútvonal-fejléc + keret-magyarázó szöveg

A fa fölött egy statikus, nem szerkeszthető fejléc-sor jelzi, hogy ez a
nézet a végleges asztali alkalmazásban a doki által kijelölt valódi
gyökérmappát (`docs/05-technologia.md` "Kezdd a File System Access API-val")
mutatná — plusz 1-2 mondat a lap tetején, ami elhelyezi ezt a képernyőt a
két fázisos build kontextusában.

**Miért:** Tisztán dekoratív/kontextus-adó elem, nem funkcionális — a cél,
hogy a doki és a fejlesztő ne tévessze össze ezt "a valódi jelenlegi
fájlrendszerrel", hanem lássa, hogy ez egy előrevetített modell.

### 8. Nincs extra metaadat-oszlop (dátum, méret)

A fa csak nevet + típust (mappa/fájl) mutat; tartalom kattintásra. Nincs
külön "módosítva" vagy "méret" oszlop.

**Miért:** A dátum már ma is benne van ott, ahol releváns (a verziómappa
nevében, `2026-08-05_v1`, vagy a JSON `keltezes`/`modositva` mezőjében) —
egy külön oszlop csak duplikálná ezt, miközben a mockupban a `localStorage`
írás pillanata nem tárolódik külön adatként, tehát egy ilyen oszlop nem
valódi adatot, hanem szimulációt mutatna. Ez a 20%-os verzió.

### 9. Fa-komponens minta: `ToothChartPanel`-diszklózúra, nem WAI-ARIA treeview

A mappa-csomópontok a `ToothChartPanel.tsx`-ben már bevált mintát követik:
`useState` boolean + feltételes render (nem CSS-elrejtés) + Radix `Button`
trigger `aria-expanded`/`aria-controls`-szal + chevron ikon
(`ChevronRightIcon`/`ChevronDownIcon`), animáció nélkül — rekurzívan
alkalmazva minden mappaszintre. A fájl-csomópontok egyszerű `Button`ök,
amik kiválasztják a fájlt a tartalom-panelhez. A bejárás Tab/Shift-Tab-bal
történik (docs/07 "Billentyűzet": "Ha valahol elakad a Tab-sorrend, az
hiba" — csukott mappa gyermekei feltételes renderrel teljesen kiesnek a
Tab-sorrendből).

**Miért:** Az elvetett alternatíva egy teljes WAI-ARIA `role="tree"`
treeview widget lett volna (roving `tabindex`, nyíl-billentyűs mozgás,
`aria-level`/`aria-setsize`) — ez a fogtérkép kattintható módjának
kivétele (docs/07: "a fogtérkép... EGY Tab-megállóként érhető el... a fogak
közti mozgás nyilakkal") mintájára tűnhetne indokoltnak, de ott a kivétel
oka a 32 azonos szintű, sűrűn elhelyezett elem — itt a fa jóval ritkább és
mélyebb, a sima Tab-bejárás nem árasztja el a Tab-sorrendet, és a
projektben nincs precedens egy teljes treeview-widgetre. A `ToothChartPanel`
mintája már bizonyítottan megfelel a docs/07 billentyűzet-szabályainak.

### 10. Alapértelmezett nyitottsági állapot

A gyökér és az első szint (`sablonok/`, `paciensek/`, plusz a gyökér
JSON-fájljai) alapból látszik/nyitva van. A `paciensek/` alatti egyes
páciensmappák (és az alattuk lévő terv-/verziómappák) csukva indulnak,
kattintásra nyílnak.

**Miért:** A cél, hogy első pillantásra látszódjon a struktúra váza, de a
lista ne váljon áttekinthetetlenné, ahogy a páciensek/tervek száma nő idővel
— ugyanaz az elv, mint a `ToothChartPanel` alapból csukott állapotánál.

### 11. Üres állapot

Ha a doki a Kezdőlapon "Minden adat törlése" gombot használta, a gyökér
(szinte) üresen áll — a Filerendszer oldal ilyenkor egy `docs/07`
"Kötelező állapotok" szerinti empty-state üzenetet mutat ("Nincs adat — a
tároló ki lett ürítve" jellegű szöveg), nem üres fát hibaüzenet nélkül és
nem összeomlást.

**Miért:** `docs/07-felulet-rendszer.md` "Kötelező állapotok": "Minden
nézetnek van loading, empty és error állapota" — ez nem opcionális.

### 12. Route és navigáció

Új route: `/filerendszer` (a projekt meglévő ékezet nélküli
route-konvenciója szerint, `/paciens`, `/arlista`, `/beallitasok`
mintájára). NavBar-link "Filerendszer" címkével, a "Beállítások" után, a
lista végén.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Törlés/átnevezés/bármilyen írás a fáról** — az oldal kizárólag olvas
  (3. döntés).
- **Formális `PlanStorage`-bővítés vagy `FileSystemStorage`-kompatibilis
  fa-lista API** — tudatosan demó-only marad (1. döntés); ha a végleges
  alkalmazásban mégis felmerül az igény egy beépített fájlböngészőre, az
  egy önálló, a `FileSystemStorage`-fázis kontextusában újratárgyalandó
  tétel.
- **Keresés/szűrés a fában** — nem volt rá igény a felvetésben, és sok
  páciens esetén később külön mérlegelendő, ha ténylegesen zavaróvá válik.
- **Dátum-/méretoszlopok** — lásd 8. döntés.
- **A File System Access API tényleges kipróbálása** — az a
  `docs/05-technologia.md` szerinti 2. fázis feladata, nem ez a tétel (ez
  a tétel változatlanul a `localStorage`-os mockupon dolgozik).
- **A `pdf` kulcs tényleges átnevezése/kiterjesztése a `DemoStorage`-ban**
  — csak megjelenítés-szinten oldódik meg (6. döntés), a mögöttes kulcs
  literál változatlan marad, nincs ok migrálni egy kulcsnevet pusztán a
  megjelenítés kedvéért.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/App.tsx` — új `/filerendszer` route.
- `app/src/components/NavBar.tsx` — új nav-link a "Beállítások" után.
- `app/src/storage/StorageContext.tsx` — új demó-only mező a
  `StorageContextValue`-n, a meglévő `resetDemoData`/`clearAll`/
  `loadPlanPdf` mintájára.
- `app/src/storage/DemoStorage.ts` — a `dp:` kulcsok fává alakítása
  (a `dp:piszkozat` kizárásával, a `pdf` szegmens megjelenítési
  névleképzésével).
- `app/src/pages/` — új oldal-komponens; a rekurzív fa-csomópont
  valószínűleg önálló komponensként a `components/` alatt (a
  `ToothChartPanel` mintájára), de ez az implementáló döntése.
- `app/src/storage/DemoStorage.test.ts` — a fa-építő logika tesztje.
- Új `*Page.test.tsx` a lap alapvető render/interakció-lefedettségéhez.

## Tesztelés (irányadó, nem kimerítő)

- Friss demó-állapotban a teljes seed-fa látszik: gyökér JSON-fájlok, a 6
  seed sablon, a seed páciensek a `paciensek/` alatt.
- Egy új terv mentése után (Páciens → Terv szerkesztő → Előnézet →
  Véglegesítés és mentés) a Filerendszer oldalra navigálva megjelenik az
  új páciensmappa/tervmappa/verziómappa.
- Egy JSON fájlra kattintva a ténylegesen mentett tartalom (pl.
  `nevSnapshot`, `osszesitok`) pretty-printelve látszik.
- A `kezelesi-terv.pdf`-re kattintva a ténylegesen legenerált PDF nyílik
  meg új lapon, nem placeholder.
- Egy sablon `.md` fájlra kattintva nyers szöveg látszik, a garancia-
  sablonnál a `[PLACEHOLDER` jelölővel.
- A Beállításokban egy sablon mentése után a régi ÉS az új verziójú `.md`
  fájl is látszik a `sablonok/` alatt (D4-szellem: append-only).
- Az Árlista adminban egy tétel szerkesztése után az `arlista.json`
  tartalma frissen tükrözi a változást.
- "Minden adat törlése" után a Filerendszer oldal empty-state-et mutat,
  nem összeomlást.
- "Demó adat visszaállítása" után a fa visszaáll a seed alakra.
- Tab/Shift+Tab bejárja a teljes fát Tab-csapda nélkül, minden fókuszált
  elemen látható fókuszgyűrű van.
- A `dp:piszkozat` kulcs SOHA nem jelenik meg a fában, még akkor sem, ha
  van aktív, mentetlen piszkozat.
