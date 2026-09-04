# Orvosi felhasználó-szimuláció — jelentés

```
Dátum: 2026-09-05
Forgatókönyv: nemet-euro — Horváth Péter (külföldi páciens) új tervén nyelv-/pénznemváltás, előleg és egyedi végösszeg
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 10 (nyelv/pénznem módosítás megkezdett tervnél — orvos/dátum módosítás ebben a menetben nem került tesztelésre), 12 (magyar/német, forint/euró terv), 13 (előleg és egyedi végösszeg)
Bizonyosség-eloszlás: megfigyelt 6 / erős következtetés 0 / feltételezés 1
```

## 1. Napi munkamenet összefoglalója

A persona Horváth Péternél (meglévő, két verziós német/eurós terv-lánccal rendelkező páciens) egy vadonatúj terv-láncot indított, és menet közben fedezte fel, hogy a nyelv/pénznem már eleve Deutsch/EUR-ra volt állítva — a legutóbbi véglegesített terv öröklődött, annak ellenére, hogy ez egy teljesen új lánc. Tudatosan visszaváltott Magyar/HUF-ra, felvitt két tételt kereséssel, majd váltott vissza németre/euróra — mindkét váltás informatív, élő számlálású megerősítő dialógust adott, és a tétel-felviteli billentyűzetes ciklus kifogástalanul működött. A menet két külön ponton akadt el: a "Terv adatai" lap minden egyes elhagyásakor újra felugrott egy törzsadat-létrehozási dialógus, annak ellenére, hogy a doki már kétszer kihagyta; és az Előnézeten két, egymásnak ellentmondó figyelmeztetés jelent meg ugyanarra a hiányzó Garancia szakaszra. Az előleg és az egyedi végösszeg számítása, valamint az előleg-túllépés elleni védelem menet közben megbízhatóan, megnyugtatóan működött. A fő ügynök mind a négy érdemi megállapítást önállóan, élőben is reprodukálta és forráskódból is megerősítette.

## 2. Legfontosabb megállapítások

### 1. A "Törzsadat létrehozása" dialógus minden lépés-elhagyáskor újra felugrik, a korábbi "Kihagyás" ellenére is

