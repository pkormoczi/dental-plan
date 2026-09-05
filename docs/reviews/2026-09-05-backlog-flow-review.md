# A backlog- és implementációs flow értékelése

## Vezetői összefoglaló

A jelenlegi rendszer mögötti gondolkodás erős: külön kezeli az ötletet, a tervezést, az implementációt, az ellenőrzést és a publikálást; világos scope-határokat ad az agentnek; valamint valódi gépi kapukkal védi a kódot és a dokumentációt. Ez lényegesen tudatosabb az általános „kérd meg az AI-t, hogy implementálja” munkamódnál.

A fő probléma nem a tervek vagy az ellenőrzések minősége, hanem a git-állapotátmenetek konzisztenciája. A flow nagyon pontosan szabályozza, mit mondjon és mit ne tegyen az agent, de nem határozza meg egyértelműen, mikor kerül egy backlog-fájl commitba és az `origin/master` ágra. Emiatt egy új tétel dokumentált alapútja több ponton megakadhat.

Röviden: ez jelenleg egy jól átgondolt első verzió, nem még egy végig bizonyított, kezdőbarát végrehajtási rendszer.

## A jelenlegi működés

Az alapfolyamat:

```text
ötlet
  → /idea
backlog/idea/<slug>.md
  → /plan
backlog/<slug>.md
  → /implement
kód + tesztek, commit nélkül
  → /finish
tesztek + dokumentáció + backlog-fájl törlése + lokális commit
  → emberi ellenőrzés
  → /push-backlog-item
origin/master
```

A fő skillek felelőssége:

- `/idea`: rögzíti és deduplikálja az ötletet, de nem tervez és nem commitol.
- `/plan`: feltérképezi a kódot, interjúzik, döntéskész tervet ír, és az ötletet a backlog gyökerébe mozgatja.
- `/implement`: a terv scope-ján belül implementál és tesztel, de nem commitol.
- `/finish`: újra lefuttatja a kapukat, szükség esetén dokumentál, törli a backlog-tételt, majd lokálisan commitol.
- `/push-backlog-item`: a lokális masteren várakozó commitokat feltolja az `origin/master` ágra.
- `/backlog`: csak listáz és állapotot jelez; nem rangsorol.

Ezeket egészítik ki a felhasználói és architekturális review-skillek, a PDF/CSS/billentyűzetes hozzáférhetőségi manuális ellenőrzések, valamint a külön futtatott changelog- és feature-dokumentációs skillek.

## Ami jól működik

- Az ötlet, a terv és az implementáció különválasztása jó agentic minta.
- A terv `Goal`, `Current state`, `Approach`, `Decisions` és `Verification` részei megfelelő kapaszkodót adnak az implementációnak.
- Az agent nem bővítheti csendben a scope-ot, és nem döntheti el önállóan a tervben nyitva maradt termékkérdéseket.
- Az implementációhoz megfigyelhető viselkedést leíró teszt szükséges.
- A build, lint, teszt és `docs-check` valódi minőségi kaput alkot.
- A termék hard invariánsai központilag és jól láthatóan szerepelnek.
- A kész backlog-tételek törlése indokolható: a git history jobb történeti tár, mint egy kézzel karbantartott `done/` mappa.
- A `docs-check` olcsó, determinisztikus hibákat fog meg, és a CI is futtatja a fő ellenőrzéseket.
- A `Type: doki` elkülöníti az emberi munkát az implementálható feladatoktól.
- A baseline-preflight felismeri, hogy a terv és az implementáció között elmozdulhatott a kód.

## Kritikus problémák

### 1. Hiányzik a backlog-fájlok egyértelmű commit/push életciklusa

Az `/idea`, a `/plan` és az `/implement` nem commitol. A `/finish` viszont csak akkor zárja le a tételt, ha a tervezett backlog-fájl már megtalálható az `origin/master` gyökerében.

Egy új tételnél ezért hiányzik egy kötelező, dokumentált átmenet:

```text
/plan után a tervezett backlog-fájl commitolása és pusholása
```

Enélkül:

- a `/finish` úgy érzékelheti, hogy a tételt máshol már lezárták;
- az `origin/master` állapotából induló worktree nem kapja meg a tervfájlt;
- egy teljesen új, még követetlen ötletnél a `git mv` vagy `git rm` sem a feltételezett módon működik;
- a „git history a történet” elv nem teljesül, ha a tétel soha nem került commitba.

