import type {
  Freshness,
  RaidBoss,
  RaidProvenance,
  RaidRosterResult,
  RaidSource,
} from "../domain/raid";
import { createProvenance, type RaidSourceAdapter } from "./source-adapter";
import {
  freshnessForSnapshot,
  type SnapshotStore,
  type StoredRaidSnapshot,
} from "./snapshot-store";

const SOURCE_ORDER: RaidSource[] = ["leekduck", "pogoapi", "pokemon-go-api"];
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export type { RaidRosterResult } from "../domain/raid";

export interface RaidServiceOptions {
  store: SnapshotStore;
  adapters: RaidSourceAdapter[];
  now?: () => Date;
}

export interface GetRaidsOptions {
  forceRefresh?: boolean;
}

function snapshotKey(adapter: RaidSourceAdapter): string {
  return `${adapter.source}:${adapter.endpoint}`;
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function sourceFreshness(
  snapshots: StoredRaidSnapshot[],
  now: Date,
): Freshness {
  if (snapshots.length === 0) return "unavailable";
  if (snapshots.some((snapshot) => snapshot.error)) return "degraded";
  if (snapshots.some((snapshot) => freshnessForSnapshot(snapshot, now, FRESH_AFTER_MS) === "stale")) {
    return "stale";
  }
  return "fresh";
}

async function refreshAdapter(
  adapter: RaidSourceAdapter,
  store: SnapshotStore,
  now: Date,
  forceRefresh: boolean,
): Promise<StoredRaidSnapshot | undefined> {
  const key = snapshotKey(adapter);
  const previous = await store.get(key);
  const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
  const eligible = forceRefresh || !previous || now.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;

  if (!eligible) return previous;

  try {
    const raw = await adapter.fetchPayload();
    const contentHash = await hashPayload(raw);
    const provenance = createProvenance(adapter, now, contentHash);
    const bosses = adapter.normalize(raw, provenance);
    if (bosses.length === 0) {
      throw new Error("Raid response contained no valid bosses");
    }
    const snapshot: StoredRaidSnapshot = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt:
        previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      contentHash,
      raw,
      bosses,
    };
    await store.put(key, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const snapshot: StoredRaidSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Source refresh failed",
    };
    await store.put(key, snapshot);
    return snapshot;
  }
}

function primarySnapshot(snapshots: StoredRaidSnapshot[]): StoredRaidSnapshot | undefined {
  return SOURCE_ORDER.map((source) => snapshots.find((snapshot) => snapshot.source === source)).find(
    (snapshot): snapshot is StoredRaidSnapshot => snapshot !== undefined,
  );
}

function sourceReferencesForBoss(boss: RaidBoss): RaidProvenance[] {
  return boss.sourceReferences?.length ? boss.sourceReferences : [boss.provenance];
}

function mergeBosses(snapshots: StoredRaidSnapshot[]): RaidBoss[] {
  const merged = new Map<string, { boss: RaidBoss; sourceReferences: RaidProvenance[] }>();

  for (const source of SOURCE_ORDER) {
    const snapshot = snapshots.find((candidate) => candidate.source === source);
    if (!snapshot) continue;

    for (const boss of snapshot.bosses) {
      const sourceReferences = sourceReferencesForBoss(boss);
      const current = merged.get(boss.raidBossId);
      if (!current) {
        merged.set(boss.raidBossId, { boss, sourceReferences: [...sourceReferences] });
        continue;
      }

      for (const reference of sourceReferences) {
        if (!current.sourceReferences.some((item) => item.source === reference.source)) {
          current.sourceReferences.push(reference);
        }
      }
    }
  }

  return [...merged.values()].map(({ boss, sourceReferences }) => ({
    ...boss,
    sourceReferences,
  }));
}

export function createRaidService({ store, adapters, now = () => new Date() }: RaidServiceOptions) {
  return {
    async getRaids(options: GetRaidsOptions = {}): Promise<RaidRosterResult> {
      const currentTime = now();
      const snapshots = (
        await Promise.all(
          adapters.map((adapter) => refreshAdapter(adapter, store, currentTime, options.forceRefresh ?? false)),
        )
      ).filter((snapshot): snapshot is StoredRaidSnapshot => snapshot !== undefined);
      const primary = primarySnapshot(snapshots);
      const warnings: string[] = [];

      if (snapshots.some((snapshot) => snapshot.error)) {
        warnings.push("Some raid sources could not be refreshed");
      }

      return {
        bosses: mergeBosses(snapshots),
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: sourceFreshness(snapshots, currentTime),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },
  };
}
