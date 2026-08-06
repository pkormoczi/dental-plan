# Hibakezelés és failure-mode audit — `app/src`

Csak olvasó review, semmilyen fájl nem módosult. Teljes `app/src` átnézve a 6
megadott szempont szerint (néma catch, elkapatlan promise, error boundary,
optional chaining mint hibakezelés, fallback-értékek, a négy válaszforgatókönyv).

**Előzetes megjegyzés a hatókörről:** ez az app kliensoldali, backend nélküli
SPA (CLAUDE.md "Architektúra" — "Nincs backend, nincs adatbázis"). Grep
megerősítette: `fetch(`, `axios`, `XMLHttpRequest` **egyszer sem** fordul elő
az `app/src` alatt. A kért 6. pont ("hálózat leáll fetch közben" stb.) szó
szerint nem alkalmazható — a dokumentum végén (6. szakasz) az analóg réteget
(`PlanStorage`/`localStorage`) auditálom ugyanazzal a négy kérdéssel.

**Átfedés a `review/01-react.md`-vel:** az a review általános React-helyességi
szempontból már megtalálta ugyanennek a kódbázisnak több hibakezelési
forráspontját (finding #4, #5, #6, #11, #12 ott). Ahol egy hely mindkét
reviewban szerepel, ezt jelzem és csak az **új, hibakezelés-specifikus
szempontot** fejtem ki (mit lát pontosan a felhasználó, melyik kategória),
nem ismétlem meg a teljes elemzést.

## Séma: mennyi néma catch és elkapatlan promise van összesen

**Néma catch a teljes `app/src`-ben (tesztek nélkül): 1 darab.**
Ez az egyetlen `catch` blokk, ami nem tesztfájlban van:
`pages/PreviewPage.tsx:39` — részletesen a 9. találatnál.

**Elkapatlan (nincs `.catch`, nincs körülötte `try`) async hívás: 8 helyszín.**
Ezek közül a legsúlyosabbak önálló találatként lent (3, 5, 6, 8, 10, 11),
a többit itt listázom tömören:

| Helyszín | Async hívás | Következmény |
|---|---|---|
| `storage/StorageContext.tsx:25` | `void demo.init()` | 8. találat |
| `pages/SettingsPage.tsx:23` | `void saveSettings(...)` | 2. találat |
| `pages/PriceListAdminPage.tsx:37` | `void savePriceList(...)` | 10. találat |
| `state/AppState.tsx:36-42` | async IIFE a betöltő effektben | 5. találat |
| `pages/PlanHistoryPage.tsx:31-55` | async IIFE a betöltő effektben | 6. találat |
| `pages/PlanHistoryPage.tsx:65-69` | `openVersion` (onClick, nem await-elt) | 6. találat |
| `pages/PlanHistoryPage.tsx:71-84` | `downloadVersion` (onClick, nem await-elt) | 6. találat |
| `pages/PreviewPage.tsx:97-142` | `finalize` (onClick, nem await-elt, `try/finally`, **nincs `catch`**) | 3. találat |

Közös minta: a `DemoStorage` réteg (`storage/DemoStorage.ts`) maga jól van
megírva — beszédes, magyar nyelvű `Error`-okat dob (`SchemaVersionError`,
`VersionConflictError`, `"Nincs terv itt: …"`, `"Az árlista még nincs
inicializálva."`) — de **egyik hívási láncban sincs olyan pont, ahol ezt
valaki elkapná és megjelenítené.** A hiba minősége jó, a célba érése nulla.

---

## Findings

### P0 — a hiba elnyelése miatt rossz adat látszik helyesnek

**1. `pages/PlanEditorPage.tsx:362,373` — érvénytelen/törölt ár- és
darabszám-mező némán szerződéses `0`-ra esik, figyelmeztetés nélkül.**

```tsx
// :362 — darabszám
onChange={(e) => onPatch({ mennyiseg: Math.max(1, Number(e.target.value) || 1) })}
// :373 — tényleges egységár
onChange={(e) => onPatch({ tenylegesEgysegar: Number(e.target.value) || 0 })}
```

Ha a doki kitörli a "Tényleges" mezőt (pl. hogy újraírja), a mező átmenetileg
üres string, `Number('') || 0` → `0`. Ez az `onChange`-en azonnal beleíródik a
`plan` state-be (`updatePlan` → `structuredClone` + `Object.assign`), tehát
ha a doki ezen a ponton bármi mást csinál (Tab, kattint máshova, böngésző
autosave-mentés esetén — jelenleg nincs is autosave, de a `state`
mindenképp módosul), a sor **tényleges egységára néma `0` lesz**, ami
`computeOsszesitok`-on (`domain/totals.ts:24-32`) át egyenesen a nyomtatott,
aláírandó PDF-be kerül. A UI semmivel nem különbözteti meg "a doki 0-t akart
beírni" és "épp töröl, hogy újat írjon" esetét — nincs `isEditing`
köztes állapot, nincs validációs jelzés. Ugyanez a minta `PriceListAdminPage`
`ItemEditor`-jában is (lásd 12. találat), ott a törzsárlistát érinti.

**2. `pages/SettingsPage.tsx:22-24,34-38` — a "Mentve ✓" jelzés a mentés
tényleges sikerétől függetlenül jelenik meg.**

```tsx
function patch(fields: Partial<typeof settings>) {
  void saveSettings({ ...settings, ...fields });   // tűz-és-felejtsd, nincs catch
}
function handleSave() {
  commitOrvosok();     // -> patch() -> void saveSettings(...)
  setSaved(true);       // szinkron, a mentés kimenetelétől teljesen független
  setTimeout(() => setSaved(false), 2000);
}
```

*(Ugyanez a helyszín szerepel `review/01-react.md` #12-ben, race-condition
szemszögből — az itteni, hibakezelés-specifikus pont más: `setSaved(true)`
nem vár semmire, tehát ha `storage.saveSettings` bármiért dob (pl.
`localStorage` kvótahiba, ami a `beallitasok.json`-nál valószínűtlen, de nem
kizárt), a felhasználó egy zöld "Mentve ✓" pipát lát egy **el nem mentett**
állapot fölött — pontosan az OUTPUT SZERZŐDÉS P0 definíciója: a hiba
elnyelése miatt rossz adat (itt: rossz *állapot*, "elmentve") látszik
helyesnek.)*

**3. `storage/DemoStorage.ts:186-207` (`savePlan`) + `pages/PreviewPage.tsx:127-141`
(`finalize`) — két egymást követő `localStorage.setItem`, nincs atomicitás;
kvótahiba félkész verziómappát hagy hátra, láthatatlanul.**

```ts
// DemoStorage.ts:203-204
localStorage.setItem(planKey(patientDir, versionDir), JSON.stringify(finalPlan));
localStorage.setItem(pdfKey(patientDir, versionDir), uint8ToBase64(pdf));
```
```tsx
// PreviewPage.tsx:127-141
setSaving(true);
try {
  ...
  const ref = await storage.savePlan(finalPlan, bytes);
  const persisted = await storage.loadPlan(ref);
  setPlan(persisted);
  setSavedRef(ref);
} finally {
  setSaving(false);          // nincs catch ág
}
```

A base64-kódolt PDF jellemzően a nagyobb blob; ha épp a második
`setItem` hívás lépi túl a böngésző `localStorage` kvótáját (tipikusan
5–10 MB, több korábbi terv mellett reális), a **`terv.json` már létrejött**,
a PDF nem — a verziómappa fizikailag, de csonkán létezik. Mivel `finalize`-ban
nincs `catch`, a hiba a hívási láncban felfelé elszáll (elkapatlan rejection),
a `finally` csak a `saving`-jelzőt állítja vissza — a felhasználó semmilyen
üzenetet nem kap, azt hiheti, semmi sem történt. Ha újra rákattint
"Véglegesítés és mentés"-re, a `listVersions`/`nextVersionNumber`
(`storage/paths.ts:91-97`) a csonka mappát is látja (a `planKey` alapján
számol), tehát **egy újabb, `v(n+1)` verziót hoz létre**, és a csonka `v(n)`
örökre ott marad PDF nélkül — ez közvetlenül sérti a D4-et (a verziómappa
sérthetetlenségét), csendben. *(Az elkapatlan rejection ténye önmagában
`review/01-react.md` #4-ben is szerepel; az itt kiemelt új elem a
**részleges írás / csonka verziómappa** integritási következménye.)*

### P1 — a felhasználó beragad, vagy fehér képernyőt kap

**4. Nincs Error Boundary sehol az alkalmazásban.**

```tsx
// App.tsx — a teljes útvonalfa, nincs hibahatár-komponens
<StorageProvider>
  <AppStateProvider>
    <HashRouter>
      ...
      <Routes>...</Routes>
    </HashRouter>
  </AppStateProvider>
</StorageProvider>
```

Grep megerősíti: `ErrorBoundary`/`componentDidCatch`/`getDerivedStateFromError`
egyszer sem fordul elő az `app/src` alatt, sem a `main.tsx`-ben, sem
máshol. Bármilyen render-időbeli kivétel (pl. egy sérült `terv.json`-ból
betöltött `Plan`, aminek hiányzik egy mező, és emiatt `PlanEditorPage`
vagy `TervDocument` render közben `undefined`-en hív egy metódust) a teljes
React-fát lebontja: production buildben ez egy **teljesen üres, fehér
oldal**, semmilyen szöveg vagy visszalépési lehetőség nélkül — a doki csak
az F5-re (böngésző-frissítés) jöhet rá saját magától. Mivel ez egy publikus
GitHub Pages demó (lásd `DemoBanner.tsx`), ez az első benyomás egy UX-validáló
ülésen bizalomvesztő.

**5. `state/AppState.tsx:34-49` — a betöltő effekt elkapatlan `Promise.all`-ja
örökre a "Betöltés…" képernyőn tartja az egész appot.**

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    if (cancelled) return;
    setSettings(s);
    setPriceList(pl);
    setPlanState(createBlankPlan(s, pl));
  })();
  return () => { cancelled = true; };
}, []);

