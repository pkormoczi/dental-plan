---
name: arch-react-review
description: Manual periodic review of a React application from two independent lenses — Senior Software Architect and Senior React Engineer. Produces a dated, evidence-based findings report and never edits application code. Invoke explicitly with /arch-react-review.
disable-model-invocation: true
---

# Senior Software Architect + Senior React Engineer Review

## Purpose

Perform a periodic health check of the current React application from two distinct perspectives:

1. **Senior Software Architect** — system structure, boundaries, state/data architecture, integrations, security, resilience, performance, maintainability and production readiness.
2. **Senior React Engineer** — components, hooks, rendering, TypeScript, forms, data fetching, accessibility and React-specific implementation quality.

This skill produces a review report only.

**Never modify application source code as part of this skill.**

Fixing findings is a separate, deliberate action initiated by the user.

---

# Review principles

## Evidence over preference

Do not report a finding merely because you would personally structure the code differently.

A finding must demonstrate at least one concrete consequence:

- correctness risk
- maintainability cost
- unnecessary coupling
- security risk
- performance impact
- scalability limitation relevant to expected usage
- developer friction
- operational risk
- UX or accessibility impact

Prefer evidence over stylistic preference.

## Avoid architecture astronautics

Do not recommend introducing a new abstraction, pattern, architectural layer, state manager, library, design system or generic framework unless the existing code demonstrates a concrete problem that it would solve.

Do not optimize for hypothetical future scale without evidence.

Prefer the simplest architecture that adequately supports current and reasonably foreseeable needs.

## Respect documented decisions

Project documentation takes precedence over assumptions inferred from implementation.

If something appears questionable but documentation explains it as an intentional trade-off:

- do not report it as a plain defect
- describe the trade-off
- report it only if it now has a concrete negative consequence

## Judge the application that exists

Severity must consider:

- application size
- business criticality
- deployment model
- expected growth
- team size
- documented constraints
- actual complexity

Do not judge a small application as if it were a hypothetical enterprise platform.

---

# Before starting

## 1. Read project context

Read available project documentation first:

- `CLAUDE.md`
- `README.md`
- `docs/**/*.md`
- ADRs
- contribution/coding guidelines

Understand:

- application purpose
- users
- deployment model
- expected scale
- major constraints
- deliberate architecture decisions
- technology choices and rationale

## 2. Repository reconnaissance

Build a mental model before reviewing individual files.

Inspect relevant files when present:

- `package.json`
- lock file
- `tsconfig*.json`
- `vite.config.*`
- framework configuration
- `eslint.config.*`
- test configuration
- router configuration
- environment configuration
- Dockerfile
- CI/CD workflows
- application source structure

Identify:

- React and TypeScript versions
- build tool
- routing
- state-management approach
- data-fetching/server-state approach
- forms and validation
- UI/component library
- styling approach
- test framework
- major dependencies
- primary features/modules

## 3. Scope

Review:

- application source
- relevant build/runtime configuration
- dependency configuration
- TypeScript and lint configuration
- routing
- existing test structure
- relevant CI configuration

Exclude:

- `node_modules`
- build/coverage output
- generated files
- third-party vendored code
- generated API clients unless custom modifications exist

This is not a full test-coverage audit. Mention only material or glaring gaps.

## 4. Automated quality signals

If the project already defines suitable commands, run read-only validation such as:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Use only commands supported by the project.

Do not install dependencies or modify configuration to make them pass.

Summarize systemic failures; do not flood the report with individual lint messages.

---

# Pass 1 — Senior Software Architect

Review the system as a whole rather than component-by-component.

## 1. System structure and boundaries

Review:

- feature/module boundaries
- responsibility ownership
- dependency direction
- coupling between features
- circular dependencies
- cross-feature imports
- shared/common modules
- public module APIs
- feature isolation

Look for:

- responsibilities smeared across unrelated areas
- features reaching into other features' internals
- large dumping-ground `shared`, `common`, `utils` or `components` areas
- changes requiring unrelated modifications elsewhere

Do not flag technical-folder vs feature-folder organization by itself; report concrete consequences.

## 2. Layering and dependency direction

Look for:

- UI code containing infrastructure concerns
- low-level modules importing high-level features
- domain/business logic unnecessarily coupled to React
- infrastructure details leaking into presentation code
- intended layers being bypassed
- unnecessary layers that add only indirection

## 3. Business/domain logic placement

Check whether important application rules are:

- discoverable
- reusable where necessary
- testable
- separated from JSX/framework concerns when complexity justifies it

Look for business logic hidden inside:

- JSX
- event handlers
- effects
- API adapters
- formatting utilities

Do not require a formal domain layer for simple applications.

## 4. State architecture

Distinguish:

- local UI state
- shared client state
- server state
- URL/navigation state
- persisted browser state

Review:

- state ownership
- duplicated state
- stored derived state
- multiple sources of truth
- unnecessary global state
- excessive Context usage
- global stores containing local concerns
- server data unnecessarily copied into client stores
- synchronization problems
- localStorage/sessionStorage usage
- cache consistency and optimistic updates

## 5. Data and API architecture

Review consistency of:

- API clients
- request construction
- DTO handling
- data mapping
- authentication headers
- error normalization
- timeout/retry/cancellation
- loading/mutation handling
- pagination
- caching

Look for:

- direct HTTP logic scattered through components
- backend transport models leaking across the entire UI
- API changes requiring widespread component changes
- competing data-access patterns

Do not introduce abstraction where a few simple direct calls are adequate.

## 6. Cross-cutting concerns

Review ownership and consistency of:

- authentication
- authorization-related UI behavior
- logging
- error handling
- feature flags
- telemetry
- internationalization
- formatting
- notifications
- configuration

## 7. Security architecture

Look for:

- secrets exposed to the client bundle
- unsafe environment-variable usage
- `dangerouslySetInnerHTML`
- untrusted HTML
- XSS-prone rendering
- unsafe user-controlled URLs/redirects
- sensitive data in localStorage/sessionStorage
- sensitive data in URL/query parameters
- sensitive logging
- weak token-handling assumptions
- unsafe file-upload assumptions
- risky third-party scripts
- materially relevant dependency risks

Remember:

**Client-side authorization is UX behavior, not a security boundary.**

Do not claim backend vulnerabilities without backend evidence.

## 8. Resilience and failure architecture

Evaluate behavior when:

- APIs fail
- networks are slow
- requests timeout
- mutations fail
- partial data loads
- stale/malformed data arrives
- runtime exceptions occur

Look for:

- silent failures
- inconsistent recovery
- infinite/repeated retry behavior
- missing error isolation
- screens becoming permanently unusable
- duplicate submission risks

## 9. Performance architecture

Review system-level issues:

- initial bundle size
- route-level code splitting
- lazy loading
- heavy/duplicate dependencies
- large assets
- network waterfalls
- repeated/N+1 requests
- caching strategy
- large lists
- excessive client-side processing

Report only reasonably evidenced impact.

Do not recommend code splitting or optimization everywhere by default.

## 10. Maintainability and extensibility

Ask:

- Is change localized?
- Is feature ownership obvious?
- Can a feature change without touching unrelated areas?
- Can a feature be removed cleanly?
- Are conventions predictable?
- Is similar functionality implemented similarly?

Report architecture that materially raises the cost or risk of ordinary future change.

## 11. Dependency, tooling and configuration hygiene

Review:

- overlapping libraries
- oversized dependencies for trivial functionality
- obsolete/abandoned dependencies where relevant
- inconsistent tooling
- build/runtime dependency misuse
- environment-specific hardcoding
- scattered configuration
- fragile development/production branching

Do not produce a generic dependency-update list.

## 12. Architectural consistency

Identify competing patterns for the same responsibility, for example:

- multiple API approaches
- multiple state conventions
- inconsistent validation
- inconsistent error handling
- inconsistent module organization

Report variation only when it creates cognitive load or maintenance risk.

---

# Pass 2 — Senior React Engineer

Perform a fresh implementation-level review.

## 1. Component design

Review:

- component responsibility and cohesion
- components doing too much
- reusable vs feature-specific components
- prop design
- composition
- duplicated variants
- boolean-prop explosion
- business logic embedded in JSX
- deeply nested conditional rendering

Do not split components merely because they are long.

