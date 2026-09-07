# uj-terv-kiemelt-elso-sor
Type: feature
Source: doctor-review elso-megnyitas (2026-09-05), 8. megállapítás
Target: master
Baseline: 91ec04fbaebebb5447c971aa60aa0a323d8626db

## Goal
Az „Új terv indítása” lapon üres keresővel egyetlen sor sincs kiemelve, és az Enter nem indít
tervet senkinek; az első leütés vagy az első nyíl után a kiemelés és a ciklus a megszokott.

## Current state
- `app/src/pages/NewPlanPage.tsx`: `hi` kezdőértéke 0 (33. sor); `useEffect(() => setHi(0), [q])`
  (96.); az Enter-ág `hi < listaTetelek.length` esetén `akciok.inditas({ kind: 'ujTerv' })`-t hív
  (161-165.); a kiemelés `i === hi`-re `t.accentWash` + `inset 3px 0 0 t.accent` (273-274.,
  a no-match „Új páciens” pszeudó-opción 300-301.); `onMouseEnter` is `setHi`-t hív (267., 296.).
- Üres keresőnél a lista `legutobbAktivPaciensek(patients, UJ_TERV_RECENT_LIMIT)`
  (`app/src/domain/paciensAktivitas.ts`), 2 karaktertől `paciensTalalatok`
  (`app/src/domain/paciensKereses.ts`, `KERESES_MIN_KARAKTER`).
- `app/src/pages/planEditor/ItemPicker.tsx`: azonos ciklus, de üres keresőnél `opcioSzam === 0`,
  a lista nem renderelődik, az Enter no-op — a követendő minta.
- Mentetlen piszkozatnál az `inditas` út megerősítést kér
  (`app/src/components/PlanVersionActionDialog.tsx` `usePlanVersionActions`,
  `app/src/domain/planVersionActions.ts` `kellMegerosites`) — a piszkozat tehát nem vész el némán;
  a védtelen rész a hamis kiválasztottság és a véletlen Enter.
- `app/src/pages/NewPlanPage.test.tsx`: „nyíl le majd Enter a második találatot választja”,
  „nyíl fel a lista elejéről az utolsó találatra ugrik (körbeér)”, „Escape kiüríti a keresőt és
  visszahozza a recents listát” — mindhárom ELŐBB gépel egy keresőszöveget, tehát a változás nem
  írja át őket. Nincs teszt az üres keresőn lenyomott Enterre.

## Approach
Egyetlen komponens, `NewPlanPage.tsx`: a `hi` kapjon „nincs kiemelés” értéket, a `q`-ra futó reset
üres keresőnél ezt állítsa be, a nyilak ebből az állapotból lépjenek az első/utolsó opcióra, az
Enter pedig nincs-kiemelés állapotban ne csináljon semmit. A kiemelés-stílus feltétele ugyanaz az
index-egyezés marad.

NEM tartozik ide: a lista sorrendje és a `legutobbAktivPaciensek`/`paciensTalalatok` logikája; a
piszkozat-felülírás őrének viselkedése (`kellMegerosites`); a `planEditor/ItemPicker.tsx`
tételkeresője; a lista listbox-szemantikája (`aria-activedescendant`/`aria-selected`) — ma sincs,
és nem ez a tétel tárgya.

## Decisions
- Az „érintetlen” állapot a kereső TARTALMÁHOZ kötődik (üres kereső = nincs kiemelés, kitörölt
  szöveg után is) — mert egy mondatban kimondható szabály, és minden üres állapotban megszünteti a
  véletlen Enter kockázatát; nem a „egyszer megérintve marad” mozdulat-alapú változat, mert az a
  gépel → töröl állapotban visszahozná ugyanezt a csapdát.
- A nyíl üres keresőnél is kiemel (ArrowDown → első, ArrowUp → utolsó opció) — mert enélkül a
  billentyűzetes út zsákutca lenne, és a `docs/PRODUCT.md § Napi flow` egér nélküli működést vár.
- Az üres keresőn lenyomott Enter némán nem csinál semmit, új felirat nélkül — mert a doki panasza
  a HAMIS kiválasztottság volt, nem a hiányzó visszajelzés; a „Legutóbbi páciensek” felirat és a
  „Kezdj el gépelni a kereséshez.” szöveg már a helyén van.
- Az `ItemPicker.tsx` változatlan marad — ott az „érintetlen kereső = nincs választás” szabály már
  él (üres `q`-nál `opcioSzam === 0`, az Enter no-op); ez a tétel a `NewPlanPage`-et hozza vele
  egy vonalba, nem új mintát vezet be.

## Verification
- [ ] tests — a lapra érkezve, gépelés nélkül egyetlen páciens-sor sincs kiemelve, és az Enter nem
      navigál/nem indít tervet; egy leütés (vagy ArrowDown) után az első opció kiemelt, és az Enter
      arra indít; a keresőszöveg kitörlése után újra nincs kiemelt sor és az Enter nem indít;
      a nyíl/Enter ciklus és a no-match „Új páciens” ág változatlan
- [ ] typecheck/lint
- [ ] docs-check
