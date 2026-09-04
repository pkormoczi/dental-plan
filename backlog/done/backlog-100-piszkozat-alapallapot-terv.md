# Backlog 100. tétel — „Piszkozat folytatása” csak tényleges szerkesztés után — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 100. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `vanMentetlenPiszkozat` (`app/src/state/AppState.tsx`) képlete
`piszkozatTartalmas(plan) && plan !== mentettPlan`. A `copyPlanIntoDraft`
MINDEN hívásánál `mentettPlan: null`-t állít be, szándékosan — ez helyes egy
teljes terv-másolatnál („Másolás új tervbe”, `planMasolatKent()`), de HIBÁS
a puszta törzsadat-előtöltésnél (`ujTervForrasPaciensbol()` eredménye): egy
MEGLÉVŐ páciens kiválasztása a „Új terv indítása” lapon (`NewPlanPage.tsx`
`selectExistingPatient`) így azonnal „mentetlen piszkozatnak” minősül, mielőtt
a doki bármit is szerkesztett volna — a `piszkozatTartalmas()` már a nem üres
`paciens.nev`-re igazat ad. A Kezdőlap „Piszkozat folytatása” kártyája emiatt
minden puszta páciens-átnézésre felvillan, ami idővel leszoktatja a dokit a
kártya komolyan vételéről.

Kontrasztként a `loadPlanIntoDraft` (Korábbi tervek megnyitása) MÁR MA
helyesen viselkedik: `mentettPlan`-t a friss `plan`-nel azonos referenciára
állítja, ezért a képlet csak TÉNYLEGES szerkesztés (új `plan`-referencia)
után vált igazra — ezt teszt is rögzíti (`AppState.test.tsx` „kontrasztként
loadPlanIntoDraft után vanMentetlenPiszkozat hamis”).

## Döntések

### 1. A `copyPlanIntoDraft` két hívás-típusa eltérően viselkedik

A `copyPlanIntoDraft`-nak innentől explicit döntenie kell hívásonként, hogy a
kapott `next` Plan-t **tiszta alapállapotként** (a `loadPlanIntoDraft` mintája:
`mentettPlan` a `next`-tel azonos referenciára áll, `vanMentetlenPiszkozat`
azonnal hamis) vagy **azonnal védett tartalomként** (a MAI, változatlan
viselkedés: `mentettPlan: null`) kell-e kezelnie.

- **Tiszta alapállapot** — a törzsadat-előtöltés (`ujTervForrasPaciensbol()`
  eredménye) mindhárom hívása: `NewPlanPage.tsx` `selectExistingPatient`,
  `PatientDetailPage.tsx` `startFirstPlan`,
  `PlanVersionActionDialog.tsx` `ujTervPaciensAdataival`.
- **Azonnal védett** (VÁLTOZATLAN) — `PlanVersionActionDialog.tsx`
  `copyVersion` (`planMasolatKent()` eredménye, „Másolás új tervbe”).

**Miért:** a két hívás-típus tartalmilag nagyon eltér. A törzsadat-előtöltés
csak névvel/születési dátummal/telefonnal stb. tölti ki a draftot — ezt a
doki egy gombnyomással bármikor újra elő tudja állítani (ugyanaz a páciens
ismételt kiválasztásával), tehát elvesztése nem valódi adatvesztés. A teljes
terv-másolat ezzel szemben egy MÁSIK terv teljes fázis/sor-struktúráját hozza
át — ez a `AppState.test.tsx` meglévő tesztje szerint MA IS azonnali
védelmet kap, és a backlog-100 szövege kifejezetten csak a „páciens puszta
kiválasztása” esetet panaszolja, a másolást nem. A hármat egységesen tiszta
alapállapotúvá tenni (elvetett alternatíva) konzisztensebb elvet adna
(„minden `copyPlanIntoDraft` csak tényleges szerkesztés után számít
mentetlennek”), de szükségtelenül szűkítené a védelmet egy olyan esetben,
amit a backlog nem kért, és a meglévő tesztet is át kellene írni indokolatlanul
— ez explicit hatókör-bővítés lenne, nem a bejelentett hiba javítása.

### 2. A megkülönböztetés mechanizmusa: kötelező, explicit paraméter

A `copyPlanIntoDraft` minden hívási helyén EXPLICIT döntést kell hozni (nem
egy alapértelmezett, néma default), hogy az adott `next` alapállapotnak vagy
azonnal védett tartalomnak számít-e.

