# Agent-first dokumentációs modell — V2

Ez a dokumentum arra a kérdésre válasz: **ha ma nulla dokumentum lenne és a `CLAUDE.md` üres, mi lenne a legkisebb, még hasznos dokumentációs modell ehhez az AI-agentekkel fejlesztett alkalmazáshoz?**

A cél nem egy általános engineering governance modell. Egyetlen rendelőnek készülő, statikus React + TypeScript SPA-ról van szó, egy fejlesztővel, aki szinte teljes egészében Claude Code-dal dolgozik, több párhuzamos sessionnel és feature branch-csel.

A dokumentum célállapotot és a hozzá vezető legolcsóbb migrációt írja le. Nem ADR-rendszer, nincs történetiség, nincs globális döntésazonosító, és nincs big-bang dokumentum-migráció.

---

## 0. Kiindulási kényszerek

### 0.1 Az elsődleges olvasó AI agent

Az agent:

- sessionök között nem támaszkodhat beszélgetési memóriára;
- kiválóan olvas kódot és teszteket;
- a feleslegesen betöltött dokumentáció context- és figyelemköltség;
- a stale dokumentációt könnyen tényként kezeli.

Ezért a dokumentáció értékét nem emberi olvashatóság, hanem **retrieval value / maintenance cost** alapján kell mérni.

### 0.2 Nincs emberi dokumentáció-auditor

A fejlesztő nem fogja rendszeresen végigolvasni az agent által írt dokumentációt. Emiatt nem építhetünk olyan modellre, amelynek korrektségét periodikus emberi review tartja fenn.

Ebből azonban **nem** következik, hogy minden dokumentált állítás igazsága mechanikusan bizonyítható.

A helyesebb kényszer:

> **Amit mechanikusan enforce-olni lehet, azt ne dokumentum enforce-olja. A dokumentáció csak discovery és product intent réteg legyen.**

A mechanikus check nem semantic truth engine. Egy anchor például nem bizonyítja, hogy a mondat igaz; csak egy konkrét implementation locushoz köti, és annak eltűnését vagy átnevezését láthatóvá teszi.

### 0.3 Explicit kivétel: `PRODUCT.md`

A product intent egy része definíció szerint nem vezethető le a kódból és nem is mechanikusan ellenőrizhető:

- egyetlen rendelő használja;
- nincs multi-tenancy;
- nincs mobilcél;
- a páciens- és kezelési adat nem hagyhatja el a helyi gépet;
- bizonyos funkciók szándékosan nincsenek a termékben.

A `PRODUCT.md` ezért **trusted product-intent oracle**. Szemantikai elavulását automatika nem tudja teljesen megfogni. Ez vállalt maradékkockázat, nem megoldottnak tekintett probléma.

---

## 1. Authority és discovery szétválasztása

A korábbi modell túl erősen fogalmazott azzal, hogy „ha valami tesztté tehető, tilos dokumentumba írni”. Ez összekeverte az **igazságforrást** és a **felfedezési indexet**.

### 1.1 Authority hierarchy

Ha azt akarjuk, hogy egy szabály ténylegesen érvényesüljön, preferált sorrend:

| Erő | Mechanizmus | Szerep |
|---|---|---|
| 1 | típus / séma / compiler / lint / security policy | lehetőleg már meg se engedje a hibát |
| 2 | automata teszt | futás közben bizonyítsa a megfigyelhető viselkedést |
| 3 | kódstruktúra / API boundary | tegye nehézzé a szabály megkerülését |
| 4 | lokális kódkomment | nem enforce-ol, de a releváns kóddal együtt jelenik meg |
| 5 | rövid agent-context dokumentum | discovery és szándék |
| 6 | hosszú központi specifikáció | kerülendő; magas stale- és context-költség |

### 1.2 A dokumentum nem authority, hanem index

Egy tesztelhető szabály röviden szerepelhet agent-context fájlban, **ha discovery szempontból értékes**, de az enforcement helyére kell mutatnia.

