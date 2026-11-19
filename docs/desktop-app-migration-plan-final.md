# Végleges terv: Electron alapú telepíthető alkalmazás

Dátum: 2026-11-16
Forrás: az eredeti Electron-terv és annak 2026-09-05-i értékelése (mindkettő törölve, ez a
dokumentum a helyükbe lép), a nyitott pontok 2026-11-16-án eldöntve. **Ez az egyetlen hely**, ahol
a 2. fázis döntései, indokaik és a megvalósítási sorrend együtt élnek. Munkaközi
tervdokumentum: ahogy a tételek megvalósulnak, a tartósan érvényes részek a `PRODUCT.md`-be vagy a
megfelelő nested `CLAUDE.md`-be költöznek, ez a fájl pedig törlődik.

A döntések csak ezen a dokumentumon belül sorszámozottak (1–29); kódkommentben, tesztnévben és
backlog-tételben a sorszám nem hivatkozható (`CLAUDE.md` Kommentek).

## 1. Cél és alaphelyzet

Egy fogorvos, két laptop (Windows és macOS), egyszerre mindig csak az egyiket használja. A jelenlegi
React-alkalmazás GitHub Pages-en, demóként, böngészős `localStorage`-tárolással fut. A cél egy
telepíthető Electron-alkalmazás, amely egy Google Drive-val tükrözött gyökérmappába ír, és amelyet
a doki mindkét gépén ugyanarra a mappára állít.

**Mi marad érintetlen:** a domain logika (`app/src/domain/`), a UI (`app/src/pages/`,
`app/src/components/`), a `PlanStorage`/`DraftStorage` interfész, a PDF-generálás és a
mappastruktúra (`app/src/storage/CLAUDE.md`, `storage/paths.ts`). Minden képernyő a
`PlanStorage`/`DraftStorage` határ mögött dolgozik, egyik implementációt sem ismeri.

**Mi változik:** a `PlanStorage` implementációja (`DemoStorage` → `FileSystemStorage` a main
processben, IPC-proxy a rendererben), a futtatási környezet (böngésző → Electron), a build és
kiadás, a demó-only felületek eltűnése, és új, kifejezetten a kétgépes használatból fakadó
adatvédelmi mechanizmusok (verzió-teljesség, ütközésőr, ütközésészlelés, biztonsági mentés).

### 1.1 Amit a terv kimond a szinkronról

**Az „egyszerre egy gép” szabály nem zárja ki az adatütközést.** Ha a doki a Windows-gépet a
feltöltés befejezése előtt csukja le, a Macen ugyanaz a verziósorszám újra kiosztható; a Drive
később mindkét változatot megtartja. Az app ezt **nem tudja megelőzni**, mert a Drive
szinkronállapotát nem látja, és egy Drive-on szinkronizált lockfájl sem adna biztos zárolást.
Ezért a terv három rétegre épül:

1. **Kimondott gépváltási szabály** (a telepítési útmutatóban és az app Adattárolás szekciójában):
   app bezárása → a Drive ikon jelzi a feltöltés végét → a másik gépen a Drive letöltötte →
   app megnyitása.
2. **Adatmegőrzés**: az app sosem töröl, nevez át vagy ír felül automatikusan ütközés esetén;
   minden változat megmarad, a doki dönt.
3. **Észlelés és helyreállítás**: induláskor ütközésészlelés, mentéskor ütközésőr, verziónként
   teljesség-ellenőrzés, biztonsági mentés és bizonyított visszaállítás.

## 2. Rögzített döntések

