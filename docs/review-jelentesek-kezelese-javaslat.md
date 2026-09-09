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
