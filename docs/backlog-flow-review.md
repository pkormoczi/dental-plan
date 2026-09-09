# Backlog flow — aktuális hibák és javítási lehetőségek

Dátum: **2026-09-09**. Vizsgált HEAD: `a69fd3d96efe672edd859ae132cbf17d9c08d95f`.
Állapot: **döntés-előkészítő review**, nem elfogadott workflow-módosítás.
A súlyosság műszaki kockázatot jelez, nem backlog-`Prio`.

## Értékelés és hatókör

**A fő javítandó terület a publikálás és a lezárási bizonyíték összekötése.** A batch
helyi commitokat halmoz fel, miközben más parancsok ezeket a batch befejezése előtt
is publikálhatják. Ehhez társul a munkafa és a publikált commit eltérésének lehetősége,
a tételhatárok hiányos védelme és a megszakadt futások néhány hibás folytatási útja.

A meglévő egyfájlos backlog-modell, a soros végrehajtás és a masteres alapút mellett
ezek javíthatók. A következő hatékonysági nyereség a közvetlenül ismételt kapuk
megszüntetéséből és az egyértelmű, folytatható átmenetekből várható.

A vizsgálat a gyökérkontextust, a `PRODUCT.md`-t, a backlog fájlalakját és README-jét,
az idea/plan/implement/finish/backlog és batch skilleket, a review- és dokumentációs
skillek kapcsolódó részeit, a workflow-scripteket és tesztjeiket, valamint a CI és
az alkalmazás tesztparancsait fedte le. A workflow-források a vizsgált HEAD-hez képest
nem tartalmaztak helyi módosítást. A README a munkafa aktuális változata alapján
szerepel az összevetésben.

| Ellenőrzés | Eredmény és korlát |
|---|---|
| `node --test scripts/workflow/workflow.test.mjs` | **25/25 sikeres**, kb. 34,7 másodperc. Ideiglenes Git-repók, markerrel helyettesített npm-kapuk. |
| Hat célzott, izolált Git-próba | **Mind a hat rés reprodukálható.** A lépések és eredmények a dokumentum végén. |
| Aktuális backlog | **0 terv, 16 ötlet; ebből 15 `later`.** Jelenleg nincs bizonyított túlméretezett tervezési készlet vagy aktív tervek közötti függőségi torlódás. |
| Alkalmazáskapu, böngészős bejárás | Nem futott; ez a review a fejlesztési folyamatot vizsgálja. |

A próbák kizárólag saját ideiglenes bare originre pusholtak. Az alkalmazáskód,
a workflow-scriptek és a backlogtételek változatlanok maradtak. A megállapításokhoz
javasolt regressziós tesztek még nem részei a tesztkészletnek.

## F1. A publikálási tartomány nincs a folyamat engedélyezett végpontjához kötve

**Súlyosság: magas. Bizonyosság: reprodukált scriptviselkedés + skill-összevetés.**

Az [`implement-batch`](../.claude/skills/implement-batch/SKILL.md) első lépése
`sync.mjs --require-clean`. A [`sync`](../scripts/workflow/sync.mjs) minden
`origin/master..HEAD` commitot publikál a négy npm-kapu után; a batch szükséges
böngészős ellenőrzéséről nincs információja.

Megszakadáskor ezért a `close --batch` által elkészített, még böngészőben nem
ellenőrzött commitot a következő preflight felviszi. Utána a slug-validáció megállhat,
mert a lezárás már törölte a tervet. A `close --batch` saját folytatási képessége ezt
nem oldja meg: a skill korábbi lépése addigra publikált. A `plan-batch` ismétlése is
ütközik a kizárólag `idea` állapotú bemenet követelményével, ha néhány terv már elkészült.

A [`commit-push`](../scripts/workflow/commit-push.mjs) külön docs/backlog-commitja
szintén felviszi az előtte várakozó kódcommitokat, kizárólag `docs-check` mellett.
Az idegen stage-elt fájl őre az új commitot védi, a teljes push-tartományt nem.
A `prio` ezt a publikáló utat használja; a normál `close` is a teljes helyi mastert pusholja.

**Javaslat:** a frissítés és a publikálás legyen külön művelet. Minden publikáló
belépési pont ugyanazt az engedélyezett commit-tartományt és bizonyítékot ellenőrizze.
A docs/backlog-út álljon meg, ha idegen várakozó kódcommitot vinne magával.
A batch minimális, tartós futásállapota tartalmazza az induló commitot, a slugokat és
sorrendjüket, a kész/kimaradt tételeket, a következő lépést és a hiányzó ellenőrzéseket.
Ez végrehajtási adat; a backlog fájlalakját nem kell új `Status` mezővel bővíteni.

