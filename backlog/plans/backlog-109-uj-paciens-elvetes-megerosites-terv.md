# Backlog 109. tétel — Új páciens gyorsfelvétel: elvetés-megerősítés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 109. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

## Probléma

A `pages/paciensek/UjPaciensDialog.tsx` tisztán helyi állapotot tart
(`nev`/`szuletesiIdo`/`telefon`), és `docs/reviews/2026-08-25-doctor-review-
zsufolt-reggel.md` 2. pontja szerint egy doki-perszóna a Páciensek lista
„+ Új páciens" dialógusába beírt egy nevet, majd megszakítást szimulálva
(telefonhívás) elnavigált mentés nélkül — a dialógus és a begépelt adat
szótlanul eltűnt, semmi nem jelezte a félbehagyott bevitelt, és a lista
változatlan számot mutatott. A review javasolt iránya nem teljes autosave,
hanem egy egyszerű „elvetnéd a bevitt adatot?" megerősítés a meglévő
`DiscardChangesDialog` mintáján — arányos egy rövid, néhány mezős
űrlaphoz.

A dialógus fejléc-kommentje (109–112. sor) egy korábbi, tudatos döntést
hordoz: *„Minden megnyitáskor tiszta lappal indul… egy pár mezős
űrlapnál a piszkozat-visszaírás nem éri meg a plusz kattintást"* — ezt a
tétel NEM vonja vissza (lásd 1. döntés), csak a zárás elé told egy
explicit megerősítést.

## Döntések

### 1. Elvetés-megerősítés, nem piszkozat-visszaírás

A begépelt adat továbbra sem éli túl a dialógus zárását — a védelem egy
explicit döntési pont zárás előtt, nem egy automatikus visszaírás a
következő megnyitáskor. A megnyitáskori reset-effekt (jelenlegi 113–121.
sor) változatlan marad.

**Miért:** elvetett alternatíva a `DraftStorage`-alapú visszaírás — ez egy
2-3 mezős, rövid életű űrlaphoz aránytalan gépezet lenne, és a
`DraftStorage` (`docs/05-technologia.md` § Piszkozat-autosave) nem válhat
system of recorddá egy ilyen könnyűsúlyú beviteli felülethez. Elvetett
alternatíva a „megnyitáskor éledjen újra az előző tartalom" is — ez pont
azt a döntést törölné el, amit a dialógus fejléc-kommentje explicit rögzít,
és a review sem ezt kéri.

### 2. Hatókör: kizárólag az `UjPaciensDialog`