Példa:

```md
- A mentett terv snapshot; nem rajzoljuk újra az aktuális árlistából.
  → test:app/src/domain/planSnapshot.test.ts#saved plan keeps captured prices
```

Ez nem második specifikáció. A mondat gyors discovery summary; a teszt az authority.

### 1.3 Mit ne dokumentáljunk

Ne kerüljön agent-contextbe pusztán azért, mert létezik:

- mezőlista;
- komponens-prop lista;
- route részletek, amelyek egyetlen router fájlból triviálisan látszanak;
- UI layout leírás;
- validation matrix, ha tesztből/típusból közvetlenül kinyerhető;
- implementációs részletek, amelyeket a kód néhány perces olvasása megad;
- lezárt alternatívák történeti listája.

A dokumentáció létrejöttének alapértelmezett oka **observed retrieval failure**, nem az, hogy „ezt is illene dokumentálni”.

---

## 2. Teszt mint specifikáció: mire jó és mire nem

### 2.1 Verifikációra erős

A teszt kiváló arra, hogy megválaszolja:

> „A rendszer ma ténylegesen ezt csinálja?”

A teszt neve legyen konkrét viselkedés-leírás. A jó név segíti a keresést, de önmagában nem lesz külön governance-rendszer.

Nem kell tiltólistát építeni pusztán olyan szavakra, mint `should` vagy `handles`. A valódi probléma a homályos név:

```text
rossz: handles invalid values
jobb: rejects a treatment with no price in the plan currency
```

### 2.2 Discoveryre önmagában gyenge

A teszt neve:

- assertiont ír le, nem mentális modellt;
- elrejtheti az előfeltételeket;
- ugyanaz az agent írhatta ugyanazzal a félreértéssel, mint a kódot;
- több száz tesztnél retrieval-költséget okozhat.

Ezért lehet szükség rövid modul-contextre: nem azért, hogy lemásolja a teszteket, hanem hogy megmondja, **mit érdemes keresni és hol**.

### 2.3 `skip` és `only`

A teljes suite-ban a `.skip` és `.only` hard fail. Ezek specifikációnak látszó, de nem ténylegesen futó teszteket hagynának a rendszerben.

---

## 3. Mi jogosult dokumentumba kerülni

Négy kategória indokol agent-facing dokumentációt.

### 3.1 Product intent

`PRODUCT.md`:

- miért létezik a termék;
- ki használja;
- napi felhasználói flow magas szinten;
- mi **nem cél**;
- adatvédelmi és deployment-korlátok.

### 3.2 Szándékos hiányok

A kód megmutatja, mi van. Azt nem, hogy egy hiány szándékos-e.

Példa:

```md
- Nincs automatikus HUF↔EUR átváltás; a kezelési terv pénzneme nem konverziós workflow.
  → product:#nem-cel
```

### 3.3 Magas retrieval-költségű mentális modell

Csak akkor dokumentáljuk, ha az agent a kód + teszt alapján ismételten nehezen találja meg:

- state ownership;
- nem triviális helper-ek;
- snapshot vs live-data boundary;
- PDF pipeline fő belépési pontjai;
- cross-module contract, amelynek authority-je máshol van.

### 3.4 Amit az automata suite strukturálisan nem lát

A projekt automata tesztjei vakok lehetnek például:

- tényleges CSS/kontraszt problémára;
- valós PDF renderre;
- canvas vizuális rétegre;
- bizonyos billentyűzet/fókusz viselkedésekre.

Ezek nem agent-specifikációk, hanem manual verification concernök.

---

## 4. Agent-context: nested `CLAUDE.md`, nem README-taxonomy

A projekt elsődleges coding agentje Claude Code. Claude Code natívan támogatja a repository hierarchiában elhelyezett `CLAUDE.md` fájlokat: a subdirectory fájlokat on-demand tölti be, amikor az adott subtree-ből olvas fájlt.

