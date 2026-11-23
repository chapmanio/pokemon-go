import { createHttpRaidAdapters } from "./source-adapter";
import { createRaidService } from "./raid-service";
import { createKvSnapshotStore, createMemorySnapshotStore, type KvNamespaceLike } from "./snapshot-store";
import { createPokemonService, createMemoryPokemonSnapshotStore } from "./pokemon-service";
import { createKvPokemonSnapshotStore } from "./pokemon-snapshot-store";
import { createHttpEventAdapter } from "./event-source";
import { createEventService } from "./event-service";
import { createKvEventSnapshotStore, createMemoryEventSnapshotStore } from "./event-snapshot-store";
import { createHttpEggAdapter } from "./egg-source";
import { createEggService } from "./egg-service";
import { createKvEggSnapshotStore, createMemoryEggSnapshotStore } from "./egg-snapshot-store";

export interface RuntimeEnvironment {
  RAID_SNAPSHOTS?: KvNamespaceLike;
}

const memoryStore = createMemorySnapshotStore();
const memoryPokemonStore = createMemoryPokemonSnapshotStore();
const memoryEventStore = createMemoryEventSnapshotStore();
const memoryEggStore = createMemoryEggSnapshotStore();

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

export function createRuntimeEventService(environment: RuntimeEnvironment) {
  const store = environment.RAID_SNAPSHOTS
    ? createKvEventSnapshotStore(environment.RAID_SNAPSHOTS)
    : memoryEventStore;

  return createEventService({
    store,
    adapters: [createHttpEventAdapter()],
  });
}

export function createRuntimeEggService(environment: RuntimeEnvironment) {
  const store = environment.RAID_SNAPSHOTS
    ? createKvEggSnapshotStore(environment.RAID_SNAPSHOTS)
    : memoryEggStore;

  return createEggService({
    store,
    adapters: [createHttpEggAdapter()],
  });
}

