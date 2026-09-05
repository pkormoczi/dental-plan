# Migrációs terv — agent-first dokumentációs modell (V2) bevezetése, a régi modell kivezetése

Ez a dokumentum **végrehajtási terv**, nem élő specifikáció. A célmodellt a
`docs/agent-first-documentation-model_V2.md` írja le, a kiváltó problémákat a
`docs/PROBLEMS.md`. Ez a fájl azt mondja meg, milyen sorrendben, milyen
commitokkal, mely fájlokat érintve jutunk el a mai állapotból a célállapotba,
és mit migrálunk a régi dokumentumokból. A végrehajtás végén (F10) ez a fájl
is a `docs/legacy/`-be kerül a másik kettővel együtt.

Készült: 2026-09-05. Kiindulási commit: `22eb464`.

---

## 0. Döntések, amikre a terv épül

A doki döntései (2026-09-05):

| # | Kérdés | Döntés |
|---|---|---|
| 1 | A régi docs sorsa | **Karantén `docs/legacy/`** alá, `git mv`-vel. Semmi nem hivatkozhat rá (gépi őr). Törlés 2026-11-04 után, külön commitban. |
| 2 | A forráskód ~824 `D<szám>` hivatkozása | **Egy menetben, most** — production kód és tesztek egyaránt. |
| 3 | Workflow-skillek | **Új `/plan`, `/implement`, `/finish`** a V2 szerint; `browser-validation` → `manual-checks`; a többi skill hivatkozásai kisöpörve. |
| 4 | Backlog-kezelés (`BACKLOG.md`, `plans/`, `ideas/`, sorszámozás) | **Nem része ennek a körnek.** Külön tétel lesz. |

A 4. döntésből következő feltételezések (ha bármelyik nem áll, itt kell módosítani, mielőtt F9 indul):

- A `backlog/done/` a **régi dokumentációs modell archívuma** (a lezárt tervfájlok + a
  `BACKLOG_DONE.md` napló), ezért az 1. döntés hatálya alá esik: `docs/legacy/backlog-done/`.
- A `backlog/BACKLOG.md`, `backlog/plans/backlog-114…118-*.md`, `backlog/ideas/` **érintetlen
  marad**, a sorszámozás is. Az új skillek a mai sorszámos tervfájlokat is elfogadják.
- A `docs-check` a `backlog/` mappát **nem scanneli** (ott ma vannak D-hivatkozások, pl.
  `ideas/IDEAS.MD` `D600`). A backlog-tétel bevezeti majd a plan-budgetet és a scan-t.
- A `/finish` a `BACKLOG.md`-ből ugyanúgy törli a tétel szakaszát, mint ma, de **nem ír
  `BACKLOG_DONE.md`-t** (az legacy).

---

## 1. Felmérés — a tényállás, amire a terv épül

Három felderítő menet eredménye (2026-09-05). A számok a végrehajtás checklistjei.

### 1.1 Méretek

