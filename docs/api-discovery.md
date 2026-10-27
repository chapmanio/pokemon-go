# Pokémon GO API discovery

## Scope and method

This is a source-adapter discovery note for the first raid slice: current raid
bosses, enough reference data to identify and explain a boss, and optional
counter estimates. The observations below were made from live JSON responses on
2026-10-27. These are community-maintained sources, not Niantic APIs; keep the
app's attribution and source-replacement boundary.

The source documentation used here is the documentation or repository owned by
each project, plus the live endpoints linked in the tables. A response sample
is evidence of the observed contract, not a promise that the upstream schema or
the current raid rotation will remain unchanged.

## Recommendation for the first raid slice

| Role | Recommended source | Why | Guardrail |
| --- | --- | --- | --- |
| Reference Pokémon data | **PoGoAPI** | Broad, simple files for base stats, forms, types, moves, weather boosts, type effectiveness and CP-related data. Its documentation explicitly recommends local caching and exposes a hash index. | Use the hash index before downloading. Do not use its current raid roster as the sole rotation authority: the live roster disagreed with the other three sources during this check. |
| Current raid roster | **leak-duck**, cross-checked by **pokemon-go-api** | leak-duck has raid-friendly fields and a manifest with per-file SHA-256, size and content-change time. pokemon-go-api has a typed OpenAPI contract, a SHA-512 index and useful precomputed raid estimates. | Treat a roster as valid only after normalization and cross-source comparison. Neither feed supplies raid start/end times in its raid-boss payload. |
| Raid timing / event context | **leak-duck events** | Events include `start_time`, `end_time`, local-time semantics, article URLs and raid details. | Join by Pokémon/form/name carefully; event text can contain more context than a normalized raid-boss record. |
| Counter estimates | **PokéBattler**, on demand | Its raid endpoint returns simulation-derived estimator, time, deaths, TDO/EDPS and related results for a stated boss, tier, level, weather, dodge and aggregation configuration. | Keep it behind a backend adapter with aggressive caching. Do not treat the response as a flat list without inspecting its nested shape, and do not use it as the roster source. |
| Fallback | **pokemon-go-api** for current raid data; cached last-known-good normalized data for outages | It exposes a machine-readable OpenAPI document and a content-hash endpoint. | It is derived from GameMaster/community sources and explicitly educational/unofficial; it has no raid schedule timestamps in the live raid payload. |

The recommendation is deliberately split by data role. In the live check,
PoGoAPI reported Heatran as the only current Tier 5 boss, while leak-duck,
pokemon-go-api and PokéBattler all exposed Palkia in their current/upcoming
raid data. That is enough evidence to reject any single current-roster feed as
an unverified authority. For the first slice, surface the normalized roster
with source and observed-at metadata, cross-check it, and show a stale/fallback
state when the feeds disagree.

## Source details

### PoGoAPI

