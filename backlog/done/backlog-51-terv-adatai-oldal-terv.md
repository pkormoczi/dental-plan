# Backlog 51. tétel — Terv adatai oldal layout + cím + dátumok — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 51. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-030
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D26`–`D28`, `D68`–`D69` a redesign saját D1–D606 számozásából valók —
NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Kapcsolódó, korábban nyitott tételek:** a tervcím-mechanizmus alapelvét
(élő javaslat marad, D26 tárolt-cím ötlete elvetve) a 47. tétel
(DP-021) 4. döntése már rögzítette, azzal a megjegyzéssel, hogy a
tényleges szerkeszthető címmező ennek a tételnek a hatóköre — ez a
dokumentum azt a nyitott szálat zárja le.

## Probléma

A workflow-stepper MÁR MA IS „Terv adatai”-nak nevezi ezt a lépést
(`app/src/components/TervWorkflowShell.tsx:19–23`), de maga a lap
(`app/src/pages/PatientPage.tsx:134–136`) még „Páciens adatlap” címet
visel, és a szerkezete nem követi a redesign D68 stacked-section
elvárását (cím → páciens snapshot → dokumentumnyelv → pénznem → orvos →
dátumok):

- **Nincs cím mező.** A `Plan` típuson egyáltalán nincs címmező
  (`domain/types.ts:119–168`). A megjelenített cím kizárólag
  `terv-cimke.json`-ban él, a `PatientPlanChains.tsx:318–344` ceruza-
  ikonján szerkeszthető (`storage.savePlanLabel`) — ez az EGYETLEN
  szerkesztési út ma, és csak egy MÁR LÉTEZŐ (mentett) lánchoz működik,
  mert `savePlanLabel(patientDir, planDir, …)` mindkét azonosítót
  igényli. A mappanév-képzés (`DemoStorage.ts:491–495`,
  `buildPlanDirName(javasoltTervCim(plan, priceList), tervId)`) is az
  ÉLŐ javaslatot hívja, nem egy kézi felülírást.
- **Nincs szerkeszthető dátummező.** `keltezes`/`ervenyesIg` mindig
  automatikusan számolt (`blankPlan.ts:49–50`, majd `frissDatummal`
  minden újranyitáskor), csak OLVASHATÓ a `PlanEditorPage.tsx:312–324`
  tájékoztató sávban (ahol a locale hardkódolt `'hu'`-ra van írva,
  `plan.nyelv`-től függetlenül) és a PDF-en.
- **A mai szerkezet NEM stacked-section**: [nyelv/pénznem kártya,
  feltételes] → [Személyes adatok kártya] → [`TorzsadatSyncCard`] →
  [Tovább gomb]. A D68 elvárt sorrendje (cím, páciens snapshot,
  dokumentumnyelv, pénznem, orvos, dátumok) explicit szekcionálást kér.
- **D69 („snapshot/master eltérés mezőszinten, visszafogottan jelezve”)
  MÁR MA IS teljesül**, csak nem ebben a szerkezetben: a MEGLÉVŐ
  `TorzsadatSyncCard` (40. tétel/D48) egy mezőnkénti diff-számlálót és
  checkboxos szinkron-dialógust ad, a Személyes adatok kártya ALATT,
  önálló kártyaként.
- Orvos mező NINCS a lapon (53. tétel/DP-032 hatóköre — ez a tétel csak
  a section-SLOT-ot foglalja le a helyes sorrendben).

## Döntések

### 1. Fejléc átnevezése „Páciens adatlap” → „Terv adatai”

A lap `<Heading>`-je a stepper MÁR MEGLÉVŐ feliratát követi.

**Miért:** a kettő ma inkonzisztens (a stepper „Terv adatai”-t mutat, a
lap tetején „Páciens adatlap” áll) — ez tiszta elnevezés-egységesítés,
funkcióváltás nélkül.

### 2. Stacked-section sorrend D68 szerint

A lap hat, vizuálisan elkülönített szekcióra tagolódik, ebben a
sorrendben: **Cím** → **Páciens snapshot** (Személyes adatok +
Páciens törzsadata együtt) → **Dokumentumnyelv** → **Pénznem** →
**Orvos** (üres slot, lásd 4. döntés) → **Dátumok**.

**Miért:** D68 explicit ezt a sorrendet kéri; a mai lap ennél
lazábban szervezett (a nyelv/pénznem egy közös kártya, a páciens-adatok
és a törzsadat-szinkron két külön kártya, cím/orvos/dátumok pedig
egyáltalán nincsenek).

**Elvetett alternatíva:** a nyelvet és a pénznemet egy közös
szekcióban tartani (a mai állapot) — elvetve, D68 explicit KÉT külön
szekciót sorol fel; a 52. tétel (DP-031) egyébként is külön-külön
kezeli a két mező zárolási/öröklési szabályait, a vizuális
szétválasztás ezt tükrözi.

### 3. Új, szerkeszthető cím mező — kétféle írási útvonal a lánc állapotától függően

A cím mező MEGLÉVŐ (már mentett, `tervId !== ''`) lánchoz közvetlenül a
MEGLÉVŐ `storage.savePlanLabel`-t hívja — ugyanaz a mechanizmus, mint a
`PatientPlanChains.tsx` ceruza-ikonja, csak egy második belépési
ponttal. Vadonatúj (még sosem mentett) lánchoz a mező lokális UI-
állapot; üresen a `javasoltTervCim()` élő javaslatát mutatja (D27); a
doki által beírt érték a VÉGLEGESÍTÉSKOR, a `storage.savePlan()`
visszatérő `ref`-je után egy második `storage.savePlanLabel()` hívással
kerül ténylegesen kiírásra.

**Miért:** a `terv-cimke.json` mechanizmus (D29, `docs/02-domain-modell.md`)
`patientDir`+`planDir` azonosítót igényel, ami egy még sosem mentett
lánchoz nem létezik — nincs értelme új, párhuzamos perzisztencia-utat
építeni egy MÁR MŰKÖDŐ, jól tesztelt mechanizmus mellé csak azért, mert
az időzítés eltér. A mappanév-képzés (`javasoltTervCim()`-alapú, D29:
„a mappanév a LÉTREHOZÁSKORI címkéből képződik és utána fix marad”)
emiatt VÁLTOZATLAN marad — ez nem új inkonzisztencia: pontosan
ugyanaz történik ma is, ha a doki KÖZVETLENÜL véglegesítés UTÁN írja
át a ceruza-ikonnal a címet, csak itt egy lépéssel korábban
jelentkezik.

**Elvetett alternatíva:** a mappanév-képzést is a kézi címre építeni
(azaz a `doSavePlan`-t bővíteni egy opcionális címfelülírással) —
elvetve; ez a `PlanStorage` interfészt módosítaná egy olyan
funkcióért, amit a D29 mappanév-stabilitási elve amúgy is
másodlagossá tesz (a MEGJELENÍTETT címke a fontos, nem a fizikai
mappanév, ami sosem látszik a dokinak).

### 4. „Páciens snapshot” szekció: meglévő komponensek összevonása, nem újraépítés

A Személyes adatok kártya és a `TorzsadatSyncCard` egy közös,
vizuálisan összefogott „Páciens snapshot” szekcióvá alakul — a két
komponens TARTALMA nem változik, csak a keretezés/csoportosítás. D69
„mezőszinten, visszafogottan jelezve” a `TorzsadatSyncCard` MEGLÉVŐ
diff-számlálójával és checkboxos dialógusával (40. tétel/D48) teljesül.

**Miért:** a `TorzsadatSyncCard` egy nemrég (40. tétel) épített, tesztelt
mechanizmus pontosan erre a célra — újraépítése (pl. inline per-mező
jelző ikonokkal a Személyes adatok mezői mellett) duplikálná a logikát
egy vizuálisan hasonló, funkcionálisan azonos cél érdekében.

**Elvetett alternatíva:** inline per-mező diff-jelzés közvetlenül a
Személyes adatok mezői mellett (szó szerint „mezőszinten” értelmezve) —
elvetve; a MEGLÉVŐ dialógus-alapú megoldás már mezőszintű (checkbox
minden eltérő mezőre), csak nem a mező MELLETT, hanem egy külön
dialógusban jelenik meg — ez a funkcionális lényeget tekintve
ugyanazt nyújtja, kevesebb UI-komplexitással.

### 5. Új „Dátumok” szekció: `ervenyesIg` szerkeszthetővé válik, `keltezes` marad automatikus

Az új „Dátumok” szekcióban a `keltezes` (kiadás dátuma) MARAD
olvasható, automatikusan számolt mező (D22/D62 — a betöltés
pillanatában bélyegzett, sosem kézi). Az `ervenyesIg` (érvényesség
dátuma) ÚJ, szerkeszthető mezőt kap, alapértékként a
`settings.ervenyessegNap`-ból számolt dátummal (D61).

**Miért:** D61 explicit ezt kéri („globális default napokban; tervben
konkrét valid-to szerkeszthető”) — néha a doki egy konkrét ajánlatnál
hosszabb/rövidebb érvényességet szeretne adni, mint a globális
alapérték. A `keltezes` VÁLTOZATLANUL automatikus marad, mert D22 ezt
explicit így rögzíti (a kiadás dátuma dokumentum-metaadat, nem
szerkeszthető üzleti döntés) — a redesign forrásai (D26–D28, D68–D69)
sem kérik a `keltezes` szerkeszthetőségét.

**Megvalósítás iránya:** nincs séma-bővítés — `plan.ervenyesIg` már
létező, sima `string` mező (`domain/types.ts:127`), a mező egyszerűen
szerkeszthető input lesz a jelenlegi olvasható szöveg helyett.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A nyelv/pénznem-kártya zárolási szabálya és tartalmi öröklése — 52.
  tétel (DP-031); ez a tétel csak a szekció HELYÉT (sorrendjét) rögzíti
  a stacked layout-ban.
- Az orvos-választó tényleges UI-ja — 53. tétel (DP-032); ez a tétel
  csak egy üres section-slot-ot tart fenn neki a helyes sorrendben.
- A `PlanEditorPage.tsx:319–320` hardkódolt `'hu'` locale a „friss
  dátummal” sávban — apró, önmagában is javítható inkonzisztencia, de
  nem ennek a tételnek a deklarált hatóköre (a redesign forrásai nem
  hivatkoznak rá); ha a megvalósító útba fut vele, érdemes egy sorban
  javítani, de nem szükséges hozzá külön tétel.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PatientPage.tsx` — a fő átalakítás: fejléc-átnevezés,
  szekcionálás, cím mező, dátumok szekció (1–3., 5. döntés).
