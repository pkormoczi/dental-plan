# Backlog 93. tétel — A legnagyobb komponensfájlok felbontása — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 93. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A backlog korábbi „KIDOLGOZÁSRA VÁR" listája már jelezte, hogy három
komponensfájl felelősségei szét vannak csúszva; a méretük azóta tovább
nőtt:

| Fájl | Akkor | Ma | Tartalom |
|---|---|---|---|
| `app/src/pages/PlanEditorPage.tsx` | 2132 sor | **2249** | 8 komponens + 2 tiszta helper, nulla named export |
| `app/src/pages/PriceListAdminPage.tsx` | 1116 sor | **1476** | 6 komponens, nulla named export |
| `app/src/pdf/TervDocument.tsx` | 567 sor | **751** | 190 soros stílusobjektum + 6 komponens |

A fájdalom konkrét, nem esztétikai:

- a `fokuszCel` fókusz/scroll-mechanizmus DOM-id-jei (`fog-${pi}-${li}`,
  `nev-`, `leiras-`, `kereso-`, `fazis-nev-`, `fazis-megjegyzes-`) négy
  helyen string-duplikáltak — a JSX-ben, a fókusz-effektben, a tesztben és
  a `CLAUDE.md`-ben; nincs közös id-építő;
- a `PhaseSection` 25 propot kap, ebből 12 a szülő JSX-ében, renderenként
  újra létrehozott inline arrow, több közülük saját
  `updatePlan(draft => …)` írási logikát tartalmaz — nem a szülő
  megnevezett handlerében;
- az árlista adminban két, egymás mellett élő dirty-modell (soronkénti
  azonnali `commit` vs. a kategóriapanel pufferelt `useDirtyDraft`-je)
  ugyanabban a fájlban;
- a `TervDocument` 190 soros `s` stílusobjektuma a fájl negyede, a 80 kulcs
  blokkonkénti hovatartozása csak olvasással deríthető ki.

A cél viselkedésmegőrző refaktorálás és világos modulhatárok kialakítása —
nem önmagában a fájlok sorszámának csökkentése.

## Kiindulási állapot (mérve)

- `npm test`: 89 fájl / 1690 teszt, mind zöld (~95 s) — ez a refaktor
  egyetlen elfogadási kritériuma.
- Mindhárom fájl kizárólag a default komponenst exportálja; a repóban
  egyetlen import sem hivatkozik belső szimbólumukra.
- Mindhárom fájl tesztjei a teljes lapot renderelik, role/text/label
  alapján kérdeznek, egyik sem importál alkomponenst.
- A `dokumentacioGuard.test.ts` fájlpath szerint számolja a
  `D<szám>`/`DP-<szám>` komment-hivatkozásokat egy baseline JSON-hoz
  mérve (`app/src/dokumentacioGuard.baseline.json`); a mai értékek:
  `PlanEditorPage.tsx` 51, `.test.tsx` 25, `PriceListAdminPage.tsx` 12,
  `.test.tsx` 12, `TervDocument.tsx` 5, `.test.tsx` 3. Egy új fájlpath
  baseline-ja implicit 0, tehát minden kiemelés elbuktatja ezt a tesztet,
  amíg a baseline nem követi a mozgást.

## Döntések

### 1. Egy tétel, három ütemben

A 93. tétel mindhárom fájlt lefedi, de az implementáció három, egymás
után futó ütem: `PlanEditorPage` → `PriceListAdminPage` → `TervDocument`,
egymás után, feature-munka közbeékelése nélkül.

**Miért:** a `PlanEditorPage.tsx` churnje magas (az utolsó ~20 commitból
15 hozzányúlt) — egy párhuzamos feature-ág rebase-e itt drága lenne.
Elvetett alternatíva: három külön backlog-tétel — elvetve, mert a három
fájl azonos jellegű problémára (nagy, óriás felelősségű komponensfájl)
ugyanazon döntési keretet (modulhatár-elv, tesztstratégia,
`dokumentacioGuard` bánásmód) osztja, aminek háromszori újratárgyalása
felesleges lenne.

### 2. Kiemelés + a fájl-lokális tiszta logika `domain/`-be

A komponensek a `pages/<lap>/` (ill. `pdf/tervDocument/`) alá költöznek, a
fájl-lokális **tiszta** logika `domain/`-be, saját unit teszttel. A
React-állapot elrendezése, a hookok sorrendje és a renderelt DOM
változatlan.

