# Backlog 47. tétel — Új kezelési terv (új lánc) inicializálása — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 47. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-021
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D7`, `D25`–`D28`, `D45`, `D534`–`D535`, `D539` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

Ma minden „új lánc" (`createBlankPlan`, `app/src/domain/blankPlan.ts:27–73`)
egységesen indul, függetlenül attól, hogy a pácienshez van-e korábbi,
véglegesített terve:

- **`nyelv`**: `settings.nemetEngedelyezve ? settings.alapertelmezettNyelv
  : 'hu'` (`blankPlan.ts:47`) — a GLOBÁLIS beállításból, sosem a páciens
  korábbi tervéből.
- **`penznem`**: MINDIG `'HUF'` (`:48`, szándékosan nyelvtől független,
  lásd a fájl saját kommentje `:35–39`) — szintén nem örökölt.
- **`orvos`**: `settings.orvosok[0] ?? ''` (`:53`) — a `Settings.orvosok`
  egy sima `string[]` (`domain/types.ts:243–250`), NINCS aktív/inaktív
  jelölés, és a mai kódban SEHOL nincs UI, ami ezt a mezőt egy konkrét
  terven módosítaná (grep: kizárólag `blankPlan.ts:53` ír bele, olvasói a
  PDF sablon és az aláírás-blokk).
- **Tervcím**: a `Plan` típuson NINCS címmező (`domain/types.ts:119–168`).
  A megjelenített címke élő javaslat (`javasoltTervCim()`,
  `domain/tervCim.ts:16–51`, a domináns kategória neve), amíg a doki kézzel
  át nem írja (`terv-cimke.json`, a plan-mappa gyökerén, a
  verziómappákon KÍVÜL).
- A `planUjPaciensselTervhez`/`planUjTorzsadattal` (`domain/planCopy.ts:
  20–26, 35–45`) mindkettő `createBlankPlan()`-ra épül, tehát a fenti
  minden hiányosságot öröklik — csak a `paciens`/`paciensId` blokkot
  viszik át.
- Üres terv-lista first-plan CTA (`PatientDetailPage.tsx:235–251`,
  `PatientPlanChains.tsx:385–399`) MÁR MŰKÖDIK — ez a rész nem hiányzik,
  csak rögzítendő, hogy ez a tétel nem bontja meg.

## Döntések

### 1. Új lánc azonosító/állapot mezői — rögzítés, nincs változás

Egy új lánc `tervId: ''`/`verzio: 0`/`statusz: 'PISZKOZAT'` értékekkel
indul, a tényleges `tervId`/`verzio` kiosztása storage-oldalon,
véglegesítéskor történik (D4/D7 — MÁR MA IS ez a viselkedés,
`blankPlan.ts:44–46`, `DemoStorage.ts:503`).

**Miért:** ez a mai, helyes viselkedés — a döntés csak azért kerül ide,
hogy a 48./49. tétel (Új verzió / Másolás) explicit tudja hivatkozni,
mi az „új lánc" alapállapota, amihez képest eltérnek.

### 2. Nyelv/pénznem öröklése a páciens legutóbbi VÉGLEGESÍTETT tervéből

Meglévő pácienshez induló új lánc a doki által látott legutóbb
véglegesített terv-lánc legfrissebb `VEGLEGES` verziójának
`nyelv`/`penznem` értékét örökli; ha a pácienshez még nincs egyetlen
véglegesített terve sem, a globális defaultok (`settings.alapertelmezettNyelv`,
mindig `HUF`) érvényesek (D534).

**Miért:** D534 explicit ezt kéri; egy visszatérő páciensnek, akivel
korábban németül/EUR-ban tárgyalt a doki, nem logikus, hogy az új lánc
csendben visszaváltson magyar/HUF alapértékre — ez felesleges,
elfelejthető átállítást ró a dokira minden alkalommal.

**Elvetett alternatíva:** a legutóbbi PISZKOZAT (nem csak VEGLEGES)
verzióból örökölni — elvetve, mert egy elvetett/félbehagyott piszkozat
nyelve/pénzneme nem feltétlenül tükrözi a doki és a páciens közötti
tényleges, érvényes megállapodást; a véglegesített verzió az egyetlen
megbízható „utoljára ebben állapodtunk meg" forrás.

### 3. Orvos mindig az aktuális globális default aktív orvos, sosem örökölt

Egy új lánc orvosa MINDIG a globális default aktív orvos, függetlenül
attól, ki kezelte a pácienst korábban (D535).

**Miért:** D535 explicit ezt kéri; egy új terv-lánc jellemzően egy új
konzultáció, nem feltétlenül ugyanaz az orvos folytatja — a legutóbbi
orvos automatikus öröklése hibás alapértéket adna, ha időközben orvost
váltottak.

**Függőség:** az „aktív/inaktív orvos” és a „globális default orvos”
fogalma MA NEM létezik (`Settings.orvosok: string[]`, nincs aktív jelölés,
nincs default-jelölés) — ennek a döntésnek a TÉNYLEGES végrehajtása a
48. tétel (DP-022) 6. döntésével együtt az orvos-törzs bevezetésére vár
(redesign-javaslat DP-032). Ez a tétel csak az ELVET rögzíti; amíg
DP-032 nincs kidolgozva, a mai `settings.orvosok[0]` marad a de facto
„default”.

### 4. Tervcím: nincs tárolt generált cím, az élő javaslat marad az alapértelmezés

Ez a tétel explicit ELVETI a D26 „generált tervnév `YYYY.MM.DD –
Kezelési terv`, azonnal tárolva” döntését. A megjelenített cím továbbra
is a MÁR MEGLÉVŐ `javasoltTervCim()` élő javaslata (a terv domináns
kategóriája) marad, `terv-cimke.json` nélkül, amíg a doki kézzel át nem
írja — ezen a tételen belül SEMMI nem változik ebben a mechanizmusban.
A „Terv adatai” lépés szerkeszthető címmezője a redesign-javaslat
DP-030 hatóköre, nem ezé.

**Miért (user-döntés):** a kategórianév (pl. „Fogpótlás”) lényegesen
több információt hordoz egy sok láncú páciens listájában, mint egy
dátumbélyeg — a dátum egyébként is látszik a lánc-fejlécen (46. tétel).
Egy azonnal tárolt, dátumos cím a D28 „új verzió megtartja a lánc
címét, másolat friss dátumos címet kap” szabályát is feleslegesen
bonyolítaná, miközben a mai kategória-alapú javaslat ezt a
megkülönböztetést magától, tárolás nélkül biztosítja (egy másolat új
lánc → saját élő javaslata a saját tartalmából számol).

**Elvetett alternatíva:** D26 szerinti tárolt, dátumos generált cím —
elvetve, lásd fent; a döntés helye és indoklása a végleges `docs/01`
D-táblába kerül a tétel lezárásakor.

### 5. Páciens-pillanatkép forrása változatlan

Az új lánc páciens-pillanatképének forrása a MEGLÉVŐ
`ujTervForrasPaciensbol()` (`app/src/state/planIndulas.ts:14–40`,
D33) — lezárt törzsadat elsőbbséggel, egyébként a legutóbb módosított
terv-lánc legfrissebb pillanatképe. Ez a tétel ezen nem változtat.

**Miért:** ez már a projekt egyik konszolidált, egységesen hívott
segédfüggvénye (lásd CLAUDE.md „Meglévő segédfüggvények” — a 39.
tétel/D45 óta stabil) — újraírása vagy megkerülése ide nem indokolt.

### 6. Üres terv-lista first-plan CTA — rögzítés, nincs változás

A páciens-részletoldal „Kezelési tervek” tabjának üres állapota (nincs
egyetlen olvasható terv-verzió sem) MÁR MA IS „Új terv” CTA-t mutat a fa
helyett (D45, `PatientDetailPage.tsx:235–251`, `PatientPlanChains.tsx:
385–399`).

**Miért:** ez a mai, helyes viselkedés — csak azért kerül ide
rögzítésként, hogy a tétel lezárásakor egyértelmű legyen: ez a
redesign-döntés MÁR TELJESÜL, nem ennek a munkának a terméke.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- „Terv adatai” oldal layout + szerkeszthető címmező — redesign-javaslat
  DP-030.
- Nyelv/pénznem kiválasztó UI és a `tervId !== ''` alapú zárolás sorsa —
  redesign-javaslat DP-031.
- Orvos-törzs (aktív/inaktív jelölés, választó UI, deaktiválási szabály,
  D540/D544) — redesign-javaslat DP-032; ez a tétel csak az öröklési
  ELVET rögzíti (3. döntés).
- Az „Új verzió” (48. tétel) és a „Másolás új tervként” (49. tétel)
  saját öröklési szabályai — ezek a tétel csak az ÚJ LÁNC indítás
  (a négy terv-létrehozási útból a „Vadonatúj páciens”/„Meglévő páciens
  keresése”/páciensszintű „Új terv” hármas) viselkedését rögzíti.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/blankPlan.ts` `createBlankPlan()` — a nyelv/pénznem
  öröklési forrás bővítése (2. döntés); jelenleg csak `Settings` +
  `PriceList` paramétert kap, bővülhet egy opcionális „forrás terv”
  paraméterrel.
