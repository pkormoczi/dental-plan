# Backlog 45. tétel — Beállítások oldal tabosítása — döntési összefoglaló

Ez a fájl a `backlog/BACKLOG.md`-be soha ki nem került, a doki kérése
nyomán ugyanabban a körben megvalósult és lezárt 45. tétel döntéseit
rögzíti (`CLAUDE.md` „Backlog-tétel lezárása" — a hatókör a felfedezéssel
egy körben kész lett, nem maradt nyitva).

**Eredet:** a doki a Beállítások oldalt a `PatientDetailPage.tsx` tab-
mintájára akarta átalakítani, három tabbal (Rendelő adatai [+ Orvosok],
Nyomtatványok, Egyéb), és a nem konfigurálható Logó szekció eltávolítását
kérte.

## Probléma

A `SettingsPage.tsx` öt egymás alatti `Card`-ból állt (Rendelő adatai,
Orvosok, Ajánlat és nyelv, Nyomtatvány szövegei, Logó), **két, egymásnak
ellentmondó mentési modellel**: a rendelő-mezők és az ajánlat-beállítások
minden leütésre mentődtek (`patch()` → `saveSettings()`, D31), az alsó
„Mentés" gomb viszont kizárólag az Orvosok textareát commitolta — ami
`onBlur`-ra amúgy is megtörtént. A gomb gyakorlatilag no-op volt, miközben
azt sugallta, addig semmi sincs mentve. Csak a „Nyomtatvány szövegei" volt
valódi dirty-követett szerkesztő (D38).

A `settings.logoFajl` mező az egész appban KIZÁRÓLAG ez a Card-ja olvasta
— a PDF (`pdf/TervDocument.tsx`) és a `NavBar.tsx` egy statikus
`assets/logo.png` importot használ, nem a beállítást. A mező holt adat
volt.

## Döntések

### 1. Három tab, eltérve a `backlog/redesign/` javaslattól