| # | Döntés | Miért |
|---|---|---|
| 1 | **Electron**, nem Tauri | Egyetlen, verzióhoz kötött Chromium és V8 fut mindkét platformon, tehát a `@react-pdf/renderer` (saját layout-lánc: Yoga + PDFKit), a beágyazott Noto Sans és a wasm-modul azonos környezetben dolgozik. A PDF szöveges része így platformfüggetlen; a canvasos fogtérkép nem (lásd §12). Tauri alatt két különböző webview-motor futna egy aláírandó dokumentum mögött |
| 2 | Kézi frissítés, nincs auto-updater, nincs fizetős code signing; **macOS: ad-hoc aláírás, első indítás a Rendszerbeállítások → Adatvédelem és biztonság megnyitás-engedélyével, script nélkül** | Egy doki, két gép; az évi több száz USD-s tanúsítványköltség nem térül meg. A Windows SmartScreen minden kiadásnál újra figyelmeztet, a macOS-engedély minden frissítés után egyszer újra kell. macOS 15 óta a jobbklikkes megkerülés nincs, a letöltött `.command` script maga is karanténba kerül és futási jog nélkül érkezik; vésztartalék egy Terminál-sor (`xattr`). Ezeket a telepítési útmutató (`docs/TELEPITES.md`) explicit tartalmazza |
| 3 | Gyökérmappa a **My Drive** alatti, **Tükrözés** módban szinkronizált mappán belül; egy doki, két gép, **sosem egyidejűleg**; **kimondott gépváltási szabály**; az app a Drive szinkronállapotát **nem** detektálja | Shared Drive-ot a kliens csak streamelni tud, az app helyi fájlokat vár. Nincs megbízható API a szinkronállapotra. A szabály az elsődleges védelem, a 4., 19., 23. és 28. döntés a háló alatta |
| 4 | Verziómappa-ütközés mentéskor (a `_vN` már létezik) → **kemény blokk** a meglévő verzió adataival; a doki „Mentés a következő sorszámra” vagy „Mégsem”. Induláskor talált **duplikált sorszám** (Drive ` (1)` toldat) → **csak jelez**, nem nevez át | A felülírás-tilalom csendes megkerülése helyett a doki lássa, mi történt. Az átsorszámozás automatizálása több hibalehetőséget hozna, mint amennyit megold; a doki a Fájlkezelőben rendezi |
| 5 | **Piszkozat gépenként lokális** (renderer `localStorage`, `userData` alatt), sosem szinkronizált, sosem system of record; **a piszkozat a forrásverzióját megjegyzi**, és véglegesítéskor amber jelzést ad, ha azóta újabb verzió készült | Gépváltás csak lezárt munkák között. A leggyakrabban írt fájl nem kerül Drive-ütközés alá. A forrásverzió-ellenőrzés nélkül a következő szabad sorszám kiosztása elfedné, hogy a doki elavult alapból dolgozik |
| 6 | A Pages-demó **nyugdíjba megy**, előtte egyszeri „Adatok exportálása” akció | A UX-validáció teljesült; az árlista, beállítások és sablonok a doki valódi munkája, nem veszhet el |
| 7 | `DemoStorage` → **teszt-only `InMemoryStorage`** (`Map` a `localStorage` helyett), a seed-páciensek tesztfixture | A vitest-készlet erre épül; a legkisebb kockázatú út a logika megtartása, csak a tárolóprimitívum cseréje |
| 8 | Demó-only UI törlődik (Filerendszer, Adatkezelés); helyette „Mappa megnyitása” | Natív Fájlkezelő/Finder van; a seed-visszaállítás éles adaton veszélyes |
| 9 | Elérhetetlen vagy **hiányos** gyökérmappa induláskor → **blokkoló képernyő**, csak „Újrapróba” / „Másik mappa kiválasztása” | A doki ne lásson üres pácienslistát egy még nem csatolt Drive miatt. A hiány félbemaradt szinkront is jelenthet, ezért az app nem pótol semmit automatikusan |
| 10 | Atomi írás (temp + `fsync` + `rename`) + automatikus újrapróba tranziens zárolási hibán | Drive-kliens és víruskereső rövid ideig zárolhat; pár száz ms nem lehet látható hiba |
| 11 | Első indítás: csak **üres mappa** vagy **már a mi struktúránk** fogadható el; **meglévő adatmappába az `init()` sosem ír** | Kizárja az idegen mappa elírását; a hiányzó fájl szinkron-közbeni állapot vagy sérülés is lehet, pótlás csak explicit akcióra |
| 12 | „Letöltés” → **„Megnyitás”** (rendszer PDF-olvasó) + **„Másolás máshová”** (natív mentés-dialógus, `Letöltések` tiltott alapérték) | Asztali appban a fájl már a lemezen van; a `Letöltések` mappa OneDrive-ra szinkronizálhat |
| 13 | Százas nagyságrend páciensszám: cache nélküli beolvasás | Cache-invalidálási hiba nélkül; ha valaha fáj, a `listPatients()` az egyetlen cache-elendő hely |
| 14 | GitHub Actions építi mindkét telepítőt git tagre, GitHub Release-be; **a CI (lint/test/docs-check/build) külön workflow-ban megmarad**, csak a Pages-deploy szűnik meg | electron-builder nem fordít megbízhatóan keresztbe macOS-re; a mai `deploy.yml` a CI-t és a deployt együtt hordozza, a kettőt szét kell választani |
| 15 | Hatókör: Electron-héj + `FileSystemStorage` + I/O-hibakezelés + verzió-teljesség + ütközésőr + **biztonsági mentés ZIP-be** + Playwright füst-teszt. **Kívül:** `terv.json` beágyazása a PDF-be, sémamigrációs keretrendszer, szinkronizált piszkozat | A backup napi használat mellett az adatmegőrzés része, nem kényelmi funkció; a többi önálló, nem blokkoló munka |
| 16 | Sorrend: **előkészítés → héj → storage helyben → kétgépes Drive-próba → demó-lebontás** | Minden mérföldkő végén futó app; a storage-mérföldkő kettébontva, mert a helyi hibainjektálásos tesztek és a kétgépes próba más hibaosztályt fednek |
| 17 | Diagnosztikai napló `userData`-ba, forgó, méretkorlátos; **páciens- és tervmappa olvasható neve, valamint nyers fájlrendszer-hibaüzenet sosem kerül bele** | A mappanév kezelési információ, a szabadon megadott tervcím nevet is tartalmazhat; a nyers OS-üzenet útvonalat visz |
| 18 | Gyökérmappa útvonala gépenkénti lokális configban (`userData`), **egy-példány zár** kötelező | A `beallitasok.json` a gyökérmappában él (tyúk-tojás), a két gép útvonala eltér; a dupla indítás kizárása |
| 19 | Induláskor **Drive-ütközéses nevek észlelése** fájlon és mappán (` (1)`, `*conflicted copy*`, `*Conflict*`), amber sávban listázva, **semmi automatikus feloldás** | Az append-only elv csak a verziómappákra igaz; a felülírt fájlok és a duplikált verziósorszám ütközhet |
| 20 | A `savePlan` index-írásának hibája **sosem rontja le a véglegesítés sikerét** | A verziómappa már a lemezen van; hibát mutatva a doki újrapróbálna, és duplikált verzió születne |
| 21 | `listPatients()`-hiba a páciens-identitás védőhálónál = **amber, nem blokkoló** checklist-tétel | A védőháló kiegészítő védelem; átmeneti olvasási hiba nem teheti használhatatlanná a véglegesítést |
| 22 | A piszkozat- és sablon-piszkozat cache renderer-`localStorage`-ban marad Electron alatt is | Nulla kódváltozás; a `userData` alatt él, tehát az 5. és 27. döntés automatikusan teljesül. A protokollnév tartós konstans (lásd §12) |
| 23 | **Ütközésőr a felülírt system-of-record fájlokon** (`arlista.json`, `beallitasok.json`, `paciens-adatok.json`, `sablonok/*.md`): betöltéskor tartalomhash, mentés előtt újraolvasás; eltérésnél **választós dialógus**, és **a vesztes változat `_utkozesek/` alá mentődik**. Az indexfájlok (`paciens.json`, `terv-cimke.json`) last-write-wins | Az `mtime` nem megbízható Drive-on, a hash igen. A kényszerített újratöltés a doki munkáját dobná el; a vesztes változat megőrzése nélkül a döntés visszavonhatatlan lenne. **Korlát:** az őr csak a helyben már látható változatot észleli, a még meg nem érkezett módosítást nem |
| 24 | **Playwright `_electron` füst-teszt** már az első Electron-mérföldkőben, mindkét CI-runneren | Az egyetlen automatizált védelem az „el sem indul a csomagolt app” osztály ellen |
| 25 | **A main process biztonsági szerződése explicit**: IPC-küldő és paraméter futásidejű ellenőrzése, útvonal-bezárás a gyökérmappába (nincs `..`, abszolút út, symlink/junction kilépés), navigáció és új ablak tiltása, a `deletePatient` előfeltételét **a main újra ellenőrzi** | GDPR 9. cikk szerinti adat; a renderer kompromittálódása nem adhat szabad fájlrendszer-hozzáférést; Drive mellett az ellenőrzés óta új terv is érkezhetett |
| 26 | **Típusos, szerializálható hibaeredmény az IPC-n**; a renderer-oldali proxy ugyanazokat a hibaosztályokat dobja, amiket a `PlanStorage` szerződés ma ígér; **az `AppState` elutasított mentés után nem tarthatja aktív adatként a nem mentett változatot** | Az Electron csak az `Error.message`-et viszi át; a konfliktusdialógusnak hibakód és az ütköző változat kell. Az `AppState` ma a tartós mentés előtt frissíti a memóriát |
| 27 | **Eltávolításkor a `userData` is törlődik** (NSIS `deleteAppDataOnUninstall`; macOS útmutató) | A piszkozat valódi páciensadatot tartalmazhat; „minden adatom a gyökérmappában van” |
| 28 | **Egy verzió csak teljes JSON+PDF-párként használható**: a verziómappa `manifest.json`-t kap (mentésazonosító, mindkét fájl hash-e), amely **utoljára** íródik; manifest nélküli vagy hash-eltérő verzió `hianyos` állapotú, nem nyitható, újraellenőrizhető | A helyi atomi mentésből nem következik atomi szinkron: a másik gépen a két fájl nem egyszerre érkezik. Egy „kész” jelzőfájl önmagában nem elég, a tartalmat is ellenőrizni kell |
| 29 | **Éles indulás feltétele a bizonyított adatmegőrzés és visszaállíthatóság**: kétgépes próba fiktív adattal (megszakadt szinkron, későn visszatérő laptop, részleges verzió, elavult piszkozat, ütköző árlista) **és egy tényleges visszaállítás ZIP-ből** | A negyedéves kézi másolat napi használat mellett túl ritka; egy soha ki nem próbált visszaállítás nem backup |

