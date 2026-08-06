# 99 — Összesítés és döntési lista

Az `01`–`05` review-passz (React helyesség, adatfeldolgozás, biztonság,
struktúra, hibakezelés) egyesítve. Duplikátumok összevonva a szigorúbb
súllyal; méretbecslés: **S** < 30 perc, **M** fél nap, **L** több nap /
tervezést igényel. Ez egy döntési lista — nincs benne kódjavaslat.

18 db P0/P1 találat + 5 kiválasztott P2 (a maradék P2-kandidátusok a lista
végén, cím szinten). Ahol egy sor több passzban is felbukkant, jelzem melyik
passz(ok) hozták.

> **2026-08-06 frissítés — javítási kör lezárva.** A teljes P0 (8/8) és P1
> (9/9) lista javítva, tesztekkel (117 zöld teszt, `tsc -b` és `oxlint`
> tiszta). Az egyes tételeknél lásd a **Státusz** sort. A P2 lista
> változatlanul nyitott, azon négy tétel kivételével, ami a fenti munka
> melléktermékeként szintén megoldódott (jelölve lent). Részletek:
> `app/src/components/NumberField.tsx`, `app/src/components/ErrorBoundary.tsx`,
> `app/src/domain/validate.ts`, és a hivatkozott fájlok.

---

## P0 — a doki rossz/elveszett adatot lát úgy, hogy nem veszi észre

**P0-1. `finalize()`-ban nincs hibakezelés + `DemoStorage.savePlan()` két
egymást követő, nem atomi írása → kvótahiba esetén néma mentési hiba VAGY
PDF nélküli, csonka verziómappa marad — ez a D4 sérthetetlen szabályt sérti.**
Méret: **M**
Helyszín: `PreviewPage.tsx:97,125-141`, `DemoStorage.ts:186-207`
Forrás: 01-react #4, 05-hibakezeles #3 (a két passz ugyanazt a mentési utat
más szögből találta meg: hiányzó `catch` vs. részleges-írás integritási
következménye — összevonva)
**Státusz: ✅ Javítva.** `DemoStorage.savePlan()` a két írást egy try/catch-be
zárja, hibánál mindkét kulcsot törli (rollback); `finalize()` teljes törzse
try/catch/finally-ban, hibasáv jelenik meg `alert()` helyett. Teszt:
`DemoStorage.test.ts` „leaves NEITHER key behind when the second write
fails”.

**P0-2. "Sávos → fix" váltás csak a HUF árat konvertálja; az EUR ár
szerkezetileg csak FIX lehet — német ajánlatban a doki tudta nélkül eltűnik
a D15 jogi lábjegyzet-védelem (a `*` és a sávos megjegyzés).**
Méret: **M**
Helyszín: `PriceListAdminPage.tsx:266-285, 330-338`
Forrás: 02-adat #1
**Státusz: ✅ Javítva.** A „Fix ↔ sávos” kapcsoló mindkét pénznemre hat
egyszerre; az EUR mező sávos állapotban tól/ig párrá alakul. Teszt:
`PriceListAdminPage.test.tsx` „the 'Fix → sávos' toggle converts BOTH the
HUF and EUR price together”. Kézi böngésző-ellenőrzéssel is megerősítve.

**P0-3. PreviewPage "Letöltés" gomb és az iframe nem jelzi a PDF
újragenerálását — "Csak ajánlat" bepipálása után azonnali letöltés a régi,
teljes (nyilatkozat+aláírás oldalas) PDF-et adja, ugyanazzal a fájlnévvel,
utólag megkülönböztethetetlenül.**
Méret: **S**
Helyszín: `PreviewPage.tsx:168,207-215,226-236`
Forrás: 01-react #3
**Státusz: ✅ Javítva.** `pdfInstance.loading` alatt a „Letöltés” gomb
tiltott/„PDF frissítése…”, az iframe halványítva; a fájlnév `offerOnly`
esetén `-ajanlat` utótagot kap.

