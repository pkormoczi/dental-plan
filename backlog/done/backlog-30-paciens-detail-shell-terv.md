# Backlog 30. tétel — Páciens detail shell és tab-navigáció — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 30. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-002
szelete (`backlog/redesign/03_dental-plan-implementacios-backlog-javaslat.md`
4. fejezet). A szokásos módon szintézis a már lezajlott redesign-interjú
D-döntéseiből, nem új grill-me session. Az itt hivatkozott `D3`/`D5`/`D45`
stb. számok a redesign saját D1–D606 számozásából valók
(`backlog/redesign/01_dental-plan-redesign-dontesek.md`) — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával. A 29. tétel (DP-001)
már lezárult (`docs/01-attekintes-es-dontesek.md` D34,
`docs/03-funkcionalis-spec.md` § Fő navigáció) — a `Páciens`/`Terv
szerkesztő`/`Előnézet`/`Korábbi tervek` nav-linkek D34 szerint átmenetileg
a navon maradnak, amíg ez a tétel ÉS a DP-003 (Terv workflow shell) át
nem veszi a szerepüket; a végleges megszüntetés emiatt nem csak ennek a
tételnek, hanem a DP-003-nak is előfeltétele.

## Probléma

A mai app páciens-vonatkozású funkciói HÁROM, egymástól függetlenül
navigálható oldalon élnek, egyik sem URL-lel címezhető egyetlen
pácienshez:

- **`/paciensek`** (`PaciensekPage.tsx`) — az összes páciens lapos listája,
  soronkénti accordionnal, ami helyben nyitja ki a `PatientEditor`
  törzsadat-szerkesztőt (`PaciensekPage.tsx:418–620`, `openDir`
  komponens-state, `PaciensekPage.tsx:54`).
- **`/tervek`** (`PlanHistoryPage.tsx`) — az összes páciens kezelésitörténete,
  páciensenként a terv-lánc → verzió hierarchiával (`PlanHistoryPage.tsx:533–830`),
  szintén komponens-state-tel (`expandedOverride`), nem URL-lel vezérelve.
- **`/paciens`** (`PatientPage.tsx`) — **NEM** páciens-identitás oldal,
  hanem az AKTÍV DRAFT terv metaadata (nyelv/pénznem, D21) + a draft
  `plan.paciens` pillanatképe; `useAppState()`-hez kötött, páciens-id nélkül
  nem nyitható meg önmagában. Ez a redesign `Terv adatai` lépésének felel
  meg (DP-003), NEM ennek a tételnek a `Páciens adatai` tabja — a névhasonlóság
  ellenére a kettő nem ugyanaz.

A két lista (`PaciensekPage`, `PlanHistoryPage`) kölcsönösen kereszt-linkel
egymásra ugyanahhoz a pácienshez, de a cél páciens azonosítása **tranziens
React Router `location.state`-tel** történik
(`PaciensekPage.tsx:212–226,337–339`, `PlanHistoryPage.tsx:239–253`), nem
URL-paraméterrel — ez a mechanizmus mindkét fájlban külön-külön
újraimplementált "érkezéskor görgess a sorra és nyisd ki" boilerplate,
frissítésnél elvész, nem könyvjelezhető/megosztható.

A redesign (D3, D5–D6, D43–D45, D234–D236) egy egységes, URL-lel címezhető
páciens-részletoldalat ír elő két tabbal: `Páciens adatai | Kezelési
tervek`.

## Döntések

### 1. Új, URL-lel címezhető, páciens-paraméteres route

Új route (pl. `/paciensek/:patientDir` — a pontos paraméter-alak, hogy a
mai `patientDir`-t vagy egy önálló `paciensId`-t hordoz-e, az implementáló
döntése, de a kulcs a `paciens.json`-ban már úgyis létező, stabil
azonosítóból származzon) + egy új oldal-komponens, ami a shellt adja: két
tab + sticky header.

**Miért:** ez oldja meg a Probléma szakaszban leírt, ma valódi hiányt (a
kereszt-linkek `location.state`-alapú, duplikált, frissítésnél elveszett
mechanizmusát) — nem csak a redesign UI-célja, hanem közvetlen minőségi
javulás is. **Elvetett alternatíva:** query paraméter a mai `/paciensek`
route-on (`?p=<patientDir>`) tab-állapot nélkül, JS-state-tel — elvetve,
mert a redesign a két tabot explicit navigálható, önálló egységként várja
el (D3), nem egy meglévő lista fölé húzott overlay-ként.

