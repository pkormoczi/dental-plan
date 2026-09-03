# Backlog 101. tétel — Véglegesítés-őr: puha figyelmeztetések rangsora és számlálója — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 101. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** háttérfájl nélküli felvetés, a `domain/veglegesitesOr.ts` és a
`pages/previewPage/VeglegesitesChecklist.tsx` közvetlen áttekintéséből.

## Probléma

- A `domain/veglegesitesOr.ts` `veglegesitesDiagnozis()` 9 puha (`soft`)
  checklist-tételt épít, `tetelek.push()` hívások sorrendjében — ez a
  push-sorrend maga a megjelenítési sorrend is (`pages/previewPage/
  VeglegesitesChecklist.tsx` nem rendez semmit). A `sablon-kihagyott-
  szekcio` tétel — ami azt jelzi, hogy egy egész szakasz (fizetési
  feltételek vagy garancia) a címével együtt kimarad az aláírandó
  nyomtatványból — a push-sorrendben UTOLSÓ a kilenc puha tétel között,
  a tisztán adminisztratív `hianyzo-paciensadat` (hiányzó telefonszám
  stb.) mögött.
- Ugyanez a `domain/veglegesitesOr.ts` minden checklist-tétel modelljébe
  (`CsekklistaTetel`) felvett egy `szamlalo?: number` mezőt — a
  `backlog-67` terve szerint kifejezetten „darabszám-jelvény" céllal —,
  de a `VeglegesitesChecklist.tsx` ezt SEHOL nem olvassa. A doki a
  checklist-soron nem lát összesített számot, csak a kibontott
  `reszletek` szöveges sorain belül, apró `(N)` alakban.
- Az `ar-elteres` tétel (és a `nemet-nev` hard tétel) ráadásul KÉT,
  eltérő jelentésű alcsoportot (`elavult`/`keziAr`, illetve két német
  név-hiány kategória) fog össze — a `szamlalo` ezeknél a bucket-bejegyzések
  ÖSSZEGE, ami egy mindkét bucketbe eső sort kétszer számol, ÉS ha
  renderelnénk, egy fejlécen megjelenő puszta „3" szám elfedné, hogy a
  három érintett sor két, egymástól eltérő okból érintett.
- A `docs/03-funkcionalis-spec.md` § „Véglegesítési checklist (D76)" puha
  tétel-felsorolásának sorrendje ma sem egyezik a kód push-sorrendjével —
  a dokumentáció és a kód már ma sem szinkron ebben a kérdésben.

## Döntések

### 1. Rangsorolás: csak átrendezés a puha csoporton belül, nincs új severity-szint

A puha (`soft`) csoporton belül a push-sorrend módosul: azok a tételek,
amik a NYOMTATVÁNY TARTALMÁT érintik (lásd 2. döntés), a puha csoport
ELEJÉRE kerülnek, a maradék hét, tisztán adatminőségi/adminisztratív
tétel a mai relatív sorrendjében marad mögöttük. A `hard` és az `info`
csoport belső sorrendje **változatlan**.

Nincs negyedik severity-szint (pl. `'soft-legal'`), nincs új szín, nincs
külön ikon vagy súlyozott betűstílus a két kiemelt tételen — vizuálisan
továbbra is ugyanaz az amber `Callout`, mint a többi puha tétel. A
megkülönböztetés kizárólag a POZÍCIÓ.

**Miért:** a D76 szándékosan egységes, háromszintű modellt vezetett be —
egy negyedik szint újranyitná ezt a döntést egy olyan problémáért, amit a
pozíció önmagában megold: a doki fentről lefelé olvassa a checklistet
(lásd `backlog-66` indoklása), tehát a lista-elején álló tétel eleve
hangsúlyosabb, szín nélkül is. Az „egy akcentus az egész appban"
(`docs/07-felulet-rendszer.md`) szabály is óv egy új kiemelőszíntől.

**Elvetett alternatíva — másodlagos vizuális jelzés (félkövér cím vagy
ikon) az átrendezés MELLETT:** a döntési interjúban felmerült, de
elvetve — a puszta pozícióváltás elegendő javulás ehhez a tételhez, egy
extra vizuális réteg pedig már a `docs/07` „EGY akcentus" szabályának
határát feszegetné, ha színes lenne, vagy inkonzisztens precedenst
teremtene, ha csak félkövér.

