import type { Freshness, RaidBoss, RaidSource } from "../domain/raid";
import { createProvenance, type RaidSourceAdapter } from "./source-adapter";
import {
  freshnessForSnapshot,
  type SnapshotStore,
  type StoredRaidSnapshot,
} from "./snapshot-store";

const SOURCE_ORDER: RaidSource[] = ["leekduck", "pogoapi", "pokemon-go-api"];
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export interface RaidRosterResult {
  bosses: RaidBoss[];
  sources: RaidSource[];
  freshness: Freshness;
  asOf?: string;
  warnings: string[];
}

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

function identitySet(bosses: RaidBoss[]): Set<string> {
  return new Set(bosses.map((boss) => boss.raidBossId));
}

function setsEqual(left: Set<string>, right: Set<string>): boolean {
  return left.size === right.size && [...left].every((item) => right.has(item));
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

      const sets = snapshots.map((snapshot) => identitySet(snapshot.bosses));
      if (sets.length > 1 && sets.some((set) => !setsEqual(set, sets[0]))) {
        warnings.push("Raid sources disagree");
      }
      if (snapshots.some((snapshot) => snapshot.error)) {
        warnings.push("Some raid sources could not be refreshed");
      }

      return {
        bosses: primary?.bosses ?? [],
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: sourceFreshness(snapshots, currentTime),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },
  };
}
