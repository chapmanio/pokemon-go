# Pokédex foundation slice

## Goal

Provide a searchable, generic Pokémon GO reference from cached PoGoAPI data:

1. List species and forms.
2. Search by name, form, or Pokédex number.
3. Show types, Pokémon GO base stats, and current move pools.
4. Show freshness and degraded-cache status.

## Non-goals

- Personal Pokémon, inventory, or account integration.
- Evolution planning, power-up planning, or battle rankings.
- Shiny, egg, Rocket, and event availability until those sources are modelled.
- Treating generic Pokémon data or any provider as official Niantic data.

## Source and storage

- PoGoAPI is the initial reference source.
- Fetch `api_hashes.json` before `pokemon_stats.json`, `pokemon_types.json`, and `current_pokemon_moves.json`.
- Store the raw composite payload and normalized entries in the existing KV namespace under a Pokémon-specific key.
- Refresh at most every 24 hours; show fresh data for 48 hours, then stale.
- Keep last-known-good data when refresh or validation fails.

## Normalized identity

`pokemonKey` is `pokemon_id + form_id`, for example `25:normal` or `26:alola`.
Forms remain separate records. `Normal` is a real source form but is not repeated as a display label.

## Routes

- `/pokedex` — searchable species/form list.
- `/pokedex/:pokemonKey` — overview, stats, move pools, freshness, and source status.
- `/api/v1/pokemon` — list response.
- `/api/v1/pokemon/:pokemonKey` — detail response.

## Completion criteria

- Representative form-aware fixture normalization is tested.
- Hash manifest changes trigger a source refresh; unchanged hashes reuse the cached normalized snapshot.
- Empty or malformed source responses never replace valid cached data.
- List and detail pages work from the normalized app-owned API only.