**P0-4. A terv szerkesztőben a "Tényleges" egységár mező üresre törlése
némán 0-ra esik (`Number('')||0`), floor/megerősítés nélkül — ez a
véglegesített, aláírandó PDF-be kerülhet.**
Méret: **S**
Helyszín: `PlanEditorPage.tsx:362,373`
Forrás: 02-adat #3 (P1-re sorolta), 05-hibakezeles #1 (P0-ra sorolta) —
**súlyossági ellentmondás, ld. lent a "Eldöntendő" szekciót**
**Státusz: ✅ Javítva** (a szigorúbb P0 besorolással). Új `NumberField`
komponens: blur/Enter-re commitál, üres/érvénytelen/min alatti érték nem
ment, visszaáll az utolsó ismert értékre. Teszt: `NumberField.test.tsx`.

**P0-5. Az EUR ár mezőt centben kell megadni, de a UI semmivel sem védi ki
az "euróban gépelek" tévesztést — egy tized elgépelés 100×-os hibás,
teljesen hihetően formázott árat ment.**
Méret: **S**
Helyszín: `PriceListAdminPage.tsx:330-338`
Forrás: 02-adat #2
**Státusz: ✅ Javítva.** A `NumberField unit="EUR"` módja euróban jelenít
meg, centben commitál (`domain/money.ts` `parseEuroInput`/
`formatCentForInput`). Kézi ellenőrzéssel is megerősítve: „825” → „825,00 €”
megjelenítve, `82500` cent mentve.

**P0-6. "Demó adat visszaállítása" nem tölti újra az AppState memóriabeli
state-jét — a doki látja a "Visszaállítva ✓" toastot, de a következő mentés
csendben felülírja a friss seedet a régi (esetleg elrontott) állapottal.**
Méret: **S**
Helyszín: `Home.tsx:14-21`, `StorageContext.tsx:26-31`, `AppState.tsx:34-49`
Forrás: 01-react #1
**Státusz: ✅ Javítva.** Új `reloadFromStorage()` az AppState-en, amit
`Home.handleReset()` megvár a "Visszaállítva ✓" megjelenítése előtt. Kézi
böngésző-ellenőrzéssel is megerősítve.

**P0-7. Árlista admin "Nincs EUR ár" szűrő alatt: az EUR mező első
begépelt számjegye után a sor (és a szerkesztő) azonnal eltűnik a listából,
mert a tétel kiesik a szűrőből — a részlegesen begépelt érték (pl. 5 cent)
láthatatlanul mentve marad.**
Méret: **M**
Helyszín: `PriceListAdminPage.tsx:64-83, 330-337`
Forrás: 01-react #2
**Státusz: ✅ Javítva.** A blur-commit `NumberField` megszünteti a gépelés
közbeni eltűnést; a `keep()` szűrőfüggvény ezen felül a nyitott sort mindig
megtartja, függetlenül az aktív szűrőtől. Teszt + kézi ellenőrzés.

**P0-8. SettingsPage "Mentve ✓" jelzés a mentés tényleges sikerétől
függetlenül jelenik meg — sikertelen `saveSettings()` esetén a doki hamis
megerősítést lát.**
Méret: **S**
Helyszín: `SettingsPage.tsx:22-24,34-38`
Forrás: 05-hibakezeles #2
**Státusz: ✅ Javítva.** `patch()`/`handleSave()` a mentés eredményét
(siker/hiba) adja vissza; a "Mentve ✓" csak sikerre jelenik meg, hibára
piros sáv. Teszt: `SettingsPage.test.tsx`.

---

## P1 — reprodukálható bug / hiányzó dokumentált garancia

