---
name: update-features
description: Rewrite docs/FEATURES.md — the plain-language, screen-by-screen summary of what the app can do — by reviewing the current UI source. Applied by /implement and /fix at an item's closing step when a doki-visible capability is added or changed (affected sections only, the closing commit carries it); run explicitly with /update-features for a full snapshot refresh.
disable-model-invocation: true
---

# Update Features

## Audience

Same audience as `docs/CHANGELOG.md`: a dentist and their assistant, zero technical background.
Every bullet must be understandable without technical vocabulary. If a sentence needs a
technical term to make sense, rewrite it around the term, don't define it.

## docs/FEATURES.md vs. docs/CHANGELOG.md — do not conflate them

| | `docs/CHANGELOG.md` | `docs/FEATURES.md` |
|---|---|---|
| Question | What changed? | What can the app do? |
| Model | dated log, append-only | snapshot, rewritten every run |
| Tense | "Mostantól…", "Javítottuk…" (past/now) | timeless present tense, no dates |

This skill produces a **snapshot**, not a log entry. A run can add, remove, or reword
bullets — the previous content is not sacred. Never write dates, "mostantól", "új",
"javítottuk" or similar time-relative language — that belongs in the changelog, not here.

## When this runs

Two callers, same rules:

- **Inside `/implement` or `/fix`**, at the closing step of an item that adds a capability or
  changes an existing one the doki can see: the caller reads this file directly (not via the
  Skill tool), updates only the affected section(s), and skips Step 6 — the item's closing
  commit (`close.mjs`) carries `docs/FEATURES.md`.
- **Explicitly with `/update-features`**, for a full snapshot rewrite; then Step 6 commits and
  pushes on its own.

## Step 1 — Scope (a hint, not the source of truth)

Run `git log -1 --format=%H -- docs/FEATURES.md` to find the last update, then look at what
changed in `app/src/pages/` and `app/src/components/` since then. Use this **only** to
decide which screens are worth re-reading closely — the actual content always comes from
Step 2's fresh read of the current source, never from commit messages or diffs alone. Code
is ground truth (same principle as `/update-changelog` step 1.3). Do not store a marker/hash
anywhere — work this out fresh each run.

## Step 2 — Review the screens (static code reading, no browser)

Read, in this order:

1. `app/src/components/NavBar.tsx` — the `LINKS` array gives the canonical section names
   and order.
2. The six page components and their sub-components:
   - `app/src/pages/PatientPage.tsx`
   - `app/src/pages/PlanEditorPage.tsx` + `app/src/pages/planEditor/*`
   - `app/src/pages/PreviewPage.tsx`
   - `app/src/pages/demo/OsszesTervSection.tsx`
   - `app/src/pages/PriceListAdminPage.tsx` + `app/src/pages/priceListAdmin/*`
   - `app/src/pages/SettingsPage.tsx`
   - Shared UI components they render (`app/src/components/*`) where relevant to what's
     visibly on screen.

This skill **never launches a browser**. Per CLAUDE.md's "Böngésző-automatizálás" rule,
browser-based checks for this app are the manually-invoked `manual-checks` skill's job,
not this one's. Static reading of headings, labels, button text, and visible copy is enough
to describe what the doctor can do on each screen.

docs/FEATURES.md describes what the doctor actually sees and can do, sourced only from the UI
itself, in the UI's own words where possible — not from developer-facing context files.

## Step 3 — Filter: is this feature-worthy?

Ask, for each capability found: **"Would the doctor or assistant say 'I can do X here' about
this?"**

**Include:**
- A distinct thing the doctor/assistant can view, enter, or trigger on that screen
- A rule or safeguard the doctor experiences directly (e.g. "old versions are never
  overwritten", "a placeholder declaration blocks the signature page")

**Exclude:**
- Internal data format, technical guarantees, implementation details
- Anything time-relative — that's the changelog's job, not this file's
- Screen-only chrome with no distinct capability (e.g. a heading, a loading skeleton)

## Step 4 — Write the entries

2–4 bullets per section, one or two sentences each. Timeless present tense
("A kezelési terv összeállítása…", not "Mostantól összeállítható…"). Describe the effect,
not the implementation — same banned-terms list as `/update-changelog`: `refaktor`,
`backend`, `frontend`, `API`, `adatbázis`, `commit`, `bugfix`, `migráció`, `deploy`,
`endpoint`, `render`, `state`.

## Step 5 — Format (hard rules, the parser is fixed)

`FeatureOverviewCard.tsx` parses this file with `parseSections(featuresNyers, { alcimek: true })`
(`app/src/domain/markdownSections.ts`) — the same minimal parser `ChangelogCard` uses for
`docs/CHANGELOG.md` (called there *without* `{ alcimek: true }`, so `docs/CHANGELOG.md` never needs to
know about the third line shape below). It understands three line shapes:

- `## <cím>` — starts a section
- `### <cím>` — starts a named sub-group **within** the current section, for readability when
  a section has grown into a long, hard-to-scan list of bullets (e.g. `Páciensek` today has
  four: `Pácienskezelés`, `Tervek és verziók`, `Terv összeállítása`, `Véglegesítés`). Optional —
  a section with only a handful of bullets doesn't need one. A bullet appearing before the
  first `### ` in a section that uses them renders as an unlabeled group at the top; don't rely
  on this for anything but a short lead-in, group everything else.
- `- <szöveg>` — starts a bullet; a bullet may continue on the following line(s) without a
  leading `-`, which get joined into the same bullet. A blank line closes the current bullet.

Anything else (sub-bullets, bold, links, nested lists) renders as raw text on the card — do
not use it.

**Section titles and order must exactly match `NavBar.tsx`'s `FO_LINKS` labels**, excluding
"Kezdőlap": `Páciensek`, `Kezelések és árak`, `Beállítások`, `DEMO`. No section outside this
list — a capability that spans multiple screens goes under the section where the doctor
actually meets it (e.g. language/currency choice goes under `Páciensek`, since that's where
it's set — the plan-editing/preview screens have no nav link of their own, they're reached
through the patient workflow shell).

The file opens with `# Funkciók` and a one-line explanation, exactly like `docs/CHANGELOG.md`
opens with `# Változásnapló` — this line is outside any `##` section, so the parser (and the
card) ignores it.

## Step 6 — Write and commit (explicit call only)

This skill runs end-to-end without pausing for review or approval: write the drafted content
directly to `docs/FEATURES.md` — this file gets rewritten wholesale, not appended to, so re-read
the current content in Step 2 carefully before overwriting it, since a bad run can silently
delete something true. Then commit and push. Called from `/implement` or `/fix`, stop after
writing — the closing commit carries the file.

Commit **only that file** and push it at once — every shared-state change in this repo is
committed and pushed by the skill that made it:

```
node scripts/workflow/commit-push.mjs -m "docs: FEATURES.md frissítése (<a mai nap magyar dátuma>.)" \
  --body "<1 short Hungarian sentence naming what changed in this pass>" \
  --trailer "Co-Authored-By: …" --trailer "Claude-Session: …" -- docs/FEATURES.md
```

Subject example: `docs: FEATURES.md frissítése (szeptember 5.)`. The script stages only the
given path (never sweeps in unrelated files), runs docs-check, commits, pushes; if it stops,
report its output instead of working around it with manual `git`.

## Notes

- Shares `parseSections()` (`app/src/domain/markdownSections.ts`) with `ChangelogCard` — do
  not write a second parser for this file.
- If `docs/FEATURES.md` doesn't exist yet, this run creates it from scratch via Steps 1–4 above
  (Step 1 will simply find no prior state, which is fine).
