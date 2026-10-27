# Reliability and freshness

## Ingestion flow

```text
Fetch → cache raw response → hash check → validate → normalise → publish
```

Publish a new dataset only after validation succeeds. Keep the previous valid dataset when a fetch or validation fails.

## Track per source

- Source and endpoint.
- Last fetch attempt.
- Last successful fetch.
- Last content change.
- Content hash or upstream hash.
- Response age.
- Schema/parser version.
- Current status and error.

## Validation

Check HTTP status, JSON validity, required fields, expected types, known enum values, valid dates, unique Pokémon identifiers and non-empty current collections where appropriate.

Detect breaking changes with schema validation and fixtures. Quarantine unexpected responses instead of publishing them.

## User-facing status

Use compact states:

- Fresh: recently fetched and validated.
- Stale: older than the configured threshold but still usable.
- Degraded: last-known-good data is being served after a failed refresh.
- Unavailable: no valid cached data exists.

Show the timestamp and source on detailed data pages.

## Estimates

Raid trainer counts are approximate. Display assumptions such as trainer count, group strength, local/remote mix and Party Play status. Treat Party Play as a configurable heuristic, not an exact simulation.