**P1-1. Betöltési hiba (`AppState` `Promise.all`) esetén az egész app
örökre "Betöltés…"-en ragad; sehol nincs Error Boundary, tehát bármilyen
render-időbeli kivétel is fehér oldalt eredményez, visszalépési lehetőség
nélkül.**
Méret: **M**
Helyszín: `AppState.tsx:34-49`, `App.tsx` (nincs boundary)
Forrás: 01-react #6, 02-adat #12, 05-hibakezeles #4+#5 (mindhárom passz
önállóan megtalálta, 05-hibakezeles explicit is jelezte az átfedést)
**Státusz: ✅ Javítva.** Új `ErrorBoundary` komponens (`App.tsx`-ben
kétszer: a `StorageProvider` fölött és a `<Routes>` körül); az `AppState`
betöltése try/catch-ben, hibapanel "Újrapróbálás" gombbal; a `StorageContext`
`ready` promise-a kitéve és bevárva.

**P1-2. `PlanHistoryPage`: egyetlen sérült/inkompatibilis terv az egész
"Korábbi tervek" listát megbénítja (`Promise.all` all-or-nothing); a
"Megnyitás"/"Letöltés" gombok hibázó betöltésre némán nem csinálnak semmit.**
Méret: **M**
Helyszín: `PlanHistoryPage.tsx:29-59, 65-84`
Forrás: 01-react #5, 05-hibakezeles #6 (explicit jelzett átfedés)
**Státusz: ✅ Javítva.** `Promise.all` → `Promise.allSettled`; a hibás
páciens „⚠ néhány verziója nem olvasható” jelöléssel megjelenik; a
"Megnyitás"/"Letöltés" try/catch-ben, `alert()`-tel a hibára. Teszt:
`PlanHistoryPage.test.tsx`.

**P1-3. A CLAUDE.md által előírt "`osszesitok` a fájlból számít igaznak,
eltérés esetén figyelmeztetni kell" szabálynak sehol nincs implementációja
— betöltéskor senki nem veti össze a mentett `osszesitok`-ot az élőben
`computeOsszesitok`-kal újraszámolt értékkel.**
Méret: **M**
Helyszín: `PreviewPage.tsx:129-133` (csak ír), `PlanHistoryPage.tsx:65-69`,
`DemoStorage.ts:170-178` (egyik sem hasonlít össze)
Forrás: 01-react #10, 02-adat #6, 04-struktura §6 (mindhárom passz külön
azonosította ugyanazt a hiányt, a struktúra-passz dokumentált
konvenció-eltérésként is megerősíti)
**Státusz: ✅ Javítva.** Új `domain/totals.ts` `osszesitokElter()`; az
`AppState.loadPlanIntoDraft()` betöltéskor egyszer kiszámolja és
`loadedOsszesitokDiff`-ként kiteszi; a `PlanEditorPage` eltérés esetén sárga
figyelmeztető sávot mutat (mentett vs. újraszámolt fizetendő). A mentett
érték nem íródik felül. Teszt: `totals.test.ts`.

**P1-4. Árlista admin ár mezők (HUF fix/sávos, EUR cent) minden
billentyűleütésre azonnal a törzsárlistába írnak, debounce/floor nélkül —
törléskor a pillanatnyi 0 azonnal, észrevétlenül perzisztálódik, és onnantól
minden jövőbeli páciensnek 0 Ft-tal/€-val ajánlható a tétel.**
Méret: **M**
Helyszín: `PriceListAdminPage.tsx:36-38, 274-285, 341-370`
Forrás: 02-adat #4, 05-hibakezeles #12 (ugyanaz a kódhely, két külön passz)
**Státusz: ✅ Javítva** a `NumberField` blur/Enter-commitjával (nincs külön
debounce-ra szükség).

