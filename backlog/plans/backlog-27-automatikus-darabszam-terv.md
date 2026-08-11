# Backlog 27. tétel — Automatikus darabszám a fogszámokból (D14 részleges újranyitása) — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 27. tételének megbeszélt megvalósítási döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A `fogak` mező (docs/02-domain-modell.md § Fogszám kezelés) FDI-fogszámaiból számolt darabszám ma csak egy halvány, nem blokkoló figyelmeztetést ad, ha eltér a kézzel beírt `mennyiseg`-től (`PlanEditorPage.tsx` `mismatch`). D14 (docs/01-attekintes-es-dontesek.md) az egységtípus bevezetését és az automatikus darabszámot együtt zárta ki az MVP-ből, mert a 118 tétel fogankénti/alkalmankénti besorolása hetekre elakasztotta volna a projektet. A backlog eddigi megjegyzése szerint a mai figyelmeztetés addig elég, amíg nincs konkrét panasz — ez a tétel a reopening: a `mennyiseg` mostantól automatikusan kövesse a `fogak` mezőt, a doki kézi felülbírálásának tiszteletben tartásával, de az egységtípus explicit besorolása nélkül.

## Döntések

### 1. Egységtípus-megkülönböztetés: heurisztika, nincs új mező
A sor "fogankéntinek" számít, ha a `fogak` mező `parseTeeth()` szerint valid (csupa érvényes FDI token) — pontosan az a feltétel, amit a mai figyelmeztetés is használ. Nincs új mező a `Tetel`-en vagy a `Kategoria`-n.

**Miért:** D14 eredeti oka (a 118 tétel besorolása hetekre elakasztotta volna a projektet) ma is érvényes. Egy új tétel- vagy kategória-szintű jelölő pont azt az adminisztrációs terhet vezetné vissza, amit D14 el akart kerülni. Elvetett alternatíva: kategória-szintű jelölő (13 kategória, kisebb teher, mint tételenként) — elvetve, mert a heurisztika a meglévő figyelmeztetés-logikát bővíti ingyen, semmilyen új triázs-munkát nem igényel.

### 2. Folyamatos követés kézi leállással (D24-mintára)
Amíg egy sor "követő" állapotban van, minden `fogak`-módosítás (amíg `parseTeeth().valid`) frissíti a `mennyiseg`-et a fogak számára. Amint a doki közvetlenül beír egy értéket a Darabszám mezőbe, a sor "levál" — onnantól a `fogak` módosítása többé nem írja felül némán.

**Miért:** ez a D24 döntés ("kézzel megadott sornevet automatikus mechanizmus soha nem ír felül némán") mintáját követi a `mennyiseg` mezőre. Elvetett alternatíva: egyszeri alapérték csak a sor létrehozásakor, utána mindig kézi, új mező nélkül — elvetve, mert a doki gyakran menet közben bővíti a fogak listáját (pl. rájön, hogy még egy fog érintett), és ilyenkor a folyamatos követés valódi időmegtakarítás; egy egyszeri alapérték csak a legelső begépelést segítené.

### 3. Új, perzisztens mező a Sor-on: `mennyisegKezi`
Additív logikai mező (`mennyisegKezi?: boolean`), nincs `schemaVersion`-emelés — a `leirasSnapshot`/`csomag` mintájára. `true` = a doki kézzel felülbírálta, a sor levált; hiányzó vagy `false` = automatikusan követi a `fogak` mezőt. A funkció bevezetése UTÁN létrehozott minden sor (`ItemPicker`, egyedi sor, fogtérkép-kattintás) explicit írja ezt a mezőt (kezdetben `false`) — soha nem hagyja üresen.

**Miért:** érték-összehasonlítással (`mennyiseg === fogak száma`) nem lehetett volna megbízhatóan eldönteni a "kövessen-e" állapotot, mert a `mennyiseg` induló alapértéke mindig 1, függetlenül a fogak számától. Egy frissen létrehozott, még érintetlen sor, ahol a doki egyszerre 3 fogat gépel be, ugyanúgy nézne ki (`mennyiseg=1`, 3 fog), mint egy régi, kézzel 1-re állított, ténylegesen 3 fogas sor. Csak egy explicit, író-esemény-alapú jelző tudja megkülönböztetni a kettőt — ez az a lépés, ahol a `nevKoveti`-féle puszta érték-egyezés minta NEM elég a `mennyiseg`-hez.

### 4. Régi (funkció előtti) sorok alapértelmezetten "kézi"
Ha a `mennyisegKezi` mező hiányzik egy már mentett sorról, a sor "kézi"-nek számít — nem indul automatikus követéssel. A doki az új vissza-kapcsoló gombbal (5. döntés) soronként explicit bekapcsolhatja a követést egy régi soron is.

**Miért:** mivel minden ÚJ sor explicit írja a mezőt (3. döntés), a hiányzó mező kizárólag azt jelentheti, hogy a sor a funkció előtt keletkezett — biztonságosan lehet "kézi"-ként kezelni anélkül, hogy bármelyik ma is érvényes, szándékosan eltérő régi mennyiséget némán felülírná. Elvetett alternatíva: a hiányzó mező is "követő" legyen — elvetve, mert ez pont azt a csendes felülírást kockáztatná régi terveken, amit D24 a névnél kifejezetten ki akart zárni.

### 5. Vissza-kapcsolás: explicit gomb/ikon a soron
Levált soron egy kis ikon/gomb jelenik meg, amire kattintva a doki egy lépésben visszakapcsolja a követést ÉS azonnal szinkronizálja a `mennyiseg`-et az aktuális fogak-számra.