## 3. Electron-architektúra

### 3.1 Folyamat-szétválasztás

- **Main process** (`app/electron/main.ts`): az egyetlen hely, ahol fájlrendszer-hozzáférés
  történik. Itt él a `FileSystemStorage`, az egy-példány zár (`app.requestSingleInstanceLock()`
  a legelső sorban), az ablakkezelés, a natív dialógusok, a diagnosztikai napló és a ZIP-mentés.
- **Preload** (`app/electron/preload.ts`): `contextBridge.exposeInMainWorld('dentalPlanApi', …)`
  egyetlen, típusos felületet tesz ki. Ez az egyetlen csatorna a renderer és a main között.
- **Renderer**: a meglévő `app/` React-alkalmazás, `contextIsolation: true`,
  `nodeIntegration: false`, `sandbox: true`.

### 3.2 A main process biztonsági szerződése (25. döntés)

Ezek nem ajánlások, hanem a `FileSystemStorage` kész-definíciójának részei, mindegyik teszttel:

- **Küldő-ellenőrzés:** minden `ipcMain.handle` először ellenőrzi, hogy `event.senderFrame` a
  főablak top-frame-je és az origin az app saját protokollja. Más küldőtől a hívás `IpcHiba`
  eredménnyel tér vissza és naplózódik.
- **Paraméter-ellenőrzés:** minden csatorna bemenete futásidőben validált
  (`app/electron/ipcValidate.ts`, kézzel írt őrök a `domain/validate.ts` mintájára). `Plan`,
  `PriceList`, `Settings` a meglévő `assert*Shape`-pel; `pdf` `Uint8Array`, méretkorlát (pl.
  20 MB); `patientDir`/`planDir`/`versionDir` a `paths.ts` névnyelvtanának megfelelő egyetlen
  útvonalelem (`parsePatientDirName`, `parseVersionDirName`), elválasztó, `.`/`..` nélkül.
- **Útvonal-bezárás:** az összeállított útvonal `path.resolve` után a gyökérmappa prefixe alatt
  marad, és írás előtt a célmappa `fs.realpath`-ja is a gyökérmappa `realpath`-ja alatt van
  (symlink/junction-kilépés kizárva). Külön segédfüggvény, minden metódus ezen megy át.
- **`deletePatient`:** a main újra listázza a páciens terveit és futtatja a
  `paciensTorlesAkadaly()` ellenőrzést (DOM-mentes domain-modul) közvetlenül a törlés előtt;
  ha azóta terv érkezett, `TorlesAkadalyHiba`-t ad, nem töröl.
- **Navigáció:** `will-navigate` tiltva a saját protokollon kívül, `setWindowOpenHandler`
  mindent `deny`-ol; `shell.openExternal` sehol nem kap adatútvonalat; `shell.openPath` csak
  gyökérmappán belüli útvonalat fogad.
- **Dialógusok:** `showOpenDialog`/`showSaveDialog` eredménye is a fenti validáción megy át,
  mielőtt a storage használná.

### 3.3 A `PlanStorage` mint IPC-proxy, típusos hibaeredménnyel (26. döntés)

A renderer-oldali `ElectronStorage implements PlanStorage` minden metódusa egy
`ipcRenderer.invoke('storage:<metódus>', …)` hívás. **Az IPC-n nem kivétel, hanem
diszkriminált unió utazik:**

```ts
type IpcEredmeny<T> =
  | { ok: true; ertek: T }
  | { ok: false; hiba: StorageHiba };

type StorageHiba =
  | { kod: 'VERZIO_UTKOZES'; letezo: { versionDir: string; datum: string; orvos: string; vegosszeg: number } }
  | { kod: 'FELULIRAS_UTKOZES'; fajl: string; lemezenLevo: unknown; mentettMasolat: string }
  | { kod: 'TORLES_AKADALY'; ok: string }
  | { kod: 'IO'; errno: 'ENOENT' | 'EACCES' | 'EPERM' | 'EBUSY' | 'ENOSPC' | 'EROFS' | 'EMFILE' | 'EISDIR' | 'ENOTDIR' | 'EGYEB'; utvonal: string; naploUtvonal: RedaktaltUtvonal }
  | { kod: 'SERULT_JSON'; fajl: string; uzenet: string }
  | { kod: 'SEMA_VERZIO'; fajl: string; talalt: number; ismert: number }
  | { kod: 'HIANYOS_VERZIO'; versionDir: string; hianyzik: string[] };
```

Az `ElectronStorage` a `{ ok: false }` ágat a `PlanStorage` szerződés által ma is ígért
hibaosztályokra fordítja (`VersionConflictError`, `SchemaVersionError`, a `json.ts` sérült-JSON
hibája) és az új `FelulirasUtkozesError`, `HianyosVerzioError`, `IoError` osztályokra, mindegyik
hordozza a strukturált payloadot. Így a pages-kód továbbra is `try/catch`-et használ, a
dialógusoknak pedig megvan minden adat.

**`AppState` következmény:** a `savePriceList`/`saveSettings` updater-mentés ma a memóriát a
tartós mentés előtt frissíti. Az új szabály: ha a mentés `FelulirasUtkozesError`-ral bukik, az
`AppState` **nem marad a nem mentett változaton csendben**. A dialógus két kimenete:
„A másik gép változatának betöltése” → az `AppState` a `lemezenLevo` értékre áll; „Az én
változatom mentése” → újrahívás `{ felulir: true }` jelzővel, a vesztes lemezváltozat
`_utkozesek/` alá kerül (lásd §4.6). A dialógus bezárásáig a mentés „függő” állapotú, további
updater-hívások sorba állnak. Ezt `AppState.test.tsx`-ben kell lefedni.

### 3.4 PDF-bájtok az IPC-n

`savePlan(plan, pdf: Uint8Array)` és `loadPlanPdf(ref)` a legnagyobb payloadok. A structured
clone a `Uint8Array`-t binárisan másolja, base64 nélkül; egy pár száz KB-os másolat elhanyagolható.
A mai `DemoStorage` base64-kódolása megszűnik.

### 3.5 CSP

**A CSP már létezik** (`app/vite.config.ts`, `cspPlugin`): `script-src 'self' 'wasm-unsafe-eval'`,
`connect-src 'self' data:`, `img-src 'self' data: blob:`, `font-src 'self' data:`,
`frame-src blob:`, `worker-src 'self' blob:`. Electron alatt ugyanez a plugin fut; az 1.
mérföldkő feladata ellenőrizni, hogy a saját `app://` protokoll alatt a `'self'` forrás minden
mai igényt (a két Noto Sans TTF, a logó, a Yoga wasm `data:` URL-je, a PDF-előnézet blob-iframe)
nulla sértéssel kiszolgál. A Pages-build és az Electron-build ugyanazt a szigorú változatot kapja.

### 3.6 Fejlesztői és production betöltés

- **Fejlesztésben:** a `BrowserWindow` a futó Vite dev szerverre mutat (`http://localhost:5173`).
- **Productionben:** saját, privilegizált protokoll (`protocol.registerSchemesAsPrivileged` +
  `protocol.handle`): `app://` séma, `standard`, `secure`, `supportFetchAPI`. A `file://` kerülendő
  (relatív `fetch`, origin-kezelés). **A protokollnév és a hoszt egyetlen, kikommentezett konstans**
  (`app/electron/protocol.ts`), mert ez a renderer `localStorage`-partíció kulcsa is (22. döntés):
  egy későbbi átnevezés csendben kiürítené a piszkozatot.
