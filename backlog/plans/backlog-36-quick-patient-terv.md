# Backlog 36. tétel — Quick Patient létrehozás — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 36. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-012
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D14`–`D15`/`D203`–`D205`/`D228` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A redesign D14 szerint egy "quick new patient" valódi Patient/`paciensId`
rekordot hoz létre MÉG A TERV ELŐTT. Ez MA KÉT, egymástól eltérő módon
viselkedő úton érhető el:

1. **`PaciensekPage.tsx` "+ Új páciens"** → `UjPaciensDialog.tsx` — ez MÁR
   MA IS pontosan D14-et csinálja: csak nevet kér (`UjPaciensDialogProps`,
   `:14–27`), `autoFocus` a néven (`:77`, D228 névfele MÁR TELJESÜL, az
   Escape=Cancel is öröklődik a Radix `Dialog`-tól, D228 másik fele is
   MÁR TELJESÜL), submitkor azonnal `storage.createPatient(nev)`-et hív
   (`PaciensekPage.tsx:187`, `DemoStorage.ts:647–657`), és a létrehozott
   sor auto-megnyílik utána (`PaciensekPage.tsx:200`).
2. **`/uj-terv` "Vadonatúj páciens"** → `startBrandNewPatient()`
   (`NewPlanPage.tsx:93–96`) — ez **NEM** hoz létre semmilyen rekordot;
   csak `resetPlanDraft()`-ot hív és a `/paciens` (Terv adatai) draft-
   formra navigál. **A valódi Patient-rekord csak a terv MENTÉSEKOR
   keletkezik** (`DemoStorage.ts` `doSavePlan`, `:465–473`). Ez
   közvetlenül ellentmond D14-nek — ez a tétel valódi hatóköre.

Emellett D15 (DOB + telefon opcionálisan látható a quick formon) SEHOL
nem teljesül: az `UjPaciensDialog.tsx`-nek csak név mezője van, a többi
mezőt tudatosan a mentés utáni sorra hagyja.

## Döntések

### 1. A "Vadonatúj páciens" ág is a quick-create dialógust futtatja, MIELŐTT a draftra navigál

A `NewPlanPage.tsx` `startBrandNewPatient()` mostantól MEGNYITJA a (2.
döntés szerint bővített) quick-create dialógust; csak SIKERES mentés
(valódi `paciensId`+`patientDir` létrejötte) UTÁN hívja `resetPlanDraft()`-ot
és navigál `/paciens`-re — a friss `patientDir`-t átadva a draftnak (lásd
5. döntés). Ha a doki a dialógust Cancel-lel/Escape-pel zárja, a
selectoron marad (D205), nem történik navigáció.

**Miért:** ez a hiányzó fél, ami D14-et valóban teljesíti — a mai
"üres draft, majd csak mentéskor materializálódik" viselkedés pontosan
azt a kockázatot hordozza, amit D14 el akar kerülni (a doki nevet gépel a
draftba, de az adott pillanatban nincs mögötte valódi, kereshető
páciens-rekord, amíg nem ment).

### 2. Egy közös quick-create dialógus, `UjPaciensDialog.tsx` bővítve DOB+telefon mezővel

Az `UjPaciensDialog.tsx` mostantól MINDKÉT belépési pontot szolgálja (a
`PaciensekPage.tsx` "+ Új páciens" gombja ÉS az 1. döntés szerinti
`/uj-terv` ág) — bővül két ÚJ, OPCIONÁLIS mezővel: születési dátum és
telefon (D15), a név mellett, de attól vizuálisan alárendelve (a név
kötelező, a másik kettő nem).

**Miért:** egy közös dialógus két hívóhelyen elkerüli, hogy a "quick
patient" fogalomnak két, egymástól eltérő mezőkészlete legyen az appban
— pontosan az a fajta duplikáció, amit a 33. tétel (DP-005) is orvosolt
más felületeken. **Elvetett alternatíva:** egy MÁSODIK, külön quick-form
csak a `/uj-terv` ághoz — elvetve, mert két, vizuálisan/mezőkészletben
eltérő "gyors páciens" dialógus zavaró lenne, és a `PaciensekPage.tsx`
meglévő dialógusa amúgy is majdnem ott van, ahova a redesign menni akar.

### 3. Duplikáció-jelzés ezen a szinten: a MEGLÉVŐ, informatív egyezés marad, egy "Ezt használom" akcióval bővül

A dialógus MA IS meglévő, név-egyezésen alapuló figyelmeztetése
(`UjPaciensDialog.tsx:51,90–95`) egy konkrét, kattintható akcióval bővül:
"Ezt a páciens használom" — kiválasztásra a begépelt új adatok
ELDOBÓDNAK (D204), és a flow a MEGLÉVŐ páciensre folytatódik: a
`PaciensekPage.tsx` hívásnál a meglévő sor megnyílik (a mai auto-open
mintájára), a `/uj-terv` hívásnál a `selectExistingPatient()` (MÁR
LÉTEZŐ, `NewPlanPage.tsx:75–91`) ág fut le rá.

**Miért:** D203 explicit ezt kéri ("Quick create duplicate esetén
meglévő kiválasztása továbbvisz a terv flow-ban"), D204 pedig a begépelt
adatok eldobását. A mélyebb, "intelligens" (DOB+telefon-alapú, max 3
javaslat+expand) detektálás egy KÜLÖN tétel (lásd Kapcsolódó szakasz) —
ez a tétel csak a MA MEGLÉVŐ, név-alapú jelzést teszi cselekvővé, nem
cseréli le a detektálás módját.

### 4. Cancel: visszatér a selectorhoz, megtartja a keresést

`/uj-terv` ágon a dialógus Cancel/Escape-je a selectorra tér vissza, a
MÁR beírt keresőszöveg megtartásával (D205) — a `PaciensekPage.tsx`
hívásnál Cancel a listára tér vissza, változatlanul (ez MA IS így van).

**Miért:** D205 explicit ezt kéri az `/uj-terv` ágra; mivel ez egy ÚJ
belépési pont a dialógushoz (1. döntés), a keresőszöveg-megőrzést itt
kell bevezetni — a `NewPlanPage.tsx` `q` state-je nem törlődhet a
dialógus megnyitása/zárása miatt.

### 5. A friss `patientDir` átadása a draftnak

Sikeres quick-create után az 1. döntés szerinti ág a friss `patientDir`-t
közvetlenül továbbadja a draftnak — ez a 32. tétel (DP-004) 1. döntésében
bevezetett `DraftRecord.patientDir` mezőt tölti ki, PONTOSAN azon a
belépési ponton, ahol a 32. tétel is "ahol már ismert" kategóriába
sorolta.

**Miért:** ez zárja be a 32. tételben nyitva hagyott kört egy konkrét
belépési ponton — a `patientDir` innentől ismert lesz ezen az úton
induló draftokra, amit a 31. tétel (DP-003) breadcrumb-linkje (ott
egyelőre nem-kattintható szövegként hagyva) és a 41. tétel (DP-017,
páciens törlés aktív-draft ellenőrzése) egyaránt profitál belőle.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az "intelligens", DOB+telefon-alapú duplikáció-detektálás, max 3
  javaslat + expand, mentéskori újra-ellenőrzés, "Mégis új páciens"
  explicit megerősítő flow — 37. tétel (DP-013); ez a tétel csak a MA
  MEGLÉVŐ, név-alapú jelzést teszi cselekvővé (3. döntés).
- A `PatientEditor` mélyebb read-only/Edit-mód viselkedése (a
  quick-create utáni auto-open melyik módban nyisson) — 39. tétel
  (DP-015).
- A `NewPlanPage.tsx` selector többi UX-eleme (autofókusz, recents,
  billentyűzet-navigáció, relevancia-rendezés) — 35. tétel (DP-011).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/paciensek/UjPaciensDialog.tsx` — DOB+telefon mező
  hozzáadása (2. döntés), "Ezt a páciens használom" akció (3. döntés).