Ez pontosan azt a routingot adja, amit külön README-konvencióval felesleges újraimplementálni.

### 4.1 Minimális kezdőstruktúra

```text
/CLAUDE.md
/PRODUCT.md

/app/src/domain/CLAUDE.md      # csak ha discovery value igazolt
/app/src/pdf/CLAUDE.md         # valószínűleg indokolt

/backlog/plans/<slug>.md       # csak aktív feature alatt
/.claude/skills/manual-checks/
/scripts/docs-check.mjs
```

**Nem hozunk létre előre** `pages`, `storage`, `design` dokumentumot csak azért, mert ezek létező mappák.

Egy új nested `CLAUDE.md` akkor indokolt, ha legalább egy konkrét failure mode megjelent:

- az agent ugyanazt a helper-t újraimplementálja;
- rendszeresen rosszul találja meg a state ownershipot;
- ismételten olyan megoldást tervez, amely egy meglévő lokális contractot sért;
- a discovery költség érezhetően nagyobb, mint néhány száz karakter context.

### 4.2 Trade-off

Ez Claude Code-specifikus megoldás. Jelenleg ez elfogadható, mert deklaráltan Claude Code a fő fejlesztési agent. Ha később több agent-rendszer azonos repository contextet igényel, akkor lehet közös `AGENTS.md`/import réteget bevezetni. Ezt nem építjük meg előre.

---

## 5. Anchor: csak structural drift detector

Az anchor célja szűk:

> egy dokumentált discovery állítást konkrét implementation locushoz kötni, és annak eltűnését/átnevezését mechanikusan észrevenni.

Az anchor **nem bizonyítja** az állítás szemantikai igazságát.

### 5.1 Anchor-formátum

Ne legyen globális, név-alapú anchor. Legyen path-qualified és kevés típusa legyen:

```text
file:<path>
symbol:<path>#<identifier>
test:<path>#<full test name>
product:#<section>
```

Példák:

```md
- Pénz minor unitban él. → symbol:app/src/domain/money.ts#Minor
- A véglegesített verzió nem írható felül.
  → test:app/src/storage/planStorage.test.ts#does not overwrite an existing finalized version
- Nincs backend. → product:#adat-es-deployment-korlatok
```

### 5.2 Resolver

A resolver feladata csak:

1. grammar validáció;
2. a fájl létezik-e;
3. symbol-anchor esetén az identifier megtalálható-e a megadott fájlban;
4. test-anchor esetén a teszt megtalálható-e a megadott test file-ban / Vitest listában;
5. product-anchor esetén a heading létezik-e.

A tesztlista felismeréséhez lehetőleg a Vitest saját listing mechanizmusát használjuk, nem saját regex parserrel próbáljuk értelmezni az összes `it.each`, `test.for`, paraméterezett formát.

### 5.3 Rename vs semantic drift

Nem próbáljuk megkülönböztetni.

- rename → anchor fail → frissíteni kell;
- symbol létezik, de a jelentése megváltozott → nem feltétlenül detektálható.

Az utóbbi vállalt residual risk.

### 5.4 Relevant-but-wrong anchor

Ha az agent létező, de nem releváns szimbólumot választ, a check zöld lehet.

Erre **nem** építünk semantic validator agentet, embeddinget, source hash-t vagy approval workflow-t. Ezek drágább és megbízhatatlanabb rendszert hoznának létre, mint az eredeti probléma.

A path-qualified anchor csökkenti a véletlen hibát; a maradékot vállaljuk.

---

## 6. Keresztvágó tudás és duplikáció

### 6.1 Authority a kikényszerítés helyén

Ha a szabály teszt/típus/lint formában enforce-olható, ott él az authority.

Például a pénz reprezentációjának authority-je a `Minor` típus és a kapcsolódó tesztek, nem három külön module-doc.

### 6.2 Discovery hivatkozhat ugyanarra az authority-re több helyről

