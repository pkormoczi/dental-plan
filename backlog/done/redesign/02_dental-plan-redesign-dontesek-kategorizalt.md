# Dental Plan redesign – kategorizált döntési index

**Állapot:** 2026-08-18, a `dental-plan-redesign-dontesek.md` D1–D606 döntései alapján  
**Jelleg:** első strukturálási kör – **nem új döntési napló**, hanem a kronologikus döntések oldal-/funkcióalapú indexe.  
**Forrás:** `dental-plan-redesign-dontesek.md` marad a részletes, kronologikus source of truth. Ha egy későbbi döntés explicit módon pontosít/felülír egy korábbit, a későbbi az irányadó.

> Fontos: ebben a fájlban tudatosan vannak átfedések. Egy cross-cutting döntés (pl. nyelv/pénznem, draft lifecycle, finalization) több oldal implementációját is érintheti, ezért több indexben is szerepelhet. Ez nem duplikált döntés, hanem több érintettségi pont.

---

# 1. Teljes alkalmazást / információs architektúrát érintő döntések

## 1.1. Alapelv

- **D1** – Patient-first UI.
- A páciens az elsődleges kontextus; a kezelési tervek a pácienshez tartozó hierarchiában jelennek meg.
- A véglegesített terv külön read-only részletnézetet kap (**D23**, **D40**).

## 1.2. Fő navigáció

- **D35** – felső vízszintes főnavigáció.
- **D46**, C1 feloldás (2026-08-18) – végleges főnav:
  - `Kezdőlap`
  - `Páciensek`
  - `Kezelések és árak`
  - `Beállítások`
  - `DEMO`
- **D2** – a korábbi Home / Patients / Price list / Settings struktúrát D46 finomította.

### Következmény a régi képernyőstruktúrához képest

A redesign alapján **nem marad külön top-level navigációs pontként**:

- `Korábbi tervek` – a páciens `Kezelési tervek` tabjába olvad (**D3, D5, D6, D23, D46**).
- `Árlista admin` – helyette a top-level oldal neve **`Kezelések és árak`**. A C1 feloldás alapján a `Tételek | Kategóriák` elnevezés/tabstruktúra nem része a végleges IA-nak.
- `Filerendszer` – nem önálló üzleti menüpont: a top-level **`DEMO`** oldal alá költözik. Ugyanitt kap helyet a Kezdőlapról eltávolított hosszú changelog/változásnapló.
- **D64 pontosítása C1-ben:** a filesystem továbbra sem normál üzleti funkció; kizárólag a DEMO/fejlesztési felület része.

Ez **származtatott IA-következmény**, nem új D-döntés.

## 1.3. Páciens részletoldal struktúrája

- **D3** – két fő tab: `Páciens adatai | Kezelési tervek`.
- **D5 / D234** – normál páciensmegnyitáskor a `Kezelési tervek` az alapértelmezett tab.
- **D43** – új páciens teljes létrehozása után egyszer a `Páciens adatai` nyílik; későbbi normál megnyitáskor `Kezelési tervek`.
- **D44** – a `Páciens adatai` tabon nincs duplikált új-terv CTA.
- **D45** – üres tervlistán first-plan CTA jelenik meg.

## 1.4. Terv-workflow shell

- **D36** – teljesen kattintható breadcrumb domain-hierarchia + workflow stepper.
- **D11** – a stepper lépései szabadon kattinthatók.
- **D38** – végleges workflow-lépések:
  1. `Terv adatai`
  2. `Kezelések`
  3. `Előnézet és véglegesítés`
- **D40** – sikeres véglegesítés után `Terv részletei`.

## 1.5. Admin-oldalak fő struktúrája

### Kezelések és árak

- **C1 feloldás (2026-08-18):** az oldal/top-level menüpont neve **`Kezelések és árak`**. A korábbi `Tételek | Kategóriák` tabos elnevezés nem irányadó. A tétel- és kategóriakezelési funkciók ezen az oldalon maradnak, de az IA-ban nem külön néven szereplő fő tabokként.

### Beállítások

- **D53** – tabok: `Rendelő | Orvosok | Dokumentum | Tárolás`.
- **D54** – alapértelmezett tab: `Rendelő`.
- **D55** – logó a `Rendelő` tabhoz tartozik.

## 1.6. Tárolási belépési pont és setup

- **D64** – Tárolás: user-centered státusz + mappa; nincs normál UI-ban API/schema/debug/demo filesystem képernyő.
- **D65** – root storage hiánya hard startup gate.
- **D66** – nincs setup wizard a tárolás beállításán túl.

## 1.7. Javasolt végleges oldaltérkép a D1–D606 alapján

