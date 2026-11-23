# Event calendar data sources

## Scope and recommendation

Use the published [Leak Duck API](https://pokelitee.github.io/leak-duck/) as the calendar source, fetched through the app's server-side ingestion boundary. It is an automated scrape of Leek Duck data, published hourly when the workflow runs. It is community data, not an official Niantic feed, so keep the source, fetch time, content hash, parser version and freshness state with the cached snapshot.

For the first calendar slice, ingest `events.json` and use `manifest.json` for change detection. Do not ingest yearly archives for the initial UI; add them only when historical browsing is required.

## Endpoints and observed payloads

| Endpoint | Use | Contract / signal |
| --- | --- | --- |
| [`https://pokelitee.github.io/leak-duck/events.json`](https://pokelitee.github.io/leak-duck/events.json) | Current and upcoming events | Object keyed by category; each event has title, category, times, article URL, banner, description and optional detail sections. |
| [`https://pokelitee.github.io/leak-duck/manifest.json`](https://pokelitee.github.io/leak-duck/manifest.json) | Cheap refresh check | Per-file SHA-256, byte size and `updated_at` for the last content change. |
| [`https://pokelitee.github.io/leak-duck/archives/archive_{year}.json`](https://pokelitee.github.io/leak-duck/archives/archive_2026.json) | Historical events, later | Same shape as `events.json`; coverage before 19 September 2025 is partial. |
| [`https://leekduck.com/feeds/events.json`](https://leekduck.com/feeds/events.json) | Upstream date feed used by the scraper | Array with `eventID`, `name`, `eventType`, `heading`, `link`, `image`, `start`, `end` and `extraData`. This is useful for understanding provenance, but the app should prefer the documented published API contract. |

The API documentation says events are grouped by category and that `article_url` is unique per event. A live inspection on 23 November 2026 returned 15 categories and 39 current/upcoming records. A representative event was shaped like:

```json
{
  "title": "Dynamax Trails",
  "category": "Event",
  "is_local_time": true,
  "start_time": "2026-11-16T10:00:00",
  "end_time": "2026-11-23T20:00:00",
  "article_url": "https://leekduck.com/events/dynamax-trails-2026/",
  "banner_url": "https://cdn.leekduck.com/.../dynamax-trails-2026.jpg",
  "description": "...",
  "details": {
    "bonuses": ["2× Catch Stardust"],
    "features": [
      {"name": "Grookey", "asset_url": "https://cdn.leekduck.com/...", "shiny_available": true}
    ]
  }
}
```

In the live payload, detail sections included `bonuses`, `features`, `spawns`, `raids`, `eggs`, `moves`, `research`, `shiny`, `max-battles` and `go-pass`. Bonus entries were strings; other observed entries were `{ name, asset_url, shiny_available }` objects. Sections are optional and page-driven, so an event may have only a description and no structured details.

## Time, update and freshness signals

- `is_local_time: true` means `start_time` and `end_time` are timezone-naive ISO strings representing the same local wall-clock time in each timezone. They must not be interpreted as UTC.
- `is_local_time: false` means both times are Unix seconds. Convert them to instants for display in the user's timezone.
- The scraper obtains authoritative dates from Leek Duck's official events feed and overlays them on scraped page content. Its source code documents the naive-versus-offset conversion rule: [event scraper](https://github.com/pokelitee/leak-duck/blob/main/src/scrapers/event_scraper.py) and [datetime utilities](https://github.com/pokelitee/leak-duck/blob/main/src/utils.py).
- `manifest.json.files["events.json"].updated_at` is the last content-change time, not necessarily the last successful workflow run. `sha256` is the preferred change detector.
- The repository says the workflow runs hourly, but scheduled runs may be delayed. Treat a missing or old manifest as stale rather than assuming the feed is current.
- Leak Duck omits events whose times are still to be announced and events whose pages cannot be read completely. Absence therefore means “not published by this source”, not proof that the event does not exist.
- Ended events move from `events.json` into yearly archives. A calendar snapshot should retain its own fetched timestamp and should not infer historical completeness from the current feed.

## Identity and related content

### Event identity

Use the canonical `article_url` as the source identity, normalised to remove only an accidental trailing slash. It is documented as unique and remains available in both current and archived records. The upstream `eventID` is a useful diagnostic field, but it is not present in the published event contract and should not be reconstructed as the primary key.

Recommended app key:

```text
leak-duck:event:{canonical article_url}
```

The category is classification, not identity: titles can repeat, and a single source can publish several events with the same title.

### Pokémon and raids

The event API exposes related content as display names plus optional image URLs. It does not provide a stable Pokédex number, form ID, raid tier, or raid-boss ID. Therefore:

- Preserve every raw related item with its section name, source name, asset URL and shiny flag.
- Resolve a Pokémon only after matching the name against the existing normalised Pokédex, retaining the raw name when unresolved.
- Treat `details.raids` as an event reference to a raid-related Pokémon/content item, not as a complete `RaidBoss` record. Reconcile it against current raid data by species/form and keep the event link even when no current raid match exists.
- Do not infer a form from an image filename alone. Names such as Shadow, Mega, regional forms and multiple Deoxys forms can be ambiguous; use explicit name/form matching where available and mark ambiguous matches unresolved.
- Link resolved Pokémon to `/pokedex/:pokemonKey` and resolved current raid matches to the raid detail route, but never drop the source item because resolution failed.

## Validation and failure risks

Validate before publishing a new snapshot:

- HTTP success, JSON validity and top-level object shape.
- Non-empty `title`, `category` and `article_url`; valid HTTP(S) URL for the article.
- Boolean `is_local_time` and matching time representation: naive ISO strings for local events, Unix seconds for global events.
- `details` is an object; `bonuses` contains strings; other section entries contain at least a non-empty `name`.
- Unique `article_url` values within the snapshot and `event.category` matching its containing category.
- Optional URLs are either null/absent or valid HTTP(S) URLs; tolerate missing sections and missing archive descriptions.

Quarantine schema-breaking or suspicious data and keep the last-known-good snapshot. Particular risks are:

- community scraper outages, delayed hourly jobs and upstream HTML changes;
- dynamic, page-driven detail section names and newly introduced categories;
- local-time events being incorrectly converted to UTC;
- incomplete events being deliberately omitted by the scraper;
- names and image filenames not being sufficient for Pokémon form identity;
- source data moving between current and archive files after an event ends.

## Minimal normalised model

Keep the source model small and retain raw detail items for future enrichment:

```text
EventSnapshot
  source                 "leak-duck"
  fetchedAt              instant
  contentUpdatedAt       manifest updated_at
  contentHash            manifest sha256
  parserVersion          string
  events[]               NormalizedEvent

NormalizedEvent
  id                     stable app key from canonical article_url
  title                  string
  category               string
  start                  { kind: "local" | "instant", value: string | unix seconds }
  end                    { kind: "local" | "instant", value: string | unix seconds }
  articleUrl             string
  bannerUrl              string | null
  description            string | null
  bonuses[]              string
  related[]              RelatedEventItem

RelatedEventItem
  section                string
  name                   string
  assetUrl               string | null
  shinyAvailable         boolean | null
  pokemonRef             resolved Pokemon key | null
  raidRef                resolved RaidBoss key | null
  resolution             "resolved" | "ambiguous" | "unresolved"
```

Keep `source`, `fetchedAt`, `contentUpdatedAt`, `contentHash`, validation status and any warning outside the user-facing event fields so freshness and degraded-data behaviour follow the existing reliability model.

## Sources

- [Leak Duck API reference](https://pokelitee.github.io/leak-duck/)
- [Leak Duck repository README](https://github.com/pokelitee/leak-duck)
- [Published API schema](https://raw.githubusercontent.com/pokelitee/leak-duck/main/site/docs.json)
- [Event scraper source](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/event_scraper.py)
- [Event page scraper source](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/scrapers/event_page_scraper.py)
- [Manifest generator source](https://raw.githubusercontent.com/pokelitee/leak-duck/main/src/manifest.py)
- [Leek Duck official events feed](https://leekduck.com/feeds/events.json)
- [Example primary event article](https://leekduck.com/events/dynamax-trails-2026/)

