# Technical direction

## Baseline

- Reuse the existing app's React, TypeScript, Vite, TanStack Router/Query, Tailwind, and PWA approach as the front-end baseline.
- Reuse its mobile-first visual patterns, but do not reuse its PokéAPI-specific models or browser-only cache unchanged.
- Put community-source access behind an app-owned server-side ingestion boundary. The browser should consume normalized app data, not call community endpoints directly.
- Keep source adapters, validation, freshness metadata, and last-known-good snapshots behind that boundary.
- Start with the smallest server-side storage that supports normalized snapshots, raw-response provenance, hashes, and health status. Choose long-term storage after fixture sizes and refresh frequency are measured.
- Use a Cloudflare Worker with Workers Static Assets as the server-side ingestion seam and Cloudflare KV as the first snapshot-store implementation. See [ADR 0001](adr/0001-ingestion-and-storage.md).
- Use demand-driven refresh with per-source cooldowns before introducing scheduled jobs.

## Why this fits

The existing app gives the project a useful UI and front-end foundation. The new app needs a different data boundary because current data is multi-source, cache-sensitive, and subject to schema changes. A server-side adapter seam also keeps provider changes out of the UI.

## Deliberate constraints

- No login, personal roster, or account synchronization.
- No direct dependency on a single provider.
- No exact battle-simulation claims when only heuristic or source-based estimates are available.
- No infrastructure expansion until representative payloads and cache requirements justify it.
- The supported mobile baseline is current Firefox for Android on the family's Galaxy S8; see [device compatibility](device-compatibility.md).

## Before implementation

1. Turn the reviewed domain model into code types.
2. Implement the raid source adapters against the captured fixtures.
3. Implement the `SnapshotStore` interface with a local in-memory adapter for tests and KV for deployment.
4. Implement the read endpoints and freshness states.

