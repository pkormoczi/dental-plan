# Biztonsági review — kliensoldali app (app/)

Scope: `app/` (Vite + React SPA), `data/`, seed/fixture fájlok, `.github/workflows/deploy.yml`,
git history. `review/00-audit.txt` nem létezik ebben a repóban (csak `01-react.md`), így
dependency-oldalról nem tudtam rá támaszkodni — a 6. pontot a `package.json`/`package-lock.json`
alapján saját magam néztem át.

**Nincs P0.** Nincs bundle-be szivárgó API-kulcs/token, nincs `eval`/`dangerouslySetInnerHTML`,
nincs backend. A repo publikus (`gh repo view` → `PUBLIC`) és `.github/workflows/deploy.yml`
minden `master`-push-nál publikus GitHub Pages-re deployol — ez a tényleges kockázati keret, amin
belül az alábbi találatok értendők.

## Találatok

### P1 — Teljes páciensrekord titkosítás/lejárat nélkül, publikus origin `localStorage`-ában
`app/src/storage/DemoStorage.ts:203-204` (`savePlan`): a véglegesített `Plan` (név, születési
dátum, lakcím, telefon, email, TAJ, kiskorú esetén törvényes képviselő neve+telefonja) és a
generált PDF base64-je egyben landol a `localStorage`-ban, kulcsonként lejárat nélkül. Egyetlen
törlési út a manuális `resetDemoData()` (`DemoStorage.ts:105-113`, gomb a Kezdőlapon).
Ez a mockup ezen fázisában **a system of record** (nem cache) — ezt a CLAUDE.md is így írja le,
tehát tervezési döntés, nem hiba —, de a gyakorlati kockázat konkrét: ha a doki valódi
páciensadattal próbálja ki a UX-et (ami pontosan a mockup célja), az a böngésző
Application → Local Storage alatt bárki számára olvasható, aki hozzáfér a géphez/profilhoz
(közös rendelői gép, tárolási jogú böngészőbővítmény), és nem évül el. Ezt bármikor
reprodukálhatod: nyisd meg a demót, tölts fel egy tervet, nézd meg DevTools-ban.

### P2 — GDPR 9. cikk-formájú fixture PII publikus repóban + publikus bundle-ben, auto-seedelve
`app/src/storage/seed/plans.ts:100-109` (Kovács János: `taj: '123 456 789'`, lakcím, telefon,
email), `:115-124` (Nagy Éva), `:214-223` (Tóth Zoltán — kiskorú, `torvenyesKepviselo: 'Tóth
Ildikó (édesanya) — +36 30 111 2222'`). Ez a fájl az `app/src/storage/DemoStorage.ts:87-91`
(`init()` → `resetDemoData()`) miatt **minden első betöltéskor automatikusan bekerül** minden
látogató `localStorage`-ába, és mivel a repo publikus és a build a Pages-re megy, a nyers adat is
publikusan olvasható a forrásban és a JS bundle-ben.
A minta alapján ez szintetikus adatnak tűnik (köznévi magyar placeholder nevek, `example.hu`
email, sorban következő TAJ-mintázat) — nem valódi szivárgás. A konkrét kockázat: a fájl
struktúrája pontosan arra invitál, hogy valaki egy valódi eset adatával "próbálja ki" vagy
frissítse a mintát; mivel ez egy publikus repo + publikus Pages-deploy, egy ilyen csere azonnal
az internetre tenné ki egy páciens 9. cikk szerinti különleges adatát (TAJ-szám, lakcím,
kiskorú törvényes képviselőjének telefonszáma).

## Amit átnéztem és tisztának találtam (a feladatlista szerint)

1. **`VITE_` env változók**: nulla darab. Nincs `.env`/`.env.local`/`.env.example` a repóban (sem
   `app/`, sem gyökér szinten), nincs `import.meta.env` hivatkozás a forrásban, és a git history-ban
   sem volt soha `.env*` fájl (`git log --all -p -- '**/.env*'` üres). Ergo nincs mit "publikusnak
   szánt vs. titok" szempontból minősíteni — a kategória üres.
2. **Hardcodeolt secret/token/számlaszám**: nincs (grep `api[_-]?key|secret|token|password|
   credential|bearer` a teljes repóra — az egyetlen hitek design-tokenek, FDI "tokenek" és az
   `js-tokens` npm csomag, mind fals pozitív). A fizetési feltételek sablonszövege
   (`app/src/storage/seed/templates.ts:12-18`) nem tartalmaz bankszámlaszámot, csak
   fizetési módokat.
