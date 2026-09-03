# Backlog 95. tétel — Egységes piszkozat-felülírás védelem minden „új terv" belépési ponton — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 95. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A `docs/03-funkcionalis-spec.md` § 5. „A négy terv-létrehozási út" négy olyan
akciót nevez meg, ami az EGYETLEN globális, mentetlen piszkozatot (`Új verzió`,
`Másolás új tervbe`, `Új terv`, `+ Új kezelési terv`) felülírja. A védelem ma
három különböző módon van megvalósítva:

- a `components/PatientPlanChains.tsx` és a `pages/TervReszleteiPage.tsx` a
  megosztott `usePlanVersionActions().inditas()`-t hívja
  (`domain/planVersionActions.ts` `kellMegerosites()`/`megerositesTartalom()` +
  `components/PlanVersionActionDialog.tsx`);
- a `pages/NewPlanPage.tsx` egy párhuzamos, saját `AlertDialog`-ot és saját
  `pendingSpecs` szövegtáblát tart, a `kellMegerosites()` megkerülésével;
- a `pages/PatientDetailPage.tsx` `startFirstPlan()`-je — a terv nélküli
  páciens üres-állapotának „+ Új terv" gombja — **egyáltalán nem véd**:
  megerősítés nélkül hívja a `copyPlanIntoDraft`-ot.

A harmadik eset a legsúlyosabb, és nem elméleti: az üres állapot pontosan akkor
renderel, amikor `latestOverall === null && sajatAktivDraft === null`, vagyis ha
van mentetlen piszkozat, az szükségszerűen **egy MÁSIK pácienshez** tartozik. A
doki B páciens félkész tervén dolgozik, átnavigál A páciens (terv nélküli)
lapjára, megnyomja a „+ Új terv"-et — és B munkája szó nélkül eltűnik. A
piszkozat nem került fájlba (`DraftStorage`, `docs/05-technologia.md` §
Piszkozat-autosave), tehát nincs honnan visszaszerezni.

A második eset nem adatvesztés, hanem drift-kockázat: két, egymástól függetlenül
karbantartott szövegtábla ugyanarra a kérdésre — pontosan az a helyzet, aminek
elkerülésére a `domain/planVersionActions.ts` létrejött.

## Döntések

### 1. A meglévő megosztott réteg bővül, nem születik új primitív

Mind a négy belépési pont a `usePlanVersionActions` hookot és a
`PlanVersionActionDialog`-ot használja. A `pages/NewPlanPage.tsx` saját
`AlertDialog`-ja, `pending` state-je és `pendingSpecs` táblája törlődik; a
`pages/PatientDetailPage.tsx` `startFirstPlan()`-je a hookon keresztül fut.

**Miért:** a `domain/planVersionActions.ts` fejléc-kommentje már ma kimondja a
célt — „hogy a megerősítő dialógus szövege és a piszkozat-felülírás-őr feltétele
ne driftelhessen szét két hívóhely között". A `NewPlanPage` párhuzamos
megoldása ezt a garanciát csendben már fel is törte. Egy ötödik, saját
mechanizmus helyett a meglévő bővítése a kevesebb új fogalom.

Elvetett alternatíva — **új, vékony `usePiszkozatGuard()` primitív** a
`useDiscardGuard` (`components/DiscardChangesDialog.tsx`) mintáján, ami csak a
„kell-e megerősítés + milyen szöveggel" kérdést tudja, az akciókat a hívóknál
hagyva: ez a hívóknál hagyta volna az „új terv indítása egy páciensből"
láncot (`ujTervForrasPaciensbol` → `copyPlanIntoDraft` → `/paciens`), ami ma
már három helyen áll ott — a duplikáció megmaradt volna, csak a dialógus
egységesült volna.

