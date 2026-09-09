# Orvosi felhasználó-szimuláció — jelentés

```
Dátum: 2026-08-25
Forgatókönyv: veglegesites — figyelmeztetés-értelmezés és véglegesítés (Papp Krisztina, majd Farkas Katalin tervén), plusz gyors „csak ajánlat” dokumentum (Kovács János)
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: 11 (hiányos/elavult/kézzel átírt tartalom kezelése), 14 (előnézet, figyelmeztetések, véglegesítés), 15 („csak ajánlat” dokumentum)
Bizonyosség-eloszlás: megfigyelt 4 / erős következtetés 0 / feltételezés 0
```

**Módszertani megjegyzés:** ez a futás két menetben készült. Az első naiv bejárás (Papp Krisztina figyelmeztetés-értelmezése + véglegesítés, majd Kovács János gyors „csak ajánlat” terve egyetlen menetben) végén az alügynök válasza — feltehetően a menet hossza miatt (74 eszközhívás) — a `persona.md` § Kimenet utasításával ellentétben egy rövid meta-összefoglalóra és fájl-hivatkozás-listára esett vissza a teljes nyers napló helyett, és a transzkript utólag nem volt visszakérhető. Emiatt a Papp Krisztina-részt egy második, szűkebb hatókörű meneten (Farkas Katalin, ugyanazzal a három feltétellel felépítve) ismételtem meg — ez a jelentés innen tartalmazza a részletes megállapításokat. A Kovács János „csak ajánlat” részéből egy konkrét, élőben visszaellenőrzött megfigyelés maradt (lásd „Ami jól működik"); a további finomabb súrlódások onnan elvesztek.

## 1. Napi munkamenet összefoglalója

A menet két, egymástól független tervet érintett. Papp Krisztina tervét a fő ügynök szándékosan három figyelmeztetéssel készítette elő (0 Ft-os egyedi tétel, elavult árlistai ár, kézzel felülírt ár); a naiv bejárás ezeket értékelte, a 0 Ft-os tételt kijavította, a többit tudatosan elfogadta, és sikeresen véglegesítette a tervet — ez a rész él tovább csak a végeredmény szintjén (browser-visszaellenőrzéssel), a finomabb gondolatmenet elveszett. Egy megismételt, ugyanilyen felépítésű menet Farkas Katalin tervén viszont teljes, részletes naplót adott: a doki egyenként végignézte mind a négy figyelmeztetést (a checklist három dobozba rejtve mutatta őket), az elavult árat egy óvatos kerülő úttal (külön fülön megnyitott árlista-ellenőrzéssel) de végül a beépített, biztonságos előnézetes megerősítő dialóguson át frissítette, a kézi kedvezményt és a hiányzó garanciaszöveget tudatosan elfogadta, majd véglegesített, és a mentett dokumentumban visszaellenőrizte, mi maradt nyomon követhető és mi nem. Emellett egy külön, gyors menetben egy „csak ajánlat” dokumentum is készült Kovács Jánosnak — ebből egy konkrét, pozitív megfigyelés (a verziósor „Csak ajánlat” jelvénye) élőben is megerősítve maradt.

## 2. Legfontosabb megállapítások

### 1. A puha figyelmeztetések egy tervben nem különböznek egymástól súlyosság szerint, csak formában

- Súlyosság: **közepes**
- Gyakoriság: **gyakori** — minden olyan véglegesítésnél, ahol egyszerre több puha figyelmeztetés fut
- Érintett folyamat: 11, 14
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: Farkas Katalin Előnézet lépésén négy figyelmeztetés jelent meg (0 Ft-os tétel, elavult ár, kézi ár, hiányzó Garancia-szöveg), mind egyforma sárga dobozban. A doki első reakciója: „ha tíz figyelmeztetésem lenne, melyiket néznem meg elsőnek? Semmi nem segít priorizálni, csak a sorrend." Kód-szinten megerősítve: `app/src/pages/previewPage/VeglegesitesChecklist.tsx` valóban támogat három színt (`hard: 'red', soft: 'amber', info: 'gray'`), DE ebben a konkrét tervben mind a négy aktív tétel (`nulla-osszegu-sor`, `ar-elteres`, `sablon-kihagyott-szekcio`) `sulyossag: 'soft'` — tehát mind ugyanazt az amber színt kapja (`app/src/domain/veglegesitesOr.ts`). A mechanizmus létezik, csak az adott tervben lévő tételek tartománya (mind puha) miatt nem látszik belőle semmi — egy jogilag releváns hiányzó szakasz (Garancia) és egy pusztán informatív 0 Ft-os jegyzet vizuálisan megkülönböztethetetlen.
- Orvosi elvárás: a figyelmeztetések között tudjak gyorsan priorizálni, melyik igényel tényleges döntést, melyik pusztán tájékoztat.
- Tapasztalt probléma: a `soft` szinten belül nincs további rangsorolás — minden puha tétel egyenrangúnak tűnik.
- Napi hatás: időhiányban a doki hajlamos lehet átfutni a listán anélkül, hogy a valóban súlyosabb (pl. jogi tartalom hiánya) tételre külön figyelmet fordítana.
- Jelenlegi kerülőút: minden tételt egyenként, manuálisan végigolvasni és mérlegelni — ahogy a persona is tette.
- Javasolt javítási irány: a `soft` szinten belül egy másodlagos jelzés (pl. ikonváltozat vagy sorrend) különböztesse meg a jogi/pénzügyi tartalmat érintő tételeket a pusztán informatívaktól — nem feltétlenül új szín, akár csak a lista sorrendje.
- Siker mércéje: több egyidejű puha figyelmeztetésnél a doki egy pillantással tudja, melyikkel kell ténylegesen foglalkoznia elsőként.

### 2. Az „Ár frissítése" ikon felirata feleslegesen ijesztő egy valójában biztonságos, előnézetes művelethez képest

- Súlyosság: **alacsony-közepes**
- Gyakoriság: **naponta**, minden elavult áras sornál
- Érintett folyamat: 11
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: az Élpótlás sor mellett megjelenő frissítés-ikon felirata (tooltip): „Ár frissítése az árlistából – a kézzel megadott ajánlati ár törlődik" (`app/src/pages/planEditor/LineRow.tsx:348`, szó szerint egyezik). A doki emiatt nem mert rögtön kattintani — nem tudta előre, mennyi lenne az új ár, és a „törlődik" szó visszavonhatatlannak hangzott. Emiatt külön böngészőfülön megnyitotta az Árlista adminba, hogy előre lássa az új árat, mielőtt bármit tenne. Ténylegesen rákattintva viszont kiderült: a gomb egy megerősítő dialógust nyit, ami pontosan mutatja „Élpótlás — Listaár: 35 000 Ft → 41 000 Ft" és „Hatás a tervre: Kezelések összege: 57 000 Ft → 63 000 Ft" (kód-szinten megerősítve: `app/src/pages/PlanEditorPage.tsx:607-611`, szó szerint ez a formátum) — tehát a művelet már eleve biztonságos, előzetes betekintést ad.
- Orvosi elvárás: a felirat tükrözze, hogy a kattintás egy megerősítő, visszavonható lépéshez vezet, nem egy azonnali, visszafordíthatatlan törléshez.
- Tapasztalt probléma: a szövegezés ijesztőbb, mint amit a funkció ténylegesen csinál — ez felesleges kerülőútra (külön fül, külön keresés) készteti a dokit.
- Napi hatás: kisebb időveszteség soronként, de rendszeresen ismétlődő súrlódás; rosszabb esetben egy óvatosabb felhasználó sosem próbálja ki a gombot, és inkább kézzel, számolgatva javítja az árat.
- Jelenlegi kerülőút: külön fülön ellenőrizni az árlistát kattintás előtt.
- Javasolt javítási irány: a tooltip szövege utaljon arra, hogy megerősítést kérünk, és megmutatjuk a pontos változást, mielőtt bármi történne (pl. „Ár frissítése az árlistából — megerősítés után, az új ár előzetes megmutatásával").
- Siker mércéje: a doki első kattintásra, kerülőút nélkül mer az ikonra kattintani, mert a felirat már jelzi, hogy ez egy biztonságos, előnézetes lépés.

### 3. A "Néhány sor ára eltér" doboz két különböző jelentésű alcsoportot rejt egy számláló mögött

- Súlyosság: **alacsony**
- Gyakoriság: **azoknál a terveknél, ahol egyszerre van elavult ÉS kézi ár is** — nem ritka eset
- Érintett folyamat: 11, 14
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ**
- Helyzet és reprodukció: a checklist három dobozt mutatott, de a feladatleírás („három figyelmeztetést fogsz látni") és a doki első leszámolása nem egyezett a tényleges tételszámmal: a második doboz („Néhány sor ára eltér a mai árlistától") valójában két, külön címzett alcsoportot tartalmazott („Elavult árlistai pillanatkép" és „Kézzel felülírt ajánlati ár"), összesen négy érintett sorra. Kód-szinten megerősítve: `app/src/domain/veglegesitesOr.ts:284-302` egyetlen `ar-elteres` checklist-tételt hoz létre, aminek `reszletek` mezője akár két, külön címkézett `CsekklistaReszlet`-et is tartalmazhat (`elavult` és `keziAr`), egy közös `szamlalo`-val.
- Orvosi elvárás: a dobozok száma és a bennük felsorolt tételek száma egyértelműen összeadódjon, hogy gyors pörgetésnél ne számolja el magát az ember.
- Tapasztalt probléma: egy gyors átfutásnál könnyen alábecsülhető, hány sort érint ténylegesen a figyelmeztetés.
- Napi hatás: alacsony — a doki, ha lassabban olvas, észreveszi a két alcímet, de időnyomás alatt könnyen átsiklik felette.
- Jelenlegi kerülőút: figyelmesen elolvasni mindkét alcímet a dobozon belül.
- Javasolt javítási irány: a doboz fejlécében a számláló a ténylegesen érintett sorok számát mutassa egyértelműen (pl. „2 alcsoport, összesen 2 sor"), vagy a két alcsoport vizuálisan is jobban elváljon egymástól.
- Siker mércéje: egy gyors pillantásra is világos, hány sort érint ténylegesen a doboz, alcsoportonként lebontva.

### 4. A véglegesítés utáni sikerképernyő nem foglalja össze, mely puha figyelmeztetéseket fogadta el a doki

- Súlyosság: **alacsony-közepes**
- Gyakoriság: **minden véglegesítésnél**, ahol maradt elfogadott figyelmeztetés
- Érintett folyamat: 14
- Bizonyosség: **megfigyelt**
- Dedup: **ÚJ** (részben ellensúlyozza a „Ami jól működik" 2. pontja — a kézi ár nyoma megmarad a Terv részletei nézetben —, de a Garancia-mellőzés és a 0 Ft-os tétel elfogadásának ténye sehol nem látszik utólag)
- Helyzet és reprodukció: a „Véglegesítés és mentés" gombra kattintva egyetlen megerősítő kérdés sem jelent meg a két megmaradt, tudatosan elfogadott puha figyelmeztetésről (kézi ár, hiányzó Garancia). A sikerképernyő (`app/src/pages/PreviewPage.tsx:397-436`, kód-szinten megerősítve) kizárólag „A terv elmentve ✓" szöveget, a fájl-elérési utat, és „Új terv indítása"/"Korábbi tervek" gombokat mutat — semmilyen összefoglalót arról, mely figyelmeztetéseket fogadta el a doki.
- Orvosi elvárás: ha két hét múlva visszatérek egy véglegesített tervhez, lássam valahol összefoglalva, mely figyelmeztetéseket fogadtam el tudatosan véglegesítéskor.
- Tapasztalt probléma: a sikerképernyő pillanatában elveszik ez az összefoglaló kontextus.
- Napi hatás: alacsony-közepes — a kézi ár nyoma ténylegesen megmarad a Terv részletei nézetben (lásd lent), de ez nem a sikerképernyőn, hanem csak egy külön navigációval derül ki; a 0 Ft-os tétel elfogadásának és a Garancia-mellőzésnek pedig semmilyen utólagos nyoma nincs.
- Jelenlegi kerülőút: a doki fejben tartja, mit fogadott el, vagy külön megnyitja a Terv részletei nézetet ellenőrzésképp.
- Javasolt javítási irány: a sikerképernyő tartalmazzon egy rövid, összecsukható összefoglalót a véglegesítéskor még fennálló, tudatosan elfogadott puha figyelmeztetésekről.
- Siker mércéje: a sikerképernyőn egy pillantással látszik, mely figyelmeztetéseket fogadta el a doki a véglegesítés pillanatában.

## 3. Nehezen felfedezhető vagy kihasználatlan funkciók

- Az „Ár frissítése az árlistából" ikon megerősítő dialógusa (pontos előtte/utána ár és tervre gyakorolt hatás) hasznos és megbízható funkció, de az ikon önmagában (kattintás előtt) semmit nem árul el erről — csak a szöveges tooltipre lehet hagyatkozni, ami inkább elrettent, mint felfedezésre ösztönöz (lásd 2. megállapítás).

## 4. Fejlesztési lehetőségek

1. **Bizalom-növelés** — az „Ár frissítése" tooltip szövegének átfogalmazása, hogy tükrözze a valódi, biztonságos, előnézetes viselkedést (2. megállapítás).
2. **Gyors UX-javítás** — a puha figyelmeztetéseken belüli másodlagos rangsorolás vagy vizuális megkülönböztetés (1. megállapítás).
3. **Gyors UX-javítás** — a „Néhány sor ára eltér" doboz számlálójának/alcsoportjainak egyértelműbbé tétele (3. megállapítás).
4. **Bizalom-növelés** — a sikerképernyő rövid összefoglalója az elfogadott puha figyelmeztetésekről (4. megállapítás).

## 5. Ami jól működik

- A „Csak ajánlat" mód a verzió-listán jól látható, egyértelmű jelvényt kap („Tömések · v1" mellett „Csak ajánlat" felirat, élőben visszaellenőrizve a Kovács János tervén) — a doki később egy pillantással tudja, hogy egy adott verzió aláírás nélküli, tájékoztató jellegű volt-e.
- A checklist élőben követi a piszkozat állapotát: az elavult ár javítása után az Előnézetre visszanavigálva a megfelelő figyelmeztetés azonnal eltűnt, újratöltés vagy trükközés nélkül.
- A kézzel felülírt ár nyoma (a „-27%" jelvény és az áthúzott eredeti ár) megmarad a véglegesített, read-only Terv részletei nézetben is, nem csak a szerkesztőben — valódi audit-nyomvonal egy döntésről, amit a doki tudatosan hozott.
- A hiányzó Garancia-szöveg helyesen, placeholder-szöveg szivárgása nélkül marad ki a végleges PDF-ből; a „Csak ajánlat" jelölés helyesen dönt a nyilatkozat+aláírás oldal be-/kikapcsolásáról, és a `{{orvos}}` sablon-helyőrző helyesen oldódik fel a kezelőorvos nevére.

## 6. Következő validációs kérdések

1. Amikor egyszerre több figyelmeztetést lát az Előnézeten, milyen sorrendben szokta végignézni őket — van-e saját, fejben tartott priorizálása?
2. Használta-e már az „Ár frissítése" ikont? Ha igen, első alkalommal habozott-e, vagy rögtön rákattintott?
3. Mennyire fontos önnek, hogy egy véglegesített terv megnyitásakor lássa, mely figyelmeztetéseket fogadta el annak idején?
4. Szokott-e külön fület nyitni az Árlista adminra, miközben egy terven dolgozik, hogy ellenőrizzen valamit anélkül, hogy elhagyná a piszkozatot?
5. Mennyire olvassa el figyelmesen a puha figyelmeztetések teljes szövegét, vagy inkább csak a címükre/számukra hagyatkozik időhiányban?