- `vite.config.ts`: a `base` környezetváltozó alapján `'/dental-plan/'` (Pages) vagy `'./'`
  (Electron); a `HashRouter` marad, mert nincs szerveroldali route-fallback.
- `@react-pdf/renderer` render-időben, URL-ről fetch-eli a fontokat (`pdf/fonts.ts`) és a logót
  (`pdf/tervDocument/Chrome.tsx`); az 1. mérföldkő kész-definíciója nevesítve ellenőrzi, hogy a
  generált PDF-en a beágyazott font és a logó látszik.

## 4. `FileSystemStorage`

### 4.1 Metódusonkénti leképezés

| Metódus | Fájlrendszeri művelet |
|---|---|
| `init()` | Gyökérmappa osztályozása: **üres** → struktúra felépítése seedből vagy demó-exportból; **a miénk** (`arlista.json` és `paciensek/` létezik) → validálás, `schemaVersion`-ök ellenőrzése, ütközésészlelés (§4.7); **hiányos** (a miénk, de `arlista.json`/`beallitasok.json`/`sablonok/` hiányzik) → `HianyosMappa` eredmény, blokkoló képernyő; **idegen** → elutasítás. **Meglévő mappába nem ír.** |
| `listPatients()` | `readdir(paciensek/)`, páciensenként `paciens.json`, hibatűrő (parse-hiba → `parsePatientDirName` fallback) |
| `listPlans(patientDir)` | `readdir`, `PATIENT_ROOT_FILES` kiszűrve, opcionális `terv-cimke.json` |
| `listVersions(patientDir, planDir)` | `readdir`, csak `parseVersionDirName`-mintájú mappák, `verzio` szerint rendezve, **mindegyik `allapot: 'teljes' \| 'hianyos'` jelzéssel** (§4.3) |
| `loadPlan(ref)` | Csak `teljes` verzióra; `readFile(terv.json)` → `parseJson` → `assertKnownSchemaVersion` → `assertPlanShape` |
| `loadPlanPdf(ref)` | Csak `teljes` verzióra |
| `savePlan(plan, pdf)` | §4.2 és §4.3 |
| `savePlanLabel(...)` | Atomi felülírás/`unlink` a `terv-cimke.json`-on, sorosított |
| `loadPriceList()` / `loadSettings()` | `readFile` + 3-lépéses validálás; **a tartalomhash megjegyzése** (§4.6) |
| `savePriceList()` / `saveSettings()` | Ütközésőr + atomi felülírás |
| `listTemplates()` / `loadTemplate(name)` | `readdir(sablonok/)` / `readFile`; a betöltött sablon hash-e megjegyezve |
| `saveTemplate(name, body)` | Ütközésőr + atomi felülírás a legfrissebb `-vN.md`-n, sorosított |
| `loadPatientData(patientDir)` | `readFile(paciens-adatok.json)`, `null` ha `ENOENT`; hash megjegyezve |
| `savePatientData(...)` | Ütközésőr + atomi felülírás + `paciens.json` `nev` frissítése |
| `createPatient(nev, ...)` | `mkdir` + két fájl egy `enqueue`-n belül; második fájl hibájánál a mappa visszagörgetve |
| `deletePatient(patientDir)` | Main-oldali előfeltétel-újraellenőrzés (§3.2), majd `rm(recursive)` |

### 4.2 Atomi írás

Minden felülírt fájl: `writeFile(cél + '.tmp-' + random)` → `fsync` → `rename`. Az 1–2. lépés
hibájánál a célfájl érintetlen. A `rename` ugyanazon a köteten atomi; **mivel a Drive-mappa és a
temp fájl ugyanabban a mappában él, kötetváltás nincs.** A `.tmp-*` fájlok a Drive-ra is
felszinkronizálódhatnak egy pillanatra; ez ártalmatlan, az `init()` a 24 óránál régebbi
`.tmp-*` maradványokat **listázza** az ütközés-sávban („félbemaradt mentés maradványa”), de nem
törli.

**Újrapróba-wrapper:** `EBUSY`/`EPERM`/`EACCES`-re exponenciális backoff (100, 200, 400, 800,
1600 ms), más errno azonnal a hívóhoz. Az ütközésőr újraolvasása és a `rename` közötti
versenyablakot az újrapróba nem szünteti meg, csak a kétgépes szabály és az `_utkozesek/`
megőrzés fedi (§4.6).

### 4.3 Verziómappa: teljesség manifesttel (28. döntés)

```
1. mkdir(<planDir>/.tmp-<versionDir>-<random>/)
2. terv.json és kezelesi-terv.pdf írása (fájlszintű atomi módon)
3. manifest.json írása UTOLJÁRA:
   { "schemaVersion": 1, "mentesId": "<uuid>", "keszult": "<ISO>", "gepId": "<lokális config random id>",
     "fajlok": { "terv.json": { "sha256": "…", "meret": n }, "kezelesi-terv.pdf": { "sha256": "…", "meret": n } } }
4. assertVersionDirAvailable() ÚJRA, közvetlenül a rename előtt
5. rename(temp mappa, <versionDir>)
```

- A `listVersions()` egy verziót akkor jelöl `teljes`-nek, ha a manifest létezik, mindkét fájl
  létezik, méretük és hash-ük egyezik a manifesttel. Minden más `hianyos`, a `hianyzik` lista
  mondja, mi nem stimmel.
- **`hianyos` verzió nem nyitható, nem folytatható, nem másolható**; a verziósorban „szinkron
  folyamatban vagy hiányos” állapot látszik, **„Újraellenőrzés”** gombbal (nincs automatikus
  polling, 3. döntés). A `nextVersionNumber()` a `hianyos` mappákat is számolja: sorszám sosem
  kerül újra kiosztásra.
- A `.tmp-*` mappák nem illeszkednek a `parseVersionDirName` mintára, a `listVersions()` átsiklik
  rajtuk; egy elszáradt temp-mappa helyfoglaló szemét, nem adatvesztés.
- Ha a 4. lépésben megjelent egy azonos nevű mappa: `VERZIO_UTKOZES` eredmény a meglévő verzió
  adataival (manifest és `terv.json` alapján: dátum, orvos, végösszeg), a temp-mappa eldobva; a
  renderer a kemény blokk-dialógust mutatja (4. döntés).
- A manifest a mappastruktúra része, a `app/src/storage/CLAUDE.md`-be kerül; a `DemoStorage` ma
  nem ír manifestet, az `InMemoryStorage` (7. döntés) fog, hogy a tesztek ugyanazt a szerződést
  ellenőrizzék.

### 4.4 Írás-sorosítás

A `savingChain`/`enqueue<T>()` lánc megmarad, és **bővül** `savePlanLabel`-lel és
`saveTemplate`-tel (ma ezek kimaradnak; `localStorage` alatt ártalmatlan volt, fájlrendszeren
nem az).

### 4.5 `savePlan` index-írás és a 20. döntés

