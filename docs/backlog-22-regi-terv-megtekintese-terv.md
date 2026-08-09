# Backlog 22. tétel — Régi terv megnyitása új lapon (csak megnézés) — döntési összefoglaló

Ez a fájl a `docs/08-backlog.md` 22. tételének („Régi terv megnyitása új
lapon (csak megnézés)") megbeszélt megvalósítási döntéseit rögzíti,
implementáció-indításhoz. Nem tartalmaz kódot vagy függvényszignatúrákat
(a lenti aláírás-szerű részletek csak illusztrációk) — az implementáció
módja és a részletek kidolgozása a megvalósító feladata.

## Probléma

A `PlanHistoryPage.tsx`-en ma két akció van egy verziósoron: „Letöltés"
(PDF a Letöltések mappába) és „Megnyitás szerkesztésre" (betölti a
tervet a piszkozatba, `loadPlanIntoDraft` + navigáció a szerkesztőbe —
mentetlen piszkozat esetén megerősítést kér, mert felülírná azt). A „csak
ránézek, mit írtunk alá tavaly" eset ma csak ezen a két, nem erre való
úton érhető el: vagy a szerkesztőbe nyitáson át (ami veszélyezteti a
piszkozatot, és egy véletlen mentés új verziót hoz létre — D4 miatt ez
végleges, nem visszavonható), vagy a Letöltések mappán át (kényelmetlen,
és a 20. tétel előtti fájlnevek — puszta `tervId` — között nehéz
eligazodni).

**Fontos korrekció a backlog-szöveghez képest:** a backlog azt írja,
hogy ez „a már betöltött PDF-bájtokból" építene blob-URL-t — ez NEM
igaz a mai kódra. A `loadPlanPdf` ma kizárólag a „Letöltés" gombra
kattintáskor, igény szerint töltődik be egyetlen verzióhoz sem előre.
Ez a tétel emiatt egy önálló, a „Letöltés"-hez hasonló, saját lekérést
végző harmadik akciót vezet be, nem egy meglévő cache-re épül (lásd 1.
döntés).

## Döntések

### 1. Adatforrás: friss lekérés minden kattintásra, a „Letöltés" mintáját követve

A „Megnézés" gomb ugyanazt a `loadPlanPdf({patientDir, versionDir})`
hívást indítja, mint a „Letöltés" — nincs megosztott bájt-cache a két
akció között, nincs új state arra, hogy „ez a verzió már be lett-e
töltve ebben a látogatásban".

**Miért:** a backlog-szövegben feltételezett „már betöltött" előfeltétel
tévesen írja le a mai kódot (lásd fent) — egy megosztott cache építése
új állapotot és élettartam-kezelést vezetne be egy ritkán előforduló
esetért (ugyanazt a verziót egy látogatáson belül kétféleképp is
megnyitni), messze túllépve az 1–2 órás méretbecslést.

### 2. Popup-blokkoló elleni védelem: szinkron üres lap nyitása, majd `.location` állítása

A kattintás-kezelő **legelső** lépéseként, még az `await` előtt, szinkron
hívja a `window.open('', '_blank')`-ot — ez történik a valódi
felhasználói gesztus pillanatában, tehát a böngésző sosem blokkolja.
A visszakapott ablak-referenciát megőrizve, amint megjön a `loadPlanPdf`
válasza és elkészül a blob URL, a `location.href`-et állítjuk rá.

**Miért:** ha a kattintás-kezelő előbb `await`-tel megvárná a
`loadPlanPdf`-et, és csak utána hívná a `window.open(blobUrl)`-t, a
legtöbb böngésző (Chrome/Firefox/Safari) ezt felugró ablakként
blokkolná — az aszinkron rés megtöri a „valódi felhasználói gesztus"
láncot, amit a popup-blokkoló előír. Ez a doki képén némán törne el
(kattint, sem hiba, sem új lap nem jelenik meg) — pontosan az a hibafajta,
amit a projekt más tervei (pl. P1-8: `pdfInstance.error` olvasása) is
tudatosan kerülnek. A szinkron-nyitás + kések late-navigáció a
szabványos, megbízható megoldás pontosan erre a helyzetre (aszinkron
adat, új lap).