### 2. A tier-kritérium: „a nyomtatvány tartalmát érinti"

A 9 puha tételből pontosan **2** kerül előre: `sablon-fallback` (a terv
nyelvén nem elérhető sablon helyett a magyar szöveg jelenik meg a
nyomtatványon) és `sablon-kihagyott-szekcio` (egy szakasz a címével
együtt kimarad a nyomtatványból). Push-sorrendjük egymás közt:
`sablon-kihagyott-szekcio` előbb, `sablon-fallback` utána — a teljesen
hiányzó tartalom súlyosabb, mint a rossz nyelvű, de meglévő tartalom.

A maradék hét — `hianyzo-paciensadat`, `nyelvi-review`, `nulla-osszegu-
sor`, `hianyzo-leiras`, `ar-elteres`, `inaktiv-tetel-hivatkozas`,
`inaktiv-tetel-orokolt` — a mai relatív sorrendjében marad, a kiemelt
kettő MÖGÖTT.

**Miért ez a kritérium, és miért nem szélesebb:** éles, objektív
határvonal — vajon a doki által aláírt PDF SZÖVEGE más lesz-e emiatt.
A `nyelvi-review` szintén a nyomtatványon megjelenő szöveg helyességéről
szól, de nem szakaszt/tartalmat vesz el vagy cserél nyelvet: egy
mismatch-elt szöveg attól még a doki saját, szándékos szövege marad a
papíron. Az `ar-elteres`/`nulla-osszegu-sor` pénzügyileg releváns, de a
`docs/03` maga mondja ki, hogy legitim állapot is lehet (szándékos
kedvezmény) — nem tartalom-kihagyás vagy -csere.

**Elvetett alternatíva — a `nyelvi-review` bevonása a kiemelt csoportba:**
felmerült a döntési interjúban, de a felhasználó a szűkebb, „tartalmat
érinti" kritériumot választotta — a nyelvi review-mismatch más
természetű kockázat (a szöveg HELYESSÉGE, nem a MEGLÉTE).

### 3. A `szamlalo` jelvényként jelenik meg, mindhárom severity-szinten

A `VeglegesitesChecklist.tsx` mostantól kiolvassa a `tetel.szamlalo`
mezőt, és — ha van értéke — egy jelvényt (Radix `Badge`) renderel a
tétel címe mellett. Ez **mindhárom** severity-szintre vonatkozik
(`hard`/`soft`/`info`), nem csak a puhákra — a mező ma is megosztott
mindhárom szinten (pl. a `kitoltetlen-sor` hard tételnek is van
`szamlalo`-ja), egy csak-puha kivétel önkényes és meglepő lenne.

A jelvény színe a tétel `sulyossag`-ának megfelelő szín (piros/amber/
szürke) — nem új akcentusszín, a `Callout` mai színkonvencióját követi.

**Miért:** a `szamlalo` a `backlog-67` terve szerint eleve „darabszám-
jelvény" céllal került a modellbe — ennek renderelése egy már jóváhagyott,
csak soha be nem fejezett funkció lezárása, nem új kapacitás.

### 4. Több `reszletek`-alcsoportú tételnél alcsoportonkénti jelvény, nem összegzett szám

Ha egy tételnek **egynél több** `reszletek` bejegyzése van (ma:
`ar-elteres` — „Elavult árlistai pillanatkép" / „Kézzel felülírt
ajánlati ár" — és a `nemet-nev` hard tétel — „nincs német nevük az
árlistában" / „kézzel írt/átírt, nyelvileg nem ellenőrzött"), a fejléc
NEM egyetlen összegzett `szamlalo`-jelvényt kap, hanem **alcsoportonként
egy-egy külön jelvényt**, mindegyik a saját `reszletek[i].nevek.length`
értékével és a saját `reszletek[i].cim` címkéjével.