- Súlyosság: **közepes**
- Gyakoriság: **gyakori** — minden törzsadat nélküli páciensnél (pl. minden csak quick-create-tel felvitt vagy csak korábbi terv-pillanatképéből ismert páciens), minden alkalommal, amikor a doki a "Terv adatai" lépést elhagyja, majd oda visszatér és megint elhagyja
- Érintett folyamat: 10, 21 (oda-vissza navigáció ellenőrzés közben)
- Bizonyosság: **megfigyelt** — a persona háromszor futott bele; a fő ügynök önállóan, egy friss menetben kétszer egymás után reprodukálta (első "Kihagyás" után a "Kezelések" lapra lépve, majd vissza a "Terv adatai"-ra és megint a "Kezelésekre" lépve a dialógus változatlanul újra megjelent)
- Dedup: **ÚJ**
- Helyzet és reprodukció: Horváth Péter új tervén a "Terv adatai" lap alján a "Páciens törzsadata" szekció — mivel ennek a páciensnek nincs önálló törzsadata — egy "Törzsadat létrehozása a terv adataiból" gombot és egy hozzá tartozó lépés-elhagyási `AlertDialog`-ot ("Törzsadat létrehozása") ad. A "Kihagyás, tovább lépek" gombra kattintva a navigáció folytatódik, de a doki döntése nem marad meg: a "Kezelések" és "Terv adatai" lap közötti oda-vissza navigáció (egy teljesen normális, gyakori minta — a doki menet közben akarja ellenőrizni egy módosítás hatását) minden egyes "Terv adatai" lap-elhagyáskor újra felugrasztja ugyanazt a dialógust. Kód-szinten megerősítve: `app/src/pages/patientPage/TorzsadatSyncCard.tsx` `handleLepesElhagyas()` (177–197. sor) két ágra bomlik — a `torzsadat === null` ("nincs önálló törzsadat") ág mindig felugrasztja a `letrehozasPromptOpen`-t, MINDEN meghívásnál, míg a testvér, `utkozesek`-alapú diff-prompt ág egy `elutasitottDiffId` mezővel (a `LepesGuardContext`-ben) emlékszik az utoljára elutasított eltérésre, és attól kezdve nem kérdez újra ugyanarra. A `skipLetrehozasPrompt()` (149–154. sor) nem ír semmilyen "ezt már eldöntöttem ezen a piszkozaton" jelzőt — a memória-mechanizmus a diff-ágon létezik, a létrehozás-ágon nem.
- Orvosi elvárás: ha egyszer, ezen a piszkozaton belül már jeleztem, hogy nem akarok most törzsadatot létrehozni, ez a döntésem maradjon érvényben, amíg a piszkozat él.
- Tapasztalt probléma: a dialógus minden egyes lépés-váltásnál újra felteszi ugyanazt a kérdést, amit a doki már megválaszolt.
- Napi hatás: két páciens között, egy gyors ellenőrzési oda-vissza navigációnál (nyelv/pénznem/ár hatásának menet közbeni megnézése) minden egyes alkalommal egy plusz, felesleges kattintást igényel — ez összeadódik egy zsúfolt napon.
- Jelenlegi kerülőút: minden alkalommal végigkattintani a "Kihagyás, tovább lépek"-et.
- Javasolt javítási irány: a `handleLepesElhagyas()` `torzsadat === null` ága is kapjon egy, a piszkozat élettartamára szóló "már eldöntöttem" jelzőt (hasonló elven, mint az `elutasitottDiffId`), hogy egy már kihagyott törzsadat-létrehozási ajánlat ne térjen vissza ugyanazon a piszkozaton belül.
- Siker mércéje: egy már egyszer kihagyott törzsadat-létrehozási ajánlat nem jelenik meg újra ugyanazon a piszkozaton belül, amíg a doki explicit nem hoz létre törzsadatot vagy nem indít új tervet.

### 2. A "sablon nem érhető el a megfelelő nyelven — helyette a magyar szöveg jelenik meg" checklist-üzenet hamis, ha a magyar tartalék maga is placeholder

