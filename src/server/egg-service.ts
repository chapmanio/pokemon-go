import type { EggPoolsResult } from "../domain/egg";
import type { Freshness } from "../domain/raid";
import { createMemoryEggSnapshotStore, type EggSnapshotStore, type StoredEggSnapshot } from "./egg-snapshot-store";
import type { EggSourceAdapter } from "./egg-source";

const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export interface EggServiceOptions {
  store: EggSnapshotStore;
  adapters: EggSourceAdapter[];
  now?: () => Date;
}

export interface GetEggsOptions {
  forceRefresh?: boolean;
}

function snapshotKey(adapter: EggSourceAdapter): string {
  return `eggs:${adapter.source}:${adapter.endpoint}`;
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function freshnessForSnapshots(snapshots: StoredEggSnapshot[], now: Date): Freshness {
  if (snapshots.length === 0) return "unavailable";
  if (snapshots.some((snapshot) => snapshot.error)) return "degraded";
  return snapshots.some((snapshot) => now.getTime() - new Date(snapshot.sourceUpdatedAt ?? snapshot.fetchedAt).getTime() > FRESH_AFTER_MS)
    ? "stale"
    : "fresh";
}

async function refreshAdapter(adapter: EggSourceAdapter, store: EggSnapshotStore, now: Date, forceRefresh: boolean): Promise<StoredEggSnapshot | undefined> {
  const key = snapshotKey(adapter);
  const previous = await store.get(key);
  const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
  const eligible = forceRefresh || !previous || now.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;
  if (!eligible) return previous;

  try {
    const sourcePayload = await adapter.fetchPayload();
    const contentHash = sourcePayload.contentHash ?? await hashPayload(sourcePayload.payload);
    const provenance = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      sourceUrl: adapter.sourceUrl,
      fetchedAt: now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
    } as const;
    const pools = adapter.normalize(sourcePayload.payload, provenance);
    if (pools.length === 0) throw new Error("Egg response contained no valid pools");
    const snapshot: StoredEggSnapshot = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt: previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
      raw: sourcePayload.payload,
      pools,
    };
    await store.put(key, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const snapshot: StoredEggSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Egg source refresh failed",
    };
    await store.put(key, snapshot);
    return snapshot;
  }
}

export function createEggService({ store, adapters, now = () => new Date() }: EggServiceOptions) {
  return {
    async getEggs(options: GetEggsOptions = {}): Promise<EggPoolsResult> {
      const currentTime = now();
      const snapshots = (await Promise.all(adapters.map((adapter) => refreshAdapter(adapter, store, currentTime, options.forceRefresh ?? false))))
        .filter((snapshot): snapshot is StoredEggSnapshot => snapshot !== undefined);
      const primary = snapshots[0];
      return {
        pools: snapshots.flatMap((snapshot) => snapshot.pools),
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: freshnessForSnapshots(snapshots, currentTime),
        asOf: primary?.fetchedAt,
        warnings: snapshots.some((snapshot) => snapshot.error)
          ? ["The egg source could not be refreshed; showing the last known-good pools."]
          : [],
      };
    },
  };
}

export function createDefaultEggService(adapters: EggSourceAdapter[], store?: EggSnapshotStore) {
  return createEggService({ store: store ?? createMemoryEggSnapshotStore(), adapters });
}
