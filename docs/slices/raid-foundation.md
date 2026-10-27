# Raid foundation slice

## Goal

Provide a reliable generic raid-planning experience from cached community data:

1. Show the current raid roster grouped by tier.
2. Show useful boss details and a known raid window when available.
3. Suggest generic counters and move types.
4. Show an approximate difficulty estimate with its assumptions.
5. Make freshness, degraded data, and source disagreement visible.

## Non-goals

- Pokémon GO account integration or personal Pokémon rosters.
- Exact Party Play simulation or guaranteed trainer requirements.
- Live gyms, stops, spawns, maps, or location features.
- A personalised six-Pokémon team builder.
- Treating any community source as an official single source of truth.

## User flow

- `/raids` lists current bosses, grouped by tier, with freshness status.
- `/raids/:boss` shows the selected boss.
- Boss details are organised as Overview, Counters, and Estimate sections.
- The detail view shows types, weaknesses, weather, catch CP, shiny availability, and the raid window when known.
- The view shows which source supplied each important fact when sources disagree.

## Estimate settings

- Mode: `Generic` or `Our group`.
- Trainer count: 1–4.
- Typical strength: `Casual`, `Capable`, or `Optimised`.
- Local/remote mix: a simple setting, not a detailed network model.
- Party Play: off or approximate benefit.

Use clear bands such as `Likely`, `Borderline`, and `Unlikely`. Always display the assumptions and label the result as approximate.

The first family estimate is a transparent heuristic around a source-provided
capable-trainer estimate: Casual contributes `0.75`, Capable `1.0`, Optimised
`1.25`, Mixed remote/local `0.95`, Mostly remote `0.9`, and Party Play `1.15`.
These values are configuration assumptions, not battle-simulation results.

## Source strategy

- **PoGoAPI** is the primary reference for Pokémon, forms, types, moves, weather, type effectiveness, and CP data.
- **Leek Duck** is the preferred source for current raid rosters and event context when its published feed is available.
- **pokemon-go-api** is a cross-check and fallback for raid data and form-aware identifiers.
- **PokéBattler** is an on-demand source for selected boss counter estimates, not a roster authority.

Keep raid roster and raid window as separate concepts. Join a window to a boss only when identity matching is safe. Preserve source disagreement in the normalized result and UI.

Source adapters should hide provider-specific payloads behind a normalized interface. Each adapter must retain the raw record, source URL, fetch time, source update time when available, content hash, and validation result.

The normalized raid response should return the union of valid source rosters, preferring the configured primary source for display fields while retaining source references for every boss. The list shows a compact "Listed by N sources" disclosure on each card; the disclosure is tap-friendly and lists the source names and links. Source coverage is not presented as proof that every field agrees.

## Normalized raid record

The first shared record should support these fields:

```text
source, source_url, fetched_at, content_hash, source_updated_at
species_id?, form_id?, display_name, tier, is_shadow, shiny_available?
types, catch_cp_min?, catch_cp_max?, boosted_cp_min?, boosted_cp_max?
boosted_weather?, asset_url?, starts_at?, ends_at?, is_local_time?
battle_estimator?, counter_source?, counter_types?, source_disagreements?, raw_source_record
```

Optional fields must remain optional when a source does not provide them. Do not invent timing or battle values.

## Acceptance criteria

- A successful refresh stores the raw and normalized snapshots with provenance.
- Manifest or response hashes are recorded when available and used to detect unchanged content.
- Invalid responses never replace the last known-good snapshot.
- A stale or unavailable source produces a visible degraded state, not an empty success state.
- Valid but conflicting rosters are represented as source disagreement.
- The raid list includes valid bosses found only in a secondary source and shows per-boss source references.
- The raids list is grouped by tier and includes freshness information.
- The detail view handles missing optional fields without misleading placeholders.
- The detail view allows retrying an unavailable boss and distinguishes a rotated-out boss from a general load failure.
- The detail view shows source-level differences for important fields when valid sources disagree.
- Counter guidance remains source-based and recommends attack types when specific Pokémon and move data is unavailable.
- Estimate settings support Generic or Our group mode, trainer count, strength, local/remote mix and an approximate Party Play toggle.
- Counter cache keys include every estimate input: boss/form, tier, attacker level, weather, dodge or strategy mode, and aggregation settings.
- Changing estimate settings changes the displayed approximation and its assumptions.
- No authentication or personal roster data is required.

## Required tests

- Normalize representative fixtures from each source.
- Preserve form and Shadow identity.
- Join an event window only for a safe identity match.
- Reject malformed or schema-invalid responses.
- Retain last-known-good data after refresh failure.
- Detect and surface source disagreement.
- Prevent counter-cache collisions between different query parameters.
- Cover empty, stale, degraded, and unavailable states.

