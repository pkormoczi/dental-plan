# Backlog 114. tétel — „Törzsadat létrehozása" lépés-elhagyási ajánlat egyszeri emlékezete — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 114. tételének megbeszélt megvalósítási
döntéseit rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása a
megvalósító feladata.

## Probléma

A „Terv adatai" lap „Páciens törzsadata" szekciója (`TorzsadatSyncCard.tsx`)
a lépés ELŐRE (Kezelések/Előnézet felé) elhagyásakor, ha a páciensnek nincs
önálló törzsadata, egy „Törzsadat létrehozása" `AlertDialog`-ot ajánl fel. A
„Kihagyás, tovább lépek" gombra kattintva a navigáció folytatódik, de a doki
döntése nem marad meg: a Kezelések és Terv adatai lap közötti oda-vissza
navigáció (egy normális, gyakori minta — a doki menet közben ellenőrzi egy
módosítás hatását) minden egyes „Terv adatai" lap-elhagyáskor újra
felugrasztja ugyanazt a dialógust.

Ez eltér a testvér, diff-alapú lépés-elhagyási ágtól (amikor a törzsadat
LÉTEZIK, de eltér a draft-tól): az egy `elutasitottDiffId` mezővel
(`components/LepesGuardContext.tsx`) emlékszik az utoljára elutasított
eltérésre, és attól kezdve nem kérdez újra ugyanarra, amíg a diff nem
változik. A törzsadat-HIÁNY ágon (`torzsadat === null`) ilyen memória nincs
— a `skipLetrehozasPrompt()` (`TorzsadatSyncCard.tsx` 149–154. sor) nem ír
semmit a workflow-élettartamú állapotba.

Napi hatás: két páciens/lap közötti gyors ellenőrzési oda-vissza
navigációnál minden egyes alkalommal egy plusz, felesleges kattintást
igényel a doki már megválaszolt kérdésére.

Forrás: `docs/reviews/2026-09-05-doctor-review-nemet-euro.md` 1. megállapítás
(megfigyelt — a persona háromszor futott bele, a fő ügynök önállóan kétszer
egymás után reprodukálta).

## Döntések

### 1. A memória a `LepesGuardContext`/`TervWorkflowShell`-ben él, az `elutasitottDiffId` melletti, önálló mezőként

A törzsadat-létrehozási ajánlat „már eldöntöttem ezen a piszkozaton"
jelzője ugyanabba a state-be kerül, ahol az `elutasitottDiffId` ma él
(`TervWorkflowShell.tsx` — jelenleg `useState<string | null>(null)`, a
`LepesGuardValue`-n (`components/LepesGuardContext.tsx`) keresztül elérve),
NEM a `TorzsadatSyncCard` saját, helyi state-jeként.

**Miért:** a `TorzsadatSyncCard` a `PatientPage` gyereke, és minden
lépésváltáskor (Kezelések ↔ Terv adatai) unmountol — egy ottani helyi state
a következő mountnál elveszne, pontosan a jelenlegi hiba oka. A
`TervWorkflowShell` a workflow teljes életciklusán át (D36) mountolva marad,
ez a meglévő, bevált hely a lépés-elhagyási döntések memóriájára — az
`elutasitottDiffId` már ma is itt bizonyítja a mintát.

