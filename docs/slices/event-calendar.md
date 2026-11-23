# Event calendar foundation slice

## Goal

Provide a generic current and upcoming Pokémon GO calendar from cached Leak
Duck event data:

1. Group events by month and show current/upcoming/ended status.
2. Show event timing, category, description, banner and source link.
3. Show bonuses and optional related Pokémon, raids, research and other source
   sections without dropping unknown sections.
4. Preserve local-time versus instant-time semantics.
5. Show freshness and degraded-cache status.

## Non-goals

- Historical archives.
- Assuming an event reference is a resolved Pokédex or raid identity.
- Inferring Pokémon forms from names or image filenames.
- Treating Leak Duck as an official Niantic source.

## Source and storage

- Leak Duck `events.json` is the initial source.
- Leak Duck `manifest.json` supplies the `events.json` SHA-256 and content
  update timestamp.
- Store the raw event payload and normalized records in the existing KV
  namespace under an event-specific key.
- Refresh at most every 30 minutes; show fresh data for 2 hours, then stale.
- Keep last-known-good data when refresh or validation fails.
- Use the canonical article URL, without a trailing slash, as the event
  identity.

## Routes

- `/events` — month-grouped current and upcoming event list.
- `/events/:eventId` — event detail, bonuses and related source sections.
- `/api/v1/events` — calendar response.
- `/api/v1/events/:eventId` — event detail response.

## Time behaviour

- `is_local_time: true` preserves timezone-naive wall-clock values and labels
  them as local time.
- `is_local_time: false` converts Unix seconds to an instant for display.
- Missing or invalid timing data is not published as a normalized event.

## Acceptance criteria

- A valid refresh stores raw and normalized event data with provenance,
  manifest hash and source update time.
- Duplicate or invalid canonical article URLs do not replace valid cached data.
- Missing optional detail sections are handled without errors.
- Unknown array-based detail sections remain visible in event details.
- Local-time events are not silently converted to UTC.
- A stale or failed source produces a visible degraded state and retains the
  last-known-good calendar.
- Calendar and detail pages work from the app-owned API only.
- The list and detail pages work on desktop Firefox and Firefox for Android on
  the target Galaxy S8 device.
