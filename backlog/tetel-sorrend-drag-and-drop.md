# tetel-sorrend-drag-and-drop
Type: feature
Source: doki felvetés 2026-10-03
Target: master
Baseline: ebea138a31c0f79ee60ae8a76f2d66b5ce41aa71

## Goal
A doki a terv szerkesztőben egy sort a sor végi ⠿ fogantyúval egérrel áthúz egy másik helyre — a
saját fázisán belül vagy egy másik fázisba (annak csukott fejlécére is) —, és ugyanezt a
fogantyún billentyűzettel is megteheti; a `⋯` menü és a Feljebb/Lejjebb menüpontok megszűnnek.

## Current state
- `app/src/pages/planEditor/LineRow.tsx` 8. cella (~610–651): `⋯` `DropdownMenu` (`IkonGomb`,
  `id={sorMenuId(pi, li)}`, „Feljebb”/„Lejjebb”, `onCloseAutoFocus` preventDefault) + kuka.
- `app/src/pages/PlanEditorPage.tsx` `moveLine(pi, li, irany)` (~207): `updatePlan` +
  `sorokFelcserelve`, utána `setFokuszCel({ mit: 'sorMenu', pi, li: cel })`; `fazisResetToken`
  (~191–199, `movePhase`) minden fázist remountol; index-kulcsos állapot: `sorDraft`,
  `pendingArFrissites`, `fazisCsukva`, `ciklusRef`.
- `app/src/pages/planEditor/PhaseSection.tsx`: fázisonként külön `Table.Root` (~320), csukott fázis
  csak fejlécet rajzol (~266–317), helyi `moveLine` + `sorResetToken` (~129, ~171), `pendingUndo`
  (~143) sor-törlés Undo-sáv.
- `app/src/domain/fazisSorrend.ts` `sorokFelcserelve` — szomszédos csere, egyetlen hívója a
  `moveLine`, nincs unit tesztje. A fázis-helperek maradnak.
- `app/src/pages/planEditor/elemIdk.ts` `FokuszCel` `'sorMenu'` ág + `sorMenuId`;
  `useFokuszEffekt.ts` ~32–53 a `sorMenu`-t rAF-késleltetéssel fókuszálja.
- `app/src/domain/types.ts`: `Sor`/`Fazis` id nélkül, a sorrend = tömbsorrend; a séma nem változik.
- `app/src/pages/PlanEditorPage.test.tsx` describe „sor mozgatása fázison belül” (~740): három
  teszt a `⋯` menüre épül (Lejjebb+fókusz, szélső tiltás, „nem visz sort másik fázisba”), mind átírandó.
- Korlátok: CSP `style-src 'unsafe-inline'` (`app/vite.config.ts`); jsdom-ban nincs `DataTransfer`
  → az egér-út csak manual-check; `design/motion.ts` `csokkentettMozgas` minden átmenetre kötelező.

## Approach
Változik: `LineRow.tsx` (a `⋯` menü helyén ⠿ fogantyú `IkonGomb`, `draggable`, drag- és
billentyű-események; a kuka marad), `PhaseSection.tsx` (sorok és a fázis-fejléc/üres tábla-test
ejtőcél, ejtés-jelző vonal, `pendingUndo` elvetése ejtésnél), `PlanEditorPage.tsx` (egyetlen
„sor áthelyezése (pi,li)→(pi,li)” művelet a `moveLine` helyett, `fazisResetToken` bump,
fókusz a mozgatott sor fogantyújára), `elemIdk.ts` + `useFokuszEffekt.ts` (`sorMenu` → fogantyú
cél/id), `domain/fazisSorrend.ts` (új pure áthelyező helper, `sorokFelcserelve` kivezetése),
`PlanEditorPage.test.tsx` + `fazisSorrend.test.ts`. Nem változik: séma/`types.ts`, `storage/`,
`pdf/`, `totals.ts` (az összesítő az eddigi úton számolódik a `fazisok` tömbökből), fázis-nyilak,
`RendeloTab` orvos-lista. Kizárt scope: fázisok DnD-je; érintéses (touch) húzás; sor húzása másik
tervbe/verzióba.

