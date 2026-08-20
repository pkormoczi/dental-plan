# Backlog 67. tétel — Finalization validation engine — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 67. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-051
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D67`, `D90`, `D103`, `D132`+, `D133`, `D404`, `D525`+, `D537`+, `D576`+,
`C8` a redesign saját D1–D606 számozásából valók — NEM azonosak a
`docs/01-attekintes-es-dontesek.md` D-táblájával.

**Sorrendi kapcsolat:** a 66. tétel (DP-050) ERRE a tételre épül — az
egységes checklist-modellt ez a tétel adja meg.

## Probléma

A mai `veglegesitesOr.ts` `veglegesitesDiagnozis()` (`app/src/domain/
veglegesitesOr.ts`) AD HOC, egymástól eltérő alakú mezőket ad vissza:

- `nameMissing: boolean` — külön mező, a láncon KÍVÜL, KEMÉNY blokk;
- `uresSorok: KitoltetlenSor[]` — külön mező, a láncon KÍVÜL, KEMÉNY blokk;
- `nevProblemak`/`nullaSorok`/`hianyzoLeirasok` — a 4-lépéses PUHA
  `VEGLEGESITES_LEPESEK` lánc tagjai, `alkalmazhato` map-pel vezérelve;
- `masterElteresek: MezoElteres[]` — egy ötödik, INFO-szintű mező, a
  láncon is KÍVÜL.

Nincs egységes, a checklist UI (66. tétel) által egyenletesen
renderelhető lista-alak — a fenti négy „kategória” mind más React
state-mintát és más megjelenítést igényelne, ha ma próbálnánk egy
checklistbe rendezni.

## Döntések

### 1. Egységes checklist-modell

`veglegesitesDiagnozis()` kimenete egy `VeglegesitesCsekklista { tetelek:
CsekklistaTetel[] }` alakra vált, ahol minden tétel:

```
CsekklistaTetel {
  id: string            // stabil kulcs, pl. 'nev-hianyzik', 'kitoltetlen-sor', 'nemet-nev-hianyzik'
  sulyossag: 'hard' | 'soft' | 'info'
  cim: string            // rövid felirat a checklist-soron
  reszletek?: string[]   // opcionális, kibontható részletsorok (érintett sorok nevei stb.)
  szamlalo?: number       // darabszám-jelvény, ha releváns
  route?: '/paciens' | '/terv'   // navigáció célja kattintásra
}
```

Minden MA MEGLÉVŐ ellenőrzés ebbe az egységes alakba kerül, VÁLTOZATLAN
tartalmi logikával — ez a tétel a FORMÁTUMOT, nem a mögöttes szabályokat
írja át. A meglévő domain-függvények (`kitoltetlenSorok`,
`nullaOsszeguSorok`, `hianyzoCsomagLeirasok`, `fallbackSorok`,
`masterSnapshotDiff`) hívása VÁLTOZATLAN marad, csak a hívó oldali
összeállítás/besorolás alakul át.

**Miért:** a 66. tétel checklist UI-ja csak akkor tud egységesen, sor
listaként renderelni, ha a bemenete egységes alakú — a mai négy különböző
mező mind saját speciális rendert igényelne.

**A `masterElteresek` (patient-master diff, backlog-40, D162) explicit
IDE tartozik, checklist-tételként, NEM marad önálló Callout.** Ma a
`PreviewPage.tsx` egy mindig-látható szürke `Callout`-ot mutat, ha
`masterElteresek.length > 0` (`PreviewPage.tsx:516-530`, „Terv adatai”
linkkel) — ez az `VeglegesitesDiagnozis` ötödik, eddig a láncon KÍVÜLI
mezője (lásd fenti Probléma szakasz). Ez a Callout MEGSZŰNIK önálló
elemként; a `masterSnapshotDiff()` eredménye egy `info`-szintű
`CsekklistaTetel`-ként kerül az egységes listába (`route: '/paciens'`,
`cim` a mezők számával, `reszletek` az érintett mezőnevekkel — a mai
Callout-szöveg tartalma, csak checklist-sor alakban).

**Miért nem marad kivétel, mint a technikai Callout-ok:** a 66. tétel 3.
döntése kifejezetten a technikai/infrastrukturális hibákat (sablon
betöltési hiba, PDF-render hiba, mentési hiba) zárja ki a checklistből,
mert azok „nem a DOKUMENTUM tartalmáról szólnak”. A törzsadat-eltérés
ennek pont az ELLENKEZŐJE — a dokumentumba kerülő páciensadatról szól,
tehát a 66. tétel saját hatókör-elve szerint is a checklistbe tartozik,
nem a technikai kivételek közé.

### 2. D133 kemény blokká válik (user-döntés)

**Explicit megkérdezve, megerősítve:** a ma PUHA „de-fallback-names”
lépés (hiányzó/eltérő/egyedi német tételnév, `domain/nev.ts`
`fallbackSorok()`) HARD blockká válik: a doki nem véglegesíthet, amíg
minden látható sornak van terv-specifikus VAGY árlistai német neve. A mai
3-utas bontás (`nincsForditas`/`elterAzArlistatol`/`egyedi`) tartalmilag
megmarad, csak a checklist-tétel `reszletek`-jeként jelenik meg (a mai
`nevListaSzoveg()`-hez hasonló, három külön felsorolású szöveg), „Folytatás”
gomb nélkül — a doki csak akkor véglegesíthet, ha a hiba elhárult.

**Miért:** D133 explicit ezt kéri ("finalization előtt kötelező
terv-specifikus DE név"), és a redesign-döntési napló „Explicit későbbi
pontosítások/felülírások” listája (`02_...md` § 19) NEM tartalmaz D133-at
felülíró későbbi döntést — ez a redesign-interjú végleges, szándékos
állásfoglalása, annak ellenére, hogy ellentmond a jelenlegi, dokumentált
PUHA viselkedésnek. A user a kérdés feltevésekor ezt a redesign-irányt
erősítette meg, a mai spec-cel szembeni ellentmondás tudatában.

**Dokumentáció-hatás a tétel lezárásakor:** a
`docs/03-funkcionalis-spec.md` § 4 „Előnézet és véglegesítés” jelenlegi
„Német terv, hiányzó/eltérő/egyedi tételnevekkel: ... a véglegesítés
megerősítést kér” + „ez a figyelmeztetés soha nem néma” szövege KEMÉNY
BLOKK leírásra módosul.

### 3. D404 — új hard block: hiányzó német kategórianév

Ha a terv nyelve `de`, és a fogtérkép-legendán ténylegesen megjelenő
kategóriának (lásd `buildToothVisualStates`/`kategoriaVizual`,
`app/src/domain/toothVisual.ts` + `app/src/design/treatmentVisuals.ts`)
nincs `nev.de`-je, ez is HARD block — a doki nem véglegesíthet, amíg a
hiányzó kategórianevet meg nem adja (Kezelések és árak → Kategóriák).

**Miért:** D404 explicit ezt kéri, ugyanazzal az indoklással, mint a
tételnév-hard-block (D133/C8 mintája): a nyomtatvány legendáján egy
lefordítatlan (magyar) kategórianév egy német nyelvű, aláírandó
dokumentumon jogilag/kommunikációsan nem elfogadható.

**A D405 (admin oldali, halvány, NEM blokkoló jelzés a Kategóriák
panelen) KIMARAD ebből a tételből** — az a jövőbeli, még nem kidolgozott
„Kategóriakezelés” admin-tételhez tartozik (`03_...md` § 11.3, DP-081),
nem a finalization-engine-hez. Ellenőriztem: ma a Kategóriák panel
(`PriceListAdminPage.tsx` `KategoriaEditor`) csak a KINYITOTT sor
szerkesztőjében jelzi a hiányzó német nevet (`placeholder="még nincs
megadva"`), a becsukott táblázat-sorban semmilyen jelzés nincs — ez a
hiány VÁLTOZATLAN marad ebben a tételben.

