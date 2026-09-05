# Backlog 58. tétel — Kezelési fázisok kezelése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 58. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-041
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D72`–`D79`, `D85`–`D86`, `D95`–`D97`, `D103` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

- **Fázis-szintű összecsukás (D72/73) NEM LÉTEZIK.** A `PhaseSection`
  (`PlanEditorPage.tsx:573-727`) egyetlen local state-je `sorResetToken`
  (`:617`, sor-törlési remount-kulcs) — nincs nyitott/csukott állapot,
  nincs toggle, a fázis törzse feltétel nélkül renderel
  (`:636-724`). D73 („alapból mind nyitva") ma csak azért igaz, mert
  összecsukás egyáltalán nincs.
- **Fázis-sorrendezés ↑/↓ (D75) NEM LÉTEZIK.** Nincs mozgató handler
  sehol — a `fazisok` tömbön kizárólag `push` (hozzáadás, `:405`) és
  `splice` (törlés, `:203`) történik. Nincs `ArrowUpIcon`/
  `ArrowDownIcon` importálva (`:25`).
- **„Fázis hozzáadása" gomb (D74) MEGVAN**, más felirattal: „+ Új
  kezelési fázis" (`PlanEditorPage.tsx:400-415`), a lista végén.
- **Fázis törlés (D77) RÉSZLEGES.** A trigger SZÖVEGES gomb, nem
  kuka-ikon (`:629-633`, `Fázis törlése`), és csak akkor jelenik meg,
  ha `plan.fazisok.length > 1` (`:372`). A megerősítés FELTÉTELES: ha a
  fázisnak vannak sorai, `AlertDialog` (`:459-491`); ha üres, EGY
  kattintással törlődik, dialógus nélkül (`:392-395`) — ez a mai
  viselkedés SZÁNDÉKOS és dokumentált (`docs/03-funkcionalis-spec.md:
  372-377`: „üres fázis törlése egy kattintás marad, dialógus nélkül —
  újralétrehozása két kattintás").
- **Sor törlés (D78/79) RÉSZLEGES.** A kuka-ikon helyén valójában egy
  `Cross1Icon` (X) van (`:1000-1011`), és a törlés AZONNALI, de
  **Undo SEHOL nem létezik az egész appban** — nincs undo-stack, nincs
  toast/snackbar komponens (`app/src/components` grep szerint), a
  `docs/07-felulet-rendszer.md` „nem toast" szabálya (`:264`) kifejezetten
  a MEZŐHIBÁKRA vonatkozik, nem tiltja általánosan az undo-mintát.
- **Fázisnév (D85/86) RÉSZLEGES.** Az alap `N. kezelés` minta MINDEN
  fázison érvényesül (`ELSO_FAZIS_NEV`, `blankPlan.ts:25,84`;
  `PlanEditorPage.tsx:407`), és MINDEN fázis neve — nem csak az elsőé —
  folyamatosan szerkeszthető egy ÁLLANDÓAN AKTÍV `TextField.Root`-tal
  (`:624-628`), nem egy ceruza-ikon által triggerelt szerkesztő módban.
- **Fázismegjegyzés (D95-97) RÉSZLEGES.** A mező MEGVAN
  (`PlanEditorPage.tsx:708-713`), de MINDIG látszik, nincs progresszív
  elrejtés — ellentétben a sor-szintű „+ leírás" mintával
  (`:864-878`, `leirasNyitva` állapot, `:801-802`, alapból nyitva csak
  ha van tartalom), ami közvetlenül újrahasznosítható lenne.
- **Üres fázis draftban engedett, finalizációt blokkol (D103) MEGVAN**
  — a `veglegesitesOr.ts` már kezeli ezt, rögzítés.

## Döntések

### 1. Fázis-szintű összecsukás bevezetése

Minden fázis fejléce toggle lesz — egymástól függetlenül nyitható/
csukható, egyszerre több is nyitva lehet (D72). Csukott állapotban a
fejléc a fázis nevét, a sorok számát és a fázisösszeget mutatja (D72).

**Miért:** D72/73 explicit ezt kéri. A `docs/03` mai „Fázisok"
szakasza egyelőre semmit nem mond összecsukásról — ez egy genuinly új
felület-elem, nem egy meglévő minta hiányzó darabja.

**Alapállapot:** minden fázis alapból NYITVA (D73), mert összecsukás
hiányában ma is ez a de facto állapot — a redesign nem kér eltérő
alapértéket.

### 2. Fázis-sorrendezés ↑/↓ nyilakkal

Minden fázis fejlécén két nyílgomb (fel/le), ami a fázist a
`fazisok` tömbön belül elmozdítja, a szélső fázisokon a megfelelő
irányú nyíl inaktív/elrejtett.

**Miért:** D75 explicit ezt kéri.

**Figyelmeztetés a megvalósítónak:** a fájl ma INDEX-ALAPÚ React-
kulcsokat használ a fázisokra (`` `${fazisResetToken}-${pi}` ``,
`PlanEditorPage.tsx:360`) — a fájl saját kommentje (`:136-139`)
explicit kimondja, hogy ez csak azért biztonságos, mert a fázisok ma
sosem cserélnek helyet. A sorrendezés bevezetése ELSŐDLEGES
előfeltétele egy stabil (nem index-alapú) fázis-azonosító bevezetése —
különben a soron belüli local state (keresőmód, leírás-nyitottság,
mennyiség-piszkozat) áthúzódna a rossz fázisra mozgatáskor.

### 3. „Fázis hozzáadása" felirat-igazítás

A gomb felirata „+ Új kezelési fázis"-ról a redesign D74 szövegére
igazodik.

**Miért:** tisztán elnevezés-egységesítés — a gomb HELYE és
VISELKEDÉSE már megfelel D74-nek, csak a felirat tér el.

### 4. Fázis törlés: kuka-ikon, a megerősítési kivétel MEGTARTVA

A szöveges „Fázis törlése" gomb kuka-ikonra (`TrashIcon`) cserélődik
(D77). A MEGLÉVŐ, dokumentált kivétel (üres fázis egy kattintással,
dialógus nélkül törlődik) VÁLTOZATLANUL MARAD.

**Miért:** D77 az ikont/megerősítést kéri, de nem foglalkozik az üres-
fázis gyorsúttal — a mai kivétel egy tudatos, `docs/03`-ban rögzített
döntés (a redesign forrásai nem hivatkoznak rá, tehát nem ütközik
vele). Az „egy kattintás, ha nincs mit veszíteni" elv logikailag
konzisztens D79 „azonnali törlés triviális esetben" szellemével is.

**Elvetett alternatíva:** minden fázistörlésre kötelező dialógus,
kivétel nélkül — elvetve, mert felesleges extra kattintást vezetne be
egy olyan esetben, ahol nincs adatvesztési kockázat, és a mai,
dokumentált viselkedést törné meg indoklás nélkül.

### 5. Sor törlés: kuka-ikon + Undo, inline sáv formában

A sor törlésének triggere `Cross1Icon`-ról `TrashIcon`-ra cserélődik
(D78), a törlés MARAD azonnali (nincs megerősítő dialógus egyetlen
sorra, D79), de egy ÚJ, INLINE undo-sáv jelenik meg a törölt sor
helyén rövid ideig (vagy amíg a doki egy másik módosítást nem tesz),
„Visszavonás" akcióval.

**Miért:** D79 explicit „azonnali + Undo"-t kér egyetlen sorra
(szemben a teljes fázis törlésének megerősítő dialógusával — a kettő
tudatosan eltérő UX, a fázistörlés nagyobb, több sort érintő
adatvesztés). Az inline sáv (nem toast) igazodik a `docs/07`
„error… nem toast, ha egy mezőhöz tartozik" elv SZELLEMÉHEZ (a UI itt
NEM globális felugró, hanem a törölt sor pontos helyén marad) anélkül,
hogy egy szó szerint nem létező tiltást (a docs/07 nem tiltja
általánosan a toast-ot, csak mező-hibáknál) félreértelmezne.

**Megvalósítás iránya:** a törölt `Sor` objektum + az index rövid
ideig helyi state-ben tartva (NEM egy általános undo-stack — a plan
állapota amúgy is `structuredClone`-nal cserélődik egészben,
`PlanEditorPage.tsx:193-199`), a „Visszavonás" a splice-olt pozícióra
illeszti vissza.

**Elvetett alternatíva:** globális toast/snackbar komponens bevezetése
— elvetve, mert ez egy MÁSODIK UI-könyvtári mintát vezetne be, amikor
egy inline sáv a MEGLÉVŐ Radix Themes primitívekkel (pl. `Callout` +
`Button`) megoldható, és pontosabb helyen (a törölt sor pozíciójában)
ad visszajelzést, mint egy globális toast.

### 6. Fázisnév marad always-on szerkeszthető mező, nem pencil-triggerelt

A fázisnév mező VÁLTOZATLANUL egy állandóan aktív `TextField.Root`
marad minden fázison — NEM alakul át ceruza-ikon által triggerelt
szerkesztő-móddá, annak ellenére, hogy D86 szó szerint „inline pencil"-t
ír.

**Miért:** D70 „AS-IS" szellemével összhangban — a mai always-on mező
FUNKCIONÁLISAN mindent tud, amit D86 kér (inline, azonnali autosave),
csak vizuálisan más mintát követ. Egy pencil-triggerelt szerkesztő mód
bevezetése tiszta UI-átalakítás lenne funkcionális nyereség nélkül, és
extra kattintást vezetne be egy gyakran használt mezőn (minden új
fázisnál a doki jellemzően azonnal átírja a generált nevet egy
beszédesebbre).

**Elvetett alternatíva:** D86 szó szerinti követése (pencil-ikon +
szerkesztő mód) — elvetve a fenti indokkal; ha a doki tesztelés közben
kifejezetten hiányolja a pencil-mintát (pl. vizuális konzisztencia a
terv-lánc címkéjének pencil-szerkesztésével), ez egy kis, önálló
utókövetés lehet, nem indokol most egy funkcionálisan azonos
cserét.

### 7. Fázismegjegyzés progresszív elrejtése

A fázismegjegyzés mező a sor-szintű „+ leírás" MINTÁJÁT követi: egy
`+ megjegyzés`/`Megjegyzés` jelvényre kattintva nyílik ki, alapból
NYITVA, ha már van tartalma, egyébként csukva.

**Miért:** D95 explicit progresszív elrejtést kér; a fájlban MÁR
LÉTEZIK pontosan ez a minta a sor-leírásnál
(`leirasNyitva = useState(Boolean(leirasTartalom))`,
`PlanEditorPage.tsx:801-802`, trigger `:864-878`) — újrahasznosítás,
nem új minta bevezetése.

**Változatlan marad:** a megjegyzés MINDIG a páciensnek szóló tartalom,
és MINDIG nyomtatódik, függetlenül a „Tétel-leírások nyomtatása"
kapcsolótól (D96/97 — ez MA IS így van, `docs/03-funkcionalis-spec.md:
378-380`, rögzítés).

### 8. Üres fázis draftban engedett — rögzítés

D103 MÁR MA IS teljesül (`veglegesitesOr.ts` a `kitoltetlenSorok`
mintáján blokkolja finalizáláskor, nem a szerkesztésben) — rögzítés,
nincs kódváltozás.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az oldal-szintű alaplayout és a fogtérkép — 57. tétel (DP-040).
- A tételkereső, gyorsgombok, fókusz-flow tételhozzáadás után — 59.
  tétel (DP-042).
- A sor mezőinek szerkesztése (név/ár/becsült ár/leírás) — 60. tétel
  (DP-043).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` `PhaseSection` (`:573-727`) —
  összecsukás állapot, sorrend-nyilak, kuka-ikon, felirat-igazítás,
  megjegyzés progresszív elrejtése (1–4., 7. döntés).
