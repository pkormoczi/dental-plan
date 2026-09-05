# Backlog 90. tétel — Másolt terv örökölt szakmai-tartalom jelzései — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 90. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** a `redesign` redesign-döntéssorozat § 6.3 „Másolás
új tervként” `D141`–`D147` szelete. Ez a 49. tétel (D57, „Másolás új
tervbe”) 6. döntésének VÁRAKOZÓ maradéka — mindkét előfeltétele
(a 61. tétel, D70, override-modell; a 67. tétel, Finalization validation
engine, a checklist befogadó modellje) azóta elkészült. A redesign
`D<szám>`-jai NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

## Probléma

- A `frissArlistaval()` (`app/src/domain/arKoveti.ts:103-134`) pontosan
  tudja, mely sorokat NEM frissítette (`if (!koveti) return sor;`), de
  ezt eldobja — se a kézzel felülírt ajánlati ár, se a már a másoláskor
  is inaktív tételre hivatkozás nem hagy nyomot a másolt soron.
- A `planMasolatKent()` (`app/src/domain/planCopy.ts`) a fázisokat
  jelöletlenül másolja — a `Fazis.megjegyzes` szó szerint átjön, a doki
  nem tudja megkülönböztetni egy régi, másik tervből származó
  megjegyzést a frissen írttól.
- A meglévő `inaktivTetelreHivatkozoSorok()` (`app/src/domain/
  kitoltetlen.ts`) kontextusmentes — nem tudja, hogy a sor másolatból
  származik-e, ezért nem tud „erősebb” jelzést adni a másoláskor már
  inaktív tételre hivatkozó soroknak, ahogy azt D141 kéri.
- A checklist befogadó modellje (`veglegesitesOr.ts`
  `veglegesitesDiagnozis()`, D76) készen áll, de a D144/D147 szerinti
  összesítő infók sehol nincsenek bekötve.
- Repó-szintű grep „örökölt/orokolt”-ra jelenleg semmilyen ilyen jellegű
  marker/jelzés nincs a kódban — sem a `Sor`-on, sem a `Fazis`-on.

## Döntések

### 1. Három külön, additív marker mező — nem egy közös objektum

Új, opcionális mezők (javasolt nevek): `Sor.orokoltKeziAr?: boolean`,
`Sor.orokoltInaktivTetel?: boolean`, `Fazis.orokoltMegjegyzes?: boolean`.
Mindhárom `schemaVersion`-t nem emelő, additív mező, a
`mennyisegKezi`/`nevNyelv`/`leirasNyelv` konvencióját követve.

**Miért:** a három jelzés egymástól FÜGGETLEN eseményre (ár-átvétel,
jegyzet-átvétel, inaktív hivatkozás) reagál, külön-külön törlődik — egy
közös „öröklés” objektum csak strukturális összevonás lenne, funkcionális
előny nélkül.

**Elvetett alternatíva:** egy közös `orokles?: {...}` objektum a Soron/
Fazison, a 89. tétel `masikPenznemOsszegek`-jének mintájára — elvetve,
mert ott EGY esemény (pénznemváltás) mozgatta EGYÜTT a két értéket, itt
viszont a három marker élettartama nem mozog együtt.

### 2. Az örökölt kézi ár marker a másolási pillanatban íródik

Azokon a sorokon, amiket a `frissArlistaval()` a `koveti` feltétel miatt
ÉRINTETLENÜL hagyott, ÉS a forrásban `tenylegesEgysegar !== listaEgysegar`
volt (a meglévő `arElteroSorok()` „keziAr” ágának pontos definíciója),
`orokoltKeziAr: true` kerül a másolt sorra. `priceList` paraméter
hiányában (a korábbi, VÁRAKOZÓ út) egyik marker sem íródik — nincs
default-following frissítés, tehát nincs mit „örökölt”-nek jelölni sem.

**Miért:** ez pontosan az a pont, ahol a „nem frissült” tény ma keletkezik
és eldobódik (`arKoveti.ts:113`) — a marker írása ide illeszkedik, nem
egy külön, utólagos átjáráshoz.

