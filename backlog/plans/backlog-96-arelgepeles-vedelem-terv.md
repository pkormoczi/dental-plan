# Backlog 96. tétel — Elgépelés-védelem az árlista árainál — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 96. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

Az Árlista admin ár-mezői bármekkora értéket némán elfogadnak, és a commit
**azonnali**: a `NumberField` blur/Enter commitja a `patchItem` → `commit()`
úton rögtön a törzsadatba ír. Nincs Mentés gomb, amit blokkolni lehetne, és
nincs undo — egy extra nulla azonnal élesedik, onnantól minden új terv abból
az árból dolgozik. A `savePriceList` mentése ráadásul a mai napra bélyegzi az
`arlistaVerzio`-t (`docs/03-funkcionalis-spec.md` § 6. Árlista-verzió), tehát
az elgépelés egy „friss, karbantartott árlista" látszatával jár együtt.

Az `ItemEditor`-ban ma két puha, nem blokkoló jelzés él — a fordított sávos
határ (`savosHatarForditott()`) és a hosszú leírás (`leirasTulHosszu()`). Ez a
tétel ugyanebbe a családba illeszt egy harmadikat, de egy lényeges
különbséggel: itt a jelzés mellé **javító akció** is kell, mert a doki nem
feltétlenül emlékszik a felülírt árra.

## Döntések

### 1. Két detektor, a HUF/EUR arány-jelzés nélkül

Két, egymást kiegészítő jelzés készül:

- **relatív változás** — az ár a sor kinyitásakori értékhez képest szokatlanul
  nagyot ugrott (mindkét irányban),
- **abszolút nagyságrend** — az ár kirívóan kilóg az árlista többi tételéből.

A backlog-szöveg harmadik felvetése, a **HUF/EUR arány elcsúszásának** jelzése
SZÁNDÉKOSAN kimarad (lásd „Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok").

**Miért:** a két detektor komplementer, és külön-külön egyik sem elég. Egy
medián tétel extra nullája (48 000 → 480 000) az abszolút szűrőn átcsúszik (az
árlista maximuma még mindig nagyobb), de a relatív elkapja; egy vadonatúj tétel
első, elgépelt árazását viszont csak az abszolút fogja meg, mert ott a baseline
0, és nincs mihez arányítani. Elvetett alternatíva: **csak** a relatív jelzés —
ez az „+ Új tétel" utáni első árazást (a legveszélyesebb pillanatot, ahol a doki
egyetlen mezőt tölt ki és megy tovább) teljesen védtelenül hagyná.

### 2. A baseline a sor kinyitásakori érték, ár-slotonként

A relatív detektor viszonyítási alapja a **szerkesztő mountolásakor** rögzített
érték, nem a közvetlenül megelőző commit. A rögzítés ár-slotonként külön
történik: HUF fix, HUF sávos „tól", HUF sávos „ig", EUR fix, EUR sávos „tól",
EUR sávos „ig".

**Miért:** a mount-baseline az egész szerkesztési ülés eredményét ítéli meg. A
45 000 → 450 000 → 450 500 javítás-sorozatnál a „megelőző érték" alapú
viszonyítás a második commit után elnémulna (450 000 → 450 500 alig változás),
pedig az ár még mindig tízszerese az eredetinek — épp az a helyzet, amit a doki
egy elgépelés után átfutó javítgatással előállít. Elvetett alternatíva: a
megelőző érték (`patchItem` a `prevItem`-et amúgy is ismeri) — olcsóbb, de a
fenti eset miatt pont a legvalószínűbb hibalánc alatt hallgat el.

Ár-slotonként külön baseline azért kell, mert egy sávos „ig" mezőbe csúszott
extra nulla ugyanolyan veszélyes, mint egy fix áré, és a `basePrice()`-szerű,
árankénti egyetlen szám nem hordozná ezt a felbontást.

**Következmény, amit el kell fogadni:** egy olyan slot, ami a sor kinyitása UTÁN
keletkezik — az ártípus-váltó (`toggleType`) FIX → SAVOS iránya, vagy a
„+ EUR ár hozzáadása" gomb — baseline nélkül marad, ott csak az abszolút jelzés
él. Ez nem hiba, hanem a szabály egyenes következménye: az ártípus-váltás maga
írja át az árat, nem a doki gépel — ha ezt is „változásnak" számolnánk, minden
ártípus-váltás hamis riasztást adna.

