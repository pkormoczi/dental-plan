# Architecture + React Review

Date: 2026-08-10 (second run this day — see "Previous Review Comparison" for why)

## Executive Summary

Architecture health: GOOD

Critical: 0
Major: 1
Minor: 8
Observations: 9

### Top concerns

1. **Focus is silently lost to `<body>` after picking an item via the dental-chart-triggered inline item picker** (REACT-001) — verified live in-browser, not just in code. This breaks the exact keyboard invariant CLAUDE.md calls the app's core reason to exist, at the newest entry point into it (the tooth-map, shipped 2026-08-09).
2. A prior same-day review report (`docs/reviews/2026-08-10-arch-react-review.md`, produced ~02:01 by this same skill) was deleted by a later, unrelated documentation-consolidation commit. Its findings were real and mostly already fixed — see "Previous Review Comparison" — but the audit trail itself was lost. This is worth the team's attention independent of any code finding.
3. Everything else is small, already known, and already tracked: a handful of Minor consistency/robustness items and a stable list of `docs/08-backlog.md` technical-debt entries, all reverified present-and-unchanged (one, `basePrice()` duplication, has actually been fixed since that list was last written).

### Positive observations

- The domain layer (`app/src/domain/*.ts`) is unusually disciplined for an app this size: every cross-cutting rule (D4 version-never-overwrite, D7 snapshot-is-truth, D9 discount-never-printed, D15 savos asterisk, D21 language/currency independence, D22 date restamping, D23 placeholder hard-lock, D24 name-preservation) lives in exactly one named function with a comment explaining *why*, and has a dedicated test file. 386 tests across 36 files map almost 1:1 to source files.
- `storage/DemoStorage.ts` handles real failure modes most apps this size skip entirely: a private `savingChain` serializes concurrent `savePlan()` calls to prevent a double-click from silently violating the "never overwrite a version folder" rule, and `localStorage` quota errors roll back cleanly instead of leaving a half-written version folder.
- Legally-sensitive PDF logic was traced line-by-line against `docs/04-nyomtatvany-spec.md` (two-row-vs-one-row summary, savos footnote consistency, D9 discount-amount-never-rendered, D23 hard lock) and found to match the spec exactly, with direct test coverage for each rule — this is not "probably right," it's verified.
- The codebase visibly self-corrects: git history shows a working review → fix → document cycle within the same day (the `NumberField` focus-sync bug and `PriceListAdminPage` keyboard-inaccessibility findings below were both found and fixed today, before this review even started).

## Repository Context