**Egyedi sor kizárása (rögzítés, nem új döntés):** egy egyedi (`tetelId`
üres) soron `listaEgysegar === tenylegesEgysegar` MINDIG igaz
(`docs/02-domain-modell.md` § „Miért van nevSnapshot és listaEgysegar a
soron”), tehát sosem esik a „kézi ár” definícióba — nincs szükség külön
kizárásra.

### 3. Az örökölt kézi ár marker bármilyen ár-szerkesztés vagy refresh után törlődik

A `tenylegesEgysegar` mezőbe írt bármilyen új érték (a doki kézzel
módosítja), VAGY a meglévő ár-refresh ⟳ vezérlő (`arFrissitesPatch()`,
`arKoveti.ts:60-62`) elfogadása törli a markert — utóbbi amúgy is
felülírja `tenylegesEgysegar`-t az aktuális listaárra.

**Miért:** a marker célja figyelmeztetni, hogy ez az érték MÁSIK tervből
jött — amint a doki tudatosan foglalkozott vele (átírta vagy
visszaállította), a figyelmeztetésnek nincs többé tárgya.

### 4. Az inaktív-hivatkozás marker a tétel `aktiv` állapotától függ, függetlenül a `koveti` ágtól

`orokoltInaktivTetel: true` kerül minden olyan másolt sorra, aminek a
`tetelId`-je a másolás pillanatában egy `aktiv: false` tételre mutatott —
FÜGGETLENÜL attól, hogy a sor egyébként frissült-e (egy default-following
sor, aminek a tétele időközben inaktívvá vált, DE ár/név/leírás még
mindig egyezik, a `frissArlistaval()` ma is frissíti, mert a `tetelById`
map az inaktív tételt is tartalmazza).

**Miért:** ez egy PROVENIENCIA-tény a másolás pillanatáról, nem egy
„szerkesztésre váró érték” — a frissítési ág (koveti/nem koveti) nem
releváns hozzá, csak az, hogy a hivatkozott tétel akkor már inaktív
volt-e.

**A marker NEM törlődik a sor egyéb mezőinek szerkesztésekor** — csak
akkor válik tárgytalanná, ha a doki más tételre cseréli a sort (`tetelId`
megváltozik) vagy törli a sort. Ez eltér a 2–3. és 7. döntés „szerkesztés
törli” elvétől, mert ez a marker nem egy „nézd át ezt az értéket”
felszólítás, hanem egy változatlan történeti tény a másolás pillanatáról.

### 5. Új, KÜLÖN puha checklist-tétel az örökölt inaktív hivatkozásra

Egy új `'inaktiv-tetel-orokolt'` SOFT checklist-tétel jelenik meg,
kizárólag az `orokoltInaktivTetel: true` sorokra, hangsúlyosabb
szöveggel (pl. „X sor már a másoláskor is egy inaktivált tételre
hivatkozott”). A meglévő `'inaktiv-tetel-hivatkozas'` (bármely terv,
bármely inaktív hivatkozás) VÁLTOZATLAN marad, és TOVÁBBRA IS lefedi
ugyanezt a sort — a doki mindkét jelzést látja, egyik sem blokkol (D141
„finalizálhatók”).

**Miért:** D141 explicit „erősebb figyelmeztetést” kér, de a
„finalizálhatók” kitétel kizárja a hard blockot — egy külön,
hangsúlyosabb SOFT tétel adja meg ezt a különbséget anélkül, hogy a
meglévő, általános tételt módosítani vagy kettéosztani kellene.

**Elvetett alternatíva:** a másolt+inaktív sorokat kivenni a meglévő
`'inaktiv-tetel-hivatkozas'` listájából, hogy csak egy jelzés látsszon —
elvetve, mert ez érintené a MEGLÉVŐ, más terveken is használt
`inaktivTetelreHivatkozoSorok()` viselkedését, holott annak a jelentése
(„a tétel MOST inaktív, függetlenül a másolástól”) továbbra is igaz és
önmagában is releváns marad.

### 6. Két új INFO checklist-tétel az örökölt kézi árak és fázismegjegyzések összesítésére

`'orokolt-kezi-ar'` és `'orokolt-fazismegjegyzes'`, INFO súlyosság, a
meglévő `'torzsadat-elteres'` mintáján — tisztán tájékoztató jellegűek,
számlálóval és a route-tal a szerkesztőre. KÜLÖN a meglévő, bármely
tervre vonatkozó `'ar-elteres'` puha tételtől (aminek MÁR van egy
„Kézzel felülírt ajánlati ár” részletcsoportja).

