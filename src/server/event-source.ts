import type { EventSource } from "../domain/event";
import type { EventProvenance } from "../domain/event";
import { normalizeEventPayload } from "./event-normalizer";

export interface EventSourcePayload {
  payload: unknown;
  contentHash?: string;
  sourceUpdatedAt?: string;
}

export interface EventSourceAdapter {
  source: EventSource;
  endpoint: string;
  sourceUrl: string;
  fetchPayload: () => Promise<EventSourcePayload>;
  normalize: (payload: unknown, provenance: EventProvenance) => ReturnType<typeof normalizeEventPayload>;
}

const EVENTS_URL = "https://pokelitee.github.io/leak-duck/events.json";
const MANIFEST_URL = "https://pokelitee.github.io/leak-duck/manifest.json";
const SOURCE_URL = EVENTS_URL;

export interface FixtureEventAdapterOptions {
  fetch?: () => Promise<EventSourcePayload>;
}

export function createFixtureEventAdapter(
  payload: unknown,
  options: FixtureEventAdapterOptions = {},
): EventSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "events.json",
    sourceUrl: SOURCE_URL,
    fetchPayload: options.fetch ?? (async () => ({ payload })),
    normalize: normalizeEventPayload,
  };
}

function eventManifestMetadata(manifest: unknown): Pick<EventSourcePayload, "contentHash" | "sourceUpdatedAt"> {
  const files = manifest && typeof manifest === "object"
    ? (manifest as Record<string, unknown>).files
    : undefined;
  const eventFile = files && typeof files === "object"
    ? (files as Record<string, unknown>)["events.json"]
    : undefined;
  if (!eventFile || typeof eventFile !== "object") return {};

  const record = eventFile as Record<string, unknown>;
  return {
    contentHash: typeof record.sha256 === "string" ? record.sha256 : undefined,
    sourceUpdatedAt: typeof record.updated_at === "string" ? record.updated_at : undefined,
  };
}

export function createHttpEventAdapter(fetcher: typeof fetch = fetch): EventSourceAdapter {
  return {
    source: "leekduck",
    endpoint: "events.json",
    sourceUrl: SOURCE_URL,
    fetchPayload: async () => {
      const [eventsResponse, manifestResponse] = await Promise.all([
        fetcher(EVENTS_URL),
        fetcher(MANIFEST_URL),
      ]);
      if (!eventsResponse.ok) throw new Error(`Leek Duck events returned HTTP ${eventsResponse.status}`);
      if (!manifestResponse.ok) throw new Error(`Leek Duck manifest returned HTTP ${manifestResponse.status}`);
      return {
        payload: await eventsResponse.json(),
        ...eventManifestMetadata(await manifestResponse.json()),
      };
    },
    normalize: normalizeEventPayload,
  };
}
