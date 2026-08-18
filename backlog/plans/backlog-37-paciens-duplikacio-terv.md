# Backlog 37. tétel — Páciens-duplikáció felismerés és feloldás — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 37. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-013
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D16`/`D201`/`D208`/`D229`–`D232` a redesign saját D1–D606 számozásából
valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával.

**Függőség:** a 36. tétel (DP-012) alapozza meg a quick-create dialógus
"Ezt a páciens használom" akcióját, amit ez a tétel a valódi, intelligens
detektálással lát el. Ez a tétel a MEGLÉVŐ, gyenge (név-egyezés-only)
detektálást váltja fel/bővíti ki, nem egy párhuzamos mechanizmust épít.

## Probléma

A duplikáció-felismerés MA kizárólag egy helyen létezik, és rendkívül
szűk: `UjPaciensDialog.tsx:51` — pontos, ékezet-/kis-nagybetű-független
NÉV-egyezés (`norm(p.nev) === norm(nevTrim)`), tisztán informatív szöveg,
semmilyen akció, semmilyen DOB/telefon figyelembevétel. Sehol máshol
(mentéskor, páciens-szerkesztéskor) nincs duplikáció-ellenőrzés — a
`DemoStorage.createPatient()` és a `doSavePlan()` feltétel nélkül ír.

**Architekturális korlát, amit a döntéseknek figyelembe kell venniük:**
a `listPatients()` (a lista-nézetek olcsó adatforrása) csak
`{dirName, paciensId, nev}`-et ad — **DOB és telefon NEM elérhető olcsón**
minden páciensre; ezekhez páciensenként külön `loadPatientData()` hívás
kellene (vagy a hozzá tartozó terv-pillanatkép fallback-je), ami N
pácienst végigfuttatva drága lenne minden begépelt karakterre.

## Döntések

### 1. Kétfázisú detektálás: olcsó név-szűrés, majd szűk kör DOB/telefon-megerősítés

Első fázis: a MEGLÉVŐ `listPatients()`-ből, `norm()`-alapú név-egyezéssel
(pontos ÉS "hasonló" — pl. közös prefix vagy szóhatáron belüli egyezés,
az implementáló választása szerinti egyszerű heurisztika, NEM
Levenshtein/fuzzy-matching) szűkíti a jelölteket. Második fázis: CSAK az
így kapott, legfeljebb néhány jelöltre (a 2. döntés szerinti max 3
megjelenítési korláttal összhangban) tölti be a DOB/telefont
(`loadPatientData()` vagy a fallback-lánc), és csak akkor emeli
"duplikáció-gyanús"-ra a találatot, ha a DOB vagy a telefon is egyezik
VAGY az egyik hiányzik (nem mond ellent).

**Miért:** ez oldja fel a Probléma szakaszban leírt architekturális
korlátot — a drága DOB/telefon-betöltés csak egy MÁR SZŰK jelölt-körre
fut, nem minden páciensre. **Elvetett alternatíva:** a `paciens.json`
(index-fájl) bővítése DOB/telefon mezővel a gyors elérés kedvéért —
elvetve, mert ez sértené a `docs/01` D29 ("`paciens.json` kizárólag
azonosító-/kereső-index") szellemét jóval erősebben, mint a 34. tétel
(DP-010) `utolsoAktivitas` mezője: itt valódi, denormalizált SZEMÉLYES
adat kerülne egy tisztán index-fájlba, ami már system-of-record-szagú
duplikáció lenne, nem szervezési metaadat.

### 2. Max 3 javaslat + "továbbiak" bővítés

A megjelenő javaslat-lista legfeljebb 3 elemet mutat alapból, egy
"+N további" kibontással, ha több jelölt is van (D230).

**Miért:** D230 explicit ezt a korlátot írja elő — egy hosszú, azonnal
megjelenő lista inkább zavarná, mint segítené a döntést.

### 3. Duplikáció-ellenőrzés mentéskor is, nem csak gépelés közben

A quick-create ÉS a full-create (39. tétel/DP-015) mentés-gombja is
lefuttatja az 1. döntés szerinti kétfázisú ellenőrzést a végleges
adatokon, KÖZVETLENÜL a tényleges írás előtt — nem csak inline, gépelés
közben.

**Miért:** D201/D208 explicit ezt kéri — egy inline jelzést a doki
figyelmen kívül hagyhat vagy a mező módosítása után elavulhat; a
save-time ellenőrzés az utolsó, tényleges védelmi pont.

### 4. Eltérő adatoknál kiválasztáskor megerősítés

Ha a doki egy javasolt "ez talán ugyanaz a páciens" találatot választ, de
a begépelt és a meglévő adatok (DOB/telefon) ELTÉRNEK egymástól (nem csak
hiányoznak), egy megerősítő dialógus jelenik meg a konkrét eltérésekkel,
mielőtt a flow a meglévő páciensre folytatódna (D231).

**Miért:** D231 explicit ezt kéri — egy csendes "biztosan ez"-választás
kockázatos lenne, ha a két adat tényleg ELLENTMOND egymásnak (nem csak
az egyik oldalon hiányzik), mert az növelheti a téves-összevonás esélyét.

### 5. `Mégis új páciens létrehozása` — explicit megerősítő dialóggal

Ha a doki a javaslatok ellenére új rekordot akar létrehozni, egy külön,
explicit "Mégis új páciens létrehozása" akció + megerősítő dialógus
szükséges (D232) — ez zárja a duplikáció-jelzés útját, nem egy sima
"mégse"/bezárás.

**Miért:** D232 explicit ezt kéri; egy sima bezárás gomb nem
kommunikálná elég erősen, hogy a doki tudatosan felülírja a rendszer
figyelmeztetését.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A quick-create dialógus alapvető mezői és az "Ezt a páciens használom"
  akció maga (a felület, amibe ez a tétel a valódi detektálást beépíti)
  — 36. tétel (DP-012).
- A full-create form validációi (D194–D200) — 39. tétel (DP-015); ez a
  tétel csak a duplikáció-ellenőrzést köti be a mentés-gombjába (3.
  döntés).
- Fuzzy/elgépelés-toleráns névillesztés — a projekt korábban (a
  `BACKLOG.md` "EGYÉB ötletek" szakaszában, árlista-kontextusban) már
  elvetette ezt a megközelítést más adatra; ez a tétel egyszerű
  prefix/tartalmaz-alapú heurisztikát használ (1. döntés), nem
  Levenshtein-távolságot.

## Érintett helyek (tájékoztató, nem kimerítő)

- Új `app/src/domain/paciensDuplikacio.ts` (vagy hasonló) — a kétfázisú
  detektálás tiszta domain-logikája (1. döntés).
- `app/src/pages/paciensek/UjPaciensDialog.tsx` — a 36. tétel "Ezt a
  páciens használom" akciójának valódi detektálással ellátása,
  javaslat-lista UI (2. döntés).
- `app/src/pages/PaciensekPage.tsx` `PatientEditor` mentés-útja — a 3.
  döntés szerinti save-time ellenőrzés bekötése (39. tétel `PatientEditor`
  átalakításával összhangban).
- Új megerősítő dialógusok (4–5. döntés) — az eltérő-adat és a "mégis új"
  eset.

## Tesztelés (irányadó, nem kimerítő)

- Hasonló nevű, de eltérő DOB/telefonú páciensek NEM jelennek meg
  duplikáció-gyanúsként (a DOB/telefon "ellentmond", nem csak hiányzik).
- Hasonló nevű, egyező vagy hiányzó DOB/telefonú páciensek megjelennek,
  max 3 elem + "+N további" kibontással.
- Mentéskor (nem csak gépelés közben) is lefut az ellenőrzés.
- Eltérő adatú javaslat kiválasztásakor megerősítő dialógus jelenik meg.
- "Mégis új páciens létrehozása" saját megerősítő dialógust nyit, és
  utána tényleg új rekordot hoz létre.
