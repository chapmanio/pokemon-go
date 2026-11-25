# Max Battles slice

## Goal

Show current Dynamax and Gigantamax encounters inside the Battles area, beside
ordinary Raids, with source-backed counter guidance and clearly qualified
estimates.

## User flow

- `/raids` and `/max-battles` are inner tabs in the Battles area.
- `/max-battles` lists current encounters grouped by Max Battle tier and kind.
- `/max-battles/:maxBattleId` shows the encounter, generic counter guidance,
  source status and estimate state.

## Source strategy

- Pokémon GO API `maxbattles.json` supplies the current roster and Max Battle
  fields.
- PoGoAPI type effectiveness and cached Pokédex data supply generic weakness
  types and Pokémon examples when the Max Battle roster does not include
  counter fields.
- PokéBattler Max Battle rankings are a future source adapter for role-aware
  counters and estimates. Ordinary raid estimates are never reused.

## Acceptance criteria

- Max Battles do not require a new bottom-navigation item.
- Dynamax and Gigantamax remain distinct from ordinary raid tiers.
- Empty current Max Battle data is shown as an empty fresh roster, not a source
  failure.
- Missing Max Battle estimates are shown as `Unknown` with an explanation.
- Counter guidance is generic, source-labelled and linked to the Pokédex when
  available.
- Fresh, stale, degraded and unavailable states remain visible.
