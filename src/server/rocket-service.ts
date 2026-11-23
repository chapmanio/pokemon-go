import type { Freshness } from "../domain/raid";
import type { RocketMemberDetailResult, RocketProvenance, RocketRosterResult } from "../domain/rocket";
import { createMemoryRocketSnapshotStore, type RocketSnapshotStore, type StoredRocketSnapshot } from "./rocket-snapshot-store";
import type { RocketSourceAdapter } from "./rocket-source";

const REFRESH_COOLDOWN_MS = 30 * 60 * 1000;
const FRESH_AFTER_MS = 2 * 60 * 60 * 1000;

export interface RocketServiceOptions {
  store: RocketSnapshotStore;
  adapters: RocketSourceAdapter[];
  now?: () => Date;
}

export interface GetRocketOptions {
  forceRefresh?: boolean;
}

function snapshotKey(adapter: RocketSourceAdapter): string {
  return `rocket:${adapter.source}:${adapter.endpoint}`;
}

async function hashPayload(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function freshnessForSnapshots(snapshots: StoredRocketSnapshot[], now: Date): Freshness {
  if (snapshots.length === 0) return "unavailable";
  if (snapshots.some((snapshot) => snapshot.error)) return "degraded";
  return snapshots.some((snapshot) => now.getTime() - new Date(snapshot.sourceUpdatedAt ?? snapshot.fetchedAt).getTime() > FRESH_AFTER_MS)
    ? "stale"
    : "fresh";
}

async function refreshAdapter(
  adapter: RocketSourceAdapter,
  store: RocketSnapshotStore,
  now: Date,
  forceRefresh: boolean,
): Promise<StoredRocketSnapshot | undefined> {
  const key = snapshotKey(adapter);
  const previous = await store.get(key);
  const lastAttempt = previous ? new Date(previous.lastAttemptAt).getTime() : 0;
  const eligible = forceRefresh || !previous || now.getTime() - lastAttempt >= REFRESH_COOLDOWN_MS;
  if (!eligible) return previous;

  try {
    const sourcePayload = await adapter.fetchPayload();
    const contentHash = sourcePayload.contentHash ?? await hashPayload(sourcePayload.payload);
    const provenance: RocketProvenance = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      sourceUrl: adapter.sourceUrl,
      fetchedAt: now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
    };
    const members = adapter.normalize(sourcePayload.payload, provenance);
    if (members.length === 0) throw new Error("Rocket response contained no valid lineups");
    const snapshot: StoredRocketSnapshot = {
      source: adapter.source,
      endpoint: adapter.endpoint,
      fetchedAt: now.toISOString(),
      lastAttemptAt: now.toISOString(),
      lastChangedAt: previous?.contentHash === contentHash ? previous.lastChangedAt : now.toISOString(),
      sourceUpdatedAt: sourcePayload.sourceUpdatedAt,
      contentHash,
      raw: sourcePayload.payload,
      members,
    };
    await store.put(key, snapshot);
    return snapshot;
  } catch (error) {
    if (!previous) return undefined;
    const snapshot: StoredRocketSnapshot = {
      ...previous,
      lastAttemptAt: now.toISOString(),
      error: error instanceof Error ? error.message : "Rocket source refresh failed",
    };
    await store.put(key, snapshot);
    return snapshot;
  }
}

export function createRocketService({ store, adapters, now = () => new Date() }: RocketServiceOptions) {
  return {
    async getRocket(options: GetRocketOptions = {}): Promise<RocketRosterResult> {
      const currentTime = now();
      const snapshots = (await Promise.all(
        adapters.map((adapter) => refreshAdapter(adapter, store, currentTime, options.forceRefresh ?? false)),
      )).filter((snapshot): snapshot is StoredRocketSnapshot => snapshot !== undefined);
      const primary = snapshots[0];
      const warnings = snapshots.some((snapshot) => snapshot.error)
        ? ["The Rocket source could not be refreshed; showing the last known-good lineups."]
        : [];
      return {
        members: snapshots.flatMap((snapshot) => snapshot.members),
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: freshnessForSnapshots(snapshots, currentTime),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },

    async getMember(memberId: string): Promise<RocketMemberDetailResult | undefined> {
      const result = await this.getRocket();
      const member = result.members.find((candidate) => candidate.memberId === memberId);
      if (!member) return undefined;
      return {
        ...member,
        counterSuggestions: [],
        counterSuggestionsFreshness: "unavailable",
        freshness: result.freshness,
        warnings: result.warnings,
      };
    },
  };
}

export function createDefaultRocketService(adapters: RocketSourceAdapter[], store?: RocketSnapshotStore) {
  return createRocketService({ store: store ?? createMemoryRocketSnapshotStore(), adapters });
}
