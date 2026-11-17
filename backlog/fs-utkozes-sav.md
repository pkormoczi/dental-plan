# fs-utkozes-sav
Type: feature
Source: desktop-app-migration-plan-final.md §4.7, §10.2a (az fs-utkozesor-ból kibontva)
Target: master
Baseline: 8fc5fb07cc24480bbb7a23f3e75e7acee0219112

## Goal
A telepített app indulás után a Kezdőlapon amber sávban listázza, amit a Drive-szinkron vagy egy félbemaradt mentés a gyökérmappában hagyott — semmit nem old fel, a doki tételenként „Mappa megnyitása”-val a Fájlkezelőben rendez —, a listák pedig nem mutatnak ál-pácienst vagy ál-tervet.

## Current state
- `app/src/storage/fajlTarolo.ts` `listPatients`/`listPlans`: a mappa minden nevét bejegyzésnek veszik (fájlt, `.tmp-*`-ot, „ (1)” mappát is), csak `PATIENT_ROOT_FILES`-szűréssel; a `listVersions` már csak `parseVersionDirName`-mintát vesz.
- `app/src/storage/paths.ts` `parsePatientDirName`/`parsePlanDirName` (`_<id6>` utótag), `parseVersionDirName`.
- `app/src/storage/fajlPrimitivek.ts` `FajlPrimitivek`: módosítási idő nincs; `app/electron/fsPrimitivek.ts` a gyökérbe zárt útvonalfeloldással.
- `app/src/pages/Home.tsx`; main-oldali shell-csatorna nincs (`app/electron/main.ts`, `app/electron/ipcKezelok.ts`, `app/electron/preload.ts`).

## Approach
- Új `PlanStorage`-metódus az ütközés-listára (a mag implementálja, a `DemoStorage` üres listát ad, IPC-n át is). Bejárja a gyökeret, a `paciensek/`-et, minden páciens- és tervmappát (verziómappák belsejét nem), és tételenként visszaadja a gyökérhez relatív útvonalat és a fajtát: Drive-ütközéses név (fájl és mappa: „ (n)” utótag, „conflicted copy”, „Conflict”); egy tervmappán belül azonos sorszámú verziómappák; az `_utkozesek/` tartalma; 24 óránál régebbi `.tmp-*` (fájl és mappa). A 24 órához a primitívek módosítási időt adnak.
- Kezdőlap: amber sáv, tételenként egy emberi sor (fajta + útvonal) „Mappa megnyitása” gombbal, a sávon „Elrejtés”. Az elrejtés az app bezárásáig tart; újraindításkor a sáv visszajön, ha a tételek megvannak. A vizsgálat futásonként egyszer, indulás után a háttérben fut, a betöltést nem késlelteti; ha hibázik, a sáv csendben elmarad.
- „Mappa megnyitása”: új, szűk main-oldali IPC-csatorna a meglévő küldő-ellenőrzéssel. Paramétere gyökérhez relatív útvonal, a main a gyökérbe zárja, és a rendszer fájlkezelőjében kijelölve mutatja az elemet. A demóban nincs.
- `listPatients`/`listPlans` csak az app saját `<név>_<id6>` mintájú bejegyzéseit veszi.
- `app/src/storage/CLAUDE.md`: egy sor, hogy ütközést az app nem old fel, csak listáz; anchorral.
- NEM ide: automatikus átnevezés, törlés vagy összefésülés; a gyökér „Mappa megnyitása” az Adattárolás szekcióban (`gyokermappa-varazslo`, ezt a csatornát használhatja); a vizsgálat ismétlése futás közben; az `_utkozesek/` írása (`fs-utkozesor`).

## Decisions
- Elrejtés az app bezárásáig — doki döntése; nem állandóan látszó (napközben zavar), nem „csak az új tételek” (gépenkénti állapot kellene, és eltanítana a sávtól).
- Az ütközéses és `.tmp-*` nevek csak a sávban látszanak — doki döntése; egy „ (1)” mappa tartalma az appból nem nyitható, amíg a doki nem rendezi.
- A listák szűrése mintára, nem tiltólistára — a `.DS_Store`/`desktop.ini`-féle OS-fájlokat is kiveszi (a Finder/Explorer böngészés közben teszi a mappákba, ma ál-páciens lenne), és az új Drive-névváltozatokat is követi; minden app-készítette név `_<id6>`-ra végződik.
- Külön metódus, nem az `init()` eredménye — a vizsgálat nem blokkolhatja az indulást (hideg Drive-mappán másodpercek), az `init()` szerződése változatlan.
- Kijelölve mutatja az elemet, nem csak a mappát nyitja — a doki a két változatot egymás mellett látja; csak ez a shell-hívás, külső megnyitás nem.
- Azonos sorszám más dátummal is duplikátum — a két gép eltérő napon adhatja ugyanazt a `_vN`-t.

## Verification
- [ ] tests (Node): szintetikus gyökérben „ (1)” fájl és mappa, „conflicted copy”, két `_v3` (egyik más dátummal), `_utkozesek/` fájl, friss és 24 óránál régebbi `.tmp-*` → pontosan a várt tételek (a régi `.tmp-*` igen, a friss nem); semmi nem törlődött vagy nevezték át.
- [ ] tests: `listPatients`/`listPlans` nem ad vissza ütközéses, `.tmp-*` és mintán kívüli bejegyzést; a Demo-futás változatlan.
- [ ] tests: a „Mappa megnyitása” csatorna idegen küldőt, gyökéren kívüli és `..`-t tartalmazó útvonalat elutasít.
- [ ] tests (jsdom): a sáv tételenként gombbal jelenik meg; Elrejtés után az adott futásban nem jön vissza; üres listánál nincs sáv.
- [ ] typecheck/lint
- [ ] docs-check