A verziómappa `rename`-je után a `paciens.json` index frissítése következik. Ennek hibája **nem**
rontja le a sikert: a `savePlan` sikerrel tér vissza egy `figyelmeztetes: 'INDEX_IRAS_HIBA'`
mezővel, a felület halk jelzést mutat. A tesztnek bizonyítania kell, hogy index-hiba mellett a
verziómappa létezik és `teljes`.

### 4.6 Ütközésőr a felülírt fájlokon (23. döntés)

Hatókör: `arlista.json`, `beallitasok.json`, `paciens-adatok.json`, `sablonok/*.md`.

- Betöltéskor a storage megjegyzi a fájl tartalmának sha256-át (nem `mtime`-ot: a Drive a
  módosítási időt nem őrzi megbízhatóan, a tartalom viszont pontos).
- Mentés előtt újraolvassa a fájlt; ha a hash eltér a betöltéskor látottól, **nem ír**, hanem
  `FELULIRAS_UTKOZES` eredményt ad a lemezen lévő tartalommal.
- A doki választ: „A másik gép változatának betöltése” (a memóriabeli szerkesztés elvész, az
  `AppState` a lemezváltozatra áll) vagy „Az én változatom mentése”. Utóbbinál a storage a
  lemezen lévő változatot **előbb `_utkozesek/<fajl>.<ISO>.<ext>` néven elmenti**, csak azután ír
  felül. Így egyik döntés sem visszavonhatatlan.
- Az `_utkozesek/` mappa tartalma az induláskori ütközés-sávban látszik, „Mappa megnyitása”
  gombbal; az app nem törli, a doki takarít.
- Az indexfájlok (`paciens.json`, `terv-cimke.json`) last-write-wins, sosem system of record.
- **Kimondott korlát:** az őr csak a már helyben látható változatot észleli; a még meg nem
  érkezett módosításra csak a 3. döntés szabálya és az induláskori észlelés ad védelmet.

### 4.7 Induláskori ütközésészlelés (19. döntés)

Az `init()` bejárja a gyökérmappát, a `paciensek/<patientDir>/` és a tervmappákat, és listázza:
Drive-ütközéses fájl- és **mappaneveket** (` (1)`, `*conflicted copy*`, `*Conflict*`), azonos
sorszámú verziómappákat (duplikált `_vN` toldattal), `_utkozesek/` tartalmát, 24 óránál régebbi
`.tmp-*` maradványokat. Mindez egy amber sávban jelenik meg a Kezdőlapon, tételenként „Mappa
megnyitása” gombbal. **Semmi nem oldódik fel automatikusan.** Ez nem Drive-API-lekérdezés, csak
mappalista-vizsgálat.

### 4.8 Platformközi buktatók (javított indoklással)

- **Unicode-normalizáció.** Az APFS normalizáció-megőrző (azt tárolja, amit kap), a HFS+ NFD-re
  alakít, az NTFS és a Drive-kliens átviheti bármelyik alakot. Ezért **minden fájlnév-összehasonlítás
  előtt `.normalize('NFC')`** a Node `fs` válaszain és a saját generált neveken egyaránt; külön
  teszt egy szintetikus NFD-nevű mappa beolvasására.
- **Kis-/nagybetű.** **Windows NTFS alapértelmezésben kis-/nagybetű-érzéketlen**, az APFS
  alapértelmezésben szintén; mindkettő megőrző. Az `init()` és `createPatient()` explicit
  ellenőrzi, hogy egy új mappanév kis-/nagybetű-függetlenül se ütközzön meglévővel.
- **Windows 260 karakteres útvonalkorlát.** `MAX_NAME_PART_LENGTH` mappanév-részenként már
  korlátoz; az `init()` figyelmeztet, ha a gyökérmappa útvonala már önmagában hosszú (pl. > 120
  karakter).
- **Foglalt Windows-fájlnevek** (`CON`, `PRN`, `AUX`, `NUL`, `COM1`–`COM9`, `LPT1`–`LPT9`) és a
  vágás utáni záró pont/szóköz: `sanitizeNamePart()` javítása a 0. mérföldkőben.

## 5. Hibataxonómia és felület

| Hiba | Újrapróba | Üzenet a dokinak | UI |
|---|---|---|---|
| `ENOENT` gyökérmappa | Nem | „A beállított adatmappa nem érhető el. Lehet, hogy a Google Drive még nem szinkronizált.” | Blokkoló képernyő (9. döntés) |
| Hiányos adatmappa | Nem | „Az adatmappa hiányos (hiányzik: …). Ha a Drive még szinkronizál, várj és próbáld újra.” | Blokkoló képernyő, „Újrapróba” / „Másik mappa”; pótlás csak explicit akcióra az Adattárolás szekcióban |
| `EACCES`/`EPERM`/`EBUSY` | Igen, majd feladja | „Nincs jogosultság ehhez a fájlhoz, vagy más program használja.” | Piros `Callout` |
| `ENOSPC` | Nem | „Nincs elég szabad hely a lemezen.” | Piros `Callout`, mentés blokkolva |
| `EROFS` | Nem | „Az adatmappa írásvédett.” | Piros `Callout` induláskor |
| `EMFILE` | Igen | Belső; kimerülés után „Váratlan fájlrendszer-hiba, indítsd újra.” | Piros `Callout` |
| `EISDIR`/`ENOTDIR` | Nem | „A(z) `<fájl>` váratlan tartalmú, a mappa sérülhetett.” | Piros `Callout` |
| Sérült JSON | Nem | A mai `json.ts` üzenete | Változatlan |
| Magasabb `schemaVersion` | Nem | A mai `schema.ts` üzenete, kiegészítve: „valószínűleg a másik gépen újabb az alkalmazás” | Változatlan |
| `VERZIO_UTKOZES` | A doki dönt | „Ez a terv időközben a másik gépen mentődött (`_v<n>`, dátum, orvos). Mented a következő sorszámra, vagy mégsem?” | Kemény blokk dialógus |
| `FELULIRAS_UTKOZES` | A doki dönt | „A(z) `<fájl>` időközben a másik gépen módosult.” + két következmény | Választós dialógus (§4.6) |
| `HIANYOS_VERZIO` | Újraellenőrzés gombbal | „Ez a verzió még nem teljes (hiányzik: …). Ha a Drive szinkronizál, várj.” | Verziósor állapotjelzése |
| `TORLES_AKADALY` | Nem | „A páciens időközben kapott tervet, nem törölhető.” | Piros `Callout` |

### 5.1 A ma néma `catch {}` helyek

- `PatientEditorPanel.tsx` (`listPatients()` duplikáció-ellenőrzés): halk, eltűnő jelzés, hogy az
  ellenőrzés nem futott le.
- `PaciensKotesContext.tsx`: amber, nem blokkoló checklist-tétel (21. döntés).
- `PreviewPage.tsx` (`loadPatientData()` best-effort): marad best-effort, info-szintű.
- `EgyebTab.tsx` draft-cache olvasás: maradhat néma.
- `pages/settings/NyomtatvanyokTab.tsx` közvetlen `localStorage`-írása: a 0. mérföldkőben a
  `DraftStorage` kulcsrendszerére (`storage/localKeys.ts`) kötve.

### 5.2 Diagnosztikai napló redakciója (17. döntés)

