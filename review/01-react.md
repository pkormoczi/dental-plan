# React helyességi review — `app/src`

Csak olvasó review, kód nem módosult. Az `app/src` teljes React felülete átnézve
(7 oldal, 3 komponens, 2 provider, a PDF-dokumentum, `DemoStorage`), plusz a
`@react-pdf/renderer` `usePDF` forrása (`node_modules/@react-pdf/renderer/lib/
react-pdf.browser.js`), mert két P0 találat ezen múlik.

**Két eltérés a feladat feltevéseitől:**
- A `review/00-eslint.txt` nem létezik — a `review/` könyvtár egyáltalán nem volt
  a repóban, ez a fájl hozta létre.
- A projekt nem eslintet, hanem **oxlintot** futtat (`app/.oxlintrc.json`), és abban
  a `react-hooks/exhaustive-deps` szabály **nincs bekapcsolva**. `npx oxlint`
  futtatva mindössze 2 `only-export-components` warningot ad
  (`state/AppState.tsx:83`, `storage/StorageContext.tsx:37`), dep-tömb-hibát
  egyet sem. A kódban látható `// eslint-disable-next-line
  react-hooks/exhaustive-deps` kommentek (`state/AppState.tsx:48`,
  `pages/PlanEditorPage.tsx` — nincs is ott —, `pages/PriceListAdminPage.tsx:82`,
  `pages/PreviewPage.tsx:86`) jelenleg **hatástalanok**, mert a szabály maga
  nincs futtatva. Emiatt "amit a lint már látott" kategóriát nem tudtam kizárni
  egy tényleges lint-riport alapján — az alábbi találatok között ahol egy
  dep-tömb valódi hiba forrása, azt jelzem, de a fókusz a kérésnek megfelelően
  a lint-nek eleve láthatatlan hibákon van (stale ref/closure, nem hiányzó dep).

## 1. Komponensfa és state-tulajdonlás

```
StorageProvider (storage/StorageContext.tsx)
  state: `storage` (DemoStorage-példány) — useMemo([]), egyszer jön létre
  ír:    Home.tsx (resetDemoData), PreviewPage.tsx (loadPlanPdf/loadLatestTemplateByBase
         közvetve az adatra), minden oldal a storage.* híváson keresztül
  olvas: minden useStorage()-t hívó oldal

  AppStateProvider (state/AppState.tsx)
    state: settings, priceList, plan (3× useState, mind Plan|null kezdetben)
    ír:    setPlan/updatePlan mintán át PlanEditorPage, PatientPage;
           saveSettings-en át SettingsPage; savePriceList-en át PriceListAdminPage;
           resetPlanDraft/loadPlanIntoDraft-on át Home, PlanHistoryPage, PreviewPage
    olvas: gyakorlatilag minden oldal useAppState()-en keresztül

    Route "/"            Home.tsx           — nincs saját state, csak justReset (2s-es toast)
    Route "/paciens"      PatientPage.tsx    — nincs saját state, plan.paciens-t patchel közvetlenül
    Route "/terv"         PlanEditorPage.tsx — nincs oldal-szintű state;
                             ItemPicker (soronként, PhaseCard gyerekeként): q, hi (lokális, per-fázis)
    Route "/elonezet"     PreviewPage.tsx    — offerOnly, nyilatkozatMd, fizetesiFeltetelekMd,
                             sablonFallback, saving, savedRef (6 lokális state)
                             + usePDF() saját belső state-je (url/blob/error/loading)
    Route "/tervek"       PlanHistoryPage.tsx— patients, versionsByPatient, namesByPatient,
                             q, loading (5 lokális state)
    Route "/arlista"      PriceListAdminPage.tsx — q, filter, open (3 lokális state);
                             maga a lista a priceList AppState-ből, minden módosítás
                             azonnal ír (savePriceList), nincs helyi piszkozat
    Route "/beallitasok"  SettingsPage.tsx   — orvokText (textarea piszkozat), saved (toast)
```

**Kettős tulajdonlás, amit érdemes látni:** a `localStorage` (`DemoStorage`) és az
`AppState` memóriabeli `settings`/`priceList`/`plan` state-je *ugyanazt az adatot*
tartja két helyen, kézi szinkronban — az `AppStateProvider` csak egyszer olvas be
(`useEffect(..., [])`), utána minden írás mindkét helyre megy (`storage.save*` +
`setX`). Ha a kettő szétcsúszik, semmi nem veszi észre (lásd 1. és 6. találat).