A jelenlegi backlog-elemek már követettek, ezért velük a flow egy része működhet. A hiba elsősorban az ezután létrejövő új tételeket érinti.

### 2. A helyi master túl sok szerepet kap

A default folyamatban a helyi master egyszerre:

- backlog-munkaterület;
- implementációs munkaterület;
- manuális ellenőrzésre váró staging terület;
- több commitból álló push-queue.

Ez törékeny, különösen kezdő fejlesztőként vagy párhuzamos agent-sessionök mellett. Egy félbehagyott implementáció, egy új ötletfájl vagy egy helyi konfigurációs fájl könnyen blokkolja a következő implementációt vagy push-t.

### 3. A push nem tételspecifikus

A `/push-backlog-item` argumentum nélkül minden `origin/master..HEAD` commitot pushol. Így véletlenül olyan commit is felkerülhet, amely még nincs manuálisan ellenőrizve, nem az aktuális backlog-tételhez tartozik, vagy egy másik session munkája.

A jelenlegi szabály valójában azt feltételezi, hogy minden lokálisan előrébb lévő commit egyszerre jóváhagyott és publikálható. Ezt a rendszer nem bizonyítja.

### 4. A baseline két eltérő referenciát kever

A `/plan` a helyi `HEAD` SHA-ját írja a tervbe, miközben az `/implement` és a `/backlog` az `origin/master` állapotához hasonlítja azt.

Ha a helyi masteren pusholatlan commit várakozik, egy új terv azonnal elmozdultnak látszhat. Eközben nem feltétlenül azt a kódállapotot vizsgáljuk, amelyből a tervezés ténylegesen kiindult. A baseline-nak egyetlen, világosan definiált referenciát kell használnia.

### 5. Rebase után nem mindig fut újra a minőségi kapu

A push-flow konfliktusmentes rebase után nem futtatja újra a build, lint és teszt kaput. Konfliktus nélkül is megváltozhat azonban a lokális commitok és az új base együttes viselkedése.

Biztonságosabb invariáns:

> Ha a tesztelés óta megváltozott a base commit, a teljes minőségi kapu újra lefut.

### 6. Nincs tulajdonos által megadott prioritás

Helyes, hogy az agent nem dönt önállóan a prioritásról. Ebből azonban nem következik, hogy prioritás egyáltalán ne legyen.

A backlog növekedésével a „doki választ” modell egyre nagyobb mentális terhet okoz. Legalább egy ember által jóváhagyott `now | next | later` jelzés vagy explicit sorrend szükséges. Az agent tehet indokolt javaslatot, de a végső döntés maradjon a terméktulajdonosé.

### 7. A review-skillek felelőssége nem egységes

Egyes review-k automatikusan backlog-fájlokat hoznak létre, mások csak jelentést készítenek, a `manual-checks` pedig bizonyos esetekben alkalmazáskódot is módosíthat.

Ez elmossa a review és az implementáció határát. A review alapértelmezésben találatot, bizonyítékot és javaslatot készítsen. Alkalmazáskódot külön, explicit implementációs lépés módosítson.

### 8. Sok a koreográfia és a részben ismétlődő igazságforrás

A folyamat több helyen jelenik meg:

- root `CLAUDE.md`;
- `backlog/CLAUDE.md`;
- `backlog/README.md`;
- az egyes skill-fájlok;
- `scripts/docs-check.mjs`.

Az authority le van írva, de a `docs-check` csak a gépileg ellenőrizhető alakot és a hivatkozások feloldhatóságát vizsgálja. Azt nem tudja bizonyítani, hogy a különböző leírások szemantikailag ugyanazt a folyamatot mondják.

Az agent-szabályoknak elsősorban a veszélyes vagy visszafordíthatatlan hibákat kell megakadályozniuk. A túl részletes koreográfia növeli a karbantartási és tanulási költséget.

### 9. A workflow eszközfüggő

A rendszer a `.claude/skills` és a `CLAUDE.md` mechanizmusára épül. Más agentek ezeket nem feltétlenül töltik be automatikusan, és a slash commandokat sem biztos, hogy végre tudják hajtani.

Több agent támogatásához szükséges egy hordozható belépési pont, például:

- `AGENTS.md` a közös invariánsokhoz és a workflow rövid összefoglalásához;
- agentfüggetlen `scripts/workflow/*` parancsok a determinisztikus git- és validációs lépésekhez;
- vékony, eszközspecifikus skillek, amelyek ezeket a közös parancsokat hívják.

