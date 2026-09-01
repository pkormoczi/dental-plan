# Orvosi felhasználó-szimuláció — jelentés

```
Dátum: 2026-08-25
Forgatókönyv: uj-terv — Nagy Éva új, többfázisú kezelési terve, keresővel + fogtérképpel, egyedi kezeléssel, javítással és fázis-átrendezéssel
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 5 (több fázis, több sor), 6 (kereső + fogtérkép), 7 (egyedi kezelés), 8 (fogak/mennyiség/ár/kedvezmény/leírás/becsült ár), 9 (javítás, törlés, visszavonás, átrendezés)
Bizonyosság-eloszlás: megfigyelt 6 / erős következtetés 0 / feltételezés 0
```

## 1. Napi munkamenet összefoglalója

A persona a Kezdőlapról indulva kereste meg Nagy Évát (nem volt a "Legutóbbi páciensek" között, a Páciensek menüre kellett váltania), majd egy háromfázisú tervet épített fel: keresővel felvitt tömést és cirkonkoronát, fogtérképről kiválasztott fogszámmal, egy árlistán kívüli egyedi kezeléssel ("Otthoni fluoridkezelő kit"), egy szándékosan elrontott majd javított fogszámmal, és a fázisok átrendezésével. A menet nagy része gyors és zökkenőmentes volt — a kulcs-billentyűzetes ciklus (gépel → nyíl → Enter → kereső ürül és visszakapja a fókuszt) kifogástalanul működött, az autosave azonnal jelzett, a törzsadat-előtöltés és annak "megegyeznek" jelzése bizalmat épített. A lendület két helyen tört meg: egyszer egy hamis nulla találatnál a kereső ben (a "fogkő" mint kategórianév nem található meg tétel-szinten), egyszer pedig a fogtérkép-választó billentyűzetes navigációjánál, ahol a fókuszban lévő fog nem volt megbízhatóan megkülönböztethető. A tervet nem véglegesítette — erre nem volt utasítás, és a piszkozat-mentés jelzése alapján biztos volt benne, hogy semmi nem vész el.

## 2. Legfontosabb megállapítások

### 1. A kereső nem talál rá a kategórianévre, csak a tétel nevére

- Súlyosság: **magas**
- Gyakoriság: **valószínűleg gyakori**
- Érintett folyamat: 6 (kereső + fogtérkép)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: Nagy Éva tervének Kezelések lépésén a persona a "fogkő" szóra keresett (Fogkőeltávolítás — ez a kategória neve, és ez a szó szerepel Nagy Éva egyik korábbi tervének címeként is, amit a persona a páciens-oldalon látott). A keresés nulla találatot adott, csak az "Egyedi tétel felvétele" opció maradt. Az Árlista oldalon derült ki, hogy "Fogkőeltávolítás" valójában kategórianév, a két alatta lévő tétel más nevet visel ("Komplett kezelés: ultrahang, sófúvás...", "Ismételt kezelés 3-6 havonta"). Kód-szinten megerősítve: `app/src/pages/planEditor/ItemPicker.tsx:95` kizárólag `nevEgyezik(x.nev, nq)`-t hív, ami `app/src/domain/search.ts:30-31` szerint csak a tétel saját nevét (`nev.hu`/`nev.de`) nézi, a kategórianevet sosem.
- Orvosi elvárás: amire emlékszem (jellemzően a kezelés köznyelvi/kategória-szintű neve), arra rákeresve találatot kapok, vagy legalább utalást, hogy hol keressem.
- Tapasztalt probléma: nulla találat, mintha a kezelés nem is létezne az árlistában — miközben a rendszer maga is ezt a kategórianevet használja terv-cím javaslatként.
- Napi hatás: könnyen vezet felesleges, kézzel árazott egyedi sorhoz egy ténylegesen karbantartott árlistai tétel helyett — ez pénzügyi pontossági kockázat (elavult vagy inkonzisztens ár kerülhet a nyomtatványra egy olyan tételnél, aminek van hivatalos ára).
- Jelenlegi kerülőút: átváltás az Árlista oldalra, ott keresni meg a pontos tételnevet, majd visszatérni és azt begépelni.
- Javasolt javítási irány: a kereső terjedjen ki a kategórianévre is, VAGY nulla találat esetén jelenjen meg egy utalás ("Ezt keresed? [Kategórianév] alatt N tétel") — egyik sem igényel új funkciót, csak a meglévő `nevEgyezik` hívás bővítését/egy kiegészítő üzenetet.
- Siker mércéje: egy kategórianévre rákeresve a doki vagy közvetlen találatot kap, vagy egyértelmű utalást a helyes tételnevekre — nem üres listát.

