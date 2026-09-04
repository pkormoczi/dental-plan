# Backlog 33. tétel — Közös Save/Cancel és dirty-navigation guard — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 33. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `redesign` redesign-döntéssorozat DP-005
szelete (`redesign`
3. fejezet). Szintézis a redesign-interjú D-döntéseiből, nem új grill-me
   session. Az itt hivatkozott `D50`/`D56`/`D207`/`D215` a redesign saját
   D1–D606 számozásából valók (`redesign`)
— NEM azonosak a `docs/01-attekintes-es-dontesek.md` D-táblájával (ahol
`D31` egy MÁSIK, már létező döntés, lásd Probléma szakasz).

## Probléma

Ez a tétel NEM egy meglévő, konzisztens minta konszolidálása — feltárás
alapján az app MA három, egymástól eltérő módon oldja meg a "hogyan
szerkesszünk egy mezőkészletet" kérdést, és a `BACKLOG.md`
"KIDOLGOZÁSRA VÁR" szakaszának "Storage-írási minta nincs kikényszerítve"
tétele már ma is jelzi ezt a következetlenséget architektúra-szinten.

- **Árlista admin tétel-/kategória-editor** (`PriceListAdminPage.tsx`
  `ItemEditor`/`KategoriaEditor`) — **tisztán autosave**: minden mező
  (`onChange`/`onValueChange`) azonnal `onPatch`-ot hív, ami
  `savePriceList`-en át ír (`AppState.tsx:339–356`, D31 — az app SAJÁT,
  már lezárt D-táblájának döntése: "a `PlanStorage`-t consuming
  `savePriceList`/`saveSettings` kizárólag updatert fogad… hibára
  SZÁNDÉKOSAN nem gördül vissza"). Nincs Save/Cancel gombpár, nincs
  dirty-fogalom, mert soha semmi nincs "el nem mentve" állapotban.
- **Beállítások** (`SettingsPage.tsx`) — szekciónként eltér: Rendelő
  adatai és Ajánlat és nyelv ugyanúgy tisztán autosave; Orvosok
  blur-commit + egy alsó gomb hibrid; **egyedül a "Nyomtatvány szövegei"**
  szekció rendelkezik valódi dirty-gated explicit Save gombbal
  (`SettingsPage.tsx:186,471`), de Cancel gomb NÉLKÜLE, és navigáció-guard
  nélkül.
- **Páciens-szerkesztő** (`PaciensekPage.tsx` `PatientEditor`) — a
  LEGTELJESEBB meglévő megvalósítás: explicit Save/Cancel
  (`disabled={!dirty}`), dirty-guard `AlertDialog` sor-váltásnál
  (`:155–180,358–387`), és a mentési hiba `catch` ága SOHA nem nyúl a
  `draft` state-hez (`:469–481`) — ez pontosan a D215 által kívánt
  viselkedés.

**A D215-öt kívánó viselkedés ("hiba esetén a szerkesztett állapot
megmarad") MA MINDENHOL teljesül** — de KÉT különböző, egymástól
független ok miatt: az autosave-oldalakon az `AppState.tsx` optimista,
vissza-nem-görgető írási modellje (D31) miatt, az explicit-Save
oldalakon (Sablonok, `PatientEditor`) pedig azért, mert a `catch` ág
egyszerűen nem ír a draft-state-be. **Ez tehát NEM hiányzó viselkedés,
csak nincs mögötte egy közös absztrakció** — három egymástól független
dirty-detektálás (referencia-egyenlőség, `JSON.stringify`-alapú
mély-egyenlőség, mezőnkénti primitív összehasonlítás), és az
`AlertDialog`-ok is másolat-beillesztéssel, egy helyen (`PlanHistoryPage.tsx:64–67`)
explicit el is ismerve kódkommentben ("ugyanaz az AlertDialog, csak
eltérő szöveggel").

A redesign (D50, D56, D207, D215) ezt akarja egy KÖZÖS, újrahasznosítható
mintává tenni.

## Döntések

### 1. Új, megosztott dirty-tracking hook — a `PatientEditor` mintájára

Egy új, megosztott hook (pl. `useDirtyGuard` vagy hasonló elnevezés, egy
közös helyen, pl. `app/src/components/` vagy egy új `app/src/hooks/`
alá) egységesíti a MA háromféleképp megoldott dirty-detektálást. Alap
komparátornak a `PatientEditor` MA IS bevált `JSON.stringify`-alapú
mély-egyenlőségét választjuk (nem a referencia-egyenlőséget, amit az
`AppState.tsx` `vanMentetlenPiszkozat`-ja használ) — ez az egyetlen a
háromból, ami tetszőleges (nem feltétlenül immutable-update mintájú)
mezőkészletre is biztonságosan működik.

**Miért:** a `PatientEditor` a legteljesebb, legjobban bevált
implementáció — nincs ok egy negyedik, saccolt megoldást bevezetni,
amikor van egy már működő minta, amit csak ki kell emelni. **Elvetett
alternatíva:** referencia-egyenlőség alapú hook (az `AppState.tsx`
mintájára) — elvetve, mert az csak akkor helyes, ha MINDEN hívó
garantáltan immutable-update mintát követ (új objektumot hoz létre
minden módosításnál); egy általános, bárhol újrahasznosítható hooknak ezt
nem szabad feltételeznie.

### 2. Új, megosztott "elvetnéd a módosításokat?" dialógus-komponens

A MA ötször (`PaciensekPage.tsx`, `PlanHistoryPage.tsx`, `NewPlanPage.tsx`,
`Home.tsx` — utóbbi három a "piszkozat felülírása" célra, lásd 5. döntés
a határvonalról) másolat-beillesztett `AlertDialog` mintát egy KÖZÖS,
paraméterezhető komponens váltja (cím/leírás/megerősítő-felirat
paraméterekkel), a `docs/07-felulet-rendszer.md` már dokumentált
"Mégse" = `variant="soft" color="gray"` stíluskonvencióját követve.

**Miért:** a duplikáció MA IS tudottan fennálló, egy kódkomment
(`PlanHistoryPage.tsx:64–67`) maga is elismeri — ez pontosan az a fajta
ismétlődés, amit egy megosztott komponens kivált, kódmennyiség-csökkenéssel
és garantált stílus-konzisztenciával.

### 3. Retrofit: `PatientEditor` áttér az új hookra/komponensre, viselkedés bájtra változatlan

A `PaciensekPage.tsx` `PatientEditor`-ja a saját, bespoke dirty-logikáját
és `AlertDialog`-ját az 1–2. döntés szerinti megosztott primitívekre
váltja — tisztán refaktor, a megfigyelhető viselkedés (mikor jelenik meg
a guard, mit csinál a Save/Cancel) nem változik.

**Miért:** ez bizonyítja be, hogy az absztrakció valóban használható —
anélkül, hogy bármilyen látható viselkedést megváltoztatna, tehát
regresszió-biztosan tesztelhető (a MEGLÉVŐ tesztek referenciaként
szolgálnak).

### 4. A Beállítások "Nyomtatvány szövegei" szekció kap egy hiányzó Cancel gombot + navigáció-guardot

Ez az EGYETLEN meglévő Settings-szekció, ami már ma is dirty-gated
explicit Save-et használ — csak a Cancel gomb és a navigáció-guard
hiányzik belőle. Az 1–2. döntés szerinti primitívekkel kiegészül: Cancel
gomb (visszaállítja a draft-ot a mentett állapotra) + guard, ha a doki a
NavBar-on át próbál elnavigálni innen, amíg dirty.

**Miért:** ez a D56 ("minden settings tab saját explicit Save/Cancel +
dirty guard") legkisebb, azonnal elvégezhető szelete — a szekció már 80%-
ban ott van, csak a hiányzó felét kell hozzátenni. **Elvetett
alternatíva:** a TELJES Settings-oldal (Rendelő, Orvosok, Ajánlat és
nyelv) egyszerre átállítása autosave-ről explicit Save/Cancel-re — lásd
5. döntés, miért marad ez KÍVÜL ezen a tételen.

### 5. Az Árlista admin és a Beállítások TÖBBI szekciója NEM vált autosave-ről explicit Save/Cancel-re ebben a tételben

Az Árlista admin tétel-/kategória-editorának, valamint a Beállítások
Rendelő adatai / Ajánlat és nyelv / Orvosok szekcióinak
autosave-mechanizmusa TUDATOSAN VÁLTOZATLAN marad — csak az 1–2. döntés
szerinti megosztott primitívek KÉSZEN állnak arra, hogy ezek a felületek
saját, dedikált redesign-tételükben (Kezelések és árak: DP-080/DP-081;
Beállítások tab-szerkezet: DP-082–DP-085/DP-087) rájuk épüljenek, amikor
azok a tételek amúgy is átalakítják ezeket a felületeket.

**Miért:** az autosave → explicit Save/Cancel váltás ezen a két nagy
admin-felületen NEM egy kis polish, hanem az interakciós modell
alapvető megváltoztatása (minden mezőszerkesztés viselkedése, a `docs/03`
"Sor kinyitása" szakaszának teljes átírása) — ez messze túlmutat egy P0
"enabler" tétel méretén, és pontosan azok a tételek (DP-080/081,
DP-082–087) végzik el amúgy is a felület mélyebb átalakítását, ahol ez a
döntés logikusan a helyén van. **Elvetett alternatíva:** minden felület
egyszerre migrálása ebben a tételben — elvetve, mert szétfeszítené a
tétel méretét, és két, egyébként is tervezett jövőbeli tétel hatókörét
duplikálná.

### 6. A "piszkozat felülírása" (aktív draft overwrite) guardok NEM ehhez a tételhez tartoznak

A `PlanHistoryPage.tsx`/`NewPlanPage.tsx`/`Home.tsx` MEGLÉVŐ "piszkozat
felülírása" `AlertDialog`-jai vizuálisan hasonló mintát követnek, de MÁS
DOMAINT védenek: nem egy KONKRÉT FORM (páciens mezők, sablon szöveg)
el-nem-mentett állapotát, hanem az AKTÍV TERV-DRAFT identitását/
életciklusát — ez a (lezárt) 32. tétel (DP-004,
`docs/03-funkcionalis-spec.md` § Autosave) már formalizált D22
döntésének területe. Ez a tétel NEM nyúl
hozzájuk — a 2. döntés szerinti megosztott dialógus-komponens
STÍLUSMINTÁKÉNT rendelkezésre áll, ha egy jövőbeli módosítás úgy dönt,
hogy átállítja őket rá, de ez nem ennek a tételnek a feladata.

**Miért:** a kettő összemosása visszanyitná a már lezárt 32. tétel
hatókörét, és két, formálisan külön domain (form-dirty vs. draft-identitás)
egy tételbe kerülne, ami sérti a "ne legyen benne több egymástól
független feature" elvet.

### 7. Nincs valódi böngésző-szintű route-navigáció blokkolás

Ez a tétel NEM vezet be `beforeunload`-alapú vagy React Router
`useBlocker`-alapú, tényleges cross-route navigáció-blokkolást (pl. a
NavBar-kattintás elfogása). A "dirty guard" hatóköre: (a) a Save/Cancel
gombpár Cancel ága, és (b) az azonos oldalon belüli elem-váltás (pl.
`PatientEditor` sor-váltása, Sablonok nyelv-váltása) — pontosan az, amit
a MEGLÉVŐ implementációk ma is csinálnak.

**Miért:** sem D50, sem D56, sem D207 szövege nem kér explicit
böngésző-szintű navigáció-blokkolást, és ma sehol nincs ilyen (`grep`-pel
megerősítve nulla találat `beforeunload`/router blocker-re) — egy ilyen,
jelentősen nagyobb feature bevezetése nem indokolt a meglévő D-döntések
alapján.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- Az Árlista admin (Kezelések és árak) tétel-/kategória-editor
  autosave→explicit Save/Cancel átállítása — redesign-javaslat
  DP-080/DP-081 (lásd 5. döntés).
- A Beállítások Rendelő adatai / Ajánlat és nyelv / Orvosok szekcióinak
  autosave→explicit átállítása, és a Beállítások tab-szerkezetének
  (`Rendelő | Orvosok | Dokumentum | Tárolás`, D53) kialakítása —
  redesign-javaslat DP-082–DP-085/DP-087 (lásd 5. döntés).
- A "piszkozat felülírása" aktív-draft-overwrite guardok — 32. tétel
  (DP-004), már lezárt terület (lásd 6. döntés).
- Valódi böngésző-/router-szintű navigáció-blokkolás — lásd 7. döntés,
  nincs ilyen D-döntés által kért igény.
- D215 "újraépítése" — SZÁNDÉKOSAN nem történik, mert a viselkedés MÁR MA
  mindenhol teljesül (lásd Probléma szakasz); ez a tétel csak egy közös
  absztrakció ALÁ hozza a már működő viselkedést a `PatientEditor`
  retrofitjával (3. döntés), nem változtatja meg magát a viselkedést.

## Érintett helyek (tájékoztató, nem kimerítő)

- Új `app/src/components/useDirtyGuard.ts` (vagy `app/src/hooks/`) — a
  megosztott dirty-tracking hook (1. döntés).
- Új `app/src/components/DiscardChangesDialog.tsx` (vagy hasonló
  elnevezés) — a megosztott "elvetnéd a módosításokat?" `AlertDialog`
  wrapper (2. döntés).
- `app/src/pages/PaciensekPage.tsx:155–180,358–387,460,469–481,602–616` —
  a bespoke dirty-logika és `AlertDialog` cseréje az új primitívekre
  (3. döntés).
- `app/src/pages/SettingsPage.tsx:186,397–476` — Cancel gomb + navigáció-
  guard hozzáadása a "Nyomtatvány szövegei" szekcióhoz (4. döntés); a
  többi szekció (`:235–249,277–395`) VÁLTOZATLAN marad.
- `docs/07-felulet-rendszer.md` — lezáráskor egy rövid szakasz a most
  szabvánnyá vált Save/Cancel + dirty-guard mintáról, a meglévő "Mentés +
  Mégse gombpár" konvenció (`:100–106`) kiegészítéseként.

## Tesztelés (irányadó, nem kimerítő)

- `PatientEditor`: a retrofit UTÁN a meglévő viselkedés (Save/Cancel
  disabled-állapota, sor-váltási guard, mentési hiba esetén megmaradó
  draft) bájtra ugyanaz, mint előtte — regressziós teszt a MEGLÉVŐ
  tesztkészletre hivatkozva.
- Beállítások "Nyomtatvány szövegei": a Cancel gomb visszaállítja a
  mentett szöveget; NavBar-on át elnavigálva dirty állapotból megjelenik
  a guard; a többi Settings-szekció (Rendelő, Orvosok, Ajánlat és nyelv)
  viselkedése VÁLTOZATLAN (autosave, nincs guard).
- Árlista admin tétel-/kategória-editor viselkedése VÁLTOZATLAN
  (autosave, nincs Save/Cancel, nincs guard) — regressziós teszt, hogy
  ez a tétel nem érintette.
- A "piszkozat felülírása" dialógusok (`PlanHistoryPage`, `NewPlanPage`,
  `Home`) viselkedése VÁLTOZATLAN — regressziós teszt, hogy ez a tétel
  nem nyúlt hozzájuk.
- Az új megosztott hook különböző (nem csak `Plan`-szerű) mezőkészleteken
  is helyesen működik — legalább két független hívó (`PatientEditor`,
  Sablonok szekció) egyszerre bizonyítja az újrahasznosíthatóságot.
