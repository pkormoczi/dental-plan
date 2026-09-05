## Kiindulási probléma

A dokumentációs rendszer eredetileg arra épült, hogy a fejlesztés során meghozott döntések egy globális, növekvő `D<n>` azonosítót kapnak, majd ezekre a döntésekre a living dokumentáció, a `CLAUDE.md`, a backlog/plan fájlok és sok esetben maga a forráskód is hivatkozik. Ez kezdetben jól követhetőnek tűnt, de az alkalmazás és az AI-assisted fejlesztési workflow növekedésével több strukturális probléma jelent meg.

### 1. A globális D-számozás nem párhuzamosítható

Több Claude Code session és több feature branch párhuzamos fejlesztése esetén minden branch ugyanabból az utolsó ismert D-számból indul. Két külön branch így ugyanazt a következő azonosítót hozhatja létre. Merge-kor ez nem egyszerű szöveges konfliktus: a döntést, az összes dokumentációs hivatkozást és a kódkommenteket is újra kell számozni és ellenőrizni.

A globális, sorfolytonos azonosító ezért felesleges koordinációs pont és merge hotspot.

### 2. A historikus döntési napló és az aktuális specifikáció összekeveredett

A `01-attekintes-es-dontesek.md` időben egymás után született döntéseket tartalmaz. A rendszer fejlődésével természetes módon előfordul, hogy egy újabb döntés pontosít, felülír vagy részben ellentmond egy korábbinak. Ez történeti naplóként elfogadható, de normatív specifikációként problémás.

Egy coding agent számára a fontos kérdés nem az, hogy hetekkel korábban milyen döntés született egy kezdetlegesebb rendszerállapotban, hanem az, hogy **mi igaz most**. A jelenlegi modell ehelyett arra kényszeríti az AI-t, hogy döntésláncokból rekonstruálja az aktuális működést.

### 3. A D-azonosítók túlzottan beszivárogtak a dokumentációba

A living dokumentáció sok helyen nem önhordozó tényt ír le, hanem D-számokra támaszkodik, például `D29`, `D50`, `D61` jellegű cross-reference-ekkel. Emiatt a dokumentum csak a döntési naplóval együtt érthető teljesen, és a jelenlegi rendszerállapot helyett részben a változástörténetet hordozza.

A kívánt modell ezzel szemben az, hogy a living dokumentáció közvetlenül és történeti rekonstrukció nélkül mondja ki a jelenleg érvényes domain-, funkcionális-, technológiai- és UI-szabályokat.

### 4. A historikus döntési azonosítók a forráskódot is szennyezik

A forráskód több AI-t segítő kommentje D-számokra hivatkozik. Ezek a kommentek így nem lokálisan magyarázzák a nem nyilvánvaló `WHY`-t, hanem külső történeti dokumentációra mutatnak. Ez növeli a couplingot, megnehezíti a branchek merge-ét, és arra ösztönzi a későbbi agenteket, hogy további döntési azonosítókat terjesszenek a kódban.

Production code commentnek a konkrét lokális invariánst vagy okot kell magyaráznia; nem projektmenedzsment- vagy történeti azonosítót kell hordoznia.

### 5. A `CLAUDE.md` túl nagy és túl sok domain tudást másol be minden session contextusába

A `CLAUDE.md` eredetileg egyre több sérthetetlen szabályt, domain döntést, technikai részletet és D-hivatkozást gyűjtött magába. Emiatt minden Claude Code session akkor is betölti ezt a nagy contextust, amikor annak jelentős része nem releváns az adott feladathoz.

A `CLAUDE.md`-nek ezért nem teljes alkalmazásspecifikációként kell működnie, hanem rövid **router/constitution** dokumentumként: megmondja a source-of-truth sorrendet, a kötelező workflow-t, a repository alapelveit és azt, hogy az adott témához melyik living dokumentumot kell elolvasni.

### 6. A döntési reasoning és a tartós rendszer-szabályok között nincs elég éles határ

Planning vagy implementáció során sok döntést kell meghozni, de ezek jelentős része csak az adott feature megvalósításának reasoningje. Nem indokolt, hogy minden ilyen döntés globális, örökké hivatkozott artefakttá váljon.

A kívánt szétválasztás:

- a feature-specifikus reasoning és döntések az implementation planben élnek, azonosító nélkül;
- a living docs kizárólag a megvalósult, jelenlegi rendszerállapotot írják le;
- a `RULES.md` csak kevés, valóban globális és stabil invariánst tartalmaz;
- a lezárt planek és az archív döntési napló történeti referencia, nem normatív input a következő fejlesztésekhez.

### 7. A jelenlegi workflow nem védi ki automatikusan a dokumentáció újbóli elromlását

A feature implementáció végén van dokumentáció-karbantartás, de nincs elég szigorúan formalizálva, hogy:

- melyik döntés maradjon csak a planben;
- mi kerüljön valamelyik living specbe;
- mi minősül új globális rule-nak;
- hogyan kell a dokumentációt current-state formára átírni;
- milyen hivatkozások tiltottak a production source-ban és az aktív dokumentációban.

Ezért a migráció nem csak egyszeri takarítás. Az új planning, implementation és documentation-closeout skilleknek, valamint automatizált guardoknak azt is garantálniuk kell, hogy a régi történeti/cross-reference alapú modell később ne épüljön vissza.

## Cél

A jelenlegi historikus, globálisan számozott `D<n>` döntési rendszer kivezetése és egy AI-assisted fejlesztéshez alkalmasabb dokumentációs modell kialakítása.

A migráció alapelve:

> **A reasoning a feature-rel együtt él és történetivé válik. A normatív dokumentáció csak a jelenleg érvényes rendszerállapotot írja le. A `RULES.md` kizárólag kevés, globális invariánst tartalmaz.**

A változtatás elsődleges oka nem formai. A jelenlegi D-számozás és a D-hivatkozások:

- párhuzamos branch-eknél azonos következő D-számokat generálnak;
- merge hotspotot hoznak létre a döntési naplóban és minden hivatkozó fájlban;
- történeti és aktuális döntéseket kevernek;
- az AI-t arra kényszerítik, hogy régi, akár egymásnak ellentmondó döntésekből rekonstruálja a jelenlegi igazságot;
- a `CLAUDE.md` és a production code contextusát feleslegesen terhelik.