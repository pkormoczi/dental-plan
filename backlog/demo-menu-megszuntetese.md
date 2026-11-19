# demo-menu-megszuntetese
Type: feature
Source: doki felvetés 2026-11-19, a demo-lebontasa kettébontása; desktop-app-migration-plan-final.md §8
Target: master
Baseline: 32fecbc2ee23285d44109250b519ffe5487272bb

## Goal
A fő menüben nincs DEMO: helyette „Összes terv” menüpont (a Páciensek után) és a jobb szélen egy
„Súgó” (Funkciók, Változásnapló); a Pages-demó Filerendszer és Adatkezelés füle a Beállítások alatt
él, a régi `/demo/...` címek az új helyre visznek.

## Current state
- `app/src/components/NavBar.tsx` `FO_LINKS` (`DEMO` → `/demo`); `app/src/components/NavBar.test.tsx`.
- `app/src/pages/DemoPage.tsx` `FULEK`, `CSAK_DEMO`, `ervenyesFul`: öt fül `/demo/:tab` címen,
  `replace` navigációval; a telepített appban (`adattarolas != null`) a Filerendszer és az
  Adatkezelés rejtett. `app/src/pages/DemoPage.test.tsx`.
- `app/src/App.tsx`: `/tervek` → `Navigate` a `/demo/tervek`-re; `/demo`, `/demo/:tab`.
  `app/src/App.test.tsx` és `app/src/pages/PatientPage.test.tsx` a `#/demo/tervek` hash-t várja.
- Tartalom: `app/src/pages/demo/OsszesTervSection.tsx`, `FileTreeSection.tsx`,
  `AdatkezelesSection.tsx`; `app/src/components/FeatureOverviewCard.tsx`, `ChangelogCard.tsx`.
- `app/src/pages/SettingsPage.tsx` `SettingsTab`, `toSettingsTab` (`?tab=`; az Adattárolás csak
  telepítve); `app/src/pages/SettingsPage.test.tsx`.
- `app/src/components/DemoBanner.tsx`: a szöveg a „DEMO oldal Adatkezelés fülére” mutat.
- `app/src/components/AdatmappaKapu.test.tsx`: telepítve a `#/demo/filerendszer` a Funkciókra esik.
- Szöveg, ami a DEMO-ra hivatkozik: `docs/FEATURES.md` „## DEMO”; `docs/TELEPITES.md` „Átvitel a
  demóból” 1. lépés; `.claude/skills/update-features/SKILL.md` (menüpont-lista,
  `pages/demo/OsszesTervSection.tsx`); `.claude/skills/manual-checks/SKILL.md` és `visual-css.md`
  (`#/demo/tervek`); `backlog/idea/electron-telepitesi-proba.md` („DEMO → Adatkezelés”);
  `docs/desktop-app-migration-plan-final.md` §8 táblázata.

## Approach
- Menü: Kezdőlap · Páciensek · Összes terv (`/tervek`) · Kezelések és árak · Beállítások, a jobb
  szélen Súgó (`/sugo`). A DEMO link és a `DemoPage` megszűnik.
- `/tervek` közvetlenül a mai tervfát rendereli, saját oldalcímmel; tartalma, akciói és lista-memóriája
  változatlan.
- Súgó oldal két füllel: Funkciók (alapértelmezett) és Változásnapló, `/sugo/:tab`; a két kártya
  tartalma változatlan.
- Beállítások, csak a Pages-demóban: az Egyéb után Filerendszer és Adatkezelés fül, a mai
  tartalommal; a telepített appban helyettük az Adattárolás látszik, egyszerre csak az egyik pár.
- Régi címek: `/demo` és `/demo/funkciok` → Súgó/Funkciók; `/demo/valtozasnaplo` → Súgó/Változásnapló;
  `/demo/tervek` → `/tervek`; `/demo/filerendszer`, `/demo/adatkezeles` → a Beállítások megfelelő füle
  (telepítve a Beállítások alapfüle); ismeretlen `/demo/*` → Súgó.
- A demó-sáv szövege a Beállítások Adatkezelés fülére mutat; a sáv maga marad.
- A fenti szövegek az új helyre mutatnak; a hamissá váló kódkommentek (NavBar „öt tételes”, a kártyák
  és a szekciók fejléce, `vite.config.ts`) frissülnek.
- Nem tartozik ide: a `DemoStorage`, a `StorageContext` demó-only mezői, a `demoFileTree`, a demó-sáv
  és a Pages-deploy megszüntetése (`demo-lebontasa`); a fülek tartalmának bármilyen változása.

## Decisions
- Összes terv saját menüpont a `/tervek` címen — a doki döntése; nem a Páciensek oldal füle, mert az
  oldal átépítését kérné; nem szűnik meg, mert a migrációs terv valódi funkcióként tartja meg.
- Funkciók és Változásnapló egy jobb szélre zárt Súgó alatt — a doki döntése; nem Beállítások-fül, mert
  a konfiguráció közé keverné a tájékoztatást; nem Kezdőlap-kártya, mert onnan már egyszer lekerültek.
- Filerendszer és Adatkezelés a Beállítások Pages-only füle a mai néven — a doki döntése; ugyanott, ahol
  telepítve az Adattárolás él; nem a Súgóban, mert ott törlő gombok lennének; a Filerendszer nem szűnik
  meg most, az a `demo-lebontasa` dolga.
- A Súgó fülei a `DemoPage` `/<oldal>/:tab` + `replace` mintáját követik, a Beállítások új fülei a
  meglévő `?tab=` + `toSettingsTab` útját — mert ezek őrzik a vissza-gomb lista-memóriáját és a
  mentetlen-módosítás őrt; nem új fülkezelés.
- A `pages/demo/` alatt csak a két demó-only szekció marad, az Összes terv és a Súgó kiköltözik — mert
  a `demo-lebontasa` így mappahatáron töröl.

## Verification
- [ ] tests — a fő menü linkjei: Kezdőlap, Páciensek, Összes terv (`/tervek`), Kezelések és árak,
      Beállítások, Súgó (`/sugo`); DEMO link nincs
- [ ] tests — a `/tervek` közvetlenül a tervfát mutatja (nincs átirányítás), az „Új verzió” onnan működik
- [ ] tests — a Súgó két füle URL-ről nyitható, az ismeretlen fül a Funkciókra esik
- [ ] tests — minden régi `/demo/<fül>` cím az új helyre visz, a puszta `/demo` a Súgó Funkciók fülére
- [ ] tests — Pages-en a Beállításokban van Filerendszer és Adatkezelés fül, Adattárolás nincs; telepítve
      fordítva, és a `?tab=adatkezeles` ott az alapfülre esik
- [ ] tests — a demó-sáv a Beállítások Adatkezelés fülére utal
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a NavBar jobb szélre zárt eleme stílusváltozás; az új `/tervek`,
      `/sugo` route és a Beállítások két új füle (a Filerendszer kétpaneles nézete a 900 px-es lapon)