### 2. `Páciens adatai` és `Kezelési tervek` tab-tartalma: KÖLTÖZTETÉS, nem újratervezés

A `Páciens adatai` tab a meglévő `PatientEditor` mezőkészletét és
Save/Cancel-viselkedését veszi át (`PaciensekPage.tsx:418–620`,
`megjelenitettTorzsadat()` a `paciensAdatok.ts:38–46`-ban, változatlan), a
`Kezelési tervek` tab a meglévő terv-lánc → verzió blokkot
(`PlanHistoryPage.tsx:533–830`), egy közös, páciens-paraméteres
komponensbe kiemelve, amit mindkét hívó (a régi oldal ÉS az új tab)
használ. A mélyebb viselkedési hiányosságok — pl. a `PatientEditor` ma
NEM valódi "read-only alapállapot + Edit gomb" mintát követ, hanem rögtön
szerkeszthető mezőket mutat, `disabled={!dirty}` Save gombbal, ami nem
pontosan D4/D41-D43 — TUDATOSAN változatlanul kerülnek át, nem javítódnak
itt.

**Miért:** a jól méretezett backlog-item elv (ne legyen benne több
egymástól független feature) szerint a "hol lakik ez a tartalom"
(shell/navigáció) és a "hogyan viselkedik ez a tartalom" (mezőszintű
UX-finomítás) két külön döntés. **Elvetett alternatíva:** a
`PatientEditor` egyúttal valódi read-only/Edit-módra alakítása is ebben a
tételben — elvetve, mert ez már a redesign-javaslat külön DP-015
tételének (Páciens adatok read-only/edit/full create) hatóköre, és
összemosná a két munkát egy nehezebben áttekinthető, nehezebben
tesztelhető változtatásba.

### 3. `PatientPage.tsx`/`/paciens` NEM ez a tab — explicit határvonal

A mai `/paciens` oldal (nyelv/pénznem + draft-snapshot) nem alakul át
és nem kerül be a `Páciens adatai` tabba — az továbbra is a draft-workflow
része marad, koncepcionálisan a redesign `Terv adatai` lépésének felel meg
(DP-003 hatóköre).

**Miért:** a névhasonlóság ("Páciens adatlap" a mai `docs/03` §2-ben)
könnyen azt a téves benyomást keltené, hogy ez a tétel is érinti — explicit
ki kell mondani, hogy nem, nehogy valaki tévedésből összevonja a kettőt
implementáció közben.

### 4. Alapértelmezett tab: `Kezelési tervek`, egy explicit kivétellel

Normál megnyitáskor (D5/D234) a shell mindig a `Kezelési tervek` tabon
nyit. A D43 kivétel (frissen, TELJES formmal létrehozott új páciens első
megnyitása a `Páciens adatai` tabon nyit) a shell egy explicit "melyik
tabon nyisson" bemenetét (pl. route query paraméter vagy navigation
state) használja — ezt a shell csak FOGADJA, a döntést, MIKOR kell ezt a
paramétert átadni, a hívó (a teljes pácienslétrehozás folyamata) hozza
meg.

**Miért:** a shell nem ismerheti a hívó kontextusát (honnan navigáltak
ide), ezért a paraméterezhetőség a helyes határ — a shell csak a
mechanizmust adja, a döntési logika a redesign-javaslat DP-012/DP-015
tételeié.

### 5. Üres állapot / first-plan CTA: meglévő predikátum reuse

A `Kezelési tervek` tab a `latestVersionAcrossPlans(...) === null`
kifejezést használja (`app/src/domain/planFolders.ts:19–36`, MÁR LÉTEZŐ
export, ma is ezt jelenti "nincs olvasható terv-lánc") annak eldöntésére,
hogy CTA-t vagy tartalmat mutasson — nincs új domain-helper. A CTA a
meglévő "Új terv" akció-huzalozást hívja
(`PlanHistoryPage.tsx:296–319,571–586` mintája, `ujTervForrasPaciensbol`,
`state/planIndulas.ts:30`).

**Miért:** a `latestVersionAcrossPlans` már ma is pontosan ezt a
predikátumot testesíti meg (a `docs`-komment szerint `null` = nincs
olvasható verzió) — új helper bevezetése felesleges duplikáció lenne.
Megjegyzés az implementálónak: a két meglévő hívási hely ma két KÜLÖNBÖZŐ
technikával fejezi ki ugyanezt (`PlanHistoryPage.tsx:231`
`.length ?? 0) > 0`, illetve `PaciensekPage.tsx` a
`latestVersionAcrossPlans(...) === null`-t), egy közös, elnevezett
kényelmi wrapper (pl. `hasNoPlanChains`) olvashatóbbá tenné mindhárom
hívási helyet — ez az implementáló szabad döntése, nem kötelező.