- `app/src/pages/NewPlanPage.tsx:93–96` — `startBrandNewPatient()`
  átalakítása a dialógus megnyitására, sikeres létrehozás utáni
  navigáció (1. döntés), keresőszöveg-megőrzés Cancel-nél (4. döntés).
- `app/src/pages/PaciensekPage.tsx:184–200` — a "Ezt a páciens használom"
  akció bekötése ide is, ha a dialógus onnan nyílt.
- `app/src/storage/DraftStorage.ts` (32. tétel `DraftRecord.patientDir`
  mezője) — az 1. döntés szerinti ág itt írja be a friss `patientDir`-t
  (5. döntés).

## Tesztelés (irányadó, nem kimerítő)

- `/uj-terv` → "Vadonatúj páciens" → a dialógus megnyílik; csak sikeres
  mentés után navigál `/paciens`-re; Cancel/Escape a selectoron marad,
  a keresőszöveg megmarad.
- A dialógusban DOB/telefon opcionálisan kitölthető, de nem kötelező.
- Név-egyezés esetén az "Ezt a páciens használom" akcióra kattintva a
  begépelt új adatok eldobódnak, és a flow a meglévő páciensen
  folytatódik (mindkét belépési pontról).
- Sikeres quick-create után a draft `patientDir`-je a friss páciensre
  mutat (ellenőrizhető a 31. tétel breadcrumb-linkjén, ha az addig
  elkészült, vagy közvetlenül a `DraftRecord`-on).
- A `PaciensekPage.tsx` "+ Új páciens" útja változatlanul működik, csak
  a dialógus bővült mezőkkel.
