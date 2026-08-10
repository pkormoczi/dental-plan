# Backlog 18. tétel — Fázis törlése megerősítéssel — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 18. tételének („Fázis törlése
megerősítéssel") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat
— az implementáció módja és a részletek kidolgozása a megvalósító
feladata.

## Probléma

A `PlanEditorPage.tsx` `PhaseSection`-jén a „Fázis törlése" gomb (csak
akkor látszik, ha a tervben 1-nél több fázis van — `canDelete`) egyetlen
kattintásra, megerősítés nélkül törli a teljes fázist az összes sorával
együtt (`onDelete` → `draft.fazisok.splice(pi, 1)`). Ez ma az egyetlen
egy-kattintásos, többsoros, helyreállíthatatlan adatvesztési út a
szerkesztőben — egy elgépelt kattintás egy 8 soros, félórányi munkával
összeállított fázist tüntet el nyomtalanul. A piszkozat-autosave a
törlést azonnal rögzíti is, tehát a "Ctrl+Z-vel visszaszerzem" ösztön nem
segít.

## Döntések

### 1. Trigger feltétel: kizárólag a sorok száma dönt

A megerősítő dialógus csak akkor jelenik meg, ha `phase.sorok.length >
0`. Egy átnevezett vagy megjegyzéssel ellátott, de sor nélküli fázis
törlése **egy kattintás marad**, dialógus nélkül — pontosan úgy, mint ma.

