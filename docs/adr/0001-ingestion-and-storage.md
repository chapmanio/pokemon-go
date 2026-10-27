# ADR 0001: Server-side ingestion and first snapshot store

- Status: Accepted for the first raid slice
- Scope: current data ingestion, caching, health, and normalized read APIs

## Context

Community feeds can be stale, change shape, disagree with one another, and
occasionally need provider-specific request parameters. Browser clients should
not each fetch those feeds directly. The first release does not need accounts,
write-heavy state, or historical analytics.

## Decision

Use a small server-side ingestion module deployed as a Cloudflare Worker beside
the built frontend in Workers Static Assets. Workers are the preferred platform
for new Cloudflare applications and keep the API, static assets, observability,
and future scheduled refreshes in one deployment; see the
[Cloudflare Pages-to-Workers migration guidance](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/).

The module has these internal seams:

- `SourceAdapter` — one adapter per provider; hides URLs, headers, payload
  shapes, and provider errors.
- `Normalizer` — converts a validated provider payload into app-owned records.
- `SnapshotStore` — reads and writes the last-known-good raw and normalized
  snapshot plus health metadata.
- `IngestionCoordinator` — applies cooldowns, validates responses, compares
  sources, and decides whether to publish or retain the previous snapshot.

The browser reads only app-owned endpoints:

- `GET /api/v1/raids`
- `GET /api/v1/raids/:raidBossId`
- `GET /api/v1/raid-counters/:raidBossId` with explicit estimate parameters
- `GET /api/v1/health`

Each response includes data plus freshness, `as_of`, source provenance, and
warnings where relevant. A read may trigger an eligible refresh, but callers
never call a community endpoint directly.

Use Cloudflare KV as the first `SnapshotStore` implementation. Store one
current snapshot and one health record per source/endpoint, plus bounded
counter results keyed by their complete request parameters. Do not add D1,
R2, Durable Objects, or a history table until fixture sizes or a real feature
requires them. The `SnapshotStore` interface keeps that change local.

## Refresh policy

| Dataset | Eligibility cooldown | Fresh display state |
| --- | ---: | --- |
| Raids, events, eggs, Rocket | 30 minutes | Last successful fetch ≤ 2 hours |
| Pokémon and move reference data | 24 hours | Last successful fetch ≤ 48 hours |
| PokéBattler counter result | On demand; cache 6 hours | Cache entry ≤ 6 hours |

When a refresh is not eligible, serve the cached snapshot. When an eligible
refresh fails, serve the last-known-good snapshot with `degraded` status. A
snapshot with no successful content remains `unavailable`. A successful but
old snapshot is `stale`; it is not silently presented as fresh.

## Consequences

- The UI has one stable interface and does not need provider-specific logic.
- Source failures and disagreement are visible and testable at the ingestion
  seam.
- Demand-driven refresh is sufficient for a small family app and avoids a
  scheduler in the first release.
- A later scheduled trigger or larger store can replace the coordinator or
  store implementation without changing the UI contract.