Ha egy tételnek legfeljebb egy `reszletek` bejegyzése van (a legtöbb
tétel ilyen), a fejléc egyetlen jelvényt kap, a `szamlalo` értékével.

A `reszletek` szöveges részletsorai (a névlista) VÁLTOZATLANUL
megjelennek a fejléc alatt, de a soronkénti `(N):` előtag ELMARAD —
felesleges duplikáció lenne a fejlécen már látható jelvényszámmal
szemben.

**Miért:** ez pontosan azt oldja meg, amit a backlog-tétel „egy szám mögé
összefogott, eltérő jelentésű alcsoport" kritikája megnevez — az
`ar-elteres` fejléce mostantól „2 elavult · 1 kézi" alakú lesz, nem egy
homályos „3". Mellékesen ez a duplikátum-számlálás problémáját is
megoldja: nem kell egyetlen összegzett számot helyesen kiszámolni egy
sorra, ami mindkét bucketbe esik — minden bucket a saját, helyes
darabszámát mutatja, a `domain/arKoveti.ts` `arElteroSorok()` visszatérési
alakja (`{ elavult: string[], keziAr: string[] }`) VÁLTOZATLAN marad.

**Elvetett alternatíva — egyetlen összegzett jelvény, a mai `szamlalo`
értékével:** a felhasználó ezt kifejezetten elvetette a döntési
interjúban — a duplikáció-torzítás és az elmosott jelentés miatt.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `docs/03-funkcionalis-spec.md` § „Véglegesítési checklist (D76)"
  puha-tétel felsorolásának átrendezése és a `D80` (vagy a soron
  következő szabad D-szám) felvétele** — ez a `CLAUDE.md` „Backlog-tétel
  lezárása" checklist 2. lépése, egy KÉSŐBBI, implementáció utáni lépés.
  Ez a tervdokumentum a lezáráskori döntés-átvezetéshez ad anyagot, de
  maga nem hivatkozik és nem javasol D-számot.
- **A `hard` és `info` csoport belső sorrendjének módosítása** — a
  döntési interjú kizárólag a puha csoportra vonatkozott; a `hard`
  csoporton belül úgyis blokkol minden tétel egyformán, sorrendjük nem
  befolyásolja, mi véglegesíthető.
- **Negyedik severity-szint bevezetése** — az 1. döntésben explicit
  elvetve.
- **A `domain/arKoveti.ts` `arElteroSorok()` visszatérési alakjának
  módosítása** (pl. sor-azonosító hozzáadása) — a 4. döntés szerint nem
  szükséges, az alcsoportonkénti jelvény a meglévő `string[]` buckettel
  is helyesen működik.
- **A `nyelvi-review` puha tétel átsorolása a kiemelt csoportba** — a 2.
  döntésben explicit elvetve.
- **Ikon vagy egyéb új vizuális elem a checklist-soron** (a jelvényen
  kívül) — az 1. döntés csak pozíció-változást és a 3–4. döntés szerinti
  jelvényt vezeti be, semmi mást.