**Miért:** ez adja a legjobb adósság/kockázat arányt — a puszta mechanikus
kiemelés (semmi domain-be) a „világos modulhatárok" célt csak részben
teljesítené, mert az árlista-szűrés (`illeszkedik`/`keep`) és a fázis-
sorrend matematikája (`movePhase`/`deletePhase` index-átírása) ma
`eslint-disable exhaustive-deps` mögé rejtett closure, aminek helyessége
csak a lap-szintű teszteken át bizonyítható.

### 3. A viselkedésmegőrzés kemény határai

Ezek **nem** részei a refaktornak:

- `useCallback`, `React.memo`, `useMemo`-bővítés bevezetése — a jelenlegi
  kód szándékosan memoizálatlan; a `fokuszCel`-effekt, a
  `fazisResetToken`/`sorResetToken` remount-tokenek és a `commit()`
  szinkron recept-futása friss olvasásokra épül.
- `useReducer`/lap-szintű Context bevezetése a prop-drilling helyett.
- Bármely DOM `id`, `aria-label`, `aria-controls`, `role`, látható szöveg
  vagy táblázat-oszlopszám változása.
- A hookok hívási sorrendjének megváltoztatása a szülőkomponensben.

**Miért:** a mérhető bizonyíték a változatlan tesztek zöldje — ha a
tesztek és a kód is egyszerre változik, ez a bizonyíték elvész. A
memoizáció külön, saját profilozással alátámasztandó tétel; ma nincs mért
teljesítményprobléma. Elvetett alternatíva: „ha már hozzányúlunk, tegyük
is helyre a prop-drillinget" (`PhaseSection` 25 propja context mögé) —
elvetve, mert a `fokuszCel`/`fazisCsukva` index-átírásos szemantikája
(törléskor reindexel, mozgatáskor cserél) pont attól olvasható ma, hogy
propként látszik, hol dől el.

### 4. Ütemenként két lépés: előbb kód, aztán teszt

Minden ütem két külön commit:

- **A lépés — kiemelés.** A komponensek/logika új fájlba kerülnek, a
  tesztfájlokhoz egyetlen karakter sem nyúl. Elvárás: `npm test` zöld
  (1690+), a tesztfájlok diffje üres, `npm run build` és `npm run lint`
  tiszta.
- **B lépés — tesztbontás.** Csak ezután bomlanak a tesztfájlok a
  komponens-seam mentén.

**Miért:** a tesztfájlok bontása önmagában feláldozná a „a teszt nem
változott" bizonyítékot. A kétlépéses sorrend megtartja: az A lépés
commitja a viselkedésmegőrzés gépi bizonyítéka, a B lépés már csak
tesztszervezés, ahol a `npm test` darabszáma (fájlonként és összesen) az
invariáns. Elvetett alternatíva: egy commit mindkettővel — elvetve, mert
egy elrontott kiemelés és egy elrontott teszt-átköltöztetés nem
különböztethető meg a diffben.

### 5. Modulhatár: három réteg

- **`domain/`** — tiszta, React-mentes logika, saját unit teszttel.
- **`pages/<lap>/`** (ill. `pdf/tervDocument/`) — a lap saját, máshonnan
  nem hívott komponensei; nem `components/` alá kerülnek („második
  hívóra emel" elv — egy komponens csak akkor kerül a megosztott
  `components/` alá, ha ténylegesen két különböző LAP hívja).
- **A szülő fájl** — az orchestráció: az az állapot, aminek a
  remount-tokenek/összecsukás miatt a feltételes render fölött kell
  élnie, a storage/router-hozzáférés, és a dialógusok.

**Miért:** ez a repo már meglévő mintája (`pages/tervReszletei/`,
`pages/settings/`, `pages/demo/fileTree/`), nem új konvenció.

### 6. `PlanEditorPage.tsx` felbontása (2249 → cél ~420)

Új fájlok `app/src/pages/planEditor/` alatt (a meglévő `ItemPicker.tsx`
mellé): `PlanEditorHeader.tsx`, `PhaseSection.tsx` (+ `UndoRow` ugyanitt),
`FazisMegjegyzes.tsx`, `LineRow.tsx`, `Summary.tsx`,
`EgyediVegosszegBlokk.tsx`, `ElolegBlokk.tsx`, `elemIdk.ts`.

