# Backlog 49. tétel — Másolás új tervként — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 49. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-023
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D25`, `D140`–`D147`, `D260`, `D482`–`D486`, `D538`, `D555` a redesign
saját D1–D606 számozásából valók — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A mai „Másolás új tervbe” (`planMasolatKent()`, `app/src/domain/
planCopy.ts:54–63`) egyetlen, mindent-átvivő transzformáció:

- **`arlistaVerzio` és minden ár-/névsnapshot VÁLTOZATLANUL átjön** —
  a függvény nem is kap `PriceList` paramétert. Semmi nem frissül az
  aktuális árlistából (D140 ezt kérné a default-following tételekre).
- **Nincs „default-following vs. kézi felülírás” FLAG a soron.**
  A `Sor` típuson (`domain/types.ts:82–104`) egyetlen explicit override-
  jelző létezik: `mennyisegKezi?: boolean` (a mennyiség fogak-követése).
  Az ár felülírása NEM jelölt — `listaEgysegar` vs. `tenylegesEgysegar`
  eltérése csak IMPLICIT jelzi a kedvezményt (`PlanEditorPage.tsx:
  790–795` zöld `−X%` badge). A név/leírás felülírása szintén nem
  flag, hanem összehasonlítással derül ki (`nevKoveti`/`leirasKoveti`,
  `domain/nev.ts:30–33,116–119`). **Tehát a „default-following értékek
  frissítése, kézi felülírások megtartása” (D140) megvalósításához
  előbb egy tényleges override-modell kell** — ez ma nem létezik.
- **Inaktív tételek másolásakor nincs semmilyen jelzés** — egy `aktiv:
  false` tételre hivatkozó sor (D17: törlés helyett inaktiválás) a
  másolatban ugyanúgy néma marad, mint az eredetiben.
- **A páciens-pillanatkép** MÁR MA IS az élő masterből készül (a forrás
  verzió `paciens` blokkja helyett) — ezt a MEGLÉVŐ
  `ujTervForrasPaciensbol()` biztosítja, DE csak a `PatientPlanChains.tsx`
  „+ Új terv” gombján keresztül, NEM a „Másolás új tervbe” úton: az
  utóbbi (`copyVersion`, `:160–179`) közvetlenül a `plan.paciens`
  pillanatképet másolja (D25 kettős elve: „a szakmai tartalmat a
  KIJELÖLT verzióból, a páciensadatot az ÉLŐ masterből” — a mai kód
  csak az elsőt teljesíti).
- **Orvos**: a másolat a forrás `orvos` mezőjét viszi át
  (`planMasolatKent` `:60`, a `frissDatummal`-on át öröklődő mezők
  között) — nincs „mindig az aktuális globális default” logika (D538).
- **„Csak ajánlat”**: ma nincs a `Plan`-en (lásd 48. tétel Probléma),
  tehát „nem öröklődik” (D555) triviálisan teljesül, de csak azért, mert
  nincs mit örökíteni.
- **Historical másolás figyelmeztetése (D260)**: nincs — a doki egy
  régi verziót ugyanúgy másolhat, mint a legfrissebbet, jelzés nélkül,
  hogy időközben újabb verzió is született.
- Ami MÁR MA IS helyes: új lánc jön létre (`tervId: '', verzio: 0,
  statusz: 'PISZKOZAT'`, `planCopy.ts:58`), az `osszesitok` a saját
  (átvett) soraiból ÚJRASZÁMOLVA indul, nem a forrás mentett értékének
  másolata (`:59`, D7 elv), és a navigáció a `Páciens adatlapra` megy
  (`copyVersion:179`, `/paciens`), nem az szerkesztőbe.

## Döntések

### 1. Új lánc — rögzítés, nincs változás

A „Másolás új tervbe” mindig ÚJ terv-láncot hoz létre a MEGLÉVŐ
páciens-mappában (D25) — ez a mai, helyes viselkedés.

**Miért:** rögzítés a többi döntés kontextusához; ez a mechanizmus
különbözteti meg a „Másolás új tervbe”-t az „Új verzió”-tól (48. tétel).

### 2. Default-following árlistaértékek frissülnek az aktuálisra, kézi felülírások megmaradnak

A másolat a szakmai struktúrát (fázisok, sorok, fogak, mennyiség,
kézi felülírt ár/név/leírás) megtartja, de azokat a sorokat, amik a
forrás verzióban PONTOSAN követték az akkori árlistát (ár ÉS név ÉS
leírás is egyezett a tétel akkori adataival), az AKTUÁLIS árlista
adataira frissíti — a másolat `arlistaVerzio`-ja az aktuális árlistáé
lesz (D140).

**Miért:** D140 explicit ezt kéri; a „Másolás új tervbe” tipikus
használati esete egy A/B alku-változat vagy egy régebbi ajánlat
felfrissítése — ha időközben az árlista változott, a doki valószínűleg
azt akarja, hogy az ÚJ ajánlat az ÚJ árakat tükrözze azokon a sorokon,
amiket nem szerkesztett kézzel; a kézzel módosított sorokat viszont nem
szabad csendben felülírni.

**Elvetett alternatíva:** minden sort változatlanul másolni (a mai
viselkedés) — elvetve, D140 explicit ezt a frissítést kéri, és a doki
számára megtévesztő, ha egy „friss” másolat elavult árakat tartalmaz.

**Kemény függőség:** ehhez a döntéshez EGY VALÓDI „default-following
vs. kézi felülírás” állapotmodell szükséges a soron — ez ma nem
létezik (lásd Probléma). Ez a döntés VÁRAKOZÓ, a redesign-javaslat
DP-044 (Árlista snapshot és explicit refresh) kidolgozása és a hozzá
tartozó `Sor`-bővítés után hajtható végre. Amíg DP-044 nincs kidolgozva,
a mai „minden változatlanul átjön” viselkedés marad ideiglenesen
érvényben.

### 3. Új páciens-pillanatkép az élő masterből, a forrás pillanatképe csak fallback

A „Másolás új tervbe” a páciens-blokkot az ÉLŐ masterből
(`paciens-adatok.json`, ha van) veszi, NEM a forrás verzió
pillanatképéből — a forrás pillanatképe csak akkor marad érvényben, ha
a pácienshez nincs lezárt törzsadat (D25).

**Miért:** D25 explicit ezt kéri; a másolás időpontjában a doki
valószínűleg a PÁCIENS JELENLEGI adatait (pl. friss telefonszám, új
cím) akarja az új ajánlatba tenni, nem egy hónapokkal korábbi
pillanatképet.

**Megvalósítás iránya:** a MEGLÉVŐ `ujTervForrasPaciensbol()`
forrás-kiválasztási logikájának (`state/planIndulas.ts:14–40`, D33)
alkalmazása erre az útvonalra is — a `copyVersion` (`PatientPlanChains.tsx:
160–179`) ma közvetlenül `planMasolatKent(plan, ...)`-ot hív; ehelyett a
páciens-blokkot a masterből (vagy a törzsadat hiányában a forrás
`plan.paciens`-ből, fallbackként) kell összeállítani.

**Elvetett alternatíva:** a forrás verzió pillanatképét megtartani (a
mai viselkedés) — elvetve, D25 explicit kéri az élő szinkront; ez az
egyetlen pont, ahol a „Másolás új tervbe” ELTÉR a D7 tiszta
pillanatkép-elvtől, mert itt kifejezetten az ÉLŐ adat a cél.

### 4. Aktuális globális default orvossal indul, a forrás orvosa nem másolódik

A másolat orvosa mindig az aktuális globális default orvos, a forrás
verzió orvosától FÜGGETLENÜL (D538).

**Miért:** D538 explicit ezt kéri, ugyanazzal az indoklással, mint az
„Új lánc” (47. tétel) 3. döntése — egy új ajánlat nem feltétlenül
ugyanahhoz az orvoshoz kötődik, mint a forrás.

**Függőség:** akárcsak a 47./48. tételnél, ez a döntés VÁRAKOZÓ a
redesign-javaslat DP-032 (orvos-törzs) kidolgozásáig.

### 5. „Csak ajánlat” nem öröklődik

A másolat mindig a normál (nem „csak ajánlat”) módból indul, KIVÉVE ha
a nyilatkozat sablon placeholder-állapota kényszeríti (D555, a D23-mal
konzisztens kényszerített eset).

**Miért:** D555 explicit ezt kéri — a „csak ajánlat” egy konkrét
korábbi tárgyalási helyzet jelzése volt, nem feltétlenül érvényes az új
ajánlatra is.

**Függőség:** VÁRAKOZÓ, a redesign-javaslat DP-054 kidolgozásáig (lásd
48. tétel 7. döntése).

### 6. Másolás-figyelmeztetések a szakmai tartalomra

A másolat a következő jelzéseket kapja/tartja meg a szakmai tartalmon:
inaktív (`aktiv: false`) tételre hivatkozó másolt sorok erősebb
figyelmeztetéssel maradnak és finalizálhatók (D141/D142); az örökölt
kézi ajánlati ár finom markerrel látszik szerkesztésig/resetig (D143);
egyedi (kézzel írt) név/leírás esetén NINCS „örökölt” marker (D145,
mert az sosem volt default-following); a fázismegjegyzés másolódik,
markerrel jelezve, amíg a doki nem szerkeszti (D146); a véglegesítés-
őr checklistje összesítve mutatja az örökölt kézi ajánlati árak és
fázismegjegyzések számát (D144/D147).

**Miért:** D141–D147 explicit ezeket kéri; ezek mind a 2. döntés
default-following modelljére épülnek — enélkül nincs mit „örökölt”-nek
jelölni.

**Kemény függőség:** ugyanaz, mint a 2. döntésnél — VÁRAKOZÓ a DP-044
(override-modell) ÉS a redesign-javaslat DP-051 (Finalization validation
engine, a checklist-infók helye) kidolgozásáig.

### 7. Nyelv/pénznem a forrásból, kézi szövegek csak változatlan szöveg mellett öröklődnek

A másolat a forrás verzió `nyelv`/`penznem` értékét örökli (D483/D485)
— ez MÁR MA IS így van (`planMasolatKent` átveszi ezeket a mezőket
változtatás nélkül). A kézi (egyedi) szövegek és a hozzájuk tartozó
nyelvi review-metaadat csak akkor öröklődnek változatlanul, ha a szöveg
maga PONTOSAN változatlan marad a másolatban (D482) — ha a doki a
másolatban módosítja, a review-státusz újraindul.

**Miért:** D482/D483/D485 explicit ezt kéri.

**Függőség:** a nyelvi review-metaadat (`authoredInLanguage`/
`reviewedForLanguage`, D478–D480) ma nem létezik a kódban — ez a rész
VÁRAKOZÓ, a redesign-javaslat DP-048 (nyelvi review) kidolgozásáig. A
nyelv/pénznem öröklésének maga a ténye (az első fele) MÁR MA IS
teljesül, rögzítésként megy be.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A historical másolás figyelmeztetése, ha van újabb verzió (D260) — ez
  a döntés a VERZIÓSOR szintjén dől el (melyik sorról indítható a
  másolás, és milyen jelzéssel) — 50. tétel (DP-024).
- Az „Új lánc” (47. tétel) és az „Új verzió” (48. tétel) saját
  öröklési szabályai.
- A default-following/kézi-felülírás állapotmodell BEVEZETÉSE saját
  jogán (a `Sor` típus bővítése, a szerkesztőben az explicit refresh
  UI) — redesign-javaslat DP-044, ennek a tételnek csak a
  FOGYASZTÓJA (2./6. döntés).
- Az orvos-törzs bevezetése — redesign-javaslat DP-032.
- A „Csak ajánlat” flag `Plan`-re emelése — redesign-javaslat DP-054.
- A nyelvi review-metaadat modell — redesign-javaslat DP-048.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/planCopy.ts` `planMasolatKent()` — `PriceList`
  paraméter felvétele a default-following frissítéshez (2. döntés,
  VÁRAKOZÓ), a páciens-pillanatkép forrásának cseréje (3. döntés).