- `app/src/domain/planCopy.ts` `planUjPaciensselTervhez`/
  `planUjTorzsadattal` — a bővített `createBlankPlan()` meghívása a
  helyes forrás-verzióval.
- `app/src/state/planIndulas.ts` `ujTervForrasPaciensbol()` — bővítés a
  „legutóbbi véglegesített terv nyelve/pénzneme” lekérdezéséhez (2.
  döntés); ma csak a `paciens` blokkot adja vissza.
- `app/src/domain/types.ts` `Settings` — orvos-törzs bővítés helye, ha a
  DP-032 megvalósul (3. döntés függősége, nem ennek a tételnek a munkája).

## Tesztelés (irányadó, nem kimerítő)

- Véglegesített (EUR/DE) tervvel rendelkező páciensnél induló új lánc
  EUR/DE-vel indul, nem HUF/HU-val.
- Csak PISZKOZAT (soha nem véglegesített) tervű páciensnél induló új
  lánc a globális defaultra esik vissza, nem a piszkozat nyelvére.
- Vadonatúj páciensnél induló első lánc a globális defaultokkal indul.
- Az induló lánc orvosa mindig a mai `settings.orvosok[0]` (amíg a
  DP-032 nincs kidolgozva), nem a páciens korábbi tervének orvosa.
- A megjelenített terv-cím továbbra is élő javaslat, `terv-cimke.json`
  nélkül, amíg a doki kézzel át nem írja.
- Az üres terv-lista first-plan CTA változatlanul működik.