- Súlyosság: **közepes-magas** (megtévesztő tartalmi állítás egy jogilag releváns dokumentum-szakaszról, nem csupán esztétikai probléma)
- Gyakoriság: **minden nem-magyar tervnél**, amíg legalább egy sablon (ma: a Garancia) mindkét nyelven placeholder marad
- Érintett folyamat: 10, 12, 14 (előnézet, figyelmeztetések)
- Bizonyosság: **megfigyelt** — a fő ügynök élőben, önállóan reprodukálta: az Előnézeten egyszerre jelent meg a "Kimaradó szakaszok: Garancia" ÉS a "helyette a magyar szöveg jelenik meg" üzenet, majd a ténylegesen generált 3 oldalas német PDF mindhárom oldalán (fejléc, kezelési táblázat, "Zahlungsbedingungen") nem volt egyetlen magyar szó sem, és Garancia szakasz sehol nem szerepelt — sem németül, sem magyarul
- Dedup: **ÚJ**, kapcsolódik a `backlog/BACKLOG.md` 24. tételéhez (a Garancia magyar forrásszövege ma is `[PLACEHOLDER — a garanciafeltételek még nincsenek megadva]`, ez az elsődleges ok, amiért a jelenség egyáltalán előfordulhat) és a `2026-08-25-doctor-review-uj-terv.md` 6. megállapításához (a Garancia hiánya miatt üresen maradó PDF-oldal) — de ez a konkrét megfigyelés egy ÚJ, önálló hiba: a checklist-ÜZENET SZÖVEGE állít valótlant, nem az oldal-elrendezés
- Helyzet és reprodukció: `app/src/pages/PreviewPage.tsx` `loadOrFallback()` (145–171. sor) a `garancia-de` sablont betölti, észreveszi, hogy placeholder (`isPlaceholderTemplate`), és lefut a `garancia-hu` tartalékra — ekkor `fellback: true`-t állít be, FÜGGETLENÜL attól, hogy maga a `garancia-hu` tartalom használható-e. A `garancia-hu` szintén placeholder, ezért a végső, ténylegesen renderelt `garanciaMd` a `sablonNyomtathato()` szerint továbbra sem nyomtatható — a `kihagyottSablonSzekciok` (242–244. sor) emiatt helyesen "Garancia"-t ad, ez okozza az (1) figyelmeztetést. Ezzel PÁRHUZAMOSAN a `sablonFallback` állapot (200. sor: `nyil.fellback || fiz.fellback || gar.fellback`) is igaz marad pusztán attól, hogy a HU-ágra esett a betöltés — így a `domain/veglegesitesOr.ts` `sablon-fallback` tétele (262–271. sor) is megjelenik, holott a végeredmény PDF-en SEMMILYEN magyar szöveg nem jelenik meg ebből a szakaszból, mert az egyszerűen kimarad. A két üzenet ugyanarra a ténybeli helyzetre (a Garancia mindkét nyelven hiányzik) két, egymásnak ellentmondó okot ad.
- Orvosi elvárás: ha egy figyelmeztetés azt állítja, hogy "magyar szöveg jelenik meg a nyomtatványon", ez a tény a ténylegesen generált PDF-ben ellenőrizhető legyen — ne kelljen az egész dokumentumot átnéznem, hogy megbizonyosodjam, valóban van-e benne magyar folt.
- Tapasztalt probléma: a doki két egymásnak ellentmondó üzenetet lát ugyanarra a hiányra, és az egyik ténylegesen valótlan állítást tesz a kiadandó dokumentumról.
- Napi hatás: egy időhiányos dokit felesleges, aggódó PDF-átvizsgálásra késztethet ("hol van az a magyar rész?"), miközben a valódi probléma (a Garancia szöveg még nincs megírva) egyébként is jelezve van a másik, pontos üzenetben.
- Jelenlegi kerülőút: mindkét PDF-nyelvi sablont kézzel ellenőrizni a Beállításokban, hogy kiderüljön, tényleg nincs-e magyar szöveg a PDF-en.
- Javasolt javítási irány: a `loadOrFallback()` a HU-tartalékra eséskor is nézze meg, hogy az maga placeholder-e — ha igen, ne jelezze `fellback: true`-t (hiszen a szakasz úgyis kimarad, ezt már az (1) üzenet lefedi), csak akkor jelezzen `sablon-fallback`-ot, ha a HU-tartalék ténylegesen renderelődő, használható szöveg.
- Siker mércéje: egy mindkét nyelven placeholder sablonnál kizárólag a "kimarad a nyomtatványból" üzenet jelenik meg, a "helyette magyar szöveg jelenik meg" üzenet csak akkor, ha ez ténylegesen igaz.

### 3. A nyelv- és pénznemváltás megerősítő dialógusa vizuálisan inkonzisztens: az egyik piros, a másik semleges, pedig mindkettő ugyanolyan típusú, nem-destruktív hatású

