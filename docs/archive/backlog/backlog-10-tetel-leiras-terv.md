# Backlog 10. tétel — Tétel-leírás a csomagtételekhez — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 10. tételének ("Tétel-leírás a
csomagtételekhez") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat —
az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

Egy összetett tétel (pl. „All-on-4 Anax csomag") ma egyetlen sorként megy
be a tervbe, egyetlen árral — a páciens megkérdezi, mi van benne, és a
dokinak nincs mit mutatni, csak amit szóban elmond (az első körös
doktor-nap narratíva B napja). Nincs mező, ami a sor tartalmát részletezné, sem az
árlistán (a tétel törzsadatában), sem a terven (a soron, D7 szerint
pillanatképként).

**Központi ütközés, amit ez a tétel felold:** D13 kifejezetten kizár egy
általános, sor-szintű megjegyzés-oszlopot (`docs/01-attekintes-es-dontesek.md`:
„Nem külön megjegyzés oszlop. Megjegyzés fázis szinten van"), és a
`docs/08-backlog.md` SOHA-listája ezt meg is ismétli. Az itt bevezetett
mező ezért **nem** általános jegyzet — szigorúan "mi van ebben az egy
sorban" tartalmat rögzít, ezt a UI címkézése is kikényszeríti (10.
döntés).

## Döntések

### 1. Hatókör — bármelyik tétel/sor kaphat leírást, nincs kötelező kategória

Nincs bevezetve formális "ez egy csomag" besorolás, ami *korlátozná*,
mely tételek kaphatnak leírást — bármelyik árlistai tétel és bármelyik
egyedi sor (backlog-3) is kaphat. A `Tetel.csomag` flag (13. döntés) egy
**különálló**, szűk célú mező, ami csak a véglegesítés-őrt vezérli, nem a
leírás-mező elérhetőségét.

**Miért:** a leírás hasznossága nem korlátozódik a formálisan "csomagnak"
minősülő tételekre — egy egyszerűbb tétel mellé is írható egy pontosító
mondat. Egy hozzáférés-korlátozó flag plusz admin-döntést (mi számít
csomagnak a 118 tételből) igényelne olyan helyen, ahol semmi nem indokolja.

### 2. Kétnyelvű mező az árlistában — `Tetel.leiras: LokalizaltSzoveg`

Ugyanaz a szerkezet, mint a `nev` mezőn (`{ hu: string; de: string | null
}`) — nem egyetlen magyar string.

**Miért:** D21 szerint a páciensnek szóló szöveg a terv nyelvén jelenik
meg; egy csak-magyar leírás vagy hiányozna, vagy hibásan magyarul
nyomtatódna ki egy német terven. A `nev` mintájának követése konzisztens
és nem igényel új mintázatot.

### 3. Sor-szintű pillanatkép, teljesen a `nevSnapshot` mintáján

`Sor.leirasSnapshot: string` — felvételkor a `Tetel.leiras[nyelv]`
aktuális értékéről indul, utána a szerkesztőben szabadon átírható
("átírt" jelvénnyel, ha eltér az árlistától), és nyelvváltáskor a
`nevKoveti`/`applyNyelv` (`PatientPage.tsx`) mintájára újraszinkronizál,
**hacsak** a doki kézzel nem pontosította — ugyanaz a "kézzel írt szöveg
nem íródik felül" elv, mint a névnél (`docs/01-attekintes-es-dontesek.md`
D24).

**Miért:** a döntés explicit cél volt a konzisztencia a névkezeléssel —
nem külön, egyszerűsített mechanizmus, hanem ugyanaz a már bevált minta.
Ehhez egy `nevKoveti`-hez hasonló, de a `leiras` mezőre néző segédfüggvény
kell (`app/src/domain/nev.ts`, elnevezés az implementáció feladata) —
**ne** hasznosítsuk újra közvetlenül a `nevKoveti`-t rossz mezőre, mert az
a `nev`/`nevSnapshot` párra van írva.

### 4. Hiányzó német leírás — néma elhagyás, NEM esik vissza magyarra