**Miért:** a kódbázisban van már erre minta — a `formatMoney`/`formatLongDate`
`nyelv` paramétere is szándékosan kötelező, mert egy alapértelmezett érték
elrejtene egy kihagyott hívási helyet. Egy opcionális paraméter, ami a MAI
(„azonnal védett”) viselkedésre esne vissza alapból (elvetett alternatíva),
kevesebb hívóhelyet igényelne most, de egy jövőbeli új hívó némán a rossz
(túl-védő VAGY túl-engedékeny) oldalra csúszhatna, ha elfelejti kitölteni —
ez pont az a fajta hiba, amit ez a tétel javít.

### 3. A törzsadat-előtöltés autosave-je (crash-recovery) nem gyengül

A `copyPlanIntoDraft` „tiszta alapállapot” ága NEM változtatja meg, hogy a
draft mikor íródik ki a `DraftStorage`-ba (mockupban `localStorage`) — az
autosave írási trigger (`AppState.tsx` írási `useEffect`-je) a
`piszkozatTartalmas(plan)`-ra épül, ami a törzsadat-előtöltés után is IGAZ
marad (a `paciens.nev` nem üres). Kizárólag a `vanMentetlenPiszkozat` — a
UI-nagging és a felülírás-elleni `AlertDialog`-ok vezérlője — vált hamisra.

**Miért:** ezt explicit ki kell mondani, mert könnyen félreérthető úgy, hogy
a „tiszta alapállapot” azt jelentené, hogy a draft nem is perzisztálódik. A
crash-recovery (böngésző-újratöltés utáni visszaállítás) így is működik: egy
hidegindításkori visszaállításnál a `mentettPlan` mindig `null`-ra áll
(lásd az induló betöltés-effektust), tehát a visszaállított draft — akár
törzsadat-előtöltésből, akár szerkesztésből származott — MINDIG azonnal
védettnek számít újraindítás után. Ez konzisztens a `loadPlanIntoDraft`
meglévő aszimmetriájával (tiszta a memóriában, védett újraindítás után), nem
új viselkedés.

### 4. A „Másolás új tervbe” meglévő tesztje és a hozzá tartozó doc-komment változatlan

Az `AppState.test.tsx` `describe('copyPlanIntoDraft', ...)` blokkjának
meglévő tesztjei (a `planMasolatKent`-alapú „copy” gombra épülők) NEM
változnak — ezek továbbra is `vanMentetlenPiszkozat === true`-t várnak el
azonnal a másolás után. Az `AppStateValue.copyPlanIntoDraft` JSDoc-kommentje
(„a most kapott `next` MÉG SOHA nincs elmentve... `vanMentetlenPiszkozat`
azonnal igaz”) pontosítást igényel: ez a mondat mostantól csak az „azonnal
védett” ágra igaz, nem minden hívásra.

**Miért:** ez nem külön döntés, hanem az 1. döntés következménye — csak azért
kap saját pontot, hogy a megvalósító tudja: a meglévő teszt- és
kommentkarbantartás KÖTELEZŐ RÉSZE ennek a tételnek, nem mellékes takarítás.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A „Másolás új tervbe” (`planMasolatKent`) viselkedésének megváltoztatása.**
  Lásd 1. döntés — ez a hívás MARAD azonnal védett, a backlog-100 nem ezt
  panaszolja, és a meglévő teszt sem ezt várja.
- **A `loadPlanIntoDraft` bármilyen módosítása.** Az MA IS helyesen
  viselkedik, referencia-alapú összevetéssel — ez a tétel csak ugyanezt a
  MÁR BEVÁLT mintát terjeszti ki a `copyPlanIntoDraft` egyik ágára, nem
  vezet be új mechanizmust.
- **A `piszkozatTartalmas()` (`domain/piszkozat.ts`) tartalmi
  szabályainak módosítása** (mit számít „tartalmas”-nak). A hiba nem abban
  van, hogy a törzsadat-előtöltésű Plan „tartalmasnak” minősül (helyesen az,
  hiszen a `paciens.nev` valódi adat) — hanem abban, hogy a `mentettPlan`
  referencia rossz alapállapotot ad neki. A `piszkozatTartalmas()`
  változatlan marad.
- **A `useDirtyDraft`/`draftDirty()` (`components/useDirtyDraft.ts`) tényleges
  újrafelhasználása vagy módosítása.** A backlog-szöveg ennek a MINTÁJÁT
  („kiindulási pillanatkép összevetése”) kéri, nem a szó szerinti
  JSON.stringify-alapú mély-egyenlőség bevezetését. Ez a kódbázis
  mindenütt immutable-update fegyelmet követ (`setPlan` minden hívása új
  objektumreferenciát hoz létre), ezért a referencia-alapú összevetés — amit
  a `loadPlanIntoDraft` már ma is bizonyítottan helyesen használ — elégséges;
  egy párhuzamos mély-egyenlőségi ág felesleges duplikáció lenne.
