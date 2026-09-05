# Backlog 98. tétel — Számmezők tartalmának kijelölése fókuszáláskor — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 98. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `components/NumberField.tsx` `<input>`-jén nincs `ref`, és sehol a
kódbázisban nincs `select()` hívás az `onFocus`-ban — egy meglévő értékű
számmezőre kattintva és a régi tartalom törlése nélkül gépelve a beírt
számjegyek a meglévő érték VÉGÉHEZ fűződnek (pl. `24000` mezőbe kattintva
és `28000`-et gépelve a mező `2400028000`-et mutat). A legrosszabb esetek
az `autoFocus`-szal mountolódó mezők (árlista fix ár, Előleg, Egyedi
végösszeg), ahol a doki az első leütéskor még nem is látta, mi állt eddig
a mezőben. A `NumberField`-et hívó MINDEN felület érintett: az Árlista
admin (`ItemEditor.tsx` fix/sávos árak, `TomegesArDialog.tsx` tömeges
árváltoztatás százaléka) és a terv szerkesztő (`LineRow.tsx` darabszám és
tényleges egységár, `ElolegBlokk.tsx`, `EgyediVegosszegBlokk.tsx`).

## Döntések

### 1. Hatókör: kizárólag a `NumberField`

A javítás a `components/NumberField.tsx`-re korlátozódik. A
`pages/priceListAdmin/BufferedFields.tsx` (`BufferedTextField`/
`BufferedTextArea` — tétel név/leírás szövegmezők) NEM kap hasonló
viselkedést, változatlan marad.

**Miért:** a teljes-tartalom-kijelölés fókuszáláskor egy szám-mezőnél
(Excel-cella jelleg) egyértelműen várt viselkedés — egy rövid, atomi
érték, amit jellemzően EGYBEN cserél le a doki. Egy név/leírás
szövegmezőnél viszont a doki tipikusan a mondat KÖZEPÉBE akar kattintani
egy elgépelés javításához — ott a teljes kijelölés többet ártana, mint
használna, mert az első leütés törölné az egész szöveget. Elvetett
alternatíva: mindkét mezőtípusra kiterjeszteni (az eredeti doctor-review
jelentés mindkettőt megemlítette) — elvetve, mert a szövegmezőknél ez
rontana a megszokott szövegszerkesztési viselkedésen, miközben a
backlog-tétel címe és szövege is kifejezetten a "Számmezőkre" szól.

### 2. A viselkedés feltétel nélküli, minden példányon

A teljes-tartalom-kijelölés fókuszáláskor a `NumberField` MINDEN mai
hívóján egységesen, feltétel nélkül működik — nincs hozzá új opcionális
prop, amivel egy hívó kikapcsolhatná.

**Miért:** a `NumberField` minden mai hívója (árlista fix/sávos ár,
Tömeges árváltoztatás százaléka, sor darabszám/egységár, Előleg, Egyedi
végösszeg) szám-jellegű, rövid, egyben lecserélendő értéket tart, ahol a
teljes kijelölés mindig hasznos — nincs ismert eset, ahol ez károsan
hatna. Elvetett alternatíva: opcionális prop, alapértelmezésben
bekapcsolva — elvetve, mert extra API-felületet vezetne be egy ma nem
létező igényhez, feleslegesen bonyolítva a komponens felületét.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `BufferedTextField`/`BufferedTextArea` (név/leírás szövegmezők)
  hasonló viselkedése** — kizárva (lásd 1. döntés).
- **Az árlista árainak felső korlátja/elgépelés-védelme** (extra nulla
  szokatlanul nagy árváltozásnál) — ez a `backlog/BACKLOG.md` 96. tétele,
  önálló hatókörrel és már meglévő tervdokumentummal; a két tétel EGYÜTT
  ad teljesebb védelmet elgépelés ellen, de egymástól függetlenül
  megvalósíthatók.
- **A terv szerkesztő Összeg oszlopának élő frissítése gépelés közben**
  (a `LineRow.tsx` Összeg cellája ma nem követi az `onDraftChange`
  élő piszkozatot) — ez a `backlog/BACKLOG.md` 108. tétele, önálló
  hatókörrel; a jelen tétel a fókuszáláskori KIJELÖLÉST hozza be, nem a
  gépelés KÖZBENI megjelenítést.
- **A `NumberField` commit-on-blur mechanizmusa** (a fájl fejléc-
  kommentjében dokumentált P0-4/P0-5/P1-4 javítások) — VÁLTOZATLAN marad;
  ez a tétel kizárólag a fókusz-eseményt egészíti ki, a piszkozat/commit
  logikát nem érinti.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/NumberField.tsx` — a fókusz-esemény kiegészítése a
  teljes tartalom kijelölésével; a mai `onFocus={() => setFocused(true)}`
  melletti, azzal egyidejű viselkedés.
- Minden hívó (`pages/priceListAdmin/ItemEditor.tsx`,
  `pages/priceListAdmin/TomegesArDialog.tsx`, `pages/planEditor/
  LineRow.tsx` darabszám és egységár mező, `pages/planEditor/
  ElolegBlokk.tsx`, `pages/planEditor/EgyediVegosszegBlokk.tsx`) a
  viselkedést a közös komponensből automatikusan örökli, hívónkénti
  módosítás nélkül.
- `app/src/components/NumberField.test.tsx` — a meglévő tesztkészlet
  (commit-on-blur, P0-4, P0-5, Escape, stepper, EUR-egység stb.) mind
  változatlanul kell maradjon zöld; a fókusz-kijelölés egy ÚJ, hozzáadott
  eset lesz, nem a meglévők módosítása.

## Tesztelés (irányadó, nem kimerítő)

- Egy meglévő, nem üres értékű `NumberField`-re kattintva (vagy Tabbal
  ráérkezve, vagy `autoFocus`-szal mountolva) a teljes tartalom
  kijelölt állapotban van, mielőtt a doki gépelni kezdene.
- A kijelölt tartalomra azonnal gépelve a régi érték TELJESEN
  lecserélődik, nem összefűződik (`24000` mezőbe kattintva és `28000`-et
  gépelve a mező `28000`-et mutat, nem `2400028000`-et).
- Az `autoFocus`-szal mountolódó mezőknél (árlista fix ár első
  aktiválása, Előleg, Egyedi végösszeg) ugyanez már az ELSŐ, mountoláskori
  fókuszálásnál is igaz.
- A meglévő viselkedés (commit-on-blur, Enter, Escape, ArrowUp/Down
  lépés, EUR-egység megjelenítés, `min` alatti érték visszaállása, üres
  mező nullára esésének tiltása) egyike sem változik.
- Egy üres `NumberField`-re fókuszálva nincs látható hatás (nincs mit
  kijelölni).
