# Manual checks — `visual-css` — 2026-09-28

```
Dátum: 2026-09-28
Szelet: visual-css
Kiváltó: fejlec-kuka-felirat-es-becsult-ar-szo implementációja (/implement 2d) — kuka áthelyezése a fejlécben, „becsült” jelvény a sorokon, jelvény-oszlop 40 → 104 px
Eszköz: chrome-devtools MCP (izolált, headless), Vite dev 5174, 1440×900 és 1280×720
Route-ok: #/terv (Kovács János „Korona és hídpótlások” v1 → Új verzió, seed adat)
```

## Mit fedett

- Kontraszt / `controlBorder` / accent-mint-szövegszín szkript a `#/terv`-en, egy sávos
  (alapból becsült) és egy kedvezményes, becsültre kapcsolt sorral: **0 szabálysértés**.
  Az új amber `soft` „becsült” jelvény átmegy a szövegkontraszton.
- Kuka a fejlécben: a cím / páciens·státusz / „Automatikusan mentve” oszlop alján ül, az
  „Előnézet” gomb a sor jobb szélén — a két gomb távolsága 1440 px-en ~1110 px. Tab a
  lépés-navigáció „Előnézet és véglegesítés” linkjéről: kuka (`:focus-visible` igaz,
  `outline: 2px solid rgb(151,100,69)`), következő Tab: „Előnézet” — a Tab-sorrend nem
  változott.
- Jelvény-cella: a kedvezményes becsült sornál „becsült” és „−15%” egy sorban, a cellán belül
  (nincs túlcsordulás) 1440×900-on és 1280×720-on is; a sormagasság nem nő a jelvénytől
  (46 px a jelvénnyel és anélkül; a 95/68 px-es sorok a fogszám-figyelmeztetés és az „átírt”
  jelvény miatt magasabbak, a változás előtt is). `horizontalOverflow: false` mindkét
  felbontáson.
- Konzol: üres (nincs React-figyelmeztetés, nincs CSP-sértés).

## Kritikus

—

## Közepes

### 1. A Beavatkozás oszlop a `visual-css` szelet alsó küszöbe alatt van — már a változás előtt is

`app/src/pages/planEditor/PhaseSection.tsx`, `app/src/pages/PlanEditorPage.tsx`. A szelet
elvárása: `beavatkozasOszlopPx` ≥ 480, `nevmezoPx` ≥ 420. Mért (1440×900 és 1280×720
egyaránt, az 1180 px-es lap-plafon miatt): **390 / 331 px**. A jelvény-oszlopot a böngészőben
visszaállítva 40 px-re: **429 / 370 px** — a küszöb tehát már a tétel előtt sem teljesült; a
tétel a tervben eldöntött módon (Decisions: 40 → 104 px) további ~39 px-et vesz el. A
„Zirkonkerámia korona fogra”-hosszúságú nevek elférnek; a leghosszabb seed-név a mező
`title`-jében előhívható. Nem a tétel `Goal`-jának bukása; a küszöb és a szélesség-költségvetés
összehangolása külön döntés (lap-plafon vagy küszöb frissítése).

## Apró

—

## Nem ellenőrizhető

- `prefers-reduced-motion` (nincs media-feature emuláció, lásd `SKILL.md`).
- A többi route: a tétel nem érinti őket, ebben a futásban kihagyva.

Futásidő: ~8 perc (böngészős rész).