`Rendelő adatai | Nyomtatványok | Egyéb`, nem a
`backlog/redesign/01_dental-plan-redesign-dontesek.md` D53-ban javasolt
`Rendelő | Orvosok | Dokumentum | Tárolás`. Az Orvosok ma egy 3 soros
textarea — saját tabot csak egy jövőbeli, accordionos szerkesztő (a
redesign-javaslat D57/D58) után érdemel. A `Tárolás` a 2. fázis
(FileSystemStorage) tartalma, ma üres lenne. A redesign-D55 („Logo a
Rendelő beállításokhoz tartozik") ezzel tárgytalanná vált — a logó
teljesen törölve, nem áthelyezve.

### 2. Minden tab pufferelt draft + explicit Mentés/Mégse (D49)

A leütésenkénti autosave (D31) ezen a lapon megszűnt — mindhárom tab a
meglévő `useDirtyDraft` primitívet használja, a `PatientEditorPanel.tsx`
mintáján. A Rendelő adatai és az Egyéb tab Mégse gombja azonnali (nincs
megerősítés, csak a látható mezőket veszíti el); a Nyomtatványok Mégse
gombja megerősítést kér, változatlanul (mindkét nyelv piszkozatát elveti
egyszerre).

Tudatosan elfogadott regresszió: korábban egy F5/böngésző-„vissza" sosem
veszejtette el a rendelő-mezőket (leütésenként mentődtek); pufferelt
mentés után igen — a D46 guard csak a NavBar-kattintást fogja el, a
`HashRouter` miatt az F5-öt és a vissza-gombot nem. Nem épült hozzá
piszkozat-cache: ezek rövid mezők, a doki gyakorlatilag egyszer tölti ki
őket. A hosszú sablonszövegeknek ezért van cache-ük (`dp:sablon-
piszkozat`), a rendelő-adatoknak nem.

### 3. Egyetlen közös `dirty` state a lapon

A Radix `Tabs.Content` unmountolja az inaktív tabot, tehát egyszerre csak
egy tab draftja él — a `SettingsPage.tsx` egyetlen `dirty` state-et tart,
amit a mindenkori aktív tab tölt fel egy `onDirtyChange` callbacken át.
Ez illeszkedik a `NavGuardContext` egy-boolean invariánsához (egyszerre
kizárólag egy D38-védett felület lehet mountolva).

### 4. Tab-váltás dirty állapotban mindig elveti a piszkozatot

A `PatientDetailPage.tsx` mintáját követve: `requestTab(next)` a
megosztott `useDiscardGuard`-on át kér megerősítést, és megerősítés után
a piszkozat ténylegesen elvész (nem marad meg háttérben). A Nyomtatványok
tab `dp:sablon-piszkozat` cache-ét emiatt a SHELL explicit törli
(`clearAllTemplateDraftCache()`, `pages/settings/NyomtatvanyokTab.tsx`
exportja) a tab-váltás előtt, ha a most elhagyott tab a Nyomtatványok
volt — különben egy F5 a tab-váltás UTÁN visszahozná a már elvetett
szöveget. Ezt a törlést kifejezetten a shell-triggerelt tab-váltás/
NavBar-navigáció végzi, NEM egy React unmount-cleanup — egy unmount-alapú
törlés nem tudná megkülönböztetni a valódi tab-váltást egy teljes
lap-újramountolástól (pl. teszt-szimulált F5), ahol a cache-nek épp
TÚL kell élnie.

### 5. Az „Egyéb" tab a saját draftjából olvas, nem a mentett állapotból

A „Német tartalom készültsége" blokk a német engedélyezés még-nem-mentett
draft-értékén jelenik meg (bepipálásra azonnal látszik), és a
`nyilatkozat-de` sablont saját maga tölti be a `useStorage()`
`loadLatestTemplateByBase`-jén át — nincs megosztott state a
Nyomtatványok taggal, a két tab független marad.

### 6. Logó szekció teljes törlése

A `Card`, a `Settings.logoFajl` típusmező, a seed és a három
teszt-fixture is törölve — nincs `schemaVersion`-emelés, a régi
`beallitasok.json`-ökben esetleg maradó kulcsot a betöltő figyelmen kívül
hagyja.

## Elfogadási kritériumok

- A Beállítások oldal a `Rendelő adatai` tabon nyílik, három tab látszik.
- Minden tabnak saját Mentés/Mégse gombpárja van; nincs oldal-szintű
  globális „Mentés" gomb.
- Tab-váltás vagy NavBar-navigáció nem mentett módosítással megerősítő
  dialógust nyit; megerősítés után a piszkozat elvész.
- A Nyomtatványok tab elvetéses tab-váltása törli a `dp:sablon-piszkozat`
  cache-t is.
- Sehol nem látszik „Logó" szekció; a NavBar-logó és a generált PDF
  logója változatlan.
- `npm run lint`, `npm test`, `npm run build` (`tsc -b`) mind zöld.

## Megvalósítás

`pages/SettingsPage.tsx` (héj: `Tabs` + megosztott `dirty` + guard +
dialógus), `pages/settings/RendeloTab.tsx`, `pages/settings/
NyomtatvanyokTab.tsx` (a korábbi „Nyomtatvány szövegei" logika
változatlanul, plusz a `clearAllTemplateDraftCache` export),
`pages/settings/EgyebTab.tsx`. Törölve: `domain/types.ts`
`Settings.logoFajl`, `storage/seed/settings.ts`, három teszt-fixture
(`domain/piszkozat.test.ts`, `domain/planCopy.test.ts`,
`domain/ujVerzioDatum.test.ts`). Döntés átvezetve:
`docs/01-attekintes-es-dontesek.md` D49, `docs/02-domain-modell.md`
`beallitasok.json` séma, `docs/03-funkcionalis-spec.md` § 7,
`docs/07-felulet-rendszer.md` § Komponensek (D38 hívó felületek + Fülek
szabály). `pages/PreviewPage.tsx` prózahivatkozása a régi „Nyomtatvány
szövegei" névre átírva „Nyomtatványok"-ra. Lásd git history a részletes
commitokért.
