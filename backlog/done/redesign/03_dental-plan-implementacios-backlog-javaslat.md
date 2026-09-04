# Dental Plan – implementációs backlog javaslat

**Állapot:** 2026-08-18  
**Jelleg:** implementációs backlog-index javaslat a `dental-plan-redesign-dontesek-kategorizalt.md` alapján.  
**Cél:** a D1–D606 döntésekből olyan jól méretezett fejlesztési egységek képzése, amelyek egyenként továbbadhatók backlog-item kidolgozásra, majd implementációra.

> Ez a dokumentum nem új specifikáció és nem írja felül a kronologikus döntési naplót vagy az élő alkalmazásspecifikációt.  
> A részletes source of truth továbbra is a döntési napló és az aktuális élő specifikáció.  
> Az itt szereplő backlog itemek implementációs szeletek.

---

# 1. Javasolt backlog-hierarchia

```text
Capability / nagy funkcionális terület
└── Backlog Item
    └── kapcsolódó D-döntések
```

Egy backlog item akkor tekinthető jól méretezettnek, ha:

- egy konkrét felhasználói vagy domain-képességet ad;
- önmagában implementálható és tesztelhető;
- nincs benne több egymástól független feature;
- több D-döntést is összefoghat;
- lehet explicit dependency-je más backlog itemre;
- nem szükséges benne újra leírni a teljes alkalmazásspecifikációt.

Javasolt minimális backlog-item forma:

```md
### DP-XXX – Rövid cím

Priority: P1
Depends on: DP-YYY
Source: Dxxx–Dyyy

Scope:
- ...
- ...

Out of scope:
- ...
```

A részletes acceptance criteria, technikai feladatok és implementációs terv már a backlog-item kidolgozó workflow része.

---

# 2. Prioritási modell

| Priority | Jelentés |
|---|---|
| **P0 – Enabler** | Más backlog itemek normális implementációját blokkoló alap |
| **P1 – Golden path** | A fő üzleti flow-hoz szükséges: páciens → terv → kezelés → PDF |
| **P2 – Completeness** | Fontos normál működés, adminisztráció, edge case-ek |
| **P3 – Enhancement** | UX-polish, ritkább flow, később is hozzáadható |
| **BACKLOG** | Explicit későbbre tett scope |

A prioritások ebben a dokumentumban implementációs javaslatok, nem új D-döntések.

---

# 3. Application shell / alapok

### DP-001 – Fő navigáció és végleges IA

**Priority:** P0  
**Source:** D1, D35, D46, C1

**Scope:**
- végleges top-level navigáció
- Kezdőlap
- Páciensek
- Kezelések és árak
- Beállítások
- DEMO
- korábbi külön oldalak új IA szerinti elhelyezése

---

### DP-002 – Páciens detail shell és tab-navigáció

**Priority:** P0  
**Source:** D3–D6, D43–D45, D234–D236

**Scope:**
- `Páciens adatai | Kezelési tervek`
- default tab szabályok
- sticky compact patient header
- empty-state / first-plan CTA

---

### DP-003 – Terv workflow shell, breadcrumb és stepper

**Priority:** P0  
**Source:** D11, D36, D38, D40

**Scope:**
- kattintható breadcrumb
- workflow stepper
- `Terv adatai`
- `Kezelések`
- `Előnézet és véglegesítés`
- final után `Terv részletei`

---

### DP-004 – Aktív draft lifecycle és autosave

**Priority:** P0  
**Source:** D21–D22, D37, D148–D153, D165–D169

**Scope:**
- aktív draft modell
- autosave
- autosave státusz
- draft eldobás
- durable final successig draft megtartása

---

### DP-005 – Közös Save/Cancel és dirty-navigation guard

**Priority:** P0  
**Source:** D50, D56, D207, D215

**Scope:**
- edit/save/cancel mintázat
- dirty guard
- write failure utáni state-megőrzés

---

# 4. Páciens flow

### DP-010 – Kezdőlap új struktúrája

**Priority:** P1  
**Source:** D13, D18–D20, D149–D152, D190–D192

**Scope:**
- fő CTA
- aktív draft blokk
- recent páciensek
- continue
- discard draft

---

### DP-011 – Új terv páciensválasztó