```text
App shell
├─ Kezdőlap
├─ Páciensek
│  ├─ Pácienslista
│  └─ Páciens részletei
│     ├─ Páciens adatai
│     └─ Kezelési tervek
│        ├─ tervláncok / verziók
│        └─ Terv részletei (final, read-only)
├─ Kezelések és árak
├─ Beállítások
│  ├─ Rendelő
│  ├─ Orvosok
│  ├─ Dokumentum
│  └─ Tárolás
└─ DEMO
   ├─ Filerendszer
   └─ Changelog / változásnapló

Kontextuális workflow-k / nem top-level menüpontok
├─ Új kezelési terv → páciensválasztó / quick patient
└─ Terv workflow
   ├─ Terv adatai
   ├─ Kezelések
   └─ Előnézet és véglegesítés
```

---

# 2. Kezdőlap

**Fő döntések:** D13, D18–D20, D149–D152, D190–D192.

## 2.1. Tartalom

- **D20** – minimalista: fő CTA + egy aktív draft + 5 recent páciens.
- **D13** – `Új kezelési terv` dedikált páciensválasztóra visz.
- **D149** – aktív draft block startupkor látható.
- **D150** – Continue az utolsó workflow-lépésre visz vissza.
- **D151–D152** – draft eldobás Home-ról overflowból, confirmationnel; Home-on marad.

## 2.2. Recent páciensek

- **D18–D19** – meaningful activity alapján, nem puszta megnyitás szerint.
- **D190** – activity type + idő.
- **D191** – max. 5.
- **D192** – kattintás a páciens `Kezelési tervek` tabjára visz.

---

# 3. Új kezelési terv indítása / páciensválasztó / quick patient

**Fő döntések:** D13–D19, D203–D232.

## 3.1. Selector

- **D17** – üres kereső + recent lista, autofókusz.
- **D218–D225** – univerzális kereső; 2 karaktertől live filter; billentyűzet; relevancia + alfabetikus rendezés; recents 0–1 karakternél.
- **D226** – választás után azonnal `Terv adatai`.
- **D227** – mindig elérhető secondary `Új páciens`.

## 3.2. Quick patient

- **D14** – valódi Patient/paciensId rekord még a terv előtt.
- **D15** – név kötelező; DOB + telefon opcionális, de látható.
- **D228** – Name autofocus; Esc = Cancel.
- **D203–D205** – duplicate esetén meglévő páciens választható; quick-form új értékei ilyenkor eldobódnak; Cancel megtartja a selector keresést.

## 3.3. Duplikációkezelés

- **D16, D201, D208, D229–D232** – intelligens, nem blokkoló duplicate detection; save-time is; max 3 suggestion + expand; `Mégis új páciens` confirmationnel.

---

# 4. Páciensek

## 4.1. Pácienslista

**Fő döntések:** D29–D31, D193, D218–D221, D233.

- **D29** – fő pácienskereső csak páciensmezőkben keres.
- **D30** – alfabetikus lista.
- **D31** – kompakt sor: név / DOB / telefon; csak kivétel-badge-ek; teljes sor kattintható.
- **D193** – navigation-only sorok.
- **D233** – visszatéréskor search + scroll state megmarad.

## 4.2. Páciens részlet – shell és tabok

**Fő döntések:** D3–D6, D43–D45, D234–D236.

- `Páciens adatai | Kezelési tervek`.
- Normál megnyitáskor `Kezelési tervek`.
- Sticky compact patient header: név + DOB + telefon (**D235–D236**).

## 4.3. Páciensadat megjelenítés és szerkesztés

**Fő döntések:** D4, D41–D43, D194–D217.

- Read-only alapállapot; explicit Edit/Save/Cancel.
- Full create: csak név kötelező; egyoldalas dense form (**D194–D200**).
- `Nincs megadva` üres read-only mezőre (**D209**).
- Dirty guard elhagyáskor (**D207**).
- Save filesystem hiba esetén edit state megmarad (**D215**).

## 4.4. Live patient master / fallback / snapshot kapcsolat

**Fő döntések:** D9–D10, D157–D163, D210–D214.

- Nincs automatikus master↔draft sync.
- Mindkét irány explicit, mezőszintű diff alapú.
- Aggregate compare esetén semmi nincs alapból kijelölve; van `Select all`.
- Fallback állapot információs blokkal jelzett.
- Master write failure: Retry vagy Continue.

## 4.5. Páciens törlés

- **D153–D156** – quick-created páciens draft eldobása után is megmarad; törlés csak final terv és aktív draft nélkül; csak patient-detail overflowban; nincs merge funkció.

---

# 5. Páciens → Kezelési tervek / tervláncok és verziók

**Fő döntések:** D6, D23–D34, D183–D189, D237–D254.

## 5.1. Hierarchia

- Tervláncok és verziók közvetlenül látszanak (**D6**).
- Csak latest chain nyitott alapból (**D237**), több chain kézzel egyszerre nyitható (**D250**).
- Egyverziós chain is megtartja a chain→version hierarchiát (**D249**).
- Chain header csak toggle, nem navigáció (**D241**).

## 5.2. Rendezés és státusz

