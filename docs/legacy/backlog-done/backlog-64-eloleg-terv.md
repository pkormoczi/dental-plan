# Backlog 64. tétel — Előleg és fennmaradó összeg — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 64. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-047
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D325`–`D346`, `D488`, `D516`–`D525` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Kulcs user-döntés:** az Előleg **ÁTÁLL SZÁZALÉKRÓL ABSZOLÚT
ÖSSZEGRE** — annak ellenére, hogy a mai százalék-alapú tárolás egy
tudatos, `docs/02-domain-modell.md`-ben expliciten indokolt,
drift-mentes tervezési döntés volt. Lásd 1. döntés.

**Sorrendi függőség:** a pénznemenkénti külön állapot (D488) a 62.
tételre (DP-045) épül.

## Probléma

- **`elolegSzazalek` ma SZÁZALÉK, tudatos indoklással.**
  (`domain/types.ts:134-142`): „A százalék az igazság, nem a belőle
  számolt összeg… az mindig élőben számol a `fazisok`-ból”, és a
  `docs/02-domain-modell.md:382-388` külön szakaszban indokolja: „Nem
  lehet elcsúszni a sorok és a belőlük számolt előleg között” — egy
  utólagos sormódosítás a SZÁZALÉKOS előleget automatikusan a helyes
  arányban tartja, egy ABSZOLÚT összeg viszont ELCSÚSZNA a
  módosított végösszeghez képest.
- **A 0–100%-os korlát AUTOMATIKUSAN garantálja `eloleg ≤ fizetendo`.**
  `ElolegBlokk` `onCommit` (`PlanEditorPage.tsx:1209`)
  `Math.min(100, Math.max(0, Math.round(v)))` — ez a védelem strukturális,
  nem külön validáció; abszolút összegre váltva ez a garancia TELJESEN
  megszűnik.
- **Nulla validáció létezik ma az abszolút-összeg forgatókönyvre**:
  `veglegesitesOr.ts` nem ismeri sem `elolegSzazalek`-et, sem
  `kedvezmenyOsszeg`-et; `validate.ts:76-88` be sem tölti (nem
  típusellenőrzi) ezeket a mezőket.
- **Bekapcsoláskor `ELOLEG_ALAP_SZAZALEK` (50) az alapérték**
  (`:1188`), nem üres/autofókuszált mező.
- **A százalék HÁROM helyre szivárog**, amiket egy abszolút-összeg
  átállás mind érint: a PDF összegző sora (`pdf/labels.ts:86,127`,
  `` `Előleg (${szazalek}%)` ``), a fizetési feltételek sablon
  `{{elolegSzazalek}}` helyőrzője (`storage/seed/templates.ts:54,95`,
  kikapcsolt kapcsolónál is az 50-es alapértékre esik vissza,
  `TervDocument.tsx:402-404`), és a `piszkozat.ts` dirty-detektálás
  (`:52,55`).

## Döntések

### 1. Előleg átáll abszolút összegre (user-döntés)

`elolegSzazalek` (percent) helyett a mező mostantól egy ABSZOLÚT,
pénznem-alapegységben tárolt összeget hordoz.

**Miért (user-döntés, a tudatos drift-védelem ellenére):** D325-328/
D488 explicit abszolút összeget kér. A user a kérdés feltevésekor
tudatosan vállalta a drift-kockázatot (ha a doki utólag sort módosít,
egy fix előleg-összeg már nem lesz a végösszeg állandó százaléka) — ezt
a validációs lánc (lásd 2–5. döntés) csak részben tudja ellensúlyozni
(a `deposit ≤ final` határt kikényszeríti, de a „még mindig ésszerű
arány”-t nem).

**Hatás a dokumentációra:** a `docs/02-domain-modell.md` „Előleg”
szakaszának „Százalék tárolódik, nem összeg” indoklása a tétel
lezárásakor átírandó, az új, összeg-alapú modellre.

### 2. Deposit ≤ final validáció nulláról felépítve

Ha a végösszeg (kedvezménnyel/felárral csökkentve/növelve, a 63.
tétel szerint) az előleg ALÁ csökken: az előleg ÉRTÉKE VÁLTOZATLAN
MARAD (nem vágódik le automatikusan), egy inline HARD ERROR jelenik
meg a mezőn, a fennmaradó rész helyén „—” áll, és ez FINALIZÁCIÓS
BLOKK, amíg a doki nem rendezi (D326).

**Miért:** D326 explicit ezt kéri — a mai 0-100%-os clamp strukturális
védelme megszűnik (1. döntés), ezt a validációt EXPLICIT újra fel kell
építeni, mert enélkül egy sortörlés után az előleg csendben nagyobb
lehetne a végösszegnél.

**Elvetett alternatíva:** az előleget automatikusan a végösszegre
vágni (clamp) — elvetve; D326 explicit „az előleg MARAD”-ot ír, a
doki tudatos rendezését várva, nem néma korrekciót.

### 3. Deposit = final esetén fennmaradó rész explicit 0

Ha az előleg PONTOSAN egyenlő a végösszeggel, a fennmaradó rész
explicit `0`-t mutat, nem „—”-t vagy elrejtett sort (D327).

**Miért:** D327 explicit ezt kéri — ez legitim, nem hibaállapot
(ellentétben a 2. döntés esetével, ahol az előleg TÖBB, mint a
végösszeg).

### 4. `0` canonical disable — blur/Enter után

Ha a doki explicit `0`-t ír be az előleg összegének, ez VALID bemenet
átmenetileg, de blur/Enter után a kapcsoló CANONICAL állapota
`enabled: false, amount: null`-ra áll (a mező eltűnik, D519).

**Miért:** D519 explicit ezt kéri — egy `0` összegű „előleg” valójában
nincs előleg; a canonical-state normalizálás elkerüli, hogy a
`Plan`-en egy értelmetlen „bekapcsolva, de 0” állapot tárolódjon
tartósan (ellentétben a 63. tétel Egyedi végösszegével, ahol a `0`
VALID, MARADÓ állapot explicit megerősítéssel — a két blokk itt
TUDATOSAN eltérő szemantikát követ, mert az egyik „elengedett tartozás”
(legitim véglegesítés), a másik „nincs előleg” (maga a kapcsoló
felesleges)).

### 5. Bekapcsoláskor üres, azonnal fókuszált mező, nincs előtöltés

A kapcsoló bekapcsolásakor az előleg-összeg mező ÜRESEN, azonnali
fókusszal jelenik meg — nincs `0`/alapérték/százalék-alapú előtöltés
(D517).

**Miért:** D517 explicit ezt kéri — a mai `ELOLEG_ALAP_SZAZALEK`
(50%) előtöltés a százalék-modell velejárója volt; egy abszolút
összegnél nincs értelmes alapérték (a végösszeg fele? egy kerek szám?)
— a redesign szándékosan üresen hagyja, hogy a doki tudatosan gépelje
be a valódi összeget.

### 6. Validáció csak blur/véglegesítési kísérlet után

A kötelező-mező hiba (bekapcsolt kapcsoló, üres összeg) csak blur vagy
véglegesítési kísérlet UTÁN jelenik meg, nem azonnal bekapcsoláskor
(D518).

**Miért:** D518 explicit ezt kéri, ugyanazzal az indokkal, mint a 63.
tétel 5. döntése (a frissen bekapcsolt, üres mező nem hibaállapot).

### 7. PDF és sablon-placeholder összeg-alapúra igazítása

A PDF összegző sora (`pdf/labels.ts` `elolegSor`) és a fizetési
feltételek sablon `{{elolegSzazalek}}` helyőrzője összeg-alapú
megfogalmazásra vált (pl. `Előleg (X Ft)` a `Előleg (X%)` helyett; a
sablon-placeholder neve/tartalma a megvalósító döntése, de a
KIMENETI SZÖVEG a doki elé kerülő, aláírandó dokumentumban mostantól
konkrét összeget mond, nem százalékot).

**Miért:** ez a százalék→összeg átállás (1. döntés) elkerülhetetlen
következménye — a nyomtatványnak konzisztensnek kell lennie a
szerkesztő adatmodelljével.

**Fontos, mit ELLENŐRIZNI kell a megvalósításkor:** a mai
`TervDocument.tsx:402-404` kikapcsolt kapcsolónál is az 50%-os
alapértékre esik vissza a sablonszövegben (hogy a fizetési feltételek
prózája ne mondjon ellent az 1. oldalnak) — az összeg-alapú
átállás után is szükség lehet egy hasonló, „mit mondjon a szöveg, ha
nincs bekapcsolva előleg” szabályra, amit a megvalósító dönt el a
sablon-szöveg tényleges átfogalmazásakor.

### 8. Pénznemenkénti külön állapot (D488) — a 62. tételre épül

Az előleg ÖNÁLLÓ állapotot (enabled + amount) tart mindkét pénznemre —
VÁRAKOZÓ a 62. tétel (DP-045) elkészültéig, ugyanazon indokkal, mint a
63. tétel 6. döntése.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az Egyedi végösszeg saját, párhuzamos döntései — 63. tétel (DP-046).
- A pénznemenkénti dual-state alap-architektúra — 62. tétel (DP-045),
  ez a tétel csak FOGYASZTÓJA (8. döntés).
- A PDF fizetési feltételek sablon TARTALMÁNAK (a szöveg egésze)
  jogi/nyelvi lektorálása — ez nem ennek a tételnek a hatóköre, csak a
  `{{elolegSzazalek}}`-hez hasonló placeholder technikai átalakítása.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Plan.elolegSzazalek` — mezőnév/szemantika
  átalakítása (1. döntés); a mai `docs/02` indoklás átírása.
