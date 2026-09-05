# Backlog 29. tétel — Fő navigáció és végleges IA — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 29. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` alatti nagy redesign-döntéssorozat
(D1–D606, `redesign`) DP-001
szelete (`redesign`
3. fejezet). A redesign-interjú már lezajlott, ezért ez a dokumentum nem egy
   új grill-me session eredménye, hanem a DP-001 hatókörére eső D-döntések
   szintézise a szokásos terv-file formára. **Fontos:** az itt hivatkozott
`D1`/`D35`/`D46` stb. számok a redesign saját, önálló D1–D606 számozásából
   valók (`redesign`) — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájának számozásával. Lezáráskor a ténylegesen tartós döntések a
   szokásos módon, ÚJ, a `docs/01` táblájából szabad D-számot kapnak
   (`CLAUDE.md` § Backlog-tétel lezárása).

## Probléma

A mai `NavBar.tsx` 9 egyenrangú, lapos linket mutat: `Kezdőlap | Páciens |
Terv szerkesztő | Előnézet | Korábbi tervek | Páciensek | Árlista |
Beállítások | Filerendszer`. A redesign (redesign-D1, -D35, -D46, C1) egy
patient-first, öt tételes fő navigációt ír elő:
`Kezdőlap | Páciensek | Kezelések és árak | Beállítások | DEMO`. Ebben a
mai önálló oldalak egy része máshova olvad (Korábbi tervek a páciens
`Kezelési tervek` tabjába, Filerendszer és a Kezdőlap changelog-kártyája a
DEMO alá) vagy átnevezésre kerül (Árlista → Kezelések és árak).

## Döntések

### 1. Végleges öt tételes fő navigáció, forrás: redesign-D46 + C1

`Kezdőlap | Páciensek | Kezelések és árak | Beállítások | DEMO` — ez a
redesign explicit, változtatás nélkül átvett végállapota (a korábbi
redesign-D2 kezdeti javaslatát a redesign-D46 már felülírta, a C1
konfliktus-feloldás pedig az egész IA-t forrásigazságnak nyilvánította a
régi `03-funkcionalis-spec.md`-vel szemben).

**Miért:** ez a redesign egyetlen explicit, vitán felüli végállapota a fő
navigációra — nincs mérlegelendő alternatíva, a döntés már megszületett a
redesign-interjúban.

### 2. Ez a tétel csak a nav-HÉJAT és két önmagában lezárható oldalt mozgat — a `Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi tervek` linkek egyelőre VÁLTOZATLANUL maradnak

A redesign szerint a mai `Páciens`, `Terv szerkesztő`, `Előnézet`,
`Korábbi tervek` linkek megszűnnek mint önálló nav-pontok — tartalmuk a
páciens-workflow alá költözik (Páciensek → páciens részletei →
`Kezelési tervek` tab → terv workflow, kattintható breadcrumb + stepper).
Ez a beolvasztás azonban két MÁSIK, önálló redesign-backlog-tételben
történik (DP-002 Páciens detail shell, DP-003 Terv workflow shell) — amíg
azok nincsenek kész, e négy link törlése elérhetetlenné tenné a doki
számára a terv szerkesztést. Ezért ez a tétel a négy linket
**változatlanul hagyja** a NavBaron, és csak azt végzi el, ami önmagában
is lezárható és nem told el semmilyen mai funkciót:

- Új `DEMO` nav-pont, ami alá a `Filerendszer` (ma önálló nav-pont) és a
  Kezdőlapról levett Changelog/Funkciólista kártyák kerülnek.
- Az `Árlista` nav-link és oldalcím átnevezése `Kezelések és árak`-ra
  (útvonal és belső tartalom változatlan).
- A `Páciensek` link már ma is a végleges nevén és helyén van (28. tétel
  eredménye), nem változik.

**Miért:** a jól méretezett backlog-item kritérium (ne legyen benne
egymástól független feature, önmagában tesztelhető legyen) kizárja, hogy
egy tétel a doki munkaeszközét ideiglenesen elérhetetlenné tegye egy
másik, még el nem készült tétel miatt. **Elvetett alternatíva:** a négy
link azonnali eltávolítása, üres/placeholder oldalakkal a DP-002/DP-003
elkészültéig — elvetve, mert ez rosszabb UX-et adna a mainál pont a
golden path közepén, cserébe semmivel sem visz közelebb a végállapothoz.

### 3. DEMO oldal: egyetlen új top-level route, két tartalom együtt

A `Filerendszer` (ma `/filerendszer`, `FileTreePage`) és a Kezdőlapról
(`Home.tsx`) eltávolított `ChangelogCard`/`FeatureOverviewCard` egy közös
`DEMO` nav-pont alatt jelenik meg. A két tartalom egymáshoz képesti
elrendezése (egy görgethető oldal két szekcióval vs. belső
al-navigáció/tab) az implementáló döntése — a redesign-dokumentum ezt nem
specifikálja pontosabban.

**Miért:** a C1 feloldás explicit kimondja, hogy a Filerendszer "nem
önálló üzleti menüpont", és hogy a Changelog/Funkciólista "ugyanide"
költözik — de a kettő egymáshoz való belső viszonyáról nem dönt, tehát ez
implementációs szabadság, nem hiányzó döntés.