### 3. A figyelmeztetés a sor nyitvatartásáig él, nincs elrejtő gomb

A jelzés a szerkesztő mountjától a sor bezárásáig él, pontosan együtt a
baseline-nal. Nincs „Rendben, szándékos" nyugtázó gomb.

**Miért:** a baseline és a jelzés élettartama így pontosan egybeesik (az
`ItemEditor` mount), tehát nem kell hozzá lap-szintű, sorok között élő
állapotot bevezetni — ugyanaz az elv, amiért a `pendingActivationId` sem kapott
séma-mezőt. A jelzés maga tranziens: **semmi nem kerül a `Tetel` sémába**, egy
oldalfrissítés vagy a sor bezárása nyom nélkül elviszi.

Elvetett alternatíva: a jelzés túlélje a sor bezárását, és a táblázat ár-cellája
is mutassa (a meglévő „sávos"/„nincs DE név" jelölések mintáján). Erősebb
védelem lenne, de egy új, lap-szintű tranziens állapotot igényel, és a
„Visszaállítás" akciót elszakítaná attól a szerkesztőtől, ahol a régi érték
értelmezhető. Az elrejtő gomb pedig azért esett ki, mert a meglévő puha jelzések
egyikének sincs ilyenje, és két gomb (Visszaállítás + Rendben) egy puha
figyelmeztetésen már zsúfolt — a jelzés amúgy is eltűnik a sor bezárásával.

### 4. Relatív küszöb: 5× vagy 1/5

A relatív jelzés akkor szólal meg, ha az új érték a baseline **legalább
ötszöröse vagy legfeljebb ötöde**. Ha a baseline 0 (vagy az adott slotnak nincs
baseline-ja), a relatív detektor néma.

**Miért:** a tipikus elgépelés-alakok az extra nulla (10×), a hiányzó nulla
(0,1×) és a kétszer leütött számjegy (45 000 → 445 000 = 9,89×). Egy legitim
változás ezzel szemben éves áremelés (5–20%) vagy ritkábban egy 2×-es
újraárazás. Az 5× ezért kényelmesen elválasztja a kettőt. Elvetett alternatíva:
**10×** — pont a második leggyakoribb hibaalak, a 9,89×-es kétszer-leütés
csúszna ki alóla. Szintén elvetve: **3×** — az árlista-nap tömeges takarításakor
egy 3,5×-ös tudatos átsorolás is riasztana, és a túl gyakori figyelmeztetés
megtanítja a dokit átnézni fölötte.

A 0 baseline melletti némaság szándékos: az „+ Új tétel" dialógusból létrejövő
tétel 0 Ft-tal indul, tehát az első árazás (`handleFirstPriceCommit`) minden
esetben „végtelen szoros" változás lenne — ott az abszolút detektor a védelem.

### 5. Abszolút küszöb: 3× a többi AKTÍV tétel maximumához

Az abszolút jelzés akkor szólal meg, ha az érték **legalább háromszorosa** az
árlista **többi, `aktiv: true`** tétele közül a legdrágábbnak, ugyanabban a
pénznemben. A szerkesztett tétel maga mindig ki van zárva a referenciából. Ha
nincs referencia (nincs másik aktív tétel árral az adott pénznemben), a detektor
néma.

**Miért:** az önkalibráló referencia nem avul el az inflációval, és MINDKÉT
pénznemre magától működik — nem kell két külön konstanst karbantartani, és nem
lesz belőle pár év múlva zajforrás. A 3-as szorzót a valós adat szabja meg: a
legdrágább tétel ma 2,44× a második legdrágábbnak, tehát 2-nél a legdrágább
valódi tétel minden szerkesztésekor hamisan riasztana. Elvetett alternatíva: fix
konstans (pl. 3 M Ft) — egyszerűbb, de két pénznemre két konstans kell, és
senki nem fogja karbantartani. Szintén elvetve: **5×** — nagyobb biztonsági sáv,
de egy vadonatúj tétel mérsékeltebb elgépelése (800 000 helyett 4 000 000) épp
átcsúszna rajta, és pont az új tétel az, amit csak ez a detektor véd.