A korábbi „ugyanaz az anchor két README-ben hard fail” szabály hibás volt.

Ugyanaz a symbol jogosan releváns lehet két külön contextben:

```text
domain context → money.ts#Minor
pdf context    → money.ts#Minor
```

Ezért **nincs anchor-unicitás hard fail**.

A duplikációt csak akkor tekintjük problémának, ha tényleges maintenance vagy retrieval fájdalmat okoz. Nem építünk rá külön szemantikai deduplikációs infrastruktúrát.

### 6.3 Duplikált tesztnév nem hard fail

A globális tesztnév-unicitás sem jelent semantic uniqueness-t, és legitim false positive-okat okoz parametrizált vagy párhuzamos domain teszteknél.

Ezért nincs ilyen `docs-check` szabály.

Ritka, valóban redundáns teszt olcsóbb hiba, mint egy külön governance-rendszer.

---

## 7. Budget: guardrail, nem architecture driver

A dokumentációs budget célja egyetlen dolog:

> ne engedje visszanőni a központi, stale dokumentációt.

A budget **nem tudományos optimum**, hanem kezdeti guardrail.

Kezdő értékek:

| Fájl | Kezdő budget |
|---|---:|
| `/CLAUDE.md` | 4000 karakter |
| `/PRODUCT.md` | 4000 karakter |
| nested `CLAUDE.md` | 2500 karakter / fájl |
| aktív plan | 6000 karakter |

### 7.1 Ha megtelik egy nested `CLAUDE.md`

Sorrend:

1. ami enforcement lehet, menjen tesztbe/típusba/lintbe;
2. ami lokális rationale, menjen kódkommentbe;
3. ami könnyen levezethető, törölhető;
4. ha a **kód már természetesen** több submodule-ra bomlik, a context kövesse a kódot.

**Tilos production code-ot csak azért átszervezni, mert megtelt egy dokumentációs budget.**

A dokumentáció a kód architektúráját követi; nem a documentation budget tervezi a production architecture-t.

### 7.2 Budget-módosítás

A számok kalibrálhatók. A budget emelése nem legyen automatikus első reakció egy failed checkre, de nem is tabu.

A kérdés:

> a plusz context bizonyíthatóan csökkenti a discovery költségét vagy ismétlődő agent-hibát?

Ha igen, kis emelés olcsóbb lehet, mint mesterséges szétbontás.

---

## 8. Root `CLAUDE.md` célformája

A root fájl csak globális concernöket tartalmazzon.

Példa:

```md
# Repo
app/       Vite + React + TypeScript alkalmazás
backlog/   csak aktív feature planek
scripts/   repository checkek

# Parancsok
cd app && npm run dev | build | lint | test

# Product context
PRODUCT.md — termékcél, user flow, non-goal, adatkorlátok
Nested CLAUDE.md csak ott van, ahol lokális discovery context tényleg kell.

# Authority
Aktuális implementáció: kód + futó tesztek.
Product intent és szándékos non-goal: PRODUCT.md.
A CLAUDE.md contextet ad; nem írhat felül tesztet vagy típust.

# Hard invariants
- Páciens- és kezelési adat nem hagyhatja el a helyi eszközt.
- Ne adj hozzá backend, telemetry, analytics, remote logging vagy külső AI/API adatküldést,
  ha az páciens- vagy kezelési adatot továbbíthat.
- Fájlrendszer-hozzáférés csak a PlanStorage boundary-n keresztül.
- Finalizált verziót nem írunk felül; ezt teszt enforce-olja.

# Documentation
- Default: ne írj dokumentációt.
- Nested CLAUDE.md-be csak discovery/product-intent jellegű tudás kerülhet.
- Discovery bullethez path-qualified anchor kell.
- Budget túllépést ne production refactorral oldj meg.

# Tests
- Nincs .skip és .only.
- A tesztnév konkrét megfigyelhető viselkedést írjon le.

# Workflow
/plan <slug> → /implement <slug> → /finish <slug>
```