Split when it improves cohesion, readability, reuse, testing or change isolation.

## 2. Hooks and effects

Review:

- Rules of Hooks
- dependency arrays
- stale closures
- cleanup
- timers/subscriptions/listeners
- async race conditions
- request cancellation
- unstable dependencies
- repeated hook logic
- custom-hook boundaries

Pay special attention to unnecessary effects.

Ask:

**Could this effect be removed entirely?**

Look for:

- effects calculating derived state
- chains of effects triggering each other
- effects used as event handlers
- multiple states being synchronized unnecessarily

## 3. State correctness

Review:

- duplicated/derived state
- object/array mutation
- stale updates
- functional updates where needed
- initialization/reset behavior
- controlled vs uncontrolled values
- ownership of state

## 4. Rendering correctness

Review:

- incorrect/unstable keys
- array-index keys where ordering changes
- accidental remounting
- conditional component identity
- lost local state
- incorrect conditional rendering
- object/array identity problems

Prioritize correctness over theoretical render optimization.

## 5. Data fetching and mutations

Review:

- lifecycle correctness
- loading/error/empty states
- retries
- duplicate requests
- stale requests
- cancellation
- race conditions
- mutation feedback
- optimistic updates
- cache invalidation
- repeated/double submission

## 6. Forms and validation

Review:

- controlled/uncontrolled patterns
- validation consistency
- repeated form logic
- schema validation where used
- field/form errors
- submission lifecycle
- server validation errors
- reset behavior
- double submission
- accessible error presentation

Do not require a form library for simple forms.

## 7. TypeScript quality

Review:

- `any`
- unsafe assertions
- `as unknown as`
- non-null assertions
- overly broad types
- nullable states
- stringly typed state
- incorrect optional properties
- prop types
- API types
- DTO/domain/UI type mixing
- unnecessary generic complexity

Look for casts used to silence the compiler rather than prove correctness.

Prefer clear types modeling actual application states.

## 8. Error, loading and empty states

Look for:

- swallowed errors
- `console.error` as the only handling
- unhandled promises
- misleading success UI after failure
- missing recovery/retry
- missing error boundaries where useful
- missing loading or empty states
- duplicate actions while mutations are pending

## 9. React performance

Look for:

- genuinely expensive repeated renders
- broad Context-triggered rerenders
- large render trees updated unnecessarily
- expensive calculations during render
- unstable props defeating memoization
- large lists
- unnecessary remounts

Review memoization critically:

- missing where measurable cost exists
- unnecessary where complexity exceeds benefit
- incorrect dependencies
- reflexive `useMemo` / `useCallback`

Do not treat every rerender as a problem.

## 10. Accessibility

Perform a practical accessibility review, not a formal WCAG audit.

Focus on:

- semantic HTML
- buttons vs clickable divs
- form labels
- accessible names
- keyboard navigation
- focus handling
- dialogs/modals
- tab order
- image alt text
- ARIA correctness
- color-only state indication

Prefer native HTML semantics over unnecessary ARIA.

## 11. Routing and navigation

Review:

- route structure
- nested routes
- URL state
- deep links
- invalid routes
- redirects
- browser back/forward behavior
- route guards
- navigation loading behavior

## 12. Styling and UI engineering

Review engineering consistency, not visual taste:

- styling strategy
- global CSS leakage
- duplicated design tokens
- repeated hardcoded values
- responsive behavior
- style coupling
- excessive `z-index`
- reusable UI primitives
- existing design-system consistency

Do not recommend a design system unless concrete repetition/inconsistency justifies it.

## 13. Dead code and unnecessary complexity

Look for:

- unused/orphaned components and files
- unused hooks/utilities
- commented-out implementation
- obsolete branches
- unnecessary wrappers
- one-use generic abstractions
- premature abstraction
- over-engineered helper layers

Prefer deletion over abstraction when code is no longer needed.

---

# Pass 3 — Compare against previous review

**Do not read the previous review before completing Pass 1 and Pass 2.**

This avoids anchoring the current review to previous findings.

After both fresh passes are complete, check `docs/reviews/` for the most recent prior review.

Classify findings as:

- `NEW`
- `CARRIED FORWARD`
- `RESOLVED`