**Elfogadás:** megszakítás után ugyanaz a batch a következő hiányzó lépésnél folytatódik;
preflight, külön docs-commit vagy másik tétel lezárása nem publikál befejezetlen batcht.
A pusztán hiányzó tételfájl vagy hasonló commitüzenet önmagában nem bizonyít lezárást.

## F2. A zöld kapu és a publikált commit eltérő tartalmat jelenthet

**Súlyosság: magas. Bizonyosság: reprodukált.**

A [`sync`](../scripts/workflow/sync.mjs) csak `--require-clean` mellett követel
tiszta munkafát. A záró batch-lépés és több helyreállítási utasítás sima `sync`-et hív.

A próbában egy `broken` tartalmú helyi commit mellett a munkafában `fixed` volt.
A kapu minden lépése csak a `fixed` tartalomra adott sikert. A sync mégis exit 0-val
publikálta a `broken` commitot, miközben a javítás commitolatlan maradt.

A [`pushMaster`](../scripts/workflow/lib.mjs) rebase utáni `--autostash`-os útja
sem teszi azonossá automatikusan a munkafát és a commitot. A CI később felfoghat egy
alkalmazáshibát, de a helyi kapu ettől még más állapotot bizonyított.

**Javaslat:** a publikálás kötelező feltétele legyen a tiszta munkafa és index, valamint
az ellenőrzött commit/tartalom azonosítása. Kapujavítás után előbb a javítás commitja,
azután az ahhoz tartozó kapu és push következzen. Az ellenőrzés után keletkező módosítás
is érvénytelenítse a bizonyítékot; ezt ne opcionális hívói kapcsoló biztosítsa.

**Elfogadás:** a fenti `broken`/`fixed` helyzetben nincs push. A hibaüzenet a javítás
commitolását és az újraellenőrzést kéri, nem pusztán ugyanannak a syncnek az ismétlését.

## F3. A lezárás hatóköre követett fájloknál és batch-kimaradásnál hiányos

**Súlyosság: magas. Bizonyosság: a követett fájl besöprése reprodukált;
a batch-kimaradási út a skillből és a scriptből levezetett.**

A [`close`](../scripts/workflow/close.mjs) az untracked fájlokat szűri, de
`git add -u`-val minden követett módosítást stage-el. A próbában az app saját változása
mellett egy független, követett `docs/foreign.md` módosítása is a lezáró commitba és
az originre került. Az `app/` alatti új fájlokat is automatikusan beveszi; a könyvtár
önmagában nem bizonyítja a tételhez tartozást.

Az [`implement-batch`](../.claude/skills/implement-batch/SKILL.md) módosított tervfájl
miatti hibánál csak a terv visszaállítását írja elő, majd kimaradást és továbblépést.
Az appban elkészült változás így a következő tételbe kerülhet. Az általános
`git checkout -- <fájlok>` sem teljes visszaállítás, ha az index már módosult:
alapértelmezésben az indexből tölti vissza a munkafát.

**Javaslat:** minden tétel induljon ismert commitból és tiszta állapotból, a lezárás
pedig ellenőrzött fájllistát fogadjon el. Kimaradáskor a tétel saját indexe, munkafája
és új fájljai együtt álljanak vissza az induló állapotra. Idegen vagy bizonytalan
eredetű változásnál megőrzés és megállás kell. Ugyanazon fájl közös módosításánál
a fájllista mellett diff-ellenőrzés is szükséges.

**Elfogadás:** idegen követett fájl miatt a close megáll és megőrzi a módosítást;
egy kimaradt tétel staged és unstaged diffje sem kerülhet a következő commitba.

## F4. A böngészős és emberi elfogadás nincs a végleges kódállapothoz kötve

**Súlyosság: magas, különösen a kézi kapu nélküli úton.
Bizonyosság: a jelenlegi szerződésekből levezetett.**

Az [`implement`](../.claude/skills/implement/SKILL.md) és az
[`implement-batch`](../.claude/skills/implement-batch/SKILL.md) a böngészőben talált
hiba javítása után npm-kaput kér, de nem egyértelműen az eredeti böngészős ellenőrzés
ismétlését. Egy zöld jsdom-teszt például nem bizonyítja a javított kontrasztot.

