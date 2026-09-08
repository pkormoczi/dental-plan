# Backlog flow — harmadik review és az AI-val végzett fejlesztés következő lépése

Dátum: **2026-09-08**. Vizsgált HEAD: `c443ce34a3741317e3e7cdcf954280ffdbc6a4bd`.
Előzmények: [első review](2026-09-05-backlog-flow-review.md), [második review](2026-09-05-backlog-flow-review-2.md).
Állapot: **döntés-előkészítő review**, nem elfogadott workflow-módosítás. A súlyosság nem backlog-`Prio`.

## 1. Értékelés

**Megtartanám a rendszer alapját és a soros batch munkát. A következő nagy nyereséget a batch megbízható folytathatóságától, az ismételt kapuk eltávolításától és a kockázathoz igazított emberi figyelemtől várnám.** Új projektkezelő vagy kötelező PR-folyamat bevezetésére a mostani, egyfejlesztős mockupnál nem látok indokot.

A korábbi review-k több konkrét hibáját javítottad: van commit-hatókörvédelem, tiszta munkafát kérő belépés, rebase utáni kapu, lezárásfolytatás és 25 workflow-integrációs teszt. A technikai rutindöntések és a termékdöntések elválasztása is megjelent. Ezek ténylegesen javítják az agent önálló munkájának feltételeit.

A batch a beszámolód alapján sokat gyorsított. A forrásokból látszik a nyereség mechanizmusa: kevesebb emberi átadás, közös feltárási környezet, soros végrehajtás és közös publikálás. A gyorsulás mértékét azonban ebből a repóból nem lehet megmérni; nincs összehasonlítható adat az aktív emberi időről és az utólagos javításokról.

**A legfontosabb új probléma: a batch visszahozta a helyi commit-várólistát, de a publikáló scriptek még nagyrészt a korábbi, azonnali push modellből indulnak ki.** A darabonként jól működő parancsok együtt olyan utat is engednek, amelyen a böngészős bizonyíték előtt publikálódik a kód. Ezt három izolált próbával ellenőriztem; nem pusztán a dokumentáció szóhasználatáról van szó.

A húsz év fejlesztői tapasztalatodra érdemes építeni. A scope, a függőségek, a hibakeresés és az elfogadás továbbra is szakmai döntés. Az új tanulandó rész az, hogyan adj az agentnek ellenőrizhető feladatot, mennyi önállóságot engedj, és miből tudd, hogy elkészült. A „kezdő fejlesztő” megközelítés a korábbi review-kban ezért pontatlan volt.

## 2. Hatókör és bizonyíték

Átnéztem a gyökérkontextust, a `docs/PRODUCT.md`-t, a backlog szerződését és README-jét, az egytételes és batch skilleket, a manual-check protokollját, a workflow-scripteket és tesztjeiket, a CI-t, valamint néhány aktuális tervet. A [tesztelési módszertan egységesített review-ját](2026-09-05-tesztelesi-modszertan-review.md) kapcsolódó, még döntés-előkészítő anyagként kezeltem: az ott javasolt E2E-rendszer nem tekinthető már működő kapunak.

| Ellenőrzés | Eredmény és korlát |
|---|---|
| `node --test scripts/workflow/workflow.test.mjs` | **25/25 sikeres**, kb. 35,9 s. Ideiglenes bare origin + munkarepók; a kapuk marker-parancsok. |
| `node scripts/docs-check.mjs` | A jelentés megírása előtt **358 fájl, 0 hiba**. |
| Három célzott Git-próba | Az alábbi publikálási utak mind reprodukálhatók; részletek a 8. szakaszban. |
| Backlog-pillanatkép | **26 terv**: 25 a gyökérben, 1 `later`; **20 ötlet**: 4 aktív mappában, 16 `later`. A 29 nem-later tétel egyikén sincs `Prio: now` vagy `next`. |
| Teljes alkalmazáskapu, böngészős bejárás | Nem futott: ez folyamat-review. A workflow-próbák nem bizonyítják az app működését vagy a valódi kapu hibadetektáló erejét. |

