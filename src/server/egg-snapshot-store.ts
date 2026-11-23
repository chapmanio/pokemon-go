import type { EggPool, EggSource } from "../domain/egg";
import type { KvNamespaceLike } from "./snapshot-store";

export interface StoredEggSnapshot {
  source: EggSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
  raw: unknown;
  pools: EggPool[];
  error?: string;
}

export interface EggSnapshotStore {
  get: (key: string) => Promise<StoredEggSnapshot | undefined>;
  put: (key: string, snapshot: StoredEggSnapshot) => Promise<void>;
}

export function createMemoryEggSnapshotStore(): EggSnapshotStore {
  const snapshots = new Map<string, StoredEggSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export function createKvEggSnapshotStore(kv: KvNamespaceLike): EggSnapshotStore {
  return {
    get: async (key) => (await kv.get(key, "json")) as StoredEggSnapshot | undefined,
    put: async (key, snapshot) => kv.put(key, JSON.stringify(snapshot)),
  };
}
