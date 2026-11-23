# Pokédex duplicates and images

## Scope

Checked the live PoGoAPI reference files on 2 November 2026:

- [`pokemon_stats.json`](https://pogoapi.net/api/v1/pokemon_stats.json)
- [`pokemon_types.json`](https://pogoapi.net/api/v1/pokemon_types.json)
- [`current_pokemon_moves.json`](https://pogoapi.net/api/v1/current_pokemon_moves.json)
- [`api_hashes.json`](https://pogoapi.net/api/v1/api_hashes.json)

PoGoAPI documents these as form-aware records: stats, types, and moves can include an optional `form`; its forms documentation also says forms may have different stats and abilities. The moves documentation says move pools can vary by form and can include event/legacy moves. See the [PoGoAPI documentation](https://pogoapi.net/documentation/) and the linked endpoint sections for stats, types, forms, and current moves.

## Findings

The three live files each contain 1,420 records. Grouping by `pokemon_id` gives:

| Result | Count |
| --- | ---: |
| Distinct Pokémon numbers | 1,024 |
| Numbers with more than one form record | 152 |
| Duplicate groups identical in stats, types, and move pools | 61 |
| Duplicate groups differing in at least one of those fields | 91 |
| Groups with different stats | 62 |
| Groups with different types | 66 |
| Groups with different move pools | 77 |

The counts describe the current payload only. They should be recomputed after each upstream refresh rather than hard-coded.

### `Copy_2019` and `Fall_2019`

The starter and Pikachu records are exact functional duplicates of their `Normal` records in all three checked files:

| Pokémon | Extra form | Compared with `Normal` |
| --- | --- | --- |
| Bulbasaur (#1) | `Fall_2019` | Same stats, types, and moves |
| Venusaur (#3) | `Copy_2019` | Same stats, types, and moves |
| Charmander (#4) | `Fall_2019` | Same stats, types, and moves |
| Charizard (#6) | `Copy_2019` | Same stats, types, and moves |
| Squirtle (#7) | `Fall_2019` | Same stats, types, and moves |
| Blastoise (#9) | `Copy_2019` | Same stats, types, and moves |
| Pikachu (#25) | `Copy_2019`, `Fall_2019` | Same stats, types, and moves |

For the app's generic reference use, these are cosmetic/event variants rather than separate functional Pokédex entries. They should not create extra list rows.

Pikachu is the important caveat: #25 has 50 form records and nine distinct move-pool signatures. Several costume or special forms have moves such as `Fly`, `Surf`, `Volt Tackle`, `Flying Press`, `Meteor Mash`, or different charged-move pools. Therefore “all costume forms are redundant” is not a safe general rule. The `Copy_2019` and `Fall_2019` rows are redundant; other Pikachu forms may not be.

### Other duplicate patterns

- Regional forms such as Alola, Galarian, Hisuian, and Paldea frequently change stats, types, and moves. Examples include Raticate, Raichu, Meowth, Tauros, and Avalugg. These are semantically distinct forms and must remain available under the same Pokémon number.
- Battle or transformation forms such as Deoxys, Giratina, Kyurem, Necrozma, Zacian, and Zamazenta also differ and should remain selectable.
- Pattern/letter/seasonal forms such as Unown, Spinda, Burmy, Deerling, Vivillon, and Flabébé often share the same functional data. They are still meaningful visual or collection variants, so they should be nested rather than treated as separate species entries.
- Some event/costume forms are exact functional duplicates; others have special move pools. The normalisation decision must be based on field comparison, not the presence of a form name such as `Costume`, `Copy`, or a year.

## Recommended normalisation

Use `pokemon_id` as the list-level identity, but do not discard form records during ingestion.

Recommended shape:

```text
PokemonEntry                 one per pokemon_id
  pokemonId
  displayName
  defaultForm                 Normal when present
  forms[]                     retained form records

PokemonForm
  formId
  displayName / label
  stats
  types
  moves
  functionalDifference       stats | types | moves | none
  variantKind                 regional | battle | costume/event | pattern | other
```

UI behaviour:

1. Show one list card per `pokemon_id`, using `Normal` as the default when it exists.
2. Keep search matching against the Pokémon name, number, and retained form labels, but do not add a second result row for every form.
3. On the detail page, show a form selector only when useful. Put regional, battle, and other functionally different forms in the primary selector; put exact-equivalent costume/pattern forms in a collapsed “visual/event variants” section.
4. For a group with both equivalent and different forms, show the default form’s stats/types/moves and a compact notice such as “Some event forms have different move pools.” Do not silently merge differing move pools into the default record.
5. Preserve equivalent form labels and provenance in the cached model so later image, availability, event, or collection features can use them.
6. Add a normalisation test fixture covering Bulbasaur/Charmander, Pikachu, a regional form, and a multi-form pattern species. Assert that list output is unique by `pokemon_id` while detail data retains forms.

This gives the requested one-entry-per-number behaviour without losing information that matters for raids, moves, or future event/costume features.

## Images

PoGoAPI's documented JSON files do not provide image URLs, and the live stats/types/moves payloads contain no image field. The current [`api_hashes.json`](https://pogoapi.net/api/v1/api_hashes.json) also exposes no image or sprite dataset.

There is a separate community-maintained image repository linked by the [pokemon-go-api source repository](https://github.com/pokemon-go-api/pokemon-go-api): [`pokemon-go-api/assets`](https://github.com/pokemon-go-api/assets/tree/main/Pokemon). It contains Pokémon GO icon PNGs using filenames based on the number, form, and shiny marker. Live examples that currently return successfully include:

- [Bulbasaur](https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm1.icon.png)
- [Bulbasaur Fall 2019](https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm1.fFALL_2019.icon.png)
- [Venusaur](https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm3.icon.png)
- [Venusaur Copy 2019](https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm3.fCOPY_2019.icon.png)
- [Pikachu shiny](https://raw.githubusercontent.com/pokemon-go-api/assets/main/Pokemon/pm25.s.icon.png)

The repository also includes form and shiny variants, but its naming scheme is an observed asset convention rather than a PoGoAPI contract. The repository's own source notes that the images are Pokémon GO assets and asks users to respect The Pokémon Company and Niantic ownership.

Recommendation: use the base icon for the first list/detail pass, then add an image adapter that maps known `pokemon_id`/`formId` pairs to cached assets. Prefer server-side caching or vendoring the small set of required images over making every browser request to GitHub raw URLs. Keep a fallback placeholder because coverage and filenames can change.

## Decision

For the Pokédex foundation, deduplicate the list by `pokemon_id`; retain all form records in the normalized detail model; classify equivalent versus functionally different forms from the data; and treat images as a separate, cacheable community-asset integration rather than part of PoGoAPI ingestion.