Csak az aktív tételek számítanak referenciának, hogy egy korábbi, észrevétlen
elgépelés (ami inaktív tételen maradt) ne tudja megemelni a küszöböt és ezzel
elnémítani a védelmet az egész árlistán. A szerkesztett tétel önmagából való
kizárása miatt egy még inaktív, frissen felvett tétel is védett marad.

### 6. „Visszaállítás <régi érték>-re" akció a jelzés mellett

A figyelmeztetés mellett egy egy kattintásos visszaállítás áll, ami az érintett
slotot a baseline értékére írja vissza. A régi érték a gomb feliratában (vagy a
jelzés szövegében) **ki van írva**, `formatMoney()`-val, magyarul — az Árlista
admin végig magyar, ahogy a táblázat is `formatPrice(…, 'hu')`-t hív.

**Miért:** az appban nincs undo, és a doki nem feltétlenül emlékszik a
felülírt árra — jelzés önmagában csak a bajt mondja ki, a javítást nem segíti.
A visszaállítás egy teljesen szokásos commit ugyanazon a `patchItem` →
`commit()` úton, updaterrel (nem kész objektummal), tehát a `savePriceList`
updater-szerződését nem kerüli meg. Hogy ez is a mai napra bélyegzi az
`arlistaVerzio`-t, ártalmatlan: az elgépelt commit már úgyis ma keltezte át.

A visszaállítás után a jelzés magától eltűnik, mert az érték újra egyezik a
baseline-nal — nem kell külön elrejtő logika.

### 7. Elhelyezés: közvetlenül az érintett mező alatt

A jelzés + a visszaállítás gomb az érintett ár-mező alatt jelenik meg, a meglévő
„hosszú leírás" figyelmeztetés mintájában, amber (`t.warn`) színnel. Több mező
egyszerre is jelezhet, mindegyik a sajátját.

**Miért:** hat lehetséges ár-mező mellett egy közös, rács alatti blokkban minden
sornak ki kellene írnia, melyik mezőről beszél — a mező alatti elhelyezés a
hozzárendelést magától megoldja, és a „Visszaállítás" gomb is ott van, ahol a
javítandó érték. Elvetett alternatíva: közös blokk az ár-rács alatt (a fordított
sáv `gridColumn: '1 / -1'` mintája) — nyugodtabb elrendezés, de a mező
megnevezésének kiírása szószátyárrá teszi, és a hat mezős maximumnál egy
felsorolást kellene renderelnie.

### 8. A Tömeges árváltoztatás sosem vált ki jelzést

Ha egy tömeges árváltoztatás olyan tételt érint, aminek a sora épp nyitva van, a
nyitott sor baseline-ja a művelet után **újra rögzül** a friss értékre, jelzés
nélkül.