### 3. Hiba-ág: a megnyitott üres lapot bezárjuk, a hiba a listán jelenik meg

Ha `loadPlanPdf` `null`-t ad (nincs mentett PDF ehhez a verzióhoz —
ugyanaz az eset, amit a „Letöltés" ma az „Ehhez a verzióhoz nincs
mentett PDF." inline hibával jelez): a 2. döntésben megnyitott üres
lapot `win?.close()`-zal bezárjuk, és a meglévő `actionError`
állapotot/UI-t újrahasznosítva ugyanaz az inline piros üzenet jelenik
meg a verziósor alatt, mint ma a „Letöltés" hibájánál — nincs új
hibaüzenet-szöveg, nincs második hiba-megjelenítési minta.

**Miért:** a doki nem maradhat egy üres, értelmezhetetlen új laptal —
a hiba ott jelenjen meg, ahol a többi is (`docs/07-felulet-rendszer.md`:
„nem toast, ha a hiba egy mezőhöz tartozik"), ugyanazzal az
állapottal/mintával, mint a „Letöltés" hibája — nincs szükség az
`actionError` típus bővítésére akció-azonosítóval, mert az üzenet
szövege a két akcióra azonos ok esetén helytálló mindkettőre.

### 4. Blob URL életciklus: nincs explicit `revokeObjectURL`, a munkamenet élettartamára bízva

A „Megnézés" úton létrehozott blob URL-eket nem követjük és nem
revoke-oljuk explicit — sem az adott lap bezárásakor, sem ugyanazon
verzió újranyitásakor.

**Miért:** egyetlen doki, asztali használat, napi néhány tucat terv —
a fel nem szabadított blob-ok memória-lábnyoma egy munkanapon belül
elhanyagolható (egy teljes oldal-újratöltés/tab-bezárás úgyis
felszabadítja). Egy követő state-map bevezetése új állapotot és
élettartam-kezelést adna egy a gyakorlatban elhanyagolható hatásért —
összhangban a projekt más helyein (pl. `docs/08-backlog.md` SOHA lista,
„Általános undo") is kimondott elvvel, hogy egyszemélyes rendelőben a
ritka, alacsony kárú éleseteket nem érdemes túl-mérnökösíteni.

### 5. Gomb szövege és helye: „Megnézés", a sor ELEJÉN

A verziósor gombjainak sorrendje mostantól: „Megnézés" → „Letöltés" →
„Megnyitás szerkesztésre" — a legkevésbé invazív (csak megnézem) akció
elöl, a leginkább kockázatos (szerkesztésre nyitás, piszkozat-felülírás
kockázata) hátul.

**Miért:** a „Megnézés" névnek világosan meg kell különböznie a
„Megnyitás szerkesztésre"-től — az utóbbi a piszkozatot veszélyezteti
(megerősítő dialógust dob mentetlen piszkozatnál, lásd 6. döntés), az új
gomb NEM. Egy „Megnyitás új lapon"-szerű elnevezés részleges szöveg-
átfedést adna a „Megnyitás szerkesztésre"-vel (mindkettő „Megnyitás..."-
sal kezdődne), ami növelné az összetévesztés esélyét egy gyorsan
pásztázó dokinál — a rövid, egyértelmű „Megnézés" ezt elkerüli.

### 6. Nincs interakció a piszkozat-felülírás-őrrel

A „Megnézés" soha nem hívja a `loadPlanIntoDraft`-ot, soha nem navigál, és
teljesen független a „Megnyitás szerkesztésre" `pendingOpen`/
`AlertDialog` mechanizmusától — egyetlen kattintás, semmilyen
megerősítés, mert a piszkozatot egyáltalán nem érinti.

**Miért:** ez maga a tétel valódi haszna (lásd a backlog „Valódi haszon"
sora: „a »csak ránézek« út ma a szerkesztésre nyitáson át vezet, ami a
piszkozatot fenyegeti") — ha a „Megnézés" bármilyen módon a draft-ot
érintené, nem oldaná meg az eredeti problémát.

### 7. Tesztelés: mockolt `window.open` + `URL.createObjectURL`, drótozottság-ellenőrzés

A `PlanHistoryPage.test.tsx`-ben egy új eset, ami mockolja a
`window.open`-t (egy `{ location: { href: '' }, close: vi.fn() }`-szerű
objektumra) és a `URL.createObjectURL`-t (egy fix `'blob:teszt'`
stringre), majd igazolja:

1. kattintásra a `window.open` **szinkron**, `''`/`'_blank'`
   argumentumokkal hívódik (a 2. döntés popup-blokkoló-védelme maga a
   lényeg, ezt kell igazolni — nem elég, hogy VALAMIKOR meghívódik);
2. sikeres lekérésnél a mock ablak `location.href`-je a `'blob:teszt'`
   értéket kapja;
3. hiányzó PDF esetén a mock ablak `close()`-a hívódik ÉS az inline hiba
   (3. döntés szövege) megjelenik a soron.

**Miért:** ennek a párosnak (`window.open`/`URL.createObjectURL`) nincs
meglévő tesztmintája a kódbázisban (még a mai „Letöltés" gombnak sincs
teszt-lefedése a blob-URL részére), és a jsdom `window.open`-je
alapértelmezésben nem implementált — mockolás nélkül a teszt nem is
futna le. A három asszerció lefedi az ebben a munkamenetben hozott,
ténylegesen kockázatos döntéseket (szinkron nyitás, siker, hiba-ág) —
nem próbálja meg valódi blob-navigációt szimulálni jsdom-ban, ami
törékeny és a jsdom korlátaival küzdene feleslegesen.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **Beépített PDF-olvasó nézet az appban** — a backlog kifejezetten
  elveti („beépített olvasó nézet felesleges, a böngésző PDF-nézője
  elég"); ez a tétel kizárólag a böngésző natív PDF-megjelenítőjére
  támaszkodik egy blob: URL-en át.
- **Új útvonal/route** — a backlog kifejezetten elveti („nincs új nézet,
  nincs új útvonal"); a funkció teljes egészében egy kattintás-kezelőben
  él a `PlanHistoryPage`-en, nem hoz létre új React Router útvonalat.
- **Blob URL megosztása/cache-elése a „Letöltés" és „Megnézés" között**
  — lásd 1. döntés, tudatosan elvetve.
- **Blob URL explicit felszabadítása (`revokeObjectURL`)** — lásd 4.
  döntés, tudatosan elvetve.
- **`window.opener`-biztonsági kérdés** (pl. `noopener`) — nem releváns:
  a megnyitott lap kizárólag egy kliensoldalon, a doki gépén generált
  blob: URL-re navigál, soha nem külső/távoli erőforrásra, tehát nincs
  cross-origin adatszivárgási kockázat, amitől a `noopener` védene — sőt,
  a mechanizmusnak (2. döntés) SZÜKSÉGE van az ablak-referenciára a
  `.location.href` beállításához, tehát `noopener`-t nem is használhatna.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PlanHistoryPage.tsx`
  - Új kattintás-kezelő (pl. `viewVersion(patientDir, versionDir)`) a
    meglévő `downloadVersion` mellé, a 2–3. döntés szerinti szinkron-
    nyitás + kései navigáció mintával.
  - Új „Megnézés" gomb a verziósor `Flex`-ében, az 5. döntés szerinti
    pozícióban (a „Letöltés" elé).
- `app/src/pages/PlanHistoryPage.test.tsx` — a 7. döntésben leírt új
  eset.
