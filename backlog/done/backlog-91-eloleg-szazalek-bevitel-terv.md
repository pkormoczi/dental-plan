# Backlog 91. tétel — Előleg megadása százalékban is — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 91. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

- A 64. tétel (D66) az előleget SZÁZALÉKRÓL ABSZOLÚT ÖSSZEGRE váltotta: a
  szerkesztő Előleg blokkja (`app/src/pages/PlanEditorPage.tsx`
  `ElolegBlokk`) ma egyetlen összeg-mezőt kínál, a `Plan.elolegOsszeg` a
  pénznem alapegységében tárolt fix összeg.
- A doki a pácienssel viszont gyakran ARÁNYBAN állapodik meg („a
  végösszeg 30%-a a munka megkezdésekor"), és ezt ma fejben kell összegre
  váltania — a szerkesztő nem segít benne.
- A D66-os átállás maga NEM hiba, és ez a tétel nem is fordítja vissza: a
  nyomtatvány összegző sora és a fizetési feltételek `{{eloleg}}`
  helyőrzője tudatosan konkrét összeget mond, hogy az aláírandó
  dokumentumon ne egy utólag újraszámolható arány álljon.

## Döntések

### 1. A százalék KIZÁRÓLAG beviteli segéd — a tárolt igazság az összeg marad

A `Plan` továbbra is egyetlen mezőt hordoz (`elolegOsszeg`, abszolút
összeg, `null` = kikapcsolva). A százalékos megadás azonnal, a bevitel
pillanatában összeggé konvertál; sem a választott mód, sem a beírt
százalék nem kerül a `terv.json`-be. Nincs sémaváltozás, nincs új mező,
`schemaVersion` nem emelkedik.

**Miért:** így a nyomtatvány, a fizetési feltételek sablon-helyőrzője, a
véglegesítés-őr és a Terv részletei nézet BÁJTRA VÁLTOZATLAN marad — a
tétel a bevitel ergonómiáját javítja, nem a dokumentum-modellt nyitja ki
újra. Egy aláírt dokumentum mögött továbbra is egyetlen, egyértelmű szám
áll.

**Elvetett alternatíva A — a százalék tárolt igazságként, élő
számítással** (a D66 ELŐTTI viselkedés visszahozása egy mód-jelzővel):
visszaadná a drift-mentességet (sortörlés után az előleg magától a helyes
arányban maradna, a túllépés-blokk %-módban strukturálisan lehetetlen
lenne), de a PDF-nek, a sablon-helyőrzőnek, a véglegesítés-őrnek és a
read-only nézeteknek MIND mód-függő ágat kellene kapnia, és egy már
aláírt papír mögé egy utólag újraszámolható arány kerülne. A doki a
kérdés feltevésekor tudatosan az egyszerűbb, tárolás-semleges utat
választotta.

**Elvetett alternatíva B — tárolt százalék befagyott összeggel**: két,
egymásnak ellentmondható igazság kerülne a fájlba (a tárolt 30% és a
tárolt összeg egy sormódosítás után már nem ugyanazt mondaná), amit külön
jelezni és validálni kellene.

**Fontos:** ez NEM oldja fel a D66-os driftet — egy utólagos
sormódosítás után a százalékos megadással beírt összeg is elcsúszik az
eredeti aránytól, és a `'eloleg-tullep'` kemény blokk ugyanúgy él.

### 2. Ft/% módváltó, egyszerre egy mező

Az Előleg sorban egy kétállású szegmentált kapcsoló áll (összeg /
százalék); egyszerre csak a választott mód mezője látszik. A választott
mód a szerkesztő komponensének LOKÁLIS állapota — nem kerül a `Plan`-re,
tehát újratöltés, verziónyitás, másolás vagy a szerkesztőre való
visszanavigálás után a blokk mindig ÖSSZEG-módból indul, a mentett
összeggel.

**Miért:** a mód a doki pillanatnyi gondolkodásmódja, nem a dokumentum
tulajdonsága — a `Plan`-re tenni ugyanazt a hibát ismételné, mint egy
„bekapcsolva, de üres" állapot perzisztálása (D66 mintája).

**Elvetett alternatíva — két, egymás melletti mező élő származtatott
aránnyal** (az összeg mellett mindig látszó „= 30%"): a százalék magától
mozogna a sorok változásakor (30% → 34%), ami az „élő százalék"
látszatát keltené egy valójában fix összeg mellett. A drift láthatóvá
tétele önmagában értékes lenne, de az félrevezető formában érkezne;
külön tétel tárgya lehet, ha felmerül.

### 3. Módváltáskor üres, azonnal fókuszált %-mező, előtöltés nélkül

Százalék-módra váltáskor a %-mező ÜRESEN, azonnali fókusszal jelenik meg.
A már beírt előleg-összeg és a fennmaradó rész VÁLTOZATLAN marad, amíg a
doki nem commitál egy százalékot (Enter/blur) — a jelenlegi összeg
mellette/alatta továbbra is látszik.

**Miért:** ez a D66 5. döntésének (bekapcsoláskor üres, azonnal
fókuszált mező) egyenes folytatása, és kizárja, hogy egy véletlen
módváltás + Tab NÉMÁN átírja a már beírt összeget.

**Elvetett alternatíva — a származtatott aránnyal előtölteni** (234 000 /
780 000 → „30"): a kerekített százalék visszafelé MÁS összeget ad
(30% → felkerekítve 235 000), tehát egy puszta Tab megváltoztatná az
összeget anélkül, hogy a doki bármit beírt volna.

### 4. Felfelé kerekítés a legközelebbi 1000 pénznem-alapegységre

A százalékból számolt összeg FELFELÉ kerekedik a legközelebbi 1000
alapegységre — HUF-ban 1 000 Ft, EUR-ban 1 000 cent (10 €). A számítás
alapja a TÉNYLEGES Fizetendő (a terv-szintű egyedi végösszeggel már
korrigált érték), ugyanaz, amiből a fennmaradó rész is számol. A
fennmaradó rész továbbra is KIVONÁSSAL adódik, tehát a két szám együtt
pontosan a Fizetendőt adja ki.

**Miért:** egy aláírandó dokumentumon a „781 234 Ft 30%-a = 234 370 Ft"
alakú szám kellemetlen; a doki tárgyalás közben úgyis kerek összeget
mond. A lépés mindkét pénznemben ugyanaz a szám (1000 alapegység),
tehát nincs pénznemenként külön szabály.

**Elvetett alternatívák:** sima egész alapegységre kerekítés (pontos, de
csúnya számot ad az aláírandó papírra); 10 000 Ft / 100 € lépés (kis,
85 000 Ft-os terveken 30% helyett 35,3%-ot adna).

### 5. A százalék 0–100 közé szorítva; a túllépést a MAI blokk kezeli

A %-bevitel 0 és 100 közé szorul (a D66 ELŐTTI mező `Math.min(100, …)`
mintájára — a `NumberField`-nek nincs `max` propja, a szorítás a hívó
commitjában él). A felkerekítés ettől még a Fizetendő FÖLÉ viheti az
összeget (pl. 100% egy 780 400 Ft-os Fizetendőn → 781 000 Ft). Ilyenkor
a MAI viselkedés lép be, változatlanul: inline hard error a mezőn, „—" a
fennmaradó rész helyén, és a `'eloleg-tullep'` KEMÉNY checklist-tétel az
Előnézet véglegesítés-őrében.

**Miért:** nem születik új validációs ág, és nincs néma levágás — a
százalékos bevitel pontosan ugyanabba a már meglévő, doki által
rendezendő állapotba fut, mint a kézi összeg. A „pontosan a Fizetendőre
vágás" elvetve: az egy néma korrekció lenne, amit a D66 2. döntése
explicit kizárt.

### 6. 0% = kikapcsolás; 0 Fizetendőnél a %-mód letiltva

A `0` százalék beírása ugyanúgy CANONICAL kikapcsolás blur/Enter után,
mint a mai `0` összeg (a kapcsoló kikapcsol, a mező eltűnik) — a két
bevitel nem viselkedhet másként ugyanarra a szándékra („nincs előleg").

Ha viszont a Fizetendő még `0` (nincs kezelési sor), a %-szegmens
LETILTVA jelenik meg, halk magyarázó szöveggel — különben bármelyik
százalék `0` összeget adna, és a kapcsoló magától kikapcsolna, ami a
doki szemszögéből megmagyarázhatatlan.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A százalék visszahozása TÁROLT igazságként, élő, sorokat követő
  számítással — explicit elvetve (1. döntés).
- A nyomtatvány, a fizetési feltételek sablonszövege, a `terv.json` séma,
  a véglegesítés-őr és a Terv részletei nézet BÁRMILYEN módosítása —
  mindegyik érintetlen marad.
- Az Egyedi végösszeg (`kedvezmenyOsszeg`) százalékos bevitele — ha
  felmerül, önálló tétel.
- Az előleg pénznemenkénti önálló állapota (a 64. tétel 8. döntésében
  VÁRAKOZÓ maradt) — az a 89. tétel párja lenne az előlegre, nem ez.
- A D66-os drift LÁTHATÓVÁ tétele a szerkesztőben (élő „ez most a
  végösszeg 34%-a" jelzés) — a 2. döntésben elvetett irány.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanEditorPage.tsx` `ElolegBlokk` — az egyetlen érdemi
  hely: a módváltó, a %-mező, a szorítás/kerekítés bekötése, a 0%- és a
  0-Fizetendő-eset. A blokk mai szerkezete (lokális `on` kapcsoló,
  `helyesErtekRef` a blur utáni kötelező-mező hibához) megtartandó.
- `app/src/domain/` — a „százalék + Fizetendő → felkerekített összeg"
  átváltás tiszta függvényként érdemes külön élnie (a `totals.ts`
  `elolegOsszegek`/`elolegTullepi` szomszédságában), hogy a kerekítési
  szabály a komponenstől függetlenül tesztelhető legyen.
- `app/src/components/ChipGroup.tsx` — a meglévő szegmentált kapcsoló
  (Radix `SegmentedControl`); ma nincs per-opció letiltása, ezt a 6.
  döntés igényelheti. A `docs/07-felulet-rendszer.md` `controlBorder`
  szabálya a kapcsolóra is vonatkozik.
- `app/src/components/NumberField.tsx` — a %-mező sima egész bemenet
  (a `unit` prop csak `HUF`/`EUR`, a 0–100 szorítás a hívóban); a mező
  látható mértékegység-jelzése a megvalósító döntése, a mai összeg-mező
  szintén a sor feliratára támaszkodik.
- `app/src/pages/PlanEditorPage.test.tsx` — a meglévő előleg-tesztek
  mellé az új módváltó/kerekítés esetei.
- `docs/03-funkcionalis-spec.md` § Előleg — a tétel LEZÁRÁSAKOR bővítendő
  a százalékos bevitellel; a `docs/02-domain-modell.md` § Előleg és a
  `docs/04-nyomtatvany-spec.md` VÁLTOZATLAN marad (a tárolt modell és a
  nyomtatvány nem változik).

## Tesztelés (irányadó, nem kimerítő)

- Összeg-módban minden a maival azonos (bekapcsoláskor üres, fókuszált
  mező; 0 → kikapcsolás; túllépésnél hard error).
- %-mód, 30 + Enter: 780 000 Ft Fizetendőn 234 000 Ft; 781 234 Ft-on
  235 000 Ft (felkerekítve).
- EUR terven 2 145,60 € Fizetendőn 30% → 650,00 €.
- Módváltás egy már kitöltött összeg mellett: a %-mező üres és fókuszban,
  az összeg és a fennmaradó rész változatlan; Tab-bal kilépve semmi nem
  íródik át.
- `0` % + Enter → a kapcsoló kikapcsol, a mező eltűnik, a `Plan`-en
  `elolegOsszeg: null`.
- `101` beírása → 100-ra szorítva.
- 100% egy olyan Fizetendőn, ami nem többszöröse 1000-nek → az összeg a
  Fizetendő fölé kerekedik: inline hard error, fennmaradó rész „—", az
  Előnézet checklistjén kemény tétel, a „Véglegesítés és mentés" gomb
  letiltva.
- Kezelési sor nélkül (Fizetendő 0): a %-szegmens letiltott, a magyarázó
  szöveg látszik.
- Újratöltés / „Új verzió" / „Másolás új tervbe" után a blokk
  ÖSSZEG-módban indul, a mentett összeggel.
- A mentett `terv.json` diffje: csak `elolegOsszeg` változik, új mező nem
  jelenik meg; a generált PDF összegző sora és a fizetési feltételek
  szövege változatlan alakú.