### 2. A fogtérkép-választó billentyűzetes fókusza nem elég kontrasztos

- Súlyosság: **közepes**
- Gyakoriság: **naponta többször** (minden fogtérképről történő fogválasztásnál)
- Érintett folyamat: 6 (fogtérképről felvitel)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: a "Fogak kijelölése a fogtérképen" popover megnyitása után Tab, majd nyílbillentyű lenyomására a persona nem látott egyértelmű vizuális jelzést arról, melyik fogon áll a kurzor, mielőtt Entert nyomott volna. Saját reprodukcióval (Tab + `ArrowRight`, két egymást követő képernyőkép) megerősítve: vizuálisan nem volt észlelhető változás. Kód-szinten ellenőrizve: a mechanizmus valóban létezik (`app/src/design/toothChartSvg.ts:56`, `.tooth.is-active .tooth-fill{stroke:#2D2D2D;stroke-width:3;stroke-dasharray:4 3;paint-order:stroke}`, `aria-activedescendant` a wrapperen) — élesben tesztelve a fókuszban lévő fog computed style-ja tényleg `stroke: rgb(45,45,45)`, `stroke-width: 3px`, szaggatott. A probléma nem a mechanizmus hiánya, hanem a kontrasztja: egy 3px vékony, szaggatott, sötétszürke vonal egy amúgy is fekete vonalrajzú, kis méretű fog-ikonon — főleg ha a fog már színezett (van rajta kezelés) — vizuálisan alig különül el.
- Orvosi elvárás: billentyűzettel navigálva egyértelműen lássam, melyik fog van kijelölve, mielőtt megerősítem.
- Tapasztalt probléma: a fókuszjelzés túl halvány ahhoz, hogy gyors, magabiztos billentyűzetes navigációt tegyen lehetővé.
- Napi hatás: alacsony-közepes önmagában (a legtöbb orvos valószínűleg egérrel kattint közvetlenül a fogra), de billentyűzet-központú munkamenetnél (lásd CLAUDE.md "A UX kritikus pontja") ez pont az az eszköz, ahol megbicsaklik a folyamat.
- Jelenlegi kerülőút: egérrel közvetlenül a fogra kattintani, elkerülve a billentyűzetes navigációt.
- Javasolt javítási irány: a fókusz-stroke kontrasztjának/vastagságának növelése, vagy egy kiegészítő jelzés (pl. világos glow/háttérkör) a fog körül, ami sötét vonalrajz és sötét kezelés-szín mellett is látszik.
- Siker mércéje: Tab/nyílbillentyű után egy pillantásra egyértelmű, melyik fog van fókuszban, screenshot-összehasonlítással is látható különbséggel.

### 3. Egyedi sor árának begépelésekor átmeneti, zavaró állapot látszik