**Priority:** P1  
**Source:** D17, D218–D227

**Scope:**
- selector
- live keresés
- recents
- keyboard navigation
- kiválasztás után `Terv adatai`
- `Új páciens` secondary action

---

### DP-012 – Quick Patient létrehozás

**Priority:** P1  
**Source:** D14–D15, D203–D205, D228

**Scope:**
- valódi Patient rekord létrehozása
- minimum mezők
- quick form UX
- meglévő páciens választása duplicate találatból

---

### DP-013 – Páciens-duplikáció felismerés és feloldás

**Priority:** P2  
**Source:** D16, D201, D208, D229–D232

**Scope:**
- intelligens duplicate detection
- suggestion lista
- save-time ellenőrzés
- `Mégis új páciens` flow

---

### DP-014 – Pácienslista és keresés

**Priority:** P1  
**Source:** D29–D31, D193, D218–D221, D233

**Scope:**
- alfabetikus lista
- páciensmezőkre keresés
- kompakt sor
- navigation-only row
- visszatérési search/scroll state

---

### DP-015 – Páciens adatok read-only / edit / full create

**Priority:** P1  
**Source:** D4, D41–D43, D194–D217

**Scope:**
- read-only alapállapot
- explicit Edit/Save/Cancel
- full create
- `Nincs megadva`
- validation
- filesystem write error UX

---

### DP-016 – Páciens master ↔ terv snapshot compare/sync

**Priority:** P2  
**Source:** D9–D10, D157–D163, D210–D214

**Scope:**
- field-level diff
- explicit master → draft
- explicit draft → master
- fallback state
- write failure kezelése

---

### DP-017 – Páciens törlése

**Priority:** P2  
**Source:** D153–D156

**Scope:**
- törölhetőségi feltételek
- patient-detail overflow action
- confirmation
- quick-created patient viselkedés

---

# 5. Tervlista és lifecycle

### DP-020 – Páciens kezelési terv-lista: chain/version hierarchia

**Priority:** P1  
**Source:** D6, D23–D34, D183–D189, D237–D254

**Scope:**
- chain/version hierarchia
- rendezés
- latest badge
- aktív draft blokk
- expand/collapse szabályok

---

### DP-021 – Új kezelési terv inicializálása

**Priority:** P1  
**Source:** D7, D25–D28, D534–D539

**Scope:**
- új chain
- default cím
- nyelv/pénznem inicializálás
- orvos inicializálás
- páciens snapshot

---

### DP-022 – Új verzió létrehozása

**Priority:** P1  
**Source:** D12, D24, D139, D530, D536, D554

**Scope:**
- latest-only New Version
- előző final snapshot öröklése
- inherited state
- nyitás közvetlenül `Kezelések` lépésre

---

### DP-023 – Másolás új kezelési tervként

**Priority:** P2  
**Source:** D25, D140–D147, D260, D482–D486, D538, D555

**Scope:**
- új chain
- szakmai struktúra másolása
- default-following árlista frissítés
- live patient snapshot
- új default orvos
- copy-warningok

---

### DP-024 – Verzió-szintű akciók és historical warningok

**Priority:** P2  
**Source:** D24, D34, D260

**Scope:**
- latest actions
- historical actions
- PDF
- copy
- latest link
- warningok

---

# 6. Terv workflow – `Terv adatai`

### DP-030 – Terv adatai oldal layout + cím + dátumok

**Priority:** P1  
**Source:** D26–D28, D68–D69

**Scope:**
- stacked layout
- tervcím
- páciens snapshot blokk
- dátumok
- snapshot/master eltérés jelzése

---

### DP-031 – Dokumentumnyelv és pénznem kiválasztása / öröklése

**Priority:** P1  
**Source:** D59, D532–D534, C2–C4

**Scope:**
- HU/DE választás
- HUF/EUR választás
- defaultok
- öröklési szabályok
- draftban módosíthatóság
- finalizáláskor fagyás
- lokalizált számformátum szabályok

---

### DP-032 – Kezelőorvos kiválasztása és öröklési szabályai

**Priority:** P1  
**Source:** D535–D545

**Scope:**
- globális default orvos
- new version öröklés
- inactive doctor fallback
- copy szabály
- finalization hard-block, ha nincs orvos

