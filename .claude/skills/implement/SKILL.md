---
name: implement
description: Implement and close one or more planned backlog items (backlog[/later]/<slug>.md) end to end without a human gate — run.mjs start, then per item drift preflight, scoped implementation with tests, targeted checks, the browser slice only when the plan's Verification marks one, diff self-review, CHANGELOG/FEATURES when the change is visible to the doki, close.mjs (commit, no gate, no push); finally run.mjs finish — impact-based full gate once, one push to origin/master (Pages). Product decisions belong to /plan; a new one mid-run stops the item, not the run. Ends with a numbered manual test list for the Pages deploy. Invoke explicitly with /implement <slug>...
argument-hint: <slug>...
disable-model-invocation: true
---

# /implement <slug>...

Egy vagy több **már megtervezett** tételt visz végig a lezáró commitokig és az egyetlen
pushig, újabb emberi jóváhagyás nélkül. A termék- és scope-döntések helye a `/plan` volt;
itt az agent a technikai rutindöntést hozza, és ha új termékdöntés bukkan fel, a tétel
kimarad. A doki a Pages-en tesztel, a záró jelentés számozott tesztlistája szerint.
A fájlalak: `backlog/CLAUDE.md`. A scriptek: `scripts/workflow/` (`--help` mindnél).

Kövesd a lépéseket sorban, megállás nélkül, amíg valamelyik kifejezetten meg nem állít.

## 1. Validáció és futásindítás

- Minden slugra: a tételfájl `backlog/<slug>.md` vagy `backlog/later/<slug>.md` (a `Prio: later`
  tétel is implementálható). Olvasd ki a fejlécét. **Állj meg**, ha egy slug csak
  `backlog/idea[/later]/` alatt van (előbb `/plan`), vagy `Type: doki`.
- `git status`: a feladathoz nem tartozó commitolatlan módosításnál **állj meg** és kérdezz —
  ne építs rá, ne írd felül. (A `run start` is megáll rajta.)
- Ha van futásjelző (`.workflow/run.json`): `node scripts/workflow/run.mjs status`. Ugyanazok a
  slugok → **folytatás**: a `kész` listában lévőket hagyd ki, a többit a 2. lépéstől. Más
  slugok → **állj meg**, jelentsd az állapotot (a fejlesztő dönt: `run finish` vagy `abort`).
- `node scripts/workflow/run.mjs start <slug>...` — friss `origin/master`, kallódó commit
  rendezése, jelző. Ha megáll, **állj meg és jelentsd**.
- Több slugnál sorrend: az ugyanazt a fájlt érintő tételek egymás után (a `Current state`
  pointerei alapján), az előfeltétel a rá épülő előtt. Írd ki a sorrendet.

## 2. Tételenként

**a. Drift.** `node scripts/workflow/drift.mjs <slug>`. Exit 0: tovább. Exit 2: a 2. tételtől
normális (az előző tételek commitjai); nézd át a `Current state` pointereit a friss kódon — ha
egy döntés nem áll meg, a tétel **kimarad** (lásd f). Exit 1 (hibás Baseline): a tétel kimarad.
A tervfájlhoz ne nyúlj; ha mégis módosítani kell, külön
`commit-push.mjs -m "backlog: plan <slug> frissítve" -- <tervfájl>` (futásban push nélkül).

**b. Implementáció** a plan `Approach` + `Decisions` scope-jában — ne bővítsd, és ne kerekítsd le
egy ott nem eldöntött irányba. Új logika előtt a terület nested `CLAUDE.md`-jének „Find before
writing” indexét nézd át (`app/src`, `domain`, `storage`, `pdf`) — ne duplikálj helpert. A
kommentekre a root `CLAUDE.md` Kommentek szabálya áll. A `Verification` `tests` tételét itt
teljesítsd: teszt a leírt megfigyelhető viselkedésre, konkrét tesztnévvel, `.skip`/`.only` nélkül.
A tételhez nem tartozó hibát ne javítsd: `/idea` a záró jelentés után.

**c. Célzott ellenőrzés.** Az érintett tesztfájl(ok) (`npx vitest run <fájl>`), és amit a
változás indokol (típusok: `npx tsc -b`). Workflow-script módosításakor `npm run test:workflow`.
**Nincs teljes kapu** — azt a futás vége futtatja egyszer.

