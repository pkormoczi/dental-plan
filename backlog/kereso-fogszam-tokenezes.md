# kereso-fogszam-tokenezes
Type: feature
Source: doctor-review nagy-terv (2026-09-05), 3. megállapítás
Target: master
Baseline: 8c09a633d4c9c1ace4e9141ed13a4e9be3049828

## Goal
A „18 fogeltávolítás” beírására a doki megkapja a Fogeltávolítás tételt, és a felvett sor Fog
mezőjében ott a 18 — nem egy 0 Ft-os egyedi sor.

## Current state
- `app/src/domain/search.ts` `nevEgyezik` — a TELJES keresőszöveget keresi részsztringként; ez az
  EGYETLEN kétnyelvű keresési szabály, az Árlista admin szűrője (`domain/arlistaSzures.ts`
  `tetelIlleszkedik`) is hívja, tehát nem itt kell tokenezni.
- `app/src/domain/teeth.ts` `parseTeeth` (mindent-vagy-semmit, a belső `FDI` regex nincs exportálva),
  `toggleFog` (a `", "` elválasztó forrása).
- `app/src/pages/planEditor/ItemPicker.tsx` — a `q` → `norm(q)` → `nevEgyezik`/`egyezoKategoriaIdk`
  útvonal, az `opcioSzam` index-tér, a statikus „+N további találat” sor (nem választható minta),
  az `egyediElerheto` pszeudo-opció.
- `app/src/pages/PlanEditorPage.tsx` `addLine` / `addEgyediLine` — `fogak: ''`, `mennyiseg: 1`,
  `mennyisegKezi: false`; a draftba közvetlenül push-ol, NEM a `patchLine`-on át.
- `app/src/pages/planEditor/LineRow.tsx` (147–164) — a soron belüli `ItemPicker`, `onPatch`-en át
  ír, tehát a `domain/mennyiseg.ts` `sorPatchKovetessel` már szinkronizálja a darabszámot.
- `app/src/pages/planEditor/ItemPicker.test.tsx` — a ciklus- és egyedi-opció regressziók helye.

## Approach
- `domain/teeth.ts`: az FDI-token felismerése kifelé is elérhetővé válik (a regex marad egy helyen).
- `domain/search.ts`: új szétválasztó a nyers keresőszövegre → fogszám-tokenek + a maradék névrész;
  a `nevEgyezik` szabálya és szignatúrája VÁLTOZATLAN (az Árlista admin szűrője nem érintett).
- `ItemPicker.tsx`: a szűrés a maradék névrészre fut, a lista tetején statikus „Fog: …” sor,
  és a választás átadja a leválasztott fogszámokat a hívónak (árlistai és egyedi ágon egyaránt).
- `PlanEditorPage.tsx`: `addLine`/`addEgyediLine` a fogszámokat a `fogak` mezőbe írja, a
  `mennyiseg`-et a `kovetettMennyiseg` adja.
- `LineRow.tsx`: a fogszám csak akkor kerül a patchbe, ha a sor `fogak` mezője üres.

NEM tartozik ide: csupa fogszám gépelése (a leválasztás után nem marad névrész) — a mai viselkedés
marad, az a `kereso-fogszam-egyedi-tetel` tétel hatásköre; a törlő X a keresőmezőben (külön tétel);
az Árlista admin szűrője; a fókusz áthelyezése a Fog mezőre.

## Decisions
- Csak érvényes FDI (2 jegyű) token válik le — mert az árlistában egyetlen szám sem érvényes FDI
  („tömés 2 felszín”, „Klipsz 3 fog”, „All-on-4”), 1 jegyűnél viszont lenne ütközés.
- A soron belüli keresőben a fogszám csak ÜRES `fogak` mezőbe íródik — mert a fogtérképi kattintás
  a doki explicit választása; nem írja felül, mert egy elgépelt szám némán elvinné.
- A leválasztás jelzése statikus, nem választható sor — a „+N további találat” mintája; nem
  `opcioSzam`-tag, így a gépel → nyíl → Enter ciklus nem törik el (app/src/CLAUDE.md § Amit soha).
- Az egyedi tétel neve a fogszám nélküli maradék — mert a fogszám a Fog mezőbe kerül, és a
  nevSnapshot a nyomtatványra megy; nem a teljes szöveg, mert az duplázná a fogszámot.
- A felvett sor mennyisége a fogak számát követi (`kovetettMennyiseg`) — mert kézzel beírva is ez
  történne; a sor `mennyisegKezi: false` marad.
- A szétválasztó a `search.ts`-ben, az FDI-teszt a `teeth.ts`-ben — a kereső-szemantika és az
  FDI-tudás külön marad, a regex nem duplikálódik.

## Verification
- [ ] tests — „18 fogeltávolítás” a Fogeltávolítás tételt adja találatként; Enterre a felvett sor
      Fog mezőjében „18”, mennyisége 1; „16 17 korona” → Fog „16, 17”, mennyiség 2; a fogszám nélküli
      keresés és a kétnyelvű egyezés változatlan; az Árlista admin szűrője változatlanul a teljes
      szövegre szűr; a lista tetején megjelenő „Fog: …” sor nem választható (nyíl/Enter nem áll rá);
      nulla találatnál az egyedi tétel neve a fogszám nélküli maradék; a soron belüli keresőben egy
      már kitöltött Fog mező nem íródik felül, üres viszont igen; csupa fogszám gépelése változatlan.
- [ ] typecheck/lint
- [ ] docs-check
