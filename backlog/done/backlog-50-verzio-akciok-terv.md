# Backlog 50. tétel — Verzió-szintű akciók és historical figyelmeztetések — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 50. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-024
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D24`, `D34`, `D260` (+ `D32` határvonalként) a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Függőség:** a „csak legfrissebből indítható Új verzió” SZABÁLYA a 48.
tétel (DP-022) 1. döntésében dőlt el — ez a tétel a szabály
MEGJELENÍTÉSÉT (melyik verziósor milyen gombot/menüt kap) dolgozza ki.

## Probléma

A mai verziósor (`PatientPlanChains.tsx:535–618`) minden verzión
AZONOS: egy jobbra igazított összeg + egy `⋯` `DropdownMenu`, ami
mind a négy akciót tartalmazza (`Megnézés`, `Letöltés`, elválasztó,
`Új verzió`, `Másolás új tervbe`, `:565–605`), a verzió
legfrissebb-/historical-voltától FÜGGETLENÜL:

- **Nincs vizuális megkülönböztetés.** A `docs/03-funkcionalis-spec.md`
  § 5 ma explicit kimondja: „A verziósoron nincs látható akciógomb” —
  ez a mai, tudatos döntés (a sorban egymás mellett hosszú feliratú
  gombok „zsúfoltak és összetéveszthetők” voltak). A redesign (D34)
  ezzel szemben látható elsődleges/másodlagos gombot kér a
  legfrissebb soron.
- **Nincs historical-másolás figyelmeztetés.** Egy régi verzió
  másolása pontosan ugyanúgy fut, mint a legfrissebbé — nincs jelzés,
  ha időközben újabb verzió is született (D260).
- **Nincs „ugrás a legfrissebbre” link.** Egy historical soron a doki
  nem tud egy kattintással a lánc legfrissebb verziójára ugrani — csak
  manuálisan görgethet/keresheti meg.
- **A verziósor egésze NEM kattintható** (D32 — ez MÁR MA IS helyes,
  a sor navigation-only elemként viselkedik, csak a `⋯` menü aktív).
- Amit a 48. tétel már eldöntött, és ami itt csak MEGJELENIK: az „Új
  verzió” a legfrissebb soron engedett, historical soron nem.

## Döntések

### 1. Legfrissebb verziósor: látható elsődleges + másodlagos gomb; historical sor: csak `⋯`

A lánc legfrissebb verziósora két látható gombot kap: elsődleges „Új
verzió”, másodlagos „Megnézés” (a mai `viewVersion` viselkedése — a
mentett PDF megnyitása új lapon) — a „Másolás új tervbe” és a
„Letöltés” a `⋯` menüben marad (D34). Egy historical (nem legfrissebb)
soron NINCS látható gomb, csak a `⋯` menü, benne: `Megnézés`,
`Letöltés`, elválasztó, `Másolás új tervbe`, `Ugrás a legfrissebb
verzióra` (2./3. döntés).

**Miért:** a `docs/03` mai „nincs látható gomb” indoklása (zsúfoltság
sok egymás melletti hosszú felirattól) a 48. tétel (D24) után
GYENGÜL: mivel láncon belül CSAK EGY sor kap „Új verzió” lehetőséget,
legfeljebb 2 látható gomb kerül egyetlen sorra — ez pontosan belefér a
`docs/07-felulet-rendszer.md` „legfeljebb két látható gomb egy
adatsoron” szabályába, ami MÁR A PROJEKT saját, más listákra
(pl. Árlista admin) alkalmazott konvenciója. D34 explicit ezt a
elsődleges/másodlagos elrendezést kéri a legfrissebb soron.

**Elvetett alternatíva:** minden a `⋯`-ben marad (a mai állapot
változatlanul) — ez lett volna a `docs/03` szöveg megtartása, de a
user explicit D34 mellett döntött; a `docs/03` § 5 érintett bekezdése
a tétel lezárásakor átírásra kerül.

### 2. Historical másolás figyelmeztetése, ha van újabb verzió

Ha a doki egy NEM legfrissebb verziót másol („Másolás új tervbe” a `⋯`
menüből egy historical soron), és a láncnak van nála frissebb verziója,
egy figyelmeztetés jelzi ezt a másolás megerősítése előtt — a pontos
másolás (exact copy) továbbra is engedett, csak tudatosítva (D260).

**Miért:** D260 explicit ezt kéri; egy régi verzió másolása lehet
szándékos (pl. egy korábbi, olcsóbb alku-változat felelevenítése), de
gyakran véletlen (a doki nem vette észre, hogy nem a legfrissebb sort
nyitotta meg) — egy egyszerű figyelmeztetés elég védelmet ad anélkül,
hogy tiltaná a legitim esetet.

**Megvalósítás iránya:** a MEGLÉVŐ `runOrConfirm`/`AlertDialog` minta
(`PatientPlanChains.tsx:199–240,626–656`) bővítése egy plusz szöveggel
a `copy` ágon, amikor a forrás nem a legfrissebb verzió — nem egy
második, párhuzamos dialógus-mechanizmus.

**Elvetett alternatíva:** a historical másolást teljesen tiltani —
elvetve, D260 explicit „exact copy továbbra is engedett” — a tiltás
csak az „Új verzió” útra vonatkozik (48. tétel 1. döntése), a másolásra
nem.

### 3. „Ugrás a legfrissebb verzióra” link

Egy historical verziósor `⋯` menüjében egy „Ugrás a legfrissebb
verzióra” pont a lánc legfrissebb verziósorára navigál/görget (D24).
Amíg a redesign-javaslat DP-060 (read-only „Terv részletei” nézet) nem
létezik, ez a lánc-fán BELÜLI, azonos oldalon történő fókusz/görgetés
— a MEGLÉVŐ `data-plan={plan.dirName}` horgonyok (`PatientPlanChains.tsx:
461`) felhasználásával, nem egy új route-tal.

**Miért:** D24 explicit „latest link”-et kér; a lánc-fa MÁR MA IS
tartalmazza a szükséges DOM-horgonyokat egy egyszerű scroll-be-view
megvalósításhoz, egy külön oldal/route bevezetése aránytalan lenne egy
olyan navigációhoz, ami ugyanazon a listán belül marad.

**Elvetett alternatíva:** valódi route-navigáció egy dedikált
verzió-URL-re — elvetve ENNÉL a tételnél, mert a célzott verzió
read-only megjelenítése (a route mögötti TARTALOM) a DP-060 hatóköre;
ha az elkészül, ez a link akkor válik valódi route-linkké (ahogy a
tervdokumentum Kapcsolódó szakasza is jelzi).

### 4. A verziósor egésze nem válik kattinthatóvá

A verziósor (a `⋯` menün és az új látható gombokon kívül) NEM kap
kattintható/navigációs viselkedést — a sor továbbra is
„navigation-only” elem a maga adatmegjelenítő értelmében (D32), mert
nincs hova navigálni: a read-only „Terv részletei” céloldal (DP-060)
még nem létezik.

**Miért:** D32 explicit ezt kéri; egy kattintható sor olyan célra
mutatna, ami ma nincs — a látszólagos interaktivitás megtévesztő lenne.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A „csak legfrissebből indítható Új verzió” alap-SZABÁLYA — 48. tétel
  (DP-022) 1. döntése, ez a tétel csak a MEGJELENÍTÉSÉT dolgozza ki.
- A read-only „Terv részletei” nézet és a valódi verzió-navigáció route
  mögötte — redesign-javaslat DP-060; a 3. döntés „ugrás” linkje ide
  fog átalakulni, amikor az elkészül.
- A lánc-szintű összecsukás, rendezés, badge-ek, aktív draft blokk — 46.
  tétel (DP-020).
- Az „Új lánc” (47. tétel) és a „Másolás új tervként” tartalmi
  öröklési szabályai (49. tétel) — ez a tétel csak a MEGERŐSÍTŐ
  FIGYELMEZTETÉST adja a historical másoláshoz (2. döntés), a másolás
  tartalmi viselkedését nem érinti.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/PatientPlanChains.tsx` — a verziósor JSX
  átalakítása (látható gombok a legfrissebb soron, `⋯` tartalom
  historical soron, 1. döntés), a historical másolás figyelmeztető
  szövege a MEGLÉVŐ `pendingSpecs`/`AlertDialog` mintában (2. döntés),
  az „Ugrás a legfrissebbre” scroll-navigáció (3. döntés).