- Chain-ek latest final date szerint (**D186**).
- Latest verzió badge (**D185**).
- Aktív draft külön block a finalizált chain-ek fölött (**D187–D189**).

## 5.3. Verzió-szintű akciók

- **D24** – `Új verzió` csak latestből; historicalból copy + latest link.
- **D34** – latest: primary `Új verzió`, secondary PDF, overflow copy; historical: PDF + copy/latest.
- **D260** – historical copy exact copy továbbra is engedett, de newer esetén warning.

---

# 6. Terv lifecycle: új terv / új verzió / másolás / draft

## 6.1. Fogalmak és CTA-k

- **D7** – `új terv` = új chain; `verzió` = meglévő chain folytatása.
- **D24–D28** – latest-only New Version; copy új chain; címöröklési szabályok.

## 6.2. Új verzió

- **D12** – közvetlenül `Kezelések` lépésre nyit; `Terv adatai` elérhető.
- **D139** – pontos előző snapshotból indul, auto-refresh nélkül.
- **D530** – induló currency az előző finalizált `documentCurrency`; másik state is öröklődik.
- **D536** – orvos öröklés csak aktív orvosnál, különben globális default + info.
- **D554** – offer-only állapot öröklődik.

## 6.3. Másolás új tervként

- **D25, D140–D147, D260, D482–D486, D538, D555**.
- Új chain.
- Szakmai struktúra/manual override-ok másolódnak.
- Default-following árlistaértékek aktuálisra frissülnek (**D140**).
- Aktuális live patient masterből készül új snapshot (**D25**).
- Aktuális globális default orvossal indul (**D538**).
- Offer-only nem öröklődik (**D555**).

## 6.4. Draft lifecycle

**Fő döntések:** D21–D22, D37, D148–D153, D165–D169.

- Pontosan egy aktív draft.
- Új editing task indításakor guard.
- Draftból szabadon ki lehet lépni; autosave megőrzi.
- Autosave státusz látható.
- Durable final successig draft nem törlődik.

---

# 7. Terv workflow – `Terv adatai`

**Fő döntések:** D8, D12, D26–D28, D59–D62, D68–D69, D532–D539.

## 7.1. Oldal szerkezete

- **D68** – stacked sections:
  - cím
  - páciens snapshot
  - dokumentumnyelv
  - pénznem
  - orvos
  - dátumok
- **D69** – snapshot/master eltérés mezőszinten, visszafogottan jelezve.

## 7.2. Tervcím

- **D26** – default: `YYYY.MM.DD – Kezelési terv`.
- **D27** – default cím véglegesíthető, csak soft suggestion a beszédesebb cím.
- **D28** – New Version megtartja chain címét; copy friss default címmel indul.

## 7.3. Nyelv és pénznem

- **D59** – globális defaultok a Dokumentum settingsben, egymástól függetlenül.
- **D532** – currency csak itt módosítható.
- **D533** – dokumentumnyelv csak itt módosítható.
- **D534** – új chain meglévő páciensnél a legutóbbi final terv nyelvét/pénznemét örökli; első terv globális defaultból.

## 7.4. Orvos

- **D535–D539** – új chain globális default orvos; new version aktív előző orvost örököl; copy globális default; default nélkül üresen indulhat, de finalization hard-block.

---

# 8. Terv workflow – `Kezelések`

## 8.1. Oldal alapstruktúra

**Fő döntések:** D70–D74, D92–D104.

- AS-IS kezelésszerkesztő alapelv (**D70**).
- Felső fogtérkép alapból collapsed (**D71**).
- Fázisok egymástól függetlenül nyithatók/csukhatók, több nyitva lehet (**D72–D73**).
- Egyetlen `Fázis hozzáadása` a lista végén (**D74**).
- Terv összegzés csak a fázislista végén (**D92**).
- Friss draft nyitott első fázissal, fókuszált keresővel (**D104**).

## 8.2. Fázisok

**Fő döntések:** D72–D79, D85–D86, D95–D103.

- Fázissorrend ↑↓ (**D75**).
- Fázistörlés confirmationnel; sor törlés immediate + Undo (**D77–D79**).
- Default fázisnév `N. kezelés`, inline szerkeszthető (**D85–D86**).
- Fázismegjegyzés progressive disclosure, mindig páciensnek szól és nyomtatódik (**D95–D97**).
- Üres fázis draftban engedett, finalizationt blokkol (**D103**).

## 8.3. Tételkeresés / gyors tételek / hozzáadás

- **D84** – gyakori tételek AS-IS quick gombok.
- **D99–D101** – fókusz-flow: új tételnél Fog; Enter vissza keresőre; új fázisnál kereső autofókusz.
- **D107** – ugyanaz a tétel többször hozzáadható.
- **D108** – nincs duplicate-row action.
- **D111** – inaktív tétel új tervbe nem választható.

## 8.4. Tételsor mezők és interakciók

