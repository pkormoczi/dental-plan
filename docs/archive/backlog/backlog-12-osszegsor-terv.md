# Backlog 12. tétel — Döntés: kettős összegsor (Kezelések összesen / Fizetendő)
marad-e — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 12. tételének ("Döntés: kettős összegsor
marad-e") megbeszélt megvalósítási döntéseit rögzíti, implementáció-
indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat — az
implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A nyomtatvány plan-szintű összegzés blokkja (`pdf/TervDocument.tsx:391-406`)
ma feltétel nélkül két sort ír ki: `L.kezelesekOsszesen` (`listTotal`,
a sorok `listaEgysegar × mennyiseg` összege, `:350`) és `L.fizetendo`
(`grand`, a sorok `tenylegesEgysegar × mennyiseg` összege, `:349`). Ha
egyetlen soron sincs eltérés a listaár és a tényleges ár között —
tipikusan amikor a doki nem adott kedvezményt —, a két szám azonos, és
a nyomtatvány ugyanazt az összeget írja ki egymás alá kétszer.

Ez feszíti a D9 szándékát (a kedvezmény ne látsszon a nyomtatványon):
kedvezmény nélkül a két sor nem hordoz extra információt, csak zavaró
duplikáció. A szerkesztő (`PlanEditorPage.tsx` `Summary`, `:737-770`) ma
már megoldja ugyanezt a problémát a saját "Mindösszesen" dobozában: egy
bold végösszeget mutat mindig, és csak akkor ír ki egy kisebb
"Kedvezmény: X" alszöveget, ha `listTotal > grand` (`discount > 0`,
`:746,761-766`). A nyomtatvány ezt a mintát ma nem követi.

Kutatás közben előkerült egy a backlog szövegében nem említett eset is:
a "Tényleges ár" mezőnek (`PlanEditorPage.tsx:702-714`, `NumberField
min={0}`) nincs felső korlátja — egy soron a tényleges ár a listaár
**fölé** is emelhető (`grand > listTotal`, felár). A szerkesztő mai
`discount`-számítása (`listTotal - grand`, csak pozitív ág) ezt az
esetet némán elnyeli: se a "Kedvezmény" alszöveg, se semmi más nem jelzi.

## Döntések

### 1. A nyomtatvány feltételesen egy vagy két sort mutat

A két sor (`Kezelések összesen` + elválasztó + `Fizetendő`) csak akkor
jelenik meg, ha van tényleges eltérés a `listTotal` és a `grand` között.
Ha a kettő egyezik, a blokk **csak** a `Fizetendő` sort mutatja, a mai
`s.summaryTotalLabel`/`s.summaryTotalValue` stílusban — a felette lévő
muted sor és az `s.summaryDivider` (`:131`) is kimarad.

**Miért:** ez a backlog saját kerete ("bináris döntés, mindkét irányban
egyformán olcsó") — a doki a duplikációt zavarónak, nem eladási
eszköznek ítélte. A feltétel a szerkesztő már bevált mintáját (`discount
> 0` → extra sor) viszi át a nyomtatványra, csak general­izálva mindkét
eltérés-irányra (lásd 2. döntés).

### 2. Az eltérés iránya nem számít — felár ugyanúgy két sort nyit, mint kedvezmény

A feltétel `grand !== listTotal` (nem csak `grand < listTotal`). Ha a
tényleges ár összege a listaár összege **fölé** emelkedik (felár egy
vagy több soron), a nyomtatvány ugyanúgy mindkét sort mutatja, a
`Kezelések összesen` referenciaárral együtt — nincs külön "felár" felirat
vagy eltérő megfogalmazás, a két szám önmagáért beszél.

**Miért:** konzisztencia — nem indokolt két külön ágat tartani (egyik
elrejt egy referenciaárat, másik mutatja) attól függően, hogy a doki
melyik irányba tért el. A `Kezelések összesen` sor mindkét esetben azonos
információs szerepet tölt be: "ebből indultunk".

### 3. Egysoros állapot: nincs új felirat, nincs séma-/label-bővítés

A megmaradó egyetlen sor felirata változatlanul `L.fizetendo`
(`pdf/labels.ts:42,81,119`), a mai kiemelt stílusban. Nem vezetünk be
külön "semleges" feliratot (pl. "Összesen") az egysoros állapotra.

**Miért:** a "Fizetendő" szó eltérés nélkül is helytálló (a ténylegesen
fizetendő összeget jelöli), és ez a legkisebb változtatás — nincs új
`pdfLabels()` kulcs egyik nyelven sem.

### 4. A szerkesztő "Mindösszesen" doboza is jelezze a felárat

A `Summary` komponens (`PlanEditorPage.tsx:737-770`) ma csak a
`discount > 0` esetet jelzi. Ezt kiegészítjük egy tükör-ággal: ha
`grand > listTotal`, egy "Felár: X" alszöveg jelenik meg a mai
"Kedvezmény: X" helyén (a kettő kizárja egymást, sosem fut egyszerre,
mert `listTotal` és `grand` közül csak az egyik lehet nagyobb). A felár-
alszöveg **ugyanazt a színt** kapja, mint ma a kedvezmény (`t.ok`, zöld,
`:763`) — nem kap saját figyelmeztető színt.

**Miért:** a nyomtatvány mostantól bármelyik irányú eltérést látható
formában megmutatja (2. döntés) — indokolatlan lenne, ha a doki
szerkesztés közben csak az egyik irányról kapna visszajelzést, a
másikról csak a kész PDF-en szembesülne vele. A megegyező szín tudatos:
ez egy semleges ténymegállapítás (a doki dolgozhat felárral is, pl.
sietős munka), nem hibajelzés — nincs ok a `discount`-tól eltérő
vizuális súlyt adni neki.

### 5. `docs/04-nyomtatvany-spec.md` frissül a feltételes viselkedésre

Az "Összegzés" szakasz (`docs/04-nyomtatvany-spec.md:144-153`) ma egy
fix, mindig-két-soros példát mutat, "Kedvezmény sor nincs (D9)"
megjegyzéssel. Ez kiegészül a feltétel leírásával: mikor egy, mikor két
sor jelenik meg, és hogy az egysoros állapot felirata is `Fizetendő`.

**Miért:** a spec-doku a nyomtatvány tényleges viselkedését dokumentálja
— ha elmarad a frissítés, a doksi és a kód szétválik, ami a projekt
dokumentáció-térképének (CLAUDE.md) alapelvét sérti.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **`osszesitok.kedvezmeny` előjele** — a `computeOsszesitok`
  (`domain/totals.ts:24-32`) `kedvezmeny = kezelesekOsszesen - fizetendo`
  számítása felár esetén negatív lesz. Ellenőrizve: ezt az értéket a
  kódban kizárólag az `osszesitokElter` (`:42-49`) szigorú
  egyenlőség-összehasonlítása olvassa (`ujraszamolt.kedvezmeny ===
  mentett.kedvezmeny`), sehol nincs megjelenítve vagy nem-negatívnak
  feltételezve — nincs itt teendő, a séma és a meglévő logika változatlan
  marad.
- **Sor-szintű kedvezmény-badge (`LineRow`, `discount` %)** — a
  `PlanEditorPage.tsx:578-584` soronkénti, %-os kedvezmény-jelzése a 4.
  backlog-tételhez (csillag-kapcsoló) kapcsolódó, korábban lezárt terület;
  ez a tétel nem nyúl hozzá, csak a plan-szintű (fázisok összesített)
  dobozokat érinti.
- **`schemaVersion` emelés** — nem szükséges, sem a `Plan.osszesitok`,
  sem a `Sor` séma nem változik, csak a megjelenítési logika.
- **Fázis-szintű összeg (`PhaseTable`, `fazisOsszeg`,
  `pdf/TervDocument.tsx:253`)** — ez ma is csak egyetlen (tényleges)
  összeget ír ki fázisonként, nincs duplikáció, nem érintett.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pdf/TervDocument.tsx`
  - `:391-406` — a `Kezelések összesen` sor + `s.summaryDivider` feltételes
    renderelése (`grand !== listTotal` esetén), a `Fizetendő` sor mindig
    megjelenik.
- `app/src/pages/PlanEditorPage.tsx`
  - `Summary` komponens (`:737-770`) — új felár-ág a mai `discount`
    számítás mellé (pl. `listTotal - grand` és `grand - listTotal` közös
    számításból).
- `app/src/pdf/TervDocument.test.tsx` — új teszt-blokk: nincs eltérés →
  csak egy sor (`Kezelések összesen` szöveg nincs jelen); kedvezmény-irányú
  eltérés → két sor; felár-irányú eltérés → két sor. Az meglévő
  `buildPlan`/`renderDoc` segédfüggvények (`:45-73`) bővíthetők egy második
  soros belépési ponttal, ami eltérő `listaEgysegar`/`tenylegesEgysegar`
  értékeket ad meg.
- `app/src/pages/PlanEditorPage.test.tsx` — a meglévő `:110-137` "shows a
  discount indicator..." teszt mellé egy tükör-teszt: felár esetén
  "Felár: X" szöveg jelenik meg, "Kedvezmény" nem.
- `docs/04-nyomtatvany-spec.md:144-153` — az "Összegzés" szakasz
  kiegészítése a feltételes egy/két-soros viselkedés leírásával.