A forrásrepóban a vizsgálat kezdetén két követetlen konfigurációs útvonal volt: `.claude/settings.local.json` és `app/.claude/`. Tartalmukat nem vizsgáltam, nem módosítottam. A helyreállítási próbák saját ideiglenes repókon futottak, kizárólag helyi originre pusholtak; a fejlesztési repó történetét nem változtatták meg.

Záró ellenőrzés: a `docs-check` ismét **358 fájl, 0 hiba**; a jelentés relatív Markdown-linkjei léteznek, nincs sorvégi whitespace vagy hibás UTF-8-cserekarakter. A `docs/reviews/` nem része a docs-check tartalmi vizsgálatának, ezért a jelentés hivatkozásait külön ellenőriztem. Közben egy másik munkamenet a `50b483f` commitban megtervezett egy további ötletet; a fenti leltár a megadott vizsgálati HEAD pillanatképe. A vizsgált workflow-források és az alkalmazáskód e két HEAD között nem változtak.

## 3. Mi javult, és mit érdemes megtartani?

| Korábbi kérdés | Jelenlegi értékelés |
|---|---|
| Ötlet/terv commit-életciklusa | Az egytételes úton rendezett; a batch kivételének gépi kezelése még hiányos. |
| Idegen stage-elt fájl egy docs-commitban | A `commit-push` valóban megáll rá; teszt is védi. A korábbi hiba ezen a szinten javítva. |
| Módosított baseline miatti lezárási hiba | A drift már csak jelez; a tervfájl törlésének őre megmaradt. |
| Megszakadt lezárás | A `close` kapott folytatási módot. Ez egy parancsra működő alap, nem teljes batch-folytatás. |
| Ellenőrzés az emberi átadás előtt | Az egytételes skill sorrendje javult. A javítás utáni böngészős újraellenőrzés még nincs kellően kimondva. |
| Interjú és technikai önállóság | A termékdöntés az emberé, a rutin megoldás az agenté; ez jó irány. |
| Prioritás és listakezelés | A `later` ténylegesen használatba került. A következő végrehajtási csoport még főként a hívásból/beszélgetésből derül ki. |
| Agentfüggetlen végrehajtás | A determinisztikus Git-lépések scriptekben vannak. A batch szervezése és hibakezelése továbbra is prózában él. |

Külön megtartanám a `PRODUCT.md` szándékforrás szerepét, a storage-határokat, a megfigyelhető viselkedésre épülő teszteket, a „Find before writing” indexet, a review és a backlogba vétel szétválasztását, valamint a lezárt tételek Git-történetben őrzését. A soros batch is indokolt: a tervek között sok a közös fájl, ezért az író agentek párhuzamosítása integrációs költséget is hozna.

## 4. Konkrét megállapítások

### F1. A batch publikálási határát más parancsok át tudják lépni

**Súlyosság: magas. Bizonyosság: reprodukált scriptviselkedés és a skill lépéseinek összevetése.**

Az `implement-batch/SKILL.md:30` legelső lépése a `sync.mjs --require-clean`. A `sync.mjs:32–36` minden várakozó commitra lefuttatja a négy npm-kaput, majd pushol. Nem tudja, hogy a batch böngészős ellenőrzése megtörtént-e.

Konkrét út:

1. Egy tétel elkészül, `close --batch` commitolja és törli a tervét.
2. A session megszakad a batch végi manual-check előtt; a munkafa tiszta.
3. Az új `/implement-batch` preflightja pusholja a kész commitot.
4. Csak utána következne a slug-validáció és a böngészős ellenőrzés.

Ráadásul az eredeti sluglista validációja a már törölt tervnél megállhat. A `close --batch` valóban felismeri a még pusholatlan lezáró commitot, de ez nem bizonyítja a teljes skill újraindíthatóságát: a skill korábbi lépése már publikált, majd hiányzó tételt talál. A `plan-batch` újraindításánál hasonlóan ütközik a kizárólag idea státuszú bemenet követelménye a már megtervezett tételekkel, bár ott nincs elmaradt alkalmazásellenőrzés.

