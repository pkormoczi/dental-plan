---
name: arch-react-review
description: Manual, periodic review of a React application from two lenses — architect and senior React developer. Produces a dated, severity-tagged findings report; never edits code. Invoke explicitly with /arch-react-review. Not project-specific — reads the current repo's own context.
disable-model-invocation: true
---

# Architect + Senior React Dev Review

## Purpose

A periodic health check, run by hand, not on a schedule and not on every commit. Two passes,
two different vantage points. This skill only produces a report — it never edits application
code. Fixing findings is a separate, deliberate step the user decides on afterward.

## Before starting

1. Read the project's own context first: `CLAUDE.md` and everything under `docs/*.md`. Design
   decisions and rationale live there — don't re-derive intent from reading implementation code
   when the answer is already written down. If something in the code looks wrong but a docs file
   explains why it's intentional, note the tension in the report instead of flagging it as a
   plain defect.
2. Check whether a previous review report exists (see Output location below). If one does, read
   it — the new report must reference it (see Step 3).
3. Scope: application source only. Exclude `node_modules`, build output, generated files, and
   third-party vendored code. Do not perform a full test-coverage audit — note glaring gaps only
   in passing, don't treat this as a testing review.

## Pass 1 — Architect lens

Look at the application from a system level, not component-by-component.

**Architecture & data flow**
- Module/feature boundaries: are responsibilities cleanly separated, or is logic smeared across
  unrelated areas?
- State management: unnecessary global state, prop-drilling that a boundary change would fix,
  state living further from where it's used than it needs to
- Data/API layer: is fetching/error-handling consistent, or does each component reinvent it?
- Duplicated logic across components/modules that should be a shared abstraction — and the
  opposite failure, premature abstraction nothing else uses yet

**Security & dependency hygiene**
- Anything that could leak into the client bundle that shouldn't (API keys, secrets, internal URLs)
- `dangerouslySetInnerHTML` or other XSS-prone patterns, and whether input is actually sanitized
- Dependencies that seem unjustified for what they're used for, or duplicate what another
  dependency already provides

## Pass 2 — Senior React dev lens

Look at the component level.

**React-specific quality**
- Components doing too much / mixing concerns that should split
- Hook discipline: incorrect dependency arrays, stale closures, custom hooks that should exist
  but don't (repeated hook logic copy-pasted across components)
- Memoization: missing where it actually matters (measurable re-render cost), or applied
  reflexively where it adds complexity without benefit
- Dead code: unused components, orphaned files, commented-out blocks

**UX robustness & accessibility**
- Error and loading states: missing, inconsistent, or silently swallowed failures
- Form handling and validation patterns, especially where the same form logic repeats
- Baseline accessibility: semantic HTML over div-soup, ARIA where it's actually needed, keyboard
  navigability — flag violations that would concern a non-technical end user, not theoretical
  WCAG completeness

## Step 3 — Compare against the previous report

If a prior report exists:
- List findings that were resolved since then
- List findings still open, carried forward unchanged
- Mark genuinely new findings as new

If no prior report exists, skip this section — don't fabricate a baseline.

## Output

**Format:** one report per run, both passes as separate sections. Each finding gets:
- Severity: `Kritikus` / `Közepes` / `Apró`
- File reference (path, and line number or symbol name)
- One or two sentences: what's wrong and why it matters — not a lecture, not a full essay
- A direction for the fix, in a sentence — not a diff, not an implementation. This is a report,
  not a patch.

**Location:** write to `docs/reviews/YYYY-MM-DD-arch-react-review.md` (use today's date). Create
the `docs/reviews/` directory if it doesn't exist. Never overwrite a same-day report from an
earlier run without asking — append a `-2`, `-3` suffix instead if run twice in one day.

**Never edit application source code as part of this skill.** If a finding is trivial enough that
fixing it feels obvious, still only report it — the user decides what gets acted on and when.

## Notes

- This skill deliberately doesn't run automatically and has no trigger phrases
  (`disable-model-invocation: true`). Frequency and timing are the user's call.
- If the codebase is large enough that a single pass would blow the context budget, say so before
  starting rather than doing a shallow skim silently — offer to scope to a subdirectory or a
  specific feature area instead.