### 6. Nincs duplikált "+ Új kezelési terv" CTA a `Páciens adatai` tabon

D44 szerint a stabil "+ Új kezelési terv" CTA (D7) kizárólag a `Kezelési
tervek` tabhoz/fölé kerül, a `Páciens adatai` tab nem ismétli meg.

**Miért:** ez egy explicit redesign-döntés (D44), és a mai
`PaciensekPage`/`PlanHistoryPage` szétválasztás amúgy is természetesen
ezt a helyet sugallja (a terv-indító gombok ma is csak a
`PlanHistoryPage`-en élnek).

### 7. Sticky compact header: új komponens, meglévő adatforrásra építve

A header (D235–D236: név + DOB + telefon, görgetéskor a tetején marad)
teljesen új UI — a kódbázisban ma sehol nincs `position: sticky` minta
(0 találat), és semmi nem rendereli a `megjelenitettTorzsadat()` eredményét
fejlécként. A header ADATFORRÁSA a meglévő `megjelenitettTorzsadat()`
(`paciensAdatok.ts:38–46`), változtatás nélkül.

**Miért:** nincs mit újrahasznosítani a megjelenítés oldalán, de az
adatréteg (élő fallback vs. lezárt törzsadat, D33/28. tétel) már készen
áll — a header csak egy új, vékony megjelenítő réteg fölötte.

### 8. A két meglévő kereszt-link átirányítása az új oldalra

A `PaciensekPage.tsx` sorának "Korábbi tervek" linkje és a
`PlanHistoryPage.tsx` páciens-blokkjának "Páciens adatai" linkje mostantól
az új egyesített oldalra navigál (a megfelelő tabbal előválasztva) a régi
két külön top-level oldal helyett.

**Miért:** ez oldja fel közvetlenül a Probléma szakaszban leírt
duplikált, `location.state`-alapú "görgess és nyiss ki" boilerplate-et
mindkét fájlban — innentől valódi URL-deep-linkkel helyettesíthető,
frissítés-biztosan.

### 9. A régi `/paciensek` és `/tervek` lista TARTALMA és nav-elérhetősége változatlan marad

Ezen a tételen kívül a két régi lista-oldal (`PaciensekPage` accordion
sorai, `PlanHistoryPage` globális, összes-páciens nézete) és a NavBar
linkjeik VÁLTOZATLANOK maradnak — csak a bennük lévő kereszt-linkek célja
változik (8. döntés). A linkek végleges megszüntetése a 29. tétel (DP-001)
szerint a DP-003 (Terv workflow shell) elkészültére is vár.

**Miért:** konzisztencia a 29. tétel döntésével — egy tétel se tegye
ideiglenesen elérhetetlenné a doki munkaeszközét egy másik, még el nem
készült tétel miatt. **Elvetett alternatíva:** a `PatientEditor` és a
chain/version blokk KIVÉTELE a régi oldalakból, miután átkerült az újba
(hogy ne legyen két hely, ahol ugyanaz szerkeszthető) — elvetve ebben a
körben, mert a régi oldalak nav-linkjei így is megmaradnak (9. döntés), és
egy félig lecsupaszított, de nav-ból még mindig elérhető régi oldal
rosszabb UX lenne, mint a jelenlegi, teljesen működő állapot. A közös
komponens-kiemelés (2. döntés) amúgy is garantálja, hogy a két hely nem
drifel el egymástól tartalmilag.

### 10. Radix `Tabs` bevezetése — az app első ilyen komponense

A shell két tabja Radix `Tabs`-szal épül (a projekt UI-könyvtára már ma is
Radix Themes, de `Tabs.Root`/`Tabs.Trigger` sehol nincs használva) — ez az
első bevezetés.

**Miért:** nincs meglévő minta, amit követni kellene, de mivel több
későbbi redesign-tétel is tabos szerkezetet ír elő (Beállítások D53,
Kezelések és árak), lezáráskor érdemes egy rövid stílus-szabályt felvenni
a `docs/07-felulet-rendszer.md`-be, hogy a későbbi tabos oldalak
konzisztensek maradjanak ezzel az elsővel.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `PatientPage.tsx`/`/paciens` (terv adatai: nyelv/pénznem, draft
  snapshot) bármilyen átalakítása — redesign-javaslat DP-003 (Terv
  workflow shell) hatóköre.
