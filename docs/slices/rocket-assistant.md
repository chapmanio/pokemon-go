# Team GO Rocket assistant slice

## Goal

Provide a generic current Rocket reference from cached Leak Duck data:

1. Show current Giovanni, Leader and Grunt lineups.
2. Show possible Pokémon for each of the three lineup slots.
3. Mark which slot may produce the post-battle encounter.
4. Provide transparent type-theme guidance for type-specific Grunts.
5. Show freshness and degraded-cache status.

## Non-goals

- Exact battle simulation or guaranteed teams.
- Personal Pokémon roster integration.
- Treating an alternative in a slot as the Pokémon that will definitely appear.
- Inferring Pokémon forms from image filenames.
- Claiming source-provided counters where the feed does not provide them.

## Source and storage

- Leak Duck `rocket_lineups.json` is the initial source.
- Leak Duck `manifest.json` supplies the file SHA-256 and content update time.
- Store raw and normalized data in the existing KV namespace under a Rocket
  specific key.
- Refresh at most every 30 minutes; show fresh data for 2 hours after the
  source content update, then stale.
- Keep last-known-good data after refresh or validation failure.

## Guidance behaviour

- Grunt counter types are derived from the type theme in the member name and
  are labelled as generic guidance.
- Leader and Giovanni lineups have no source counter data in this slice. The
  UI explains that the revealed Pokémon's weaknesses should guide the battle.
- Grunt suggestions are resolved from the cached Pokédex by matching attack
  types and are examples, not rankings or personal-team recommendations.

## Routes

- `/rocket` — grouped member list.
- `/rocket/:memberId` — lineup slots and guidance.
- `/api/v1/rocket` — normalized member list.
- `/api/v1/rocket/:memberId` — detail with derived suggestions.

## Acceptance criteria

- Valid refresh stores raw and normalized lineups with manifest provenance.
- Invalid slots or candidates do not replace valid cached data.
- Slot alternatives, encounter flags and shiny flags remain distinct.
- A stale manifest produces a visible stale state even when fetching succeeds.
- Failed refresh produces a visible degraded state and retains last-known-good
  lineups.
- Grunt guidance shows its type assumptions and does not imply certainty.
- Leader and Giovanni pages clearly distinguish source lineup facts from
  generic battle advice.
- List and detail pages work on desktop Firefox and Firefox for Android on the
  target Galaxy S8 device.