### 8.1 Privacy invariant pontosítása

A „nincs backend” önmagában kevés.

Failure scenario:

- analytics SDK;
- Sentry/remote logging;
- remote AI call;
- harmadik fél API;
- telemetry;

mind kivihet páciensadatot backend bevezetése nélkül.

A valódi invariant:

> **Patient and treatment data never leaves the local device.**

Ahol olcsón megoldható, ezt érdemes erősebb mechanizmus felé tolni: CSP/network allowlist, dependency/import restriction, vagy célzott teszt/lint. A `CLAUDE.md` önmagában csak guidance.

---

## 9. Nested `CLAUDE.md` sablon

```md
# app/src/domain

## Mental model
- A mentett terv snapshot; a korábban mentett ár nem követi az aktuális árlistát.
  → test:app/src/domain/planSnapshot.test.ts#saved plan keeps captured prices
- Pénz minor unitban él.
  → symbol:app/src/domain/money.ts#Minor

## Intentional gaps
- Nincs automatikus HUF↔EUR konverzió.
  → product:#nem-cel

## Find before writing
- plan total: symbol:app/src/domain/totals.ts#tervVegosszeg
- finalization diagnostics: symbol:app/src/domain/finalization.ts#veglegesitesDiagnozis
```

A helper-indexnek csak az a része maradjon, amely ténylegesen megelőzi a duplikált implementációt. Ne legyen automatikusan minden export felsorolása.

---

## 10. Aktív plan: ephemeral working memory

Az aktív feature-plan értékes, mert megszakadt vagy párhuzamos session esetén olcsóbban adja vissza a feature lokális kontextusát, mint a diffből való rekonstrukció.

```md
# <slug>
Target: <target branch>
Baseline: <target commit SHA planningkor>

## Goal
Egy mondat: mit lát másképp a felhasználó.

## Current state
Csak a feature szempontjából releváns fájlok, symbolok, tesztek.

## Approach
Mely fájlok / boundary-k változnak, melyek nem.

## Decisions
Csak valódi választásnál:
- <választás> — mert <ok>; nem <alternatíva>, mert <ok>.

## Verification
- [ ] tests
- [ ] typecheck/lint
- [ ] docs-check
- [ ] feature-specifikus manual check, ha automata coverage nincs
```

A plan `/finish` után törlődik. Nincs `backlog/done/`. A git history elég történetiség.

### 10.1 Baseline drift — a korábbi `merge-base` check javítása

A korábbi modell hibásan azt ellenőrizte, hogy a plan `Base` SHA megegyezik-e az aktuális `merge-base`-szel. Hosszú branchnél ez zöld maradhat akkor is, ha a target branch sok commitot előrement.

A helyes concern:

> a planning óta előrement-e a target branch, és változott-e olyan terület, amely a plan `Current state` feltételezéseit érinti?

Ez nem tiszta docs-check concern.

`/implement` preflight:

1. `git fetch`;
2. olvasd ki a plan `Target` és `Baseline` értékét;
3. hasonlítsd a `Baseline`-t a target branch aktuális headjéhez;
4. ha eltér, vizsgáld újra az érintett `Current state` fájlokat/symbolokat/testeket;
5. frissítsd a plan baseline-ját csak e review után.

Nem kell automatikus rebase minden target commitnál; azt kell elkerülni, hogy az agent észrevétlenül elavult feltételezésből induljon.

---

## 11. `docs-check`: minimális hard fail készlet

A script ne próbáljon semantic correctnesset bizonyítani. Csak olcsó, determinisztikus hibákat fogjon meg.

Kezdő szabályok:

| # | Hard fail | Mit fog meg |
|---|---|---|
| 1 | új globális `D<n>` referencia tiltott helyen | a régi számozási patológia visszatérése |
| 2 | source-ból legacy decision / lezárt plan hivatkozás | stale historical coupling |
| 3 | dokumentációs budget túllépés | kontrollálatlan hízás |
| 4 | hibás vagy feloldhatatlan path-qualified anchor | structural drift / hibás locator |
| 5 | `.skip` / `.only` | nem futó, mégis specnek látszó teszt |