Minden I/O-hiba két mezőt hordoz: `utvonal` (teljes, csak a felületen) és `naploUtvonal`
(redaktált, csak ez naplózható). Redakció: a páciensmappa **és a tervmappa** olvasható része az
id-szuffixumra cserélődik: `paciensek/#ab12cd/#x9k2m1/2026-09-05_v3/terv.json`. A `RedaktaltUtvonal`
különálló típus, a naplózó függvény csak ezt fogadja; nyers string fordítási hibával bukik. A
naplóba az errno-kód és a syscall kerül, **az OS nyers hibaüzenete nem**. A `Plan` sosem naplózható.
Fejléc-sor induláskor: app-verzió, OS, a gyökérmappa útvonala (ez a doki mappanevét tartalmazza,
páciensnevet nem). Forma: `userData/naplo/io.log` + `io.1.log`, ~1 MB, `fsync` nélkül.

### 5.3 PDF-akciók (12. döntés)

A négy letöltési pont (`PreviewPage.tsx`, `TervReszleteiPage.tsx` két helye, `PatientPlanChains.tsx`)
két gombra bomlik: „Megnyitás” (`shell.openPath` a verziómappán belüli PDF-re, csak `teljes`
verzión) és „Másolás máshová” (`showSaveDialog`, `buildDownloadFileName()` alapértelmezett név,
alapértelmezett mappa nem a `Letöltések`).

## 6. Gyökérmappa, gépváltás, biztonsági mentés

### 6.1 Gépenkénti lokális config

`userData/config.json`: `{ "schemaVersion": 1, "gyokerMappa": "...", "gepId": "<random, egyszer
generált>" }`. A `gepId` a manifestbe kerül (§4.3), diagnosztikai célra; nem gépnév, nem személyes
adat.

### 6.2 Első indítás varázslója

1. Nincs `gyokerMappa` → első indítás.
2. „Válaszd ki az adatmappát” + `showOpenDialog({ properties: ['openDirectory'] })`. A képernyő
   kimondja: **My Drive alatti, Tükrözés módban szinkronizált mappa** legyen, ne Shared Drive, ne
   `Letöltések`.
3. Validálás (11. döntés): üres → struktúra felépítése (seed vagy demó-export, §7); a miénk →
   megnyitás; hiányos → blokkoló képernyő; idegen → elutasítás.
4. Siker → config írása, normál indulás.

### 6.3 Beállítások, Adattárolás szekció

- Aktuális gyökérmappa útvonala, „Mappa megnyitása”.
- „Mappa váltása”: a varázsló újra, a piszkozat-felülírás-őrön át; utána teljes memóriabeli
  állapot újratöltése.
- **Gépváltási szabály** szövegesen, a telepítési útmutatóval azonos megfogalmazásban.
- „Hiányzó alapsablonok pótlása” és „Alapértelmezett árlista/beállítások létrehozása” **explicit**
  akciók hiányos mappához (az `init()` sosem teszi magától).
- **„Biztonsági mentés ZIP-be”** (§6.5) és az utolsó mentés dátuma.
- „Napló megnyitása”.

### 6.4 Induláskori blokkoló képernyő és kilépési emlékeztető

- Minden induláskor: a `gyokerMappa` létezik, olvasható, és a struktúra teljes. Ha nem: teljes
  képernyős állapot, „Újrapróba” / „Másik mappa kiválasztása”, automatikus polling nélkül.
- **Kilépéskor**, ha ebben a munkamenetben írás történt, egy rövid, nem blokkoló emlékeztető:
  „Mielőtt a másik gépen folytatod, várd meg, hogy a Drive ikon a feltöltés végét jelezze.” Nem
  detektál semmit, csak a 3. döntés szabályát ismétli ott, ahol a doki épp gépet vált.

### 6.5 Biztonsági mentés ZIP-be (15. és 29. döntés)

- Main-oldali művelet: a teljes gyökérmappa ZIP-be (`.tmp-*` kihagyva), natív mentés-dialógussal,
  alapértelmezett név `mandoki-dental-mentes-<ISO dátum>.zip`, alapértelmezett cél nem a
  gyökérmappa és nem a `Letöltések`. Függőség: egy kis, karbantartott ZIP-író (pl. `yazl`) a main
  bundle-ben; a renderer nem kap fájlrendszer-hozzáférést.
- A gyökérmappában egy `biztonsagi-mentes.json` indexfájl (`utolso`, `gepId`), last-write-wins.
- A Kezdőlapon amber emlékeztető, ha az utolsó mentés 30 napnál régebbi vagy nincs.
- **Visszaállítás** kézi és dokumentált: a ZIP kibontása egy üres mappába, majd a varázslóban
  „Másik mappa kiválasztása”. Az éles indulás feltétele, hogy ezt egyszer ténylegesen végigcsinálták
  fiktív adattal, és az app a visszaállított mappát a miénkként ismerte fel, minden verzió `teljes`.

## 7. Demó-export → import híd

### 7.1 Export a demóból

„Adatok exportálása az asztali alkalmazáshoz” gomb az Adatkezelés fülön, a `DemoBanner` is
felszólít. Egyetlen JSON (`kezelesi-terv-export-<ISO>.json`): `formatum: 'dental-plan-export'`,
`schemaVersion: 1`, `arlista`, `beallitasok`, `sablonok` (név → tartalom). **Páciensadat nem kerül
bele** (a seed-páciensek fiktívek). A generálás a `PlanStorage` interfészen át olvas, kiírás előtt
`assertPriceListShape`/`assertSettingsShape`, hogy egy sérült demó-állapot exportáláskor bukjon.

### 7.2 Import a telepített appban

A varázsló „üres mappa” ága: „Van egy exportált fájlom a demóból” → natív fájlválasztó →
validálás sorrendben (`formatum` → `schemaVersion` → árlista/beállítások alak → sablonkulcsok
`<név>-v<szám>.md` mintájúak, értékek stringek). **Bármelyik bukásánál semmi nem íródik.**
Sablonoknál egyesítés: az export győz, a hiányzókat a beépített készlet pótolja. Megerősítő
összegzés írás előtt. Ugyanez az importáló a Beállításokból is elérhető.

A Pages-deploy csak azután kapcsolható le, hogy a doki megerősítette a sikeres export-importot.

## 8. A demó lebontása

A DEMO menüpont már megszűnt; a fülek mai helye és sorsa a lebontáskor:

| Fül | Ma | Sors |
|---|---|---|
| Összes terv | Saját menüpont, `/tervek` | Marad |
| Funkciók | A Súgó menüpont füle | Marad |
| Változásnapló | A Súgó menüpont füle | Marad; kézi frissítés mellett ez mondja el, mi változott |
| Filerendszer | A Beállítások füle, csak a Pages-demóban | Törlődik; helyette „Mappa megnyitása” |
| Adatkezelés | A Beállítások füle, csak a Pages-demóban | Törlődik (export után) |