if (!settings || !priceList || !plan) {
  return <div ...>Betöltés…</div>;   // ez a végállapot, ha a Promise.all dobott
}
```

`storage.loadSettings`/`loadPriceList` (`DemoStorage.ts:214-232`) mindkettő
dobhat: hiányzó kulcsra explicit `Error`-t (`"A beállítások még nincsenek
inicializálva."`), túl magas `schemaVersion`-re pedig a kifejezetten erre a
célra megírt `SchemaVersionError`-t (`domain/schema.ts:11-25`, D18). Mindkettő
itt hal el: a `Promise.all` elutasítva végződik, `setSettings`/`setPriceList`
sosem fut le, az egész app **véglegesen** a `Betöltés…` képernyőn ragad —
ez a legrosszabb hely, ahol ez történhet, mert *minden* képernyő ez alatt a
Provider alatt van. *(Ugyanez a helyszín `review/01-react.md` #6.)*

**6. `pages/PlanHistoryPage.tsx:29-59` + `:65-84` — egyetlen sérült/inkompatibilis
terv az egész "Korábbi tervek" listát megbénítja; a megnyitás/letöltés gombok
hibára némán nem csinálnak semmit.**

```tsx
useEffect(() => {
  (async () => {
    const list = await storage.listPatients();
    const versionEntries = await Promise.all(list.map(...));
    const nameEntries = await Promise.all(
      list.map(async (p) => {
        ...
        const plan = await storage.loadPlan({ patientDir: p.dirName, versionDir: latest.dirName });
        return [p.dirName, plan.paciens.nev] as const;
      }),
    );
    ...
    setLoading(false);   // csak itt fut le
  })();
}, [storage]);

async function openVersion(patientDir: string, versionDir: string) {
  const plan = await storage.loadPlan({ patientDir, versionDir });  // nincs catch
  loadPlanIntoDraft(plan);
  navigate('/terv');
}
```

Ha **bármelyik** páciens legutolsó verziója `SchemaVersionError`-t vagy
sérült JSON-t dob (lásd 11. találat), a `Promise.all` az összes többi,
egyébként rendben lévő páciensre nézve is elszáll — `setLoading(false)` sosem
fut le, a lista örökké "Betöltés…" marad, még a hibátlan páciensek számára
is. Az `openVersion`/`downloadVersion` gombok pedig, ha egy adott terv
sérült, kattintásra láthatóan semmit nem tesznek (nincs `alert`, nincs
`disabled`, nincs spinner) — a `downloadVersion`-nek legalább van egy `alert`
ága, de csak a "nincs mentett PDF" esetre, nem a dobó `loadPlan`-re.
*(Ugyanez a helyszín `review/01-react.md` #5.)*

**7. `pages/PreviewPage.tsx` — a `usePDF()` visszaadott `error` mezőjét az
oldal sehol nem olvassa; PDF-generálási hiba esetén a gomb élőnek látszik,
de kattintásra semmi nem történik.**

```tsx
const [pdfInstance, updatePdf] = usePDF({ document: tervDocument });
// pdfInstance: { blob, url, loading, error } — az `.error` mező típusa
// `string | null` (node_modules/@react-pdf/renderer/lib/react-pdf.browser.d.ts:729),
// az oldal ebből csak .blob/.url/.loading-ot használja, .error-t sosem.

const busy = saving || pdfInstance.loading;
...
async function finalize() {
  ...
  if (!pdfInstance.blob) return;   // néma no-op, ha a render hibázott
  ...
}
```

Ha a `@react-pdf/renderer` belső renderelése elhasal (pl. egy `Text`-be
kerülő `NaN` a `formatMoney`-ból, lásd 1./12. találat kölcsönhatása, vagy egy
font-regisztrációs hiba), a könyvtár `pdfInstance.error`-t állítja be,
`pdfInstance.loading`-ot `false`-ra, `pdfInstance.blob`/`url` marad `null`.
A UI ezt az állapotot **sehol nem különbözteti meg** a "még tölt"
állapottól, csak annyiban, hogy a `busy` `false` lesz — tehát a "Véglegesítés
és mentés" gomb **használhatóvá válik**, miközben nincs érvényes PDF. Rákattintva
a `finalize()` az `if (!pdfInstance.blob) return;` sorban némán visszatér.
A felhasználó egy élő, engedélyezett gombot lát, ami semmit nem csinál —
nincs hibaüzenet, nincs "PDF előállítása sikertelen" felirat, csak az örök
"PDF előállítása…" szöveg (`:238-240`) marad látszólag inaktívan a képernyőn.

**8. `storage/StorageContext.tsx:22-32` — `void demo.init()` a Provider
gyökerében; ha elhasal, minden lejjebbi storage-hívás megmagyarázhatatlanul
hibázik.**

```tsx
const value = useMemo<StorageContextValue>(() => {
  const demo = new DemoStorage();
  void demo.init();     // elkapatlan; init() maga is dob(hat) (resetDemoData ->
                         // localStorage.setItem, ami kvótát/inkognitó-módot
                         // sérthet)
  return { storage: demo, ... };
}, []);
```

Ha `demo.init()` dob (pl. Safari privát böngészés, ahol a `localStorage`
elérése önmagában `SecurityError`-t dobhat, vagy kvótahiba az első seed-írásnál),
ez egy elkapatlan rejection a legelső renderben — utána minden downstream
`storage.*` hívás (5., 6. találat) egy soha-be-nem-töltött állapotból indul,
de a hibaüzenet, ami megmagyarázná *miért*, sehol nem jelenik meg. *(Ugyanez
a helyszín `review/01-react.md` #11-ben szerepel, ott jövőbeli race-condition
kockázatként a `FileSystemStorage`-migrációra nézve — itt a hangsúly azon
van, hogy **ma is** egy néma, elkapatlan promise, függetlenül attól, hogy a
mai szinkron `DemoStorage`-implementáció miatt gyakorlatilag sosem dob.)*

### P2 — diagnosztizálhatatlanság

**9. `pages/PreviewPage.tsx:36-42` — a kódbázis egyetlen néma `catch`
blokkja: minden hibát "hiányzó sablon"-ra fordít, elnyomva a valódi okot.**

```tsx
async function loadOrFallback(load: () => Promise<string>, fallback: () => Promise<string>) {
  try {
    return { text: await load(), fellback: false };
  } catch {
    return { text: await fallback(), fellback: true };
  }
}
```

A `catch` paraméter nélküli — a hiba objektuma **el sem érhető**, nemhogy
naplózva lenne. Ez a minta minden hibát (a szándékolt "ez a sablonfájl még
nem létezik ennél a réginél" esetet éppúgy, mint egy `SchemaVersionError`-t,
egy elgépelt kulcsnevet, vagy egy jövőbeli regressziót a `loadTemplate`-ben)
egységesen "a sablon hiányzik, HU-ra esünk vissza" üzenetre fordít
(`sablonFallback` sárga sáv, `:172-186`). A doki ilyenkor egy megnyugtató,
"ismerjük ezt, nem gond" jellegű magyarázatot lát, miközben simán lehet, hogy
egy attól teljesen független hibáról van szó — ez pontosan a P2 definíció:
a hiba nem tűnik el nyomtalanul, de **rossz diagnózisként** jelenik meg,
ami rosszabb, mint a néma eltűnés, mert hamis bizonyosságot ad.

**10. `pages/PriceListAdminPage.tsx:36-38` — a `commit()` fire-and-forget,
és ellentétben a `SettingsPage`-dzsel, **semmilyen** vizuális visszajelzést
nem ad, se sikerre, se hibára.**

```tsx
function commit(next: PriceList) {
  void savePriceList({ ...next, modositva: new Date().toISOString().slice(0, 10) });
}
```

Minden mezőmódosítás (`patchItem`) ezen megy át, minden billentyűleütésre.
Az inputok kontrollált mezők, értékük a `priceList` App state-ből jön
(`AppState.tsx:74-77`: csak *sikeres* `await storage.savePriceList()` után
hívja `setPriceList(pl)`-t). Ha a `storage.savePriceList` bármiért dob, a
React state nem frissül, a beírt karakter a következő render-en **visszaugrik**
a régi értékre — a gépelés láthatóan "nem áll meg", de nincs se hibaüzenet,
se log, se bármilyen jel, ami megmondaná, hogy ez a storage-réteg hibája, nem
pl. egy fókuszvesztés. *(Ugyanaz a kódhely szerepel `review/01-react.md`
#12-ben, ottani fókusz a race-conditionön van; itt a nulla-visszajelzés a lényeg.)*

**11. `storage/DemoStorage.ts:175,217,229` — három `JSON.parse` hívás
`try/catch` nélkül; a gondosan megfogalmazott `SchemaVersionError`-üzenet
(D18) sosem különböztethető meg egy egyszerű `SyntaxError`-tól, mert egyik
sem jut el a felhasználóig.**

```ts
// :175 (loadPlan), :217 (loadPriceList), :229 (loadSettings) — azonos minta
const plan = JSON.parse(raw) as Plan;
assertKnownSchemaVersion(plan, 'terv.json');   // ez a hívás jól megcímkézett
                                                // hibát dob magasabb verzióra
```

Egy manuálisan szerkesztett vagy félbeszakadt írás miatt sérült `localStorage`
bejegyzés (ez egy devtools-ból bárhol elérhető demóban nem elméleti eset)
`JSON.parse`-kor `SyntaxError`-t dob. Ez a hívó minden helyén (5., 6., 3.
találat) ugyanabba az elkapatlan-rejection végállapotba fut ki, mint a
`SchemaVersionError` vagy bármelyik `"Nincs …"` hiba — a felhasználó
szemszögéből a "sérült adat", "elavult séma" és "hiányzó fájl" **teljesen
megkülönböztethetetlen**, mind ugyanaz az örök "Betöltés…" vagy néma
gombkattintás. A CLAUDE.md D18 pontja kifejezetten "érthető üzenettel" várja
el a magasabb séma-verzió elutasítását — az üzenet szövege létezik és jó, de
strukturálisan sosem ér célba.

**12. `pages/PriceListAdminPage.tsx:274-276,362-370` (`ItemEditor`
`setFixPrice`/HUF-ár mező) — a törzsárlista fix ára ugyanazzal a
`Number(e.target.value)` mintával minden billentyűleütésre azonnal
perzisztálódik, debounce/megerősítés nélkül; egy törölt mező pillanatnyi
`0`-ja végleges is maradhat, ha az oldal éppen akkor bezárul/navigál.**

```tsx
<input type="number" value={hufAr?.tipus === 'FIX' ? hufAr.ertek : 0} style={input}
  onChange={(e) => setFixPrice(Number(e.target.value))} />
// setFixPrice -> onPatch -> patchItem -> commit -> void savePriceList(...)
```

Ellentétben az 1. találattal (ami egy adott terv egy sorát érinti), ez a
**törzsárlistát** módosítja — minden jövőbeli terv innen veszi az árat
(`PlanEditorPage.tsx:53-55`, `basePrice`). Mivel nincs "Mentés" gomb ezen a
mezőn (minden `onChange` azonnal ír, lásd a fenti bevezető táblázatot is),
ha a doki a mező tartalmát kijelöli és törli, mielőtt beírná az új számot,
egy `{tipus:'FIX', ertek:0}` állapot azonnal, észrevétlenül perzisztálódik.
Ha ezen a ponton bármi megszakítja a gépelést (véletlen navigáció, fül
bezárása), a tétel **0 forintos árral** marad a törzsárlistában — és mivel
`available` szűrése (`PlanEditorPage.tsx:31`) csak azt nézi, hogy
`x.ar[currency]` *létezik* (nem hogy az érték `> 0`), egy ilyen tétel
továbbra is felkínálásra kerül a keresőben, formázva ("0 Ft"), nem
`—`-ként — vizuálisan megkülönböztethetetlen egy tudatosan ingyenes
tételtől.

---

## 6. A négy failure-mode forgatókönyv (a `PlanStorage`/`localStorage` rétegre fordítva)

Mivel nincs hálózati réteg, az alábbi négy kérdést a `PlanStorage`
interfészre (ma: `DemoStorage` + `localStorage`) fordítom le — ez tölti be
ugyanazt a szerepet, mint egy backend API egy hagyományos SPA-ban.

**a) "A hálózat leáll a fetch közben"** → analóg: `localStorage.setItem`
`QuotaExceededError`-t dob egy többlépéses művelet **közepén**. Lásd 3.
találat. **Mit lát a felhasználó:** a "Véglegesítés és mentés" gomb
"Mentés…"-ből visszavált "Véglegesítés és mentés"-re, mintha semmi nem
történt volna — nincs hibaszöveg. A `localStorage`-ban egy csonka
verziómappa marad (`terv.json` van, PDF nincs), amit a UI sosem mutat meg.

**b) "A válasz 500-as"** → analóg: a storage réteg egy explicit `Error`-t
dob (`VersionConflictError`, `SchemaVersionError`, `"Nincs terv itt: …"`).
Lásd 5., 6., 11. találat. **Mit lát a felhasználó:** attól függően, hol
történik, vagy egy örökké pörgő "Betöltés…" felirat (5., 6.), vagy egy
gombnyomás, aminek nincs látható hatása (6., 7.). A böngésző konzoljában van
stack trace (`Uncaught (in promise) Error: …`), a felületen semmi.

**c) "A válasz 200-as, de üres"** → analóg: `localStorage.getItem(key) ===
null` egy hiányzó/még nem inicializált kulcsra. A `DemoStorage` ezt
*explicit, jól megfogalmazott* dobásra fordítja (pl. `"Az árlista még nincs
inicializálva."`, `"Nincs ilyen sablon: …"`) — ez jó tervezői döntés. **Mit
lát a felhasználó:** mivel a hívási láncban sehol nincs `catch`, ez az
egyébként jó üzenet pontosan ugyanoda fut ki, mint a (b) eset — a
gondosan megírt szöveg sosem jelenik meg képernyőn.

