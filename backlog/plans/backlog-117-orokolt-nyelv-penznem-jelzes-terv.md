# Backlog 117. tétel — Új terv-lánc nyelv-/pénznem-öröklésének jelzése — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 117. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

Ha egy meglévő páciensnél a doki új terv-láncot indít („+ Új terv”), a friss
piszkozat nyelve és pénzneme a páciens **legutóbb véglegesített** tervéből
öröklődik, nem a rendelő globális alapértelmezéséből. Ez szándékos, a
`docs/02-domain-modell.md` § „Nyelv és pénznem” rögzíti — egy tartósan német,
euróban árazott páciensnél kényelmi funkció.

A jelenlegi hiány: a felület **semmilyen jelzést nem ad** erről. A doki a „+ Új
terv” után azonnal a Terv adatai lapra érkezik, ahol a Nyelv/Pénznem
chipcsoport már Deutsch/EUR állásban van, mindenféle magyarázat nélkül —
vizuálisan megkülönböztethetetlen attól, mintha ez lenne a rendelő
alapértelmezése. A doktori review
(`docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 4. megállapítás) ezt
önállóan reprodukálta: „Horváth Péter »+ Új terv« gombjára kattintva a Terv
adatai lap már Deutsch/EUR-ra volt állítva”.

A napi kár mérsékelt, de valós: ha a doki nem veszi észre, és a szokásos
munkamódja szerint magyarul kezd gépelni, a tételnevek rögtön németül jelennek
meg, ami zavaró, amíg rá nem jön az okára. A jelenlegi kerülőút az, hogy a doki
minden új tervnél tudatosan ellenőrzi a két mezőt.

## Döntések

### 1. Az öröklés viselkedése változatlan marad, csak jelzést kap

A vadonatúj lánc továbbra is a legutóbbi VÉGLEGES verzió nyelvét/pénznemét
veszi át. A tétel kizárólag egy **semleges, nem-blokkoló jelzést** ad hozzá a
Terv adatai lapon.

**Miért:** két alternatívát mérlegeltünk és vetettünk el.

- *Az öröklés teljes visszabontása* (vadonatúj lánc mindig a globális
  alapértelmezésről indul): ez a `docs/02-domain-modell.md` § „Nyelv és
  pénznem” dokumentált döntésének visszabontása lenne, és pontosan azt a
  munkát adná vissza a dokinak, amit az öröklés levett róla — egy tartósan
  német páciensnél minden új láncnál két kézi visszaváltás. A doktori review
  maga sem javasolta a visszabontást.
- *Részleges visszabontás* (a nyelv öröklődik, a pénznem nem): szétszedné a
  ma egységes, egy forrásból (a legutóbbi VÉGLEGES verzióból) dolgozó öröklési
  szabályt két, külön indokolandó szabályra, miközben a valós esetben
  (külföldi páciens) épp a kettő együtt mozog.

A megfigyelt probléma nem az öröklés, hanem a **láthatatlansága** — a
megoldásnak ezt kell megcéloznia.

### 2. Dimenziónként külön jelzés, a saját szekciójában

A „Dokumentum nyelve” szekció alján a nyelv-jelzés, a „Pénznem” szekció alján a
pénznem-jelzés — pontosan ott, ahol a már működő figyelmeztető sávok is ülnek
(hiányzó német nevek, illetve beárazatlan pénznem).

**Miért:** a jelzés közvetlenül a vezérlő mellett van, amiről szól, és a két
dimenzió egymástól függetlenül jelenhet meg vagy tűnhet el (lásd 3. és
5. döntés). Elvetve: egy közös, mindkét dimenziót említő mondat a két szekció
fölött — ott a szöveget feltételesen kellene összeállítani („csak a nyelv” /
„csak a pénznem” / „mindkettő”), és eltávolodna attól a chipcsoporttól, amire
vonatkozik.

### 3. A jelzés csak akkor látszik, ha az örökölt érték eltér az adott dimenzió globális alapértelmezésétől

A nyelv-jelzés feltétele, hogy az örökölt nyelv eltérjen a beállítások szerinti
alapértelmezett nyelvtől; a pénznem-jelzésé, hogy az örökölt pénznem eltérjen az
alapértelmezett pénznemtől. A két feltétel egymástól függetlenül értékelődik ki:
egy Deutsch/HUF öröklésnél (HUF alapértelmezés mellett) **csak a nyelvnél**
jelenik meg jelzés.

**Miért:** a jelzésnek pontosan egy dolga van — kimondani, hogy a látott érték
nem az alapértelmezés. Ahol az örökölt érték egybeesik az alapértelmezéssel, ott
nincs mit észrevenni, és a jelzés tartalom nélküli zaj lenne. A gyakoribb eset a
magyar páciens magyar/HUF előzménnyel: ott a lap változatlanul tiszta marad.
Elvetve: „mindig jelezzük, ha volt öröklés” — tanító hatású, de a magyar
páciensek túlnyomó többségénél minden új tervnél megjelenő, tartalom nélküli
sáv, ami hosszú távon a lap TÖBBI, valódi figyelmeztetésének figyelmen kívül
hagyásához vezet.

A feltétel élőben, az aktuális beállításokhoz mérve értékelődik ki. Ha a doki
menet közben átállítja a rendelő alapértelmezését, a jelzés ennek megfelelően
megjelenhet vagy eltűnhet — ez elfogadott, mert a jelzés állítása
(„nem az alapértelmezést látod”) így marad igaz.

### 4. Az „öröklés történt” tény tranziens alkalmazásállapotban él

Az öröklést ténylegesen elvégző kódút (a páciens adataiból induló új terv
összeállítása) adja tovább az öröklés tényét a piszkozatba töltő lépésnek, és az
egy memóriabeli állapotmezőben él tovább — pontosan úgy, ahogy ma a
dátum-frissítés és az orvos-visszaesés jelzése működik. A piszkozat elvetése,
alapállapotba állítása és a sikeres mentés ugyanúgy nullázza, mint azokat.

**Miért:** a jelzésnek tudnia kell azt, amit egyetlen más forrás sem tud. Két
alternatíva esett ki:

- *Derivált összehasonlítás* (a terv nyelve ≠ alapértelmezett nyelv, és a lánc
  még mentetlen): plumbing nélkül működne, de **hazudna** két esetben — (1) ha a
  doki maga váltott nyelvet ezen a friss piszkozaton, a jelzés továbbra is
  „öröklődött”-et állítana; (2) egy előzmény nélküli, vadonatúj páciensnél, ahol
  öröklés egyáltalán nem történt, szintén megjelenne. Egy jogilag/kommunikációsan
  érzékeny mezőnél egy magabiztosan hamis magyarázat rosszabb a jelzés hiányánál.
- *Perzisztált piszkozat-metaadat* (a piszkozat-cache metaadatai közé felvéve,
  a terv címe mintájára): túlélné a böngésző-újratöltést is, de a piszkozat-cache
  sémáját bővítené egy tisztán vizuális emlékeztető kedvéért, és az
  implementációt három rétegen (interfész, demó-implementáció, visszaállítási
  ág) érintené. A tranziens mező a navigációt (`/paciens` ↔ `/terv` ↔
  `/elonezet`) túléli, a böngésző-újratöltést nem — az utóbbi nem a jelzés
  célesete, mert a doki közvetlenül a „+ Új terv” kattintás után, a friss lapon
  találkozik a helyzettel.

A mező dimenziónként külön nullázható kell legyen (lásd 5. döntés).

### 5. A jelzést az adott dimenzió tényleges váltása véglegesen eltünteti

Amint a doki ténylegesen átállítja a nyelvet (vagy a pénznemet), AZ a jelzés
eltűnik, és nem jön vissza akkor sem, ha később visszaáll az eredetileg örökölt
értékre. A másik dimenzió jelzése érintetlen marad.

A nullázás a **tényleges alkalmazáskor** történik, nem a váltási szándéknál: ha a
váltás megerősítő dialógust hoz fel, és a doki megszakítja, a jelzés marad, mert
az érték sem változott.

**Miért:** az öröklés a jelzés szempontjából egy egyszeri esemény — „ezt az
értéket nem te választottad”. Amint a doki hozzányúlt a mezőhöz, az érték
tudatos választás, függetlenül attól, mi lett a végeredmény; onnantól az
„öröklődött” állítás félrevezető. Elvetve: derivált eltűnés („amíg az érték
egyenlő az örökölt értékkel”) — oda-vissza kapcsolgatásnál villogó jelzést adna,
és egy tudatosan visszaállított értékre is ráfogná, hogy észrevétlenül
öröklődött.

### 6. A szöveg nem nevezi meg a forrás tervet, és nincs benne akciógomb

A jelzés kimondja a tényt (a nyelv/pénznem a páciens legutóbbi véglegesített
tervéből öröklődött) és megnevezi az alapértelmezést, amitől eltér. Nem
hivatkozik a forrás terv címkéjére vagy dátumára, és nem tartalmaz „Váltás az
alapértelmezésre” gombot.

**Miért a forrás megnevezése nélkül:** ahhoz az öröklési forrást feloldó
lépésnek a verzió-referenciát is vissza kellene adnia, a címkéhez pedig egy
további tárolóhívás és annak hibaága kellene — egy egymondatos, semleges
emlékeztetőhöz aránytalan. A doki számára a lényeg nem az, MELYIK tervből,
hanem az, hogy nem az alapértelmezést látja.

**Miért gomb nélkül:** a chipcsoport közvetlenül a jelzés fölött van, a
visszaállás már ma is egy kattintás. Egy gomb ugyanazt a műveletet duplikálná,
és a semleges (nem cselekvésre hívó) jelleget cselekvésre buzdítóvá torzítaná —
holott az örökölt érték az esetek egy részében épp a helyes.

### 7. Forma: a meglévő semleges sáv-minta

Semleges (szürke) `Callout` információs ikonnal — ugyanaz a minta, amit a
dátum-frissítés és az orvos-visszaesés jelzése használ a szerkesztőben. Az amber
szín szándékosan NEM használható: azt a `docs/07-felulet-rendszer.md` a valódi
figyelmeztetéseknek tartja fenn, és a két szekcióban már ma is amber sávok
ülnek (hiányzó német nevek, beárazatlan pénznem) — egy harmadik amber elem
összemosná a „tennivalód van” és a „csak tájékoztatlak” üzenetet.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **„Másolás új tervbe”**: ott a nyelv/pénznem a forrás terv teljes másolatának
  része, nem öröklés — annak saját, már megvalósított jelzésrendszere van
  (`docs/02-domain-modell.md` § „Másolat-eredet jelzései”). Ez a tétel nem
  nyúl hozzá.
- **„Új verzió” egy meglévő láncon**: ugyanaz a lánc folytatódik, a
  nyelv/pénznem megőrzése magától értetődő — nincs mit jelezni.
- **Vadonatúj páciens** (gyorsfelvétel vagy új terv új páciensnek): nincs
  előzmény, nincs öröklés, nincs jelzés.
- **A véglegesítés-őr / véglegesítési checklist nem bővül.** Az örökölt
  nyelv/pénznem nem hiba és nem is kockázat — a checklist a dokumentum
  tartalmi/jogi állapotáról szól, nem arról, honnan jött egy alapérték.
- **A globális alapértelmezések szerkesztése** (Beállítások → Egyéb)
  változatlan.
- **A nyelv-/pénznemváltás megerősítő dialógusa** (annak gombszín-kérdése
  külön backlog-tétel) nem része ennek a tételnek.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/state/planIndulas.ts` — az öröklési forrás feloldása itt történik,
  és ma az öröklés ténye elveszik: a függvény csak a kész tervet adja vissza.
  A hívónak tudnia kell, történt-e öröklés.
- `app/src/components/PlanVersionActionDialog.tsx` — az „+ Új terv” útvonal
  **egyetlen** hívási helye (minden felület — a terv-lánc fa, az „Új terv
  indítása” lap, a páciens részletei üres állapota — ezen a hookon megy át),
  tehát a bekötés egy helyen történik. Innen navigál a `/paciens` lapra, ahol
  a jelzés megjelenik.
- `app/src/state/AppState.tsx` — a tranziens jelzésmező otthona, a
  `frissitettDatum`/`orvosFallback` mintáján; a piszkozatba töltő, az
  alapállapotba állító és a mentést nyugtázó ágak mind nullázzák.
- `app/src/pages/PatientPage.tsx` — a „Dokumentum nyelve” és „Pénznem”
  szekciók renderelése és a két váltási útvonal (ahol a jelzés dimenziónként
  nullázódik, az érték tényleges alkalmazásakor).
- `app/src/domain/beallitasok.ts` — az alapértelmezett pénznem feloldásának
  meglévő, egyetlen helye; az összehasonlítás ezt hívja, ne olvasson nyers
  mezőt.

## Tesztelés (irányadó, nem kimerítő)

1. **Alapeset.** Olyan páciensnél, akinek van véglegesített Deutsch/EUR terve
   (a demó adatban ilyen Horváth Péter), „+ Új terv” → a Terv adatai lapon
   mindkét szekcióban megjelenik a semleges jelzés, a chipek Deutsch/EUR
   állásban.
2. **Részleges eltérés.** Véglegesített Deutsch/**HUF** terv mellett indított
   új lánc: csak a „Dokumentum nyelve” szekcióban van jelzés, a „Pénznem”
   szekcióban nincs.
3. **Nincs zaj.** Véglegesített magyar/HUF terv mellett indított új lánc:
   egyik szekcióban sincs jelzés.
4. **Nincs öröklés.** Vadonatúj (terv nélküli) páciensnél indított terv: nincs
   jelzés, a chipek az alapértelmezésen.
5. **Piszkozat státuszú előzmény.** Ha a páciens egyetlen korábbi verziója nem
   véglegesített, öröklés nem történik → nincs jelzés, alapértelmezett
   értékek.
6. **Eltűnés.** Az 1. esetből a nyelv átváltása magyarra → a nyelv-jelzés
   eltűnik, a pénznem-jelzés marad. Visszaváltás Deutsch-ra → a nyelv-jelzés
   NEM jön vissza.
7. **Megszakított váltás.** Ha a váltás megerősítő dialógust hoz fel és a doki
   megszakítja, a jelzés marad.
8. **Navigáció.** Az 1. esetből „Kezelések” lapra, majd vissza a „Terv adatai”
   lapra → a jelzés változatlanul ott van.
9. **Mentés után.** A terv véglegesítése és mentése után egy új piszkozat
   indításakor nem marad ott az előző jelzés.