- Súlyosság: **alacsony-közepes**
- Gyakoriság: **naponta**, minden nyelv/pénznemváltásnál egy már tételekkel rendelkező tervben
- Érintett folyamat: 10, 12
- Bizonyosság: **megfigyelt**
- Dedup: **ÚJ** (rokon mintázat a `2026-08-25-doctor-review-veglegesites.md` 2. megállapításával — ott egy tooltip szövege volt feleslegesen ijesztő egy biztonságos művelethez, itt egy gomb SZÍNE)
- Helyzet és reprodukció: `app/src/pages/PatientPage.tsx` 521. sorában a megerősítő `AlertDialog` "Folytatás" gombja `color={pending?.kind === 'nyelv' ? 'red' : undefined}` — kizárólag a nyelvváltásnál kap explicit piros színt, a pénznemváltásnál (ugyanaz a komponens, ugyanaz a dialógus-váz) a gomb az alapértelmezett (semleges/márka) színt kapja. Mindkét művelet funkcionálisan azonos jellegű: egy már meglévő sor-tartalom NEM törlődik, csak a nevek (nyelvnél) vagy az árak (pénznemnél) frissülnek az árlistából, a `applyNyelv()`/`applyPenznem()` (141–186. sor) egyike sem távolít el adatot. A persona emiatt a nyelvváltásnál óvatosabb volt, mint a pénznemváltásnál, holott a kockázatuk azonos nagyságrendű.
- Orvosi elvárás: ha két, funkcionálisan azonos típusú (nem-destruktív, informatív) megerősítés jelenik meg egymás után egy munkafolyamatban, a vizuális súlyuk is egyezzen — vagy mindkettő semleges, vagy mindkettő ugyanúgy kiemelt.
- Tapasztalt probléma: a piros szín itt nem hordoz valódi extra kockázatot, csak vizuális inkonzisztenciát a testvér-műveletéhez képest.
- Napi hatás: alacsony önmagában, de a "piros = veszélyes" konvenció felesleges felhígítása hosszú távon rontja azt, hogy egy TÉNYLEG destruktív művelet piros gombja kellő súlyt kapjon.
- Jelenlegi kerülőút: nincs, a doki egyszerűen óvatosabban kattint a nyelvváltásnál.
- Javasolt javítási irány: a `pending?.kind === 'nyelv'` feltételes piros szín eltávolítása, hacsak nincs konkrét, dokumentált ok, ami a nyelvváltást a pénznemváltásnál kockázatosabbnak minősítené — ha van ilyen ok, az fordítva, a pénznemváltás gombjának is piros színt kellene adnia.
- Siker mércéje: a két megerősítő dialógus gombszíne következetes a hordozott kockázat szerint.

### 4. Egy vadonatúj terv-lánc is átveszi a páciens legutóbbi véglegesített tervének nyelvét/pénznemét, mielőtt a doki bármit tenne

- Súlyosság: **alacsony-közepes**
- Gyakoriság: **minden alkalommal**, amikor egy már ismert, korábban más nyelven/pénznemben véglegesített tervű páciensnél a doki új terv-láncot indít
- Érintett folyamat: 10, 12
- Bizonyosság: **megfigyelt** (a fő ügynök önállóan reprodukálta: Horváth Péter "+ Új terv" gombjára kattintva a Terv adatai lap már Deutsch/EUR-ra volt állítva)
- Dedup: **ÚJ** (a dokumentáció szerint ez D52 szerint szándékos viselkedés — `state/planIndulas.ts` `ujTervForrasPaciensbol()` a legfrissebb VÉGLEGES verzió nyelvét/pénznemét örökíti egy vadonatúj láncnál is —, de a szabály szerint a szándékosság ténye nem ok a megfigyelés elhagyására)
- Helyzet és reprodukció: Horváth Péternek volt egy korábbi, véglegesített "All-on-X csomagok" (Deutsch/EUR) terv-lánca. Egy teljesen új, "Szájsebészet" nevű lánc indításakor a Terv adatai lap Nyelv/Pénznem rádiógombjai már Deutsch/EUR-ra álltak, tétel-felvitel vagy bármilyen szerkesztés előtt.
- Orvosi elvárás: egy vadonatúj terv-láncnál számítanék az alapértelmezett (pl. a rendelő globális alapbeállítása szerinti) nyelvre/pénznemre, nem feltétlenül a páciens legutóbbi tervének nyelvére — bár ha a doki mindig ugyanazon a nyelven dolgozik egy adott külföldi pácienssel, ez az öröklés praktikus lehet.
- Tapasztalt probléma: a doki első pillantásra nem feltétlenül veszi észre, hogy a nyelv/pénznem már nem az alapértelmezett — csak akkor tűnik fel, ha kifejezetten másikat szeretne, és véletlenül tovább is lép anélkül, hogy ellenőrizné.
- Napi hatás: alacsony-közepes — ha a doki nem veszi észre az öröklött nyelvet/pénznemet, és a szokásos munkamódja szerint magyarul kezdene gépelni, a tételnevek rögtön németül jelennének meg, ami zavaró lehet, amíg rá nem jön az okra.
- Jelenlegi kerülőút: a doki tudatosan ellenőrzi és szükség esetén visszaváltja a Nyelv/Pénznem mezőt, mielőtt tételt venne fel.
- Javasolt javítási irány: mivel ez dokumentált tervezési döntés (D52), nem javaslok visszabontást — de érdemes lehet egy rövid, semleges jelzést adni ("a nyelv/pénznem a legutóbbi tervedből öröklődött"), hogy a doki tudatosan észlelje, nem csak alapértelmezést lát.
- Siker mércéje: a doki egy pillantással tudja, hogy a látott nyelv/pénznem miért az, ami — öröklött érték-e, vagy a rendelő alapértelmezése.

