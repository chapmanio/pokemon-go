import type { EventDetails, EventProvenance, EventReference, PokemonGoEvent } from "../domain/event";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.flatMap((item) => {
    const text = asString(item);
    return text ? [text] : [];
  }) : [];
}

function normalizeReferenceList(value: unknown, section: string): EventReference[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (typeof item === "string" && item.trim().length > 0) {
      return [{ section, name: item.trim() }];
    }
    const record = asRecord(item);
    const name = asString(record?.name);
    if (!name) return [];

    const reference: EventReference = { section, name };
    const assetUrl = asString(record?.asset_url);
    if (assetUrl) reference.assetUrl = assetUrl;
    if (typeof record?.shiny_available === "boolean") {
      reference.shinyAvailable = record.shiny_available;
    }
    return [reference];
  });
}

function normalizeDate(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value * 1000).toISOString();
  }

  return asString(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeDetails(value: unknown): EventDetails {
  const details = asRecord(value);
  const related = Object.entries(details ?? {}).flatMap(([section, sectionValue]) => (
    section === "bonuses" ? [] : normalizeReferenceList(sectionValue, section)
  ));
  return {
    bonuses: asStringList(details?.bonuses),
    related,
  };
}

export function normalizeEventPayload(
  payload: unknown,
  provenance: EventProvenance,
): PokemonGoEvent[] {
  const categories = asRecord(payload);
  if (!categories) throw new Error("Event response was not an object");

  const events: PokemonGoEvent[] = [];
  const eventIds = new Set<string>();
  for (const [categoryKey, categoryValue] of Object.entries(categories)) {
    if (!Array.isArray(categoryValue)) continue;

    for (const rawEvent of categoryValue) {
      const event = asRecord(rawEvent);
      const title = asString(event?.title);
      const startsAt = normalizeDate(event?.start_time);
      const endsAt = normalizeDate(event?.end_time);
      const articleUrl = asString(event?.article_url);
      const isLocalTime = event?.is_local_time === true;
      const hasValidTimeShape = isLocalTime
        ? typeof event?.start_time === "string" && typeof event?.end_time === "string"
        : typeof event?.start_time === "number" && typeof event?.end_time === "number";
      if (!title || !startsAt || !endsAt || !articleUrl || !isHttpUrl(articleUrl) || !hasValidTimeShape) {
        continue;
      }

      const category = asString(event?.category) ?? categoryKey;
      const eventId = `leak-duck:event:${articleUrl.replace(/\/$/, "")}`;
      if (eventIds.has(eventId)) throw new Error(`Duplicate event article URL: ${articleUrl}`);
      eventIds.add(eventId);
      const record: PokemonGoEvent = {
        eventId,
        title,
        category,
        startsAt,
        endsAt,
        isLocalTime,
        details: normalizeDetails(event?.details),
        provenance,
      };

      const description = asString(event?.description);
      const bannerUrl = asString(event?.banner_url);
      if (description) record.description = description;
      record.articleUrl = articleUrl;
      if (bannerUrl) record.bannerUrl = bannerUrl;
      events.push(record);
    }
  }

  return events;
}
