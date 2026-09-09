# Javaslat a review-jelentések feldolgozására és archiválására

Dátum: 2026-09-09

Állapot: döntés-előkészítő javaslat. Az itt leírt mappastruktúra, parancsok és
szabálymódosítások még nincsenek bevezetve.

## A probléma

A `docs/reviews/` mappában a különféle review skillek jelentései együtt maradnak.
A fájllistából nem látszik, melyik jelentés észrevételeit dolgoztuk már fel, melyikből
kell még ötleteket létrehozni, és melyik őriz csupán történeti információt.

A jelenlegi szabály append-only megőrzést ír elő a deduplikálás és a későbbi
összehasonlítás miatt, de a feldolgozást nem követi. Az `/idea` feljegyzi a
forrásjelentést és a megállapítás sorszámát, a review-ba azonban nem kerül vissza,
hogy intézkedtünk róla. A doctor-review deduplikálási lépése kifejezetten a korábbi
doctor-review jelentéseket olvassa, így a review-típusok közötti egyezések kezelése
sem egységes.

## Javasolt modell

**A feldolgozásra váró review-k maradjanak a mappa gyökerében, a feldolgozottak
kerüljenek archívumba. A jelentések elején megállapításonkénti döntéstábla mutassa,
mi lett az észrevételekből.**

```text
docs/reviews/
  2026-09-08-doctor-review-surgos.md
  …
  archive/
    2026-08-25-doctor-review-uj-terv.md
    …
```

A gyökérben minden olyan jelentés marad, amelyben van eldöntetlen észrevétel.
Az `archive/` alá akkor kerül, amikor minden megállapítás sorsáról döntöttünk.

**A „feldolgozott” azt jelenti, hogy minden észrevételnek van gazdája vagy lezáró
döntése.** A javítások ettől még várhatnak a backlogban; elkészültüket a meglévő
backlog-flow követi. A review feldolgozása és a javítás befejezése két külön esemény.

## Döntéstábla a jelentések elején

Az alábbi táblázat szemléltető példa, nem valamelyik meglévő jelentés minősítése.

| Pont | Röviden | Feldolgozás | Hivatkozás vagy indok |
|---|---|---|---|
| F1 | Piszkozat elveszhet | Backlogban | `piszkozat-torles-vedelem` |
| F2 | Azonosító felirata hiányzik | Döntésre vár | — |
| F3 | Ismétlődő észrevétel | Duplikátum | Másik jelentés F5 pontja |
| F4 | Szándékos működés | Elvetve | Rövid indok |
| F5 | Korábbi hiba | Már javítva | Ellenőrzés + commit |

A jelentés eredeti megfigyelései megmaradnak; a feldolgozási tábla frissíthető.
Ehhez az append-only szabályt pontosítani kell: az eredeti megfigyelések megőrzése
mellett megengedett a feldolgozás könyvelése és a jelentés archiválása.

A megállapítás azonosítója maradjon stabil. Régi jelentésnél a meglévő sorszám is
használható; a táblázat rendezése ne számozza át a forráspontokat.

A feldolgozás szabályai:

- A „majd később” elfogadott feladatból `backlog/idea/later/` tétel legyen, ha a
  doki vagy a fejlesztő kimondta a `Prio: later` értéket. Így a review feldolgozható,
  és a feladat a backlogban vár tovább.
- A kisebb észrevételekről is szülessen döntés, akár együtt: például
  „F6–F9: elfogadott apróság, nincs teendő”.
- A hiányzó backlogfájl nem bizonyítja a javítást: a kész tételek törlődnek.
  A „Már javítva” besoroláshoz Git-történetből vagy aktuális ellenőrzésből származó
  bizonyíték kell.
- Duplikátumnál a hivatkozási lánc végén maradjon látható az eredeti, még
  eldöntetlen pont vagy az azt követő backlogtétel. Körkörös hivatkozás nem zárhat
  le egy észrevételt.