`UndoRow` szándékosan a `PhaseSection.tsx`-ben marad — egy
`<Table.Row colSpan={7}>`, ami kizárólag a `PhaseSection` táblatörzsében
érvényes, külön fájlban azt sugallná, hogy önállóan használható.

Az `elemIdk.ts` a `FokuszCel` típust és a nyolc id-építőt tartalmazza
(fog, név, leírás, kereső, fázis-kereső, fázis-név, fázis-megjegyzés,
fázis-panel) — az előállított stringek bájtra változatlanok. Precedens:
`sorElemId()` a `tervReszletei/SorReszlet.tsx`-ben.

**Miért az id-modul:** az id-ek ma négy helyen íródnak le egymástól
függetlenül (JSX, fókusz-effekt, teszt, dokumentáció) — ez az egyetlen
pont a fájlban, ahol egy elgépelés némán, teszt nélkül törne el egy
UX-invariánst. A kiemelés emellett kényszer is: `LineRow` és a
fókusz-effekt a szétvágás után külön fájlba kerül, közös forrás nélkül a
duplikáció megkövesedne.

`domain/`-be költöző tiszta logika, saját unit teszttel:

- **`domain/sorMezok.ts`** — a sor-mezők tétel-alapú és egyedi-sor
  változata. Kötelező, nem opcionális: mindkettőt hívja a szülő
  (sor hozzáadása) és a `LineRow` inline tétel-keresője — a szétvágás
  után két modulból, tehát közös helyre kell.
- **`domain/fazisSorrend.ts`** — a fázis-mozgatás és -törlés
  index-matematikája: a fázistömb cseréje a generált nevek pozíció
  szerinti frissítésével, a sorszám újraszámozása, és az
  összecsukott-fázisok halmazának reindexelése törléskor / cseréje
  mozgatáskor.

**Miért a `fazisSorrend`:** ez ma a fájl legfinomabb, kizárólag közvetve
(lap-szintű teszteken át) fedett index-logikája — kézzel átírt fázisnevet
érintetlenül kell hagynia, generáltat frissítenie, és két külön szabály
szerint kell bánnia az összecsukott-fázisok halmazával.

A fókusz/scroll-effekt egy hookba kerül, ugyanabban a hívási pozícióban.
Az összecsukható célokra (leírás, fázis-megjegyzés) vonatkozó
`requestAnimationFrame`-ágnak meg kell tartania, hogy a fókuszcél nullázása
az animációs kereten belül fut — enélkül a gyerek már nem látja a nyitást
kényszerítő propot.

### 7. `PriceListAdminPage.tsx` felbontása (1476 → cél ~470)

Új fájlok `app/src/pages/priceListAdmin/` alatt (a meglévő
`TomegesArDialog.tsx` / `UjTetelDialog.tsx` mellé): `ItemEditor.tsx`,
`KategoriaPanel.tsx` (a panel + a panel-törzs + a kategória-szerkesztő
együtt, egy fájlban), `BufferedFields.tsx`.

A kategória-hármas egy fájlban marad: a dirty-állapot szándékosan
kettévágott (a „van piszkozat" jelző a panelben, hogy túlélje a záráskori
unmountot; maga a piszkozat a törzsben, hogy záráskor eldobódjon,
effektussal szinkronizálva fölfelé) — ez a protokoll csak akkor olvasható,
ha egy fejléc-komment mindkét felét egy helyen magyarázza.

A `BufferedFields.tsx` lapmappa-szintű, nem `components/`, mert mindkét
hívója ezen a lapon van.

`domain/arlistaSzures.ts` — a keresési-illeszkedés és a
„nyitott sor sosem esik ki a szűrőből" predikátum tiszta függvényként,
unit teszttel, a szűrő-típussal együtt.

**Miért:** ez a két függvény ma `eslint-disable exhaustive-deps`-szel
ellátott `useMemo`-k mögött él closure-ként — a disable pontosan azért
kell, mert nem tiszta függvények. Paraméterezve a disable is elhagyható,
és a „nyitott sor kivétel" szabály tesztelhetővé válik.

Sérülékeny invariánsok, amiket a kiemelés nem sérthet:

- a mentő-függvény a receptet szinkron futtatja; az új kategória és az új
  tétel felvitele ezen keresztül csempészi ki az újonnan generált
  objektumot/id-t — semmi nem kerülhet közéjük, ami ezt késleltetné;
- az új tétel mentése után egy szándékos egy-render késleltetés van a
  Radix Dialog FocusScope-ja miatt;
