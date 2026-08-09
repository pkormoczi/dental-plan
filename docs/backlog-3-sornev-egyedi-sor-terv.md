# Backlog 3. tétel — Sornév szerkeszthetővé tétele + szabad („egyedi") sor — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 3. tételének ("Sornév szerkeszthetővé
tétele + szabad („egyedi") sor") megbeszélt megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Ma a `Sor.nevSnapshot` (`app/src/domain/types.ts:62-70`) már szabad
string a sémában (D7 pillanatkép), de a `LineRow` (`PlanEditorPage.tsx`,
kb. 535-550. sor) mindig egyszerű, nem szerkeszthető `<Text>`-ként
rendereli. Egy elgépelt vagy rövidített árlistai név szó szerint kerül az
aláírandó dokumentumra, és nincs mód olyan tétel felvételére, ami nincs az
árlistában (pl. egyedi anyagköltség, hiányzó érzéstelenítés-tétel — lásd
`docs/08-backlog.md` Függelék B) napja).

**Központi ütközés, amit ez a tétel felold:** a `kitoltetlenSorok`
(`app/src/domain/kitoltetlen.ts:22-33`, a véglegesítés **kemény blokkja**
`PreviewPage.tsx` `attemptFinalize`-ban) ma kizárólag `!sor.tetelId.trim()`
alapján dönti el, hogy egy sor "kitöltetlen"-e. Egy szándékosan egyedi sor
is üres `tetelId`-vel él — enélkül a döntés nélkül a kemény blokk
megkülönböztethetetlenné tenné a fogtérkép-kattintással létrehozott, még
azonosítatlan sort egy tudatosan felvitt egyedi sortól.

## Döntések

### 1. Egy mechanizmus, nem kettő

A névmező-pontosítás (árlistai tétel nevének javítása a soron) és a
teljesen egyedi sor felvétele **ugyanaz a mechanizmus**: a névmező mindig
szerkeszthető szövegmező. Ha árlistai tételből indul, a keresőből
kiválasztott tétel neve tölti ki alapból, de felülírható. Ha a doki nem
talál tételt a keresőben, ugyanez a mező veszi fel a gépelt szöveget (lásd
3-4. döntés).

