# Development process

## Current stage: ready for first slice

Do not start feature implementation until the following are agreed:

- Product scope and five primary areas are stable.
- Initial stack and deployment approach are chosen.
- First data sources have been fetched and sample payloads inspected.
- Initial normalized domain models are defined for Pokémon, moves, raids and events.
- Source freshness, validation and fallback behaviour are defined.
- The first vertical slice has acceptance criteria.

The readiness gate is complete for the first raid slice. The project has a
confirmed front-end baseline, server-side ingestion seam, reviewed domain
model, captured fixtures, refresh policy, storage decision, and acceptance
criteria. Further model changes should be driven by an adapter or fixture
finding, not speculative feature design.

## First vertical slice

Build raids first: source ingestion, caching, validation, current raid list, raid details, generic estimate settings and freshness status.

## Lightweight coordinator loop

1. Read the project documents and state the bounded task.
2. Write acceptance criteria before implementation.
3. Delegate independent research or review only when it has a clear output.
4. Give implementation ownership to one agent at a time for overlapping files.
5. Run deterministic checks: build, lint, tests, schema validation and stale-data tests.
6. Run an independent review against the product documents.
7. Fix reported issues, then request human approval before merging.

Every task report should include changed files, checks run, assumptions and unresolved issues.

## Specialist roles

- Coordinator: maintains scope, sequencing and acceptance criteria.
- Data researcher: verifies source payloads, schemas and freshness signals.
- Builder: implements the bounded slice.
- Test reviewer: adds fixtures, contract tests and failure-path checks.
- Product reviewer: checks behaviour against `docs/product.md` and `docs/features.md`.

Use one agent for dependent work. Use parallel agents only for independent research, review or disjoint file ownership.

## Completion gate

A slice is complete only when the feature works with cached data, handles stale or invalid upstream data, passes automated checks and matches the documented scope.
