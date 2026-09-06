---
name: implement-batch
description: Több MÁR TERVEZETT (backlog[/later]/<slug>.md) backlog-tétel egymás utáni implementálása és lezárása egyetlen pushsal — tudatosan A DOKI KÉZI KAPUJA NÉLKÜL. Nem tervez és nem fogad el idea/ státuszú tételt (azokat a /plan-batch vagy a /plan tervezi meg előbb). Tételenként drift.mjs, implementáció a plan scope-jában, csökkentett kapu (build+lint+test), close.mjs --batch (commit, push nélkül). A ciklus után egy /manual-checks all a jsdom-vakfoltra, majd sync.mjs: teljes kapu (a docs-check is itt fut, egyszer) + EGY push az egész batchre. Elakadt tétel kimarad, a többi megy tovább. Nem batch-tétel: hard invariánst / docs/PRODUCT.md Nem célt érintő döntés, vagy a tervben maradt nyitott Kerdes: — az a /plan interjús útra tartozik. Invoke explicitly with /implement-batch <slug> <slug>...
argument-hint: <slug> <slug>...
disable-model-invocation: true
---

# /implement-batch <slug> <slug>...

## Mikor NE ezt használd

Ez a skill a doki kézi ellenőrzését **tudatosan kihagyja** — a tétel emberi szem nélkül zár és
kerül fel az `origin/master`-re (Pages-élesítés). Csak arra való, amit egy zöld gépi kapu és a
`/manual-checks` valóban bizonyít: domain-logika, szöveg/copy, attribútum, storage. **Ne vedd fel
a listába**, ha a tétel:

- még `idea/` alatt él — ez a skill **nem tervez**; tervezd meg előbb `/plan-batch`-csel (ha
  egyértelmű, kis kockázatú) vagy `/plan <slug>`-dal (ha interjú kell), és csak a már tervezett
  tételt add ide;
- a tervben maradt nyitott `Kerdes:` sora — az termékdöntés, nem eldönthető géppel;
- hard invariánst érint, vagy `docs/PRODUCT.md § Nem cél`-t közelít.

Ezekre `/plan <slug>` (interjúval) → `/implement <slug>` → kézi teszt → `/finish <slug>` —
az egytételes utat ez a skill nem helyettesíti, csak kiegészíti.

## 0. Preflight

A fő könyvtárban, `master`-en, tiszta munkafával:

1. `node scripts/workflow/sync.mjs` — friss `origin/master`, és felviszi az esetleg ott
   kallódó push-olatlan commitot. Ha megáll, **állj meg és jelentsd**.
2. Minden megadott slugra: `findItem` (a `backlogPath.mjs` modulja, amit a `drift.mjs`/`close.mjs`
   is használ) — **állj meg**, ha egy slug nem létezik, két helyen él, vagy **nem `planned`
   státuszú** (`idea/` alatt van — előbb `/plan-batch` vagy `/plan`).
3. `node scripts/workflow/drift.mjs --all` a tervezett tételek gyors áttekintéséhez.
4. **Sorrendezd terület-fürtökbe**: a tételek `Current state`/leírás pointerei alapján csoportosítsd
   úgy, hogy az ugyanazt a fájlt érintő tételek egymás után kövessék (pl. `PreviewPage.tsx`,
   `PatientPage.tsx`, `planEditor/*` több tételben is szerepelhet) — ez teszi a drift-jelzést
   kiszámíthatóvá lent. Írd ki a végleges sorrendet, mielőtt elindulsz.

Ajánlott listahossz ≤ 10–12 tétel egy futásra — hosszabb listánál inkább több futás.

## 1. Ciklus, tételenként

**a. Drift.** `node scripts/workflow/drift.mjs <slug>`. A batch 2. tételétől kezdve az **exit 2
(drift) normális** — az előző tételek saját commitjai okozzák. Nézd át a `Current state`
pointereit a friss kódon; ha egy döntés emiatt nem áll meg, a tétel **kimarad**, jegyezd fel miért.

**b. Implementáció** a plan `Approach` + `Decisions` scope-jában — az `/implement` 4. lépésének
szabályai szó szerint érvényesek: nested `CLAUDE.md` „Find before writing” index átolvasása
(ne duplikálj helpert), a root `CLAUDE.md` Kommentek szabálya, teszt a `Verification` megfigyelhető
viselkedésére, `.skip`/`.only` nélkül. Ha a plan hibásnak bizonyul, vagy a tételhez nem tartozó
hibát találsz — ugyanaz a szabály, mint `/implement`-nél: **ne javítsd**, ne bővítsd a scope-ot;
a tétel elakadásaként kezeld (lásd lent), a nem-idetartozó hibát a záró jelentés után `/idea`-ba.

**c. Csökkentett kapu**, az `app/` alatt:
```
npm run build
npm run lint
npm test
```
(`docs-check` szándékosan kimarad — a záró `sync.mjs` futtatja egyszer, az egész batchre.)