További hiányok:

- A batch csak a saját `Kritikus` találatát javíttatja kötelezően. Egy alacsonyabb
  súlyosságú találat is jelentheti a tétel `Goal`-jának vagy elfogadásának bukását.
- A szükséges, de a rendelkezésre álló eszközzel nem ellenőrizhető elfogadásnak
  nincs világos batch-következménye.
- A batch nem ment tartós ellenőrzési eredményt; a tervek addigra törlődnek,
  a szeletválasztás és eredmény a session emlékezetére marad.
- A böngészős vagy kézi ellenőrzés után a `close` fetch/ff-je, illetve a publikálás
  rebase-e megváltoztathatja az integrált kódállapotot. A script csak npm-kaput ismétel;
  a korábbi böngészős/emberi bizonyíték érvényességét nem értékeli újra.

**Javaslat:** az elfogadás három eredménye legyen teljesült, nem teljesült és nem
ellenőrizhető. A tétel céljának bukása súlyosságtól függetlenül blokkolja a lezárást.
Javítás után ismételjük az érintett ellenőrzést. Rövid futási bizonyíték rögzítse
a kódállapotot, a szeleteket és eredményüket. Rebase/ff után az érintett elfogadási
bizonyítékot is újra kell értékelni, és szükség esetén megismételni.

Ha a hiba csak a batch végén derül ki, a már commitolt tétel sem tekinthető késznek:
javítás és újramérés, vagy a függőségeket figyelembe vevő kivétel/újranyitás szükséges
publikálás előtt. Nem elég kimaradtként megemlíteni, miközben a kódja a láncban marad.

**Elfogadás:** hibás vagy szükséges, de nem ellenőrzött cél nem kerül „lezárva” állapotba;
a publikált tartalomhoz visszakereshető, érvényes ellenőrzés tartozik.

## F5. A `--add`-os lezárás ugyanazzal a hívással nem folytatható push-hiba után

**Súlyosság: közepes. Bizonyosság: reprodukált.**

A [`close`](../scripts/workflow/close.mjs) a `--add` pathokat a folytatás felismerése
előtt validálja, és már követett fájlt nem enged. Ha az első futás a jelentést és a
kódot már commitolta, de a push megbukott, ugyanaz a `--add docs/report.md` a következő
futásban „már követett fájl” hibát okoz. A meghirdetett folytatás-mód nem érhető el
ugyanazzal a paranccsal. Ez a normál manual-check jelentéses út hibája.

**Javaslat:** a script előbb különböztesse meg az új lezárást és a folytatást.
Folytatásnál az előző lezáró commitban szereplő, változatlan jelentés legyen elfogadható;
módosított vagy idegen fájl továbbra is állítsa meg. A hibaüzenet őrizze meg a branch,
slug és szükséges argumentumok kontextusát.

**Elfogadás:** sikertelen push után ugyanaz a teljes hívás új commit nélkül publikál;
a bizonyítékfájl megváltozása esetén megáll.

## F6. A kapuválasztás nem követi megbízhatóan a tényleges változás hatását

**Súlyosság: közepes. Bizonyosság: reprodukált út + parancs- és CI-összevetés.**

A [`commit-push`](../scripts/workflow/commit-push.mjs) tetszőleges megadott pathot
elfogad, de mindig csak `docs-check`-et futtat. A próbában közvetlenül app-fájlt is
publikált ezzel az egy kapuval. A README „csak backlog/docs fájlt visz” állítása tehát
hívói fegyelem, nem gépi korlát.

A [`lib.mjs`](../scripts/workflow/lib.mjs) teljes kapuja `build/lint/test/docs-check`.
Az [`app/package.json`](../app/package.json) szerint a `test` Vitestet futtat,
a `test:workflow` külön parancs. A workflow-tesztek a
[CI-ban](../.github/workflows/deploy.yml) futnak, a helyi teljes kapuban nem.
Workflow-script módosításakor így éppen a saját átmenettesztek maradnak ki a push előtti
kötelező ellenőrzésből.

A `docs/` sem egységes kockázati kategória: a
[`ChangelogCard`](../app/src/components/ChangelogCard.tsx) és a
[`FeatureOverviewCard`](../app/src/components/FeatureOverviewCard.tsx) a CHANGELOG és
FEATURES fájlokat `?raw` importtal az appba építi. Ezek futásidejű tartalmi bemenetek.

