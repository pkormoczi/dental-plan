# Backlog 94. tétel — Másolás új tervbe: páciens-identitás védőháló — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 94. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A "Másolás új tervbe" (és általánosabban minden olyan piszkozat, ami egy
MÁR LÉTEZŐ páciensmappához kötődik — új verzió nyitása, gyorsfelvétel
utáni folytatás) a `paciensId`-t/páciensmappát a piszkozat létrejöttekor
rögzíti (D26/D57), a Terv adatai lap Név mezője viszont egy szabadon
szerkeszthető szövegmező, amit semmi nem vet össze a MEGLÉVŐ páciensekkel.
Ha a doki ide egy MÁSIK, ténylegesen létező páciens nevét írja be
(elgépelés, összekeverés, vagy tudatos, de téves feltételezés, hogy ezzel
átirányítja a tervet), a mentett dokumentum a KÖTÖTT (forrás) páciens
mappájában, annak azonosító adataival (telefon, e-mail, lakcím, TAJ), de a
beírt, IDEGEN névvel jön létre — ez GDPR 9. cikk szerinti különleges adatot
érintő, aláírásra kész dokumentumon jelentkező azonosítási kollízió. Ma az
egyetlen jelzés egy INFO-szintű, nem blokkoló `torzsadat-elteres`
checklist-tétel (D48/D76 szerint szándékosan ilyen az ÁLTALÁNOS
mezőeltérésekre) — ami erre a specifikus esetre nem elég, sőt a "Törzsadat
frissítése a tervből" gomb a hibás nevet vissza is írhatja a kötött páciens
mesterrekordjába. Reprodukció:
`docs/reviews/2026-09-01-doctor-review-visszatero-paciens.md` 1.
megállapítás.

## Döntések

### 1. Hatókör: a Terv adatai Név mezője, minden induló-piszkozat úton

A védelem nem csak a "Másolás új tervbe" akcióra vonatkozik, hanem
ÁLTALÁNOSAN a Terv adatai lap Név mezőjére, minden olyan piszkozatnál,
aminek MÁR van feloldható páciensmappája (`feloldPatientDir()` nem ad
`null`-t) — ez lefedi a másolást, egy meglévő terv új verzióra nyitását, és
egy gyorsfelvétel utáni folytatást is, mert mindhárom út ugyanazt a
`paciensId`/`piszkozatPatientDir` kötést hozza létre, mielőtt a Terv adatai
lap megjelenne.

**Miért:** a jelentett tünet a másolási útról derült ki, de a mögöttes
kockázat (kötött azonosító + szabadon szerkeszthető Név mező) szerkezetileg
azonos minden ilyen úton — egy csak a másolásra szabott javítás a pontosan
ugyanezt a kockázatot hordozó "Új verzió" útvonalon védtelenül hagyná a
dokit. Elvetett alternatíva: a védelmet a `PlanVersionActionDialog`/
`planMasolatKent()` szintjén, a másolás pillanatában egyszeri
ellenőrzésként beépíteni — ez azonban csak a MÁSOLÁSKOR meglévő nevet
nézné, a doki UTÁNA, a Terv adatai lapon történő átírását nem védené, ami
éppen a bejelentett eset.

### 2. Az ütközés-detekció alapja és szigorúsága

A meglévő `domain/paciensDuplikacio.ts` `nevJeloltek(patients, nev,
{ kihagyottPaciensId })` hívása újrahasznosítandó: a `kihagyottPaciensId`
a piszkozathoz kötött `paciensId`, így a kötött páciens saját neve sosem üt
vissza magára. Az ütközés-jelzés KIZÁRÓLAG a `nev-pontos` (teljes
névegyezés) találatra fut — a `nev-hasonlo` (részleges/token-alapú
hasonlóság) NEM váltja ki sem a figyelmeztetést, sem a checklist-tételt,
sem a master-írás tiltását.

**Miért:** a bejelentett katasztrofális eset egy PONTOS, valós másik
páciensre illő névtalálat volt — ez adja a legalacsonyabb false-positive
arányú, egyértelmű jelzést. Elvetett alternatíva: a `nev-hasonlo` bevonása
is — szélesebb védelmet adna, de a HARD blokk (5. döntés) és a master-írás
tiltása (6. döntés) miatt túl sok legitim, csak hasonló hangzású, de
valóban különböző nevű esetnél állítaná meg a munkát.

### 3. Figyelmeztetés a Név mezőnél — szerkesztés közben