## 2. Findings

### P0 — a felhasználó rossz adatot lát, és nem veszi észre

**1. `Home.tsx:14-21` + `storage/StorageContext.tsx:26-31` + `state/AppState.tsx:34-49`
— "Demó adat visszaállítása" nem tölti újra az AppState-et, a következő
mentés felülírja a resetet.**

```tsx
// Home.tsx:14-21
function handleReset() {
  if (!confirm('...')) return;
  resetDemoData();
  setJustReset(true);
  setTimeout(() => setJustReset(false), 2500);
}
```
```ts
// AppState.tsx:34-49
useEffect(() => {
  let cancelled = false;
  (async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    ...
  })();
  return () => { cancelled = true; };
  // A storage csak egyszer, a Provider élettartama alatt cserélődik ... -- egyszeri betöltés elég.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```
`resetDemoData()` (`StorageContext.tsx:28`) törli és újraírja a `localStorage`-ot,
de az `AppStateProvider`-ben tartott `settings`/`priceList`/`plan` memóriabeli
state-et semmi nem érinti — a betöltő effekt csak mountkor fut (`[]` dep). A doki
látja a "Visszaállítva ✓" toastot, de a memóriában a régi (esetleg általa épp
elrontott) árlista/beállítás marad. Ha ezután bármit ment (pl. `PriceListAdminPage`
egy `patchItem`-je `commit()`-tel `{ ...priceList, ... }`-ot ír), a **régi**
állapot íródik vissza a friss seed fölé — a reset ténylegesen elvész, csendben.
**Repro:** Árlista oldalon módosíts egy tételt → Kezdőlap → "Demó adat
visszaállítása" → Árlista oldalon módosíts megint egy másik mezőt (bármelyiket) →
a korábbi (első) módosítás visszatér, mintha a reset meg sem történt volna.

**2. `pages/PriceListAdminPage.tsx:64-83` + `:330-337` — az EUR ár kitöltése a
"Nincs EUR ár" szűrő alatt eltünteti a mezőt, mielőtt a doki végigírná a számot.**

```tsx
// :64-71
const keep = (x: Tetel): boolean => {
  if (q && !norm(x.nev.hu).includes(norm(q))) return false;
  if (filter === 'noeur') return !x.ar.EUR;
  ...
};
// :73-83 -- grouped csak [priceList, q, filter]-től függ
const grouped = useMemo(() => { ... }, [priceList, q, filter]);
```
```tsx
// ItemEditor, :330-337
<Field label="EUR ár (cent)">
  <input
    type="number"
    value={item.ar.EUR?.tipus === 'FIX' ? item.ar.EUR.ertek : ''}
    onChange={(e) => setEur(e.target.value === '' ? null : Number(e.target.value))}
  />
</Field>
```
A doksi szerint (`PriceListAdminPage.tsx:9`, `SettingsPage.tsx:172`) pontosan ez a
munkafolyamat: "a »Nincs EUR ár« szűrő maga a német bevezetés munkalistája". De ha
a szűrő `noeur`-re van állítva és a doki egy sor EUR mezőjébe beírja az első
számjegyet (pl. "5"), a `commit()` (`:36-38`) azonnal ír, a `priceList` frissül, a
`grouped` memo újraszámol, és ez a tétel — mivel most már **van** EUR ára — kiesik
a `noeur` szűrőből. A sor (és vele az `ItemEditor`) eltűnik a listából, mielőtt a
doki a második számjegyet begépelhetné. A mezőben (és a mentett adatban) **5 cent**
(`{tipus:'FIX', ertek:5}`, azaz 0,05 €) marad, láthatatlanul — a doki azt hiheti,
folytatja a gépelést, valójában egy üres képernyőre néz.
**Repro:** Árlista → "Nincs EUR ár" szűrő → egy tétel kinyitása → EUR mezőbe "5000"
gépelése → az első "5" leütése után a sor és a mező eltűnik.
A meglévő `PriceListAdminPage.test.tsx:64-78` és `:116-124` teszt nem fedi ezt: az
első `filter: 'all'` mellett fut (a szerkesztett sor nem esik ki), a második meg
csak azt nézi, hogy a szűrő induláskor (0 kitöltött EUR ár mellett) mindent mutat.