Elvetett alternatíva — **minimális folt**: csak a `PatientDetailPage` áll át, a
`NewPlanPage` marad a sajátjával. Ez a tétel kimondott kérését („egyetlen közös
védelmi út mind a négy belépési ponton") nem teljesíti.

### 2. Négy `kind`, nem öt — a NewPlanPage találati sora is `'ujTerv'`

A `PendingKind` marad `'open' | 'copy' | 'ujTerv'`, plusz egy új `'ujPaciens'`.
A `NewPlanPage` találati sora (meglévő páciens kiválasztása) NEM kap saját
kindot: ugyanaz az `'ujTerv'`, amit a `PatientPlanChains` páciens-fejléce és a
`PatientDetailPage` üres állapota is használ.

**Miért:** a `NewPlanPage` `selectExistingPatient()`-je és a hook
`ujTervPaciensAdataival()`-ja betű szerint ugyanaz a lánc
(`ujTervForrasPaciensbol` → `copyPlanIntoDraft` → `navigate('/paciens')`) —
egyedül a `patientDir` forrása tér el, amit a 3. döntés opcionális
`action.patientDir`-je kezel. Ebből következik, hogy a `NewPlanPage` mai, alig
eltérő szövege („Ha ennek a páciensnek az adataival új tervet indítasz…")
eltűnik a közös `'ujTerv'` szöveg javára („Ha a páciens adataival új tervet
indítasz…"). Ez elfogadható veszteség: a képernyőn a doki épp most választott
ki egy nevet a listából, a kontextus a dialóguson kívül adott.

Elvetett alternatíva — külön `'ujTervPacienssel'` kind a névre utaló szöveggel:
öt kind és két, egymástól egy szóban eltérő megerősítő szöveg, amik idővel
külön életet kezdenek élni — pont a tétel által megszüntetni kívánt drift.

### 3. A `patientDir` akció-szintre költözik, hook-szintű alapértékkel

A hook ma kötelező `patientDir` argumentumot kap, és minden akciója ezzel
dolgozik. Ez a `NewPlanPage`-en nem működik: ott a célpáciens soronként más, a
quick-create ágon pedig még nem is létezik. A `PendingAction` ezért opcionális
`patientDir` mezőt kap, és a feloldás `action.patientDir ?? <hook-szintű
alapérték>`; a hook argumentuma opcionálissá válik.

**Miért:** a `PatientPlanChains` és a `TervReszleteiPage` egy konkrét páciens
kontextusában él, ott a hook-szintű kötés a helyes és tömörebb — a
`NewPlanPage` viszont páciens-választó, ott az akció hordozza a célt. A két
igény egy `??` feloldással kiszolgálható, nincs szükség két hookra.

Az `'open'`/`'copy'` kindnak továbbra is szüksége van feloldott `patientDir`-re
(a `storage.loadPlan()`/`loadPatientData()` hívásokhoz); ezeket csak
hook-szintű kötéssel rendelkező hívók használják, tehát a gyakorlatban a
feloldás sosem üres. Az `'ujPaciens'` kind egyáltalán nem használ
`patientDir`-t.

### 4. A quick-create ág megerősítése a dialógus MEGNYITÁSA előtt marad

A `'ujPaciens'` kind megerősítése ott fut, ahol ma: még a quick-create
(`UjPaciensDialog`) megnyitása előtt.

**Miért:** ez a `docs/03-funkcionalis-spec.md` § „Új terv indítása — a köztes
páciens-választó" ma kimondott viselkedése — ez a döntés tehát **megőrzi, nem
módosítja** a spec-et. A megerősítés valóban korai (ha a doki a quick-create
ablakban Mégsé-t nyom, a piszkozat mégsem veszett volna el), de nem hazudik:
azt kérdezi, amire a doki éppen rábólint.

Elvetett alternatíva — a megerősítés áthelyezése a `storage.createPatient()`
UTÁNRA, ahol ténylegesen elveszne a piszkozat: ekkor egy Mégse után egy **árva
páciensrekord** maradna a lemezen, terv nélkül. A `paciens-adatok.json` a saját
mezőire system of record (`docs/02-domain-modell.md` § Páciens-szintű
törzsadat), tehát egy véletlen üres rekord nem semleges melléktermék — és a
törlése a `PatientDetailPage` törlés-őrén keresztül külön munka lenne. A korai
kérdés a kisebb rossz.

### 5. Az `'ujPaciens'` akciót a hook egy opcionális callbackkel adja vissza a hívónak

A `'ujPaciens'` kind egyetlen tényleges hatása a quick-create dialógus
megnyitása — ami a `NewPlanPage` helyi state-jében él (`ujOpen`, `ujNev`,
`createError`), a duplikáció-ellenőrzéssel (`usePaciensDuplikacio`) és a
submit-hibával együtt. A hook ezért egy opcionális `onUjPaciens` callbacket
fogad az opciói között, és a `'ujPaciens'` dispatch-e ezt hívja. A többi hívó
nem adja át, és nem is használja ezt a kindot.

**Miért:** a quick-create dialógus a `NewPlanPage`-hez tartozó, nem
megosztható felület — a hookba költöztetése egy páciens-létrehozó dialógust
kényszerítene rá a `PatientPlanChains`/`TervReszleteiPage` hívókra is, semmilyen
haszonért. A `kind` viszont a megosztott rétegben KELL, hogy legyen: a
megerősítő szöveg („Ha új tervet indítasz, ez elvész…") ugyanaz a szövegtábla
kell legyen, mint a többié.

Elvetett alternatíva — általános `apply` paraméter az `inditas`-on, amivel
bármelyik hívó tetszőleges függvényt futtathat a védett úton: ez a
`useDiscardGuard` alakja felé driftel, és feladja azt a garanciát, hogy a
`docs/03` § 5. „négy terv-létrehozási út"-ja egyetlen, felsorolható helyen
látszik.

### 6. A hook külön `inditas` (védett) és `futtat` (már megerősített) belépési pontot ad

A quick-create dialógus UTÁN két út indít tervet — a sikeres
`storage.createPatient()` és a dialógus „Mégis ez a meglévő páciens"
(`onUseExisting`) ága —, és ezeknél a megerősítés a 4. döntés szerint MÁR
lefutott. Ezek ezért a hook `futtat(action)` belépési pontját hívják, ami a
`kellMegerosites()`-t megkerülve azonnal dispatch-el; a `megerosit()` ma is
pontosan ezt teszi, csak befelé.

**Miért:** enélkül a két post-dialógus út vagy másodszor is megkérdezné a
dokit ugyanarról, vagy — a mai állapotot megőrizve — továbbra is a
`NewPlanPage` helyi `selectExistingPatient()`-jét hívná, és az „új terv
indítása egy páciensből" lánc két helyen maradna. A `futtat` a modul
fejléc-kommentjében kap egy mondatot arról, hogy KIZÁRÓLAG már megerősített
útra való — nem a védelem megkerülésének általános eszköze.

### 7. A folyamatban-lévő állapot a hookba költözik, `PendingAction` alakban

A hook ma csak `hiba`-t ad vissza. A `NewPlanPage` `selectingDir`-je és a
`PatientDetailPage` `startingPlan`-je ugyanazt a „fut az async betöltés"
állapotot jelenti, két külön helyi state-ben. A hook ezért egy `fut` mezőt is
ad, ami nem boolean, hanem az ÉPP FUTÓ `PendingAction` (vagy `null`).

**Miért:** a `NewPlanPage`-nek soronkénti letiltás kell (`fut?.patientDir ===
p.dirName`), a többi hívónak elég a puszta „fut valami" (`fut !== null`) — egy
`PendingAction | null` mező mindkettőt kiszolgálja, egy boolean csak az
utóbbit. A `NewPlanPage`-nek különben meg kellene tartania a `selectingDir`
state-jét, és két, egymással szinkronban tartandó jelző maradna.

### 8. A `PatientDetailPage` két, egymást kizáró hook-példányt tart

A `PatientDetailPage` „Kezelési tervek" tabja vagy az üres állapotot rendereli
(0 lánc és nincs saját aktív draft), vagy a `PatientPlanChains`-t — a kettő
soha nincs egyszerre a DOM-ban. A `PatientPlanChains` a saját
`usePlanVersionActions` példányát tartja (ezt a `standalone` hívó,
`OsszesTervSection` miatt nem lehet elvenni tőle); az üres állapot ezért a
`PatientDetailPage`-en kap egy sajátot.

**Miért:** a hook egyetlen közös példányra hozása azt jelentené, hogy a
`PatientPlanChains` propként kapja az akciókat — ami a komponens ma zárt,
példányonként független interakciós state-jét (`docs/03-funkcionalis-spec.md`
§ 5.) nyitná fel két hívó kedvéért. Két, egymást kizáróan renderelő példány
nem okoz sem dupla dialógust, sem versenyt.

A `PatientDetailPage` mai `startError` state-je és `Callout`-ja helyére a hook
`hiba` mezője lép (`planDir: null`/`versionDir: null`, azaz lap-szintű hiba) —
a `PatientPlanChains`/`TervReszleteiPage` már ma is így jeleníti meg az
`ujTerv` hibáját.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `Home.tsx` „+ Új kezelési terv" CTA-ja.** Feltétel nélkül navigál az
  `/uj-terv`-re — szándékos és kimondott (`docs/03-funkcionalis-spec.md` § 1.
  Indítás): ott a piszkozat még nem veszik el, a védelem a köztes választón dől
  el. Változatlan marad.
- **Az aktív-draft blokk „Folytatás" gombja és teljes kattintható felülete**
  (`PatientPlanChains`, `Home`). Szándékosan megkerüli az őrt — a saját draft
  folytatása nem felülírás (`docs/03-funkcionalis-spec.md` § 5. „Aktív draft a
  listán"). Változatlan marad.
- **Az explicit „Piszkozat eldobása"/„Piszkozat elvetése" dialógusok**
  (`Home.tsx` mindkét változata, `PlanEditorPage.tsx`). Ezek nem
  terv-létrehozó akciók, hanem célzott elvetések a saját megerősítésükkel.
- **A D38/D46 dirty-navigation guard** (`useDiscardGuard`/`NavGuardContext`).
  Más domaint véd (a `PatientDetailPage`/`SettingsPage` félbehagyott
  űrlap-szerkesztését), és a `CLAUDE.md` kimondja, hogy a piszkozat-felülírás
  guardokra szándékosan nincs ráállítva. Ez a tétel nem hozza össze a kettőt.
- **A `historical` másolás figyelmeztetése.** A `kellMegerosites()` második,
  piszkozattól független oka változatlan marad — ez a tétel csak a
  piszkozat-ághoz nyúl.
- **Az árva páciensrekord takarítása** (ha a doki a quick-create után mégsem
  indít tervet). A 4. döntés éppen azért tartja a megerősítést korán, hogy ez
  ne álljon elő ezen az úton; a `PaciensekPage` „+ Új páciens" gombja
  szándékosan hoz létre terv nélküli pácienst, az nem hiba.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/planVersionActions.ts` — `PendingKind` bővítése
  (`'ujPaciens'`), `PendingAction` opcionális `patientDir`/`nev` mezője, a
  `'ujPaciens'` bejegyzés a szövegtáblában. A `kellMegerosites()` logikája
  változatlan.
- `app/src/components/PlanVersionActionDialog.tsx` — a hook opciós
  argumentumra állítása (`patientDir?`, `onUjPaciens?`), `futtat` és `fut`
  kivezetése, a `patientDir` akció-szintű feloldása.
- `app/src/pages/NewPlanPage.tsx` — a saját `AlertDialog`, `pending` state,
  `pendingSpecs`, `runOrConfirm`, `dispatchPending`, `selectExistingPatient`,
  `selectingDir`, `selectError` elbontása a hook javára; a `PlanVersionActionDialog`
  bekötése; az `onUjPaciens` callback átadása.
- `app/src/pages/PatientDetailPage.tsx` — `startFirstPlan()` helyén
  `inditas({ kind: 'ujTerv' })`, a `startingPlan`/`startError` helyi state
  elbontása, a `PlanVersionActionDialog` renderelése az üres állapot mellett.
- `app/src/components/PatientPlanChains.tsx`, `app/src/pages/TervReszleteiPage.tsx`
  — csak a hook hívási alakja változik (`patientDir` → `{ patientDir }`).
- `app/src/domain/planVersionActions.test.ts` — az új kind lefedése.
- `app/src/pages/NewPlanPage.test.tsx`, `app/src/pages/PatientDetailPage.test.tsx`
  — a felülírás-őr viselkedésének lefedése.

## Tesztelés (irányadó, nem kimerítő)

1. **A tétel magja.** Indíts tervet B páciensnek, írj bele valamit (legyen
   mentetlen piszkozat). Navigálj egy terv NÉLKÜLI A páciens részletoldalára,
   „Kezelési tervek" tab → „+ Új terv". Megerősítő dialógusnak kell jönnie;
   Mégse után B piszkozata érintetlen (a Kezdőlapon továbbra is ott a
   „Piszkozat folytatása" kártya), megerősítés után A adataival nyílik a Terv
   adatai lap.
2. **`NewPlanPage`, meglévő páciens.** Mentetlen piszkozattal az `/uj-terv`
   találati során: ugyanaz a dialógus, mint az 1. pontban (azonos cím, szöveg
   és gombfelirat — a régi, „Folytatás, piszkozat elvetésével" felirat eltűnik).
3. **`NewPlanPage`, quick-create.** Mentetlen piszkozattal a „+ Új páciens"
   gomb: a megerősítés a quick-create ablak megnyitása ELŐTT jön. Mégse után
   nem nyílik ablak, a piszkozat él. Megerősítés + a quick-create ablak
   Mégséje: nem jön létre páciens, a piszkozat MÉG mindig él.
4. **Nincs dupla kérdés.** Mentetlen piszkozattal végigvitt quick-create
   (megerősítés → adatok → Mentés): a `createPatient` után NEM jön második
   dialógus, egyenesen a Terv adatai lapra visz.
5. **Duplikáció-ág.** Ugyanez az „Mégis ez a meglévő páciens" gombbal a
   quick-create duplikáció-javaslataiból: szintén nincs második kérdés.
6. **Busy állapot.** Az `/uj-terv` listán kattintás közben csak a KATTINTOTT
   sor tiltódik le, a többi nem.
7. **Regresszió.** Piszkozat NÉLKÜL mind a négy út dialógus nélkül fut le; a
   historical másolás figyelmeztetése piszkozat nélkül is megjelenik, és a
   gombja nem piros.
8. `cd app && npm test && npm run build && npm run lint`.
