# alertdialog-kezdo-fokusz-cancel-nelkul
Type: bug
Source: /implement-batch futás (2026-09-08) manual-checks keyboard-a11y szelete
Target: master
Baseline: 7b9393c30a22b213cfb0d8228b0650ea6ecdff69

## Goal
A "A piszkozat két helyen változott" ablak megnyitásakor a fókusz az ablakon belülre kerül — a
billentyűzetes doki nem a nyitó elemen marad —, és egyik döntésgomb sem élesedik Enterre.

## Current state
- `app/src/components/PiszkozatKonfliktusDialog.tsx` — az `AlertDialog.Content` két sima
  `Button`-t tart (`onBetoltomMasikat`, `onMegtartomSajat`), `AlertDialog.Cancel`/`Action`
  nélkül; a Radix beépített `onOpenAutoFocus`-a `preventDefault`-ol és egy üres `cancelRef`-re
  fókuszálna, így semmi nem kap fókuszt. A fájl fejléce rögzíti: itt nincs veszteségmentes út.
- A két összefoglaló sor (`Ebben az ablakban:` / `A másik ablakban:`) az
  `AlertDialog.Description` MELLETT áll, nem benne.
- `app/src/components/TervWorkflowShell.tsx` — a hívó; `onOpenChange(false)` = elzárás
  (`setElzartKonfliktus`), a következő tartalmi változás újra felhozza. Az ablak nem
  kattintásra nyílik, hanem háttérbeli írási ütközésre ugrik fel.
- `app/src/components/PiszkozatKonfliktusDialog.test.tsx` — három teszt (összefoglalók, két
  gomb, Escape); nyitó fókuszt nem ellenőriz.
- Precedens: `app/src/pages/patientPage/TorzsadatSyncCard.tsx` `AlertDialog.Cancel`-wrappere és
  `app/src/components/TervWorkflowShell.test.tsx` „nyitáskor a fókusz a dialóguson belülre, a
  másodlagos gombra kerül". A repó 13 további `AlertDialog.Root`-ja mind Cancel-lel (vagy
  Cancel+Action) rendelkezik — ez az egyetlen kivétel.

## Approach
Csak `app/src/components/PiszkozatKonfliktusDialog.tsx` és a saját tesztfájlja változik. Az
`AlertDialog.Content` saját `onOpenAutoFocus`-t kap, ami a Radix üres-`cancelRef` ágát
megkerülve magát a tartalom-elemet fókuszálja; a két összefoglaló sor bekerül a bejelentett
leírásba. A látható elrendezés, a gombfeliratok és sorrendjük, valamint az Escape/elzárás
viselkedése változatlan.

NEM tartozik ide: a sima `Dialog`-ok (azok a tartalmat fókuszálják); az elsődleges gomb
`AlertDialog.Action`-né alakítása (a beépített auto-close elrontaná a hibakezelést,
`UjPaciensDialog.tsx`); a másik 13 AlertDialog; a `TervWorkflowShell` elzárás-logikája.

## Decisions
- A fókusz a tartalom törzsére kerül, nem gombra — mert itt nincs biztonságos alapeset, és az
  ablak hívatlanul, Enter-központú munkamenet (PRODUCT.md § Napi flow 2.) közben ugrik fel: egy
  reflexes Enter így nem dob el munkát. Nem a `TorzsadatSyncCard` Cancel-wrappere, mert ott a
  Cancel valódi „Kihagyás", itt egyik gomb sem „mégse".
- A két összefoglaló sor a bejelentett leírás része lesz — mert törzs-fókusznál a felolvasó a
  leírást mondja be, és a sorszám/végösszeg maga a döntés tárgya. Csak a bejelentés hatóköre
  nő, a látható szöveg nem.
- A fókuszt kézzel adjuk, mert a `preventDefault` a FocusScope automatikus fókuszálását is
  lekapcsolja.

## Verification
- [ ] tests — nyitáskor a fókusz a dialóguson belül van és egyik döntésgomb sem fókuszált; a
      bejelentett leírás mindkét változat sorszámát és végösszegét tartalmazza; a meglévő három
      teszt (összefoglalók, két gomb, Escape) változatlanul megy
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: keyboard-a11y