### 4. D103 — új hard block: üres fázis

**A backlog-58 (DP-041) tervének 8. döntése tévesen állította, hogy ez MÁR
MEGVAN a mai kódban — ellenőrizve: NINCS.** A `kitoltetlenSorok()`
(`domain/kitoltetlen.ts`) csak a NÉVTELEN SOROKAT fogja meg; egy 0 soros
fázis semmit nem blokkol finalizáláskor, és a nyomtatványra is kikerül
üres fejlécként (`pdf/TervDocument.tsx` a `fazisok` tömböt feltétel
nélkül végigrendereli). A backlog-58 (58. tétel — Kezelési fázisok
kezelése) tervdokumentuma ezt a hézagot ide, ehhez a tételhez utalta,
mert a valódi javítás (navigálható HARD blokk) ide illik, nem a
fázis-UI-hoz.

Ez a tétel egy új `uresFazisok(plan)` segédfüggvényt vezet be
(`domain/kitoltetlen.ts`, a `kitoltetlenSorok()`/`nullaOsszeguSorok()`
mintáján), ami a 0 soros fázisokat sorolja fel; a
`veglegesitesDiagnozis()` ezt HARD blokként veszi fel az egységes
`CsekklistaTetel`-listába, `route: '/terv'` navigációval a hiányzó
fázishoz.

**Miért:** D103 explicit finalizationt blokkoló hard blockot kér egy
üres fázisra — ez adatvédelmi/jogi kockázat nem, de kommunikációs hiba
lenne (üres fejléc a papíron), amit a doki könnyen észrevétlenül
hagyhat, ha a fázist tesztelés közben kiürítette (pl. minden sorát
áthelyezte máshova), majd elfelejtette törölni.

### 5. Már MEGVAN, csak dokumentálva — nincs új munka

- **D67** — „hiányzó kötelező business config a finalizationt blokkolja,
  a szerkesztést nem” — ez már ma is érvényesülő elv (a `nameMissing`
  csak a mentés/le­tölt­és fájlnevéhez kötelező, a szerkesztést sosem
  akadályozza).