---

# 7. `Kezelések` editor

### DP-040 – Kezelésszerkesztő oldal alaplayout és fogtérkép

**Priority:** P1  
**Source:** D70–D74, D92–D104

**Scope:**
- editor shell
- top tooth map
- treatment phase layout
- sorok vizuális struktúrája

---

### DP-041 – Kezelési fázisok kezelése

**Priority:** P1  
**Source:** D72–D79, D85–D86, D95–D97, D103

**Scope:**
- fázis hozzáadása
- sorrendezés
- átnevezés
- törlés
- megjegyzés
- üres fázis

---

### DP-042 – Kezelés keresés, quick items és hozzáadás

**Priority:** P1  
**Source:** D84, D99–D101, D107–D111

**Scope:**
- kezelés kereső
- quick/starred lista
- hozzáadás
- kategória- és találati UX

---

### DP-043 – Kezeléssor szerkesztése

**Priority:** P1  
**Source:** D80–D83, D87–D91, D105–D106

**Scope:**
- accordion
- sor szerkesztés
- fog mini-selector
- mennyiség
- megjegyzés
- sorrend / mozgatás

---

### DP-044 – Árlista snapshot és explicit refresh

**Priority:** P2  
**Source:** D114–D122, D135–D147, D493–D514

**Scope:**
- árlista snapshot
- default-following állapot
- manual override állapot
- explicit refresh
- változás összehasonlítás

---

### DP-045 – Többpénznemes listaár / ajánlati ár state

**Priority:** P1  
**Source:** D91, D483–D531, C5

**Scope:**
- HUF/EUR snapshot
- HUF/EUR offered price
- currency switch viselkedés
- null EUR listaár kezelése
- kézi ajánlati EUR ár
- automatikus FX tiltása
- currency-specifikus validity

---

### DP-046 – Egyedi végösszeg

**Priority:** P1  
**Source:** D307–D324, D487+

**Scope:**
- treatment sum
- final total override
- default-follow / manual state
- UX és validáció

---

### DP-047 – Előleg és fennmaradó összeg

**Priority:** P1  
**Source:** D325–D346, D488, D516–D525

**Scope:**
- előleg engedélyezés
- összeg / százalék
- fennmaradó rész
- kerekítés
- validation

---

### DP-048 – Manuális szövegek nyelvi review-ja

**Priority:** P2  
**Source:** D456–D481

**Scope:**
- manual override szövegek
- language mismatch jelzés
- nyelvváltás utáni review
- finalization validity

---

# 8. Preview és finalization

### DP-050 – Preview oldal layout és validation checklist

**Priority:** P1  
**Source:** D38–D39, D602

**Scope:**
- preview page shell
- validation státusz
- blokkosított visszajelzés
- navigáció a hibákhoz

---

### DP-051 – Finalization validation engine

**Priority:** P1  
**Source:** D67, D90, D103, D132+, D404, D525+, D537+, D576+, C8

**Scope:**
- központi finalization validity model
- missing doctor
- missing offered price
- invalid treatment data
- document text empty/whitespace
- `PLACEHOLDER` / `PLATZHALTER`
- egyéb hard-block szabályok

---

### DP-052 – PDF preview generation + invalidation lifecycle

**Priority:** P1  
**Source:** D598–D606

**Scope:**
- preview PDF generálás
- preview state
- adatváltozás utáni invalidálás
- újragenerálás
- preview vs final különválasztása

---

### DP-053 – Atomikus finalization PDF+JSON

**Priority:** P1  
**Source:** D163–D171, C7, C9

**Scope:**
- final PDF generálás
- final JSON mentés
- durable success
- draft törlés csak siker után
- immutable final PDF mint történeti forrás
- historical regeneration tiltása

---

### DP-054 – `Csak ajánlat` mód

**Priority:** P2  
**Source:** D550–D559, D563–D565, D579–D580

**Scope:**
- offer-only state
- UI
- finalization
- dokumentumtartalom szabályok
- öröklés / copy viselkedés

---

# 9. Final `Terv részletei`

### DP-060 – Final terv részletei alapnézet és verziónavigáció

**Priority:** P1  
**Source:** D23, D33–D34, D172–D182