Primary documentation: [PoGoAPI documentation](https://pogoapi.net/documentation/).

Useful endpoints:

- [`api_hashes.json`](https://pogoapi.net/api/v1/api_hashes.json) — map of
  filename to `api_filename`, `full_path`, `hash_md5`, `hash_sha1` and
  `hash_sha256`.
- [`raid_bosses.json`](https://pogoapi.net/api/v1/raid_bosses.json) — object
  with `current` and `previous`; each tier value is an array of boss objects.
- [`pokemon_stats.json`](https://pogoapi.net/api/v1/pokemon_stats.json) —
  `pokemon_id`, `pokemon_name`, `form`, `base_attack`, `base_defense`,
  `base_stamina`.
- [`pokemon_types.json`](https://pogoapi.net/api/v1/pokemon_types.json) —
  `pokemon_id`, `pokemon_name`, `form`, and one- or two-item `type`.
- [`current_pokemon_moves.json`](https://pogoapi.net/api/v1/current_pokemon_moves.json)
  — fast/charged move pools plus elite move pools by Pokémon and form.
- [`weather_boosts.json`](https://pogoapi.net/api/v1/weather_boosts.json) and
  [`type_effectiveness.json`](https://pogoapi.net/api/v1/type_effectiveness.json)
  — the small lookup tables needed to explain raid weaknesses and weather.

Observed live samples:

- `raid_bosses.json` had `current` tier counts of 1: 4, 3: 4, 5: 1,
  `mega`: 1, with no current entries in 2, 4, 6, `ex` or `mega_legendary`.
  Its current Tier 5 sample was:

  ```json
  {
    "boosted_weather": ["Clear", "Snow"],
    "form": "Normal",
    "id": 485,
    "max_boosted_cp": 2681,
    "max_unboosted_cp": 2145,
    "min_boosted_cp": 2573,
    "min_unboosted_cp": 2058,
    "name": "Heatran",
    "possible_shiny": true,
    "tier": 5,
    "type": ["Fire", "Steel"]
  }
  ```

- The live reference files provide the fields needed for a raid detail card
  without another service. For example, Palkia in the stats/types/moves files
  was `base_attack: 280`, `base_defense: 215`, `base_stamina: 189`, types
  `Water`/`Dragon`, and fast moves `Dragon Breath`/`Dragon Tail` with charged
  moves `Draco Meteor`, `Fire Blast`, `Hydro Pump` and `Aqua Tail`.

Freshness and hash signals observed:

- The documented workflow is to cache files locally and compare
  `api_hashes.json` before downloading. The live SHA-256 values matched the
  downloaded bytes for the files used here: `raid_bosses.json`
  `aeac57b25feacc2be07620acac6c17d014888c4f2e52540efe5b5c5b2e789239`,
  `pokemon_stats.json`
  `5d5ac4679d0c9acc3d2ba0d0b520be18326ffc2bdb5fbc5dbc03848ca911ebd1`,
  `pokemon_types.json`
  `298d1f24fb162e496bfadad97e3cd0713bc1400f2606ce64e42a91ccb2ddc54a`, and
  `current_pokemon_moves.json`
  `661b6a7347b5000a862379888a3750625f8430bea3be54547f06491d8f4d4462`.
- The HTTP `Last-Modified` header observed on these four files was
  `2025-11-11`, despite the live data and hash index being available on the
  2026-10-27 check. Treat the documented content hashes as the freshness
  signal; do not infer freshness from that header.

Caveats:

- The raid payload has current/previous membership, but no raid rotation
  start/end timestamps. `previous` is historical context, not a schedule.
- Forms are represented as strings such as `Normal`; the adapter must preserve
  `(Pokémon ID, form)` as the identity rather than keying on display name only.
- The documentation calls out that some encounter fields are hardcoded because
  Niantic removed the underlying data. This is a reference-data source, not a
  guarantee that every field is current or authoritative for live events.

### pokemon-go-api

Primary documentation and code:

- [Repository README](https://github.com/pokemon-go-api/pokemon-go-api)
- [OpenAPI document](https://pokemon-go-api.github.io/pokemon-go-api/Pokedex.json)
- [Generated API landing page](https://pokemon-go-api.github.io/pokemon-go-api/)

Useful endpoints:

- [`api/raidboss.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/raidboss.json)
  — current raid bosses under `currentList`, plus raid graphics under
  `graphics`.
- [`api/pokedex.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex.json)
  — full Pokémon/form records.
- [`api/pokedex/id/484.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/pokedex/id/484.json)
  — single-Pokédex-number lookup; useful for resolving a boss after name/form
  normalization.
- [`api/hashes.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/hashes.json)
  — SHA-512 values for the large list endpoints.
- [`api/maxbattles.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/maxbattles.json),
  [`api/quests.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/quests.json)
  and [`api/types.json`](https://pokemon-go-api.github.io/pokemon-go-api/api/types.json)
  — adjacent data, not required for the first raid slice.

The repository says that the API is built from GameMaster files from PokeMiners,
and that the current raid-boss source is shown in the raid graphics. The OpenAPI
description lists additional community inputs, including Leek Duck and
Pokébattler. This makes the project useful as a normalized cross-check, but not
an independent official feed.

Observed live sample:

- `api/raidboss.json` exposed `currentList` keys `lvl1`, `lvl3`, `lvl5`,
  `mega`, `shadow_lvl1`, `shadow_lvl3` and `shadow_lvl5`. Its Palkia record
  included the following useful fields: `id: "PALKIA"`, `form: "PALKIA"`,
  `level: "lvl5"`, multilingual `names`, `shiny: true`, `types:
  ["Water", "Dragon"]`, `counter: {"Dragon": 1.6, "Fairy": 1.6}`,
  `weather: ["rain", "windy"]`, `cpRange: [2190, 2280]`,
  `cpRangeBoost: [2737, 2850]`, and `battleResult` estimators for easy,
  normal and hard friendship/level presets.
- The same response also supplied a stable asset pair (`assets.image` and
  `assets.shinyImage`) and a nullable `costume`, which are useful when the
  first slice needs form/costume-aware rendering.

Freshness and hash signals observed:

- The OpenAPI hash endpoint declared SHA-512 values for `raidboss.json` and
  `pokedex.json`; they matched the downloaded bytes during this check:
  `raidboss.json`
  `65e38d4cb9e7a2bb77e5a84cab08875f269c8acbb5f9fc50e5b599a5a9c1b9f34bf3b3aa65b8d95f5408a817b87d839edbde64221ffaf36b872e367f681731d1`
  and `pokedex.json`
  `d22c1d28105a792fb258429300dc3d566c40ef145e2eaedf50405d5ae0fec3f8f4e8c29e845a449553a8c846fa9429845c3a8221be7efbe7723cca7afcc896a6`.
- GitHub Pages headers observed on the generated files reported
  `Last-Modified: 2026-10-21 11:40:32 GMT`, `Cache-Control: max-age=600` and
  an ETag. Use the API's SHA-512 index for content comparison and treat the
  ten-minute page cache as normal.

Caveats:

- The API contract documents the raid source as Leek Duck, so it is not an
  independent corroboration of leak-duck. It is still valuable as a second
  representation and fallback because it adds form-aware IDs and estimates.
- `raidboss.json` does not contain start/end times. `currentList` is a roster,
  not a time-window schedule.
- The response includes `shadow_*` lists and uses uppercase internal IDs. Keep
  shadow status and form identity separate from the localized display name.

### leak-duck

Primary documentation and code:

- [Project README](https://github.com/pokelitee/leak-duck/blob/main/README.md)
- [Published API documentation](https://pokelitee.github.io/leak-duck/)
- [Machine-readable field reference](https://pokelitee.github.io/leak-duck/docs.json)
- [Source repository](https://github.com/pokelitee/leak-duck)

The README says that GitHub Actions runs hourly, although scheduled runs may be
delayed, and that the project scrapes Leek Duck. It publishes no-key JSON with
CORS and supports raw GitHub URLs pinned to a full data-branch commit SHA.

Useful endpoints:

- [`raid_bosses.json`](https://pokelitee.github.io/leak-duck/raid_bosses.json)
  — object keyed by tier label, each value a list of current boss records.
- [`events.json`](https://pokelitee.github.io/leak-duck/events.json) — current
  and upcoming events with times and event-level raid details.
- [`manifest.json`](https://pokelitee.github.io/leak-duck/manifest.json) —
  per-file `sha256`, `size` and `updated_at`.
- [`archives/`](https://pokelitee.github.io/leak-duck/) — yearly event archives;
  coverage before 2025-09-19 is explicitly partial.

Observed live sample:

- `raid_bosses.json` was an object with `1-Star Raids`, `3-Star Raids`,
  `5-Star Raids` and `Mega Raids`. A Palkia record had `name`, integer `tier:
  5`, `shiny_available: true`, `cp_range: {min: 2190, max: 2280}`,
  `boosted_cp_range: {min: 2737, max: 2850}`, `types: ["Water", "Dragon"]`,
  `asset_url`, and `is_shadow: false`. The documented schema also permits
  `null` CP ranges when Leek Duck does not list them.
- `events.json` included `start_time`, `end_time`, `is_local_time`,
  `article_url`, `description` and a `details.raids` list. This is the better
  leak-duck payload for a raid event window; the raid-boss file itself carries
  no time window.

Freshness and hash signals observed:

- The manifest declared `raid_bosses.json` SHA-256
  `8990ef5113e2e0ccb055f137a85d7ac05b9bbd039729e10e67cac60305e29655`, size
  `9606`, and `updated_at: 2026-10-21T10:12:56Z`. The downloaded file matched
  that SHA-256.
- The manifest's `events.json` content-change time was
  `2026-10-27T06:19:02Z`, while the raid-boss file's was six days earlier. An
  hourly workflow therefore does not mean every published file changes hourly;
  inspect the per-file manifest entry.
- Pin a raw data URL to a full data-branch commit SHA when a reproducible
  snapshot is required. The floating Pages URL is convenient for live use but
  is not a historical version identifier.

Caveats:

- The scraper is downstream of Leek Duck and can lag when its scheduled job or
  source page changes. Preserve `updated_at`, SHA-256 and fetch time in the
  normalized record.
- Tier labels are display-oriented (`"5-Star Raids"`, `"Mega Raids"`) while
  the `tier` field can be an integer or a string. Normalize into an internal
  enum without discarding the original label.
- Names include display qualifiers such as `Shadow …`, `Alolan …` and Mega
  forms. Normalize against a reference source using form-aware matching, not a
  bare name lookup.

### PokéBattler

Primary documentation: [PokéBattler developer reference](https://www.pokebattler.com/developers/).

The documentation says the HTTP API is JSON `GET`, requires no authentication,
and is served from `https://fight.pokebattler.com`. It also asks clients to
cache aggressively and avoid crawling the expensive attacker-by-defender
combinatorial space.

Useful endpoints:

- [`/raids`](https://fight.pokebattler.com/raids) — current raid rotation,
  announced/upcoming records and tier metadata.
- [`/pokemon`](https://fight.pokebattler.com/pokemon) — full battle Pokédex;
  the documentation warns that this is roughly 7 MB.
- [`/moves`](https://fight.pokebattler.com/moves) — move power, energy, timing
  and related battle data.
- [`/raids/defenders/{boss}/levels/{tier}/attackers/levels/{level}/strategies/{attack}/{defense}`](https://fight.pokebattler.com/raids/defenders/{boss}/levels/{tier}/attackers/levels/{level}/strategies/{attack}/{defense})
  — documented per-boss counter query. Example with explicit query controls:

  ```text
  https://fight.pokebattler.com/raids/defenders/PALKIA/levels/RAID_LEVEL_5/attackers/levels/40/strategies/CINEMATIC_ATTACK_WHEN_POSSIBLE/DEFENSE_RANDOM_MC?sort=ESTIMATOR&weatherCondition=NO_WEATHER&dodgeStrategy=DODGE_REACTION_TIME&aggregation=AVERAGE
  ```

The documented controls that must be part of a cache key are `sort` (including
`ESTIMATOR`), weather, dodge strategy, aggregation, boss/form, raid tier and
attacker level. The documentation defines estimator as the estimated number of
trainers needed to win; lower is better.

Observed live samples:

- `/raids` was a large object with `tiers`, `breakingNews`,
  `breakingNewsMarkdown` and `dynamaxPokemon`. `breakingNews` contained 56
  schedule records; the observed Palkia record had `pokemon: "PALKIA"`,
  `tier: "RAID_LEVEL_5"`, `shiny: true`, `localTime: true`, millisecond
  `startDate`, `endDate` and `activeDate`, plus `remoteRaidType`, `costume` and
  `regional` flags. The `tiers` array also contains battle metadata such as
  boss HP, CPM, level, combat time, estimated players, soloability and the
  `statsSource`.
- The documented Palkia counter URL returned metadata
  `filterValue: "PALKIA"`, `sortType: "ESTIMATOR"`, the selected strategies,
  `numSims: "2388400"`, and a nested result with attacker/move/defender paths.
  The response contained estimator, TDO, EDPS, combat time, deaths and
  survival-related fields. It was not a flat array: one top-level attacker
  contained 8 move entries and 30 nested defender records in this sample.

Freshness and hash signals observed:

- There is no documented content-hash manifest for the HTTP payloads. The
  live `/raids` response exposed `ETag: W/"9f3f7122fc8d76f32a0587482980670c"`
  and `Cache-Control: max-age=60`; use conditional requests and a short cache
  for rotation/counter reads, but store the request parameters and fetch time.
- The documentation warns that simulation results change when Niantic changes
  movesets, stats or the raid rotation, and that cached copies go stale within
  days. That is a semantic freshness warning even when the HTTP cache is warm.

Caveats:

- PokéBattler's results are simulations, not hand-curated recommendations. A
  result is only meaningful with its boss form, tier, attacker level, weather,
  dodge, aggregation, strategy and simulation count retained.
- Ranking endpoints are expensive and can time out under load; prefer the
  per-boss endpoint or the project's MCP interface for assistant-sized output.
- The payload's nested names are easy to misread. Validate the live shape in an
  adapter and flatten only after confirming which node represents the boss and
  which nodes represent candidate attackers.

## Minimal normalized contract for slice one

Keep the source-specific payloads out of the UI and normalize into an
app-owned record with provenance:

```text
RaidBoss {
  source, source_url, fetched_at, content_hash, source_updated_at,
  species_id?, form_id?, display_name, tier, is_shadow, shiny_available?,
  types, catch_cp_min?, catch_cp_max?, boosted_cp_min?, boosted_cp_max?,
  boosted_weather?, asset_url?, starts_at?, ends_at?, is_local_time?,
  battle_estimator?, counter_source?, raw_source_record
}
```

For the first implementation:

1. Fetch and hash PoGoAPI reference files through the backend; use
   `api_hashes.json` to avoid unnecessary downloads.
2. Fetch leak-duck `raid_bosses.json` and `manifest.json`; use the manifest
   SHA-256 and `updated_at` as roster provenance, and join `events.json` only
   when a time window is needed.
3. Fetch pokemon-go-api `api/raidboss.json` and `api/hashes.json` as the roster
   cross-check/fallback. Record disagreement instead of silently choosing one.
4. Request PokéBattler counters only for a selected boss, with explicit query
   parameters and a bounded cache. Store the estimator and simulation context,
   not just a rank number.