**Miért:** a backlog maga is ezt sugallja ("az egyedi sor ugyanazt a
mechanizmust használja") — nincs szükség két külön UI-útvonalra egyetlen
szabad szöveg-mezőhöz.

### 2. Névszerkesztés hatása egy árlistai tételből felvett soron

A `tetelId` **megmarad** hivatkozásnak, csak a megjelenített
`nevSnapshot` szöveg változik.

**Miért:** a `nevSnapshot` D7 szerint már ma is független pillanatkép a
tétel nevétől — a szerkesztés csak ezt a szöveget írja felül. Az ár
(`listaEgysegar`/`tenylegesEgysegar`), a fogtérkép-szín
(`vizualKategoriaFor(tetel?.kategoriaId)`, `domain/toothVisual.ts`) és a
német-fallback ellenőrzés (`fallbackSorok`, ami a `tetelId`-n keresztül
nézi meg, van-e a hivatkozott tételnek `nev.de`-je) mind változatlanul
működik tovább — csak a nyomtatványon megjelenő szöveg más. Ez erősíti,
nem gyengíti a D7 szándékát, ahogy a backlog is kimondja.

### 3. Vadonatúj egyedi sor indítása — nulla találat esetén

Ha a keresőben (`ItemPicker`) a gépelt szövegre **nincs egyetlen találat
sem**, az Enter nem tesz semmit üresen — ehelyett felveszi a gépelt
szöveget `nevSnapshot`-ként, `tetelId: ''`-vel, `tenylegesEgysegar: 0`
(illetve `listaEgysegar: 0`, lásd 6. döntés) kezdőértékkel, amit a doki
utána tölt ki.

**Miért:** a projekt kritikus UX-elve a billentyűzetes ciklus (gépel →
↑/↓ navigál → Enter hozzáad → kereső kiürül és visszakapja a fókuszt →
gépel tovább, egér nélkül, lásd CLAUDE.md "A UX kritikus pontja"). Ez az
ág nem tör ki ebből a ciklusból, csak egy új eshetőséggel bővíti: találat
esetén tételt vesz fel, találat hiányában a gépelt szöveget magát.

### 4. Egyedi opció találatok között

Ha **vannak** találatok, de a doki egyiket sem akarja, a találati lista
alján mindig megjelenik egy „Egyedi tétel felvétele: „{gépelt szöveg}""
pszeudo-elem, ami a meglévő ↑/↓ ciklusban ugyanúgy elérhető és Enterrel
kiválasztható, mint bármelyik valódi találat.

**Miért:** nincs szükség külön billentyűkombinációra vagy a keresőmező
kiürítésére csak azért, hogy egyedi sorhoz jusson a doki — a megszokott
ciklus bővül egy plusz opcióval, konzisztens a "gépel → nyilaz → Enter"
mintával.

### 5. `kitoltetlenSorok` új kritériuma

A "kitöltetlen sor" mostantól `!sor.nevSnapshot.trim()` alapján dől el
(a mai `!sor.tetelId.trim()` helyett) — **csak név kell, az ár lehet 0**.

**Miért:** egy 0 Ft-os egyedi tétel legitim lehet (pl. egy ingyenes
konzultációs sor egyedi soron rögzítve) — az ár hiánya önmagában nem
blokkoló ok, csak a név hiánya. Ez a kritérium egyszerre helyesen kezeli
mindkét esetet: az árlistából felvett sor mindig azonnal kap nevet (nem
változik a mai viselkedés), az üres, fogtérkép-kattintással létrehozott
sor pedig `nevSnapshot: ''`-vel indul (`onToothClick`,
`PlanEditorPage.tsx:161-190`), tehát továbbra is blokkol, amíg a doki nem
azonosítja vagy nevezi el.

### 6. Egyedi sor ára — egy mező, nincs "listaár"

Egy számmező jelenik meg a dokinak; mentéskor `listaEgysegar =
tenylegesEgysegar`. Nincs kedvezmény-badge egyedi soron.

**Miért:** egyedi sornál nincs értelmezhető árlistai referenciaár, amihez
a "tényleges" ár képest kedvezményt mutathatna — két független mező
felesleges komplexitás lenne olyan igényre, ami nem merült fel a
backlogban.

### 7. `savos` (sávos/becsült ár) egyedi soron — rögzített `false` ebben a körben

Az egyedi sor mindig fix árként nyomtat, csillag nélkül — nincs manuális
sávos-kapcsoló ebben a tételben.

**Miért:** a soronkénti manuális "becsült ár" kapcsoló külön backlog-tétel
(4.), még nincs megépítve. A 3. tétel backlog-indoklásának saját példái
("egyedi anyagköltség", "nincs tétel az érzéstelenítésre") jellemzően fix
árúak — a bizonytalan mennyiségű egyedi tétel (pl. csontpótlás) a 4.
tételre marad, szándékosan nem itt oldjuk meg.

### 8. Egyedi sor és a német nyelvi fallback-figyelmeztetés

Német nyelvű terven (`plan.nyelv === 'de'`) egy **kitöltött** (nem üres
nevű) egyedi sor is bekerül a `hianyzoNevek`/`fallbackSorok`
figyelmeztetés-listájába, ugyanúgy, mint egy hiányzó német árlistanévvel
rendelkező tétel.

**Miért:** a `fallbackSorok` (`app/src/domain/nev.ts:22-39`) ma a
`tetelId`-n keresztül keresi meg a tételt, és üres `tetelId`-nél a
keresés `undefined`-et ad vissza, a sor némán kimarad a listából — nincs
"német változat" egy szabad szöveghez, tehát a mai logika hallgat pont
ott, ahol a legjobban kellene szólnia. D21 (a doki magyarul gépel, akkor
is, ha német ajánlatot állít össze) és a Függelék C) napi jelenet
("a nyilatkozat helyén ott áll: ez a szöveg jogilag még nincs lezárva")
ugyanazt az elvet kéri: a doki lássa véglegesítés előtt, mely sorok
kerülnek magyarul a német dokumentumra, és erősítse meg tudatosan.

### 9. Vizuális jelzés a szerkesztőben — "egyedi" badge

Kis "egyedi" felirat jelenik meg a soron, ugyanabban a stílusban, mint a
meglévő "sávos" felirat (`LineRow`, `PlanEditorPage.tsx` kb. 535-550.
sor).

**Miért:** a doki egy pillantással lássa, mely sorok nincsenek az
árlistához kötve — például egy jövőbeli árlista-frissítéskor tudja, mely
sorokra nem hat az admin oldali átnevezés/árváltozás (mert azokon nincs is
mit átvezetni).

### 10. Nincs karakterkorlát a `nevSnapshot`-on

Nincs bevezetett hosszkorlát vagy figyelmeztetés túl hosszú egyedi névre.

**Miért:** a PDF-sablon már ma is kezel változó hosszúságú árlistai
neveket sortöréssel/word-wrap-pal — külön korlát új, nem kért
komplexitás lenne.

