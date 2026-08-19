# Backlog 39. tétel — Páciens adatok read-only / edit / full create — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 39. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-015
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D4`/`D41`–`D43`/`D194`–`D217` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

**Frissítve a 38. tétel (DP-014, D43) lezárása után:** a `PatientEditor`
időközben `components/PatientEditorPanel.tsx`-be lett kiemelve, és a 38.
tétel óta EGYETLEN hívási helye van (`PatientDetailPage.tsx` "Páciens
adatai" tabja) — a `PaciensekPage.tsx` mostantól tiszta navigációs lista,
nem tartalmaz szerkesztőt. Az alábbi sor-/line-hivatkozások ennek
megfelelően a `PatientEditorPanel.tsx`-re, ill. a `PatientDetailPage.tsx`
tab-váltására értendők, nem a régi `PaciensekPage.tsx`-re.

A `PatientEditorPanel` MA **kinyitáskor rögtön szerkeszthető mezőket**
mutat — nincs read-only megjelenítési mód, nincs "Edit" gomb; a Save/
Cancel gombpár MÁR LÉTEZIK, dirty-gated, a dirty-guard tab-váltásnál MÁR
LÉTEZIK (`PatientDetailPage.tsx` `useDiscardGuard`/`DiscardChangesDialog`,
D38), és a mentési hiba `catch` ága MÁR MA IS megőrzi a beírt state-et,
pontosan D215-nek megfelelően, a 33. tétel/DP-005 feltárása szerint. A
"Nincs megadva" üres-mező-szöveg SEHOL nem létezik. Validáció (jövőbeli
DOB tiltása, email-formátum) SEHOL nem létezik.

## Döntések

### 1. Read-only alapállapot + explicit "Szerkesztés" gomb

A `PatientEditor` MOST KÉT megjelenítési módban rendereli a mezőket:
alapból READ-ONLY (sima szöveg, halványabb label + erősebb érték, a
`docs/07-felulet-rendszer.md` már bevált label/érték-kontraszt mintáján),
egy "Szerkesztés" gombbal, ami bekapcsolja a MA MEGLÉVŐ, mezőnkénti
input-mezős szerkesztő nézetet. A Save/Cancel gombpár csak EDIT módban
látszik; Cancel visszalép read-only módba, Save siker esetén is.

**Miért:** D4/D41–D43 explicit ezt a kétállású mintát kéri; a mai,
mindig-szerkeszthető mezők a redesign szándéka szerint véletlen
módosítás kockázatát hordozzák.

### 2. `Nincs megadva` az üres, read-only mezőkre

Read-only módban minden kitöltetlen mező (telefon, email, TAJ, lakcím,
DOB, törvényes képviselő) `Nincs megadva` szöveget mutat, a
`docs/07-felulet-rendszer.md` már meglévő halvány-szöveg konvenciójával
(D209).

**Miért:** egyértelmű különbség kell "a mező üres" és "a mező be van
töltve, de a betöltés még nem futott le" között — egy sima üres mező
félreérthető lenne.

### 3. Full-create validációk: csak a redesign által explicit kért szabályok

A teljes létrehozási/szerkesztési form validációi (D194–D200): CSAK a
NÉV kötelező (D194, ez MA IS így van); a cím egyetlen free-text mező
(D196, ez MA IS így van); a telefon free-text, kereséshez normalizált
(D197 — a 38. tétel a telefon-keresést a `telefonKulcs()`-előtag-
normalizálásra építette, `domain/paciensDuplikacio.ts`/`paciensKereses.ts`,
NEM a `search.ts` `norm()`-jára, mert az ékezetfüggetlenít, nem
számjegy-előtagot vág — ha itt is normalizálás kell, ezt hasznosítsd
újra, ne a `norm()`-öt); az email OPCIONÁLIS, de ha kitöltött, syntaktikailag
valid kell legyen (D198 — ÚJ validáció, ma nem létezik); a
születési dátum OPCIONÁLIS, teljes dátum, jövőbeli dátum TILOS (D199 —
ÚJ validáció, ma nem létezik).

**Miért:** ezek konkrét, a redesign-ben explicit kimondott szabályok —
nincs bennük mérlegelendő alternatíva, csak hiányzó implementáció.

### 4. Post-create auto-open EDIT módban, nem read-only-ban

A 38. tétel (D43) óta a quick-create dialógus (36. tétel, DP-012) sikeres
mentése a `PatientDetailPage.tsx`-re navigál, a `Páciens adatai` tabbal
előválasztva (`PaciensekPage.tsx`/`NewPlanPage.tsx` `handleCreatePatient`,
`{ state: { tab: 'adatai' } }`) — ez a régi "a sor automatikusan
megnyílik" viselkedés route-navigációs megfelelője. Az 1. döntés szerinti
KÉT mód közül ILYENKOR az EDIT módban kell nyitnia — mert a doki épp csak
a nevet adta meg, és valószínűleg tovább akarja tölteni a többi mezőt.

**Miért:** ez a mai auto-open viselkedés (ami ma trivially "edit mód",
mert nincs más mód) legközelebbi, szándék szerinti megfelelője az 1.
döntés bevezetése UTÁN — read-only módban nyitni egy frissen, majdnem
üresen létrehozott rekordot rossz UX lenne (a dokinak külön kattintania
kellene a Szerkesztésre). Az implementálónak egy módot kell találnia,
hogy a `PatientDetailPage.tsx` jelezze a `PatientEditorPanel`-nek: ez egy
frissen létrehozott páciens — pl. egy `location.state` flag, amit a
`PatientDetailPage.tsx` a kezdő módhoz ad tovább.

### 5. Dirty guard és write-failure viselkedés: VÁLTOZATLAN, csak az 1. döntés módjára alkalmazva

A MEGLÉVŐ dirty-guard és a mentési hiba utáni state-megőrzés NEM változik
funkcionálisan — csak az 1. döntés szerinti EDIT módra vonatkozik
(read-only módban nincs mit őrizni, mert nincs `draft`). A dirty-guard ma
a `PatientDetailPage.tsx` tab-váltásán fut (D38, `useDiscardGuard`/
`DiscardChangesDialog`) — a 38. tétel előtt még a `PaciensekPage.tsx`
sor-váltásán is lefutott egy külön példány, az a hívási hely a
navigációs-listává alakítással megszűnt. A közös dirty-hook
(`components/useDirtyDraft.ts`, D38) itt is felhasználható, de nem
kötelező előfeltétel.

**Miért:** nincs ok újraépíteni egy már jól működő mechanizmust — csak
az új read-only/edit határvonalhoz kell igazítani, mikor aktív.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A duplikáció-ellenőrzés mentéskor (D208) — 37. tétel (DP-013), ez a
  tétel csak a mezőket/validációkat/módokat adja, a duplikáció-motort
  nem.
- A master↔terv-snapshot összevetés/szinkron — 40. tétel (DP-016),
  teljesen külön UI.
- A törlés funkció — 41. tétel (DP-017).
- A `PatientEditor` lista-oldali elérési útja (navigation-only sor) —
  38. tétel (DP-014), LEZÁRVA (D43): a `PaciensekPage.tsx` mostantól
  tiszta navigációs lista, a szerkesztő az EGYETLEN hívási helyén,
  `PatientDetailPage.tsx` "Páciens adatai" tabján él.
- Success toast (D216/D217) — kis, önmagában triviális UI-elem; ha az
  implementáló ide sorolja, belefér, de nem kritikus a tétel
  lezárásához, és más tételek (pl. 41. tétel törlés-toast) is érintik
  ugyanazt a toast-mintát.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/PatientEditorPanel.tsx` — a `PatientEditor`
  read-only/edit kétállású renderelése, "Nincs megadva" szöveg,
  validációk (1–3. döntés).
