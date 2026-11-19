# Kezelési terv app

Fogorvosi kezelési terv és árajánlat készítő alkalmazás, ami kiváltja a
Mándoki Dental jelenlegi Excel + form control alapú megoldását.

## 🔗 Élő demó

**[pkormoczi.github.io/dental-plan](https://pkormoczi.github.io/dental-plan/)**

Ez a mockup (1. fázis) — demó adatokkal, a böngészőben tárolva. Ne írj
be valódi páciensadatot. A cél, hogy a doki végigkattintsa és
visszajelezzen, mielőtt a fájlrendszeres verzió elkészül.

Az implementáció az `app/` mappában folyik, két lépésben:

1. **Mockup** — GitHub Pages-re deployolt, kattintható demó, demó adatokkal
   (`localStorage`, nincs valódi páciensadat-mentés). Ez a doki validációjára
   szolgál, mielőtt a fájlrendszeres verzió elkészül.
2. **Végleges alkalmazás** — ugyanaz a kódbázis Electron-héjban, a tárolóréteg
   lecserélve a fájlrendszerre író implementációra (a terv:
   `docs/desktop-app-migration-plan-final.md`).

## Az asztali app kipróbálása helyben (Windows)

Előfeltétel: Node.js LTS és git. Egyszer, a repó gyökeréből: `cd app && npm ci`. Minden alábbi
parancs az `app/` mappában fut. (A `npm run dev` a böngészős demót indítja, nem az asztali appot.)

| Parancs | Mire jó | Gépenkénti adatai |
|---|---|---|
| `npm run electron:dev` | Fejlesztéshez: Vite dev szerver + Electron, a felület módosítása azonnal látszik. A `electron/` alatti (main, preload) módosításhoz a parancsot újra kell indítani. | `%APPDATA%\mandoki-dental-dev` |
| `npm run electron:start` | A production build, csomagolás nélkül. | `%APPDATA%\mandoki-dental-dev` |
| `npm run electron:package:dir`, utána `release\win-unpacked\mandoki-dental.exe` | A csomagolt app telepítés nélkül, ugyanúgy, ahogy az e2e is futtatja. | `%APPDATA%\mandoki-dental` |
| `npm run electron:package`, utána `release\Mandoki-Dental-Setup-<verzió>.exe` | A telepítő: felhasználónként telepít, rendszergazdai jog nélkül; a Start menüből „Mandoki Dental” néven indul. | `%APPDATA%\mandoki-dental` |

A gépenkénti mappában van a választott adatmappa útja (`config.json`), a félkész terv és a
hibanapló (`naplo\`). A csomagolatlan futás (`electron:dev`, `electron:start`) külön,
`-dev` végű mappát használ, így sosem nyúl egy ugyanazon a gépen telepített app beállításához
és félkész tervéhez; a csomagolt exe és a telepített app viszont ugyanazt a mappát használja.

**Első indításkor** a program adatmappát kér:

1. Próbához egy új, üres, **helyi** mappát válassz (például `C:\Temp\mandoki-proba`), ne a
   Google Drive-ot. Csak kitalált páciensadattal dolgozz: a felső sáv ezt „PRÓBAÜZEM”-ként jelzi.
2. „Új adatmappa létrehozása”: az alapértelmezett árlistával és szövegekkel épül fel. Vagy „Van
   egy exportált fájlom a demóból”: az [élő demó](https://pkormoczi.github.io/dental-plan/)
   DEMO → Adatkezelés fülén letöltött `kezelesi-terv-export-<dátum>.json` fájlból.
3. Később a Beállítások → Adattárolás fülön a mappa megnyitható, cserélhető, és ott készíthető
   biztonsági mentés is.

**Újrakezdés:** zárd be az appot, töröld a gépenkénti mappából a `config.json`-t (a következő
indításkor újra a varázsló jön), és ha kell, a próba-adatmappát is. A teljes gépenkénti mappa
törlése a félkész tervet és a naplót is viszi. Az adatmappához az app eltávolítása nem nyúl.

**Hasznos még:**

- A menüsor rejtett, `Alt`-ra jelenik meg. Csomagolatlan futásnál van benne „Fejlesztés” menü
  (újratöltés, DevTools).
- `npm run test:electron`: csomagol, majd lefuttatja az asztali app automatikus tesztjeit. A
  tesztek ideiglenes gépenkénti mappával és ideiglenes adatmappákkal futnak, a fentiekhez nem
  nyúlnak.
- A telepítés lépései a doki szemszögéből, Windowsra és Macre: `docs/TELEPITES.md`.

## Hova nézz

| Fájl | Mit tartalmaz |
|---|---|
| `docs/PRODUCT.md` | Termékcél, napi flow, adat- és jogi korlátok, a nyomtatvány szerződéses szabályai, nem-cél, nyitott kérdések |
| `CLAUDE.md` | Agent-context: repó-térkép, parancsok, sérthetetlen invariánsok anchorral, workflow (`/idea` → `/plan` → `/implement`, gyors javításra `/fix`) |
| `app/src/CLAUDE.md` + `app/src/{domain,storage,pdf}/CLAUDE.md` | Felület-rendszer és a modulok mentális modellje, szándékos hiányok, „find before writing” index |
| `docs/desktop-app-migration-plan-final.md` | A 2. fázis (Electron + fájlrendszer) terve |
| `backlog/` | Egy fájl = egy nyitott tétel, slug-névvel: `idea/` az ötlet, a gyökér a tervezett, mindkettő alatt `later/` a `Prio: later` tételeké; a modell a `backlog/CLAUDE.md`-ben, a teljes flow (skillek, őrök, ismert feszültségek) a `backlog/README.md`-ben |
| `data/arlista.seed.json` | **Kész seed adat** — 118 tétel, 12 kategória, az eredeti Excelből generálva |
| `assets/mandoki-dental-logo.png` | Márkalogó, átlátszó háttér (navy eredeti — az app egy, a honlap arculatához átszínezett másolatot használ, `app/src/assets/logo.png`) |
| `app/` | A tényleges implementáció — `cd app && npm run dev \| build \| lint \| test \| docs-check` |

A 2026-09-05 előtti tervdokumentáció (áttekintés, domain-modell, funkcionális és
nyomtatvány-spec, technológia, felület-rendszer, a lezárt backlog-tételek) a `docs` alatti
`legacy` mappában él, történeti anyagként — normatív ereje nincs, semmi nem hivatkozik rá,
és 2026-11-04 után törlődik.

## Az MVP határa és a nyitott kérdések

Mi van benne, mi nincs, és mi vár a dokira (német tételnevek orvosi és a nyilatkozat jogi
lektorálása, garancia-szakasz szövege, cégadatok a lábléchez): `docs/PRODUCT.md` „Nem cél” és
„Szándékos hiányok és nyitott kérdések”. Az árlista takarítása külön doki-ülés:
`backlog/idea/later/arlista-nap.md`.
