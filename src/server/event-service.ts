import type { EventCalendarResult, EventFreshness, EventProvenance, PokemonGoEvent } from "../domain/event";
import { createMemoryEventSnapshotStore, type EventSnapshotStore, type StoredEventSnapshot } from "./event-snapshot-store";
import type { EventSourceAdapter } from "./event-source";

const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export interface EventServiceOptions {
  store: EventSnapshotStore;
  adapters: EventSourceAdapter[];
  now?: () => Date;
}

export interface GetEventsOptions {
  forceRefresh?: boolean;
}

function snapshotKey(adapter: EventSourceAdapter): string {
  return `events:${adapter.source}:${adapter.endpoint}`;
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function freshnessForSnapshots(snapshots: StoredEventSnapshot[], now: Date): EventFreshness {
  if (snapshots.length === 0) return "unavailable";
  if (snapshots.some((snapshot) => snapshot.error)) return "degraded";
  return snapshots.some((snapshot) => now.getTime() - new Date(snapshot.sourceUpdatedAt ?? snapshot.fetchedAt).getTime() > FRESH_AFTER_MS)
    ? "stale"
    : "fresh";
}

async function refreshAdapter(
  adapter: EventSourceAdapter,
  store: EventSnapshotStore,
  now: Date,
  forceRefresh: boolean,
): Promise<StoredEventSnapshot | undefined> {
  const key = snapshotKey(adapter);
  const previous = await store.get(key);
  const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
  const eligible = forceRefresh || !previous || now.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;
  if (!eligible) return previous;

  try {
    const sourcePayload = await adapter.fetchPayload();
    const contentHash = sourcePayload.contentHash ?? await hashPayload(sourcePayload.payload);
    const provenance: EventProvenance = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      sourceUrl: adapter.sourceUrl,
      fetchedAt: now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
    };
    const events = adapter.normalize(sourcePayload.payload, provenance);
    if (events.length === 0) throw new Error("Event response contained no valid events");

    const snapshot: StoredEventSnapshot = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt: previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
      raw: sourcePayload.payload,
      events,
    };
    await store.put(key, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const snapshot: StoredEventSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Event source refresh failed",
    };
    await store.put(key, snapshot);
    return snapshot;
  }
}

export function createEventService({ store, adapters, now = () => new Date() }: EventServiceOptions) {
  return {
    async getEvents(options: GetEventsOptions = {}): Promise<EventCalendarResult> {
      const currentTime = now();
      const snapshots = (await Promise.all(
        adapters.map((adapter) => refreshAdapter(adapter, store, currentTime, options.forceRefresh ?? false)),
      )).filter((snapshot): snapshot is StoredEventSnapshot => snapshot !== undefined);
      const events = snapshots.flatMap((snapshot) => snapshot.events);
      const primary = snapshots[0];
      const warnings = snapshots.some((snapshot) => snapshot.error)
        ? ["The event source could not be refreshed; showing the last known-good calendar."]
        : [];

      return {
        events,
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: freshnessForSnapshots(snapshots, currentTime),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },

    async getEvent(eventId: string): Promise<(PokemonGoEvent & { freshness: EventFreshness; warnings: string[] }) | undefined> {
      const result = await this.getEvents();
      const event = result.events.find((candidate) => candidate.eventId === eventId);
      return event ? { ...event, freshness: result.freshness, warnings: result.warnings } : undefined;
    },
  };
}

export function createDefaultEventService(adapters: EventSourceAdapter[], store?: EventSnapshotStore) {
  return createEventService({ store: store ?? createMemoryEventSnapshotStore(), adapters });
}