Másik út: egy várakozó batch-kódcommit után a `commit-push.mjs`-sel rögzített review vagy backlog-fájl **a korábbi commitokat is felviszi**, csak `docs-check` mellett. A stage-hatókör őre helyesen védi az új commitot, de nem védi a teljes publikált tartományt. Ez a 8. szakasz második próbájában is megtörtént. A `prio` is ezt a publikáló scriptet használja.

**Javaslat:** legyen külön felelősség a frissítés és a publikálás. A preflight frissíthessen, de ne publikáljon mellékhatásként befejezetlen batcht. A docs/backlog-publikáló út álljon meg, ha idegen, korábbról várakozó commitot vinne magával. A batchnek legyen minimális, újraolvasható futásállapota: kezdő commit, slugok és sorrendjük, sikeres/kimaradt tételek, kötelező ellenőrzések, ellenőrzött kódállapot. Ez végrehajtási adat; nem új backlog-`Status` vagy kézzel vezetett done-lista.

A publikálási őr minden masterre pusholó belépési pontra vonatkozzon. Egyetlen új `batch-state` fájl önmagában nem oldja meg a problémát, ha a `sync` vagy a `commit-push` figyelmen kívül hagyhatja.

### F2. A `sync` zöld kapuja más állapotot vizsgálhat, mint amit pushol

**Súlyosság: magas. Bizonyosság: reprodukált.**

A tiszta munkafa csak a `--require-clean` kapcsolóval követelmény (`sync.mjs:23`). A batch záró publikálása és több helyreállítási utasítás sima `sync.mjs`-t hív.

Ha egy hibás helyi commit javítása még a munkafában van, a kapu a javított fájlokat vizsgálja, a push viszont a hibás commitot viszi. A célzott próbában a kapu csak `fixed` fájltartalommal adott sikert; a munkafában `fixed`, az originre került commitban mégis `broken` maradt, 0-s scriptkilépéssel.

A CI a valódi alkalmazás hibáját még megfoghatja. Ez nem teszi helyessé a helyi bizonyítékot: a tesztelt és a publikált állapot különbözött.

**Javaslat:** publikálás előtt kötelezően tiszta munkafa kell, és az ellenőrzésnek a publikálandó állapothoz kell tartoznia. Kapujavítás után előbb a javítás commitja, majd a kapu és push következzen. A feltétel a scriptben legyen alapkövetelmény; ne minden hívó emlékezzen egy kapcsolóra. Rebase vagy kódjavítás az érintett bizonyítékot érvényteleníti.

### F3. Egy kimaradt tétel módosításai átcsúszhatnak a következő tételbe

**Súlyosság: magas. Bizonyosság: a leírt hibakezelés és a script alapján levezetett; teljes agentsessionnel nem reprodukált.**

Az `implement-batch/SKILL.md:89–92` módosított tervfájl miatti elakadásnál csak a terv visszaállítását írja elő, majd a tételt kimaradtnak jelöli és továbbmegy. Az ugyanahhoz a tételhez elkészített app-módosítások visszaállítása ebből az ágból hiányzik.

A következő `close` a `close.mjs:147` szerint `git add -u`-t futtat: minden követett módosítás bekerülhet. A kimaradtként jelentett tétel kódja így a következő slug commitjában publikálódhat. A tiszta preflight csak a batch elejét védi.

Az általános visszaállítási leírásban szereplő `git checkout -- <fájlok>` a stage-elt módosításokat sem feltétlenül távolítja el: alapból az indexből állítja vissza a munkafát. Ez például részben sikerült lezárás utáni helyreállításnál számít.

**Javaslat:** minden tétel előtt legyen ismert commit és tiszta állapot; kimaradás után a tétel saját munkafájának és indexének ehhez kell visszatérnie, a saját új fájlokat is kezelve. Idegen módosításnál megállás, megőrzés és jelentés kell. A következő tétel csak ellenőrzött tiszta állapotból induljon. Érdemes a visszaállítási tranzakciót scriptbe tenni, és integrációs teszttel bizonyítani, hogy kimaradt tétel diffje nem kerülhet másik commitba.