### 4. A `Kezelések és árak` belső szerkezete NEM ennek a tételnek a része

A C1 feloldás kifejezetten elveti a korábbi redesign-D47 `Tételek |
Kategóriák` tab-elnevezést mint véglegeset, de a mai
`PriceListAdminPage` amúgy sincs Tabs-alapon felépítve (egy összecsukható
"Kategóriák" panel van a tételtábla felett, `PriceListAdminPage.tsx:887–923`)
— ez a tétel csak a nav-linket és az oldalcímet nevezi át, a belső
elrendezést nem érinti.

**Miért:** a belső admin-UX messze túlmutat egy nav-átnevezésen, és a
redesign maga sem zárta le, milyen legyen — külön tételként kell
kidolgozni (redesign-javaslat szerint DP-080/DP-081).

### 5. A `Beállítások` nav-link és tartalma változatlan

A `Beállítások` link neve és útvonala már ma is megegyezik a véglegessel;
a redesign által előírt belső tab-szerkezet (`Rendelő | Orvosok |
Dokumentum | Tárolás`, redesign-D53) a mai `SettingsPage`-en még nem
létezik (öt egymás alatti Card-szekció van, Tabs nélkül: Rendelő adatai,
Orvosok, Ajánlat és nyelv, Nyomtatvány szövegei, Logó) — ennek kialakítása
külön tétel.

**Miért:** ugyanaz az elv, mint a 4. döntésnél — a nav-héj szintjén nincs
teendő, a belső átalakítás máshova tartozik (redesign-javaslat szerint
DP-082/DP-083/DP-084/DP-085/DP-087).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- `Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi tervek` nav-linkek
  végleges megszüntetése és tartalmuk beolvasztása a páciens-workflow-ba —
  ez a tétel EXPLICIT előfeltétele a redesign-javaslat DP-002 (Páciens
  detail shell) és DP-003 (Terv workflow shell) tételeinek, nem fordítva.
- `Kezelések és árak` belső tab-/panel-szerkezete — külön tétel
  (redesign-javaslat DP-080/DP-081).
- `Beállítások` belső tab-szerkezete (Rendelő/Orvosok/Dokumentum/Tárolás)
  — külön tétel (redesign-javaslat DP-082–DP-085, DP-087).
- Kezdőlap többi átalakítása (fő CTA, aktív draft blokk, recent páciensek,
  redesign-D20) — külön tétel (redesign-javaslat DP-010); ez a tétel a
  Kezdőlapon KIZÁRÓLAG a Changelog/Funkciólista kártyák eltávolítását
  végzi.
- A DEMO oldal esetleges jelszóvédelme/elrejtése éles környezetben — nem
  merült fel a redesign-ben, nem témája ennek a tételnek.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/NavBar.tsx:5–15` — a `LINKS` tömb: `Árlista` →
  `Kezelések és árak` átnevezés, `Filerendszer` törlése, új `DEMO`
  bejegyzés hozzáadása; `Páciens`/`Terv szerkesztő`/`Előnézet`/`Korábbi
  tervek` VÁLTOZATLAN marad (lásd 2. döntés).
- `app/src/App.tsx:49–64` — új `/demo` route egy új oldal-komponensre; a
  `/filerendszer` route megszűnhet vagy belső aliassá válhat (implementáló
  döntése).
- `app/src/pages/FileTreePage.tsx` — tartalma átkerül/beépül az új DEMO
  oldalba.
- `app/src/pages/Home.tsx:198,200` — a `ChangelogCard`/`FeatureOverviewCard`
  renderelés eltávolítása.
- `app/src/components/ChangelogCard.tsx`,
  `app/src/components/FeatureOverviewCard.tsx` — importjuk átkerül az új
  DEMO oldalra.
- `app/src/pages/PriceListAdminPage.tsx:371–373` — az oldalcím (`Árlista`
  → `Kezelések és árak`).
- Új fájl: `app/src/pages/DemoPage.tsx` (vagy hasonló elnevezés) — a
  Filerendszer + Changelog/Funkciólista közös konténere.
- `docs/03-funkcionalis-spec.md` — ha van a mai IA-t leíró bevezető
  szakasz, lezáráskor frissítendő az új navigációra.

## Tesztelés (irányadó, nem kimerítő)

- A NavBar pontosan a megadott linkeket mutatja (a véglegesnek szánt öt,
  plusz a 2. döntés szerint egyelőre megtartott négy), a megadott
  sorrendben és feliratokkal.
- `/demo` alatt mind a Filerendszer, mind a Changelog/Funkciólista
  tartalom elérhető és ugyanúgy működik, mint korábban.
- A Kezdőlapon a Changelog/Funkciólista kártyák többé nem jelennek meg, a
  többi kártya (piszkozat folytatása, adatkezelés) változatlan.
- Az `Árlista`/`Kezelések és árak` oldal tartalma és funkciója (tétel- és
  kategóriakezelés) bájtra változatlan, csak a cím/nav-felirat változik.
- A `/filerendszer` közvetlen URL (ha megmarad aliasként) vagy hibátlanul
  átirányít az új helyre, vagy szándékosan megszűnik — az implementáló
  döntése szerint, de teszteléssel igazolva.