**Fő döntések:** D80–D83, D87–D91, D105–D106.

- Custom név finom marker + reset (**D80**).
- Listaár read-only, ajánlati ár editable, eltérés + reset (**D81**).
- Becsült ár inline checkbox (**D82**).
- Mennyiség/fog warning + sync icon (**D83**).
- Leírás `+ leírás`, lokalizált default snapshotból, szerkeszthető (**D87–D88**).
- Fog opcionális, free text + felismerhető fogszámok (**D105–D106**).

## 8.5. Árlista-snapshot és refresh a tervben

**Fő döntések:** D114–D122, D135–D147, D493–D514.

- Árlista-változás nem módosít draftot automatikusan (**D114**).
- Field/row refresh explicit.
- Manual override nem íródik felül (**D115–D117**).
- Row refresh konkrét old→new változásokat és tervhatást mutat (**D120–D121, D506–D513**).
- Árlista-eltéréssel finalizálható, soft warninggal (**D138**).

## 8.6. Egyedi végösszeg és előleg

**Fő döntések:** D93, D307–D346, D487–D525.

- `Kerek végösszeg` → **`Egyedi végösszeg`** (**D312**).
- Custom final lefelé és felfelé is eltérhet; discount/surcharge szemantikával (**D308**).
- Deposit abszolút összeg; 0 canonical disable (**D325–D328, D488, D516–D519**).
- Custom final és deposit pénznemenként külön state (**D487–D489**).
- 0 custom final üzletileg valid, explicit megerősítéssel (**D522–D524**).

## 8.7. Nyelvi review az egyedi/manuális szövegekhez

**Fő döntések:** D456–D481.

- User text nem automatikusan fordítódik.
- Mismatch soft warning + explicit field-level `Nyelv ellenőrizve`.
- Metadata: `authoredInLanguage` + `reviewedForLanguage` (**D478**).
- Guided review valódi editor mezőkhöz navigál, nem duplicate editorhoz (**D467–D470**).
- Reset törli manual override + language metadata state-et (**D481**).

---

# 9. `Előnézet és véglegesítés`

## 9.1. Layout és checklist

- **D38** – desktop: preview bal, checklist jobb.
- **D39** – checklist kompakt read-only összegzés + validation/warningok.
- **D602** – nincs külön `Átnéztem` checkbox; maga a Preview lépés a kontroll.

## 9.2. Hard block / warning témák

Kapcsolódó döntések: **D67, D90, D103, D113, D132–D142, D162–D164, D404, D457–D480, D525–D527, D537, D539, D576–D580**.

Fő csoportok:

- hiányzó business config;
- üres fázis;
- hiányzó offered ár;
- DE név/kategórianév problémák;
- inaktív árlista-tétel;
- patient master diff;
- nyelvi mismatch review;
- invalid deposit/final állapot;
- inaktív/hiányzó orvos;
- hiányzó opcionális dokumentumszöveg.

## 9.3. Finalization tranzakció

- **D163–D164** – finalizationkor újraolvassuk patient mastert és árlistát.
- **D165** – atomikus PDF+JSON mentés; hiba esetén nincs verzió, draft megmarad, partial cleanup.
- **D166** – hiba nem fogyaszt verziószámot.
- **D167** – lock/idempotence; gomb progress alatt disabled.
- **D168–D169** – draft durable final után törlődik; cleanup hiba nem teszi sikertelenné a finalizationt.
- **D170–D171** – PDF nem nyílik automatikusan; egyszeri success banner.

## 9.4. Preview lifecycle

**D598–D606**.

- Draft preview mindig frissen generált; historical final a mentett PDF-et mutat.
- Finalization pontosan az utolsó érvényes preview byte-jait menti (**D600**).
- Preview kötelező gate (**D601**).
- Bármely PDF-et érintő módosítás invalidálja a preview-t.
- Auto-generate belépéskor és minden releváns változásra (**D603**).
- Error: ugyanazon oldalon marad, Retry, Finalize disabled (**D604–D606**).

---

# 10. `Terv részletei` – final read-only nézet

## 10.1. Alapstruktúra

**Fő döntések:** D23, D33–D34, D172–D182.

- Strukturált read-only tartalom + total + fázisok + meta; PDF hangsúlyos (**D33**).
- Sorrend: total → phases → metadata (**D172**).
- Patient name + DOB headerben; teljes historical snapshot lejjebb (**D180**).
- Prev/next + all versions (**D181**); nincs verzió-diff (**D182**).

## 10.2. Fázisok és tételek

**Fő döntések:** D173–D178, D278–D306.

- Fázisok alapból nyitva, collapsible.
- Description alapból hidden; több egyszerre nyitható.
- Offered price elsődleges; list csak eltérésnél secondary (**D282–D285**).
- Stabil unit / qty / row amount oszlopok.
- 4+ fázisnál jump dropdown + scrollspy (**D300–D305**).