**3. `pages/PreviewPage.tsx:168,207-215,226-236` — "Letöltés" és az iframe nem
jelzi a PDF-regenerálást; a "Csak ajánlat" váltás után letöltve a régi PDF jön.**

```tsx
const busy = saving || pdfInstance.loading;
...
{pdfInstance.url && (
  <a href={pdfInstance.url} download={...}>
    <button style={btn()}>Letöltés</button>   {/* nincs disabled={busy} */}
  </a>
)}
...
{pdfInstance.url ? (
  <iframe src={pdfInstance.url} .../>          {/* nincs "frissítés..." jelzés */}
) : ( ... )}
```
A `usePDF()` saját forrása (`node_modules/@react-pdf/renderer/lib/
react-pdf.browser.js:308-347`) a régi `state.url`-t **megtartja**, amíg az új blob
el nem készül (`onRenderSuccessful` csak sikeres render után cseréli le). A
"Letöltés" gomb és az iframe egyaránt csak `pdfInstance.url`-t nézi, nem
`pdfInstance.loading`-ot — miközben a `offerOnly`/`nyilatkozatMd` váltás miatt a
`useEffect` (`:84-87`) új `updatePdf()`-et indít, a felhasználó a **régi** blobra
mutató linket látja, letöltheti a régi (pl. nyilatkozatot és aláírási oldalt is
tartalmazó) PDF-et, miközben azt hiszi, hogy már a "csak ajánlat" verziót kapta —
ugyanazzal a fájlnévvel (`kezelesi-terv-${plan.tervId || 'uj'}.pdf`, `:210`), tehát
utólag sem különböztethető meg.
**Repro (böngészőben, nem a mockolt teszttel):** Előnézet megnyitása → PDF betölt →
"Csak ajánlat" bepipálása → azonnal "Letöltés" → a letöltött fájl még a
nyilatkozat+aláírás oldalt is tartalmazza, mert a regenerálás még fut.

### P1 — reprodukálható bug

**4. `pages/PreviewPage.tsx:97,125-141` — `finalize()`-ban nincs hibakezelés:
mentési hiba néma, vagy egy elavult PDF mentődik el aláírandó dokumentumként.**

```tsx
async function finalize() {
  ...
  if (!pdfInstance.blob) return;   // néma no-op, nincs üzenet a felhasználónak
  setSaving(true);
  try {
    const finalPlan = { ...plan, statusz: 'VEGLEGES' as const, osszesitok: computeOsszesitok(plan.fazisok) };
    const bytes = new Uint8Array(await pdfInstance.blob.arrayBuffer());
    const ref = await storage.savePlan(finalPlan, bytes);
    const persisted = await storage.loadPlan(ref);
    setPlan(persisted);
    setSavedRef(ref);
  } finally {
    setSaving(false);
  }
}
```
Nincs `catch`. A `DemoStorage.savePlan` (`storage/DemoStorage.ts:203-204`) a PDF-et
base64-re kódolva `localStorage.setItem`-eli — ez könnyen elfut a böngésző
kvótájába (tipikusan 5–10 MB, egy 3 oldalas PDF base64-ben simán megközelítheti
ezt sok korábbi terv mellett). Kvótahiba esetén a `QuotaExceededError` a hívási
láncban felfele dobódik, senki nem fogja el: a `finally` lefut (`saving` false
lesz), a gomb újra kattintható, de a felhasználó **nem kap hibaüzenetet** — azt
hiheti, elmentette a tervet, valójában semmi nem történt. Fordítva: ha a
`pdfInstance.blob` egy korábbi (pl. render-hibás vagy elavult) állapotból maradt
meg (lásd 3. találat), a `finalize()` ezt a régi blobot menti el, aláírandó
dokumentumként, észrevétlenül.