- a „várakozik az első árra" prop + callback + a szerkesztő belső refje
  hárompontos protokoll szülő és gyerek között, a számmező „csak
  tényleges változásra commitol" viselkedésének blur-fallbackjével együtt;
- a tétel- és kategória-szerkesztő sorok DOM-id-je változatlan marad.

A táblázat-sor kiemelése a megvalósító mérlegelésére bízott, nem előírt.

### 8. `pdf/TervDocument.tsx` felbontása (751 → cél ~280)

Új `app/src/pdf/tervDocument/` alkönyvtár (precedens a második szintre:
`pages/demo/fileTree/`): `styles.ts` (a stílusobjektum), `Chrome.tsx`
(fejléc-változatok + lábléc), `PhaseTable.tsx`, `Markdown.tsx` (a
mini-markdown inline/blokk renderelők).

A `styles.ts` egy fájl marad, nem blokkonként háromfelé vágva — a 80
kulcsból 16 megosztott a három nyomtatványblokk között, és a szétvágás
ezeket vagy duplikálná, vagy egy negyedik „közös" fájlt szülne. A kulcsok
blokkonként csoportosítva és kommentelve kerülnek át, hogy a hovatartozás
olvasható legyen anélkül, hogy a stíluslista szétesne.

A szülőben marad a derivációs prológus (címkék, összegek, fogtérkép,
placeholder-feloldás, szakasz-láthatósági kapcsolók, dokumentumszintű
lábléc-magasság) és a három oldalblokk vázlata a pénzügyi összesítéssel és
az aláírásblokkal együtt.

**Miért nem megy szét a pénzügyi összesítés és az aláírásblokk is:**
mindkettő szorosan a saját oldal-pagination-szemantikájához kötött, és a
meglévő teszt pont ezt a szerkezetet méri egy erre szolgáló attribútumon
át. A cél sorszám nélkülük is teljesül.

### 9. A tesztfájlok bontása (B lépés ütemenként)

Két, egymást kiegészítő eszköz — a választás azon múlik, hogy a komponens
önállóan renderelhető-e:

- **Ko-lokált komponensteszt** a lapmappa alatt — azokra, amik
  prop-tiszták (nincs storage/router/context-függésük), pl. `ElolegBlokk`,
  `EgyediVegosszegBlokk`, `Summary`, `PlanEditorHeader`. A render-harness
  lapszintűről komponensszintűre igazodik, a meglévő
  `tervReszletei/FazisokBlokk.test.tsx` mintáján.
- **Témás testvér-tesztfájl** a lap mellett — azokra, amik nem
  renderelhetők önállóan (pl. `LineRow`, `PhaseSection` — táblasort adnak
  vissza, csak a szülő táblatörzsében érvényesek). A describe-blokkok
  bájtra változatlanul költöznek át, a lapot továbbra is teljes egészében
  renderelve. Ez a projekt saját, már működő konvenciója
  (`PriceListAdminPage.leiras.test.tsx`,
  `PriceListAdminPage.tomegesAr.test.tsx`).

**Invariáns:** a `npm test` összes teszt-darabszáma pontosan ugyanannyi
marad (plusz az új `domain/` unit tesztek), és egyetlen tesztfüggvény
törzse sem íródik át a render-harness-cseréjén kívül.

**Miért nem lett minden teszt komponensszintűvé alakítva:** a lap-szintű
tesztek nagy része pont az integrációt méri (a keresőciklus, a
fogtérkép-kattintás → sor létrejötte → fókusz, a nyelvi review vezetett
körbejárása) — ezek komponensszintre bontva pont azt veszítenék el, amiért
íródtak.

### 10. `dokumentacioGuard.baseline.json` — átkönyvelés

Minden ütem A lépésében a baseline JSON térképe követi a mozgást: az új
fájlpathok megkapják a ténylegesen odakerült D-hivatkozás-számot, a
forrásfájlok száma csökken. A kommentek szövege nem íródik át. A
döntéstábla-blokk (sorszám/legnagyobb szám) érintetlen — ez a tétel nem
hoz létre és nem használ fel új döntés-azonosítót.

