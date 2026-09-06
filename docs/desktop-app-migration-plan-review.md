# Az asztali alkalmazás migrációs tervének értékelése

Dátum: 2026-09-05  
Vizsgált dokumentum: [desktop-app-migration-plan.md](desktop-app-migration-plan.md)

Az értékelés használati alaphelyzete: egy fogorvos, két laptop (Windows és macOS), egyszerre csak az egyik használatával. A jelenlegi React-alkalmazás GitHub Pages-en, demóként, böngészős localStorage-tárolással fut; a cél egy telepíthető Electron-alkalmazás, Google Drive-on keresztüli fájlszinkronnal.

## Vélemény

**Az Electron + helyi fájlok + Google Drive irány megfelelő egy doki két, felváltva használt laptopjához. A terv jó alap, de a szinkronbiztonságot több helyen erősebbnek állítja, mint amit a leírt megoldás biztosít.** Az Electron-héj elkészítését el lehet kezdeni; az éles adattárolás előtt az alábbi pontokat javítani kell.

Az értékelés a teljes terv, a storage-, állapotkezelési és buildkód statikus áttekintésén, valamint a platformállítások hivatalos dokumentációval való összevetésén alapul. Nem történt implementáció vagy futtatásos tesztelés.

## 1. Az „egyszerre egy gép” nem zárja ki az adatütközést

Érintett rész: §4.5 és §5.1.

Például:

- Windowson elkészül a v3, de a doki lecsukja a laptopot a feltöltés befejezése előtt.
- Macen még csak v2 van, ezért ott is készül egy v3.
- Később a Drive találkozik a két változattal.

Ehhez nem kellett egyszerre használni a két alkalmazást. A mentés előtti második mappaellenőrzés csak a **helyben már látható** változatot észleli. Az `mtime`-ellenőrzés ugyanígy nem látja a még meg nem érkezett árlista-módosítást. Tartalomhash használata pontosabb helyi változásészlelés lenne, de ezt az alapkorlátot az sem oldaná meg.

A dokumentumból ezért ki kell venni, hogy az append-only verziómappák biztosan konfliktusmentesek, illetve hogy az `mtime` „megoldja” a felülírt fájlok problémáját.

Ehhez a kis rendszerhez elfogadható lehet egy **kimondott gépváltási szabály**: app bezárása → feltöltés befejezésének ellenőrzése → másik gépen letöltés befejezésének ellenőrzése → app megnyitása. De mellé kell adatmegőrzés és helyreállítás arra az esetre, amikor ez elmarad. Egy Drive-on szinkronizált lockfájl sem adna biztos elosztott zárolást.

## 2. A helyi atomi mentésből nem következik atomi szinkronizálás

Érintett rész: §4.2.

A temp mappa → átnevezés jó helyi mentési minta. A terv azonban nem alapozhat arra, hogy a másik laptopon a `terv.json` és a PDF egyszerre válik elérhetővé.

Szükséges:

- Csak teljes, egymáshoz tartozó JSON+PDF-párt lehessen használható verzióként megnyitni.
- A részlegesen beérkezett verzió kapjon felismerhető állapotot és újraellenőrzési lehetőséget.
- Egy meglévő adatmappában a hiányzó fájlokat az `init()` ne pótolja automatikusan seedadatokkal: a hiány jelenthet félbemaradt szinkront vagy sérülést.
- A kettős `exists`-ellenőrzés mellett maga a véglegesítő művelet is védjen a felülírás ellen; az ellenőrzés és az átnevezés között továbbra is van versenyablak.

Érdemes megvizsgálni egy mentésenként egyedi azonosítóval és fájlhash-ekkel ellátott manifestet. **Önmagában egy „kész” jelzőfájl nem elég**, annak tartalmát és a hozzá tartozó fájlokat is ellenőrizni kell.

## 3. Hiányzik a main process tényleges biztonsági szerződése

Érintett rész: §3 és a §4.1 `deletePatient` művelete.

A `contextIsolation`, `sandbox` és szűk preload API jó. Ezek mellett explicit le kell írni:

- Minden IPC-hívás küldőjének és paramétereinek futásidejű ellenőrzését.
- A kapott útvonalelemekből ne lehessen `..`, abszolút útvonal, symlink vagy junction segítségével kilépni az adatmappából.
- A külső navigáció és új ablakok korlátozását.
- A páciens törölhetőségét a main process is ellenőrizze újra, közvetlenül a törlés előtt.

