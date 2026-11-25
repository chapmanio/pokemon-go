import type { Freshness } from "../domain/raid";
import type { MaxBattle, MaxBattleSource } from "../domain/max-battle";

export interface StoredMaxBattleSnapshot {
  source: MaxBattleSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  contentHash?: string;
  raw: unknown;
  battles: MaxBattle[];
  error?: string;
}

export interface MaxBattleSnapshotStore {
  get: (key: string) => Promise<StoredMaxBattleSnapshot | undefined>;
  put: (key: string, snapshot: StoredMaxBattleSnapshot) => Promise<void>;
}

export function createMemoryMaxBattleSnapshotStore(): MaxBattleSnapshotStore {
  const snapshots = new Map<string, StoredMaxBattleSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export interface MaxBattleKvNamespaceLike {
  get: (key: string, type: "json") => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
}

export function createKvMaxBattleSnapshotStore(kv: MaxBattleKvNamespaceLike): MaxBattleSnapshotStore {
  return {
    get: async (key) => await kv.get(key, "json") as StoredMaxBattleSnapshot | undefined,
    put: async (key, snapshot) => kv.put(key, JSON.stringify(snapshot)),
  };
}

export function maxBattleSnapshotFreshness(
  snapshot: StoredMaxBattleSnapshot | undefined,
  now: Date,
  staleAfterMs: number,
  fallback: Freshness = "unavailable",
): Freshness {
  if (!snapshot) return fallback;
  if (snapshot.error) return "degraded";
  return now.getTime() - new Date(snapshot.fetchedAt).getTime() <= staleAfterMs ? "fresh" : "stale";
}