**Nincs:**

- anchor-unicitás;
- globális test-name unicitás;
- semantic duplicate detector;
- semantic anchor validator;
- source hash / fingerprint;
- fix „80 soros” implementation target.

A script legyen olyan hosszú, amennyi a tiszta implementációhoz kell. 120 olvasható sor jobb, mint 78 sor regex-golf.

---

## 12. Manual checks: execution budget, nem character budget

A `manual-checks` az egyetlen rendszeres ember-facing artefaktum, de ez valójában **manual test suite**, nem documentation knowledge base.

Ezért a releváns budget nem karakter, hanem **végrehajtási idő**.

### 12.1 Mit promotálunk permanens checkké

Csak stabil, ismétlődő blind spotot:

- tényleges PDF render;
- canvas vizualizáció;
- CSS/kontraszt;
- keyboard/focus flow, amit a teszt-stack nem fed megbízhatóan.

Feature-specifikus egyszeri check maradjon az aktív plan `Verification` szekciójában, és a plannel együtt tűnjön el.

### 12.2 Ha nő a suite

Ha a stable manual suite kb. 10–15 perc fölé nő, trigger szerint kell bontani, például:

```text
manual-checks/pdf
manual-checks/visual-css
manual-checks/keyboard-accessibility
```

Nem kell minden feature után mindent futtatni. A változás típusa döntse el, melyik slice releváns.

Failure scenario, amit kerülünk:

> 70 tételes „alapos” checklist, amelyet a gyakorlatban senki nem futtat végig.

---

## 13. Párhuzamos sessionök és branchek

### A. Két branch ugyanazt a context fájlt módosítja

Kis, lokális `CLAUDE.md` esetén ez normál git text conflict. Nincs globális sorszám, nincs kaszkádos hivatkozás-átírás.

Ez továbbra is a modell egyik legnagyobb, mérhető nyeresége.

### B. Két branch hasonló tesztet ír

Ezt nem próbáljuk hard faillel megoldani.

Lehet, hogy merge után két részben redundáns teszt marad. Ez vállalt, olcsó maradékkockázat.

### C. Egy branch invariánst változtat, a másik a régi szerint dolgozik

Itt a documentation routing nem véd.

A védelem:

- erős típus/API boundary;
- automata teszt;
- merge/rebase utáni teljes verification.

A tesztelhető, de nem tesztelt kritikus invariáns valódi kockázat; ezért kell az invariáns-audit a migráció elején.

### D. Hosszú branch elavult baseline-nal

A plan `Target` + `Baseline` és az `/implement` preflight kezeli. Nem a `merge-base` egyenlőség.

### E. Dokumentációs budget miatti „helycsinálás”

Nem törlünk automatikusan stabil tudást pusztán azért, mert elértük a budgetet, és nem refaktoráljuk a production code-ot dokumentációs nyomás miatt.

Az agentnek először erősebb mechanizmust vagy redundáns tartalmat kell keresnie.

---

## 14. Falszifikációs teszt: a modell központi tézisének validálása

A migráció agresszivitása addig nincs kalibrálva, amíg nem mérjük meg, mennyire elég a kód + teszt a friss agentnek.

### 14.1 Ne trivia legyen

A tíz kérdés legalább fele change-impact/discovery feladat legyen.

Példák:

- „Meg akarom változtatni a véglegesítés feltételét. Mely fájlokat és teszteket kell először megnézned?”
- „Milyen invariánsokat törhetek el, ha az árlista árkezelését módosítom?”
- „Van-e már helper erre a számításra, vagy újat kell írni?”
- „Hol él a kezelési terv state, és melyik komponens írhatja?”
- „Mi akadályozza meg, hogy korábbi finalizált PDF/version felülíródjon?”