## 10.3. Fogtérkép interakció

**D176, D266–D277**.

- Collapsed alapból.
- Read-only navigációra használható.
- Multi-select toggle kattintással.
- Első selection auto-scroll.
- Selection union highlight; local state verzióváltáskor reset.

## 10.4. Pénzügyi summary

**D307–D346**.

- Domináns `Végösszeg`.
- Csak releváns magyarázó sorok.
- Internal UI mutathat discount/surcharge infót, PDF nem (**D308–D309**).
- Deposit/remainder `Fizetés` subgroupban (**D322–D324**).
- Hiányzó listaár esetén nincs partial list sum (**D342–D346**).

## 10.5. PDF a detailben

- **D255–D259** – strukturált rész után embedded native PDF viewer; 70–80vh; `Megnyitás külön` csak top action.
- **D597–D599** – historical template-szövegeket nem rekonstruáljuk külön; missing final PDF esetén hiba, nincs regenerálás.

---

# 11. `Kezelések és árak`

## 11.1. Oldalstruktúra

- **D47** – `Tételek | Kategóriák`, default: Tételek.

## 11.2. Tételek

**Fő döntések:** D48–D50, D109–D131.

- Inline accordion, teljes editor a sor alatt (**D48**).
- Egyszerre egy item editor nyitva (**D49**).
- Explicit Save/Cancel + dirty guard (**D50**).
- Package jelenleg metadata; valódi bundle backlog (**D109–D110**).
- Active/Frequent független (**D112**).
- Tétel nem törölhető, csak deaktiválható (**D123**).
- Inaktív továbbra is szerkeszthető és filterezhető (**D125–D126**).
- Új tétel minimal modal → editor; kezdetben inaktív (**D127–D129**).
- Első aktiválás minimum: HU név + kategória + HUF ár (**D130**).

## 11.3. Kategóriák

- **D51** – kompakt lista + accordion.
- **D52 / D76** – ↑↓ sorrend, explicit mentés + dirty guard.
- **D405** – hiányzó DE kategórianév finom admin jelzés, nonblocking.

---

# 12. `Beállítások`

## 12.1. Közös működés

- **D53–D54** – `Rendelő | Orvosok | Dokumentum | Tárolás`, default Rendelő.
- **D56** – minden tab saját explicit Save/Cancel + dirty guard.

## 12.2. Rendelő

- **D55** – logó ide tartozik.

## 12.3. Orvosok

**D57–D58, D540, D544**.

- Lista + accordion, egyszerre egy nyitva.
- Egy aktív default orvos.
- Default deaktiváláskor másik aktív esetén rögtön új default szükséges; ha nincs másik, explicit warninggal engedett (**D540**).
- Orvos törölhető; historyt a final name snapshot védi (**D544**).

## 12.4. Dokumentum – defaultok

- **D59** – globális nyelv- és pénznem-default, egymástól független.
- **D60** – német mindig támogatott; nincs feature flag.
- **D61** – globális validity default; tervben konkrét valid-to szerkeszthető.
- **D63** – defaultok felül, hosszú template accordions alatta; közös Save/Cancel.

## 12.5. Dokumentum – nyomtatványszövegek szerkesztése

**D566–D574, D588–D594**.

- Közös `Magyar | Deutsch` váltó az összes szöveghez.
- Nem mentett HU/DE form-state megmarad tabváltáskor.
- Egy közös Mentés/Mégse mindkét nyelvre.
- Technikai `Jelenleg: ...md` read-only metadata marad.
- Template mentéskor **nem verziózódik**, aktuális fájl felülíródik (**D573**).
- Egyszerű textarea; nincs rich text/toolbar és nincs külön settings preview.
- Támogatott Markdown subset: paragraph, bold, ul/ol; heading nem támogatott.

## 12.6. Tárolás

- **D64** – user-centered státusz + mappa.
- **D65** – root hiány startup hard gate.
- **D66** – nincs további setup wizard.

---

# 13. PDF / nyomtatvány – tartalmi és layout döntések

## 13.1. Kezelési rész és pénzügyi összegzés

**D347–D381**.

- PDF total blokk stabil struktúrája (**D347**).
- Label `Fizetendő` helyett `Végösszeg` (**D350**).
- `Kezelések összege` egységes label (**D351**).
- Item rowban csak offered unit price + row amount (**D352**).
- Fázisok oldaltörési/folytatási szabályai (**D356–D364**).
- Financial summary keep-together, cím `Összesítés` (**D365–D381**).

## 13.2. Header / footer

**D382–D385, D421–D428**.

- Page1 nagy header; page2+ compact header.
- Compact header: `Kezelési terv · Páciens neve`.
- Footer minden oldalon azonos struktúra; patient name + price-list date + page count.
- Page count folyamatos.
- Footer patient name a plan snapshotból; price-list date immutable historical reference.

## 13.3. Page 1 struktúra

**D386–D406, D429–D433**.