- **Az `AlertDialog` szövegek módosítása** a négy fogyasztó helyen
  (`Home.tsx`, `NewPlanPage.tsx`, `PatientDetailPage.tsx`,
  `PlanVersionActionDialog.tsx`). Ezek mind a `vanMentetlenPiszkozat`
  flag-re épülnek — a flag helyes értéke önmagában megoldja a problémát,
  szövegmódosítás nélkül.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/state/AppState.tsx` — az `AppStateValue.copyPlanIntoDraft` interfész
  és implementációja (a `mentettPlan` beállítása); a JSDoc-komment
  pontosítása a 4. döntés szerint.
- `app/src/pages/NewPlanPage.tsx` `selectExistingPatient` — az új paraméter
  átadása „tiszta alapállapot” értékkel.
- `app/src/pages/PatientDetailPage.tsx` `startFirstPlan` — ugyanaz.
- `app/src/components/PlanVersionActionDialog.tsx` `ujTervPaciensAdataival`
  — ugyanaz; a `copyVersion` (planMasolatKent-ág) VÁLTOZATLAN marad.
- `app/src/state/AppState.test.tsx` — a meglévő `describe('copyPlanIntoDraft',
  ...)` blokk hívásai (a Probe komponens `copy` gombja) a hívóhely-szintű
  paraméter-bővítés miatt frissülnek, de az elvárt eredmény (`dirty: true`)
  NEM változik. Új teszteset(ek) kellenek a törzsadat-előtöltés (baseline)
  ágra — a `loadPlanIntoDraft`-ot igazoló „kontrasztként... hamis” teszt
  mintájában.
- `app/src/pages/NewPlanPage.test.tsx` — a `seedPersistedDraft()`-ra épülő,
  MÁR MEGLÉVŐ mentetlen-piszkozat tesztek (pl. „meglévő páciens kiválasztása
  is megerősítést kér mentetlen piszkozatnál”) érintetlenek, mert egy
  KORÁBBAN, hidegindításkor visszaállított draftra épülnek, nem a
  `selectExistingPatient` saját azonnali dirty-jelzésére. Érdemes viszont egy
  ÚJ tesztet felvenni: „meglévő páciens puszta kiválasztása után NEM jelenik
  meg mentetlen piszkozat” (nincs `AlertDialog` egy rákövetkező, másik
  páciensre váltó akciónál, ha közben nem történt szerkesztés).

## Tesztelés (irányadó, nem kimerítő)

Domain/state-szinten (vitest, `AppState.test.tsx` mintájában):

- törzsadat-előtöltésű `copyPlanIntoDraft` hívás után `vanMentetlenPiszkozat`
  hamis, amíg a `plan`-t senki nem szerkeszti (a `loadPlanIntoDraft`
  „kontraszt” tesztjének párja).
- Ugyanazon draft egy tényleges mező-szerkesztése (pl. `setPlan` egy
  `paciens.telefon` patch-csel) után `vanMentetlenPiszkozat` igazra vált.
- A meglévő `planMasolatKent`-alapú teszt (`AppState.test.tsx:83-108`)
  változatlanul `vanMentetlenPiszkozat === true`-t ad azonnal.
- Az autosave (`dp:piszkozat` kulcs) törzsadat-előtöltés után is íródik —
  a meglévő „a másolat kiíródik az autosave-en keresztül” teszt mintájában,
  de a baseline-ágra.

Kézhez, a futó appban:

1. Kezdőlap → „+ Új kezelési terv” → válassz ki egy MEGLÉVŐ pácienst a
   listából. A Terv adatai lapra navigálsz, előtöltött névvel.
2. Navigálj vissza a Kezdőlapra (pl. a NavBar-on) SZERKESZTÉS NÉLKÜL. A
   „Piszkozat folytatása” kártya NEM jelenik meg.
3. Menj vissza a draftra, szerkessz egy mezőt (pl. telefonszám), majd térj
   vissza a Kezdőlapra. A kártya MOST megjelenik.
4. Egy páciens Terv részletei lapján „Másolás új tervbe” — a Kezdőlapon a
   kártya AZONNAL megjelenik (ez a viselkedés VÁLTOZATLAN maradt).
5. Egy páciens „Első terv indítása” (üres-állapot, `PatientDetailPage`) —
   ugyanaz, mint az 1-2. pont: nincs kártya szerkesztés előtt.
