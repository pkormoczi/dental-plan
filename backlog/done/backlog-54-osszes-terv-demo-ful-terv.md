# 54. tétel — „Összes terv" a DEMO oldalon

**Eredet:** ez a tétel nem szerepelt korábban a `backlog/BACKLOG.md`-ben —
egy `/grill-me` munkamenetben derült ki, amikor a doki azt kérdezte, kell-e
egyáltalán a „Korábbi tervek" globális nézet a páciens-központú redesign
(D34–D53) után, a 43./44. tétel precedense szerint.

## Kontextus

A páciens-központú redesign során a `Korábbi tervek` képernyő elveszítette
minden belépési pontját, de maga a képernyő megmaradt. A `/tervek` a
munkamenet kezdetén teljesen árva volt: az egész `app/src`-ben a `/tervek`
string egyetlen nem-teszt előfordulása maga a `<Route>` volt
(`App.tsx:74`, korábbi állapot) — se NavBar, se Kezdőlap, se Pácienslista,
se páciens-részletoldal nem linkelt rá, csak kézzel beírt `#/tervek`
URL-lel volt elérhető.

Ez nem szándékos végállapot volt, hanem befejezetlen migráció:

- A redesign IA már **beolvadást** döntött
  (`backlog/redesign/02_...-kategorizalt.md` § 20 „C1 — FELOLDVA
  2026-08-18": „`Korábbi tervek` a páciens `Kezelési tervek`
  kontextusába olvad", származtatott IA-következmény).
- A megvalósítás viszont **csak a belépési pontokat** vette el (D39:
  „kizárólag URL-ről érhető el" — ez állapotjelentés volt, nem
  végállapot-döntés).
- Nem volt D-döntés és nem volt backlog-tétel sem a törlésére, sem a
  fennmaradására.

Emellett két hivatkozás már a munkamenet elején is félrevezetett:
`PaciensekPage.tsx` tooltipje egy elérhetetlen képernyőre mutatott, a
`docs/03-funkcionalis-spec.md` § 9 pedig azt állította, hogy a Páciensek
és a Korábbi tervek listája „kölcsönösen linkel egymásra" — a `/tervek`
felé nem volt út.

## Grill-me munkamenetben eldöntött (a doki döntései)

| Kérdés | Döntés |
|---|---|
| Van cross-patient use case? | Nincs — mindig páciensből indul. Nagyságrend: 100–500 páciens. |
| A `/tervek` sorsa | DEMO oldal ötödik füle (nem törlés, nem árvaság) |
| A fül alakja | 1:1 áthelyezés, minden akcióval (nem read-only index) |
| DEMO fülek URL-címezhetők? | Igen, `/demo/:tab` + `/tervek` redirect |
| `docs/03` § 5 | Helyén marad, átnevezve „Terv-láncok és verziók" |
| Fül neve | „Összes terv" |
| DEMO alcím ellentmondása | Nem nyúlunk hozzá (lásd „Tudatosan vállalt") |

A kezdőlapi link opciót (a doki felvetése) elvetettük: az a mai, névre
kereső/név szerint rendező listát tenné felfedezhetővé, ami pont akkor
használhatatlan, amikor a legvalószínűbb igényre (időbeli visszakeresés,
„nem jut eszembe a név") kellene válaszolnia.

### Tudatosan vállalt kompromisszum

Az 1:1 áthelyezéssel a DEMO oldalról éles írási akciók indíthatók (Új
terv, Új verzió, Másolás új tervbe, Letöltés) — miközben a `DemoPage.tsx`
alcíme azt mondja, „nem az üzleti munkafolyamat része". A doki tudatosan
úgy döntött, hogy sem az alcímet, sem a fület nem egészítjük ki
magyarázó szöveggel.

## Megvalósítás

- `App.tsx`: `/tervek` → `<Navigate to="/demo/tervek" replace />`; új
  `/demo/:tab` route a meglévő `/demo` mellett.
- `DemoPage.tsx`: a `Tabs.Root` `useParams().tab`-bal vezérelt, kontrollált
  komponens; `onValueChange` → `navigate('/demo/' + v, { replace: true })`.
  A `replace` nem stílus, hanem működési feltétel: a fülváltás ne
  szemetelje tele a history-t, ÉS a böngésző-„vissza" a helyes fülre
  érkezzen — enélkül a `useListStateMemory` (D43/D51) POP-alapú megőrzése
  fülbe zárva, elérhetetlenül maradna. Öt fül, sorrendben: `funkciok |
  tervek | filerendszer | valtozasnaplo | adatkezeles` — az „Összes terv"
  a Funkciók után, a nyers adateszközök elé.
- `git mv pages/PlanHistoryPage.tsx pages/demo/OsszesTervSection.tsx`
  (+ a teszt), importok `../` → `../../`, a komponens és a `<Heading>`
  szövege `Összes terv`-re. Minden más (keresőmező, `standalone`
  fejléc-mód, `⋯` menü, akciók, `HistorySkeleton`) változatlan.
- `PatientPlanChains.tsx` `header: 'standalone' | 'embedded'` (D44)
  változatlan — az 1:1 áthelyezés megtartja a `standalone` hívót.
  `useListStateMemory.ts` `nyitottak`/`setNyitott` mezőpárja (D51)
  változatlan.
- Kód-kommentek, amiknek az állítása hamissá vált: `PreviewPage.tsx`
  („nincs hozzá nav-link" → az új otthonra átírva), `PaciensekPage.tsx`
  tooltip + fejléc-komment („kölcsönösen linkel egymásra" → mindkettő
  ugyanoda vezet).
- `docs/03-funkcionalis-spec.md`: § 5 átnevezve „Terv-láncok és verziók"-ra
  (a `§` szám NEM csúszhat, mert `CLAUDE.md` és forráskód-kommentek is
  számra hivatkoznak), nyitó bekezdés kimondja az elsődleges (§ 10 tab) —
  másodlagos (DEMO fül) viszonyt; § 1/4/8/9/10 belső hivatkozások
  átvezetve.
- `docs/01-attekintes-es-dontesek.md`: új **D54**.
- `CLAUDE.md`: a D51 bekezdés `§ 5. Korábbi tervek` hivatkozása az új
  szakaszcímre.
- Tesztek: `OsszesTervSection.test.tsx` (átnevezve, heading-assertion
  frissítve); `DemoPage.test.tsx` bővítve öt fülre, URL-vezérelt
  renderelésre (`/demo/:tab` saját route-táblával, mert a `TestProviders`
  bare `MemoryRouter`-je nem ad `:tab` paramétert), ismeretlen slug
  fallback, `replace`-navigáció history-higiénia teszt; `App.test.tsx` és
  `PatientPage.test.tsx` meglévő `#/tervek` navigációi kiegészítve egy
  explicit `window.location.hash === '#/demo/tervek'` ellenőrzéssel.

## Megjelölve, külön döntést kér (NEM része a hatókörnek)

1. **Kettős D-számozás.** A `docs/01` D1–D53, a
   `backlog/redesign/01_...md` viszont D1–D606, és a `docs/03`
   megkülönböztetés nélkül idéz mindkettőből (`D192`, `D203`–`D205`,
   `D534` mind redesign-log számok). Önálló backlog-tételt érdemel.
2. **`useListStateMemory.ts` fejléce** a lánc-nyitottság bővítésénél
   `D240`-re hivatkozik — az a redesign-napló számozása, a `docs/01`-ben
   ez D51. Nem nyúltunk hozzá „mellékhatásként".
3. **`NavBar.tsx`** komment szerint a négy megszűnt link „szerepét a
   `TervWorkflowShell` breadcrumb+stepperje vette át" — a `Korábbi
   tervek`-re ez soha nem volt igaz, és most még kevésbé az.
4. **Eager betöltés.** Az „Összes terv" fül megnyitásakor 100–500 páciens
   × teljes lánc/verzió betöltés fut. Az 1:1 áthelyezés döntése ezt
   tudatosan érintetlenül hagyja.

## Verification

```
cd app && npm run build && npm run lint && npm test
```

Build/lint/teszt mind zöld (71 teszt-fájl, 1198 teszt). Kézi teszt a
`BACKLOG_DONE.md` zárt bejegyzésének kézi-teszt blokkjában.
