# Backlog 9. tétel — Előleg-sor a nyomtatványon — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 9. tételének ("Előleg-sor a
nyomtatványon") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Fogtechnikai munkát tartalmazó kezelésnél a fizetési feltételek szövege
(`sablonok/fizetesi-feltetelek-hu-v1.md`) kimondja, hogy a kezelési összeg
50%-a fizetendő a munka megkezdésekor — de ezt a forintösszeget sehol nem
számolja ki az app. A doki ma fejben osztja ki, és kézzel írja a papír
aljára (`docs/08-backlog.md` Függelék B) napja). Nem minden terv
tartalmaz fogtechnikai munkát (pl. rutin tömés nem, egy All-on-4 igen), és
az árlista/kategória adatban ma nincs erre jelölő — ez tudatosan doki
által eldöntött, nem az adatból származtatott állapot.

## Döntések

### 1. Egyetlen új mező, kapcsoló-vezérelve

`Plan.elolegSzazalek: number | null` — egyetlen opcionális mező, nincs
`schemaVersion` emelés (a backlog mérete is ezt írja elő). `null` = a
szerkesztő kapcsolója ki van kapcsolva, nincs előleg-sor sehol a
nyomtatványon. A szerkesztőben egy explicit kapcsoló ("Ez a terv
fogtechnikai munkát tartalmaz — előleg feltüntetése") vezérli: bekapcsolva
a mező `50`-re áll (előre kitöltött, szerkeszthető, 0–100 közé szorítva),
kikapcsolva visszaáll `null`-ra.

**Miért:** a backlog explicit "opcionális mező" (egyes szám) mérete ezt
sugallja. Egy külön boolean + szám mezőpár helyett egy nullázható szám
mind az adatot, mind a kapcsoló állapotát hordozza — nincs két mező, ami
egymással inkonzisztens állapotba kerülhetne (pl. kapcsoló be, de a szám
mégis `null`).

**Miért nem fix összeg:** a fizetési feltételek sablonszövege ma is
százalékban fogalmaz ("a kezelési összeg 50%-a") — egy százalék mező
illeszkedik ehhez a nyelvhez, és automatikusan követi, ha a terv sorai
menet közben változnak. Fix forint/euró összeg elszakadna ettől, és
minden tervnél kézi újraszámolást igényelne, ha a végösszeg változik.

**Miért nem implicit (üres/0 mező = nincs sor):** a "kitöltetlen" és a
"tudatosan 0%" állapot enélkül megkülönböztethetetlen lenne — az explicit
kapcsoló egyértelművé teszi a doki szándékát, hasonlóan ahhoz, ahogy a
`savos` jelölő is explicit kapcsoló, nem egy szám-mező mellékhatása.

### 2. Számítási alap: `Fizetendő`, nem `Kezelések összesen`

Az előleg a **tényleges** (kedvezménnyel csökkentett) `Fizetendő`
összegből számol, nem a lista áras `Kezelések összesen`-ből. A számítás
élőben, a `fazisok`-ból történik — ugyanúgy, ahogy a `TervDocument.tsx`
ma is élőben számolja a `grand` értéket (`fazisOsszeg` összegzése), **nem**
a mentett `plan.osszesitok.fizetendo`-ból olvasva.

**Miért `Fizetendő`:** D9 szerint a kedvezmény a nyomtatványon nem
látszik, csak a tényleges végösszeg — az előlegnek ehhez a ténylegesen
fizetendő számhoz kell igazodnia, különben magasabb előleget mutatna, mint
amennyit a páciens ténylegesen fizet majd összesen.

**Miért élő számítás, nem a mentett `osszesitok`:** ez konzisztens a
meglévő mintával — a page 1 `Kezelések összesen`/`Fizetendő` sorok is
élőben számolnak a `fazisok`-ból, nem a mentett `osszesitok`-ból
olvasnak (az csak véglegesítéskor íródik ki, összehasonlításra). Nincs
szükség új mezőre az `Osszesitok` típuson — az előleg-összeg
determinisztikusan reprodukálható a perzisztált `elolegSzazalek` és a
perzisztált sorok/árak alapján, amíg a verziómappa nem íródik felül (D4),
tehát ez nem sérti a "mentett tervet nem rajzoljuk újra" (D7) elvet.

### 3. Kerekítés

`Math.round(elolegSzazalek / 100 * fizetendő)` — legközelebbi egész
pénznemegységre (HUF: forint, EUR: cent) kerekítve, sztenderd matematikai
kerekítéssel.

**Miért:** a pénznemek már ma is egész egységben tárolódnak (D-szabály),
a `Math.round` a legegyszerűbb, szabvány megoldás; az 1 egységnyi
elmozdulás bármelyik irányban elhanyagolható egy szerződéses összeghez
képest.

### 4. Elhelyezés a szerkesztőben

A kapcsoló és a százalék mező a Terv szerkesztő alján, a meglévő
`Summary` ("Mindösszesen") blokk mellett/mögött jelenik meg
(`PlanEditorPage.tsx`, kb. 336–343. sor).

**Miért:** ez az a pillanat, amikor a doki amúgy is a végösszeget nézi —
az előleg pont ebből számol, természetes egymás mellett mutatni őket. A
Páciens adatlap (2. képernyő) ekkor még nem ismeri a végösszeget, ott a
doki csak százalékban látná, forintban nem.

### 5. Megjelenés az 1. oldal összegzésében — két új sor

A `Kezelések összesen` / `Fizetendő` alatt két új sor:

```
Kezelések összesen                820 000 Ft
──────────────────────────────────────────── (1.5px, #976445)
Fizetendő                         780 000 Ft
Előleg (50%)                      390 000 Ft
Fennmaradó rész                   390 000 Ft
```

Csak akkor jelenik meg mindkét sor, ha `plan.elolegSzazalek != null`. Ha
`null` (a kapcsoló ki van kapcsolva ezen a terven), a blokk pontosan úgy
néz ki, mint ma — nincs új sor.

**Miért két sor, nem csak Előleg:** a doki mindkét számot egy pillantással
lássa, ne kelljen fejben kivonnia a Fizetendőből — ez pontosan a Függelék
B) napi panasz ("fejben osztja ki és kézzel írja a papír aljára")
közvetlen megoldása.

