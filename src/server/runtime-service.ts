import { createHttpRaidAdapters } from "./source-adapter";
import { createRaidService } from "./raid-service";
import { createKvSnapshotStore, createMemorySnapshotStore, type KvNamespaceLike } from "./snapshot-store";

export interface RuntimeEnvironment {
  RAID_SNAPSHOTS?: KvNamespaceLike;
}

const memoryStore = createMemorySnapshotStore();

export function createRuntimeRaidService(environment: RuntimeEnvironment) {
  const store = environment.RAID_SNAPSHOTS
    ? createKvSnapshotStore(environment.RAID_SNAPSHOTS)
    : memoryStore;

  return createRaidService({
    store,
    adapters: createHttpRaidAdapters(),
  });
}