**Javaslat:** a kapu a teljes publikálandó diff hatása alapján választódjon.
Workflow-változásnál fusson `test:workflow`; app-változás ne mehessen ki puszta
`docs-check` mellett. Különüljön el a tisztán szerkesztői dokumentum, az appba importált
tartalom és a workflow/konfiguráció. Ismeretlen hatásnál maradjon a teljes kapu.
A docs-only könnyítés előfeltétele az F1 tartományvédelme.

**Elfogadás:** az app-pathos próba megáll vagy megfelelő kaput futtat; workflow-diffnél
a helyi publikálás futtatja a workflow-teszteket is. A review-fájl puszta átírása
nem kényszerít indokolatlan alkalmazástesztelést.

## F7. A közvetlenül ismételt teljes kapuk csökkentik a batch nyereségét

**Súlyosság: közepes, hatékonysági költség. Bizonyosság: a hívásláncból számolható;
a várható időnyereség nem mért.**

Az `implement-batch` 1c lépése `build+lint+test`, majd az 1e-ben hívott `close --batch`
ugyanezt futtatja. A végső sync teljes kapuval zár. Javítás és rebase nélküli boldog
úton **N tételre 2N+1 helyi alkalmazásteszt-futás** jut, majd a CI.
Az egytételes úton az `implement`, a `finish` eleje és a `close` is teljes kört kér.
A kizárólag tervfájlokat író `plan-batch` végén is teljes app-kapu fut.

**Javaslat:** batchben a kötelező commit előtti teljes kapu tulajdonosa a `close`
legyen. A skill előtte célzott fejlesztői teszteket futtasson, majd diffet ellenőrizzen.
Így a boldog út N+1 teljes helyi körre csökkenthető a végső integrációs kapu megtartásával.
Ehhez nem szükséges ellenőrzés-cache vagy általános `--skip-tests` kapcsoló.

Az egytételes úton az emberi átadás előtti kapu megmaradjon; először a `finish` és
`close` közvetlen ismétlését érdemes megszüntetni. Javítás és rebase utáni szükséges
ellenőrzést az egyszerűsítés ne távolítson el.

**Elfogadás:** egy N tételes változatlan boldog út kapunaplója igazolja a kevesebb
futást, a piros kapu továbbra is megakadályozza a commitot/push-t.

## F8. A drift az alkalmazáskódra szűkül, a hibajelzése pedig nem egységes

**Súlyosság: közepes. Bizonyosság: közvetlen kód- és skill-összevetés.**

A [`drift.mjs`](../scripts/workflow/drift.mjs) `CODE_PATHS` listája kizárólag
`app`, `data`, `assets`. Egy workflow-tétel alapjául szolgáló `scripts/`, skill- vagy
CI-változás emiatt önmagában „nincs drift” eredményt ad. A termékszándék és az appba
importált docs-tartalom változása is kívül esik ezen. A `/plan` írás előtti
újraellenőrzése ugyanezt az útvonallistát használja.

A `drift --all` az egyedi hibákat kiírja, de elnyeli és sikeres kilépéssel zár.
Az egytételes `/implement` explicit kezeli az exit 1-et; az `implement-batch` csak
a drift/exit 2 ágat részletezi. Így egy hibás baseline és egy érvényes elmozdulás
kezelése batchben nem teljes szerződés.

**Javaslat:** különböztessük meg az app-, workflow- és releváns szándékváltozást.
A közös besorolás bővíthető az F6 hatásvizsgálatából; a jelzés ne állítsa azt, hogy
minden tervfeltevés friss. Érvénytelen baseline esetén legyen egyértelmű nem nulla
kilépés/strukturált hibajelzés és explicit batch-kezelés. A terv baseline-ját továbbra
sem kell automatikusan átírni.

**Elfogadás:** csak workflow-forrásban történt módosítás is felülvizsgálatot kér
workflow-tételnél; hibás baseline nem minősül változatlan, végrehajtható tervnek.

## F9. A README, a belépési fájlok és a skillek több ponton eltérnek

**Súlyosság: közepes. Bizonyosság: közvetlen szöveg-összevetés.**

Az [`AGENTS.md`](../AGENTS.md), a [gyökér CLAUDE.md](../CLAUDE.md), a
[backlog CLAUDE.md](../backlog/CLAUDE.md), a [README](../backlog/README.md) és a
skillek között jelenleg ezek az eltérések maradnak:

