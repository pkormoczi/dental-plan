# Backlog 53. tétel — Kezelőorvos kiválasztása és öröklési szabályai — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 53. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-032
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D58`, `D535`–`D545` a redesign saját D1–D606 számozásából valók — NEM
azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Kapcsolódó, korábban nyitott tételek:** a 47. tétel (DP-021) 3.
döntése, a 48. tétel (DP-022) 6. döntése és a 49. tétel (DP-023) 4.
döntése mindhárman VÁRAKOZÓ-ként hagyták az orvos-öröklési szabályokat,
erre a tételre mutatva — ez a dokumentum oldja fel mindhármat (lásd a
3–5. döntést).

## Probléma

- **`Settings.orvosok: string[]`** (`domain/types.ts:246`) — sima
  névlista, NINCS aktív/inaktív jelölés, NINCS default-mutató. Az
  EGYETLEN szerkesztési út a `RendeloTab.tsx` egy `<TextArea>`-ja
  (`:104–113`, soronként egy név, split/join).
- **Nulla per-terv orvos-választó UI.** Az EGYETLEN írás
  `blankPlan.ts:53` (`orvos: settings.orvosok[0] ?? ''`) — a doki
  sehol nem tud egy MÁSIK orvost választani egy konkrét tervhez, ha
  2+ név szerepel a listában.
- **`planMasolatKent` (49. tétel „Másolás új tervbe”) az orvost
  VÁLTOZATLANUL átviszi** (`domain/planCopy.ts:54–63`,
  `planCopy.test.ts:173` asszertálja) — ellentmond D538-nak.
- **`frissDatummal` (48. tétel „Új verzió”) az orvost érintetlenül
  hagyja** (`domain/ujVerzioDatum.ts:29–35` csak a két dátummezőt
  érinti) — ez véletlenül megfelel D536 ELSŐ felének (öröklés), de
  csak azért, mert nincs „inaktív orvos” fogalom, ami a fallback felét
  kiváltaná.
- **Nincs finalizációs hard-block hiányzó/érvénytelen orvosra.** A
  `PreviewPage.tsx` `attemptFinalize()` (`:375–396`) ma két kemény
  blokkot ismer: `nameMissing` (páciensnév) és `uresSorok` (kitöltetlen
  sor) — egy harmadik, orvos-alapú blokk nincs.
- **PDF aláírás-blokk** (`pdf/TervDocument.tsx:392–400,529`) a
  `plan.orvos` szöveget közvetlenül olvassa — ez MÁR MA IS működik,
  csak a FORRÁSA (mi kerül bele) hiányos.

## Döntések

### 1. Additív bővítés a `Settings`-en, NEM séma-bővítés

`Settings.orvosok: string[]` VÁLTOZATLAN marad — a teljes roster, a
MEGLÉVŐ `RendeloTab.tsx` textarea-sorrendjében. Két ÚJ, OPCIONÁLIS mező
kerül hozzá: `inaktivOrvosok?: string[]` (a jelenleg deaktivált nevek —
egy név hiánya ebből a listából = aktív) és `alapertelmezettOrvos?:
string` (a globális default név; hiányzó vagy már nem létező/inaktív
érték esetén az első AKTÍV név `orvosok`-ban a tényleges default).

**Miért:** ez a projekt már bevált, sokszor alkalmazott „opcionális
mező, nincs séma-bővítés” konvencióját követi (`Plan.elolegSzazalek`,
`Plan.kedvezmenyOsszeg`, `Plan.paciensId` mintájára — mindegyiknél a
kódkomment explicit kimondja: „`schemaVersion` nem emelkedett, a mező
opcionális”). Egy `{nev: string; aktiv: boolean}[]` objektum-tömbre
váltás ezzel szemben BREAKING változás lenne: törné a MEGLÉVŐ
`orvosok: string[]` fogyasztókat (`RendeloTab.tsx` split/join a
textareához, a PDF placeholder, a seed-fájlok), és D18 szerint
`schemaVersion` emelést + betöltési migrációt igényelne egy régi
`beallitasok.json`-nál — ez aránytalanul nagy kockázat egy pusztán
adminisztratív mezőbővítéshez képest.

**Elvetett alternatíva:** `orvosok` átalakítása objektum-tömbbé (`{nev,
aktiv}[]`) — elvetve a fenti indok miatt; egy régi (D18 szerint
`schemaVersion: 1`) `beallitasok.json` egyébként is némán, hiányzó
mezőként olvasná be az új opcionális mezőket (minden korábbi orvos
implicit aktívnak számít, hiszen az `inaktivOrvosok` üres/hiányzik).

### 2. Beállítások UI-bővítés: aktív/inaktív kapcsoló + „alapértelmezett” jelölő

A `RendeloTab.tsx` (vagy egy hozzá tartozó új szekció) minden orvos-
névhez kap egy aktív/inaktív kapcsolót és egy „alapértelmezett”
jelölőt. Az aktuális default deaktiválásakor, ha van másik aktív
orvos, a rendszer azonnali újraválasztást kér; ha nincs másik aktív
orvos, a deaktiválás engedett, explicit figyelmeztetéssel (D540).

**Miért:** D540 explicit ezt a két ágat írja elő — a default sosem
maradhat csendben egy deaktivált névre mutatva, de a doki nem
kényszeríthető arra, hogy legalább két orvost tartson aktívan (egy
egyszemélyes rendelőnél ez irreális elvárás lenne).

### 3. Új lánc: mindig a globális default orvos (D535) — a 47. tétel VÁRAKOZÓ döntésének feloldása

Egy új terv-lánc orvosa MINDIG az `alapertelmezettOrvos` (vagy ennek
hiányában az első aktív név `orvosok`-ban), a páciens korábbi
tervétől FÜGGETLENÜL.

**Miért:** ez a 47. tétel (DP-021) 3. döntésének tartalma — ott
VÁRAKOZÓ maradt, mert az „aktív/default orvos” fogalom addig nem
létezett. Ez a tétel bevezeti magát a fogalmat (1–2. döntés), így a
47. tétel döntése most végrehajtható a `blankPlan.ts` egyszerű
bővítésével (`orvosok[0]` helyett `alapertelmezettOrvos`-ra/az első
aktív névre hivatkozva).

### 4. Új verzió: örökli az orvost, ha még aktív, egyébként default + info (D536) — a 48. tétel VÁRAKOZÓ döntésének feloldása

Az „Új verzió” a forrás verzió orvosát örökli, HA az még aktív; ha
időközben deaktiválták, a globális default orvosra esik vissza, egy
rövid tájékoztató jelzéssel.

**Miért:** ez a 48. tétel (DP-022) 6. döntésének tartalma — ott
VÁRAKOZÓ maradt ugyanezen okból. Egy inaktivált orvos csendes
öröklése olyan tervet hozna létre, ami finalizáláskor úgyis hard
blokkba ütközne (lásd 6. döntés) — jobb ezt már nyitáskor jelezni.

### 5. Másolás új tervbe: mindig a globális default orvos, a forrás sosem másolódik (D538) — a 49. tétel VÁRAKOZÓ döntésének feloldása

A „Másolás új tervbe” mindig az aktuális globális default orvossal
indul; a forrás verzió orvosa SOSEM másolódik át.

**Miért:** ez a 49. tétel (DP-023) 4. döntésének tartalma — ott
VÁRAKOZÓ maradt. Most a `planMasolatKent` egyszerűen a `blankPlan.ts`-
hez hasonló default-lekérdezést hívja az `orvos` mező feltöltésekor,
a MEGLÉVŐ (D538-cal ellentétes) verbatim-átvitel helyett.

### 6. Deaktivált orvosra hivatkozó aktív draft: nem blokkol azonnal, de finalizáláskor hard block (D537/D539)

Egy aktív draft megtarthatja egy időközben deaktivált orvos nevét
(árva hivatkozás) anélkül, hogy ez azonnal bármit megakadályozna — de
véglegesítéskor a `PreviewPage.tsx` `attemptFinalize()` egy ÚJ,
HARMADIK kemény blokkot kap, a MEGLÉVŐ `nameMissing`/`uresSorok`
mintájára: a `plan.orvos` üres VAGY nem egyezik egyetlen jelenleg
AKTÍV névvel sem `orvosok`-ban.

**Miért:** D537/D539 explicit ezt a két lépcsőt kéri — a draft szabad
szerkeszthetősége (D37, a projekt általános elve) nem sérülhet egy
azonnali blokkal, de a véglegesítés (ami egy jogilag releváns
dokumentumot hoz létre az aláírási blokkban szereplő orvos nevével)
nem eshet meg egy már nem aktív/nem létező orvos nevével. A hard block
a MEGLÉVŐ, jól bevált mintát követi (kemény, nem a `veglegesitesOr.ts`
puha `confirmStep`-láncába illesztve, mert az a workflow-bejárást
vezérli, ez egy tényleges zár).

**Elvetett alternatíva:** a `veglegesitesOr.ts` puha láncába illeszteni
egy megerősítő dialógusként — elvetve; D539 explicit „hard block”-ot
kér, nem megkerülhető figyelmeztetést, mert egy orvos nélküli/érvénytelen
aláírási blokkal ellátott PDF jogilag hibás dokumentum lenne.

### 7. Az orvos-mező a „Terv adatai” lépésen bármikor szerkeszthető

Az orvos-választó mező NEM esik a `tervId`-alapú zárolás (D4) alá — a
`docs/03-funkcionalis-spec.md` § 2 explicit csak a nyelvet és a
pénznemet („Mindkettő az első mentés után fagy”) fagyasztja, az orvos
nem szerepel ebben a felsorolásban.

**Miért:** ez rögzítés, nem új döntés — a mai zárolási szabály eleve
csak két mezőre vonatkozik; az orvos-választó bevezetésekor fontos
explicit kimondani, hogy ez a HARMADIK mező NEM örökli ugyanazt a
korlátozást, különben egy jövőbeli megvalósító tévesen általánosíthatná
a zárolást minden „Terv adatai” mezőre.

### 8. Orvos törölhető, nincs D17-mintájú „csak deaktiválható” szabály (D544)

Egy orvos név TÖRÖLHETŐ az `orvosok` listából (nem csak deaktiválható)
— ez explicit ELTÉR az árlista-tétel D17 precedensétől („Ártétel-`id`-t
soha nem hasznosítunk újra; törlés helyett `aktiv: false`”). Törléskor
a név egyszerűen eltűnik az `orvosok`/`inaktivOrvosok` listákból; egy
rá hivatkozó `plan.orvos` név-pillanatkép (D542/D543 — csak a NÉV
snapshotolódik, nincs komplex `doctorSnapshot`) érintetlen marad, de a
6. döntés validációja szempontjából ugyanúgy „árvának” (nem-aktívnak)
számít, mint egy deaktivált név.

**Miért:** D544 explicit kimondja, hogy itt NEM építünk „már használt
tétel csak deaktiválható” szabályt — az orvos NÉV-pillanatkép (nem
`id`-hivatkozás, mint az ártételeknél) önmagában védi a történeti
tervek olvashatóságát, tehát a D17-féle védelem itt feleslegesen
korlátozó lenne (egy elgépelt vagy elavult orvosnév eltávolítása
ne igényeljen „deaktiválás örökre” döntést egy kis, egy-két orvosos
rendelőben).

**Elvetett alternatíva:** a D17 mintáját követni (csak deaktiválás,
sosem törlés) — elvetve, D544 explicit kizárja; a projekt nem
egységesíti ezt a mintát minden entitásra, tudatosan entitásonként
dönt (lásd a Páciens-törlés, 41. tétel, hasonlóan egyedi szabályai).

### 9. PDF aláírás-blokk AS-IS marad — rögzítés

Az aláírás-blokk layoutja változatlan (D541/D545), csak a
kezelőorvos NEVE dinamikus — ez MA IS így működik
(`pdf/TervDocument.tsx:392–400,529`), ez a tétel nem módosítja.

**Miért:** rögzítés a teljesség kedvéért — a redesign forrásai
(D541/D545) explicit kimondják, hogy a layout AS-IS marad, csak a
névforrás (ami már ma is `plan.orvos`) kap gazdagabb feltöltési
szabályokat (3–6. döntés).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `Rendelo` típus egyéb mezői (cím, telefon, e-mail, adószám) —
  változatlanok, nem ennek a tételnek a hatóköre.
- Komplex `doctorSnapshot` (titulus, aláírás-kép) — D542 explicit
  kizárja, „egyelőre csak az orvos neve snapshotolódik”.
- A „Terv adatai” lap többi szekciója (cím, dátumok, páciens snapshot,
  nyelv, pénznem) — 51./52. tétel (DP-030/031); ez a tétel csak az
  „Orvos” szekció TARTALMÁT tölti ki a 51. tétel által fenntartott
  slot-ban.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Settings` — `inaktivOrvosok?`/
  `alapertelmezettOrvos?` új, opcionális mezők (1. döntés).