- Súlyosság: **alacsony**
- Gyakoriság: **naponta**
- Érintett folyamat: 7 (egyedi kezelés ára), 8 (ár megadása)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: az "Otthoni fluoridkezelő kit" egyedi sor Ajánlati ár mezőjébe "8000"-et gépelve a mező egy pillanatra "08000"-et mutatott, az Összeg oszlop pedig "0 Ft" maradt, amíg a mező el nem vesztette a fókuszt (Tab). Kód-szinten megerősítve: `app/src/components/NumberField.tsx` a piszkozatot (`draft`) nyers szövegként tartja, `onCommit` csak blur/Enter-re fut (`commit()`, 102-115. sor) — ez szándékos (a fájl fejléc-kommentje szerint korábbi review-találatok miatt vezették be: minden leütésre azonnali írás volt a hiba, nem ennek hiánya), de az Összeg oszlop (külön cella, nem a `NumberField` maga) csak a commitra frissül, nem a `onDraftChange` élő piszkozatra.
- Orvosi elvárás: amit begépelek, azt lássam vissza helyesen, és az összeg kövesse gépelés közben is.
- Tapasztalt probléma: vezető nulla és be nem frissülő összeg egy rövid, de látható időre.
- Napi hatás: alacsony (a végállapot helyes, csak az átmenet zavaró), de egy gyors gépelés-tovább mozdulat közben megzavarhatja a dokit, hogy tényleg jól gépelt-e be valamit.
- Jelenlegi kerülőút: várni a mező elhagyásáig, mielőtt az összegre néz.
- Javasolt javítási irány: az Összeg oszlop kövesse az `onDraftChange` élő piszkozatot is, ne csak a committált értéket.
- Siker mércéje: gépelés közben az Összeg oszlop azonnal, vezető nulla nélkül mutatja a várható értéket.

### 4. A "Fog" mező placeholder-je valós fogszám-formátumú, összetéveszthető adattal

- Súlyosság: **alacsony**
- Gyakoriság: **naponta többször**
- Érintett folyamat: 6, 8 (fogak megadása)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: minden új sor "Fog" mezőjében "16, 17, 26" szöveg látszik, amíg a doki be nem ír valamit. Kód-szinten megerősítve (`app/src/pages/planEditor/LineRow.tsx:265`, `placeholder="16, 17, 26"`) — ez egy valódi HTML `placeholder`, szürke színnel megkülönböztetve a tényleges (fekete) értéktől. A persona az első pillantásra bizonytalan volt, hogy ez tényleges adat-e, majd a szín alapján tisztázta.
- Orvosi elvárás: egyértelműen lássam, hogy egy mező üres és formátumpélda van benne, ne kelljen a színt külön értelmeznem.
- Tapasztalt probléma: a placeholder valós FDI-fogszámokat mutat, ami tartalmilag is hihető adatnak tűnhet egy sietős pillantásra.
- Napi hatás: alacsony — a szürke szín ma is megkülönbözteti, ez inkább elsőre-zavaró, mint ténylegesen hibalehetőség.
- Jelenlegi kerülőút: nincs rá szükség, a szín alapján gyorsan tisztázódik.
- Javasolt javítási irány: a placeholder szövege kapjon egy "pl." előtagot ("pl. 16, 17, 26"), hogy szó szinten is egyértelmű legyen a formátumpélda-jelleg.
- Siker mércéje: egy üres Fog mezőre nézve elsőre, szín nélkül is világos, hogy nincs benne tényleges adat.

### 5. A Kezdőlap "Legutóbbi páciensek" listája nem tartalmaz keresőt

- Súlyosság: **alacsony** (ma), **figyelendő** (páciensszám növekedésével)
- Gyakoriság: **naponta**
- Érintett folyamat: 4 (meglévő páciens keresése)
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: reset utáni Kezdőlapon 5 páciens látszott (Kiss Márta, Gál Hanna, Kovács János, Szabó Anna, Horváth Péter) — Nagy Éva nem volt köztük, és a Kezdőlapon nincs kereső mező, csak a "+ Új kezelési terv" gomb. A Páciensek menüpontra kellett váltani.
- Orvosi elvárás: ha egy visszatérő páciens nincs a "legutóbbi" listában, gyorsan rákereshessek anélkül, hogy menüt váltanék.
- Tapasztalt probléma: extra képernyőváltás egy gyakori művelethez.
- Napi hatás: ma (23 demó-páciens, 5 elemes lista) elhanyagolható; egy éles, több száz pácienses rendelőben ez naponta többszöri felesleges kattintássá válhat.
- Jelenlegi kerülőút: Páciensek menüpont, ott a kereső.
- Javasolt javítási irány: a Kezdőlapra egy kis kereső mező vagy egy "Páciens keresése" gyorsgomb — nem feltétlenül a teljes lista duplikálása.
- Siker mércéje: egy visszatérő páciens neve begépelhető a Kezdőlapon anélkül, hogy előbb menüt váltana.

