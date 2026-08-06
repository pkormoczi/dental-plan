# Adatbeolvasási és -feldolgozási audit — `app/src`

Csak olvasó review, kód nem módosult. Vezérkérdés: hol kerülhet be rossz szám úgy,
hogy a UI-on (vagy a nyomtatott PDF-en) hihetőnek látszik.

**Van P0 és P1 találat is** — nem kellett kimondanom az ellenkezőjét.

Fontos kontextfelismerés: ennek az appnak **nincs backend, nincs API, nincs
fájlfeltöltős import a futó kódban** (CLAUDE.md "Architektúra"). Az egyetlen
valódi Excel-import egyszeri, repón kívüli, történelmi esemény volt
(`docs/06-arlista-import.md`), a scriptje nincs a repóban — ma már csak
`data/arlista.seed.json` a nyoma. Ezért a "külső adat" itt gyakorlatilag két
dolgot jelent: (1) ez a build-időben beimportált statikus JSON, és (2) az orvos
billentyűzetes bevitele az Árlista adminban és a terv szerkesztőben — ami a
sémák szerint ugyanúgy "külső" a domain-logikához képest, mint egy fájlimport
volna, és pontosan úgy landol a `terv.json`/`arlista.json`-ban, amit évekig
olvasnak vissza (D18). A `FileSystemStorage` (2. fázis) még nem létezik, tehát a
végleges fájlrendszeres betöltési útvonalat nem lehetett auditálni — ami itt
`localStorage`-ban History van, az lesz `terv.json`/`arlista.json` a lemezen.

## Adatút-térkép

```
data/arlista.seed.json  (build-time JSON import, típusellenőrzés nélkül: "as PriceList")
  └─ storage/seed/priceList.ts:8            [NINCS validáció — bare cast]
       └─ DemoStorage.resetDemoData()        JSON.stringify → localStorage  [nincs validáció]
            └─ DemoStorage.loadPriceList()   JSON.parse → assertKnownSchemaVersion  [CSAK a schemaVersion számot ellenőrzi]
                 └─ AppState.priceList (memória)
                      ├─ PriceListAdminPage.tsx   [ÍRÁSI pont #1 — ld. lent]
                      ├─ PlanEditorPage.tsx (ItemPicker/addLine)  basePrice()/formatPrice()
                      └─ TervDocument.tsx (PDF)   formatMoney() — nincs isFinite/sign guard

Orvos billentyűzete (Árlista admin: HUF fix/sávos, EUR cent)
  └─ PriceListAdminPage.tsx onChange → Number(e.target.value)   [NINCS min/isFinite guard]
       └─ patchItem() → commit() → savePriceList()  [MINDEN billentyűleütésre azonnal ír, nincs debounce/commit-határ]
            └─ localStorage (== "a fájl")  → visszakerül az AppState-be, de nem parse-olva újra

Orvos billentyűzete (terv szerkesztő: mennyiség, tényleges egységár, fogak)
  └─ PlanEditorPage.tsx onChange
       ├─ mennyiseg: Math.max(1, Number(v)||1)          [guardolt]
       ├─ tenylegesEgysegar: Number(v)||0                [NINCS min/isFinite guard — 0-ra esik]
       └─ fogak: parseTeeth() csak UI-hint, nem blokkol, nem dedupol
  └─ setPlan (structuredClone) → memória-only piszkozat (IndexedDB sincs, szándékos)
       ├─ totals.ts: sorOsszeg/fazisOsszeg/computeOsszesitok  [NINCS Number.isFinite sehol]
       ├─ Summary (élő újraszámolás, PlanEditorPage.tsx:75-76)
       └─ TervDocument.tsx (PDF) — SAJÁT reduce-implementáció, nem totals.ts-t hívja,
            de ugyanazt a képletet ismétli (látszatra konzisztens, de két hely)

Véglegesítés (PreviewPage.finalize)
  └─ computeOsszesitok(plan.fazisok) → finalPlan.osszesitok   [csak ÍRÁSKOR számol, ELLENŐRZÉS nélkül]
       └─ storage.savePlan()  [race: listVersions→nextVersionNumber→assertVersionDirAvailable
                                nem atomi, ld. 5. találat]
            └─ localStorage.setItem(terv.json)
                 └─ storage.loadPlan() JSON.parse → assertKnownSchemaVersion  [CSAK verziószám]
                      └─ PlanHistoryPage "Megnyitás szerkesztésre" → loadPlanIntoDraft(plan)
                           └─ vissza a PlanEditorPage-be — `plan.osszesitok` mezőt SENKI nem
                              hasonlítja össze az élőben újraszámolt összeggel (ld. 6. találat)
```