- Custom plan title külön page1 contentben.
- Sorrend: Plan title → Patient Data → tooth map → phases (**D387**).
- Full patient snapshot; üres mező kimarad (**D388–D389**).
- Patient Data két fix szemantikus oszlop (**D431–D433**).
- Tooth map atomikus, cím `Érintett fogak`; nincs blokk, ha nincs felismert fogszám (**D392–D394**).
- Legend csak ténylegesen használt/látható kategóriákból (**D395–D399**).

## 13.4. Fázis és tételtábla vizuális szabályok

**D407–D450**.

- Nincs külön `Kezelések` section title.
- Phase title brand color, background nélkül.
- Table header subtle, background nélkül.
- `Fázis összesen` + `Megjegyzés` lezárási sorrend (**D410–D415**).
- Item descriptions full-width secondary row.

## 13.5. Lokalizáció és formázás

**D403–D404, D434–D455**.

- System static text HU/DE szerint lokalizált.
- User/snapshot text nem fordítódik automatikusan.
- Dátumok dokumentumnyelv szerint.
- Monetáris formázás a dokumentumnyelvet követi (**D436–D441**).
- `Ft` / `EUR` label stabil.
- Default-following plan/phase title lokalizálódik, manual text nem (**D454–D455**).

## 13.6. Aláírás

**D541–D550, D557**.

- Kezelőorvos neve a meglévő aláírási blokkban, nem page1 patient data között (**D541**).
- Csak orvosnév snapshot; nincs signature image/complex doctor snapshot (**D542–D543**).
- Layout AS-IS; Budapest fix; label/date lokalizált (**D545–D549**).
- Aláírás papíron/kézzel; nincs digitális aláírás (**D557**).

## 13.7. Fizetési feltételek / Garancia / Nyilatkozat

**D575–D591**.

- Aktuális globális template kerül a PDF-be finalizationkor.
- Hiányzó Fizetési feltételek/Garancia soft warning; üres szekció teljesen kimarad.
- Offer-onlyban ezek maradnak; csak Nyilatkozat + aláírás marad el.
- Nyilatkozat új oldalon indul; több oldalra törhet; signature block együtt marad.
- Continuation címek `– folytatás`.

---

# 14. `Csak ajánlat` funkció

**D550–D559, D563–D565, D579–D580**.

- Csak az `Előnézet és véglegesítés` képernyőn kis checkbox (**D551**).
- Missing nyilatkozat esetén checked + disabled (**D552**).
- Új terv default false, ha van nyilatkozat (**D553**).
- New Version örökli; Copy New Plan nem (**D554–D555**).
- Toggle azonnal újragenerálja preview-t (**D556**).
- Final offer-only neutral badge a version rowban és detail headerben (**D558**).
- Forced és manual state nincs külön modellben (**D563**).

---

# 15. Nyelv- és pénznemkezelés – cross-cutting funkció

## 15.1. Alapelvek

- **D59** – globális default, tervenként felülírható.
- **D60** – DE mindig támogatott.
- **D89** – nyelvváltás default-following szöveget vált, manual textet nem.
- **D91** – HUF/EUR offered árak külön tárolódnak; nincs FX.

## 15.2. Többpénznemes plan state

**D483–D531**.

- Copy/New Version öröklési szabályok.
- Custom final, deposit, offered unit price és list snapshot currency-specific state.
- `documentCurrency` maga a draft aktuális dokumentumpénzneme; nincs külön view currency.
- Final JSON mindkét currency state-et megőrzi (**D528**).
- Final detail csak a tényleges historical `documentCurrency` nézetét mutatja (**D529**).

## 15.3. Low-priority runtime váltogatás

- **D532** – currency csak `Terv adatai` lépésen; terv közbeni többpénznemes/többnyelvű quick switching nagyon low-priority backlog.
- **D533** – language is csak `Terv adatai` lépésen; nincs global workspace quick switch.

---

# 16. Orvos – cross-cutting funkció

**D58, D535–D545**.

- Globális default aktív orvos.
- New chain global default; New Version előző aktív orvos; Copy global default.
- Inaktív orvosos draft nem finalizálható.
- Orvos finalizationkor név-snapshotként kerül a terv történeti eredményébe.
- Törölt orvos nem rontja a final historyt; aktív draft árva reference esetén orvos nélkülivé válik.

---

# 17. Dokumentumsablonok – cross-cutting funkció

**D560–D596**.

- Tervenként nem szerkeszthető template.
- Draft preview és finalization az aktuális globális template-et használja.
- Nincs HU↔DE fallback a nyilatkozat meglétének ellenőrzésénél (**D565**).
- Template fájl mentéskor nem verziózódik (**D573**).
- A template szöveg **nem kerül snapshotként a `terv.json`-ba** (**D595**).
- Fájlnév/hash/reference sem kerül a terv JSON-ba (**D596**).
- Történeti igazság a mentett final PDF.