**d) "A parse elhasal"** → analóg: `JSON.parse` egy sérült/részlegesen írt
`localStorage`-bejegyzésen, `SyntaxError`-t dobva. Lásd 11. találat. **Mit
lát a felhasználó:** megkülönböztethetetlen a (b)/(c) esettől — mind ugyanaz
az "örök Betöltés…" vagy néma gomb.

**Összegzés:** a négy forgatókönyv közül egyik sem különböztethető meg
a felhasználó számára — nem azért, mert a `DemoStorage` rosszul jelezné a
hibákat (a hibaüzenetek minőségileg jók és specifikusak), hanem mert a hívó
oldalon (page-ek, `AppState`) **sehol egyetlen `catch` sincs**, ami ezeket
megjelenítené. Az egyetlen kivétel (`PreviewPage.tsx:39`) pedig épp az
ellenkező irányba hibázik: mindent egyetlen, túl specifikus üzenetre fordít
(9. találat).

---

## Mit nem néztem át

- `ui/*.jsx` prototípus-fájlok — a CLAUDE.md explicit státusza szerint nem
  buildelődő referenciakód, kimaradt.
- `*.test.ts`/`*.test.tsx` fájlok — csak annyiban, hogy ellenőrizzem, fed-e
  egy adott találatot (nem fedi egyik sem az itt leírtak közül); a
  tesztkészlet önálló minőségi auditja nem volt cél.