- `app/src/pages/paciensek/UjPaciensDialog.tsx` /
  `app/src/pages/PaciensekPage.tsx` `handleCreatePatient` /
  `app/src/pages/NewPlanPage.tsx` `createAndStart` /
  `app/src/pages/PatientDetailPage.tsx` — post-create auto-open módjának
  jelzése a navigáción át (4. döntés).
- `app/src/domain/paciensDuplikacio.ts` `telefonKulcs()` — reuse a
  telefon-normalizáláshoz, ha kell (3. döntés, D197).
- Új validációs segédfüggvény(ek) az email-formátumhoz és a
  jövőbeli-DOB tiltáshoz — `app/src/domain/` alá, a projekt meglévő
  `validate.ts`/`money.ts`-szerű kis, tiszta validátor-fájljainak
  mintájára.

## Tesztelés (irányadó, nem kimerítő)

- Egy sor megnyitásakor alapból read-only nézet látszik, "Szerkesztés"
  gombbal; kitöltetlen mezők "Nincs megadva"-t mutatnak.
- "Szerkesztés" után a MEGLÉVŐ input-mezős nézet és Save/Cancel jelenik
  meg, dirty-gated.
- Jövőbeli születési dátum megadása hibát ad; érvénytelen email-formátum
  hibát ad; mindkettő nem blokkolja a NÉV mentését, ha az helyes.
- Quick-create után a páciens-részletoldal `Páciens adatai` tabja EDIT
  módban nyílik meg, nem read-only-ban.
- Mentési hiba esetén a beírt (még nem mentett) adat megmarad a mezőkben
  — regressziós teszt a MEGLÉVŐ viselkedésre.
