---
description: A helyi masteren várakozó, még push-olatlan backlog-commit(ok) feltöltése origin/master-re.
disable-model-invocation: true
---

# Várakozó backlog-commitok push-olása

Ezt a parancsot azután add ki, hogy egy vagy több `/finish <slug>`
futás helyi masteren commitolt, te kézzel ellenőrizted az eredményt, és
jónak találtad. Nincs branch, nincs PR — a helyi master egyenesen
origin/master-re kerül.

Kövesd az alábbi lépéseket sorban, megállás nélkül, amíg valamelyik lépés
kifejezetten meg nem állít.

## 1. Állapot-ellenőrzés

`git status` — ha van commitolatlan módosítás, **állj meg és jelentsd**,
ne nyúlj hozzá.

`git branch --show-current` — ha nem `master`, **állj meg és jelentsd**;
ez a parancs kizárólag a helyi master push-olására való.

## 2. Várakozó commitok felmérése

`git fetch origin`, majd `git log origin/master..HEAD --oneline`.

Ha ez üres, jelentsd, hogy nincs mit push-olni, és állj meg.

Egyébként jegyezd meg a listát (a tételek slugja a commit-üzenetek első
sorából, `<slug>: <cím>` alakban) a záró jelentéshez.

## 3. Push

`git push origin master` (sima push, **soha ne force**).

- **Ha sikerül:** ugorj a 4. lépésre.
- **Ha nem fast-forward hiba miatt bukik** (origin/master időközben
  előrelépett): próbálkozz `git pull --rebase origin master`-rel.
  - **Ha konfliktusmentesen lezárul:** futtasd újra a `git push origin
    master`-t (most már fast-forward-elhető) — a minőségi kaput
    (`npm run build`/`lint`/`test`) nem kell újrafuttatni.
  - **Ha a rebase konfliktusba fut:** állj meg, jelentsd a konfliktusos
    fájlokat, és **hagyd a rebase-t félbehagyott állapotban** — ne oldj
    fel semmit automatikusan, ne futtass `--abort`-ot. A doki oldja fel
    kézzel és futtassa a `git rebase --continue`-t.
    Miután a doki lezárta (nincs több konfliktus): futtasd újra
    mindhármat az `app/` alatt (`npm run build`, `npm run lint`,
    `npm test`) — a konfliktus feloldása módosíthatta a kódot. Ha
    bármelyik hibázik, javítsd és futtasd újra, majd `git push origin
    master`.

## 4. Záró jelentés

Foglald össze:

- mely tétel(ek) commitjai mentek fel (a 2. lépésben gyűjtött lista
  alapján),
- ha rebase-elni kellett, egy mondat arról, mi történt,
- emlékeztető a `/update-changelog`/`/update-features`-re, ha releváns és
  még nem futott le a most felment tétel(ek)re.
