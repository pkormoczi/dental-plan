# Backlog 3b. — Nyelváltás megőrzi a kézzel szerkesztett tételneveket — döntési összefoglaló

Ez a fájl a `docs/archive/backlog/backlog-3-sornev-egyedi-sor-terv.md` (sornév szerkeszthetővé
tétele + egyedi sor) implementálása közben felmerült utókövetkezmény
megbeszélt megvalósítási döntéseit rögzíti, implementáció-indításhoz. Nem
tartalmaz kódot vagy függvényszignatúrákat — az implementáció módja és a
részletek kidolgozása a megvalósító feladata.

## Probléma

A `PatientPage.tsx` `applyNyelv()` (60-73. sor) nyelvváltáskor minden
`tetelId`-hez kötött soron **feltétel nélkül** felülírja a `nevSnapshot`-ot
az árlista *jelenlegi* nevéből az *új* nyelven. A 3. tétel (sornév-
szerkeszthetőség) előtt ez ártalmatlan volt — a `nevSnapshot` úgysem
térhetett el az árlistai névtől, mert nem volt szerkeszthető. A 3. tétel
óta a doki kézzel pontosíthatja a sor nevét (2. döntés,
`docs/archive/backlog/backlog-3-sornev-egyedi-sor-terv.md`); egy ilyen pontosítást a mai `applyNyelv` szó
nélkül felülír, ha a doki a névszerkesztés UTÁN vált nyelvet a Páciens
adatlapon.

A meglévő megerősítő `AlertDialog` (274-299. sor) ma is figyelmeztet:
*„A tervben már N tétel szerepel. A nyelv váltásakor a tételnevek újra
rögzülnek az új nyelven. Folytatod?"* — ez a mondat ma minden névre igaz
állítás lenne, ha a felülírás megmaradna, de nem mondja ki, hogy egy
kézzel írt pontosítás is elveszik.

Az egyedi (`tetelId` üres) sorokat az `applyNyelv` már ma sem érinti (a
belső `if (tetel)` őr miatt) — ez a tétel csak az árlistai tételhez kötött,
de névben pontosított sorokra vonatkozik.

## Döntések

### 1. A megőrzés alapelve — mag-összehasonlítás, új mező nélkül

A `docs/archive/backlog/backlog-3-sornev-egyedi-sor-terv.md` kifejezett döntése volt, hogy
nem vezetünk be új mezőt a `Sor`-on. Ezt itt is tartjuk: nincs explicit
„szerkesztve" jelző. Helyette egy összehasonlítás dönti el, hogy egy
`tetelId`-hez kötött sor neve *még mindig* az árlistai automatikus nevet
viseli-e egy adott nyelven: **`sor.nevSnapshot === tetel.nev[nyelv]`**
(vagyis a tétel `hu`/`de` mezőjének nyers értéke azon a nyelven — nem a
`resolveNev` hu-visszaesős eredménye). Ha a tételnek nincs neve azon a
nyelven (`null`), az sosem számít „egyezőnek".

**Miért:** ez a primitív két, korábban külön kezelt kérdésre is választ ad
egyetlen összehasonlítással: (a) van-e egyáltalán fordítás, (b) ha van, a
sor azt használja-e még. Nincs szükség új sémamezőre, mert a döntés minden
pillanatban újraszámolható a `Sor` és a `PriceList` jelenlegi tartalmából.

### 2. `sorFallback` általánosítása — ok is kell, nem csak boolean