- `docs/03-funkcionalis-spec.md` § 5 „A verziósoron nincs látható
  akciógomb” bekezdés — átírandó a tétel lezárásakor, hogy tükrözze az
  1. döntést.
- `docs/07-felulet-rendszer.md` „legfeljebb két látható gomb egy
  adatsoron” szabálya — a lezáráskor hivatkozási pontként megerősíthető
  (nem kell módosítani, csak a döntés innen vezethető le).

## Tesztelés (irányadó, nem kimerítő)

- A lánc legfrissebb verziósorán két látható gomb jelenik meg (Új
  verzió elsődleges, Megnézés másodlagos), a `⋯` a maradék kettőt
  tartalmazza.
- Egy historical soron nincs látható gomb, csak a `⋯`, benne
  „Ugrás a legfrissebb verzióra” ponttal, „Új verzió” NÉLKÜL.
- Historical verzió másolásakor, ha van újabb verzió a láncban,
  figyelmeztetés jelenik meg a megerősítés előtt; a legfrissebb verzió
  másolásakor nem.
- A pontos (exact) historical másolás a figyelmeztetés elfogadása után
  sikeresen lefut.
- „Ugrás a legfrissebb verzióra” a lánc legfrissebb verziósorára
  görget/fókuszál.
- A verziósor semelyik része (a gombokon/`⋯`-n kívül) nem navigál
  sehova kattintásra.
