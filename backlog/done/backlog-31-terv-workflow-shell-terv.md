# Backlog 31. tétel — Terv workflow shell, breadcrumb és stepper — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 31. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-003
szelete (`backlog/redesign/03_dental-plan-implementacios-backlog-javaslat.md`
3. fejezet). Szintézis a redesign-interjú D-döntéseiből, nem új grill-me
session. Az itt hivatkozott `D11`/`D36`/`D38`/`D40` a redesign saját
D1–D606 számozásából valók (`backlog/redesign/01_dental-plan-redesign-dontesek.md`)
— NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A mai app három workflow-oldala (`/paciens` — `PatientPage.tsx`, `/terv`
— `PlanEditorPage.tsx`, `/elonezet` — `PreviewPage.tsx`) között kizárólag
gombokkal lehet előre haladni, programozott guard nélkül:
`PatientPage.tsx:285` ("Tovább a terv szerkesztőhöz", feltétel nélküli
`navigate('/terv')`), `PlanEditorPage.tsx:278,489` ("Előnézet", feltétel
nélküli `navigate('/elonezet')`). Visszafelé csak egyetlen, feltételes gomb
van (`PreviewPage.tsx:452`, csak kitöltetlen-sor hiba esetén jelenik meg).
Emellett a `NavBar.tsx` `ATMENETI_LINKS` tömbjének linkjei (`:21–26`) ma is
bármikor elérhetővé teszik mindhárom oldalt, kontextus nélkül — a "szabad ugrálás" ma
véletlenszerű mellékhatás, nem szándékos UX. Nincs sehol breadcrumb, nincs
stepper, nincs "melyik lépésnél tartok" jelzés (sem a `NavBar`-on, sem az
oldalakon, sem a `Plan`/`AppState`-en — grep-pel megerősítve nulla
találat mindhárom fogalomra).

Véglegesítés sikere után (`PreviewPage.tsx:308`, `setSavedRef(ref)`) a
`PreviewPage` NEM navigál sehova — a render egy inline "A terv elmentve ✓"
panelre vált (`PreviewPage.tsx:368–385`), két gombbal: "Új terv indítása"
(`/uj-terv`) és "Korábbi tervek" (`/tervek`, a globális, összes-páciens
listára). Nincs sehol egy strukturált, HTML-alapú, csak-olvasható
"nézd meg ezt a mentett tervet" oldal — a `PlanHistoryPage.tsx` "Megnézés"/
"Letöltés" akciói kizárólag a mentett PDF-et nyitják meg/töltik le
(`PlanHistoryPage.tsx:364,781–790`), nem strukturált nézetet.

A redesign (D11, D36, D38, D40) egy állandó, kattintható breadcrumb +
3-lépéses stepper héjat ír elő a három oldal köré, és a véglegesítés utáni
célt egy új, strukturált `Terv részletei` nézetre cseréli.

## Döntések

### 1. Közös workflow-héj a három oldal köré, első nested/layout-route az appban

Új, megosztott komponens (pl. `app/src/components/TervWorkflowShell.tsx`
vagy egyenértékű layout-route csoportosítás az `App.tsx:48–66`
route-listában) rendereli a breadcrumb-ot és a steppert, és ez veszi körül
mindhárom oldalt (`/paciens`, `/terv`, `/elonezet`) — ez az app első
nested/layout-route mintája (ma az `App.tsx` egyetlen lapos `<Routes>`).

**Miért:** a breadcrumb és a stepper mindhárom oldalon azonos, állandó
elem (D36) — egy közös héj elkerüli, hogy három helyen kelljen
szinkronban tartani ugyanazt a renderelést.

### 2. Stepper: a meglévő "Tovább" gombok MELLETT, nem helyettük

A stepper mindhárom lépést szabadon kattinthatóvá teszi (D11), validáció
és blokkolás nélkül — ez formalizálja azt, ami ma is igaz (a `NavBar`
amúgy is szabadon odaenged), csak most szándékos, kontextusban lévő
vezérlőként. A meglévő elsődleges "Tovább a terv szerkesztőhöz"
(`PatientPage.tsx:285`) és "Előnézet" (`PlanEditorPage.tsx:278,489`)
gombok VÁLTOZATLANUL megmaradnak — a stepper a szabad ugrálást adja hozzá,
nem váltja ki az irányított "következő lépés" akciót.