A többi lehet konkrét current-behaviour kérdés.

### 14.2 Mit mérünk

Ha praktikus, A/B módon:

- A: code + tests;
- B: code + tests + jelenlegi docs.

Figyeljük:

- correctness;
- hány fájlt kellett megnyitni;
- discovery token/context költség;
- megtalálta-e a meglévő helper/testet;
- helyesen azonosította-e az invariánsokat.

Az A/B eredmény emberi értékelést igényelne. Ha ez nem fér bele a „nem olvasom az agent dokumentációját” munkamódba, akkor friss auditor-agent ellenőrizze a válaszokat konkrét code/test evidence alapján.

A lényeg nem a 9/10 varázsszám, hanem a döntés:

> **a dokumentáció retrieval benefitje nagyobb-e, mint a maintenance + context költsége?**

---

## 15. Migráció — minimális út

### 0. Azonnal: állítsd le az új decision-ID-ket

- új globális `D<n>` nem jön létre;
- a korábbi döntési napló legacy artefaktum;
- új source/doc hivatkozás nem mutathat rá.

Ez önmagában megszünteti a mért branch/rebase fájdalom fő okát.

### 1. Kritikus invariáns-audit

Ne teljes dokumentációt auditálj. Csak a valóban sérthetetlen szabályokat:

- lokális páciensadat / nincs adat-kiszivárgás;
- finalizált verzió nem írható felül;
- storage boundary;
- schema compatibility;
- pénz reprezentáció;
- kritikus finalization/business guardok.

Minden sorra:

1. enforce-olható típussal/linttel/policy-val? → oda;
2. van megfelelő automata teszt? → ha nincs, írd meg;
3. csak product intent? → `PRODUCT.md`;
4. csak discovery concern? → szükség esetén nested `CLAUDE.md`.

### 2. Falszifikációs teszt

A 14. szakasz szerint.

Az eredmény dönti el, milyen agresszíven lehet kivonni a régi dokumentációt.

### 3. Kivonás, nem migráció

A meglévő nagy spec-eket atomi állításokra bontó agent minden állításhoz adjon evidence-et:

- `DERIVABLE` → konkrét file/symbol/test;
- `NOT-DERIVABLE` → product intent / intentional gap / external constraint / valódi discovery context.

Mechanikus check ellenőrizze, hogy a hivatkozott evidence legalább létezik.

Ezután friss auditor-session nézze meg a gyanús `DERIVABLE` sorokat az előző agent indoklása nélkül.

A törölt régi docs kerülhet 60 napos `docs/legacy/` karanténba. Új normatív hivatkozás nem mutathat rá.

### 4. Minimális célállapot kiépítése

Kezdéskor csak:

```text
/CLAUDE.md
/PRODUCT.md
/backlog/plans/<slug>.md
/.claude/skills/manual-checks/
/scripts/docs-check.mjs
```

Ezután csak bizonyított retrieval need alapján:

```text
/app/src/domain/CLAUDE.md
/app/src/pdf/CLAUDE.md
```

`pages`, `storage`, `design` context fájl **nem kötelező célállapot-elem**. Ha nincs failure evidence, nem jön létre.

### 5. `/finish`

Sorrend:

1. tests / typecheck / lint;
2. `docs-check`;
3. releváns manual-check slice;
4. dokumentáció **csak akkor**, ha keletkezett code/testből drágán vagy egyáltalán nem levezethető jövőbeli context;
5. plan törlése.

A normális feature-closeout eredménye: **nincs dokumentációs módosítás**.

---

## 16. Mi szűnt meg a V1-hez képest