- Elvetésnél rövid indok maradjon. Termékszintű elvetésnél a meglévő szabály szerint
  a `PRODUCT.md` Nem cél szakasza is frissítendő.
- A részben feldolgozott jelentés a gyökérben marad. Pusztán a dátuma alapján
  sem jelentés, sem megállapítás nem minősül lezártnak.

## Közös deduplikálás minden review-típushoz

Az agent az aktuális vizsgálat után a teljes review-állománnyal, a döntéstáblákkal
és a backloggal vesse össze a találatait. A keresés az `archive/` tartalmára és
minden review-típusra terjedjen ki. A friss megfigyelések elkészítése előzze meg
az összevetést, hogy a korábbi jelentések ne irányítsák előre a vizsgálatot.

Az összevetés különböztesse meg:

- a már ismert, feldolgozatlan észrevételt;
- a már backlogban követett problémát;
- az indokkal elvetett javaslatot;
- a korábban javított, most újra reprodukált hibát.

Az archívum nem tiltólista: új bizonyíték vagy regresszió indokolhat új
megállapítást. Önmagában egy érintett fájlban történt commit még nem bizonyít
korábbi javítást vagy javítási kísérletet.

A review feldolgozási állapota nem helyettesíti az aktuális kód ellenőrzését.
A „Backlogban” döntés például azt rögzíti, hogy a feladatot átadtuk a backlognak;
nem állítja, hogy a hiba most is fennáll, vagy hogy már elkészült a javítás.

## A könyvelést a skillek végezzék

Két új kényelmi funkció javasolt:

| Javasolt parancs | Feladat |
|---|---|
| `/reviews` | Listázza a feldolgozatlan jelentéseket, mellettük a még eldöntetlen pontok számával. |
| `/review-triage <jelentés>` | Összepárosítja a pontokat a meglévő backloggal és javításokkal, előkészíti a fennmaradó döntéseket, majd könyveli a meghozott döntéseket. |

A lista a fájlokból számolódjon; ne legyen külön kézzel karbantartott index.
A döntéstábla alapján ellenőrizhető legyen, hogy a jelentés megfelelő mappában van-e.

Az ötletlétrehozás továbbra is az `/idea` útján történjen. Amikor egy review-ból
idea készül, ugyanabban a commitban frissüljön a döntéstábla is. A review-skill
továbbra is jelentést készít; a backlogba vételről és a prioritásról az ember dönt.

Archiváláskor a script rendezze a jelentésre mutató és a jelentésen belüli relatív
hivatkozásokat is. A megállapítások azonosítói és a forrásjelentések kapcsolatai az
áthelyezés után is feloldhatók maradjanak.

A determinisztikus listázás, ellenőrzés és fájlmozgatás scriptbe illik; az
észrevételek értelmezése és a döntések előkészítése a skill feladata. Az
állapotváltozások a meglévő commit–push workflow-t kövessék.

## A meglévő állomány rendezése

A javaslat előkészítésekor a mappában 22 Markdown-jelentés volt. Ezeket egyszer
végig kell egyeztetni a backloggal és a Git-történettel:

1. Jelentésenként azonosítani a megállapításokat, és elkészíteni a döntéstáblát.
2. Hozzárendelni a bizonyítható backlogkapcsolatokat, javításokat és korábbi
   döntéseket.
3. A bizonytalan pontokat döntésre váróként meghagyni.
4. Az emberrel feldolgoztatni a fennmaradó döntéseket.
5. A teljesen feldolgozott jelentéseket archiválni és a hivatkozásokat rendezni.

A bevezetés a review skillek közös szabályainak, az `/idea` visszakönyvelésének,
a backlog workflow-leírásának és a szükséges scripteknek az összehangolt módosítását
igényli. Ez a dokumentum a javaslatot rögzíti; önmagában nem módosítja a jelenlegi
workflow-t, és nem sorolja át a meglévő jelentéseket.

## Kapcsolódó jelenlegi szabályok