**Miért:** a legtöbb wizard-mintázatban a lépésjelző (szabad navigáció) és
egy elsődleges "Tovább" CTA (irányított út) együtt él, nem egymást
kizáró — a meglévő, már tesztelt gombok eltávolítása felesleges
kockázat lenne egy tisztán additív UI-elem bevezetésekor. **Elvetett
alternatíva:** a "Tovább" gombok cseréje egy generikus "Következő lépés"
stepper-akcióra — elvetve, mert a mai gombfeliratok (`docs/07`: "a
gombfelirat azt mondja, mi történik") konkrétabbak, és nincs okunk
lecserélni egy működő mintát.

### 3. Breadcrumb: két szint, a páciens-szegmens egyelőre NEM kattintható

A breadcrumb `Páciensek > [páciens neve]` alakú. A `Páciensek` szegmens a
pácienslistára (`/paciensek`) linkel. A páciens-név szegmens ma **csak
szöveg**, NEM link — mert a mai `PatientPage.tsx`/`AppState.tsx` sehol nem
tart nyilván stabil `patientDir`/`paciensId`-t az aktív drafthoz kötve
(grep-pel megerősítve: nulla találat mindkét fájlban). Amint a 30. tétel
(DP-002, Páciens detail shell) elkészült, VAN hova linkelni, de a linkeléshez
szükséges azonosító a draftra kötve ma nincs — ennek biztosítása inkább a
redesign-javaslat DP-004 (Aktív draft lifecycle) hatóköre, ami az aktív
draft modelljét formalizálja.

**Miért:** a D36 "teljesen kattintható" elve nem teljesül maradéktalanul
ebben a körben, de egy találgatott/newly-invented azonosító-nyomkövetés
bevezetése ide dupla munkát és később ütköző modellt eredményezne, ha
DP-004 másképp dönt az aktív draft identitásáról. **Elvetett alternatíva:**
a `plan.paciens.nev`-ből építeni egy `patientDir`-t a mai
`buildPatientDirName`-mel és arra linkelni — elvetve, mert ez a
generálás nem garantáltan ugyanaz a mappa, mint ahonnan a draft ténylegesen
származik (pl. kézzel átírt név esetén más nevet adna, mint a valódi
forrás), ami rossz linkhez vezetne.

### 4. Véglegesítés utáni cél: a `Terv részletei` nézet NEM épül meg itt

A `Terv részletei` strukturált, csak-olvasható nézet sehol nem létezik ma
(megerősítve: nincs ilyen komponens/route, a `PlanHistoryPage` csak
PDF-et nyit/tölt le) — ez a redesign-javaslat DP-060 tétele. Ez a tétel
NEM építi meg. A `PreviewPage.tsx` mai, sikeres véglegesítés utáni inline
"A terv elmentve ✓" panelje (`PreviewPage.tsx:368–385`) VÁLTOZATLANUL
megmarad, egyetlen ponton módosulva: a "Korábbi tervek" gomb
(`PreviewPage.tsx:379`) célja a régi globális `/tervek` lista helyett a
30. tételben (DP-002) elkészült, egyesített páciens-részletoldalra
(`Kezelési tervek` tab, az adott páciensre) mutat.

**Miért:** a D40 tényleges célja (Terv részletei) csak akkor vezethető be
felelősen, ha létezik hova navigálni — egy törött vagy placeholder link
rosszabb, mint a mai, működő sikerpanel. A "Korábbi tervek" gomb céljának
frissítése viszont MÁR MA elvégezhető, mert a 30. tétel célja már létezik,
és ez valódi, azonnali javulás (a doki a saját mentett tervéhez kerül, nem
egy globális, mindenkit felsoroló listához). **Elvetett alternatíva:** egy
minimális "stub" `Terv részletei` oldal létrehozása csak navigációs
célpontként, amit DP-060 majd kitölt — elvetve, mert egy üres/félkész
oldalra navigálás rosszabb UX-et adna a mai működő sikerpanelnél, minden
előny nélkül.

### 5. A 29. tétel (DP-001, már lezárva D34-ként) függőben hagyott nav-tisztítása LEZÁRUL

A 29. tétel (`docs/01-attekintes-es-dontesek.md` D34,
`docs/03-funkcionalis-spec.md` § Fő navigáció) kifejezetten a 30. ÉS a
31. tétel (DP-002 és DP-003) elkészültéig halasztotta a `Páciens`/`Terv
szerkesztő`/`Előnézet`/`Korábbi tervek` NavBar-linkek (a lezárt
implementáció szerint `NavBar.tsx` `ATMENETI_LINKS` tömbje) végleges
eltávolítását. Mivel a 30. tétel már kész, és ez a tétel a második,
hiányzó előfeltétel, ez a tétel végzi el a négy link eltávolítását
(a `FO_LINKS`/`ATMENETI_LINKS` kettéválasztás megszüntetésével), MINT
UTOLSÓ LÉPÉS.

**Miért:** ez zárja le a 29. tételben nyitva hagyott függőséget — a
sorrend miatt logikusan az utolsó (időben másodikként elkészülő) tételnek
kell elvégeznie a tényleges eltávolítást, nehogy egyik tétel se érezze
magáénak a felelősséget.

### 6. Aktuális lépés jelzése: továbbra is route-alapú, nincs új `Plan`/`AppState` mező

A stepper a jelenlegi route-ból (`/paciens`/`/terv`/`/elonezet`) vezeti le,
melyik lépés aktív — nincs új `currentStep`/`activeStep` mező a `Plan`-on
vagy az `AppState`-en (ma sincs ilyen, és a `Plan.statusz` csak
`PISZKOZAT`/`VEGLEGES`, nem workflow-pozíció).

**Miért:** a route már ma is egyértelműen meghatározza a lépést — egy
párhuzamos state-mező csak szinkronizálási kockázatot (route és state
szétcsúszása) vezetne be haszon nélkül.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `/paciens` (`Terv adatai`) belső tartalma: cím, páciens snapshot,
  nyelv/pénznem, orvos, dátumok — redesign-javaslat DP-030; ez a tétel
  csak KÖRÜLVESZI a mai tartalmat a héjjal, nem alakítja át.
- `/terv` (`Kezelések`) belső tartalma — redesign-javaslat DP-040/DP-041/
  DP-042/DP-043/DP-044.
- `/elonezet` (`Előnézet és véglegesítés`) belső elrendezése (bal preview/
  jobb checklist, D38 második fele) — redesign-javaslat DP-050/DP-051/
  DP-052.
- A `Terv részletei` nézet tényleges felépítése — redesign-javaslat
  DP-060 (lásd 4. döntés).
- Az aktív draft identitásának (patientDir/paciensId a drafton) formális
  modellje — redesign-javaslat DP-004 (lásd 3. döntés).
- `Új verzió` közvetlenül a `Kezelések` lépésre nyitása (D12) — a HÍVÓ
  (redesign-javaslat DP-022, Új verzió létrehozása) dönti el, MIKOR kell
  a stepper-mechanizmust erre használni; ez a tétel csak a mechanizmust
  (szabadon kattintható lépések) adja.

## Érintett helyek (tájékoztató, nem kimerítő)

- Új `app/src/components/TervWorkflowShell.tsx` (vagy egyenértékű
  layout-route) — breadcrumb + stepper renderelés.
- `app/src/App.tsx:48–66` — a három workflow-route beágyazása a héjba
  (első nested/layout-route az appban).
- `app/src/pages/PatientPage.tsx:285` — "Tovább" gomb változatlan.
- `app/src/pages/PlanEditorPage.tsx:278,489` — "Előnézet" gomb változatlan.
- `app/src/pages/PreviewPage.tsx:379` — a "Korábbi tervek" gomb célja a
  30. tétel páciens-részletoldalára frissül; `:368–385` egyébként
  változatlan (4. döntés).
- `app/src/components/NavBar.tsx` `ATMENETI_LINKS` tömb (`:21–26`) +
  a hozzá tartozó `Separator` (`:77`) — a négy átmeneti link és a
  vizuális elválasztó eltávolítása, a `FO_LINKS` rendering egyszerűsítése
  (5. döntés).
- `docs/07-felulet-rendszer.md` — lezáráskor egy rövid breadcrumb+stepper
  stílus- és billentyűzet-elérhetőségi szabály (ez az első bevezetés, a
  30. tétel Tabs-jegyzetének mintájára).

## Tesztelés (irányadó, nem kimerítő)

- Mindhárom workflow-oldalon megjelenik a breadcrumb és a stepper, a
  jelenlegi route-nak megfelelő lépés kiemelésével.
- A stepper bármelyik lépésére kattintva a megfelelő oldalra navigál,
  a draft állapotától (üres/hiányos/kész) függetlenül, blokkolás nélkül.
- A meglévő "Tovább a terv szerkesztőhöz" és "Előnézet" gombok változatlanul
  működnek, a stepperrel párhuzamosan.
- Sikeres véglegesítés után a "Korábbi tervek" gomb a páciens ÚJ,
  egyesített részletoldalára (Kezelési tervek tab) navigál, nem a régi
  globális `/tervek` listára; az "Új terv indítása" gomb és a sikerpanel
  többi eleme változatlan.
- A `NavBar` többé nem tartalmazza a `Páciens`/`Terv szerkesztő`/
  `Előnézet`/`Korábbi tervek` linkeket; a megmaradó linkek
  (`Kezdőlap`, `Páciensek`, `Kezelések és árak`, `Beállítások`, `DEMO`)
  változatlanul működnek.
- A breadcrumb páciens-szegmense a draft `plan.paciens.nev`-jét mutatja
  (üres névnél egy generikus címkét), és NEM kattintható.
- A stepper és a breadcrumb billentyűzettel is elérhető (Tab-sorrend,
  látható fókusz-jelzés).
