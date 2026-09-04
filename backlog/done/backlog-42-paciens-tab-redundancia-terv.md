# Backlog 42. tétel — Redundáns fejléc-elemek a páciens-részletoldal tabjain — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md`-be soha ki nem került, a doki visszajelzése
nyomán ugyanabban a körben megvalósult és lezárt 42. tétel döntéseit
rögzíti (`CLAUDE.md` „Backlog-tétel lezárása" — a hatókör a felfedezéssel
egy körben kész lett, nem maradt nyitva).

**Eredet:** a doki a `/paciensek/:patientDir` → `Kezelési tervek` tabon
két elemet jelölt meg screenshoten redundánsként: a `PatientPlanChains`
terv-lánc blokk fejlécében ismételt páciensnevet és a „Páciens adatai"
kereszt-linket. Ellenőriztük, hogy sem a `docs/`-ban, sem a
`backlog/`-ban, sem a `redesign` döntéssorozatban nincs erre
vonatkozó döntés — sőt, `docs/03-funkcionalis-spec.md` § 10 kifejezetten
megerősítette a kereszt-linket, mert a § 5 (Korábbi tervek) szabályait
vette át változtatás nélkül.

## Probléma

A `components/PatientPlanChains.tsx` KÉT hívóhelyű komponens:

1. `pages/PlanHistoryPage.tsx` („Korábbi tervek", `/tervek`) — több
   páciens blokkja áll egymás alatt, a páciensnév a blokk EGYETLEN
   azonosítója, a „Páciens adatai" kereszt-link az EGYETLEN útvonal a
   páciens-részletoldalra.
2. `pages/PatientDetailPage.tsx` (D35, `/paciensek/:patientDir`) —
   EGYETLEN páciens saját oldala, ahol a sticky fejléc (`PatientDetailHeader`)
   már kiírja a nevet, a tabsor (`Páciens adatai | Kezelési tervek`) pedig
   már kínálja ugyanazt a navigációt.

A 30. tétel (D35) a komponenst a `PlanHistoryPage` soronkénti JSX-éből
emelte ki, „KÖLTÖZTETÉS, nem újratervezés" jelleggel — a fejléc
változatlanul jött át a második hívóhelyre is, ahol viszont a névfejléc és
a kereszt-link már csak zajt hordoz, sőt félrevezető: egy második,
halványabb példány azt sugallja, hogy MÁS célra visz, mint a tab.

Ugyanez a mintázat a `PatientEditorPanel.tsx` alján is megvolt: egy
„Korábbi tervek" tükör-gomb, ami a tabsorral azonos váltást kínált.

## Döntések

### 1. Kontextusfüggő fejléc, explicit propon

A `PatientPlanChains` fejléc-elemei kötelező `header: 'standalone' |
'embedded'` propon dőlnek el, alapértelmezés nélkül — a komponens nem
ismerheti, ki hívja (ugyanaz az elv, mint a `PatientEditorPanel`
callback-propjainál). Elnevezés a renderelt ALAK szerint, nem a hívó
azonosítója szerint — ez a kódbázis meglévő konvenciója
(`design/toothChartSvg.ts` `szerep?: 'button' | 'option'`,
`ItemPicker.floating?: 'inline' | 'portal'`).

- `standalone` (`PlanHistoryPage`): páciensnév + „Páciens adatai"
  kereszt-link + „Új terv" (kis, `soft` gomb, mint ma).
- `embedded` (`PatientDetailPage`): csak az „Új terv" (és hiba esetén a
  ⚠ jelzés) — a név és a kereszt-link elmarad. Az „Új terv" itt teljes
  értékű CTA (alap méret, `solid`), mert ugyanezen a tabon a terv nélküli
  páciens üres állapota is ilyen gombot mutat — egy tabon belül a két
  „Új terv" ne nézzen ki kétféleképp.

Az `onNavigateToPatientData` callback emiatt opcionálissá vált, kizárólag
`standalone`-ban hívódik.

### 2. A `PatientEditorPanel` tükör-linkje is megszűnik

A `Páciens adatai` tab alján álló „Korábbi tervek" gomb (és az
`onNavigateToHistory` prop) törlődött — a tabok közti váltás mostantól
kizárólag a tabsoron megy át. A Mégse/Mentés gombpár jobbra igazítva
maradt egyedül a lábsorban.

### 3. A `Korábbi tervek` lista (`/tervek`) változatlan

A `lista`/`standalone` ág — páciensnév, kereszt-link, kis „Új terv" gomb —
szó szerint megegyezik a mai állapottal. Nem tartozott a hatókörbe a
`redesign DP-020` (terv-lánc/verzió hierarchia rendezése) sem, és a
`Korábbi tervek` lista megszüntetése (a redesign IA-ja szerint távlati
cél) sem — az élő fejléce ezért kontextus-kapcsolót kapott, nem törlést.

## Elfogadási kritériumok

- A páciens-részletoldal `Kezelési tervek` tabján a páciens neve
  pontosan egyszer jelenik meg a dokumentumban (a sticky fejlécben), és
  nincs „Páciens adatai" gomb a tab tartalmában.
- A `Páciens adatai` tabon nincs „Korábbi tervek" gomb.
- A `Kezelési tervek` tab „Új terv" gombja teljes értékű CTA (alap méret,
  solid), azonos a terv nélküli páciens üres állapotának gombjával.
- A `Korábbi tervek` listáján (`/tervek`) minden páciensblokk fejlécén
  változatlanul ott a név, a kis „Új terv" gomb és a „Páciens adatai"
  kereszt-link, ami a részletoldalra navigál, a `Páciens adatai` tabbal
  előválasztva.
- `npm run lint`, `npm test`, `npm run build` (`tsc -b`) mind zöld.

## Megvalósítás

`components/PatientPlanChains.tsx` (`header` prop + kontextusfüggő JSX),
`pages/PatientDetailPage.tsx` (`header="embedded"`,
`onNavigateToPatientData` nélkül), `pages/PlanHistoryPage.tsx`
(`header="standalone"`), `components/PatientEditorPanel.tsx`
(`onNavigateToHistory` + gomb törlése). Döntés átvezetve:
`docs/01-attekintes-es-dontesek.md` D44,
`docs/03-funkcionalis-spec.md` § 5 és § 10, `docs/07-felulet-rendszer.md`
§ Komponensek. Lásd git history a részletes commitokért.