**5. `pages/PlanHistoryPage.tsx:29-59,65-84` — hibázó betöltés/megnyitás/letöltés
esetén nincs felhasználónak szóló hiba, a "Betöltés…" örökre kint marad.**

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    const list = await storage.listPatients();
    const versionEntries = await Promise.all(...);
    ...
    setPatients(list);
    setVersionsByPatient(versionsMap);
    setNamesByPatient(Object.fromEntries(nameEntries));
    setLoading(false);          // csak a sikeres ágon fut
  })();
  return () => { cancelled = true; };
}, [storage]);
```
Ha bármelyik `storage.loadPlan(...)` a névfeloldás közben dob (pl. a gondosan
megírt `SchemaVersionError`, `domain/schema.ts:11-25`, amit a D18 kifejezetten
erre a célra vezetett be), a promise-lánc elutasítva végződik, a `setLoading(false)`
sosem fut le — a "Betöltés…" felirat véglegesen kint marad, a valójában
informatív hibaüzenet sehol nem jelenik meg. Ugyanígy `openVersion` (`:65-69`) és
`downloadVersion` (`:71-84`) `await storage.loadPlan(...)`/`loadPlanPdf(...)`
hívása kezeletlen — egy dobó `loadPlan` esetén a "Megnyitás szerkesztésre" gomb
kattintásra láthatóan semmit nem csinál, hibaüzenet nélkül (a `downloadVersion`-nek
legalább van egy `alert` ága, de csak a "nincs PDF" esetre, nem a dobó hívásra).

**6. `state/AppState.tsx:34-57` — app-szintű megfelelője: egy dobó `loadSettings`/
`loadPriceList` után az egész alkalmazás örökre "Betöltés…" marad, kiút nélkül.**

```tsx
useEffect(() => {
  let cancelled = false;
  (async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    if (cancelled) return;
    setSettings(s); setPriceList(pl); setPlanState(createBlankPlan(s, pl));
  })();
  return () => { cancelled = true; };
}, []);

if (!settings || !priceList || !plan) {
  return <div style={{...}}>Betöltés…</div>;   // örökre itt marad hiba esetén
}
```
`loadSettings`/`loadPriceList` (`DemoStorage.ts:214-232`) mindkettő dob, ha a
kulcs hiányzik VAGY ha `assertKnownSchemaVersion` (D18) magasabb séma-verziót
észlel — ez utóbbi pontosan az a helyzet, amit a CLAUDE.md explicit megkövetel
kezelni ("érthető üzenettel" megtagadni a betöltést). Itt semmi nem fogja el a
hibát: a `NavBar`/`DemoBanner` sem renderelődik (ezek az `App.tsx:24-27`-ben az
`AppStateProvider`-en *belül* vannak), tehát a felhasználó egy csupasz "Betöltés…"
szöveget lát, frissítés/reset gomb nélkül — pont az ellenkezője annak, amit a D18
elvárna.

**7. `pages/PlanEditorPage.tsx:86-89,257-259,420-441` — `key={pi}` a fázislistán +
fázistörlés: az `ItemPicker` lokális keresési állapota átcsúszik egy másik
fázisra.**

```tsx
{plan.fazisok.map((p, pi) => (
  <PhaseCard key={pi} phase={p} ... />       // :86-89, index-kulcs
))}
```
```tsx
onDelete={() =>
  updatePlan((draft) => { draft.fazisok.splice(pi, 1); })   // :115-119
}
```
```tsx
{phase.sorok.map((l, li) => (
  <LineRow key={li} line={l} ... />)                        // :257-259, szintén index-kulcs
))}
```
```tsx
// ItemPicker, per-PhaseCard lokális state
const [q, setQ] = useState('');
const [hi, setHi] = useState(0);
```
Mivel a fázisok listája `key={pi}` szerint van kulcsolva, egy középső/kezdő fázis
törlésekor React a **pozíció**, nem a fázis azonossága szerint egyezteti a
`PhaseCard`-okat: ha 3 fázis van (A, B, C; key 0/1/2) és a doki épp a B fázis
keresőjébe gépel (`q="korona"`), majd törli az A fázist, az új tömb [B, C] lesz,
kulcsok [0, 1]. React a régi `key=1` (ami B-t renderelte, és amiben a doki
ténylegesen gépelt) példányt **megtartja**, de az új props C adatait kapja — a
gépelt `q`/`hi` állapot a C fázis kártyájára "vándorol" át, míg a látszólag B-t
mutató kártya (ami valójában az A-ból lett újrapróbálva) egy friss, üres
keresőt kap. Ha a doki ezután Entert üt, a tétel **C fázisba** kerül be, nem
oda, ahova gépelte. Ugyanez a minta a `LineRow key={li}` sornál (`:257-259`) —
ma ártalmatlan, mert a `LineRow`-nak nincs saját `useState`-je, de egy sor
törlése (`onRemoveLine`, `splice`) ugyanígy pozíció szerint egyezteti a
kontrollált inputokat, ami React-fókuszvesztést/hibás DOM-egyeztetést okozhat,
amint a sorhoz bármilyen lokális state kerül (pl. egy inline validációs jelző).
**Repro:** 3 fázis, a 2.-ban elkezdeni gépelni a keresőbe, majd az 1. fázist
törölni, majd Entert nyomni a kereső dropdown első találatára — a tétel a
(korábbi 3., most 2.) fázisba kerül.

### P2 — karbantarthatósági kockázat, konkrét jövőbeli bug-forgatókönyvvel

**8. `pages/PlanEditorPage.tsx:427-435` — a kiemelt találat (`hi`) reszet-effektje
elszakadhat a `results` memótól, tartományon kívüli indexet eredményezve.**

```tsx
const results = useMemo(() => {
  if (!q.trim()) return [];
  const nq = norm(q);
  return available.filter((x) => norm(x.nev.hu).includes(nq) || norm(x.nev.de).includes(nq)).slice(0, 12);
}, [q, available]);

