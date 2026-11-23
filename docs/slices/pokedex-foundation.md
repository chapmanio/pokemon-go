# Pokédex foundation slice

## Goal

Provide a searchable, generic Pokémon GO reference from cached PoGoAPI data:

1. List one entry per Pokédex number and retain its forms.
2. Search by name, form, or Pokédex number.
3. Show types, Pokémon GO base stats, and current move pools.
4. Show a battle reference with weaknesses, resistances, and move metadata.
5. Show freshness and degraded-cache status.

## Non-goals

- Personal Pokémon, inventory, or account integration.
- Evolution planning, power-up planning, or battle rankings.
- Shiny, egg, and event availability until those sources are modelled.
- Treating generic Pokémon data or any provider as official Niantic data.

## Source and storage

- PoGoAPI is the initial reference source.
- Fetch `api_hashes.json` before `pokemon_stats.json`, `pokemon_types.json`, and `current_pokemon_moves.json`.
- Fetch `fast_moves.json`, `charged_moves.json`, and `type_effectiveness.json`
  for battle-reference data, using the same hash-checked snapshot.
- Store the raw composite payload and normalized entries in the existing KV namespace under a Pokémon-specific key.
- Refresh at most every 24 hours; show fresh data for 48 hours, then stale.
- Keep last-known-good data when refresh or validation fails.

## Normalized identity and forms

`pokemonKey` is `pokemon_id + form_id`, for example `25:normal` or `26:alola`.
Forms remain separate normalized records, but the list API groups them by
`pokemon_id` and uses `Normal` as the default form when available. Detail
responses include all forms and a `functionalDifference` classification:
`none`, `moves`, `types`, `stats`, or `multiple`. Equivalent forms such as
`Copy_2019` or `Fall_2019` are retained under the number without creating extra
list entries.

## Images

Pokémon GO icons are provided as optional asset URLs from the community
`pokemon-go-api/assets` repository. The UI uses them for list and detail views,
and falls back to a placeholder when an asset is unavailable. Images are not
treated as PoGoAPI gameplay data.

## Routes

- `/pokedex` — searchable Pokédex-number list with form counts.
- `/pokedex/:pokemonKey` — overview, stats, move pools, freshness, and source status.
- `/api/v1/pokemon` — list response.
- `/api/v1/pokemon/:pokemonKey` — detail response.

## Completion criteria

- Representative form-aware fixture normalization is tested, including
  equivalent and gameplay-different forms.
- The list contains one entry per Pokémon number while detail data retains all
  normalized forms.
- Detail responses include generic weaknesses, resistances, and move metadata
  for the selected form.
- List and detail images render when the community asset is available and have
  a fallback when it is not.
- Hash manifest changes trigger a source refresh; unchanged hashes reuse the cached normalized snapshot.
- Empty or malformed source responses never replace valid cached data.
- List and detail pages work from the normalized app-owned API only.
