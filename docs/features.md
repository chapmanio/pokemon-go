# Feature scope

## Pokédex

Show one list entry per Pokédex number while retaining regional, battle,
costume, pattern and event forms under that number. Search matches species,
form labels and numbers. Use detail sections for:

- Overview: types, forms and stats.
- Battle: move metadata, weaknesses, resistances and raid relevance.
- Availability details are added only when a trusted current source supports them;
  they are not a personal planning system.

## Raids

Show current and upcoming bosses, tiers, forms, shiny availability, weaknesses, weather and recommended counters.

Each raid should support:

- Capable-trainer estimate: the approximate whole number of capable trainers needed.
- Party-of-four check: whether four capable trainers using Party Play are likely to be enough.
- Counter guidance: recommended Pokémon and move types, with generic alternatives and short trade-off explanations.

Do not require users to maintain individual Pokémon teams.

## Eggs

Keep this intentionally simple: show each egg distance/type and the Pokémon currently available from it. Show shiny availability and update time when available. Do not imply hatch odds unless a trusted source provides them.

## Event calendar

Provide month, list and event-detail views. Show event name, category, start/end times, featured Pokémon, raids, bonuses, exclusive moves, research and links to related pages.

## Shared behaviour

- Global search covers Pokémon, raids, events and egg species.
- Pokémon pages are linked from raids, events and eggs.
- Current-data pages show last updated time and source status.
- Raid estimates use one fixed, clearly labelled capable-trainer assumption and a four-trainer Party Play check; there are no per-user battle settings.