- `app/src/domain/totals.ts` `elolegOsszegek()`, `ELOLEG_ALAP_SZAZALEK`
  — a számítási logika átalakítása abszolút összegre (1., 2., 3.
  döntés).
- `app/src/pages/PlanEditorPage.tsx` `ElolegBlokk` (`:1169-1236`) —
  teljes UI-átalakítás (2–6. döntés).
- `app/src/domain/veglegesitesOr.ts` — új hard block a deposit>final
  esetre (2. döntés).
- `app/src/pdf/labels.ts` `elolegSor`, `app/src/pdf/TervDocument.tsx:
  402-404`, `app/src/storage/seed/templates.ts:54,95` — a
  `{{elolegSzazalek}}` placeholder és a PDF-felirat átalakítása (7.
  döntés).
- `app/src/domain/piszkozat.ts:52,55` — a dirty-detektálás mezőnév-
  frissítése (1. döntés mellékhatása).
- `app/src/storage/seed/plans.ts` — a demó-adatkészlet érintett
  `elolegSzazalek` értékeinek átalakítása abszolút összegekre.

## Tesztelés (irányadó, nem kimerítő)

- Az előleg mostantól abszolút összeg mezőként jelenik meg, %-jel
  nélkül.
- Bekapcsoláskor a mező üresen, azonnali fókusszal jelenik meg.
- Az előleg összege a végösszeg fölé eshet sormódosítás után — ilyenkor
  inline hard error jelenik meg, a fennmaradó rész „—”, véglegesítés
  blokkolva.
- Deposit = final esetén a fennmaradó rész explicit `0`.
- `0` összeg beírása után blur/Enter-re a kapcsoló automatikusan
  kikapcsol, a mező eltűnik.
- A PDF és a fizetési feltételek szövege összeget mond, nem
  százalékot.