- `app/src/design/**`, `app/src/domain/**` tiszta függvényei (kivéve
  `money.ts`, `schema.ts`, `totals.ts`, `nev.ts`, `coverage.ts`, amiket a
  fenti találatokhoz muszáj volt átfutni) — nincs bennük hibakezelési
  felület, csak tiszta transzformáció.
- A 2. fázis (`FileSystemStorage`, `pdf-lib`-es beágyazás) — még nem
  létezik, nem auditálható; minden itteni megállapítás a mai
  `DemoStorage`/`localStorage`-mockupra vonatkozik, nem feltétlenül öröklődik
  változatlanul a fájlrendszeres verzióba (ott pl. a "kvótahiba" más alakot
  ölt, "lemez megtelt" vagy jogosultsági hiba formájában).
- Böngésző-specifikus viselkedést (tényleges `localStorage` kvótahatár
  Chrome/Edge-ben, `usePDF` valós hibaviselkedése, Safari privát mód
  `localStorage`-blokkolása) nem futtattam le böngészőben — kódolvasás és a
  könyvtár típusdefiníciói (`.d.ts`) alapján következtettem, nem megfigyelt
  runtime-viselkedésből.
- React Router `HashRouter` ismeretlen route-jainak viselkedését (nincs
  catch-all/404 route az `App.tsx`-ben) nem vizsgáltam részletesen — ez
  valószínűleg csak egy üres `<main>`-t ad, nem fehér képernyőt, de nem
  erősítettem meg.

