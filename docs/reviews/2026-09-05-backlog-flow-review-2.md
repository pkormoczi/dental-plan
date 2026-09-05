# A backlog- és implementációs flow második értékelése

Dátum: 2026-09-05
Vizsgált commit: `7c714ae`
Előzmény: [első backlog-flow review](2026-09-05-backlog-flow-review.md)
Módszer: dokumentáció- és kódolvasás, a skillek és scriptek szerződésének összevetése, `docs-check`.

## Összértékelés

A jelenlegi rendszer alapját érdemes megtartani. A korábbi review óta következetesebb lett:
az ötlet és a terv megosztása rendezett, a git-lépések végrehajtható scriptekbe kerültek,
a review és a javítás felelőssége tisztább.

Maradtak konkrét működési hibák az állapotátmenetekben, és néhány szabály túl sok döntést
terhel a felhasználóra. Kezdő, agenttel dolgozó fejlesztő számára az a hasznos felosztás,
amelyben a termék célját az ember határozza meg, a rutinszerű technikai döntéseket az agent
elvégzi, a veszélyes átmeneteket pedig gépi ellenőrzés védi.

A következő fejlesztési energiát a commit hatókörének védelmére, a megszakadt futások
folytathatóságára és az ellenőrzések sorrendjére érdemes fordítani.

## A vizsgálat hatóköre és bizonyossága

Áttekintett források:

- `CLAUDE.md`, `docs/PRODUCT.md`, `backlog/CLAUDE.md`, `backlog/README.md`;
- az `idea`, `plan`, `implement`, `finish` és `backlog` skillek;
- a kiegészítő review- és dokumentációs skillek releváns szerződései;
- `scripts/workflow/*.mjs`, a `scripts/docs-check.mjs` releváns szabályai;
- `.github/workflows/deploy.yml`, az alkalmazás parancsai és tesztkonfigurációja;
- a három aktuális terv, a backlog fejlécei és az előző review.

A működési megállapítások kódolvasásból és a dokumentált Git-viselkedésből következnek.
A hibautakat nem futtattam végig izolált Git-repókon; commitot, push-t vagy rebase-t nem
indítottam a vizsgálathoz. A teljes alkalmazáskaput és a böngészős ellenőrzéseket nem
futtattam, mert ez a review a fejlesztési folyamatra irányult.

A vizsgálat során a `node scripts/docs-check.mjs` eredménye: **318 fájl, 0 hiba**.
Ez a jelentés létrehozása előtti mérés; a formai ellenőrzés sikere nem bizonyítja a
workflow állapotátmeneteinek helyességét.

## A jelenlegi folyamat

| Lépés | Feladat és megállási pont |
|---|---|
| `/idea` | Rövid, deduplikált felvetés; jóváhagyás után commit + push. |
| `/plan` | Feltárás, döntések, ellenőrizhető terv; commit + push. |
| `/implement` | Megvalósítás és automatizált kapuk; commitolatlan munkafa átadása. |
| Emberi ellenőrzés | A változás kipróbálása a helyi alkalmazásban. |
| `/finish` | További ellenőrzések, szükséges dokumentáció, tételtörlés, commit + push. |
| `/backlog` | Áttekintés, prioritási javaslatok, elavulásjelzés. |
| `/doctor-review` | Felhasználói szimuláció és jelentés; külön döntéssel lesz belőle backlog-tétel. |
| `/arch-react-review` | Architektúra- és React-szempontú vizsgálat; jelentés, külön javítás. |
| `/manual-checks` | A tesztkörnyezet által nem fedett PDF-, CSS- és billentyűzetes viselkedés vizsgálata. |
| `/update-changelog`, `/update-features` | Külön kérésre a változásnapló és a funkciólista frissítése. |

A worktree változat külön branchen dolgozik, és PR-rel zár. A master-push a Pages
buildjét és sikeres kapu esetén az élesítést indítja.

## Ami a korábbi review óta javult

