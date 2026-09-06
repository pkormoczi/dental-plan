# veglegesites-visszavonhatatlansag-jelzes
Type: feature
Source: doctor-review papirrol (2026-09-05), 7. megállapítás
Target: master
Baseline: ac5c528dc9da9ea537a94685a6c34a1ca0507156

## Goal
Az Előnézeten a „Véglegesítés és mentés” gomb alatt egy állandó sor mondja ki, hogy a lépés
visszavonhatatlan: „Véglegesítés után a terv nem módosítható, csak új változat készíthető.”

## Current state
- `app/src/pages/PreviewPage.tsx` `attemptFinalize` (a szekvenciális megerősítő modal-lánc
  szándékosan megszűnt: a hard tételek a checklisten látszanak, a gomb `disabled`-je zár), és a
  gombsor `Flex`-e („Csak ajánlat” checkbox | „Letöltés” + „Véglegesítés és mentés”) — a gomb
  mellett ma semmilyen magyarázó szöveg nincs, alatta közvetlenül a PDF-iframe.
- `app/src/domain/veglegesitesOr.ts` `veglegesitesDiagnozis` / `vanKemenyBlokk` — a checklist a
  TERV adathiányairól szól, nem a gomb hatásáról.
- `app/src/pages/previewPage/VeglegesitesChecklist.tsx` — `hard`/`soft`/`info` Callout-ok.
- Meglévő halk-szöveg minta ugyanezen az oldalon: a sikerképernyő szürke `Text` sora
  (`app/src/pages/PreviewPage.tsx`).
- `app/src/components/Field.tsx` `FieldGroup` fejléckommentje: `<label>` nem burkolhat gombot,
  elrabolja az accessible name-et.
- Tesztek: `app/src/pages/PreviewPage.test.tsx` „eltérő törzsadatnál info-Callout jelenik meg, de
  a véglegesítés emiatt NEM kér megerősítést”; a fájl `finalizeThroughConfirms` legacy helpere
  (két hívó) ma átfut, mert nincs „Folytatás” gomb.

## Approach
Egyetlen fájl változik: `app/src/pages/PreviewPage.tsx` — a gombsor alá egy állandó, halk sor
kerül, `aria-describedby`-jal a véglegesítés-gombhoz kötve. Nem változik: a `veglegesitesOr`
domain, a checklist-komponens, a gomb felirata és `disabled` feltétele, a `doFinalize` mentési
útja, a sikerképernyő.

Hatókör-határ — NEM tartozik ide: bármilyen megerősítő dialógus, illetve a puha
checklist-tételek „Folytatás”-láncának visszahozása; a gomb átnevezése; görgetés-követés; a
checklist-figyelmeztetések szövegezése (`checklist-figyelmeztetes-szovege`); a sikerképernyő
tartalma (`sikerkepernyo-nyomtatas-letoltes`).

## Decisions
- Állandó, mindig látható sor, nem dialógus — mert a doki még nem használta élesben, nincs adat
  arra, hogy a félrekattintás valós; így a modal-lánc szándékos megszüntetése érintetlen marad, és
  konzisztens a „Sor törlése megerősítés nélkül — arányos, nem lassít” visszajelzéssel. Nem
  feltételes, görgetés-alapú megerősítés, mert rejtett állapottól függő, kiszámíthatatlan kérdés
  lenne, és a PDF az iframe-en belül amúgy sem figyelhető meg.
- A gomb felirata változatlan („Véglegesítés és mentés”) — doki-döntés; a magyarázó sor mondja ki,
  amit a felirat nem, és a felirat ~47 teszt-hivatkozása érintetlen marad.
- A sor NEM checklist-tétel — a `veglegesitesOr` a terv adathiányait diagnosztizálja, a
  visszavonhatatlanság a gomb tulajdonsága; info-Calloutként a PDF fölé, a gombtól messze kerülne.
- `aria-describedby` a gombon, nem `<label>` — a `<label>` elrabolná a gomb accessible name-jét
  (`components/Field.tsx`), így a leírás a névtől külön hangzik el.

## Verification
- [ ] tests — az Előnézeten a véglegesítés-gomb mellett látszik a „nem módosítható, csak új
      változat készíthető” sor, és a gomb accessible description-jében is szerepel; a gombra
      kattintva a terv közbeiktatott kérdés nélkül mentődik (a sikerképernyő jelenik meg)
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — új halk, kisméretű szürke szöveg; a kontraszt jsdom alatt
      nem ellenőrizhető