3. **`dangerouslySetInnerHTML`/`eval`/`new Function`/dinamikus import**: nincs egyetlen előfordulás
   sem az `app/src` alatt. A nyilatkozat/fizetési feltételek markdown szövege
   `<Text>`-ként rendereldik a `@react-pdf/renderer`-ben (`app/src/pdf/TervDocument.tsx:388`) —
   ez szöveg-rajzolás, nem HTML-befecskendezés. A PDF-előnézet egy saját generálású blob-URL-t tölt
   `<iframe>`-be (`app/src/pages/PreviewPage.tsx:226-236`), nem felhasználói HTML-t.
4. **`localStorage`/`sessionStorage`**: lásd a P1 találatot fent — ez a válasz erre a pontra.
   A piszkozat (még nem véglegesített terv) szándékosan csak memóriában él
   (`app/src/state/AppState.tsx:1-5`), csak a véglegesített terv kerül `localStorage`-ba.
5. **Backend/proxy, CORS, URL-be tett érzékeny paraméter**: nincs backend — nulla `fetch`/`XHR`/
   `axios` hívás az egész `app/src` alatt (grep üres), a CLAUDE.md architektúra-leírásának
   megfelelően teljesen statikus SPA. A router (`HashRouter`) fix útvonalakat használ
   (`/paciens`, `/terv`, `/tervek`, `/elonezet`) — páciens-ID vagy egyéb PII soha nem kerül
   query stringbe vagy útvonal-paraméterbe.
6. **Függőségek (aránytalanság, nem az, ami már megvan a 00-auditban)**: `app/package-lock.json`
   225 feloldott csomagja 100%-ban `registry.npmjs.org`-ról jön (nincs git/http supply-chain
   függőség). Futásidejű dependency csak 4: `react`, `react-dom`, `react-router-dom`,
   `@react-pdf/renderer` — mind mainstream, karbantartott. Nincs `xlsx`/`exceljs`/`jspdf`/
   `html2canvas`/`dompurify`/`lodash`/`moment` sehol a feloldott fában — az `.xls`→JSON import
   (`data/arlista.seed.json`) tehát a buildelt bundle-ön kívül, egyszeri lépésként történt, nem
   utazik vele egy felesleges parser-könyvtár a böngészőben. Nem találtam olyan futásidejű
   csomagot, ami a funkciójához képest aránytalanul nagy vagy gondozatlan lenne.

## Mit nem néztem át
- A `ui/*.jsx` prototípusfájlokat PII szempontjából nem vetettem át sorról sorra (a CLAUDE.md
  szerint nem buildelődnek, és `grep`-pel megerősítettem, hogy `app/src` sehonnan nem importálja
  őket — ezért nem kerülnek a publikus bundle-be, de a repóban mint forrás továbbra is publikusan
  olvashatók).
- A `data/MINTA_MINTA_Kezelesi_Terv_frissített.xls` és `data/arlista.seed.json` teljes bináris/JSON
  tartalmát nem néztem át tétel szintig — csak minta-grepet futtattam TAJ-/telefonszám-mintázatra
  (nulla hit), ez nem zár ki minden PII-formát.
- `@react-pdf/renderer` és a többi npm csomag tranzitív forráskódját nem auditáltam (csak a
  lockfile-forrást és a hozzávetőleges karbantartottságot néztem) — ismert CVE-ellenőrzést nem
  végeztem, ez a "00-audit" hatóköre, amit a feladat szerint nem ismétlek.
- Nem futtattam az appot böngészőben ehhez a review-hoz (csak statikus kódolvasás) — a
  `localStorage`-ba írt tényleges kulcsneveket/adatformát a forrásból, nem DevTools-ból
  ellenőriztem.

## Hol vagyok bizonytalan
- A GitHub Pages site jelenlegi élesben-elérhetőségét (be van-e kapcsolva a Pages a repo
  Settings-jében, fut-e valójában a workflow) nem ellenőriztem közvetlenül — csak azt, hogy a
  workflow publikus repóra publikusan deployolna, ha be van kapcsolva.
- A `seed/plans.ts` adatai valószínűsíthetően szintetikusak (placeholder nevek, `example.hu`
  email, mintázatos TAJ-számok), de ezt nem tudom 100%-osan kizárni külső forrás nélkül — a
  minősítésem ("nem valódi szivárgás") erre a valószínűségi becslésre épül.
- Nem tudom, hogy a doki eddig valójában betöltött-e valódi páciensadatot a publikus demóba — ha
  igen, a P1 találat nem elméleti, hanem már megtörtént kitettség, amit csak a böngésző
  `localStorage`-ának ellenőrzésével/törlésével lehetne megerősíteni/orvosolni.