**Scope:**
- read-only final screen
- metadata
- chain/version navigation
- latest/historical actions

---

### DP-061 – Final fázis- és kezeléssor megjelenítés

**Priority:** P1  
**Source:** D173–D178, D278–D306

**Scope:**
- fázisok
- kezelések
- read-only treatment rows
- manual values megjelenítése

---

### DP-062 – Final fogtérkép navigáció

**Priority:** P3  
**Source:** D176, D266–D277

**Scope:**
- fogtérkép
- treatment highlight
- navigációs interakciók

---

### DP-063 – Final pénzügyi összesítés

**Priority:** P1  
**Source:** D307–D346

**Scope:**
- kezelések összege
- végösszeg
- előleg
- fennmaradó rész
- read-only pénzügyi összesítő

---

### DP-064 – Mentett PDF viewer / külön megnyitás

**Priority:** P1  
**Source:** D255–D259, D597–D599

**Scope:**
- mentett final PDF megnyitása
- viewer
- külön megnyitás
- missing PDF hibaállapot

---

# 10. PDF

### DP-070 – PDF page shell: header/footer/page numbering

**Priority:** P1

**Scope:**
- page shell
- header/footer
- oldalszám
- többoldalas dokumentum alapstruktúrája

---

### DP-071 – PDF első oldal: title + patient data + tooth map

**Priority:** P1

**Scope:**
- dokumentumcím
- páciensadatok
- fogtérkép
- első oldali layout

---

### DP-072 – PDF fázisok és kezeléstáblák

**Priority:** P1

**Scope:**
- fázisok
- kezeléstáblák
- `Beavatkozás` oszlopnév
- tördelés
- többoldalas continuation

---

### DP-073 – PDF pénzügyi összesítés

**Priority:** P1  
**Source:** D347, D350–D351, D366–D367, C6

**Scope:**
- `Összesítés`
- `Kezelések összege`
- `Végösszeg`
- előleg
- fennmaradó rész
- stabil két total-soros struktúra

---

### DP-074 – PDF lokalizáció, dátum- és pénzformázás

**Priority:** P1  
**Source:** D436–D441, C4

**Scope:**
- HU/DE szövegek
- dátumformátum
- language-driven number formatting
- currency-driven precision és pénznemjel
- NBSP / nowrap / right alignment

---

### DP-075 – PDF fizetési feltételek és garancia

**Priority:** P2  
**Source:** C7–C9

**Scope:**
- aktuális globális dokumentumszövegek használata
- fizetési feltételek
- garancia
- final PDF-be renderelés

---

### DP-076 – PDF nyilatkozat és aláírásblokk

**Priority:** P1

**Scope:**
- nyilatkozat
- kezelőorvos neve
- külön aláírási blokk
- aláírási terület

---

# 11. Admin / settings

### DP-080 – Kezelések és árak – kezelések listája/editor

**Priority:** P2

**Scope:**
- kezeléslista
- kezelés létrehozás/szerkesztés
- árak
- quick/starred state
- adminisztratív mezők

---

### DP-081 – Kezelések és árak – kategóriakezelés

**Priority:** P2

**Scope:**
- kategóriák
- kategória létrehozás/szerkesztés
- sorrend / kapcsolatok

---

### DP-082 – Beállítások shell + Rendelő

**Priority:** P2  
**Source:** D53–D55

**Scope:**
- settings tab shell
- `Rendelő`
- logó
- alap rendelőadatok

---

### DP-083 – Orvosok adminisztrációja

**Priority:** P1

**Scope:**
- orvoslista
- aktív/inaktív állapot
- default orvos
- create/edit

---

### DP-084 – Dokumentum defaultok

**Priority:** P1  
**Source:** D59–D62

**Scope:**
- default dokumentumnyelv
- default pénznem
- egymástól független defaultok

---

### DP-085 – Dokumentumszövegek HU/DE editor

**Priority:** P2  
**Source:** D573–D596, C7–C9

**Scope:**
- HU/DE dokumentumszövegek
- szerkesztés
- mentés
- aktuális sablon felülírás
- nincs sablonverziózás

---

### DP-086 – Template empty/PLACEHOLDER validáció

**Priority:** P1  
**Source:** C8

