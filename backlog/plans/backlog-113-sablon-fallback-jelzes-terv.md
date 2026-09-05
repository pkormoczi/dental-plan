# Backlog 113. tétel — A „sablon HU-visszaesés" jelzés hamis, ha a magyar tartalék is placeholder — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 113. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

Az Előnézet lap sablon-betöltése a terv nyelvén nem elérhető (hiányzó vagy
placeholder-jelölésű) sablonnál a magyar szövegre esik vissza, és ezt a tényt
egy puha checklist-tételen jelzi: „a tervhez tartozó sablon nem érhető el a
megfelelő nyelven — helyette a magyar szöveg jelenik meg a nyomtatványon".

A visszaesés jelzése azonban akkor is megtörténik, ha maga a magyar tartalék
is placeholder-jelölésű vagy üres. Ilyenkor a szakasz a
`docs/03-funkcionalis-spec.md` § Sablon-placeholder őr szerint a címével
együtt kimarad a nyomtatványból — a doki tehát **egyszerre két, egymásnak
ellentmondó üzenetet lát ugyanarra a hiányra**: a helyes „kimarad a
nyomtatványból" mellett a valótlan „helyette a magyar szöveg jelenik meg"-et.

Ez ma minden nem-magyar terven előfordul, mert a Garancia szakasz szövege
mindkét nyelven placeholder (a magyar forrásszöveg megadása külön, nem
kódtétel — `backlog/BACKLOG.md` 24. tétel). A hiba nem esztétikai: egy
aláírásra kerülő dokumentum tartalmáról állít valótlant, és egy időhiányos
dokit felesleges PDF-átvizsgálásra késztet („hol van az a magyar rész?").

Forrás: `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 2. megállapítás
(megfigyelt, élőben reprodukált).

## Döntések

### 1. A visszaesés-jelzés a TÉNYLEGESEN renderelt tartalomról szóljon

A HU-tartalékra esés önmagában nem elég a jelzéshez: a jelzés csak akkor jár,
ha a tartalék szövege ténylegesen a nyomtatványra kerül — azaz a meglévő,
egyetlen `sablonNyomtathato()` predikátum (`app/src/domain/templates.ts`)
szerint nyomtatható. Ha a tartalék maga is placeholder-jelölésű vagy üres, a
visszaesés-jelzés elmarad.

**Miért:** így a jelzés és a generált PDF **konstrukció szerint** nem tud
szétcsúszni — ugyanaz a predikátum dönt a jelzésről, mint a szakasz
nyomtatványra kerüléséről (`pdf/TervDocument.tsx`). Ez nem új szabályt vezet
be, hanem a meglévő „egyetlen predikátum, egyetlen helyen" elvet
(`docs/03-funkcionalis-spec.md` § Sablon-placeholder őr) terjeszti ki a
checklist-jelzésre is.

Elvetett alternatíva volt a jelzés szövegének átfogalmazása („…a magyar
szöveg jelenne meg, ha lenne") — ez a valótlan állítást pontatlanná
finomítaná, de nem szüntetné meg a két, ugyanarra a hiányra adott, egymással
versengő üzenetet. Szintén elvetve: a jelzést a `sablon-kihagyott-szekcio`
tételbe olvasztani — az a szakasz-kihagyásról szól, ez a nyelvi visszaesésről;
a kettő függetlenül is előfordulhat (magyar tartalék valódi szöveggel), a
`docs/03` külön puha tételként írja le mindkettőt.

### 2. A szabály mind a három sablonra vonatkozik, egy helyen eldöntve

A nyilatkozat, a fizetési feltételek és a garancia ugyanazt a szabályt kapja,
és a döntés a közös betöltő-segédben születik, nem a három hívási helyen
külön.

**Miért:** a nyilatkozatra ma nincs placeholder-alapú visszaesés (a
placeholder-esetét a kemény zár kezeli), de a *hiányzó* német nyilatkozat
visszaesik a magyarra — ha az a magyar szöveg is placeholder, a nyilatkozat és
aláírás oldal a zár miatt úgyis kimarad, tehát a „helyette a magyar szöveg
jelenik meg" ott is valótlan. Egy szabály, egy helyen kevesebb, mint két,
egymástól eltérő ág, amik később szétdrifthetnek.

Elvetve: a javítást a két, ténylegesen félrejelző sablonra (fizetési
feltételek, garancia) szűkíteni. Kisebb változás lenne, de tudatosan bent
hagyna egy ismert, valótlan üzenetet a harmadik ágon.

### 3. A jelzés marad igen/nem, nem sorolja fel az érintett szakaszokat

A véglegesítés-őr `sablon-fallback` tételének szerződése és szövege
változatlan: egyetlen logikai jelzés, nincs darabszám-jelvény és nincs
„Érintett szakaszok" alcsoport.

**Miért:** a tétel hatóköre a hibajavítás, nem a checklist bővítése. A
felsorolás önmagában védhető javítás lenne (szimmetrikus a testvér
szakasz-kihagyás tétellel), de átírná a `veglegesitesDiagnozis()`
paraméter-szerződését, annak tesztjeit és a `docs/03` § Véglegesítési
checklist szövegét — nagyobb felület, mint amit a megfigyelt hiba indokol.
Ha a doki később hiányolja, önálló tételként felvehető.

### 4. Nincs információvesztés — minden elnémított eset le van fedve

A javítás egyetlen esetben sem hallgat el olyasmit, amiről a dokinak tudnia
kell:

- a fizetési feltételek és a garancia elnémított esetét a „szakasz a címével
  együtt kimarad a nyomtatványból" puha tétel fedi le,
- a nyilatkozat elnémított esetét a „nyilatkozat még lektorálásra vár" info
  tétel **és** a kényszerített „Csak ajánlat" mód (a nyilatkozat és aláírás
  oldal kemény zára) fedi le.

**Miért fontos ez kimondani:** a véglegesítés-őr jelzéseinek elhagyása
általában jogi kockázat (`docs/03-funkcionalis-spec.md` § Véglegesítési
checklist). Itt azért engedhető meg, mert nem egy tény tűnik el, hanem egy
azonos tényhez tartozó, pontatlan második megfogalmazás.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A Garancia magyar szövegének megírása.** A jelenség kiváltó oka az, hogy
  a garancia-szöveg mindkét nyelven placeholder — ez tisztán doktori
  adatmunka, a `backlog/BACKLOG.md` 24. tételében él, nem itt.
- **A `sablon-fallback` tétel felsorolás-szintűvé bővítése** (lásd 3. döntés).
- **A PDF-oldal-elrendezés** kérdése, hogy a kimaradó Garancia szakasz miatt
  marad-e feltűnően üres oldal — szintén a 24. tétel része.
- **A „Nyomtatvány szövegei" fül nyelv-előválasztása** — önálló tétel
  (`backlog/BACKLOG.md` 116.).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PreviewPage.tsx` — a sablon-betöltő segéd visszaesés-jelzése,
  és a fölötte lévő magyarázó komment, ami ma egy már nem létező „sárga sávra"
  hivatkozik (a jelzés azóta checklist-tétellé alakult).
- `app/src/domain/templates.ts` — a `sablonNyomtathato()` predikátum
  **változatlanul** használandó, nem születik mellé új.
- `app/src/domain/veglegesitesOr.ts` — **nem módosul** (a 3. döntés miatt).
- `docs/03-funkcionalis-spec.md` § Véglegesítési checklist „Sablon
  HU-visszaesés" bekezdése — a lezáráskor pontosítandó azzal, hogy a jelzés
  csak ténylegesen nyomtatásra kerülő magyar tartalék esetén jár.

## Tesztelés (irányadó, nem kimerítő)

- Német nyelvű terven, a mai seed-állapottal (garancia mindkét nyelven
  placeholder): az Előnézet checklistjén **csak** a „Kimaradó szakaszok:
  Garancia" tétel jelenjen meg, a „helyette a magyar szöveg jelenik meg"
  ne — a generált PDF-en pedig ne legyen Garancia szakasz sem németül, sem
  magyarul.
- Ugyanezen a terven, valódi (nem placeholder) magyar garancia-szöveggel: a
  visszaesés-jelzés **jelenjen meg**, és a PDF-en a magyar szöveg tényleg ott
  legyen.
- Vegyes eset: német terven a fizetési feltételek magyar tartaléka valódi
  szöveg, a garanciáé placeholder — mindkét tétel megjelenik, egymásnak
  ellentmondás nélkül (az egyik a Garancia kimaradásáról, a másik a fizetési
  feltételek magyar nyelvéről szól).
- Magyar nyelvű terv: viselkedése változatlan (magyar terven nincs mire
  visszaesni, a visszaesés-jelzés ma sem fut le).
- A meglévő Előnézet-tesztek, amik a visszaesés-jelzést valódi magyar
  fizetési-feltételek-szöveg mellett várják, változatlanul zöldek maradnak.