### F4. A böngészős ellenőrzés eredménye még nem elég erős lezárási feltétel

**Súlyosság: magas a kézi kapu nélküli úton. Bizonyosság: a skill szerződésében látható hiány.**

Jó döntés a szükséges szeleteket a tényleges diff és a tervek uniójából választani. Három rés marad:

- **Javítás után nincs explicit böngészős újramérés.** Az `implement-batch` 2c lépése kritikus találatnál javítást, npm-kaput és commitot kér. Ha például a kontrasztmérés volt piros, a jsdom-tesztek sikerétől még nem bizonyított a javított kontraszt. Az egytételes `/implement` is az 5. npm-kapu ismétlését írja elő, nem egyértelműen az érintett 5b ellenőrzését.
- **A „nem ellenőrizhető” eredménynek nincs kimondott batch-következménye.** A manual-check helyesen felsorolja az eszköz korlátait. Ha egy ilyen korlát éppen az adott tétel elfogadását érinti, annak a tételnek még nincs lezárási bizonyítéka. Ha nem érinti, a korlát természetesen nem blokkoló.
- **A súlyosság nem azonos az elfogadással.** A batch a saját `Kritikus` találatát javítja, minden mást a záró jelentésbe tesz. Egy közepes hiba is jelentheti, hogy az adott tétel `Goal`-ja nem teljesült. A tétel elfogadási feltételének bukását súlyosságtól függetlenül kezelni kell.

Ehhez társul, hogy a batch szándékosan nem ment jelentésfájlt, és a tervek addigra törlődnek. A történetből a terv visszakereshető, de a szeletlista és eredmény a sessionre marad. Ez gyengíti a folytathatóságot.

**Javaslat:** három eredmény legyen világos: teljesült, nem teljesült, nem ellenőrizhető. Javítás után az érintett ellenőrzést újra kell futtatni. A batch rövid bizonyítékot őrizzen az ellenőrzött kódállapotról és az eredményről; nem kell minden futásból hosszú review. Nem teljesült vagy szükséges, de nem ellenőrizhető elfogadás esetén a tétel nem tekinthető késznek. A batchtől független találat továbbra is külön triázsra mehet.

### F5. A terület szerinti csoportosítás nem kezeli a tételfüggőségeket

**Súlyosság: közepes. Bizonyosság: konkrét tervpéldák és hiányzó batch-szabály.**

Az `implement-batch` preflightja fájl/terület szerinti csoportosítást kér. A tervek viszont már sorrendi döntéseket is hordoznak:

- `torzsadat-elteres-ures-mezo` csak a `torzsadat-letrehozas-dialogus-szovege` után következzen;
- `fazis-osszecsukas-megorzese-es-osszegzo` az `elo-fazis-es-vegosszeg` elé van rendelve.

A közös fájl önmagában nem dönti el a sorrendet. Ha az előfeltétel kimarad, a követő tétel nem feltétlenül hajtható végre. A drift nem jelzi egy elmaradt módosítás hiányát: az csak megtörtént változást mutat.

**Javaslat:** először az explicit függőségek és a kimaradások hatása határozza meg a sorrendet, utána a fájlközelség. Egyelőre elég lehet a futás eleji `tétel | előfeltétel | kimaradás következménye` táblázat a meglévő tervek alapján. Új kötelező fejlécmezőt csak akkor vezetnék be, ha ennek gépi ellenőrzése is elkészül. A függőségből kimaradó tételt külön kell jelenteni; nem ugyanaz, mint a saját tervének hibája.

### F6. A teljes tesztkészlet ismétlése közvetlenül csökkenti a batch nyereségét

**Súlyosság: közepes, közvetlen hatékonysági költség. Bizonyosság: hívásláncból számolható, időnyereség nem mért.**

Az `implement-batch` 1c lépése `build+lint+test`, az 1e lépésben a `close --batch` ugyanezt ismét futtatja. A skill szövege ezt el is ismeri, bár ugyanabban a mondatban a „nem futtatja újra” fordulat is szerepel. A ciklus végén a `sync` ismét teljes kaput futtat.