Amikor a Név mező tartalma `nev-pontos` egyezést ad egy MÁSIK páciensre, a
Terv adatai lapon egy önálló figyelmeztető szöveg jelenik meg, VÁLTÁS-akció
(pl. "Ezt a pácienst választom") NÉLKÜL — pusztán tudatosítja a kollíziót,
nem kínál gombot a piszkozat kötésének átirányítására.

**Miért:** a piszkozat útközbeni páciens-váltása (a kötött `paciensId`
lecserélése egy másikra, a többi mező — telefon, cím stb. — megfelelő
frissítésével együtt) egy jelentősen nagyobb, önálló funkció lenne, ami
ezen a tételen kívül esik. Elvetett alternatíva: a meglévő
`DuplikacioJavaslatok` (`pages/paciensek/`) minta újrahasznosítása — ez
vizuálisan konzisztens lenne a gyorsfelvétel-dialógussal, de a komponens
jelenlegi rendeltetése kifejezetten egyetlen hívóra (`UjPaciensDialog`)
szól, és a "választás" akciója itt pont azt sugallná, amit a tétel
explicit nem akar megengedni.

### 4. A kötött páciens-rekord látható jelzése

A Terv adatai lapon MINDIG megjelenik egy semleges, nem szerkeszthető
jelzés arról, melyik páciensmappához/rekordhoz kötődik a piszkozat, amikor
van feloldható páciensmappa (`feloldPatientDir()` nem ad `null`-t) —
másolás, új verzió és gyorsfelvétel utáni folytatás esetén egyaránt. Egy
vadonatúj, még sehova nem kötött piszkozatnál ez a jelzés nem jelenik meg.

**Miért:** ez önmagában megelőzi a "melyik páciensre mentődik ez valójában"
bizonytalanságot, még mielőtt bármilyen névütközés történne — a doki a Név
mező szerkesztése ELŐTT is látja a tényleges kötést. Ez a jelzés a 3.
döntés figyelmeztetésétől FÜGGETLEN, semleges elem (nem csak ütközés
esetén jelenik meg).

### 5. Új, önálló HARD checklist-tétel véglegesítéskor

A `domain/veglegesitesOr.ts`-ben egy ÚJ, `hard` súlyosságú checklist-tétel
jön létre erre a specifikus esetre (Név mező `nev-pontos` egyezése egy
másik páciensre), KÜLÖN a meglévő, D48/D76 szerint szándékosan
`info`-szintű `torzsadat-elteres` tételtől. A "Véglegesítés és mentés"
gomb ettől a tételtől — a `vanKemenyBlokk()` meglévő mechanizmusán
keresztül — letiltásra kerül, amíg az ütközés fennáll.

**Miért:** a `torzsadat-elteres` tétel egy ÁLTALÁNOS mezőeltérésről szól
(pl. egy elavult telefonszám), aminek szándékosan nem kell blokkolnia
(D48/D76) — ez a tétel egy minőségileg más, azonosítási kollízió, amit a
jelentés "Kritikus/GDPR" súlyosságúnak minősített. Egy külön tétel
bevezetése nem érinti, nem lazítja és nem szigorítja a D48/D76 döntést.
Elvetett alternatíva: a meglévő `torzsadat-elteres` tételt súlyosabbá
tenni ERRE az esetre (feltételes súlyosság) — elvetve, mert ez a meglévő
tétel szemantikáját (mindig `info`) törné meg, és nehezebben olvasható/
tesztelhető lenne, mint egy önálló tétel.

### 6. A "Törzsadat frissítése a tervből" gomb védelme

A `pages/patientPage/TorzsadatSyncCard.tsx` "Törzsadat frissítése a
tervből" gombja LETILTÁSRA kerül, amíg a Név mező `nev-pontos` egyezést ad
egy másik páciensre — ugyanazt a detekciót használva, mint a 3./5. döntés.

**Miért:** enélkül ez a gomb — akár a Terv adatai lapon megjelenő
figyelmeztetés MELLETT is — egy kattintással véglegesen átírná a kötött
páciens mesterrekordjának nevét egy másik, létező páciens nevére, még a
véglegesítés HARD blokkja előtt. A letiltás (nem pedig egy külön, erősebb
megerősítő dialógus) konzisztens az 5. döntés HARD blokkjával: a doki nem
"vihet át" egy műveletet a kollízió tudatában, előbb a Név mezőt kell
helyesbítenie. Elvetett alternatíva: külön, hangsúlyosabb megerősítő
dialógus a gombon — elvetve, mert pont azt engedné meg, amit a tétel
megelőzni akar.

### 7. Breadcrumb felirat/link szétcsúszásának javítása

