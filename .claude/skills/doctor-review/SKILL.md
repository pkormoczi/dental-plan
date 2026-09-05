---
name: doctor-review
description: Simulates the app's real end user — István, a first-time, low-IT-literacy fogorvos — walking a lay-language clinic-day scenario through the running Mándoki Dental app in an isolated Chrome, then fact-checks the raw log, inspects the saved screenshots for visual defects, runs a small systematic break-test, and produces a prioritized Hungarian findings report with a user-test readiness verdict. Complements code-and-architecture-review (developer lens) and browser-validation (spec-compliance lens) with the missing user-experience lens; never edits application code. Invoke explicitly with /doctor-review [scenario-slug].
disable-model-invocation: true
---

# Orvosi felhasználó-szimuláció

## Cél

A `code-and-architecture-review` a fejlesztői nézőpontot fedi le
(architektúra, kód-egészség), a `browser-validation` a specifikáció-nézőpontot
(kontraszt, PDF-bájtok, billentyűzet-geometria) — egyik sem azt méri, hogy
**István, a 45 éves, az informatikától távol álló fogorvos, aki ma látja
először az appot**, segítség nélkül el tudja-e végezni a napi munkát benne
gyorsabban és biztonságosabban, mint Excellel vagy papírral.

A közvetlen cél a valódi user-teszt előkészítése: minden hibát, amit
fejlesztési időben meg lehet fogni, itt kell megfogni, hogy Istvánnak a
valódi teszten már csak az maradjon, amit csak ő tud megmondani.

Ez a skill nem szabálysértést keres, hanem súrlódást, felfedezhetőséget,
bizalmat és laikus szemmel látható hibát — a `persona.md`-ben rögzített
orvosi nézőpontból, két lencsén át (naiv bejárás + a képernyőképek utólagos
vizuális átnézése), egy kis szisztematikus rontás-próbával kiegészítve.
**Csak jelentést készít, a kódot NEM módosítja a skill része** (ugyanaz az
elv, mint a másik két review-skillnél).

## Nem tárgyalható korlát

A `CLAUDE.md` „Böngésző-automatizálás — nem tárgyalható" szakasza szó
szerint érvényes erre a skillre is: a chrome-devtools MCP kizárólag izolált
módban futhat, a skill soha nem módosítja a `.mcp.json`-t, és soha nem
javasol/kísérel meg kapcsolódást egy futó, valós Chrome-hoz.

**Soha nem kerülhet valódi páciensadat a böngészőbe** — kizárólag a demó
seed-adat (`app/src/storage/seed/`) és a `scenarios.md`-ben megadott,
nyilvánvalóan fiktív nevek/adatok (GDPR 9. cikk).

---

## 0. fázis — előkészítés (fő ügynök)

1. **Forgatókönyv kiválasztása.** Argumentumból (`/doctor-review
   veglegesites`), vagy ha nincs argumentum, kínáld fel a `scenarios.md`
   tizenhárom forgatókönyvét `AskUserQuestion`-nel — ne találgass, melyiket
   akarja a felhasználó. Egy futás = egy forgatókönyv.
2. **Seed-név ellenőrzés.** A `scenarios.md` fejlécében leírtak szerint
   győződj meg róla, hogy a forgatókönyvben hivatkozott seed-páciensek még
   léteznek; ha nem, a legközelebbi hasonlót ajánld.
3. **Dev szerver.** `cd app && npm run dev` háttérben; a tényleges portot a
   szerver kimenetéből olvasd (Vite 5174+-ra léphet, ha az 5173 foglalt).
4. **Determinisztikus reset.** Kövesd szó szerint a
   `.claude/skills/browser-validation/SKILL.md` „Determinisztikus reset —
   KRITIKUS gotcha" szakaszát: `dp:` kulcsok törlése `evaluate_script`-tel,
   majd `about:blank` → app URL két lépéses újratöltés (egy közvetlen
   ugyanarra-az-URL-re navigálás SPA no-op, nem old ki reload-ot). Egy
   forgatókönyv = egy reset, a fázis legelején.
5. **Viewport.** 1440×900 (István Mac + külső monitor felállásának
   konzervatív alsó becslése; egyetlen viewport, más méret nem cél).
