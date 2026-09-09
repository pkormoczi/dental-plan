# Doctor-review — `nevutkozes`

Dátum: 2026-09-01
Forgatókönyv: nevutkozes — Nagy Éva nevű páciens felvitele (a seedben már létező névvel) + Kovács János adatjavítása és törzsadat/pillanatkép-eltérés
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 3 (hasonló nevű/már létező páciens), 4 (meglévő páciens keresése és adatjavítás), 19 (törzsadat ↔ pillanatkép eltérés)
Bizonyosság-eloszlás: megfigyelt 4 / erős következtetés 0 / feltételezés 0

## 1. Napi munkamenet összefoglalója

A persona a Kezdőlap „+ Új kezelési terv" gombjából indulva a `/uj-terv"
köztes választóra jutott, ahol a "+ Új páciens" gyorsfelvétel dialógusába
Nagy Éva nevét gépelve a duplikáció-felismerés élőben, helyesen jelezte a
meglévő találatot. A jelölt kiválasztásával a Terv adatai lap előretöltve,
helyesen jelent meg — de ez a puszta megnyitás, tényleges szerkesztés
nélkül, azonnal "védendő piszkozatként" jelent meg a Kezdőlapon, ami a
persona szerint zavaró. Ezután a Páciensek listáról megkereste Kovács
Jánost, kijavította a telefonszámát a "Páciens adatai" fülön — ez a folyamat
gördülékeny volt (Mentés csak tényleges változásnál aktiválódik). A "Kezelési
tervek" fülön viszont a terv-lánc listán semmi nem jelezte, hogy a most
módosított törzsadat eltér egy korábbi verzió pillanatképétől — ez csak a
verzió saját részletoldalán, a "Páciens adatai a véglegesítéskor" blokkban
derült ki, ahol viszont a mezőszintű összevetés kifejezetten jól sikerült.
Végül egy második próbával (eltérő telefonszámmal megadott "Nagy Éva") a
persona megerősítette, hogy a duplikáció-védelem ténylegesen két lépcsőben
(élő jelzés + explicit mentés-előtti megerősítő dialógus) is jól működik.

## 2. Legfontosabb megállapítások

### 1. Egy meglévő páciens puszta kiválasztása (szerkesztés nélkül) azonnal "védendő piszkozatot" hoz létre

- **Súlyosság:** Közepes (bizalom-rontó/megtévesztő állapotjelzés, nem
  adatvesztés — de a piszkozat-jelzés hitelességét ássa alá idővel)