**Miért:** az „ez a sor másolatból örökölt kézi árat hordoz” fogalmilag
más, mint „ez a sor eltér a mai árlistától” — az `'ar-elteres'` tétel
BÁRMELY tervre igaz lehet, a másolt-eredet csak a most bevezetett
markerrel dönthető el. Az összevonás összemosná a két okot egy cím alatt.

**Elvetett alternatíva:** az `'ar-elteres'` tétel bővítése egy harmadik
`reszlet`-csoporttal — elvetve, mert az „bármely terv” és „másolatból
örökölt” fogalmakat egy checklist-tétel alá venné, holott a két állapot
különböző okra vezethető vissza és külön-külön informatívabb.

### 7. Fázismegjegyzés marker: bármilyen szerkesztés törli, nincs külön reset-akció

`orokoltMegjegyzes: true` kerül minden másolt fázisra, aminek a forrás
`megjegyzes`-e nem üres. A doki bármilyen új szöveg beírása (a
`fazis.megjegyzes` mező commitja) törli a markert — nincs külön
„elfogadom”/reset vezérlő, mert egy szabad szöveges mezőnek nincs
kanonikus, visszaállítható értéke (ellentétben az árral, ahol a listaár
a visszaigazítási cél).

**Miért:** a doki azonnal, a szerkesztéssel jelzi, hogy tudomásul vette a
régi szöveget és sajátjává tette — egy külön megerősítő akció felesleges
súrlódás lenne egy ilyen alacsony téttel bíró mezőn.

### 8. D145 rögzítése — nincs marker a kézzel írt névre/leírásra

Egyedi (kézzel írt/átírt) sornév vagy leírás esetén NEM kap a sor új
markert — ezt már a meglévő „átírt”/„átírt leírás” `Badge` (`nevAtirt()`/
a D65 leírás-komparátor, `PlanEditorPage.tsx`) jelzi, a forrás öröklése
szempontjából nincs új információ hozzáadni.

**Miért:** D145 explicit kizárja ezt a markert, mert egy kézzel írt
szöveg sosem volt „default-following” — a meglévő badge pontosan
ugyanazt az üzenetet hordozza, egy második jelvény redundáns lenne.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az „Új verzió” (`ujVerzioDatum.ts`) bármilyen módosítása — D139
  szerint az nem érintett, nem másolásból származik.
- A meglévő `arFrissites()`/`arFrissitesPatch()`/`arElteroSorok()`/
  `inaktivTetelreHivatkozoSorok()` bármilyen VISELKEDÉS-módosítása — ez
  a tétel csak ÚJ, kiegészítő jelzéseket vezet be melléjük, egyiket sem
  írja át.
- A nyelvi review-metaadat (`nevNyelv`/`leirasNyelv`) másolási öröklése
  — a 49. tétel 7. döntése ezt VÁRAKOZÓ-nak jelölte, saját, még nem
  megvalósult redesign-modellre várva (DP-048); nem ennek a tételnek a
  hatóköre.