- **D90** — „rossz nyelvű egyedi szöveg finalizationkor soft warning” —
  ez a 65. tétel (DP-048, nyelvi review) SAJÁT hatóköre
  (`authoredInLanguage`/`reviewedForLanguage`), NEM duplikáljuk itt; amikor
  a 65. tétel megvalósul, a saját checklist-tételét ugyanebbe az egységes
  `CsekklistaTetel`-modellbe kell bekötnie.
- **D525+/D537+** — deposit>final hard block (64. tétel, DP-047),
  hiányzó/inaktív orvos hard block (53. tétel, DP-032) — ezek SAJÁT,
  már megtervezett döntések; ez a tétel csak megjegyzi: amikor
  megvalósulnak, ugyanebbe az egységes modellbe kell őket bekötni, NEM
  külön UI-t nyitni nekik.
- **D576+** — hiányzó fizetési feltételek/garancia soft warning — MÁR
  MEGVAN (`sablonFallback` union boolean → amber `Callout`), bár ma nem a
  checklist részeként, hanem önálló, mindig látható sávként; ennek
  átvétele a checklistbe SZINTÉN e tétel hatóköre (info/soft-szintű
  tételként).
- **C8 (placeholder-őr)** — MEGVAN, a tartalmi szabály (üres/whitespace
  vagy `[PLACEHOLDER`/`[PLATZHALTER`) VÁLTOZATLAN
  (`domain/templates.ts` `isPlaceholderTemplate`); ez a tétel csak a
  REPREZENTÁCIÓJÁT alakítja `CsekklistaTetel`-lé, a mai piros
  `Callout`+letiltott checkbox JOGI zára (D23) érintetlen marad — az a 4.
  oldal renderjéhez tartozik, nem ehhez a checklist-modellhez (lásd a
  meglévő `veglegesitesOr.ts` fejléckomment megkülönböztetését).

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- D404 admin-oldali (Kategóriák panel) nonblocking jelzése (D405) —
  jövőbeli Kategóriakezelés-tétel (DP-081).
- Az 53./62./63./64./65. tételek saját validációs TARTALMA (orvos,
  offered ár, egyedi végösszeg, előleg, nyelvi review) — ez a tétel csak
  a BEFOGADÓ modellt adja nekik, nem valósítja meg a saját check-jeiket.
- A checklist UI megjelenítése/layoutja — 66. tétel (DP-050).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/veglegesitesOr.ts` — a `VeglegesitesDiagnozis`
  típus/visszatérési alak `VeglegesitesCsekklista`-ra cserélése; a
  `VEGLEGESITES_LEPESEK`/`kovetkezoLepes` szekvenciális-lánc logika
  eltávolítása (a 66. tétel döntése szerint nincs többé modal-lánc, a
  sorrend a checklist RENDER-sorrendje lesz, nem egy bejárt állapotgép);
  a D133 hard blockká emelése; a D404 új check hozzáadása (a legendán
  látszó kategóriák meghatározásához `buildToothVisualStates` hívása); a
  D103 új check hozzáadása (`uresFazisok()` hívása).
- `app/src/domain/kitoltetlen.ts` — új `uresFazisok(plan)` export, a
  `kitoltetlenSorok()`/`nullaOsszeguSorok()` mintáján.
- `app/src/domain/nev.ts` — `fallbackSorok()` maga VÁLTOZATLAN, csak a
  hívó oldali (veglegesitesOr.ts) súlyosság-besorolás vált puha→kemény.
- `app/src/pages/PreviewPage.tsx` — a `confirmStepTartalom`/
  `nevListaSzoveg` szövegező logika átkerül a checklist-tétel
  `reszletek`-jébe (66. tétel scope-ja hajtja végre, de a szöveg-tartalom
  forrása ez a tétel); a `masterElteresek.length > 0`-nál megjelenő
  önálló szürke `Callout` (sor 516-530) megszűnik, tartalma az `info`-
  szintű checklist-tételbe költözik (lásd 1. döntés).

## Tesztelés (irányadó, nem kimerítő)

- `veglegesitesDiagnozis()` egységes `CsekklistaTetel[]`-t ad vissza,
  minden mai ellenőrzés (névhiány, kitöltetlen sor, 0 Ft-os sor, hiányzó
  csomag-leírás, törzsadat-eltérés, placeholder-őr) megjelenik benne a
  megfelelő súlyossággal.
- Egy hiányzó/eltérő német tételnév HARD blokkot ad (nem lehet
  véglegesíteni), a `reszletek` a 3-utas bontást mutatja.
- Egy német tervben egy, a fogtérképen ténylegesen látszó, DE név nélküli
  kategória HARD blokkot ad; egy NEM látszó (a tervben nem használt)
  kategória hiányzó DE neve NEM blokkol.
- Egy magyar tervben a hiányzó DE kategórianév-check nem fut (nem
  releváns nyelven nincs hard block).
- Egy 0 soros fázissal rendelkező terv HARD blokkot ad (nem lehet
  véglegesíteni); a fázis sorral rendelkezővé válása után a blokk eltűnik.
- A `hianyzoCsomagLeirasok`/`nullaOsszeguSorok`/`masterSnapshotDiff`
  eredményei VÁLTOZATLAN tartalommal jelennek meg, csak új alakban.
