# Data sources

Use source adapters and normalise external responses into app-owned models. Fetch through the backend or ingestion job; do not make the browser depend directly on community endpoints.

## PoGoAPI

Primary reference source for Pokémon GO data:

<https://pogoapi.net/documentation/>

Useful data includes Pokémon stats, forms, types, moves, current moves, type effectiveness, weather boosts, CP multipliers, evolutions, buddy distances, shiny data, Mega data and raid bosses.

Use `/api/v1/api_hashes.json` to detect changed files before downloading them.

## Pokémon GO API

Secondary source for raid bosses and Max Battles:

<https://pokemon-go-api.github.io/pokemon-go-api/>

Use it to cross-check raid data and provide fallback data. It is unofficial and educational, so do not treat it as the sole authority.

## leak-duck

Community-scraped data from Leek Duck:

<https://github.com/pokelitee/leak-duck>

Useful files include events, raid bosses, research tasks, egg pools and Rocket lineups. The published API includes a manifest with content hashes and change information. Scheduled updates may be delayed.

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
