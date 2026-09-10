# belso-kod-feluleten-paciensmappa-szabo
Type: feature
Source: review:2026-09-09-doctor-review-elso-megnyitas#13
Target: master
Baseline: 8861020bb3c9d79cb922f959575c4934a945febf

## Goal
A doki a fő útvonalon (Terv adatai lap, mentés utáni sikerképernyő) egyetlen aláhúzásos,
toldalékos mappanevet sem lát: a kötött pácienst a neve és születési dátuma azonosítja, a
mentett terv helye a sikerképernyőn egy összecsukott részlet mögött marad elérhető.

## Current state
- `app/src/pages/PatientPage.tsx` (300–316. sor) — a kötés-jelző: `ReadOnlyField` a névvel,
  alatta monospace „Páciensmappa: <dirName>” sor (`usePaciensKotes` `patientDir`). Az ütközés-
  `Callout` (318–345.) szövege „a fenti kötött páciensmappába mentődik”-re hivatkozik.
- `app/src/components/PaciensKotesContext.tsx` `usePaciensKotes` — `kotott: PatientFolder`
  (csak `dirName`, `paciensId`, `nev`), születési dátum nincs benne.
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` (75–95. sor) — a lapon már betölti a
  kötött páciens `PatientMasterData`-ját (`storage.loadPatientData`), de saját state-ben.
- `app/src/domain/date.ts` `formatShortDate` — a Páciensek lap ezzel írja a névrokonok
  születési dátumát (`pages/paciensek/PatientTableRow.tsx`, `JeloltSor.tsx`).
- `app/src/pages/PreviewPage.tsx` (559–576. sor) — a sikerképernyő: „<név> · <terv címe> · <n>.
  verzió”, alatta „Mappa:” felirat + monospace útvonal külön elemben.
- Tesztek, amiket a változás elmozdít: `app/src/pages/PatientPage.test.tsx` „kötött piszkozatnál
  a páciens NEVE az elsődleges szöveg, a mappanév megnevezve alatta áll”, „két azonos nevű
  páciens közül a mappanév mondja meg, melyikhez kötött a terv”, és a `Páciensmappa:`-ra váró
  sorok (1037.); `app/src/pages/PreviewPage.sikerkepernyo.test.tsx` „a sikerképernyő a páciens
  nevét, a terv címét és a verziószámot mondja ki, a mappaútvonal megnevezve alatta marad”;
  `app/src/App.test.tsx` (77., 170. sor) az útvonal-hármast a `/_v1$/` szövegből olvassa vissza.

## Approach
`PatientPage.tsx`: a „Páciensmappa:” sor törlődik; a kötés-jelző értéke „<név> (<születési
dátum>)”, dátum nélküli páciensnél csak a név. A kötött páciens születési dátumát a
`usePaciensKotes` szolgáltatja (a kötött mappa `loadPatientData`-jából), nem a
`TorzsadatSyncCard` belső state-jéből. Az ütközés-`Callout` mondata „a fenti kötött
pácienshez mentődik” alakra vált. `PreviewPage.tsx`: a sikerképernyőn a „Mappa:” sor
alapból rejtett; egy „Hol van a gépen?” feliratú, `aria-expanded` ghost gomb nyitja, alatta
ugyanaz a „Mappa:” felirat + útvonal, külön elemben, mint ma.

NEM tartozik ide: a mappanevek és az útvonal-képzés (`storage/paths.ts`); a lemezen lévő
mappák; a letöltött PDF fájlneve; a demó „Fájlrendszer” és „Összes terv” nézet, ahol az
útvonalak szándékosan nyersek; a Terv részletei lap; a névrokon-ütközés logikája
(`domain/paciensKotes.ts`).

## Decisions
- A mappanév eltűnik a fő útvonalról — mert a doki a Fájlkezelőben névre keres (PRODUCT.md
  § Adat- és deployment-korlátok), amihez a toldalék nem kell; nem marad látható, mert a
  09-05 és 09-09 review is bizalmatlanságot mért („ez kerül a papírra?”).
- Névrokonokat a születési dátum különbözteti meg — mert a Páciensek lap is így tesz, a doki
  nyelvén; nem „mappanév csak ütközéskor”, mert akkor ritkán mégis belső kód látszana.
- A születési dátum a kötött páciens törzsadatából (`paciens-adatok.json`) jön, nem a
  piszkozat `paciens.szuletesiIdo` mezőjéből — mert a kötést a mappa identitása mondja meg, a
  piszkozat mezője szerkesztés alatt állhat.
- A sikerképernyőn az útvonal összecsukva marad elérhető — mert a Google Drive-tükrözésnél
  hasznos tudni, hova került; nem törlődik teljesen. Ghost `Button` + `aria-expanded`, nem
  natív `<details>`, mert Radix Themes az egyetlen UI-lib és a ghost gomb a `controlBorder`
  szabály nevesített kivétele.
- A „Mappa:” felirat és az útvonal továbbra is külön elem — hogy az `App.test.tsx` útvonal-
  leolvasása változatlanul működjön (a rejtett tartalom jsdomban is a DOM-ban marad, ha a
  gomb nyitja; ha nem, a teszt nyitja meg).

## Verification
- [ ] tests — a Terv adatai lapon kötött piszkozatnál a név és a születési dátum látszik,
      aláhúzásos mappanév sehol; két azonos nevű páciensnél a születési dátum mondja meg,
      melyikhez kötött; dátum nélküli páciensnél csak a név; a sikerképernyőn „<név> · <terv
      címe> · <n>. verzió” látszik, az útvonal alapból nem, a gomb megnyomása után igen; a
      letöltött fájl neve változatlan
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css (az új ghost gomb fókuszgyűrűje valós Chrome-ban)