## Decisions
- Natív HTML5 DnD, nincs új csomag — mert a Radix-az-egyetlen-UI-lib szabály és a 7 futó
  függőség marad; nem dnd-kit, mert új, kézzel auditálandó függőség egy sűrű asztali táblához.
- Külön ⠿ fogantyú (`DragHandleDots2Icon`, `IkonGomb` `cimke`-vel) a sor végén — mert a mezők
  kijelölése/kattintása nem keveredik a húzással; nem egész-sor húzás, mert a tételfelvitel-ciklust
  veszélyezteti.
- A `⋯` menü és Feljebb/Lejjebb megszűnik; a fogantyú maga a billentyű-út (Space/Enter felvesz,
  ↑/↓ léptet fázishatáron át, Enter letesz, Escape visszavon, `aria-live` bejelentéssel) — mert
  WCAG AA (2.1.1, 2.5.7) és a billentyűzet-központú app ezt kéri; nem „csak egér”, mert az a
  nested CLAUDE.md akadálymentességi szabályát sértené.
- Csukott fázis fejléce ejtőcél, a sor a végére kerül, a fázis csukva marad — mert a fejléc
  „N tétel · összeg” összesítője azonnal mutatja az eredményt; nem tiltott cél, mert az plusz
  kattintás.
- Üres, nyitott fázis tábla-teste is ejtőcél — különben üres fázisba nem lehetne sort vinni.
- Fázisok közti DnD kizárt — mert 2–3 fázishoz a meglévő nyíl-gomb elég.
- Egy áthelyező művelet (forrás→cél pozíció) a szomszédos csere helyett, pure helper a
  `fazisSorrend.ts`-ben — mert egér- és billentyű-út ugyanazon az úton megy; a fázis
  `sorszam`/neve nem változik.
- Ejtés után `fazisResetToken` bump — mert mindkét érintett fázis sorainak remountja kell, és a
  fázison belüli token nem éri el a másikat; a kereső szövege elveszhet, húzás közben nincs gépelés.
- `sorDraft`/`pendingArFrissites`: a fogantyú fókusza blur-rel committálja a gépelt mezőt, ejtés
  után mindkettő törlődik; `pendingUndo` ejtésnél elvetve — mert index-kulcsosak, áthelyezés után
  hamis sorra mutatnának.
- Ejtés-jelző: vonal a célsor felett/alatt, animált átrendeződés nincs; ha bármi átmenet kerül
  be, `csokkentettMozgas()` kapuzza.

## Verification
- [ ] tests — pure helper: sor áthelyezése fázison belül előre/hátra, másik fázis adott pozíciójára
      és végére, eredeti tömbök nem mutálódnak, fázisnév/`sorszam` változatlan. Billentyű-út a
      szerkesztőben: fogantyún Space → ↓ ↓ → Enter: a sor két hellyel hátrébb; az utolsó soron ↓ a
      következő fázis elejére visz; Escape az eredeti helyre tesz vissza, fókusz a fogantyún marad;
      ejtés után a mozgatott sor fogantyúja kapja a fókuszt; csukott fázisba vitt sor a végére
      kerül és a fejléc tételszáma nő; „Feljebb”/„Lejjebb” menüpont és „további műveletek” gomb
      nincs a DOM-ban; az Undo-sáv ejtés után eltűnik.
- [ ] typecheck/lint
- [ ] docs-check
- [ ] manual-check szelet: visual-css (fogantyú `controlBorder`/fókuszgyűrű, ejtés-jelző vonal
      kontrasztja) + keyboard-a11y (egérrel húzás fázison belül, másik nyitott fázis két sora közé,
      csukott fejlécre, üres fázisba; tételfelvitel-ciklus ×3 érintetlen; Escape húzás közben;
      konzolban nincs CSP-hiba).
