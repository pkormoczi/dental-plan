# 55. tétel — „Új terv indítása": új páciens felülre, kereső alulra (D55)

## Probléma

Az `/uj-terv` köztes páciensválasztón (`app/src/pages/NewPlanPage.tsx`) az
új-páciens ág a kereső kártya ALATT állt, `size="3" variant="soft"
color="gray"` stílussal — pontosan azzal a stílussal, amit a projekt a
„Mégse"/másodlagos akcióra tart fenn (`docs/07-felulet-rendszer.md`), és
amivel a kártyán belüli találati sorok is rajzolódtak. A képernyőnek emiatt
nem volt vizuális elsődleges akciója, és az olvasási sorrend (keresés előbb,
új páciens utóbb) fordítottja volt a doki tényleges döntési sorrendjének
(előbb dönt új vs. visszatérő páciensről, utána a konkrét személyről).

## Döntés

| Kérdés | Döntés |
|---|---|
| Sorrend | fejléc → bevezető → `+ Új páciens` → „vagy" elválasztó → kereső kártya |
| Gomb stílusa | a `PaciensekPage.tsx`-szel szó szerint azonos: `<Button>` prop nélkül (solid, `ink`), default `size="2"` |
| Gomb felirata | `+ Új páciens` (a `+` szövegkarakter, a meglévő projektminta) |
| Gomb kerete | csupasz gomb a kártya fölött, nincs saját `Card` körülötte |
| „vagy" | vonalas elválasztó: `Separator` — `vagy` — `Separator` |
| Bevezető mondat | átírva új-páciens-először sorrendre |
| Kártyán belüli `Új páciens: „X"` no-match opció | változatlan |
| Mindig látható | igen, a keresés állapotától függetlenül |
| Előtöltés | a felső gomb üres dialógust nyit; előtöltés csak a no-match opcióé |

## Elvetett alternatívák

- **`+ Vadonatúj páciens` felirat** (a régi jelző megtartásával) — elvetve:
  a doki kifejezetten a Páciensek oldal gombjával SZÓ SZERINT azonos
  feliratot kért, hogy a két képernyő azonos akciója felismerhető legyen.
  Ez ütközött a `docs/03` feliratrendszerével (az „új terv" fogalom kötelező
  jelenlétével a feliratban) — ezt a szabályt oldottuk fel egy kimondott
  kivétellel, nem a feliratot módosítottuk.
- **A gomb saját kártyában, a kereső párjaként** — elvetve: két egyenrangú
  doboz vizuálisan túlsúlyozta volna a képernyőt; a csupasz, solid gomb
  önmagában elég vizuális súlyt hordoz elsődleges akcióként.
- **A no-match „Új páciens: „X"" opció törlése** — elvetve: más a szerepe
  (a már begépelt nevet viszi át, nem kell újragépelni), és ezen áll a
  gépel → nyíl → Enter/Esc billentyűzet-ciklus (`docs/07-felulet-rendszer.md`
  „Billentyűzet").
- **`size="3"`, nagyobb gomb** — elvetve: a solid kitöltés önmagában elég
  vizuális súlyt ad, a `PaciensekPage.tsx`-szel való szó szerinti azonosság
  (beleértve a méretet is) fontosabb szempont volt.

## Hatás

- `app/src/pages/NewPlanPage.tsx` — JSX-átrendezés, új `Separator` import.
- ~30 teszt-hívási hely mechanikus rename-je (`'Vadonatúj páciens'` →
  `'+ Új páciens'`) a `NewPlanPage.test.tsx`, `PreviewPage.test.tsx`,
  `PatientPage.test.tsx`, `PlanEditorPage.test.tsx`, `App.test.tsx` fájlokban
  — a `DemoStorage.test.ts` és `PaciensekPage.test.tsx` páciensnév-literáljai
  (`'Vadonatúj Páciens'`/`'Vadonatúj Elemér'`) érintetlenek maradtak.
- `docs/01-attekintes-es-dontesek.md` — új D55 sor, D40 pontosítva, D41/D37
  „Vadonatúj páciens" idézetei frissítve.
- `docs/03-funkcionalis-spec.md` — § „Új terv indítása" felsorolás-sorrendje
  megfordítva, a belépési pont táblázat és a feliratrendszer kivétellel
  bővült, § 9 kereszthivatkozás frissítve.
- Forráskód-kommentek (`TervWorkflowShell.tsx`, `AppState.tsx`,
  `UjPaciensDialog.tsx`) frissítve.

## Kézi teszt-terv

1. `/uj-terv`: fejléc → bevezető → **`+ Új páciens`** (sötét, kitöltött
   gomb, azonos a Páciensek oldal gombjával) → **„vagy"** vonalas
   elválasztó → kereső kártya.
2. Belépéskor a kurzor a keresőmezőben villog (autofókusz megmaradt).
3. Gépelj 2+ karaktert egy létező páciens nevéből → `↓`/`↑`/`Enter`/`Esc`
   ciklus egérhasználat nélkül végigmegy.
4. Nem létező név begépelése → a kártyán belül `Új páciens: „…"` opció,
   `Enter` a begépelt névvel előtöltve nyitja a dialógust.
5. A felső `+ Új páciens` gombra kattintva a dialógus ÜRESEN nyílik;
   Mégse/Escape a keresőszöveget megtartva a választón hagy.
6. Mentetlen piszkozattal a felső gomb megnyomása a „Piszkozat felülírása"
   megerősítést a dialógus megnyílása ELŐTT futtatja le.
7. `Shift+Tab` a keresőmezőből a `+ Új páciens` gombra visz, látható
   fókuszgyűrűvel.
8. Üres páciens-lista mellett (DEMO → Adatkezelés → törlés) a felső gomb
   továbbra is látszik és működik.

**Automatikus ellenőrzés:** `npm run lint`, `npm test` (1198/1198 zöld),
`npm run build` — mind lefutott, hibátlanul.
