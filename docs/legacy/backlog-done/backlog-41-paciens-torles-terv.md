# Backlog 41. tétel — Páciens törlése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 41. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-017
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D153`–`D156` a redesign saját D1–D606 számozásából valók — NEM azonosak
a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Függőség:** a törlés-akció megjelenítési helye (patient-detail overflow
menü, D155) a 30. tétel (DP-002) páciens-részletoldalára épül — annak
elkészülte előfeltétele ennek.

## Probléma

**Törlési képesség SEHOL nem létezik a rendszerben** — a `PlanStorage`
interfész (`storage/PlanStorage.ts:18–71`) 14 metódusából egy sem törlő
jellegű (`init/listPatients/listPlans/listVersions/loadPlan/savePlan/
savePlanLabel/loadPriceList/savePriceList/loadSettings/saveSettings/
loadTemplate/saveTemplate/loadPatientData/savePatientData/createPatient`
— nulla `delete*`). Ehhez két, MA IS hiányzó ellenőrző-helper is szükséges:

- **"Van-e véglegesített terve"** — a `domain/planFolders.ts` egyetlen
  exportja (`latestVersionAcrossPlans`) csak a legfrissebb verziót adja
  vissza élő-fallback célra, nem klasszifikál `VEGLEGES`/`PISZKOZAT`
  szerint, és nem ad "van-e legalább egy véglegesített" booleant.
- **"Van-e aktív draftja EZ a páciens"** — a `DraftStorage` egyetlen,
  GLOBÁLIS slotot tart (nincs páciensenkénti draft-lista), tehát ez a
  kérdés "a MEGLÉVŐ (egyetlen) aktív draft ehhez a páciens tartozik-e"
  formában válaszolható meg — a `Plan.paciensId?: string` mező
  (`domain/types.ts:167`) MÁR LÉTEZIK, és pontosan ezt az egyezést tudja
  jelezni, HA ki van töltve.

## Döntések

### 1. Törölhetőségi feltétel: nincs véglegesített terve ÉS nincs rá mutató aktív draft

Egy páciens csak akkor törölhető, ha (a) a `listPlans`/`listVersions`
bejárásával SEHOL nincs `statusz === 'VEGLEGES'` verzió, ÉS (b) a
GLOBÁLIS aktív draft (ha van) `Plan.paciensId`-je NEM egyezik ezzel a
páciens `paciensId`-jével (D154).

**Miért:** D154 explicit ezt a két feltételt írja elő — egy
véglegesített (aláírt/kiadott) terv törlése adatvesztést jelentene egy
jogilag releváns dokumentum mögül; egy rá mutató aktív draft törlése
pedig egy folyamatban lévő munkát tüntetne el észrevétlenül.

### 2. `paciensId` nélküli aktív draft: nem blokkol, de nem is garantáltan biztonságos

Ha a globális aktív draft `Plan.paciensId`-je NINCS kitöltve (pl. egy, a
36. tétel/DP-012 előtti mintát követő, még nem összekapcsolt "vadonatúj
páciens" draft), a törlés-feltétel ezt "nem ehhez a páciensez tartozik"-
ként kezeli — a törlés NEM blokkolódik ezen az alapon.

**Miért:** egy eldönthetetlen adatból nem lehet biztonságosan blokkolni —
a 36. tétel (DP-012) már gondoskodik arról, hogy az ÚJONNAN induló
"vadonatúj páciens" draftok mindig kapjanak `paciensId`-t; a régebbi,
ezt megelőzően indult draftok ritka, átmeneti eset, amit ez a tétel
tudatosan vállalt, dokumentált korlátként kezel, nem próbál rá extra
heurisztikát építeni.

### 3. Új storage-metódus: `deletePatient`

A `PlanStorage` interfész egy új, a páciens teljes mappáját (a benne
lévő `paciens.json`/`paciens-adatok.json` fájlokkal, de a definíció
szerint csak akkor hívható, ha NINCS terv-lánc alatta a véglegesítettségi
feltétel miatt) törlő metódussal bővül.

**Miért:** ez az egyetlen módja annak, hogy a D154 feltételt egyáltalán
végre lehessen hajtani — a mai interfészben nincs semmilyen törlő
képesség.

### 4. Elérési pont: kizárólag a patient-detail overflow menü

A törlés akció KIZÁRÓLAG a 30. tétel (DP-002) páciens-részletoldalának
overflow ("⋯") menüjében jelenik meg — NEM a pácienslista soraiban, NEM
a Korábbi tervek listáján (D155). A `PlanHistoryPage.tsx` MÁR BEVÁLT
`DropdownMenu` mintáját követi (`:755–804`: elkülönítő vonal a
mutáló/törlő akciók előtt, piros szín a törlésen, egyedi `aria-label` a
sorok közötti ütközés elkerülésére).

**Miért:** D155 explicit ezt az EGYETLEN elérési pontot írja elő — egy
ilyen, visszafordíthatatlan akciónak nem szabad könnyen elérhetőnek
lennie egy listasorból; a részletoldal overflow menüje eggyel messzebb
van egy véletlen kattintástól.

### 5. Megerősítő dialógus, nincs "helyreállítás"

A törlés `AlertDialog` megerősítést kér (a projekt meglévő "Mégse" =
`variant="soft" color="gray"` konvenciójával, `docs/07-felulet-rendszer.md`),
és VÉGLEGES — nincs "kuka"/helyreállítási mechanizmus (a mockupban ez
plusz komplexitás lenne ártalmatlan adatra; a végleges `FileSystemStorage`-
fázisban a Drive saját verzió-előzménye ad valós helyreállítási utat, D2/D3
kerete szerint).

**Miért:** a törlési feltétel (1. döntés) már eleve kizárja a
valódi (véglegesített/aktív) adatot — a maradék eset (terv nélküli vagy
csak piszkozat-mentes páciens) elvesztése alacsony kockázatú, nem
indokolja egy külön "kuka" funkció bevezetését.

### 6. Nincs patient-merge funkció

Ez a tétel EXPLICIT NEM vezet be páciens-összevonást (D156) — két
véletlenül duplikált páciens-rekord kezelése (ha egyáltalán felmerül) egy
teljesen külön, nyitott kérdés marad.

**Miért:** D156 explicit kizárja; a merge egy jelentősen nagyobb,
adatvesztés-kockázatos feature lenne, amit a redesign tudatosan nem kér.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Patient-merge — D156 szerint explicit kizárva (6. döntés).
- A 30. tétel (DP-002) overflow-menüjének egyéb akciói — csak a törlés
  bekötése ehhez a menühöz tartozik ide.
- Quick-created páciens draft-eldobás utáni megmaradása (D153) — ez MÁR
  MA IS architekturálisan igazolt (a 32. tétel/DP-004 feltárása szerint:
  a `createPatient`/`DraftStorage.clear()` teljesen külön kulcsokat
  érint) — ez a tétel csak megerősíti, nem épít rá új mechanizmust.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/storage/PlanStorage.ts` — új `deletePatient(patientDir)`
  metódus deklarációja (3. döntés).
