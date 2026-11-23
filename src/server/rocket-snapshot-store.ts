import type { RocketMember, RocketSource } from "../domain/rocket";
import type { KvNamespaceLike } from "./snapshot-store";

export interface StoredRocketSnapshot {
  source: RocketSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
  raw: unknown;
  members: RocketMember[];
  error?: string;
}

export interface RocketSnapshotStore {
  get: (key: string) => Promise<StoredRocketSnapshot | undefined>;
  put: (key: string, snapshot: StoredRocketSnapshot) => Promise<void>;
}

export function createMemoryRocketSnapshotStore(): RocketSnapshotStore {
  const snapshots = new Map<string, StoredRocketSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export function createKvRocketSnapshotStore(kv: KvNamespaceLike): RocketSnapshotStore {
  return {
    get: async (key) => (await kv.get(key, "json")) as StoredRocketSnapshot | undefined,
    put: async (key, snapshot) => kv.put(key, JSON.stringify(snapshot)),
  };
}
