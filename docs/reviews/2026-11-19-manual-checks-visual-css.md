# manual-checks — `visual-css` szelet, 2026-11-19

Kiváltó: `/implement demo-menu-megszuntetese` 2d lépése. A tétel a fő menüből kivette a DEMO
menüpontot: új „Összes terv” menüpont (`#/tervek`), a jobb szélre zárt „Súgó” (`#/sugo`, Funkciók
és Változásnapló fül), a Pages-demóban a Beállítások két új füle (Filerendszer, Adatkezelés), és a
régi `#/demo/...` címek átirányítása (`app/src/components/NavBar.tsx`, `app/src/pages/SugoPage.tsx`,
`app/src/pages/SettingsPage.tsx`, `app/src/pages/RegiDemoCim.tsx`).

Környezet: izolált, headless Chrome (`.mcp.json`, `--isolated`), `npm run dev`
(`http://localhost:5175/dental-plan/`), 1440×900, kiegészítésként 1280×720; seed demó adat,
determinisztikus reset a menet elején. Futásidő: ~12 perc.

## A tételhez tartozó ellenőrzés — rendben

| Eset | Eredmény |
|---|---|
| Fő menü, 1440×900 és 1280×720 | ✅ Kezdőlap · Páciensek · Összes terv · Kezelések és árak · Beállítások, a Súgó a jobb szélen; nincs tördelés, nincs vízszintes görgetés |
| `#/tervek` | ✅ „Összes terv” címmel a tervfa; a menüpont aktív kiemelést kap |
| `#/sugo`, `#/sugo/valtozasnaplo` | ✅ két fül, a megfelelő fül aktív, 760 px-es lap |
| `#/beallitasok?tab=filerendszer` | ✅ a kétpaneles fájlfa a 900 px-es lapon elfér, egy fájl tartalma a jobb panelen olvasható, vízszintes görgetés nincs |
| `#/beallitasok?tab=adatkezeles` | ✅ a három demó-adatkezelő gomb (visszaállítás, törlés, export) megvan |
| Régi címek | ✅ `#/demo/adatkezeles` → `#/beallitasok?tab=adatkezeles` az Adatkezelés füllel; `#/demo` → `#/sugo` a Funkciók füllel |
| Demó-sáv | ✅ a szöveg a „Beállítások Adatkezelés fülére” utal |

## A szelet állandó pontjai — rendben

- Kontraszt-, `controlBorder`- és accent-mint-szövegszín-mérés (a `visual-css.md` snippetje) mind a
  8 route-on és a három új fülön (`#/beallitasok?tab=filerendszer`, `?tab=adatkezeles`,
  `#/sugo/valtozasnaplo`): 0 szabálysértés.
- Fókuszgyűrű: billentyűzetes Tab után mind a hat menülink (a Súgó is) látható körvonalat kap; a
  Beállítások fülein a fókusz a belső elem 2 px-es barna körvonala (`:focus-visible`), a régi és az
  új füleken egyformán.
- Konzol: 0 üzenet, CSP-sértés nincs.

## Kritikus

Nincs.

## Közepes

Nincs.

## Apró

Nincs.

## Nem ellenőrizhető

- `#/elonezet` piszkozat nélkül a Kezdőlapra visz, ezért ott a mérés a Kezdőlapot mérte; a tétel
  az előnézethez nem nyúlt.
- `prefers-reduced-motion`: az `emulate` tool nem támogatja; e tételnél nem releváns.