**Miért:** a guard szándéka a döntés-azonosító-termelés leállítása, nem
egy meglévő komment mozgásának tiltása. Egy fájl kettévágása nem „új
hely", a repo összesített száma nem nő. Elvetett alternatíva: a mozgatott
kommentek hivatkozásainak átírása néven megnevezett `docs/0X`
szakaszra — valódi adósságcsökkentés lenne, de kommentenként egyedi
mérlegelést kíván (a `PlanEditorPage.tsx` 51 hivatkozásából több
redesign-azonosító, amihez nincs élő docs-szakasz), és prózaátírást
keverne egy viselkedésmegőrző refaktorba, elmosva a diff olvashatóságát.
Önálló tételként bármikor felvehető.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `PreviewPage.tsx`, `TervReszleteiPage.tsx`, `components/
  PatientPlanChains.tsx`, `storage/DemoStorage.ts` — nincsenek a tétel
  hatókörében.
- A `pages/demo/OsszesTervSection.test.tsx` és `PreviewPage.test.tsx`
  bontása — a hozzájuk tartozó komponens nem bomlik, tehát nincs seam,
  ami mentén értelmes lenne.
- Teljesítmény-optimalizálás, memoizáció (lásd 3. döntés).
- `storage/seed/plans.ts` — generált seed-adat, nem komponens.
- A mozgatott kommentek D-hivatkozásainak `docs/0X` szakaszra írása
  (lásd 10. döntés elvetett alternatívája) — önálló tételként felvehető.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` → `app/src/pages/planEditor/*`
- `app/src/pages/PriceListAdminPage.tsx` → `app/src/pages/priceListAdmin/*`
- `app/src/pdf/TervDocument.tsx` → `app/src/pdf/tervDocument/*`
- `app/src/domain/sorMezok.ts`, `app/src/domain/fazisSorrend.ts`,
  `app/src/domain/arlistaSzures.ts` — új tiszta domain-modulok
- `app/src/dokumentacioGuard.baseline.json` — fájlpath-átkönyvelés
  ütemenként
- `CLAUDE.md` „Meglévő segédfüggvények" — a `sorMezokEgyedibol`/
  `sorMezokTetelbol`, `ElolegBlokk`, `KategoriaPanel`/
  `KategoriaPanelBody`, `MdInline`, `movePhase`, `patchLine`, a fog-id
  minta forrása és a `fokuszCel` hivatkozásainak útvonal-frissítése
- `docs/07-felulet-rendszer.md`, `docs/03-funkcionalis-spec.md` — a
  „Megvalósítás:" útvonalak frissítése, ahol a felelősség ténylegesen
  máshova költözött
- `docs/01-attekintes-es-dontesek.md` — a döntéstábla érintetlen marad
  (lezárt, történeti napló; a benne szereplő fájlnevek azt rögzítik, hol
  állt a kód a döntés meghozatalakor)

## Tesztelés (irányadó, nem kimerítő)

Minden A lépés után: `npm run build`, `npm run lint`, `npm test` (89
fájl / 1690+ teszt zöld), és `git diff --stat` a tesztfájlokra üres kell
legyen.

Kézi ellenőrzés `npm run dev` alatt, ütemenként — a tesztkészlet
strukturálisan nem éri el ezeket:

1. **Terv szerkesztő:** a kereső-ciklus (gépel → nyíl → Enter → a kereső
   kiürül és visszakapja a fókuszt), majd egy fogtérkép-kattintás egy
   kezeletlen fogra → az új sor keresője kap fókuszt és a lap odagördül.
2. **Terv szerkesztő:** két fázissal — a második fázis „fel" nyila, majd
   egy fázis törlése; az összecsukott állapotok a helyükön maradnak, a
   generált „N. kezelés" nevek átszámozódnak, a kézzel átírt név nem.
3. **Terv szerkesztő:** az előleg Ft/% módváltója, majd a fizetendőt
   meghaladó összeg → inline hard error, az érték nem vágódik le.
4. **Árlista admin:** „+ Új tétel" mentés után a lista a friss tételre
   gördül, az szerkesztőre nyílik, és az első HUF-ár beírása aktiválja
   (0 érték esetén megerősítést kér).
5. **Árlista admin:** a Kategóriák panelben egy átnevezés után navigáció a
   NavBaron → a „nem mentett módosítás" megerősítő dialógus előjön.
6. **PDF:** egy két fázisú, leírásokat és német nyelvet használó terv
   előnézete — fejléc, folytatás-fejléc a 2. oldalon, lábléc-oldalszám,
   fizetési feltételek + garancia szakasz, aláírásblokk nem szakad el a
   nyilatkozat utolsó bekezdésétől.