**Scope:**
- empty/whitespace felismerés
- `PLACEHOLDER`
- `PLATZHALTER`
- hard finalization block
- navigáció a megfelelő settings oldalra

---

### DP-087 – Tárolás settings + startup gate

**Priority:** P1  
**Source:** D64–D66

**Scope:**
- user-centered storage státusz
- root folder beállítás
- hard startup gate
- nincs további setup wizard

---

### DP-088 – DEMO: Filerendszer + Changelog

**Priority:** P3  
**Source:** C1

**Scope:**
- DEMO oldal
- filerendszer nézet
- changelog / változásnapló
- normál üzleti flow-tól elkülönítve

---

# 12. Explicit későbbi backlog

### BL-001 – Valódi bundle/package funkció

**Priority:** BACKLOG

---

### BL-002 – Patient merge

**Priority:** BACKLOG

---

### BL-003 – Version diff

**Priority:** BACKLOG

---

### BL-004 – Terv közbeni quick HU/DE switch

**Priority:** BACKLOG

---

### BL-005 – Terv közbeni quick HUF/EUR switch

**Priority:** BACKLOG

---

### BL-006 – Digitális aláírás / signature image / signed status

**Priority:** BACKLOG

---

# 13. Javasolt első implementációs hullám – golden path

Az implementációt nem teljes képernyőcsoportok szerint célszerű végezni, hanem mielőbb kialakítani egy teljes end-to-end üzleti flow-t.

Javasolt sorrend:

```text
Application shell
→ Páciens kiválasztás / létrehozás
→ Új terv
→ Terv adatai
→ Kezelések + alap árazás
→ Preview
→ PDF
→ Finalization
→ Final detail
```

Konkrétan:

1. DP-001 – Fő navigáció és végleges IA
2. DP-002 – Páciens detail shell
3. DP-003 – Terv workflow shell
4. DP-004 – Aktív draft lifecycle és autosave
5. DP-011 – Új terv páciensválasztó
6. DP-012 – Quick Patient
7. DP-014 – Pácienslista
8. DP-015 – Páciens adatok
9. DP-021 – Új kezelési terv inicializálása
10. DP-030 – Terv adatai alapoldal
11. DP-031 – Nyelv és pénznem
12. DP-032 – Kezelőorvos
13. DP-040 – Kezelésszerkesztő alaplayout
14. DP-041 – Fázisok
15. DP-042 – Kezelés keresés / hozzáadás
16. DP-043 – Kezeléssor szerkesztés
17. DP-045 – Többpénznemes árazás
18. DP-046 – Egyedi végösszeg
19. DP-047 – Előleg
20. DP-050 – Preview oldal
21. DP-051 – Finalization validation
22. DP-070–DP-076 – PDF capability-k
23. DP-052 – PDF preview lifecycle
24. DP-053 – Atomikus finalization
25. DP-060–DP-064 – Final `Terv részletei`

---

# 14. Második implementációs hullám – completeness

A golden path után:

```text
New Version / Copy
→ snapshot refresh
→ master patient sync
→ duplicate detection
→ language review
→ admin UX
→ ritkább edge case-ek
→ polish
```

Jellemző P2 itemek:

- DP-013 – duplicate detection
- DP-016 – master ↔ snapshot sync
- DP-017 – patient delete
- DP-023 – copy as new plan
- DP-024 – historical actions
- DP-044 – árlista refresh
- DP-048 – language review
- DP-054 – csak ajánlat mód
- DP-075 – PDF fizetési feltételek/garancia
- DP-080–DP-085 – admin UX

---

# 15. Fejlesztési workflow kapcsolat

Javasolt teljes lánc:

```text
D1–D606 kronologikus döntések
        ↓
kategorizált decision index
        ↓
implementációs backlog index (ez a dokumentum)
        ↓
kiválasztott DP backlog item
        ↓
Claude backlog-item kidolgozó skill
        ↓
kidolgozott backlog item
        ↓
Claude Code implementáció
        ↓
implementáció utáni spec-frissítő skill
        ↓
aktuális élő alkalmazásspecifikáció
```

A backlog-index célja ezért nem a specifikáció duplikálása, hanem az implementációs munka **szeletelése, sorrendezése és követhetősége**.