- React: 19.2.8
- TypeScript: ~6.0.2 (`tsc -b`, project references, strict-ish flags: `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`)
- Build: Vite 8.2.0 (`@vitejs/plugin-react`), static output, `base: '/dental-plan/'` for GitHub Pages
- Routing: `react-router-dom` 7, `HashRouter` (required for static-host deep links), 7 flat routes, one lazy-loaded (`PreviewPage`, explicitly to defer `@react-pdf/renderer`'s ~1.5 MB)
- State management: React Context only (`AppStateContext` for the plan/settings/price-list working state, `StorageContext` for the storage abstraction) + local component state; no external store library
- Data fetching: none — no backend (by design, D2); all reads/writes go through the `PlanStorage`/`DraftStorage` interfaces backed by `localStorage` in this mockup phase
- Forms: hand-rolled controlled inputs over `@radix-ui/themes` primitives, no form library (appropriate at this form complexity)
- Styling/UI: `@radix-ui/themes` design system (`accentColor="brown" grayColor="slate" radius="small" scaling="95%"`), custom PDF layout via `@react-pdf/renderer`, two deliberately separate token sets (app UI vs. printed document, `design/tokens.ts`)
- Tests: Vitest + Testing Library, jsdom environment, 36 files / 386 tests, all passing
- Deployment/build notes: fully static, single GitHub Actions workflow (`.github/workflows/deploy.yml`) to GitHub Pages; no server, no CI beyond that one deploy workflow (no separate lint/test/build CI gate observed — see ARCH-009)

## Automated Quality Signals

- Build: **Pass** — `tsc -b && vite build` succeeds. Vite warns that two chunks exceed 500 kB (`index-*.js` 688.89 kB / 256.91 kB gzip, `PreviewPage-*.js` 1,448.99 kB / 487.37 kB gzip) — see ARCH-008.
- Type check: **Pass** — `tsc -b`, zero errors.
- Lint: **Pass** — `oxlint`, zero errors, 2 warnings (`react/only-export-components` fast-refresh warnings in `storage/StorageContext.tsx:59` and `state/AppState.tsx:344`, both from exporting a hook alongside a Provider component — harmless, standard pattern).
- Tests: **Pass** — 386/386, 36/36 files.

## Pass 1 — Senior Software Architect

### ARCH-001 — Storage-write timing is inconsistent across pages (buffered vs. immediate)

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: Data/API architecture
Location: `pages/PlanEditorPage.tsx` (buffered, single commit on navigate/finalize) vs. `pages/PriceListAdminPage.tsx` / `pages/SettingsPage.tsx` (immediate per-field commit)

Evidence:
`docs/08-backlog.md` "Technikai adósság" already documents this: the `PlanStorage` interface standardizes *how* to write, not *when*. Reconfirmed present and unchanged.

Why it matters:
Harmless today because writes go to `localStorage`, which is effectively free. It becomes a real reliability/performance question once `FileSystemStorage` (Phase 2, per `docs/05-technologia.md`) replaces it, since disk writes have real latency and failure modes that per-keystroke commits would surface immediately.

Recommendation:
No action needed now; the project's own Phase 2 planning already owns this. Keep it there.

### ARCH-002 — `commit()`/`patch()` closures without functional updaters (narrow race window)

Severity: Minor
Confidence: High
Status: CARRIED FORWARD
Category: State architecture
Location: `pages/PriceListAdminPage.tsx:74-99`, `pages/SettingsPage.tsx:228-237`

Evidence:
Both close over render-scope `priceList`/`settings` rather than using the functional `setState` updater form. `SettingsPage.tsx`'s text fields call `patch()` on every `onChange` (not just blur), which is the wider-surface instance of the two.

Why it matters:
Two edits landing in the same microtask could lose one. In practice this requires two writes within the same JS tick in a single-tab, single-user, keystroke-paced UI — very low real-world likelihood, matching the backlog's own "ma ártalmatlan" (currently harmless) assessment, which this review's independent check confirms rather than overturns.

Recommendation:
Switch to functional `setState` updaters when convenient; not urgent.

### ARCH-003 — `storage/seed/priceList.ts` reaches across the documented `app/` boundary

Severity: Minor
Confidence: High
Status: CARRIED FORWARD
Category: Dependency/tooling hygiene
Location: `app/src/storage/seed/priceList.ts:7` (`import raw from '../../../../data/arlista.seed.json'`)

Evidence:
CLAUDE.md documents `app/` as the only directory meant to be edited, with everything else "reference only" — this import silently crosses that line four `../` deep.

Why it matters:
A future rename/move of the repo-root `data/` directory breaks the build with a path-resolution error, not an obviously-related one.

Recommendation:
Already tracked, low urgency (it's an intentional single-source-of-truth import, not an accident) — no new action from this review.

### ARCH-004 — Full patient/version history is read on every visit to "Korábbi tervek"

Severity: Observation
Confidence: Medium
Category: Performance architecture / scalability limit
Location: `pages/PlanHistoryPage.tsx:82-169`

Evidence:
Every patient folder's every version's full `terv.json` is loaded on each visit to the plan-history list, needed to show each version's `fizetendő` amount inline.

Why it matters:
Instant at current `localStorage` scale (a handful of demo patients). This is precisely the access pattern `docs/01-attekintes-es-dontesek.md`'s own risk table already anticipates for the `FileSystemStorage` phase — mitigated there only by requiring Google Drive *Mirroring* mode, not *Streaming*. Not a defect today; flagging as the concrete place that documented risk will materialize once a doctor's patient history grows into the hundreds.

Recommendation:
Revisit when `FileSystemStorage` lands — the existing documented mitigation (require Mirroring) should be enforced/verified at that point, since "read everything to build a list" doesn't change with the storage backend.

### ARCH-005 — `Field`/`FieldGroup` label-wrapper duplicated near-identically in three files

Severity: Minor
Confidence: High
Category: Maintainability / component reuse
Location: `pages/PriceListAdminPage.tsx:863-891`, `pages/SettingsPage.tsx:488-497`, `pages/PatientPage.tsx:318-344`

Evidence:
All three independently define a label-wrapper component, including the same non-trivial accessibility rationale (a `<div>` is used instead of `<label>` specifically to avoid an ambiguous accessible name when the wrapped control is a `<button>`/chip group).

Why it matters:
This is copy-pasted accessibility logic, not just styling. A future a11y fix applied to one copy silently won't propagate to the other two — and because all three currently read identically, the divergence risk is easy to miss until it's already happened.

Recommendation:
Extract to a shared `components/Field.tsx`.

### ARCH-006 — Latent unreachable-item edge case if a price list is ever emptied of categories

Severity: Observation
Confidence: Low–Medium
Category: Data architecture / edge case
Location: `pages/PriceListAdminPage.tsx` `addNewItem()` (~line 147-162)

Evidence:
A new item defaults `kategoriaId` to `sortedKategoriak[0]?.id ?? ''`. The table groups items strictly by existing category id, so an item with `kategoriaId: ''` would never render, becoming unreachable for edit/delete via the UI.

Why it matters:
Only reachable by deleting every category down to zero, which is itself gated by the "delete only when empty" guard — very low likelihood against real clinic data (13 seeded categories today). Flagging as a latent edge case, not a live bug.

Recommendation:
Not worth fixing preemptively.

### ARCH-007 — The "three button styles" debt item is concretely: `ErrorBoundary` and `NumberField`'s stepper bypass the Radix-only UI rule

Severity: Minor
Confidence: High
Category: Architectural consistency / design-system compliance
Location: `components/ErrorBoundary.tsx:69-74` (inline-styled raw `<button>`s), `components/NumberField.tsx:162-179` (raw `<button>` stepper controls, `tabIndex={-1}`)

Evidence:
`docs/07-felulet-rendszer.md`: "Minden UI elem `@radix-ui/themes` komponensből jön. Ne írj kézzel gombot…" names exactly two exceptions (the dental chart SVG, the printed PDF document) — neither of these is one of them. `App.tsx`'s own comment confirms `ErrorBoundary` renders *inside* the `<Theme>` provider, so there's no technical reason it can't use Radix `Button`.

Why it matters:
This is the concrete shape of the already-tracked "three button styles" backlog item — three genuinely different button *implementations* (hand-rolled inline-styled, hand-rolled bare, and Radix), not just three Radix variant choices. `ErrorBoundary` in particular is the one screen most likely to be seen at the worst moment (an app crash), and it's the one that visually breaks from the rest of the app right then.

Recommendation:
Swap `ErrorBoundary`'s two buttons for Radix `Button` — no blocker. `NumberField`'s stepper is a more defensible exception (Radix has no numeric-stepper primitive); lower priority.

### ARCH-008 — Two build chunks exceed Vite's 500 kB warning threshold

Severity: Observation
Confidence: High
Category: Performance architecture / bundle size
Location: Build output — `dist/assets/index-*.js` (688.89 kB / 256.91 kB gzip), `dist/assets/PreviewPage-*.js` (1,448.99 kB / 487.37 kB gzip)

Evidence:
`vite build` output, this run.

Why it matters:
For an internal, desktop-browser, keyboard-driven single-user tool, initial load time is a minor concern, and the team already made the one code-splitting decision that mattered: `App.tsx` explicitly lazy-loads `PreviewPage` specifically because `@react-pdf/renderer` is ~1.5 MB on its own (see the comment at `App.tsx:17-19`). The remaining 688 kB main bundle is mostly `@radix-ui/themes` + `react-router-dom` + `react`/`react-dom`, none of which are easily reducible without real UX cost.

Recommendation:
No action — noting only so a future reviewer doesn't mistake the build warning for neglect; it's the deliberate result of the one splitting decision that mattered, not an absence of any.

### ARCH-009 — No CI gate for lint/typecheck/test, only a deploy workflow

Severity: Observation
Confidence: Medium
Category: Tooling/CI hygiene
Location: `.github/workflows/deploy.yml` (only workflow found)

Evidence:
Repository search found exactly one GitHub Actions workflow, for GitHub Pages deployment; no workflow runs `npm run lint`/`tsc -b`/`npm test` on PRs or pushes independent of deploy.

Why it matters:
For a solo-developer, single-branch project this is a reasonable trade-off — today's discipline (clean lint/typecheck/386 passing tests) is evidently maintained by hand, not by a gate. It's worth naming because that discipline is currently a *practice*, not an enforced *property* of the repo; a future contributor (human or agent) could merge something red without any automated signal beyond the deploy step itself potentially failing (and `deploy.yml` may or may not run tests before deploying — not verified here).

Recommendation:
Optional: add a lightweight CI job (lint + typecheck + test) on push, separate from deploy, if/when a second contributor joins. Not urgent for a solo project with this level of manual discipline.

## Pass 2 — Senior React Engineer

### REACT-001 — Focus is lost to `<body>` after picking an item via the tooth-map-triggered inline `ItemPicker`

Severity: **Major**
Confidence: **High — reproduced live in-browser**
Status: NEW
Category: Focus management / keyboard accessibility
Location: `pages/PlanEditorPage.tsx` (inline picker close/unmount around `setKeresoMod(false)`, ~line 621-625), contrasted with the phase-level picker's `finishPick()` which does explicitly refocus itself

Evidence:
Reproduced directly against the running dev server via `chrome-devtools`:
1. Navigated to `/#/terv`, expanded "Érintett fogak", clicked untreated tooth 16 → an inline `ItemPicker` opened and correctly received focus (`<input id="kereso-0-0">`).
2. Typed `tomes`, pressed `ArrowDown`, pressed `Enter` → the pick succeeded correctly: the row filled in ("Esztétikus tömés 1 felszín", 34 000 Ft), the tooth-chart cell updated to the right category color and label ("16. fog – Tömések"), phase and grand totals updated.
3. Immediately after, `document.activeElement` resolved to `<body>` — not the row's name field, not "Fog", not "Db", not any element on the page.

Why it matters:
CLAUDE.md states this rule without qualification: *"Ha valahol elakad a Tab-sorrend, az hiba"* ("If the Tab order gets stuck anywhere, that's a bug"), and separately calls the keyboard cycle *"az app fő versenyelőnye az Excellel szemben"* (the app's main competitive edge over Excel). This bug sits exactly in that cycle, at the newest entry point into it — the tooth-map "click a tooth → pick a treatment" flow shipped 2026-08-09 per `CHANGELOG.md`. A doctor who clicks a tooth and picks an item by keyboard now has focus silently dropped off the page; the next `Tab` press restarts from the navigation bar instead of continuing at the next logical field on the row they were just filling in.

Recommendation:
After a successful pick from the inline (tooth-map-triggered) `ItemPicker`, explicitly move focus to the next logical field on that row (e.g. "Db", since "Fog" is already filled from the tooth click) — mirroring what the phase-level picker's own `finishPick()` already does for itself.

### REACT-002 — `ItemPicker` has no ARIA combobox/listbox wiring

Severity: Minor
Confidence: Medium
Status: NEW
Category: Accessibility
Location: `pages/planEditor/ItemPicker.tsx` — input (~line 154-161), result rows (~182-228)

Evidence:
The `<input>` has no `role="combobox"`, `aria-expanded`, `aria-controls`, or `aria-activedescendant`; result rows have no `role="option"`/`id`. The currently-highlighted result is conveyed only through background color.

Why it matters:
A screen-reader user gets no indication that a result list opened, how many results exist, or which one is highlighted while arrowing through it — on the single most important interaction surface in the app. `docs/07-felulet-rendszer.md` states general keyboard/contrast/label rules without explicitly scoping out screen-reader support for this widget, so this reads as a real gap against the documented bar rather than a deliberately out-of-scope one.

Recommendation:
Add the standard combobox/listbox ARIA triad (`role="combobox"` + `aria-expanded`/`aria-controls` on the input, `role="listbox"` on the results container, `role="option"` + `id` per row, `aria-activedescendant` tracking the highlighted row) — or, if screen-reader support for this specific widget is knowingly out of scope for a single-sighted-user internal tool, say so explicitly in `docs/07` so it isn't mistaken for an oversight by a future reviewer.

### REACT-003 — `structuredClone(prev)` runs on every keystroke in uncommitted text fields

Severity: Observation
Confidence: High
Category: React performance
Location: `pages/PlanEditorPage.tsx` `updatePlan` (~line 154-160)

Evidence:
Every `onChange` (not blur/commit) for phase name, phase comment, line name, and the teeth field runs `structuredClone(prev)` on the *entire* plan object, which also re-triggers `AppState`'s per-change `localStorage` draft write (by design, no debounce — see `state/AppState.tsx`'s own comment on this).

Why it matters:
Correct and cheap at today's typical plan size (a handful of phases, a few rows each) — this is the project's own documented trade-off, not an oversight. Cost is O(full plan size) per keystroke rather than O(1), so typing latency would degrade if a plan ever grew very large.

Recommendation:
No action now; worth re-checking only if real-world plan sizes grow substantially beyond today's usage.

### REACT-004 — `sorResetToken`/`fazisResetToken` remount pattern discards all rows'/phases' local UI state on any single delete

Severity: Observation
Confidence: High
Category: Rendering correctness / component design
Location: `pages/PlanEditorPage.tsx` (~lines 105, 433, 476, 489 — `key={`${sorResetToken}-${li}`}`)

Evidence:
A deliberate, well-commented workaround for index-based `key` instability after a delete (to avoid a classic list-remount-loses-state bug) — but it works by bumping a shared token that remounts *every* row/phase in the list, not just the affected one.

Why it matters:
Correct today; harmless at current scale. Flagged only because "bump a shared token to force a remount" is the kind of pattern that gets copy-pasted into a future list without the same care, and would become a real papercut (losing another row's in-progress local state, like an open picker) if lists grow longer.

Recommendation:
No action now; worth a second look if this pattern gets reused elsewhere or lists grow substantially.

### REACT-005 — `design/toothChartSvg.ts`'s debug tooth-number overlay hand-parses SVG path data via regex

Severity: Minor
Confidence: Medium
Category: Robustness
Location: `design/toothChartSvg.ts:195-233` (`injectToothNumbers`)

Evidence:
Computes per-tooth bounding boxes from raw SVG path `d` attributes using regex. Confirmed via grep that this only runs behind a `showToothNumbers` debug flag that no production call site ever sets to `true` — only test files exercise it.

Why it matters:
Zero production impact today. The parser doesn't handle curve commands (C/Q) — fragile only if the underlying SVG asset (`assets/dental-chart-fdi-32.svg`) is ever redrawn using curves instead of straight-line paths.

Recommendation:
Not worth fixing preemptively.

### REACT-006 — `NumberField` focus-gated prop-sync fix verified sound

Severity: N/A (verification, not a finding)
Status: **RESOLVED**
Category: State correctness

Evidence:
Independently re-derived (not just trusted from the commit message): `useEffect` at `NumberField.tsx:89-91` correctly gates `draft` sync on `value`/`unit` to `!focused`, and `onBlur` now calls `setFocused(false)` before/alongside `commit()`, closing the gap where the sync effect would never re-arm after a field's first focus. Covered by a dedicated regression test (`NumberField.test.tsx`: "re-syncs the display after blur when the parent commits a different value").

### REACT-007 — `PriceListAdminPage` row keyboard-accessibility fix verified sound

Severity: N/A (verification, not a finding)
Status: **RESOLVED**
Category: Accessibility

Evidence:
Both item and category rows now use their name cell (`Table.RowHeaderCell`) as an explicit keyboard trigger: `role="button"`, `tabIndex={0}`, `aria-expanded`, `aria-controls`, and `Enter`/`Space` handling — applied consistently across both row types, not just one.

### REACT-008 — Three search fields now correctly carry `aria-label`

Severity: N/A (verification, not a finding)
Status: **RESOLVED**
Category: Accessibility

Evidence (verified directly by this review, via grep):
- `pages/PriceListAdminPage.tsx:226` — `aria-label="Keresés a tételek között"`
- `pages/planEditor/ItemPicker.tsx:161` — `aria-label="Tétel keresése"`
- `pages/PlanHistoryPage.tsx:232` — `aria-label="Keresés páciensnévre"`

All three previously relied on `placeholder` alone, which directly violated `docs/07-felulet-rendszer.md`'s "Címke az input FÖLÖTT. Soha placeholder címke helyett." rule.

### REACT-009 — `PreviewPage.finalize()` guard chain is still not a pure, independently testable function

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: Testability
Location: `pages/PreviewPage.tsx` `attemptFinalize`/`doFinalize` (~lines 209-284)

Evidence:
The guard sequence (name-missing check → `kitoltetlenSorok` hard block → missing-fields confirm → German-fallback-names confirm → save) still reads 5+ pieces of component state directly rather than being extracted to a pure function. Already tracked in `docs/08-backlog.md`.

Why it matters:
Behavior itself is correctly covered via integration tests (`PreviewPage.test.tsx`), and the sequencing was independently traced and found correct, including the deliberate non-`AlertDialog.Action` `Button` used specifically to avoid a race between confirm-step transitions (see Positive Observations). The testability gap is real but not currently masking a bug.

Recommendation:
No new action; remains appropriately tracked as backlog debt.

### REACT-010 — `pdf/TervDocument.tsx` remains one large file mixing concerns

Severity: Observation
Confidence: High
Status: CARRIED FORWARD
Category: Component design / maintainability
Location: `pdf/TervDocument.tsx` (503 lines: style objects, 5 subcomponents, and the top-level `Document`)

Evidence:
Unchanged since `docs/08-backlog.md`'s "three largest files" item was written.

Recommendation:
No new action; remains appropriately tracked.

## Previous Review Comparison

**Provenance note (important — read before trusting "no prior review" from a future run).** A same-day prior review, produced by this same skill, was committed at `39c4c26` ("docs: add code-and-architecture-review skill and 2026-08-10 review report") as `docs/reviews/2026-08-10-arch-react-review.md`. A later commit, `93ec17c` ("docs: consolidate archived backlog decisions into main docs, add closure process"), removed that file — its message frames the removal as clearing out "duplicated `docs/reviews/` and root `review/` folders" alongside genuinely-archived backlog planning docs, but the effect was that a *live* review report (not archived material) was swept away along with it. This review's `docs/reviews/` directory was empty on disk before this run. The prior report's content was recovered from git history (`git show 39c4c26:docs/reviews/2026-08-10-arch-react-review.md`) and used as the baseline below, since discarding it and claiming "no baseline exists" would have been inaccurate — the review happened hours ago, same day, same skill. **Recommend the team treat `docs/reviews/` as exempt from future documentation-consolidation sweeps.**

This report is saved as `-2` (not overwriting a slot) both because the skill's own convention calls for `-2`/`-3` on multiple same-day runs, and because it makes the day's actual review count (two) visible rather than erasing the first one's existence a second time.

### Resolved

- **`NumberField` never cleared its `focused` state, permanently disabling props→draft resync after first focus** (previously rated Critical). Independently re-verified fixed in this run — see REACT-006.
- **`PriceListAdminPage` item/category rows were openable only by mouse click, with no keyboard path at all** (previously rated Medium/Közepes). Independently re-verified fixed in this run — see REACT-007.
- **Three search fields (Árlista admin filter, `ItemPicker`, plan-history patient search) had no `aria-label`, placeholder-only** (previously rated Medium/Közepes). Independently re-verified fixed in this run — see REACT-008.
- **`basePrice()` was reimplemented in `PlanEditorPage.tsx` instead of importing `domain/money.ts`'s version** (tracked in `docs/08-backlog.md`'s technical-debt list, not the deleted review). Independently verified fixed: `PlanEditorPage.tsx` now imports `basePrice` from `domain/money.ts` directly. `docs/08-backlog.md`'s "Cím szintű, kisebb tételek" bullet is now stale on this one point.

### Carried forward

- Storage-write timing inconsistency (ARCH-001), `commit()`/`patch()` no functional updater (ARCH-002), `storage/seed/priceList.ts` boundary crossing (ARCH-003), `SettingsPage.tsx` importing `DemoStorage`'s `PREFIX` (intentional, tracked, unchanged), SAVOS min/max unvalidated, `parseTeeth` no dedup, three largest files unsplit (REACT-010 covers `TervDocument.tsx`; `PlanEditorPage.tsx`/`PriceListAdminPage.tsx` unchanged), `PreviewPage.finalize()` not pure (REACT-009), unencrypted `localStorage` (explicit, documented mockup-phase trade-off, not a defect) — all reconfirmed present in this run via direct code reading, not assumed from the backlog list.
- The prior review's Small/"Apró" `SettingsPage.tsx` PREFIX-import finding is unchanged and remains correctly classified as intentional, single-implementation-only coupling, not urgent.

### New

- REACT-001 (Major) — inline `ItemPicker` focus loss to `<body>` after a tooth-map-triggered pick. Not found by the prior review (which covered `NumberField` and `PriceListAdminPage` but not this specific interaction path).
- ARCH-004, ARCH-005, ARCH-006, ARCH-007, ARCH-008, ARCH-009, REACT-002, REACT-003, REACT-004, REACT-005 — see above; all Minor or Observation.

## Recommended Priorities

### Address first

1. Fix REACT-001 (inline `ItemPicker` focus loss after a tooth-map pick) — it's a Major, live-reproduced break in the app's core documented UX invariant, in an actively-used flow.
2. Decide how to prevent `docs/reviews/` from being swept up in future documentation-consolidation work (process fix, not code).

### Next

1. ARCH-005 — extract the duplicated `Field`/`FieldGroup` component (accessibility logic, not just style, is duplicated three ways).
2. ARCH-007 — swap `ErrorBoundary`'s hand-rolled buttons for Radix `Button` (cheap, and it's the screen most likely to be seen at the worst moment).
3. REACT-002 — add ARIA combobox/listbox semantics to `ItemPicker`, or explicitly document screen-reader support as out of scope for this widget.

### Monitor

1. ARCH-001/ARCH-004 — storage-write timing and full-history reads: both fine today, both flagged in the project's own Phase 2 (`FileSystemStorage`) planning already; no new action, just don't let them get lost.
2. REACT-003/REACT-004 — per-keystroke `structuredClone` and the shared remount-token pattern: both fine at current plan/list sizes, worth a second look only if real-world data grows substantially.
3. ARCH-008/ARCH-009 — bundle size and absence of a dedicated CI gate: both reasonable at this scale and team size; revisit only if the app's audience or contributor count changes.