Vele együtt: `DemoBanner`, `demoFileTree.ts`, a `StorageContext` demó-only mezői
(`listFileTree`, `readRawFile`, `resetDemoData`, `clearAll`, `isSeedVersion`). A `seed/plans.ts`
tesztfixture-ré válik; `seed/priceList.ts`, `seed/settings.ts`, `seed/templates.ts` **termékbeli
marad** (üres mappa alapértékei, export-egyesítés, explicit pótló akciók). A `seed/priceList.ts`
modulbetöltéskori `assertPriceListShape` futását a main processben körbe kell zárni, hogy hiba a
varázslóban jelenjen meg, ne összeomlásként. A `nincsMentettPdfHiba(ref, demoEredetu)` egyszerűsödik:
minden hiányzó PDF `'hiba'`; a `hianyos` verzió külön állapot, nem hiba.

## 9. Build, csomagolás, kiadás

### 9.1 Repo-elrendezés

`app/electron/` (`main.ts`, `preload.ts`, `protocol.ts`, `fileSystemStorage.ts`, `ipcHandlers.ts`,
`ipcValidate.ts`, `naplo.ts`, `backup.ts`), saját `tsconfig.electron.json` (Node target, nincs DOM
lib). Megosztott, DOM-mentes modulok: `storage/paths.ts`, `storage/json.ts`, `domain/validate.ts`,
`domain/schema.ts`, `domain/paciensTorles.ts`, a termékbeli seedek. Aki ezekbe böngésző-API-t
vezet, a main buildjét töri el. Egy `package.json`, új scriptek: `electron:dev`, `electron:build`,
`electron:package`; devDependency: `electron`, `electron-builder`, `concurrently`,
`@playwright/test`.

### 9.2 `electron-builder`

- Windows: `nsis`, `x64`, `deleteAppDataOnUninstall: true`, aláíratlan (SmartScreen elfogadott).
- macOS: egy `universal` `dmg` (Apple Silicon és Intel, macOS 13 vagy újabb), ad-hoc aláírás
  (`identity: "-"`, `hardenedRuntime: false`), script nélkül; az útmutató a 2. döntés szerinti
  lépésekkel.

### 9.3 Workflow-k

- **`ci.yml`** (új, a mai `deploy.yml` build-jobjából): push és PR `master`-re, `lint`, `test`,
  `test:workflow`, `docs-check`, `build`. **Ez megmarad a demó után is.**
- **`deploy.yml`**: csak a Pages-deploy lépés marad benne, a `ci.yml`-re várva; a 3. mérföldkőben
  törlődik.
- **`release.yml`**: `v*` tagre, `windows-latest` + `macos-latest` mátrix (+ `macos-26-intel`, csak
  az x64-szelet füst-tesztje, telepítő nélkül), `npm ci`, `npm test`
  (a `FileSystemStorage` tesztek mindkét OS-en), Playwright füst-teszt, `electron:package`, feltöltés
  GitHub Release-be.

## 10. Mérföldkövek

### 10.0 Előkészítés (Pages-re megy, nincs Electron)

- `sanitizeNamePart()`: foglalt Windows-nevek, vágás utáni záró pont/szóköz.
- `storage/localKeys.ts`: a `dp:` prefix kiemelése; `NyomtatvanyokTab.tsx` ráköt.
- `PlanStorage` bővítése: `listTemplates()`, `loadPlanPdf()`, `loadLatestTemplateByBase()` az
  interfészre; `listVersions()` eredménye `allapot` mezőt kap (a `DemoStorage` mindig `teljes`).
- `DraftMeta` bővítése `alapVerzio?: { tervId, verzio }` mezővel; a `loadPlanIntoDraft`/
  `copyPlanIntoDraft` tölti; a véglegesítés-checklist amber tétele, ha azóta újabb verzió létezik.
- `ci.yml` leválasztása a `deploy.yml`-ről.
- `PRODUCT.md § Adat- és deployment-korlátok`: „Páciens- és kezelési adat sosem hagyja el a helyi
  gépet” helyett **„Az alkalmazás nem továbbít páciensadatot: nincs backend, telemetria, analytics,
  remote logging, külső AI/API. A rendelő által beállított Drive-kliens végzi a felhőszinkront
  (My Drive, Tükrözés mód, Google Workspace DPA).”** Az „append-only írás mellett nem keletkezik
  conflicted copy” mondat törlendő; helyette a gépváltási szabály és a negyedéves helyett a
  **havi** külső másolat (az appból ZIP-pel). A root `CLAUDE.md` hard invariánsa változatlan marad
  (az app nem továbbít; a CSP és az oxlint ezt őrzi).
- Demó-export akció (§7.1) és `DemoBanner`-felszólítás.

**Kész:** `npm test`, `docs-check` zöld, a Pages-demó viselkedése változatlan, a doki exportált.

### 10.1 Electron-héj a meglévő `localStorage`-appal

Az `app/` változatlanul, `DemoStorage`-zal, Electron-ablakban, telepíthető formában. `app://`
protokoll, `base: './'`, CSP, `contextIsolation`/`sandbox`, egy-példány zár, navigációs tiltások,
Playwright füst-teszt, `release.yml` teszt-tagre.

**Kész:** telepíthető csomag mindkét platformon; a doki mindkét gépén telepít és elindít (a
Gatekeeper/SmartScreen súrlódás a gyakorlatban kipróbálva); DevTools **nulla CSP-sértés** az
`/elonezet` oldalon; a generált PDF-en a beágyazott font és a logó látszik; a PDF-előnézet
(`plugins: true`) működik; füst-teszt zöld mindkét runneren.

### 10.2a `FileSystemStorage` helyben, hibainjektálással

§3.2–§3.3, §4, §5, §6 (ZIP-mentéssel), §7.2. Új, Node-környezetű tesztkészlet
(`fs.mkdtemp`), ami célzottan fedi:

- atomi írás megszakítása (hiba az `fsync` előtt → célfájl érintetlen);
- `EBUSY` az első két hívásra → újrapróba sikerrel; tartós `EACCES` → `IO` hiba;
- verzió-ütközés a `rename` előtt → `VERZIO_UTKOZES`, temp eldobva, sorszám nem íródik felül;
- manifest nélküli, hiányzó PDF-ű és hash-eltérő verzió → `hianyos`, nem tölthető, a következő
  sorszám nem használja újra;
- ütközésőr: külső módosítás betöltés és mentés között → `FELULIRAS_UTKOZES`, `felulir: true`
  esetén `_utkozesek/` alá kerül a régi;
- `init()` hiányos mappára nem ír; idegen mappát elutasít; `.tmp-*` és Drive-mintájú nevek
  listázva, nem törölve;
- IPC-őrök: idegen küldő, `..`-t tartalmazó `patientDir`, symlink a gyökéren kívülre, túl nagy
  PDF, `deletePatient` új tervvel → mind elutasítva;
- NFD-nevű mappa beolvasása, kis-/nagybetű-ütközés `createPatient`-nél;
- index-írás hibája → `savePlan` siker + figyelmeztetés;
- napló: redaktált útvonal, nincs nyers OS-üzenet, nincs tervmappa-név;
- `AppState`: elutasított mentés után a két dialógus-kimenet helyes állapota.

**Kész:** a fenti tesztek zölden futnak Windows és macOS runneren; a doki egy **helyi** (nem
Drive) mappában végigmegy a teljes munkafolyamaton; ZIP-mentés és visszaállítás egyszer
végigcsinálva.

### 10.2b Kétgépes Drive-próba fiktív adatokkal