- A `Páciens adatai` tab mélyebb viselkedése: valódi read-only-alapállapot
  + explicit Edit gomb (D4/D41–D43), teljes létrehozási form (D194–D200),
  `Nincs megadva` üres mezőre (D209), dirty guard finomítása (D207),
  mentési hiba utáni állapot (D215) — redesign-javaslat DP-015.
- Master↔snapshot diff/fallback-jelzés finomítása, explicit
  master→draft/draft→master szinkron (D9–D10, D157–D163, D210–D214) —
  redesign-javaslat DP-016.
- Chain/version lista viselkedésének finomítása: rendezés, latest badge,
  aktív draft blokk, expand/collapse szabályok (D6, D23–D34, D183–D189,
  D237–D254) — redesign-javaslat DP-020; ez a tétel a MEGLÉVŐ blokkot
  költözteti, nem finomítja.
- A `/paciensek` lista magának navigation-only-vá alakítása, élő
  keresés/rendezés/scroll-state finomítás (D29–D31, D193, D218–D221,
  D233) — redesign-javaslat DP-014.
- `/paciensek` és `/tervek` NavBar-linkek végleges megszüntetése — a 29.
  tétel (DP-001) szerint ez a DP-003-mal együtt esedékes, nem ez a tétel.
- Új páciens teljes létrehozási folyamata (ami a 4. döntésben leírt
  "melyik tabon nyisson" jelzést ténylegesen elküldi) — redesign-javaslat
  DP-012/DP-015.

## Érintett helyek (tájékoztató, nem kimerítő)

- Új route (pl. `/paciensek/:patientDir`) — `app/src/App.tsx` route-bejegyzés.
- Új `app/src/pages/PatientDetailPage.tsx` (vagy hasonló elnevezés) — a
  Tabs shell + sticky header + a 4–6. döntések logikája.
- `app/src/pages/PaciensekPage.tsx` — a `PatientEditor` (418–620. sor)
  kiemelése egy megosztott komponensbe, amit az új tab is használ; a
  "Korábbi tervek" kereszt-link (212–226, 337–339. sor) célja frissül.
- `app/src/pages/PlanHistoryPage.tsx` — a chain/version blokk (533–830.
  sor) kiemelése egy páciens-paraméteres, megosztott komponensbe; a
  zero-chain kizárás (231. sor) az új tabban NEM alkalmazandó (ott pont
  az üres állapotot kell kezelni, 5. döntés); a "Páciens adatai"
  kereszt-link célja frissül.
- `app/src/domain/paciensAdatok.ts` — `megjelenitettTorzsadat()` (38–46.
  sor), reuse, nincs módosítás.
- `app/src/domain/planFolders.ts` — `latestVersionAcrossPlans()` (19–36.
  sor), reuse; opcionális, nem kötelező kényelmi wrapper a hívási helyek
  olvashatóságáért (5. döntés megjegyzése).
- `docs/07-felulet-rendszer.md` — lezáráskor egy rövid Tabs-stílus szabály
  (10. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Egy meglévő, 1+ terv-láncú páciensre navigálva a shell `Kezelési
  tervek` tabon nyit, tartalma megegyezik azzal, amit ma a
  `PlanHistoryPage` az adott páciensre mutatna.
- Egy 0 terv-láncú (csak törzsadattal rendelkező) páciensre navigálva a
  `Kezelési tervek` tab CTA-t mutat, nem üres/hiányzó tartalmat — ez ma
  egyáltalán nem elérhető eset (a `PlanHistoryPage` kizárja az ilyen
  pácienst a listából).
- A `Páciens adatai` tab pontosan azt a mezőkészletet és Save/Cancel
  viselkedést mutatja, mint ma a `PaciensekPage` accordion-tartalma.
- A `Páciens adatai` tabon nincs "+ Új kezelési terv" gomb.
- A sticky header görgetéskor a lap tetején marad; tartalma megegyezik a
  `megjelenitettTorzsadat()` eredményével.
- Az oldal URL-je közvetlenül megnyitható/frissíthető anélkül, hogy
  elveszne, melyik páciensről van szó (deep-link teszt) — ellentétben a
  mai `location.state`-alapú mechanizmussal.
- A régi `/paciensek` és `/tervek` NavBar-linkek és tartalmuk (a
  kereszt-link célváltozáson kívül) továbbra is elérhető és működik,
  változatlanul.
- A két kereszt-link az új egyesített oldalra navigál, a megfelelő tabbal
  előválasztva.