**P1-5. `savePlan()` versenyhelyzet: két gyors egymás utáni "Véglegesítés
és mentés" kattintás ugyanazt a verziószámot számolja ki, a második némán
felülírja az első verziómappát — a D4 garancia pontosan ilyenkor sérül.**
Méret: **S**
Helyszín: `DemoStorage.ts:186-207`, `PreviewPage.tsx:97`
Forrás: 02-adat #5
**Státusz: ✅ Javítva.** `DemoStorage.savePlan()` privát futási sorba fűzve
(`savingChain`); `PreviewPage.finalize()`-ban `savingRef` in-flight guard a
dupla kattintás ellen. Teszt: `DemoStorage.test.ts` „two back-to-back
savePlan calls … never collide”.

**P1-6. Nincs futásidejű séma-/típusvalidáció a JSON betöltési határokon:
`null` csendben 0-ra esik szorzásban (nincs `Number.isFinite` a teljes
pénz-pipeline-ban), és a jól megfogalmazott `SchemaVersionError`/JSON
szintaxishiba `try/catch` hiányában sosem jut el a felhasználóig.**
Méret: **L**
Helyszín: `DemoStorage.ts:170-178,214-220,226-232`, `seed/priceList.ts:8`
Forrás: 02-adat #7, 05-hibakezeles #11
**Státusz: ✅ Javítva** (a mockup jelenlegi terjedelméhez mérten — nincs
zod-szintű teljes séma, de a lényegi kockázat lefedve). Új
`domain/validate.ts` (`assertPlanShape`/`assertPriceListShape`/
`assertSettingsShape`) minden `loadPlan`/`loadPriceList`/`loadSettings`
határon, `Number.isFinite` ellenőrzéssel minden pénzmezőn; minden
`JSON.parse` try/catch-ben, érthető magyar hibával. A `seed/priceList.ts`
bare castja helyett ugyanaz a guard fut induláskor. Teszt:
`DemoStorage.test.ts` (corrupted JSON, structurally invalid plan).

**P1-7. `PlanEditorPage` fázis- és sorlista `key={pi}`/`key={li}`
index-kulccsal — fázistörléskor az `ItemPicker` lokális keresési állapota
(gépelt szöveg) pozíció szerint egy másik fázisra "vándorol", a tétel rossz
fázisba kerülhet be.**
Méret: **S**
Helyszín: `PlanEditorPage.tsx:86-89, 257-259, 420-441`
Forrás: 01-react #7
**Státusz: ✅ Javítva.** `fazisResetToken` state, ami fázistörléskor
növekszik és a `PhaseCard` `key`-jébe kerül — törléskor minden fázis-kártya
remountol, a keresőmező állapota nem tud pozíció szerint átcsúszni.

**P1-8. `usePDF().error` mezőt az oldal sehol nem olvassa — PDF-render hiba
esetén a "Véglegesítés és mentés" gomb élőnek/engedélyezettnek látszik, de
kattintásra némán nem történik semmi.**
Méret: **S**
Helyszín: `PreviewPage.tsx` (a `usePDF` hívás és a `busy`/gomb logika)
Forrás: 05-hibakezeles #7
**Státusz: ✅ Javítva.** `pdfInstance.error` hibasávot jelenít meg és
letiltja a "Véglegesítés és mentés" gombot. Mellékesen a
`loadOrFallback`-ban a bare `catch {}` is szűkítve: csak a "nincs ilyen
sablon" hibát nyeli el, mást továbbdob (05-hibakezeles #9).

**P1-9. Teljes páciensrekord (TAJ, lakcím, kiskorú törvényes képviselő
telefonja — GDPR 9. cikk szerinti különleges adat) titkosítás és lejárat
nélkül landol a publikus origin `localStorage`-ában; egyetlen törlési út a
kézi "Demó adat visszaállítása".**
Méret: **L** (tervezési döntés a mockup-fázisban — CLAUDE.md szerint
szándékos, a "javítás" itt inkább kockázat-csökkentés/figyelmeztetés, nem
architektúraváltás)
Forrás: 03-security (P1)
**Státusz: ✅ Kockázatcsökkentve** (architektúraváltás nélkül, ahogy a méret
is jelzi — az a 2. fázis). `DemoBanner` szövege megerősítve; új „Minden
adat törlése” gomb a Kezdőlapon (`DemoStorage.clearAll()` + azonnali
`reloadFromStorage()`), valódi kiutat adva, ha véletlenül valódi adat került
be — eddig csak a demo-visszaállítás (újraseedelés) létezett, tényleges
törlés nem.