### 6. Az Előnézet második oldala szinte üres a hiányzó Garancia szakasz miatt

- Súlyosság: **közepes**
- Gyakoriság: **minden tervnél**, amíg a garancia-szöveg placeholder marad
- Érintett folyamat: 11, 14 (előnézet, figyelmeztetések)
- Bizonyosság: **megfigyelt**
- Dedup: **RÉSZBEN MÁR TERVEZETT** (a `backlog/BACKLOG.md` 24. tétele már tartalmazza a garancia-szöveg hiányát mint elvégzendő adattisztítási feladatot; az itt leírt vizuális következmény — egy majdnem üres nyomtatvány-oldal — új megfigyelés)
- Helyzet és reprodukció: az Előnézet lépésen egy sárga, puha figyelmeztetés jelent meg ("A szakasz szövege hiányzik, vagy még jogi lektorálásra vár... Kimaradó szakaszok (1): Garancia", "Beállítások" gombbal). A generált PDF 4 oldalas, ebből a 2. oldal szinte teljesen üres (csak az érvényességi dátum és egy anyagköltség-megjegyzés van rajta) — a Garancia szakasz hiánya miatt marad ott ez az üres tér.
- Orvosi elvárás: a figyelmeztetést értem és el tudom fogadni (ez explicit, jogi okból kényszerített védelem, nem hiba) — de a végeredmény PDF ne nézzen ki hiányosnak/befejezetlennek, ha egyszer kiadnám a páciensnek.
- Tapasztalt probléma: egy csaknem üres oldal a dokumentum közepén nem kelt professzionális benyomást.
- Napi hatás: közepes — amíg a garancia-szöveg (backlog 24. tétel) nincs feltöltve, minden egyes kiadott terv PDF-je ezt az esztétikai törést hordozza.
- Jelenlegi kerülőút: nincs — a doki tudja, hogy a szöveget be kell majd írnia (Beállítások → Nyomtatvány szövegei).
- Javasolt javítási irány: ez elsősorban tartalmi feladat (backlog 24. tétel); ha a szöveg pótlása után is maradna hasonló, kevés tartalmú oldal más hiányzó szakasznál, érdemes megfontolni az oldaltördelés összevonását, hogy ne maradjon önmagában majdnem üres oldal.
- Siker mércéje: a garancia-szöveg pótlása után a PDF nem tartalmaz feltűnően üres oldalt.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- Az "Érintett fogak" összesítő nézet (fázisok fölötti gomb) alatt egy "Új sor ide" legördülő is található, ami feltehetően a fogtérképről közvetlenül, egy kiválasztott fázisba enged sort felvenni. A persona észrevette a nézetet (és hasznosnak találta hibajavítás utáni vizuális ellenőrzésre), de magát ezt a legördülőt nem próbálta ki — nem egyértelmű, mennyire nyilvánvaló egy first-time használónak, hogy ez egy alternatív sor-felviteli út, nem csak egy összesítő.
- Az egyedi sor felvétele (kereső 0 találatánál felkínált "Egyedi tétel felvétele" opció) jól működik önmagában, de — lásd 1. megállapítás — pont azokban az esetekben aktiválódik tévesen, amikor egy valós árlistai tételt kellene megtalálni kategórianév alapján. A funkció felfedezhetősége nem probléma, a kiváltó feltétel (hamis nulla találat) az.

## 4. Fejlesztési lehetőségek

