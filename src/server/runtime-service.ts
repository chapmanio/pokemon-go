import { createHttpRaidAdapters } from "./source-adapter";
import { createRaidService } from "./raid-service";
import { createKvSnapshotStore, createMemorySnapshotStore, type KvNamespaceLike } from "./snapshot-store";
import { createPokemonService, createMemoryPokemonSnapshotStore } from "./pokemon-service";
import { createKvPokemonSnapshotStore } from "./pokemon-snapshot-store";

export interface RuntimeEnvironment {
  RAID_SNAPSHOTS?: KvNamespaceLike;
}

const memoryStore = createMemorySnapshotStore();
const memoryPokemonStore = createMemoryPokemonSnapshotStore();

export function createRuntimeRaidService(environment: RuntimeEnvironment) {
  const store = environment.RAID_SNAPSHOTS
    ? createKvSnapshotStore(environment.RAID_SNAPSHOTS)
    : memoryStore;

  return createRaidService({
    store,
    adapters: createHttpRaidAdapters(),
  });
}

export function createRuntimePokemonService(environment: RuntimeEnvironment) {
  const store = environment.RAID_SNAPSHOTS
    ? createKvPokemonSnapshotStore(environment.RAID_SNAPSHOTS)
    : memoryPokemonStore;

  return createPokemonService({ store });
}