---

## P2 — a legjobb 5 (a teljes kandidátus-lista végén, cím szinten)

**P2-1. GDPR 9. cikk-formájú fixture PII (TAJ, lakcím, kiskorú törvényes
képviselő telefonja) minden induláskor automatikusan bekerül a publikus
repóba/bundle-be — valószínűleg szintetikus adat, de a fájl szerkezete
valós páciensadatra cserét invitál.**
Méret: **S**
Helyszín: `storage/seed/plans.ts:100-124, 214-223`
Forrás: 03-security (P2)
**Státusz: Lezárva vizsgálatként, nem kódváltoztatással.** A javítási kör
során megerősítve: a `seed/plans.ts` páciensadatai szó szerint a
`docs/02-domain-modell.md` illusztrációjából származnak (mintázatos TAJ,
`example.hu` e-mail-címek) — bizonyítottan szintetikus, nem valós adat. A
fixture változatlan marad.

**P2-2. "Mikor írjunk a storage-ba" döntés nincs kikényszerítve a
`PlanStorage` interfészen — a tervszerkesztő pufferelt/egyszeri mentést
használ, az Árlista admin és Beállítások azonnali, mezőnkénti mentést. Ma
ártalmatlan (`localStorage`), de a tervezett `FileSystemStorage`-váltásnál
(2. fázis) teljesítmény- és megbízhatósági kockázattá válik.**
Méret: **L**
Helyszín: architektúra-szintű (nem egy file:line)
Forrás: 04-struktura, "legfontosabb strukturális kockázat"
**Státusz: Nyitott.** Nem ebben a körben — architektúra-szintű döntést
igényel, lásd a jóváhagyott terv "Olcsó ráadás" szakaszát.

**P2-3. `app/src/storage/seed/priceList.ts` a repo gyökerén lévő `data/`
mappából importál (`../../../../data/arlista.seed.json`), át a CLAUDE.md
által "csak referencia" mappaként leírt határon — ha valaki átmozgatja/
átnevezi a fájlt, a build csendben eltörik.**
Méret: **S**
Helyszín: `storage/seed/priceList.ts:6`
Forrás: 04-struktura §3
**Státusz: Nyitott.**

**P2-4. Kedvezmény-jelvény számítás osztást végez `listaEgysegar`-ral
nulla-ellenőrzés nélkül — `listaEgysegar === 0` esetén "−Infinity%" jelenik
meg, bizonyítva, hogy a teljes ár/kedvezmény-pipeline-ban nincs egyetlen
`Number.isFinite` védelem sem.**
Méret: **S**
Helyszín: `PlanEditorPage.tsx:323-326`
Forrás: 02-adat #11
**Státusz: ✅ Javítva** (a P0/P1 munka melléktermékeként). `discount`
számítás `Number.isFinite(listaEgysegar) && listaEgysegar > 0` őrrel.

**P2-5. Árlista admin `commit()` / Beállítások `patch()`: render-idejű
closure zárva be egy async mentéshez, functional updater nélkül (gyors
egymás utáni módosítás versenyben felülírhatja egymást), ÉS a mentés
eredményéről (siker/hiba) semmilyen vizuális visszajelzés nincs.**
Méret: **M**
Helyszín: `PriceListAdminPage.tsx:36-45`, `SettingsPage.tsx:22-24`
Forrás: 01-react #12, 05-hibakezeles #10
**Státusz: Részben javítva.** A vizuális visszajelzés fele elkészült a P0-8
(SettingsPage) és P1-2 részeként; a `commit()`/`patch()` functional-updater
átírása marad a P2 körre — a `NumberField` blur-commitja után a versenyablak
a gyakorlatban minimálisra szűkült.

