---
name: implement-batch
description: Több tervezett vagy ötlet-státuszú backlog-tétel egymás utáni implementálása és lezárása egyetlen pushsal — tudatosan A DOKI KÉZI KAPUJA NÉLKÜL. Tételenként /plan --quick (ha még idea/ alatt van), drift.mjs, implementáció a plan scope-jában, csökkentett kapu (build+lint+test), close.mjs --batch (commit, push nélkül). A ciklus után egy /manual-checks all a jsdom-vakfoltra, majd sync.mjs: teljes kapu (a docs-check is itt fut, egyszer) + EGY push az egész batchre. Elakadt tétel kimarad, a többi megy tovább. Nem batch-tétel: Type: doki, nyitott Kerdes:, vagy hard invariánst / docs/PRODUCT.md Nem célt érintő döntés — az a /plan interjús útra tartozik. Invoke explicitly with /implement-batch <slug> <slug>...
argument-hint: <slug> <slug>...
disable-model-invocation: true
---

# /implement-batch <slug> <slug>...

## Mikor NE ezt használd

Ez a skill a doki kézi ellenőrzését **tudatosan kihagyja** — a tétel emberi szem nélkül zár és
kerül fel az `origin/master`-re (Pages-élesítés). Csak arra való, amit egy zöld gépi kapu és a
`/manual-checks` valóban bizonyít: domain-logika, szöveg/copy, attribútum, storage. **Ne vedd fel
a listába**, ha a tétel:

- `Type: doki`, vagy nyitott `Kerdes:` sora van — az termékdöntés, nem eldönthető géppel;
- hard invariánst érint, vagy `docs/PRODUCT.md § Nem cél`-t közelít;
- a doki által látható viselkedés több mondatban írható le, vagy a döntés nem egyértelmű.

Ezekre `/plan <slug>` (interjúval) → `/implement <slug>` → kézi teszt → `/finish <slug>` —
az egytételes utat ez a skill nem helyettesíti, csak kiegészíti.

## 0. Preflight

A fő könyvtárban, `master`-en, tiszta munkafával:

1. `node scripts/workflow/sync.mjs` — friss `origin/master`, és felviszi az esetleg ott
   kallódó push-olatlan commitot. Ha megáll, **állj meg és jelentsd**.
2. Minden megadott slugra: `findItem` (a `backlogPath.mjs` modulja, amit a `drift.mjs`/`close.mjs`
   is használ) — **állj meg**, ha egy slug nem létezik, két helyen él, vagy `Type: doki`.
3. `node scripts/workflow/drift.mjs --all` a tervezett tételek gyors áttekintéséhez.
4. **Sorrendezd terület-fürtökbe**: a tételek `Current state`/leírás pointerei alapján csoportosítsd
   úgy, hogy az ugyanazt a fájlt érintő tételek egymás után kövessék (pl. `PreviewPage.tsx`,
   `PatientPage.tsx`, `planEditor/*` több tételben is szerepelhet) — ez teszi a drift-jelzést
   kiszámíthatóvá lent. Írd ki a végleges sorrendet, mielőtt elindulsz.

Ajánlott listahossz ≤ 10–12 tétel egy futásra — hosszabb listánál inkább több futás.

## 1. Ciklus, tételenként

**a. Tervezés, ha kell.** Ha a slug `backlog/idea[/later]/<slug>.md`-ként él: `/plan <slug> --quick`
a ciklusban (a `plan/SKILL.md` `--quick` sávja — interjú nélkül, ha a kockázat kicsi). Ha
tervezés közben döntési ág bukkan fel (két irány, invariáns-érintés, scope-kérdés, látható
viselkedés — a `plan/SKILL.md` „Mit kérdezz” listája), **ne válts vissza interjúra a batchben**:
a tétel **kimarad**, jegyezd fel „interjút kér”-ként, és menj a következőre.

**b. Drift.** Ha a slug már `backlog[/later]/<slug>.md`: `node scripts/workflow/drift.mjs <slug>`.
A batch 2. tételétől kezdve az **exit 2 (drift) normális** — az előző tételek saját commitjai
okozzák. Nézd át a `Current state` pointereit a friss kódon; ha egy döntés emiatt nem áll meg,
a tétel **kimarad**, jegyezd fel miért.

**c. Implementáció** a plan `Approach` + `Decisions` scope-jában — az `/implement` 4. lépésének
szabályai szó szerint érvényesek: nested `CLAUDE.md` „Find before writing” index átolvasása
(ne duplikálj helpert), a root `CLAUDE.md` Kommentek szabálya, teszt a `Verification` megfigyelhető
viselkedésére, `.skip`/`.only` nélkül. Ha a plan hibásnak bizonyul, vagy a tételhez nem tartozó
hibát találsz — ugyanaz a szabály, mint `/implement`-nél: **ne javítsd**, ne bővítsd a scope-ot;
a tétel elakadásaként kezeld (lásd lent), a nem-idetartozó hibát a záró jelentés után `/idea`-ba.

**d. Csökkentett kapu**, az `app/` alatt:
```
npm run build
npm run lint
npm test
```
(`docs-check` szándékosan kimarad — a záró `sync.mjs` futtatja egyszer, az egész batchre.) Piros
és scope-on belül nem javítható → **a tétel elakad**: állítsd vissza a munkafát az előző tétel
állapotára (`git status`-tal ellenőrizve, hogy csak az aktuális tétel érintett fájljai módosultak,
majd `git checkout -- <fájlok>` / új fájloknál törlés), jegyezd fel az okot, és menj a következő
tételre. **Ne lépj át** hard-invariáns-sértést vagy termékdöntést kérő elakadást — ott állj meg és
kérdezd meg a dokit, mielőtt folytatod a batchet.

**e. Diff-önellenőrzés** — az `/implement` 5c három kérdése a tétel diffjére (nem a teljes
batchre): teljesül-e a `Goal`; maradt-e kezeletlen szélső eset; került-e a diffbe idegen módosítás.

**f. Lezárás, push nélkül:**
```
node scripts/workflow/close.mjs <slug> --batch --title "<cím>" --body "<1-2 mondat>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"
```
A `--batch` csökkentett kapuval (`build`+`lint`+`test`, nem futtatja újra a fentit — ha az 1d.
lépés már zöld volt, ez megismétli, ami elfogadható ár a script-egyszerűségért), commitol, **nem
pushol**. Ha a script megáll (untracked a körön kívül, módosított tervfájl), old fel a
`close.mjs`/`finish/SKILL.md` szerint, majd folytasd. Megszakadt batch újraindításánál a script
felismeri a már lezárt tételt (push-olatlan `<slug>: …` commit) és kapu/commit nélkül továbblép.

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

- táblázat: `slug | lezárva / kimaradt | ok (kimaradtnál)`;
- a felvitt commit-tartomány (`git log --oneline <régi HEAD>..HEAD`) és hogy fent van az
  `origin/master`-en, Pages deploy fut;
- a `/manual-checks all` találatai (Kritikus → javítva vagy `/idea` javaslat);
- emlékeztető: `/update-changelog`, `/update-features` külön, kézi hívásra fut.