### 5. A "Beállítások → Nyomtatvány szövegei" fül mindig Magyarra nyit, akkor is, ha egy német tervről navigáltunk oda

- Súlyosság: **alacsony**
- Gyakoriság: **minden alkalommal**, amikor a doki egy nem-magyar terv Előnézetéről a checklist "Nyomtatvány szövegei" gombjával navigál oda
- Érintett folyamat: 10, 12, 14
- Bizonyosság: **megfigyelt** (a fő ügynök élőben reprodukálta: Horváth Péter német tervének Előnézetéről a "Nyomtatvány szövegei" gombra kattintva a Beállítások Nyomtatványok fülén a Nyelv-váltó "Magyar" állásban nyitott)
- Dedup: **ÚJ**
- Helyzet és reprodukció: `app/src/pages/settings/NyomtatvanyokTab.tsx:97` `const [templateLang, setTemplateLang] = useState<Nyelv>('hu')` — a fül belső nyelv-váltója mindig `'hu'`-val inicializálódik, függetlenül attól, melyik terv kontextusából navigált oda a doki.
- Orvosi elvárás: ha egy német terv figyelmeztetése miatt navigálok a sablonokhoz, ott rögtön a német sablont lássam, ne kelljen még egy kattintást tennem.
- Tapasztalt probléma: egy plusz kattintás minden ilyen navigációnál.
- Napi hatás: alacsony — egyetlen extra kattintás, de rendszeresen ismétlődő súrlódás minden nem-magyar terv sablon-ellenőrzésénél.
- Jelenlegi kerülőút: kézzel átváltani a Deutsch fülre.
- Javasolt javítási irány: a checklist "Nyomtatvány szövegei" linkje adja át a terv aktuális nyelvét (pl. query paraméterben, a meglévő `?tab=nyomtatvanyok` mintájára), a `NyomtatvanyokTab` pedig ezzel inicializálja a `templateLang`-ot.
- Siker mércéje: egy nem-magyar terv figyelmeztetéséről navigálva a Nyomtatvány szövegei fül rögtön a terv nyelvén nyit.

### 6. Az előleg mező (EUR, centalapú) egy programozott mezőkitöltés során hibás értéket vett fel — valószínűleg automatizálási műtermék, nem alkalmazáshiba

