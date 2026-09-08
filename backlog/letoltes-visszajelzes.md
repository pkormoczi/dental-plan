# letoltes-visszajelzes
Type: feature
Source: doctor-review papirrol (2026-09-05), 9. megállapítás
Target: master
Baseline: 99130de7ce17ae1ab60b638e5fc39f16bfaa04f5

## Goal
A Letöltés gombra kattintva a doki a gomb mellett látja: „Letöltve: <a tényleges fájlnév>” — nem a
Letöltések mappában kell találgatnia, mit keressen.

## Current state
Öt néma letöltési pont, mind ugyanabból a névből dolgozik (`app/src/storage/paths.ts`
`buildDownloadFileName`), és egyiken sincs kattintás utáni jelzés:
- `app/src/pages/TervReszleteiPage.tsx:399-416` — `Button asChild` + `<a download>` a sticky fejléc
  gombsorában; a lap üzenet-helye `:427` (`VerzioAkcioUzenet`). A verzióváltás `{ replace: true }`
  navigáció: a fejléc NEM unmountol (a `key` csak a `:472` tartalom-Boxon van).
- `app/src/pages/PreviewPage.tsx:557-574` — sikerképernyő; `:712-724` — előnézet (piszkozat-PDF).
- `app/src/pages/Home.tsx:349-366` — `ImentVeglegesitveKartya`.
- `app/src/components/PatientPlanChains.tsx:166-205` `downloadVersion` — a „⋯ → Letöltés” menüpont,
  programozott `a.click()`; hibái a soronkénti üzenet-helyre mennek (`:635-636`).
- Élő régió meglévő mintája: `app/src/pages/PriceListAdminPage.tsx:461-466` (`VisuallyHidden`
  `aria-live="polite"`, EGY lap-szintű régió — a soronkénti kimondottan ellenpélda) és
  `app/src/components/NumberField.tsx:225-230`: a régió MOUNTKOR a DOM-ban van, csak a szövege vált.
- Nincs toast a repóban, a bevezetése kimondottan elvetett (`uj-paciens-enter-mentes` Decisions).
- Meglévő tesztek: `TervReszleteiPage.test.tsx:530`, `Home.test.tsx:401`,
  `PreviewPage.sikerkepernyo.test.tsx:105`, `demo/OsszesTervSection.test.tsx:612,634`.

## Approach
Egy megosztott visszajelzés-elem `app/src/components/` alatt: mountkor már a DOM-ban lévő
`aria-live="polite"` régió + a látható „Letöltve: <fájlnév>” sor, ami üresen nem foglal helyet.
Mind az öt hívó ezt rendeli a saját gombja / sora mellé, és a `download` attribútumra amúgy is
kiszámolt fájlnevet tárolja el helyi state-ben — a négy `<a download>` egy `onClick`-et kap, a
`downloadVersion` a sikeres `a.click()` után állít. A `buildDownloadFileName` és a fájlnév-konvenció
változatlan.

NEM tartozik ide: az előnézeti letöltés-gombhely LETILTOTT állapotainak feliratai
(`elonezet-veglegesites-gomb-toltes-jelzes` tétele: „Nyomtatvány készül…”, „PDF frissítése…”,
„Elavult PDF”, „Azonosító foglalása…”); a „Megnyitás külön” (ott az új lap maga a visszajelzés); a
fájlnév-konvenció (`belso-kodok-helyett-nevek` fagyasztja); toast-rendszer; valódi `window.print()`.

## Decisions
- A felirat „Letöltve: <fájlnév>” — mert a doki nyelvén ez a kész tény, és a fő kérdésére (mit
  keressek?) a fájlnév válaszol. Kimondott vállalás: a böngésző nem árulja el, hogy a fájl valóban
  lemezre került (Mentés másként, megszakítás), tehát a szó többet állít, mint amit tudunk; nem
  „Letöltés indítva”, mert körülményesebb és ugyanazt a fájlnevet adja.
- A felirat marad, amíg új dolog nem történik (lapváltás, új letöltés, verzióváltás), nincs
  időzítő — mert a jelentett helyzetben (páciens az asztal túloldalán) egy pár másodperces villanás
  pont akkorra tűnik el, mire a doki visszanéz. Ezért a `useMentesJelzo` itt NEM használható, pedig
  kézenfekvő lenne.
- Terv részletei: a felirat a `versionDir` váltásakor ürül — mert a verzióváltás `{ replace: true }`
  navigáció, a fejléc nem unmountol, és különben egy MÁSIK verzió fájlneve maradna a képernyőn.
- A verziósoros hívónál a látható sor a meglévő soronkénti üzenet-helyre kerül, de a bemondás EGY
  lap-szintű élő régió — mert a soronkénti `aria-live` a `PriceListAdminPage` kimondott ellenpéldája;
  és nem a `jelezHiba` csatornán, mert az hiba-csatorna, nem sikerjelzés.
- A fájlnév `t.mono` szedéssel — mert a doki karakterről karakterre veti össze a Letöltések mappa
  tartalmával; a sikerképernyő mappaútvonala már így szedett.
- Nincs animáció — így a `prefers-reduced-motion` ága sem kell.

## Verification
- [ ] tests — mind az öt letöltési ponton: kattintás után a gomb mellett megjelenik a „Letöltve:
      <fájlnév>”, a fájlnév a `download` attribútummal azonos; a felirat magától nem tűnik el; a
      Terv részletein verzióváltás után nem marad ott az előző verzió fájlneve; a letiltott
      Letöltés-gomb ágai és a meglévő hibaüzenetek változatlanok
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css — a felirat kontrasztja, és hogy a sticky fejléc nem ugrik meg tőle