useEffect(() => setHi(0), [q]);   // csak [q]-tól függ, nem [q, available]-től
```
Ez egy tipikus "derived state-et effektben számoló" minta: `hi` csak azért reset
0-ra, mert `q` változik, de a valódi forrás, amitől a `hi` érvényessége függ, a
`results.length` (ami `available`-től is függ). Ma az `available` (`priceList`/
`currency`-ből számolt, `:30-33`) csak akkor változik, ha a doki egy másik
útvonalon (Árlista) módosítja az árlistát vagy a Páciens adatlapon pénznemet
vált — ezek a mai routing miatt nem történhetnek meg *miközben* az `ItemPicker`
nyitva van ugyanazon az oldalon, így a hiba ma nem érhető el kézzel. De ha
`available` bármikor `q` változása **nélkül** csökken (pl. egy jövőbeli
többfüles/élő-szinkronos verzióban, vagy ha a phase-2 FileSystemStorage külső
fájlváltozást detektál és frissíti a `priceList`-et háttérben), a `hi` egy már
nem létező indexen ragadhat: `commit(results[hi])` → `results[hi] === undefined`
→ `onPick(undefined)` → `addLine`-ban `item.ar[currency]` dobna (a `Tetel`
típus nem enged `undefined`-et, futásidőben viszont igen).

**9. `state/AppState.tsx:59-81` — a context `value` minden renderben új objektum,
minden benne lévő függvénnyel együtt; egyetlen mező változása minden
consumert újrarenderel.**

```tsx
const value: AppStateValue = {
  settings, priceList, plan,
  setPlan: (updater) => setPlanState((prev) => { ... }),
  resetPlanDraft: () => setPlanState(createBlankPlan(settings, priceList)),
  loadPlanIntoDraft: (p) => setPlanState(p),
  saveSettings: async (s) => { await storage.saveSettings(s); setSettings(s); },
  savePriceList: async (pl) => { await storage.savePriceList(pl); setPriceList(pl); },
};
return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
```
Nincs `useMemo`, és minden metódus egy új closure minden renderben — tehát
`setPlan`, `saveSettings` stb. referenciája sosem stabil. Ma ez nem okoz látható
hibát, mert az alkalmazás nem épít `React.memo`-ra és a `useAppState()` visszatérő
függvényei sehol nincsenek `useEffect`/`useCallback`/`useMemo` dependency-listában.
De ez pontosan az a minta, ami a CLAUDE.md "Két fázisú build" 2. lépésében ígért
autosave-nél (IndexedDB-piszkozat, lásd `state/AppState.tsx:1-5` kommentje)
tipikusan végtelen ciklushoz vezet: ha egy jövőbeli autosave-effekt `[setPlan]`-t
vagy `[plan, saveSettings]`-t venné fel dependency-nek (természetes választás
lenne), minden render új függvényazonosságot ad, az effekt minden renderben
újrafutna.

**10. `plan.osszesitok` kétszer számolt, semmi nem veti össze — a CLAUDE.md által
kifejezetten előírt figyelmeztetés nincs implementálva.**

```ts
// domain/blankPlan.ts:51 -- üres tervnél nullázva
osszesitok: { kezelesekOsszesen: 0, kedvezmeny: 0, fizetendo: 0 },
```
```tsx
// pages/PreviewPage.tsx:129-133 -- csak véglegesítéskor frissül
const finalPlan = { ...plan, statusz: 'VEGLEGES' as const, osszesitok: computeOsszesitok(plan.fazisok) };
```
```tsx
// pages/PlanEditorPage.tsx:75-76 -- szerkesztés közben a UI ettől függetlenül újraszámol
const grand = plan.fazisok.reduce((s, p) => s + fazisOsszeg(p), 0);
const listTotal = plan.fazisok.reduce((s, p) => s + fazisListaOsszeg(p), 0);
```
A `plan.osszesitok` mező (a `Plan` state egy szelete, `domain/types.ts:79-99`) csak
véglegesítéskor kap valós értéket; szerkesztés közben stale/nullázott marad, mert
a `PlanEditorPage` sosem írja — helyette mindenütt friss `reduce()`-ot használ. Ez
önmagában szándékos (a CLAUDE.md szerint "`osszesitok` a fájlból számít igaznak"),
DE a szabály másik fele — "eltérés esetén figyelmeztetni kell" — sehol nincs
implementálva: sem a `PlanHistoryPage` megnyitáskor, sem a `PreviewPage`
betöltéskor nem hasonlítja össze egy betöltött (korábbi) terv `osszesitok`
mezőjét a `computeOsszesitok(plan.fazisok)` friss eredményével. Ha egy régi
`terv.json`-t kézzel vagy egy jövőbeli migrációs hibával szerkesztenek, a doki
soha nem kap jelzést az eltérésről.

**11. `storage/StorageContext.tsx:23-32` — `demo.init()` nincs `await`-elve.**

```tsx
const value = useMemo<StorageContextValue>(() => {
  const demo = new DemoStorage();
  void demo.init();
  return { storage: demo, ... };
}, []);
```
Ma ártalmatlan, mert a `DemoStorage.init()` törzse (`storage/DemoStorage.ts:87-98`)
nem tartalmaz valódi `await`-et — az `async` kulcsszó ellenére szinkronul fut le a
`Promise`-visszaadásig, így mire az `AppStateProvider` effektje (`state/
AppState.tsx:37`) meghívja a `storage.loadSettings()/loadPriceList()`-et, a
`localStorage` már fel van töltve. Ha a `PlanStorage` a "2. fázisban" a
`FileSystemStorage`-ra cserélődik (CLAUDE.md "Két fázisú build"), ahol az
inicializálás (könyvtárválasztás, fájlolvasás) ténylegesen aszinkron, ez a
`void`-olt hívás versenyhelyzetet nyit: az `AppStateProvider` a még be nem
fejeződött inicializálás közben próbálna olvasni, és — a 6. találat miatt —
csendben, kiút nélkül a "Betöltés…" képernyőn ragadna.

**12. `pages/SettingsPage.tsx:22-24` és `pages/PriceListAdminPage.tsx:36-45` —
minden mezőírás a render-időbeli state-et zárja closure-be egy tűz-és-felejtsd
async híváshoz, functional updater nélkül.**

```tsx
// SettingsPage.tsx:22-24
function patch(fields: Partial<typeof settings>) {
  void saveSettings({ ...settings, ...fields });
}
```
```tsx
// PriceListAdminPage.tsx:36-45
function commit(next: PriceList) {
  void savePriceList({ ...next, modositva: new Date().toISOString().slice(0, 10) });
}
function patchItem(id: string, patch: Partial<Tetel>) {
  commit({ ...priceList, tetelek: priceList.tetelek.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
}
```
Mindkét helyen a bázis (`settings`/`priceList`) a hívó **render pillanatában**
érvényes closure-értékből jön, nem egy functional updaterből, és az írás maga
`async` (`AppState.tsx:70-77`: `await storage.save*(); setX();`). Két gyors,
egymás után induló módosítás (pl. két különböző mező `onChange`-e ugyanabban a
billentyű-eseményben, vagy egy `★`/`👁` ikon gyors dupla kattintása,
`PriceListAdminPage.tsx:159-168,206-215`) mindkét closure ugyanazt a régi
`priceList`-et látja, ha a második hívás azelőtt indul, hogy az első
`setPriceList` lefutott volna — a második írás felülírja az elsőt, elveszítve
azt a mezőváltozást. `localStorage`-dzsal ez a művelet gyakorlatilag azonnal
felold (mikrotask), így ma nehezen reprodukálható; egy valódi lemez-write
latenciájával (2. fázis, `FileSystemStorage`) ez már reális adatvesztési
forgatókönyv.

### Explicit negatív megállapítás — 2. kategória (fetch cleanup)

Ebben a kódbázisban **nem találtam** olyan async effektet, ahol egy régebbi
válasz felülírna egy újabbat cancel-flag/AbortController nélkül. A három
adatbetöltő effekt mindegyike gondosan takarít:
- `state/AppState.tsx:34-49` — `cancelled` flag, `if (cancelled) return;` a
  `setState` hívások előtt.
- `pages/PreviewPage.tsx:29-64` — `cancelled` flag, ugyanez a minta, két
  párhuzamos `loadOrFallback` hívásra is kiterjed.
- `pages/PlanHistoryPage.tsx:29-59` — `cancelled` flag, bár ld. 5. találat: a
  hibaágon a flag-ellenőrzés soha nem is fut le, mert a promise-lánc korábban
  elszáll — ez hibakezelési hiány, nem cancel-race.

## Mit nem néztem át

- `app/src/pdf/**` (kivéve `TervDocument.tsx` átfutása az `osszesitok`
  kereszthivatkozás miatt) — ez `@react-pdf/renderer` primitíveket használ, nem
  a kért 7 kategória tárgya (nincs benne `useEffect`/state-hook).
- `app/src/domain/**`, `app/src/storage/paths.ts`, `app/src/storage/seed/**` —
  tiszta függvények, React-hook nélkül, kívül esnek a kérés hatókörén.
- `*.test.tsx`/`*.test.ts` fájlok — csak annyiban néztem, hogy egy-egy találat
  meglévő lefedettségét ellenőrizzem (2., 7. találat), teszthelyesség general
  review-ja nem volt cél.
- Akadálymentesség, teljesítmény, stílus — a feladat kizárólag a 7 megadott
  helyességi kategóriára szólt.
- Böngésző-specifikus viselkedés (pl. tényleges `localStorage` kvótahatár
  Chrome/Edge-ben, `usePDF` viselkedése valódi hálózati betűtípus-letöltéssel)
  — ezekhez a `App.test.tsx:20-34` amúgy is kimockolja a `usePDF`-et, így a
  3. találat böngészőben ellenőrizendő, teszttel nem igazolható vissza.

## Hol vagyok bizonytalan

- **8. találat gyakorlati elérhetősége**: a mai egyetlen-route SPA-architektúrában
  nem találtam olyan felhasználói úton, ahol `available` (tehát `priceList`
  vagy `currency`) változna, miközben a `PlanEditorPage` `ItemPicker`-je nyitva
  van *ugyanabban a munkamenetben, felhasználói interakció nélkül* — ezért
  soroltam P2-be "csak jövőbeli forgatókönyvvel", nem P1-be. Ha van olyan út,
  amit nem vettem észre (pl. böngésző több fül között megosztott
  `localStorage`-eseménnyel szinkronizál — ilyen listener-t viszont nem
  találtam a kódban), ez P1-re emelkedhet.
- **12. találat súlyossága ma**: mivel a `DemoStorage` írásai gyakorlatilag
  szinkronok (nincs valódi I/O-várakozás), nem tudtam kézzel reprodukálni a
  race-t a mai kódon egy egyszerű duplakattintással — a `finding` architekturális
  kockázatként áll, nem igazolt mai búgként, ezért P2, nem P1.
- **7. találat DOM-fókusz mellékhatása**: leírtam, hogy a `q`/`hi` állapot
  átkerül a rossz fázisra, de nem futtattam le böngészőben/teszttel, hogy a
  kereső `<input>` DOM-fókusza pontosan hol landol a törlés utáni
  újraegyeztetéskor (React DOM-reconciliation input-fókusz-öröklése
  kulcsegyezés esetén jellemzően megtartja a fókuszt az adott pozíción) — a
  funkcionális következmény (rossz fázisba kerülő tétel) szerintem
  vitathatatlan, a fókusz vizuális részlete bizonytalan.
