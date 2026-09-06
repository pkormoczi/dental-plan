# ket-ful-piszkozat-utolso-iro-nyer
Type: bug
Source: 2026-09-05 doctor-review (első megnyitás) 14. megállapítás
Target: master
Baseline: 7566ed6dcc2f42865589f5c483f04aaba728d76d

## Goal
Ha a doki két fülön szerkeszti ugyanazt a piszkozatot, egyik fülön felvett sor sem tűnik el
csendben: a másik fül írása utáni első tartalmi változásnál a doki dönti el, melyik változat
marad.

## Current state
- `app/src/state/AppState.tsx` írási effektus: minden tartalmi `plan`-változásra azonnal
  `drafts.save(plan, piszkozatMeta)`, debounce nélkül, a tárolt rekord ellenőrzése nélkül —
  az utolsó író nyer. Az utoljára kiírt rekordot az `irtPiszkozatRef` tartja (plan + meta,
  időbélyeg nélkül), a `mentve`-t a `piszkozatMentve` state.
- `app/src/state/AppState.tsx` restore ág (a `drafts.load()` körüli try): ez a minta állítja
  vissza a `plan`-t, a metát és a `piszkozatMentve`-t egy rekordból — a „másik fül változatát
  betöltöm" ág ezt használja újra.
- `app/src/storage/DraftStorage.ts`: a mentés feltétel nélkül ír; a `DraftRecord.mentve` ISO
  időbélyeg már ma is körbejár (`app/src/storage/DemoDraftStorage.ts`).
- `app/src/pages/planEditor/PlanEditorHeader.tsx` „Piszkozat mentve HH:MM", és a
  `piszkozatHiba` Callout (`app/src/pages/PlanEditorPage.tsx`) — a mentési hiba meglévő útja.
- `app/src/components/DiscardChangesDialog.tsx`: a megosztott `AlertDialog`-minta és a
  `visszaFokuszRef` gotcha; a fejléckommentje kimondja, hogy a piszkozat-felülírás őreit
  szándékosan NEM ez fedi.
- Tesztek: `app/src/storage/DemoDraftStorage.test.ts`, `app/src/state/AppState.test.tsx`.

## Approach
- `storage/DraftStorage.ts` + `DemoDraftStorage.ts`: a mentés megkapja, milyen tárolt
  állapotra számít a hívó; ha a tárolt rekord ettől eltér, nem ír, hanem megkülönböztethető
  konfliktust jelez, a tárolt rekorddal együtt. A tároló-hozzáférés a határon belül marad.
- `state/AppState.tsx`: az írási effektus továbbadja az elvárt állapotot; konfliktusnál nem
  ír, hanem konfliktus-állapotot tesz közzé (a két változat és a két feloldó akció).
- Új, megosztott dialógus-komponens az `app/src/components/` alatt, a `DiscardChangesDialog`
  stílusmintájára (nem annak bővítése — ott mindkét gomb akció, nincs biztonságos alapeset).
  A `components/TervWorkflowShell.tsx`-ben él, hogy mindhárom lépésen megjelenjen.
- `planEditor/PlanEditorHeader.tsx`: feloldatlan konfliktus alatt a „Piszkozat mentve"
  felirat helyén a nem-mentett állapot jelzése.
- NEM tartozik ide: a tartósan félretett tervek (`tobb-felretett-terv`); az új terv
  indításakor felülírt piszkozat (`uj-terv-kiemelt-elso-sor` kizárt scope-ja); a
  véglegesítés útja — feloldatlan konfliktus mellett is a doki által LÁTOTT terv kerül ki,
  és a véglegesítés a szokott módon törli a piszkozatot; élő `storage`-esemény alapú szinkron.

## Decisions
- Ütközés-ellenőrzés, nem `storage`-esemény alapú élő szinkron — mert az autosave minden
  változásra ír, így az esemény csak láthatóvá tenné a már megtörtént veszteséget; az
  ellenőrzés megelőzi. Nem egy-írós zár: ahhoz heartbeat kell, és egy összeomlott fül bent
  hagyná a zárat.
- Az elvárt állapot azonosítója a meglévő `DraftRecord.mentve` — mert már körbejár és a
  `piszkozatMentve` state-ben is ott van, így nem kell új mező és `schemaVersion`-emelés;
  nem külön számláló, mert az a rekord sémáját bontaná.
- Azonos tartalmú idegen írás nem kérdez: a konfliktus feltétele, hogy a tárolt terv
  tartalma is eltérjen attól, amit ez a fül utoljára kiírt — egy puszta metaadat-írás miatt
  felugró dialógus zaj lenne.
- A dialógus Escape-pel zárható (`app/src/CLAUDE.md` akadálymentesség: „Escape zár"), de a
  piszkozat ilyenkor mentetlen marad, a fejléc ezt kiírja, és a következő tartalmi változás
  újra felhozza — se néma elnyelés, se bezárhatatlan csapda.
- A dialógus mindkét változatról kiírja a sorszámot és a végösszeget — két időbélyeg között a
  doki nem tud dönteni, két összeg között igen.

## Verification
- [ ] tests — a repró (két író ugyanazon a tárolón): a másik fül írása után az első fül
      következő tartalmi változása NEM ír felül, hanem konfliktust jelez; „a saját verziómat
      mentem" után a tárolt piszkozat az első fülé, és a következő változás már kérdés nélkül
      ment; „a másik fül változatát betöltöm" után a szerkesztő a másik fül tervét mutatja (a
      fogkő sorral) és nem ír vissza; azonos tartalmú idegen írás nem hoz fel dialógust;
      feloldatlan konfliktusnál a fejléc nem mutat „Piszkozat mentve" feliratot
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