6. **Képernyőkép-mappa.** Hozd létre üresen:
   `docs/reviews/screens/<YYYY-MM-DD>-<scenario-slug>/`. Az abszolút
   útvonalát add át a personának. A mappa `.gitignore`-olt — a képek
   átmeneti munkatermékek, a jelentés szövege hordozza a tartós tartalmat.
7. **Kiindulás.** Navigálj a forgatókönyv `Kiindulás (fő ügynök)` mezője
   szerinti képernyőre, és végezd el az ott előírt előkészítést (általában
   semmi).

## 1. fázis — a naiv bejárás (`orvos-persona` alügynök)

Indítsd az `orvos-persona` egyedi ügynököt (`Agent` tool,
`subagent_type: "orvos-persona"`). A promptja **pontosan** ezekből álljon,
ebben a sorrendben, semmi másból:

1. a `.claude/skills/doctor-review/persona.md` teljes szövege, szó szerint
   beillesztve;
2. a kiválasztott forgatókönyv **`Cél`** és **`Amit István tud`** mezője a
   `scenarios.md`-ből, szó szerint — **a `Kiindulás (fő ügynök)`, a
   `Lefedett folyamatok` és az `Ismert korlát` mező NEM kerül át**; ha a
   `Kiindulás` mező előír egy István nyelvén megfogalmazott kiegészítést
   („A tegnapi félbehagyást most játszd el…"), azt igen;
3. az app aktuális URL-je (port + route);
4. a képernyőkép-mappa abszolút útvonala;
5. ha a forgatókönyv művelet-számban adja meg az időkeretet
   (`elso-megnyitas`, `surgos`), a szám.

**Ne adj hozzá semmit** — komponensnevet, útvonal-tippet, spec-idézetet,
app-szakszót. Az `orvos-persona` ügynök eszközkészlete strukturálisan nem
éri el a forráskódot vagy a `docs/`-ot; ez az izoláció kikényszerítési
pontja, nem csak egy prompt-kérés.

Az elakadás **eredmény, nem hiba** — ha az alügynök nem talál egy funkciót,
azt kell jegyzőkönyveznie, nem neked kell segítened neki. A visszatérési
érték egy nyers, szerkesztetlen magyar napló (`persona.md` § Kimenet
szerint), a végén a konzol-kimenettel — ezt vedd át változtatás nélkül a
2. fázis bemeneteként. A képek a képernyőkép-mappában vannak, a napló a
fájlnevükre hivatkozik.

## 2. fázis — tényellenőrzés, második lencse, jelentésírás (fő ügynök)

### 2a. A napló feldolgozása

1. **Reprodukálás.** Menj végig a nyers naplón, és minden megállapítást
   próbálj meg te magad is előidézni a böngészőben (ugyanazon a futó
   szerveren, szükség esetén friss reset-tel). Ahol ez nem megy (pl. a PDF
   iframe belseje, tényleges lemezre írás — lásd „Nem ellenőrizhető" lent),
   a forráskód/`docs/` alapján ellenőrizd a leírt viselkedést.
2. **Bizonyosság.** Minden megállapításnál állítsd be/pontosítsd a
   `Bizonyosság` mezőt: **megfigyelt** (te magad is reprodukáltad),
   **erős következtetés** (nem reprodukáltad közvetlenül, de a kód/spec
   egyértelműen alátámasztja), **feltételezés** (egyik sem).
3. **Kemény szabály — mit NEM szabad tenned:** egy megállapítást sem
   törölhetsz vagy tompíthatsz azon az alapon, hogy a súrlódás mögött
   szándékos tervezői döntés vagy jogi kényszer áll (pl. a
   véglegesítés-őr kemény blokkjai, a verzió-immutabilitás szabálya, a
   nyelvi review kényszere). István nyers hangja megmarad. **Kizárólag
   tárgyi tévedést javíthatsz** (pl. a persona azt írja, nincs ilyen gomb,
   pedig van) — ilyenkor is tartsd meg az eredeti megfogalmazást, és fűzz
   hozzá egy „Pontosítás:" sort, ne írd felül. Egy „nem találtam meg, pedig
   van" eset nem tárgyi tévedés, hanem felfedezhetőségi megállapítás.
4. **Lencse-jelölés.** Minden megállapítás kap egy `Lencse` mezőt:
   - `István` — a naiv bejárásból, a képernyőn látott/megélt;
   - `a11y` — a persona „csak a fában láttam" jelölésű észlelései. Ezek
     valós hibák lehetnek, de nem István tapasztalata; így jelölve
     kerülnek a listába, nem István-UX-ként;
   - `vizuális` és `rontás` — a 2b. és 2c. lépésből (lent).
5. **Konzol.** A napló végi konzol-kimenetet nézd át: minden hiba/
   figyelmeztetés, ami a bejárás közben keletkezett, külön megállapítás
   (`Lencse: rontás`, ha rontás-lépéshez köthető; különben `István`).

### 2b. Vizuális lencse — a képernyőképek átnézése

Nyisd meg sorban a képernyőkép-mappa MINDEN képét (`Read`), és mindegyiken
menj végig ezen a checklisten, a `docs/07-felulet-rendszer.md` ismeretében,
de **kizárólag olyan hibát jegyezve, amit egy laikus is észrevenne a
képen** — a mérhető spec-eltérések (kontraszt-arány, fókuszgyűrű
vastagsága, popover-geometria, PDF-bájtok) a `browser-validation` dolga,
ide nem kerülnek:

- levágott, csonkolt („…"), dobozából kilógó szöveg, szám, név;
- egymásra csúszó vagy takarásban lévő elemek;
- két képen ugyanaz a fogalom kétféle névvel vagy kétféle komponenssel;
- hiányzó vagy semmitmondó üres-állapot (üres lista magyarázat nélkül);
- rosszul formázott szám/dátum/pénznem (ezres tagolás, pénznemjel, `Invalid
  Date`, `NaN`, `undefined`, `null` szöveg a képernyőn);
- egy összeg vagy számláló, ami a képsorozaton nem követi a szerkesztést;
- elsődleges akció, ami nem különül el a másodlagosaktól, vagy két
  egyformán hangsúlyos gomb ellentétes jelentéssel;
- túl kicsi vagy egymáshoz túl közeli kattintható elemek;
- félkész/villanó állapot (ha a persona ilyet írt a képhez);
- betöltő vagy hiba-állapot, amelyből nem derül ki, mi történik.

Minden találat egy megállapítás `Lencse: vizuális` jelöléssel, a képfájl
nevével a `Helyzet és reprodukció` mezőben, és az általad újra
előidézett állapotra `megfigyelt` bizonyossággal (ha csak a képen látod és
nem tudod újra előidézni: `erős következtetés`).

### 2c. Szisztematikus rontás-próba

A forgatókönyv által érintett képernyő(kö)n, a persona bejárása UTÁN, friss
reset nélkül, végezd el ezeket — István ilyet nem tesz, ezért nem a persona
dolga, de a valódi teszten egy asszisztens vagy egy második gép igen:

1. **Két fül egyszerre.** Nyisd meg az appot egy második lapon
   (`new_page`), módosíts ugyanazon a terven/páciensen mindkét lapon, és
   nézd meg, mi történik az elsőn (`localStorage`-versengés, felülírás,
   visszajelzés hiánya).
2. **Frissítés mentés közben.** Egy több lépéses mentés/véglegesítés
   kellős közepén `navigate_page` ugyanarra az URL-re `about:blank`-en át,
   majd ellenőrizd, mi maradt meg és mit mond róla az app.
3. **Gyors dupla akció.** Egy kritikus gombon (véglegesítés, új verzió,
   törlés) két `click` közvetlenül egymás után, majd ellenőrizd, hogy
   egyszer vagy kétszer történt-e meg a művelet.
4. **Platform-felirat.** `Grep` a forrásban minden felhasználónak
   megjelenő billentyű-feliratra (`Ctrl`, `Cmd`, `⌘`, `Alt`, `Option`,
   `Enter`, `Esc` és társaik a `.tsx` fájlokban): a felirat
   platform-tudatos-e (Macen `⌘`, Windowson `Ctrl`), vagy fixen
   Windows-konvenciót ír. István Macen dolgozik.

Minden találat `Lencse: rontás`, `megfigyelt` bizonyossággal.

### 2d. Dedup és rangsor

1. **Dedup-címke.** Olvasd át a `docs/reviews/*doctor-review*.md` korábbi
   jelentéseket, a `backlog/BACKLOG.md`-t és a
   `backlog/ideas/USER_FEEDBACK.md`-t, és minden megállapítást jelölj:
   - `ÚJ`;
   - `MÁR JELZETT (<korábbi review-fájl neve>, <n>. megállapítás)`;
   - `ISMÉT (<korábbi review-fájl neve>, <n>. megállapítás)` — ha a
     korábbi jelentés óta a `git log -- <érintett fájl(ok)>` szerint volt
     a területet érintő commit, azaz a jelenség javítási kísérlet UTÁN is
     fennáll. Írd oda a commit rövid hash-ét;
   - `MÁR TERVEZETT (BACKLOG N. tétel)`.
   Az ismétlődés megerősítő jel, nem zaj — ne hagyd ki emiatt a
   megállapítást. A korábbi jelentések tartósan a `docs/reviews/`-ban
   maradnak, dátum-prefixszel; ez a dedup egyetlen forrása, külön
   nyilvántartás nincs.
2. **Súlyosság** — négy fokú, fix skála, a user-teszthez kötött
   definícióval; szabad-szöveges árnyalás a fokozat után zárójelben
   maradhat:
   - `Blokkoló` — István egyedül nem jut tovább, vagy adatot veszít, vagy
     rossz tartalmú dokumentum hagyja el a gépet;
   - `Súlyos` — továbbjut, de rossz eredménnyel, vagy csak olyan
     kerülőúttal, amit magától nem találna meg;
   - `Közepes` — lassít, bizonytalanít, félreérthető, de célba ér;
   - `Kis` — kozmetikai, megfogalmazás, apró inkonzisztencia.
3. **Gyakoriság** — `minden tervnél` / `naponta többször` / `hetente` /
   `ritka helyzet`.
4. **User-teszt készültség** a forgatókönyvre, a fejlécbe:
   - `mehet` — nincs `Blokkoló`, legfeljebb egy `Súlyos`;
   - `javítás után mehet (N blokkoló, M súlyos)` — van javítandó, de a
     forgatókönyv egyébként végigjárható;
   - `nem mehet` — István a forgatókönyvet segítség nélkül nem tudta
     befejezni, vagy rossz dokumentum született.

## Jelentés-szerződés

Fájl: `docs/reviews/YYYY-MM-DD-doctor-review-<scenario-slug>.md`, azonnal,
megerősítés nélkül. Magyar nyelvű. **A jelentés megmarad** — nem átmeneti
munkatermék, ez a dedup forrása a következő futásoknak. A képernyőkép-mappa
ezzel szemben `.gitignore`-olt és törölhető, amint a jelentés elkészült.

Fejléc-blokk a cím alatt:

```
Dátum:
Forgatókönyv: <slug> — <Cél egy mondatban>
User-teszt készültség: mehet | javítás után mehet (N blokkoló, M súlyos) | nem mehet
Eszköz: chrome-devtools MCP (izolált), 1440×900
Lefedett folyamatok: <a scenarios.md szerinti számok>
Megállapítások lencsénként: István N / vizuális N / rontás N / a11y N
Bizonyosság-eloszlás: megfigyelt N / erős következtetés N / feltételezés N
Képernyőképek: docs/reviews/screens/<mappa> (N kép, .gitignore-olt)
```

Utána a hat kötelező szekció:

1. **Napi munkamenet összefoglalója** — mit próbált István, hol akadt el,
   befejezte-e; a napló záró bekezdésének („holnap egyedül menne-e") szó
   szerinti idézetével.
2. **Legfontosabb megállapítások** — egy lista, súlyosság szerint
   rendezve, lencsétől függetlenül. Minden tételnél: `Súlyosság`,
   `Gyakoriság`, `Lencse`, `Érintett folyamat`, `Bizonyosság`, `Dedup`,
   `Helyzet és reprodukció` (képfájl-névvel), `Orvosi elvárás`,
   `Tapasztalt probléma`, `Napi hatás`, `Jelenlegi kerülőút`, `Javasolt
   javítási irány`, `Siker mércéje`. **Minden `Blokkoló` és `Súlyos`
   tétel végén** egy `Backlog-kész blokk`: a `backlog/BACKLOG.md` tétel-
   formátumában (`### N. tétel: <cím>` fejléc `N` helyett `?`-lel, majd a
   bekezdés a hibával, a forrás-jelentés hivatkozásával) előre megírt
   szakasz, amit a felhasználó kézzel átmásol és sorszámoz. **A skill nem
   ír a `BACKLOG.md`-be.**
3. **Nehezen felfedezhető vagy kihasználatlan funkciók** — ami létezik, de
   István nem találta meg vagy nem ismerte fel; külön jelölve, hogy
   megtalálta-e végül, és hány próbálkozásból.
4. **Ami jól működik** — amit István elsőre megértett vagy megtalált; védi
   a jót a túljavítástól.
5. **Nem javítandó, hanem Istvántól megkérdezendő** — max. 10 tétel:
   olyan súrlódás vagy tervezői feltételezés, ahol nem a kód dönt, hanem a
   valódi felhasználó válasza; konkrét múltbeli viselkedésre kérdezve,
   nem véleményre. **Fix, minden jelentésben szereplő tétel:** „A napi
   munkádban mindig egy pácienstől indulsz, vagy előfordul, hogy a
   korábbi terveket keresed, páciens nélkül?" (a
   `backlog/ideas/USER_FEEDBACK.md` nyitott kérdése).
6. **Nem ellenőrizhető** — ami a lenti táblába esik, és a forgatókönyvben
   előjött.

### `elso-megnyitas` sablon

Az `elso-megnyitas` forgatókönyv jelentése a fenti fejlécet kapja (a
`Lefedett folyamatok` helyett: `—`), de a hat szekció helyett ezt a négyet:

1. **Mit gondolt, mire való** — István szavaival, idézve a naplóból, és
   hogy ez mennyire fedi a valós célt.
2. **Mit próbált elsőre, és sikerült-e** — időrendben, művelet-számmal;
   melyik volt a „leggyakoribb feladat", amit magától választott.
3. **Hol akadt el** — a `Legfontosabb megállapítások` formátumában, de
   csak a felfedezhetőségi és érthetőségi tételek.
4. **Mit nem vett észre** — a fő ügynök tudja, mi van az appban; sorold,
   mely fő funkciók mellett ment el István anélkül, hogy felismerte volna
   (ez a lista NEM kerül a persona elé sosem).

Ezek után a `Nem javítandó, hanem Istvántól megkérdezendő` és az `Ami jól
működik` szekció ugyanúgy.

## Nem ellenőrizhető

| Nem ellenőrizhető | Miért | Alternatíva |
|---|---|---|
| Pixelek/szöveg a PDF iframe-en belül | PDFium OOPIF, nincs szövegréteg | `take_screenshot` + vizuális ellenőrzés a 2. fázisban |
| A letöltött fájl tényleges lemezre kerülése | Izolált profil | A persona leírt szándéka/elvárása alapján `feltételezés` |
| Valódi fájlrendszeres tárolás (a mockup `DemoStorage`-t használ) | A `PlanStorage` mögötti `FileSystemStorage` még nem létezik | Jelezd, hogy ez a mockup-fázis korlátja, ne állíts mást |
| A ténylegesen kinyomtatott papír | Nincs nyomtató a menetben | Jelezd „nem ellenőrizhető"-ként |
| `prefers-reduced-motion` | Az `emulate` tool nem támogat CSS media-feature emulációt | Jelezd „nem ellenőrizhető"-ként |
| Mac-specifikus billentyű-viselkedés (`⌘` tényleges működése) | A futás Windows-Chrome-ban megy | A 2c. 4. pont csak a FELIRATOT ellenőrzi kód alapján; a működés `feltételezés` |
| A páciens tényleges reakciója (`paciens-elott`) | A páciens fiktív | `erős következtetés` a képernyő tartalma alapján |

Ami ide esik, kötelezően `feltételezés` (vagy a táblában megadott)
bizonyosságú a jelentésben.

## Lezárás

Állítsd le a dev szervert. A jelentés a `docs/reviews/`-ban marad. A valódi
találatok a `backlog/BACKLOG.md`-be a felhasználó kézi döntésével
vándorolnak, a `Backlog-kész blokk`-ok alapján. A képernyőkép-mappa
törölhető. A záró üzenetben sorold fel a `Blokkoló` és `Súlyos` tételeket
egy sorban egyenként, és a `User-teszt készültség` ítéletet.
