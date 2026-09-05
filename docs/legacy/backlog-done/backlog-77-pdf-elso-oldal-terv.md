# Backlog 77. tétel — PDF első oldal: cím + páciensadatok + fogtérkép — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 77. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-071
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D386`–`D399`, `D429`–`D433` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A mai 1. oldal szerkezete: fejléc → páciensadatok (kéthasábos rács,
`Lakcím` teljes szélességben) → fázisok → alul KÉTHASÁBOS sor
(`bottomRow`), bal oldalon a fogtérkép, jobb oldalon az összegzés. A
redesign (D387) más sorrendet ír elő: cím → páciensadatok → fogtérkép →
fázisok, az összegzés pedig a fázisok UTÁN, teljes szélességben (lásd
79. tétel). Emellett három konkrét eltérés van a mai páciensblokk és a
redesign (D431–D433) között:

1. A mai blokk NEM mutat terv-címet — csak a fejléc `docTitle`-ja
   (`Kezelési terv és árajánlat`) áll, ami minden tervre azonos, nem az
   adott terv egyedi címe.
2. A mai oszlopfelosztás (Név|Telefon / Született|E-mail / TAJ|üres /
   Lakcím teljes szélességben) nem a D431 két fix szemantikus
   oszlopát követi.
3. Üres mező ma `—`-t kap (`Kv` komponens `{v || '—'}`), a D389 szerint
   TELJESEN ki kellene maradnia.

## Döntések

### 1. Új `TervDocumentProps` prop a terv-címhez (D386), séma-változás nélkül

A `TervDocument` egy új, kötelező `tervCim: string` propot kap. A
`terv.json` NEM tárolja — az 51. tétel (Terv adatai oldal) döntése
szerint a terv-cím kizárólag a `terv-cimke.json`-ban él
(`megjelenitettTervCim()`, `domain/tervCim.ts`), NEM a `Plan`-en. Egy
`Plan.cim` mező bevezetése két forrást csinálna ugyanabból az adatból,
és ütközne az 51. tétel explicit döntésével.

A `PreviewPage.tsx` adja át a propot: már mentett lánchoz a betöltött
`terv-cimke.json` értékét (`megjelenitettTervCim()`), vadonatúj
(még sosem mentett) lánchoz az 51. tétel lokális UI-state-jét (ami
üresen a `javasoltTervCim()` élő javaslatát mutatja).

**Következmény, C7-tel konzisztensen:** ha a doki később átírja a
címkét (`terv-cimke.json`), egy MÁR MENTETT, korábbi PDF-en a régi cím
marad — ez nem hiba, hanem a mentett PDF történeti forrás jellegéből
(C7/C9, lásd 81. tétel) következik: a PDF a véglegesítés pillanatában
érvényes állapotot fagyasztja be.

Cím + páciensadatok egy `wrap={false}` blokk (D430) — a kettő nem
szakadhat szét oldaltörésnél.

### 2. Sorrend: cím → páciensadatok → fogtérkép → fázisok (D387)

A fogtérkép elhagyja a mai kéthasábos `bottomRow`-t, és a páciensadatok
alá kerül, a fázisok elé. Az Összesítés a fázisok UTÁN, teljes
szélességben követi (lásd 79. tétel, DP-073) — a mai `bottomRow`
kéthasábos elrendezés (fogtérkép + összegzés egymás mellett) teljesen
megszűnik.

### 3. Fogtérkép: mai 240 pt méret, balra igazítva

A rajz mérete és a `renderToothChartPng` szuperszamplingja
VÁLTOZATLAN marad — csak a blokk pozíciója mozdul feljebb, a
páciensadatok alá. A sor jobb fele üresen marad alatta (a fázisok
kezdődnek ott, a rajz alatt/mellett). A jelmagyarázat változatlanul a
rajz ALATT marad (D395, a mai `ToothChartPdf` szerkezete már ezt
adja); cím+rajz+jelmagyarázat egy blokk (D398) — ez a mai
`ToothChartPdf`-fel már eleve teljesül, mert egy `View` fogja össze.
Tooth map atomikus, nem törik (D392) — ez is a mai szerkezet.

**Elvetett alternatíva:** a fogtérkép teljes szélességben, nagyobb
rajzzal. Elvetve, mert a `renderToothChartPng` scale-jének emelése
(élesség megőrzéséhez nagyobb méretnél) és a canvas-alapú méretezés
újrahangolása külön kockázatot vinne be egy amúgy is nagy átalakítású
tételbe; a mai méret megtartása olcsóbb, és a redesign nem ír elő
konkrét pixelméretet a fogtérkép-blokkra.

### 4. Páciensblokk: teljes D431 + D389

Két fix szemantikus oszlop:
- **bal:** Név, Született, TAJ, Lakcím (a `Kv` `full` propja megszűnik
  — a Lakcím a bal oszlop egy sora lesz, nem teljes szélességű sor).
- **jobb:** Telefon, E-mail.

Üres mező TELJESEN kimarad a sorból (D389) — nincs `—` jelzés és nincs
rebalance (D432): egy hiányzó mező helye üresen marad a SAJÁT
oszlopában, a másik oszlop tartalma nem tolódik/nem tölti ki azt a
helyet. Hosszú érték a saját oszlopában wrapol (D433). A teljes
páciensblokk `wrap={false}` (D391).

**Miért nem rebalance:** D432 explicit ezt mondja ki — a fix szemantikus
pozíció (pl. „Telefon mindig a jobb oszlop teteje") fontosabb, mint a
vizuális kitöltöttség; egy dinamikusan újrarendeződő lista
kiszámíthatatlanná tenné, hol keresse a doki az egyes mezőket.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az Összesítés blokk tartalmi/vizuális döntései (cím, feliratcsere,
  három vizuális szint) — 79. tétel (DP-073).
- A fázisok/kezeléstáblák belső szerkezete — 78. tétel (DP-072).
- A blokk-szintű oldaltörés/folytatólagos fejléc mechanizmusa — 76.
  tétel (DP-070), ez a tétel csak az 1. blokk BELSŐ tartalmát rendezi
  át.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx` — `TervDocumentProps` bővítése
  `tervCim`-mel; a `patientGrid`/`Kv` szerkezet átalakítása két fix
  oszlopra, üres mező kihagyásával; a fogtérkép blokk áthelyezése a
  fázisok elé, a `bottomRow` kéthasábos elrendezés megszüntetése.
