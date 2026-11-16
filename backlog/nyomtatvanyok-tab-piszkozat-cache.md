# nyomtatvanyok-tab-piszkozat-cache
Type: chore
Prio: now
Source: agent-first dokumentációs migráció follow-up
Target: master
Baseline: ea1e320ab0bca3af17f8639e25ba99cec54f5578

## Goal
Nincs doki-látható változás: a Nyomtatványok fül sablon-piszkozat cache-e a tároló-határon át perzisztál, a
fül nem nyúl közvetlenül `localStorage`-hoz és a `DemoStorage`-hoz.

## Current state
- `app/src/pages/settings/NyomtatvanyokTab.tsx`: `TEMPLATE_DRAFT_CACHE_KEY` (`dp:sablon-piszkozat`),
  `readTemplateDraftCache`, `writeTemplateDraftCache`, `updateTemplateDraftCache`,
  `clearTemplateDraftCacheEntry`, exportált `clearAllTemplateDraftCache`; négy `oxlint-disable` sor
  (`no-restricted-imports` a `PREFIX`-re, `no-restricted-globals` a `localStorage`-ra).
- `app/src/pages/SettingsPage.tsx` hívja a `clearAllTemplateDraftCache`-t elvetéses tab-váltáskor.
- `app/src/storage/DemoStorage.ts` `PREFIX` (`dp:`); a `DemoDraftStorage.ts` is innen importálja, a
  `clearAll()` prefix-seprése ettől viszi el a cache-t is.
- `app/src/storage/StorageContext.tsx` `drafts`: a testvér-doboz minta.
- `app/src/pages/SettingsPage.test.tsx` „a Nyomtatványok tab elvetéses tab-váltása törli a sablon-piszkozat
  cache-t is (nem téríti vissza egy F5)” és a `dp:sablon-piszkozat` kulcsra építő további esetek.
- `.oxlintrc.json`: `localStorage` és `DemoStorage`-import csak `src/storage/**` alatt engedett.

## Approach
- A `dp:` prefix önálló modulba kerül (`app/src/storage/localKeys.ts`), a `DemoStorage` és a
  `DemoDraftStorage` onnan veszi.
- Új, kicsi testvér-interfész a `DraftStorage` mellett a sablon-piszkozatra (base-kulcsolt szöveg: olvasás,
  egy bejegyzés írása és törlése, mind törlése), demó-implementációja a mai kulcson és szemantikával; a
  `StorageContext` a `drafts` mintájára adja ki.
- A `NyomtatvanyokTab` és a `SettingsPage` a kontextuson át hívja; a négy lint-kivétel megszűnik. A
  `storage/CLAUDE.md` testvér-sora az új interfésszel bővül.
- NEM tartozik ide: a `DraftStorage` bővítése, a cache tartalmának vagy élettartamának változása,
  Electron-oldali tároló.

## Decisions
- Külön testvér-interfész, nem a `DraftStorage` bővítése — mert az egy `Plan`-rekordra szól
  ütközés-detektálással, a sablon-cache base-kulcsolt szöveg; a végleges terv szerint a piszkozat-cache
  Electron alatt is a renderer `localStorage`-ában marad, így az implementáció ott is ez.
- A kulcs (`dp:sablon-piszkozat`) változatlan — mert a doki böngészőjében lévő félkész sablonszöveg így
  túléli a deployt, és a demó „Minden adat törlése” továbbra is elviszi.
- A hozzáférés szinkron marad — mert a fül betöltése és leütésenkénti írása erre épül, és a
  `localStorage` Electronban is szinkron.

## Verification
- [ ] tests — a meglévő SettingsPage sablon-piszkozat tesztek változatlanul zöldek (újratöltés után
      visszajön, Mégse és elvetéses tab-váltás törli); a demó „Minden adat törlése” után a sablon-piszkozat
      kulcs sincs meg
- [ ] typecheck/lint — a `NyomtatvanyokTab.tsx`-ben nincs `oxlint-disable`
- [ ] docs-check