- **Gyakoriság:** Gyakori — minden alkalommal bekövetkezik, amikor a doki
  a "Meglévő páciens keresése" úton (vagy a duplikáció-javaslat "Ezt a
  pácienst választom" gombján) egy MÁR LÉTEZŐ páciensre indít új tervet,
  még mielőtt bármit is begépelne
- **Érintett folyamat:** 4 (meglévő páciens keresése), 21 (megszakítás
  utáni visszatérés)
- **Bizonyosság:** megfigyelt (a persona reprodukálta; a fő ügynök a
  forráskódból is megerősítette)
- **Dedup:** ÚJ (a `2026-08-25-doctor-review-zsufolt-reggel.md` egy
  ROKON, de ELTÉRŐ jelenséget ír le — ott egy tartalmas piszkozat
  megerősítés NÉLKÜLI, csendes felülírásáról van szó; itt arról, hogy
  egy TARTALOM NÉLKÜLI, puszta megnyitás miért számít már "tartalmasnak")
- **Helyzet és reprodukció:** A `/uj-terv` oldalon a duplikáció-javaslat
  "Ezt a pácienst választom: Nagy Éva" gombjára kattintva a Terv adatai
  lap előretöltve nyílik meg (helyesen), de a persona semmilyen mezőt nem
  módosított, mielőtt továbbnavigált volna. A Kezdőlapra visszatérve
  ennek ellenére egy kiemelt "Piszkozat folytatása — Nagy Éva" kártya
  fogadta. Kódszinten ez a `pages/NewPlanPage.tsx` meglévő páciens
  kiválasztásakor hívott `copyPlanIntoDraft(next, patient.dirName)`
  hívásából ered — ez a `domain/piszkozat.ts` szerint SZÁNDÉKOSAN "azonnal
  mentetlen munkának számít" (a `loadPlanIntoDraft`-tól eltérően), és a
  `piszkozatTartalmas()` az első feltételként a `p.nev.trim()` (a
  páciensnév) meglétét nézi — ami egy előretöltött, meglévő páciens
  esetén A KIVÁLASZTÁS PILLANATÁBAN, a doki bármilyen gépelése nélkül már
  igaz. A "Piszkozat elvetése" gomb ilyenkor is ugyanazt a súlyú,
  visszavonhatatlanságra figyelmeztető szöveget adja ("Biztosan eldobod a
  folyamatban lévő piszkozatot? Ez nem vonható vissza."), mint egy
  ténylegesen kitöltött tervnél — a szöveg nem különbözteti meg az
  "üresen megnyitottam" és a "ténylegesen dolgoztam rajta" esetet.
- **Orvosi elvárás:** Ha csupán megnyitottam egy páciens adatlapját, hogy
  megerősítsem, ő-e a keresett személy, majd anélkül navigálok tovább,
  hogy bármit módosítanék, ne kapjak "folytatható munka" jelzést — ez a
  jelzés a ténylegesen elveszíthető munkát jelezze.
- **Tapasztalt probléma:** A "Piszkozat folytatása" kártya — az egyik
  legfontosabb, legszembetűnőbb elem a Kezdőlapon — megjelenik olyankor
  is, amikor valójában semmi nem történt. Ez zavart okoz megszakítás után:
  a doki nem tudja megszakításmentesen eldönteni, ténylegesen félbehagyott
  munkája van-e, vagy csak egy korábbi "ránézés" maradványát látja.
- **Napi hatás:** Ha ez a jelzés rendszeresen "üres" megnyitásokból is
  létrejön, a doki idővel megszokhatja, hogy figyelmen kívül hagyja a
  kártyát — ami azt a kockázatot hordozza, hogy egy VALÓDI, elveszíthető
  piszkozatot is átugrik ugyanezzel a megszokással.
- **Jelenlegi kerülőút:** Minden alkalommal meg kell nyitni a piszkozatot,
  hogy ellenőrizze, van-e benne érdemi tartalom.
- **Javasolt javítási irány:** A `piszkozatTartalmas()` (vagy a
  `copyPlanIntoDraft` "azonnal mentetlen munkának számít" szabálya)
  külön kezelhetné azt az esetet, amikor a `paciens` blokk kizárólag egy
  ELŐRETÖLTÖTT, MEG NEM VÁLTOZTATOTT meglévő páciens adata — pl. egy
  "eredeti" pillanatkép elmentésével és összehasonlításával, hasonlóan a
  `PatientEditorPanel` `useDirtyDraft`/`draftDirty` mintájához, amit a
  kódbázis már máshol is használ "van-e tényleges változás" eldöntésére.
- **Siker mércéje:** A "Piszkozat folytatása" kártya csak akkor jelenik
  meg, ha a doki ténylegesen módosított valamit (mezőt írt, tételt vett
  fel) a puszta páciensválasztáson túl.

### 2. A terv-lánc listán (verziósoron) nincs jelzés a törzsadat ↔ pillanatkép eltérésről — csak a verzió saját részletoldalán derül ki

- **Súlyosság:** Közepes-alacsony (nem adatvesztés, de a doki csak akkor
  szerez tudomást a régi kontaktadatról, ha véletlenül pont azt a verziót
  nyitja meg)
- **Gyakoriság:** Minden olyan esetben előfordul, amikor egy páciens
  törzsadata (telefon, cím, e-mail, TAJ) módosul, miközben legalább egy
  korábbi mentett terve van
- **Érintett folyamat:** 19 (törzsadat ↔ pillanatkép eltérés)
- **Bizonyosság:** megfigyelt (a persona reprodukálta Kovács Jánosnál; a
  fő ügynök megerősítette, hogy a `components/PatientPlanChains.tsx` —
  a terv-lánc lista komponense — sehol nem hivatkozik a
  `masterSnapshotDiff`-re, tehát a chain-szintű listán strukturálisan
  nincs ilyen jelzés)
- **Dedup:** ÚJ
- **Helyzet és reprodukció:** Kovács János telefonszámát a "Páciens
  adatai" fülön kijavította a persona. Visszaváltva a "Kezelési tervek"
  fülre, a terv-lánc sor ("Korona és hídpótlások · v1") vizuálisan
  változatlan maradt, semmilyen jelzés nem utalt arra, hogy a most
  módosított törzsadat eltér a mentett verzió pillanatképétől. Csak a
  verzió "Megnézés" gombjára kattintva, a Terv részletei oldal "Páciens
  adatai a véglegesítéskor" blokkjában jelent meg egy "Megjelenítés — 1
  mező azóta módosult" jelvényes, kinyitható, mezőszintű összevetés
  (Törzsadat vs. A terv adata) — ez utóbbi maga kifejezetten jól sikerült
  (lásd „Ami jól működik").
- **Orvosi elvárás:** Ha egy terv-lánc listát nézek végig sok páciensen
  átfutva, szeretném már ott, a lista szintjén látni, ha egy adott
  verzió kontaktadata elavult — mielőtt egyáltalán megnyitnám.
- **Tapasztalt probléma:** A jelzés kizárólag a verzió-részletoldalon
  létezik, a lánc-listán nem — így csak akkor derül ki, ha a doki
  véletlenül pont azt a verziót nyitja meg, ami érintett.
- **Napi hatás:** Ha a doki a régi terv alapján akarná felhívni vagy
  megkeresni a pácienst (pl. egy korábbi ajánlat alapján), a lánc-listán
  nem kap előzetes figyelmeztetést arra, hogy a benne szereplő
  elérhetőség elavult.
- **Jelenlegi kerülőút:** Minden érintett verziót egyenként meg kell
  nyitni az ellenőrzéshez.
- **Javasolt javítási irány:** Egy kis, nem tolakodó jelzés (pl. egy
  figyelmeztető ikon) a terv-lánc soron is jó lenne, hasonló elven, mint
  ahogy egy aktív piszkozatnál is jelezve van más eltérés — a meglévő
  `masterSnapshotDiff()` segédfüggvény már rendelkezésre áll ehhez, csak
  a lánc-lista szintjén nincs meghívva.
- **Siker mércéje:** A doki a lánc-lista áttekintésekor, a részletoldal
  megnyitása nélkül is látja, mely verziók kontaktadata tér el a
  jelenlegi törzsadattól.

### 3. A duplikáció-jelölt chip nem mutatja a tényleges megkülönböztető adatot, csak egy minőségi leírást

- **Súlyosság:** Alacsony-közepes (döntési bizonytalanság, nem
  adatvesztés)
- **Gyakoriság:** Csak akkor releváns, ha több hasonló/azonos nevű
  páciens van, vagy a doki bizonytalan, hogy a talált jelölt valóban a
  keresett személy-e
- **Érintett folyamat:** 3 (hasonló nevű/már létező páciens)
- **Bizonyosság:** megfigyelt (a fő ügynök közvetlenül a forráskódban —
  `pages/paciensek/DuplikacioJavaslatok.tsx` — ellenőrizte: a chip
  kizárólag `{név} ({indoklás})` formátumban jelenik meg, ahol az
  indoklás egy előre megfogalmazott leírás — "azonos név", "azonos név,
  eltérő telefon" stb. —, sosem a tényleges születési dátum vagy
  telefonszám érték)
- **Dedup:** ÚJ
- **Helyzet és reprodukció:** A gyorsfelvétel dialógusban "Nagy Éva"
  nevet begépelve a jelölt-chip csak ennyit mutatott: "Nagy Éva (azonos
  név)". A tényleges születési dátum vagy telefonszám csak akkor derül
  ki, ha a doki ténylegesen rákattint a jelöltre. A seedben csak egy
  Nagy Éva van, tehát a több-jelöltes esetet a persona nem tudta
  kipróbálni — a jelen finding kizárólag a chip TARTALMÁRA vonatkozik,
  amit a kód közvetlenül megerősít, függetlenül a jelöltek számától.
- **Orvosi elvárás:** A jelölt-chipen már ránézésre lássak elég
  megkülönböztető adatot (pl. születési dátum) a gyors döntéshez, anélkül
  hogy külön lapon kellene ellenőriznem.
- **Tapasztalt probléma:** A chip csak azt mondja meg, MELYIK mező
  egyezik/tér el minőségileg, magát az értéket nem.
- **Napi hatás:** Több hasonló nevű jelöltnél (pl. apa és fia azonos
  névvel) a doki nem tudna a chip alapján gyorsan dönteni, külön kellene
  ellenőriznie a Pácienslistán.
- **Jelenlegi kerülőút:** A Pácienslista külön megnyitása a
  megkülönböztető adatok megtekintéséhez.
- **Javasolt javítási irány:** A chip szövegébe a minőségi leírás mellé
  a tényleges születési dátum (és esetleg a telefonszám utolsó
  számjegyei) is bekerülhetne, pl. "Nagy Éva (1990.11.02., azonos név)".
- **Siker mércéje:** A doki a chip szövege alapján, külön kattintás
  nélkül el tudja dönteni, hogy a talált jelölt valóban a keresett
  személy-e.

### Kapcsolódó, korábban már jelzett tétel

A "Kovács János" véglegesített v1 tervénél a "Mentett PDF" szekció "Ehhez
a verzióhoz nincs mentett PDF." üzenetet adott — ez ugyanaz a jelenség,
amit a `2026-09-01-doctor-review-visszatero-paciens.md` jelentés 2.
megállapítása már részletesen dokumentált (seed-eredetű tervekhez nincs
mentett PDF-blob, a hibaüzenet nem különbözteti meg a demó-korlátot egy
valódi hibától). **Dedup: MÁR JELZETT
(`2026-09-01-doctor-review-visszatero-paciens.md`)** — itt csak
megerősítésként szerepel, harmadik érintett páciensnél (Nagy Éva, Kovács
János után).

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- A `/uj-terv` köztes választón a duplikáció-védelem MINDKÉT rétege (élő
  jelzés gépelés közben + explicit "Mégis új páciens létrehozása?"
  megerősítés mentéskor) jól működik, de csak akkor derül ki, hogy létezik,
  ha a doki ténylegesen egy meglévő névvel próbálkozik — a funkció maga
  nem hirdeti magát előre, ami rendben is van (nem kell reklámozni egy
  védőhálót), de érdemes megjegyezni, hogy egy doki, aki még sosem
  futott bele hasonló névbe, nem tudja előre, hogy ez a védelem létezik.

## 4. Fejlesztési lehetőségek

1. **Bizalom-növelés** — a "Piszkozat folytatása" kártya csak tényleges
   szerkesztés után jelenjen meg, ne már a puszta páciensválasztás
   pillanatában (1. megállapítás).
2. **Gyors UX-javítás** — a terv-lánc listán egy apró jelzés a
   törzsadat-eltérésről, a meglévő `masterSnapshotDiff()` felhasználásával
   (2. megállapítás).
3. **Gyors UX-javítás** — a duplikáció-jelölt chip szövegébe a tényleges
   megkülönböztető adat (születési dátum) bekerülése (3. megállapítás).
4. **Munkafolyamat-rövidítés** — a `/uj-terv` oldalon a vizuális
   hangsúly (fekete, elsődleges "+ Új páciens" gomb a halványabb
   kereső/lista fölött) átgondolása, hogy a duplikáció-megelőzés
   szempontjából fontosabb "Meglévő páciens keresése" út ne tűnjön
   másodlagosnak — bár ez inkább finomhangolás, mert a tényleges
   duplikáció-védelem így is működik, ha a doki mégis az Új páciens utat
   választja.

## 5. Ami jól működik

- A duplikáció-felismerés két lépcsőben is helyesen működik: élő,
  finomodó jelzés gépelés közben ("azonos név" → "azonos név, eltérő
  telefon"), majd egy explicit, jól megfogalmazott megerősítő dialógus
  mentéskor, ha a doki mégis új rekordot hozna létre.
- A meglévő páciens kiválasztása után a Terv adatai lap minden mezőt
  helyesen előretölt, "A törzsadat és a terv adatai megegyeznek"
  megnyugtató visszajelzéssel.
- A `PatientEditorPanel` Mentés gombja csak tényleges változásnál
  aktiválódik — nincs felesleges "üres" mentés kockázata.
- A verzió-részletoldal "Páciens adatai a véglegesítéskor" blokkja
  kifejezetten jól sikerült: pontos, mezőszintű összevetés (Törzsadat vs.
  A terv adata), világos magyarázat arról, miért nem módosul
  visszamenőleg a véglegesített dokumentum, és egy közvetlen link a
  jelenlegi törzsadathoz — tudatosan NINCS "frissítsd a tervet" gomb,
  ami helyes, mert egy véglegesített dokumentumot nem kellene
  visszamenőleg módosítani lehessen.
- A "Piszkozat elvetése" gomb jól látható, egyértelmű felirattal és
  explicit megerősítéssel védett (a hozzá tartozó szöveg súlyozása a
  tartalom mennyiségétől függetlenül konzisztens — lásd 1. megállapítás
  a hátrányáról is).

## 6. Következő validációs kérdések

1. Milyen gyakran fordul elő a rendelőben ténylegesen azonos vagy nagyon
   hasonló nevű páciens (szülő-gyerek, testvérek, gyakori vezetéknév)?
2. Ha a doki csak "ránéz" egy páciens adatlapjára (megerősíti, hogy ő az),
   de nem dolgozik rajta, elvárja-e, hogy ez a Kezdőlapon "folytatható
   munkaként" jelenjen meg, vagy inkább zavarónak találná?
3. Mennyire fontos a dokinak, hogy egy régebbi (nem legutóbbi) verziójú
   terv-lánc listáján már a lista szintjén lássa, ha a kontaktadat
   elavult, vagy elegendő, hogy csak a részletoldalon derül ki?
4. Van-e valós tapasztalat arra, hogy egy elavult telefonszámmal/címmel
   ellátott, korábban véglegesített terv alapján próbáltak megkeresni egy
   pácienst, és ez okozott-e már gyakorlati problémát?
5. A duplikáció-jelölt chipen elegendő-e a doki számára a jelenlegi
   minőségi leírás ("azonos név, eltérő telefon"), vagy ténylegesen
   hiányolná a konkrét adatot (dátum/telefonszám) a döntéshez?

---

*Ez a jelentés átmeneti munkatermék. A valódi találatok a
`backlog/BACKLOG.md`-be vándorlása után törölhető.*
