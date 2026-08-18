# Backlog 38. tétel — Pácienslista és keresés — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md` 38. tételének megvalósítási döntéseit
rögzíti, implementáció-indításhoz. Nem tartalmaz kódot vagy
függvényszignatúrákat — az implementáció módja és a részletek kidolgozása
a megvalósító feladata.

**Eredet:** ez a tétel a `backlog/redesign/` redesign-döntéssorozat DP-014
szelete. Szintézis a redesign-interjú D-döntéseiből. Az itt hivatkozott
`D29`–`D31`/`D193`/`D218`–`D221`/`D233` a redesign saját D1–D606
számozásából valók — NEM azonosak a `docs/01-attekintes-es-dontesek.md`
D-táblájával.

**Függőség:** ez a tétel a 30. tétel (DP-002, Páciens detail shell)
egyesített páciens-részletoldalára navigál a sorkattintáskor — a 30.
tétel elkészülte előfeltétele ennek. A 30. tétel saját 9. döntése
KIFEJEZETTEN erre a tételre halasztotta a lista navigation-only-vá
alakítását.

## Probléma

A `PaciensekPage.tsx` lista MÁR MA is:
- alfabetikus (`.sort((a, b) => a.nev.localeCompare(b.nev))`,
  `:113` — **D30 MÁR TELJESÜL**);
- kizárólag névre keres (`p.nev`, `:111–112` — **D29 MÁR TELJESÜL**,
  csak a redesign D31 szerint DOB/telefonra is bővülnie kellene).

Ami HIÁNYZIK/ELTÉR:
- **A sorok NEM navigation-only** — kattintásra HELYBEN kinyílnak, a
  `PatientEditor`-t megjelenítve (`requestToggle`/`applySwitch`,
  `:155–180`) — ez pontosan az a viselkedés, amit a 30. tétel a saját
  hatóköréből kivett és IDE utalt.
- **A sor tartalma ma csak név + egy státusz-szöveg** (`:302–314`) —
  nincs DOB, nincs telefon, nincs "kivétel-badge".
- **Nincs scroll/search-state megőrzés** navigáció után-vissza — az
  egyetlen meglévő "visszatérés"-mechanizmus egyszeri, `location.state`-
  alapú (`:209–226`), csak a Korábbi tervekről érkező kereszt-linkre,
  nem általános vissza-navigációra.

## Döntések

### 1. Sorok navigation-only: a 30. tétel páciens-részletoldalára

A sor kattintása a MEGLÉVŐ inline-accordion helyett a 30. tétel
(DP-002) egyesített páciens-részletoldalára navigál (`Kezelési tervek`
tab, D234/D5 szerint alapból). A `PatientEditor` MA IS meglévő tartalma
(a mezők, Save/Cancel, dirty-guard) NEM törlődik — a 30. tétel már
kiemelte egy megosztott komponensbe (`backlog-30` 3. döntése); ez a
tétel csak a LISTA-oldali belépési pontot cseréli inline-accordionról
navigációra.

**Miért:** D193 explicit ezt kéri, és a 30. tétel saját maga jelölte ki
ezt a tételt a tényleges átalakításra (lásd a 30. tétel 9. döntése) — a
sorrend és a felelősség-megosztás konzisztens.

### 2. Kompakt sor: név + DOB + telefon, csak kivétel-badge-ek

A sor MOST már DOB-ot és telefont is mutat (D31), a MEGLÉVŐ státusz-
szöveg ("Rögzített törzsadat"/"Élő adat a legutóbbi tervből"/"⚠ törzsadat
nem olvasható") helyett/mellett: a két NORMÁL állapot (rögzített vagy élő
fallback) egyáltalán NEM kap badge-et — csak a KIVÉTELES, "⚠ törzsadat
nem olvasható" állapot jelenik meg badge-ként.

**Miért:** D31 szövege ("csak kivétel-badge-ek") azt sugallja, hogy a
normál eseteknek nincs szükségük vizuális jelzésre, csak a valóban
kivételesnek — a mai három-állapotú státusz-szöveg közül kettő NEM
kivétel, csak a doki tájékoztatása arról, honnan jön az adat; ezt a
DOB/telefon melletti, halványabb, nem-badge segédszövegre lehet
egyszerűsíteni, ha az implementáló szükségesnek látja, vagy akár teljesen
elhagyható.

