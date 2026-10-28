# Initial domain model

These are app-owned concepts, not copies of any provider's schema. Fields stay
optional when the available sources cannot support them reliably.

## Reference entities

### Pokémon reference

Identity is `species_id + form_id + variant` where available.

```text
PokemonReference {
  species_id, form_id?, variant?, display_name, types,
  stats?, moves?, evolution?, availability?, assets?, provenance
}
```

The first implementation uses `pokemon_id + form_id` as `pokemonKey` and keeps
Pokémon GO base stats and current move pools optional until the source provides
them for that form.

### Move reference

```text
MoveReference {
  move_id, display_name, type, category?, power?, energy?, duration?, provenance
}
```

Moves and Pokémon are reference data. They do not contain a user's owned
Pokémon, levels, movesets, or inventory.

## Current-content entities

### Raid boss

`RaidBoss` is defined in the [raid foundation slice](slices/raid-foundation.md).
It represents the encounter and its battle facts; its active time may come from
an associated event.

Its canonical identity is the Pokémon species/form/variant plus tier and Shadow
state. A raid rotation or time window is not part of the identity.

### Battle estimate

```text
BattleEstimate {
  raid_boss_id, profile, estimator?, combat_time?, deaths?,
  confidence?, source, source_url, fetched_at, content_hash?
}
```

`profile` contains the explicit trainer count, strength, local/remote mix,
Party Play setting, attacker level, weather, and strategy inputs used by the
estimate. The result is never presented without its profile.

### Event

```text
Event {
  event_id, name, category?, starts_at, ends_at, is_local_time?,
  featured_pokemon?, raids?, bonuses?, research?, exclusive_moves?,
  details?, source, source_url, fetched_at, content_hash
}
```

An event may reference Pokémon, raids, moves, bonuses, or research, but those
references must not be duplicated as a second source of truth.

### Egg pool and Rocket lineup

These remain small feature-specific records for now. They reference
`PokemonReference` by identity and carry their own source provenance. Do not
create a general-purpose encounter model until the data requires it.

## Operational entities

```text
SourceSnapshot {
  source, endpoint, fetched_at, source_updated_at?, content_hash?,
  schema_version, status, raw_record, normalized_record
}

SourceHealth {
  source, endpoint, last_attempt_at, last_success_at?, last_change_at?,
  status, response_age?, error_code?, parser_version
}
```

## Rules

- Provider payloads stop at adapters; UI code uses normalized records.
- Provenance travels with every current-data record.
- A missing field is different from an unknown or zero value.
- Time values carry their local-time semantics; never silently convert an
  ambiguous source time.
- Source disagreement is represented as data and shown to users when it
  changes the meaning of a result.
- Shared entities are introduced only when at least two features need them.

