# close-add-kovetett-fajl
Type: bug
Source: electron-csomagolas és electron-mac-ascii-nev implementálása közben talált (2026-11-17)
Target: master
Baseline: 70dc2d6e0dac4d8d5eaffd4d584133c58df6e1a4

## Goal
Repro: futás közben egy követett, az ismert körön kívüli fájl (pl. `docs/TELEPITES.md`) módosul;
a `close.mjs` „Ha a tételé: --add <path>” üzenettel megáll, a `--add <path>` pedig „már követett
fájl” hibával. Elvárt: a `--add` a megnevezett, körön kívüli követett módosítást is a lezáró
commitba viszi, így a tétel egy commit marad.

## Current state
- `scripts/workflow/close.mjs`: a `--add` ellenőrző ciklusa minden követett path-ot elutasít
  („már követett fájl, nem kell megnevezni”); az `allowed` szűrő az `a.add`-ot már figyelembe venné,
  de oda követett path nem juthat el; a `HELP` szerint a `--add` csak untracked path-ra való.
- `scripts/workflow/workflow.test.mjs`: „close megáll idegen követett docs-fájl módosításánál és
  megőrzi azt”, „close --add nem létező vagy már követett path-ra hibázik” (az utóbbi a
  módosítatlan `backlog/x.md`-vel).
- `backlog/README.md` script-táblája a `close.mjs` sorában: megáll „`--add` nem létező / már
  követett path”-ra.
- `.claude/skills/implement/SKILL.md` 2e lépése már most is ezt írja elő: „idegen untracked/követett
  fájl → ha a tételé, `--add`”.

## Approach
Csak a `close.mjs` `--add`-ellenőrzése és súgója változik: a `--add` elfogad követett path-ot, ha
annak van módosítása (staged vagy unstaged), és az így megnevezett fájl a lezáró commitba kerül; a
megnevezés nélküli idegen követett módosítás továbbra is megállít. A `--fix` ág ugyanígy viselkedik
(közös kód). A `backlog/README.md` sorai és a `HELP` szövege ehhez igazodik. Nem tartozik ide az
ismert kör (`ALLOWED_TRACKED`) bővítése és a `commit-push.mjs`.

## Decisions
- Név szerinti `--add` a követett fájlra is — mert a README „a commit hatóköre gépi őr” elve
  csak a *csendes* bekerülést tiltja, és az untracked fájlokra ugyanez a minta él; nem csak a
  hibaüzenet javítása, mert az a tétel változását továbbra is két commitra szakítaná.
- Módosítatlan követett path `--add`-ja hiba marad (új szöveggel: nincs mit hozzáadni) — mert az
  elírást jelez.

## Verification
- [ ] tests — körön kívüli követett módosítás `--add`-dal a lezáró commitba kerül, egy másik,
      meg nem nevezett idegen követett módosítás mellett a close megáll és semmit nem commitol;
      `--add` nem létező path-ra és módosítatlan követett path-ra hibázik; `--fix` alatt is működik
- [ ] test:workflow
- [ ] docs-check