- **`VeglegesitesChecklist.test.tsx` létrehozása mint önálló cél** — ma
  nem létezik dedikált unit teszt ehhez a komponenshez (csak
  `PreviewPage.test.tsx` integrációs lefedettség van); ennek a tételnek a
  megvalósítása természetesen érint teszteket (lásd „Tesztelés" lent), de
  egy teljes, önálló unit-teszt-készlet felépítése a komponensre nem cél
  önmagában, ha a meglévő integrációs lefedettség a viselkedést igazolja.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/veglegesitesOr.ts` — a puha tételek `push()`
  hívásainak sorrendje (1–2. döntés); a `CsekklistaTetel` típus és a
  `szamlalo`/`reszletek` mezők már megvannak, nem változnak.
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — a `SULYOSSAG_
  SZIN` melletti jelvény-renderelés (3–4. döntés): egy `Badge` a `cim`
  mellett `szamlalo`-ból VAGY `reszletek.length` szerinti több `Badge`;
  a `reszlet.nevek.length` inline `(N)` előtag eltávolítása a szöveges
  sorból.
- A jelvény precedens a `docs/07-felulet-rendszer.md` „Komponensek"
  szakaszában már dokumentált stepper-`Badge` konvenció (számjegy +
  `aria-hidden`, hogy a szám ne szivárogjon be az akadálymentességi
  névbe) — ezt kell követni, nem új mintát kitalálni.
- Tesztek: `domain/veglegesitesOr.test.ts` — ma NINCS sorrend-assertion
  (minden lookup `find(t => t.id === id)` szerint történik), tehát az
  átrendezés önmagában nem bukik el semmin, de új assertion szükséges a
  puha csoport élén álló két tételre. A `szamlalo`-t ma sem asszertálja
  minden teszt az `ar-elteres`-en — ez a tétel jó alkalom pótolni.
  `pages/PreviewPage.test.tsx` — az `ar-elteres` eset (kb. 1487–1526.
  sor) a mai `Kézzel felülírt ajánlati ár (1): Fogeltávolítás` szöveges
  formátumot rögzíti explicit `toBeInTheDocument()`/regex asserttel; a 4.
  döntés szerinti inline-`(N)` eltávolítás ezt a tesztet MÓDOSÍTANDÓVÁ
  teszi, nem csak kiegészítendővé.
- `app/src/dokumentacioGuard.baseline.json` — a `veglegesitesOr.ts`(14),
  `.test.ts`(14), `VeglegesitesChecklist.tsx`(3) doc-marker számok
  frissítése, ha a változtatás közben a dokumentáció-markerek száma
  módosul.
- Lezáráskor bővítendő dokumentáció: `docs/03-funkcionalis-spec.md` §
  „Véglegesítési checklist (D76)" — a puha tétel-felsorolás átrendezése
  a végleges kódsorrendhez igazítva, plusz egy mondat a jelvény-
  renderelésről; `CLAUDE.md` „Meglévő segédfüggvények" (a
  `veglegesitesDiagnozis()`/`VeglegesitesChecklist.tsx` bekezdés
  kiegészítése a `szamlalo`-jelvény és a puha rangsor tényével).

## Tesztelés (irányadó, nem kimerítő)

- Ha egy terven EGYSZERRE igaz a `sablon-kihagyott-szekcio` és pl. a
  `hianyzo-paciensadat` feltétele, a checklist-en a `sablon-kihagyott-
  szekcio` sor jelenik meg ELŐBB (a puha csoport elején), a `hianyzo-
  paciensadat` mögötte.
- `sablon-fallback` és `sablon-kihagyott-szekcio` egyszerre igaz esetén:
  `sablon-kihagyott-szekcio` előzi meg `sablon-fallback`-ot.
- A `hard` csoport belső sorrendje egy több hard-hibás terven bájtra
  azonos a mai renderrel.
- Egy `szamlalo`-val rendelkező hard tétel (pl. `kitoltetlen-sor` 2
  érintett sorral) fejlécén megjelenik egy „2" jelvény.
- Egy `szamlalo` nélküli tétel (pl. `sablon-fallback`, `hianyzo-
  paciensadat`) fejlécén NINCS jelvény.
- `ar-elteres`, ha `elavult` 2 sort és `keziAr` 1 sort tartalmaz (köztük
  átfedés nélkül): a fejléc két külön jelvényt mutat, összesen „2" és
  „1" értékkel, nem egy összegzett „3"-at.
- `ar-elteres`, ha van egy sor, ami MINDKÉT bucketben szerepel: a két
  jelvény külön-külön helyesen számol, egyik sem torzul a másik miatt.
- `nemet-nev` hard tétel, mindkét albucket nem üres: ugyanaz a
  többjelvényes fejléc-viselkedés, mint az `ar-elteres`-nél.
- A `reszletek` alatti névlista-sorok NEM tartalmazzák többé az inline
  `(N):` előtagot, csak a bucket-címet és a neveket.
- Akadálymentesség: a jelvény számjegye önmagában nem hordoz értelmezhető
  accessible name-et — a környező szöveg/`aria-label` adja a jelentést,
  a NavBar stepper-jelvény mintáján.
- Vizuális: egyetlen jelvény sem használ a `sulyossag`-tól eltérő,
  új akcentusszínt.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/` alatt.
