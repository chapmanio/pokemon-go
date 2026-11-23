import type { EventCalendarResult, EventDetailResult, EventFreshness } from "../domain/event";

const freshnessValues: EventFreshness[] = ["fresh", "stale", "degraded", "unavailable"];

function isEventCalendarResult(value: unknown): value is EventCalendarResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<EventCalendarResult>;
  return Array.isArray(result.events)
    && Array.isArray(result.sources)
    && Array.isArray(result.warnings)
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as EventFreshness);
}

function isEventDetailResult(value: unknown): value is EventDetailResult {
  if (!value || typeof value !== "object") return false;
  const result = value as Partial<EventDetailResult>;
  return typeof result.eventId === "string"
    && typeof result.title === "string"
    && typeof result.startsAt === "string"
    && typeof result.endsAt === "string"
    && typeof result.freshness === "string"
    && freshnessValues.includes(result.freshness as EventFreshness)
    && Array.isArray(result.warnings);
}

export async function fetchEventCalendar(signal?: AbortSignal): Promise<EventCalendarResult> {
  const response = await fetch("/api/v1/events", {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Event service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isEventCalendarResult(payload)) throw new Error("Event service returned an unexpected response");
  return payload;
}

export async function fetchEvent(eventId: string, signal?: AbortSignal): Promise<EventDetailResult> {
  const response = await fetch(`/api/v1/events/${encodeURIComponent(eventId)}`, {
    signal,
    cache: "no-store",
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Event service returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isEventDetailResult(payload)) throw new Error("Event service returned an unexpected response");
  return payload;
}