| Fájl | Méret | Sors |
|---|---|---|
| `docs/01-attekintes-es-dontesek.md` | 78 KB (D1–D79 tábla ≈ 60 %) | legacy; nem-D részei → `PRODUCT.md` |
| `docs/02-domain-modell.md` | 42 KB | legacy; WHY-bekezdései → `storage/CLAUDE.md`, `domain/CLAUDE.md` |
| `docs/03-funkcionalis-spec.md` | 153 KB | legacy; ~95 %-a kódból/tesztből levezethető |
| `docs/04-nyomtatvany-spec.md` | 27 KB | legacy; márka/jogi részei → `PRODUCT.md`, `pdf/CLAUDE.md` |
| `docs/05-technologia.md` | 11 KB | legacy; szinte egésze → `PRODUCT.md`, root `CLAUDE.md` |
| `docs/06-veglegesites-terv.md` | 80 KB, 0 D-ref | **MARAD** — előretekintő 2. fázis (Electron) terv |
| `docs/07-felulet-rendszer.md` | 34 KB („Komponensek" 56 %) | legacy; nem-levezethető magja → slim `app/src/CLAUDE.md` |
| `docs/D-SZAM-FORRASKOD-LELTAR.md`, `PROBLEMS.md`, `agent-first-documentation-model_V2.md` | 45 KB | legacy (F10) |
| `docs/reviews/` | 8 fájl | **MARAD** — 3 skill kimenete, a doctor-review dedup-forrása; docs-check nem scanneli |
| `CLAUDE.md` | 26 KB, 149 D-ref | újraírva ≤ 4000 karakter |
| `app/src/CLAUDE.md` | 81 KB, 1239 sor, 147 helper-bejegyzés, 108 D-ref, 92 `docs/…` ref | újraírva ≤ 2500 karakter (felület-rendszer), helper-index a nested fájlokba |
| `backlog/done/` | 108 tervfájl + 176 KB `BACKLOG_DONE.md` + `redesign/` | legacy |
| `CHANGELOG.md`, `FEATURES.md` | 37 + 12 KB | **ÉRINTETLEN** — az app Kezdőlapja olvassa (`domain/markdownSections.ts`, `?raw`) |
| `README.md` | 5 KB | táblázata átírva |

### 1.2 D-hivatkozások a forráskódban

- **~824 előfordulás / 145 fájl** `app/src` alatt (`.ts`/`.tsx`), a `D-SZAM-FORRASKOD-LELTAR.md`
  fájlonkénti listája a checklist. Mappánként: `pages/` 349, `domain/` 207, `storage/` 115,
  `components/` 95, `state/` 30, gyökér 25, `pdf/` 12, `design/` 1.
- **Production kód (460 / 100 fájl)** — 25-ös minta alapján:
  - **68 %**: a WHY már ki van mondva, a D-szám csak zárójeles címke a mondat végén
    (`… megismételné (D44).`) → **a címke törlése**, a mondat marad.
  - **24 %**: a D-szám az egyetlen indoklás (`// D240: …`, `lásd D72`, `D31 óta`,
    `a D17 "csak deaktiválható" mintától`) → **1 mondat lokális WHY** a `docs/01` D-tábla
    sorából (a tábla F3–F8 alatt még a helyén van, ez a forrás).
  - **8 %**: string/seed-adat — egyetlen futásidejű hibaüzenet: `storage/paths.ts:135`
    `„… írunk felül (D4) …"` → „a verziómappák append-only-k".
  - Nincs D-szám `data-testid`-ben, változónévben, enum-értékben.
- **Tesztek (321 / 46 fájl)**:
  - Mindössze **4** `it('D480: …')` / `it('D540: …')` prefix (`domain/nyelviReview.test.ts:76`,
    `pages/SettingsPage.test.tsx:207/233/251`) → prefix törlése, a maradék név teljes értékű.
  - ~45 `it()` és 43 `describe()` **zárójeles utótaggal** (`… (D17)`, `… (D4)`) → az utótag törlése.
  - ~6 esetben a zárójel **tartalma** megtartandó, csak a szám megy:
    `(D7: the snapshot is the truth)` → `(the snapshot is the truth)`;
    `(D17: never delete/reuse)` → `(never delete/reuse)`; `describe('elolegOsszegek (D66: abszolút
    összeg)')` → `(abszolút összeg)`; `describe('sablon (D576+/C8)')` és
    `describe('nemet-kategoria-nev (D404)')` → értelmes szöveges név.
- **Nincs `.skip`/`.only`/`xit`/`xdescribe`** a suite-ban (1500 `it()`).

### 1.3 `docs/0X` hivatkozások a forráskódban

**242 előfordulás / 142 fájl**, nagyrészt nevesített `§` anchorral. Fájlonként: `docs/03` 87,
`docs/07` 39, `docs/02` 38, `docs/01` 21, `docs/04` 13, `docs/05` 11. Legsűrűbb szakaszok:

| Régi anchor | db | Új cél |
|---|---|---|
| `docs/03 § 11. Terv részletei` | 11 | törlés + lokális WHY (kódból levezethető) |
| `docs/02 § Tétel-leírás` | 10 | `app/src/domain/CLAUDE.md` „Intentional gaps" (DE-leírás némán elmarad) |
| `docs/02 § Páciens- és terv-mappa` | 7 | `app/src/storage/CLAUDE.md` |
| `docs/03 § 4. Előnézet és véglegesítés` | 6 | `app/src/domain/CLAUDE.md` (véglegesítés-őr) / törlés |
| `docs/03 § Sablon-placeholder őr` | 6 | `PRODUCT.md § A nyomtatvány szerződéses dokumentum` |
| `docs/03 § Autosave` | 6 | `app/src/storage/CLAUDE.md` (DraftStorage ≠ system of record) |
| `docs/05 § Piszkozat-autosave` | 4 | ugyanaz |
| `docs/07 § Komponensek / § Szín / § Ellenőrzés valódi böngészőben` | 5 | `app/src/CLAUDE.md` |
| `docs/01 …` (döntéstábla) | 21 | a D-kivezetéssel együtt eltűnik |
| `docs/04 § 2. blokk / § Összegzés` | 4 | `app/src/pdf/CLAUDE.md` |

Ez a migráció **legnagyobb kézi költsége** — soronként ítélet kell, nem a D-címke.

### 1.4 Meglévő gépi őr

`app/src/dokumentacioGuard.{ts,test.ts,baseline.json}`: két vitest-teszt — a `docs/01` D-tábla
sorszáma nem nőhet (79/79), és fájlonként a D-refek száma nem nőhet (baseline: 1730 ref / 163
fájl). A `docs/01` mozgatása azonnal töri; a migráció alatt a fájlonkénti baseline hamis
riasztást adna (áthelyezett tartalom „növekedésnek" látszik). **F10-ben törlendő**, a helyét a
nulla-toleranciás `scripts/docs-check.mjs` veszi át (F1).

### 1.5 Kritikus invariánsok tesztfedettsége

| Invariáns | Teszt | Hol |
|---|---|---|
| `_v<n>` sosem íródik felül, `savePlan` → `_v<n+1>` | **van** | `storage/DemoStorage.test.ts` „savePlan on an existing tervId appends v2 without touching v1", `storage/paths.test.ts` `assertVersionDirAvailable`, `App.test.tsx:45` |
| magasabb `schemaVersion` elutasítva | **van** | `domain/schema.test.ts` „rejects a newer-than-known version with a readable message", `DemoStorage.test.ts` ×2 |
| mentett terv pillanatkép, nem az élő árlista | **van** | `domain/totals.test.ts` „does NOT mutate or overwrite the passed-in mentett value", `pages/tervReszletei/PenzugyiOsszesites.test.tsx` |
| `osszesitok` a fájlból, eltérésnél figyelmeztet | **van** | `domain/totals.test.ts` `osszesitokElter` ×3, `PenzugyiOsszesites.test.tsx` |
| placeholder-nyilatkozat → csak ajánlat | **van** | `pages/PreviewPage.test.tsx` „nyilatkozat placeholder kemény zár", `domain/templates.test.ts` ×9, `pdf/TervDocument.test.tsx:466` |
| előleg ≤ fizetendő véglegesítéskor | **van** | `domain/veglegesitesOr.test.ts` `eloleg-tullep` ×5, `domain/totals.test.ts` `elolegTullepi` |
| nincs automatikus HUF↔EUR | **van** | `domain/penznemValtas.test.ts` „nincs automatikus FX -- a HUF érték sosem lesz belőle számolt EUR érték" |
| ártétel-id sosem hasznosul újra | **van** | `domain/priceListIds.test.ts`, `pages/PriceListAdminPage.test.tsx:154` |
| kedvezmény nem a nyomtatványon | **részben** | pozitív oldal `pdf/TervDocument.test.tsx`; **nincs negatív teszt** |
| pénz egész, minor unit | **NINCS** | `domain/money.ts` sima `number`, csak fejkomment |
| `ervenyesIg` sosem üres | **NINCS** | csak konstrukció (`blankPlan.ts:72`), a véglegesítés-őr nem nézi |
| páciensadat nem hagyja el a gépet | **NINCS** | 0 `fetch`/XHR a kódban, de nincs CSP az `app/index.html`-ben, `.oxlintrc.json` csak 2 szabály |
| `PlanStorage` az egyetlen FS-határ | **NINCS** | csak próza (`storage/PlanStorage.ts:1-6`); a gyakorlatban tartják |

### 1.6 Skillek és parancsok

| Fájl | Legacy-teher | Sors |
|---|---|---|
| `.claude/skills/planning/SKILL.md` | sorszám-mechanika, D-ütközés-ellenőrzés, `BACKLOG_DONE` olvasás, `docs/0X` ×6 | → `/plan` (az interjú-mag és a „nem ír app-kódot" tiltás átmegy) |
| `.claude/commands/implement-backlog-item.md`, `-worktree.md` | `backlog/done` mv, `BACKLOG_DONE` írás, „döntések átvezetése docs/02–07-be", referencia-seprés | → `/implement` + `/finish` (a git/worktree/PR koreográfia és a minőségi kapu átmegy) |
| `.claude/commands/push-backlog-item.md` | — | marad |
| `.claude/skills/browser-validation/` (SKILL + checklist) | 6 D-ref (D2/D4/D23), `docs/07`/`04` refek | → `/manual-checks`, trigger szerint szeletelve |
| `.claude/skills/doctor-review/` | 1 `docs/07` ref, `BACKLOG.md` ×4 (formátum) | `docs/07` → `app/src/CLAUDE.md`; a backlog-formátum marad (4. döntés) |
| `.claude/skills/code-and-architecture-review/` | — | marad |
| `.claude/skills/update-changelog/`, `update-features/` | „ne olvasd a `docs/03`-at" mondat | a mondat törlése, egyébként marad |
| `.claude/agents/orvos-persona.md` | — | marad |
| `.claude/settings.local.json`, `.mcp.json` | nincs hook, nincs docs-path | érintetlen; a docs-check a `/finish` és a CI feladata |

### 1.7 Infrastruktúra

Nincs root `package.json`, nincs `scripts/`. A CI (`.github/workflows/deploy.yml`) `npm test` +
`npm run build`-et futtat az `app/` alatt. A `pages/PreviewPage.test.tsx`-ben az `it(` és a
névstring **külön sorban** áll — az anchor-feloldó nem kereshet soronként.

---

## 2. Célállapot

```text
CLAUDE.md                          ≤ 4000 kar — router/constitution (új)
PRODUCT.md                         ≤ 6000 kar — termékszándék, nem-cél, adat/jogi korlátok (új)
README.md                          rövidített: demó-link, két fázis, hova nézz
docs/06-veglegesites-terv.md       marad (2. fázis aktív terv; budget-mentes, docs-check allowlist)
docs/reviews/                      marad (skill-output; docs-check nem scanneli)
docs/legacy/README.md              mi ez, miért, törlési dátum, „ne hivatkozz rá"
docs/legacy/01…05,07-*.md          git mv
docs/legacy/D-SZAM-FORRASKOD-LELTAR.md, PROBLEMS.md,
docs/legacy/agent-first-documentation-model_V2.md, agent-first-migracios-terv.md
docs/legacy/backlog-done/          git mv backlog/done/*
app/src/CLAUDE.md                  ≤ 2500 kar — ÚJRAÍRVA: felület-rendszer
app/src/domain/CLAUDE.md           ≤ 2500 kar (új)
app/src/storage/CLAUDE.md          ≤ 2500 kar (új)
app/src/pdf/CLAUDE.md              ≤ 2500 kar (új)
scripts/docs-check.mjs             új
app/package.json                   "docs-check": "node ../scripts/docs-check.mjs"
.github/workflows/deploy.yml       + docs-check lépés
.claude/skills/plan/SKILL.md       új
.claude/skills/implement/SKILL.md  új (worktree-mód opcióként)
.claude/skills/finish/SKILL.md     új
.claude/skills/manual-checks/      browser-validation átnevezve, szeletelve
TÖRÖLVE: app/src/dokumentacioGuard.{ts,test.ts,baseline.json}
         .claude/skills/planning/  .claude/commands/implement-backlog-item{,-worktree}.md
```

**Miért pont ez a négy agent-context fájl.** A V2 a `domain` és a `pdf` nested fájlt jelzi
előre. A `storage` azért indokolt, mert ott él a legtöbb sérthetetlen invariáns (append-only
verzió, sémaverzió, index ≠ system of record) és a két legmakacsabb `docs/02` anchor —
bizonyított retrieval-igény. A slim `app/src/CLAUDE.md` azért marad, mert a `docs/07`
felület-szabályai a `pages/` + `components/` teljes felületére vonatkoznak, és 47 forrás-anchor
igazolja a keresletet; ez a fájl minden `app/src` alatti munkánál betöltődik, ezért a
kereszt-vágó UI-szabályok helye. **Nem jön létre** `pages`, `components`, `state`, `design`
context — csak konkrét, ismétlődő discovery-hiba után.

**Budget-eltérés a V2-től.** `PRODUCT.md` 6000 karakter a V2 4000-e helyett: a jogi és
adatvédelmi korlátok (GDPR, szerződéses dokumentum, Drive-üzemeltetés) nem levezethetők, és
ezek adják a régi „Sérthetetlen szabályok" tábla WHY-oszlopát. A V2 §7.2 szerint a budget
kalibrálható, ha a plusz context bizonyítottan csökkenti a hibát.

---

## 3. Fázisok és commitok

Minden fázis egy vagy több commit. **Minden commit után** az `app/` alatt
`npm run build && npm run lint && npm test` zöld. Az F1-től a `npm run docs-check` is fut,
de F1–F9 alatt pirosnak várjuk (a hibaszám csökken), F10 végén zöld.

Commit-üzenetek magyarul, a repó szokása szerint (`<terület>: <mit>`), a
`Co-Authored-By` lábléccel.

### F0 — Olcsó invariáns-enforcement

Cél: ami a dokumentációból kikerül, azt a gép őrizze. Csak az olcsó tételek; a
branded `Minor` pénztípus nagyobb refactor → külön backlog-ötlet (lásd 6. szakasz).

1. **CSP** meta az `index.html`-be, egy kis Vite-pluginnal (`app/vite.config.ts`
   `cspPlugin`, `transformIndexHtml`), nem statikus HTML-ben — mert a `@vitejs/plugin-react`
   dev-módban inline refresh-preamble scriptet injektál, ami szigorú `script-src 'self'`
   mellett törne; a plugin dev-ben `'unsafe-inline'`-t ad a `script-src`-hez, buildben nem.
   ```text
   default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' data:;
   img-src 'self' data: blob:; font-src 'self' data:; style-src 'self' 'unsafe-inline';
   frame-src blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'none'
   ```
   A `connect-src` **`'self' data:`, nem `'none'`**: a `@react-pdf/font` a regisztrált TTF-et
   és a logót `fetch`-csel tölti ugyanerről az originről, a yoga layout-motor a WebAssembly-
   modulját egy `data:` URL-ből — egyik sem hálózati origin, a direktíva így is kizár minden
   külső hostot; ez a „páciensadat nem hagyja el a gépet" gépi alakja, nem tágítható. A
   `'wasm-unsafe-eval'` csak a wasm-fordítást engedi (a böngészős ellenőrzés `'unsafe-eval'`
   hiányát jelezte), JS-`eval`-t nem. `frame-src blob:` a PDF-előnézet iframe-je miatt.
   `/run`-nal ellenőrizve: PDF-előnézet, letöltés, fogtérkép canvas→PNG, font, Radix
   stílusok, konzol CSP-hiba nélkül.
2. **oxlint** (`app/.oxlintrc.json`, oxlint 1.77 — az `overrides` blokk támogatott):
   - `no-restricted-globals`: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` —
     üzenet: „Páciens- és kezelési adat nem hagyhatja el a gépet; hálózati hívás tilos.";
     `localStorage`/`sessionStorage` — „Tároló csak a PlanStorage/DraftStorage interfészen át."
   - `no-restricted-imports` `patterns`: `**/storage/DemoStorage`, `**/storage/DemoDraftStorage`
     — a konkrét implementációt csak a `storage/` importálhatja. A `storage/seed/*` **nem
     tiltott**: adat-konstans (`TEMPLATE_HEADINGS`, seed-listák), nem tároló-implementáció.
   - override (`off`): `src/storage/**`, `src/**/*.test.*`, `src/**/testFixtures.tsx`,
     `src/test-setup.ts`.
   - Egyetlen production-kivétel: `pages/settings/NyomtatvanyokTab.tsx` sablon-piszkozat cache
     (3 `localStorage` hívás + `PREFIX` import) — indokolt, `oxlint-disable-next-line`
     sorokkal, a fájl saját WHY-kommentjére mutatva; a refaktor külön tétel (6. szakasz).
   - A CI (`deploy.yml`) eddig nem futtatott lintet — `Lint` lépés a tesztek elé, különben a
     szabály nem enforcement.
3. **`ervenyesIg` üresség** HARD tétel a `domain/veglegesitesOr.ts` `veglegesitesDiagnozis`-ában
   (`id: 'ervenyes-ig-ures'`, route a Terv adatai lapra) + teszt a `veglegesitesOr.test.ts`-ben
   („üres ervenyesIg hard tétel — üres dátum Invalid Date-ként kerülne a szerződésre").
4. **Negatív PDF-teszt** a `pdf/TervDocument.test.tsx`-ben: egy terv-szintű kedvezménnyel és
   sor-szintű eltéréssel renderelt dokumentum szövegében **nem szerepel** a kedvezmény
   összege, a `−X%` alak és a „kedvezmény" szó.

Commit: `invariánsok: CSP, hálózati/tároló lint, ervenyesIg-őr, kedvezmény-negatív PDF-teszt`.

### F1 — `scripts/docs-check.mjs`

Egyetlen ESM script, csak `node:fs` + `node:path`, olvasható (~150 sor), a tetején
konfigurációs tömbök. Kimenet: `fájl:sor  [szabály]  részlet`, `exit 1` bármely találatra,
`exit 0` és egy összegző sor („N fájl, 0 hiba") egyébként.

Scan-felület (mindegyik szabálynál, kivéve ahol más van írva):
`CLAUDE.md`, `PRODUCT.md`, `README.md`, `app/src/**/*.{ts,tsx,css,md}`, `.claude/**/*.md`,
`docs/*.md`. **Kizárva:** `docs/legacy/**`, `docs/reviews/**`, `backlog/**` (4. döntés),
`app/src/assets/**`, `node_modules`, `dist`.

| # | Szabály | Részlet |
|---|---|---|
| 1 | **D-hivatkozás tilos** | `/\bD\d+\b|\bDP-\d+\b/`. Kézi `ALLOW_D_TOKENS` tömb a valódi álpozitívokra (pl. egy fontnév), kommentálva miért. |
| 2 | **Legacy-hivatkozás tilos** | `docs/legacy`, `backlog/done`, `BACKLOG_DONE`, `docs/0[1-5]-`, `docs/07-`, `D-SZAM-FORRASKOD`, `PROBLEMS.md`, `agent-first-documentation-model`, `agent-first-migracios-terv`. `docs/06-` **engedett**. |
| 3 | **Budget** | `CLAUDE.md` 4000, `PRODUCT.md` 6000, `app/src/**/CLAUDE.md` 2500 karakter (nem byte — `[...s].length`). |
| 4 | **Anchor-feloldás** | Csak `CLAUDE.md`/`PRODUCT.md`/`app/src/**/CLAUDE.md`-ben. Minta: `→ (file|symbol|test|product):…`. `file:<p>` — létezik; `symbol:<p>#<id>` — a fájl tartalmában `\b<id>\b` szerepel; `test:<p>#<név>` — a `<név>` szó szerint szerepel a tesztfájl **teljes tartalmában** (nem soronként); `product:#<slug>` — a `PRODUCT.md` egy `##`/`###` címsorának GitHub-slugja (kisbetű, ékezet levágva, szóköz → `-`, írásjel törölve). Ismeretlen anchor-típus vagy hibás nyelvtan is hiba. |
| 5 | **`.skip`/`.only`** | `app/src/**/*.test.{ts,tsx}`-ben `/\b(it|test|describe)\.(skip|only)\(|\bx(it|describe|test)\(/`. |

**Nincs**: anchor-unicitás, tesztnév-unicitás, semantic duplikátum-detektor, source hash,
Vitest-indítás (a `test:` anchor szöveges egyezés — paraméterezett tesztre nem adunk anchort).

Bekötés: `app/package.json` → `"docs-check": "node ../scripts/docs-check.mjs"`. A script a
saját helyéből (`import.meta.url`) számolja a repó gyökerét, nem a `cwd`-ből.

Commit: `docs-check: nulla-toleranciás dokumentációs őr (D-ref, legacy-ref, budget, anchor, skip/only)`.
(A script ekkor pirosat ad — várt; a CI-be F10-ben kerül.)

### F2 — Új dokumentumok

A régi docs **még a helyükön** — az F3–F8 seprés innen veszi a WHY-t, és ide mutató anchorokat
cserél az itt létrejövő fájlokra. Írási elv mindenhol: **egy állítás egy sor, anchorral;
próza csak ott, ahol a WHY nem levezethető.** Minden `test:` anchor a **végleges** (F8 utáni)
tesztnévre mutasson — a D-utótagos neveket a seprés megváltoztatja; ezért F2-ben a szükséges
tesztneveket előre eldöntjük (lásd 1.2), és F3–F8 ezekre írja át őket.

#### `PRODUCT.md` (≤ 6000 kar, magyar)

Források: `docs/01` „Mit vált ki / Miért nem elég az Excel / Adatvédelmi keret / Kockázatok",
`docs/05` „Az architektúra egy mondatban / Google Drive / PDF generálás / Hosztolás / Amit nem
szabad", `docs/04` bevezető + „Márka" + „Nyelv" záró bekezdései, `docs/07` „Mi ez a termék",
`README.md` „Az MVP határa / Nyitott kérdések", `CLAUDE.md` „Sérthetetlen szabályok" Miért-oszlopa.

Szakaszok (a `##` címek a `product:#…` anchorok céljai — a slug ne változzon utólag):

- `## Mi ez` — egy rendelő (Mándoki Dental), egy fogorvos, belső eszköz, nem termék. Az Excel
  kiváltásának 4 valódi oka (sorindex-alapú árlookup = néma adatkorrupció aláírt dokumentumban;
  szétesett LinkedCell-ek; max 3 fázis; nincs verziókövetés).
- `## Napi flow` — 5 sor: páciens → terv adatai → tételfelvitel billentyűzettel (gépel → ↑↓ →
  Enter → kereső ürül, fókusz marad) → előnézet/véglegesítés → PDF; korábbi tervek új verzióra.
- `## Adat- és deployment-korlátok` — GDPR 9. cikk különleges adat; **páciens- és kezelési adat
  sosem hagyja el a helyi gépet** (nincs backend, telemetria, analytics, remote logging, külső
  AI/API); a gyökérmappa a teljes rendszerállapot, Google Drive-val tükrözve (Tükrözés, nem
  Streamelés — conflicted copy); Workspace kell, nem ingyenes Gmail; a gyökérmappa ne a
  Letöltések; BitLocker; a Drive nem backup; Windows 260 karakteres útvonal → rövid mappanevek;
  **ékezetek maradnak** a mappanévben (a doki a Fájlkezelőben keres).
- `## Két fázis` — 1. mockup GitHub Pages-en, `localStorage`, demó adat, nincs valódi
  páciensadat; 2. Electron + `FileSystemStorage` a `PlanStorage` mögött, minden más változatlan
  → részletek `docs/06-veglegesites-terv.md`. Egy Chromium mindkét platformon = azonos PDF.
- `## A nyomtatvány szerződéses dokumentum` — az aláírt PDF-ből: sávos ár csak `*` +
  lábjegyzettel, sosem csupasz szám (fix szám kötelező ajánlat lenne); kedvezmény a
  szerkesztőben látszik, a nyomtatványon nem; placeholder-jelölésű/üres nyilatkozat mellett a
  nyilatkozat+aláírás oldal nem kerülhet PDF-be (kényszerített „csak ajánlat"); a véglegesített
  terv rögzíti, tartalmazta-e; mentett terv sosem rajzolódik újra az árlistából; pénz egész
  szám a pénznem alapegységében (HUF forint, EUR cent); német terven lefordítatlan tételnév
  blokkol; Unicode font (Helvetica nem tud ő/ű, csak a PDF-en látszik); márka drmandoki.hu
  (`#976445`/`#f77409`), a narancs soha nem szövegszín (2,82:1); rövid dátum kézzel formázva
  (lábléc jogi metaadat); számformátum sosem `toLocaleString()`.
- `## Nem cél` — multi-tenancy/auth; mobil; automatikus HUF↔EUR átváltás (minden ár kézzel,
  pénznemenként); statisztika; EESZT; e-mail-küldés az appból; szerveroldali komponens; a
  `Fog` mező jegyzetmezővé válása elfogadott.
- `## Szándékos hiányok és nyitott kérdések` — német tételnevek orvosi és a
  nyilatkozat/fizetési feltételek jogi lektorálása (ma AI-fordítás, a doki döntésére
  jelölés nélkül élesítve); garancia-szakasz mindkét nyelven placeholder; a `terv.json`
  PDF-be ágyazása nincs megvalósítva; `paciens.json`/`terv-cimke.json` csak index, sosem
  system of record; `paciens-adatok.json` viszont az, nincs auto-szinkron a terv `paciens`
  blokkjával egyik irányban sem.

#### Root `CLAUDE.md` (≤ 4000 kar, magyar) — a V2 §8 alakja

```md
# Repo
app/  Vite + React + TS (az egyetlen szerkesztett könyvtár) · docs/06  2. fázis terve ·
backlog/  nyitott tételek + aktív tervek · data/, assets/  referencia · scripts/  repo-checkek
# Parancsok
cd app && npm run dev | build | lint | test | docs-check
# Product context
PRODUCT.md — termékcél, flow, nem-cél, adat/jogi korlátok. Nested CLAUDE.md: app/src, domain, storage, pdf.
# Authority
Aktuális viselkedés: kód + futó tesztek. Szándék és nem-cél: PRODUCT.md. A CLAUDE.md contextet ad, nem írhat felül tesztet/típust.
# Hard invariants (mind anchorral)
- Páciens- és kezelési adat nem hagyja el a gépet. → CSP + lint; product:#adat-es-deployment-korlatok
- Fájlrendszer/tároló csak a PlanStorage/DraftStorage határon át. → symbol:app/src/storage/PlanStorage.ts#PlanStorage
- Véglegesített verzió sosem íródik felül. → test:app/src/storage/DemoStorage.test.ts#…
- Magasabb schemaVersion → betöltés megtagadva. → test:app/src/domain/schema.test.ts#…
- Pénz egész, minor unit; nincs automatikus FX. → symbol:app/src/domain/money.ts#formatMoney; test:…penznemValtas.test.ts#…
- Mentett terv pillanatkép. → test:app/src/domain/totals.test.ts#…
# Böngésző-automatizálás — nem tárgyalható
(a mai szakasz változatlanul: chrome-devtools MCP csak --isolated; tilos --autoConnect/--browserUrl/
valós profil; tilos futó Chrome-hoz csatlakozni; a kikényszerítés a pinnelt .mcp.json; a
böngészős ellenőrzés a /manual-checks skill, kézzel)
# Kommentek
Csak WHY / invariáns / gotcha. Nincs „mit csinál". Nincs D-szám, backlog-, legacy-hivatkozás. Meglévő kommenthez csak akkor nyúlj, ha hamissá vált.
# Dokumentáció
Default: ne írj. Nested CLAUDE.md-be csak discovery/szándék, path-qualified anchorral. Budget-túllépést ne production-refactorral oldj.
# Tesztek
Nincs .skip/.only. A tesztnév konkrét, megfigyelhető viselkedést ír le.
# Workflow
/plan <slug> → /implement <slug> → /finish <slug>. /update-changelog és /update-features külön, kézi.
```

A „Domain szókincs" bekezdés (a magyar JSON-kulcsok nem fordíthatók) **megmarad** egy sorban.
A „Meglévő segédfüggvények", „Sérthetetlen szabályok" tábla, „Backlog-tétel lezárása",
„Dokumentáció-térkép", „Adat és ismert hiányok" szakaszok **kikerülnek** (a tartalmuk a
`PRODUCT.md`-be, a nested fájlokba, a skillekbe és a tesztekbe ment).

#### `app/src/domain/CLAUDE.md` (≤ 2500 kar) — V2 §9 sablon

- **Mental model**: mentett sor = pillanatkép (`nevSnapshot`, `listaEgysegar`), sosem az élő
  árlista → `test:…totals.test.ts#…`; pénz egész minor unit → `symbol:…money.ts#formatMoney`;
  nyelv és pénznem függetlenek, mindkét nyelven keres → `symbol:…search.ts#nevEgyezik`;
  nyelvi mismatch-et csak az explicit „Nyelv ellenőrizve" old fel → `symbol:…nyelviReview.ts#reviewElfogadva`;
  a véglegesítés-őr egyetlen, hard/soft/info csekklistája → `symbol:…veglegesitesOr.ts#veglegesitesDiagnozis`;
  a sor `savos` mezője dönt a `*`-ról, nem az árlista ártípusa.
- **Intentional gaps**: nincs HUF↔EUR átváltás → `product:#nem-cel`; a `Tetel.leiras` hiányzó
  DE fordítása némán elmarad, nem esik magyarra (a `nevSnapshot`-tal ellentétben) → `symbol:…nev.ts#arlistaiLeiras`.
- **Find before writing** (egy sor / helper, próza nélkül): `money` (`formatMoney`, `basePrice`,
  `savosHatarForditott`), `teeth` (`parseTeeth`, `toggleFog`), `nev` (`resolveNev`, `sorFallback`,
  `nevKoveti`, `nevAtirt`, `leirasKoveti`), `search`, `totals` (`tervVegosszeg`, `elolegOsszegek`,
  `computeOsszesitok`, `osszesitokElter`), `veglegesitesOr`, `kitoltetlen`, `arKoveti`,
  `penznemValtas`, `priceListIds` (`nextTetelId` max-alapú), `templates` (`isPlaceholderTemplate`,
  `sablonNyomtathato`), `toothVisual`, `piszkozat` (`piszkozatTartalmas`), `blankPlan`, `planCopy`,
  `orvosok`, `mennyiseg`, `date` (`todayIso`, `formatLongDate`, `formatRelativIdo`),
  `paciensDuplikacio`, `paciensKotes`, `tervCim`.

#### `app/src/storage/CLAUDE.md` (≤ 2500 kar)

- Mappastruktúra = a teljes rendszerállapot; a `paths.ts` a névkonvenciók egyetlen helye →
  `symbol:…paths.ts#buildPatientDirName`; ékezetek maradnak, csak a tiltott karakterek
  cserélődnek, rövid nevek (260 kar.) → `product:#adat-es-deployment-korlatok`.
- Verziómappa append-only, `savePlan` mindig `_v<n+1>` → `test:…DemoStorage.test.ts#savePlan on an existing tervId appends v2 without touching v1`.
- Magasabb `schemaVersion` → betöltés megtagadva → `test:…schema.test.ts#rejects a newer-than-known version with a readable message`.
- `paciens.json`, `terv-cimke.json` csak index — sosem írja felül a `terv.json` `paciens` blokkját;
  `paciens-adatok.json` system of record a saját mezőire, nincs auto-szinkron.
- `DraftStorage` sosem system of record; egy `dp:piszkozat` kulcs, a `StorageContext.drafts`-on át.
- `savePriceList`/`saveSettings` csak updatert fogad (két gyors szerkesztés ne dobja el egymást).
- `PlanStorage`-on kívül semmi nem tud arról, melyik implementáció fut; a demó-only felület
  (`listFileTree`, `readRawFile`, `isSeedVersion`, `resetDemoData`) nem az interfész része.
- Ártétel-`id` sosem hasznosul újra → `test:…priceListIds.test.ts#…`.
- `arlistaVerzio` minden mentéskor a mai nap.

#### `app/src/pdf/CLAUDE.md` (≤ 2500 kar)

- `pdfLabels` csak a `pdf/` alól importálható; a felület magyar marad → `symbol:…labels.ts#pdfLabels`.
- Egy vizuális forrás a fogtérképre: `design/toothChartSvg.ts` → DOM a szerkesztőben, canvas→PNG
  itt (`toothChartImage.ts`); `interactive: true` sosem a PDF-útvonalon.
- Unicode font regisztrálva (`fonts.ts`) — Helvetica nem tud ő/ű; csak a PDF-en látszik →
  `test:…fonts.test.ts#…`.
- Kedvezmény és sor-szintű eltérés sosem a nyomtatványon → `test:…TervDocument.test.tsx#<F0 negatív teszt neve>`;
  előleg > fizetendő → „—", nem negatív.
- Fizetési feltételek/garancia placeholder-jelölt szövege címestől kimarad → `symbol:…templates.ts#sablonNyomtathato`.
- Render-hiba alatt nincs letöltés és véglegesítés (a `usePDF` megőrzi a régi blobot) → `test:…PreviewPage.pdfHiba.test.tsx#…`.
- Heurisztikák: `footerLayout.ts` (nincs szövegmérés), `markdownLite.ts` (`ul`/`ol`/`**`), `pdfCimLokalizacio.ts`.

#### `app/src/CLAUDE.md` újraírva (≤ 2500 kar) — felület-rendszer

A `docs/07` nem-levezethető magja: két felület két szabályrendszer (páciens a nyomtatványt
látja — drmandoki-arculat; a doki az appot naponta órákig — hideg slate, **soha nem meleg
krém**); tokenek forrása `design/tokens.ts` → `symbol:…tokens.ts#t`; a billentyűzetes
tételfelvitel az Excellel szembeni fő versenyelőny — ne törd el; Radix Themes az egyetlen
UI-könyvtár; „amihez ne nyúlj kérdés nélkül" + „amit soha" (carousel/kártyarács adattáblából,
második UI-lib, kézi SVG-ikon, narancs szövegszín, `≈` kivétel indoka); a11y nem opcionális
(fókuszgyűrű, `prefers-reduced-motion` → `symbol:…motion.ts#csokkentettMozgas`, `controlBorder`
kivételek); jsdom-vakfoltok (Radix CSS, Roboto, `paint-order`, PDF/canvas mock) → `/manual-checks`.
A helper-index **nem** marad itt.

#### Falszifikációs mini-teszt (V2 §14, könnyített)

F2 után, F3 előtt: egy **friss session**, a régi `docs/0X` fájlok olvasása nélkül (a prompt
mondja ki), 6 discovery-kérdésre válaszol csak kód + teszt + az új fájlok alapján:
1. Mely fájlokat és teszteket nézed meg először, ha a véglegesítés egy feltételét változtatod?
2. Milyen invariánsokat törhetsz el, ha az árlista árkezelését módosítod?
3. Van már helper egy sor listaár-eltérésének osztályozására? Hol?
4. Hol él a terv-piszkozat state, és mely komponens írhatja?
5. Mi akadályozza meg, hogy egy véglegesített verzió felülíródjon?
6. Hova írnál egy új, kétnyelvű keresést az árlista-tételeken?
Ami hibás, **csak az** kerül még a nested fájlokba. Az eredmény (6-ból hány, mit pótoltunk)
ennek a fájlnak a 7. szakaszába kerül.

Commit: `docs: PRODUCT.md, slim CLAUDE.md, nested domain/storage/pdf/src context`.

### F3–F8 — Forrás-seprés mappánként

Egy commit mappánként, ebben a sorrendben (a függőségek irányában, a legsűrűbbtől):

| Fázis | Mappa | D-ref | docs-ref (kb.) |
|---|---|---|---|
| F3 | `domain/` | 207 | 60 |
| F4 | `storage/` + `state/` | 145 | 35 |
| F5 | `pdf/` + `design/` | 13 | 15 |
| F6 | `components/` | 95 | 40 |
| F7 | `pages/` | 349 | 90 |
| F8 | gyökér (`App*`, `testUtils`, `testQueries`), `storage/seed/`, maradék | 25 | — |

**Eszköz.** Egy scratchpad-script (nem kerül a repóba), ami a mappa fájljaira kilistázza
az érintett sorokat, a D-számhoz odaírva a `docs/01` D-tábla sorának szövegét:

```bash
# példa: domain mappára
grep -rnE "\bD[0-9]{1,3}\b|\bDP-[0-9]+\b|docs/0[0-9]-" app/src/domain --include=*.ts --include=*.tsx
# D-tábla sor kiemelése:
grep -E "^\| D66 " docs/01-attekintes-es-dontesek.md
```

**Szabályok soronként** (a döntés minden sornál ítélet, nem sed):

1. `… (D44).` / `… (D29, D33)` **zárójeles címke egy kimondott mondat végén** → a címke
   törlése, a mondat marad. Ha a zárójelben a D-szám mellett szöveg van (`(D66: abszolút
   összeg)`), a szöveg marad.
2. `// D240: …`, `lásd D72`, `D31 óta`, `D24 mintáján`, `D17-szerű` — **a D-szám hordozza a
   WHY-t** → a D-tábla sorából 1 mondat lokálisan (invariáns vagy ok), a D-szám eltűnik. Ha a
   WHY termékszándék (jogi, GDPR, üzleti), a mondat mellé `PRODUCT.md § <cím>` hivatkozás jöhet;
   ha discovery (hol van a párja), a nested `CLAUDE.md` neve.
3. `docs/0X § …` hivatkozás:
   - a WHY a `PRODUCT.md`-ben él → `lásd PRODUCT.md § <cím>`;
   - a WHY a nested `CLAUDE.md`-ben → `lásd app/src/<mappa>/CLAUDE.md`;
   - a hivatkozott szakasz kódból levezethető (a `docs/03` szinte minden anchora) → a hivatkozás
     törlése, a komment csak a lokális WHY-t mondja, vagy ha nincs WHY, a komment egésze megy;
   - `docs/06` hivatkozás maradhat.
4. Futásidejű string: `storage/paths.ts:135` → „a verziómappák append-only-k".
5. Tesztnevek: az 1.2 szerint; a **végleges nevek egyezzenek az F2 anchorokkal** (F2 után
   ellenőrizni a `docs-check` anchor-szabályával).
6. Komment, ami a D-szám nélkül csak „mit csinál"-t mond → a komment-szabályzat szerint
   **törölhető**, ne maradjon üres címke.

Minden mappa után: `npm test` (érintett mappa) + `npm run docs-check` — a D-ref és
legacy-ref hibák száma csökken; F8 végén az `app/src` alatt 0.

Commitok: `<mappa>: D-hivatkozások és docs-anchorok lokális WHY-ra írva`.

### F9 — Skillek

**`.claude/skills/plan/SKILL.md`** (`disable-model-invocation`, mint ma). Átveszi a
`planning/SKILL.md`-ből: a döntési interjú módszerét (`grill-me` stílus), a „nem ír
app-kódot, nem implementációs részlet" tiltást, a `backlog/ideas/` csak-olvasását. Kimenet:
`backlog/plans/<slug>.md` a V2 §10 sablonnal (≤ 6000 kar):

```md
# <slug>
Target: master
Baseline: <git rev-parse origin/master>
## Goal          egy mondat: mit lát másképp a doki
## Current state csak a releváns fájlok/symbolok/tesztek
## Approach      mely fájlok/boundary-k változnak, melyek nem
## Decisions     csak valódi választásnál: <választás> — mert <ok>; nem <alternatíva>, mert <ok>
## Verification  [ ] tests  [ ] typecheck/lint  [ ] docs-check  [ ] manual-check szelet (ha kell)
```

Kikerül: sorszám-mechanika, `BACKLOG_DONE` olvasás, `docs/01` D-ütközés-ellenőrzés, „Sérthetetlen
szabályok" hivatkozás (helyette `PRODUCT.md` + nested `CLAUDE.md`). A `BACKLOG.md` KIDOLGOZOTT
blokkjába író lépés **marad** a mai formában (4. döntés) — a `**Terv:**` sor a slug-fájlra mutat.

**`.claude/skills/implement/SKILL.md`**. Az `implement-backlog-item.md` váza: argumentum
(slug VAGY meglévő `backlog-N-*-terv.md` név) → validáció → `git pull --ff-only` →
**preflight (V2 §10.1)**: `git fetch`; a plan `Baseline`-ját a target headhez hasonlítja; ha
eltér, a `Current state` fájljait/symboljait/tesztjeit újraellenőrzi, és csak ezután frissíti
a Baseline-t → implementáció (a nested `CLAUDE.md` „Find before writing" indexét használva) →
**minőségi kapu**: `npm run build && npm run lint && npm test && npm run docs-check` → megáll,
nem commitol (a `/finish` dolga). `--worktree` opcióval a `-worktree.md` koreográfiája
(`EnterWorktree(<slug>)`, `npm install`, rebase `origin/master`-re, `--force-with-lease`,
`gh pr create`, resume-ág félbehagyott rebase-re).

**`.claude/skills/finish/SKILL.md`**. Sorrend, megállás nélkül nem ugorható:
1. `build`/`lint`/`test`; 2. `docs-check`; 3. a plan `Verification` szerinti manual-check
szelet (`/manual-checks <szelet>`), ha a változás típusa kéri; 4. dokumentáció **csak akkor**,
ha kódból/tesztből nem levezethető context keletkezett — default: nincs docs-diff; 5. a plan
fájl `git rm`, a `BACKLOG.md` tétel-szakaszának törlése (mai viselkedés; nincs done-napló);
6. commit + megállás; 7. záró jelentés kézi tesztlistával + emlékeztető: `/update-changelog`,
`/update-features` külön, kézi hívásra.

**`.claude/skills/manual-checks/`**. A `browser-validation/` átnevezve (`git mv`). A
`checklist.md` három szeletre bontva, saját becsült végrehajtási idővel: `pdf` (valós
PDF-bájtok, font-embedding, fogtérkép-PNG, lábléc hosszú névvel), `visual-css` (computed-style
kontraszt, `controlBorder`, `paint-order`, Radix popover-geometria, skeleton), `keyboard-a11y`
(Tab-sorrend, fókuszgyűrű, a tételfelvitel ciklusa, `prefers-reduced-motion`). A kadencia-tábla
→ „melyik változás-típus melyik szeletet kéri". A 6 D-ref (D2/D4/D23) néven megnevezett
szabállyá írva; `docs/07`/`docs/04` hivatkozások → `app/src/CLAUDE.md`, `app/src/pdf/CLAUDE.md`,
`PRODUCT.md`. A jelentés továbbra is `docs/reviews/`-ba megy.

**Pontszerű javítások**: `doctor-review/SKILL.md` egyetlen `docs/07` hivatkozása →
`app/src/CLAUDE.md`; `update-features/SKILL.md` „ne olvasd a `docs/03`-at" mondat törlése;
`push-backlog-item.md`, `code-and-architecture-review/`, `update-changelog/`,
`agents/orvos-persona.md` érintetlen. `git rm` a `planning/`, `implement-backlog-item.md`,
`implement-backlog-item-worktree.md`.

Commit: `skillek: /plan, /implement, /finish, /manual-checks — a régi backlog-lezárási koreográfia kivezetve`.

### F10 — Legacy-karantén, régi guard törlése, CI, zárás

1. `mkdir docs/legacy && git mv docs/0{1,2,3,4,5,7}-*.md docs/D-SZAM-FORRASKOD-LELTAR.md
   docs/PROBLEMS.md docs/agent-first-documentation-model_V2.md docs/legacy/`
   és `git mv backlog/done docs/legacy/backlog-done`.
2. `docs/legacy/README.md`: „Történeti anyag a 2026-09-05 előtti dokumentációs modellből.
   Normatív ereje nincs; az aktuális igazság a kód + tesztek, a szándék a `PRODUCT.md`. Semmi
   nem hivatkozhat ide (a `scripts/docs-check.mjs` tiltja). **Törlés 2026-11-04 után, külön
   commitban.**"
3. `git rm app/src/dokumentacioGuard.ts app/src/dokumentacioGuard.test.ts app/src/dokumentacioGuard.baseline.json`.
4. `README.md` táblázata: `PRODUCT.md`, `CLAUDE.md`, `docs/06-veglegesites-terv.md`,
   `backlog/BACKLOG.md`, `data/arlista.seed.json`, `assets/`, `app/`. Az „MVP határa" és
   „Nyitott kérdések" szakaszok tartalma a `PRODUCT.md`-be ment — itt csak egy hivatkozás
   marad rá. A `(D21)`, `D15` említések törölve.
5. `app/src/assets/fonts/README.md` 1 D-ref javítása (az `assets/` ki van zárva a scanből,
   de ne maradjon). `docs/06-veglegesites-terv.md` 17 `docs/0X-` hivatkozása → `PRODUCT.md`
   vagy nested `CLAUDE.md` szakaszra (az őr F1 óta jelzi). A `docs-check.mjs`
   `LEGACY_BOUND_DOCS` listája törölhető (a fájlok már `docs/legacy/` alatt, amit a
   `EXCLUDE_DIRS` kizár).
6. `.github/workflows/deploy.yml`: `- name: Docs check` lépés `npm run docs-check` a
   `Run tests` után.
7. `npm run docs-check` **zöld**; teljes suite zöld; `/run` a CSP-vel (PDF-előnézet, letöltés,
   fogtérkép-PNG, font) — konzolban 0 CSP-hiba.
8. Ez a fájl (`docs/agent-first-migracios-terv.md`) a 7. szakasz kitöltése után
   `git mv` → `docs/legacy/`.

Commit: `docs: régi dokumentáció legacy-karanténba, dokumentacioGuard törölve, docs-check a CI-ben`.

---

## 4. Ellenőrzés (a teljes migráció végén)

1. `cd app && npm run build && npm run lint && npm test && npm run docs-check` — mind zöld.
2. `grep -rnE "\bD[0-9]{1,3}\b" app/src --include=*.ts --include=*.tsx --include=*.md` → 0.
3. `grep -rn "docs/0[1-5]-\|docs/07-\|backlog/done\|BACKLOG_DONE\|docs/legacy" CLAUDE.md PRODUCT.md README.md app/src .claude docs/06-veglegesites-terv.md` → 0.
4. Budget: `wc -m CLAUDE.md PRODUCT.md app/src/CLAUDE.md app/src/domain/CLAUDE.md app/src/storage/CLAUDE.md app/src/pdf/CLAUDE.md` a limitek alatt.
5. Anchor-teszt: egy `symbol:` és egy `test:` anchor szándékos elrontása → `docs-check` piros a
   pontos fájl:sorral; visszaállítva zöld.
6. `/run`: az app CSP mellett — új terv, tételfelvitel billentyűzettel, PDF-előnézet, letöltés,
   véglegesítés, fogtérkép-PNG a PDF-ben, Roboto a PDF-ben (ő/ű). Konzol: 0 CSP-sértés.
7. Friss session (régi docs nélkül) a 6 discovery-kérdésre helyesen válaszol.
8. Próba-ciklus: `/plan proba-slug` → `/implement proba-slug` egy triviális változtatással →
   `/finish proba-slug`: a plan létrejön és törlődik, `docs-check` fut, nincs docs-diff, a
   `BACKLOG.md` tétel-szakasza eltűnik.
9. CI zöld a `master`-en (a `docs-check` lépéssel).

---

## 5. Kockázatok

| Kockázat | Kezelés |
|---|---|
| A 242 `docs/0X` anchor átírása soronkénti ítélet — a legnagyobb időköltség | Mappánkénti commit; a `docs/03`-ra mutatók döntő többsége törlés + lokális WHY, nem áthelyezés |
| A CSP eltöri a `@react-pdf` worker/blob útját vagy a GitHub Pages base path-ot | F0-ban `/run`-nal ellenőrizve; konkrét direktíva lazítható, `connect-src 'none'` nem |
| `PRODUCT.md` 6000 karakter szoros | Először a „Napi flow" rövidül; a jogi/adat-szakasz nem |
| Tesztnév-változás ↔ anchorok szétcsúsznak | F2 anchorok a végleges nevekre; a `docs-check` anchor-szabálya minden mappa-commit után fut |
| A régi `dokumentacioGuard` F1–F9 alatt hamis pirosat ad (áthelyezett D-refek) | Elfogadott: a baseline nem frissül, a teszt F10-ben törlődik; addig a suite-ban ez az egy teszt piros lehet — a commit-kapu a többi tesztre vonatkozik |
| Két párhuzamos session ugyanazt a nested `CLAUDE.md`-t módosítja | Kis fájl, normál szöveges konfliktus — pont ez a modell nyeresége |
| Nem-levezethető tudás elvész a `docs/03` törlésével | Legacy-karantén 60 napig; a friss-session teszt (F2) és a seprés (F3–F8) közben talált WHY-k a nested fájlokba |

---

## 6. Későbbi, külön tételek (nem ennek a tervnek a része)

- **2026-11-04 után:** `git rm -r docs/legacy` egy commitban.
- **Backlog-modell** (4. döntés): sorszám → slug, `BACKLOG.md` alakja, `backlog/plans` scan és
  6000 karakteres plan-budget a `docs-check`-ben, a `/plan` `BACKLOG.md`-írásának
  egyszerűsítése, `backlog/ideas/` D-refjei.
- **Branded `Minor` pénztípus** a `domain/money.ts`-ben + invariáns-teszt („nem egész érték nem
  kerülhet `tenylegesEgysegar`-ba"), a `Sor`/`Plan` mezőkre kiterjesztve.
- **`PlanStorage`-határ erősebb őre**, ha az oxlint override nem elég (pl. dependency-cruiser).
- **`NyomtatvanyokTab` sablon-piszkozat cache** egy `DraftStorage`-szerű interfész mögé, hogy
  a `localStorage`/`DemoStorage` lint-kivétel megszűnjön (F0 hagyta meg, disable-sorokkal).
- **Memóriafájlok** (a Claude Code auto-memory): `feedback_backlog_recheck_numbering…` és
  `feedback_claude_md_no_d_range…` a migráció után részben elavul — a végrehajtó session
  zárásakor frissítendő.

---

## 7. Végrehajtási napló (a végrehajtó session tölti ki)

| Fázis | Commit | Dátum | Megjegyzés |
|---|---|---|---|
| F0 | `b0cc6ca` | 2026-09-05 | CSP Vite-pluginnal: `connect-src 'self' data:` (react-pdf font/logó fetch + yoga wasm data-URL), `script-src 'wasm-unsafe-eval'` (a böngészős próba a wasm-fordítást blokkolta), `frame-src blob:` (PDF iframe), dev-only `script-src 'unsafe-inline'` (plugin-react preamble). Lint: hálózati globálisok + `localStorage` + `DemoStorage`-import tiltva, `NyomtatvanyokTab` kivétel disable-sorokkal; `Lint` lépés a CI-ben. `ervenyes-ig-hianyzik` hard tétel + 2 teszt. 2 negatív PDF-teszt (terv- és sor-szintű kedvezmény). |
| F1 | `8cc6c14` | 2026-09-05 | `scripts/docs-check.mjs` + `npm run docs-check`. Első futás: 288 fájl, **1367 hiba** (legacy-ref 375, d-ref 990, budget 2: `CLAUDE.md` 24353/4000, `app/src/CLAUDE.md` 76456/2500; anchor 0, skip-only 0). A tíz legacy-be szánt `docs/*.md` név szerint kizárva F10-ig (`LEGACY_BOUND_DOCS`). Anchor csak `→ <típus>:` alak után, a prózai nyíl nem anchor. |
| F2 | `02879d5` | 2026-09-05 | `PRODUCT.md` (5753 kar), root `CLAUDE.md` (3843), `app/src/CLAUDE.md` (2476), `domain`/`storage`/`pdf` `CLAUDE.md` (2477/2497/2472). `docs-check`: anchor 0, budget 0 (marad legacy-ref 261, d-ref 842 a kódban). Anchor-szabotázs próba: két elrontott anchor → pontos `fájl:sor`. Felderítésben javított tények a tervhez képest: a PDF-font **NotoSans** (a Roboto a képernyőé); az updater-szerződés az `AppState`-en él, a `PlanStorage` kész értéket kap; az `arlistaVerzio` bélyegzés a `PriceListAdminPage` `commit`-jában, nem a tárolóban; a `usePDF` blob-megőrzése a könyvtár viselkedése, a `PreviewPage` tilt; a `controlBorder` 3 nevesített kivétele (`solid`/`IconButton`/`ghost`) a `docs/07`-ből; a `TervDocument.test.tsx:466` nem nyilatkozat-teszt (a nyilatkozat-zár a `PreviewPage.test.tsx`-ben). **Falszifikációs teszt 6/6 helyes**, friss subagenttel, régi docs nélkül (~18 fájl megnyitva a context-fájlokon felül). Pótolva: a 3. kérdésnél (`sorElteres` osztályozó) a modul csak repo-greppel volt megtalálható, mert a budget-trimmelés kivágta → visszakerült a `domain/CLAUDE.md`-be; az 5. kérdésnél `assertVersionDirAvailable` symbol a `storage/CLAUDE.md`-be. Fenntartás: a teszt-agent a 2. kérdésnél a root `CLAUDE.md` „Sérthetetlen szabályok” tábláját idézte — a próba idején egy `git checkout` átmenetileg a régi rootot állította vissza; a nested fájlok már az újak voltak, és minden idézett invariáns az új fájlokban is anchorral szerepel. App/src UI helper-index: a doki döntésére 6 soros „Find before writing (UI)” blokk maradt (AppState, 3 külön guard, DiscardGuard, PlanVersionActions, PaciensKotes); `useMentesJelzo`, `Section`/`ReadOnlyField` a budget miatt kimaradt. |
| F3 (`domain/`) | `6174542` | 2026-09-05 | 264 találat (208 d-ref, 56 legacy-ref) 58 fájlban → 0. Osztályozás: 131 LABEL (címke törlés), 17 WHY (lokális mondat), 33 DOCS-DROP, 13 DOCS-NESTED (`lásd app/src/<mappa>/CLAUDE.md`), 3 DOCS-PRODUCT (`date.ts`, `money.ts`), 27 tesztnév-átnevezés; 0 futásidejű string/azonosító. Gépi rész (84 tiszta zárójeles címke + `(Dn: szó)` → `(szó)`, scratchpad-script) + kézi rész. **Lelet, F4–F8-ra kötelező szabály: két D-számozás keveredik a kódban** — a `docs/01` táblája (D1–D79) és a redesign-napló (`backlog/done/redesign/01_dental-plan-redesign-dontesek.md`, D1–D606), az alacsony tartomány ütközik. Minden `D≥100` (D103, D133, D161, D162/163, D186, D190/191, D224/225, D230, D238, D327, D404, D479/480, D534, D576) a redesign-naplóé; néhány alacsony is (`veglegesitesOr.ts` D9/D33 = redesign „master sync csak explicit”). WHY-átvételnél a komment témája dönt, melyik forrás; elavult/egyikre sem illő számok (töröltük): `veglegesitesOr.ts` D73, D74 (×2, a téma valójában a tábla D77-e), `nemetNev.ts` D74, `orvosok.ts` D63/D64 (nem orvos-téma), `masterSnapshotDiff.ts` „redesign DP-016". A nested `CLAUDE.md` `test:` anchorai a rename után is feloldódnak (prefix-illesztés). Domain-suite 709 teszt zöld, lint/build zöld. |
| F4 (`storage/` + `state/`) | `90a86e5` | 2026-09-05 | 170 találat (139 d-ref, 31 legacy-ref) 21 fájlban → 0. A `storage/seed/`-et (a terv F8-ra sorolta) ide vontuk, hogy a mappa egy commitban legyen nulla; F8-ra a gyökér-fájlok maradnak. Osztályozás: 96 LABEL (6 átfogalmazás, ahol a D-szám főnév volt: `D25/előleg pár`, `D4 rá nem vonatkozik`, `D29 előtti`, `D18 a piszkozatra is`), 6 WHY (mind a tábla D4-e: append-only, „aláírt szerződést nem lehet visszamenőleg átírni”), 8 DOCS-NESTED, 4 DOCS-PRODUCT, 20 DOCS-DROP, 23 tesztnév. **Egyetlen futásidejű string** a teljes migrációban: `paths.ts` `VersionConflictError` üzenete (`… írunk felül (D4) …`) → „a verziómappák append-only-k”; teszt csak az osztályt/nevet asserteli. Két-számozás: `D15` a `seed/plans.ts`-ben tábla (sávos `*`), a `PlanStorage.ts:72`-ben redesign (quick-create mezők); `D63` az `AppState.tsx`/`.test.tsx` négy helyén elavult szám (a téma a tábla D67-e, orvos-öröklés) — csak törlés, a próza kimondta. Gotcha a gépi scriptben: a `(Dn:` + sortörés minta összevonta a `seed/plans.ts:12-13` két sorát — kézzel visszabontva, a domain-en utólag ellenőrizve (0 ilyen). Storage+state suite zöld, teljes suite zöld, lint/build zöld. A `dokumentacioGuard` baseline-ja EGY fájlra frissült (ez a terv: 36 → 72), mert a 7. szakasz naplósorai a törölt számokat felsorolják — a guard üzenete szerinti „szándékos takarítás” eset; a forráskódra a baseline változatlan. |
| F5 (`pdf/` + `design/`) | (az F6 commit írja be) | 2026-09-05 | 29 találat (13 d-ref, 16 legacy-ref) 11 fájlban → 0. A legkisebb fázis, felderítő agent nélkül. Minden szám a tábláé és a témával egyezik, nincs elavult; 0 futásidejű string; 1 tesztnév (`backlog-9/…: előleg-sor` describe). A `TervDocument.tsx` fejléce PRODUCT.md § A nyomtatvány szerződéses dokumentum + `app/src/pdf/CLAUDE.md` pointert kapott a régi nyomtatvány-spec helyett; a `design/` `docs/07`-anchorai az `app/src/CLAUDE.md`-re mutatnak. Pdf+design suite zöld, teljes suite zöld, lint/build zöld. |
| F6–F8 | | | |
| F9 | | | |
| F10 | | | |
