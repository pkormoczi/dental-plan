# Backlog 104. tétel — Terv-lánc listán jelzés a törzsadat ↔ pillanatkép eltérésről — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 104. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

Egy mentett terv-verzió `paciens` blokkja szándékosan pillanatkép
(`docs/02-domain-modell.md` § Páciens-szintű törzsadat): a páciens élő
törzsadatának (`paciens-adatok.json`) módosulása sosem írja át
visszamenőleg. Ez helyes, de következménye, hogy egy régebbi verzió
kontaktadata (telefon, lakcím, e-mail) elavulttá válhat anélkül, hogy ez
bárhol látszana. A `components/PatientPlanChains.tsx` — a terv-lánc/verzió
fa, a doki napi belépési pontja a mentett tervekhez — sehol nem hívja a
`domain/masterSnapshotDiff.ts`-t, sőt a törzsadatot proppként meg sem
kapja. Az eltérés kizárólag a verzió saját részletoldalán
(`pages/TervReszleteiPage.tsx` „Páciens adatai a véglegesítéskor" blokk,
`docs/03-funkcionalis-spec.md` § 11) derül ki, egy amber jelvényes,
kinyitható, mezőszintű összevetésben — vagyis csak akkor, ha a doki
véletlenül pont azt a verziót nyitja meg.

Reprodukció:
`docs/reviews/2026-09-01-doctor-review-nevutkozes.md` 2. megállapítás — a
`Páciens adatai` fülön javított telefonszám után a `Kezelési tervek` fül
lánc-sora vizuálisan változatlan maradt.

## Döntések

### 1. Hatókör: mentett verziók ÉS az aktív piszkozat, mindkét hívón

