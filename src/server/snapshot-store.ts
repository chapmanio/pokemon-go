import type { Freshness, RaidBoss, RaidSource } from "../domain/raid";

export interface StoredRaidSnapshot {
  source: RaidSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  contentHash?: string;
  raw: unknown;
  bosses: RaidBoss[];
  error?: string;
}

export interface SnapshotStore {
  get: (key: string) => Promise<StoredRaidSnapshot | undefined>;
  put: (key: string, snapshot: StoredRaidSnapshot) => Promise<void>;
}

export function createMemorySnapshotStore(): SnapshotStore {
  const snapshots = new Map<string, StoredRaidSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export interface KvNamespaceLike {
  get: (key: string, type: "json") => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
}

export function createKvSnapshotStore(kv: KvNamespaceLike): SnapshotStore {
  return {
    get: async (key) => {
      const value = await kv.get(key, "json");
      return value as StoredRaidSnapshot | undefined;
    },
    put: async (key, snapshot) => {
      await kv.put(key, JSON.stringify(snapshot));
    },
  };
}

export function freshnessForSnapshot(
  snapshot: StoredRaidSnapshot | undefined,
  now: Date,
  staleAfterMs: number,
  fallback: Freshness = "unavailable",
): Freshness {
  if (!snapshot) return fallback;
  const age = now.getTime() - new Date(snapshot.fetchedAt).getTime();
  return age <= staleAfterMs ? "fresh" : "stale";
}