### 6. Megjelenés a 2. oldal fizetési feltételek szövegében — csak a százalék, forintösszeg NEM

A sablonszöveg ma szó szerint fix "50%-ot" mond ("a kezelési összeg
50%-a fizetendő a munka megkezdésekor"). Ez egy új `{{elolegSzazalek}}`
helyettesítőt kap (a `{{orvos}}`-hoz hasonló mechanizmussal,
`fillPlaceholders`), így ha a doki eltér 50%-tól, a szöveg és az 1. oldal
sora nem mond ellent egymásnak. **A helyettesítő mindig felold egy
értékre** — bekapcsolt kapcsolónál a doki által megadott százalékra,
kikapcsolt kapcsolónál `50`-re (visszaesve a mai, statikus szöveg
tartalmára) — így nincs szükség feltételes sablon-blokkra, marad a
`{{token}}` → érték egyszerű string-helyettesítés.

**A konkrét forintösszeg NEM kerül bele ebbe a mondatba.** A mai
sablonszövegben nincs is forintösszeg ("...50%-a fizetendő...", nincs
zárójeles összeg) — ha a `{{elolegOsszeg}}` helyettesítőt közvetlenül a
mondatba ágyaznánk, kikapcsolt kapcsolónál nem lenne értelmes érték, amire
visszaessen (nulla vagy hiányzó pénzösszeg zárójelben törött
mondatszerkezetet adna), ez pedig feltételes sablon-blokkot igényelne —
túllépné a tétel "fél napos, 20%-os" méretét. A konkrét forintösszeget
kizárólag az 1. oldal két új sora mutatja (5. döntés) — ez már önmagában
megoldja a "fejben számolás" problémát.

A "A fennmaradó rész a munka átadásakor fizetendő" mondat **változatlan,
szöveges marad**, nem kap saját helyettesítőt.

**Miért:** a legkisebb beavatkozás a meglévő `{{orvos}}` mintához képest,
és a valódi fájdalompont (a doki fejben számolt forintösszege) az 1.
oldalon már megoldódik — a 2. oldal jogi szövegének csak numerikusan
konzisztensnek kell maradnia a százalékkal, nem kell saját összeget
mutatnia.

### 7. Kapcsoló KI állapot — a sablonszöveg statikus marad

Ha `plan.elolegSzazalek === null` (a doki nem jelölte, hogy ezen a
tervben van fogtechnikai munka), a fizetési feltételek "fogtechnikai
munkánál 50%..." bekezdése **pontosan úgy nyomtat, mint ma** — a
`{{elolegSzazalek}}` az 50 alapértékre esik vissza (6. döntés), a mondat
tehát szó szerint azonos a mai statikus szöveggel. Nincs feltételes
blokk-elrejtés, a bekezdés minden tervnél megjelenik, mint általános jogi
tájékoztatás arra az esetre, ha mégis lenne fogtechnikai rész.

**Miért:** a bekezdés törlése/feltételes elrejtése a sablon-mechanizmus
nagyobb átalakítását igényelné (feltételes blokk, nem csak
szöveghelyettesítés), ami túllépi a tétel méretét — a jelenlegi, minden
tervre azonos szöveg már ma is így működik, ezt nem kell megbontani.

### 8. Becslés (SAVOS/csillagos) jelzés az Előleg/Fennmaradó soron

Ha a tervben van legalább egy SAVOS (csillagos, becsült árú) tétel
(`hasRange`, `TervDocument.tsx` már számolja), **mindkét** új sor
(`Előleg` és `Fennmaradó rész`) csillagot kap — nem csak az Előleg.
A meglévő lábjegyzet szövege (`savosFootnote`, `pdf/labels.ts`) bővül,
hogy ezt is lefedje, **nem** kap külön második lábjegyzet-mondatot.

**Miért mindkét sor:** mindkettő ugyanabból a becsült `Fizetendő`-ből
számol — csak az Előleget jelölni félrevezető lenne, mert a Fennmaradó
rész pontosan ugyanannyira bizonytalan.

**Miért egy lábjegyzet, bővített szöveggel:** két különböző jelentésű
csillag ugyanazon az oldalon összetéveszthető lenne. A meglévő mondat
("A csillaggal jelölt tételek ára a kezelés során derül ki véglegesen, a
megadott ár becslés.") szövege bővül úgy, hogy a belőle számított
összegeket (Fizetendő, Előleg, Fennmaradó rész) is lefedje — mindkét
nyelven (`pdf/labels.ts` `savosFootnote` hu/de).

**Megjegyzés — miért nincs a mai `Fizetendő` soron csillag:** a mai
`Fizetendő` sor sem kap külön csillagot, pedig ma is tartalmazhat SAVOS
tételt — ez a tétel nem vezet be új viselkedést a `Fizetendő` sorra, csak
az újonnan bevezetett Előleg/Fennmaradó sorokra.

### 9. Százalék mező korlátja

A szerkesztő 0–100 közé szorítja az `elolegSzazalek` értéket.

**Miért:** az előleg fogalmilag nem lehet negatív vagy nagyobb, mint a
teljes összeg — ez egy egyszerű, kliensoldali korlát, nem üzleti logika.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Fix összegű előleg-bevitel** (a százalék mellett/helyett) — nem merült
  fel igényként, a sablonszöveg is százalékban fogalmaz.
- **Teljes fizetési ütemterv** (több részletre bontás, dátumokkal) — a
  backlog explicit kizárja, ez már maga a 20%-os verzió egy nagyobb
  funkcióhoz képest.
- **Automatikus "van-e fogtechnikai munka" detektálás** az árlistából —
  nincs ma ilyen adat egyetlen tételen sem (`kategoriaId` nem hordoz ilyen
  jelölést); a doki explicit kapcsolója helyettesíti.
- **A fizetési feltételek sablon Beállítások-beli szerkesztő UI-ja** — ez a
  backlog 6. tétele ("Sablonszerkesztő bekötése"), ami még nincs
  megépítve. Emiatt a `{{elolegSzazalek}}` helyettesítő bevezetése
  gyakorlatban a `storage/seed/templates.ts` `FIZETESI_FELTETELEK_HU_V1`
  (és a német placeholder) seed-konstans közvetlen szerkesztésével történik,
  nem egy doki által a Beállításokban indított új verziófájllal — ez a
  mockup-fázisban rendben van, mert még senki nem véglegesített terv nem
  hivatkozik saját, testre szabott sablonverzióra ezzel a placeholderrel.
  Amint a 6. tétel elkészül, egy doki a saját tervezetét már a Beállítások
  felületén viheti be, ugyanezzel a token-szintaxissal.
- **`Osszesitok` típus bővítése** egy `elolegOsszeg` mezővel — nem
  szükséges, lásd 2. döntés indoklása.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — `Plan` interfészre új, opcionális
  `elolegSzazalek: number | null` mező (1. döntés).
- `app/src/domain/blankPlan.ts` — `createBlankPlan()` új tervnél
  `elolegSzazalek: null`-lal indul.
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas()` — ki kell
  egészíteni: egy bekapcsolt kapcsoló (`elolegSzazalek !== null`) is
  "tartalmas" piszkozatnak számítson, ugyanúgy, mint a `sorok` vagy a
  `paciens` mezők — anélkül egy önmagában bekapcsolt kapcsoló, kitöltetlen
  páciensadatok mellett, nem indítaná el a piszkozat-mentést.
- `app/src/domain/totals.ts` — új, kis pure function az előleg/fennmaradó
  összeg számítására (2–3. döntés), a meglévő `fazisOsszeg`/
  `fazisListaOsszeg` mintájára, hogy a `PlanEditorPage.tsx` és a
  `TervDocument.tsx` ugyanazt a függvényt hívja, ne duplikálja a
  kerekítési logikát.
- `app/src/pages/PlanEditorPage.tsx` — kapcsoló + százalék mező a
  `Summary` komponens mellett (4. döntés, kb. 336–343. és 728–761. sor).
- `app/src/pdf/TervDocument.tsx` — két új sor az 1. oldal összegzés
  blokkjában (kb. 391–406. sor, 5. döntés), a `placeholderValues` objektum
  bővítése `elolegSzazalek`-kel (kb. 356. sor, 6–7. döntés), a `hasRange`
  alapján csillag hozzáadása az új sorokhoz (8. döntés).
- `app/src/pdf/labels.ts` — új `PdfLabels` mezők: az `Előleg (X%)` sor
  felirata (ragozás miatt függvény, az `ervenyessegMondat` mintájára, nem
  fix string), a `Fennmaradó rész` fix felirat, és a `savosFootnote` szöveg
  bővítése mindkét nyelven (8. döntés). JOGI SZÖVEG jelöléssel, mint a
  többi lektorálandó mondat.
- `app/src/storage/seed/templates.ts` — `FIZETESI_FELTETELEK_HU_V1` (és a
  német placeholder) "50%-a" szövegrészének cseréje `{{elolegSzazalek}}%-a`
  formára (6. döntés, lásd a fenti "Kapcsolódó, NEM tartozó" megjegyzést a
  verziózásról).
- `app/src/domain/validate.ts` `assertPlanShape` — nincs szükséges
  változás: az új mező opcionális, egy régi `terv.json` (mező nélkül)
  `undefined`-ként olvasódik, amit a kódnak `null`-lal egyenértékűként kell
  kezelnie (visszafelé kompatibilitás).

## Tesztelés

Egységteszt kell:

- Az előleg/fennmaradó összeg számító függvényére (`domain/totals.ts`):
  kerekítés helyessége, 0%-nál és 100%-nál a szélsőértékek, `null`
  esetén a hívó ne is hívja meg (vagy a függvény ne kapjon `null`-t).
- `piszkozatTartalmas()`-ra: bekapcsolt kapcsoló (nem-`null`
  `elolegSzazalek`) önmagában is "tartalmasnak" számítson, még akkor is,
  ha minden más mező üres/alapérték.
- A sablonszöveg helyettesítésére: `elolegSzazalek` helyettesítő
  bekapcsolt kapcsolónál a doki által megadott értéket, kikapcsoltnál
  `50`-et ad vissza (7. döntés).
- A PDF-generálásra (ha van erre már mintakód a repóban, pl. snapshot
  vagy szöveg-alapú teszt): az Előleg/Fennmaradó sorok csak akkor
  jelennek meg, ha `elolegSzazalek != null`; csillagot csak akkor kapnak,
  ha van SAVOS tétel a tervben.