A jelzés minden olyan mentett verzióra vonatkozik, aminek betöltött
`paciens` pillanatképe van, PLUSZ — ha a megjelenített pácienshez tartozik
— a láncok fölött álló aktív piszkozat-blokkra. A `PatientPlanChains`
mindkét hívóján (`embedded`: páciens-részletoldal `Kezelési tervek` tab;
`standalone`: DEMO „Összes terv" fül) azonosan viselkedik.

**Miért:** a komponens viselkedése ma egyetlen ponton tér el hívónként (a
`header` prop szerinti fejléc-elemek), és ez a `docs/03-funkcionalis-spec.md`
§ 5 szerint tudatos, névvel megnevezett kivétel — egy néma, hívófüggő
adat-jelzés ezt a szerződést hígítaná fel. Elvetett alternatíva: a jelzést
csak a `embedded` hívóra bekötni, ahol a törzsadat amúgy is be van töltve
(nulla új storage-hívás) — elvetve, mert a DEMO fül a doki-validáció
teljes-listás betekintője, épp ott a legvalószínűbb, hogy sok páciens
között fut végig a szem, és pont ott nem szólna a jelzés.

### 2. Az összevetés alapja: teljes mezőeltérés, kizárólag valódi törzsadat ellen

Az összevetés a meglévő `masterSnapshotDiff()` TELJES eredménye — mind a 8
`Paciens` mező, beleértve azt is, amikor az egyik oldal üres. Az
összehasonlítás másik oldala KIZÁRÓLAG a ténylegesen létező
`paciens-adatok.json`: ha a páciensnek nincs lezárt törzsadata, a lánc-fán
semmilyen jelzés nem jelenik meg.

**Miért:** a teljes diff tartja szinkronban a lánc-listát és a
`TervReszleteiPage` „N mező azóta módosult" jelvényét — a doki ugyanazt a
számot látja a listán és a megnyitott verzión, nem kell két, egymásnak
ellentmondó mérőszámot fejben tartania. Elvetett alternatíva: a
`valodiUtkozesek()` (csak a mindkét oldalon kitöltött, eltérő mezők) —
kevesebb zajt adna egy gyorsfelvétellel készült páciensnél, ahol a
törzsadat még csak a nevet tartalmazza, de a lista ekkor hallgatna olyan
verziókról, amiket a részletoldal eltérőnek jelöl.

A „csak valódi törzsadat" megkötés azért kell, mert a
`megjelenitettTorzsadat()` élő fallbackje a páciens LEGFRISSEBB tervének
`paciens` pillanatképe — ha ez lenne a viszonyítási alap, minden régebbi
verzió „eltérne" tőle pusztán azért, mert régebbi. Ez verzió-korkülönbség,
nem törzsadat-változás, és pontosan az ellenkezőjét mondaná annak, amit a
jelzés állítani hivatott. (A `TervReszleteiPage` ugyanezt éri el azzal,
hogy fallbackként a MEGJELENÍTETT tervet adja át, így a diff üres — ott
egyetlen verzió van a képernyőn, itt több, ezért a megkötést itt ki kell
mondani.)

### 3. Elhelyezés: lánc-fejléc (verziószám) + verziósor (mezőszám)

A lánc-fejléc — ami nyitottságtól függetlenül mindig renderel — akkor
jelez, ha a láncban van legalább egy eltérő verzió, és az ÉRINTETT VERZIÓK
számát mondja („2 verzió eltér"). A kinyitott lánc minden érintett
verziósora saját jelzést kap, az ELTÉRŐ MEZŐK számával („3 mező azóta
módosult").

**Miért:** a lánc alapból csukott lehet (`docs/03-funkcionalis-spec.md` § 5:
csak a legfrissebb véglegesített dátumú lánc nyílik magától), tehát a
fejlécnek arra kell válaszolnia, amit a csukott állapot elrejt — „van-e
idebent olyan verzió, amit érdemes megnézni". A két szint két különböző
mértékegysége (verzió vs. mező) szándékos: ha a fejléc is mezőszámot
mondana, a doki azt hinné, hogy a lánc egészére vonatkozik, holott
verziónként más-más lehet. Elvetett alternatívák: (a) csak a lánc
legfrissebb verziójára szűkíteni a jelzést — a régi verziók pillanatképe
történeti, de a bejelentés épp arról szólt, hogy a doki egy KORÁBBI ajánlat
alapján hívná vissza a pácienst; (b) egyetlen páciens-szintű összefoglaló
sor a fa tetején — a legkevesebb zaj, de nem mondja meg, MELYIK verziót
kell megnézni.

### 4. Az aktív piszkozat blokk saját jelzést kap, más szöveggel

Ha a megjelenített pácienshez tartozik az egyetlen globális, mentetlen
piszkozat, a láncok fölötti blokk is megkapja a mezőszámos jelzést — de a
szövege jelen idejű („N mező eltér a törzsadattól"), nem a mentett
verziókon használt múlt idejű alak („N mező azóta módosult").

**Miért:** a piszkozat `paciens` blokkja nem pillanatkép, hanem élő,
szerkesztés alatt álló adat — az „azóta módosult" ott hamis állítás lenne,
mert nincs olyan „akkor", amihez képest. A jelen idejű alak egyben
összecseng a Terv adatai lap „Páciens törzsadata" szekciójának meglévő
szövegével (`N mező eltér a páciens törzsadatától`), ahol a doki ténylegesen
kezelni is tudja az eltérést. Elvetett alternatíva: a piszkozatot kihagyni,
arra hivatkozva, hogy a Terv adatai lap már kezeli — elvetve, mert a doki a
lánc-fáról indul, és épp azt az információt keresi, hogy melyik munkájához
kell visszatérnie; a duplikáció itt nem redundancia, hanem két különböző
pillanatban feltett kérdés.

A lánc-fejléc verziószámláló jelzése (3. döntés) NEM veszi bele a
piszkozatot — az nem verzió, és saját, hangsúlyosabb helye van a fa tetején.

### 5. Vizuális idióma: amber jelvény, a mezőnevek `title`-ben

A jelzés amber `Badge`, ugyanaz a szín és forma, amit a `TervReszleteiPage`
használ erre az eltérésre. A lánc-fejlécen a meglévő „Piszkozat" jelvény
mellé, a fejléc-toggle akadálymentes nevébe folyva kerül; a verziósoron a
meglévő „Legutóbbi"/„Csak ajánlat" jelvények mellé. A konkrét eltérő
mezőnevek `title`-ként érhetők el.

**Miért:** ugyanaz a jelentés ugyanazt a vizuális jelet kapja az egész
appban — ha a listán amber, a megnyitott verzión pedig szintén amber jelvény
áll, a doki nem kezdi el keresni, mi a különbség a kettő között. A
`title`-megoldás azért elfogadható, noha billentyűzettel és érintőképernyőn
nem érhető el, mert NEM egyedüli forrása az információnak: a mezőszintű
összevetés (Törzsadat vs. A terv adata) a sor meglévő „Megnézés" gombján át,
teljes értékű táblázatként elérhető marad. Elvetett alternatívák: (a) gray
jelvény a „nem tolakodó" követelmény miatt — elvetve, mert a gray jelvény
ebben a komponensben ma semleges tényt jelöl (Legutóbbi, Csak ajánlat), egy
figyelmeztetés odakeveredve elmosódna; (b) a mezőnevek kiírása magára a
jelzésre — 5-6 eltérő mezőnél a verziósor tördelne, és a végösszeg-oszlop
igazítása felborulna.

### 6. A jelzés tisztán informatív, nem vezet be új akciót

A jelzés nem kattintható, nem nyit dialógust, és nem kínál szinkronizálást.
A részletekhez a sor MÁR MEGLÉVŐ „Megnézés" gombja visz, a törzsadat
szerkesztéséhez a `Páciens adatai` tab / kereszt-link.

**Miért:** a törzsadat ↔ pillanatkép szinkron kétirányú, mezőszintű, explicit
művelet, aminek a Terv adatai lap az egyetlen otthona
(`docs/03-funkcionalis-spec.md` § 2 „Páciens törzsadata") — egy VÉGLEGESÍTETT
verzió pillanatképét pedig egyáltalán nem is szabad átírni. Egy akció itt
vagy azt sugallná, hogy egy lezárt dokumentum javítható, vagy egy harmadik,
párhuzamos szinkron-belépési pontot nyitna. Elvetett alternatíva: a jelvény
linkként a részletoldal páciens-blokkjára, előre kinyitva — elvetve, mert
egy második navigációs utat adna pontosan oda, ahová a „Megnézés" gomb már
visz.

### 7. Betöltés: a hívó tölti, olvashatatlan törzsadat némán kimarad

A `PatientPlanChains` a törzsadatot proppként kapja — nem tölt magának —,
követve a komponens meglévő doktrínáját, hogy a betöltési STRATÉGIA
hívónként eltérhet, a renderelés viszont egy helyen él. A
páciens-részletoldal a MÁR betöltött törzsadatát adja le (nulla új
storage-hívás); a DEMO „Összes terv" fül új, páciensenkénti
törzsadat-betöltést kap, a meglévő lánc-betöltés `allSettled` mintájában.
Egy olvashatatlan (sérült JSON vagy magasabb `schemaVersion`)
`paciens-adatok.json` némán kimarad: az adott páciensnél nem jelenik meg
jelzés, a fa minden másban működik. Ugyanígy néma egy olyan verzió, aminek
a `Plan`-je nem töltődött be — nincs pillanatkép, amit összevetni.

**Miért:** a néma kihagyás a kódbázis bevett hibatűrési mintája ezekre az
olvasási utakra (a lánc-adat-betöltő és a törzsadat-betöltő is így
viselkedik: egy sérült elem nem bénítja meg a listát). Az „összevetés
kimaradt" jelzés kiírása egy MÁSODIK hibaállapot-szöveget hozna a fejlécre a
már meglévő „néhány verziója nem olvasható" mellé, egy olyan esetre, amit a
doki nem tud a lánc-fáról megjavítani. A DEMO fülön szándékosan a nyers
törzsadat-olvasás használandó, NEM a `megjelenitettTorzsadat()`-ot betöltő
segéd: az páciensenként felépítené a fallback-ágat is (extra lánc-bejárás +
egy terv betöltése), miközben a 2. döntés szerint épp a fallbackre nem
szabad összevetni.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A `TervReszleteiPage` „Páciens adatai a véglegesítéskor" blokkja**
  (jelvény, mezőszintű tábla, „Páciens jelenlegi adatai →" link) —
  VÁLTOZATLAN marad; ez a tétel a lánc-listára viszi ki ugyanazt a jelzést,
  nem tervezi újra a részletoldalt.
- **A Terv adatai lap „Páciens törzsadata" szekciója** (kétirányú,
  mezőszintű szinkron, lépés-elhagyási ajánlat) — VÁLTOZATLAN; a lánc-fán
  nincs és nem is lesz szinkron-akció (6. döntés).
- **A véglegesítés-őr `'torzsadat-elteres'` INFO-szintű, nem blokkoló
  checklist-tétele** — VÁLTOZATLAN; ez a tétel nem érinti a véglegesítés
  feltételeit.
- **A `megjelenitettTorzsadat()` fallback-szemantikája** (lezárt törzsadat →
  legfrissebb terv pillanatképe → üres rekord) — VÁLTOZATLAN; ez a tétel
  csak azt mondja ki, hogy a lánc-fa összevetése nem a fallbackre épül.
- **A páciens-részletoldal jelenlegi betöltési hibakezelése** (egy sérült
  `paciens-adatok.json` ma az EGÉSZ lapot hibaállapotba viszi) — nem cél
  átalakítani; a néma kihagyás (7. döntés) a DEMO fülre vonatkozó új
  viselkedés.
- **A duplikáció-jelölt chip megkülönböztető adata** — a `backlog/BACKLOG.md`
  önálló tétele, saját hatókörrel.
- **Bármilyen új rendezés/szűrés** a lánc-fán az eltérés szerint (pl.
  „csak az elavult adatú verziók") — nem cél.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/PatientPlanChains.tsx` — új, opcionális törzsadat-prop;
  a lánc-fejléc jelvénye a meglévő „Piszkozat" jelvény szomszédjaként, a
  fejléc-toggle gombon belül; a verziósor jelvénye a „Legutóbbi"/„Csak
  ajánlat" jelvények melletti bal oldali klaszterben; az aktív piszkozat
  blokk saját jelzése. **Figyelem:** az `app/src/dokumentacioGuard.baseline.json`
  komment-küszöböt tart nyilván erre a fájlra — a `CLAUDE.md`
  „Komment-szabályzat" szerinti, WHY-t közlő kommentnél többet ne írjon bele
  a megvalósító.
- `app/src/domain/masterSnapshotDiff.ts` — `masterSnapshotDiff()` és a
  mezőcímkék ÚJRAHASZNÁLATA, változtatás nélkül. Ne készüljön második
  összehasonlító.
- `app/src/domain/paciensAdatok.ts` — `paciensTorzsadatbol()` a
  törzsadat → összevethető alak vetítéséhez, ugyanúgy, ahogy a többi hívó
  teszi.
- `app/src/pages/PatientDetailPage.tsx` — a MÁR betöltött törzsadat leadása;
  a törzsadat-mentés meglévő `onSaved` visszacsatolása miatt a fülváltás
  után azonnal a friss állapot látszik (ez a bejelentett reprodukció).
- `app/src/pages/demo/OsszesTervSection.tsx` — új, páciensenkénti
  törzsadat-betöltés a meglévő lánc-betöltés mellett, `allSettled`-del.
- `docs/03-funkcionalis-spec.md` § 5 (Terv-láncok és verziók) és § 10
  (Páciens részletei) — a lezáráskor átvezetendő prózai leírás helye; a
  „Backlog-tétel lezárása" 2. lépése, nem az implementációé.

## Tesztelés (irányadó, nem kimerítő)

- Egy páciens törzsadatában a telefonszám átírása után, a `Kezelési tervek`
  fülre visszaváltva a lánc-fejléc és az érintett verziósorok jelzést
  mutatnak; a jelzés a doki által látott mezőszámot mondja, és ugyanazt a
  számot, amit a verzió „Megnézés" úton elért részletoldala.
- Csukott láncnál is látszik a fejléc-jelzés; kinyitva a fejléc verziószáma
  és a jelzett verziósorok száma megegyezik.
- Egy páciens, akinek NINCS `paciens-adatok.json`-ja: sehol nincs jelzés,
  akkor sem, ha több, egymástól eltérő `paciens` pillanatképű verziója van.
- Egy sérült/magasabb `schemaVersion`-ű `paciens-adatok.json` a DEMO „Összes
  terv" fülön: az adott páciensnél nincs jelzés, a többi páciens sora és a
  lánc-fa minden más funkciója változatlanul működik.
- Egy nem betölthető verzió (a pénzösszeg helyén „—") nem kap jelzést, és a
  lánc-fejléc verziószámába sem számít bele.
- Aktív, a megjelenített pácienshez tartozó piszkozat mellett a
  piszkozat-blokk jelen idejű szöveggel jelez; a lánc-fejléc verziószáma
  ettől nem változik.
- A jelzés nem kattintható, nem nyit dialógust, és nem módosít semmilyen
  mentett adatot — a mentett verziók pillanatképe és a törzsadat is
  érintetlen marad.
- Mindkét hívón (páciens-részletoldal `Kezelési tervek` tab és DEMO „Összes
  terv" fül) azonos a viselkedés.
- A `TervReszleteiPage` meglévő jelvénye/táblája, a Terv adatai lap
  szinkron-szekciója és a véglegesítés-őr checklistje változatlanul működik.