**Kimaradt P2-kandidátusok** (nem vitt tovább, csak cím szinten, ha később
kellenének): `basePrice()` újraírva a `domain/money.ts` export helyett
(04-struktura, S); `hi` reset-effekt `[q]`-tól függ `[q, available]` helyett
(01-react #8); `AppState` context `value` nincs `useMemo`-zva (01-react #9)
— **✅ javítva mellékesen, ld. P1-1**; SAVOS min/max választhatatlan
konzisztencia, `min>max` validáció nélkül (02-adat #9); `parseTeeth` nem
dedupol (02-adat #10); nincs `min`/előjel-ellenőrzés egyetlen pénzmezőn sem,
negatív ár menthető (02-adat #8) — **✅ javítva mellékesen a `NumberField`
`min` prop-jával, ahol a mezők ezt használják**; `loadOrFallback` bare
`catch{}` minden hibát "hiányzó sablon"-ra fordít (05-hibakezeles #9) —
**✅ javítva, ld. P1-8**; 3 legnagyobb/legvalószínűbben ütköző fájl +
hármas gombstílus-inkonzisztencia (04-struktura §4-5); üzleti logika
komponensbe ágyazva, `PreviewPage.finalize()` tesztelhetetlen (04-struktura
§1-2).

---

## Eldöntendő — ahol a passzok ellentmondanak egymásnak, vagy bizonytalanságot jeleztek

1. **Súlyosság-ellentmondás, ugyanazon a soron**: `PlanEditorPage.tsx:370-374`
   (tényleges egységár üres mező → néma 0). A 02-adat passz **P1**-re, a
   05-hibakezeles passz **P0**-ra sorolta ugyanazt a kódhelyet — a fenti
   listában P0-4 alatt a szigorúbbal vittem tovább, de érdemes eldönteni:
   valóban P0, mivel ez egy *draft* terv sora (van esély észrevenni
   véglegesítés előtt), vagy elég a P1, mert semmi nem különbözteti meg
   "0-t akartam beírni"-t "épp törlöm, hogy újat írjak"-tól?
   **Eldőlt: javítva, súlyosságtól függetlenül** — a `NumberField` közös
   megoldása ugyanolyan olcsó volt P1-nek vagy P0-nak véve, nem kellett
   ténylegesen dönteni.

2. **Súlyosság-ellentmondás**: `StorageContext.tsx:22-32`
   (`void demo.init()` elkapatlan). A 01-react passz **P2**-nek, csak
   jövőbeli (`FileSystemStorage`-migrációs) kockázatnak minősítette; a
   05-hibakezeles passz **P1**-nek, már ma is fennálló kockázatnak (Safari
   privát mód, kvótahiba az első seed-írásnál). A fenti listában P1-8-cal
   szomszédos tételként a szigorúbbal (P1) szerepel implicit — nincs önálló
   sorszáma, mert a két passz indoklása lényegesen eltér: érdemes külön
   megnézni, mennyire reális a Safari-privát-mód forgatókönyv a doki
   tényleges böngészőjén.
   **Eldőlt: javítva** — a `ready` promise kitéve és bevárva (P1-1 része),
   nem kellett eldönteni a Safari-forgatókönyv valószínűségét, mert a
   javítás pár sor volt.

3. **Önbevallott bizonytalanság mindkét race-condition találatnál**: sem a
   `savePlan()` dupla-kattintás race (P1-5), sem a `PriceListAdminPage`
   closure-race (P2-5) nem lett ténylegesen böngészőben lefuttatva egyik
   passzban sem — mindkettő elismeri, hogy a mai, gyakorlatilag szinkron
   `localStorage`-írás és a React 18 batching szűkítheti/eltüntetheti az
   időablakot. Logikailag levezetett, nem demonstrált — dönthető, hogy ez
   most fix-et érdemel, vagy elég egy jegyzet a `FileSystemStorage`-váltás
   előtti checklistára.
   **Eldőlt: a P1-5 race javítva és teszttel demonstrálva** (`savingChain`
   soros végrehajtás + `Promise.all([savePlan, savePlan])` teszt ténylegesen
   reprodukálja és bizonyítja a javítást). A P2-5 (`PriceListAdminPage`
   closure-race) fixe marad nyitott — lásd fent.

4. **Bizonytalanság a P2-1 (GDPR fixture) valós kockázatáról**: a
   03-security passz valószínűsíthetően szintetikusnak ítéli a
   `seed/plans.ts` adatait (placeholder nevek, mintázatos TAJ,
   `example.hu` email), de **nem tudja 100%-ban kizárni** külső forrás
   nélkül. Ha bárki valaha valódi páciensadattal próbálta ki a publikus
   demót (ez a mockup célja lenne), a kockázat azonnal a P1-9 találattal
   (titkosítatlan `localStorage`) együtt élessé válik — érdemes egy gyors
   böngésző-DevTools-ellenőrzéssel lezárni ezt a kérdést.
   **Eldőlt: lezárva.** A `seed/plans.ts` adatai szó szerint a
   `docs/02-domain-modell.md` illusztrációjából származnak — bizonyítottan
   szintetikus. A P1-9 kockázat (titkosítatlan localStorage, ha mégis valódi
   adat kerülne be) kockázatcsökkentve a „Minden adat törlése” gombbal.

5. **Vizuális részlet bizonytalan**: P1-7 (index-key bug) funkcionális
   következményét (tétel rossz fázisba kerül) a 01-react passz
   vitathatatlannak tartja, de a keresőmező pontos fókusz-viselkedését
   törlés utáni React-újraegyeztetéskor nem tesztelte böngészőben.
   **Eldőlt: javítva.** A `fazisResetToken`-alapú remount strukturálisan
   kizárja a jelenséget (nem csak csökkenti a valószínűségét) — a
   keresőmező-DOM-csomópont maga szűnik meg és jön létre újra minden
   fázistörléskor, nem маradhat "élve" egy másik fázison.

---

## Ha csak 3 dolgot javítanék

1. **P0-5 (EUR cent/euró tévesztés)** — mert ez nem elméleti: a CLAUDE.md
   szerint a doki **most, ebben a fázisban** tölti ki soronként a hiányzó/
   becsült EUR árakat az adminban. Ez a legvalószínűbb bug, ami a
   következő pár száz billentyűleütés valamelyikén tényleg megtörténik, és
   egy 100×-os hibás ár kerül egy hiteles ajánlatba.
2. **P0-1 (finalize()/savePlan hibakezelés + atomicitás)** — mert ez az
   egyetlen hely, ahol a legszentebb szabály (D4: verziómappát soha nem
   írunk felül/nem hagyunk csonkán) ténylegesen sérülhet, csendben, és ez a
   *véglegesített, aláírt* dokumentumot érinti — nem egy piszkozatot.
3. **P1-1 (Error Boundary + betöltési hiba felszínre hozása)** — mert ez a
   legjobb tőkeáttételű javítás: önmagában kicsi (M méret), de a lista
   fele ("örökre Betöltés…", "fehér képernyő", "néma gomb") ugyanoda a
   hiányzó védőhálóba fut ki. Ha ez megvan, a többi hibakezelési találat
   (P1-2, P1-8, P2-5) is legalább *látható* lesz a dokinak, ahelyett hogy
   teljesen eltűnne.

Szoros negyedik jelölt: **P0-2 (SAVOS→FIX EUR, D15 jogi védelem
megkerülése)** — ha a német ajánlatokat éles páciensnek szánod, ez
gyakorlatilag ugyanolyan súlyú, mint az első három.

**Mind a négy (a fenti három + a szoros negyedik) javítva ebben a körben.**
