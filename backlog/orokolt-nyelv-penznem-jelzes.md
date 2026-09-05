# orokolt-nyelv-penznem-jelzes
Type: feature
Prio: now
Source: docs/reviews/2026-09-05-doctor-review-nemet-euro.md 4. megállapítás
Target: master
Baseline: b6c3430781afbfc51b390fcbc802354b63c1b609

## Goal
„+ Új terv” után a Terv adatai lap semleges jelzést ad, ha a nyelv vagy a pénznem a páciens
legutóbbi véglegesített tervéből öröklődött és eltér a rendelő alapértelmezésétől — az öröklés
maga (szándékos kényelmi funkció) változatlan marad.

## Current state
- `app/src/state/planIndulas.ts` — az öröklési forrás feloldása; ma csak a kész tervet adja
  vissza, az öröklés ténye elveszik.
- `app/src/components/PlanVersionActionDialog.tsx` — az „+ Új terv” útvonal egyetlen hívási
  helye (terv-lánc fa, Új terv lap, páciens üres állapota), innen navigál `/paciens`-re.
- `app/src/state/AppState.tsx` — tranziens jelzésmezők mintája: `frissitettDatum`,
  `orvosFallback`; a piszkozatba töltő, alapállapot és mentés-nyugtázó ágak nullázzák.
- `app/src/pages/PatientPage.tsx` — „Dokumentum nyelve” és „Pénznem” szekció, a két váltási
  útvonal (`applyNyelv`/`applyPenznem`), a meglévő amber figyelmeztető sávok.
- `app/src/domain/beallitasok.ts` — az alapértelmezett pénznem feloldásának egyetlen helye.

## Approach
`planIndulas` visszaadja az öröklés tényét dimenziónként; a dialógus-hook átadja a piszkozatba
töltő lépésnek; `AppState`-ben két tranziens mező (nyelv, pénznem), a meglévő nullázó ágakon.
`PatientPage`: szekciónként egy szürke, info-ikonos `Callout` a szekció alján, csak ha a mező
igaz ÉS az örökölt érték eltér az aktuális alapértelmezéstől (`beallitasok.ts`-en át); az adott
dimenzió tényleges alkalmazása véglegesen nullázza a saját mezőjét.
Nem tartozik ide: „Másolás új tervbe” (saját másolat-eredet jelzése van), „Új verzió” egy láncon,
vadonatúj páciens, a véglegesítés-őr/checklist bővítése, a globális alapértelmezések
szerkesztése, a megerősítő dialógus gombszíne (külön tétel).

## Decisions
- Öröklés marad, csak jelzést kap — mert a visszabontás a német páciensnél két kézi váltást adna
  vissza; nem részleges visszabontás, mert a két dimenzió a valós esetben együtt mozog.
- Dimenziónként külön, a saját szekcióban — mert a vezérlő mellett ül, és külön-külön jelenhet
  meg/tűnhet el; nem közös mondat a szekciók fölött, mert feltételes szövegezést kívánna.
- Csak alapértelmezéstől eltérésnél látszik, élőben kiértékelve — mert egyező értéknél tartalom
  nélküli zaj lenne, ami a valódi figyelmeztetéseket tompítja.
- Tranziens állapotmező, nem derivált összehasonlítás — mert a derivált hazudna kézi váltás után
  és előzmény nélküli páciensnél; nem perzisztált piszkozat-metaadat, mert három réteget
  bővítene egy vizuális emlékeztetőért; a böngésző-újratöltés nem célesete.
- A dimenzió tényleges váltása véglegesen eltünteti (megszakított dialógusnál marad) — mert
  onnantól tudatos választás; nem derivált eltűnés, mert oda-vissza váltásnál villogna.
- Nincs forrás-terv megnevezés és nincs akciógomb — mert a címkéhez plusz tárolóhívás kellene,
  és a chip egy kattintásra van; a jelzés semleges, nem cselekvésre hívó.
- Szürke `Callout`, nem amber — mert az amber a valódi figyelmeztetéseké, és a szekciókban már
  ülnek amber sávok.

## Verification
- [ ] tests — véglegesített Deutsch/EUR előzmény után új lánc: mindkét szekcióban jelzés;
      Deutsch/HUF előzmény: csak nyelvnél; magyar/HUF: sehol; terv nélküli páciens: sehol;
      csak PISZKOZAT előzmény: nincs öröklés, nincs jelzés; nyelv átváltása után a
      nyelv-jelzés eltűnik és visszaváltáskor sem tér vissza, a pénznemé marad; megszakított
      dialógusnál marad; Kezelések ↔ Terv adatai navigáció megőrzi; mentés után új piszkozaton
      nincs maradvány
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css
