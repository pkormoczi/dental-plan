# Backlog 92. tétel — Tömeges árváltoztatás az árlista adminban — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 92. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** a `backlog/BACKLOG.md` korábbi „KIDOLGOZÁSRA VÁR" listájának
7. pontja, háttérfájl nélküli felvetés. A `backlog/redesign/`
döntéssorozat nem ismeri ezt a funkciót — a DP-080 (kezeléslista/editor)
és a DP-081 (kategóriakezelés) egyaránt csak soronkénti szerkesztést
tárgyal.

## Probléma

- Az árlista ma 118 tételt tart, és minden árszerkesztés soronként,
  a kinyitott `ItemEditor` `NumberField`-jén át történik
  (`app/src/pages/PriceListAdminPage.tsx`). Egy általános áremelés vagy egy
  euró-árszint igazítása így tételenkénti kattintás + gépelés + commit —
  a gyakorlatban elvégezhetetlen.
- A doki tipikus igénye nem tételspecifikus: „minden implantológiai tétel
  +5%", „az összes euró-ár +5%". Ehhez ma nincs eszköz; a legutóbbi
  tömeges adatműveletet (a 8. tétel árlista-takarítását) kézzel, a
  seed-JSON-ben végeztük el, ami éles törzsadaton nem járható út.
- A kerekítés kézzel is munka: egy 95 000 Ft-os tétel +5%-a 99 750 Ft, amit
  a doki minden sorban külön „szépítene" ki.
- Az `arlistaVerzio` minden mentéskor a mai napra áll (D30), tehát 118
  külön szerkesztés ugyanazt a verziót 118-szor bélyegzi újra —
  funkcionálisan nem hibás, de az egyetlen logikai művelet 118 írásra
  esik szét.

## Döntések

### 1. Belépési pont: külön dialógus, a „+ Új tétel" gomb mellett

A lap fejlécsorában, a „+ Új tétel" gomb mellé kerül egy „Tömeges
árváltoztatás" gomb, ami egy Radix Themes `Dialog`-ot nyit (NEM
`AlertDialog` — mezőválasztás történik benne, lásd
`docs/07-felulet-rendszer.md` § Komponensek). A lista alján megismételt
„+ Új tétel" gombnak NINCS tömeges párja: az ritkán használt, tudatos
művelet, nem a napi felviteli ciklus része.

A dialógus Mégse gombja és az Escape nyomtalanul eldobja az összeállított
műveletet, megerősítés-kérés nélkül — pontosan úgy, ahogy az
`UjTetelDialog` teszi. Nincs `useDirtyDraft`/`useDiscardGuard`
bekötés: itt nincs „félkész munka", amit kár lenne elveszíteni, a
paraméterek másodpercek alatt újra beállíthatók.

**Miért:** a lap fő táblázata sűrű szerkesztőrács (`Table.Root size="1"`),
amit a `docs/07-felulet-rendszer.md` kifejezetten adattáblaként véd. Egy
állandó checkbox-oszlop és egy megjelenő/eltűnő művelet-sáv minden
mindennapi szerkesztés vizuális költsége lenne egy ritka művelet
kedvéért.

