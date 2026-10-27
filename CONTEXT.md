# Domain context

This glossary is the shared vocabulary for product decisions, source adapters, tests, and UI copy.

## Product

- **Pokémon GO companion** — A generic planning and reference app for family play. It does not connect to Pokémon GO accounts, read live game state, or manage personal Pokémon rosters.
- **Pokémon** — A species or form with Pokémon GO-specific stats, types, moves, evolution, availability, and battle information.
- **Event** — A time-bounded Pokémon GO activity or content change, such as Community Day, a raid rotation, a bonus, or a featured Pokémon.

## Raids

- **Raid boss** — A Pokémon GO raid encounter with a tier, form, availability, and battle characteristics.
- **Raid roster** — The set of bosses currently reported by a source. A roster may not contain start and end times.
- **Raid window** — The time interval during which a boss or rotation is active. It is event context, not an intrinsic property of a boss.
- **Counter recommendation** — A generic suggestion for Pokémon, move types, or strategies that are effective against a boss. It is not a recommendation based on a user's collection.
- **Battle estimate** — A simulation or heuristic result under explicit assumptions. It is an estimate, not a guarantee.
- **Estimate profile** — The assumptions used for an estimate: trainer count, group strength, local/remote mix, and Party Play setting.

## Data quality

- **Source snapshot** — A cached, validated external dataset at a known point in time, including its provenance.
- **Freshness** — How recently a source was fetched successfully and how recently its content changed. Freshness is separate from validity.
- **Source disagreement** — A meaningful difference between valid snapshots from different sources. It must be preserved and surfaced rather than silently resolved.

