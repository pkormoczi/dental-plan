---
name: update-changelog
description: Draft a plain-language, non-technical CHANGELOG.md entry describing a feature or fix that was just implemented and reviewed. Use once per completed feature or fix, at commit time — not per commit, and not for internal-only changes. Never invoked automatically; user must run it explicitly with /update-changelog.
disable-model-invocation: true
---

# Update Changelog

## Audience

The changelog is read by a dentist and their assistant — not developers. Every entry must be
understandable to someone with zero technical background. If a sentence needs a technical term
to make sense, rewrite it around the term, don't define it.

## When this runs

Invoked explicitly with `/update-changelog`, once a feature or fix is implemented and reviewed,
before or alongside the commit. Never per raw commit — a single user-facing feature may span
several commits; those collapse into ONE entry.

## Step 1 — Determine scope

Find what actually changed since the last changelog entry:

1. Read the most recent dated entry in `CHANGELOG.md` to find the reference point.
2. Run `git log` and `git diff` from that point (or from the start of the current feature branch/
   session if the repo is not the reference point — ask if ambiguous) to the current state.
3. Treat the diff as ground truth, not the plan. If a `CONTEXT.md` or ADR exists for this feature
   (from a grilling session), use it to understand *intent*, but describe what actually shipped —
   plans can be aspirational or stale.

## Step 2 — Filter: is this changelog-worthy?

Ask, for each distinct change: **"Would the doctor or assistant notice or care about this while
using the app?"**

**Exclude — do not write an entry for:**
- Refactors, renames, code reorganization with no behavior change
- Dependency/library upgrades
- Styling changes that don't change what the user sees as an outcome
- Performance work, unless it fixes a point that was noticeably slow to the user
- Test additions, CI/build config, tooling, dev-only scripts
- Admin/internal-only changes the doctor never interacts with
- Typo fixes in code (comments, variable names) — NOT typo fixes in printed/UI text, which DO count

**Include — write an entry for:**
- New fields, screens, or capabilities the doctor/assistant can use
- Any change to the printed treatment plan / quote output
- Fixes to a calculation, price, or behavior that affects a quote
- Wording changes on the printed form or in the app UI
- Anything the doctor explicitly requested

If nothing in scope is changelog-worthy, say so plainly and don't write an entry. Don't pad the
changelog to justify running the command.

## Step 3 — Write the entry

**Language: Hungarian. Plain, everyday words. Describe the effect, not the implementation.**

Banned terms (translate around them, don't use them even in explanation):
`refaktor`, `backend`, `frontend`, `API`, `adatbázis`, `commit`, `bugfix`, `migráció`, `deploy`,
`endpoint`, `render`, `state`. If the underlying change is genuinely technical (e.g. "migrated
pricing logic to a new module"), find the *user-visible* consequence and describe only that — or
conclude it's not changelog-worthy (see Step 2).

One entry = one short bullet. Multiple commits for the same feature = one bullet, not several.
Describe what changed from the user's point of view, e.g.:

> Rossz: "Refaktoráltuk a fogszám-validációs logikát a backend oldalon."
> Jó: "Mostantól a rendszer figyelmeztet, ha érvénytelen fogszámot adunk meg."

## Step 4 — Format

Reverse-chronological, dated sections in Hungarian date format. No semver, no "Added/Changed/
Fixed" English headers, no commit hashes — the reader doesn't think in those categories.

```
## 2026. augusztus 9.
- Mostantól a nyomtatott kezelési terven feltüntetjük az érintett fogszámokat is.
- Javítottuk, hogy a kedvezmény ne jelenjen meg a nyomtatott dokumentumon.

## 2026. augusztus 3.
- Bevezettük a kétnyelvű (magyar/német) árazást — az admin felületen külön szerkeszthető.
```

If today's date already has a section (multiple `/update-changelog` runs same day), append to it
rather than creating a duplicate date header.

## Step 5 — Confirm before writing

Never write directly to `CHANGELOG.md` without showing the drafted entry first. Present the exact
text you intend to add and wait for explicit approval. If a filtered-out change is borderline,
mention it was left out and why, so the decision is visible — but don't add a "kihagyva" note
into the actual changelog file itself.

## Notes

- This skill only produces content for `CHANGELOG.md` in the repo. It does not solve how the
  doctor/assistant actually read it (raw `.md` files in a git repo aren't accessible to a
  non-technical audience) — that's a separate distribution decision.
- If `CHANGELOG.md` doesn't exist yet, create it with a one-line Hungarian header explaining what
  the document is, before the first dated section.