**d. Böngészős szelet — csak ha a terv kéri.** Ha a plan `Verification` szakaszában manual-check
szelet van bejelölve (`pdf`, `visual-css`, `keyboard-a11y`), futtasd most — de **nem a Skill
toolon át**: olvasd be és hajtsd végre `.claude/skills/manual-checks/SKILL.md`-t és a szelet
fájlját (izolált Chrome, seed adat, jelentés a `docs/reviews/`-ba, amit a `close --add` visz).
A tételhez tartozó találatot javítsd, és ismételd az érintett tesztet **és a böngészős
ellenőrzést**. A `Goal` bukása súlyosságtól függetlenül blokkol: a tétel kimarad. Ami nem a
tételé, a jelentésben marad. Ha a terv nem jelölt szeletet, ez a lépés kimarad — a diffből ne
mérlegelj újat.

**e. Diff-önellenőrzés és lezárás.** `git diff` a plan ellen, három sor a jelentésbe: teljesül-e
a `Goal`; maradt-e kezeletlen szélső eset, amit a plan vagy a teszt említ; került-e a diffbe
idegen módosítás (vedd ki, vagy mondd ki, miért kell). Utána:

- Docs **csak ha kell** (default: nincs docs-diff): termékszándék → `docs/PRODUCT.md`;
  discovery → nested `CLAUDE.md`, egy állítás egy sor, path-qualified anchorral.
- Ha a változás a doki számára látható: az `update-changelog` szabályai szerint egy bejegyzés a
  `docs/CHANGELOG.md`-be (a commit dátumával), és ha új képességet ad vagy meglévőt változtat,
  az `update-features` szabályai szerint a `docs/FEATURES.md` érintett sora(i) — mindkét skill
  fájlját olvasd be, a commit-lépésüket hagyd ki: a lezáró commit viszi.
- `node scripts/workflow/close.mjs <slug> --title "<cím>" --body "<1-2 mondat>" [--add
  docs/reviews/<jelentés>] --trailer "Co-Authored-By: …" --trailer "Claude-Session: …"`.
  Ha megáll: módosított tervfájl → lásd a; idegen untracked/követett fájl → ha a tételé,
  `--add`, ha nem, **állj meg és jelentsd** (nem a tiéd, nem dönthető géppel).

**f. Kimaradás.** Ha a tétel elakad (plan hibás, termékdöntés vagy hard invariáns bukkant fel,
`Goal` bukott, drift dönti a plan döntését): állítsd vissza a tétel diffjét (`git checkout --
<fájlok>`, új fájlok törlése; `git status`-szal igazold, hogy csak a tétel fájljai mozdultak),
jegyezd fel az okot **külön jelölve, ha `/plan` újratervezés kell** (termékdöntés), és menj a
következő tételre. A futás nem áll meg egy tétel miatt.

## 3. Futás lezárása

`node scripts/workflow/run.mjs finish` — a futás diffje szerinti teljes kapu egyszer, majd egy
push (nem-ff: rebase, kapu újra, push). Piros kapu: javítsd a tervek keretén belül, javító
commit (`<slug>: <cím> — javítás`, `git commit`-tal, mert a close már lezárta a tételt), újra
`run finish`. Ha a tervek keretén belül nem javítható: **állj meg**, a jelző marad, semmi nincs
pusholva — a jelentés mondja ki, mi hiányzik. **Ne kerüld meg kézi `git push`-sal.**

## 4. Záró jelentés

- táblázat: `slug | lezárva / kimaradt | ok` — kimaradtnál jelölve, ha `/plan` kell;
- a commit-tartomány (`git log --oneline <start HEAD>..HEAD`), és hogy fent van az
  `origin/master`-en, a Pages deploy elindult;
- tételenként a `Verification` eredménye és a 2e három sora; drift esetén mi mozdult és miért
  áll a plan; docs-diff (fájl, sor), CHANGELOG/FEATURES érintett-e;
- a tételhez nem tartozó talált hibák kész `/idea` parancssorai;
- **számozott kézi tesztlista a dokinak a Pages-hez** — ezzel végződik a jelentés.