Valódi, My Drive alatti, Tükrözés módú mappa, két gép, kizárólag fiktív páciensek. Forgatókönyvek,
mindegyik dokumentált eredménnyel:

1. Normál gépváltás a szabály betartásával: lánc folytatása a másik gépen.
2. **Megszakadt szinkron:** laptop lecsukva a feltöltés közben → a másik gépen `hianyos` verzió
   látszik, „Újraellenőrzés” a szinkron után `teljes`-re vált.
3. **Későn visszatérő laptop:** ugyanaz a sorszám két gépen → Drive ` (1)` mappa → induláskori
   amber sáv, mindkét változat megvan, a doki a Fájlkezelőben rendezi.
4. **Ütköző árlista:** mindkét gépen módosítás szinkron nélkül → az őr és/vagy a Drive-ütközés
   észlelése jelez, a vesztes változat `_utkozesek/` alatt.
5. **Elavult piszkozat:** Windowson v2-ből indult piszkozat, Macen v3 készül → a véglegesítés amber
   jelzése és a következő sorszám helyes.
6. Hiányzó gyökérmappa (Drive leállítva) → blokkoló képernyő, „Újrapróba” működik.
7. **Visszaállítás** a ZIP-ből egy üres mappába, az app felismeri, minden verzió `teljes`.

**Kész:** mind a hét forgatókönyv lefutott, adatvesztés nélkül, a napló páciensnév nélkül.

### 10.3 Demó lebontása

§8, `PRODUCT.md § Két fázis` és a root `CLAUDE.md` átvezetése, `DemoStorage` → `InMemoryStorage`
(§11), `deploy.yml` törlése, `ci.yml` marad.

**Kész:** termékkód nem hivatkozik `DemoStorage`-ra, vitest zöld, Pages offline, a doki megerősítette
az importot.

### 10.4 Éles indulás kapuja (29. döntés)

Csak a 10.2b összes forgatókönyve és a visszaállítás-próba után kerülhet valódi páciensadat a
gyökérmappába. A telepítési útmutató tartalmazza: Drive-mód és My Drive követelmény, gépváltási
szabály, macOS-megnyitásengedély, SmartScreen, havi ZIP-mentés külső lemezre, visszaállítás lépései.

## 11. Hogyan marad zöld a vitest-készlet

1. 10.0–10.1: `DemoStorage` változatlan (a `listVersions` `allapot` mezője mindig `teljes`).
2. 10.2a: a `FileSystemStorage` saját Node-környezetű tesztkészletet kap; az oldaltesztek még
   `DemoStorage`-ra épülnek.
3. 10.3: `DemoStorage.ts` → `app/src/test-utils/InMemoryStorage.ts`, a tároló `Map<string, string>`;
   `enqueue`, validáció, mappanév-építés, **manifest-írás** változatlan. Az oldaltesztek importja
   erre áll át. Törlendő: `resetDemoData`/`clearAll`/`listFileTree`/`readRawFile` tesztjei, a
   legacy-layout-migráció, a kvóta-injektálás. `test-setup.ts` `MemoryStorage` shimje marad (22.
   döntés). `Home.test.tsx`, `AppState.test.tsx`, `AdatkezelesSection.test.tsx`,
   `FileTreeSection.test.tsx`, `OsszesTervSection.test.tsx` egyenként átnézendő.
4. A `CLAUDE.md`-k `symbol:`/`test:` anchorai a mozgatott fájlokra ugyanabban a commitban
   átírandók; a `docs-check` mutatja őket.

## 12. Vállalt kockázatok

- **Eltérő app-verzió a két gépen** kézi frissítés mellett: egy magasabb `schemaVersion` fájlt a
  régi gép helyesen megtagad, a doki élménye rossz. Enyhítés: az üzenet kimondja, hogy a másik
  gépen újabb az app. A sémamigrációs keretrendszer hatókörön kívül.
- **A PDF nem bájtra azonos a két platformon**: a `@react-pdf/renderer` saját layout-lánca
  azonos, de a fogtérkép canvason át PNG-be rasterizálódik, és a canvas szövegrajzolása
  platformfüggő. Ez nem jogi probléma, de a telepítési útmutató és a `PRODUCT.md § Két fázis`
  **ne ígérjen bájtra azonos PDF-et**, csak azonos tartalmat és elrendezést.
- **Az ütközésőr és a verzió-ellenőrzés csak a helyben látható állapotot ismeri.** A még meg nem
  érkezett módosítást egyik sem látja; a gépváltási szabály és az adatmegőrzés (semmi nem törlődik)
  a védelem.
- **A Drive Tükrözés mód és a My Drive követelmény nem kikényszeríthető** az appból.
- **A protokollnév tartós**: megváltoztatása kiürítené a piszkozatot (22. döntés).
- **Nincs automatizált GUI-teszt a csomagolt appon** a füst-teszten túl; a vizuális ellenőrzés
  kézi, mindkét OS-en. A `browser-validation` skill a Vite dev szervert hajtja, ez marad;
  a `CLAUDE.md` böngésző-automatizálási tilalma érvényben.
- **`listPatients()` költsége** hidegen induló Drive-mappán 2–5 s lehet; a 13. döntés marad, a
  cache az egyetlen későbbi optimalizálási pont.
- **A `.tmp-*` fájlok átmenetileg a Drive-ra is felkerülhetnek**; ártalmatlan, de a doki a
  Drive webes felületén láthatja őket.
- **Időbecslés nincs**; tételenként, a backlog-tételek kivágásakor.

## 13. Amit a terv nem tartalmaz

- `terv.json` beágyazása a PDF-be (`pdf-lib`).
- Sémamigrációs keretrendszer.
- Szinkronizált (Drive-ra kerülő) piszkozat; ha a doki később félkész terveket vinne gépek
  között, önálló tétel, a forrásverzió-mező már előkészíti.
- `PISZKOZAT` státuszú mentett verziók.
- Automatikus átsorszámozás duplikált verziómappáknál.

## 14. Kritikus fájlok

| Fájl | Miért |
|---|---|
| `app/src/storage/PlanStorage.ts` | A szerződés; 10.0-ban bővül (`listTemplates`, `loadPlanPdf`, `loadLatestTemplateByBase`, `allapot`) |
| `app/src/storage/DemoStorage.ts` | Referenciaimplementáció a portoláshoz; később `InMemoryStorage` |
| `app/src/storage/paths.ts` | Megosztott main/renderer; `sanitizeNamePart` javítás, `VersionConflictError` payload, manifest-név |
| `app/src/storage/DraftStorage.ts` | `DraftMeta.alapVerzio` |
| `app/src/storage/StorageContext.tsx` | A `DemoStorage` → `ElectronStorage` varrat |
| `app/src/state/AppState.tsx` | Updater-mentés és az ütközés utáni állapot |
| `app/src/pages/PreviewPage.tsx` | Az egyetlen `savePlan()`-hívó; ütközés-dialógusok, amber tételek |
| `app/vite.config.ts` | CSP-plugin (meglévő), `base` kapcsoló |
| `.github/workflows/deploy.yml` | Szétválasztandó `ci.yml`-re és Pages-deployra |
| `docs/PRODUCT.md` | Adatvédelmi megfogalmazás, Drive-szabályok, backup-ritmus, PDF-ígéret |
