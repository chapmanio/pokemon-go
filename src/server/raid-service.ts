import type {
  Freshness,
  RaidBoss,
  RaidDisagreementField,
  RaidProvenance,
  RaidRosterResult,
  RaidSource,
  RaidSourceDisagreement,
} from "../domain/raid";
import { createProvenance, type RaidSourceAdapter } from "./source-adapter";
import {
  freshnessForSnapshot,
  type SnapshotStore,
  type StoredRaidSnapshot,
} from "./snapshot-store";
import { raidMergeKey } from "./raid-identity";

// Pokémon GO API supplies the most useful raid-specific fields, including
// machine-readable battle estimates. Keep the other feeds for corroboration,
// fallback coverage and source disagreement reporting.
const SOURCE_ORDER: RaidSource[] = ["pokemon-go-api", "leekduck", "pogoapi"];
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
  expectedSources: number,
): Freshness {
  if (snapshots.length === 0) return "unavailable";
  if (snapshots.length < expectedSources || snapshots.some((snapshot) => snapshot.error)) return "degraded";
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

function fallbackOptional<T>(primary: T | undefined, secondary: T | undefined): T | undefined {
  if (Array.isArray(primary) && primary.length === 0) return secondary;
  return primary ?? secondary;
}

function mergeBossFacts(primary: RaidBoss, secondary: RaidBoss): RaidBoss {
  return {
    ...primary,
    speciesId: primary.speciesId ?? secondary.speciesId,
    formId: primary.formId ?? secondary.formId,
    shinyAvailable: primary.shinyAvailable ?? secondary.shinyAvailable,
    types: primary.types.length > 0 ? primary.types : secondary.types,
    catchCp: primary.catchCp ?? secondary.catchCp,
    boostedCatchCp: primary.boostedCatchCp ?? secondary.boostedCatchCp,
    boostedWeather: fallbackOptional(primary.boostedWeather, secondary.boostedWeather),
    assetUrl: primary.assetUrl ?? secondary.assetUrl,
    pokedexKey: primary.pokedexKey ?? secondary.pokedexKey,
    startsAt: primary.startsAt ?? secondary.startsAt,
    endsAt: primary.endsAt ?? secondary.endsAt,
    isLocalTime: primary.isLocalTime ?? secondary.isLocalTime,
    battleEstimator: primary.battleEstimator ?? secondary.battleEstimator,
    counterSource: primary.counterSource ?? secondary.counterSource,
    counterTypes: fallbackOptional(primary.counterTypes, secondary.counterTypes),
  };
}

const comparableFields: Array<{
  field: RaidDisagreementField;
  label: string;
  getValue: (boss: RaidBoss) => unknown;
}> = [
  { field: "displayName", label: "Name", getValue: (boss) => boss.displayName },
  { field: "tier", label: "Tier", getValue: (boss) => boss.tier },
  { field: "isShadow", label: "Shadow status", getValue: (boss) => boss.isShadow },
  { field: "shinyAvailable", label: "Shiny availability", getValue: (boss) => boss.shinyAvailable },
  { field: "types", label: "Types", getValue: (boss) => boss.types },
  { field: "catchCp", label: "Catch CP", getValue: (boss) => boss.catchCp },
  { field: "boostedCatchCp", label: "Weather-boosted CP", getValue: (boss) => boss.boostedCatchCp },
  { field: "boostedWeather", label: "Boosted weather", getValue: (boss) => boss.boostedWeather },
  { field: "battleEstimator", label: "Battle estimate", getValue: (boss) => boss.battleEstimator },
];

function comparableValue(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object" && value !== null && "min" in value && "max" in value) {
    const range = value as { min: unknown; max: unknown };
    return `${String(range.min)}–${String(range.max)}`;
  }
  return String(value);
}

function sourceDisagreements(sourceBosses: Array<{ source: RaidSource; boss: RaidBoss }>): RaidSourceDisagreement[] {
  if (sourceBosses.length < 2) return [];

  return comparableFields.flatMap(({ field, label, getValue }) => {
    const values = sourceBosses.flatMap(({ source, boss }) => {
      const value = comparableValue(getValue(boss));
      return value === undefined ? [] : [{ source, value }];
    });
    const distinctValues = new Set(values.map(({ value }) => value));
    return distinctValues.size > 1 ? [{ field, label, values }] : [];
  });
}

function mergeBosses(snapshots: StoredRaidSnapshot[]): RaidBoss[] {
  const preferredSnapshots = snapshots.filter((snapshot) => snapshot.source !== "pogoapi");
  const hasPreferredRosterPair = preferredSnapshots.some((snapshot) => snapshot.source === "leekduck")
    && preferredSnapshots.some((snapshot) => snapshot.source === "pokemon-go-api");
  const rosterSnapshots = hasPreferredRosterPair ? preferredSnapshots : snapshots;
  const merged = new Map<string, {
    boss: RaidBoss;
    sourceReferences: RaidProvenance[];
    sourceBosses: Array<{ source: RaidSource; boss: RaidBoss }>;
  }>();

  for (const source of SOURCE_ORDER) {
    const snapshot = rosterSnapshots.find((candidate) => candidate.source === source);
    if (!snapshot) continue;

    for (const boss of snapshot.bosses) {
      const sourceReferences = sourceReferencesForBoss(boss);
      const current = merged.get(raidMergeKey(boss));
      if (!current) {
        merged.set(raidMergeKey(boss), {
          boss,
          sourceReferences: [...sourceReferences],
          sourceBosses: [{ source: snapshot.source, boss }],
        });
        continue;
      }

      current.sourceBosses.push({ source: snapshot.source, boss });
      current.boss = mergeBossFacts(current.boss, boss);

      for (const reference of sourceReferences) {
        if (!current.sourceReferences.some((item) => item.source === reference.source)) {
          current.sourceReferences.push(reference);
        }
      }
    }
  }

  return [...merged.values()].map(({ boss, sourceReferences, sourceBosses }) => ({
    ...boss,
    sourceReferences,
    sourceDisagreements: sourceDisagreements(sourceBosses),
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

      if (snapshots.length < adapters.length || snapshots.some((snapshot) => snapshot.error)) {
        warnings.push("Some raid sources could not be refreshed");
      }

      return {
        bosses: mergeBosses(snapshots),
        sources: snapshots.map((snapshot) => snapshot.source),
        freshness: sourceFreshness(snapshots, currentTime, adapters.length),
        asOf: primary?.fetchedAt,
        warnings,
      };
    },
  };
}
