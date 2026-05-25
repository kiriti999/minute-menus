---
description: Global engineering norms for Minute Menus — SOLID, change discipline, complexity bar
---

# Coding standards — global

These norms apply everywhere in this repository unless a more specific rule file narrows guidance for TypeScript versus React surfaces.

## SOLID and related design discipline

Prefer small, purposeful units over large grab-bag modules. Open for extension via composition and clear boundaries rather than patching many concerns in one place. Substitutable implementations should honor contracts without surprising callers at runtime. Narrow interfaces tailored to callers beat wide “kitchen sink” types. Depend on abstractions where it reduces coupling; wire concrete adapters at boundaries (UI, HTTP, scripts). Pair this with **DRY** (no copy-pasted behavior that should evolve together), **KISS** (the simplest structure that satisfies requirements), and **YAGNI** (no speculative features or premature generalization).

## Fail fast

Validate assumptions and inputs at sensible boundaries — fail clearly and early rather than silently corrupting data or masking errors deep in call chains. In user-facing code, combine fail-fast internals with graceful degradation where product rules demand it (for example AI fallbacks documented elsewhere).

## Cyclomatic complexity limits

Keep control-flow complexity bounded so code stays readable and testable:

- **Functions and plain TypeScript (.ts):** complexity up to six.
- **TSX:** up to eleven.

When a unit approaches its limit, split responsibilities, extract helpers only when they clarify intent (avoid one-line wrappers), or restructure branching — do not chase the metric with pointless indirection.

## Change discipline

Ship **minimal, scoped diffs** tied to the task. Avoid drive-by refactors, unrelated formatting churn, or renaming unrelated symbols. Preserve existing patterns (naming, file layout, hook usage, Tailwind style) unless the task explicitly improves consistency in a deliberate way.

## Quality bar

Prefer grep and targeted reads over loading very large files whole. Respect product and security guardrails documented in CLAUDE.md and agents.md — including destructive menu saves, RLS and keys, pinned AI model, and customer reel caps. Aim for responsive UX and sub-two-second perceived load patterns where the product already establishes that expectation. Prefer self-documenting identifiers and localized comments only for non-obvious domain or integration rules.