A `components/TervWorkflowShell.tsx` breadcrumb-je — ami másolás után a
feliratát a Név mezőből veszi, a célját (`href`) viszont a másoláskor
rögzített `piszkozatPatientDir`-ből építi, így a kettő szétcsúszhat — ebben
a tételben kerül összhangba: a breadcrumb célja mindig a ténylegesen kötött
páciensmappára mutasson, függetlenül attól, mit ír a doki a Név mezőbe.

**Miért:** ugyanannak a jelenségnek (a felületen látszó név és a mögötte
álló rekord szétválása) egy másik megnyilvánulása, mint a fő probléma —
ugyanabban a körben érdemes együtt látni és javítani, nem egy külön, apró
bugfix-tételként elszigetelni.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A piszkozat útközbeni páciens-váltása** (a kötött `paciensId`/
  páciensmappa tudatos lecserélése egy másik, létező páciensre, a többi
  mező megfelelő frissítésével) — külön, nagyobb funkció, nem ennek a
  tételnek a része (lásd 3. döntés).
- **A duplikáció-jelölt chip tartalma** (`pages/paciensek/
  DuplikacioJavaslatok.tsx` — csak minőségi indoklást ír ki, sosem a
  tényleges születési dátumot/telefonszámot) — ez a `backlog/BACKLOG.md`
  107. tétele, önálló hatókörrel.
- **A `torzsadat-elteres` (D48/D76) általános, INFO-szintű mezőeltérés-
  jelzés** — VÁLTOZATLAN marad; ez a tétel egy ÚJ, önálló tételt vezet be
  mellette, nem módosítja.
- **A `nev-hasonlo` (részleges/hasonló) névegyezés alapú blokkolás** — nem
  cél ebben a tételben (lásd 2. döntés).
- **D26/D57 (`paciensId` átvitele másoláskor) és D42 (duplikáció-
  felismerés nem blokkoló jellege)** — egyik döntés sem változik; ez a
  tétel egy ÚJ, szűk kiegészítés melléjük, nem azok felülvizsgálata.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PatientPage.tsx` — a Név mező környéke: a kötés-jelzés
  (4. döntés) és az ütközés-figyelmeztetés (3. döntés) új UI-eleme. A
  lapnak ma nincs `useStorage()`/pácienslista-betöltése — ezt pótolni kell
  az ütközés-ellenőrzéshez.
- `app/src/domain/paciensDuplikacio.ts` — `nevJeloltek()` újrahasznosítása,
  `kihagyottPaciensId: plan.paciensId`-vel.
- `app/src/domain/torzsadatBetoltes.ts` — `feloldPatientDir()` a kötés
  feloldásának meglévő, egyetlen helye (4. döntés).
- `app/src/domain/veglegesitesOr.ts` — új HARD checklist-tétel (5.
  döntés); `app/src/pages/previewPage/VeglegesitesChecklist.tsx` a
  megjelenítést a meglévő egységes modellből automatikusan örökli.
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` — a "Törzsadat
  frissítése a tervből" gomb letiltása (6. döntés).
- `app/src/components/TervWorkflowShell.tsx` — a breadcrumb `href`/
  felirat összhangba hozása (7. döntés).

## Tesztelés (irányadó, nem kimerítő)

- Másolás/új verzió/gyorsfelvétel utáni folytatás után a Terv adatai lapon
  látszik a kötött páciens jelzése, vadonatúj piszkozatnál nem.
- A Név mezőt egy MÁSIK, ténylegesen létező páciens PONTOS nevére írva
  megjelenik a figyelmeztetés; egy hasonló, de nem pontos névre írva NEM
  jelenik meg.
- A kötött páciens saját nevére visszaírva (vagy érintetlenül hagyva) a
  figyelmeztetés nem jelenik meg (a `kihagyottPaciensId` kizárja saját
  magát).
- Ütközés fennállása esetén az Előnézeten a "Véglegesítés és mentés" gomb
  le van tiltva, a checklist-tétel önálló, elkülönül a `torzsadat-elteres`
  tételtől; a Név mezőt visszajavítva a tétel eltűnik, a gomb újra aktív.
- Ütközés fennállása esetén a `TorzsadatSyncCard` "Törzsadat frissítése a
  tervből" gombja le van tiltva; a Név mezőt visszajavítva újra aktív.
- Másolás után a breadcrumb felirata és célja (kattintáskor hova navigál)
  mindig ugyanarra a páciensmappára mutat, még akkor is, ha a Név mezőt
  időközben átírták.
- A meglévő, ÁLTALÁNOS mezőeltérés (pl. csak a telefonszám tér el, a név
  nem ütközik senkivel) továbbra is csak INFO-szintű, nem blokkol — ez a
  viselkedés nem változik.
