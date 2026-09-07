# torzsadat-letrehozas-dialogus-szovege
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 5. megállapítás
Target: master
Baseline: dbfd3a49f92c3a40f388d282c6935bb8d922c011

## Goal
A doki a szerkesztőbe lépéskor felugró ablakot laikus nyelven olvassa („Mentsem a páciens
adatlapjára is?"), látja, mi történik, ha kihagyja, és egy gombnyomással tud igent mondani —
nem kell jelölőnégyzetet keresnie.

## Current state
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` — a lépés-elhagyási `AlertDialog` (cím
  `Törzsadat létrehozása`, leírás „…még nincs önálló törzsadata — a mezők egyelőre a terv
  adataiból látszanak…", `Törzsadat létrehozása most` jelölőnégyzet, `Kihagyás, tovább lépek` /
  `Tovább`). A `confirmLetrehozasPrompt` bepipálatlan négyzetnél `skipLetrehozasPrompt`-ra
  delegál — az elsődleges gomb sem ment. Ugyanitt a lap alji doboz: `Páciens törzsadata` fejléc,
  Callout, `Törzsadat létrehozása a terv adataiból` gomb, két névütközés-figyelmeztetés,
  `{n} mező eltér a páciens törzsadatától`, a két irány-gomb.
- `app/src/components/TorzsadatDiffDialog.tsx` — három cím, két leírás, `Törzsadat mentése`
  primary, `Törzsadat` oszlopfejléc.
- `app/src/components/PatientEditorPanel.tsx` (191, 241) — „…mentéssel önálló, terv-mentéstől
  független törzsadattá válik."
- `app/src/pages/TervReszleteiPage.tsx` (564), `app/src/pages/PatientDetailPage.tsx` (389, 397),
  `app/src/domain/veglegesitesOr.ts` (`torzsadat-elteres` tétel, 447),
  `app/src/domain/paciensAktivitas.ts:63` (`Törzsadat mentve` címke).
- A kihagyás következménye enyhe: `app/src/domain/paciensAdatok.ts` `megjelenitettTorzsadat` a
  legutóbb MENTETT terv `paciens` pillanatképére esik vissza, és a páciens lapján szerkesztve is
  létrejön az adatlap.
- Az ismétlődő felugrás már megoldott: `app/src/components/LepesGuardContext.tsx`
  `letrehozasPromptEldontve`; `app/src/components/TervWorkflowShell.test.tsx` „…kihagyás után nem
  jelenik meg újra oda-vissza navigációnál".
- Sztringre épülő tesztek: `app/src/pages/PatientPage.test.tsx` (556–846),
  `app/src/components/TervWorkflowShell.test.tsx` (304–403),
  `app/src/components/TorzsadatDiffDialog.test.tsx`,
  `app/src/pages/previewPage/VeglegesitesChecklist.test.tsx:84`,
  `app/src/pages/PaciensekPage.test.tsx:84`, `app/src/domain/paciensAktivitas.test.ts:116`,
  `app/src/pages/Home.test.tsx:129`.

## Approach
Csak doki felé látható szöveg és a dialógus gombszerkezete változik. Két rész:
1. A lépés-elhagyási `AlertDialog` átírása (`TorzsadatSyncCard.tsx`): laikus cím és két mondat
   (mi van most, és hogy később a páciens lapján is pótolható); a jelölőnégyzet TÖRLÉSE; két
   gomb — a másodlagos a mai skip-út, az elsődleges ténylegesen ment, majd navigál. Írási
   hibánál a mai viselkedés marad (nyitva marad, újrapróbálható, nincs navigáció).
2. A „törzsadat" szó cseréje „a páciens adatlapjá"-ra MINDEN doki felé látható helyen (a fenti
   hét fájl), plusz a hozzájuk tartozó tesztek.

NEM tartozik ide: JSON-kulcs, fájlnév (`paciens-adatok.json`), `PatientMasterData` típus, az
`AktivitasTipus` `'torzsadat-mentve'` ÉRTÉKE (csak a címkéje), komponens- és symbolnevek,
kódkommentek és teszt-belső szóhasználat; az árlista-admin más jelentésű „törzsadat"-ja; a
`PatientDetailPage` „Páciens adatai" fülének neve; a `TorzsadatDiffDialog` két-gombos
szimmetriája és az üres mező kérdése (`torzsadat-elteres-ures-mezo`); a `veglegesitesOr`
`torzsadat-elteres` tételének súlyossága vagy megléte.

## Decisions
- A kérdés marad a lépésváltásnál — mert ott van a doki figyelme, és az adat frissen beírva;
  nem a véglegesítéshez kötjük, mert a következő terv előtöltése addigra már a régi
  pillanatképből menne.
- „a páciens adatlapja", nem „karton" — mert a páciens lapján ma is „Páciens adatai" fül áll.
- A szócsere minden doki-látta felületre kiterjed, nem csak a dialógusra — mert két szó
  ugyanarra a dologra nem oldja fel a mai zavart.
- A jelölőnégyzet eltűnik, két explicit gomb marad — mert ma az elsődleges gomb is némán kihagy.
- A szöveg nem állít adatvesztést — mert a `megjelenitettTorzsadat` fallbackje miatt nem igaz;
  azt mondja ki, mit nyer a mentéssel és hogy hol pótolható.

## Verification
- [ ] tests — a lépés-elhagyási ablakban az elsődleges gomb EGY kattintással létrehozza az
      adatlapot (`savePatientData` lefut) és továbbnavigál; a másodlagos gomb írás nélkül
      navigál, és a piszkozaton belül nem kérdez újra; a régi sztringekre épülő tesztek az új
      szövegre állnak, és sehol nem marad doki felé látható „törzsadat"
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y — a jelölőnégyzet kiesésével az ablak Tab-sorrendje és
      a kezdő fókusz megváltozik