**Validáció, ami tényleg létezik:** `schemaVersion` szám elleni felső-korlát ellenőrzés
(`domain/schema.ts`), a `mennyiseg` mező alsó korlátja (`Math.max(1, …)`), a
fogszám-formátum reguláris kifejezése (`teeth.ts`), és a véglegesítéskor futó
két megerősítő dialógus (hiányzó páciensadat, hiányzó német tételnév). Ezeken
túl **nincs futásidejű séma-/típusvalidáció** (nincs zod/valibot/kézi guard) egyetlen
`JSON.parse` határon sem, és **nincs `Number.isFinite`/előjel-ellenőrzés** egyetlen
pénzösszeg-számításban sem.

## Findings

### P0 — néma, hihető rossz szám a UI-on/PDF-en

**1. A "Sávos → fix" váltás csak a HUF árat konvertálja; az EUR ár szerkezetileg
soha nem lehet SAVOS, a doki tudta nélkül némán FIX-re csúszik — ez pont a
D15 jogi védelmet kerüli meg.**

`app/src/pages/PriceListAdminPage.tsx:266-285`
```tsx
function toggleType() {
  const next: Ar =
    savos && hufAr?.tipus === 'SAVOS'
      ? { tipus: 'FIX', ertek: hufAr.min }
      : { tipus: 'SAVOS', min: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0, max: hufAr?.tipus === 'FIX' ? hufAr.ertek : 0 };
  onPatch({ ar: { ...item.ar, HUF: next } });   // <- csak HUF-ot ír
}
...
function setEur(ertek: number | null) {
  onPatch({ ar: { ...item.ar, EUR: ertek == null ? null : { tipus: 'FIX', ertek } } });  // <- MINDIG FIX
}
```
és `app/src/pages/PriceListAdminPage.tsx:330-338` — az EUR mezőnek nincs
min/max párja, csak egyetlen szám input, ami `item.ar.EUR?.tipus === 'FIX'`
esetén mutat értéket (SAVOS EUR állapotot nem is tudna megjeleníteni).

**Konkrét forgatókönyv:** egy addig FIX árú tétel (pl. HUF 350 000, EUR 950)
kezelési köre bizonytalanná válik. A doki az admin adatlapon rákattint
"Fix → sávos"-ra, kitölti a HUF "tól/ig" mezőt (pl. 300 000–450 000 Ft), de az
EUR mezőt nem bántja (miért is bántaná — nem is lát rajta sávos vezérlőt).
Mentés után `item.ar = { HUF: {tipus:SAVOS,...}, EUR: {tipus:FIX, ertek:950} }`.
Egy német nyelvű (EUR) ajánlatban ez a tétel `PlanEditorPage.tsx:52-67`
`addLine()`-ban `ar.tipus === 'SAVOS' ? ... : ar.ertek` ágon FIX-ként landol,
`savos:false` sorral. A PDF-en (`TervDocument.tsx:233`, `:315`) **nincs `*`
jelölés és nincs sávos lábjegyzet** — a német páciens egy kötelező érvényű,
csupasz fix árat lát pontosan ott, ahol a magyar változat jogilag kötelezően
`*`-ot és lábjegyzetet kap (CLAUDE.md "Sérthetetlen szabályok", D15 sor).

**2. Az EUR ár mezőt centben kell megadni, de a UI-n semmi sem védi ki a
"euróban gépelek" tévesztést — egy elgépelt tized bead egy hiteles, de
100×-osan téves árat.**