Változatlan, javítás és rebase nélküli boldog úton **N tételre 2N+1 helyi teljes alkalmazásteszt-futás** jut, majd a CI. Tíz tételnél ez 21 helyi futás. Az egytételes úton is ismétlődik a kapu: `/implement`, `/finish` 1–2, majd `close`.

A `docs-check` batch végi összevonása közben a drágább teljes alkalmazásteszt maradt duplán. A `plan-batch` ráadásul csak backlog-fájlokat ír, mégis teljes alkalmazáskapuval zár, mert a `sync` nem különbözteti meg a várakozó tartományt.

**Első, egyszerű javaslat:** a kötelező commit előtti kapu tulajdonosa a `close` legyen. A skill külön köre célzott fejlesztői tesztelésre szolgáljon; ne írja elő ugyanannak a teljes kapunak az azonnali megismétlését. Így a batch boldog útja N+1 helyi teljes tesztfutásra csökkenthető, a záró kapu megőrzésével. Ehhez nem kell ellenőrzés-cache vagy kikerülhető `--skip-tests` kapcsoló.

A további tesztszint- és E2E-változtatásokat a meglévő tesztelési review-val együtt dönteném el. A docs-only végső kapu könnyítése csak az F1 publikálási tartományvédelme után biztonságos.

### F7. A rövid belépési szabályok és a tényleges workflow már szétcsúsztak

**Súlyosság: közepes. Bizonyosság: közvetlen szöveg-összevetés.**

Konkrét példák:

- Az `AGENTS.md` csak az egytételes kézi kaput és az azonnali push-t írja le; a batch kivételét nem.
- A gyökér és a backlog `CLAUDE.md` „kapu nélkül” említi a batcht, miközben gépi kapu természetesen van. A pontos kifejezés: **kézi kapu nélkül**.
- A README 1. és 11. szakasza általános elvként mondja ki, hogy nincs várakozó helyi commit; a batch közben szándékosan ilyen állapotban van.
- A README 9. szakasza és 10a táblája megerősítést ír a changelog/features skillekre; azok jelenlegi szövege már megállás nélküli végrehajtást kér (`update-changelog:116`, `update-features:121`).
- A batch elakadásra `/plan <slug>` újratervezést ajánl, miközben a `/plan` a már tervezett fájlt alapból nem fogadja el, csak annyit mond: előbb mondd ki, mi bukott meg. Az újratervezés pontos fájl- és commit-átmenete nincs végigvezetve.

A `docs-check` ettől még zöld, mert nem szemantikai workflow-ellenőrző. Más agentnek a scriptek mellett ezeket a kivételeket is helyesen kellene összeraknia.

**Javaslat:** egyetlen rövid helyen legyen leírva a két út közös szerződése és a batch kivétele: mikor készül helyi commit, mikor publikálható, hogyan folytatható, mi történik kimaradáskor. A belépési fájlok erre mutassanak. A README maradhat részletes emberi magyarázat, de az állapotátmenet igazságát a script és az átmenetteszt hordozza. Az újratervezéshez is legyen egyértelmű eljárás; nem feltétlenül új slash command kell.

## 5. Milyen AI-assisted munkamódot céloznék meg?

### Az önállóságot és a batch méretét külön dönteném el

A mai két út részben összeköti a „hány tétel?” és „kell-e emberi ellenőrzés?” kérdést. Ezek két külön döntés. Egyetlen triviális tétel is végigmehet önállóan; több összetett tétel közös futtatása is végződhet emberi elfogadásnál.

| Feladat jellege | Az agent feladata | Emberi döntés |
|---|---|---|
| Egyértelmű, kis kockázatú, megfelelően ellenőrizhető javítás | Rövid terv, implementáció, bizonyítás, lezárás; egyedül vagy soros csoportban | Az adott feladatkör és publikálás előzetes felhatalmazása |
| Eldöntött cél, de UX-ítélet vagy több együttműködő rész szükséges | Önálló megvalósítás és technikai ellenőrzés, egy átadási csomag | Célzott kipróbálás publikálás előtt |
| Nyitott termékdöntés, invariáns, pénz, archiválás vagy nyomtatvány jelentése | Feltárás, alternatívák és következmények; a döntés után implementáció | A szakmai döntés és az elfogadás |