- `app/src/components/PatientPlanChains.tsx` `copyVersion()` — a
  `ujTervForrasPaciensbol`-lal (vagy annak páciens-blokk-kinyerő
  részével) való összekötés a páciens-adathoz (3. döntés).
- `app/src/domain/types.ts` `Sor` — a default-following/kézi-felülírás
  modell bővítési pontja, ha a DP-044 megvalósul (2./6. döntés
  függősége, nem ennek a tételnek a munkája).
- `app/src/domain/veglegesitesOr.ts` — a checklist-infók bővítési
  pontja (6. döntés, VÁRAKOZÓ, DP-051 után).

## Tesztelés (irányadó, nem kimerítő)

- Másolás után új lánc jön létre a meglévő páciens-mappában, `v1`-gyel.
- A másolat `osszesitok`-ja a saját soraiból újraszámolva indul, nem a
  forrás mentett értékének másolata.
- A másolat páciens-blokkja az ÉLŐ törzsadatot tükrözi, ha van; ennek
  hiányában a forrás verzió pillanatképét.
- A másolat navigációja a Páciens adatlapra megy, nem a szerkesztőbe.
- (VÁRAKOZÓ tételek, csak dokumentálva, nem tesztelve amíg a
  függőségek nincsenek kidolgozva:) default-following árfrissítés,
  kézi felülírás megőrzése, inaktív tétel figyelmeztetés, orvos
  mindig a globális default, „csak ajánlat” nem öröklődik.