- Súlyosság: **nem besorolható** (a gyökérok tisztázatlan)
- Gyakoriság: **feltételezés**
- Érintett folyamat: 13 (előleg)
- Bizonyosság: **feltételezés** — a persona sem tudta megbízhatóan reprodukálni kézi (karakterenkénti) begépeléssel, csak a böngésző-automatizálás programozott mezőkitöltő ("fill") hívásával
- Dedup: **ÚJ**
- Helyzet és reprodukció: a persona az Előleg mezőbe (300,00 € tartalommal) egy programozott "fill" hívással 900-at próbált beírni; a mező ehelyett "300,01"-re állt. Kód-szinten vizsgálva: `app/src/components/NumberField.tsx` `step(delta)` (121–128. sor) a `ArrowUp`/`ArrowDown` billentyűkre és a lépető nyilakra +1/–1 EGYSÉGGEL (EUR esetén 1 CENT-tel) módosítja az értéket — egy 300,00 € (30000 cent) bázisról egyetlen `step(1)` hívás pontosan 300,01 €-t (30001 cent) eredményezne. Ez erősen arra utal, hogy az automatizálási eszköz "fill" művelete ezen a mezőn valamiért egy `ArrowUp` billentyűesemény kiváltásaként értelmeződött, nem szöveg-beillesztésként — TEHÁT valószínűleg a böngésző-automatizálási réteg sajátossága, nem a `NumberField` komponens hibája. Kézi begépeléssel (kattintás + karakterenkénti gépelés) a persona helyesen 900,00 €-t kapott.
- Orvosi elvárás: n/a — ez egy tesztelési-módszertani megfigyelés, nem közvetlen orvosi tapasztalat.
- Tapasztalt probléma: n/a a valós használatban, amíg kézi begépeléssel nem reprodukálható.
- Napi hatás: valószínűleg nincs — de mivel pénzügyi mezőt érint, érdemes egy fejlesztőnek kézzel, valódi billentyűzet-eseményekkel is leellenőriznie, hogy a `NumberField` `step()` függvénye nem aktiválódik-e valamilyen véletlen, nem-nyíl billentyű-kombinációra.
- Jelenlegi kerülőút: n/a.
- Javasolt javítási irány: fejlesztői, kézi böngészős újrateszt a `NumberField`-en, hogy kizárja/megerősítse, hogy a jelenség kizárólag automatizálási műtermék.
- Siker mércéje: egy fejlesztő kézi billentyűzettel nem tudja reprodukálni a jelenséget — ha mégis tudja, ez önálló, magasabb súlyosságú tétellé válik.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- A pénznemváltás megerősítő dialógusa (`app/src/pages/PatientPage.tsx`) élő, számokkal alátámasztott hatás-előrejelzést ad ("0 sor kapja vissza a korábbi árát, 2 sor frissül az árlistából") — ez jól sikerült, informatív minta, de csak akkor derül ki, ha a doki már tételekkel rendelkező tervben vált pénznemet; egy még üres tervnél (mint jelen menet elején) semmilyen dialógus nem jelenik meg, ezért a doki elsőre nem is sejtené, hogy ez a funkció létezik.
- Az "Egyedi végösszeg beállítása" és a "fogtechnikai munkát tartalmaz — előleg feltüntetése" jelölőnégyzetek (a Kezelések lap alján) jól működnek, de vizuálisan nem különülnek el hangsúlyosan a fázis-szerkesztő tartalmától — a persona csak azért találta meg őket, mert kifejezetten kereste, a feladatleírás alapján.

## 4. Fejlesztési lehetőségek

1. **Gyors UX-javítás** — a "Törzsadat létrehozása" lépés-elhagyási dialógus kapjon a diff-ághoz hasonló, piszkozat-élettartamra szóló "már eldöntöttem" memóriát (1. megállapítás). Ez a legmagasabb gyakoriságú, konkrét kódhelyen (`TorzsadatSyncCard.tsx`) azonosított súrlódás.
2. **Bizalom-növelés / tartalmi pontosság** — a `sablon-fallback` checklist-üzenet csak akkor jelenjen meg, ha a HU-tartalék ténylegesen használható tartalmat ad a PDF-en (2. megállapítás) — ez egy jogilag releváns dokumentum-szakaszról állít valótlant ma.
3. **Bizalom-növelés** — a nyelv-/pénznemváltás megerősítő dialógusának gombszín-inkonzisztenciája (3. megállapítás), alacsony kockázatú, célzott javítás.
4. **Gyors UX-javítás** — a "Nyomtatvány szövegei" fül nyíljon a hívó terv nyelvén (5. megállapítás).
5. **További kutatást igénylő kérdés** — a nyelv/pénznem-öröklés egy vadonatúj terv-láncnál (4. megállapítás) jelenleg dokumentált, szándékos viselkedés; érdemes a dokival tisztázni, elegendő-e egy semleges "öröklődött" jelzés, vagy inkább az alapértelmezésre kellene visszaállni egy teljesen új láncnál.