**Miért:** a tömeges árváltoztatás szándékos, előnézetes művelet, saját
darabszám-összegzővel és kerekítés-korláttal — nem elgépelés. A korlátai
(`SZAZALEK_MAX_EMELES = 100`, `SZAZALEK_MAX_CSOKKENTES = 90`) miatt egy emelés
sosem érné el az 5×-öt, de a −90%-os csökkentés pont 0,1×, ami átlépné az 1/5-
öt — enélkül a szabály nélkül minden nagy tömeges leárazás után riasztana a
nyitott sor. Ennél is fontosabb, hogy a „Visszaállítás" gomb ilyenkor egyetlen
tételen vonná vissza egy tömeges művelet részét, inkonzisztens állapotot hagyva.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **HUF/EUR arány-detektor.** A backlog-szöveg explicit alkérdése volt
  („esetleg a HUF/EUR arány elcsúszására is"), és tudatosan marad ki. Ha
  később mégis előkerül, a jelzésnek az árlista SAJÁT medián arányából kell
  dolgoznia (a seedben ez feltűnően szoros: 352,9–365,9, medián ~363,2), soha
  nem beégetett vagy lekérdezett árfolyamból — a két pénznem ára egymástól
  függetlenül, kézzel megadott, és egy árfolyamot sugalló jelzés ezt az elvet
  puhítaná fel (lásd `CLAUDE.md` „Sérthetetlen szabályok", a HUF/EUR
  átszámítás tilalma). Külön backlog-tételként vehető fel, ha a doki hiányolja.
- **Kemény tiltás / `max` prop a `NumberField`-en.** A védelem végig puha
  marad. Egy felső korlát a mezőn nem tudná, mi a „reális" ár egy jövőbeli
  árlistán, és egy legitim drága csomagtételt tenne felvihetetlenné.
- **Undo/verziótörténet az árlistán.** A visszaállítás egyetlen slotra, egyetlen
  szerkesztési ülésen belül működik — nem árlista-szintű history.
- **A tervszerkesztő sor-szintű ajánlati ára** (`pages/planEditor/LineRow.tsx`,
  `domain/sorElteres.ts`). Ott a kézi árfelülírás szándékos és már jelölt is; ez
  a tétel kizárólag az árlista törzsadatáról szól.
- **A Tömeges árváltoztatás saját védelmének bővítése.** Annak megvan a maga
  előnézete és kerekítés-korlátja.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/priceListAdmin/ItemEditor.tsx` — a baseline rögzítése a
  mountkor (a meglévő `firstInteractionHandledRef` mintáján, szintén tranziens,
  séma-mező nélkül), a hat ár-mező alatti jelzések és a visszaállító akció. Ez a
  tétel fő terepe.
- Új domain modul a küszöb-predikátumoknak és a szorzó-konstansoknak, a
  `app/src/domain/leirasHossz.ts` mintájában (tiszta függvények, UI nélkül,
  vitest-tel) — az abszolút referencia számítása is ide való, mert az árlista
  egészét nézi, nem egy mezőt.
- `app/src/domain/money.ts` — a `savosHatarForditott()` szomszédja; a
  megjelenített értékek `formatMoney()`-val formázódnak.
- `app/src/pages/PriceListAdminPage.tsx` — csak annyiban, amennyiben a tömeges
  árváltoztatás utáni baseline-újrarögzítéshez jelet kell adni a nyitott
  szerkesztőnek.
- `docs/03-funkcionalis-spec.md` § 6. „Sor kinyitása" — a lezáráskor ide kerül
  a szabály prózaként, a fordított sávos bekezdés mellé.

## Tesztelés (irányadó, nem kimerítő)

Domain-szinten (vitest, a `domain/money.test.ts` / `domain/leirasHossz.test.ts`
mintájában):

- a relatív küszöb pontosan 5×-nél és 1/5-nél billen (határérték be/ki),
- 0 baseline mellett a relatív detektor néma,
- az abszolút referencia kizárja a szerkesztett tételt és az inaktív tételeket,
- nincs másik aktív, árral rendelkező tétel → az abszolút detektor néma,
- a küszöbök pénznemenként külön értelmeződnek (a HUF forintban, az EUR
  centben tárolt értéken).

Kézzel, a futó appban:

1. Árlista admin → nyiss ki egy ~45 000 Ft-os tételt, írj a HUF ár mezőbe
   450 000-et, majd Tab. Amber figyelmeztetés jelenik meg a mező alatt, benne a
   régi értékkel és egy visszaállító gombbal.
2. Írd át 450 500-ra. A figyelmeztetés MEGMARAD (a baseline továbbra is az
   eredeti 45 000).
3. Nyomd meg a visszaállítást. Az ár 45 000-re áll, a figyelmeztetés eltűnik.
4. Csukd be és nyisd újra a sort a 450 000-es értékkel. Nincs figyelmeztetés —
   az új baseline a mostani érték.
5. „+ Új tétel" → név + kategória → a HUF ár mezőbe írj 6 000 000-t. A relatív
   jelzés néma (0-ról indult), az abszolút jelez.
6. Váltsd a tételt sávosra, és írj az „ig" mezőbe egy extra nullás értéket. A
   jelzés a sávos mező alatt jelenik meg. (Az ártípus-váltás MAGA nem vált ki
   jelzést.)
7. Egy nyitott sor mellett futtass egy −90%-os Tömeges árváltoztatást, ami ezt a
   tételt is érinti. Nem jelenik meg figyelmeztetés a nyitott soron.
8. Ellenőrizd, hogy az EUR mezők jelzése euróban (nem centben) írja ki az
   értékeket.
