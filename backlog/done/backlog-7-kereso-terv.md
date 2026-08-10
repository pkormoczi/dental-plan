# Backlog 7. tétel — Kereső: néma találat-csonkítás jelzése + admin kereső kiegészítése némettel — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 7. tételének („Kereső: néma
találat-csonkítás jelzése + admin kereső kiegészítése némettel")
megbeszélt megvalósítási döntéseit rögzíti, implementáció-indításhoz. Nem
tartalmaz kódot vagy függvényszignatúrákat — az implementáció módja és a
részletek kidolgozása a megvalósító feladata. A tétel két, egymástól
független részből áll (a kettő közötti egyetlen kapcsolat a 3. döntésben
kiemelt közös helper).

## Probléma (a mai állapot)

**Csonkítás.** Az `ItemPicker.tsx` (a tervszerkesztő tétel-keresője, a
CLAUDE.md „UX kritikus pontja") `results` `useMemo`-ja
(`ItemPicker.tsx:88-94`) `.slice(0, 12)`-vel vág — ha egy keresésre 13+
találat van, a doki néma csonkítást kap, semmi nem jelzi, hogy több
találat is létezik a beírt szöveg pontosítása nélkül.

**Hiányzó német egyezés az adminban.** A `PriceListAdminPage.tsx` `keep()`
szűrője (`PriceListAdminPage.tsx:103`) kizárólag `norm(x.nev.hu)` ellen
illeszt. Az `ItemPicker` ezzel szemben már ma is mindkét nyelven keres
(`ItemPicker.tsx:92`, CLAUDE.md „A UX kritikus pontja" — „Mindkét nyelven
keres… függetlenül a terv nyelvétől") — az admin ebben inkonzisztens: egy
csak a `nev.de`-ben található szöveggel nem található meg a tétel az admin
keresőjében, holott a szerkesztőben igen.

## Döntések

### 1. Csonkítás-jelzés az `ItemPicker`-ben — pontos szám, statikus sor

A találati lista 12 tétele ALATT egy nem választható, statikus sor jelenik
meg, ha a teljes szűrt találatszám 12-nél nagyobb: „+N további találat —
pontosíts a kereséssel", ahol N a levágott találatok pontos száma
(`teljesTalálatszám - 12`). A sor nem kap `hi` (highlight) indexet, nem
vesz részt a nyíl/Enter billentyűzet-cikluson (`opcioSzam` változatlan
marad — csak a `results` és az „egyedi" pszeudo-opció számít bele) —
ugyanúgy tisztán tájékoztató, mint a mai „Nincs találat." szöveg.

Ha a teljes találatszám pontosan 12 (vagy kevesebb), NEM jelenik meg
semmi — a lista ilyenkor tényleg teljes.

A 12-es megjelenítési limit változatlan marad, ez a tétel kizárólag a
jelzést vezeti be, nem a limitet emeli. Mindkét `ItemPicker`-példányra
vonatkozik (a fázis alatti `'inline'` és a soron belüli `'portal'`
változat is), mert egy közös `list` markupot használnak
(`ItemPicker.tsx:163-259`).

**Miért:** a backlog címe kifejezetten „jelzés"-t kér, nem limit-emelést —
egy nagyobb limit csak elodázná, hogy a doki észrevegye, hogy pontosítania
kell (a valódi gyökérprobléma az adatban lévő elgépelések, azt a 8. tétel
kezeli). A pontos szám informatívabb, mint egy általános utalás, és
számolása triviális (118 tételes árlista, nincs perf-kockázat).

### 2. Admin kereső kiegészítése némettel — azonos logika, mint az `ItemPicker`

A `keep()` szűrő `norm(x.nev.hu).includes(nq)` feltétele kiegészül VAGY
kapcsolattal `norm(x.nev.de).includes(nq)`-vel — pontosan az `ItemPicker`
mai mintáját követve. A `norm()` már null-biztos (`search.ts:9`, lásd
`search.test.ts:17-20`), ezért `nev.de === null` esetén nincs szükség
külön `?? ''` kezelésre.

A táblázat sora változatlanul mindig `it.nev.hu`-t mutatja
(`PriceListAdminPage.tsx:231`) — nincs külön vizuális jelzés arra, hogy
egy találat kizárólag a német néven keresztül jött létre. A keresőmező
placeholder szövege („Keresés a tételek között…") változatlan marad.

**Miért:** a cél az, hogy egy csak németül elnevezett/csak a német nevében
elgépelt tétel egyáltalán megtalálható legyen az adminban (ez ma
inkonzisztens az `ItemPicker`-rel) — nem egy új UI-elem bevezetése arra,
hogy megjelölje, MIÉRT találta meg. Ez utóbbi többlet-UI lenne, amit a
backlog szövege nem kér.

### 3. Közös kétnyelvű név-egyezés helper — kiemelve `domain/search.ts`-be

Mivel a kétnyelvű OR-egyezés logika a 2. döntés után két helyen élne
szó szerint ugyanabban a formában (`ItemPicker.tsx` és
`PriceListAdminPage.tsx`), egy új export kerül a `domain/search.ts`-be
(pl. `nevEgyezik(nev: LokalizaltSzoveg, nq: string): boolean` — a pontos
elnevezés a megvalósító döntése). A függvény a MÁR normalizált
keresőszöveget (`nq`) várja paraméterként, nem a nyers `q`-t — ez
megtartja a mai mintát, ahol a hívó a ciklus ELŐTT egyszer normalizál
(`ItemPicker.tsx:90`), nem tételenként újra.

Mindkét hívási hely átáll erre: az `ItemPicker` `results` `useMemo`-ja
(`ItemPicker.tsx:91-93`) és az admin `keep()` függvénye
(`PriceListAdminPage.tsx:103`).

**Miért:** a CLAUDE.md „Meglévő segédfüggvények — használd, ne írd újra"
szelleme — ha a szabály (pl. egy jövőbeli fuzzy-keresés bővítés) valaha
módosul, egy helyen kelljen változtatni, ne kettőn, amik idővel
elcsúszhatnak egymástól.

### 4. Tesztek

- `ItemPicker.test.tsx` (ÚJ eset): 13+ találatot adó keresés esetén
  megjelenik a „+N további találat" sor a helyes N-nel; a sor nyíllal nem
  érhető el és Enterrel nem választható (a billentyűzet-ciklus a 12.
  találatnál/az egyedi opciónál marad).
- `PriceListAdminPage.test.tsx` (ÚJ eset): egy tétel, aminek csak a
  `nev.de`-je tartalmazza a keresett szöveget (a `nev.hu` nem), megjelenik
  a szűrt listában.
- `domain/search.test.ts` (ÚJ eset, a meglévő `norm()`-teszt mintája
  szerint): az új helper közvetlen unit tesztje — HU-egyezés,
  DE-egyezés, egyik sem egyezik, `nev.de === null` eset.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Fuzzy/elgépelés-tűrő keresés** (Levenshtein-távolság) — a backlog
  szövege explicit kizárja: „nem javasolt, mert az adattisztítás (8.
  tétel) olcsóbban old meg ugyanannyi problémát."
  Ez a tétel a Függelék C napi „Neodetn" elgépelést sem oldja meg — az
  adat javítása a 8. tétel dolga.
- **A 12-es megjelenítési limit megemelése** — kifejezetten elvetve
  (1. döntés), a limit változatlan marad.
- **Vizuális jelzés arra, hogy egy admin-találat a DE névből jött** —
  kifejezetten elvetve (2. döntés), a sor mindig `nev.hu`-t mutat.
- **A keresőmező placeholder-szövegeinek módosítása** (sem az adminban,
  sem az `ItemPicker`-ben) — változatlan marad mindkét helyen.
- **A „Nincs találat." (nulla-találatos) üzenet** — ez már ma is létezik
  és megfelelően működik mindkét helyen, ez a tétel nem nyúl hozzá, csak
  a 12 FÖLÖTTI (nem a nulla) esetet célozza.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/search.ts` — új export (kétnyelvű név-egyezés helper,
  3. döntés).
- `app/src/domain/search.test.ts` — új tesztek az új helperre.
- `app/src/pages/planEditor/ItemPicker.tsx`
  - `results` `useMemo` (88-94. sor): a teljes szűrt tömb és a rávágott
    12-es lista külön számítva (a teljes hossz kell a jelzéshez); az
    egyezés-logika az új helperre áll át.
  - `list` markup (163-259. sor): új statikus sor a 12 találat és az
    „egyedi" opció közé, csak ha a teljes találatszám > 12.
- `app/src/pages/planEditor/ItemPicker.test.tsx` — új teszt (4. döntés).
- `app/src/pages/PriceListAdminPage.tsx` — `keep()` (103. sor) az új
  helperre áll át.
- `app/src/pages/PriceListAdminPage.test.tsx` — új teszt (4. döntés).
- `docs/08-backlog.md` — a 7. tétel leírásának „KÉSZ" jelölése
  implementáció után, a dátummal — az 1-3. tétel mintája szerint.
