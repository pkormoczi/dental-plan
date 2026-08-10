# Architekt + React kódreview — 2026-08-10

Időszakos állapotfelmérés, `.claude/skills/code-and-architecture-review` alapján.
Csak `app/` alatti alkalmazáskód, teszt- és build-kimenet nélkül.

**Előzmény.** Formális `docs/reviews/` jegyzőkönyv korábban nem készült, ezért
nincs mivel összehasonlítani (a skill 3. lépése szerint ezt a szakaszt
kihagyom, nem koholok alapállapotot). Van viszont egy élő, karbantartott
listája a korábbi kódreview nyitva maradt tételeinek:
`docs/08-backlog.md` "Technikai adósság" szakasza (storage-írási minta
inkonzisztenciája, `commit()`/`patch()` functional updater nélkül,
`storage/seed/priceList.ts` határsértés, a három legnagyobb fájl bontása,
stb.). Ellenőriztem, ezek **mind továbbra is fennállnak** — nem írom le
újra részletesen, mert nincs bennük új információ ehhez a listához képest.
Ez a review azokra a tételekre fókuszál, amik ott még nem szerepelnek.

Összességében a kódbázis fegyelmezett: a korábbi review-körök P0/P1
találatai láthatóan javítva vannak, a döntések dokumentálva vannak a
`docs/*.md` fájlokban, és a kód következetesen hivatkozik rájuk. Az alábbi
találatok ehhez képest szűk kivételek, nem rendszerszintű problémák.

---

## 1. pass — Architekt szemüveg

### Architektúra és adatáramlás