A jelenlegi terv szerint a main feltétel nélkül végrehajtaná a rekurzív törlést, a feltételt kizárólag a renderer ellenőrzi. Drive mellett az ellenőrzés óta új terv is megjelenhetett. Az Electron hivatalos útmutatója is külön megköveteli az IPC-küldő ellenőrzését és a navigáció korlátozását. [Electron security](https://www.electronjs.org/docs/latest/tutorial/security)

## 4. Az IPC-hibakezelés leírása nem támogatja a tervezett konfliktusdialógusokat

Érintett rész: §3.2.

A „nincs szükség kézi hiba-szerializációra” itt hibás következtetés. Az Electron a dobott hiba `message` mezőjét viszi át; a saját hibatípus és extra mezői nem maradnak meg automatikusan. Pedig a felületnek kell a hibakód, az ütköző verzió és annak adatai. [Electron ipcMain](https://www.electronjs.org/docs/latest/api/ipc-main)

Kell egy típusos, szerializálható hibaeredmény. A konfliktusfeloldást az állapotkezeléssel együtt kell megtervezni: az [AppState](../app/src/state/AppState.tsx) jelenleg a tartós mentés előtt frissíti a memóriabeli árlistát és beállításokat (`saveSettings`, `savePriceList`). Egy elutasított mentés után nem maradhat tisztázatlanul az el nem mentett változat az alkalmazás aktív adata.

## 5. A helyi piszkozat termékdöntés, és közvetlenül érinti a kétlaptopos használatot

Érintett rész: 5. és 25. döntés.

A jelenlegi terv szerint a doki **nem tud egy Windowson félbehagyott tervet Macen folytatni**. Ez rendben lehet, ha a gépváltás mindig lezárt munkák között történik. Ha félkész terveket is vinne magával, a szinkronizálható mentett piszkozat már az első kiadás funkcionális igénye.

Van egy másik eset is: Windowson marad egy v2-ből indult piszkozat, közben Macen elkészül v3, majd a doki visszatér a régi piszkozathoz. A következő szabad v4 sorszám kiosztása önmagában nem jelzi, hogy elavult alapból dolgozik. Ehhez a piszkozat forrásverzióját is ellenőrizni kell.

## 6. Az adatvédelmi megfogalmazás és a naplózási példa javítandó

A [PRODUCT.md](PRODUCT.md) „Adat- és deployment-korlátok” szakasza egyszerre állítja, hogy az adat sosem hagyja el a gépet, és hogy Google Drive-ra szinkronizálódik. Tükrözésnél a Google dokumentációja szerint is helyben **és a felhőben** tárolódnak a fájlok. [Google Drive tükrözés](https://support.google.com/drive/answer/13401938?hl=en)

A tényleges szándékot így érdemes leírni: **az alkalmazás nem továbbít páciensadatot; a rendelő által beállított Drive-kliens végzi a felhőszinkront.** Ez nem ugyanaz az adatkezelési állítás.

A §5.3 naplóanonimizálási példája pedig meghagyja az `Implantacio_x9k2m1` tervmappanevet. Ez kezelési információ, a szabadon megadott cím akár nevet is tartalmazhat. A naplóban a páciens- és tervmappa olvasható nevét egyaránt el kell hagyni, és nyers fájlrendszerhiba-üzenetet sem szabad kiírni ellenőrizetlenül.

## 7. Néhány tényállítás elavult vagy pontatlan

- **CSP már van**, a szükséges `wasm-unsafe-eval` engedéllyel együtt: [vite.config.ts](../app/vite.config.ts). A terv ezt még hiányzóként és nyitott kérdésként tárgyalja.
- **A react-pdf PDF-elrendezését nem Chromium végzi.** Saját feldolgozási láncot, Yoga layoutot és PDFKit-et használ. Az Electron egységes környezetet ad, de a „Chromium miatt azonos PDF” indoklás túlzó. A canvasos fogtérkép valóban platformfüggő rész. [React-pdf renderelési folyamat](https://react-pdf.org/blog/rendering-process)
- **Windows alatt alapértelmezésben nincs kis-/nagybetű-megkülönböztetés**, az APFS pedig megőrzi a fájlnév normalizációját; nem általánosan NFD-re alakít. A hordozhatósági teszt jó ötlet, az indoklást javítani kell. [Microsoft](https://learn.microsoft.com/en-us/windows/wsl/case-sensitivity), [Apple](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/APFS_Guide/FAQ/FAQ.html)
- A [deploy.yml](../.github/workflows/deploy.yml) teljes törlésével a jelenlegi folyamatos build/lint/test/docs-check is eltűnne. **A CI maradjon meg külön**, csak a Pages-deploy szűnjön meg.
- A Google Workspace használatán belül pontosítani kell, hogy **My Drive alatti közös adatmappáról** van szó: a Shared Drive-okat a kliens csak streamelni tudja. [Google Drive módok](https://support.google.com/drive/answer/13401938?hl=en)

## Javasolt megvalósítási sorrend és élesítési feltétel

A megvalósítási sorrend megtartható, de az adattárolási mérföldkövet érdemes kettébontani: először helyi fájlrendszeres működés hibainjektálásos tesztekkel, utána kétgépes Drive-próba fiktív adatokkal. Ebben legyen megszakadt szinkron, későn visszatérő laptop, részleges verzió, elavult piszkozat és tényleges visszaállítás is.

A kézi frissítés, az egyszerű fájlalapú tárolás és a backend nélküli működés ehhez a mérethez ésszerű. **Az éles indulás feltétele a bizonyított adatmegőrzés és visszaállíthatóság legyen; a negyedéves kézi másolat napi használat mellett túl ritka.**