A tétel az `pages/paciensek/UjPaciensDialog.tsx`-re szűkül. A testvér
`pages/priceListAdmin/UjTetelDialog.tsx` (árlista admin „+ Új tétel")
szándékosan érintetlen marad.

**Miért:** ez pontosítja, nem törli el az `UjTetelDialog.tsx` fejléc-
kommentjében (49–52. sor) rögzített korábbi döntést — a két, formailag
hasonló quick-create dialógus tudatosan eltérő adatot hordoz. Az árlista-
tétel neve és kategóriája a doki saját, emlékezetből pótolható döntése;
a páciens születési dátuma és telefonja jellemzően telefonon bediktált,
máshonnan újra be nem szerezhető adat — a review is kifejezetten a
páciens-dialógusnál figyelte meg a napi súrlódást, az árlista-adminnál
nem. Elvetett alternatíva mindkét dialógus egyidejű átállítása —
elvetve, mert a kockázat/nyereség arány a két helyen eltérő, és egy
egységes viselkedés-kényszer az `UjTetelDialog` gyors, egymás utáni tétel-
felvitel közbeni munkafolyamatát (ahol a doki tudatosan sűrűn nyit-zár)
feleslegesen lassítaná. Ha az eltérés a gyakorlatban zavarónak bizonyul,
külön backlog-tétel dönthet az `UjTetelDialog` bevonásáról.

### 3. Mind a három zárási út elfogása, egyetlen ponton

A védelemnek a Mégse gombra, az Esc billentyűre és a dialóguson kívülre
kattintásra egyaránt ki kell terjednie. Mivel az `UjPaciensDialog`
teljesen kontrollált (`Dialog.Root open onOpenChange`, nincs
`Dialog.Trigger`), és mindhárom út ugyanazon az `onOpenChange(false)`
híváson megy át (a Mégse gomb `Dialog.Close`-ba csomagolt, jelenleg
240–244. sor) — egyetlen elfogási pont elég, nem kell az
`onEscapeKeyDown`/`onPointerDownOutside` propokat külön felülírni.

**Miért:** ez követi a meglévő D38-mintát — a `NyomtatvanyokTab.tsx`
(322. sor) Mégse gombja is a `useDiscardGuard`-on megy át, nem csak a
véletlen elhagyást fogja el. Elvetett alternatíva a csak-Esc/csak-overlay
elfogás (a review „véletlen megszakítás" forgatókönyve mellett is
következetlen lenne, ha egy explicit Mégse-kattintás másképp viselkedne,
mint egy véletlen Esc) és a három út külön-külön kezelése (jelenleg egy
propfelülírás sincs a kódbázisban erre a mintára, a kontrollált
`onOpenChange` ennél egyszerűbb).

### 4. A „dirty" jelentése: eltérés az induló állapottól, nem az üres űrlaptól

A dialógus akkor számít módosítottnak, ha a jelenlegi (trimmelt) mezőérték
eltér attól, amivel a legutóbbi megnyitás indult — vagyis
`initialNev ?? ''` a név mezőnél, üres string a születési dátumnál és a
telefonnál.

**Miért:** a `NewPlanPage.tsx` no-match ágán a dialógus `initialNev`-vel
előtöltve nyílik (a doki már begépelte a nevet a keresőmezőbe). Ha az
előtöltött név érintetlen marad, és a doki Esc-cel zár, semmi nem veszik
el — a név még mindig ott van a `NewPlanPage` keresőjében, a
`onOpenChange` wrapperje (jelenlegi `handleUjOpenChange`) egyébként is
oda állítja vissza a fókuszt. Az induló állapothoz mérés emellett egy
csak-whitespace bevitelt sem jelez dirty-nek, mert a viszonyítás
trimmelt értékeken történik. Elvetett alternatíva: bármilyen nem üres
mezőtartalom dirty-nek számítson, függetlenül az előtöltéstől — ez a
no-match ágon minden puszta Esc-nél felesleges pluszkattintást kérne,
holott a doki semmit nem gépelt a dialógusba.

### 5. A szülő által vezérelt zárás sosem kér megerősítést

Sikeres mentés (`onSave` utáni `setOpen(false)` a hívóban), a
`onUseExisting` út, és a hívó bármely más, explicit `setOpen(false)`-a
nem megy át az elfogáson — ott a doki már döntött, a védelem nem
alkalmazandó.

**Miért:** ezek maguk is explicit szándéknyilvánítások (mentés vagy egy
meglévő páciens kiválasztása), amiket felesleges lenne még egyszer
megkérdezni. Technikailag is természetesen adódik: ezek a hívások a
`PaciensekPage.tsx`/`NewPlanPage.tsx`-ben közvetlenül a saját `open`
state-jüket állítják, nem az `UjPaciensDialog` `onOpenChange` propján
mennek át — tehát a dialóguson belüli elfogás eleve nem látja őket, külön
kizáró ágat nem kell írni hozzájuk.

### 6. A közös `DiscardChangesDialog` kap egy opcionális, alapból kikapcsolt fókusz-visszaállítást

A `components/DiscardChangesDialog.tsx` komponens egy új, opcionális
paramétert kap a beépített Radix `onCloseAutoFocus` viselkedés
felülírásához, alapértelmezésben változatlanul hagyva az öt meglévő
hívási helyet (`PatientDetailPage.tsx`, `SettingsPage.tsx`, `NavBar.tsx`,
`KategoriaPanel.tsx`, `NyomtatvanyokTab.tsx`). Az `UjPaciensDialog` ezt a
paramétert a MÁR meglévő `visszaFokuszRef`-jével (a duplikáció-megerősítő
`AlertDialog` jelenlegi 100., 136., 259–262. sorában élő referenciával)
hívja meg — nem hoz létre második refet.

**Miért:** az `UjPaciensDialog.tsx`-ben már dokumentáltan igazolt Radix-
bug (jelenlegi 254–258. sor): egy kontrollált, trigger nélküli
`AlertDialog` bezárásakor, MÉG NYITOTT, fókusz-csapdázott `Dialog` alatt a
beépített visszafókuszálás a `<body>`-ra esne, mert a `triggerRef.current`
null. A közös `DiscardChangesDialog` ma nem kezeli ezt (nincs
`onCloseAutoFocus` override), mert az öt meglévő hívó mind sima lap/panel,
nem dialóguson belüli — ez lenne az első dialóguson belüli hívási hely.
Elvetett alternatíva (a): a harmadik megerősítési ágat beolvasztani a
fájlban már élő `Megerosites` diszkriminált unióba (`'megis-uj'` /
`'eltero-adat'`) egy `'elvetes'` taggal — technikailag működne (a
fókusz-workaround készen van), de két szemantikailag különböző
megerősítést (duplikáció-döntés vs. adatvesztés-elfogás) vonna egy
állapotba, és a tétel kifejezetten a meglévő közös primitív
(`useDiscardGuard`/`DiscardChangesDialog`) használatát kéri, nem egy
helyi újraimplementálást. Elvetett alternatíva (b): a fókusz-
visszaállítást a hívóban (az `UjPaciensDialog`-ban) kezelni, a közös
komponenst érintetlenül hagyva — kevesebb felület, de a workaround nem
élne együtt a komponenssel, és a következő, egy jövőbeli dialóguson
belülre kerülő `DiscardChangesDialog`-hívónak újra fel kellene fedeznie
ugyanezt a Radix-bugot.

### 7. A megerősítő szövegek

Cím, leírás és a piros gomb felirata a meglévő D38-hívási helyek
mintáját követi: a Cancel mindig „Mégse" (soft, gray), a megerősítő
(piros) gomb felirata a művelet nevét + „, módosítás elvetésével"
mintát hordozza (lásd `PatientDetailPage.tsx`: „Váltás, módosítás
elvetésével"; `KategoriaPanel.tsx`: „Becsukás, módosítás elvetésével").
A konkrét szöveg (pl. „Bezárás, a begépelt adat elvetésével") a
megvalósító feladata.

**Miért:** `docs/07-felulet-rendszer.md` „a gombfelirat azt mondja, mi
történik" szabálya — a doki kattintás előtt lássa, hogy a piros gomb
konkrétan mit dob el, ne egy generikus „OK"/„Igen" szerepeljen.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az `UjTetelDialog.tsx` (árlista admin „+ Új tétel") változatlan marad —
  lásd 2. döntés.
- A NavBar-navigáció elfogása (D46, `NavGuardContext`) — a modális
  `Dialog` overlay-e és fókusz-csapdája miatt a NavBar egy nyitott
  dialógus mellett eleve nem kattintható, a `useNavGuard` regisztrálása
  itt tárgytalan. A `NavGuardContext` fejléc-kommentje (9–13. sor)
  emellett explicit kimondja, hogy az invariánsa (egyszerre egy D38-védett
  felület) egy lap MELLETT mountolt modális szerkesztővel megdőlne — ez a
  dialógus emiatt sem regisztrálhat rá.
- A böngésző vissza/előre és F5 elfogása — a `HashRouter` ezt nem
  támogatja, `docs/07-felulet-rendszer.md` a D38 leírásánál ezt már
  kimondja általánosan.
- Bármilyen `DraftStorage`-alapú visszaírás — lásd 1. döntés.
- A Kezdőlapi „félbehagyott páciensfelvétel" emlék/kártya, amit a review
  „orvosi elvárás" sora felvet (hasonlóan a „Piszkozat folytatása"
  kártyához) — a 109. tétel szövege ezt explicit nem kéri, csak egy
  zárás előtti megerősítést.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/paciensek/UjPaciensDialog.tsx` — a zárás elfogása és a
  megerősítő dialógus bekötése; a fejléc-komment (109–112. sor)
  pontosítása, hogy a „nincs visszaírás" döntés áll, csak egy zárás
  előtti megerősítés került elé.
- `app/src/components/DiscardChangesDialog.tsx` — az opcionális fókusz-
  visszaállítási paraméter hozzáadása, az öt meglévő hívó
  változatlanul hagyásával.
- `app/src/components/useDirtyDraft.ts` — `draftDirty()` újrahasználva a
  dirty-számításhoz, a fájl maga nem módosul.
- `app/src/pages/paciensek/UjPaciensDialog.test.tsx` — a meglévő
  tesztmintát követő új esetek (lásd Tesztelés).
- Változatlanul marad: `app/src/pages/PaciensekPage.tsx`,
  `app/src/pages/NewPlanPage.tsx` — a védelem a dialóguson belül él, a
  hívók `onOpenChange`/`onSave`/`onUseExisting` szerződése nem változik.

## Tesztelés (irányadó, nem kimerítő)

- Üres, érintetlen dialógusnál mindhárom zárási út (Mégse, Esc, kívülre
  kattintás) azonnal, megerősítés nélkül zár.
- A `NewPlanPage` előtöltött, de azóta érintetlenül hagyott nevénél
  ugyanígy: mindhárom út azonnal zár.
- Bármelyik mező (név, születési dátum, telefon) kitöltése vagy az
  előtöltött névtől eltérő átírása után mindhárom zárási út megerősítést
  kér.
- A megerősítés Mégse-je nyitva hagyja az `UjPaciensDialog`-ot, a
  begépelt adat érintetlen.
- A megerősítés elfogadása a begépelt adat elvesztésével zár, és a
  fókusz nem esik a `<body>`-ra (a `UjPaciensDialog` triggerét megnyitó
  elemre esik vissza).
- Sikeres mentés és a duplikáció-megerősítésen át választott meglévő
  páciens (`onUseExisting`) egyike sem kér elvetés-megerősítést.
- A duplikáció-megerősítő `AlertDialog` nyitva léte alatt egy Esc csak
  azt az AlertDialog-ot zárja (a mögötte lévő `Dialog` nem kap újabb
  elfogást ugyanabban a lépésben).
- Az öt meglévő `DiscardChangesDialog`/`useDiscardGuard` hívási hely
  (`PatientDetailPage`, `SettingsPage`, `NavBar`, `KategoriaPanel`,
  `NyomtatvanyokTab`) viselkedése és fókusz-visszaadása változatlan.
