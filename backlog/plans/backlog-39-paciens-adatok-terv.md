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

A `PatientEditor` (`PaciensekPage.tsx`) MA **kinyitáskor rögtön
szerkeszthető mezőket** mutat — nincs read-only megjelenítési mód, nincs
"Edit" gomb; a Save/Cancel gombpár MÁR LÉTEZIK, dirty-gated
(`disabled={!dirty || saving}`, `:603–616`), a dirty-guard sor-váltásnál
MÁR LÉTEZIK (`:155–180,358–387`), és a mentési hiba `catch` ága MÁR MA
IS megőrzi a beírt state-et (`:469–481`, pontosan D215-nek megfelelően,
a 33. tétel/DP-005 feltárása szerint). A "Nincs megadva" üres-mező-
szöveg SEHOL nem létezik. Validáció (jövőbeli DOB tiltása, email-formátum)
SEHOL nem létezik.

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
(D197 — a normalizálás a 38. tétel/DP-014 keresésének is kell, közös
`norm()` reuse); az email OPCIONÁLIS, de ha kitöltött, syntaktikailag
valid kell legyen (D198 — ÚJ validáció, ma nem létezik); a
születési dátum OPCIONÁLIS, teljes dátum, jövőbeli dátum TILOS (D199 —
ÚJ validáció, ma nem létezik).

**Miért:** ezek konkrét, a redesign-ben explicit kimondott szabályok —
nincs bennük mérlegelendő alternatíva, csak hiányzó implementáció.

### 4. Post-create auto-open EDIT módban, nem read-only-ban

Amikor a 36. tétel (DP-012) szerinti quick-create dialógus után a sor
automatikusan megnyílik (`PaciensekPage.tsx:200`), az 1. döntés szerinti
KÉT mód közül az EDIT módban nyílik meg — mert a doki épp csak a nevet
adta meg, és valószínűleg tovább akarja tölteni a többi mezőt.

**Miért:** ez a mai auto-open viselkedés (ami ma trivially "edit mód",
mert nincs más mód) legközelebbi, szándék szerinti megfelelője az 1.
döntés bevezetése UTÁN — read-only módban nyitni egy frissen, majdnem
üresen létrehozott rekordot rossz UX lenne (a dokinak külön kattintania
kellene a Szerkesztésre).

### 5. Dirty guard és write-failure viselkedés: VÁLTOZATLAN, csak az 1. döntés módjára alkalmazva

A MEGLÉVŐ dirty-guard (sor-váltás közben, `:358–387`) és a mentési hiba
utáni state-megőrzés (`:469–481`) NEM változik funkcionálisan — csak az
1. döntés szerinti EDIT módra vonatkozik (read-only módban nincs mit
őrizni, mert nincs `draft`). A 33. tétel (DP-005) megosztott dirty-hookja
(ha addig elkészült) itt is felhasználható, de nem kötelező előfeltétel.

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
  38. tétel (DP-014).
- Success toast (D216/D217) — kis, önmagában triviális UI-elem; ha az
  implementáló ide sorolja, belefér, de nem kritikus a tétel
  lezárásához, és más tételek (pl. 41. tétel törlés-toast) is érintik
  ugyanazt a toast-mintát.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PaciensekPage.tsx:418–620` — a `PatientEditor`
  read-only/edit kétállású renderelése, "Nincs megadva" szöveg,
  validációk (1–3. döntés).
- `app/src/pages/paciensek/UjPaciensDialog.tsx` / `PaciensekPage.tsx:200`
  — post-create auto-open módjának explicit beállítása (4. döntés).
- `app/src/domain/search.ts` `norm()` — reuse a telefon-normalizáláshoz
  (3. döntés, D197).
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
- Quick-create után a sor EDIT módban nyílik meg, nem read-only-ban.
- Mentési hiba esetén a beírt (még nem mentett) adat megmarad a mezőkben
  — regressziós teszt a MEGLÉVŐ viselkedésre.
