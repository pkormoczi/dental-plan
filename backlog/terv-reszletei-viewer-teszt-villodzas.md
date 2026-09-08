# terv-reszletei-viewer-teszt-villodzas
Type: chore
Source: /implement-batch futás (2026-09-07), a kapu kétszeri piros futása
Target: master
Baseline: 0b5682b02a8e3d1d39188032060ad13493ea2e7f

## Goal
A kapu terhelés alatt is determinisztikus: a Terv részletei viewer-tesztje nem villódzik, és
egyetlen teszt sem hagy maga után felülírt globálist a következőnek.

## Current state
- `app/src/pages/TervReszleteiPage.test.tsx:492-500` — a villódzó teszt: egyetlen
  `findByTestId('terv-reszletei-fejlec')` után négy szinkron állítás.
- `app/src/pages/TervReszleteiPage.tsx:99` `usePlanPdfObjectUrl(allapot.fajta === 'kesz' ? … :
  null)` — a PDF-betöltés a fejléc megjelenése UTÁN indul; a 496. sor emiatt versenyez.
- `app/src/pages/tervReszletei/MentettPdfPanel.tsx` — `toltes` alatt SEM a callout, SEM az iframe
  nem renderel; a `hianyzik` ág sosem rendel iframe-et (ezért a 497. sori bukást a verseny nem
  magyarázza).
- `app/src/storage/usePlanPdfObjectUrl.ts` — az effekt `setUrl(null)`/`setHianyzik(false)` resettel
  indul, a cleanup `revokeObjectURL`-t hív.
- Közvetlen globális-felülírás visszaállítás nélkül: `TervReszleteiPage.test.tsx:449-450, 559-561`,
  `app/src/pages/demo/FileTreeSection.test.tsx:121-122`,
  `app/src/pages/demo/OsszesTervSection.test.tsx:639-640, 673`.
- `app/src/pages/demo/FileTreeSection.test.tsx:175, 186` — `vi.restoreAllMocks()` az assertion UTÁN
  (bukó állításnál kimarad).
- `app/src/test-setup.ts` — `if (!URL.createObjectURL)` őr: fájl-betöltéskor egyszer fut, tehát egy
  fájlon belüli felülírást már nem állít helyre.
- `app/vite.config.ts` `test` blokk — nincs `restoreMocks`/`clearMocks`.

## Approach
1. Időkeretes reprodukciós kísérlet: a teljes készlet ismételt futtatása, véletlen sorrend,
   szűkített fájl-párosítások — cél a **497-es mód** (jelen lévő iframe) bizonyított azonosítása.
   Ha az időkeret alatt nem jön elő, a jelentés kimondja, mi maradt bizonyítatlan.
2. A 496-os mód javítása: a panel állapotától függő állítások bevárják a végállapotot, nem a
   fejlécre támaszkodnak.
3. A szivárgás megszüntetése mindhárom fájlban: a közvetlen globális-értékadások helyett
   automatikusan visszaálló mock, a manuális `vi.restoreAllMocks()` hívások elhagyásával.
4. `app/vite.config.ts` teszt-blokkja megkapja a hozzá tartozó globális kapcsolót, hogy a
   visszaállítás bukó állítás esetén is megtörténjen.

NEM tartozik ide: a `docs/reviews/2026-09-05-tesztelesi-modszertan-review.md` többi megállapítása
(coverage, F08 többi pontja, kapu-tulajdonlás), új lint/docs-check őr a mintára, a
`usePlanPdfObjectUrl` vagy a `MentettPdfPanel` production-viselkedésének változtatása, és a
`TervReszleteiPage` betöltési sorrendjének átszervezése.

## Decisions
- A javítás nem a fejléc-várakozás finomítása, hanem az érintett állítások végállapot-bevárása —
  mert a `MentettPdfPanel` négy ága közül a `toltes` egyiket sem rendereli, tehát a fejléc
  megjelenése elvileg sem jelzi a panel készültségét.
- `vi.spyOn` + `restoreMocks: true` együtt, nem külön — mert a `restoreMocks` önmagában a mai
  közvetlen értékadásra bizonyítottan hatástalan, a `vi.spyOn` önmagában pedig bukó állításnál
  megint kézi visszaállításra szorulna.
- A globális kapcsoló a `vite.config.ts`-be kerül, nem a `test-setup.ts` `afterEach`-ébe — mert a
  setup `afterEach`-e ma is dob (DOM-nesting őr), és két dobó hook egymás hibáját fedné el.
- Mindhárom fájl egyszerre javul — mert a minta azonos, és egy fájlban hagyva ugyanez a villódzás
  bármikor visszatér máshol.

## Verification
- [ ] tests — a teljes készlet ismételt, véletlen sorrendű futtatása zölden fut; a Terv részletei
      viewer-tesztje a panel végállapotát figyeli, nem a fejléc megjelenését
- [ ] tests — egyik teszt sem lát a következőben felülírt `URL.createObjectURL`/`window.open`-t,
      bukó állítás után sem
- [ ] typecheck/lint
- [ ] docs-check