- Az ötlet és a terv commit/push életciklusa kimondott és scripthez kötött.
- A külön push-queue folyamat megszűnt; az alapút az azonnali megosztásra épül.
- A determinisztikus git-lépések közös, agentfüggetlen scriptekbe kerültek.
- A baseline összehasonlítása a HEAD-hez kötött, és az alkalmazást érintő diffet nézi.
- A rebase utáni új kapufuttatás megjelent a scriptekben.
- Van ember által megadható prioritás és korlátozott agenti javaslattétel.
- A review-skillek jelentést készítenek; a javítás és a backlogba vétel külön döntés.
- Az `AGENTS.md` hordozható belépési pontot ad.

Ezek érdemi javulások. Az alábbi megállapítások a megmaradt végrehajtási résekről szólnak.

## Működési megállapítások

### 1. A fájlonkénti commit nem garantálja a fájlonkénti commitot

**Jelentőség: magas — idegen módosítás kerülhet egy dokumentációs commitba és push-ba.**

A `commit-push.mjs` csak a megadott fájlokat stage-eli, de utána a teljes indexet
commitolja. Ha korábban már stage-elt alkalmazáskód van az indexben, egy `/idea` vagy
review-jelentés commitja azt is magával viheti, miközben csak `docs-check` fut.

Bizonyíték: `scripts/workflow/commit-push.mjs:27` a megadott path-okat stage-eli,
a következő sor viszont a teljes indexet olvassa. A `scripts/workflow/lib.mjs:117`
commitfüggvénye nem szűkíti a commitot path-okra. A Git alapértelmezett commitja az
index tartalmát rögzíti: [Git commit dokumentáció](https://git-scm.com/docs/git-commit).

A `close.mjs:47` minden munkafa-változást hozzáad. Az implementáció eleji
tisztaságellenőrzés nem védi ki az utána keletkező idegen fájlokat. A vizsgálatkor
két követetlen helyi konfigurációs útvonal is látszott: `.claude/settings.local.json`
és `app/.claude/`. Ezek tartalmát nem vizsgáltam; jelenlétük a hatókör-ellenőrzés
szükségességét szemlélteti.

**Javaslat:** a fájlonkénti script álljon meg, ha a kijelölt körön kívül stage-elt
változás van. Lezáráskor legyen friss scope-ellenőrzés a ténylegesen bekerülő fájlokon.
Az idegen módosításokat őrizze meg.

### 2. A baseline-frissítés el tudja törni a szabályos lezárást

**Jelentőség: magas — a dokumentált alapút zöld kapu után is megakad.**

Az `/implement` drift esetén átírja a terv `Baseline` sorát, commit nélkül. A lezárás
sima `git rm`-mel törölné ezt a módosított fájlt. A Git alapértelmezésben megtagadja a
helyileg módosított fájl ilyen törlését.

Bizonyíték: `.claude/skills/implement/SKILL.md:46`,
`scripts/workflow/drift.mjs:54`, `scripts/workflow/close.mjs:46`;
[Git rm dokumentáció](https://git-scm.com/docs/git-rm).

Az érintett út: drift → baseline átírása → sikeres implementáció → zöld kapu →
sikertelen lezárás.

Az a megfogalmazás is félrevezető, hogy a baseline-módosítást „a finish commitja viszi”:
abban a commitban a tervfájl már törlődik, az átírt tartalom nem marad meg önálló
fájlverzióként a történetben.

**Javaslat:** előbb legyen egyértelmű, hogy kell-e a tervfájlt átírni, vagy elegendő az
újraellenőrzés eredményét rögzíteni. Ha az átírás marad, a lezárásnak kifejezetten
kezelnie kell a terv megengedett módosításait és biztonságos törlését.

### 3. A megszakadt futás folytatása nincs biztonságosan végigvezetve

**Jelentőség: magas — az újrafuttatás megakadhat, illetve ellenőrizetlen commitot publikálhat.**

Worktree esetén a lezáró commit már törli a tervet, majd a rebase konfliktusba ütközhet.
A hibaüzenet új `/finish` futtatást kér a konfliktus feloldása után, de az új futás a
hiányzó terv miatt megáll. Hasonló helyreállítási probléma előjöhet későbbi push- vagy
PR-hibánál is.

Bizonyíték: `scripts/workflow/close.mjs:37` a hiányzó tervet hibának tekinti;
a törlés és a commit a rebase előtt történik; a `close.mjs:66` új `/finish` hívást kér.

Masteren másik rés van: sikeres rebase után megbukhat az új kapu, miközben a commit már
létezik. Egy későbbi sima `sync.mjs` ezt kapufuttatás nélkül feltolhatja, mert a script
minden helyi többletcommitot sikertelen push lehetséges maradványának tekint.

Bizonyíték: `scripts/workflow/lib.mjs:111` a rebase után futtatja a kaput;
`scripts/workflow/sync.mjs:20` a helyi többletcommitokat pusholja, és a push előtti kapu
csak a `--gate` kapcsolóval kötelező. Egy következő `/plan` vagy `/implement` sima syncet hív.

A CI még megakadályozhatja a hibás build élesítését, de a lokális publikálási szabály
már sérült: ellenőrizetlen állapot került a masterre.

**Javaslat:** az újrafuttatás ismerje fel, meddig jutott az előző futás, és a következő
hiányzó lépést végezze el. Ha nincs bizonyíték az aktuális commit sikeres ellenőrzésére,
publikálás előtt fusson a kapu. A javított helyreállítási út szerepeljen a hibaüzenetben is.

### 4. A kézi jóváhagyás után még változhat a jóváhagyott viselkedés

**Jelentőség: közepes — az ember által ellenőrzött és a publikált állapot eltérhet.**

A doki kipróbálja az implementációt, majd a `/finish` böngészős ellenőrzése új hibát
találhat. A skill ezt helyben javítja és utána publikálhatja. Nincs kötelező visszatérés
az emberi ellenőrzéshez, ha a javítás megváltoztatta a felhasználó által látott működést.

Bizonyíték: `.claude/skills/finish/SKILL.md:26`, különösen az „itt javítsd” utasítás és
az automatizált kapukhoz való visszatérés.

**Javaslat:** a böngészős ellenőrzések és a belőlük következő javítások kerüljenek az
emberi átadás elé. Ha a lezárás közben mégis felhasználó által látható működés változik,
az érintett esetet újra kell ellenőrizni. Egy dokumentációs javítás miatt nem kell
mindent újrajátszani.

### 5. A terv újabb baseline-t kaphat, mint amelyik kódot ténylegesen megvizsgálták

**Jelentőség: közepes — párhuzamos változásnál az elavulásjelzés elmaradhat.**

A `/plan` előbb feltár és interjúzik, majd csak a jóváhagyás után szinkronizál, és az
akkor kapott HEAD-et írja baseline-nak. Ha közben változott az alkalmazás, a régi kódra
készült terv új baseline-t kap; az implementáció drift-ellenőrzése ezt már nem jelzi.

Bizonyíték: `.claude/skills/plan/SKILL.md:125`.

**Javaslat:** a feltárás kezdetén történjen szinkronizálás. Ha írás előtt ismét változott
a releváns kód, előbb a terv érintett feltevéseit kell újraellenőrizni, és csak utána
frissíteni a baseline-t.

## A workflow-tesztek javasolt hatóköre

Néhány kicsi, ideiglenes Git-repón futó teszt közvetlenül védené a fenti átmeneteket:

- Idegen stage-elt fájl mellett a fájlonkénti commit megáll, és megőrzi az idegen munkát.
- Módosított baseline mellett a lezárás a választott szerződés szerint működik.
- Sikertelen push után a folytatás nem hoz létre újabb lezáró commitot.
- Rebase utáni piros kapu után egy későbbi sync sem publikál ellenőrzés nélkül.
- Worktree-rebase feloldása után a már commitolt lezárás folytatható.
- PR-létrehozási hiba után a folytatás nem igényli a törölt terv visszaállítását.

A jelenlegi alkalmazástesztek és a `docs-check` nem bizonyítják ezeket. A javaslat
viselkedést ellenőrző integrációs tesztekre vonatkozik, nem a scriptek sorainak
mockokkal történő visszamondására.

## Kezdőbarátság és a backlog használata

### Arányos interjú és technikai önállóság

A tervezési skill „sose feltételezz, kérdezz” szabálya túl általános
(`.claude/skills/plan/SKILL.md:64`). Termékdöntésnél hasznos az interjú; egy rutinszerű
technikai megoldásnál könnyen az emberre terheli az agent munkáját.

Azt a terméktulajdonos döntse el, hogy például a pénznem öröklődjön-e. A meglévő
architektúrán belüli segédfüggvény helyét az agent válassza meg, és indokolja meg röviden.
A jóváhagyás középpontjában a cél, a látható viselkedés, a kizárt scope és az elfogadási
feltételek álljanak.

### A gyors út kockázat alapján legyen elérhető

A `--quick` lehetőségét kis kockázatú, egyértelmű chore-ra és apró feature-re is érdemes
kiterjeszteni. A változás kockázata és bizonytalansága jobban meghatározza a szükséges
tervezést, mint önmagában a `Type`. Nyitott termékdöntés vagy invariáns-érintés esetén
továbbra is indokolt az érdemi tervezés.

### A prioritási mechanizmust el kell kezdeni használni

A vizsgálatkor 3 terv és 17 ötlet szerepelt a backlogban. Egyik tételben sem volt `Prio`,
tehát a mechanizmus elkészült, a napi használata még nem indult el.

Hetente egy rövid áttekintés elég lehet: egy aktív implementáció, néhány következő jelölt,
a többinek nem kell előre részletes terv. Ehhez most nem szükséges további státusz,
pontozórendszer vagy külön projektmenedzsment-eszköz.

### A fejlesztő és a fogorvos felelőssége különüljön el

A fogorvos a használhatóságról és a szakmai helyességről dönt. A fejlesztő vállalja a
technikai változás és a publikálás ellenőrzését. Ez akkor is hasznos különbség, ha
időnként ugyanaz az ember végzi mindkettőt. A flow „doki” megfogalmazása jelenleg ezeket
a szerepeket több helyen összemossa.

## Javasolt célfolyamat

```text
ötlet
  → arányos terv
  → implementáció
  → automatizált és szükséges böngészős ellenőrzések
  → célzott diff-review
  → emberi kipróbálás
  → lezárás
  → deploy eredményének ellenőrzése
```

A célzott diff-review az aktuális változást nézze: teljesíti-e a célt, maradt-e hibás
szélső eset, került-e bele idegen módosítás. Ehhez nem kell minden tételnél teljes
architekturális review.

Az emberi kipróbálás után a lezárás közben szükségessé váló viselkedésváltozás az
érintett ellenőrzéshez vezessen vissza.

## Master vagy branch/PR

A korábbi review kötelező branch/PR ajánlását ennél az egyfejlesztős, demóadatokkal
működő mockupnál nem tenném alapkövetelménnyé. A masteres út védhető a fenti hibák
javítása után. Párhuzamos munkánál indokolt a worktree.

A worktree/PR út használatakor a CI-t is ki kell egészíteni: a vizsgált
`.github/workflows/deploy.yml:6` csak master-pushra és kézi indításra fut, PR-re nem.
A PR önmagában így nem ad merge előtti CI-bizonyítékot. Az ellenőrzés fusson PR-re is,
az élesítés maradjon a megfelelő masteres eseményhez kötve.

## Javasolt javítási sorrend

1. A commit hatókörének gépi védelme, a módosított terv lezárásának rendezése.
2. A megszakadt futások folytathatósága és az ellenőrizetlen push megakadályozása.
3. A workflow hibautainak integrációs tesztjei.
4. A böngészős ellenőrzés, az emberi kipróbálás és a lezárás sorrendjének rendezése.
5. A baseline rögzítésének a ténylegesen vizsgált kódhoz kötése.
6. A tervezési interjú arányosítása, a prioritás használata és a szerepek tisztázása.
7. A worktree/PR út aktív használata esetén PR-re futó CI.

Ez ajánlott műszaki javítási sorrend, nem backlog-prioritás módosítása. A review nem
hoz létre backlog-tételt és nem módosít alkalmazáskódot vagy workflow-scriptet.