- A „Csak ajánlat” és az orvos-öröklés szabályai — a 49. tétel más
  döntései, már megvalósultak/lezártak, nem ehhez a tételhez tartoznak.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/types.ts` `Sor`/`Fazis` — a három új, opcionális
  marker mező, a `mennyisegKezi` séma-kommentjének mintájában megírt
  magyarázattal (1. döntés).
- `app/src/domain/arKoveti.ts` `frissArlistaval()` — a marker-írás
  bekötése a másolási transzformációba (2., 4. döntés); esetleg egy
  kísérő, a fázismegjegyzés-markert kezelő lépéssel ugyanitt vagy a
  `planCopy.ts` `planMasolatKent()`-ben (mivel a fázismegjegyzés a
  `priceList` paramétertől függetlenül is másolódhatna — a megvalósító
  dönti el, hogy a fázismegjegyzés-marker a `priceList` jelenlététől
  függjön-e, konzisztensen a másik két markerrel, vagy attól függetlenül
  mindig íródjon).
- `app/src/pages/PlanEditorPage.tsx` `LineRow` — az örökölt kézi ár
  marker megjelenítése (finom `Badge`, a meglévő „átírt”/„HU”/„−X%”
  jelvények mintáján, `:1451-1502`), törlése ár-szerkesztéskor/refresh-
  elfogadáskor (3. döntés); a fázis-fejléc — a fázismegjegyzés marker
  megjelenítése, törlése szerkesztéskor (7. döntés).
- `app/src/domain/kitoltetlen.ts` vagy egy új, szomszédos függvény — az
  `orokoltInaktivTetel: true` sorok kigyűjtése, a meglévő
  `inaktivTetelreHivatkozoSorok()` mintáján, de KÜLÖN függvényként (5.
  döntés) — a meglévő függvény VÁLTOZATLAN marad.
- Két új kigyűjtő függvény (javasolt hely: `domain/arKoveti.ts` az
  árhoz, `domain/kitoltetlen.ts` vagy egy új modul a
  fázismegjegyzéshez) az `orokoltKeziAr`/`orokoltMegjegyzes` sorok/
  fázisok összeszámlálásához (6. döntés).
- `app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis()` — három
  új `CsekklistaTetel` (`'inaktiv-tetel-orokolt'` soft,
  `'orokolt-kezi-ar'` info, `'orokolt-fazismegjegyzes'` info), a meglévő
  `'inaktiv-tetel-hivatkozas'`/`'torzsadat-elteres'` mintáján (5., 6.
  döntés).
- Tesztek: `app/src/domain/arKoveti.test.ts` (a marker-írás a
  `frissArlistaval` blokkban), `app/src/domain/planCopy.test.ts`,
  `app/src/domain/veglegesitesOr.test.ts` (három új eset), és egy új
  teszt a fázismegjegyzés-marker törléséhez.
- Lezáráskor bővítendő: `docs/02-domain-modell.md` § „Miért van
  nevSnapshot és listaEgysegar a soron” (vagy egy új alszakasz) és
  `docs/03-funkcionalis-spec.md` a „Másolás új tervbe” szakaszban (a
  jelenlegi, csak négy kivételt felsoroló bekezdés kiegészítendő); a
  `CLAUDE.md` „Meglévő segédfüggvények” listája az új markereket
  kigyűjtő függvényekkel.

## Tesztelés (irányadó, nem kimerítő)

- Egy forrás terven kézzel felülírt ajánlati árú sor (`tenylegesEgysegar
  !== listaEgysegar`) másolása után a másolt soron megjelenik az
  örökölt-ár marker; a Fizetendő/kedvezmény-jelvény a mai módon
  VÁLTOZATLAN.
- A fenti sor ajánlati árának bármilyen szerkesztése VAGY az ár-⟳
  elfogadása törli a markert.
- Egy forrás terven `aktiv: false` tételre hivatkozó sor másolása után
  mind a meglévő `'inaktiv-tetel-hivatkozas'`, mind az új
  `'inaktiv-tetel-orokolt'` checklist-tétel megjelenik; a terv MÁR
  véglegesíthető, a doki mindkettőt olvashatja, egyik sem blokkol.
- Ugyanez a sor a mai `frissArlistaval()` szerint frissülhet is (ha
  ár/név/leírás egyébként követte a forrást) — ekkor is megkapja az
  inaktív-marker jelzést, mert az a `tetelId` `aktiv` állapotától függ,
  nem a frissülési ágtól.
- Egy kézzel írt (egyedi) sornév/leírás másolása után NEM jelenik meg
  új marker, csak a meglévő „átírt” jelvény.
- Egy nem üres fázismegjegyzésű forrás terv másolása után a másolt fázis
  megjegyzés-mezője mellett megjelenik az örökölt-jegyzet marker; a mező
  bármilyen szerkesztése törli, reset-akció nélkül.
- A véglegesítés-őr checklistjén az örökölt kézi ár/fázismegjegyzés
  számláló pontosan annyi tételt mutat, ahány sort/fázist a másolás
  érintetlenül hagyott.
- `priceList` paraméter nélküli másolás (a korábbi, VÁRAKOZÓ út) esetén
  egyik új marker sem íródik — a mai viselkedés VÁLTOZATLAN.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/`
  alatt.
