# Backlog 68. tétel — PDF előnézet generálás és invalidálási életciklus — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 68. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-052
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D598`–`D606` a redesign saját D1–D606 számozásából valók — NEM azonosak
a `docs/01-attekintes-es-dontesek.md` D-táblájával.

## Probléma

A `PreviewPage.tsx` (`app/src/pages/PreviewPage.tsx`) `usePDF()`-alapú
előnézet-generálása a D598–606 tételes ellenőrzése alapján TÖBBSÉGÉBEN
MÁR MEGFELEL a redesign kívánalmainak — ez a tétel a konkrét, kódban
azonosított RÉSEKET tölti be, nem épít újra egy meglévő, jól működő
mechanizmust.

## Állapotfelmérés pontonként

- **D598 (két PDF-életciklus: draft mindig friss, historical a mentett
  PDF) — MEGVAN.** Két különböző komponensben valósul meg: a
  `PreviewPage.tsx` a draft-ra mindig friss `usePDF()`-fel dolgozik (a
  `tervDocument`-et minden releváns változásra újragenerálja), a
  `components/PatientPlanChains.tsx` `viewVersion`/`downloadVersion` egy
  korábbi, VÉGLEGESÍTETT verzióra a mentett `loadPlanPdf()`-et olvassa,
  SOHA nem generál újra. Ez architekturálisan pontosan D598 szándéka,
  csak két helyen — dokumentálandó, nincs új munka.
- **D599 (hiányzó historical PDF-nél hiba, nincs regenerálás) — MEGVAN.**
  A `viewVersion`/`downloadVersion` mindkettő explicit „Ehhez a verzióhoz
  nincs mentett PDF.” hibaágat futtat `bytes == null`-nál
  (`components/PatientPlanChains.tsx:346-349, 371-374`), nem próbál
  regenerálni.
- **D600 (finalizationkor pontosan a preview-ban látott byte-ok
  mentődnek) — MEGVAN.** A `doFinalize()` közvetlenül a MÁR renderelt
  `pdfInstance.blob`-ot használja (`PreviewPage.tsx:324, 350`), nincs
  külön, „titkos” újragenerálás mentéskor.
- **D601 (Finalize letiltva, amíg a preview stale) — MEGVAN.** A
  `busy = saving || pdfStale` (`pdfStale = pdfInstance.loading`)
  vezérli a „Véglegesítés és mentés” gomb `disabled` állapotát — a
  komment (P0-3) szerint ez már egy múltbeli bugfix eredménye (korábban
  a „Letöltés” a régi, stale PDF-et adta megkülönböztethetetlenül).
- **D603 (auto-generálás belépéskor és minden releváns változásra) —
  MEGVAN.** A `useEffect` dependency-listája (`plan, settings,
  effectiveOfferOnly, nyilatkozatMd, fizetesiFeltetelekMd, garanciaMd,
  toothChartPng, updatePdf`) minden releváns adatváltozásra újrahívja
  `updatePdf(tervDocument)`-et.
- **D605 (loading alatt a régi preview beszürkül, gombok letiltva) —
  MEGVAN.** Az iframe `opacity: pdfStale ? 0.5 : 1`, a „Letöltés” gomb
  helyén stale állapotban egy letiltott „PDF frissítése…” gomb jelenik
  meg.
- **D604/D606 — VALÓDI HIÁNY.** Hiba esetén (`pdfInstance.error`) ma csak
  egy piros `Callout` jelenik meg („A PDF előállítása hibába futott: ...
  A véglegesítés emiatt le van tiltva.”), a Finalize letiltva marad
  (`!!pdfError`) — de NINCS explicit „Újrapróbálás” akció. A doki csak
  akkor kap új generálási kísérletet, ha VÉLETLENÜL módosít valamit a
  tervben (ami újra kiváltja a `useEffect`-et) — ez nem egy szándékos,
  a felhasználó által kezdeményezhető retry-út.

## Döntések

### 1. „Újrapróbálás” gomb a hiba-Callout mellé

A `pdfError` esetén megjelenő piros `Callout` mellé egy „Újrapróbálás”
gomb kerül, ami explicit újra meghívja `updatePdf(tervDocument)`-et
(ugyanazokkal a propokkal, mint amikkel a hiba keletkezett).

**Miért:** D604 explicit ezt kéri — „hiba esetén a felhasználó ugyanazon
képernyőn marad, hiba + Újrapróbálás; Finalize disabled”. A mai
implementáció az első felét (a képernyőn maradás + hibaüzenet + letiltott
Finalize) már teljesíti, csak az explicit retry-akció hiányzik.

### 2. D606 futásidejű ellenőrzést igényel

D606 szerint „ha az újragenerálás hibára fut, a korábbi preview
beszürkítve látható marad; Retry elérhető; Finalize disabled” — vagyis a
hiba NEM tünteti el a korábbi, sikeresen renderelt PDF-et, csak
elhalványítja. Ez a `usePDF()` (`@react-pdf/renderer`) BELSŐ
állapotkezelésén múlik (megőrzi-e a korábbi `pdfInstance.url`-t egy
hibázó frissítés alatt/után, vagy törli). A kódolvasásból ez NEM
dönthető el megbízhatóan — a `PreviewPage.tsx` maga nem kezeli explicit
ezt az esetet (nincs `pdfError`-nál külön `url`-mentés/visszaállítás).

**Döntés:** ez a pont MEGVALÓSÍTÁS UTÁN, futásidejű/böngészős
ellenőrzést igényel (a projekt `browser-validation` skill-jével, ahogy a
`CLAUDE.md` „Böngésző-automatizálás” szakasza előírja) — HA a könyvtár
NEM garantálja a korábbi `url` megőrzését hibán át, a megvalósítónak
explicit React state-et kell bevezetnie a „utolsó sikeres URL” tárolására
és hiba esetén annak visszaeséskénti mutatására. Ez a plan NEM
feltételezi vakon egyik irányt sem.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A checklist UI, ami a `pdfError`-tól FÜGGETLEN, tartalmi validációs
  állapotokat mutatja — 66./67. tétel (DP-050/051).
- A mentés (`doFinalize`) hibakezelésének szétválasztása (durable commit
  vs. best-effort cleanup) — 69. tétel (DP-053); ez egy MÁSIK hibatípus
  (mentési, nem PDF-generálási hiba).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PreviewPage.tsx` — „Újrapróbálás” gomb a `pdfError`
  Callout mellé, `updatePdf(tervDocument)` explicit újrahívása; szükség
  esetén (a D606 ellenőrzés eredményétől függően) egy „utolsó sikeres PDF
  URL” state bevezetése.

## Tesztelés (irányadó, nem kimerítő)

- Egy PDF-render hibát (pl. mesterségesen előidézett, hibás `TervDocument`
  prop) követően a „Újrapróbálás” gomb megjelenik és kattintásra
  újraindítja a generálást.
- A „Véglegesítés és mentés” gomb hibaállapotban letiltva marad.
- **Böngészős ellenőrzés (`browser-validation` skill, kézzel indítva):**
  hibaállapotban a korábban sikeresen renderelt PDF (ha volt) beszürkítve
  látható marad-e, vagy eltűnik — ha eltűnik, a fenti „utolsó sikeres URL”
  state szükséges javításként dokumentálandó a tétel lezárásakor.
- A már meglévő D598/D599/D600/D601/D603/D605 viselkedés regresszió
  nélkül megmarad (auto-generálás, stale-görgetés, historical PDF hibakezelése).