- `app/src/components/PatientPlanChains.tsx` `saveLabel()` — a
  `storage.savePlanLabel` hívási mintája, amit a cím mező MEGLÉVŐ
  lánc esetén újrahasznosít (3. döntés).
- `app/src/pages/PreviewPage.tsx` `doFinalize()` — a második
  `storage.savePlanLabel()` hívás beillesztése a `storage.savePlan()`
  után, vadonatúj lánc egyedi címénél (3. döntés).
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` — vizuális
  áthelyezés az új „Páciens snapshot” szekcióba, tartalmi változás
  nélkül (4. döntés).
- `app/src/domain/types.ts` `Plan.ervenyesIg` — már létező mező,
  szerkeszthetővé válik a UI-n (5. döntés), séma-bővítés nélkül.

## Tesztelés (irányadó, nem kimerítő)

- A lap fejléce „Terv adatai”, nem „Páciens adatlap”.
- A hat szekció ebben a sorrendben jelenik meg: Cím, Páciens snapshot,
  Dokumentumnyelv, Pénznem, Orvos, Dátumok.
- Vadonatúj lánc cím mezője üresen a domináns kategória nevét mutatja
  javaslatként; a doki által beírt egyedi cím a véglegesítés UTÁN
  megjelenik a Korábbi tervek listáján és a `terv-cimke.json`-ban.
- Már mentett (Új verzió útján nyitott) lánc cím mezőjének szerkesztése
  azonnal frissíti a `terv-cimke.json`-t, navigáció nélkül.
- „Páciens snapshot” szekció alatt a törzsadat-eltérés-számláló és a
  szinkron-dialógus a MEGLÉVŐ viselkedéssel működik, csak új helyen.
- Az „Érvényes eddig” mező alapértéke a `keltezes + settings.
  ervenyessegNap`; kézi módosítás után a beírt dátum marad, amíg a doki
  nem törli/módosítja újra.
- A „Kiadás dátuma” (`keltezes`) mező NEM szerkeszthető, csak olvasható.