Ha `Tetel.leiras.de` (vagy a soron szinkronizált `leirasSnapshot`) üres
egy német nyelvű terven, a leírás egyszerűen nem jelenik meg — nincs HU
jelvény rá, nem esik vissza magyar szövegre, és nem számít bele a
`lefedettseg()` készültség-számításba vagy a `fallbackSorok`
véglegesítés-őr diagnosztikájába.

**Miért:** a leírás kiegészítő, díszítő tartalom, nem a sor lényege (azt a
név hordozza) — a névhez hasonló szigorú fallback-apparátus
(`sorFallback`, HU jelvény, `lefedettseg()`) túlkezelés lenne egy
opcionális mezőhöz. Ez tudatosan **más** viselkedés, mint a névé — a
szinkronizálás mechanizmusa (3. döntés) ugyanaz, de a "mi van, ha
üres/hiányzik" ág más.

### 5. Egyedi sor is kaphat leírást

Az egyedi (árlistán kívüli, `tetelId === ''`) sor is kaphat leírást —
mivel nincs háttér-`Tetel`, ez mindig szabadon beírt szöveg, "átírt"/HU
jelvénynek nincs értelme (nincs mihez viszonyítani), nyelvváltás nem
érinti.

**Miért:** egy egyedi soron (pl. egyedi anyagköltség) ugyanúgy hasznos
lehet egy pontosító leírás, mint egy árlistai csomagtételen — nincs ok a
kizárásra, és a mechanizmus (szabad szöveg egy mezőben) ugyanaz, mint a
backlog-3 egyedi sor névmezője.

### 6. Formátum — többsoros szabad szöveg, sortörés megtartva

Textarea az adminban és a szerkesztőben is; a beírt sortörések a PDF-en
is átjönnek (nem egyetlen automatikusan tördelt bekezdés).

**Miért:** egy csomagtartalom felsorolásszerű megjelenítést kíván (pl.
"Implantátum / Felépítmény / Korona / Anesztézia" egymás alatt) — ez a
doktor-nap narratíva B napi "mi van ebben az egy sorban" kérdésre
olvashatóbb választ ad, mint egy folyó mondat.

### 7. Puha hosszkorlát-figyelmeztetés

