# Development process

## Current stage: Egg pools foundation awaiting manual acceptance

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

The raid foundation and Pokédex foundation have passed automated checks and
manual acceptance on desktop Firefox and Firefox for Android on the target
Galaxy S8 device. The Pokédex has its first normalized PoGoAPI snapshot,
list/detail API routes, searchable UI, one-entry-per-number grouping, retained
form data, optional icon assets, and a generic battle reference. Raid details
resolve a small generic counter shortlist from the cached Pokédex when source
counter types are available. Future changes should preserve the accepted
behaviour and be driven by adapter or fixture findings.

The event calendar foundation now has a server-side Leak Duck adapter,
manifest-based change detection, cached normalized records, month-grouped list
and detail routes, and optional related-content sections. Manual acceptance
covered current/upcoming status, local-time display, banners, source links,
optional sections, stale/degraded behaviour, and direct event URLs on desktop
Firefox and Firefox for Android.

The event calendar foundation has now passed automated checks and manual
acceptance after deployment. Future calendar changes should preserve the
accepted behaviour and be driven by adapter or fixture findings.

The Team GO Rocket idea was removed after review because the available source
produced mostly generic guidance without enough practical value. Its routes,
adapter, cached model and product documentation were removed. Egg pools are
now the current-play feature under implementation.

The Egg Pools foundation now has a server-side Leak Duck adapter,
manifest-based freshness detection, cached normalized groups, a simple pool
view and source-aware rarity/shiny display. Manual acceptance should verify
group labels, distance variants, duplicate Pokémon across groups, rarity
labels, image fallback, stale/degraded behaviour and Firefox for Android
before the slice is marked complete.

## First vertical slice

Build raids first: source ingestion, caching, validation, current raid list, raid details, capable-trainer guidance and freshness status.

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