- `app/src/storage/DemoStorage.ts` — a metódus mockup-implementációja,
  a MEGLÉVŐ `enqueue()` sorosított írás-mintáján (a 32. tétel/DP-004
  feltárása szerinti `savePlan` mintájára).
- Új `app/src/domain/planFolders.ts` export (pl. `vanVeglegesitettTerve`)
  — a "van véglegesített terve" ellenőrzés, a MEGLÉVŐ
  `latestVersionAcrossPlans` melletti új helperként (1. döntés).
- A 30. tétel (DP-002) páciens-részletoldalának overflow menüje — a
  törlés akció bekötése, a `PlanHistoryPage.tsx:755–804` `DropdownMenu`
  mintájára (4. döntés).
- Új `AlertDialog` a megerősítéshez (5. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Véglegesített tervvel rendelkező páciens törlése blokkolva/nem
  elérhető.
- Aktív draftja lévő páciens (a draft `Plan.paciensId`-je egyezik)
  törlése blokkolva.
- Csak piszkozat-mentes, csak törzsadattal rendelkező páciens törölhető,
  megerősítés után.
- A törlés akció KIZÁRÓLAG a páciens-részletoldal overflow menüjében
  jelenik meg, sehol máshol.
- Törlés után a páciens sem a pácienslistán, sem a Korábbi tervek
  listáján nem jelenik meg.