### 11. Tesztelés

Egységteszt kell:
- `kitoltetlenSorok` új kritériumára (névvel ellátott, `tetelId`-mentes
  sor NEM számít kitöltetlennek; név nélküli sor számít, ártól
  függetlenül).
- `fallbackSorok` egyedi sorra (német terven egy kitöltött egyedi sor
  bekerül a hiányzó-német listába; magyar terven nem, üres nevű egyedi
  sornál sem).
- Névszerkesztés `tetelId`-megőrzésére (árlistai tételből felvett sor
  nevének felülírása után a `tetelId`, az ár és a `savos` változatlan
  marad).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Soronkénti manuális "becsült ár" (csillag) kapcsoló** — külön, 4.
  backlog-tétel; lásd 7. döntés.
- **Sor-szintű megjegyzés-oszlop** — a D13 (`docs/01-attekintes-es-dontesek.md:50`)
  kifejezetten kizárja; a `Fog` mező és a fázis-szintű `megjegyzes` marad
  az egyetlen szabad szöveges csatorna a névmezőn kívül. A névszerkesztés
  nem ütközik D13-mal, mert nem új mezőt vezet be, hanem a már létező
  `nevSnapshot`-ot teszi szerkeszthetővé.
- **`schemaVersion` emelés** — nem szükséges: a fenti döntések egyike sem
  vezet be új mezőt a `Sor` típuson (a `tetelId`/`nevSnapshot`/`savos`/
  `listaEgysegar`/`tenylegesEgysegar` mind ma is léteznek), csak a
  meglévő mezők értelmezését/UI-kezelését bővítik.
- **`assertPlanShape` bővítése** — a kutatás szerint ma egyáltalán nem
  ellenőrzi a `tetelId`/`nevSnapshot` mezőket, tehát az üres `tetelId`
  már ma is átmegy rajta. Nincs itt új tiltás bevezetve; a backlog-tétel
  méretbecslésében szereplő "ellenőrzése üres tetelId-re" gyakorlatban
  annak megerősítését jelenti implementáláskor, hogy a validátor nem
  kezdi el elutasítani az egyedi sorokat — nem egy új szigorítás.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx`
  - `sorMezokTetelbol` (kb. 53-68. sor) — a tétel-alapú sormezők
    összeállítása; az egyedi sor létrehozásának (3-4. döntés) ugyanide
    kell illeszkednie, ne duplikálja a logikát.
  - `LineRow` névmegjelenítés (kb. 535-550. sor) — a mai read-only
    `<Text>` cseréje mindig szerkeszthető `TextField.Root`-ra (a
    `phase.megnevezes`/`phase.megjegyzes` már meglévő
    `TextField.Root` + `onPatch` mintáját követve, `patchLine`
    (kb. 145-149. sor) már létezik erre); ide kerül a 9. döntés
    "egyedi" badge-e is.
  - `ItemPicker` — a "nulla találat → Enter felveszi a gépelt szöveget"
    (3. döntés) és az "Egyedi tétel felvétele: ..." pszeudo-elem a lista
    alján (4. döntés).
  - `tenylegesEgysegar` mező (kb. 595-608. sor) — meglévő `NumberField`
    újrahasználható egyedi sor árbeviteléhez is (`unit` prop a
    pénznemhez, ahogy az admin EUR-mezőnél már működik).
- `app/src/domain/kitoltetlen.ts:22-33` — `kitoltetlenSorok` feltétele
  `!sor.tetelId.trim()`-ről `!sor.nevSnapshot.trim()`-re vált (5. döntés).
- `app/src/domain/nev.ts:22-39` — `fallbackSorok` bővítése az egyedi
  sorokra (8. döntés): ha `sor.tetelId === ''`, `plan.nyelv !== 'hu'` és
  `sor.nevSnapshot` nem üres, a sor bekerül az eredménybe.
- `app/src/pages/PreviewPage.tsx` — `attemptFinalize`/`uresSorokNotice`
  a `kitoltetlenSorok` új kritériumát automatikusan átveszi, külön
  módosítás nélkül; a `hianyzoNevek`-ből építkező `confirmStep`
  megerősítő szöveg (kb. 388-394. sor) az egyedi sorokra is helyesen fog
  vonatkozni a `fallbackSorok`-bővítés után.
- `app/src/domain/toothVisual.ts` — nincs teendő: az üres `tetelId`
  már ma is "Egyéb" kategóriaként fest a fogtérképen
  (`vizualKategoriaFor(tetel?.kategoriaId)`), ezt a viselkedést az
  egyedi sor változtatás nélkül örökli.