## Javasolt célfolyamat

Kezdő fejlesztőként a biztonságos alapértelmezés legyen branch-, worktree- és PR-alapú:

```text
/idea
  → backlog-fájl commitolva és megosztva

/plan
  → tervfájl commitolva és megosztva a masteren

/implement
  → külön branch/worktree az origin/masterből

/finish
  → teljes minőségi kapu
  → backlog-tétel törlése
  → commit
  → normál branch push
  → PR

CI + kézi ellenőrzés
  → merge
```

A célállapot fontos szabályai:

- Az alkalmazáskód ne közvetlenül a masteren készüljön.
- A worktree vagy feature branch legyen az alapértelmezés, ne különleges mód.
- A backlog minden megosztott státuszváltozása legyen commitolt állapot.
- A `/plan` után a terv kerüljön a masterre, mielőtt implementációs branch indul.
- Első branch-pushnál normál `git push -u` fusson; force push csak indokolt, explicit rebase után legyen megengedett.
- Rebase vagy base-változás után mindig fusson újra a teljes minőségi kapu.
- A push és a lezárás egy konkrét slughoz és branchhez tartozzon.
- Review-skill ne módosítson automatikusan alkalmazáskódot.
- A backlog kapjon ember által jóváhagyott `now | next | later` prioritást.
- A dokumentációs hatás már a tervben legyen eldöntve: például `none`, `changelog`, `features`, `product/context`.

Egyetlen sessionös, gyors javításokra fenntartható egy egyszerűsített fast path, de ennek is tételspecifikusnak, tiszta git-állapotúnak és teljes kapuval ellenőrzöttnek kell lennie.

## Ajánlott javítási sorrend

1. Egyértelműen definiálni, mikor commitolódik és mikor kerül az originre az idea- és a tervfájl.
2. A külön branch/worktree + PR modellt alapértelmezetté tenni alkalmazáskódnál.
3. A push-t tételspecifikussá tenni, és megszüntetni az összes lokális commit implicit feltöltését.
4. Egységesíteni a baseline referenciáját.
5. Minden base-változás után kötelezővé tenni a teljes kaput.
6. Bevezetni egy tulajdonos által jóváhagyott, minimális prioritási modellt.
7. Egységesíteni a review-skillek megerősítési, módosítási és jelentésmegőrzési szabályait.
8. A determinisztikus workflow-részeket közös scriptekbe emelni, az agent-specifikus skilleket pedig vékonyítani.

## Agentic fejlesztési tanulságok

A jó agentic workflow nem attól jó, hogy sok szabálya van. Három kérdésre kell egyértelmű választ adnia:

1. Mi az igazságforrás?
2. Melyik állapotváltozás mikor válik commitolt és megosztott állapottá?
3. Milyen gépi bizonyíték szükséges a következő lépéshez?

A jelenlegi rendszer az első és a harmadik kérdésre erős választ ad. A második kérdés rendezetlensége okozza a legtöbb gyakorlati kockázatot.

Kezdőként érdemes minden tételnél ragaszkodni a következőkhöz:

- kis, egyértelműen lezárható scope;
- implementáció előtt jóváhagyott cél és elfogadási kritérium;
- az agent által készített diff emberi átnézése;
- konkrétan felsorolt és valóban lefuttatott ellenőrző parancsok;
- egy feladatot tartalmazó commit vagy PR;
- termékdöntések emberi jóváhagyása;
- reprodukálható scriptek az agent szabad szöveges ígéretei helyett.

## Összértékelés

- Koncepcionális minőség: erős.
- Tesztelési és scope-fegyelem: erős.
- Git-tranzakciók konzisztenciája: fejlesztendő.
- Kezdőbarátság: jelenleg túl összetett.
- Több agent vagy párhuzamos session támogatása: deklarált, de a tervfájl életciklusa miatt még nem megbízható.
- Érettség: jól átgondolt első verzió, amelynek a git-állapotgépét egyszerűsíteni és bizonyítani kell.

A legelső javítandó terület nem egy új skill, hanem a backlog-fájlok commit/push életciklusának egyetlen, félreérthetetlen szabálya. Erre lehet biztonságosan ráépíteni a branch/PR-modellt, a prioritást és a hordozható agent-integrációt.