Ez **javasolt későbbi felosztás**, nem a jelenlegi batch korlátainak feloldása. Amíg a folytathatóság és a bizonyíték kezelése nincs rendezve, az automatikusan publikáló batch körét szűken tartanám. A táblázat középső sora viszont lehetőséget adna a productivity megtartására egyetlen közös emberi átadással.

Az egy mondatban leírhatóság gyenge kockázati mérce. „Az üres adatokat pótolja a másik rekordból” rövid mondat, mégis komoly döntéseket rejt. Jobb szűrő: eldöntött-e a viselkedés, érint-e szerződéses/adattárolási határt, és milyen konkrét bizonyíték alapján fogadható el?

### Az elfogadási példa legyen erősebb, mint a megoldási előírás

A mai tervek több helyen részletesen felsorolják a meglévő fájlokat és a választott megoldást. Ez jó feltárási eredmény, de az agent könnyen arra optimalizálhat, hogy a tervet és az általa írt teszteket tegye konzisztenssé. Maradjon elsődleges a kívánt megfigyelhető eredmény.

Egy jó feladatátadás például:

> Csak névvel létrehozott demópáciens tervében kitöltök egy telefonszámot. Ezt pótlásként lássam; a gomb hatása legyen egyértelmű. Valódi, két kitöltött érték közti ütközés továbbra is külön döntést kérjen. Igazold a sikeres írást és a tárolási hibából való újrapróbálást. A nyitott szakmai döntést jelezd; a meglévő architektúrán belüli technikai megoldást válaszd meg.

Ez nem írja felül a mostani tétel elfogadott döntéseit; a példa az átadás fókuszát mutatja. A tervben a technikai részletek akkor értékesek, ha megakadályoznak egy valós félreértést vagy felesleges újrafeltárást.

Bugnál kérnék reprodukciót és olyan bizonyítékot, amely az eredeti hibát is megkülönbözteti a javított viselkedéstől. Egy új assertion puszta jelenléte nem elég. Ugyanakkor egy szövegcseréhez nem rendelnék automatikusan új teljes oldalas tesztet: lehet, hogy meglévő teszt módosítása és célzott vizuális ellenőrzés a megfelelő szint. Ez illeszkedik a tesztelési review javasolt irányához.

### A friss szem más feladatot kapjon, mint az implementáló agent

A diff-önellenőrzést megtartanám. Kockázatosabb vagy több tételen átívelő változásnál kipróbálnék egy **külön review-sessiont** is: eredeti cél, releváns termékszabály, terv és tényleges diff legyen a bemenet. A feladat legyen konkrét: keressen bizonyítható elfogadási hiányt, regressziót, gyenge assertiont és scope-túllépést; ne írjon kódot.

Ez nem követel párhuzamos író agenteket vagy minden tételre második teljes auditot. A külön session sem garantál független igazságot, és nem kell hozzá feltétlenül másik modell. A hasznát az mutatja, hány valódi hibát fog meg mennyi többletidőért. Ha csak stílusjavaslatokat termel, szűkíteni kell a feladatát.