A `sorFallback` (`domain/nev.ts`, a 3. tételben bevezetve) ma egy előre
kiszámolt `deNelkuliTetelIds` halmazzal dolgozik („van-e egyáltalán
fordítás"). Mostantól soronként a tényleges árlistai nevet kell ismernie
(1. döntés), ezért a paramétere egy tétel-id → `Tetel` lookupra vált.
Emellett a visszatérési értéknek **meg kell különböztetnie a két okot**
(lásd 3. döntés): „nincs fordítás" vs. „van fordítás, de a sor mást mond".

**Miért:** a 3. döntés (külön jelvény a két esetre) ezt a megkülönböztetést
igényli — egy sima boolean nem elég. A `fallbackSorok` (ugyanitt) és a
`PreviewPage` véglegesítés-őre is ezt az általánosított függvényt hívja,
nincs második, párhuzamos implementáció.

### 3. Két külön jelvény a szerkesztőben

A meglévő `HU` jelvény (amber, `HuChip`) **változatlan marad** a „nincs
fordítás" esetre. Egy **új, „átírt" feliratú jelvény** (ugyanaz az amber
szín, csak más szöveg) jelzi a „van fordítás, de a sor neve eltér tőle"
esetet. Csak `tetelId`-hez kötött soron jelenhet meg — egyedi (`tetelId`
üres) soron nincs mihez viszonyítani, azok változatlanul csak a meglévő
`HU` jelvényt kaphatják, ha van nevük (3. tétel, 8. döntés, változatlan).

**Miért:** a két ok különböző dokitennivalót jelent (pótolni kellene egy
hiányzó fordítást, vs. tudatosan eltérő szöveg, aminek talán semmi baja),
ezért vizuálisan is külön kell választani őket, ne egy jelvény mögé bújjon
két különböző jelentés.

### 4. Bekapcsolódik a véglegesítés megerősítő láncába

Az „átírt" eset ugyanúgy részt vesz a `PreviewPage` `confirmStep`
láncában, mint a meglévő „hiányzó német tételnevek" dialógus — nem marad
csak szerkesztőn belüli kozmetika. A dialógus **két külön felsorolást**
mutat a mai egyetlen lista helyett: „N tételnek nincs német neve" / „M sor
neve eltér az árlistától (kézzel szerkesztve)".

**Miért:** konzisztencia a 3. tétel 8. döntésével (az egyedi sor is
bekerül ugyanide) — a doki véglegesítés előtt lássa, mely sorok kerülnek
nem a várt nyelven a dokumentumra, ne csak a szerkesztőben, séta közben
vegye észre.

### 5. Nyelvenkénti szabály — csak `de` terven jelez, `hu`-n sosem

A `nyelv === 'hu'` eset továbbra is mindig `false`-t ad (a mai `sorFallback`
első ága változatlan). Egy hu tervnél a névpontosítás (3. tétel 2. döntése)
alapból nem jár figyelmeztetéssel — ha ezt a szabályt itt megtörnénk, egy
teljesen hétköznapi hu-terven történő névjavítás is jelvényt kapna, ami
ellentmondana annak, hogy a 3. tétel ezt szándékosan zajmentesnek szánta.

**Miért:** D21 szerint a doki mindig magyarul gépel — egy hu tervnél egy
kézzel írt magyar szöveg pontosan azt teszi, amit kell, nincs mit jelezni.
Csak `de` terven jelent problémát egy magyarul (vagy bármi máson) maradt
sor, mert a papíron a némettel keveredne.

### 6. `applyNyelv` — csak az „egyező" sorok frissülnek

Nyelvváltáskor egy `tetelId`-hez kötött sor neve csak akkor íródik felül
az új nyelv szerinti árlistai névre, ha a *jelenlegi* (váltás előtti)
nyelven még mindig egyezik az árlistai névvel (1. döntés mag-
összehasonlítása, a RÉGI nyelvvel). Ha eltér (a doki átírta, vagy az
árlistai név időközben megváltozott alatta), a sor neve **változatlan
marad** az új nyelv beállítása után is — ilyenkor pontosan ez teszi
indokolttá a 3. döntés „átírt" jelvényét az új nyelven.

**Miért:** ez a döntés 1-2-3-4-5 közvetlen következménye — az `applyNyelv`
és a szerkesztő jelvénye ugyanazt a mag-összehasonlítást használja, csak
más nyelv-paraméterrel (a váltás pillanatában a régivel, utána folyamatosan
az aktuálissal).

### 7. Élő számlálás a megerősítő dialógusban

A `PatientPage` nyelvváltás-megerősítő `AlertDialog`-ja (274-299. sor)
előre kiszámolja és kiírja, hány `tetelId`-hez kötött sor frissül, és hány
marad változatlan (átírt névvel): *„N sorból M frissül az új nyelvre, K
átírt név változatlan marad."* Az egyedi sorok nem részei ennek a
számlálásnak (őket a nyelvváltás sosem érintette).

**Miért:** a doki a „Folytatás" gomb megnyomása ELŐTT lássa a tényleges
hatást, ne csak egy általános figyelmeztető mondatot — ez közvetlenül a
felmerült probléma (néma felülírás) ellen dolgozik.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **`applyPenznem` (pénznemváltás)** — érintetlen: pénznemváltáskor a
  sorok teljes egészében törlődnek (nem „áthidalódnak"), ott nincs
  névmegőrzési kérdés.
- **`lefedettseg()` (`domain/coverage.ts`)** — a Páciens adatlap amber
  figyelmeztetése az árlista egészének fordítás-készültségéről szól,
  független ettől a tételtől, nem módosul.
- **A 4. backlog-tétel (soronkénti „becsült ár" kapcsoló)** — nincs
  kapcsolat.
- **`schemaVersion` emelés** — nem szükséges, nincs új mező.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/nev.ts` — `sorFallback` szignatúra- és logikaváltása (2.
  döntés), a mag-összehasonlítás (1. döntés) kiemelése újrahasználható
  segédfüggvénybe, amit az `applyNyelv` (6. döntés) és a `PatientPage`
  élő számlálása (7. döntés) is hív.
- `app/src/domain/nev.test.ts` — a `sorFallback` tesztjeinek átírása az
  új szignatúrára, plusz a két-ok megkülönböztetés tesztje.
- `app/src/pages/PlanEditorPage.tsx` — a `fallbackTetelIds` halmaz helyett
  egy tétel-lookup épül; a `LineRow` a két jelvényt (HU / átírt) a
  `sorFallback` visszaadott okától függően rendereli.
- `app/src/pages/PatientPage.tsx` — `applyNyelv` (6. döntés), az
  `AlertDialog` szövege és az élő számlálás (7. döntés).
- `app/src/pages/PatientPage.test.tsx` — új tesztek a megőrzésre és a
  dialógus számlálására.
- `app/src/pages/PreviewPage.tsx` — a `confirmStep` „de-fallback-names"
  ágának szövege két listára bontva (4. döntés).
- `app/src/pages/PreviewPage.test.tsx` — szükség esetén kiegészítés.
- `CLAUDE.md` — a `sorFallback` „ne írd újra" bejegyzésének frissítése az
  új szignatúrára és a két-ok megkülönböztetésre.
- `docs/08-backlog.md` — új tétel a MOST listában (15.), a 3. tételre
  hivatkozva mint felfedezés forrására.
- `CHANGELOG.md` — bejegyzés a mai nap alá.

## Tesztelés

- `sorFallback`: hu terven mindig `false`; de terven — nincs fordítás →
  „hiányzik" ok; van fordítás és a sor egyezik vele → `false`; van
  fordítás, de a sor mást mond → „eltér" ok; ismeretlen `tetelId` →
  `false` (változatlan); üres `tetelId`, kitöltött/üres név (változatlan,
  3. tétel).
- `applyNyelv`: egyező nevű sor frissül az új nyelvre; eltérő (átírt)
  nevű sor változatlan marad nyelvváltás után is; egyedi sor érintetlen
  (változatlan teszt).
- `PatientPage` dialógus: a számlálás helyesen tükrözi a
  frissül/változatlan bontást egy kevert (néhány szerkesztett, néhány
  eredeti nevű) terven.
- `PlanEditorPage` `LineRow`: „átírt" jelvény megjelenik a megfelelő
  soron, a `HU` jelvény a másikon, a kettő nem keveredik egy soron.
- `PreviewPage`: a véglegesítés megerősítő dialógusa a két okot külön
  sorolja fel egy kevert terven.
