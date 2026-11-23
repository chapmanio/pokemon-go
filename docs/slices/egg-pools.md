# Egg pools slice

## Goal

Provide a simple generic reference for current Pokémon GO egg pools:

1. Show each current egg group separately.
2. Show distance, Pokémon and shiny availability, grouped by relative rarity tier.
3. Preserve groups with the same distance but different sources, such as gifts
   and Adventure Sync rewards.
4. Show freshness and degraded-cache status.

## Non-goals

- Hatch probabilities or odds.
- Personal incubator or inventory tracking.
- Treating source rarity tiers as exact probabilities.
- Silently deduplicating a Pokémon across different egg groups.

## Source and storage

- Leak Duck `egg_pool.json` is the initial source.
- Leak Duck `manifest.json` supplies the file SHA-256 and content update time.
- Store raw and normalized data in the existing KV namespace under an egg
  specific key.
- Refresh at most every 30 minutes; show fresh data for 2 hours after the
  source content update, then stale.
- Keep last-known-good data after refresh or validation failure.

## Route

- `/eggs` — all current egg groups and their Pokémon.
- `/api/v1/eggs` — normalized egg pool response.

## Acceptance criteria

- A valid refresh stores raw and normalized pools with manifest provenance.
- Distinct source groups remain distinct even when their hatch distance matches.
- Invalid entries or inconsistent group distances do not replace valid cached
  data.
- Rarity tiers are displayed as relative labels and never as probabilities.
- Missing images use the existing placeholder treatment.
- A stale or failed source produces a visible stale/degraded state and retains
  the last-known-good pools.
- The page works on desktop Firefox and Firefox for Android on the target
  Galaxy S8 device.