`app/src/pages/PriceListAdminPage.tsx:330-338`
```tsx
<Field label="EUR ár (cent)">
  <input
    type="number"
    value={item.ar.EUR?.tipus === 'FIX' ? item.ar.EUR.ertek : ''}
    ...
    onChange={(e) => setEur(e.target.value === '' ? null : Number(e.target.value))}
  />
</Field>
```
**Konkrét input:** a doki egy 45 eurós tételnél a mezőbe `45`-öt ír (mert
pénzben gondolkodik, nem centben) `4500` helyett. `formatMoney` ezt
minden further ellenőrzés nélkül szépen formázza: `formatPrice({tipus:'FIX',
ertek:45}, 'EUR')` → **"0,45 €"** (`money.ts:12-19`). Se `Number.isFinite`, se
alsó-plauzibilitási határ (pl. "ez az összeg gyanúsan alacsony egy fogászati
beavatkozáshoz") nem szól közbe — egy 45 eurós tétel 45 centes ajánlatként
kerülhet be a nyomtatott dokumentumba, teljesen hihető formázással.

### P1 — reprodukálható bug lépéssorral

**3. A terv szerkesztőben a "Tényleges" egységár mező üresre törlése némán
0-ra állítja a sor árát — nincs alsó korlát, nincs megerősítés.**

`app/src/pages/PlanEditorPage.tsx:370-374`
```tsx
<input
  type="number"
  value={line.tenylegesEgysegar}
  onChange={(e) => onPatch({ tenylegesEgysegar: Number(e.target.value) || 0 })}
```
Lépések: egy felvett soron a "Tényleges" mezőt kijelölöd (pl. Ctrl+A a
mezőben) és törlöd, hogy új kedvezményes árat gépelj be. Az `onChange` már az
üres string állapotra is lefut: `Number('') || 0` → `0`. Ha ekkor bármi
megszakítja a gépelést (kattintás máshova, tab, böngésző-autosave-jellegű
esemény), a sor ára némán **0 Ft/€**-ra ragad, és `totals.ts` (`sorOsszeg`,
`computeOsszesitok`) ezt minden további kérdés nélkül beleszámolja a
véglegesített összegbe. Nincs `min={0}` attribútum, nincs "ez a sor most 0" —
csak a `discount` jelvény vált zölden 100%-ra, ami könnyen "szép nagy
kedvezmény"-ként olvasható gyors görgetésnél, nem hibaként.

**4. Ugyanez a némán-nullázódó minta az Árlista adminban, PLUSZ minden
billentyűleütés azonnal ír a "fájlba" — nincs debounce, nincs commit-határ.**

`app/src/pages/PriceListAdminPage.tsx:36-38, 274-285, 341-370`
```tsx
function commit(next: PriceList) {
  void savePriceList({ ...next, modositva: new Date().toISOString().slice(0, 10) });
}
...
function setFixPrice(ertek: number) {
  onPatch({ ar: { ...item.ar, HUF: { tipus: 'FIX', ertek } } });
}
...
onChange={(e) => setFixPrice(Number(e.target.value))}   // '' -> Number('') -> 0, guard nélkül
```
A HUF fix/sávos ár mezőknek szintén nincs `min` attribútuma és nincs üres-string
guardja — törlés közben (mielőtt a doki begépelné az új számjegyeket) a mező
`0`-t ér, és ez **azonnal** `savePriceList()`-tel a törzsárlistába kerül
(`patchItem` → `commit` minden `onChange`-nél fut, nincs "Mentés" gomb, nincs
blur-alapú commit). Konkrét forgatókönyv: a doki egy 150 000 Ft-os tételt akar
180 000-re módosítani, kijelöli a mezőt, törli, és a böngészőlap véletlenül
frissül/bezárul, mielőtt begépelné a `180000`-t — a törzsárlistában innentől
minden jövőbeli páciensnek **0 Ft**-tal ajánlható ez a tétel, amíg valaki
véletlenül észre nem veszi.

**5. `savePlan()` versenyhelyzetben némán felülírja egy már véglegesített
verziómappa tartalmát — a D4 "verziómappát soha nem írunk felül" garancia
pontosan a race conditon esetén sérül csendben.**

`app/src/storage/DemoStorage.ts:186-207`
```ts
async savePlan(plan: Plan, pdf: Uint8Array): Promise<PlanRef> {
  ...
  const existingVersions = await this.listVersions(patientDir);      // (1) olvasás
  const existingDirNames = existingVersions.map((v) => v.dirName);
  const verzio = nextVersionNumber(existingDirNames);
  const versionDir = buildVersionDirName(plan.keltezes, verzio);
  assertVersionDirAvailable(existingDirNames, versionDir);           // (2) ellenőrzés a (1) alapján
  ...
  localStorage.setItem(planKey(patientDir, versionDir), JSON.stringify(finalPlan)); // (3) írás
```
A (1)-(2)-(3) lépések között nincs zárolás. `PreviewPage.tsx:97` `finalize()`
`setSaving(true)`-t **await előtt, szinkron módon** állítja be — ha a
"Véglegesítés és mentés" gombra két kattintás esik egymás után gyorsan (mielőtt
React újrarendereli a `disabled={busy}` állapotot), mindkét `finalize()` hívás
átjut a `busy` ellenőrzésen, mindkettő ugyanazt a `existingVersions`-t olvassa,
mindkettő ugyanazt a `versionDir`-t (pl. `2026-08-06_v3`) számolja ki, és a
második `setItem` **némán felülírja** az első verzió `terv.json`-ját és PDF-jét
— `VersionConflictError` nem dobódik, mert az ellenőrzés a felülírás előtti,
elavult állapoton futott. Ez pontosan az az eset, amit a CLAUDE.md "Sérthetetlen
szabályok" táblázata (D4) explicit kizárni akar egy aláírt dokumentumnál.

**6. A CLAUDE.md szerint kötelező "`osszesitok` a fájlból számít igaznak,
eltérés esetén figyelmeztetni kell" szabálynak nincs sehol implementációja —
`computeOsszesitok` csak ÍR, sosem OLVAS-össze.**

`app/src/domain/totals.ts` egyetlen hívási helye véglegesítéskor:
`app/src/pages/PreviewPage.tsx:129-133`
```ts
const finalPlan = {
  ...plan,
  statusz: 'VEGLEGES' as const,
  osszesitok: computeOsszesitok(plan.fazisok),   // csak felülír, nem hasonlít össze
};
```
Sehol a kódbázisban (`PlanHistoryPage.tsx:65-69` betöltéskor, `DemoStorage.
loadPlan:170-178`) nincs olyan lépés, ami egy **betöltött** `terv.json` `sorok`
tartalmából újraszámolná az összeget és összevetné a fájlban tárolt
`osszesitok`-kal. Konkrét forgatókönyv: egy véglegesített `terv.json` (akár
kézi szerkesztéssel, akár egy Google Drive "conflicted copy" hibás
összefésüléséből) úgy sérül, hogy egy sor `tenylegesEgysegar` mezője
eltér attól, amire az `osszesitok.fizetendo` utal. "Korábbi tervek" →
"Megnyitás szerkesztésre" megnyitja a szerkesztőbe; a szerkesztő **élőben**,
a `sorok`-ból újraszámol (`fazisOsszeg`), tehát a képernyőn már a
(sérült) új összeg látszik, de **semmilyen figyelmeztetés nem jelzi**, hogy ez
eltér az eredetileg aláírt/mentett `osszesitok`-tól. Egy újbóli véglegesítés
csendben felülírja a régi (esetleg helyes) összeget az újjal.

**7. A JSON-betöltési határokon nincs futásidejű típus-/alakvalidáció — bare
`as X` castok viszik át a struktúrát, a `null` csendben nullázódik szorzásban.**

`app/src/storage/DemoStorage.ts:170-178, 214-220, 226-232` és
`app/src/storage/seed/priceList.ts:8`
```ts
const plan = JSON.parse(raw) as Plan;              // nincs shape-ellenőrzés
assertKnownSchemaVersion(plan, 'terv.json');        // csak a schemaVersion számot nézi
...
export const seedPriceList: PriceList = raw as PriceList;   // build-time bare cast
```
Ha egy jövőbeli árlista-újraimport vagy egy kézzel javított `terv.json` egy
mezőt kihagy vagy `null`-ra állít ott, ahol a típus number-t ígér (pl.
`"tenylegesEgysegar": null` egy sérült sorban), a JS `*` operátor **nem dob
hibát**: `null * 3 === 0`. A sor összege csendben 0-ra esik, és — mivel
`totals.ts`-ben sincs `Number.isFinite` ellenőrzés — ez a 0 minden további
kérdés nélkül belefolyik `computeOsszesitok`-ba. (Ha a mező `undefined` lenne
`null` helyett, `NaN` keletkezne, ami a `formatMoney`-n át legalább látványosan
"NaN Ft"-ként buknék ki — a `null` eset a veszélyesebb, mert **teljesen néma**.)

### P2 — kockázat konkrét forgatókönyvvel

**8. Egyik pénzösszeg-mezőnek sincs `min` attribútuma vagy előjel-ellenőrzése
— egy elgépelt mínusz némán negatív árat ment.**

`app/src/pages/PriceListAdminPage.tsx:330-370` (mind az 5 ár-input),
`app/src/pages/PlanEditorPage.tsx:370-374`. Példa: az admin "HUF ár" mezőjébe
`-50000`-t gépelve (natív `type="number"` input ezt engedi, nincs `min={0}`)
az árlistában ez a tétel `formatMoney(-50000, 'HUF')` → **"-50 000 Ft"**-ként
jelenik meg, és minden olyan összegzésben, ahova bekerül, csendben *csökkenti*
az összeget ahelyett, hogy növelné — vizuálisan nem hibás, csak nagyon
meglepő, ha valaki nem néz oda.

**9. A SAVOS min/max mezők függetlenül szerkeszthetők, `min > max`-ra nincs
validáció; `basePrice()` ekkor is vakon a `min`-t adja vissza.**

`app/src/domain/money.ts:32-35` + `app/src/pages/PriceListAdminPage.tsx:341-360`.
Ha az admin a "tól" mezőt nagyobbra állítja, mint az "ig"-et (pl. tól=450 000,
ig=300 000 — sorrendben szerkesztve, útközben elfelejtve visszaellenőrizni),
`formatPrice` "450 000 Ft–300 000 Ft"-ot ír ki (ez még feltűnő), de
`basePrice()` (`PlanEditorPage.addLine` ezt használja kiinduló egységárnak)
továbbra is a `min` mezőt (450 000) adja alapértékként — vagyis a "tól" ár, amit
a doki olcsóbbnak szánt, ténylegesen a drágább szám lesz a soron, észrevétlenül.

**10. `parseTeeth` nem dedupol — egy elgépelt duplikált fogszám átmegy a
mennyiség-egyezés ellenőrzésén, és csendben kétszer számláz egy fogat.**

`app/src/domain/teeth.ts:12-17` + `app/src/pages/PlanEditorPage.tsx:321-322,397-401`.
Példa: a "Fog" mezőbe `16, 16` kerül `16, 17` helyett (elgépelés). `parseTeeth`
mindkét tokent érvényesnek látja (`teeth: ['16','16']`, `valid:true`), a
darabszám 2 — ha a doki a "Db" mezőt is 2-re állítja (mert két fogat hisz
kezelni), a `mismatch` figyelmeztetés **nem** szólal meg (`teeth.length ===
mennyiseg`), pedig valójában csak egy fogról van szó duplikálva, a másik
kezelés pedig hiányzik/nem létezik.

**11. Osztás nullával a kedvezmény-jelvény számításában — `-Infinity%` tud
megjelenni, jelezve, hogy a pénz-pipeline sehol nem véd `Number.isFinite`-tal.**

`app/src/pages/PlanEditorPage.tsx:323-326`
```ts
const discount =
  line.tenylegesEgysegar < line.listaEgysegar
    ? Math.round((1 - line.tenylegesEgysegar / line.listaEgysegar) * 100)
    : 0;
```
Ha `listaEgysegar` 0 (pl. a 3./4./8. találat valamelyike már lenullázta az
árlistában, majd a sort ez után vették fel), és `tenylegesEgysegar` negatív
(8. találat), `1 - x/0` `Infinity`-t ad, `Math.round(Infinity*100)` is
`Infinity` — a jelvény "−Infinity%"-ot ír ki. Önmagában látványos (nem néma),
de bizonyíték arra, hogy a teljes ár/kedvezmény-pipeline-ban nincs egyetlen
`Number.isFinite` védelem sem — ha egy jövőbeli forgatókönyv ezt egy csendesebb
helyre (pl. `formatMoney`) tolja el, ott már néma lenne.

**12. A kezdeti betöltés (`AppStateProvider`) nincs try/catch-csel vagy
error boundary-vel védve — egy `SchemaVersionError` vagy JSON-szintaxishiba
örökre a "Betöltés…" képernyőn hagyja az appot, hibaüzenet nélkül.**

`app/src/state/AppState.tsx:34-49`, nincs `ErrorBoundary` az `App.tsx`-ben.
```ts
useEffect(() => {
  ...
  (async () => {
    const [s, pl] = await Promise.all([storage.loadSettings(), storage.loadPriceList()]);
    ...
  })();
```
Ha a `loadPriceList()` a `SchemaVersionError`-t dobja (pontosan azt az esetet,
amit a D18 szabály "érthető üzenettel" kíván megtagadni), az itt egy elkapatlan
promise-elutasítás, amit semmi nem jelenít meg a felhasználónak — nem "néma
rossz szám", hanem néma teljes megakadás, de mivel a D18-nak pont az a
lényege, hogy *látható* üzenetet adjon, ez a hiányzó védőháló ide tartozik.

## Mit nem néztem át

- A tényleges Excel→JSON importáló scriptet — **nincs a repóban**, csak a
  `docs/06-arlista-import.md` leírás róla; a mai `data/arlista.seed.json`-t
  programmatikusan átfésültem (mind a 118 tétel `ertek`/`min`/`max` mezőjének
  típusát, előjelét, és a SAVOS min≤max relációt), de az eredeti `.xls`-t vagy
  az importlogikát nem.
- A `ui/*.jsx` prototípusfájlokat — CLAUDE.md szerint explicit nem szállított
  kód, referenciának szánva, ezért kihagytam.
- `FileSystemStorage` — még nem létezik (2. fázis), ezért a majdani valódi
  fájlrendszeres betöltési utat nem lehetett auditálni, csak a `PlanStorage`
  interfészen keresztül tesztelhető `DemoStorage`-ot.
- `ToothChartPdf.tsx`, `markdownLite.ts`, `pdf/labels.ts` — vizuális/szöveges
  renderelés, nincs bennük pénz- vagy mennyiségi aggregáció, csak átfutottam.
- A tényleges böngésző-viselkedést élesben nem futtattam le (nincs UI-teszt
  ebben a menetben) — a `type="number"` input és a dupla kattintásos race
  minden állítása a forráskód logikájából levezetett, nem manuálisan
  reprodukált.

## Hol vagyok bizonytalan

- **5. találat (race condition):** logikailag levezethető a kódból (nincs
  zárolás a listVersions→write között, a `disabled={busy}` React state-frissítés
  nem szinkron), de nem futtattam le ténylegesen két gyors kattintást a
  böngészőben — lehet, hogy a React 18 esemény-batching valamilyen módon
  szűkebbre zárja az ablakot, mint amit a kódolvasásból feltételezek.
- **`type="number"` input garanciái:** feltételeztem, hogy Chrome/Edge (a
  céltámogatott böngészők, CLAUDE.md "File System Access API") natív
  number inputja mindig `''`-t vagy tiszta, `.`-tizedesjeles számstringet ad
  `e.target.value`-ban, tehát a "vessző mint tizedesjel" (2. checklist-pont,
  `parseFloat("1234,56")`) itt strukturálisan nem tud becsúszni ezeken a
  mezőkön. Ha bármelyik input valójában `type="text"` lenne egy általam
  átnézetlen variánsban, ez a védelem nem érvényesülne — de a `Grep` minden
  `type="number"` előfordulást megtalált, ezt nem hiszem, hogy elnéztem.
- **12. találat súlyossága:** határeset, hogy ez inkább "néma megakadás", mint
  "néma rossz adat" — a feladatleírás a látványos crash-t nem kéri, ez sem az,
  de nem is klasszikus "hihető rossz szám" a UI-on. P2-be tettem emiatt, bár
  a D18 szabály explicit szövege miatt közel áll a P1-hez.
- A 6. találatnál nem tudom biztosan, hogy a véglegesítés-előtti tervezői
  szándék szerint a `osszesitok`-összevetésnek hol kellett volna megjelennie
  (PlanHistoryPage listanézetben? PreviewPage megnyitáskor?) — csak azt tudom
  megerősíteni, hogy **sehol** nincs implementálva, a pontos tervezett helyét
  nem ismerem.