## Hol vagyok bizonytalan

- **7. találat** (`pdfInstance.error`): nem futtattam az appot böngészőben,
  így nem igazoltam vissza élesben, hogy a `usePDF` valóban
  `loading: false, url: null, error: <szöveg>` állapotban ragad-e egy
  render-hiba után, vagy van-e a könyvtárban valamilyen belső retry, ami
  végül mégis eljuttat egy blob-hoz. A `.d.ts` alapján logikus következtetés,
  nem demonstrált reprodukció.
- **3. és 12. találat** kvótahiba-forgatókönyve: nem mértem meg, mekkora egy
  tipikus 3 oldalas PDF base64-ben, sem hogy hány terv/verzió után éri el
  reálisan az 5–10 MB-os `localStorage`-kvótát egy éles használat mellett —
  ez valószínűségi kockázatként áll, nem reprodukált bugként.
- **1. és 12. találat** `Number(x) || 0` mintája: a `type="number"` input
  Chrome-ban UI-szinten már eleve szűri a nem-numerikus karaktereket, tehát
  a "betűket gépelek" eset böngészőfüggő lehet — az "üres mezőre törlöm"
  eset viszont minden böngészőben fennáll, ez utóbbira alapoztam a
  találatot.
- Nem zártam ki teljesen, hogy a `StrictMode` (`main.tsx:7`) dupla-effect
  futtatása fejlesztői módban elfed egy olyan időzítési élt, ami csak
  production buildben (egyszeri effect-futás) jelentkezne másképp — ezt nem
  vizsgáltam külön build-módonként.
