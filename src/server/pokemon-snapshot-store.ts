import type { PokemonReference, PokemonSource } from "../domain/pokemon";
import type { PokemonReferencePayload } from "./pokemon-normalizer";
import type { KvNamespaceLike } from "./snapshot-store";

export interface StoredPokemonSnapshot {
  source: PokemonSource;
  endpoint: string;
  fetchedAt: string;
  lastAttemptAt: string;
  lastChangedAt?: string;
  contentHash?: string;
  raw: PokemonReferencePayload;
  entries: PokemonReference[];
  upstreamHashes: Record<string, string>;
  error?: string;
}

export interface PokemonSnapshotStore {
  get: (key: string) => Promise<StoredPokemonSnapshot | undefined>;
  put: (key: string, snapshot: StoredPokemonSnapshot) => Promise<void>;
}

export function createMemoryPokemonSnapshotStore(): PokemonSnapshotStore {
  const snapshots = new Map<string, StoredPokemonSnapshot>();
  return {
    get: async (key) => snapshots.get(key),
    put: async (key, snapshot) => {
      snapshots.set(key, snapshot);
    },
  };
}

export function createKvPokemonSnapshotStore(kv: KvNamespaceLike): PokemonSnapshotStore {
  return {
    get: async (key) => {
      const value = await kv.get(key, "json");
      return value as StoredPokemonSnapshot | undefined;
    },
    put: async (key, snapshot) => kv.put(key, JSON.stringify(snapshot)),
  };
}