**Miért:** egy néma "írd be újra kézzel az egyező számot" megoldás működne, de nem transzparens — a doki nem feltétlenül tudná, hogy egy adott érték újbóli begépelése "visszakapcsolja" a követést. Egy explicit vezérlő egyértelművé teszi az állapotváltást.

### 6. Csomag-sorok (és minden más sor) egységesen követnek — nincs kivétel
A `csomag: true` tételre hivatkozó sorok NEM kapnak külön kivételt, annak ellenére, hogy a `fogak` mezőjük gyakran inkább leíró jegyzet ("melyik fogakat érinti a csomag"), mint darabszám-vezérlő. Ugyanígy az egyedi (tétel nélküli) sorok is egységesen követnek, ha érvényes FDI-fogszámokat tartalmaznak — a heurisztika nem néz `tetelId`-t, csak a `fogak` mezőt.

**Miért:** a kézi leállás (2. döntés) már megvédi a dokit — mihelyt egy csomag-soron a fogak-alapú automatikus mennyiség hibásnak bizonyul, a doki kijavítja, és a sor levál. Egyszerűbb, kivétel nélküli szabály, kevesebb rejtett eset a dokinak megjegyeznie. Tudatosan vállalt kockázat: egy csomag-soron a fogak begépelése közben átmenetileg téves (túl magas) sorösszeg jelenhet meg, amíg a doki nem javítja a mennyiséget — ez piszkozat-fázisban észrevehető és javítható, nem kerül automatikusan aláírt papírra, és a véglegesítés-őr ma sem ellenőrzi ezt a konkrét esetet (ez a tétel sem vezet be hozzá új ellenőrzést).

### 7. A meglévő szöveges figyelmeztetés megmarad, második jelzésként
A mai "`X` fog van felsorolva, a darabszám `Y`. Szándékos?" szöveg változatlanul megjelenik levált soron, a vissza-kapcsoló ikon/gomb mellett.

**Miért:** redundáns, de olcsó megerősítés — inkább lássa a doki mindkét jelzést, mintsem hogy egy finomabb jel (csak az ikon) esetleg elsikkadjon.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Egységtípus (fogankénti/alkalmankénti) explicit, tétel- vagy kategória-szintű besorolása az árlistában — D14 ezen fele TOVÁBBRA IS nyitva marad, csak a heurisztikus közelítés valósul meg.
- A nyomtatvány (PDF) nem változik — a `mennyiseg` végső, elmentett értéke kerül nyomtatásra, forrástól (auto vagy kézi) függetlenül; a `mennyisegKezi` mező soha nem jelenik meg a papíron.
- Sávos (SAVOS) tétel felső határának nyomtatványon való megjelenítése (külön, nyitott backlog-tétel) — nincs kapcsolat.
- Automatikus ár-számítás vagy egységár-szorzás új logikája — ez a tétel kizárólag a `mennyiseg` mezőt érinti, a `tenylegesEgysegar`/`listaEgysegar` számítás változatlan.
- A `docs/01` D14 sorának és a `docs/02` "Fogszám kezelés" szakaszának véglegesítéskori átfogalmazása (CLAUDE.md "Backlog-tétel lezárása" 2. lépése) — ennek a tervnek nem feladata; a lezáráskor kell rögzíteni, hogy D14 RÉSZLEGESEN nyílik újra (az egységtípus fele változatlan marad).

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/domain/teeth.ts` — valószínűleg itt kap helyet az új, fogak→mennyiség szinkronizáló logika, a meglévő `parseTeeth`/`invalidFdiTokens`/`toggleFog` mintájára, egy helyen tartva a fogszám-modult.
- `app/src/domain/types.ts` — `Sor` interfész bővítése a `mennyisegKezi` mezővel, a `leirasSnapshot` melletti kommentmintában dokumentálva.
- `app/src/pages/PlanEditorPage.tsx` (`LineRow` komponens) — a Darabszám cella jelenlegi `mismatch`-figyelmeztetés logikája mellé kerül az automatikus írás és a vissza-kapcsoló ikon/gomb; az `addLine`/`addEgyediLine`/`onToothClick` sorlétrehozó helyek mindegyike explicit írja az új mezőt.
- `docs/02-domain-modell.md` § "Fogszám kezelés" és a `Sor` séma példa — a jelenlegi szöveg (362–378. sor) kifejezetten leírja, hogy "Az MVP nem számol belőle darabszámot (D14)"; ez véglegesítéskor frissítendő.

## Tesztelés (irányadó, nem kimerítő)

- Új sor létrehozása (ItemPicker / fogtérkép-kattintás / egyedi sor) + fogak begépelése → a darabszám automatikusan követi a fogak számát.
- Doki kézzel felülbírálja a darabszámot → a sor levál, megjelenik a vissza-kapcsoló ikon és a régi figyelmeztető szöveg (ha eltér).
- Levált soron a vissza-kapcsoló gombra kattintva → azonnal szinkronizál az aktuális fogak-számra, és onnantól újra követ.
- Régi (funkció előtti) piszkozat/terv betöltése → minden meglévő sor "kézi" állapotban indul, a vissza-kapcsoló gombbal soronként opt-in-elhető.
- Csomag-sorok és egyedi sorok ugyanúgy követnek, mint bármely más fogankénti sor.
- Duplikált FDI token (pl. "16, 17, 16") a darabszámban is csak egyszer számít (a meglévő `parseTeeth` dedup viselkedés újrahasznosítva).
- Szabadszöveges jegyzet a fogak mezőben (pl. "jobb felső") → nem érvényes FDI-lista, a sor nem indul/marad automatikus követésben.
- Nyomtatvány (PDF) változatlan marad — a mennyiség végső, elmentett értéke nyomtatódik.
