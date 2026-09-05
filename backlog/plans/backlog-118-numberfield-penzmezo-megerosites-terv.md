# Backlog 118. tétel — A `NumberField` pénz-mezőinek megerősítése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 118. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A tétel eredetileg egyetlen, bizonytalan megfigyelés kivizsgálásaként
indult (`docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 6.
megállapítás): egy böngésző-automatizálási menetben az Előleg mező (EUR)
egy programozott kitöltés után `300,00 €`-ról `300,01 €`-ra állt a várt
`900,00 €` helyett. A persona kézzel nem tudta reprodukálni.

A tervezés során a `components/NumberField.tsx` átnézése két, egymástól
független dolgot tett világossá.

**1. Egy valódi, kézzel reprodukálható hiba az EUR beviteli módban.** A
`domain/money.ts` `formatCentForInput` a `de-DE` locale szerint formáz,
ami 1000 € fölött ezres pontot tesz a számba (`900000 cent` →
`"9.000,00"`); a párja, a `parseEuroInput` viszont csak a tizedesvesszőt
cseréli pontra, ezért ugyanezt a szöveget `NaN`-ként, azaz `null`-ként
adja vissza. A mező tehát olyan szöveget jelenít meg, amit a saját
parsere nem tud visszaolvasni. A `commit()` `null` esetén némán az
utolsó ismert értékre áll vissza — vagyis egy 1000 € fölötti ár-, előleg-
vagy egyedi végösszeg-mezőbe kurzorral beleszerkesztve (nem a
fókusz-select-all után felülírva) a doki módosítása jelzés nélkül
elveszik. A HUF ág ettől mentes, mert ott a megjelenítés csupasz
`String(value)`. A meglévő vitest-eset 825 €-val fut, ezért ezt a
tartományt nem érintette.

**2. A léptető azonnali, fókusz nélküli commitja egy pénzmezőn.** A ▲/▼
gombpár ~14 px széles, ráúszik az input jobb szélére, `onMouseDown`
preventDefault miatt a mező a kattintástól fókuszt sem kap, a `step()`
pedig azonnal commitál, blur nélkül. Egy elkattintás a mező jobb szélén
így hang nélkül 1 Ft-tal / 1 centtel ír át egy szerződéses összeget, és
az Escape sem vonja vissza (az csak a fókuszált mező piszkozatát állítja
vissza, a már megtörtént commitot nem). Ez a persona által megfigyelt
jelenség ujjlenyomata is: `30000 cent` bázisról egyetlen `step(1)`
pontosan `300,01 €`-t ad.

A tétel emiatt kivizsgálásból javítássá alakult; az eredetileg kért kézi
böngészős újrateszt a záró verifikáció része maradt.

## Döntések

### 1. A tétel hatóköre: javítás + verifikáció, nem puszta kivizsgálás

A 118. tétel a `NumberField` pénz-mezőinek megerősítése lesz: az EUR
round-trip javítása, a visszaállás láthatóvá tétele, a léptetés
korlátozása pénzmezőn, és záró lépésként a kézi böngészős újrateszt. Egy
tétel, egy terv.

**Miért:** a három dolog ugyanazt a komponenst és ugyanazt a
kockázatosztályt érinti (egy szerződéses összeg némán rossz vagy elveszett
értéket vesz fel), a javítások pedig kölcsönösen fedik egymást — a
léptetés korlátozása pont a megfigyelt jelenség teljes támadási felületét
zárja le. Mérlegelve és elvetve: (a) a tétel maradjon tiszta kivizsgálás,
a két talált probléma külön tételt kapjon — ezzel a legkonkrétabb,
legmérhetőbb munka egy „még nem tudjuk, mi volt" jellegű tétel mögé
sorolódna, holott az EUR-hiba már ma bizonyított; (b) csak az EUR-javítás
kerüljön be — a léptető-kockázat pont ugyanabban a komponensben, ugyanazon
a mezőn él, egy második kör fölöslegesen nyitná ki újra.

### 2. Az EUR beviteli mező ezres csoportosítás nélkül jelenít meg

A `formatCentForInput` ne tegyen ezres jelet a beviteli mezőbe: `900000`
cent `"9000,00"` alakban jelenik meg, nem `"9.000,00"`-ként. A
`parseEuroInput` szigorú marad.

**Miért:** így a mező soha nem jelenít meg olyan szöveget, amit a saját
parsere ne tudna visszaolvasni — a hiba nem javítva, hanem megszüntetve
van. Egyben konzisztens is: a HUF ág beviteli megjelenítése már ma is
csupasz (`String(value)` → `"95000"`), a csoportosított alak pedig ott
marad, ahová való — a `formatMoney`/`formatPrice` képernyős és PDF-es
megjelenítésében (`docs/04-nyomtatvany-spec.md`). Mérlegelve és elvetve:
(a) toleráns parser, ami lehagyja az ezres pontot — ez behozna egy
kétértelműséget egy pénzmezőn (a csupasz `"9.000"` 9000 € vagy 9 €?),
ami pont az a hibaosztály, amitől a `unit="EUR"` mód egyáltalán létezik
(P0-5, az „euróban gépelek" tévesztés); (b) a kettő együtt (csupasz
kiírás + toleráns parser a teljes, egyértelmű `"9.000,00"` alakra) —
beillesztett szövegnél segítene, de mivel a mező maga már sosem mutat
csoportosított alakot, ez elméleti eset egy valós kétértelműség-kockázatért
cserébe.

### 3. Az értelmezhetetlen tartalom visszaállása kapjon rövid vizuális jelzést

Ha a `commit()` értelmezhetetlen (vagy `min` alatti) tartalom miatt az
utolsó ismert értékre áll vissza, ez ne némán történjen: a mező adjon
rövid, nem-modális, magától elmúló jelzést. A P0-4 elv változatlan — az
érték soha nem esik 0-ra, és soha nem íródik ki hibás szám.

Ez **minden** `NumberField`-példányra vonatkozik, nem csak a pénzűekre.

**Miért:** a visszaállás ma egy csendes adatvesztés — a doki azt hiszi,
beírta az értéket, közben a régi maradt. Az egységes hatókör mellett szól,
hogy a komponensnek így nem kell két külön visszajelzési módot tartania,
és egy elgépelt darabszám elvesztése ugyanúgy megérdemli a jelzést, mint
egy áré. Mérlegelve és elvetve: (a) marad néma — a 2. döntés után ez
gyakorlatilag csak valódi elgépelésnél fordulna elő, de pont ott a
legfontosabb, hogy a doki tudja, nem az ő értéke van a mezőben; (b) csak
pénzmezőn — a megkülönböztetés a komponensben egy további módot igényelne
anélkül, hogy a nem-pénz mezőkön bármi indokolná a hallgatást.

### 4. A ▲/▼ léptető gombpár eltűnik a pénz-mezőkről

A kattintható léptető a pénzt fogadó mezőkről (kezelési sor ajánlati ára,
előleg, egyedi végösszeg, árlista admin ár-mezői) elmarad. A nem-pénz
mezőkön — a kezelési sor darabszáma, a tömeges árváltoztatás
százalék-mezője — változatlanul megmarad.

**Miért:** a ±1 alapegység (1 Ft, illetve 1 cent) egy ár- vagy
összeg-mezőn soha nem hasznos lépés, a kockázata viszont valós: a ~14 px
széles gombpár ráúszik az input jobb szélére, egy elkattintás fókusz nélkül,
azonnal commitál, és az Escape nem vonja vissza. Ahol a lépés értelmes
(darabszám 1→2→3, százalék), ott ártalmatlan is, mert nem szerződéses
összeget ír. Mérlegelve és elvetve: (a) a gomb adjon fókuszt és csak
blur/Enterre commitáljon — megtartaná a funkciót és visszavonhatóvá tenné,
de a haszontalanul apró célterület és a haszontalan lépésméret is maradna
egy pénzmezőn; (b) a léptető tűnjön el mindenhonnan — a darabszám mezőn
elvenne egy valóban használt kényelmi elemet cserébe semmiért; (c) marad
változatlanul, a kézi újrateszt döntse el — a kockázat a kódból már ma
látszik, nem függ attól, mit produkált az automatizálás.

### 5. Pénz-mezőn az ArrowUp/ArrowDown sem léptet

A billentyűs léptetés is elmarad a pénz-mezőkről. A nem-pénz mezőkön
változatlan.

**Miért:** ez zárja le a persona által megfigyelt jelenség teljes
támadási felületét — bármi váltja is ki a nyíl-eseményt (automatizálási
réteg, félreütés, egy fókuszban felejtett mező fölötti oldalgörgetési
kísérlet), a pénzmező nem reagál rá. Ugyanaz az indok is áll, mint a 4.
döntésnél: a ±1 Ft / ±1 cent soha nem szándékolt művelet egy szerződéses
összegen, tehát nincs mit megvédeni. Mérlegelve és elvetve: (a) a nyilak
maradjanak, mert fókuszt igényelnek, tehát szándékosabbak egy
elkattintásnál — igaz, de éppen a kiváltó megfigyelés mutatja, hogy egy
nyíl-esemény szándék nélkül is előállhat; (b) maradjanak, de értelmes
lépéssel (1000 Ft / 1 €) — ez egy véletlen eseményt nagyobb kárt okozóvá
tenne, és az áraknál a gépelés úgyis gyorsabb, mint a léptetés.

### 6. A „pénz-mező" jelleg explicit, nem a `unit` meglétéből származtatott

A 2–5. döntés mind azon múlik, hogy a komponens tudja, pénzt fogad-e. Ez
ma **nem** vezethető le: a `unit` prop opcionális, `'HUF'` az
alapértelmezése, ezért a HUF ár-mezők (árlista admin) és a darabszám mező
egyaránt `unit` nélkül hívják a komponenst — a `unit` puszta megléte tehát
nem különbözteti meg őket. A hívási helyeknek explicit módon kell
megjelölniük, hogy pénzt fogadó mezőről van szó.

**Miért:** enélkül vagy a darabszám mező is elveszítené a léptetőt, vagy a
HUF ár-mezők nem kapnának védelmet — mindkettő csendes, nehezen észrevehető
regresszió. A jelölés konkrét formája (új prop, a `unit` kötelezővé tétele,
vagy más) az implementáló döntése; a terv csak azt rögzíti, hogy
kitalálásra nem bízható.

### 7. A verifikáció két rétegű: vitest-regresszió + állandó böngészős checklist-tétel

- **vitest** — az EUR round-trip 1000 € fölött (jsdom-ban teljesen
  ellenőrizhető, nem igényel böngészőt), a visszaállás jelzése, valamint
  hogy pénz-mezőn sem a gombok, sem a nyilak nem léptetnek, nem-pénz
  mezőn viszont változatlanul igen.
- **böngésző** — új, állandó bejegyzés a
  `.claude/skills/browser-validation/checklist.md`-ben: pénz-mezőn nem
  keletkezik véletlen léptetés valódi egér-/billentyű-eseményekre, és egy
  1000 € fölötti érték kurzoros szerkesztése túléli a blurt.

**Miért:** a jsdom-készlet a logikát teljesen lefedi, de a valódi
pointer-geometria (a gombok célterülete) és a valódi billentyű-események
strukturálisan kívül esnek rajta — pont az a réteg, amit a
`docs/07-felulet-rendszer.md` § „Ellenőrzés valódi böngészőben" a
`browser-validation` skillre bíz. Az eredetileg kért kézi újrateszt így nem
egyszeri aktusként fut le és felejtődik el, hanem ismételhető marad.
Mérlegelve és elvetve: egyszeri futás, az eredmény a lezárási
összefoglalóban — olcsóbb, de a `NumberField` a kódbázis egyetlen
pénzbeviteli komponense, egy jövőbeli módosítása pont ugyanezt a kört
igényelné újra.

### 8. Ha a kézi újrateszt mégis reprodukálja a `+1` jelenséget

Ha a fejlesztői, kézi böngészős menet a 4–5. döntés bevezetése UTÁN is
elő tudja állítani a `300,00 → 300,01` jellegű eltérést egy pénz-mezőn,
az önálló, magasabb súlyosságú megfigyelés — új backlog-tételként kerül
be, nem ennek a tételnek a hatókörébe visszaszívva.

**Miért:** ez a `CLAUDE.md` „Backlog-tétel lezárása" 1. lépésének
alkalmazása. Egy ilyen eredmény azt jelentené, hogy a `step()`-en kívül
van egy másik, még ismeretlen írási út a mezőbe — az saját kivizsgálást
érdemel, nem ennek a tételnek a farkát.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `formatMoney`/`formatPrice` és a nyomtatvány számformátuma.** A 2.
  döntés kizárólag a beviteli mező megjelenítését érinti. A képernyős és
  PDF-es pénzösszeg-formázás (`docs/04-nyomtatvany-spec.md`, ezres
  elválasztó a terv nyelve szerint) érintetlen — a kettő szándékosan
  válik szét.
- **A commit-on-blur elv.** Nem kerül visszabontásra; a mező továbbra sem
  ír a törzsadatba minden leütésre.
- **A `priceListAdmin/BufferedFields.tsx`.** Nem `NumberField`-példány,
  csak a mintáját követi egy saját, minden leütésre mentő mezőben — külön
  komponens, külön kérdés.
- **A darabszám és a százalék mező viselkedése.** A 4–5. döntés kifejezetten
  nem nyúl hozzájuk; a 3. döntés jelzése viszont rájuk is vonatkozik.
- **Bármilyen HUF↔EUR árfolyam-átszámítás.** A `CLAUDE.md` sérthetetlen
  szabálya szerint a két pénznem értékei egymástól függetlenek; ez a tétel
  ezt sehol nem érinti.
- **A doctor-review többi megállapítása** (113–117. tétel) — mindegyik
  saját tétel.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/NumberField.tsx` — a megjelenítés/parsolás,
  a `commit()` visszaállási ága és a `step()`/léptető-gombok.
- `app/src/domain/money.ts` — `formatCentForInput` (a 2. döntés);
  egyetlen fogyasztója a `NumberField`, más hívási hely nincs.
- A pénz-mezőt renderelő hívási helyek, ahol a 6. döntés jelölése kell:
  `pages/planEditor/LineRow.tsx` (ajánlati ár — és ugyanitt a darabszám
  mező, ami NEM pénz), `pages/planEditor/ElolegBlokk.tsx`,
  `pages/planEditor/EgyediVegosszegBlokk.tsx`,
  `pages/priceListAdmin/ItemEditor.tsx` (HUF fix/sávos + EUR mezők),
  `pages/priceListAdmin/UjTetelDialog.tsx`. A
  `pages/priceListAdmin/TomegesArDialog.tsx` százalék-mezője
  szándékosan nem pénz.
- `app/src/components/NumberField.test.tsx` — a meglévő EUR-eset (825 €)
  mellé az 1000 € fölötti tartomány, a jelzés és a léptetés-korlátozás.
- `.claude/skills/browser-validation/checklist.md` — a 7. döntés
  böngészős bejegyzése.
- `docs/07-felulet-rendszer.md` § Komponensek — a `NumberField`-ről ma
  csak a fókusz-select-all viselkedés szerepel; a lezáráskor ide kerül a
  pénz/nem-pénz megkülönböztetés szabálya.

## Tesztelés (irányadó, nem kimerítő)

1. EUR terven egy 1000 € fölötti előleg-/ár-mezőbe belekattintva, a
   kijelölést kurzorral megszüntetve, egyetlen számjegyet átírva és
   kilépve a mezőből: a módosítás megmarad, nem ugrik vissza a régi
   értékre.
2. Ugyanez a mező a beírt értéket ezres jel nélkül jeleníti meg, miközben
   a szerkesztő összesítői, a képernyő többi pénzösszege és a generált PDF
   változatlanul csoportosított alakot mutat.
3. Értelmezhetetlen tartalom (pl. betűk) beírására a mező láthatóan jelzi a
   visszaállást, és az utolsó ismert értéket mutatja — nem 0-t.
4. Pénz-mezőn a jobb szél környékére kattintva semmilyen érték-változás nem
   történik, és a mezőben állva az ArrowUp/ArrowDown sem módosít.
5. A kezelési sor darabszám mezőjén a ▲/▼ és a nyilak változatlanul
   léptetnek; a tömeges árváltoztatás százalék-mezője szintén.
6. Egy HUF terven ugyanezek a pénz-mezők ugyanúgy viselkednek, mint az
   EUR-osak — a védelem nem a `unit="EUR"` meglétéhez kötött.
7. Fejlesztői, kézi böngészős menet (izolált Chrome, `browser-validation`):
   a `300,00 → 300,01` jellegű eltérés valódi egér- és billentyű-eseményekkel
   nem áll elő.
