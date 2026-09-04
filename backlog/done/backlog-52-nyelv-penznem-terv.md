# Backlog 52. tétel — Dokumentumnyelv és pénznem kiválasztása / öröklése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 52. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-031
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D59`, `D532`–`D534`, `C2`–`C4` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával
és NEM azonosak a `docs/01` D21-gyel (nyelv/pénznem függetlensége),
amire ez a tétel több ponton hivatkozik.

**Két user-döntés ebben a tételben** (a redesign C2/C4 pontjai
ütköztek egy már leszállított, dokumentált viselkedéssel — a felhasználó
mindkettőt a redesign iránya mellett döntötte el, lásd a 2. és 4.
döntést).

**Kapcsolódó, korábban nyitott tételek:** a 47. tétel (DP-021) 2.
döntése és a 48. tétel (DP-022) 5. döntése mindketten VÁRAKOZÓ-ként
hagyták a nyelv/pénznem-zárolás sorsát, erre a tételre mutatva — ez a
dokumentum oldja fel mindkettőt (lásd az 5. döntést).

## Probléma

- **`locked = plan.tervId !== ''`** (`app/src/pages/PatientPage.tsx:59`)
  — ez pontosan a „mentés” (=véglegesítés) utáni zárolás, mert
  `tervId`-t kizárólag `storage.savePlan()` tölt ki
  (`PreviewPage.tsx:351`, `doFinalize`-on belül). Új lánc/Másolás
  mindig `tervId: ''`-re nyit (unlocked); az EGYETLEN ténylegesen
  zárolt eset a „Új verzió” (`loadPlanIntoDraft` megtartja a
  `tervId`-t, `AppState.tsx:344–365`) — a C3 gyakorlati hatóköre tehát
  ennél az egy útnál jelentkezik.
- **`applyPenznem` minden sort töröl** pénznemváltáskor
  (`PatientPage.tsx:92–105`), megerősítő dialógussal, ha van sor
  (`:295–325`, a sorok száma explicit kiírva a szövegben).
- **A `nemetEngedelyezve` funkciókapcsoló** ma egy valódi, doki által
  látható és tesztelt Beállítások-checkbox (`EgyebTab.tsx:126–133`,
  „Német nyelvű ajánlat engedélyezése”), ami gátolja: a `PatientPage.tsx`
  nyelv/pénznem-kártya megjelenését (`:54`, `showLangCard`), a
  `blankPlan.ts:40` alapnyelv-választását, és a `NyomtatvanyokTab.tsx`
  HU/DE sablon-nyelvváltóját (`:127–132,251`).
- **`formatMoney(value, currency)`/`formatPrice(ar, currency)`**
  (`domain/money.ts:13,26`) ténylegesen CSAK pénznemet kap: EUR mindig
  `de-DE` locale-lal formáz, HUF mindig `hu-HU`-val — FÜGGETLENÜL
  `plan.nyelv`-től. A `docs/04-nyomtatvany-spec.md:356–357` és a
  `CLAUDE.md` segédfüggvény-leírása (`formatMoney(value, currency)`)
  explicit ezt a viselkedést írja elő, D21-re hivatkozva: „A formátum a
  pénznemtől függ, nem a nyelvtől”.
- **Van precedens a nyelvfüggő formázásra**: `domain/date.ts:23,29–36,
  44–47` — `formatLongDate(isoDate, nyelv)` már kötelező (nem
  defaultos) `nyelv` paramétert kap, `LONG_DATE_LOCALE: Record<Nyelv,
  string>` map-pel.

## Döntések

### 1. A `nemetEngedelyezve` funkciókapcsoló TELJES eltávolítása (C2, user-döntés)

A `nemetEngedelyezve` mező és minden rá épülő feltétel megszűnik: a
`Settings` típusból, a seedből, a `blankPlan.ts:40` feltételes
nyelv-választásból, a `PatientPage.tsx:54` `showLangCard`-ból (mindig
igaz lesz — a kártya mindig látszik), az `EgyebTab.tsx` checkboxából és
a hozzá tartozó gate-ekből, valamint a `NyomtatvanyokTab.tsx` HU/DE
sablon-nyelvváltó gate-jéből. A német „készültség-összefoglaló” (DE
név-lefedettség, EUR ár-lefedettség, nyilatkozat placeholder-státusz)
MARAD látható, gate nélkül.

**Miért:** C2 explicit ezt kéri — a német nyelv mindig választható, a
hiányos/lektorálatlan tartalom kezelése finalizációs figyelmeztetés
(a `docs/06-arlista-import.md` már dokumentált „HU jelvény + finalizáció
előtti figyelmeztetés” elve), nem elrejtett funkció. Egy már létező
német terv szerkeszthetősége ma sem függhetne egy később kikapcsolt
globális kapcsolótól — a mai `plan.nyelv === 'de'` escape-hatch
(`PatientPage.tsx:52–54` kommentje) pont ezt a problémát kerülgeti egy
workaround-dal, amit a flag megszüntetése feleslegessé tesz.

**Elvetett alternatíva:** csak a `PatientPage.tsx` gate eltávolítása, a
Beállítások checkbox életben hagyása funkció nélkül — elvetve; egy
látszólag működő, de valójában semmit nem kapcsoló UI-elem
megtévesztő lenne a dokinak.

**Hatás a tesztekre:** `PatientPage.test.tsx:68,75` (a kártya
láthatóságát a flaghez kötő tesztek) törlendők/invertálandók;
`SettingsPage.test.tsx:208,219` (a checkbox viselkedését assertáló
tesztek) törlendők. A többi, flaget csak SEED-ként használó teszt
(`PlanEditorPage.test.tsx`, `PreviewPage.test.tsx`, `App.test.tsx`,
`domain/piszkozat.test.ts`, `domain/planCopy.test.ts`,
`domain/ujVerzioDatum.test.ts`) csak egyszerűsödik (a felesleges
`nemetEngedelyezve: true` seed-mező eltűnik a fixture-ökből).

### 2. A `locked` zárolás feloldása a teljes piszkozat-életciklusra (C3)

A nyelv/pénznem-kártya a `plan.tervId !== ''` feltételtől függetlenül
MINDIG a szerkeszthető (chip-es) állapotát mutatja — a statikus,
„nem módosítható (D4)” szöveges ág megszűnik. A gyakorlati hatás az
„Új verzió” útvonalon jelentkezik (ez az EGYETLEN eset, ahol a mai
`locked` igazra értékelődik ki egy draftra).

**Miért:** C3 explicit ezt kéri — a nyelv és pénznem a TELJES
piszkozat-életciklus alatt módosítható, kizárólag a `Terv adatai`
lépésen; a technikai autosave/mentés nem fagyasztja ezeket az
értékeket, csak a VÉGLEGESÍTÉS hozza létre az immutable
pillanatképet. Egy MÁR véglegesített verzió (nem draft) eleve nem
szerkeszthető ezen a lapon, mert nincs is rajta UI — a `Terv részletei`
read-only nézet (redesign-javaslat DP-060) a helyes hely egy lezárt
verzió megtekintésére, nem ez a lap.

**Elvetett alternatíva:** a zárolást megtartani, de csak egy
figyelmeztetéssel feloldani — elvetve; C3 explicit „szabadon
módosítható”-t kér, nem korlátozott feloldást.

### 3. A pénznemváltás sor-törlő viselkedése VÁLTOZATLAN marad

A MEGLÉVŐ `applyPenznem` (minden sor törlődik pénznemváltáskor) és a
MEGLÉVŐ megerősítő dialógus (a sorok száma explicit kiírva) a 2. döntés
után „Új verzió” drafton is ugyanígy fut — nem kap külön, enyhébb
kezelést annak ellenére, hogy itt akár sok, korábban véglegesített
sor is elveszhet.

**Miért:** egy tényleges kettős-pénznem-állapot (ami lehetővé tenné a
sorok megőrzését pénznemváltáskor, mindkét pénznem külön tárolt
áraival) a redesign D483–D531 „mindkét currency állapota egyszerre
tárolva” modellje — ez a redesign-javaslat DP-045 (Többpénznemes
árazás) hatóköre, nem ezé. A MEGLÉVŐ megerősítő dialógus (ami pontosan
megmondja, hány sor törlődik) elégséges védelem addig, amíg a
DP-045 nem épül meg — a doki tudatos döntést hoz, nem véletlen
adatvesztésről van szó.

**Elvetett alternatíva:** a pénznemváltást „Új verzió” drafton
egyszerűen letiltani, ha vannak sorok — elvetve; ez egy új, a
redesign által nem kért blokkoló szabályt vezetne be, és
ellentmondana a 2. döntés „teljes életciklus alatt szabadon
módosítható” elvének.

### 4. A pénzformátum a nyelvtől ÉS a pénznemtől együtt függjön (C4, user-döntés)

`formatMoney`/`formatPrice` új, KÖTELEZŐ (nem defaultos) `nyelv`
paramétert kap — a MEGLÉVŐ `formatLongDate(iso, nyelv)` mintájára. A
négy kötelező kombináció a C4 táblázata szerint formáz: HU+HUF
`1 234 567 Ft`, HU+EUR `1 234,56 €`, DE+HUF `1.234.567 Ft`, DE+EUR
`1.234,56 €`. A `hu-HU` Intl négyjegyű-szám-elválasztó-hiánya (`5000
Ft`, nem `5 000 Ft`) a HU-ágon MEGŐRZENDŐ — ez ma tudatosan dokumentált,
tesztelt viselkedés (`domain/money.test.ts`), nem mellékesen javítandó
hiba.

**Miért:** C4 explicit ezt a négy kombinációt kéri, és a redesign
forrásai (DP-031 Source: „C2–C4”) direkt hivatkoznak rá. A
`formatLongDate` MÁR MA IS pontosan ezt a mintát követi
(kötelező `nyelv` paraméter, hogy egy kihagyott hívási hely fordítási
hibaként bukjon ki, ne csendes hibás formátumként) — ez nem egy új
minta bevezetése, hanem egy MEGLÉVŐ, bevált minta követése egy másik
segédfüggvényen.

**Elvetett alternatíva:** a mai, csak pénznemtől függő formátumot
megtartani (a D21/`docs/04` jelenlegi szövege) — a user ezt explicit
elvetette C4 mellett döntve.

**Fontos, hogy a megvalósítás NE változtasson többet, mint amit C4
kér:** a HU+HUF és DE+EUR kombináció ma VÉLETLENÜL helyes eredményt ad
(a jelenlegi kód épp ezt a két esetet fedi le) — a `hu-HU` Intl
4-jegyű-szám-viselkedése (`money.test.ts`-ben dokumentált) ezen az
ágon MEGŐRZENDŐ, nem egy új, „mindig teljes ezres tagolás” szabály
bevezetésének az alkalma.

**Hatás a dokumentációra:** a `docs/04-nyomtatvany-spec.md`
„Számformátum” táblázata és a `CLAUDE.md` segédfüggvény-leírása
(„formátum a pénznemtől függ, nem a nyelvtől”) a tétel lezárásakor
átírandó, az érintett D21-es állítással együtt.

**Hatás a hívási helyekre:** `pdf/TervDocument.tsx`, `PlanEditorPage.tsx`,
`PreviewPage.tsx`, `PatientPlanChains.tsx`, `PriceListAdminPage.tsx`,
`planEditor/ItemPicker.tsx` — mindegyik ismeri a `plan.nyelv`-et (vagy
egy azzal egyenértékű kontextust) a hívás pillanatában, tehát a
paraméter átadása mechanikus, nem igényel új adatfolyamot.

### 5. Nyelv/pénznem öröklése új láncnál (D534) — a 47. tétel VÁRAKOZÓ döntésének feloldása

Meglévő pácienshez induló ÚJ LÁNC a legutóbb véglegesített terv
nyelvét/pénznemét örökli; első tervnél a globális defaultok
érvényesek. Ez a 47. tétel (DP-021) 2. döntésének tartalma — ott
VÁRAKOZÓ maradt, mert a zárolás (`locked`) akkoriban blokkolta volna a
gyakorlati hasznát; a 2. döntés (ebben a tételben) most teszi
végrehajthatóvá, mert a doki az örökölt értéket a „Terv adatai” lépésen
akkor is módosíthatja, ha időközben a láncnak lenne is `tervId`-je
(bár egy vadonatúj láncnál ez nem is releváns, mert ott a `tervId`
mindig üres).

**Miért:** rögzítés — az öröklési LOGIKA maga (a `createBlankPlan`/
`ujTervForrasPaciensbol` bővítése) a 47. tétel hatóköre marad, ez a
tétel csak megerősíti, hogy a nyelv/pénznem-kártya UI-ja innentől nem
akadályozza az örökölt érték utólagos módosítását.

### 6. Csak a „Terv adatai” lépésen módosítható (D532/D533) — rögzítés

A nyelv és pénznem KIZÁRÓLAG a „Terv adatai” workflow-lépésen
módosítható; nincs globális quick-switch a munkatérben, nincs
runtime-váltás a „Kezelések” lépésen.

**Miért:** ez a mai, helyes viselkedés — `PatientPage.tsx` az EGYETLEN
hely, ami `plan.nyelv`/`plan.penznem`-et ír (`:73,95`). Rögzítés, mert
D532/D533 explicit ezt a korlátozást kéri, és a redesign a „Kezelések”
oldali gyorsváltást explicit low-priority backlogként (D532
zárómondata) jelöli, nem ennek a tételnek a hatóköreként.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A redesign D483–D531 „mindkét pénznem állapota egyszerre tárolva”
  dupla-state modellje (offered ár, custom final, deposit
  pénznemenkénti tárolása) — redesign-javaslat DP-045; ez a tétel a MAI
  egy-pénznemes `Plan.penznem` modellen belül old fel mindent, a sorok
  törlése (3. döntés) marad, amíg a DP-045 meg nem épül.
- A „Terv adatai” lap többi szekciója (cím, dátumok, páciens snapshot) —
  51. tétel (DP-030).
- Az orvos-választó — 53. tétel (DP-032).
- A `formatCentForInput` (`domain/money.ts:66–71`) — ez egy admin
  BEVITELI mező formázója (EUR ár szerkesztése az Árlista adminban),
  nem dokumentum-kimenet; a C4 hatóköre a nyomtatvány/kijelzés
  formázása, nem az adminfelület beviteli mezői.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Settings` — `nemetEngedelyezve` mező
  törlése (1. döntés).