## 5. Ami jól működik

- A pénznemváltás megerősítő dialógusa pontos, számszerű előrejelzést ad a hatásról ("2 sor ára frissül az árlistából"), és a váltás után az árak ténylegesen az árlistából, nem egyszerű árfolyam-átszámítással frissültek — pontosan a dokumentált D71 elvnek megfelelően.
- Az egyedi végösszeg beállítása után a rendszer azonnal, helyesen kiszámolja és kétszer is megjeleníti a belőle adódó kedvezmény összegét — nem kell fejben számolgatni.
- Az előleg-túllépés elleni védelem (D66) élesben pontosan a dokumentált módon viselkedik: a fizetendőt meghaladó előlegnél a "Fennmaradó rész" "—"-ra vált, a rendszer nem vág le semmit hallgatólagosan, és egyértelmű szöveggel kéri a doki tudatos javítását.
- A tétel-felviteli billentyűzetes ciklus (gépel → nyíl → Enter → kereső ürül és visszakapja a fókuszt) nyelv-/pénznemváltás közbeni menetben is zökkenőmentesen, megbízhatóan működött.
- A nyelvváltás után a tételnevek helyesen frissültek németre, az árak pedig a terv nyelvének megfelelő (pontos ezres elválasztós) számformátumot kapták, a pénznem-független elv szerint.
- A generált német PDF-en a fizetési feltételek szövegébe az előleg összege dinamikusan, helyesen épült be ("eine Anzahlung von 300,00 €").

## 6. Következő validációs kérdések

1. Amikor egy már ismert, korábban más nyelven/pénznemben dolgozó páciensnél új terv-láncot indít, elvárja-e, hogy a legutóbbi terv nyelve/pénzneme automatikusan öröklődjön, vagy inkább mindig a rendelő alapértelmezésével szeretne indulni?
2. Mennyire zavarja, ha egy megerősítő dialógus gombja pirosnak tűnik egy olyan műveletnél (pl. nyelvváltás), amiről utólag kiderül, hogy nem törli, csak frissíti a tartalmat?
3. Egy külföldi páciensnél, akinek nincs magyar TAJ-száma, elfogadhatónak tartja-e, hogy a "Néhány páciensadat hiányzik" figyelmeztetés emiatt minden ilyen tervnél megjelenik, vagy zavaró?
4. Amikor egy tervet menet közben, oda-vissza navigálva ellenőriz (pl. nyelvváltás hatását nézi meg a Kezelések lapon, majd visszatér), mennyire szokott ilyet csinálni — ez tipikus munkamódja?
5. Tervez-e valaha úgy tervet, hogy a Garancia szakasz szándékosan kimarad (mert pl. a klinika nem ad garanciát bizonyos kezelésekre), vagy ez a mostani placeholder-állapot kizárólag átmeneti, amíg a szöveg meg nem érkezik?
6. Mennyire fontos, hogy a "Nyomtatvány szövegei" fül automatikusan a megfelelő nyelven nyisson, amikor egy konkrét terv figyelmeztetéséről navigál oda?
7. Használ-e valaha billentyűzetes fel/le nyilat egy ár- vagy előleg-mezőn (nem csak kattintva-gépelve), és ha igen, tapasztalt-e már ott váratlan, kis (1 egységnyi) elmozdulást?

---

*Ez a jelentés átmeneti munkatermék. A valódi találatok a `backlog/BACKLOG.md`-be vándorlása után törölhető.*