**Miért:** a backlog-tétel szó szerinti megfogalmazása ("csak akkor, ha a
fázisban van sor") ezt mondja ki, és ez a legegyszerűbb, egyértelmű
szabály — egyetlen mező (`sorok.length`) dönt, nincs második feltétel,
amit külön kellene karbantartani. Ez tudatosan **eltér** a
`piszkozatTartalmas` (`domain/piszkozat.ts`) precedensétől, ami egy
átnevezett vagy megjegyzéssel ellátott, sor nélküli fázist is
"tartalmasnak" tekint — de az a függvény más kérdésre válaszol (kár
lenne-e elveszíteni a TELJES piszkozatot egy oldalváltáskor/bezáráskor),
nem arra, hogy egy adott fázistörlés mekkora munkát tehet kárba. Egy
átnevezett, de üres fázis újralétrehozása két kattintás ("+ Új kezelési
fázis" + átnevezés); egy 8 soros fázisé nem.

### 2. Dialógus szövege: általános, sorszám vagy összeg nélkül

- **Cím:** „Fázis törlése"
- **Leírás:** „A fázis összes sora törlődik, ez nem vonható vissza.
  Folytatod?"

Nincs benne sem a fázis neve, sem a sorok száma, sem az összeg.

**Miért:** a `PatientPage.tsx` pénznemváltás-dialógusa (a legközelebbi
meglévő minta ugyanerre a "sorok elvesznek" helyzetre) is csak
általánosságban ("A tervben már N tétel szerepel... ezek a sorok
törlődnek") fogalmaz, konkrét tételfelsorolás nélkül. A doki a törlés
pillanatában a képernyőn látja a fázis nevét és a benne lévő sorokat — a
dialógusnak nem kell megismételnie, amit a háttérben úgyis lát; a
sorszám/összeg kiírása plusz formázási függőséget (`formatMoney`) vezetne
be egy olyan helyen, ahol a hozzáadott érték csekély.

### 3. State felemelve a `PlanEditorPage`-be, egyetlen dialógus-gyökér

A dialógus nyitva-állapotát **nem** a `PhaseSection` tartja lokálisan,
hanem a szülő `PlanEditorPage` egy `pendingDeleteIndex: number | null`
state-tel — egyetlen `AlertDialog.Root` az összes fázis alatt/felett, nem
egy-egy a `PhaseSection`-önként. A `PhaseSection` `onDelete` propja mostantól
nem közvetlenül töröl, hanem a szülőben beállítja a pending indexet
(pl. egy `onRequestDelete` prop); a tényleges `draft.fazisok.splice(pi,
1)` + `setFazisResetToken` a dialógus „Törlés" gombjának callbackjében fut
le.

**Miért:** ez a projektben már bevett minta listázott elemek
megerősítő törlésénél/felülírásánál — a `PatientPage.tsx` `pending`
state-je (nyelv/pénznem váltás) és a `PlanHistoryPage.tsx` `pendingOpen`
state-je (piszkozat-felülírás megerősítése verziónkénti "Megnyitás
szerkesztésre" gombokon) ugyanígy egyetlen, felemelt state-tel vezérel
egy közös dialógus-gyökeret több trigger-gomb helyett. Ezt kell követni a
konzisztencia miatt, és mert ez oldja meg természetesen a 4. döntésben
tárgyalt accessible-name-ütközést is.

### 4. Gombfeliratok: „Törlés" / „Mégse" — szándékosan eltér a trigger feliratától

- **Cancel:** „Mégse" (a projekt összes eddigi `AlertDialog.Cancel`-jének
  egységes felirata).
- **Action:** „Törlés", `color="red"` — **nem** „Fázis törlése", noha ez
  lenne a magától értetődő ismétlés.

**Miért:** mivel több fázis is lehet egy tervben, és a `canDelete` gate
(≥2 fázis) miatt egyszerre több „Fázis törlése" trigger-gomb is a DOM-ban
marad, amíg a dialógus nyitva van, egy azonos feliratú `AlertDialog.Action`
gomb megkülönböztethetetlen lenne accessible name alapján a még látható
trigger-gomboktól (`getByRole('button', { name: 'Fázis törlése' })`
kettőt vagy többet találna). A `PlanHistoryPage.tsx` pontosan emiatt ad a
saját megerősítő gombjának ("Szerkesztés, piszkozat elvetésével") eltérő
feliratot a sorbeli trigger ("Szerkesztés új verzióként") helyett — lásd az
ottani kód-kommentet és a hozzá tartozó tesztet. A rövid „Törlés" elég a
megkülönböztetéshez, nem kell a `PlanHistoryPage` didaktikus,
hosszabb mintáját másolni, mert itt a dialógus címe („Fázis törlése") már
egyértelművé teszi, mi történik.

### 5. Ami változatlan marad

Az alábbiak a mai viselkedést tartják, a tétel ezeket szándékosan nem
érinti:

- **`canDelete` (`plan.fazisok.length > 1`)** — a törlés gomb továbbra is
  csak akkor látszik, ha 1-nél több fázis van; az utolsó fázis törlésének
  engedélyezése/tiltása nem ennek a tételnek a kérdése.
- **A tényleges törlési mechanizmus** — `draft.fazisok.splice(pi, 1)` +
  `setFazisResetToken((n) => n + 1)` (a P1-7 megjegyzés szerint a maradék
  `PhaseSection`-ök remountolásához, hogy a `pi`-index-eltolódás ne
  vándoroltasson át lokális UI-állapotot egy másik fázisra) — csak a
  hívás helye mozdul a dialógus megerősítő gombjába.
- **`celFazisIndex` clamping** (`Math.min(celFazisIndex, plan.fazisok.length
  - 1)`, a fogtérkép-kattintás célfázis-választójához) — ez már ma is
  kezeli, ha egy törlés miatt egy korábban kiválasztott célfázis-index
  lógóvá válna; nincs hozzá teendő.

### 6. Tesztelés

`PlanEditorPage.test.tsx` bővítése két esettel:

- **Sorral rendelkező fázis:** a „Fázis törlése" gombra kattintva a
  dialógus megjelenik, a fázis és sorai a „Mégse"-re NEM törlődnek; a
  „Törlés"-re a fázis (és minden sora) eltűnik, a dialógus bezárul.
- **Üres fázis (nincs sora):** a „Fázis törlése" gombra kattintva a
  fázis azonnal eltűnik, dialógus nélkül — a mai, változatlan viselkedés
  regressziós védelme.

**Miért:** ez a két eset fedi le az 1. döntés (trigger-feltétel) teljes
igazságtábláját, és biztosítja, hogy az „üres fázis egy kattintással
törölhető" viselkedés a refaktor után is megmaradjon.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Az utolsó megmaradó fázis törlésének engedélyezése** — lásd 5.
  döntés, a `canDelete` gate változatlan.
- **Sortörlés (`onRemoveLine`) megerősítése** — a backlog-tétel kifejezetten
  a fázistörlésről szól; egyetlen sor törlése nem "többsoros,
  helyreállíthatatlan adatvesztés", a meglévő egy-kattintásos viselkedés
  marad.
- **Általános undo/visszavonás** — lásd `docs/08-backlog.md` SOHA lista;
  ez a tétel (a piszkozat-autosave-vel együtt) töredékáron fedi a valós
  esetet egy teljes undo-rendszer nélkül.
- **A törölt fázis tartalmának ideiglenes megőrzése/visszaállítása**
  (pl. "visszavonás" toast a törlés után) — ugyanaz az indoklás, mint
  fent; a dialógus MEGELŐZI a téves törlést, nem utólag orvosolja.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx`
  - Új `pendingDeleteIndex: number | null` state a fő komponensben.
  - A `PhaseSection`-nek átadott `onDelete` prop átalakítása/átnevezése
    úgy, hogy a fázisban lévő sorok számától függően vagy közvetlenül
    töröl (üres fázis), vagy beállítja a `pendingDeleteIndex`-et (van
    sor) — az elágazás helye eldöntendő az implementáló által (a
    `PhaseSection` vagy a szülő dönti-e el a `sorok.length > 0` ágat).
  - Egyetlen új `AlertDialog.Root` a fázis-lista után, a `PatientPage.tsx`/
    `PlanHistoryPage.tsx` mintáját követve (`Cancel` = „Mégse”, `Action`
    = „Törlés”, `color="red"`).
- `app/src/pages/PlanEditorPage.test.tsx` — a 6. döntésben leírt két új
  eset.