- [Backlog-flow és a review-k szerepe](../backlog/README.md)
- [Ötletek létrehozása és forráshivatkozása](../.claude/skills/idea/SKILL.md)
- [Doctor-review és deduplikálás](../.claude/skills/doctor-review/SKILL.md)
- [Architektúra- és React-review](../.claude/skills/code-and-architecture-review/SKILL.md)
- [Manual-checks jelentések](../.claude/skills/manual-checks/SKILL.md)

---

## Vélemény és kiegészítő javaslat (2026-09-09, második átnézés)

Állapot: a fenti javaslat bírálata és egy pontosított módszertan. Nem vezet be semmit.

### Amivel egyetértek

- A „feldolgozott" és a „javítva" két külön esemény; a review feldolgozása akkor
  kész, ha minden megállapításnak van gazdája vagy lezáró döntése.
- A lista a fájlokból számolódjon, ne legyen kézzel karbantartott index.
- A determinisztikus rész (listázás, ellenőrzés, mozgatás) script, az értelmezés skill.
- Közös deduplikálás minden review-típusra, a friss megfigyelés előzze meg az összevetést.
- A „Már javítva" bizonyítékot kér, a hiányzó backlogfájl önmagában nem az.

### Ahol mást javaslok

**1. Az állapot ne a jelentés elején álló táblában éljen, hanem megállapításonként egy
sorban; a tábla generált nézet legyen.** A javasolt döntéstábla egy második másolatot
készít minden megállapítás címéről („Röviden" oszlop), és egy `Status:`-jellegű mezőt
vezet be, amit a backlog-flow épp elkerül („a státusz a mappa, nincs Status sor":
két igazságforrás szétcsúszik). A dedupoló skillnek ráadásul a lokalitás kell: a
megállapítást és a sorsát egy helyen olvassa, ne ugorjon a fejléc-táblához. A mai
jelentésekben már van precedens: a `2026-09-09-doctor-review-elso-megnyitas.md` 2.
megállapítása alatt `- Backlog: kiadas-datuma-helyi-nap` sor áll. Ezt kell szabállyá
tenni:

```md
### 3. A terv azonosítója minden előnézet-belépéskor újra generálódik
- Súlyosság: …
- Döntés: backlog `terv-azonosito-stabil` (2026-09-09)
```

Megengedett `Döntés:` értékek: `backlog <slug>` · `javítva <commit>[, ellenőrizte
review:<id>]` · `elvetve: <indok>` · `duplikátum → review:<id>` · `tudomásul véve`.
A jelentés elejére vagy a `/reviews` kimenetébe a tábla ebből számolódik.

**2. Ami a git-történetből levezethető, azt ne könyveljük kézzel.** A backlog-tételek
`Source:` sora ma is összeköti a megállapítást a tétellel, és a törölt tételeké is
megvan a historyban (`git log -p -- backlog` a `2026-09-05` doctor-review-k kb. 60
megállapítására ad `Source: … N. megállapítás` sort). A `close.mjs` `"<slug>: <cím>"`
commitja a javítás bizonyítéka, az egyéb `git rm` az elvetésé. Tehát a `backlog` és a
`javítva` állapot levezethető, kézzel csak azt kell rögzíteni, aminek máshol nincs
nyoma: elvetés tétel nélkül, duplikátum, tudomásul vétel, review által igazolt javítás.
Ehhez a `Source:` formátumát géppel olvashatóvá kell tenni (lásd 3.); a mai szabad
szöveg („doctor-review papirrol (2026-09-05), 9. megállapítás") csak heurisztikával
párosítható, ezért az egyszeri rendezésnél a script javasol, az ember jóváhagy.

**3. Egységes, mappa-független megállapítás-azonosító minden review-típusban.** Ma
három alak él: a doctor-review `### N. cím`, az arch-react `### ARCH-001 — cím`, a
manual-checks szekciónként sorol, azonosító nélkül. Szabály: minden review-sablon
`### <lokális-id>. <cím>` (vagy `### <PREFIX>-<nnn> — <cím>`) formájú megállapítást ad,
és a teljes azonosító `review:<fájl-basename>#<lokális-id>`, például
`review:2026-09-05-doctor-review-papirrol#9`. A basename dátum+típus+slug, egyedi, ezért
a hivatkozás nem tartalmaz mappát: az `archive/` alá mozgatás ettől egyetlen `git mv`,
linkjavítás nélkül. A `docs-check` már ma old fel `file:`/`symbol:`/`test:`/`product:`
anchorokat; egy `review:` típus hozzáadása a `Source:` sorokat és a `Döntés:`
hivatkozásokat gépi őr alá teszi (létezik-e a fájl `docs/reviews/**` alatt, létezik-e a
heading). A meglévő szabad szövegű `Source:` sorokat nem kell átírni: a docs-check csak
a `review:` előtagú alakot ellenőrzi.

**4. Az archiválás legyen opcionális és utolsó lépés.** A gyökér/`archive/` kettéosztás
csak vizuális jelzés; az azonosító-függetlenség (3.) nélkül linkjavítást és a más
jelentésekben lévő prózai hivatkozások elavulását hozza. Sorrend: előbb a `/reviews`
nézet mondja meg, hol van teendő; ha az azonosítók már mappa-függetlenek, a mozgatás
ingyen van, és a `reviews.mjs --check` őrzi, hogy döntetlen pont nincs archívumban.

**5. A Közepes és Kis megállapítás alapból „tudomásul véve".** Ha minden pontról
külön döntés kell, a 19 jelentés 118 megállapítása feldolgozhatatlan, és a lista
sosem ürül. Javaslat: teendőnek a döntetlen `Blokkoló`/`Súlyos` (és minden `ISMÉT`
címkéjű) pont számít; a jelentés lezárható, ha ilyen nincs. A kisebb pontok maradnak
a skillek dedup-bemenetében nyitott, nem döntött állapotban, és az ismételt előfordulás
(`ISMÉT`) emeli őket döntésre. A `/reviews` súlyosság szerint bontva mutassa a
számokat, hogy a küszöb a doki döntése maradhasson.

**6. A review-skill maga könyvelje az általa igazolt javítást és a felülírást.** A
`2026-09-09-doctor-review-elso-megnyitas.md` nyolc korábbi megállapítást bizonyítottan
javítottként ellenőrzött, de ez az információ az új jelentésben marad, a régiben nem.
Szabály: ha egy futás egy korábbi megállapítást újra ellenőrzött, a régi jelentésbe
beírja a `Döntés: javítva <commit>, ellenőrizte review:<ez a jelentés>` sort; ha egy
forgatókönyv újabb futása a korábbi futás minden pontját újraellenőrizte, a régi
jelentés fejlécébe `Feldolgozás: felülírta review:<új jelentés>` kerül. Ez könyvelés,
nem backlog-írás, tehát nem sérti a „review csak jelent" szabályt, és a kézi
triázs-munka nagy részét elviszi.

**7. Nem kell új `/review-triage` skill.** Az `/idea <slug> docs/reviews/<jelentés>`
már ma szétszedi a jelentést jelöltekre, dedupol és commitol. A kiegészítés: a
jelöltlistában a „nem vesszük fel" is döntés (elvetve indokkal, duplikátum, tudomásul
véve, később), és a skill ugyanabban a commitban írja a `Döntés:` sorokat a jelentésbe,
mint az ideafájlokat. A `/reviews` script (`scripts/workflow/reviews.mjs`), nem skill;
a `--json` kimenete a review-skillek dedup-bemenete, a `--check` a docs-checkből hívható.

**8. A skillek dedup-lépése a scriptre épüljön, ne a jelentések átolvasására.** A
doctor-review 2d lépése ma a `docs/reviews/*doctor-review*.md` fájlokat és a négy
backlog-mappát olvassa; a manual-checks csak a slugokat nézi; az arch-react az előző
saját jelentésével hasonlít össze. Egységes bemenet: `reviews.mjs --json` soronként
azonosító, cím, súlyosság, érintett fájl(ok)/folyamat, állapot, hivatkozás. A
párosítás érintett fájl és cím alapján, az `ISMÉT` logika (git log az érintett
fájlokra a korábbi jelentés dátuma óta) változatlan. Az archívum így sem tiltólista:
a `javítva` állapotú pont ismételt reprodukciója új, `ISMÉT` címkéjű megállapítás.

### A módszertan egyben

Egy megállapítás állapota az alábbiak közül pontosan egy, ebben a levezetési sorrendben:

| Állapot | Forrás | Ki írja |
|---|---|---|
| `backlog <slug>` | létező tételfájl `Source: review:<id>` sora | levezetett, `/idea` |
| `javítva <commit>` | törölt tételfájl + `"<slug>: …"` lezáró commit; vagy `Döntés: javítva` bizonyítékkal | levezetett, vagy review-skill / ember |
| `elvetve: <indok>` | törölt tételfájl lezáró commit nélkül; vagy `Döntés: elvetve` | levezetett, vagy `/idea` |
| `duplikátum → review:<id>` | `Döntés:` sor; a lánc vége nem lehet `duplikátum` | `/idea` vagy review-skill |
| `tudomásul véve` | `Döntés:` sor, vagy alapértelmezés Közepes/Kis pontnál | `/idea` |
| `nyitott` | semmi a fentiek közül | senki |

Ha a levezetett és a beírt állapot ellentmond (például `Döntés: elvetve`, de van
`Source:` hivatkozású nyitott tétel), a `reviews.mjs --check` pirosat ad; nem dönt
egyiket sem érvényesnek.

Egy jelentés „feldolgozott", ha nincs `nyitott` Blokkoló/Súlyos/`ISMÉT` pontja, vagy a
fejlécében `Feldolgozás: felülírta review:<id>` áll. Ez a két feltétel adja a `/reviews`
alaplistáját és az archiválhatóságot.

Az append-only szabály pontosítása: a megfigyelés szövege nem módosul; a
megállapítás alatti `Döntés:` sor és a fejléc `Feldolgozás:` sora írható, minden más
változás tiltott. A régi `Dedup:` címkék megmaradnak, nem kell átírni.

### Bevezetési sorrend

1. `scripts/workflow/reviews.mjs` csak olvasó módban, a mai állományon: a `### N.` és
   `### PREFIX-nnn` headingekből azonosítót képez, a backlog és a git-history `Source:`
   sorait heurisztikával párosítja, és kiírja a jelentésenkénti nyitott számokat.
   Már ez megválaszolja, mely jelentésekkel van teendő.
2. `review:` anchor-típus a `docs-check`-ben; az `/idea` `Source:` sablonja
   `review:<basename>#<id>` alakra vált.
3. `Döntés:` sor és `Feldolgozás:` fejléc-sor szabálya; az `/idea` többötletes ága a
   nem felvett jelöltekhez is döntést kér és könyvel.
4. Review-sablonok egységes megállapítás-headingre (manual-checks kap azonosítót); a
   dedup-lépés mindhárom skillben a `reviews.mjs --json`-ra épül; a review-skill
   könyveli az igazolt javítást és a felülírást a régi jelentésbe.
5. Egyszeri rendezés: a script levezeti, ami levezethető; a `Feldolgozás: felülírta`
   sorral lezárhatók az újrafuttatott forgatókönyvek (`elso-megnyitas` 09-05 → 09-09);
   a maradék döntetlen Blokkoló/Súlyos pontot az ember dönti el, egy ülésben.
6. Csak ezután, ha a fájllista még zavaró: `archive/` és `git mv`, a `--check` őrrel.

### Nyitott kérdések a dokinak és a fejlesztőnek

- A Közepes pont is számítson teendőnek, vagy csak a Blokkoló/Súlyos? (5. pont)
- A fejlesztői lencséjű arch-react jelentések ugyanebbe a flow-ba tartoznak-e, vagy
  azok pontjai közvetlenül `chore` tételekké válnak külön triázs nélkül?
