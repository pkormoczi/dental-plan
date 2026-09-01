# Architecture + React Review

Date: 2026-08-25

## Executive Summary

Architecture health: GOOD

Critical: 0
Major: 1
Minor: 6
Observations: 8

### Top concerns

1. **`domain/validate.ts` — the runtime shape-guard for every JSON boundary (`terv.json`/`arlista.json`/`beallitasok.json`/`paciens-adatok.json`) has zero test coverage**, direct or indirect (MAJOR). This is the one data-integrity-critical module that breaks the codebase's own strong pattern of "every cross-cutting rule gets a dedicated test file."
2. Focus is still lost after picking an item via the tooth-map-triggered inline `ItemPicker` (`pages/PlanEditorPage.tsx` `LineRow`) — carried forward, unfixed since the 2026-08-10 review, in the exact interaction CLAUDE.md calls the app's core competitive edge.
3. `pages/PlanEditorPage.tsx` has grown to 2,249 lines (from ~1,750 at the last review two weeks ago) and is now the single largest file in the repo by a wide margin — still a single component owning phase CRUD, tooth-click routing, undo, and three large sub-blocks (summary, custom total, deposit) inline.

### Positive observations

- The domain layer discipline the prior review praised still holds at roughly 2.5× the feature surface: 90 domain/pdf/storage modules, the overwhelming majority with a co-located `.test.ts`, each cross-cutting rule (D4/D7/D9/D18/D21/D22/D23/D31 etc.) living in exactly one named, WHY-commented function.
- `D31` (documented in `CLAUDE.md`'s "Sérthetetlen szabályok") concretely fixed the state-race finding (ARCH-002) the last review flagged: `AppState.tsx`'s `saveSettings`/`savePriceList` now take an updater and sync a `Ref` *before* the write, closing the "two fast edits in one tick" race the prior review called out — independently re-verified against `pages/PriceListAdminPage.tsx`'s `commit()`.
- The full suite (89 files / 1,690 tests) passes, `tsc -b` is clean, `oxlint` reports zero errors (only 11 harmless `react/only-export-components` fast-refresh warnings, all from files that intentionally export a hook alongside a Provider/component), and `npm audit` shows zero known vulnerabilities.
- `ARCH-005` (duplicated `Field`/label-wrapper accessibility logic) from the last review is resolved: `components/Field.tsx` is now a single shared module (`Field`/`FieldGroup`/`ReadOnlyField`), imported by both the Árlista admin and the Terv adatai/patient pages, with the accessible-name rationale (`<label>` vs `<div>` wrapper) preserved as a comment in one place instead of three.
- CI (`.github/workflows/deploy.yml`) now runs `npm test` and `tsc -b && vite build` before every deploy, gating on green tests and a clean build — a real improvement over the "deploy with no gate" state the last review flagged (`ARCH-009`), though it still doesn't run `oxlint`.
- The project's own `dokumentacioGuard.ts` + baseline mechanism is a genuinely good piece of self-enforcing architecture: it makes the "no new `D<n>` references, ever" rule in `CLAUDE.md` a machine-checked property (diffed against a committed baseline) instead of a convention that quietly erodes — and it is itself under test (`dokumentacioGuard.test.ts`).

## Repository Context

- React: 19.2.8
- TypeScript: ~6.0.2 (`tsc -b`, project references; `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`)
- Build: Vite 8.2.0 (`@vitejs/plugin-react`), static output, `base: '/dental-plan/'` for GitHub Pages
- Routing: `react-router-dom` 7, `HashRouter`, nested layout route (`TervWorkflowShell`) for the 3-step plan workflow, one lazy-loaded route (`PreviewPage`, to defer `@react-pdf/renderer`'s ~1.5 MB)
- State management: React Context only (`AppStateContext` for plan/settings/price-list, `StorageContext` for the storage abstraction, plus several small purpose-built contexts — `NavGuardContext`, `LepesGuardContext`, `NyelviReviewContext`) + local component state; no external store library
- Data fetching: none — no backend by design (D2); all reads/writes go through `PlanStorage`/`DraftStorage`, backed by `localStorage` in this mockup phase
- Forms: hand-rolled controlled inputs over `@radix-ui/themes` primitives, no form library
- Styling/UI: `@radix-ui/themes` design system, two deliberately separate token sets (screen UI vs. printed PDF, `design/tokens.ts` vs. `pdf/`)
- Tests: Vitest 4 + Testing Library, jsdom environment, 89 files / 1,690 tests, all passing
- Deployment/build notes: fully static, single GitHub Actions workflow to GitHub Pages, now gated on `npm test` + build (see Positive Observations)

## Automated Quality Signals

- Build: **Pass** — `tsc -b && vite build` succeeds. Two chunks exceed the 500 kB warning threshold: `index-*.js` (945.52 kB / 325.12 kB gzip, up from 688.89 kB two weeks ago) and `PreviewPage-*.js` (1,460.87 kB / 490.67 kB gzip, essentially unchanged — dominated by `@react-pdf/renderer`). `index-*.css` is also large (720.38 kB / 100.73 kB gzip), almost entirely `@radix-ui/themes/styles.css`'s full color-scale system.
- Type check: **Pass** — zero errors.
- Lint: **Pass** — `oxlint`, zero errors, 11 warnings (all `react/only-export-components`, all the standard hook-next-to-provider pattern, harmless).
- Tests: **Pass** — 1,690/1,690, 89/89 files.
- `npm audit --omit=dev`: 0 vulnerabilities.

## Pass 1 — Senior Software Architect

### ARCH-001 — `domain/validate.ts`'s JSON shape guards have no test coverage at all

Severity: Major
Confidence: High
Status: NEW
Category: Data architecture / test coverage
Location: `app/src/domain/validate.ts` (all of it); consumed by `storage/DemoStorage.ts` `loadPlan`/`loadPriceList`/`loadSettings`/`loadPatientData`/`migratePatientLegacyLayout`

Evidence:
`validate.ts` has no `validate.test.ts`, and a repo-wide search for its exports (`assertPlanShape`, `assertPriceListShape`, `assertSettingsShape`, `assertPatientMasterDataShape`, `ValidationError`) inside any `*.test.ts` file returns zero matches — not even indirectly through `storage/DemoStorage.test.ts`, which exercises `loadPlan`/`loadPriceList` extensively but apparently never with malformed input. Every other module in `domain/` that CLAUDE.md documents as a "don't reinvent this" cross-cutting rule has a co-located test file; this is the one exception, and it happens to be the module load-time integrity depends on.

Why it matters:
This is the exact code CLAUDE.md's own "Sérthetetlen szabályok" table cites for D18 ("minden JSON `schemaVersion`-nel indul; magasabb verzió észlelésekor a betöltést meg kell tagadni") and the module's own header comment cites for P1-6 ("egy sérült/kézzel piszkált terv.json... simán bejutott volna a state-be, és egy `null` vagy string egy pénzmezőben csendben 0-ra esett volna szorzásnál"). These files live on a doctor's Google Drive for years (per `docs/05-technologia.md`) and can be hand-edited, partially synced, or corrupted by a Drive conflict. An untested regression here — e.g. a refactor that accidentally makes `assertPlanShape` accept a `sorok[i].mennyiseg` of `"1"` (string) instead of rejecting it — would silently reintroduce exactly the NaN-money bug this module exists to prevent, and nothing in the suite would catch it.

Recommendation:
Add `domain/validate.test.ts` covering at minimum: each `assert*Shape` function rejecting a representative malformed input per field it checks (missing array, non-object, non-finite number, unknown `Ar.tipus`), and accepting a valid minimal shape. This is a small, high-value addition — the functions are already pure and dependency-free.

### ARCH-002 — Storage-write timing is inconsistent across pages (buffered vs. immediate)

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: Data/API architecture
Location: `pages/PlanEditorPage.tsx` (buffered, single commit on navigate/finalize via `DraftStorage`) vs. `pages/PriceListAdminPage.tsx` / `pages/SettingsPage.tsx` (immediate per-field commit to `PlanStorage`)

Evidence: Reconfirmed unchanged. `PlanStorage` standardizes *how* to write, not *when*.

Why it matters: Harmless today (`localStorage` writes are effectively free); becomes a real latency/failure-mode question once `FileSystemStorage` (Phase 2) replaces it.

Recommendation: No action needed now — this is explicitly the kind of question `docs/05-technologia.md`'s Phase 2 planning already owns.

### ARCH-003 — `commit()`/`patch()` closures without functional updaters

Severity: N/A (verification, not a finding)
Status: **RESOLVED**
Category: State architecture

Evidence: The prior review's ARCH-002 flagged `PriceListAdminPage.tsx`/`SettingsPage.tsx` closing over render-scope `priceList`/`settings`. This is now structurally prevented: `AppState.tsx`'s `saveSettings`/`savePriceList` take an updater `(prev) => next` and read from a `Ref` that's synced *synchronously before* the write (`settingsRef`/`priceListRef`, `applySettings`/`applyPriceList`) — documented in `CLAUDE.md`'s D31 row. `PriceListAdminPage.tsx`'s `commit()` (line 203) passes a `recept: (prev) => next` straight through to `savePriceList`, so two fast edits in one tick now compose correctly instead of racing. This looks like a deliberate architectural fix landed specifically in response to the earlier finding, not a coincidence.

### ARCH-004 — `storage/seed/priceList.ts` reaches across the documented `app/` boundary

Severity: Minor
Confidence: High
Status: CARRIED FORWARD
Category: Dependency/tooling hygiene
Location: `app/src/storage/seed/priceList.ts` (`import raw from '../../../../data/arlista.seed.json'`)

Evidence: Unchanged; CLAUDE.md documents `app/` as the only directory meant to be edited, everything else "reference only" — this import crosses that line.

Why it matters: A future rename/move of the repo-root `data/` directory breaks the build with a path-resolution error that doesn't obviously point at the cause.

Recommendation: Already tracked as an intentional single-source-of-truth import; no new action.

### ARCH-005 — `pages/settings/NyomtatvanyokTab.tsx` reads/writes `localStorage` directly, bypassing both storage interfaces

Severity: Minor
Confidence: High
Status: NEW
Category: Layering / dependency direction
Location: `app/src/pages/settings/NyomtatvanyokTab.tsx:41-88` (`TEMPLATE_DRAFT_CACHE_KEY`, `readTemplateDraftCache`/`writeTemplateDraftCache`/`clearTemplateDraftCacheEntry`/`clearAllTemplateDraftCache`)

Evidence:
Every other piece of persisted state in the app goes through either `PlanStorage` (durable data) or `DraftStorage` (autosave cache) — both explicitly designed, per `CLAUDE.md`'s "Két fázisú build" section, as the seam that isolates the rest of the app from the `localStorage`→`FileSystemStorage` swap in Phase 2. This file is the one exception: it calls `localStorage.getItem`/`setItem`/`removeItem` directly for a template-editor draft cache, justified in its own comment as "not a `DraftStorage` extension because that's typed to `Plan` only." It does reuse `DemoStorage`'s `PREFIX` constant so the "clear all data" sweep still catches it, which mitigates the worst failure mode.

Why it matters:
This is a real, if narrow, architectural inconsistency: `docs/05-technologia.md`'s Phase 2 plan is "swap `PlanStorage`'s implementation, nothing else changes" — but this component's persistence has no interface to swap. When `FileSystemStorage` lands, this file needs its own bespoke migration (there's no `IndexedDB`-backed equivalent planned for it the way there is for `DraftStorage`), which is easy to forget precisely because it's the only such case in the codebase.

Recommendation:
Low urgency given the narrow scope (one settings tab's unsaved-draft cache, no patient data). Worth a one-line note in `docs/05-technologia.md`'s Phase 2 section listing this as a second thing that needs a plan, alongside `DraftStorage`'s IndexedDB migration — so it isn't rediscovered under time pressure during the Phase 2 cutover.

### ARCH-006 — Two build chunks exceed Vite's 500 kB warning threshold, main bundle grew ~37% in two weeks

Severity: Observation
Confidence: High
Status: CARRIED FORWARD (evidence updated)
Category: Performance architecture / bundle size
Location: Build output — `dist/assets/index-*.js` (945.52 kB / 325.12 kB gzip, was 688.89 kB / 256.91 kB gzip on 2026-08-10), `dist/assets/PreviewPage-*.js` (1,460.87 kB / 490.67 kB gzip, essentially unchanged)

Evidence: `vite build` output, this run, compared to the prior review's numbers.

Why it matters: Still low real-world impact for an internal, desktop-browser, single-user tool — the one splitting decision that mattered (lazy-loading `PreviewPage` to defer `@react-pdf/renderer`) is still in place. The main bundle's growth tracks the app's genuinely large feature growth in two weeks (many new pages/components/domain modules per `CHANGELOG.md`), not an obvious regression — but it's worth naming the trend explicitly since "no action needed" stops being automatically true if it keeps compounding.

Recommendation: No action now. If a future review sees this cross ~1.2 MB main bundle, it's worth checking whether any of the newer, less-frequently-visited pages (e.g. `pages/PriceListAdminPage.tsx`, `pages/tervReszletei/*`) are worth route-level code-splitting the way `PreviewPage` already is.

### ARCH-007 — No CI lint gate

Severity: Observation
Confidence: High
Status: CARRIED FORWARD (partially resolved)
Category: Tooling/CI hygiene
Location: `.github/workflows/deploy.yml`

Evidence: The prior review's ARCH-009 flagged "no CI gate for lint/typecheck/test, only a deploy workflow." That's now partially fixed: the deploy workflow runs `npm test` and `tsc -b && vite build` before deploying. It still doesn't run `npm run lint` (`oxlint`).

Why it matters: Low — `oxlint` currently reports zero errors and the gap is one missing step, not an absent gate. Worth closing only because it's now the single remaining automated-signal gap.

Recommendation: Add an `npm run lint` step alongside the existing `npm test`/build steps; trivial to add, keeps parity with the "Automated Quality Signals" the project's own review skill already checks.

### ARCH-008 — `PlanEditorPage.tsx` continues to grow and is now the largest file in the repo by a wide margin

Severity: Minor
Confidence: High
Status: CARRIED FORWARD (evidence updated, severity raised from Observation)
Category: Maintainability / component design
Location: `app/src/pages/PlanEditorPage.tsx` (2,249 lines; the top-level `PlanEditorPage` function alone spans ~660 lines, `pages/PriceListAdminPage.tsx` is second-largest at 1,476)

Evidence: The prior review carried forward "three largest files unsplit" as an Observation without giving line counts for this specific file. It has grown substantially since (the file now contains phase CRUD, tooth-click routing with a click-cycle ref, an inline sortable-list undo mechanism, a guided-review focus-navigation effect, and three sizeable summary sub-blocks — `Summary`, `EgyediVegosszegBlokk`, `ElolegBlokk` — each with their own multi-field local state machine, all as sibling functions in one file).

Why it matters: Every one of the sub-components is well-scoped and individually readable (this isn't a "God function" — it's a God *file* of otherwise-reasonable components), and the domain logic itself is correctly factored out to `domain/*.ts` per CLAUDE.md's stated pattern. The cost is navigational: a change to, say, only the deposit block requires opening and scrolling through a 2,249-line file, and the file's size makes it the most likely place for two unrelated changes to produce a spurious merge/review diff.

Recommendation: Not urgent — correctness isn't at risk. If this file keeps growing, `Summary`/`EgyediVegosszegBlokk`/`ElolegBlokk` (lines 1804–2249, ~445 lines, three independently-testable summary widgets with no dependency on `PhaseSection`/`LineRow`) are the cleanest first extraction candidates into their own files under `pages/planEditor/`, mirroring the existing `ItemPicker.tsx` precedent.

### ARCH-009 — `PatientMasterData`/`Paciens` field validation lives in three independently-maintained places

Severity: Observation
Confidence: Medium
Category: Architectural consistency
Location: `domain/validate.ts` `assertPatientMasterDataShape` (load-time integrity), `domain/paciensValidacio.ts` `emailHiba`/`szuletesiIdoHiba` (UI field validation), `domain/masterSnapshotDiff.ts` (diff comparison)

Evidence: Three separate modules each reason about the same `Paciens`-shaped data for different purposes (is-it-well-formed vs. is-it-a-valid-value-for-this-field vs. does-it-differ-from-the-plan-snapshot). Each is well-scoped and has its own docstring explaining why it's separate from the others, and none currently duplicates another's logic (checked: `assertPatientMasterDataShape` only checks `paciensId`/`nev`/`kiskoru` presence/type, `paciensValidacio.ts` only checks `email`/`szuletesiIdo` value validity — no overlap).

Why it matters: Not a defect today — this is intentional separation-of-concerns, not accidental duplication, and CLAUDE.md's "Meglévő segédfüggvények" section documents each one's distinct purpose. Flagging only because a fourth `Paciens`-shaped validator would be the point where this stops being three deliberate modules and starts being an emergent pattern worth consolidating under one doc-section.

Recommendation: No action. Worth a second look only if a fourth similar module appears.

## Pass 2 — Senior React Engineer

### REACT-001 — Focus is still lost after picking an item via the tooth-map-triggered inline `ItemPicker`

Severity: Major
Confidence: High (independently re-traced in code; the original finding was live-reproduced in-browser on 2026-08-10)
Status: CARRIED FORWARD (unfixed)
Category: Focus management / keyboard accessibility
Location: `app/src/pages/PlanEditorPage.tsx` `LineRow`, the `keresoMod` `ItemPicker` instance (~line 1432-1450) vs. `pages/planEditor/ItemPicker.tsx` `finishPick()`

Evidence:
`LineRow` renders its inline picker with `clearOnPick={false}`. Its `onPick` handler is:
```
onPick={(item) => {
  onPatch(sorMezokTetelbol(item, currency, nyelv));
  setKeresoMod(false);
}}
```
`clearOnPick={false}` means `ItemPicker.finishPick()` (which is the only place that ever calls `.focus()`) is a no-op for this instance — it only clears+refocuses the *phase-level* picker (`clearOnPick` defaults `true` there). `setKeresoMod(false)` then unmounts the `ItemPicker` (a `Popover.Root`/portal) and mounts the row's plain name `TextField.Root` (`id="nev-${pi}-${li}"`) in its place — with no `autoFocus`, and no follow-up `fokuszCel`/`requestAnimationFrame` focus call anywhere in the pick path. `PlanEditorPage.test.tsx` has focus assertions for the tooth-click-creates-a-row path (`kereso-1-0` receiving focus *before* a pick) and for the already-treated-tooth cycling path, but no test exercises focus *after* a pick completes through this inline picker — so nothing in the suite would catch a regression here either way.

Why it matters:
Same as the original finding: CLAUDE.md states "Ha valahol elakad a Tab-sorrend, az hiba" without qualification, and separately calls the type-→arrow-→Enter cycle the app's main competitive edge over Excel. This is the tooth-map "click a tooth → pick a treatment" flow — a primary, not edge-case, way to add a line. A doctor who clicks a tooth and picks an item by keyboard has focus silently dropped (almost certainly to `<body>`, per the original live reproduction); the next `Tab` restarts from the nav bar instead of continuing at the row's next field ("Fog" — already filled from the click — or "Db").

Recommendation:
Unchanged from the original: after a successful pick from the inline (`clearOnPick={false}`) `ItemPicker`, explicitly move focus to the next logical field on that row (e.g. the "Db" `NumberField`) — mirroring what the phase-level picker's own `finishPick()` does for itself. Since `ItemPicker` already has an `id` prop and the row already computes stable `nev-${pi}-${li}`/`fog-${pi}-${li}` ids, the fix is likely a `requestAnimationFrame(() => document.getElementById(...)?.focus())` call in `LineRow`'s `onPick`, next to where `setKeresoMod(false)` is called. Add a regression test asserting focus after pick, since this bug has now survived one full review cycle silently.

### REACT-002 — `ItemPicker` still has no ARIA combobox/listbox wiring

Severity: Minor
Confidence: Medium
Status: CARRIED FORWARD
Category: Accessibility
Location: `pages/planEditor/ItemPicker.tsx` — input (~line 160-169), result rows (~188-234)

Evidence: Unchanged. The `<input>` has no `role="combobox"`/`aria-expanded`/`aria-controls`/`aria-activedescendant`; result rows have no `role="option"`/`id`. The highlighted result is conveyed only via background color + a `boxShadow` accent bar.

Why it matters: A screen-reader user gets no signal that a result list opened, how many results exist, or which is highlighted — on the single most-used interaction surface in the app.

Recommendation: Unchanged — add the standard combobox/listbox ARIA triad, or explicitly document screen-reader support as out of scope for this widget in `docs/07-felulet-rendszer.md` so a future reviewer doesn't mistake it for an oversight.

### REACT-003 — `ErrorBoundary` still hand-rolls raw `<button>`s instead of Radix `Button`

Severity: Minor
Confidence: High
Status: CARRIED FORWARD
Category: Architectural consistency / design-system compliance
Location: `components/ErrorBoundary.tsx:69-97` (`btnPrimary`/`btnSecondary` inline-styled raw `<button>`s)

Evidence: Unchanged since the last review. `docs/07-felulet-rendszer.md` states every UI element comes from `@radix-ui/themes`, naming only the tooth-chart SVG and the printed PDF as exceptions; `ErrorBoundary` renders inside `<Theme>` (per `App.tsx`'s own comment), so there's no technical blocker to using `Button`.

Why it matters: This is the one screen most likely to be seen at the worst moment (an app crash), and it's the one screen that currently looks visually inconsistent with the rest of the app right then.

Recommendation: Swap both buttons for Radix `Button` — small, low-risk, closes a two-week-old finding.

### REACT-004 — `structuredClone(prev)` still runs on every keystroke in uncommitted text fields

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: React performance
Location: `pages/PlanEditorPage.tsx` `updatePlan` (~line 316-322), also now used identically in `pages/PatientPage.tsx` (~lines 141, 167)

Evidence: Same pattern as before, now present in a second file (`PatientPage.tsx`) as well. Every `onChange` for phase/line free-text fields deep-clones the entire `Plan` and re-triggers `AppState`'s un-debounced draft write.

Why it matters: Still correct and cheap at today's typical plan size — an explicit, documented trade-off, not an oversight. Cost is O(plan size) per keystroke, so it's worth re-checking only if real-world plan sizes grow substantially.

Recommendation: No action now.

### REACT-005 — Component-local `useState` used to derive open/closed UI state from a prop, re-synced via effect, repeated across ~6 similar toggles

Severity: Observation
Confidence: Medium
Category: State correctness / Hooks
Location: `pages/PlanEditorPage.tsx`: `EgyediVegosszegBlokk`'s `be` (line 1883), `ElolegBlokk`'s `on` (line 2059), `FazisMegjegyzes`'s `nyitva` (line 1263), `LineRow`'s `leirasNyitva` (line 1411) — each paired with a `useEffect` that can only turn the flag *on* from a prop change, documented inline each time as "CSAK bekapcsolni szabad innen."

Evidence: The pattern ("derive local boolean from a prop at mount, allow a `useEffect` to force it open but never closed, so the doctor's own manual collapse survives an unrelated prop update") is correctly implemented at all four sites, each with a comment explaining the one-directional constraint — this is not a bug, it's a deliberately repeated idiom.

Why it matters: Not a defect — every instance is correct and independently tested. Flagging only because it's the same non-trivial synchronization rule reimplemented four times by hand rather than through one small custom hook (e.g. `useOneWayOpen(forceOpenProp)`); a fifth site copy-pasting this is more likely to get the "only opens, never closes" direction wrong than a shared hook would be.

Recommendation: Not worth extracting for four call sites with 100% correct, tested behavior. Worth revisiting if a fifth similar toggle is added.

### REACT-006 — `pdf/TervDocument.tsx` remains one large file mixing concerns

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: Component design / maintainability
Location: `pdf/TervDocument.tsx` (751 lines, up from 503 at the last review — styles, several subcomponents, and the top-level `Document`)

Evidence: Grew ~50% in two weeks (tracking the same feature growth as `ARCH-006`/`ARCH-008`), still unsplit.

Recommendation: No new action; remains appropriately tracked as the PDF-layer counterpart to `ARCH-008`.

## Previous Review Comparison

Baseline: `docs/reviews/2026-08-10-arch-react-review-2.md` (the most recent prior report; note its own provenance warning about a same-day report that was previously lost to a documentation sweep — `docs/reviews/` should continue to be treated as exempt from such sweeps, which appears to have held for the two weeks since).

### Resolved

- **ARCH-002 (commit()/patch() closures without functional updaters)** — fixed by the D31 architectural change (ref-synced `saveSettings`/`savePriceList` updaters). See ARCH-003 above.
- **ARCH-005 (`Field`/`FieldGroup` duplicated in three files)** — fixed; now one shared `components/Field.tsx`.
- **ARCH-009 (no CI gate at all)** — partially fixed; `npm test` + build now gate deploy. Lint still missing (see ARCH-007 above).
- **REACT-006/007/008 (verification-only items: `NumberField` focus-sync, `PriceListAdminPage` row keyboard access, search-field `aria-label`s)** — not re-checked this run (no new evidence contradicting them); no reason to believe they regressed.

### Carried forward

- Storage-write timing inconsistency (ARCH-001 → this report's ARCH-002).
- `storage/seed/priceList.ts` boundary crossing (ARCH-003 → ARCH-004).
- Two oversized build chunks (ARCH-008 → ARCH-006, evidence updated: main chunk +37%).
- Inline `ItemPicker` focus loss after a tooth-map pick (REACT-001 → REACT-001, **still unfixed after one full review cycle**).
- `ItemPicker` missing ARIA combobox/listbox semantics (REACT-002 → REACT-002).
- `ErrorBoundary` hand-rolled buttons (ARCH-007 → REACT-003).
- Per-keystroke `structuredClone` (REACT-003 → REACT-004, now also present in `PatientPage.tsx`).
- `pdf/TervDocument.tsx` size (REACT-010 → REACT-006, now 751 lines, +50%).
- `PlanHistoryPage.tsx`'s "read everything on every visit" pattern (prior ARCH-004) — superseded by the D51/D29 restructuring (`pages/demo/OsszesTervSection.tsx`, `domain/planChainData.ts`) since the last review; not re-verified in detail this run since the page it named no longer exists in that form. Recommend a future review re-scope this specifically against `OsszesTervSection.tsx`'s current loading pattern.

### New

- ARCH-001 (Major) — `domain/validate.ts` has zero test coverage.
- ARCH-005 — `NyomtatvanyokTab.tsx` bypasses both storage interfaces via direct `localStorage` access.
- ARCH-008 (severity raised from Observation to Minor) — `PlanEditorPage.tsx` size, now with concrete line counts and growth trend.
- ARCH-009, REACT-005 — both Observations, both intentional patterns worth naming rather than defects.

## Recommended Priorities

### Address first

1. **ARCH-001** — add `domain/validate.test.ts`. Small, mechanical, closes the one real coverage gap in an otherwise disciplined test suite, on the module that gates data integrity for every file the app loads.
2. **REACT-001** — fix the inline `ItemPicker` focus loss after a tooth-map pick, and add a regression test for it. This has now been known for two weeks without a fix; it sits in the app's stated core UX invariant.

### Next

1. **REACT-003** — swap `ErrorBoundary`'s hand-rolled buttons for Radix `Button` (cheap, standing since the last review).
2. **ARCH-007** — add `npm run lint` to the CI workflow to close the last gap in automated signal coverage.
3. **REACT-002** — add ARIA combobox/listbox semantics to `ItemPicker`, or explicitly scope it out in `docs/07-felulet-rendszer.md`.

### Monitor

1. **ARCH-006/REACT-006** — bundle size and `TervDocument.tsx`/`PlanEditorPage.tsx` (ARCH-008) size are all growing in step with genuine feature growth; revisit if the main JS chunk crosses ~1.2 MB or if a change to just one of `PlanEditorPage.tsx`'s sub-blocks becomes routinely awkward to review.
2. **ARCH-005** — the `NyomtatvanyokTab.tsx` direct-`localStorage` exception; add a one-line note to `docs/05-technologia.md`'s Phase 2 section so it isn't rediscovered under pressure during the `FileSystemStorage` cutover.
3. **ARCH-002/ARCH-009** — storage-write timing and the `Paciens`-shaped-validator trio: both fine today, both either already owned by existing planning or intentionally separated; no new action.