Az egyszerű, összeállítható lépések és a mérhető haszon alapján növelt összetettség az Anthropic által leírt agenttervezési elvekkel is összhangban áll. Ez általános módszertani támpont; nem bizonyíték arra, hogy nálad bármely konkrét modell vagy többagent-rendszer gyorsabb lenne. [Building effective agents](https://www.anthropic.com/engineering/building-effective-agents)

### A review-termelést is érdemes korlátozni

A persona-review hasznos hipotézisforrás, de nem a fogorvos tényleges munkájának mérése. Egy súlyosnak címkézett AI-megállapításból ne legyen automatikusan implementációs kényszer.

Erre saját példád is van: a `terv-lap-halvany-szoveg-kontraszt` terv feltárása a NumberField és SorReszlet egyes kontraszttalálatait a mérőszkript korlátjának minősítette, és kizárta a fölösleges javításukat. A helyes workflow itt az eredeti megállapítás ellenőrzésével takarított meg munkát.

A `/idea` már támogat több kiválasztott ötletet egy futásban és egy commitban. Ezt használnám a review utáni triázshoz; emiatt önmagában nem kell új idea-batch skill. Hetente vagy egy review-csomag végén egy rövid döntés elég lehet: mely megfigyelések valósak, melyek számítanak a következő használati célhoz, és melyek maradnak jelentésben/laterben.

## 6. Tervezési készlet, context és mérés

### Egy következő végrehajtási csoportot tervezz részletesen

A 26 terv önmagában nem bizonyít túltervezést: lehet egy tudatosan előkészített javítási hullám. Viszont a tervekben sok a közös felület és a kódszintű pointer, amelyek az implementáció során elavulhatnak. A batch gyorsabb tervgyártása csak akkor javítja a teljes folyamatot, ha a tervek rövidesen meg is valósulnak.

Kiinduló kísérletként egy aktív végrehajtási csoportot és egy következő csoportnyi tervet tartanék. Összefüggő UI-munkánál indulhat 3–5 tétellel; egymástól független, apró változásoknál maradhat nagyobb. Ez nem univerzális darabszámkorlát: a 10–12-es jelenlegi ajánlást a futásidő, az újrafeltárás és a hibaarány alapján érdemes kalibrálni.

A `later` már tehermentesíti a listát. A következő csoporthoz használnám a meglévő `now`/`next` jelölést vagy egy explicit sluglistát; nem kell mind a 46 tételt részletesen rangsorolni. A függőséget ettől külön kell kezelni.

### A folytatás forrása a repó és a futásállapot legyen

A közös fájlokat érintő soros munka újrahasznosítja a feltárást, de egy hosszú session végén a korábbi döntések és a kimaradt tételek állapota ne csak beszélgetési emlékezet legyen. A következő session kapjon rövid átadást: cél, induló és aktuális commit, kész/kimaradt tételek, következő lépés, hiányzó bizonyíték. A teljes beszélgetés másolása nem szükséges.

Új tétel vagy új terület elején az agent olvassa újra a releváns kódot. A tegnapi saját magyarázata nem erősebb forrás, mint a mai fájl. A jelenlegi baseline és discovery-index ehhez már jó alap.

### Két hétig mérj keveset, de a megfelelő dolgot

**A fő mérőszámnak az elfogadott változásra jutó aktív emberi időt választanám**, az utólagos hibák és javítások mellett. A tétel-, commit- vagy tesztdarabszám könnyen nőhet attól is, hogy apróbb részekre bontasz mindent.

| Adat egy futásról | Mire ad választ? |
|---|---|
| Feladat jellege, tételszám, sikeresen elfogadott scope | Összehasonlítható munkákat nézünk-e? |
| Aktív emberi perc: döntés, átadás, kipróbálás, mentés | Ténylegesen kevesebb figyelmedet köti-e le? |
| Teljes falidő és kapura várakozás | Az agent, a teszt vagy az emberi várakozás a szűk keresztmetszet? |
| Kimaradás oka: terv, függőség, környezet, bizonyítás | Mit kell javítani a workflow-ban? |
| Utólagos regresszió és javítási perc | Nem csak előrehoztuk-e a „kész” állapotot? |
| Becsült agentköltség, ha elérhető | Megéri-e a második review vagy a nagyobb futás? |

Kezdetnek 10–15 tényleges, hasonló kockázatú tétel megfigyelése elég egy következő döntéshez, de nem statisztikai bizonyíték. Ne vezesd be egyszerre a kapuváltoztatást, a második review-t és egy új modellt: különben nem fogod tudni, mitől javult vagy romlott az eredmény. Egy rövid, helyi táblázat elég; nincs szükség alkalmazás-telemetriára vagy betegadat gyűjtésére.

A tényleges végeredmény és az agent beszámolójának különválasztása, valamint a kódos, emberi és modellalapú értékelés eltérő szerepe hasznos módszertani alap. A konkrét kis mintás kísérlet itt saját, ehhez a projekthez igazított javaslat. [Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)

## 7. Javasolt következő lépések

Ez műszaki javítási sorrend, nem backlog-prioritás átírása. A review nem hoz létre új tételeket.

1. **A batch állapotátmeneteinek rendezése.** F1–F3: frissítés/publikálás szétválasztása, tiszta publikálási állapot, megszakítás utáni folytatás és kimaradás utáni tisztaság. A publikáló belépési pontok közös szabálya és izolált átmenettesztek együtt készüljenek el.
2. **A lezárási bizonyíték pontosítása.** F4–F5: elfogadási eredmény, javítás utáni újramérés, szükséges de nem ellenőrizhető eset, függőségből kimaradás. A rövid futásállapot tartsa meg a szükséges bizonyítékot.
3. **Az ismételt teljes kapuk egyszerűsítése.** F6: először a skill és `close` közvetlen duplázását szüntetném meg, a commit előtti és végső gépi védelem megtartásával. F7 dokumentációját a megváltozott szerződéshez igazítanám.
4. **Egy kis mérési kísérlet.** A következő csoporton mérd az emberi időt és az utólagos javítást. Utána dönts arról, kell-e közös emberi átadásos batch vagy célzott második review.

Ha backlogba szeretnéd venni, természetes bontás lehet a `batch-publikalas-es-folytatas`, `batch-kimaradas-tranzakcio`, `batch-elfogadasi-bizonyitek` és `workflow-kapu-duplazas` felvetés. Ezek javasolt témák; a tervfázisban érdemes eldönteni a végleges scope-ot és függőségeket. A dokumentáció igazítása az érintett változások része legyen, ne újabb külön karbantartási hullám.

## 8. A három izolált próba részletei

A próbák a meglévő `workflow.test.mjs` ideiglenes bare-origin/munkarepó előkészítését használták, a repó workflow-scriptjeivel. A `WORKFLOW_ROOT` kizárólag ezekre az ideiglenes repókra mutatott. A próbák futtatása nem adott új tesztet a projekt tesztkészletéhez; az alábbi leírásból a javításkor célzott regressziós teszt készíthető.

### A. Batch-commit → újraindítási sync

- Commitolt és helyi originre feltöltött `x` terv; app-fájl módosítása.
- `close.mjs x --batch --title example`, sikeres marker-kapuval.
- Böngészős ellenőrzés nélkül `sync.mjs --require-clean`.
- **Eredmény:** exit 0; `build, lint, test, docs-check` marker-sorrend; a kódcommit fent az originen; a terv törölve; nincs várakozó commit.

Ez a npm-kapu meglétét és a preflight publikáló mellékhatását bizonyítja. A tesztfájl `broken` tartalma itt egyszerű marker, nem valódi alkalmazáshiba; a probléma az elmaradt böngészős ellenőrzés.

### B. Batch-commit → külön dokumentációs commit

- Ugyanaz az előkészítés és `close --batch`.
- Új `docs/review.md` fájl; `commit-push.mjs -m "review: example" -- docs/review.md`.
- **Eredmény:** exit 0; a második parancsban kizárólag `docs-check` marker futott; az app-módosítás és a review is az originre került.

A `commit-push` megadott path-ja helyes volt, idegen stage-elt fájl nem kellett a jelenséghez. A rés a korábbról várakozó commitok publikálása.

### C. Hibás commit → commitolatlan javítás → sync

- Az app-fájl `broken` tartalma helyi commitba került, push nélkül.
- A munkafában ugyanaz a fájl `fixed` lett, commit nélkül.
- A kapu tesztparancsa minden npm-lépésnél csak akkor adott 0-t, ha a munkafa fájlja pontosan `fixed`.
- Sima `sync.mjs` futott.
- **Eredmény:** exit 0; a kapu minden lépése sikerült; az origin fájlja `broken`, a munkafáé `fixed`; a `git status` továbbra is módosított app-fájlt mutatott.

Ez közvetlenül bizonyítja, hogy a kapu és a publikált commit állapota eltérhet. A javítás regressziós tesztje azt várja majd, hogy ez a publikálás megálljon.