- `app/src/pages/PlanEditorPage.tsx:1000-1011` (`LineRow` törlés
  gomb) — ikon-csere + Undo-sáv (5. döntés).
- A fázis-kulcsképzés (`:360`, `:136-139`) — stabil fázis-azonosító
  bevezetése a sorrendezéshez (2. döntés).
- `docs/03-funkcionalis-spec.md` § Fázisok — a sorrendezés/összecsukás/
  megjegyzés-elrejtés dokumentálása a lezáráskor.

## Tesztelés (irányadó, nem kimerítő)

- Több fázis egymástól függetlenül nyitható/csukható, egyszerre több is
  nyitva maradhat.
- Csukott fázis fejléce a nevet, a sorok számát és az összeget mutatja.
- Fázis-sorrend nyilakkal módosítható, a szélső fázisokon a megfelelő
  nyíl inaktív; a sorrend-váltás után a soronkénti local state (kereső
  szöveg, leírás-nyitottság) a HELYES fázison marad.
- Üres fázis törlése egy kattintással, dialógus nélkül; soros fázis
  törlése megerősítést kér.
- Sor törlése azonnali, egy „Visszavonás” sáv jelenik meg, ami
  visszaállítja a sort az eredeti pozícióba.
- Fázisnév minden fázison folyamatosan szerkeszthető marad.
- Fázismegjegyzés alapból csukva nyílik, ha üres; nyitva, ha van
  tartalma; a nyomtatásban mindig szerepel, függetlenül a
  leírás-kapcsolótól.
