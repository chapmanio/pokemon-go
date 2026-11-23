# Data sources

Use source adapters and normalise external responses into app-owned models. Fetch through the backend or ingestion job; do not make the browser depend directly on community endpoints.

## PoGoAPI

Primary reference source for Pokémon GO data:

<https://pogoapi.net/documentation/>

Useful data includes Pokémon stats, forms, types, moves, current moves, type effectiveness, weather boosts, CP multipliers, evolutions, buddy distances, shiny data, Mega data and raid bosses.

Use `/api/v1/api_hashes.json` to detect changed files before downloading them.
The battle-reference slice also uses `fast_moves.json`, `charged_moves.json`,
and `type_effectiveness.json` for move metadata and type matchups.

## Pokémon GO API

Secondary source for raid bosses and Max Battles:

<https://pokemon-go-api.github.io/pokemon-go-api/>

Use it to cross-check raid data and provide fallback data. It is unofficial and educational, so do not treat it as the sole authority.

## Pokémon GO assets

The community-maintained [`pokemon-go-api/assets` repository](https://github.com/pokemon-go-api/assets/tree/main/Pokemon)
provides optional Pokémon GO icon PNGs for list and detail presentation. These
are presentation assets, not a gameplay data source. Filenames and coverage may
change, so the app must keep a placeholder fallback and avoid making gameplay
data depend on image availability.

## leak-duck

Community-scraped data from Leek Duck:

<https://github.com/pokelitee/leak-duck>

Useful files include events, raid bosses, research tasks, egg pools and Rocket lineups. The published API includes a manifest with content hashes and change information. Scheduled updates may be delayed.

The calendar uses `https://pokelitee.github.io/leak-duck/events.json` with
`manifest.json` for the `events.json` SHA-256 and `updated_at` value. Event
article URLs are the stable event identity; local-time event timestamps remain
timezone-naive and must not be converted to UTC.

The Team GO Rocket assistant uses
`https://pokelitee.github.io/leak-duck/rocket_lineups.json` with the same
manifest-based change detection. Its member keys and slot candidates do not
include stable Pokémon IDs or counter data, so those facts remain source
references and any counter guidance is explicitly derived by the app.

## PokéBattler

Battle simulations, counters, rankings and trainer estimates:

<https://v2.pokebattler.com/developers>

Use on demand through a backend adapter with aggressive caching. The API is unofficial, has no published SLA and may change without notice.

## Source policy

- Prefer PoGoAPI for stable reference data.
- Prefer leak-duck for event, egg, research and Rocket content.
- Cross-check raid rotations with a second source.
- Treat all community feeds as replaceable and potentially stale.
- Preserve source attribution and do not imply official Pokémon GO or Niantic endorsement.
