import type { MaxBattleRosterResult } from "../domain/max-battle";
import { createMaxBattleProvenance } from "./max-battle-service-provenance";
import type { MaxBattleSourceAdapter } from "./max-battle-source";
import {
  createMemoryMaxBattleSnapshotStore,
  maxBattleSnapshotFreshness,
  type MaxBattleSnapshotStore,
  type StoredMaxBattleSnapshot,
} from "./max-battle-snapshot-store";

const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export interface MaxBattleServiceOptions {
  store: MaxBattleSnapshotStore;
  adapters: MaxBattleSourceAdapter[];
  now?: () => Date;
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function refreshAdapter(
  adapter: MaxBattleSourceAdapter,
  store: MaxBattleSnapshotStore,
  now: Date,
  forceRefresh: boolean,
): Promise<StoredMaxBattleSnapshot | undefined> {
  const key = `${adapter.source}:${adapter.endpoint}`;
  const previous = await store.get(key);
  const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
  if (!forceRefresh && previous && now.getTime() - lastAttempt < REFRESH_COOLDOWN_MS) return previous;

  try {
    const raw = await adapter.fetchPayload();
    const contentHash = await hashPayload(raw);
    const provenance = createMaxBattleProvenance(adapter, now, contentHash);
    const battles = adapter.normalize(raw, provenance);
    const snapshot: StoredMaxBattleSnapshot = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt: previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      contentHash,
      raw,
      battles,
    };
    await store.put(key, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const snapshot: StoredMaxBattleSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Source refresh failed",
    };
    await store.put(key, snapshot);
    return snapshot;
  }
}

export function createMaxBattleService({
  store,
  adapters,
  now = () => new Date(),
}: MaxBattleServiceOptions) {
  return {
    async getMaxBattles(options: { forceRefresh?: boolean } = {}): Promise<MaxBattleRosterResult> {
      const currentTime = now();
      const snapshots = (await Promise.all(
        adapters.map((adapter) => refreshAdapter(adapter, store, currentTime, options.forceRefresh ?? false)),
      )).filter((snapshot): snapshot is StoredMaxBattleSnapshot => snapshot !== undefined);
      const warnings = snapshots.some((snapshot) => snapshot.error)
        ? ["The cached Max Battle roster is being served because a source refresh failed"]
        : [];
      const primary = snapshots[0];

      return {
        battles: snapshots.flatMap((snapshot) => snapshot.battles),
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: snapshots.length === 0
          ? "unavailable"
          : snapshots.some((snapshot) => snapshot.error)
            ? "degraded"
            : maxBattleSnapshotFreshness(primary, currentTime, FRESH_AFTER_MS),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },
  };
}

export function createDefaultMaxBattleService(options: Partial<MaxBattleServiceOptions> = {}) {
  return createMaxBattleService({
    store: options.store ?? createMemoryMaxBattleSnapshotStore(),
    adapters: options.adapters ?? [],
    now: options.now,
  });
}