- `app/src/storage/seed/settings.ts` — a törölt mező eltávolítása a
  seedből (1. döntés).
- `app/src/domain/blankPlan.ts:40` — feltétel nélküli
  `settings.alapertelmezettNyelv` használat (1. döntés).
- `app/src/pages/PatientPage.tsx` — `showLangCard` eltávolítása
  (mindig igaz), a `locked` ág megszüntetése (1–2. döntés).
- `app/src/pages/settings/EgyebTab.tsx` — a checkbox és a hozzá tartozó
  gate-ek eltávolítása, a német készültség-blokk feltétel nélkülivé
  tétele (1. döntés).
- `app/src/pages/settings/NyomtatvanyokTab.tsx:127–132,186,251` — a
  HU/DE nyelvváltó és a sablon-betöltés feltétel nélkülivé tétele (1.
  döntés).
- `app/src/domain/money.ts` `formatMoney`/`formatPrice` — új, kötelező
  `nyelv` paraméter (4. döntés).
- `app/src/domain/date.ts` `formatLongDate` — mintaként hivatkozott,
  nem módosul (4. döntés indoklása).
- `docs/04-nyomtatvany-spec.md` „Számformátum” táblázat, `CLAUDE.md`
  segédfüggvény-leírás — átírandó a lezáráskor (4. döntés).

## Tesztelés (irányadó, nem kimerítő)

- A nyelv/pénznem-kártya MINDIG látszik, `nemetEngedelyezve`-től
  függetlenül (mert a mező már nem is létezik).
- Egy „Új verzió” útvonalon nyitott draft nyelve/pénzneme szabadon
  módosítható, statikus/zárolt szöveg nélkül.
- Pénznemváltás „Új verzió” drafton is törli a sorokat, a MEGLÉVŐ
  megerősítő dialógussal, sorok száma kiírva.
- `formatMoney`/`formatPrice` mind a négy kombinációra (HU+HUF, HU+EUR,
  DE+HUF, DE+EUR) a C4 táblázata szerinti kimenetet adja; a HU+HUF
  4-jegyű szám elválasztó nélkül marad (`5000 Ft`).
- Egy meglévő pácienshez induló új lánc a legutóbbi véglegesített terv
  nyelvét/pénznemét örökli, de a doki utólag szabadon módosíthatja.
- A nyelv/pénznem továbbra sem módosítható sehol máshol, csak a „Terv
  adatai” lépésen.