---

# 18. Kifejezetten backlog / out-of-scope döntések

- **D109–D110** – valódi bundle/csomag funkció backlog; `package` jelenleg metadata.
- **D156** – nincs patient merge.
- **D182** – nincs version diff.
- **D532** – terv közbeni kényelmi többnyelvű/többpénznemes gyorsváltás low-priority backlog.
- **D557** – nincs digitális aláírás / signature image / `aláírva` státusz.

---

# 19. Explicit későbbi pontosítások / felülírások – gyors index

Az eredeti döntési napló több helyen maga jelöli, hogy későbbi döntés az irányadó. A legfontosabbak:

- **D2 → D46** – fő navigáció véglegesítése.
- **D51 → D76** – kategóriasorrend nyilakkal.
- **D93 → D308–D313** – egyedi végösszeg / előleg jelentésének pontosítása.
- **D174 → D282/D285** – final detail price presentation.
- **D177 → D307+** – final detail financial summary.
- **D315 → D319** – list sum megjelenési feltétel.
- **D325 → D519** – deposit 0 canonical state.
- **D359–D360 → D411** – phase note/subtotal végleges sorrend.
- **D370 → D410** – `Fázis összesen` label.
- **D375 → D412** – phase note AS-IS form.
- **D458/D460/D461 → D477–D479** – language metadata/review modell.
- **D560 → D595** – template JSON snapshot elvetése.
- **D575 → D595** – template historical truth = final PDF.

---

# 20. A korábbi projekt-specifikációkkal talált, implementáció előtt tisztázandó konfliktusok

Ez a szakasz a korábbi specifikációk és a redesign közötti eltéréseket, valamint azok **végleges feloldását** rögzíti. Az itt FELOLDVA jelölt döntések implementációs source of truth-ként kezelendők.

## C1 – Fő IA / külön képernyők — **FELOLDVA 2026-08-18**

A régi `03-funkcionalis-spec.md` külön képernyőként sorolja a `Korábbi tervek`, `Árlista admin`, `Filerendszer`, `Páciensek` nézeteket. A redesign IA **felülírja** ezt, az alábbi pontosításokkal:

- A redesign az új **source of truth** az információs architektúrára.
- Végleges főnav: `Kezdőlap | Páciensek | Kezelések és árak | Beállítások | DEMO`.
- `Korábbi tervek` a páciens `Kezelési tervek` kontextusába olvad.
- Az `Árlista`/`Árlista admin` felhasználói neve **`Kezelések és árak`**; a korábbi `Tételek | Kategóriák` tabos elnevezés nem irányadó.
- A `Filerendszer` képernyő megmarad, de a **`DEMO`** menüpont alá költözik.
- A jelenlegi Kezdőlapon található hosszú changelog/változásnapló szintén a **`DEMO`** oldal alá kerül; a Kezdőlap ezzel visszanyeri a redesign szerinti minimalista szerepét.
- A DEMO oldal fejlesztési/demonstrációs felület, nem normál üzleti workflow.

## C2 – Német feature flag — **FELOLDVA 2026-08-18**

A redesign az irányadó:

- A `nemetEngedelyezve` feature flag megszűnik.
- A dokumentumnyelv mindig választható `Magyar / Deutsch` között.
- A hiányos vagy bizonytalan német tartalom kezelése warning/finalization-validáció kérdése, nem feature availability.
- Egy már létező német terv szerkeszthetősége nem függhet egy később módosított globális engedélyező flagtől.

## C3 – Nyelv/pénznem fagyása vs szerkeszthetőség — **FELOLDVA 2026-08-18**

A redesign az irányadó:

- A nyelv és pénznem a teljes **draft-életciklus alatt módosítható**, kizárólag a `Terv adatai` lépésen.
- A technikai autosave/mentés **nem fagyasztja** ezeket az értékeket.
- A **finalizálás** hozza létre az immutable verzió-snapshotot; finalizált verzióban már nem szerkeszthetők.
- `Új verzió` örökli az előző verzió nyelvét és pénznemét, de az új draftban ezek ismét módosíthatók.
- Runtime quick switch a `Kezelések` oldalon nem része ennek a döntésnek; a szerkesztési hely marad `Terv adatai`.

## C4 – Pénzformátum szabálya — **FELOLDVA 2026-08-18**

A redesign iránya az alap, pontosított felelősség-szétválasztással:

- A **dokumentumnyelv** határozza meg a számok lokalizált elválasztóit:
  - HU: ezres tagolás szóközzel, tizedesjel vesszővel.
  - DE: ezres tagolás ponttal, tizedesjel vesszővel.
- A **pénznem** határozza meg a tizedes pontosságot és a pénznemjelet:
  - HUF: 0 tizedes, `Ft`.
  - EUR: 2 tizedes, `€`.
