# Team GO Rocket data sources

## Recommendation

Use Leak Duck's published `rocket_lineups.json` through the app's server-side ingestion boundary. Use `manifest.json` for change detection and freshness; retain the last-known-good snapshot when the feed is invalid or stale. The data is community-scraped from Leek Duck, not an official Niantic feed.

## Endpoints and provenance

| Endpoint | Use |
| --- | --- |
| [`rocket_lineups.json`](https://pokelitee.github.io/leak-duck/rocket_lineups.json) | Current Team GO Rocket lineups; preferred published endpoint |
| [Raw GitHub data branch](https://raw.githubusercontent.com/pokelitee/leak-duck/data/rocket_lineups.json) | Equivalent fallback/pinned-source route |
| [`manifest.json`](https://pokelitee.github.io/leak-duck/manifest.json) | Per-file SHA-256, size and last content-change time |
| [Leek Duck Rocket lineups](https://leekduck.com/rocket-lineups/) | Scraped upstream page configured by Leak Duck |

Leak Duck documents the endpoint as the complete lineup set for leaders and grunts. The workflow runs hourly, although scheduled runs may be delayed. See the [API reference](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json), [README](https://github.com/pokelitee/leak-duck) and [workflow](https://raw.githubusercontent.com/pokelitee/leak-duck/main/.github/workflows/update-data.yml).

## Current payload shape

The top level is an object keyed by the member's display name. Each value is a list of lineup slots:

```json
{
  "Giovanni": [
    {
      "slot": 1,
      "pokemons": [
        {
          "name": "Persian",
          "shiny_available": false,
          "asset_url": "https://cdn.leekduck.com/..."
        }
      ],
      "is_encounter": false
    }
  ]
}
```

The documented fields are `slot` (1, 2 or 3), slot-level `is_encounter`, and a `pokemons` list containing `name`, `shiny_available` and optional `asset_url`. The Pokémon list represents alternatives for that slot, not a guaranteed battle sequence. This shape is defined in the [published schema](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json) and produced by the [RocketLineupScraper](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/rocket_lineup_scraper.py) using the shared [Pokémon parser](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/utils.py).

Live inspection on 23 November 2026 found 26 member keys, three slots for each member, 214 Pokémon candidate entries and 38 encounter-marked slots. These are observations, not guarantees that should be hard-coded.

## Identity and member distinctions

- There is no explicit member ID, lineup version, season, effective date or Pokémon ID in the published contract.
- Use the canonical member key plus slot number as the source identity for a slot, for example `leak-duck:rocket:giovanni:2`.
- Preserve the raw member name. The current payload distinguishes Giovanni (`Giovanni`), leaders (`Arlo`, `Cliff`, `Sierra`) and grunts whose names end in `Grunt`, including type/gender variants and `Decoy Female Grunt`. This classification is inferred from names; the source does not provide a `member_type` field.
- Candidate Pokémon should retain the source name, shiny flag and asset URL. Do not treat the name as a unique Pokémon identity: the same Pokémon can appear in several slots, and form names such as Alolan and Galarian variants are present.
- Asset filenames may contain useful form hints, but this is an implementation detail rather than a documented identity field. Resolve names to the existing Pokédex only when the match is unambiguous; retain the source value when it is not.

The current source implementation normalizes non-breaking whitespace in member names before using them as object keys; see the [scraper source](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/rocket_lineup_scraper.py).

## Encounter and counter data

`is_encounter` applies to the whole slot. It means that the Pokémon in that slot can be caught after the battle; it does not identify which alternative will appear. The flag must therefore remain on the normalized slot, not be copied as a certainty onto each candidate.

The feed contains no types, moves, weaknesses, counters, rankings or recommended teams. Counter guidance would need to be derived later by resolving candidates against the app's Pokédex battle data. That derived guidance must remain clearly separate from the source lineup facts.

## Update, hash and freshness signals

`manifest.json` contains `sha256`, `size` and `updated_at` for each published file. The [manifest generator](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/manifest.py) keeps `updated_at` unchanged when the file bytes have not changed, so it represents the last content change rather than the last successful workflow run.

At the time of inspection, the manifest reported:

```text
rocket_lineups.json
sha256: 8a7c6e87375a7204df8c937d7aaf3de17d9195db1cf70e627da8c3bae5e0a80d
size: 58818
updated_at: 2026-10-12T17:30:07Z
```

The published endpoint had a newer HTTP `Last-Modified` response during inspection, so HTTP cache metadata should not replace the manifest's content-change signal. Treat a missing or unexpectedly old manifest entry as stale, preserve the last-known-good snapshot, and show a source warning.

## Validation risks

Leak Duck's [validation code](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/validation.py) validates Rocket output only as a non-empty object whose member values are lists; it does not deeply validate slot or Pokémon fields. The app should add its own validation before publishing a snapshot:

- top level is a non-empty object with non-empty string keys;
- each member value is a non-empty list of slot objects;
- slot numbers are integers in 1–3 and are unique within a member;
- `is_encounter` is boolean;
- `pokemons` is a non-empty list with a non-empty `name` and boolean `shiny_available`;
- `asset_url` is absent/null or a valid HTTP(S) URL;
- warn on missing slots, duplicate candidates or unfamiliar member names rather than silently dropping data.

Important failure modes are stale-but-valid data, a changed Leek Duck page producing an empty/partial scrape, new grunt naming conventions, and form names that cannot be safely resolved to a Pokédex entry. Quarantine schema-breaking snapshots and continue serving the previous valid snapshot.

## Minimal normalized model

```text
RocketSnapshot
  source                 "leak-duck"
  fetchedAt              instant
  contentUpdatedAt       manifest.updated_at
  contentHash            manifest.sha256
  parserVersion          string
  members[]              RocketMember

RocketMember
  id                     stable app key from canonical member name
  sourceName             raw member key
  kind                   "giovanni" | "leader" | "grunt" | "unknown"
  slots[]                RocketSlot

RocketSlot
  position               1 | 2 | 3
  canEncounter           boolean
  candidates[]           RocketCandidate

RocketCandidate
  sourceName             string
  shinyAvailable         boolean
  assetUrl               string | null
  pokemonRef             normalized Pokédex key | null
  resolution             "resolved" | "ambiguous" | "unresolved"
```

Keep the raw member name and candidate name even after resolution. Do not add counter or team recommendations to this source model; calculate those as a separate, explicitly derived view.

## Sources

- [Leak Duck API reference](https://pokelitee.github.io/leak-duck/)
- [Published API schema](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json)
- [Leak Duck README](https://github.com/pokelitee/leak-duck)
- [Rocket lineup scraper](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/rocket_lineup_scraper.py)
- [Shared Pokémon parser](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/utils.py)
- [Source configuration](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/config.json)
- [Output validation](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/validation.py)
- [Manifest generator](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/manifest.py)
- [Update workflow](https://raw.githubusercontent.com/pokelitee/leak-duck/main/.github/workflows/update-data.yml)
- [Live Rocket payload](https://raw.githubusercontent.com/pokelitee/leak-duck/data/rocket_lineups.json)
- [Live manifest](https://raw.githubusercontent.com/pokelitee/leak-duck/data/manifest.json)