1. **Gyors UX-javítás** — a kereső terjedjen ki a kategórianévre is, vagy adjon utalást nulla találatnál (1. megállapítás). Megoldja a legmagasabb súlyosságú, kódból is egyértelműen azonosított találatot, kis terjedelmű változtatással.
2. **Bizalom-növelés** — a fogtérkép-választó billentyűzetes fókuszjelzőjének kontrasztnövelése (2. megállapítás). A mechanizmus már létezik, csak vizuálisan nem elég erős — alacsony kockázatú, célzott CSS-módosítás.
3. **Gyors UX-javítás** — az Összeg oszlop élő frissítése gépelés közben (3. megállapítás), a meglévő `onDraftChange` csatorna bekötésével.
4. **Gyors UX-javítás** — a "Fog" mező placeholderének "pl." előtaggal való egyértelműsítése (4. megállapítás).
5. **További kutatást igénylő kérdés** — megéri-e már most keresőt tenni a Kezdőlapra, vagy ez csak a páciensszám növekedésével válik fájdalmassá (5. megállapítás)? Érdemes a dokival tisztázni, mekkora páciensállományra számít éles használatban.

## 5. Ami jól működik

- A fő billentyűzetes tételfelviteli ciklus (gépel → nyíl → Enter → kereső ürül és visszakapja a fókuszt) zökkenőmentesen, megbízhatóan működött háromszor is, különböző kereséseknél.
- Az autosave azonnal, félreérthetetlenül jelzett ("Piszkozat mentve" a Kezelések lépés megnyitásakor rögtön), ami bizalmat ad, hogy két páciens közti megszakítás esetén sem vész el a munka.
- A "Terv adatai" lépés előre tölti a törzsadatból a mezőket, és explicit jelzi, ha a törzsadat és a terv adatai megegyeznek — ez konkrétan megnyugtató, nem kell külön ellenőrizni egy esetleges eltérést.
- Az "Érintett fogak" összesítő nézet gyors, hasznos vizuális ellenőrzést adott egy hibás fogszám javítása után — egy pillantással látszott, hogy tényleg a jó fogakon áll minden.
- A fázisok átrendezése (fel/le gomb) azonnali és megbízható volt, a fázison belüli sorok tartalma érintetlen maradt.
- A hiányzó Garancia szakasz figyelmeztetése az Előnézeten egyértelmű, informatív, nem blokkoló, és közvetlenül mutat megoldást ("Beállítások" gomb) — ez a fajta puha, cselekvésre buzdító figyelmeztetés jó minta.

## 6. Következő validációs kérdések

1. Mesélje el, legutóbb hogyan kereste meg egy régóta nem járt páciens tervét — a kategórianévre vagy a konkrét tétel nevére emlékezett-e inkább?
2. Használja-e ténylegesen a fogtérképes fogválasztást billentyűzettel, vagy mindig egérrel kattint közvetlenül a fogra?
3. Mennyire zavarja, ha egy árat gépelés közben átmenetileg furcsán lát (pl. vezető nulla)?
4. Szokott-e egyedi (árlistán kívüli) sort felvenni azért, mert nem találta meg a keresett kezelést, pedig az valójában szerepel az árlistában más néven vagy kategórianév alatt?
5. Hány pácienst tart jelenleg számon, és a "Legutóbbi páciensek" 5 tételes listája elég-e a mindennapi kereséshez, vagy inkább mindig a Páciensek oldalra megy?
6. Használta-e már az "Érintett fogak" összesítő nézet "Új sor ide" funkcióját? Ha igen, hogyan találta meg?
7. Amikor egy sárga (puha) figyelmeztetést lát az Előnézeten egy hiányzó szakaszról, hogyan dönt: azonnal javítja, vagy folytatja és később pótolja?
8. Mennyire fontos önnek, hogy a fázisok sorrendjét menet közben átrendezhesse, és milyen gyakran teszi ezt?
9. Amikor egy tervet több fázisra bont, mi alapján dönti el a fázisok elnevezését — mindig átírja a generált nevet, vagy gyakran meghagyja?
10. Ha egy kezelést rossz fogra vitt fel véletlenül, hogyan javítja most (a mező közvetlen átírásával, vagy törli és újra felviszi a sort)?