| V1 mechanizmus | V2 döntés |
|---|---|
| README mint modul-context | Claude Code-nál nested `CLAUDE.md` az elsődleges routing |
| minden területnek előre modul-doksi | csak observed retrieval failure után jön létre |
| „tesztelhető állítás tilos doksiban” | authority nem lehet docs; discovery summary lehet anchorral |
| anchor „emberi auditor helyett” | csak structural drift detector |
| anchor-unicitás hard fail | törölve: relation ≠ identity |
| globális duplikált tesztnév hard fail | törölve: false positive és nem fogja meg a semantic duplikációt |
| `Base == merge-base` | törölve; target advancement + `/implement` preflight |
| budget telik → module split | törölve; docs nem vezérel production architecture-t |
| fix `~80 soros` docs-check cél | törölve; olvasható minimal script kell |
| manual-check karakterbudget nélkül | execution-time budget + trigger szerinti slicing |
| „nincs backend” mint privacy rule | „patient/treatment data never leaves device” a valódi invariant |

---

## 17. Vállalt maradékkockázatok

Emberi dokumentáció-auditor nélkül tudatosan vállaljuk:

1. **Relevant but wrong anchor.** A locator létezik, de a dokumentált mondat nem következik belőle.
2. **Semantic drift ugyanazon symbol mögött.** A név/fájl nem változik, de a jelentés igen.
3. **`PRODUCT.md` staleness.** A product intent egy része nem mechanikusan ellenőrizhető.
4. **Konzisztensen téves kód + teszt + context.** Ugyanaz az agent félreértést vihet át több artefaktumba.
5. **Részben redundáns tesztek merge után.** Nem építünk rá globális deduplikációs rendszert.
6. **Kivonáskor elvesztett nem-levezethető tudás.** Fresh-session audit és legacy-karantén csökkenti, nem szünteti meg.

Ezek közül egyikre sem érdemes nagyobb governance-rendszert építeni addig, amíg nincs mért, ismétlődő költségük.

---

## 18. Összefoglaló célmodell

| Kérdés | V2 válasz |
|---|---|
| Mi az authority? | típus/lint/policy + futó tesztek + kód boundary-k |
| Mire való a dokumentáció? | product intent és discovery |
| Kell ADR / history / decision log? | Nem |
| Kell globális decision ID? | Nem |
| Hol van agent-context? | root és szükség esetén nested `CLAUDE.md` |
| Mikor jön létre modul-context? | observed retrieval failure után |
| Mire jó az anchor? | structural drift detection, nem semantic proof |
| Kell anchor-unicitás? | Nem |
| Kell globális test-name unicitás? | Nem |
| Mi történik budget-túllépéskor? | erősebb mechanizmus / redundancia keresése; production refactor nem kötelező |
| Mi védi a hosszú branchet? | target baseline awareness az `/implement` preflightban |
| Mi a privacy invariant? | páciens- és kezelési adat nem hagyja el a lokális eszközt |
| Mi a manual suite budgetje? | végrehajtási idő |
| Mi történik `/finish`-kor? | default: nincs docs write; plan törlődik |
| Mi a végső cél? | a lehető legkevesebb stale, agent-facing próza a lehető legjobb retrieval mellett |

---

## 19. Implementációs sorrend — ha most indulunk

A teljes V2-ből első körben **nem** kell mindent egyszerre megépíteni.

### Minimum viable documentation system

1. root `CLAUDE.md` karcsúsítása;
2. `PRODUCT.md` létrehozása;
3. új decision-ID tiltás;
4. kritikus invariánsok automata enforcementje;
5. 5 szabályos `docs-check`;
6. ephemeral plan workflow;
7. manual-check suite execution-time alapján rendezve.

### Csak mérés után

8. falszifikációs discovery teszt;
9. `domain/CLAUDE.md`, ha valóban csökkenti a retrieval költséget;
10. `pdf/CLAUDE.md`, ha valóban csökkenti a retrieval költséget;
11. további nested context csak konkrét ismétlődő failure mode után.

A cél nem egy „szép dokumentációs rendszer”.

A cél az, hogy az agent **gyorsabban találja meg a helyes kontextust, ritkábban találjon ki már létező dolgokat újra, és minél kevesebb stale prózát kelljen elhinnie**.