Kb. 300 karakter / 5 sor fölött halvány, nem blokkoló figyelmeztetés
jelenik meg a mező alatt (pl. "hosszú leírás — ellenőrizd a nyomtatási
képet") — ugyanaz a minta, mint a fogszám-mismatch figyelmeztetés ma
(`domain/teeth.ts` köré épülő UI).

**Miért:** a többsoros szabad szöveg (6. döntés) és `pdf/TervDocument.tsx`
ismert, dokumentált elrendezési kockázata (a fájl saját kommentje szerint
már ma "német layout-törés" kockázatot jelez) miatt indokolt egy olcsó,
nem blokkoló védőháló — de a mezőt magát nem szabad mesterségesen
korlátozni, mert ez egy ártáblázat sora, nem külön dokumentum, és a
react-pdf amúgy is automatikusan tördel és növeli a sormagasságot.

### 8. Szerkesztői UI — összecsukható "+ leírás" trigger

A `LineRow` "Beavatkozás" cellájában egy kis "+ leírás" link/ikon jelenik
meg a névmező mellett (a többi jelvény — egyedi/sávos/HU/átírt/kedvezmény
— társaságában); kattintásra egy textarea nyílik ki a sor alatt, teljes
szélességben. Ha van már tartalma, jelvény jelzi, hogy ki van töltve.

**Miért:** a legtöbb sornak sosem lesz leírása — egy mindig látható, üres
mező vizuális zajt jelentene egy már ma is sűrű sortáblázatban. Az
összecsukható trigger csak azoknál a soroknál foglal helyet, ahol
ténylegesen van tartalom vagy a doki épp bővíti.

### 9. PDF megjelenítés — behúzott, szürke, kisebb betű a tételsor alatt

Minden leírás-sor (a `\n` mentén tördelve) külön sorként jelenik meg a
tételsor alatt, behúzással, halványabb szürke színnel és kisebb
betűmérettel — alrészletnek olvasódik, nem új tételsornak. Hasonló
stílus, mint a `savosFootnote` (`pdf/TervDocument.tsx`), de soronkénti,
nem oldal-szintű elem.

**Miért:** vizuálisan egyértelműen alá kell rendelni a fő tételsornak
(név/darabszám/ár), hogy ne keltse egy plusz tételsor benyomását, és ne
zavarja az összegzés-oszlopok olvashatóságát.

### 10. Címkézés — "Leírás (mi van benne?)" — D13-határ védelme

A mező felirata a szerkesztőben és az adminban is explicit a
csomagtartalomra utal ("Leírás (mi van benne?)"), placeholder példával
("pl. Implantátum, felépítmény, korona") — nem semleges "Megjegyzés"
címke.

**Miért:** ez a fő védelem az ellen, hogy a mező D13 tiltása (általános
sor-szintű megjegyzés-oszlop) felé csússzon — a `Fog` mező és a
fázis-szintű `megjegyzes` marad az egyetlen szabad jegyzet-csatorna,
ez a mező kifejezetten és csak "mi van ebben a sorban" tartalomra való,
amit a UI szövege is folyamatosan megerősít.

### 11. Keresés hatóköre — változatlan, csak név

Az `ItemPicker` keresés (`norm()`, ékezetfüggetlen) továbbra is csak a
`nev.hu`/`nev.de` mezőkben keres — a `leiras` szövege nem bővíti a
találati kört.

**Miért:** a leírás páciensnek szóló kiegészítő szöveg, nem keresési
kulcsszó-forrás — a bővítés kevésbé kiszámítható találati listát adna,
anélkül hogy valós igény merült volna fel rá.

### 12. Nyomtatáskori be/ki kapcsoló — `Plan.leirasokMutatasa`

Új, plan-szintű boolean mező (`leirasokMutatasa`), alapértelmezetten
`true` új terv létrehozásakor, kapcsolóval a `PlanEditorPage`-en (nem a
`PreviewPage`-en). Egy már létező, a mező bevezetése előtt mentett
`terv.json` betöltésekor a hiányzó mező `true`-ként értelmezendő.

**Miért:** egy hosszabb, sok csomagtétellel teli terv túl hosszúra
nőhetne a leírásokkal — a doki kézben tartja, hogy egy adott tervnél
megjelenjenek-e. A `PlanEditorPage` azért lett a helye, mert ez egy
terv-szintű beállítás, ugyanott, ahol a többi terv-szintű tartalom
szerkesztődik, nem egy nyomtatás-idejű, eldobható opció. A hiányzó mező
`true`-ra értelmezése azért biztonságos/gyakorlatilag ártalmatlan, mert
régi terveken úgysincs `leirasSnapshot` sehol — a döntés csak elvi
konzisztencia az új tervek alapértelmezésével.

Ez egy rendes `Plan`-mező, ugyanúgy pillanatkép-jellegű, mint `nyelv`/
`penznem` — betöltéskor (`loadPlanIntoDraft`) és `frissDatummal`-nál
(backlog-2) **nem** nullázódik, változatlanul öröklődik egy visszatöltött
tervben induló új verzióba.

### 13. `Tetel.csomag: boolean` — újra bevezetve, DE szűken

Az 1. döntésben kizártunk egy hozzáférés-korlátozó "csomag" flaget — ez a
döntés egy **különálló**, szűkebb célú flaget vezet be, ami **kizárólag**
a 14. döntés puha véglegesítés-őrét vezérli ("ennél a tételtípusnál
elvárt egy leírás"). A leírás mező elérhetősége (ki kaphat leírást)
továbbra is korlátlan (1. döntés), erre a flag nem hat.

**Miért:** ez a session eredetileg ellentmondásba futott — a "csak
csomagon blokkoljon a véglegesítés-őr" igény formális csomag-fogalom
nélkül nem valósítható meg. A user explicit megerősítette, hogy újra
akarja vezetni a flaget, de kifejezetten csak erre a szűk célra, nem
általános kategorizálásra. Az admin adja a checkboxot (`ItemEditor`,
`PriceListAdminPage.tsx`), alapértelmezetten `false` minden meglévő
tételen — a doki utólag jelöli be, melyik a 118 tételből "csomag jellegű"
(hasonlóan ahhoz, ahogy a `gyakori` csillag is ma jórészt kitöltetlen,
folyamatban lévő admin-munka, nem ennek a tételnek a feladata).

### 14. Véglegesítés-őr — puha megerősítő lépés, NEM kemény blokk

Ha egy `csomag: true` tételre hivatkozó soron nincs kitöltve a
`leirasSnapshot`, a `PreviewPage` **puha** megerősítő lépésként kezeli —
ugyanabba a `confirmStep`-láncba illesztve, mint a hiányzó német
fordítások (`de-fallback-names`), NEM a `kitoltetlenSorok` kemény
blokkjába. A doki látja a figyelmeztetést, de tudatosan átugorhatja és
véglegesíthet leírás nélkül is.

**Miért:** ez minőségi/kommunikációs segédlet, nem jogi vagy
adatintegritási követelmény (szemben az üres névvel, ami tényleges
hibás/névtelen dokumentumot eredményezne) — egy kemény blokk kockázatos
lenne olyan valós helyzetben, ahol a doki tudatosan, jogosan akarna
leírás nélkül véglegesíteni (pl. sietős konzultáció, szóban már
elmagyarázva). Ehhez a `kitoltetlenSorok`-tól **elkülönített** új
segédfüggvény kell (`domain/kitoltetlen.ts` mellé vagy `domain/nev.ts`-hez
hasonló hely, elnevezés az implementáció feladata), ami a `csomag`
tételekre hivatkozó, üres `leirasSnapshot`-ú sorokat gyűjti.

### 15. Szerkesztői inline jelzés — a HU jelvény mintája

A `LineRow`-ban, ha a sor egy `csomag: true` tételre hivatkozik és
`leirasSnapshot` üres, egy inline (amber) jelvény/hint jelenik meg a "+
leírás" trigger mellett — ugyanaz a minta, mint a `HuChip` ma a hiányzó
német névre.

**Miért:** korai visszajelzés — a doki már szerkesztés közben lássa, hogy
egy csomagsorhoz hiányzik a leírás, ne csak a `PreviewPage`
véglegesítés-őrében derüljön ki a végén.

### 16. `schemaVersion` — nem emelkedik

A négy új mező (`Tetel.leiras`, `Tetel.csomag`, `Sor.leirasSnapshot`,
`Plan.leirasokMutatasa`) mind opcionális/hátrafelé kompatibilis bővítés —
ugyanaz a precedens, mint a backlog 2/3/9. tételénél.

**Miért:** a `schemaVersion` (D18) a betöltés-elutasítás kapcsolója
magasabb verziónál — ez csak akkor indokolt, ha egy régi betöltő-kód
*hibásan* értelmezne egy új mezőt. Itt a hiányzó mezők egyszerűen
`undefined`/`false`/`true` (12. döntés) alapértelmezéssel kezelendők,
nincs kétértelműség.

### 17. Mezőnevek — megerősítve

`Tetel.leiras: LokalizaltSzoveg`, `Tetel.csomag: boolean`,
`Sor.leirasSnapshot: string`, `Plan.leirasokMutatasa: boolean` — a doki
jóváhagyta ezeket a schema-kulcsokat, véglegesnek tekinthetők
(`docs/02-domain-modell.md` és `app/src/domain/types.ts` frissítésekor
ezekkel az elnevezésekkel).

## Tesztelés

Egységteszt kell legalább:
- A `leirasSnapshot` nyelvváltáskori újraszinkronizálására (követi az
  árlistát, hacsak nincs kézzel átírva — a `nevKoveti`-teszthez hasonló
  eset-mátrix: követi / nem követi / egyedi sor).
- A hiányzó-csomag-leírás gyűjtő segédfüggvényre (14. döntés): `csomag:
  true` tétel üres leírással bekerül a listába, `csomag: false` vagy
  kitöltött leírás nem.
- A `leirasokMutatasa` hiányzó mező betöltéskori `true` értelmezésére
  (12. döntés).
- A PDF-renderelés sortörés-kezelésére (6. döntés): többsoros
  `leirasSnapshot` külön sorokként jelenik meg.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Kategória-CRUD / tömeges csomag-besorolás a 118 tételen** — ez a
  tétel csak a mechanizmust építi (mező + admin checkbox); a doki utólag,
  admin-munkával jelöli be, melyik tétel "csomag jellegű" (8. backlog-tétel
  köréhez hasonló, folyamatban lévő adattakarítás, nem ennek a fejlesztési
  körnek a feladata).
- **ItemPicker keresés bővítése a leírás szövegére** — kizárva (11.
  döntés).
- **Soronkénti (nem plan-szintű) leírás-elrejtés** — csak egyetlen,
  globális `Plan.leirasokMutatasa` kapcsoló van, nem soronkénti "ezt a
  leírást ne nyomtasd" opció — nem merült fel igényként.
- **Valódi strukturált "csomag = tételek listája"** — a `docs/08-backlog.md`
  KÉSŐBB listáján szerepel, szándékosan kizárva; ez a szabad szöveges
  leírás-mező pontosan azért létezik, hogy kiváltsa ezt az igényt
  séma-törés nélkül.
- **A `Tetel.csomag` flag bármilyen más felhasználása** (pl. külön
  szűrő/böngésző az adminban, jelvény az `ItemPicker` találati listáján) —
  a flag kizárólag a 14. döntés véglegesítés-őrét vezérli ebben a körben.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` — négy új mező: `Tetel.leiras`,
  `Tetel.csomag`, `Sor.leirasSnapshot`, `Plan.leirasokMutatasa` (17.
  döntés).
- `app/src/domain/nev.ts` — a `leirasSnapshot` nyelvváltáskori
  szinkronizálásához a `nevKoveti` mintájára írt, de a `leiras` mezőre
  néző segédfüggvény (3. döntés); a hiányzó német leírás **nem** kerül a
  `fallbackSorok`/`lefedettseg()` diagnosztikába (4. döntés).
- `app/src/pages/PatientPage.tsx` `applyNyelv` (kb. 62-82. sor) —
  bővítendő a `leirasSnapshot` szinkronizálásával, a `nevSnapshot`-hoz
  hasonló, régi-nyelv-alapú összehasonlítással.
- `app/src/domain/kitoltetlen.ts` — **nem** módosul (a kemény
  `kitoltetlenSorok` kritériuma marad `nevSnapshot`-alapú); a hiányzó
  csomag-leírás gyűjtésére új, különálló export kell (14. döntés).
- `app/src/pages/PreviewPage.tsx` — új ág a `confirmStep`-láncba (jelenleg
  `'missing-fields' | 'de-fallback-names' | null`), a hiányzó
  csomag-leírásokra (14. döntés).
- `app/src/pages/PlanEditorPage.tsx` `LineRow` — "+ leírás" összecsukható
  trigger + textarea (8. döntés), inline hiány-jelvény csomag-tételekre
  (15. döntés); a `leirasokMutatasa` kapcsoló elhelyezése az oldalon (12.
  döntés).
- `app/src/pages/PriceListAdminPage.tsx` `ItemEditor` (kb. 306-390. sor
  körül) — `leiras.hu`/`leiras.de` textarea-pár a `nev.hu`/`nev.de`
  mezőpár mintájára, plusz egy `csomag` checkbox (13. döntés).
- `app/src/pdf/TervDocument.tsx` — a tételsor (kb. 238-249. sor) alá
  behúzott, szürke, kisebb betűs leírás-sorok renderelése, soronként
  tördelve (9. döntés), csak ha `plan.leirasokMutatasa` igaz.
- `app/src/domain/piszkozat.ts` `piszkozatTartalmas` — nincs kötelező
  teendő, de érdemes átgondolni, hogy a `leirasokMutatasa` önmagi
  módosítása (tartalom nélkül) ne számítson "tartalmas" piszkozatnak,
  ugyanúgy, ahogy `nyelv`/`penznem` váltása sem.