- Kötelező kombinációk:
  - HU + HUF → `1 234 567 Ft`
  - HU + EUR → `1 234,56 €`
  - DE + HUF → `1.234.567 Ft`
  - DE + EUR → `1.234,56 €`
- A formázás fix, saját formatterrel történik; szerződéses dokumentumon nem használható ad hoc `toLocaleString()`-improvizáció.

## C5 – EUR listaár nélküli tétel — **FELOLDVA 2026-08-18**

A redesign az irányadó:

- `null` EUR listaár **nem tiltja** a kezelés használatát EUR tervben.
- A kezelés továbbra is kereshető és felvehető.
- EUR listaár hiányában a referencia listaár `—` / „nincs megadva” állapotot mutat.
- Az **Ajánlati ár** kézzel megadható EUR-ban.
- Ha az ajánlati EUR ár nincs megadva, az **finalization hard block**.
- Nincs automatikus HUF→EUR árfolyam-átváltás; a kézi EUR ajánlati ár explicit üzleti döntés.

## C6 – PDF összegzés label és szerkezet — **FELOLDVA 2026-08-18**

A redesign az irányadó:

- A PDF összegző blokk stabil szerkezetű: `Kezelések összege` + `Végösszeg`.
- Opcionálisan ez alatt jelenik meg `Előleg` és `Fennmaradó rész`.
- A korábbi `Fizetendő` elnevezés és feltételes összegzési struktúra megszűnik.
- A döntés a **D347/D350/D351** redesign-irányt teszi kötelezővé.

## C7 – Template verziózás — **FELOLDVA 2026-08-18**

- **Döntés:** nincs dokumentumsablon-verziózás.
- A Beállításokban mindig az aktuális HU/DE sablon szerkeszthető; mentéskor az aktuális fájl felülíródik.
- Draft/preview mindig az aktuális sablont használja.
- Finalizáláskor az aktuális sablonból generált PDF immutable módon mentésre kerül; **a finalizált PDF a történeti dokumentum és source of truth**.
- A plan JSON nem tartalmaz `sablonVerzio`-t, sablonszöveget, hash-t vagy sablonfájl-referenciát.
- Régi finalizált terv PDF-jét nem regeneráljuk később az aktuális sablonból; a mentett final PDF elvesztése hibának számít.
- A redesign **D573–D575, D595–D596** felülírja a régi template-verziózási modellt.

## C8 – Placeholder-őr — **FELOLDVA 2026-08-18**

- A régi és a redesign megoldás kombinációja az irányadó.
- Finalizáláskor az adott dokumentumnyelven ténylegesen PDF-be kerülő sablonszöveg hibásnak / nem használhatónak számít, ha:
  - üres vagy csak whitespace karaktereket tartalmaz; vagy
  - `PLACEHOLDER` / `PLATZHALTER` markert tartalmaz.
- Ez **hard finalization block**; a felhasználó egyértelmű hibaüzenetet kap, és a javítás helye a `Beállítások → Nyomtatvány szövegei`.
- Nem vezetünk be külön approval-state-et, jóváhagyási flaget vagy bonyolult fallback mechanizmust.
- A C8 döntés ezen a ponton felülírja a **D564** szűkebb, csak empty/whitespace validációját.

## C9 – Nyilatkozat/fizetési feltételek/garancia történeti forrása — **FELOLDVA 2026-08-18**

A C7-tel konzisztens redesign-modell az irányadó:

- Draft megnyitáskor és preview-nál az **aktuális globális** HU/DE sablonszövegek használódnak.
- Finalizáláskor szintén az akkor aktuális sablonok kerülnek a PDF-be.
- A finalizált PDF ezután immutable; későbbi sablonmódosítás nem változtatja meg a korábbi dokumentumot.
- A terv JSON nem őrzi és nem rekonstruálja a korábbi nyilatkozat/fizetési feltételek/garancia sablonszöveget.
- A történeti tartalom **egyetlen source of truth-ja az adott finalizáláskor elmentett PDF**.
- A döntés felülírja a régi, tervhez pinelt sablonverzió-modellt.

## C10 – `Kezelés` vs `Beavatkozás` PDF oszlopnév — **FELOLDVA 2026-08-18**

- A korábbi **D354** `Kezelés` elnevezését a későbbi **D409** felülírja.
- A PDF oszlop végleges neve: **`Beavatkozás`**.
- A döntési napló kronológiája alapján a későbbi D409 az irányadó; külön üzleti döntést nem igényel.

---

# 21. Következő strukturálási kör

A következő körben ezt az indexet érdemes **implementációs backlog-struktúrává** alakítani:

1. oldalonként `MUST / SHOULD / BACKLOG`;
2. minden oldalhoz route + komponenshatár;
3. az oldalon belüli feature-ök külön alcímként;
4. D-döntés → konkrét acceptance criteria;
5. a fenti C1–C10 konfliktusok lezárása után a régi specifikációk megfelelő fejezeteinek szinkronizálása az új source of truth-tal.