**Elvetett alternatíva A — checkbox oszlop a fő táblázatban + művelet-sáv:**
a kijelölés a lap állapotává válna, együtt élne a keresővel és a
szűrőkkel (egy szűrőváltás után mit jelent a „kijelölt"?), és a
`docs/07-felulet-rendszer.md` sor-akció szabályaival is feszülne.

**Elvetett alternatíva B — a művelet mindig a lapon éppen szűrt listára hat,
kör-választó nélkül:** kategória-körhöz a lap szűrősávját kellene
kategória-választóval bővíteni, ami minden nap ott van, hogy egy ritka
művelet kiszolgálja.

### 2. A kör: három preset + soronkénti kipipálás

A dialógus tetején egyetlen kör-választó (`RadioGroup`), három
lehetőséggel:

- **Teljes árlista** (alapértelmezett),
- **Kategória** — mellette egy `Select` egyetlen kategóriára (nem
  többszörös kijelölés: két kategória két külön, külön ellenőrzött
  művelet),
- **A jelenlegi szűrt lista (N tétel)** — a lap keresőszövege és
  `SegmentedControl` szűrője szerinti kör. Ez a lehetőség csak akkor
  jelenik meg, ha van aktív keresés vagy a szűrő nem `Mind` — egyébként
  szó szerint azonos lenne a „Teljes árlista" körrel.

A „jelenlegi szűrt lista" kör a lap `keep()` predikátumának
kereső/szűrő ágait használja, de **a nyitott sor kivétele nélkül** — az a
kivétel (`x.id === open`) a szerkesztés közbeni eltűnés ellen véd, egy
tömeges művelet körét viszont hamisan tágítaná.

A kör mellett egy „Inaktív tételek is" checkbox, **alapból kikapcsolva**.

**Miért:** a backlog-felvetés négy kört nevez meg (teljes árlista,
kategória, pénznem, kijelölt tételek); a pénznem önálló tengely (3.
döntés), a maradék három pedig pontosan ez a preset-hármas + a
soronkénti pipa. Az inaktív alapértelmezett kizárása azért, mert egy
inaktív tétel nem a jelenleg kínált kezelések része — de a bevonás egy
kattintás, hogy egy később reaktivált tétel ára ne maradjon évekre
elavult.

### 3. Egy művelet = egy pénznem

Kötelező `RadioGroup`: HUF **vagy** EUR. A HUF és az EUR ár egyszerre
sosem módosul.

**Miért:** a két ár egymástól teljesen független, nincs köztük átváltás
(D11/D71) — összekapcsolásuk egy közös százalékkal éppen azt a látszatot
keltené, hogy van köztük kapcsolat. Emellett a kerekítési lépés is más
nagyságrendű a két pénznemben, az előnézet pedig kétoszlopossá és
zajossá válna a sok hiányzó EUR ártól.

**Elvetett alternatíva — mindkét pénznem, pénznemenként külön
százalékkal:** a legrugalmasabb, de két beviteli mező, két kerekítési
választó és egy négyoszlopos előnézet ára van, egy olyan műveletnél,
amit a doki nem naponta futtat.

### 4. Irány + pozitív százalék, korlátozott tartománnyal

Két vezérlő: „Emelés / Csökkentés" (`SegmentedControl`) és egy pozitív
százalék-mező. Emelésnél 0–100%, csökkentésnél 0–90% a megengedett
tartomány. A százaléknak nullánál nagyobbnak kell lennie: 0%-nál az
„Alkalmazás" gomb — a projekt konvenciója szerint nem letiltva, hanem —
kattintásra a mező alatt hibaszöveget mutat.

**Miért:** egy elhagyott mínuszjel egyetlen előjeles mezőben némán az
ellenkező irányú műveletet indítaná el. A 90%-os csökkentési plafon és a
100%-os emelési plafon a nagyságrend-elgépelés (50 helyett 500) olcsó
fogása; a plafonok tudatosan konzervatívak, egy valós igény esetén
egyetlen konstans emelése oldja fel őket.

**Elvetve: a 0%-os, „csak kerekítsd szépre" művelet.** Ugyanez a
dialógus kiszolgálná, de az „árváltoztatás" fogalmát mosná össze egy
formázási művelettel, és a megerősítő szöveg („N tétel ára változik")
is hamis lenne. Külön tétel tárgya lehet, ha felmerül.

### 5. Kerekítés: egy közös létra, választható felső korlát, soronkénti automatikus finomítás

Egyetlen kerekítési létra létezik, a pénznem **alapegységében** kifejezve
(HUF: forint, EUR: cent):

`1000 · 500 · 100 · 10 · 1`

HUF-ban ez `1000 Ft · 500 Ft · 100 Ft · 10 Ft · 1 Ft`, EUR-ban
`10 € · 5 € · 1 € · 0,10 € · 0,01 €` — ugyanaz a számsor, ezért nincs két
külön szabály.

A dialógusban a doki a létra **felső három fokát** választhatja
(HUF: 100 / 500 / 1000 Ft, EUR: 1 / 5 / 10 €), alapértelmezés a
legfinomabb (100 Ft, illetve 1 €). Ez a választás **felső korlát**, nem
fix lépés.

Soronként a ténylegesen használt lépés a létra **legnagyobb olyan foka,
ami nem nagyobb sem a doki választásánál, sem a nyers változás
abszolút értékénél** (`|új nyers érték − régi érték|`). A kerekítés
mindig a legközelebbi többszörösre megy.

Ennek a szabálynak egyetlen, kimondható invariánsa van: **a kerekítés a
nyers eredményt legfeljebb a kért változás felével térítheti el.** Ez
zárja ki azt az esetet, amikor egy 500 Ft-os tétel +5%-a 1000 Ft-os
lépéssel 1000 Ft-tá (valójában +100%) kerekedne — ott a nyers változás 25
Ft, tehát a sor 10 Ft-os lépést kap, és 530 Ft lesz belőle.

**A szabály nem néma.** Az előnézetben minden olyan sor, amelyik a
választottnál finomabb lépést kapott, halkan kiírja a ténylegesen
használt lépést, a lábléc pedig számolja őket („N sornál finomabb
kerekítés kellett"). Ez nem figyelmeztetés (nincs `t.warn` szín): a
viselkedés helyes, csak magyarázatot igényel.

**Miért:** kerekítés nélkül a művelet elveszíti a lényegét (a doki
utólag 118 sort csinosítana), fix lépéssel viszont a kis árú tételeknél
a kerekítés nagyságrendekkel túllőné a kért százalékot. A létra + felső
korlát modell mindkettőt megoldja egyetlen, egy mondatban kimondható
invariánssal, és nem vezet be külön HUF/EUR szabályt.

**Elvetett alternatíva A — amber figyelmeztetés a torzuló sorokon,
automatikus finomítás nélkül:** a doki dolgává tenné, hogy a lépést
addig állítgassa, amíg a figyelmeztetések eltűnnek — pont az a manuális
munka, amit a tétel megszüntetni akar.

**Elvetett alternatíva B — nincs kerekítés, a nyers szorzat kerül be:**
a legegyszerűbb implementáció, de a művelet vonzerejét (azonnal
használható, „szép" árak) rontja el.

### 6. Sávos tételek: mindkét határ ugyanazzal a százalékkal

`SAVOS` árnál a `min` és a `max` is ugyanazzal a százalékkal változik,
de mindkettő **külön** kapja meg az 5. döntés szerinti soronkénti
lépés-számítást (a két érték nyers változása eltérő nagyságú lehet). Az
előnézet a teljes sávot mutatja (`35 000–55 000 → 36 800–57 800`), a
`formatPrice()` meglévő sáv-formátumával.

Egy már fordított sáv (`min > max`, `savosHatarForditott()`) a művelettől
nem javul meg és nem is romlik el: mindkét határ arányosan mozdul, a
meglévő puha amber figyelmeztetés az `ItemEditor`-ban változatlanul
jelzi. Ez a tömeges művelet nem vállalja fel az adathiba javítását.

**Miért:** a `min` az, ami a tervbe és a nyomtatványra kerül
(`basePrice()`), de a `max` sem díszlet — a doki ebből becsül. Ha csak a
`min` mozdulna, a sáv alja és teteje évek alatt szétcsúszna egymástól.

**Elvetve: a sávos tételek kihagyása.** Ma mindössze két ilyen tétel van,
de a szabály elvi: attól, hogy egy ár becslés, még ugyanúgy avul, mint
egy fix ár.

### 7. Kihagyott és nem változó sorok osztályozása

Az előnézet minden, a körbe eső tételt felsorol, négy állapot egyikében:

| Állapot | Mikor | Checkbox |
|---|---|---|
| **változik** | van ár a választott pénznemben, és az új érték eltér a régitől | ki van pipálva, kipipálható |
| **nincs ár ebben a pénznemben** | `ar.HUF`/`ar.EUR` hiányzik vagy `null` | letiltva, nem írható |
| **nem változik** | 0 ár (0 × bármi = 0), vagy a kerekítés visszaadja az eredetit | letiltva |
| **0-ra csökkenne** | az eredmény 0 lenne (erős csökkentésnél, kis árnál) | letiltva, nem írható |

A `null` ár SOSEM kap értéket ettől a művelettől — a `null` azt jelenti,
hogy a tétel abban a pénznemben nem ajánlható, nem azt, hogy „0"
(`docs/02-domain-modell.md`). A „0-ra csökkenne" eset azért kimarad,
mert a 0 ár érvényes, de tudatos érték (az admin külön megerősítést kér
egy 0 Ft-os tétel aktiválásakor) — nem születhet egy kerekítés
mellékhatásaként.

### 8. Az előnézet alapból MINDENT kijelöl

Az előnézet-táblázat minden módosítható sora kipipálva jelenik meg,
fölötte egy „Összes kijelölése" checkboxszal. A soronkénti pipa
kivétel-jelölő (opt-out), nem beleegyezés (opt-in).

**Ez tudatos eltérés** a `docs/07-felulet-rendszer.md` § Komponensek
checkbox-listás dialógus-mintájától (`components/TorzsadatDiffDialog.tsx`,
„Alapból SEMMI nincs kijelölve"). Ott a dialógus MAGA az ajánlat: a
program veti fel, hogy a törzsadat és a terv-pillanatkép eltér, és az
üres kiindulás védi a dokit egy nem kért felülírástól. Itt fordított a
helyzet: a szándékot a doki mondta ki a kör-választóval („az egész
Implantológia +5%"), a dialógus csak végrehajtja. Az üres kiindulás egy
118 tételes körnél azt jelentené, hogy az első kattintás mindig az
„Összes kijelölése" — ez rítus, nem védelem.

A lezáráskor ez a különbségtétel a `docs/07-felulet-rendszer.md`
megfelelő szakaszába kerül át, hogy a szabály és a kivétel indoka egy
helyen álljon.

Minden soron a checkbox `aria-label`-je azonosítja a tételt (a
`docs/07-felulet-rendszer.md` sor-akció szabálya szerint).

### 9. A lábléc darabszámokat mutat, nem árösszeget

A dialógus lábléce a kihagyások okával bontott darabszámokat írja ki:

```
13 tétel HUF ára változik
2 kihagyva (nincs ár ebben a pénznemben)
1 nem változik (0 Ft)
1 sornál finomabb kerekítés kellett
```

**Miért nincs összegzés:** 118 különböző kezelés árának az összege nem
hordoz jelentést — nem kosár, nem forgalom, nem bevétel. Egy
„1 240 000 → 1 302 000 Ft" sor hamis pontosságot és hamis pénzügyi
jelentést sugallna egy törzsadat-műveletnél.

### 10. Két lépcső: élő előnézet, majd összesített megerősítés

A táblázat élőben követi a paramétereket (irány, százalék, kerekítés,
kör) — nincs külön „Előnézet" gomb és nincs varázsló-lépegetés. Az
„Alkalmazás" gomb egy `AlertDialog`-ot nyit a 9. döntés szerinti
összegzéssel és azzal a mondattal, hogy a művelet nem vonható vissza;
az írás csak ennek megerősítése után történik.

**Miért:** a paraméter-finomhangolás (kerekítési lépés próbálgatása) a
soronkénti számok látványa mellett zajlik, ezt egy kétlépcsős varázsló
oda-vissza lépegetéssé rontaná. A második megerősítés viszont kell:
egy hosszú, görgetett listánál az „Alkalmazás" pillanatában a
darabszámok nincsenek a képernyőn.

### 11. Egyetlen írás, egyetlen `arlistaVerzio`-bélyeg

A teljes tömeges módosítás EGY `commit()` hívás — egyetlen
`savePriceList` updater, ami a friss `prev`-en végigmegy az érintett
tételeken (D31). Ebből következően egyetlen `arlistaVerzio`-bélyeg
keletkezik (D30), nem N darab.

Az updateren belül a művelet a `prev.tetelek` MAI állapotára fut, nem az
előnézet készítésekor befagyasztott értékekre — az előnézet és a
tényleges írás közti eltérés így elvileg lehetséges (párhuzamosan
szerkesztett tétel), gyakorlatilag kizárt egyfelhasználós, egylapos
munkamenetben. Az `addCategory`/`mentUjTetel` ugyanezt az elvet követi az
id-számításnál.

### 12. Hibás mentésnél nincs újrapróbálás a dialógusban

Sikertelen írásnál a dialógus bezárul, és a lap meglévő, piros
`saveError` `Callout`-ja jelzi a hibát — a dialóguson belül NINCS
„Újrapróbálás" gomb.

**Miért:** a `savePriceList` optimista, a memóriabeli állapotot a
mentés ELŐTT, szinkron frissíti, és hibára SEM gördíti vissza (D31). Egy
dialóguson belüli újrapróbálás tehát a már megemelt árakra futtatná
újra a szorzást: egy +5% + egy újrapróbált +5% együtt +10,25% lenne,
némán. A művelet szorzó jellege miatt ez nem elméleti veszély, hanem a
legvalószínűbb hibaforgatókönyv.

### 13. A meglévő tervekre nincs hatás — a dialógus ezt kimondja

A dialógus egy halk, tájékoztató sort tartalmaz: a már mentett tervek
árai nem változnak (pillanatkép-elv), egy éppen nyitott piszkozat sorain
pedig a meglévő „elavult ár" jelzés fog megjelenni, amit soronként lehet
frissíteni. A tömeges művelet SOHA nem nyúl egyetlen `terv.json`-hez sem,
és nem indít automatikus sor-frissítést.

**Miért:** ez D7 és a sor-szintű ár-követés (`arKoveti()`,
`arFrissites()`) meglévő, változatlan viselkedése — de a doki
szempontjából egy „az összes ár +5%" művelet után a legelső kérdés
pontosan ez lesz, és a válasznak ott kell lennie a művelet helyén.

### 14. Nincs visszavonás

Az árlistának nincs verziótörténete; egy visszavonás az előző állapot
eltárolását igényelné, ami új séma-fogalom. A védelem a soronkénti
előnézet és a megerősítő dialógus. A megerősítő szöveg kimondja, hogy a
művelet nem vonható vissza — és azt is, hogy egy ellentétes százalék nem
állítja vissza pontosan az eredeti árakat (a kerekítés miatt +5% után a
−5% nem ugyanoda visz vissza).

**Elvetett alternatíva — memóriában tartott, egyszeri „Visszavonás" sáv a
mentés után:** kényelmes, de egy második írási utat nyitna az árlistára,
ami az oldal frissítéséig él, utána nyomtalanul eltűnik — egy
törzsadat-műveletnél ez a féllábon álló garancia rosszabb, mint a
világos „nincs visszavonás".

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Bármilyen automatikus HUF↔EUR átváltás vagy árfolyam-szolgáltatás** —
  a backlog-felvetés maga is kizárja, és a két pénznem függetlensége
  alapszabály.
- **Abszolút értékre állítás tömegesen** („legyen minden implantátum
  120 000 Ft") — más művelet, más kockázat, önálló tétel tárgya lehet.
- **Tömeges kategória-áthelyezés, tömeges `gyakori`/`aktiv`/`csomag`
  billentés** — a dialógus kizárólag árat módosít. Az árlista-takarítás
  (kategória-besorolás, csomagjelölés) az adattisztítás dolga.
- **0%-os, „csak kerekítés" művelet** — a 4. döntésben explicit kizárva.
- **Árlista-verziótörténet / visszaállítás** — a 14. döntésben explicit
  kizárva; ha valaha felmerül, önálló tétel, saját sémakérdésekkel.
- **A `PriceListAdminPage.tsx` felbontása** — a fájl már ma is a
  legnagyobbak közt van, és a `BACKLOG.md` külön tétele foglalkozik vele;
  ez a tétel egy ÚJ, önálló komponensfájlt hoz létre, nem bontja meg a
  meglévőt.
- **A doki árlista-adattisztítása** (a `NEM FEJLESZTÉS` 24. tétel) — ez a
  funkció nem váltja ki, és nem is előfeltétele.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/` — új, tiszta modul a művelet magjának: a kör
  kiszámítása, a soronkénti új ár és a soronkénti kerekítési lépés (5.
  döntés), a 7. döntés szerinti állapot-osztályozás. `localStorage` és
  React nélkül tesztelhető, a `domain/arKoveti.ts` / `domain/mennyiseg.ts`
  mintájában. A kerekítési létra ennek a modulnak az exportált konstansa
  — ne kerüljön másolat a dialógusba.
- `app/src/pages/priceListAdmin/` — új dialógus-komponens, az
  `UjTetelDialog.tsx` szomszédjaként; a `Dialog` + Mentés/Mégse
  konvenciója onnan, a checkbox-listás táblázat elrendezése a
  `components/TorzsadatDiffDialog.tsx`-ből (a 8. döntés szerinti eltérő
  alapállapottal).
- `app/src/pages/PriceListAdminPage.tsx` — a gomb és a dialógus mountolása
  a fejlécsorban; a meglévő `commit()` egyetlen új hívója (11. döntés); a
  `keep()` kereső/szűrő ágainak újrahasznosítása a „jelenlegi szűrt lista"
  körhöz, a nyitott sor kivétele NÉLKÜL (2. döntés). A `saveError` állapot
  változatlanul szolgál ki (12. döntés).
- `app/src/domain/money.ts` — a `formatPrice()`/`formatMoney()` az
  előnézet régi/új értékeihez, `'hu'` nyelvvel (az admin törzsadat-felület,
  nincs dokumentumnyelv). Új formázó nem kell.
- `app/src/components/NumberField.tsx` — a százalék-mezőhöz; a `unit`
  prop ma `'HUF' | 'EUR'`, a százalék ezt nem használja.
- Tesztek: a domain-modulra egység-tesztek (kerekítési létra, a felezési
  invariáns, `SAVOS` mindkét határa, `null`/0/0-ra-csökkenő sorok,
  inaktív be-/kizárás); a `PriceListAdminPage.test.tsx` mintájára a
  dialógus végigjátszása a `readPriceList()` segéddel — külön
  teszt-fájlban, a `PriceListAdminPage.leiras.test.tsx` mintáján (a fő
  teszt-fájl már ma is 43 KB).
- Lezáráskor bővítendő dokumentáció: `docs/03-funkcionalis-spec.md` § 6.
  Kezelések és árak (új alszakasz a műveletről, a kör/pénznem/kerekítés
  szabályaival és a kihagyás-osztályokkal);
  `docs/07-felulet-rendszer.md` § Komponensek (a checkbox-listás dialógus
  „alapból semmi nincs kijelölve" szabálya mellé a 8. döntés szerinti
  kivétel és annak indoka); `CLAUDE.md` „Meglévő segédfüggvények" (az új
  domain-modul bekezdése). A `app/src/dokumentacioGuard.ts` baseline-ját
  a doksi-bővítéssel együtt frissíteni kell.

## Tesztelés (irányadó, nem kimerítő)

- Teljes árlista, HUF, +5%, 100 Ft-os lépés: minden nem-`null` HUF ár
  emelkedik, a `null` EUR árak érintetlenek maradnak, az `arlistaVerzio`
  a mai napra ugrik — EGYSZER, nem tételenként.
- Kategória-kör: kizárólag a választott kategória tételei változnak, a
  többi bájtra azonos marad a mentett `arlista.json`-ben.
- „Jelenlegi szűrt lista" kör: a lapon beírt keresőszóra szűrt tételek
  köre jelenik meg; egy éppen kinyitott, a szűrőbe nem illő sor NEM
  kerül a körbe.
- Inaktív tétel: alapból nem szerepel az előnézetben; az „Inaktív tételek
  is" pipával megjelenik és módosul.
- Kerekítési létra: 500 Ft-os tétel, +5%, 1000 Ft-os választott lépés →
  530 Ft (nem 1000 Ft), a soron látszik a ténylegesen használt 10 Ft-os
  lépés, a lábléc számolja.
- 95 000 Ft, +5%, 100 Ft-os lépés → 99 800 Ft.
- `SAVOS` tétel: mindkét határ mozdul, az előnézet a teljes sávot mutatja.
- `null` EUR árú tétel EUR-műveletben: „nincs ár ebben a pénznemben",
  letiltott checkbox, mentés után is `null` marad (nem lesz belőle 0).
- 0 Ft-os tétel: „nem változik", nem számít bele a változó darabszámba.
- Erős csökkentés kis áron: a 0-ra csökkenő sor kihagyva, mentés után az
  eredeti ár marad.
- Soronkénti kipipálás: a kipipált sor ára a mentés után változatlan.
- 0%: az „Alkalmazás" hibaszöveget mutat, nem ment.
- Escape / Mégse: semmi nem íródik, a lap `arlistaVerzio`-ja változatlan.
- A művelet után egy nyitott terv-piszkozat sorain megjelenik az „elavult
  ár" jelzés; egy már véglegesített, mentett verzió `terv.json`-je bájtra
  változatlan.
- Billentyűzet: a dialógus végigjárható Tab-bal, az Escape zár, a
  checkboxok `aria-label`-je azonosítja a tételt.
- `npm run build`, `npm run lint`, `npm test` zölden fut az `app/` alatt.
