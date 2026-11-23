import type { EggPool, EggPoolEntry, EggProvenance } from "../domain/egg";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as RecordValue
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeEntry(value: unknown): EggPoolEntry | undefined {
  const record = asRecord(value);
  const name = asString(record?.name);
  if (!name || typeof record?.shiny_available !== "boolean") return undefined;

  const entry: EggPoolEntry = {
    name,
    shinyAvailable: record.shiny_available,
  };
  if (record.rarity_tier !== undefined) {
    if (typeof record.rarity_tier !== "number" || !Number.isInteger(record.rarity_tier) || record.rarity_tier < 1 || record.rarity_tier > 5) {
      return undefined;
    }
    entry.rarityTier = record.rarity_tier;
  }
  if (record.asset_url !== null && record.asset_url !== undefined) {
    if (typeof record.asset_url !== "string" || !isHttpUrl(record.asset_url)) return undefined;
    entry.assetUrl = record.asset_url;
  }
  return entry;
}

export function normalizeEggPayload(payload: unknown, provenance: EggProvenance): EggPool[] {
  const groups = asRecord(payload);
  if (!groups) throw new Error("Egg response was not an object");
  const pools: EggPool[] = [];

  for (const [displayName, rawEntries] of Object.entries(groups)) {
    if (!displayName.trim() || !Array.isArray(rawEntries)) throw new Error("Invalid egg pool group");
    const entries = rawEntries.flatMap((entry) => {
      const normalized = normalizeEntry(entry);
      return normalized ? [normalized] : [];
    });
    if (entries.length === 0 || entries.length !== rawEntries.length) {
      throw new Error(`Invalid egg pool entries for ${displayName}`);
    }

    const distances = rawEntries.map((entry) => asRecord(entry)?.hatch_distance);
    if (distances.some((distance) => distance !== null && (typeof distance !== "number" || !Number.isInteger(distance) || distance < 0))) {
      throw new Error(`Invalid egg hatch distance for ${displayName}`);
    }
    const hatchDistanceKm = distances[0] as number | null;
    if (distances.some((distance) => distance !== hatchDistanceKm)) {
      throw new Error(`Inconsistent egg hatch distance for ${displayName}`);
    }

    pools.push({
      eggPoolId: `leek-duck:egg:${slug(displayName)}`,
      displayName,
      hatchDistanceKm,
      entries,
      provenance,
    });
  }

  return pools;
}
