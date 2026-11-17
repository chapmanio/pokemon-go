# Domain context

This glossary is the shared vocabulary for product decisions, source adapters, tests, and UI copy.

## Product

- **Pokémon GO companion** — A generic planning and reference app for family play. It does not connect to Pokémon GO accounts, read live game state, or manage personal Pokémon rosters.
- **Pokémon** — A species with Pokémon GO-specific stats, types, moves, evolution, availability, and battle information.
- **Pokédex number** — The list-level identity for a Pokémon species. The app shows one Pokédex entry per number.
- **Pokémon form** — A regional, battle, costume, pattern, or event variant nested under its Pokédex number. A form may share or change the species' gameplay data.
- **Functional difference** — A data-driven indication that a form differs from the default form in moves, types, stats, or more than one of those fields. Equivalent forms remain retained but are not separate list entries.
- **Battle reference** — Generic Pokémon GO information that helps explain a Pokémon in battle: weaknesses, resistances, and move metadata. It is not a personal team recommendation or a battle simulation.
- **Type matchup** — The multiplier produced when an attack type is used against a defending Pokémon's type or types.
- **Event** — A time-bounded Pokémon GO activity or content change, such as Community Day, a raid rotation, a bonus, or a featured Pokémon.

## Raids

- **Raid boss** — A Pokémon GO raid encounter with a tier, form, availability, and battle characteristics.
- **Raid roster** — The set of bosses currently reported by a source. A roster may not contain start and end times.
- **Raid window** — The time interval during which a boss or rotation is active. It is event context, not an intrinsic property of a boss.
- **Counter recommendation** — A generic suggestion for Pokémon, move types, or strategies that are effective against a boss. It is not a recommendation based on a user's collection.
- **Battle estimate** — A source-based or heuristic indication of how many capable trainers are likely needed. It is an estimate, not a guarantee.
- **Party-of-four check** — A simple heuristic that asks whether four capable trainers using Party Play are likely to have enough estimated strength for a raid. It is not an exact simulation.

## Data quality

- **Source snapshot** — A cached, validated external dataset at a known point in time, including its provenance.
- **Freshness** — How recently a source was fetched successfully and how recently its content changed. Freshness is separate from validity.
- **Source disagreement** — A meaningful difference between valid snapshots from different sources. It must be preserved and surfaced rather than silently resolved.
- **Source reference** — A valid source snapshot that currently lists a raid boss. A boss may have one or several source references; this indicates coverage, not guaranteed agreement on every field.