**A batch sosem kérdez.** Ideális esetben ez a lépés meg sem áll: a tervezett tétel
`Approach`+`Decisions`-ének minden döntést tartalmaznia kellene, hiszen ezért ment át a `/plan`
vagy a `/plan-batch` kockázati sávján. Ha implementáció közben MÉGIS felbukkan egy — piros kapu,
ami scope-on belül nem javítható; hard-invariáns-ütközés; vagy olyan termékdöntés, amit a plan
szövege nem tartalmazott —, azt **nem a batch dolga élőben eldönteni**: ez a plan hiányosságát
jelzi, nem egy technikai akadályt. A tétel **mindig kimarad, a batch sosem áll meg**: állítsd
vissza a munkafát az előző tétel állapotára (`git status`-tal ellenőrizve, hogy csak az aktuális
tétel érintett fájljai módosultak, majd `git checkout -- <fájlok>` / új fájloknál törlés), jegyezd
fel az okot **külön megjelölve, ha termékdöntés/hard-invariáns miatt akadt el** (ez nem retry-vel,
hanem `/plan <slug>` újratervezéssel — interjúval — oldódik, nem egy második batch-futással), és
menj a következő tételre.

**d. Diff-önellenőrzés** — az `/implement` 5c három kérdése a tétel diffjére (nem a teljes
batchre): teljesül-e a `Goal`; maradt-e kezeletlen szélső eset; került-e a diffbe idegen módosítás.

**e. Lezárás, push nélkül:**
```
node scripts/workflow/close.mjs <slug> --batch --title "<cím>" --body "<1-2 mondat>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"
```
A `--batch` csökkentett kapuval (`build`+`lint`+`test`, nem futtatja újra a fentit — ha az 1c.
lépés már zöld volt, ez megismétli, ami elfogadható ár a script-egyszerűségért), commitol, **nem
pushol**. Ha a script megáll:

- **módosított tervfájl** — a plan a saját implementációdtól sosem módosulhat (a `Decisions`-be
  írt indoklás a plan-fázisban készül el, nem itt); ez technikai anomália, nem termékdöntés:
  `git checkout -- <tervfájl>` (visszaáll a commitolt állapotra), a tétel **kimarad**, jegyezd fel,
  és folytasd — sosem áll meg a batch ezért.
- **untracked fájl a körön kívül** — ez **valódi megállás**, nem kimaradás: egy ismeretlen,
  nem a tételhez tartozó fájl automatikus törlése/félreállítása biztonsági kérdés (mit tartalmaz,
  kié), nem eldönthető géppel egy termékdöntés módján. **Állj meg és jelentsd** — ez különbözik a
  fenti „a batch sosem kérdez" elvtől, mert itt nem a plan hiányosságáról van szó.

Megszakadt batch újraindításánál a script felismeri a már lezárt tételt (push-olatlan
`<slug>: …` commit) és kapu/commit nélkül továbblép.

## 2. Böngészős bizonyíték

A ciklus után, **még push előtt**: `/manual-checks all` (~35 perc gépidő, ügynök-vezérelt izolált
Chrome). `Kritikus` találat egy batch-tételhez → javítás, csökkentett kapu, külön commit
(`<slug>: … — javítás`; ne amend-eld a láncban álló commitokat). Nem kritikus, vagy nem a batché →
a jelentésben marad, `/idea` javaslattal.

```
node scripts/workflow/commit-push.mjs --no-push -m "review: manual-checks all <YYYY-MM-DD>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" -- docs/reviews/<a jelentés fájlja>
```

## 3. Záró publikálás

```
node scripts/workflow/sync.mjs
```
Ez futtatja a **teljes** kapu-t (`build`+`lint`+`test`+`docs-check`, a `docs-check` itt fut
először a batchben) és egyetlen pushot ad az egész láncra. Piros itt → javítás, commit, `sync.mjs`
újra. Nem-ff (közben más session pusholt) → a script maga rebase-el és kapuz újra.

## 4. Záró jelentés

- táblázat: `slug | lezárva / kimaradt | ok (kimaradtnál)` — a kimaradt sor ok-oszlopa
  külön jelölje, ha **a plan hiányos volt** (termékdöntés/hard-invariáns bukkant fel
  implementáció közben — ide `/plan <slug>` újratervezés kell, nem újrafuttatás) a sima piros
  kapu/drift-elakadástól (retry-elhető);
- a felvitt commit-tartomány (`git log --oneline <régi HEAD>..HEAD`) és hogy fent van az
  `origin/master`-en, Pages deploy fut;
- a `/manual-checks all` találatai (Kritikus → javítva vagy `/idea` javaslat);
- emlékeztető: `/update-changelog`, `/update-features` külön, kézi hívásra fut.
