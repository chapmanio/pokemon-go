# Egg pool data sources

## Recommendation

Use Leak Duck's published [`egg_pool.json`](https://pokelitee.github.io/leak-duck/egg_pool.json) through the server-side ingestion boundary. It is community-scraped data, so retain source metadata, validate the payload before publishing it, and expose stale/degraded states using the manifest.

## Endpoint and published shape

The [published API documentation](https://pokelitee.github.io/leak-duck/) and [schema](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json) define one endpoint:

```text
GET https://pokelitee.github.io/leak-duck/egg_pool.json
```

The response is an object keyed by egg-group label. Each value is an array of Pokémon objects:

```json
{
  "5 km Eggs": [
    {
      "name": "Snom",
      "shiny_available": true,
      "asset_url": "https://cdn.leekduck.com/.../pm872.icon.png",
      "hatch_distance": 5,
      "rarity_tier": 1
    }
  ]
}
```

The documented fields are:

- `name`: display name only; no stable Pokédex or form ID is provided.
- `hatch_distance`: integer kilometres, or `null` when the group label has no distance.
- `rarity_tier`: optional integer from 1 (most common) to 5 (rarest).
- `shiny_available`: boolean.
- `asset_url`: image URL or `null`.

The live payload inspected on 23 November 2026 contained 9 groups and 78 entries. Every observed entry had a distance, rarity tier and image URL, but the application must still accept the documented optional/null cases.

## Group identity and distance

The [egg scraper](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/egg_scraper.py) uses each page `h2` heading verbatim as the object key. It extracts the first number from that heading as `hatch_distance` and applies that value to every Pokémon in the group.

Do not identify groups by distance alone. The live feed distinguishes groups with the same distance, for example:

- `5 km Eggs`
- `5 km Eggs (Adventure Sync Rewards)`
- `7 km Eggs (From Friend Gifts)`
- `7 km Eggs (From Route Gift)`

Use a source-prefixed slug or hash of the exact group label as the internal ID, while retaining the original label for display. Duplicate Pokémon across groups are expected; do not deduplicate them globally.

## Freshness and change detection

Use [`manifest.json`](https://raw.githubusercontent.com/pokelitee/leak-duck/data/manifest.json), specifically `files["egg_pool.json"]`, for cheap refresh checks:

```json
{
  "sha256": "...",
  "size": 20024,
  "updated_at": "2026-11-16T02:45:51Z"
}
```

The [manifest generator](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/manifest.py) records the SHA-256, byte size and the last time the content changed. `updated_at` is not necessarily the last successful workflow run, so keep the app's own `fetchedAt` as well and use the hash as the primary change signal.

## Validation risks

The source scraper's assumptions are page-structure dependent:

- It only reads `h2` headings followed by a `ul.egg-grid`; a markup change can silently omit a group.
- It extracts the first number from the group label, so a changed label can produce an incorrect distance or `null`.
- The shared parser only recognises particular card selectors and skips cards whose name is `Unknown`; it derives shiny status from the presence of a shiny icon and may return a missing image URL. See [`utils.py`](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/utils.py).
- The published validator currently checks non-empty top-level sections but does not validate egg entry fields individually. See [`validation.py`](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/validation.py).

The app should validate before publishing a snapshot:

- top-level value is a non-empty object of string group labels to arrays;
- each entry is an object with a non-empty `name`;
- `hatch_distance` is `null` or a non-negative integer;
- `rarity_tier`, when present, is an integer from 1 to 5;
- `shiny_available` is boolean;
- `asset_url`, when present, is `null` or an HTTP(S) URL;
- group labels are unique and duplicate entries within one group are flagged rather than silently removed.

Preserve the last-known-good snapshot if validation fails. Rarity tiers are relative buckets, not hatch probabilities. Names such as regional forms, gender forms and other variants require cautious matching against the existing Pokédex; retain the raw name and mark unresolved or ambiguous matches rather than dropping them.

## Minimal normalised model

```text
EggPoolSnapshot
  source                 "leak-duck"
  fetchedAt              instant
  contentUpdatedAt       instant | null
  contentHash            string | null
  parserVersion          string
  groups[]               EggGroup

EggGroup
  id                     stable source-prefixed key from exact source label
  label                  string
  hatchDistanceKm        integer | null
  entries[]              EggPoolEntry

EggPoolEntry
  name                   string
  rarityTier             integer 1..5 | null
  shinyAvailable         boolean | null
  assetUrl               string | null
  pokemonRef             normalised Pokédex key | null
  resolution             "resolved" | "ambiguous" | "unresolved"
```

Keep `fetchedAt`, `contentUpdatedAt`, `contentHash`, validation status and warnings separate from user-facing egg data so the existing reliability model can show freshness without making the UI treat stale data as current.

## Sources

- [Leak Duck API reference](https://pokelitee.github.io/leak-duck/)
- [Published API schema](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json)
- [Live egg pool payload](https://pokelitee.github.io/leak-duck/egg_pool.json)
- [Published manifest](https://raw.githubusercontent.com/pokelitee/leak-duck/data/manifest.json)
- [Egg scraper source](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/egg_scraper.py)
- [Shared Pokémon parser](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/utils.py)
- [Published-output validation](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/validation.py)
- [Scraper configuration](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/config.json)