- `app/src/pages/settings/RendeloTab.tsx` — aktív/inaktív kapcsoló +
  default-jelölő UI-bővítés (2. döntés).
- `app/src/domain/blankPlan.ts:53` — `orvosok[0]` helyett az
  `alapertelmezettOrvos`/első-aktív-név lekérdezése (3. döntés); ez a
  lekérdezés valószínűleg egy új, önálló domain-helper (pl.
  `alapertelmezettOrvosNeve(settings)`), amit a 4–5. döntés is
  újrahasznosít.
- `app/src/domain/ujVerzioDatum.ts` `frissDatummal()` (vagy egy
  szomszédos új helper) — az orvos-öröklés/fallback logika beillesztése
  (4. döntés).
- `app/src/domain/planCopy.ts` `planMasolatKent()` — az orvos-mező
  cseréje a forrás-átvitel helyett a default-lekérdezésre (5. döntés).
- `app/src/pages/PreviewPage.tsx` `attemptFinalize()` — új, harmadik
  hard block a hiányzó/inaktív orvosra (6. döntés).
- `app/src/pages/PatientPage.tsx` (vagy az 51. tétel által létrehozott
  „Orvos” szekció) — az orvos-választó UI, zárolás nélkül (7. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Egy orvos deaktiválása, ha ő volt a default és van másik aktív orvos,
  azonnali új default-választást kényszerít; ha nincs másik aktív, a
  deaktiválás figyelmeztetéssel engedett.
- Új lánc mindig a globális default orvossal indul, függetlenül a
  páciens korábbi tervének orvosától.
- Új verzió az előző orvost örökli, ha aktív; deaktivált orvos esetén a
  globális defaultra esik vissza, tájékoztató jelzéssel.
- Másolás új tervbe mindig a globális default orvossal indul, a forrás
  orvosától függetlenül.
- Egy deaktivált orvosra hivatkozó aktív draft szabadon szerkeszthető,
  de véglegesítése blokkolva van, amíg a doki nem választ (akkor) aktív
  orvost.
- Az orvos-mező szerkeszthető egy már véglegesített (`tervId !== ''`)
  lánc újranyitott draftján is.
- Egy orvos törlése az `orvosok` listából nem érinti a rá korábban
  hivatkozó, már véglegesített tervek `plan.orvos` név-pillanatképét.
- A PDF aláírás-blokk a `plan.orvos` aktuális értékét mutatja,
  layout-változás nélkül.