Elvetett alternatíva: a jelzőt a `Plan`/piszkozat mezőjeként (pl. a
`DraftMeta`-ban, `piszkozatMeta`) tárolni, hogy reload után is megmaradjon.
Elvetve, mert (a) a testvér `elutasitottDiffId` sem perzisztál reload
után — a review elvárása („amíg a piszkozaton belül") a munkamenet
folytonosságára vonatkozik, nem a böngésző-frissülés túlélésére —, és (b) a
`DraftStorage` szándékosan csak a piszkozat-adat cache-e, nem UI-interakciós
állapot tárolója.

### 2. A memória alakja: boolean, nem azonosító

A diff-ág `elutasitottDiffId: string | null`-jével szemben a
létrehozás-ágnak elég egy egyszerű boolean (pl. „ezen a piszkozaton már
kihagytam a törzsadat-létrehozási ajánlatot").

**Miért:** a diff-ágnál a memóriának tartalma van — melyik KONKRÉT eltérésre
vonatkozott az elutasítás (`diffAzonosito()`), hogy egy ÚJ, eltérő diffnél
újra kérdezzen. A létrehozás-ág mögötti állapot bináris: `torzsadat === null`
igaz vagy hamis, nincs „melyik törzsadat-hiány" tartalom, amit meg kellene
különböztetni. Egy azonosító itt mesterséges bonyolítás lenne felesleges
tartalom nélkül.

Elvetett alternatíva: ugyanazt az `elutasitottDiffId` mezőt túlterhelni egy
speciális, „nincs törzsadat" jelentésű konstans-értékkel (pl. `'__none__'`).
Elvetve — két, fogalmilag különböző dolgot (egy konkrét diff tartalma vs.
egy bináris „már eldöntöttem") egy mezőbe zsúfolna, ami olvashatatlanná és
törékennyé tenné a `handleLepesElhagyas()`-t.

### 3. A jelző kizárólag a kihagyáskor íródik, sikeres létrehozáskor nem szükséges külön kezelni

A `skipLetrehozasPrompt()` (ami mind a „Kihagyás, tovább lépek" gombról, mind
a dialógus Escape/kattintás-kívülre bezárásáról fut, mert az
`onOpenChange={(o) => !o && skipLetrehozasPrompt()}` mindkettőt idehívja)
állítja be a memóriát igazra.

**Miért:** ha a doki a checkbox bejelölésével ténylegesen létrehozza a
törzsadatot (`confirmLetrehozasPrompt()` sikeres ága, ami maga is
`skipLetrehozasPrompt()`-ot hív a végén), a `torzsadat` állapot a
komponensben nem `null` többé — a `handleLepesElhagyas()` `torzsadat ===
null` ága ettől kezdve úgyis ki sem értékelődik, a memória-jelző értéke
irreleváns. Nem kell külön ágat nyitni erre az esetre.

### 4. A memória élettartama megegyezik az `elutasitottDiffId`-ével — nincs új reset-logika

A jelző nem kap saját, a diff-ágtól eltérő élettartam-szabályt (pl. nem
törlődik `patientDir`-váltáskor, nem perzisztál route-kilépés után). Pontosan
ugyanaz a — ma dokumentálatlan, de a diff-ágnál már elfogadott — implicit
szabály vonatkozik rá: amíg a `TervWorkflowShell` mountolva marad (a
`/paciens`/`/terv`/`/elonezet` workflow-n belül maradva), a döntés érvényben
marad; a workflow teljes elhagyása (pl. Kezdőlapra navigálás, majd a
piszkozat később való folytatása) a `TervWorkflowShell` újramountolásával
mindkét memóriát (a régit és az újat is) nullázza.

**Miért:** a review sikermércéje („nem jelenik meg újra ugyanazon a
piszkozaton belül, amíg a doki explicit nem hoz létre törzsadatot vagy nem
indít új tervet") pontosan ezt az élettartamot írja le, és ez már ma is az
`elutasitottDiffId` tényleges, bevált viselkedése — nincs ok két eltérő
szabályt bevezetni ugyanazon a Contexten belül.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- **A diff-ág (`elutasitottDiffId`) viselkedésének módosítása.** Az már ma
  helyesen működik, változatlan marad — ez a tétel csak a testvér-ágat
  hozza fel ugyanarra a szintre.
- **A törzsadat-létrehozási ajánlat szövegének/felépítésének módosítása.**
  Kizárólag a memória hiányát pótolja, a dialógus tartalma és a benne lévő
  checkbox-os „Törzsadat létrehozása most" mechanika változatlan.
- **A `NavGuardContext` (D46) vagy a piszkozat-felülírás-őr (D37)
  bármilyen módosítása.** Ezek külön mechanizmusok
  (`components/LepesGuardContext.tsx` fejléce), ez a tétel egyiket sem
  érinti.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/components/LepesGuardContext.tsx` — a `LepesGuardValue` alakja
  bővül egy, az `elutasitottDiffId`/`setElutasitottDiffId` mintáját követő
  új mezőpárral.
- `app/src/components/TervWorkflowShell.tsx` — az új boolean state és a
  `lepesGuardValue`-t építő `useMemo` bővítése (48., 56–67. sor környéke).
- `app/src/pages/patientPage/TorzsadatSyncCard.tsx` — `handleLepesElhagyas()`
  (177–197. sor) `torzsadat === null` ágának feltétele az új jelzőt is
  figyelembe veszi; `skipLetrehozasPrompt()` (149–154. sor) beállítja azt.
- `docs/03-funkcionalis-spec.md` § 2. „Páciens adatai" „Páciens törzsadata
  (D48)" bekezdése — a lezáráskor pontosítandó azzal, hogy a törzsadat-
  hiány ág is kap egyszeri, piszkozat-élettartamú emlékezetet, a diff-ág
  meglévő mondatának mintáján.

## Tesztelés (irányadó, nem kimerítő)

- Törzsadat nélküli páciens piszkozatán: „Terv adatai" → „Kezelések" →
  „Terv adatai" → „Kezelések" navigáció közben a „Törzsadat létrehozása"
  dialógus a „Kihagyás, tovább lépek" gomb (vagy Escape/kívülre kattintás)
  UTÁN **többször ne** jelenjen meg — a navigáció ezután akadálytalanul
  menjen át mindkét irányban.
- Ugyanezen a piszkozaton, ha a doki ténylegesen létrehozza a törzsadatot
  (checkbox + „Tovább"): a kártya ezután a diff-nézetet mutatja, a
  létrehozási dialógus természetesen többé nem jelenik meg (mert
  `torzsadat !== null`).
- Egy MÁSIK piszkozat (más páciens, vagy a workflow teljes elhagyása és a
  Kezdőlapról való újraindítás) esetén a memória ne öröklődjön át — a
  dialógus az új piszkozaton is megjelenjen első alkalommal.
- A diff-ág (`elutasitottDiffId`) viselkedése változatlan marad — meglévő
  tesztjei (`PatientPage.test.tsx`) zöldek maradnak.