| Eltérés | Következmény / javasolt rendezés |
|---|---|
| „Minden állapotváltozás azonnal commit + push”, „nincs várakozó helyi commit” | A batch tudatos kivétel. A közös szerződés mondja ki a helyi commit és a publikálható állapot különbségét. |
| A rövid kontextus „kapu nélkül” említi a batcht | Pontosan „kézi kapu nélkül”; a gépi bizonyíték kötelező. |
| A README changelog/features-megerősítést ír; a két skill megállás nélküli végrehajtást | Az aktuális jóváhagyási szerződés szerepeljen minden érintett helyen. |
| A README 10b példája három külön `/idea` commitot mutat; az `/idea` már több kiválasztott ötletet ír egy commitban | A közös review-feldolgozás példája mutassa a már létező csoportos bemenetet. |
| A README batch-táblája minden kétséges tételt `idea/` alatt maradónak ír | Implementációs kimaradáskor a fájl tervezett marad. A két batch-fázis különböző állapotot hagy. |
| Kimaradt tervre `/plan <slug>` újratervezés az útmutatás, de a `/plan` a már tervezett fájlt alapból elutasítja | Legyen pontos újratervezési eljárás, a szükséges tartalom-, baseline- és commit-átmenettel. |
| A `/plan` írás előtti párhuzamossági ellenőrzése csak `backlog/<slug>.md`-t említ | A `later/` alatti már tervezett példányt is a közös `findItem` feloldással kell vizsgálni. |

**Javaslat:** a determinisztikus átmeneteket a script és az átmenetteszt hordozza;
a skill az ítéletet igénylő részt, a README a magyarázatot. A belépési fájlok röviden
a közös szerződésre mutassanak. A működési javítás és a kapcsolódó leírás igazítása
egy változás legyen. A `docs-check` hivatkozást és alakot ellenőriz, ezt a szemantikai
egyezést nem bizonyítja.

## F10. A review → idea átadásnak nincs visszakövethető feldolgozási állapota

**Súlyosság: közepes, rendszeres emberi többletmunka.
Bizonyosság: a review/idea-szerződésekből és a jelenlegi használatból látható.**

Az `/idea` rögzíti a forrást, de a jelentésbe nem könyveli vissza a döntést.
Az append-only review-gyűjteményből ezért nem derül ki, mely észrevétel került
backlogba, melyik eldöntetlen és melyik elvetett. A doctor-review dedupja csak a
korábbi doctor-review jelentéseket olvassa; a review-típusok közötti összevetés nem
egységes. A kész backlogfájlok törlése után a puszta sluglista a javítást sem bizonyítja.

**Javaslat:** megállapításonkénti döntéstábla, feldolgozatlan jelentések és archívum,
közös dedup minden review-típushoz. Idea létrehozásakor a forrásjelentés döntése is
ugyanabban a commitban frissüljön. A „feldolgozott” és a „kijavított” külön jelentésű
maradjon. A részletes javaslat a
[review-jelentések kezeléséről szóló dokumentumban](review-jelentesek-kezelese-javaslat.md)
található; ez még nem bevezetett működés.

## További optimalizálási lehetőségek

Ezek tervezési javaslatok, nem a jelenlegi backlogban reprodukált hibák.

### O1. Függőség előbb, közös fájl utána

Az `implement-batch` csak terület szerinti sorrendezést ír elő. Új batchnél először
az előfeltételeket és a kimaradások hatását érdemes feltérképezni, utána csoportosítani
a közös fájlok alapján. Ha A előfeltétel kimarad, B ne induljon el pusztán azért,
mert ugyanazt a fájlt érinti. Kezdetnek elegendő a futásállapotban egy
`tétel | előfeltétel | kimaradás következménye` táblázat; új kötelező backlogmező csak
gépi ellenőrzéssel együtt indokolt. Jelenleg nincs aktív terv, ezért konkrét élő
tételfüggőséget ez a review nem állít.

### O2. A batch méretét és az emberi elfogadást külön döntsük el

A mai flow a többtételes végrehajtást összeköti a kézi kapu elhagyásával.
Hasznos lehet több eldöntött UX-feladat soros megvalósítása egyetlen közös emberi
átadással. Egy kis, bizonyítható feladat pedig önmagában is kaphat előzetes
felhatalmazást a végigvitelre. A kockázatot a nyitott döntés, az érintett adat- és
szerződéses határ, valamint az elfogadási bizonyíték határozza meg; az „egy mondatban
leírható” legfeljebb durva szűrő.