### 3. DOB/telefon betöltése: eager, a `PlanHistoryPage` végösszeg-mintájára

A lista MEGJELENÍTÉSKOR (nem soronkénti lusta betöltéssel, mint a mai
`ensureFallbackLoaded`) minden látható páciensre lekéri a szükséges
adatot (`loadPatientData()` vagy a fallback-lánc) a DOB/telefon
megjelenítéséhez — a `PlanHistoryPage.tsx` MÁR BEVÁLT mintáját követve,
ami a korábbi (25. tétel utáni) verziónkénti végösszeg megjelenítéséhez
is minden pácienst/verziót eagerly betölt egy `Promise.allSettled`-del.

**Miért:** a DOB/telefon a KOMPAKT SORBAN (nem csak kinyitva) kell
látszódjon (D31) — ez elkerülhetetlenül minden látható páciensre
betöltést igényel. **Elvetett alternatíva:** a `paciens.json`-t bővíteni
DOB/telefonnal a gyors listázás kedvéért — elvetve, UGYANAZZAL az
indoklással, mint a 37. tétel (DP-013) 1. döntésének elvetett
alternatívája: ez system-of-record-szagú duplikációt vinne egy tisztán
index-fájlba. A mockupban (localStorage) ez a többlet-betöltés
ártalmatlan; a `FileSystemStorage`-váltásnál (2. fázis) újragondolandó —
ugyanaz az elfogadott, dokumentált kompromisszum, mint a `PlanHistoryPage`
végösszeg-betöltésénél.

### 4. Search + scroll state megőrzése route-váltás után-vissza

A pácienslistáról elnavigálva (egy sorra kattintva) és onnan vissza-
navigálva a keresőmező tartalma és a scroll-pozíció megmarad (D233) — ez
egy ÚJ, általános mechanizmus (pl. a lista state-jének megőrzése a
route-history-ban, vagy a `NewPlanPage.tsx`/`PlanHistoryPage.tsx`
meglévő `location.state`-mintájának kiterjesztése), NEM csak a mai
egyszeri, kereszt-link-specifikus eset.

**Miért:** D233 explicit, általános visszatérési garanciát kér, nem csak
a Korábbi tervek-specifikus esetre — ma ez csak azt az egy utat fedi.

## Kapcsolódó, de ebbe a tételbe NEM tartozó dolgok

- A `PatientEditor` (a páciens-részletoldal `Páciens adatai` tabjának
  tartalma) mélyebb viselkedése — 39. tétel (DP-015).
- A 30. tétel (DP-002) páciens-részletoldalának szerkezete — csak
  navigációs célpontként hivatkozik rá (1. döntés).
- Az `utolsoAktivitas`-alapú "recent" rendezés — az NEM ehhez a
  tételhez tartozik, a Pácienslista marad alfabetikus (D30); a
  "recent" fogalom kizárólag a 34./35. tételben (Home, selector) él.

## Érintett helyek (tájékoztató, nem kimerítő)

- `app/src/pages/PaciensekPage.tsx:111–112,155–180,209–226,302–314` — a
  keresés DOB/telefonra bővítése, az accordion-megnyitás cseréje
  navigációra, a kompakt sor tartalma, az általános search/scroll-state
  megőrzés.
- `app/src/domain/paciensAdatok.ts` `megjelenitettTorzsadat()` — reuse a
  kompakt sor DOB/telefon-adatához (3. döntés).

## Tesztelés (irányadó, nem kimerítő)

- A lista minden sora név + DOB + telefon mutat; a normál két
  állapotnak nincs badge-e, csak az olvashatatlan törzsadat állapotnak.
- Egy sorra kattintva a 30. tétel páciens-részletoldalára navigál (nem
  nyílik ki helyben).
- Keresés DOB/telefonra is talál egyezést, nem csak névre.
- Egy sorra kattintás után "vissza" navigálva a keresőszöveg és a
  scroll-pozíció megmarad.
