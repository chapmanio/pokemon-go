# Initial domain model

These are app-owned concepts, not copies of any provider's schema. Fields stay
optional when the available sources cannot support them reliably.

## Reference entities

### Pokémon reference

The Pokédex list identity is `pokemon_id`. A form-level reference keeps the
source form identity as `pokemonKey = pokemon_id + form_id`.

```text
PokemonEntry {
  pokemon_id, display_name, default_form, forms[], assets?, provenance
}

PokemonForm {
  pokemon_key, pokemon_id, form_id, display_name, types,
  stats?, moves?, functional_difference, assets?, provenance
}
```

The list contains one entry per `pokemon_id`, using the `Normal` form when
available. All source forms remain in the detail model. `functional_difference`
is computed by comparing stats, types and move pools with the default form, so
equivalent event or costume forms can be nested without losing meaningful
regional, battle or move-changing variants.

### Move reference

```text
MoveReference {
  move_id, display_name, type, category?, power?, energy?, duration?, provenance
}
```

Moves and Pokémon are reference data. They do not contain a user's owned
Pokémon, levels, movesets, or inventory.

### Pokémon battle reference

```text
PokemonBattleReference {
  weaknesses[], resistances[], move_details
}

TypeMatchup {
  attack_type, multiplier
}
```

This is generic explanatory data derived from the Pokémon's form types, the
PoGoAPI type-effectiveness table, and move metadata. It must not be presented as
an exact raid simulation or a recommendation based on a user's collection.

## Current-content entities

### Raid boss

`RaidBoss` is defined in the [raid foundation slice](slices/raid-foundation.md).
It represents the encounter and its battle facts; its active time may come from
an associated event.

Its canonical identity is the Pokémon species/form/variant plus tier and Shadow
state. A raid rotation or time window is not part of the identity.

Raid details may include generic `PokemonCounterCandidate` records resolved from
the source counter types and the cached Pokédex. These are examples of Pokémon
with matching attack types, not a user's team recommendation or a battle
ranking.

### Battle estimate

```text
BattleEstimate {
  raid_boss_id, capable_trainers_needed?, party_of_four_result?,
  source, source_url, fetched_at, content_hash?
}
```

The app presents a source-based capable-trainer count and a separate
party-of-four check. The latter assumes four capable trainers using Party Play
and remains explicitly approximate.

### Event

```text
Event {
  event_id, name, category?, starts_at, ends_at, is_local_time?,
  bonuses[], related[], description?, article_url?, banner_url?,
  source, source_url, fetched_at, source_updated_at?, content_hash
}
```

`event_id` is derived from the canonical source article URL. `related[]` keeps
the source section, display name, optional asset and shiny flag. These are
source references, not authoritative Pokémon or raid identities; resolve them
only when an explicit safe match exists and retain unresolved names.

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