Only carry a finding forward when the underlying issue materially remains.

If no prior report exists, skip comparison.

Do not fabricate a baseline.

---

# Severity

Use:

## Critical

Serious current risk such as:

- security vulnerability
- data-loss risk
- broken production behavior
- major correctness issue
- application-wide failure risk

Critical findings should be rare.

## Major

Meaningful issue materially affecting:

- correctness
- architecture
- maintainability
- security
- performance
- developer productivity
- user experience

## Minor

Localized issue with limited impact.

## Observation

Not currently a defect, but worth tracking:

- emerging architectural drift
- a trade-off approaching its limit
- a pattern that may become problematic if it spreads
- an intentional compromise worth documenting

Do not inflate observations into defects.

---

# Confidence

Each finding includes:

- `High`
- `Medium`
- `Low`

Use `Low` sparingly.

Low-confidence concerns normally belong as observations unless potential impact is serious.

---

# Evidence requirements

Every finding must contain concrete evidence.

Prefer:

- file path
- line number
- symbol/component/hook/function name
- configuration key
- repeated pattern across named locations

Avoid vague findings such as:

> State management could be improved.

Explain exactly what was observed and its consequence.

---

# Output

Write one report per run to:

`docs/reviews/YYYY-MM-DD-arch-react-review.md`

Use today's date.

Create `docs/reviews/` if needed.

Never overwrite an existing same-day report.

Use `-2`, `-3`, etc. for additional same-day runs.

---

# Report format

```markdown
# Architecture + React Review

Date: YYYY-MM-DD

## Executive Summary

Architecture health: GOOD | ACCEPTABLE | CONCERNING | CRITICAL

Critical: N
Major: N
Minor: N
Observations: N

### Top concerns

1. ...
2. ...
3. ...

### Positive observations

- ...
- ...
- ...

## Repository Context

- React:
- TypeScript:
- Build:
- Routing:
- State management:
- Data fetching:
- Forms:
- Styling/UI:
- Tests:
- Deployment/build notes:

## Automated Quality Signals

- Build:
- Type check:
- Lint:
- Tests:

## Pass 1 — Senior Software Architect

### ARCH-001 — Finding title

Severity: Major
Confidence: High
Status: NEW
Category: State architecture
Location: `src/...`

Evidence:
...

Why it matters:
...

Recommendation:
...

## Pass 2 — Senior React Engineer

### REACT-001 — Finding title

Severity: Minor
Confidence: High
Status: NEW
Category: Hooks
Location: `src/...`

Evidence:
...

Why it matters:
...

Recommendation:
...

## Previous Review Comparison

### Resolved
- ...

### Carried forward
- ...

### New
- ...

## Recommended Priorities

### Address first
1. ...

### Next
1. ...

### Monitor
1. ...
```

---

# Finding style

For every finding explain:

1. **Evidence** — what was observed
2. **Why it matters** — concrete consequence
3. **Recommendation** — direction for improvement

Keep findings concise and actionable.

Do not provide full implementations or diffs.

---

# Positive observations

Include a small number of evidence-backed positive observations.

Examples:

- clear feature boundaries
- consistent API abstraction
- strong TypeScript modeling
- well-contained state
- effective component reuse
- good accessibility primitives

The purpose is to identify good architectural decisions that should be preserved during future changes.

---

# Large repository behavior

If the repository is too large for reliable full review:

1. Do not silently perform a shallow skim.
2. Inspect repository structure and context first.
3. State which areas were actually reviewed.
4. Prefer representative vertical slices and high-risk areas.
5. Clearly mark the report as scoped/partial.
6. Never claim complete coverage when it was not achieved.

---

# Final guardrails

- Never edit application source code.
- Never automatically fix findings.
- Never install dependencies.
- Never change project configuration.
- Never report coding-style preference as architecture risk.
- Never introduce abstractions only for theoretical future use.
- Never assume enterprise-scale requirements without evidence.
- Never claim backend behavior that cannot be observed.
- Never hide uncertainty.
- Never treat every rerender as a performance problem.
- Never require a library when native React/browser capabilities are adequate.
- Always ground findings in concrete code or configuration evidence.
- Always distinguish current defects from future risks and observations.