- `app/src/pages/PreviewPage.tsx` — a `tervCim` prop előállítása és
  átadása (`megjelenitettTervCim()` már mentett lánchoz, az 51. tétel
  lokális state-je vadonatúj lánchoz).
- `docs/04-nyomtatvany-spec.md` „1. oldal" szakasz — a sorrend és a
  páciensblokk-leírás frissítése a tétel lezárásakor (KÉSŐBB, nem
  most).

## Tesztelés (irányadó, nem kimerítő)

- Egy mentett terv-lánc PDF-je a `terv-cimke.json` szerinti címet
  mutatja a páciensadatok fölött; egy vadonatúj, még nem mentett terv
  a `javasoltTervCim()` élő javaslatát.
- A fogtérkép a páciensadatok alatt, a fázisok fölött jelenik meg,
  ugyanabban a méretben, mint korábban.
- Ha egy páciensnek nincs TAJ-száma, a TAJ sor helye teljesen kimarad
  (nincs üres sor, nincs `—`), a bal oszlop többi sora nem tolódik el.
- Egy nagyon hosszú lakcím a bal oszlopban wrapol, nem lóg ki és nem
  tolja el a jobb oszlopot.
- A cím + páciensadatok blokk oldaltörésnél egyben marad (nem szakad
  szét cím és az első páciensmező között).
