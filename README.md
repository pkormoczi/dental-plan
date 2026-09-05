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
   `docs/desktop-app-migration-plan.md`).

## Hova nézz

| Fájl | Mit tartalmaz |
|---|---|
| `docs/PRODUCT.md` | Termékcél, napi flow, adat- és jogi korlátok, a nyomtatvány szerződéses szabályai, nem-cél, nyitott kérdések |
| `CLAUDE.md` | Agent-context: repó-térkép, parancsok, sérthetetlen invariánsok anchorral, workflow (`/idea` → `/plan` → `/implement` → `/finish`) |
| `app/src/CLAUDE.md` + `app/src/{domain,storage,pdf}/CLAUDE.md` | Felület-rendszer és a modulok mentális modellje, szándékos hiányok, „find before writing” index |
| `docs/desktop-app-migration-plan.md` | A 2. fázis (Electron + fájlrendszer) terve |
| `backlog/` | Egy fájl = egy nyitott tétel, slug-névvel: `idea/` az ötlet, a gyökér a tervezett; a modell a `backlog/CLAUDE.md`-ben, a teljes flow (skillek, őrök, ismert feszültségek) a `backlog/README.md`-ben |
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
`backlog/idea/arlista-nap.md`.