Ezt az F1–F4 rendezése után érdemes kipróbálni. Először egy kisebb végrehajtási
csoporton mérjük a teljes kapuidőt, az aktív emberi időt és az utólagos javításokat.
A több elkészült tétel önmagában nem bizonyít hatékonyabb munkát.

### O3. A gyors előfeltételek a drága kapu előtt fussanak

A `close` a módosított tervet csak a teljes kapu után, a `git rm` hibájából ismeri fel.
Ezt olcsó előellenőrzés is felismerhetné. Fetch/ff után a tétel helyét és státuszát is
újra kell feloldani: a script most a `findItem` eredményét a frissítés előtt számolja.
Így egy közben `later/` alá mozgatott tételt a régi útvonalon kereshet.

A gyors, ismételhető előellenőrzés csökkentené a szükségtelen kapufutásokat és a
félrevezető „máshol lezárták?” hibákat. A végső törlés és commit saját védelme ettől
még maradjon meg, mert az ellenőrzés óta is változhat az állapot.

## Javasolt javítási csomagok és sorrend

Ez műszaki függőségi sorrend; nem hoz létre backlogtételeket és nem ír prioritást.

1. **Publikálás és folytatás:** F1–F2, F5. Közös tartományvédelem, azonos ellenőrzött
   és publikált tartalom, tartós batch-állapot, argumentumokat megőrző folytatás.
2. **Tételhatár és elfogadás:** F3–F4, O1. Kimaradás tranzakciója, ellenőrzött
   fájlkör, célalapú elfogadás, javítás/rebase utáni érvényes bizonyíték.
3. **Kapuk és előellenőrzés:** F6–F8, O3. Hatás szerinti kapu, workflow-tesztek,
   duplázás csökkentése, releváns drift és korai hibajelzés.
4. **Napi használat egyszerűsítése:** F10 és O2. Review-k feldolgozása, majd közös
   emberi átadás kísérlete, az emberi idő és utólagos hibák mérésével.

Az F9 leíráseltéréseit az érintett csomagokkal együtt kell rendezni. A backlog
jelenlegi mérete alapján külön priorizálási rendszer vagy tervezési készletkorlát
bevezetésére nincs bizonyított igény.

## A hat célzott próba és a szükséges regressziós védelem

Minden próba saját ideiglenes master/munkarepót és helyi bare origint használt,
a jelenlegi workflow-scriptekkel. A `WORKFLOW_ROOT` ezekre a repókra mutatott;
a `WORKFLOW_GATE_CMD` a kapulépéseket naplózta. Az alábbiak a 2026-09-09-i futás
eredményei, nem korábbi mérések átvételei.

| Próba | Lépések | Megfigyelt eredmény | A javítás után elvárt védelem |
|---|---|---|---|
| A | Commitolt terv → app-módosítás → `close x --batch` → böngészős ellenőrzés nélkül `sync --require-clean` | Exit 0; a batch kódja az originen. | A preflight nem publikálhatja. |
| B | Ugyanilyen batch-commit → új docs-fájl → `commit-push` csak arra a fájlra | Exit 0; az app-commit is felkerül; a második parancsban csak `docs-check` fut. | Idegen várakozó kódcommit miatt megállás. |
| C | `broken` app-tartalom helyi commitban → `fixed` a munkafában → csak `fixed` esetén sikeres kapu → sima sync | Exit 0; a kapu zöld, az originen `broken`, a munkafában `fixed`. | Eltérő munkafa miatt nincs push. |
| D | Saját app-változás + független, már követett docs-fájl módosítása → normál close | Exit 0; mindkét változás a lezáró commitban és az originen. | Idegen követett fájl megőrzése és megállás. |
| E | Jelentéses close `--add`-del; nem létező helyi push-cél miatt push-hiba → cél helyreállítása → ugyanaz a hívás | Az első futás commitol; a második exit 1: a jelentés már követett. Az origin nem frissül. | Ugyanaz a hívás új commit nélkül folytatható. |
| F | App-fájl módosítása → közvetlen `commit-push -- app/a.txt` | Exit 0; app-kód publikálva, kizárólag `docs-check` mellett. | Elutasítás vagy megfelelő app-kapu. |

A további átmenettesztek a batch megszakítási pontjait, a staged/unstaged kimaradás
visszaállítását, az elfogadási eredmény érvénytelenítését és a hibás baseline-t fedjék.
A marker-kapu az átmeneteket bizonyítja; az alkalmazás tényleges működését és
a böngészős mérések eredményét külön kell ellenőrizni.
