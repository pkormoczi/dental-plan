# Backlog 61. tétel — Árlista-snapshot és explicit refresh — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 61. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-044
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D114`–`D122`, `D135`–`D147`, `D493`–`D514` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Kapcsolódó, korábban nyitott tételek:** a 49. tétel (DP-023,
„Másolás új tervként") 2. és 6. döntése mindkettő VÁRAKOZÓ-ként hagyta
a default-following árlistaérték-frissítést és a hozzá tartozó
figyelmeztetéseket, EXPLICIT erre a tételre mutatva — ez a dokumentum
oldja fel mindkettőt.

## Probléma

A `Sor` (`domain/types.ts:82-104`) mindössze 9 mezőt tart, és **nincs
köztük semmilyen ár-követési flag vagy komparátor**:

- A `mennyisegKezi`/`sorPatchKovetessel()` mintája (D32) a MENNYISÉGRE
  létezik; a `nevKoveti()`/`leirasKoveti()` a NÉVRE/LEÍRÁSRA (derived
  komparátor, nem tárolt flag) — de egy `arKoveti`-szerű, ÁRRA
  vonatkozó komparátor **SEHOL nincs** (repo-szintű grep `arKoveti|
  arKovet|priceFollow|arFrissit`-re nulla találat).
- **Semmi nem diffel egy sort a mai árlistához újra.** `basePrice()`
  (`domain/money.ts:35`) kizárólag SOR-FELVITELKOR hívódik
  (`PlanEditorPage.tsx:77`, `sorMezokTetelbol()`-ban) — betöltéskor,
  renderkor, véglegesítéskor SOHA. Az „Új verzió” nyitása
  (`ujVerzioDatum.ts:10-14`) kifejezetten dokumentálja, hogy a
  `listaEgysegar`/`arlistaVerzio` érintetlen marad — ez a mai, D7
  pillanatkép-elvet követő, HELYES viselkedés, csak nincs mellette
  EXPLICIT refresh-lehetőség.
- **Nincs „refresh ezt a sort” UI SEHOL.** Az egyetlen ⟳ ikon a
  mennyiség-fog visszakapcsoló (`PlanEditorPage.tsx:931-952`) — ár-
  refreshhez semmi hasonló nincs.
- **`plan.arlistaVerzio` sosem hasonlítódik `priceList.arlistaVerzio`-
  hoz.** Nincs „a terved egy régebbi árlistából készült” detektor —
  a mező csak íródik (létrehozáskor, admin-mentéskor) és a PDF
  láblécén jelenik meg, összevetés nélkül.
- A `veglegesitesOr.ts` (`:36-41`) 4 puha lépése (`missing-fields`,
  `de-fallback-names`, `zero-price-rows`, `missing-leiras`) között
  **nincs ár-elavultsági lépés**.

## Döntések

### 1. Új, derived ár-követési komparátor a soron — a `nevKoveti` mintáján

Egy sor akkor „követi” az árlistát az árban, ha
`sor.listaEgysegar === basePrice(tetel.ar[penznem])` — DERIVED
összehasonlítás, NEM tárolt flag (a `nevKoveti()`/`leirasKoveti()`
mintáján, `domain/nev.ts:30-33,116-119`).

**Miért:** a projekt már bevált konvenciója szerint a szöveg-mezőknél
(név, leírás) a KÖVETÉS állapota derived, nem tárolt — ugyanez az elv
alkalmazható az árra is, mert a `listaEgysegar` MÁR MA IS a
felvitelkori pillanatkép (D7), pontosan úgy, ahogy a `nevSnapshot`. Egy
tárolt flag (a `mennyisegKezi` mintájára) FELESLEGES lenne itt, mert az
ár-követés MINDIG levezethető a meglévő két mezőből (`listaEgysegar`
vs. az aktuális árlistai érték) — nincs olyan eset, mint a
mennyiségnél, ahol a doki explicit „leválaszthatja” a követést anélkül,
hogy a mögöttes érték is megváltozna.

**Elvetett alternatíva:** egy `arKezi?: boolean` tárolt flag a
`mennyisegKezi` mintájára — elvetve, mert az ár-eltérés MINDIG
egyértelműen eldönthető a meglévő két mezőből, egy külön flag
redundáns állapotot vezetne be, ami elszakadhatna a tényleges
adatoktól.

### 2. Mező- és sor-szintű explicit refresh UI

Minden áreltérő sor egy ⟳ refresh-vezérlőt kap (a mennyiség-szinkron
⟳ mintájára), ami MEGERŐSÍTŐ előnézetet mutat: a régi→új konkrét
értékeket (D120/121), és egy „Hatás a tervre” összegzést (a Kezelések
összege, és — ha aktív egyedi végösszeg van — annak eltolódását is,
D509/510, a 63. tételre hivatkozva).

**Miért:** D120/121/506-513 explicit ezt a részletességet kéri — a
doki ne csak azt lássa, hogy „változott”, hanem PONTOSAN mit és mennyi
hatással.

**Elvetett alternatíva:** néma, azonnali frissítés — elvetve; D114
explicit kizárja az automatikus frissítést (rögzítés, lásd 4. döntés),
minden frissítés a doki tudatos döntése kell legyen.

### 3. Reset megtartja a manuális felülírást, törli azt

A 60. tétel (DP-043) 1–2. döntésében bevezetett név/ár reset-vezérlők
(ami visszaállítja a snapshot-ot az AKTUÁLIS árlistai értékre) ÉS az
itt bevezetett refresh EGYSZERRE a MANUÁLIS felülírást (ha volt) törli,
és visszaáll a default-following állapotba (D136).

**Miért:** D136 explicit ezt kéri — konzisztens elv a projekt más
reset-mintáival (pl. a mennyiség ⟳ visszakapcsolója is törli a
`mennyisegKezi` flaget).

### 4. Árlista-változás NEM módosít automatikusan draftot — rögzítés

Az árlista módosítása (Árlista admin mentés) SOHA nem írja át
automatikusan egy már megnyitott/mentett terv sorait — ez MA IS így
van (a `basePrice()` csak felvitelkor hívódik), a redesign D114 ezt
explicit megerősíti, nem változtat rajta.

**Miért:** rögzítés — ez a D7 pillanatkép-elv közvetlen következménye,
amit a projekt sérthetetlen szabályai (`CLAUDE.md`) is védenek
(„Mentett tervet soha nem rajzolunk újra az aktuális árlistából”).

### 5. Árlista-eltéréssel is finalizálható, soft warning

Egy sor, ami eltér az aktuális árlistától (akár mert manuálisan
felülírták, akár mert azóta változott az árlista, és a doki nem
frissített), NEM blokkolja a véglegesítést — csak egy puha
figyelmeztetés jelzi (D138), a `veglegesitesOr.ts` MEGLÉVŐ puha
`confirmStep`-láncába illesztve, ÖTÖDIK lépésként.

**Miért:** D138 explicit soft warningot kér, nem hard blockot — az
árlista-eltérés (kedvezmény, felár, vagy egyszerűen elavult
pillanatkép) legitim, szándékos állapot lehet, amit a doki tudatosan
hagyhat.

### 6. Feloldja a 49. tétel 2./6. VÁRAKOZÓ döntését

A „Másolás új tervbe” (49. tétel) mostantól VÉGREHAJTHATÓ a saját 2.
döntése szerint (default-following sorok frissítése az AKTUÁLIS
árlistára, a kézi felülírások megtartásával) — a másolás a most
bevezetett derived-komparátort (1. döntés) használja annak
eldöntésére, mely sorok „követték” a forrás árlistát, és ezeket
frissíti; a 49. tétel 6. döntésének figyelmeztetései (inaktív tétel,
örökölt kézi ár markere) szintén erre a mechanizmusra épülnek.

**Miért:** rögzítés/keresztreferencia — a 49. tétel plánja explicit
ezt a függőséget nevezte meg; ez a tétel a hiányzó alapkövet adja meg.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Többpénznemes soronkénti ár — 62. tétel (DP-045); ez a tétel az
  AKTUÁLIS `plan.penznem`-en belüli követést/frissítést fedi, nem a
  pénznemek közötti állapotot.
- Egyedi végösszeg impact-számítása — 63. tétel (DP-046); ez a tétel
  csak HIVATKOZIK rá a refresh-előnézet „Hatás a tervre” sorában.
- A 49. tétel (Másolás új tervbe) saját döntései — ez a tétel csak
  az ALAPKÖVET adja, a 49. tétel dokumentuma tartalmazza a teljes
  másolási logikát.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/nev.ts` (vagy egy új, szomszédos fájl, pl.
  `domain/arKoveti.ts`) — az új derived komparátor (1. döntés), a
  `nevKoveti`/`leirasKoveti` mintáján.
- `app/src/pages/PlanEditorPage.tsx` `LineRow` — a refresh-vezérlő UI
  + megerősítő előnézet (2. döntés).
- `app/src/domain/veglegesitesOr.ts` — új, ötödik puha lépés az
  árlista-eltérésre (5. döntés).
- `app/src/domain/planCopy.ts` `planMasolatKent()` — a default-following
  frissítés tényleges bekötése (6. döntés, a 49. tétel hatóköre).

## Tesztelés (irányadó, nem kimerítő)

- Egy sor, aminek `listaEgysegar`-ja megegyezik az aktuális árlistai
  értékkel, NEM kap refresh-jelzést.
- Egy sor, aminek `listaEgysegar`-ja ELTÉR (mert az árlista azóta
  változott), refresh-jelzést kap, a régi→új érték és a terv-hatás
  megjelenik a megerősítő előnézetben.
- A refresh elfogadása frissíti a snapshotot és törli a manuális
  felülírást (ha volt).
- Az árlista-eltéréssel rendelkező terv véglegesíthető, puha
  figyelmeztetéssel.
- Az árlista admin-mentése SOHA nem módosít automatikusan egy már
  megnyitott/mentett tervet.
