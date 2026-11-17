# close-add-kovetett-fajl
Type: bug
Source: electron-csomagolas és electron-mac-ascii-nev implementálása közben talált (2026-11-17)

A `scripts/workflow/close.mjs` két ellenőrzése ellentmond egymásnak. Repro: futás közben módosíts
egy követett fájlt az ismert körön kívül (pl. `docs/TELEPITES.md` vagy
`docs/desktop-app-migration-plan-final.md`), majd `close.mjs <slug>`. Ekkor megáll („követett
módosítás a tétel körén kívül … Ha a tételé: --add <path>”), `--add <path>`-szal pedig azért áll
meg, mert „már követett fájl, nem kell megnevezni”. Ma csak úgy kerülhető meg, ha a fájl egy külön
`commit-push.mjs` commitba megy, így a tétel változása két commitra szakad. Elvárt: a `--add` a
körön kívüli, követett módosítást is név szerint beengedje a lezáró commitba (az untracked
fájlokhoz hasonlóan), vagy a hibaüzenet a ténylegesen működő utat mondja. A `--fix` ág ugyanígy
érintett. Nem tartozik ide az ismert kör bővítése (pl. az egész `docs/`).