**Apró** — `app/src/pages/SettingsPage.tsx:28,60`. A sablon-piszkozat
localStorage-cache (`TEMPLATE_DRAFT_CACHE_KEY`) a `DemoStorage.ts`
`PREFIX` konstansát importálja közvetlenül egy oldal-komponensbe. A fájl
saját kommentje indokolja (hogy a "Minden adat törlése" prefix-seprése ezt
is elvigye), tehát ez tudatos, nem hiba — de ez a mechanizmus explicit
localStorage-specifikus (a fájl kommentje maga mondja: "NEM a
`DraftStorage` bővítése… önálló, base-kulcsolt JSON objektum"), és a
`PlanStorage`-absztrakció pont azt a garanciát adja, hogy az oldalak ne
tudjanak arról, melyik implementáció fut (`CLAUDE.md` "Két fázisú build").
**Irány:** nem sürgős javítás, inkább egy jegyzet a 2. fázis
(`FileSystemStorage`) tervezéséhez — ez az ad hoc cache-mechanizmus akkor
újragondolásra szorul, mert a `PREFIX`-alapú kulcsséma fájlrendszeren nem
értelmezhető ugyanígy.

**Rögzítve (2026-08-10).** Nem kódmódosítás — a jelenlegi csatolás
tudatos és csak egyetlen implementáció mellett értelmezhető probléma
(YAGNI: nincs értelme most elvonatkoztatni egy nem létező második
`PlanStorage`-implementáció ellen). Felvéve a `docs/08-backlog.md`
"Technikai adósság" listájára, hogy a 2. fázis tervezésekor ne vesszen el.

### Biztonság és függőség-higiénia

Nincs új találat. A `dangerouslySetInnerHTML` egyetlen előfordulása
(`components/DentalChart.tsx`, a fogtérkép-SVG) ellenőrizve: a doki által
szerkesztett kategórianév (`design/toothChartSvg.ts` `escapeAttr()`) minden
beszúrás előtt escapelve van, a fog-id-k zárt halmazból jönnek. A
`package.json` függőségei mind indokoltak, nincs se duplikált, se
kihasználatlan csomag. Nincs API-kulcs vagy szerver-URL a kliens
bundle-ben (nincs backend, D2 szerint).

---

## 2. pass — Senior React fejlesztői szemüveg

### React-specifikus minőség

**Kritikus** — `app/src/components/NumberField.tsx:80,86-88,133,138`. A
`focused` állapot `onFocus`-ra `true`-ra áll, de **sehol nincs
`setFocused(false)`** — az `onBlur={commit}` maga sosem törli. Emiatt,
miután a mező életében egyszer fókuszt kapott, a `useEffect(() => { if
(!focused) setDraft(formatForDisplay(value, unit)); }, [value, unit,
focused])` szinkronizáló hatás **örökre leáll** azon a komponens-
példányon, akkor is, ha a mező ténylegesen rég elvesztette a fókuszt.

**Konkrét hibaforgatókönyv:** az Előleg % mező (`PlanEditorPage.tsx:856`)
`onCommit`-ja felül-clampeli a `NumberField` saját kerekített értékét
(`Math.min(100, Math.max(0, …))`). Ha a doki 150-et gépel be és Entert üt,
a `NumberField` a saját `draft`-ját "150"-re állítja, majd a szülő 100-ra
clampeli a valódi `elolegSzazalek`-et — de mivel a mező már fókuszban volt
(volt már rajta `onFocus`), a props-szinkron hatás nem fut le, és a mező
**továbbra is "150"-et mutat**, miközben a mellette kiírt forintösszeg (és
a PDF) a ténylegesen tárolt 100%-ból számol. Ugyanez a csapda érinti az
árlista-admin és a soronkénti ár/darabszám mezőket is bármikor, amikor egy
már fókuszált mezőn a `value` prop külsőleg változik (pl. egy másik terv
betöltése ugyanabba a szerkesztőbe, `loadPlanIntoDraft`, ha a sor-index
egyezik egy korábbi, érintett sorral). Egy pénzügyi/szerződéses adatot
kezelő mezőnél ez különösen súlyos — a látott szám és a ténylegesen
elmentett/kiszámolt szám szétcsúszhat, észrevehetetlenül.

**Irány:** az `onBlur`-nek a `commit()` mellett `setFocused(false)`-t is
hívnia kell, hogy a props-szinkron a tényleges blur után újra élesedjen.

**Javítva (2026-08-10).** `onBlur` mostantól `commit()` után
`setFocused(false)`-t is hív; regressziós teszt hozzáadva
(`NumberField.test.tsx` "re-syncs the display after blur when the parent
commits a different value"), ami a fix nélkül elbukott volna. Teljes
tesztkészlet (381 teszt), `tsc -b` és `oxlint` zöld.

### UX-robusztusság és akadálymentesség

**Közepes** — `app/src/pages/PriceListAdminPage.tsx:288-291` és `:676-679`.
Az ártétel-sor és a kategória-sor kinyitása (a `ItemEditor`/
`KategoriaEditor` megjelenítése) **kizárólag** egy `<Table.Row
onClick={...}>`-on keresztül érhető el — nincs `tabIndex`, `role`, sem
`onKeyDown`. A soron belüli `IconButton`-ok (csillag, szem) billentyűzettel
elérhetők, de nem nyitják meg a szerkesztőt. Ez azt jelenti, hogy egy
billentyűzet-only felhasználó **egyáltalán nem tudja megnyitni egy tétel
vagy kategória szerkesztését** — miközben a fájl saját fejléckommentje
szerint "a sor kinyitása adja a teljes szerkesztést". A `docs/07-
felulet-rendszer.md` "Billentyűzet" szakasza általános elvként mondja ki:
"Ha valahol elakad a Tab-sorrend, az hiba." **Irány:** a sor triggerét
ugyanúgy kezelni, mint a `ToothChartPanel`/`KategoriaPanel` saját nyitó
gombjait (billentyűzettel aktiválható elem, pl. `role="button"` +
`tabIndex={0}` + Enter/Space kezelés, vagy egy tényleges Radix `Button`
trigger-cellaként).

**Javítva (2026-08-10).** A név-cella (`Table.RowHeaderCell`) kapta a
trigger szerepet a teljes sor helyett: `role="button"`, `tabIndex={0}`,
`aria-expanded`, `aria-controls` (a kinyitott sor `id`-jére mutatva) és
Enter/Space `onKeyDown`. A csillag/aktív/mozgatás/törlés gombok változatlanul
saját, független Tab-megállók maradtak (`stopPropagation` a click-jükön,
ahogy eddig is). Regressziós teszt mindkét sortípusra (tétel, kategória):
fókusz + Enter nyitja, Space zárja.

**Közepes** — `app/src/pages/PriceListAdminPage.tsx:222-227`,
`app/src/pages/planEditor/ItemPicker.tsx:153-163`,
`app/src/pages/PlanHistoryPage.tsx:228-233`. Három keresőmező (az Árlista
admin szűrője, a tervszerkesztő tétel-keresője, a Korábbi tervek
páciensnév-keresője) kizárólag `placeholder`-rel van "címkézve", nincs
látható label és nincs `aria-label` sem. Ez közvetlenül ütközik a
`docs/07-felulet-rendszer.md` explicit szabályával: "Címke az input
FÖLÖTT. Soha placeholder címke helyett." — a tétel-kereső (`ItemPicker`)
pont az app UX-kritikus pontja (CLAUDE.md), itt a leginkább indokolt egy
beszédes `aria-label`. **Irány:** mindhárom mezőre `aria-label` (pl. "Tétel
keresése", "Keresés páciensnévre", "Keresés a tételek között") — vizuális
label nem feltétlenül kell egy nyilvánvalóan kereső jellegű mezőhöz, de
elérhető név igen.

---

## Összegzés

| Súlyosság | Találat |
|---|---|
| Kritikus | ~~`NumberField` sosem törli a `focused` állapotot — a mező kijelzett értéke elszakadhat a ténylegesen tárolt/számolt értéktől~~ **javítva** |
| Közepes | Árlista admin: tétel-/kategória-sor csak egérrel nyitható, billentyűzettel elérhetetlen szerkesztés |
| Közepes | Három keresőmező `aria-label` nélkül, csak placeholder — a saját UI-szabályzat (`docs/07`) ellen |
| Apró | `SettingsPage.tsx` közvetlenül importál a `DemoStorage`-ból egy localStorage-specifikus konstanst — 2. fázisban újragondolandó |

Nincs a fentieken túl talált korrektségi hiba a domain-logikában (pénz-
kerekítés, verziókezelés, D4/D7/D9/D17/D21 betartása mind rendben), és
nincs biztonsági vagy függőség-higiéniai találat.
