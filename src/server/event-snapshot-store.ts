import type { EventSource, PokemonGoEvent } from "../domain/event";
import type { KvNamespaceLike } from "./snapshot-store";

export interface StoredEventSnapshot {
  source: EventSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  sourceUpdatedAt?: string;
  contentHash?: string;
  raw: unknown;
  events: PokemonGoEvent[];
  error?: string;
}

export interface EventSnapshotStore {
  get: (key: string) => Promise<StoredEventSnapshot | undefined>;
  put: (key: string, snapshot: StoredEventSnapshot) => Promise<void>;
}

export function createMemoryEventSnapshotStore(): EventSnapshotStore {
  const snapshots = new Map<string, StoredEventSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export function createKvEventSnapshotStore(kv: KvNamespaceLike): EventSnapshotStore {
  return {
    get: async (key) => (await kv.get(key, "json")) as StoredEventSnapshot | undefined,
    put: async (key, snapshot) => kv.put(key, JSON.stringify(snapshot)),
  };
}
