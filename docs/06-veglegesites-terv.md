# 06 — Véglegesítés terv: Electron alapú telepíthető alkalmazás

> Ez a dokumentum a `dental-plan` 2. fázisának (`CLAUDE.md` „Két fázisú build") teljes,
> önhordozó terve: hogyan jutunk el a mai, GitHub Pages-re deployolt, `localStorage`-alapú
> mockuptól egy Windows és macOS alatt telepíthető, a fájlrendszerre író/olvasó Electron
> alkalmazásig. A dokumentum **munkaközi tervdokumentum**, nem élő specifikáció — a `docs/`
> többi fájljától eltérően ez idővel kiürül: ahogy a benne leírt döntések backlog-tételekké
> válnak és megvalósulnak, a tartósan érvényes részük átköltözik a megfelelő `docs/02`–`05`/`07`
> fájlba, ez a fájl pedig törlődik. Amíg ez nem történt meg, **ez az egyetlen hely**, ahol a
> 2. fázis döntései és indokaik együtt élnek.
>
> A dokumentum nem hivatkozik `D<szám>` azonosítóra és nem hoz létre újat — a `docs/01`
> döntéstáblája lezárt (lásd `CLAUDE.md`). A benne szereplő döntések a jelen dokumentumon belül
> sorszámozottak (1–27), ez a szám csak ebben a fájlban él, és lezáráskor eltűnik vele együtt.

## 1. Miért, és mi változik

A mockup célja a UX validálása volt: a doki kipróbálhatta a terv szerkesztését, az árlista
adminisztrációt és a PDF-generálást anélkül, hogy valódi páciensadat bármikor is elhagyta volna
a böngészőjét (`DemoStorage`, `localStorage`, `dp:` prefix). Ez a validáció a végéhez ért — a
következő lépés egy ténylegesen használható, telepíthető alkalmazás, ami a fájlrendszerre ír.

**Ez a döntés felülírja a `docs/05-technologia.md` „Váltás Tauri-ra, ha kell" szakaszát.** Az a
szakasz ma Tauri-t nevezi meg desktop-célként, azzal, hogy „ez egy implementáció cseréje, nem
újraírás — 1-2 nap, ha az interface tiszta". A doki döntése ehelyett **Electron**:

- **Egyetlen Chromium fut mindkét platformon.** A `@react-pdf/renderer` egy szerződéses,
  aláírásra kerülő dokumentumot generál — a betűkészlet-beágyazás és a `@react-pdf/renderer`
  layout-motorja ugyanazt a Chromiumot futtatva Windowson és Macen **gyakorlatilag azonos**
  PDF-et ad (a kis eltérés forrása és korlátja: lásd §11 „a byte-identikus érv egy repedése").
  Tauri alatt a natív webview (macOS WKWebView vs.
  Windows WebView2) két különböző renderelési motor — egy aláírandó orvosi dokumentumnál ez
  elfogadhatatlan kockázat.
- Cserébe nagyobb bundle (~150 MB egy Tauri-app ~10 MB-jához képest) és nehezebb IPC-réteg —
  ezt a dokumentum 3. és 11. szakasza részletezi.

**Az „1-2 nap" becslés is tarthatatlan** ehhez a hatókörhöz — lásd 11. szakasz.

**Mi marad érintetlen:** a domain logika (`app/src/domain/`), a UI (`app/src/pages/`,
`app/src/components/`), a `PlanStorage` interfész (`app/src/storage/PlanStorage.ts`) és a
mappastruktúra (`docs/02-domain-modell.md` „Mappastruktúra"). Ez pontosan azért lehetséges, mert
a `CLAUDE.md` „Két fázisú build" szakasza ezt már a mockup megépítésekor kikényszerítette: minden
képernyő a `PlanStorage`/`DraftStorage` interfészek mögött dolgozik, egyik implementációt sem
ismeri közvetlenül.

**Mi változik:** a `PlanStorage` implementációja (`DemoStorage` → `FileSystemStorage`), a
futtatási környezet (böngésző → Electron), a build/csomagolás/kiadás, és a demó-only felületek
(§8) eltűnése.

## 2. Rögzített döntések

A doki és a fejlesztő közötti egyeztetés (grillezés) eredménye. Ezek a döntések a jelen
dokumentumon belüli, saját sorszámozásúak (nem `D<szám>`) — amikor egy döntés backlog-tételbe
kerül, a tétel maga hordozza tovább az indokot, ez a táblázat pedig lezárul.

| # | Döntés | Miért |
|---|---|---|
| 1 | **Electron**, nem Tauri | Egyetlen Chromium mindkét platformon → azonos PDF-kimenet egy aláírandó dokumentumon (lásd §1) |
| 2 | Kézi frissítés, nincs auto-updater, nincs fizetős code signing tanúsítvány — a macOS-oldal pontosítása a 21. döntésben (ad-hoc aláírás + telepítő-script) | Egy doki, két gépe — a fejlesztési/fenntartási költség (Apple Developer + Windows tanúsítvány, évi ~300-500 USD) nem térül meg ennyi felhasználónál. A Windows SmartScreen figyelmeztetése minden kiadásnál újra átlépendő (lásd §11) |
| 3 | Gyökérmappa Drive-tükrözött mappán belül; egy doki, két gép (Windows + Mac), sosem egyidejűleg | A meglévő munkafolyamat (rendelői gép + otthoni gép) folytatása; nincs többfelhasználós egyidejű írás, tehát nincs szükség fájlzárolásra/lock-fájlra |
| 4 | Verziómappa-ütközés (`_vN` már létezik, mert a másik gépen létrejött, és a Drive közben szinkronizálta) → **kemény blokk**, a meglévő verzió adataival (dátum, orvos, végösszeg), a doki dönt | A „verziómappát soha nem írunk felül" sérthetetlen szabály (`CLAUDE.md`) csendes megkerülése helyett a doki lássa, mi történt, mielőtt új sorszámra ment |
| 5 | Piszkozat gépenként lokális (Electron `userData`), sosem szinkronizált, sosem system of record | A `DraftStorage` már ma is ezt az elvet követi (`CLAUDE.md`: „soha nem system of record"); a piszkozat Drive-ba tétele pont a leggyakrabban írt fájlt tenné ki a `conflicted copy` kockázatnak, és rossz irányba tolná a piszkozat szemantikáját system of record felé |
| 6 | A Drive szinkron-állapotát nem próbáljuk detektálni | Nincs megbízható API erre; a doki dolga megvárni, hogy a Drive szinkronizáljon, mielőtt a másik gépen dolgozik |
| 7 | A GitHub Pages-demó **nyugdíjba megy** a végleges app után — de előtte egyszeri „Adatok exportálása" akciót kap | A demó UX-validációs célja teljesült; a mockup-only felületek (demó-adat-visszaállítás, Filerendszer nézet) fenntartása felesleges kettős karbantartás. Az árlista/beállítások/sablonok viszont valódi, a dokitól származó munka — ezek nem veszhetnek el |
| 8 | `DemoStorage` → **teszt-only `InMemoryStorage`** (memória-`Map` `localStorage` helyett), a seed adat teszt-fixture lesz | A vitest-készlet (`DemoStorage.test.ts` + számos oldalteszt) ma erre a backendre épül; a legkisebb kockázatú út a meglévő tesztek megtartására az, ha a backend logikája megmarad, csak a tárolóréteg (Map vs. localStorage) és a termékbeli szerepe változik |
| 9 | Demó-only UI törlődik (Filerendszer nézet, Adatkezelés); helyette egy „Mappa megnyitása" gomb | Valódi fájlrendszeren a dokinak ott a natív Fájlkezelő/Finder — a saját fanézet redundáns, a seed-visszaállítás/törlés éles adaton veszélyes |
| 10 | Elérhetetlen gyökérmappa induláskor → **blokkoló képernyő**, csak „Újrapróba"/„Másik mappa kiválasztása" | Kizárja, hogy a doki egy üres pácienslistát lásson és azt higgye, minden elveszett, miközben csak a Drive nem csatolt még |
| 11 | Atomi írás (temp fájl + fsync + rename) + automatikus újrapróba zárolási hibán | A Drive kliens és a víruskereső rövid ideig zárolhat fájlokat Windowson (`EBUSY`/`EPERM`) — egy pár száz ms-os zárolás nem lehet látható hiba egy orvosi dokumentum mentésekor |
| 12 | Első indítás: csak üres mappa vagy már a mi struktúránk (`arlista.json` + `paciensek/`) fogadható el | Kizárja, hogy a doki véletlenül egy más célú mappát (pl. a Dokumentumok gyökerét) jelöljön ki, és az app abba írjon bele |
| 13 | „Letöltés" → **„Megnyitás"** (rendszer PDF-olvasó) + **„Másolás máshová"** (natív mentés-dialógus); a `Letöltések` mappa tiltott alapérték | Asztali appban a „letöltés" szó félrevezető — a fájl már a lemezen van a verziómappában. A `docs/01-attekintes-es-dontesek.md` már ma is tiltja a `Letöltések` mappát (OneDrive auto-szinkron kockázata) |
| 14 | Százas nagyságrend páciensszám — naiv, cache nélküli beolvasás elég | A mai `listPatients()` minden páciens `paciens.json`-ját beolvassa; pár száz fájlnál ez lokális lemezen és Drive-tükrözött mappán is elhanyagolható, cache-invalidálási hibalehetőség nélkül |
| 15 | GitHub Actions építi mindkét telepítőt git tagre, GitHub Release-be | Egy Windows és egy macOS runner szükséges a két telepítőhöz (electron-builder nem tud megbízhatóan macOS-re keresztfordítani); a doki mindig ugyanonnan (Release oldal) tölti le mindkettőt |
| 16 | Hatókör: runtime (Electron) + `FileSystemStorage` + I/O hibakezelés + Playwright `_electron` füst-teszt (27. döntés). **Kívül esik:** `terv.json` beágyazása a PDF-be (`pdf-lib`), sémamigrációs keretrendszer, backup/ZIP-export | Ezek önálló, jól körülhatárolt munkák, amik nem blokkolják a telepíthető app első kiadását — lásd §12 |
| 17 | Végrehajtás sorrendje: **héj → storage-csere → demó-lebontás** | Minden mérföldkő végén futó, a dokinak megmutatható app áll elő; a kockázat szét van osztva, nem egy nagy, sokáig nem tesztelhető ágban gyűlik |
| 18 | Diagnosztikai napló I/O-hibákról `userData`-ba, forgó/méretkorlátos fájlba, „Napló megnyitása" gombbal a Beállításokban. **Páciensnév és -adat sosem kerülhet bele** — de lásd a §5.4 pontosítást, mert az útvonal ÖNMAGÁBAN tartalmazza a páciens nevét | Egy „nem mentődött el" bejelentés után legyen mit megnézni; a GDPR 9. cikk szerinti különleges adat (`CLAUDE.md`) miatt a napló tartalma szigorúan technikai marad |
| 19 | Gyökérmappa útvonala **gépenkénti lokális configban** (Electron `userData`), nem a `beallitasok.json`-ben; **egy-példány zár** (single-instance lock) kötelező | A `beallitasok.json` maga a gyökérmappában él (tyúk-tojás probléma), és a két gép útvonala amúgy is eltér. Az egy-példány zár kizárja, hogy két futó példány ugyanarra a mappára írjon egyszerre — pont az a versenyhelyzet, amit a 3. döntés (egy doki, sosem egyidejűleg) emberi szinten már kizár, de programozási hibából (két ikon véletlen dupla-indítása) még mindig előfordulhatna |
| 20 | Induláskor **észleli a Drive-ütközéses fájlokat** (`... (1).json`, `*conflicted copy*` mintájú nevek a gyökérmappa fájljai között) és amber sávban jelzi — nem old fel semmit automatikusan | Lásd §5 „Külön alszakasz a Drive-ütközésekről" — a `docs/05-technologia.md` mai „append-only írásnál ez nem tud előfordulni" állítása csak a verziómappákra igaz, a felülírt fájlokra nem |
| 21 | **macOS: ad-hoc aláírás + telepítő-script** — az electron-builder alapértelmezett ad-hoc aláírása, a Release mellé csomagolt `.command` segédscripttel (`xattr -dr com.apple.quarantine`), README-leírással | A csupasz aláíratlan `arm64` app el sem indulna, a fizetős Developer ID (évi ~99 USD) pedig a 2. döntés költség-elvével ütközne. Őszinte korlát: a scriptet **minden frissítés után** újra futtatni kell (a karantén letöltésenként újra rákerül), és első alkalommal magát a scriptet is jobbklikk → „Megnyitás"-sal kell indítani — ezt a telepítési útmutató explicit írja le |
| 22 | **Eltávolításkor a `userData` is törlődik** (Windows: NSIS `deleteAppDataOnUninstall`; macOS: az útmutató kihúzási lépése) | A piszkozat-cache valódi páciensadatot tartalmazhat — eltávolítás után nem maradhat adat-morzsa a gépen, összhangban a „minden adatom a gyökérmappában van" elvárással. Ára: újratelepítéskor a gépenkénti config (6.1) is elvész, a mappa-választó varázsló újra lefut (~10 mp) |
| 23 | **A `savePlan` index-írás hibája sosem rontja le a véglegesítés sikerét** — a verziómappa sikeres véglegesítése után a `paciens.json` index-frissítés hibája csak halk jelzés, a sikerképernyő megjelenik | Az index-írás pillanatában a dokumentum (terv.json + PDF) már tartósan a lemezen van; hibát mutatva a doki egy ténylegesen mentett tervet hinne elveszettnek, és az újrapróbálkozása duplikált `_v<n+1>`-et hozna létre — pontosan az a hibaosztály, amit a piszkozat-takarításnál a meglévő szabályrend már kizár (`CLAUDE.md` „Sérthetetlen szabályok") |
| 24 | **`listPatients()`-hiba a páciens-identitás védőhálónál = amber, nem blokkoló checklist-tétel** („a névütközés-ellenőrzés nem futott le") | A védőháló kiegészítő védelem, nem az elsődleges kontroll — egy átmeneti Drive-olvasási hiba nem teheti használhatatlanná a véglegesítést; a konzervatív (kemény blokk) alternatíva elvetve |
| 25 | **A piszkozat és a sablon-piszkozat cache renderer-`localStorage`-ban marad** Electron alatt is — a `DemoDraftStorage` változatlan | Nulla kódváltozás; a renderer localStorage fizikailag a `userData`-ban él, tehát az 5. döntés (gépenként lokális, sosem szinkronizált) és a 22. döntés (uninstall törli) automatikusan teljesül. **Ez felülírja a `docs/05-technologia.md` és a `CLAUDE.md` „a végleges alkalmazásban IndexedDB" kitételét** (ugyanúgy, ahogy §1 a Tauri-szakaszt) — a két fájl érintett sorai a mérföldkő-lezárási referencia-seprésben frissülnek. Az egyetlen kockázatot (protokollnév-váltás kiürítené a partíciót) a §11 már kezeli |
| 26 | **mtime-őr: konfliktusnál választós dialógus, hatóköre csak a system-of-record felülírt fájlok** (`arlista.json`, `beallitasok.json`, `paciens-adatok.json`, `sablonok/*.md`); az index-tükrök (`paciens.json`, `terv-cimke.json`) last-write-wins | A kényszerített „töltsd be újra" a doki épp elvégzett munkáját (akár egy tömeges árváltoztatást) dobná el felülbírálat nélkül — ehelyett a doki lát két explicit következményt és dönt (a 4. döntés verzió-ütközés mintája). Az index-tükrök származtatott/újraírható adatok (sosem system of record), egy mtime-blokk rajtuk épp a 23. döntés „halk index-hiba" elvével ütközne |
| 27 | **Playwright `_electron` füst-teszt már az 1. mérföldkőben**, mindkét CI-runneren (indulás, kezdőlap-képernyőkép, konzolhiba-mentesség) | ~40 sor + 1 devDependency, cserébe az egyetlen automatizált védelem az „el sem indul a csomagolt app" osztályú regressziók ellen — aláíratlan, kézzel telepített kiadásoknál különösen fontos |

## 3. Electron-architektúra

### 3.1 Folyamat-szétválasztás

Három réteg, szigorú határokkal:

- **Main process** (Node.js, `electron/main.ts`) — az egyetlen hely, ahol fájlrendszer-hozzáférés
  történik. Itt él a `FileSystemStorage` teljes implementációja, az egy-példány zár
  (`app.requestSingleInstanceLock()`), az ablakkezelés, a natív dialógusok
  (`dialog.showOpenDialog` a gyökérmappa-választáshoz, `dialog.showSaveDialog` a „Másolás
  máshová"-hoz), a diagnosztikai napló írása.
- **Preload script** (`electron/preload.ts`) — `contextBridge.exposeInMainWorld(...)` egyetlen,
  típusos API-felületet tesz ki a renderer felé. **Ez az egyetlen csatorna** a renderer és a
  main között; a renderer sosem kap közvetlen Node/Electron API-t.
- **Renderer** (a meglévő `app/` React-alkalmazás, változatlanul) — `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`. Ez a Chromium biztonsági modelljének a minimuma egy
  olyan appnál, ami páciensadatot (GDPR 9. cikk szerinti különleges adat) kezel.

### 3.2 A `PlanStorage` mint IPC-proxy

A kulcs-elv: **a renderer oldali `PlanStorage`-implementáció egy vékony proxy**, ami minden
hívást `ipcRenderer.invoke(...)`-on keresztül a main processbe küld, és a Promise-t visszaadja.
Egyetlen domain- vagy UI-fájl sem tud különbséget tenni a mai `DemoStorage` és az új proxy
között — ez pontosan a `StorageContext.tsx` doc-kommentjének ígérete („a `DemoStorage` →
`FileSystemStorage` csere egyetlen sort érint itt").

```ts
// app/src/storage/ElectronStorage.ts — vázlat
export class ElectronStorage implements PlanStorage {
  init() { return window.dentalPlanApi.storage.init(); }
  listPatients() { return window.dentalPlanApi.storage.listPatients(); }
  savePlan(plan, pdf) { return window.dentalPlanApi.storage.savePlan(plan, pdf); }
  // ... a többi 14 metódus ugyanígy
}
```

A `preload.ts` a `contextBridge`-en keresztül teszi ki a `window.dentalPlanApi.storage.*`
metódusokat, mindegyik egy `ipcRenderer.invoke('storage:<metódusnév>', ...args)` hívás. A main
processben egyetlen `ipcMain.handle('storage:<metódusnév>', ...)` regisztráció metódusonként,
ami a valódi `FileSystemStorage` példány megfelelő metódusát hívja.

**Miért `invoke`/`handle`, nem `send`/`on`:** minden `PlanStorage` metódus `Promise`-t ad vissza
— az `invoke`/`handle` pár pontosan ezt a szemantikát tükrözi natívan, hibát is átdobva (egy main
processben dobott `Error` a renderer oldali `invoke()` promise-ját elutasítja, `message`-e
átjön). Nincs szükség kézi hiba-szerializációra.

### 3.3 PDF-bájtok az IPC-n

A `savePlan(plan, pdf: Uint8Array)` és a `loadPlanPdf(ref): Promise<Uint8Array | null>` a
legnagyobb payloadok (egy többoldalas PDF néhány száz KB). Az Electron IPC a structured clone
algoritmust használja, ami `Uint8Array`-t natívan, bináris formában visz át (másolattal —
transfer-lista csak a `postMessage`-útvonalon létezik, az `invoke`-nál nem, de egy pár száz
KB-os másolat itt elhanyagolható) — nincs szükség base64-kódolásra, ellentétben a mai
`DemoStorage` `localStorage` korlátjával (ami stringet vár, ezért base64-ez). Ez a váltás
**egyben teljesítmény-javulás** is a mai demóhoz képest.

### 3.4 CSP

A renderer `index.html`-jének szigorú Content-Security-Policy-t kell kapnia (`script-src 'self'`,
nincs `unsafe-eval`/`unsafe-inline` a preload beállítása után) — ez ma hiányzik a Pages-deploy
mockupból, mert böngészőben más a fenyegetési modell. Az Electron `webPreferences` alapból is
blokkolja a legtöbb veszélyes API-t, ha `contextIsolation`/`sandbox` be van kapcsolva, de a CSP
header adjon védelmi réteget XSS ellen is (a doki által beírt, sosem szanitizált szabad szöveg —
pl. sablon-szerkesztő, sor-leírás — miatt).

**A „szigorú" nem jelenthet vak szigort — a mai kód három helyen igényel explicit engedélyt,
különben a CSP magát az appot törné el:**
- `frame-src blob:` — a PDF-előnézet két beágyazott viewere (`PreviewPage.tsx` és a Terv
  részletei `MentettPdfPanel.tsx`) `<iframe src={blobUrl}>`-lel dolgozik.
- `img-src 'self' data: blob:` — a fogtérkép-út `data:image/svg+xml` → canvas → `toDataURL`
  PNG-t használ (`pdf/toothChartImage.ts`), a logó/ikonok Vite-asset URL-ek.
- `font-src 'self' data:` — a Noto Sans TTF-ek asset-URL-ként vagy (ha az inline-olás mellett
  döntünk, lásd §3.5) data-URL-ként töltődnek.

A pontos direktíva-lista az 1. mérföldkő CSP-ellenőrzésének (10.1) bemenete — a fenti három
szükséglet előre ismert tény, nem utólagos felfedezés; a DevTools-os nulla-sértés ellenőrzés
ezeken felül keresi a még nem ismert igényeket (pl. `wasm-unsafe-eval`).

### 3.5 Fejlesztői és production betöltés

- **Fejlesztésben**: az Electron `BrowserWindow` a futó `vite dev` szerverre mutat
  (`http://localhost:5173`), hot-reload-dal — ugyanaz az élmény, mint böngészőben fejlesztve,
  csak Electron ablakban.
- **Productionben**: az Electron a lebuildelt `app/dist/index.html`-t tölti be `file://`
  protokollal, vagy egy egyedi (`app://`) protokoll-regisztrációval (ajánlott — a `file://`
  protokoll alatt bizonyos böngésző-API-k, pl. `fetch` relatív útvonalakkal, szeszélyesen
  viselkednek). **Két meglévő beállítást kell felülvizsgálni ehhez:**
  - `app/vite.config.ts` `base: '/dental-plan/'` — ez a Pages-alútvonalhoz készült, Electronban
    értelmetlen (nincs alútvonal, az app a gyökérből fut). Külön build-konfiguráció kell
    (`base: './'` vagy `base: '/'` az Electron-buildhez), vagy környezetváltozó-alapú
    elágazás a `vite.config.ts`-ben.
  - **`HashRouter` marad** — ez szerencsés véletlen: a `file://`/egyedi protokoll alatt nincs
    szerveroldali route-fallback, a hash-alapú routing pedig eleve nem igényli. Nem kell váltani
    `BrowserRouter`-re.
  - **A `@react-pdf/renderer` render-időben, URL-ről fetch-eli az assetjeit** — a két Noto Sans
    TTF-et (`pdf/fonts.ts`, `Font.register` a Vite-asset URL-lel) és a márkalogót
    (`pdf/tervDocument/Chrome.tsx` `<Image src={logoUrl}>`). Ez a legvalószínűbb `file://`-törési
    pont: a protokoll-választás (`app://` regisztráció) vagy az inline-olás
    (`build.assetsInlineLimit` megemelése / explicit data-URL import) pontosan ezért nem
    halasztható a storage-munkáig — az 1. mérföldkő ellenőrzési listája (10.1) nevesítve
    tartalmazza mindkét assetet.

### 3.6 Egy-példány zár

`app.requestSingleInstanceLock()` a main process legelső sora. Ha egy második példány indul
(pl. a doki véletlenül kétszer kattint az ikonra), az visszakapja a zárat, jelzi az elsőnek
(`second-instance` esemény), majd azonnal kilép — az első példány ablaka előtérbe kerül. Ez
zárja ki azt a versenyhelyzetet, hogy két Electron-folyamat egyszerre írjon ugyanabba a
gyökérmappába (lásd 19. döntés).

## 4. `FileSystemStorage` — a tényleges implementáció

### 4.1 Metódusonkénti leképezés

A `PlanStorage` interfész (`app/src/storage/PlanStorage.ts`) mind a 17 metódusa (a 10.0
mérföldkő bővítése — `listTemplates`, `loadPlanPdf`, `loadLatestTemplateByBase` — után 20) a
`docs/02-domain-modell.md` „Mappastruktúra" szerinti fájlokra/mappákra képződik:

| Metódus | Fájlrendszeri művelet |
|---|---|
| `init()` | Gyökérmappa validálása (üres / a miénk / idegen), hiányzó fájlok/mappák létrehozása (`arlista.json` seedből, `beallitasok.json` seedből, `paciensek/`, `sablonok/` + seed-sablonok) |
| `listPatients()` | `readdir(paciensek/)`, minden aldirenél `paciens.json` beolvasása, hibatűrő (parse-hiba → `parsePatientDirName(dirName)` fallback, a mai `DemoStorage` mintája) |
| `listPlans(patientDir)` | `readdir(paciensek/<patientDir>/)`, kiszűrve a `PATIENT_ROOT_FILES` (`paciens.json`, `paciens-adatok.json`), minden találatnál opcionális `terv-cimke.json` |
| `listVersions(patientDir, planDir)` | `readdir(.../<planDir>/)`, csak `parseVersionDirName`-mintázatú alkönyvtárak, `verzio` szerint rendezve |
| `loadPlan(ref)` | `readFile(.../<versionDir>/terv.json)` → `parseJson` → `assertKnownSchemaVersion` → `assertPlanShape` |
| `savePlan(plan, pdf)` | Lásd 4.2 — a legösszetettebb írás |
| `savePlanLabel(...)` | `writeFile`/`unlink` a `terv-cimke.json`-on (a verziómappákon kívül él, a felülírás-tilalom rá nem vonatkozik) |
| `loadPriceList()` / `loadSettings()` | `readFile` a gyökérből, ugyanaz a 3-lépéses validáció |
| `savePriceList()` / `saveSettings()` | Atomi felülírás (4.3) |
| `loadTemplate(name)` | `readFile(sablonok/<name>.md)` |
| `saveTemplate(name, body)` | A legfrissebb `-vN.md` felülírása (nem új verzió — a fájlnév-verzió a létrehozáskori, utána fix, `docs/02` szerint) |
| `loadPatientData(patientDir)` | `readFile(.../paciens-adatok.json)`, `null` ha `ENOENT` (hiányzó fájl = élő fallback, NEM hiba — `docs/02-domain-modell.md` § Páciens-szintű törzsadat) |
| `savePatientData(...)` | Atomi felülírás + `paciens.json` `nev` mezőjének frissítése (két fájl, lásd 4.4) |
| `createPatient(nev, ...)` | Mappa-létrehozás (`mkdir`) + két fájl írása egy logikailag atomi lépésben (4.4) |
| `deletePatient(patientDir)` | `rm(recursive: true)` a teljes páciensmappán — az előfeltétel (`paciensTorlesAkadaly()`, `docs/03-funkcionalis-spec.md` § 10. Páciens részletei) a hívó (renderer/domain) felelőssége marad, változatlanul |

### 4.2 Atomi írás — az alap-primitívum

Minden **felülírt** fájl (nem verziómappa) ugyanazon az elven íródik:

```
1. writeFile(célútvonal + '.tmp-' + randomSuffix, tartalom)
2. fsync a temp fájlon (garantálja, hogy a tartalom ténylegesen lemezen van, nem csak OS-cache-ben)
3. rename(temp, célútvonal)  — ugyanazon a köteten belül ATOMI (POSIX és NTFS is garantálja)
```

Ha az 1-2. lépés bármelyike hibázik, a célfájl **érintetlen marad** — nincs félig írt JSON.
Ez a `docs/05-technologia.md` már ma megfogalmazott elvárása („neki kell sorosítania... hogy a
végeredmény sorrendje a hívási sorrendet kövesse") mellé teszi a hiányzó másik felet: az egyes
írás maga is legyen csonkolás-biztos.

**Verziómappa (soha felül nem írt — `CLAUDE.md` „Sérthetetlen szabályok") ugyanezt a trükköt
mappaszinten alkalmazza:**

```
1. mkdir(gyökér/.tmp-<versionDir>-<randomSuffix>/)
2. beleírjuk a terv.json-t és a kezelesi-terv.pdf-et (mindkettőt a fenti fájl-szintű atomi módon)
3. assertVersionDirAvailable() ÚJRA-ellenőrzése közvetlenül a rename előtt (lásd 4.5 — ütközés-védelem)
4. rename(temp mappa, végleges <versionDir> néven)
```

Így egy félbeszakadt írás (áramszünet, kényszerített leállítás) sosem hagy hátra egy csonka,
`assertVersionDirAvailable()` szempontjából „foglaltnak" látszó, de valójában hiányos
verziómappát — a temp-mappa neve nem illeszkedik a `parseVersionDirName` mintára, tehát a
`listVersions()` át is siklik rajta; egy elszáradt `.tmp-*` mappa legfeljebb helyfoglaló szemét,
sosem adatvesztés forrása.

### 4.3 Újrapróba-wrapper zárolási hibán

A Drive kliens és a víruskereső rövid ideig (jellemzően < 1 másodperc) zárolhatnak egy fájlt
Windowson írás/olvasás közben. Az atomi írás helper (4.2) minden lépését egy közös
újrapróba-wrapper veszi körbe:

```ts
async function withRetry<T>(op: () => Promise<T>, opts = { attempts: 5, baseDelayMs: 100 }): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await op(); }
    catch (err) {
      if (!isRetryableFsError(err) || i >= opts.attempts - 1) throw err;
      await sleep(opts.baseDelayMs * 2 ** i); // exponenciális backoff: 100, 200, 400, 800 ms
    }
  }
}
```

`isRetryableFsError` a `EBUSY`/`EPERM`/`EACCES` errno-kra igaz — ezek tipikusan tranziens
zárolási állapotok. Más hibák (`ENOENT`, `ENOSPC`, `EROFS`) azonnal, újrapróba nélkül a hívóhoz
kerülnek (lásd §5 hibataxonómia — ezeknél az újrapróba nem oldana meg semmit, csak
késleltetné a doki felé a valós, cselekvést igénylő hibát).

### 4.4 Írás-sorosítás (`enqueue`/`savingChain`) átvitele

A mai `DemoStorage.savingChain`/`enqueue<T>()` egy közös Promise-láncra fűzi a `savePlan`,
`savePriceList`, `saveSettings`, `savePatientData`, `createPatient`, `deletePatient` hívásokat,
hogy két gyorsan egymást követő írás ne fusson párhuzamosan és a végeredmény sorrendje a hívási
sorrendet kövesse. `localStorage`-nál ez ma gyakorlatilag no-op (a `setItem` szinkron), de valódi
fájlrendszernél **létfontosságúvá válik**: két párhuzamos, nem atomi `writeFile` ugyanarra a
fájlra egymást írhatná felül csonka tartalommal.

**A `FileSystemStorage`-ban ez a lánc marad, változatlan metódus-körrel** — de két metódus,
amik ma **nem** csatlakoznak hozzá (`savePlanLabel`, `saveTemplate`), a valódi fájlrendszeren
**csatlakozzanak**: mindkettő felülírt fájlba ír, tehát ugyanaz a versenyhelyzet fenyegeti őket,
mint a hat már sorosított metódust. (A mai kihagyás `localStorage` alatt ártalmatlan véletlen
volt, nem tudatos döntés — ezt a váltás alkalmával kell korrigálni.)

`createPatient` „két fájl egy logikailag atomi lépésben" ígérete fájlrendszeren úgy áll fenn,
hogy a mappa-létrehozás és mindkét fájl írása a **sorosított láncon belül, egyetlen `enqueue`
hívásban** történik — ha a második fájl írása hibázik, az elsőt (és a mappát) vissza kell
görgetni (`rm(recursive: true)` a most létrehozott mappán), hogy ne maradjon félkész
páciensmappa, aminek `listPatients()` esetleg nem tudja értelmezni a tartalmát.

### 4.5 Verziómappa-ütközés védelme (4. döntés)

A `assertVersionDirAvailable()` (`storage/paths.ts`) ma egyszer fut, a `nextVersionNumber()`
kiszámítása után. Valódi, Drive-tükrözött fájlrendszeren ez **race condition**: a doki elkezdi a
véglegesítést a Windows gépen, mire a mentés lezajlik, a Drive már leszinkronizálta a Macen
közben létrehozott `_v3`-at. A `FileSystemStorage.savePlan()` ezért **kétszer** ellenőriz:

1. Egyszer a `verzio`/`versionDir` kiszámításakor (mint ma).
2. **Újra, közvetlenül a temp-mappa véglegesítő `rename()`-je előtt** (4.2 3. lépése) — ha eközben
   megjelent egy azonos nevű mappa, a `savePlan()` `VersionConflictError`-t dob, a temp-mappát
   eldobja, és a hívó (renderer) a 4. döntés szerinti kemény blokk-dialógust mutatja: a már ott
   lévő verzió dátuma/orvosa/végösszege, és két választás — „Mentés a következő szabad
   sorszámra" vagy „Mégsem".

### 4.6 Platformközi buktatók

Ezek valódi, nem elméleti veszélyek — mindegyik közvetlenül a `docs/02-domain-modell.md`
„az ékezetek maradnak, nincs transzliteráció" szabályából fakad:

- **Unicode NFC/NFD normalizáció.** macOS (HFS+/APFS) a fájlneveket **dekomponált** (NFD)
  formában tárolja — egy `á` karakter két Unicode kódpontból áll (`a` + kombináló ékezet),
  szemben a Windows NTFS **komponált** (NFC) tárolásával (`á` egyetlen kódpont). Egy Windowson
  `sanitizeNamePart('Kovács')`-sal létrehozott `Kovács-János_a1b2c3` mappanév, amit a Drive
  átszinkronizál Macre, **bájtsorozatban különbözik** attól, amit egy macOS-en futó
  `sanitizeNamePart('Kovács')` hívás generálna. Ha a `FileSystemStorage` a saját generált nevét
  hasonlítaná össze a lemezen talált nevekkel byte-szinten (`===`), hamis negatív találatot
  adhatna. **Megoldás:** minden fájlnév-összehasonlítás előtt explicit `.normalize('NFC')`
  (vagy következetesen NFD) mindkét oldalon, a Node `fs` API válaszaira és a saját generált
  nevekre egyaránt. Ez a legkomolyabb rejtett hibaforrás a migrációban, és külön automatizált
  teszttel kell lefedni (egy szintetikus NFD-kódolású könyvtárnév beolvasása).
- **Kis-/nagybetű-érzéketlenség.** Az alapértelmezett APFS/HFS+ kis-/nagybetű-érzéketlen (de
  -megőrző), az NTFS érzékeny. Két páciens, akiknek a neve csak kis-/nagybetűben térne el,
  Windowson két külön mappát kapna, Macen ütközne. A `docs/02` 6 karakteres id-szuffixuma
  (`generateId()`) ezt gyakorlatilag kizárja, de a validációnak (`init()` és `createPatient()`)
  explicit ellenőriznie kell, hogy egy új mappanév case-insensitive módon se ütközzön meglévővel.
- **Windows 260 karakteres útvonalkorlát.** A Drive-mount alatt hosszú lehet az útvonal
  (`C:\Users\<felhasználó>\Google Drive\<gyökérmappa>\paciensek\<páciens>\<terv>\<verzió>\...`).
  A `MAX_NAME_PART_LENGTH = 40` (`paths.ts`) ezt már ma korlátozza mappanév-részenként, de a
  teljes összeadott útvonalhosszt sosem ellenőriztük explicit — a `FileSystemStorage.init()`-nek
  figyelmeztetnie kell, ha a gyökérmappa útvonala önmagában már gyanúsan hosszú.
- **Foglalt Windows-fájlnevek** (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) — a
  mai `sanitizeNamePart()` ezt **nem** kezeli (csak a tiltott karaktereket és a záró
  pontot/szóközt). Egy páciens `Aux Nagy Aux` nevéből sosem lenne pontosan `AUX`, de egy
  tétel-/kategórianévből (`saveTemplate`, `sablonok/<name>.md`) elvileg igen — ez egy apró,
  önálló javítási pont a `sanitizeNamePart()`-ban.

## 5. Hibataxonómia és a felületi megjelenés

| Hiba | Újrapróba? | A doki üzenete (magyar) | UI-minta |
|---|---|---|---|
| `ENOENT` (gyökérmappa/fájl hiányzik) | Nem | „A gyökérmappa nem található ezen az útvonalon." | **Blokkoló képernyő** (10. döntés) induláskor; olvasáskor `null`/`unreadable` (ha a `PlanStorage` szerződés ezt engedi az adott metódusnál) |
| `EACCES`/`EPERM` (jogosultság, tartósan zárolt fájl az újrapróbák kimerülése után) | Igen (4.3), majd feladja | „Nincs jogosultság ehhez a fájlhoz/mappához — ellenőrizd, hogy nincs-e megnyitva máshol." | Piros `Callout`, a mentés/betöltés helyén |
| `EBUSY` (Drive/víruskereső átmeneti zárolás) | Igen (4.3) | Csak akkor látszik, ha az újrapróbák is kimerültek — ekkor ugyanaz, mint `EACCES` | Piros `Callout`, csak sikertelen újrapróba után |
| `ENOSPC` (megtelt a lemez) | Nem | „Nincs elég szabad hely a lemezen." | Piros `Callout`, blokkolja a mentést |
| `EROFS` (írásvédett fájlrendszer/kötet) | Nem | „A gyökérmappa írásvédett." | Piros `Callout` induláskor, hasonló súlyú a hiányzó mappához |
| `EMFILE` (túl sok egyidejűleg nyitott fájlleíró) | Igen, rövid várakozással | Belső, a dokinak nem kell látnia — ha mégis kimerül az újrapróba: „Váratlan hiba a fájlrendszerrel, indítsd újra az alkalmazást." | Piros `Callout` |
| `EISDIR`/`ENOTDIR` (a várt fájl helyén mappa van vagy fordítva — sérült/kézzel piszkált struktúra) | Nem | „A(z) `<fájl>` váratlan tartalmú — a mappa struktúrája sérülhetett." | Piros `Callout`, a `parseJson()` sérült-JSON üzenetének mintájára |
| Sérült JSON (`parseJson` hibája) | Nem | Változatlan, a mai `json.ts` üzenete | Változatlan |
| Túl magas `schemaVersion` (`SchemaVersionError`) | Nem | Változatlan, a mai `schema.ts` üzenete | Változatlan — de lásd §11, két gép eltérő verziója |
| `VersionConflictError` (4.5) | Nem — a doki dönt | „Ez a terv időközben egy másik gépen mentődött (`_v<n>`, `<dátum>`, `<orvos>`). Mented a következő sorszámra, vagy mégsem?" | **Új, kemény blokk dialógus** (4. döntés) |

### 5.1 Külön alszakasz a Drive-ütközésekről

A `docs/05-technologia.md` ma azt állítja, hogy a soha-felül-nem-írás elve itt fizetődik ki:
„a Drive akkor csinál `conflicted copy`-t, ha egy fájl szinkron közben módosul.
**Append-only írásnál ez nem tud előfordulni.**" **Ez csak a verziómappákra igaz.** Az
`arlista.json`, `beallitasok.json`, `paciens.json`, `paciens-adatok.json`, `terv-cimke.json` és
a `sablonok/*.md` mind **felülírt** fájlok (a felülírás-tilalom rájuk nem vonatkozik) — két gépnél pontosan ezek
termelnek Drive-ütközést, ha a szinkron rossz pillanatban éri a felülírást.

A `FileSystemStorage.init()` ezért **induláskor bejárja a gyökérmappát ÉS minden
`paciensek/<patientDir>/` mappát**, és ha a Drive tipikus ütközés-mintájú fájlneveket talál
(` (1).json`, `*conflicted copy*`, `*Conflict*`), amber sávban jelzi: „A Drive ütközést
észlelt ezeknél a fájloknál — nézd meg, melyik verzió a helyes: [lista]." Ez **nem** old fel
semmit automatikusan (a doki dolga eldönteni, melyik változat a helyes), és **nem** sérti a
6. döntést (nincs Drive-szinkronállapot detektálás) — ez pusztán egy mappalista vizsgálata,
amit úgyis elvégzünk induláskor, nem a Drive API-jának lekérdezése.

**Ez az észlelés önmagában nem elég — kell egy írás-időbeli védelem is.** A 4. döntés
(verziómappa-ütközés kemény blokkja) csak az append-only verziómappákat védi. Az `arlista.json`,
`beallitasok.json`, `paciens-adatok.json` stb. **felülírt** fájloknál egy csendesebb, de
súlyosabb veszély áll fenn: a doki szerkeszti az árlistát a Macen, nem várja meg a szinkront,
majd szerkeszti Windowson is — a Drive vagy `arlista (1).json`-t hoz létre (amit az induláskori
észlelés elkap), vagy **csendben az egyik oldal nyer**, és az app ezt sosem veszi észre, mert
csak a pontos fájlnevet olvassa.

Ezért a **system-of-record** felülírt fájloknál (`arlista.json`, `beallitasok.json`,
`paciens-adatok.json`, `sablonok/*.md` — a 26. döntés szerinti hatókör) **betöltéskor
rögzítjük a fájl `mtime`-ját, mentéskor pedig újra lekérdezzük, mielőtt írnánk**. Ha eltér,
**konfliktus-dialógus** két explicit választással: „A másik gép változatának betöltése (a
mostani szerkesztésem elvész)" vagy „Az én változatom mentése (a másik gépen mentett változat
elvész)" — nem kényszerített egyirányú újratöltés, mert az a doki épp elvégzett munkáját
(akár egy tömeges árváltoztatást) dobná el felülbírálati lehetőség nélkül; így a doki mindkét
következményt látva, tudatosan dönt, a 4. döntés verzió-ütközési mintája szerint.

Az index-tükör fájlok (`paciens.json`, `terv-cimke.json`) **szándékosan kimaradnak** az őr
hatóköréből — last-write-wins: sosem system of record, tartalmuk származtatott/újraírható, és
egy mtime-blokk a `savePlan` végén futó index-frissítésnél épp a 23. döntés „halk index-hiba"
elvével ütközne, egy triviális címke-átírásnál pedig indokolatlan konfliktus-dialógust dobna.

Ez ugyanaz az optimista konkurencia-ellenőrzés elve, mint a 4. döntés verziómappa-ütközése,
csak felülírt fájlokra alkalmazva — és nem igényel Drive-API-t vagy szinkronállapot-lekérdezést,
csak egy `stat()` hívást írás előtt. A meglévő `AppState.tsx` `savePriceList`/`saveSettings`
hívásai (updater-alapúak, optimista, hibára nem gördülnek vissza — lásd `CLAUDE.md`
„Sérthetetlen szabályok", updater-only mentés) már ma is alkalmasak erre a kiegészítésre.

### 5.2 A ma szándékos néma `catch {}` helyek

Ezek ma ártalmatlanok, mert `localStorage` gyakorlatilag sosem hibázik (csak kvóta-túllépéskor,
ami ma sincs elnyelve). Valódi fájlrendszer mellett viszont **veszélyessé válnak**, mert a
korábban feltételezett „ez sose fog dobni" hallgatólagos feltevés megdől:

- `PatientEditorPanel.tsx` (`listPatients()` néma elnyelése) — duplikáció-ellenőrzéshez való
  best-effort lista; egy valódi I/O-hiba itt azt jelentené, hogy a doki **nem kap figyelmeztetést**
  egy tényleges névütközésről. **Ajánlott változás:** legalább egy halk, eltűnő jelzés (nem
  blokkoló), hogy „a duplikáció-ellenőrzés nem futott le".
- `PaciensKotesContext.tsx` (ugyanaz a metódus, a páciens-identitás védőháló mögött) — itt a
  kockázat súlyosabb, mert ez GDPR-releváns azonosítási kollíziót véd (`CLAUDE.md` „Sérthetetlen
  szabályok" utolsó sora). **Eldöntve (24. döntés):** ha `listPatients()` hibázik, a
  véglegesítés-őr amber, nem blokkoló checklist-tételt kap („a névütközés-ellenőrzés nem futott
  le") — a korábban itt felvetett konzervatív alternatíva (hiba = mintha lenne ütközés → kemény
  blokk) elvetve, mert egy átmeneti olvasási hiba nem teheti használhatatlanná a véglegesítést,
  a védőháló pedig kiegészítő védelem, nem az elsődleges kontroll.
- `PreviewPage.tsx` (két hely, `loadPatientData()` best-effort betöltés) — a törzsadat-eltérés
  jelzés (törzsadat ↔ terv-pillanatkép összevetés) csendben kimarad egy I/O-hibánál. Elfogadható marad best-effortnak, mert
  ez **puha (info-szintű)** checklist-tétel, nem kemény blokk.
- `EgyebTab.tsx` — draft-cache olvasás, alacsony kockázat, maradhat néma.

Mindegyikről **külön backlog-tételben** kell dönteni a végrehajtáskor, ez a dokumentum csak a
kockázatot jelzi.

**Ismert kivétel, amit ugyanekkor kell kezelni:** a `pages/settings/NyomtatvanyokTab.tsx`
**közvetlenül `localStorage`-ba** ír egy piszkozat-cache-t, teljesen megkerülve a
`PlanStorage`/`DraftStorage` interfészeket (ezt a `docs/reviews/2026-08-25-arch-react-review.md`
már jelezte, de a `docs/05` mai szövege ezt még nem tartalmazza). Electron alatt `localStorage`
a renderer processben **létezik és működik** (Chromium built-in), tehát ez a kód **nem törik
el** — de ez a fájl marad az egyetlen hely, ami nem a `FileSystemStorage`/`DraftStorage`
rétegen keresztül perzisztál, és ezt a váltás pillanatában dokumentálni és megoldani kell (a
legegyszerűbb: ugyanoda kösse be, ahova a `DraftStorage` köti a piszkozat-cache-t).

### 5.3 A diagnosztikai napló redakciója — pontosítás a 18. döntéshez

A 18. döntés úgy fogalmaz, hogy a naplóba „csak útvonal és hibakód" kerülhet, páciensnév nem.
**Ez önmagában ellentmondásos**, mert a `docs/02-domain-modell.md` mappastruktúrája szerint **az
útvonal maga tartalmazza a páciens nevét** (`paciensek/Kovács-János_ab12cd/...`). „Csak az
útvonal" tehát pontosan azt szivárogtatná ki, amit a döntés tiltani akar.

**A pontos szabály:** minden I/O-hiba **két** útvonal-mezőt hordoz:
- `utvonal` — a valódi, teljes útvonal, amit a **felületen** mutatunk a dokinak (szüksége van rá,
  hogy megtalálja a fájlt).
- `naploUtvonal` — **redaktált** változat, ahol a páciensmappa neve az azonosítójára cserélődik:
  `paciensek/#ab12cd/Implantacio_x9k2m1/2026-09-05_v3/terv.json`. Csak ez a mező kerülhet a
  fájlba.

Ezt strukturálisan kell kikényszeríteni (egy elkülönített típus, amit a naplózó függvény
kizárólag ebben a redaktált alakban fogad el), hogy egy nyers string véletlenül se kerülhessen a
naplóba. A `Plan`-objektum maga sosem naplózható teljes egészében.

### 5.4 A PDF-akciók átalakítása (13. döntés)

Négy meglévő letöltési pont érintett, mindegyik ma `URL.createObjectURL(blob)` + `<a download>`
mintát használ, ami böngészőben helyes, asztali appban félrevezető (a fájl már a lemezen van a
verziómappában):

- `PreviewPage.tsx:570` — a frissen véglegesített terv letöltés-linkje
- `TervReszleteiPage.tsx:246` (a `win.location.href = URL.createObjectURL(blob)` minta) és `:424`
- `PatientPlanChains.tsx:186` — a verziósor letöltés-akciója

Mindegyik helyen a „Letöltés" gomb két gombra bomlik:
- **„Megnyitás"** — a main processben `shell.openPath(pdfAbszolútÚtvonal)`, a rendszer alapértelmezett
  PDF-olvasójában nyitja meg a **már mentett** fájlt (nincs ideiglenes blob, nincs másolat).
- **„Másolás máshová"** — `dialog.showSaveDialog()` natív mentés-dialógus, alapértelmezett
  fájlnévvel a meglévő `buildDownloadFileName()` (`storage/paths.ts`) függvényből, alapértelmezett
  célmappával **kifejezetten NEM** a `Letöltések` mappa (13. döntés, `docs/01` már ma tiltja
  OneDrive auto-szinkron kockázata miatt).

A `buildDownloadFileName()` maga változatlan marad — csak a hívási kontextus vált böngésző
`download` attribútumról natív dialógus alapértelmezett névre.

## 6. Gyökérmappa-konfiguráció

### 6.1 Gépenkénti lokális config

Egy kis JSON fájl az Electron `app.getPath('userData')` alatt (pl. `config.json`), **nem** a
`beallitasok.json` (ami maga a gyökérmappában él — tyúk-tojás probléma, és amúgy is gépenként
eltérne). Tartalma minimális:

```json
{
  "schemaVersion": 1,
  "gyokerMappa": "/Users/doki/Google Drive/Mandoki Dental adatok"
}
```

Később ide kerülhet még (nem ennek a tervnek a hatóköre, de a hely már megvan): ablakméret/pozíció
megőrzése, a diagnosztikai napló szintje.

### 6.2 Első indítás varázslója

1. Az app elindul, ránéz a lokális configra — ha nincs `gyokerMappa` bejegyzés, első indításnak
   tekinti.
2. Egy egyszerű képernyő: „Válaszd ki a gyökérmappát" + gomb, ami `dialog.showOpenDialog({
   properties: ['openDirectory'] })`-t nyit.
3. A választott mappa validálása (12. döntés):
   - **Üres mappa** → felépíti a struktúrát (`arlista.json`/`beallitasok.json` a seedből vagy
     az importált demó-exportból, lásd §7; `paciensek/`, `sablonok/` a seed-sablonokkal).
   - **Már a mi struktúránk** (tartalmaz `arlista.json`-t ÉS `paciensek/` mappát) → egyszerűen
     megnyitja, validálja a `schemaVersion`-öket.
   - **Bármi más** (van benne tartalom, de nem a miénk) → elutasítja: „Ez a mappa már tartalmaz
     fájlokat, és nem tűnik a program adatmappájának. Válassz egy üres mappát." Vissza a 2.
     lépéshez.
4. Sikeres validáció után a választott útvonal íródik a lokális configba, és az app a normál
   induló képernyőre lép.

### 6.3 Beállítások — mappa későbbi cseréje

A Beállítások kap egy „Adattárolás" nevű, harmadik-tabnak megfelelő szekciót (a meglévő
`Section.tsx` mintáján, `pages/settings/`), ami:
- Megmutatja az aktuális gyökérmappa útvonalát, „Mappa megnyitása" gombbal (9. döntés — a
  natív fájlkezelőben nyitja meg, `shell.openPath()`).
- „Mappa váltása" akció — ugyanazt a 6.2 varázslót futtatja újra. **Kritikus mellékhatás:** ha
  van aktív, mentetlen piszkozat, ez **ugyanazon a piszkozat-felülírás-őrön kell átmenjen**, mint
  ma minden új-tervet-indító akció (`CLAUDE.md` „Sérthetetlen szabályok" — „minden új tervet
  indító akció a megosztott piszkozat-felülírás-őrön megy át"). A mappa-váltás után a teljes
  memóriabeli állapotot (páciensek, árlista, beállítások) újra be kell tölteni az új mappából —
  ez megegyezik azzal, mintha az app most indult volna újra, csak navigáció nélkül.

### 6.4 Induláskori blokkoló képernyő (10. döntés)

Minden normál induláskor (nem csak első alkalommal) az app ellenőrzi, hogy a configban tárolt
`gyokerMappa` **létezik és olvasható**. Ha nem:

- Teljes képernyős, nem bezárható állapot (nincs NavBar, nincs semmilyen más útvonal elérhető).
- Üzenet: „A beállított adatmappa (`<útvonal>`) nem érhető el. Lehet, hogy a Google Drive még
  nem szinkronizált, vagy egy külső lemez nincs csatlakoztatva."
- Két akció: **„Újrapróba"** (egyszerűen újra megnézi, elérhető-e — nincs automatikus
  ismétlődő polling, a doki dönt, mikor próbálja újra, a 6. döntéssel összhangban) és
  **„Másik mappa kiválasztása"** (visszaviszi a 6.2 varázslóba).

## 7. Demó-export → import híd

**Egyszeri, a demó nyugdíjazása ELŐTTI lépés.** A ma is élő GitHub Pages-demó kap egy új akciót
(a meglévő „Adatkezelés" fülön, mielőtt az a fül törlődik — lásd §8).

### 7.1 Export a demóból

**„Adatok exportálása az asztali alkalmazáshoz"** gomb, jól látható helyen (a meglévő
`DemoBanner` is jelezze, hogy ez a lépés a demó nyugdíjazása előtt kötelező). Egyetlen JSON
fájlt generál és letölt (`kezelesi-terv-export-<ISO dátum>.json`):

```jsonc
{
  "formatum": "dental-plan-export",
  "schemaVersion": 1,
  "keszult": "<ISO időbélyeg>",
  "arlista":     { /* pontosan az arlista.json tartalma */ },
  "beallitasok": { /* pontosan a beallitasok.json tartalma */ },
  "sablonok": {
    "nyilatkozat-hu-v1.md": "…",
    "fizetesi-feltetelek-hu-v2.md": "…"
    /* … minden sablon, a doki által esetlegesen már elkezdett lektorálással */
  }
}
```

**Páciensadat szándékosan NEM kerül bele** — a demóban lévő 22 seed-páciens fiktív, és a
`DemoBanner` már ma is figyelmezteti a dokit, hogy ne vigyen be valódi páciensadatot; egy ilyen
adat importja csak szemetet ültetne egy éles gyökérmappába, amit utána páciensenként kellene
kitörölni.

Egyetlen JSON fájl, nem ZIP: nincs függőség egyik irányban sem, a doki akár e-mailben is
átküldheti magának a két gép között, és az importáló kód pár tucat sor. A generálás **a
`storage.loadPriceList()`/`loadSettings()`/a sablonok interfészen keresztüli beolvasásával**
történik (nem közvetlen `localStorage`-olvasással), és a kiírás előtt lefuttatja
`assertPriceListShape`/`assertSettingsShape`-et — így egy sérült demó-állapot **exportáláskor**
bukik el hangosan (amikor a doki még javíthat a demóban), nem importáláskor egy friss gépen.

### 7.2 Import a telepített appban

A telepített app első indítás varázslója (6.2) egy negyedik lehetőséget kap az „üres mappa"
ágban: „Van egy exportált fájlom a demóból" → natív fájlválasztó → beolvasás és validáció, **ebben
a sorrendben**: `formatum === 'dental-plan-export'` → `schemaVersion` nem túl magas → az árlista
és a beállítások `assertPriceListShape`/`assertSettingsShape` szerint érvényes → minden
sablonkulcs `<név>-v<szám>.md` mintájú és minden érték string. **Bármelyik lépés bukása esetén
semmi nem íródik ki** — piros `Callout` a konkrét okkal, és az „Alapértelmezett készlettel"
lehetőség (üres seed-adat) továbbra is felkínálva. Sosem részleges import.

A sablonoknál **egyesítés, nem felülírás**: az exportban szereplő sablonok győznek, a belőle
hiányzók (pl. a doki sosem jutott el a DE v2 lektorálásáig) a beépített alap-sablonkészletből
töltődnek ki — így egy friss gyökérmappa mindig teljes sablonkészlettel indul. Ez ugyanaz az
idempotens elv, mint a mai `ensureSeedTemplates()`, csak a placeholder-felülíró ága nélkül (az
egy demó-only frissítési út volt, és pont az ellenkezője annak, amit itt garantálni kell: a doki
valódi, már beírt szövegét sosem szabad felülírni).

Megerősítő összegzés az írás előtt: „Betöltve: 118 ártétel, 3 orvos, 8 sablon."

**Ajánlás a 7. döntésen túl:** ugyanez az importáló érhető el a Beállításokból is („Árlista és
beállítások importálása…") — ugyanazt a kódutat használva. „A doki elfelejtett exportálni,
mielőtt a demó megszűnt" a teljes terv legvalószínűbb hibaforrása, és egy második belépési pont
(akár egy később előkerült export-fájlból) sokat old ebből a kockázatból.

A Pages-deploy (`.github/workflows/deploy.yml`) csak **azután** kapcsolható le, hogy a doki
megerősítette: sikeresen exportált és importált. Ez nem automatizálható lépés — emberi
megerősítést igényel, mielőtt a demó véglegesen eltűnik.

## 8. A demó lebontása — pontosított hatókör

**A feltárás egy hibás előfeltevést javított ki a grillezés során:** a `/demo` route öt fülből
áll (`pages/DemoPage.tsx`), és **csak kettő valódi demó-only** — a másik három marad, csak más
route alá kerülhet:

| Fül | Sors |
|---|---|
| **Összes terv** (`pages/demo/OsszesTervSection.tsx`) | **Valódi funkció**, nem demó — a `PatientPlanChains` összes-páciens nézete. A mai `/tervek` route már ma is ide irányít át (`Navigate to="/demo/tervek"`). A lebontáskor ez egy önálló, `/demo` nélküli route-ra (`/tervek` közvetlenül) költözik. |
| **Funkciók** (`FEATURES.md` megjelenítése) | Megmarad, súgó jelleggel — új, `/demo` nélküli route |
| **Változásnapló** (`CHANGELOG.md` megjelenítése) | Megmarad — **kézi frissítés mellett fontosabb, mint valaha**: a doki innen tudja meg, mi változott a most kézzel feltelepített új verzióban, mert nincs automatikus release notes-felugró |
| **Filerendszer** (`pages/demo/FileTreeSection.tsx` + `pages/demo/fileTree/`) | **Törlődik** — helyette a 6.3 „Mappa megnyitása" natív akció |
| **Adatkezelés** (`pages/demo/AdatkezelesSection.tsx`) | **Törlődik** — a `resetDemoData()`/`clearAll()` éles páciensadaton veszélyes destruktív művelet, aminek semmi haszna a telepített appban |

A fülek mellett a **`DemoBanner`** (`components/DemoBanner.tsx` — az `App.tsx`-ből **minden
oldalon** renderelődik, szövege a böngészős, titkosítatlan tárolásra figyelmeztet) is
demó-only felület: a §7 export-időszakban még ő hordozza az export-felszólítást, a 3.
mérföldkőben a fülekkel együtt törlődik.

Ezzel együtt megszűnik/módosul:
- `app/src/storage/demoFileTree.ts` (+ teszt) — teljes törlés.
- `StorageContext.tsx` `listFileTree`/`readRawFile`/`resetDemoData`/`clearAll`/`isSeedVersion`
  mezői — törlődnek a kontextusból.
- `app/src/storage/seed/` — **nem egységesen** költözik. Ez pontosítás a 8. döntéshez: a
  `seed/plans.ts` (a 22 fiktív demó-páciens) tisztán tesztfixture, a `tests/`
  (vagy `src/test-utils/`) alá költözik. **A `seed/priceList.ts`, `seed/settings.ts` és
  `seed/templates.ts` viszont TERMÉKBELI marad** — ezek adják a friss gyökérmappa
  alapértékeit (§6.2 „üres mappa" ága) és a demó-export hiányzó sablonjainak pótlását (§7.2
  „egyesítés"). Csak azért éltek eddig a `seed/` mappában együtt a fiktív páciensekkel, mert a
  demóban mindkettőnek ugyanaz volt a szerepe (kiindulási állapot) — a telepített appban a
  szerepük szétválik.
- `seed/priceList.ts` ma **modulbetöltéskor** futtatja az `assertPriceListShape`-et. Ha ez a fájl
  a main process bundle-jébe kerül, ez az ellenőrzés az Electron indulásakor, még ablak
  megnyitása előtt futna le — ezt körbe kell zárni, hogy hiba esetén a varázslóban jelenjen meg,
  ne a main process összeomlásaként.
- Az `isSeedVersion` megszűnése **közvetlenül érinti** a `nincsMentettPdfHiba(ref, demoEredetu)`
  (`PlanVersionActionDialog.tsx`) demó/valódi-hiány megkülönböztetést, amit
  `PatientPlanChains.tsx` és `TervReszleteiPage.tsx` hív. Valódi fájlrendszeren **minden**
  hiányzó PDF valódi hiba (nincs többé „ez csak seed-adat, sosincs PDF-je" eset) — ez a
  függvény és a hívási helyei **egyszerűsödnek**, nem bővülnek: a `sulyossag: 'info'` ág
  megszűnhet, minden hiányzó PDF `'hiba'` súlyosságú lesz.

## 9. Build, csomagolás, kiadás

### 9.1 Repo-elrendezés

Az Electron main/preload források **nem** kerülnek az `app/src/` alá (ami a renderer bundle-je),
hanem egy testvér-mappába, pl. `app/electron/` (`main.ts`, `preload.ts`, `fileSystemStorage.ts`,
`ipcHandlers.ts`), saját, szűkebb `tsconfig.electron.json`-nal (Node target, nem DOM lib). A
`package.json` egyetlen marad (nincs szükség workspace-re ekkora projektnél), de kap:

**Megosztott modulhatár:** a `FileSystemStorage` (main process) a meglévő renderer-oldali kód
egy részét importálja — `storage/paths.ts`, `storage/json.ts`, a séma-validálók
(`domain/validate.ts`, `domain/schema.ts`) és a termékbeli seedek (`storage/seed/priceList.ts`,
`seed/settings.ts`, `seed/templates.ts`). Explicit követelmény: **ezek a modulok DOM-mentesek
maradnak** (ma azok), bekerülnek a `tsconfig.electron.json` include-jába, és a
`seed/priceList.ts` `app/`-on KÍVÜLI importját (`../../../../data/arlista.seed.json`) az
Electron-oldali build/bundler is kezelni tudja. Aki e modulok bármelyikébe böngésző-API-t
vezetne be, az a main process buildjét töri el — ez a határ a §13 táblában is jelölt.
- `main` mező, ami az Electron belépési pontjára mutat (`electron/main.js`, a build kimenete).
- Új scriptek: `electron:dev` (vite dev szerver + Electron egyszerre, pl. `concurrently`),
  `electron:build` (a renderer build + az electron TS fordítása), `electron:package`
  (`electron-builder`).
- Új devDependency-k: `electron`, `electron-builder`, `concurrently` (vagy hasonló).

### 9.2 `electron-builder` konfiguráció

Aláírás nélküli build mindkét platformra (2. döntés):
- **Windows**: `nsis` target, `x64`. Aláírás nélkül a SmartScreen figyelmeztet — ez elfogadott
  kockázat.
- **macOS**: `dmg` target, **mindkét architektúra** (`arm64` + `x64` — Apple Silicon és Intel
  Macek egyaránt lehetnek a rendelőben/otthon), a 21. döntés szerint: az electron-builder
  **alapértelmezett ad-hoc aláírása** (fizetős tanúsítvány és notarizáció nélkül), a Release
  mellé csomagolt `.command` segédscripttel, ami a letöltött app karanténjelzését leveszi
  (`xattr -dr com.apple.quarantine`). A telepítési útmutató explicit írja le: (1) a scriptet
  **minden frissítés után** újra kell futtatni, mert a karantén minden letöltésre újra
  rákerül; (2) első alkalommal magát a scriptet is jobbklikk → „Megnyitás"-sal kell indítani,
  mert a letöltött script ugyanúgy karanténba kerül; (3) a script nélkül a Gatekeeper az
  ad-hoc aláírt, karanténos appra a félrevezető „sérült, és nem nyitható meg" üzenetet adná.

### 9.3 GitHub Actions release-workflow

Új workflow (`.github/workflows/release.yml`), ami **git tag-re** (`v*`) indul, nem push-ra:

```yaml
on:
  push:
    tags: ['v*']

jobs:
  build:
    strategy:
      matrix:
        os: [windows-latest, macos-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - checkout, setup-node (mint a deploy.yml-ben)
      - npm ci, npm test (mindkét platformon fusson le a teszt — ez elkapja a platformspecifikus
        FileSystemStorage-hibákat, lásd §10)
      - npm run electron:package
      - a kimenetet (.exe / .dmg × 2 arch) feltölteni a GitHub Release-be
        (softprops/action-gh-release vagy hasonló)
```

A meglévő `deploy.yml` (Pages) **push-ra** indul a `master`-re, változatlanul a demó
életciklusa alatt (1–2. mérföldkő). A 3. mérföldkőben (§10) ez a workflow **törlődik** a demó
lebontásával együtt.

## 10. Mérföldkövek

A 17. döntés szerinti három lépés — mindegyik végén **futó, a dokinak megmutatható app** —, egy
előkészítő 0. mérföldkővel megelőzve.

### 10.0 Mérföldkő 0 — előkészítés (fél nap, Pages-re megy, nincs benne Electron)

Apró, de a későbbi mérföldköveket megalapozó javítások a mai kódban, amiket érdemes **külön,
kockázatmentes lépésként** elvégezni, mielőtt bármi Electron-specifikus munka elindul:

- A `sanitizeNamePart()` (`storage/paths.ts`) a záró pont/szóköz vágása **után** még egyszer
  ellenőrzendő, hogy a `.slice(0, MAX_NAME_PART_LENGTH)` nem hagyott-e új záró szóközt/pontot a
  vágás helyén; illetve foglalt Windows-fájlnevek (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`,
  `LPT1`–`LPT9`) elleni védelem hozzáadása (lásd §4.6).
- A `DemoStorage.ts`-ben lévő `dp:` prefix kiemelése egy önálló `storage/localKeys.ts` fájlba —
  ez szünteti meg a `pages/settings/NyomtatvanyokTab.tsx` ma illegális, közvetlen
  `DemoStorage`-belső-tudásra épülő importját (lásd §5.2 „Ismert kivétel").
- A `PlanStorage` interfész bővítése egy `listTemplates(): Promise<string[]>` metódussal — ezt
  igényli mind a demó-export (§7.1), mind a `FileSystemStorage` (a `sablonok/` mappa tartalmának
  listázásához).
- A ma `StorageContext`-en kívül, demó-only mezőként élő `loadPlanPdf`/`loadLatestTemplateByBase`
  felvétele magára a `PlanStorage` interfészre — mindkettő valódi, a végleges appban is
  szükséges művelet, nem demó-kényelem.

**Kész-definíció:** `npm test` zöld, a Pages-demó viselkedése változatlan.

### 10.1 Mérföldkő 1 — Electron-héj a meglévő localStorage-appal

**Mi történik:** a mai `app/` React-alkalmazás változatlanul, `DemoStorage`-zal (localStorage)
fut, de Electron ablakban, telepíthető formában. Ez a legkisebb kockázatú első lépés — nincs
storage-logika-változás, csak a futtatási környezet.

**Kész-definíció:**
- `npm run electron:package` mindkét platformon telepíthető csomagot ad.
- A telepített app mindkét gépen (Windows + Mac) elindul, a NavBar minden route-ja működik.
- A mai teljes funkcionalitás (terv szerkesztés, árlista admin, PDF-generálás és -előnézet,
  beállítások) érintetlenül működik — mert `DemoStorage` `localStorage`-ja Electron rendererben
  ugyanúgy jelen van, mint böngészőben.
- CSP bekapcsolva, `contextIsolation`/`sandbox` bekapcsolva, ellenőrizve, hogy semmi nem törik
  el emiatt.
- A Playwright `_electron` füst-teszt (27. döntés) mindkét CI-runneren zöld: az app elindul,
  a kezdőlapról képernyőkép készül, a konzol hibamentes.
- A GitHub Actions release-workflow (9.3) lefut és Release-t hoz létre egy teszt-tagre.

**Ez a mérföldkő azért éri meg önálló lépésnek, mert négy konkrét, olcsón ellenőrizhető dolgot
tisztáz, mielőtt bármi fájlrendszeres munkába fektetnénk:**
1. A `PreviewPage`/`TervReszleteiPage` PDF-nézete Electron beépített Chromium PDF-megjelenítőjén
   (`plugins: true` a `BrowserWindow`-on) rendereli-e helyesen a PDF-et.
2. A DevTools konzol **nulla CSP-sértést** mutat az `/elonezet` oldalon — ez válaszolja meg
   legolcsóbban, kell-e `'wasm-unsafe-eval'` a `script-src`-be (lásd §11).
3. A lazy-betöltött `PreviewPage` chunk (`@react-pdf/renderer`, ~1,5 MB) helyesen töltődik-e az
   `app://` protokoll + `base: './'` + `HashRouter` kombináció alatt — és vele együtt a
   render-időben fetch-elt assetek: a két Noto Sans TTF (`pdf/fonts.ts`) és a logó
   (`pdf/tervDocument/Chrome.tsx`), azaz a generált PDF-en ténylegesen a beágyazott font és a
   logó látszik-e (lásd §3.5).
4. A doki mindkét gépén ténylegesen telepíteni tudja-e a csomagot, és milyen a
   Gatekeeper/SmartScreen-súrlódás a gyakorlatban — **mielőtt** bármilyen storage-munka
   megtörténne rá építve.

**Mi NEM változik itt:** semmilyen `PlanStorage`-implementáció, semmilyen fájlrendszer-írás.

### 10.2 Mérföldkő 2 — `FileSystemStorage` + gyökérmappa

**Mi történik:** a §3–§7 teljes tartalma — IPC-réteg, `FileSystemStorage`, atomi írás,
hibataxonómia, első indítás varázslója, blokkoló képernyő, diagnosztikai napló, demó-export
import. Ez a legnagyobb, legkockázatosabb lépés.

**Kész-definíció:**
- Egy valódi Google Drive-mappában (nem lokális teszt-mappában) a doki végigmegy a teljes
  workflow-n mindkét gépén: páciens felvétele, terv szerkesztése, véglegesítés, PDF megnyitása,
  a másik gépen a lánc folytatása.
- A keresztgépes verzió-ütközés (4/4.5. döntés) **ténylegesen kiváltható** (két gépen egyszerre
  elindított, majd egymás után mentett terv) és helyesen blokkol, a doki dönthet.
- Egy szimulált zárolási hiba (pl. a fájl megnyitva tartása másik programmal mentés közben)
  automatikusan újrapróbál és felold, VAGY tartós zárolásnál olvasható hibát ad.
- A hiányzó gyökérmappa esetén a blokkoló képernyő működik, „Újrapróba" és „Másik mappa" is.
- A diagnosztikai napló ténylegesen tartalmaz bejegyzést egy szimulált I/O-hibáról, és nem
  tartalmaz páciensnevet.
- Az Unicode NFC/NFD normalizáció tesztelve: egy Windowson létrehozott ékezetes nevű páciens
  helyesen megjelenik és szerkeszthető macOS-en importált/szinkronizált mappában.

### 10.3 Mérföldkő 3 — Demó lebontása

**Mi történik:** §8 teljes tartalma, plusz a `docs/05-technologia.md` és `CLAUDE.md`
átvezetése (a Tauri-bekezdés cseréje, a „Két fázisú build" szakasz frissítése az immár
megvalósult állapotra).

**Kész-definíció:**
- `DemoStorage` átnevezve/átalakítva `InMemoryStorage`-zá (lásd 10.4), a termékkód sehol nem
  hivatkozik rá.
- A demó-only UI-fülek (Filerendszer, Adatkezelés) törölve, a másik három (§8) élő route alatt.
- `deploy.yml` törölve, a Pages-oldal offline.
- A vitest-készlet zöld.

### 10.4 Hogyan marad zöld a vitest-készlet

A `DemoStorage.test.ts` (33 KB) és számos oldalteszt (`PatientEditorPanel`, `PaciensekPage`,
`NewPlanPage` stb.) ma közvetlenül a `DemoStorage`-ra épül. A migráció lépései:

1. **Mérföldkő 1-nél**: nincs teendő — `DemoStorage` változatlan marad, a tesztek zölden futnak.
2. **Mérföldkő 2-nél**: a `FileSystemStorage` **saját, új tesztkészletet** kap, ami egy valódi
   ideiglenes mappa ellen fut (Node `fs.mkdtemp(os.tmpdir())`), Node-környezetben (nem jsdom) —
   ezek a tesztek célzottan az atomi írást, az újrapróba-logikát, az NFC/NFD normalizációt és a
   verzió-ütközés race conditiont fedik le szintetikus hibainjektálással (pl. egy mock, ami
   szimulál egy `EBUSY`-t az első két hívásra). A meglévő oldaltesztek ekkor **még mindig**
   `DemoStorage`-ra épülnek, változatlanul.
3. **Mérföldkő 3-nál**: `DemoStorage.ts` fájlt átnevezzük/átmásoljuk `InMemoryStorage.ts`-re egy
   teszt-segédkönyvtárba (pl. `app/src/test-utils/InMemoryStorage.ts`), a tárolóréteget
   `localStorage`-ról egy egyszerű `Map<string, string>`-re cserélve (a többi logika —
   `enqueue`/`savingChain`, validáció, mappanév-építés — **változatlan** marad, csak a
   perzisztencia-primitívum cserélődik). A meglévő oldaltesztek importjai
   `DemoStorage`/`StorageProvider`-ről erre az új teszt-segédre állnak át. Csak a `seed/plans.ts`
   (a 22 fiktív páciens) költözik ide tisztán tesztfixture-ként — a `seed/priceList.ts`,
   `seed/settings.ts`, `seed/templates.ts` termékbeli marad (lásd §8 pontosítás). Az
   `isSeedVersion`/`listFileTree`/`readRawFile` metódusok, amiknek nincs több hívója (§8), a
   teszt-segédből is törlődnek.

Ez az út tartja a legtöbb meglévő tesztet **szó szerint változatlanul** (csak az import forrása
változik), miközben a `FileSystemStorage` a saját, valódi-fájlrendszerre épülő tesztkészletét
kapja — a két réteg egyike sem teszteli a másikat helyette.

**Konkrét buktatók, amikre a végrehajtáskor számítani kell:**
- A repo saját `dokumentacioGuard.test.ts`-je **fájlonkénti relatív útvonal szerint** számolja a
  `D<szám>`-hivatkozások számát egy baseline-hoz képest. Egy `DemoStorage.ts` → `InMemoryStorage.ts`
  átnevezés/áthelyezés a teszt szemével egy vadonatúj fájlnak számít 0 baseline-nal — a benne
  élő ~15 hivatkozás ezért „gyanús növekedésként" bukna. **A `dokumentacioGuard.baseline.json`-t
  a mérföldkő ugyanabban a commitjában újra kell generálni.** Ez fordítva is igaz minden más
  ebben a tervben mozgatott/törölt fájlra. Amit ez a teszt **külön véd**, és aminek **tilos
  változnia**: a `docs/01` D-táblájának sorszáma és legmagasabb sorszáma — az egy lezárt,
  történeti napló, ebből a migrációból egyetlen sor sem törölhető vagy mozdítható.
- A `DemoStorage.test.ts` (~750 sor) nagy része túléli az átnevezést, de a `resetDemoData`/
  `clearAll`/`listFileTree`/`readRawFile` tesztjei, a legacy-layout-migrációs blokk és a
  kvóta-injektálásos tesztek (`vi.spyOn(localStorage, 'setItem')`) törlendők vagy átírandók egy
  dobó `Map`-re.
- A `test-setup.ts` meglévő `MemoryStorage` shimje **megmarad** — a piszkozat és a
  sablon-piszkozat cache a 25. döntés szerint változatlanul `localStorage`-t használ Electron
  alatt is (a `docs/05`/`CLAUDE.md` „véglegesben IndexedDB" kitételének frissítése a
  mérföldkő-lezárási referencia-seprés része).
- `Home.test.tsx`, `AppState.test.tsx`, `AdatkezelesSection.test.tsx`, `FileTreeSection.test.tsx`,
  `OsszesTervSection.test.tsx` mindegyike tartalmaz a demó-viselkedéshez kötött feltevést
  (kommentben is jelölve némelyik) — ezeket egyenként át kell nézni, nem csak az importot cserélni.

## 11. Kockázatok és nyitott kérdések

Amit a fenti döntések még nem fednek le, és amit a végrehajtás előtt tudatosan vállalni kell:

- **A két gép eltérő app-verziója melletti `schemaVersion`-ütközés.** Kézi frissítés (2. döntés)
  mellett reális, hogy a Windows gép frissül, a Mac hetekig a régi verziót futtatja tovább. Ha
  eközben egy `schemaVersion: 2` séma bevezetésre kerül és a Windows gép ír egy ilyen fájlt, a
  Mac gépen futó régi verzió **helyesen megtagadja a betöltést** (a mai `assertKnownSchemaVersion`
  szerint) — ez a viselkedés helyes, de a doki élménye rossz lesz, ha nem érti, miért nem látja a
  legfrissebb tervet. A sémamigrációs keretrendszer (backlog, kidolgozásra vár tétel) szándékosan
  hatókörön kívül van ebben a tervben — ez egy **tudatosan vállalt kockázat**, aminek a mértéke
  attól függ, milyen gyakran vezetünk be új `schemaVersion`-t, és milyen gyorsan frissít a doki.
- **A „docs/05-technologia.md 1-2 nap" becslés tarthatatlan** ehhez a hatókörhöz. Az interfész
  valóban tiszta (ez sokat ér — nulla domain-/UI-kód változik), de az Electron-héj, az
  IPC-réteg, az atomi írás + újrapróba-logika, a teljes hibataxonómia, az első indítás
  varázslója, a blokkoló képernyő, a csomagolás és a kétplatformos CI együtt **nagyságrendekkel
  nagyobb** munka. Ez a dokumentum tudatosan **nem ad új időbecslést** — ez a backlog-tételek
  kivágásakor, tételenként történjen.
- **A `@react-pdf/renderer` viselkedése Electron alatt** — a mai mockup böngészőben fut, ahol a
  `usePDF()` hook és a fontregisztráció/canvas→PNG fogtérkép-út (`pdf/toothChartImage.ts`)
  Chrome/Edge motorban tesztelt. Electron ugyanaz a Chromium, de a főfolyamat/renderer
  szétválasztás és a CSP-szigorítás (3.4) elvben nem érinti a renderelést — ezt explicit
  ellenőrizni kell az 1. mérföldkőben (a `@react-pdf/renderer` böngésző-only kódot futtat-e,
  ami esetleg Node-környezetet feltételezne valahol).
- **A `browser-validation` skill sorsa.** Ma a `.claude/skills/browser-validation/` chrome-devtools
  MCP-vel a **Vite dev szervert** hajtja `--isolated` módban (ellenőrzés: kontraszt,
  `controlBorder`, valódi PDF, canvas→PNG fogtérkép, `paint-order`, Radix popover-geometria).
  Electron-ablak ellen ez a fajta böngésző-automatizálás máshogy néz ki (nincs önálló URL, amire
  navigálni lehetne) — a `CLAUDE.md` „Böngésző-automatizálás — nem tárgyalható" tiltása
  (valós Chrome-profilhoz csatlakozás tilalma) értelemszerűen **megmarad**, de a skill technikai
  megvalósítását felül kell vizsgálni a 2. mérföldkőnél, VAGY a validáció addig is a
  vite-dev-szerveres böngésző-úton marad (a renderer-kód ugyanaz, Electronban és böngészőben is),
  és csak a végső csomagolt app manuális, kézi ellenőrzést kap.
- **A Google Drive „Tükrözés" mód kikényszeríthetetlensége.** A `docs/01-attekintes-es-dontesek.md`
  már ma előírja, hogy a Drive kliens „Tükrözés" (Mirroring), ne „Streamelés" módban fusson —
  de ezt az app **nem tudja ellenőrizni vagy kikényszeríteni**, ez a doki gépén egy egyszeri,
  kézi beállítás, amit a telepítési útmutatónak kell hangsúlyoznia.
- **A macOS aláíratlan telepítés a 2. döntés eredeti szövegénél rosszabb élmény volt — eldöntve
  (21. döntés): ad-hoc aláírás + telepítő-script.** A háttér: egy teljesen aláíratlan `arm64`
  app **el sem indul**; az `electron-builder` alapértelmezett ad-hoc aláírása elindíthatóvá
  teszi, de egy GitHub-ról letöltött DMG karanténjelzést (`com.apple.quarantine`) kap, és a
  Gatekeeper ilyenkor **„…sérült, és nem nyitható meg — helyezd át a Kukába"** üzenetet ad —
  nem a barátságosabb „ismeretlen fejlesztő / Megnyitás mindenképp" dialógust. A doki a
  mérlegelés után a script-alapú megoldást választotta az évi ~99 USD-s Apple Developer ID +
  notarizáció helyett — a script minden frissítés után újra futtatandó, ezt a telepítési
  útmutató explicit tartalmazza (részletek: §9.2).
- **A Windows SmartScreen minden egyes kiadásnál újra jelentkezik**, nem csak egyszer — EV
  tanúsítvány nélkül aláíratlan bináris sosem gyűjt „hírnevet". A 2. döntés ezt elfogadta, de a
  dokinak explicit tudnia kell, hogy ez **frissítésenként** ismétlődik, nem egyszeri súrlódás.
- **A 4. döntés (verziómappa-ütközés kemény blokkja) nem fedi le a felülírt fájlokat** — ezt a
  §5.1 mtime-alapú kiegészítése (26. döntés: választós konfliktus-dialógus, system-of-record
  hatókör) oldja meg, de az `arlista.json`/`beallitasok.json`/
  `paciens-adatok.json` esetében ez **a legfontosabb, korábban fedezetlen kockázat** volt: e
  fájlok csendes felülíródása adatvesztést jelentene hangos hiba nélkül.
- **`savePlan()` viselkedésváltozása: a mai verzió a `paciens.json` index-írás hibáján is
  elbukik, valódi fájlrendszeren ez a viselkedés megváltozna** (a verziómappa már véglegesítve
  van, mire az index-írás következik). Ha ilyenkor mégis hibát dobnánk, az egy ténylegesen
  tartósan mentett dokumentumot mutatna sikertelennek a dokinak — pontosan az a hiba, amit a
  `CLAUDE.md` sérthetetlen szabálya (a piszkozat-takarítási hiba sosem „a mentés nem sikerült")
  már ma kizár egy másik lépésre. **Eldöntve (23. döntés):** az index-írás hibája a véglegesítés
  SIKERÉT nem ronthatja le, csak halk jelzést kap — a doki ezt explicit jóváhagyta.
- **Blokkolja-e egy `listPatients()`-hiba a véglegesítést?** Ma egy ilyen hiba csendben
  kikapcsolja a GDPR-motivált névütközés-védőhálót (§5.2, `PaciensKotesContext.tsx`).
  **Eldöntve (24. döntés):** amber (nem kemény blokkoló) checklist-tétel — egy átmeneti
  olvasási hiba nem teheti az egész appot használhatatlanná, a védőháló pedig kiegészítő
  védelem, nem az elsődleges kontroll; a doki ezt explicit jóváhagyta.
- **A napló-fájl konkrét formája még nyitott:** `userData/naplo/io.log` + `io.1.log`, fájlonként
  ~1 MB korlát, két fájl body forgatva, `fsync` nélkül (a napló elvesztése egy összeomláskor
  elfogadható, a páciensadat elvesztése nem). Minden induláskor egy fejléc-sor: app-verzió, OS,
  és **a gyökérmappa útvonala** — ez utóbbi a doki mappájának nevét tartalmazza, nem
  páciensnevet, tehát biztonságos, és ez a legtöbbet érő sor egy távsegítségnyújtáshoz.
- **Eltávolításkor a `userData` a gépen maradna, benne a piszkozat — ami valódi páciensadatot
  tartalmazhat.** Ez ellentmondana annak a doki-elvárásnak, hogy „minden adatom a
  gyökérmappában van". **Eldöntve (22. döntés):** a deinstalláló törli a `userData`-t is;
  cserébe egy újratelepítés elveszíti a gépenkénti configot (6.1) és újra lefuttatja a
  varázslót (~10 másodperc) — a doki ezt jóváhagyta.
- **Az `app://` (vagy bármilyen egyedi) protokoll-név egyszer választott, tartós döntés** — ez
  adja a renderer `localStorage`-partíció kulcsát is, és a 25. döntés (a piszkozat
  localStorage-ban marad) miatt ez élő adatot érint. Egy későbbi verzióváltás, ami megváltoztatja
  a protokollnevet vagy a hosztot, **csendben kiürítené** minden folyamatban lévő piszkozatot és a
  sablon-piszkozat cache-t. Egyetlen, jól kikommentezett konstansként kell kezelni.
- **Nincs automatizált GUI-teszt a csomagolt appon.** A `browser-validation` skill a fejlesztői
  Vite-szervert hajtja, egy csomagolt Electron-appot (nincs önálló URL) nem tud — ez a mérföldkő
  1 kész-definíciójának több pontját (PDF-megjelenítő, CSP-sértés-mentesség) **kézi, mindkét
  operációs rendszeren megismételt ellenőrzéssé** teszi minden kiadásnál. **Hatókörbe emelve
  (27. döntés):** egy Playwright `_electron` füst-teszt (indítás, képernyőkép a kezdőlapról,
  konzolhiba-mentesség, ~40 sor) már az 1. mérföldkőben bekerül, mindkét CI-runneren — a
  mélyebb vizuális validáció ettől még kézi marad.
- **A „byte-identikus PDF mindkét platformon" érv egy repedése.** Az Electron valóban ugyanazt a
  Chromiumot és `@react-pdf/renderer`-t garantálja mindkét platformon, beágyazott Noto Sans
  betűkkel (nincs rendszerbetűkészlet-visszaesés). De a `pdf/toothChartImage.ts` a fogtérképet
  **canvason keresztül PNG-be** rendereli, és a canvas szövegrasterizálása Windows és macOS
  között finoman eltér (antialiasing, hinting). Ha a `buildToothChartSvg` fogszámokat szövegként
  rajzol, a PDF-be ágyazott PNG **nem lesz bájtra azonos** a két gépen. Ez nem jogi probléma egy
  szerződésnél, de aláássa a §1-ben kimondott indoklást — érdemes megvizsgálni, mielőtt valaki
  két PDF-et összehasonlítva megijedne egy eltéréstől.
- **A `listPatients()` költsége nagyobb, mint elsőre tűnik.** 300 páciensnél ez 300 `readFile`
  hívás — lokálisan ~60 ms, egy hidegen induló Drive-tükrözött mappánál akár 2-5 másodperc is
  lehet. Ezt hívja a `PaciensKotesProvider` minden `plan.paciensId`-változáskor, **és** belsőleg
  maga a `savePlan()` is — egy véglegesítés így **két teljes bejárást** indít. A 14. döntés
  (nincs cache) ma helyes, de ha ez valaha fájdalmassá válik, ez az első és egyetlen hely, amit
  cache-elni érdemes — az érvénytelenítés triviális (bármelyik írás a sorosított láncon át).

## 12. Amit ez a terv NEM tartalmaz

A hatókörön (16. döntés) kívül tudatosan hagyott munkák, saját jövőbeli backlog-tételként:

- **`terv.json` beágyazása a PDF-be** (`pdf-lib`) — a `docs/05-technologia.md` már ma előírja
  („a `terv.json` beágyazása azért kell, mert a különálló JSON és PDF szét fog csúszni abban a
  pillanatban, amikor a doki e-mailben csak a PDF-et küldi el"), de **ma nincs megvalósítva**.
  Valódi fájlrendszernél ez a redundancia még többet ér (egy sérült/törölt `terv.json` mellett a
  PDF-ből még visszaállítható a terv), de ez a jelen terv hatókörén kívül marad.
- **Sémamigrációs keretrendszer** — a backlog már ma nyitva tartja („kidolgozásra vár" 6. tétel):
  fájltípusonkénti verziólépések, mentés előtti biztonsági másolat, validáció, részleges hiba
  utáni visszaállás, régi adatokon futó migrációs tesztek. Ennek hiánya a fő forrása a §11 első
  kockázatának.
- **Backup/ZIP-export funkció** — a `docs/01-attekintes-es-dontesek.md` ma annyit mond: „a Drive
  szinkron nem backup: negyedévente kézi másolat külső lemezre". Egy appon belüli „teljes
  gyökérmappa mentése ZIP-be" akció ezt kikényszeríthetővé/emlékeztethetővé tenné, de ez a
  jelen terv hatókörén kívül marad.
- **`PISZKOZAT` státuszú mentett verziók** (a backlog „kidolgozásra vár" 5. tétele — több
  félretett, később folytatható kezelési terv az append-only mentési útvonalon) — ez érintené a
  `rendezettLancok()` (`planChainData.ts`) „kulcs nélküli lánc a lista végére" előkészített
  logikáját, de önálló funkcionális döntés, nem ennek a tervnek a tárgya.

## 13. Kritikus fájlok — gyors tájékozódás backlog-tételek kivágásához

| Fájl | Miért kritikus |
|---|---|
| `app/src/storage/PlanStorage.ts` | A szerződés, amit a `FileSystemStorage`-nak (main) és a renderer oldali IPC-proxynak egyaránt teljesítenie kell; a 10.0 mérföldkőben bővül `listTemplates`/`loadPlanPdf`/`loadLatestTemplateByBase`-zel |
| `app/src/storage/DemoStorage.ts` | A referenciaimplementáció, amit metódusról metódusra kell portolni (`enqueue`/`savingChain`, `doSavePlan`, `deletePatient` mappa-bejárás) — és a demó-only felület forrása, ami törlődik |
| `app/src/storage/paths.ts` | Megosztott a main és a renderer között; itt kell javítani a `sanitizeNamePart` szélső eseteit (10.0) és bővíteni a `VersionConflictError` payloadját (4.5) |
| `app/src/storage/StorageContext.tsx` | Az egyetlen varrat, ahol a `DemoStorage` → build-idejű célválasztás történik; a `useMemo(..., [])` identitás-stabilitása nem hanyagolható el |
| `app/src/pages/PreviewPage.tsx` | Az egyetlen `savePlan()`-hívó; itt jelenik meg a verzió-ütközés UI, a két veszélyes néma catch, és a `Uint8Array` átadás |
| `app/vite.config.ts` | A `base` kapcsoló, a storage-cél alias, és a build-célt jelző környezetváltozó mindhárom mérföldkőhöz |
